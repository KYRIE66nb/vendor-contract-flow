import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  COMPANY_SIGNER,
  currentVersion,
  gateCanInitiateSign,
  gateValidation,
  mockCertId,
  roleById,
  snapshotHash,
  uid,
  validate,
} from './domain'
import { buildSeed } from './seed'
import type { AppStatus, Application, RoleId, Terms, VendorInfo } from './types'

interface Ctx {
  actorRole: RoleId
  actorName: string
}

const now = () => new Date().toISOString()

interface Store {
  role: RoleId
  apps: Application[]

  setRole: (role: RoleId) => void
  resetDemo: () => void

  createApplication: (title: string) => string
  updateDraft: (id: string, vendorInfo: VendorInfo, terms: Terms) => void
  submitApplication: (id: string, ctx: Ctx) => boolean

  editTerms: (id: string, terms: Terms, changeSummary: string, ctx: Ctx) => boolean
  submitForApproval: (id: string, ctx: Ctx) => boolean
  decideApproval: (id: string, decision: 'approved' | 'rejected', comment: string, ctx: Ctx) => boolean

  initiateSign: (id: string, ctx: Ctx) => boolean
  signAs: (id: string, signerId: string, ctx: Ctx) => void
}

function log(app: Application, ctx: Ctx, action: string, detail: string, statusFrom?: AppStatus, statusTo?: AppStatus) {
  app.logs.push({
    id: uid('log'),
    at: now(),
    actorRole: ctx.actorRole,
    actorName: ctx.actorName,
    action,
    detail,
    statusFrom,
    statusTo,
  })
}

function transition(app: Application, ctx: Ctx, action: string, detail: string, to: AppStatus) {
  const from = app.status
  app.status = to
  log(app, ctx, action, detail, from, to)
}

export const useStore = create<Store>()(
  persist(
    (set) => ({
      role: 'vendor',
      apps: buildSeed(),

      setRole: (role) => set({ role }),

      resetDemo: () => set({ apps: buildSeed(), role: 'vendor' }),

      createApplication: (title) => {
        const id = uid('VC')
        const app: Application = {
          id,
          createdAt: now(),
          title,
          vendorInfo: { legalName: '', registrationPlace: '', registeredAddress: '', productName: '', signatoryName: '', signatoryTitle: '', signatoryEmail: '' },
          terms: { authorizationScope: '', territory: '', pricingModel: '', currency: '', revenueBasis: '', shareRatio: '', settlementCycle: '', settlementMethod: '', refundHandling: '', agreementTerm: '', startDate: '', specialTerms: '' },
          status: 'FILLING',
          missingFields: [],
          versions: [],
          approvals: [],
          envelope: { status: 'not_started', signers: [], cc: [] },
          logs: [],
        }
        log(app, { actorRole: 'vendor', actorName: roleById('vendor').name }, 'CREATE', `创建供应商合同申请（${title}）`, undefined, 'FILLING')
        set((s) => ({ apps: [...s.apps, app] }))
        return id
      },

      updateDraft: (id, vendorInfo, terms) =>
        set((s) => ({
          apps: s.apps.map((a) => (a.id === id && (a.status === 'FILLING' || a.status === 'NEEDS_INFORMATION') ? { ...a, vendorInfo, terms } : a)),
        })),

      submitApplication: (id, ctx) => {
        let ok = false
        set((s) => ({
          apps: s.apps.map((a) => {
            if (a.id !== id || (a.status !== 'FILLING' && a.status !== 'NEEDS_INFORMATION')) return a
            const app: Application = structuredClone(a)
            const res = validate(vendorInfoOf(app), app.terms)
            app.missingFields = res.missing
            if (!res.ok) {
              transition(app, ctx, 'VALIDATE_FAIL', `信息校验未通过，缺失 ${res.missing.length} 项关键字段：${res.missing.map((m) => m.label).join('、')}。已阻断：不能生成合同草稿、不能发起签署`, 'NEEDS_INFORMATION')
              return app
            }
            // 校验通过 → 立即按模板生成草稿 v1
            const hash = snapshotHash(vendorInfoOf(app), app.terms)
            app.versions.push({
              no: 1,
              createdAt: now(),
              actorRole: ctx.actorRole,
              actorName: ctx.actorName,
              changeSummary: '供应商首次提交，生成初始草稿',
              snapshot: { vendorInfo: { ...app.vendorInfo }, terms: { ...app.terms } },
              hash,
              source: 'initial',
            })
            log(app, ctx, 'VALIDATE_PASS', '信息完整性校验通过（无缺失字段）')
            transition(app, ctx, 'DRAFT_GENERATED', `根据合同模板自动生成合同草稿 v1（快照哈希 ${hash}）`, 'NEGOTIATING')
            ok = true
            return app
          }),
        }))
        return ok
      },

      editTerms: (id, terms, changeSummary, ctx) => {
        let ok = false
        set((s) => ({
          apps: s.apps.map((a) => {
            if (a.id !== id || !['NEGOTIATING', 'PENDING_APPROVAL', 'APPROVED'].includes(a.status)) return a
            const app: Application = structuredClone(a)
            const cur = currentVersion(app)
            const hash = snapshotHash(vendorInfoOf(app), terms)
            app.terms = { ...terms }
            app.versions.push({
              no: cur.no + 1,
              createdAt: now(),
              actorRole: ctx.actorRole,
              actorName: ctx.actorName,
              changeSummary: changeSummary || '条款修改',
              snapshot: { vendorInfo: { ...app.vendorInfo }, terms: { ...terms } },
              hash,
              source: 'edit',
            })
            const invalidated = app.approvals.filter((x) => !x.invalidated)
            for (const ap of invalidated) {
              ap.invalidated = true
              ap.invalidatedAt = now()
              ap.invalidReason = `合同内容已修改并生成新版本 v${cur.no + 1}，针对 v${ap.versionNo} 的审批自动失效`
            }
            transition(app, ctx, 'TERM_EDITED', `条款修改保存为新版本 v${cur.no + 1}（快照哈希 ${hash}）。修改说明：${changeSummary || '（未填写）'}`, 'NEGOTIATING')
            if (invalidated.length > 0) {
              log(app, ctx, 'APPROVALS_INVALIDATED', `${invalidated.length} 条内部审批因版本变更自动失效（${invalidated.map((x) => `${x.approverName}@v${x.versionNo}`).join('、')}），需基于 v${cur.no + 1} 重新审批`)
            }
            ok = true
            return app
          }),
        }))
        return ok
      },

      submitForApproval: (id, ctx) => {
        let ok = false
        set((s) => ({
          apps: s.apps.map((a) => {
            if (a.id !== id || a.status !== 'NEGOTIATING') return a
            const app: Application = structuredClone(a)
            const gate = gateValidation(app)
            if (!gate.ok) {
              app.missingFields = gate.ok ? [] : validate(vendorInfoOf(app), app.terms).missing
              transition(app, ctx, 'VALIDATE_FAIL', `提交审批前校验未通过：${gate.reasons.join('；')}`, 'NEEDS_INFORMATION')
              return app
            }
            const cur = currentVersion(app)
            transition(app, ctx, 'SUBMIT_APPROVAL', `将合同 v${cur.no} 提交内部审批（需审批人 A、B 双人批准）`, 'PENDING_APPROVAL')
            ok = true
            return app
          }),
        }))
        return ok
      },

      decideApproval: (id, decision, comment, ctx) => {
        const role = ctx.actorRole
        if (role !== 'approverA' && role !== 'approverB') return false
        set((s) => ({
          apps: s.apps.map((a) => {
            if (a.id !== id || a.status !== 'PENDING_APPROVAL') return a
            const app: Application = structuredClone(a)
            const cur = currentVersion(app)
            if (app.approvals.some((x) => !x.invalidated && x.versionNo === cur.no && x.approverRole === role)) return a // 同一版本同一审批人不能重复决策
            app.approvals.push({
              id: uid('apr'),
              versionNo: cur.no,
              versionHash: cur.hash,
              approverRole: role,
              approverName: ctx.actorName,
              decision,
              comment,
              createdAt: now(),
              invalidated: false,
            })
            if (decision === 'rejected') {
              log(app, ctx, 'APPROVE_REJECT', `审批人 ${ctx.actorName}（${role === 'approverA' ? '财务' : '法务'}）退回合同 v${cur.no}。意见：${comment || '（无）'}`)
              transition(app, ctx, 'APPROVAL_REJECTED', `合同 v${cur.no} 被退回修改`, 'NEGOTIATING')
              return app
            }
            log(app, ctx, 'APPROVE_PASS', `审批人 ${ctx.actorName}（${role === 'approverA' ? '财务负责人' : '法务负责人'}）批准合同 v${cur.no}。意见：${comment || '（无）'}`)
            const bothApproved =
              app.approvals.some((x) => !x.invalidated && x.versionNo === cur.no && x.approverRole === 'approverA' && x.decision === 'approved') &&
              app.approvals.some((x) => !x.invalidated && x.versionNo === cur.no && x.approverRole === 'approverB' && x.decision === 'approved')
            if (bothApproved) {
              transition(app, ctx, 'ALL_APPROVED', `合同 v${cur.no} 已获两名审批人批准，进入「可发起签署」状态`, 'APPROVED')
            }
            return app
          }),
        }))
        return true
      },

      initiateSign: (id, ctx) => {
        let ok = false
        set((s) => ({
          apps: s.apps.map((a) => {
            if (a.id !== id || a.status !== 'APPROVED') return a
            const app: Application = structuredClone(a)
            const gate = gateCanInitiateSign(app) // 三重门禁：完整性 + 双人审批 + 版本一致
            if (!gate.ok) return a
            const cur = currentVersion(app)
            app.envelope = {
              status: 'pending',
              initiatedBy: ctx.actorName,
              initiatedAt: now(),
              docHash: cur.hash,
              signers: [
                {
                  id: uid('sgn'),
                  name: app.vendorInfo.signatoryName,
                  title: app.vendorInfo.signatoryTitle,
                  email: app.vendorInfo.signatoryEmail,
                  party: 'vendor',
                  status: 'pending',
                  signRole: 'vendor',
                },
                {
                  id: uid('sgn'),
                  name: COMPANY_SIGNER.name,
                  title: COMPANY_SIGNER.title,
                  email: COMPANY_SIGNER.email,
                  party: 'company',
                  status: 'pending',
                  signRole: 'signerCompany',
                },
              ],
              cc: [
                { name: '赵启明（商务负责人）', email: 'zhao.qiming@example-tech.cn' },
                { name: '孙倩（法务）', email: 'sun.qian@example-tech.cn' },
              ],
            }
            transition(app, ctx, 'SIGN_INITIATED', `发起 Mock 电子签（信封文档哈希 ${cur.hash}）：签署人 2 名（供应商 ${app.vendorInfo.signatoryName}、我方 ${COMPANY_SIGNER.name}），CC 2 名。正式环境此处调用 DocuSign / e签宝 API`, 'SIGNING')
            ok = true
            return app
          }),
        }))
        return ok
      },

      signAs: (id, signerId, ctx) =>
        set((s) => ({
          apps: s.apps.map((a) => {
            if (a.id !== id || a.status !== 'SIGNING') return a
            const signer = a.envelope.signers.find((x) => x.id === signerId)
            if (!signer || signer.status === 'signed' || signer.signRole !== ctx.actorRole) return a
            const app: Application = structuredClone(a)
            const target = app.envelope.signers.find((x) => x.id === signerId)!
            target.status = 'signed'
            target.signedAt = now()
            target.certId = mockCertId()
            log(app, ctx, 'SIGNED', `签署完成：${target.name}（${target.party === 'vendor' ? '供应商方' : '我方'}）已签署，Mock 证书编号 ${target.certId}`)
            const all = app.envelope.signers.every((x) => x.status === 'signed')
            if (all) {
              app.envelope.status = 'completed'
              app.envelope.completedAt = now()
              const cur = currentVersion(app)
              const h8 = cur.hash.slice(0, 8)
              app.archive = {
                archivedAt: now(),
                finalVersionNo: cur.no,
                finalVersionHash: cur.hash,
                evidence: [
                  { name: `合同终稿（v${cur.no}）`, desc: '双方签署版本的合同全文，可打印/导出 PDF', ref: `DOC-${h8}`, mock: false },
                  { name: '内部审批记录', desc: `针对 v${cur.no} 的两名审批人批准记录（王芸·财务 / 陈曦·法务），含审批意见与时间戳`, ref: `APR-${h8}`, mock: false },
                  { name: '签署证明（Mock）', desc: `各方签署证书 ${app.envelope.signers.map((x) => x.certId).join(' / ')}，文档哈希 ${cur.hash}`, ref: `CERT-${h8}`, mock: true },
                  { name: '操作审计日志', desc: '从提交到归档的全量操作日志，可导出 JSON 留档', ref: `AUDIT-${h8}`, mock: false },
                  { name: '结算信息卡', desc: `结算周期/方式/币种/分成比例与首个结算日，供财务执行付款结算`, ref: `STL-${h8}`, mock: false },
                ],
              }
              transition(app, ctx, 'ARCHIVED', `双方签署完成，证据包已归档（${app.archive.evidence.length} 项），结算信息已同步财务视角`, 'ARCHIVED')
            }
            return app
          }),
        })),
    }),
    {
      name: 'contractflow-demo-v1',
      partialize: (s) => ({ role: s.role, apps: s.apps }) as unknown as Store,
    },
  ),
)

function vendorInfoOf(app: Application): VendorInfo {
  return app.vendorInfo
}

export function useApp(id: string | undefined): Application | undefined {
  return useStore((s) => s.apps.find((a) => a.id === id))
}

export function useCtx(): Ctx {
  const role = useStore((s) => s.role)
  return { actorRole: role, actorName: roleById(role).name }
}
