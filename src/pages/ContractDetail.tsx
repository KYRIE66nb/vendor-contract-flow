import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ContractDoc from '../components/ContractDoc'
import { Alert, Badge, Btn, Card, CardHeader, Field, inputCls, KV, StatusBadge, Tabs } from '../components/ui'
import { TERMS_FIELDS, VENDOR_FIELDS, currentVersion, fmtTime, gateApprovals, gateCanInitiateSign, gateValidation, nextSettlementDate, roleById, STATUS_META, validApprovals, validate } from '../domain'
import { useApp, useCtx, useStore } from '../store'
import type { Application, RoleId, Terms, VendorInfo } from '../types'

type TabKey = 'overview' | 'preview' | 'edit' | 'versions' | 'approval' | 'sign' | 'archive' | 'logs'

const EDIT_ROLES: RoleId[] = ['vendor', 'biz', 'legal']
const SUBMIT_APPROVAL_ROLES: RoleId[] = ['biz', 'legal']
const INITIATE_SIGN_ROLES: RoleId[] = ['biz', 'legal']

export default function ContractDetail() {
  const { id } = useParams()
  const app = useApp(id)
  const navigate = useNavigate()
  const role = useStore((s) => s.role)
  const [tab, setTab] = useState<TabKey>('overview')

  if (!app) return <Card className="p-6 text-sm text-slate-500">未找到该合同流程。</Card>
  if (app.status === 'FILLING' || app.status === 'NEEDS_INFORMATION') {
    navigate(`/apply/${app.id}`, { replace: true })
    return null
  }

  const cur = currentVersion(app)
  const missing = validate(app.vendorInfo, app.terms)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">{app.title}</h1>
            <StatusBadge status={app.status} />
            <Badge tone="blue">当前版本 v{cur.no}</Badge>
            <span className="font-mono text-[11px] text-slate-400">{cur.hash}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{STATUS_META[app.status].desc}</p>
        </div>
        <Btn variant="ghost" size="sm" onClick={() => navigate('/')}>
          ← 返回工作台
        </Btn>
      </div>

      {missing.missing.length > 0 && (
        <Alert tone="warn" title="注意：当前快照存在字段问题（不满足发签门禁）">
          {missing.missing.map((m) => m.label).join('、')}
        </Alert>
      )}

      <Tabs<TabKey>
        active={tab}
        onChange={setTab}
        tabs={[
          { key: 'overview', label: '概览' },
          { key: 'preview', label: '合同预览' },
          { key: 'edit', label: `条款修改`, badge: ['NEGOTIATING', 'PENDING_APPROVAL', 'APPROVED'].includes(app.status) ? undefined : undefined },
          { key: 'versions', label: '版本历史', badge: app.versions.length > 1 ? <Badge tone="blue">{app.versions.length}</Badge> : undefined },
          { key: 'approval', label: '内部审批' },
          { key: 'sign', label: '电子签署（Mock）' },
          { key: 'archive', label: '归档' },
          { key: 'logs', label: `操作日志`, badge: <Badge>{app.logs.length}</Badge> },
        ]}
      />

      {tab === 'overview' && <OverviewTab app={app} role={role} goto={setTab} />}
      {tab === 'preview' && <PreviewTab app={app} />}
      {tab === 'edit' && <EditTab app={app} role={role} />}
      {tab === 'versions' && <VersionsTab app={app} />}
      {tab === 'approval' && <ApprovalTab app={app} role={role} />}
      {tab === 'sign' && <SignTab app={app} role={role} goto={setTab} />}
      {tab === 'archive' && <ArchiveTab app={app} goto={setTab} />}
      {tab === 'logs' && <LogsTab app={app} />}
    </div>
  )
}

/* ---------------- 概览 ---------------- */
function OverviewTab({ app, role, goto }: { app: Application; role: RoleId; goto: (t: TabKey) => void }) {
  const cur = currentVersion(app)
  const g1 = gateValidation(app)
  const g2 = gateApprovals(app)
  const steps: { key: string; label: string; done: boolean; active: boolean }[] = [
    { key: 'submit', label: '供应商提交信息', done: app.versions.length > 0, active: app.status === 'NEEDS_INFORMATION' },
    { key: 'validate', label: '信息完整性校验', done: app.versions.length > 0, active: app.status === 'NEEDS_INFORMATION' },
    { key: 'draft', label: '自动生成合同草稿', done: app.versions.length > 0, active: false },
    { key: 'negotiate', label: '磋商修改（版本化）', done: ['PENDING_APPROVAL', 'APPROVED', 'SIGNING', 'ARCHIVED'].includes(app.status) || app.versions.length > 1, active: app.status === 'NEGOTIATING' },
    { key: 'approve', label: '内部双人审批', done: ['APPROVED', 'SIGNING', 'ARCHIVED'].includes(app.status), active: app.status === 'PENDING_APPROVAL' },
    { key: 'sign', label: '电子签署（Mock）', done: app.status === 'ARCHIVED', active: app.status === 'SIGNING' },
    { key: 'archive', label: '归档与结算', done: app.status === 'ARCHIVED', active: false },
  ]

  const nextByRole: Partial<Record<RoleId, { text: string; tab: TabKey }[]>> = {
    vendor:
      app.status === 'NEGOTIATING'
        ? [{ text: '如需调整条款：在「条款修改」中保存，将生成新版本', tab: 'edit' }]
        : app.status === 'SIGNING'
          ? [{ text: '在「电子签署」中以供应商签字人身份完成签署', tab: 'sign' }]
          : [],
    biz:
      app.status === 'NEGOTIATING'
        ? [{ text: '确认条款后，在「内部审批」提交双人审批', tab: 'approval' }]
        : app.status === 'APPROVED'
          ? [{ text: '门禁已满足，可在「电子签署」发起 Mock 电子签', tab: 'sign' }]
          : [],
    legal: app.status === 'NEGOTIATING' ? [{ text: '法务复核条款后，可提交双人审批', tab: 'approval' }] : [],
    approverA: app.status === 'PENDING_APPROVAL' ? [{ text: '在「内部审批」对当前版本作出财务审批', tab: 'approval' }] : [],
    approverB: app.status === 'PENDING_APPROVAL' ? [{ text: '在「内部审批」对当前版本作出法务审批', tab: 'approval' }] : [],
    signerCompany: app.status === 'SIGNING' ? [{ text: '在「电子签署」中代表公司完成签署', tab: 'sign' }] : [],
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader title="流程进度" desc="供应商提交 → 校验 → 草稿 → 磋商 → 审批 → 签署 → 归档" />
        <div className="p-5">
          <ol className="space-y-3">
            {steps.map((s) => (
              <li key={s.key} className="flex items-center gap-3">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                    s.done ? 'border-emerald-500 bg-emerald-500 text-white' : s.active ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {s.done ? '✓' : '•'}
                </span>
                <span className={`text-sm ${s.done ? 'text-slate-700' : s.active ? 'font-semibold text-amber-700' : 'text-slate-400'}`}>{s.label}</span>
                {s.active && <Badge tone="amber">进行中</Badge>}
              </li>
            ))}
          </ol>
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 text-xs font-semibold text-slate-500">当前身份可执行的下一步</div>
            {(nextByRole[role] ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">暂无需当前身份操作的事项（可切换右上角身份查看其他角色任务）。</p>
            ) : (
              (nextByRole[role] ?? []).map((n, i) => (
                <button key={i} onClick={() => goto(n.tab)} className="mr-2 inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  {n.text} →
                </button>
              ))
            )}
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader title="发签门禁自检" desc="三重门禁须同时满足才可发起签署" />
          <div className="space-y-2 p-5 text-sm">
            <GateRow ok={g1.ok} label="① 信息完整性校验" reasons={g1.reasons} />
            <GateRow ok={g2.ok} label="② 当前版本双人审批" reasons={g2.reasons} />
            <GateRow ok={app.status === 'APPROVED'} label="③ 处于「已批准」状态" reasons={app.status === 'APPROVED' ? [] : [`当前状态：${STATUS_META[app.status].label}`]} />
            <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">综合结果：{gateCanInitiateSign(app).ok ? '✅ 可发起签署' : '⛔ 未满足（阻断中）'}</div>
          </div>
        </Card>
        <Card>
          <CardHeader title={`关键信息（v${cur.no} 快照）`} extra={<span className="font-mono text-[10px] text-slate-400">{cur.hash.slice(0, 8)}</span>} />
          <div className="px-5 py-3">
            <KV k="供应商" v={app.vendorInfo.legalName} />
            <KV k="产品/服务" v={app.vendorInfo.productName} />
            <KV k="分成比例（供应商）" v={`${app.terms.shareRatio || '—'}%`} />
            <KV k="结算周期" v={app.terms.settlementCycle} />
            <KV k="结算方式" v={app.terms.settlementMethod} />
            <KV k="币种" v={app.terms.currency} />
            <KV k="签字人" v={`${app.vendorInfo.signatoryName}（${app.vendorInfo.signatoryTitle}）`} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function GateRow({ ok, label, reasons }: { ok: boolean; label: string; reasons: string[] }) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${ok ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
      <div className="flex items-center gap-2 font-medium">
        <span>{ok ? '✅' : '⛔'}</span>
        <span className={ok ? 'text-emerald-800' : 'text-rose-800'}>{label}</span>
      </div>
      {!ok && reasons.length > 0 && <ul className="mt-1 list-disc pl-8 text-xs text-rose-700">{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
    </div>
  )
}

/* ---------------- 合同预览 ---------------- */
function PreviewTab({ app }: { app: Application }) {
  const [no, setNo] = useState(currentVersion(app).no)
  const ver = app.versions.find((v) => v.no === no) ?? currentVersion(app)
  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">版本：</span>
          <select value={no} onChange={(e) => setNo(Number(e.target.value))} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm">
            {[...app.versions].reverse().map((v) => (
              <option key={v.no} value={v.no}>
                v{v.no} · {v.source === 'initial' ? '初始草稿' : '磋商修改'} · {fmtTime(v.createdAt)}
              </option>
            ))}
          </select>
        </div>
        <Btn size="sm" onClick={() => window.print()}>
          🖨️ 打印 / 导出 PDF
        </Btn>
      </div>
      <ContractDoc version={ver} appTitle={app.title} printable />
      <p className="no-print text-center text-xs text-slate-400">导出 PDF：点击上方按钮后，在打印对话框选择「存储为 PDF」。缺失字段在文中显示为【待补充】，系统不会猜测填充。</p>
    </div>
  )
}

/* ---------------- 条款修改 ---------------- */
function EditTab({ app, role }: { app: Application; role: RoleId }) {
  const { editTerms } = useStore()
  const ctx = useCtx()
  const [terms, setTerms] = useState<Terms>({ ...app.terms })
  const [summary, setSummary] = useState('')

  const editable = ['NEGOTIATING', 'PENDING_APPROVAL', 'APPROVED'].includes(app.status) && EDIT_ROLES.includes(role)
  const cur = currentVersion(app)
  const dirty = useMemo(() => JSON.stringify(terms) !== JSON.stringify(app.terms), [terms, app.terms])
  const changes = useMemo(() => diffOf({ vendorInfo: app.vendorInfo, terms: app.terms }, { vendorInfo: app.vendorInfo, terms }), [app, terms])

  const save = () => {
    if (!dirty || !summary.trim()) return
    editTerms(app.id, terms, summary.trim(), ctx)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {['PENDING_APPROVAL', 'APPROVED'].includes(app.status) && (
        <Alert tone="warn" title="该合同当前处于审批中 / 已批准状态">
          任何条款修改都会生成新版本 v{cur.no + 1}，并使已获得的两条审批自动失效，需重新提交审批。
        </Alert>
      )}
      <Card>
        <CardHeader title="磋商条款修改（双方可编辑）" desc={`当前版本 v${cur.no} · 保存后自动生成新版本并使既有审批失效`} extra={<Badge tone="amber">将生成 v{cur.no + 1}</Badge>} />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {Object.entries(TERMS_FIELDS).map(([k, meta]) => (
            <div key={k} className={k === 'specialTerms' ? 'sm:col-span-2' : ''}>
              <MetaInput meta={meta} value={terms[k as keyof Terms]} onChange={(v) => setTerms((p) => ({ ...p, [k]: v }))} disabled={!editable} />
            </div>
          ))}
        </div>
      </Card>

      {dirty && editable && changes.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader title="本次修改差异（生成新版本前确认）" />
          <div className="p-5">
            <DiffTable rows={changes} />
          </div>
        </Card>
      )}

      <Card className="p-5">
        <Field label="修改说明（必填，写入版本历史与操作日志）" required>
          <input className={inputCls} placeholder="如：磋商结果——分成比例 70% → 65%，增加保底采购额条款" value={summary} onChange={(e) => setSummary(e.target.value)} disabled={!editable} />
        </Field>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {editable ? '保存规则：生成 v' + (cur.no + 1) + ' → 既有审批自动失效 → 状态回到「磋商/修改中」，需重新提交双人审批。' : roleNotAllowedText(role, EDIT_ROLES, app.status)}
          </div>
          <Btn onClick={save} disabled={!editable || !dirty || !summary.trim()}>
            保存为新版本 v{cur.no + 1}
          </Btn>
        </div>
      </Card>
    </div>
  )
}

function roleNotAllowedText(role: RoleId, allowed: RoleId[], status: string) {
  if (!allowed.includes(role)) return `当前身份（${roleById(role).name}·${roleById(role).title}）无权执行此操作，请切换身份：${allowed.map((r) => roleById(r).name).join(' / ')}。`
  return `当前状态（${STATUS_META[status as Application['status']].label}）不允许修改条款。`
}

function MetaInput({ meta, value, onChange, disabled }: { meta: { label: string; required?: boolean; type?: string; options?: string[]; placeholder?: string; hint?: string }; value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const common = { className: inputCls, placeholder: meta.placeholder, disabled }
  return (
    <Field label={meta.label} required={meta.required} hint={meta.hint}>
      {meta.type === 'select' ? (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">请选择…</option>
          {meta.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : meta.type === 'textarea' ? (
        <textarea {...common} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input {...common} type={meta.type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
      )}
    </Field>
  )
}

/* ---------------- 版本历史 ---------------- */
interface DiffRow {
  label: string
  section: string
  old: string
  neu: string
}

function diffOf(a: { vendorInfo: VendorInfo; terms: Terms }, b: { vendorInfo: VendorInfo; terms: Terms }): DiffRow[] {
  const rows: DiffRow[] = []
  for (const [k, meta] of Object.entries(VENDOR_FIELDS)) {
    const o = (a.vendorInfo as unknown as Record<string, string>)[k] ?? ''
    const n = (b.vendorInfo as unknown as Record<string, string>)[k] ?? ''
    if (o !== n) rows.push({ label: meta.label, section: '供应商信息', old: o, neu: n })
  }
  for (const [k, meta] of Object.entries(TERMS_FIELDS)) {
    const o = (a.terms as unknown as Record<string, string>)[k] ?? ''
    const n = (b.terms as unknown as Record<string, string>)[k] ?? ''
    if (o !== n) rows.push({ label: meta.label, section: '商业条款', old: o, neu: n })
  }
  return rows
}

function DiffTable({ rows }: { rows: DiffRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-slate-400">无字段差异。</p>
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
            <th className="py-2 pr-4 font-medium">字段</th>
            <th className="py-2 pr-4 font-medium">修改前</th>
            <th className="py-2 font-medium">修改后</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-slate-100 align-top">
              <td className="py-2 pr-4 text-xs text-slate-500">
                <div className="font-medium text-slate-700">{r.label}</div>
                <div>{r.section}</div>
              </td>
              <td className="py-2 pr-4 text-rose-700 line-through decoration-rose-300">{r.old || '（空）'}</td>
              <td className="py-2 font-medium text-emerald-700">{r.neu || '（空）'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VersionsTab({ app }: { app: Application }) {
  const [openDoc, setOpenDoc] = useState<number | null>(null)
  const [openDiff, setOpenDiff] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {[...app.versions].reverse().map((v) => {
        const prev = app.versions.find((x) => x.no === v.no - 1)
        const appr = app.approvals.filter((a) => a.versionNo === v.no)
        const isCurrent = v.no === currentVersion(app).no
        return (
          <Card key={v.no} className={isCurrent ? 'border-blue-300' : ''}>
            <div className="flex flex-wrap items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={v.source === 'initial' ? 'slate' : 'blue'}>v{v.no}</Badge>
                  {isCurrent && <Badge tone="green">当前版本</Badge>}
                  <span className="text-xs text-slate-500">
                    {v.source === 'initial' ? '初始草稿' : '磋商修改'} · {fmtTime(v.createdAt)} · {v.actorName}（{roleById(v.actorRole).title}）
                  </span>
                </div>
                <div className="mt-1.5 text-sm text-slate-700">{v.changeSummary}</div>
                <div className="mt-1 font-mono text-[11px] text-slate-400">快照哈希 {v.hash}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex gap-1.5">
                  {appr.length === 0 && <Badge>该版本无审批记录</Badge>}
                  {appr.map((a) => (
                    <Badge key={a.id} tone={a.invalidated ? 'amber' : a.decision === 'approved' ? 'green' : 'red'}>
                      {a.approverName}@v{a.versionNo} {a.invalidated ? '已失效' : a.decision === 'approved' ? '已批准' : '已退回'}
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Btn size="sm" variant="secondary" onClick={() => setOpenDoc(openDoc === v.no ? null : v.no)}>
                    {openDoc === v.no ? '收起全文' : '查看全文'}
                  </Btn>
                  {prev && (
                    <Btn size="sm" variant="ghost" onClick={() => setOpenDiff(openDiff === v.no ? null : v.no)}>
                      {openDiff === v.no ? '收起对比' : `与 v${prev.no} 对比`}
                    </Btn>
                  )}
                </div>
              </div>
            </div>
            {openDiff === v.no && prev && (
              <div className="border-t border-slate-100 bg-slate-50 p-5">
                <DiffTable rows={diffOf(prev.snapshot, v.snapshot)} />
              </div>
            )}
            {openDoc === v.no && (
              <div className="border-t border-slate-100 p-5">
                <ContractDoc version={v} appTitle={app.title} />
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

/* ---------------- 内部审批 ---------------- */
function ApprovalTab({ app, role }: { app: Application; role: RoleId }) {
  const { decideApproval, submitForApproval } = useStore()
  const ctx = useCtx()
  const cur = currentVersion(app)
  const valid = validApprovals(app)
  const [comments, setComments] = useState<Record<string, string>>({})

  const canSubmit = app.status === 'NEGOTIATING' && SUBMIT_APPROVAL_ROLES.includes(role)
  const gate = gateValidation(app)

  const cardFor = (approverRole: 'approverA' | 'approverB', name: string, duty: string) => {
    const mine = role === approverRole
    const decision = valid.find((a) => a.approverRole === approverRole)
    const rejected = app.approvals.find((a) => a.versionNo === cur.no && !a.invalidated && a.approverRole === approverRole && a.decision === 'rejected')
    const state = decision ? 'approved' : rejected ? 'rejected' : 'pending'
    const history = app.approvals.filter((a) => a.approverRole === approverRole && a.invalidated)
    return (
      <Card className="flex-1">
        <CardHeader
          title={`${name} · ${duty}`}
          extra={
            state === 'approved' ? <Badge tone="green">已批准 v{cur.no}</Badge> : state === 'rejected' ? <Badge tone="red">已退回 v{cur.no}</Badge> : <Badge tone="amber">待审批</Badge>
          }
        />
        <div className="space-y-3 p-5">
          {decision && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              批准时间 {fmtTime(decision.createdAt)} · 意见：{decision.comment || '（无）'}
            </div>
          )}
          {rejected && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
              退回时间 {fmtTime(rejected.createdAt)} · 意见：{rejected.comment || '（无）'}
            </div>
          )}
          {history.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              历史审批（已因版本变更失效）：{history.map((h) => `v${h.versionNo} ${h.decision === 'approved' ? '批准' : '退回'} @ ${fmtTime(h.createdAt)}`).join('；')}
            </div>
          )}
          {app.status === 'PENDING_APPROVAL' && !decision && !rejected && (
            <>
              {mine ? (
                <>
                  <textarea
                    className={inputCls}
                    rows={2}
                    placeholder="审批意见（可选）"
                    value={comments[approverRole] ?? ''}
                    onChange={(e) => setComments((p) => ({ ...p, [approverRole]: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Btn size="sm" onClick={() => decideApproval(app.id, 'approved', comments[approverRole] ?? '', ctx)}>
                      ✅ 批准 v{cur.no}
                    </Btn>
                    <Btn size="sm" variant="danger" onClick={() => decideApproval(app.id, 'rejected', comments[approverRole] ?? '', ctx)}>
                      ↩️ 退回修改
                    </Btn>
                  </div>
                </>
              ) : (
                <p className="text-xs text-slate-400">请切换为 {name} 身份执行审批（右上角角色切换）。</p>
              )}
            </>
          )}
          {app.status !== 'PENDING_APPROVAL' && state === 'pending' && <p className="text-xs text-slate-400">合同未处于「内部审批中」状态。</p>}
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Alert tone="info" title={`双人审批规则`}>
        审批对象严格绑定版本（当前 v{cur.no}，快照哈希 <span className="font-mono">{cur.hash.slice(0, 8)}</span>）。两名审批人（财务 + 法务）均批准同一版本后，合同进入「可发起签署」；
        若此后条款被修改产生新版本，两条审批立即自动失效。
      </Alert>

      {app.status === 'NEGOTIATING' && (
        <Card className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-slate-600">
              {gate.ok ? `当前 v${cur.no} 校验通过，可提交内部审批。` : `暂不可提交审批：${gate.reasons.join('；')}`}
            </div>
            <Btn disabled={!canSubmit || !gate.ok} onClick={() => submitForApproval(app.id, ctx)} title={!SUBMIT_APPROVAL_ROLES.includes(role) ? '请切换为 商务负责人/法务 身份' : undefined}>
              提交内部审批（v{cur.no}）
            </Btn>
          </div>
        </Card>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        {cardFor('approverA', '王芸', '审批人 A · 财务负责人')}
        {cardFor('approverB', '陈曦', '审批人 B · 法务负责人')}
      </div>

      {app.status === 'APPROVED' && (
        <Alert tone="success" title={`v${cur.no} 已获双人批准`}>
          发起签署的三重门禁已满足，可前往「电子签署」发起 Mock 电子签。
        </Alert>
      )}
    </div>
  )
}

/* ---------------- 电子签署（Mock）---------------- */
function SignTab({ app, role, goto }: { app: Application; role: RoleId; goto: (t: TabKey) => void }) {
  const { initiateSign, signAs } = useStore()
  const ctx = useCtx()
  const gate = gateCanInitiateSign(app)
  const env = app.envelope
  const cur = currentVersion(app)

  return (
    <div className="space-y-4">
      <Alert tone="info" title="Mock 电子签（演示）">
        签署信封、签署人、CC、签署状态与证书编号均为本地 Mock。正式环境此处对接 DocuSign / e签宝 / 法大大 API：创建信封 → 获取签署链接 → Webhook 回传签署状态 → 拉取完成证书。
      </Alert>

      {env.status === 'not_started' && (
        <Card className="p-5">
          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-800">发起签署前门禁自检</div>
            <GateRow ok={gateValidation(app).ok} label="① 信息完整性校验通过" reasons={gateValidation(app).reasons} />
            <GateRow ok={gateApprovals(app).ok} label="② 当前版本已获两名审批人批准" reasons={gateApprovals(app).reasons} />
            <GateRow ok={app.status === 'APPROVED'} label="③ 合同处于「已批准」状态" reasons={app.status === 'APPROVED' ? [] : [`当前状态：${STATUS_META[app.status].label}`]} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <div className="text-xs text-slate-500">
                {INITIATE_SIGN_ROLES.includes(role)
                  ? `将以 ${ctx.actorName}（${roleById(role).title}）身份发起；签署文件：v${cur.no}（哈希 ${cur.hash.slice(0, 8)}…）`
                  : '发起签署需 商务负责人 / 法务 身份。'}
              </div>
              <Btn disabled={!gate.ok || !INITIATE_SIGN_ROLES.includes(role)} onClick={() => initiateSign(app.id, ctx)}>
                发起 Mock 电子签
              </Btn>
            </div>
          </div>
        </Card>
      )}

      {env.status !== 'not_started' && (
        <Card>
          <CardHeader
            title="签署信封"
            desc={`${env.initiatedBy} 于 ${fmtTime(env.initiatedAt)} 发起 · 文档哈希 ${env.docHash?.slice(0, 12)}…`}
            extra={env.status === 'completed' ? <Badge tone="green">已完成</Badge> : <Badge tone="amber">签署中</Badge>}
          />
          <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              {env.signers.map((s) => (
                <div key={s.id} className={`rounded-xl border p-4 ${s.status === 'signed' ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200'}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        {s.name}
                        <Badge tone={s.party === 'vendor' ? 'amber' : 'blue'}>{s.party === 'vendor' ? '供应商方' : '我方'}</Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {s.title} · {s.email}
                      </div>
                    </div>
                    {s.status === 'signed' ? (
                      <div className="text-right">
                        <Badge tone="green">已签署</Badge>
                        <div className="mt-1 font-mono text-[10px] text-slate-400">
                          {fmtTime(s.signedAt)} · {s.certId}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge tone="amber">待签署</Badge>
                        {role === s.signRole && app.status === 'SIGNING' ? (
                          <Btn size="sm" onClick={() => signAs(app.id, s.id, ctx)}>
                            ✍️ 以 {s.name} 身份签署
                          </Btn>
                        ) : (
                          <span className="text-[11px] text-slate-400">切换为 {roleById(s.signRole).name} 身份可签署</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-500">抄送（CC）</div>
              <ul className="mt-2 space-y-1.5 text-sm text-slate-700">
                {env.cc.map((c) => (
                  <li key={c.email} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    {c.name}
                    <div className="text-xs text-slate-400">{c.email}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {env.status === 'completed' && (
            <div className="border-t border-slate-100 p-5">
              <Alert tone="success" title={`全部签署完成（${fmtTime(env.completedAt)}）`}>
                合同已归档，签署证明与证据包见「归档」页。
                <div className="mt-2">
                  <Btn size="sm" variant="secondary" onClick={() => goto('archive')}>
                    查看归档证据包 →
                  </Btn>
                </div>
              </Alert>
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

/* ---------------- 归档 ---------------- */
function ArchiveTab({ app, goto }: { app: Application; goto: (t: TabKey) => void }) {
  const env = app.envelope

  if (app.status !== 'ARCHIVED' || !app.archive) {
    return (
      <Card className="p-6">
        <Alert tone="info" title="归档尚未开始">
          双方在 Mock 电子签中完成签署后，系统自动生成归档证据包，包含：合同终稿、内部审批记录、签署证明、完整操作日志、结算信息卡。
          <div className="mt-3">
            <Btn size="sm" variant="secondary" onClick={() => goto('sign')}>
              前往电子签署 →
            </Btn>
          </div>
        </Alert>
      </Card>
    )
  }

  const arc = app.archive
  const t = app.terms

  const exportAudit = () => {
    const blob = new Blob([JSON.stringify({ application: { id: app.id, title: app.title }, archive: arc, logs: app.logs, envelope: app.envelope, approvals: app.approvals, versions: app.versions.map((v) => ({ no: v.no, hash: v.hash, createdAt: v.createdAt, actor: v.actorName, changeSummary: v.changeSummary })) }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-${app.id}-v${arc.finalVersionNo}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Alert tone="success" title={`已归档 · ${fmtTime(arc.archivedAt)} · 终稿 v${arc.finalVersionNo}（哈希 ${arc.finalVersionHash.slice(0, 8)}…）`}>
        归档不是「存一份合同文档」，而是一条可追溯的证据链：从提交、每一次版本变更、双人审批到双方签署，全部可回溯，并对接付款/结算执行。
      </Alert>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="归档证据包" desc="签署完成后自动生成" extra={<Btn size="sm" variant="secondary" onClick={exportAudit}>导出审计 JSON</Btn>} />
          <ul className="divide-y divide-slate-100">
            {arc.evidence.map((e) => (
              <li key={e.ref} className="flex items-start justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                    {e.name}
                    {e.mock && <Badge tone="amber">Mock</Badge>}
                  </div>
                  <div className="mt-0.5 text-xs leading-5 text-slate-500">{e.desc}</div>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-slate-400">{e.ref}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
            <Btn size="sm" variant="secondary" onClick={() => goto('preview')}>
              查看/打印合同终稿 →
            </Btn>
            <Btn size="sm" variant="ghost" onClick={() => goto('logs')}>
              查看操作日志 →
            </Btn>
          </div>
        </Card>

        <Card>
          <CardHeader title="结算信息卡（付款/结算执行入口）" desc="财务按此卡执行周期性结算" />
          <div className="px-5 py-3">
            <KV k="供应商" v={app.vendorInfo.legalName} />
            <KV k="结算周期" v={t.settlementCycle} />
            <KV k="结算方式" v={t.settlementMethod} />
            <KV k="币种" v={t.currency} />
            <KV k="供应商分成比例" v={`${t.shareRatio}%`} />
            <KV k="收入计算口径" v={t.revenueBasis} />
            <KV k="退款处理" v={t.refundHandling} />
            <KV k="首个结算日（预估）" v={nextSettlementDate(t.startDate, t.settlementCycle)} />
          </div>
          <div className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-500">
            真实系统中，此卡片推送至财务/结算系统生成付款任务；对账单与付款凭证回传后挂接在本归档下。当前为演示数据。
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="签署证明（Mock）" desc="各方签署时间与证书编号" />
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          {env.signers.map((s) => (
            <div key={s.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
              <div className="font-medium text-slate-800">
                {s.name}（{s.party === 'vendor' ? '供应商方' : '我方'}）
              </div>
              <div className="mt-1 text-xs text-slate-500">签署时间：{fmtTime(s.signedAt)}</div>
              <div className="mt-0.5 font-mono text-xs text-slate-500">证书：{s.certId}</div>
              <div className="mt-0.5 font-mono text-[10px] text-slate-400">文档哈希：{env.docHash}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

/* ---------------- 操作日志 ---------------- */
const ACTION_TONE: Record<string, 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet'> = {
  CREATE: 'slate',
  VALIDATE_FAIL: 'red',
  VALIDATE_PASS: 'green',
  DRAFT_GENERATED: 'blue',
  TERM_EDITED: 'amber',
  APPROVALS_INVALIDATED: 'red',
  SUBMIT_APPROVAL: 'violet',
  APPROVE_PASS: 'green',
  APPROVE_REJECT: 'red',
  APPROVAL_REJECTED: 'red',
  ALL_APPROVED: 'green',
  SIGN_INITIATED: 'blue',
  SIGNED: 'green',
  ARCHIVED: 'green',
}

function LogsTab({ app }: { app: Application }) {
  return (
    <Card>
      <CardHeader title="操作日志（不可变审计记录）" desc="谁、在什么时候、做了什么、状态如何流转" extra={<Badge>{app.logs.length} 条</Badge>} />
      <ol className="divide-y divide-slate-100">
        {[...app.logs].map((l) => (
          <li key={l.id} className="flex flex-wrap items-start gap-3 px-5 py-3">
            <span className="w-36 shrink-0 font-mono text-xs text-slate-400">{fmtTime(l.at)}</span>
            <span className="w-40 shrink-0 text-xs">
              <span className="font-semibold text-slate-700">{l.actorName}</span>
              <span className="block text-slate-400">{roleById(l.actorRole).title}</span>
            </span>
            <Badge tone={ACTION_TONE[l.action] ?? 'slate'}>{l.action}</Badge>
            <span className="min-w-0 flex-1 text-sm leading-6 text-slate-700">{l.detail}</span>
            {l.statusFrom && l.statusTo && (
              <span className="shrink-0 text-[11px] text-slate-400">
                {STATUS_META[l.statusFrom].label.split('（')[0]} → {STATUS_META[l.statusTo].label.split('（')[0]}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Card>
  )
}
