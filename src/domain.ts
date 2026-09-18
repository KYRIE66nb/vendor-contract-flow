import type {
  Application,
  AppStatus,
  GateResult,
  MissingField,
  RoleId,
  RoleInfo,
  Terms,
  ValidationResult,
  VendorInfo,
} from './types'

// ---------- 我方主体（示例公司，签署中的“乙方”）----------
export const COMPANY_NAME = '示例科技（中国）有限公司'
export const COMPANY_SIGNER = { name: '张岚', title: '副总裁（渠道合作）', email: 'zhang.lan@example-tech.cn' }

// ---------- 角色（Mock 登录：顶部切换器）----------
export const ROLES: RoleInfo[] = [
  { id: 'vendor', name: '李文博', org: 'vendor', title: '供应商签字人 / CTO', desc: '填写与提交供应商信息、磋商条款、代表供应商签署' },
  { id: 'biz', name: '赵启明', org: 'company', title: '商务负责人', desc: '跟进流程、磋商条款、提交内部审批' },
  { id: 'legal', name: '孙倩', org: 'company', title: '法务', desc: '检查条款完整性、磋商条款' },
  { id: 'approverA', name: '王芸', org: 'company', title: '审批人 A · 财务负责人', desc: '对当前版本行使财务审批' },
  { id: 'approverB', name: '陈曦', org: 'company', title: '审批人 B · 法务负责人', desc: '对当前版本行使法务审批' },
  { id: 'signerCompany', name: '张岚', org: 'company', title: '我方签署人', desc: '代表公司完成电子签署' },
]

export const roleById = (id: RoleId): RoleInfo => ROLES.find((r) => r.id === id) ?? ROLES[0]

// ---------- 状态元数据 ----------
export const STATUS_META: Record<AppStatus, { label: string; cls: string; step: number; desc: string }> = {
  FILLING: { label: '填写中', cls: 'bg-gray-100 text-gray-700 border-gray-300', step: 0, desc: '供应商正在填写信息与商业条款' },
  NEEDS_INFORMATION: { label: 'Needs Information（信息缺失，已阻断）', cls: 'bg-amber-50 text-amber-800 border-amber-300', step: 0, desc: '关键字段缺失，无法生成草稿、无法发起签署' },
  NEGOTIATING: { label: '磋商/修改中', cls: 'bg-blue-50 text-blue-800 border-blue-300', step: 1, desc: '草稿已生成，双方可修改条款（保存即产生新版本）' },
  PENDING_APPROVAL: { label: '内部审批中', cls: 'bg-violet-50 text-violet-800 border-violet-300', step: 2, desc: '等待两名审批人对当前版本作出决定' },
  APPROVED: { label: '已批准（可发起签署）', cls: 'bg-teal-50 text-teal-800 border-teal-300', step: 3, desc: '当前版本已获两人批准，满足发起签署门禁' },
  SIGNING: { label: '签署中（Mock）', cls: 'bg-indigo-50 text-indigo-800 border-indigo-300', step: 4, desc: 'Mock 电子签信封已发出，等待各方签署' },
  ARCHIVED: { label: '已签署归档', cls: 'bg-emerald-50 text-emerald-800 border-emerald-300', step: 5, desc: '双方签署完成，证据包与结算信息已归档' },
}

// ---------- 字段元数据 ----------
type FieldMeta = { label: string; required: boolean; type?: 'email' | 'number' | 'select' | 'textarea' | 'date'; options?: string[]; placeholder?: string; hint?: string }

export const VENDOR_FIELDS: Record<keyof VendorInfo, FieldMeta> = {
  legalName: { label: '公司法定名称', required: true, placeholder: '如：星澜科技（上海）有限公司' },
  registrationPlace: { label: '注册地（国家/地区）', required: true, placeholder: '如：中国·上海' },
  registeredAddress: { label: '注册地址', required: true, placeholder: '如：上海市浦东新区XX路88号' },
  productName: { label: '产品/服务概述', required: true, placeholder: '如：智能语音转写 API（SaaS）' },
  signatoryName: { label: '签字人姓名', required: true, placeholder: '如：李文博' },
  signatoryTitle: { label: '签字人职务', required: true, placeholder: '如：CTO' },
  signatoryEmail: { label: '签字人邮箱', required: true, type: 'email', placeholder: 'name@company.com' },
}

export const TERMS_FIELDS: Record<keyof Terms, FieldMeta> = {
  authorizationScope: {
    label: '授权范围', required: true, type: 'select',
    options: ['非独占分销权（可转售）', '非独占推广引荐权（不可转售）', '独家分销权（限定渠道）'],
  },
  territory: { label: '授权地域', required: true, type: 'select', options: ['中国大陆', '大中华地区', '亚太地区', '全球（受出口管制清单约束）'] },
  pricingModel: { label: '收费方式', required: true, type: 'select', options: ['按量计费（API 调用量）', '年度订阅（含用量阶梯）', '买断式许可'] },
  currency: { label: '币种', required: true, type: 'select', options: ['CNY 人民币', 'USD 美元', 'EUR 欧元'] },
  revenueBasis: {
    label: '收入计算口径', required: true,
    placeholder: '如：净收入 = 客户实付金额 − 退款 − 税费 − 渠道费',
    hint: '分成比例的计算基数，务必写清扣减项',
  },
  shareRatio: { label: '供应商分成比例（%）', required: true, type: 'number', placeholder: '如：70', hint: '占净收入的百分比，0–100' },
  settlementCycle: { label: '结算周期', required: true, type: 'select', options: ['自然月结算（次月15日前）', '自然季度结算（次季首月15日前）', '半自然月结算'] },
  settlementMethod: { label: '结算方式', required: true, type: 'select', options: ['银行转账（对公账户）', '第三方支付平台', '平台内钱包余额'] },
  refundHandling: { label: '退款处理', required: true, type: 'select', options: ['退款从当期分成中等额扣除', '供应商按分成比例承担退款', '我方先行垫付，下期结算时抵扣'] },
  agreementTerm: { label: '协议有效期（月）', required: true, type: 'number', placeholder: '如：12' },
  startDate: { label: '生效日期', required: true, type: 'date' },
  specialTerms: { label: '特殊条款（可选）', required: false, type: 'textarea', placeholder: '如：月用量超 1000 万次调用时，分成比例上浮 2 个百分点' },
}

// ---------- 校验：绝不猜测、绝不补默认值 ----------
const emailOk = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

export function validate(vendorInfo: VendorInfo, terms: Terms): ValidationResult {
  const missing: MissingField[] = []
  const push = (section: 'vendorInfo' | 'terms', field: string, label: string, reason: string) =>
    missing.push({ section, field, label, reason })

  const v = vendorInfo as unknown as Record<string, string>
  for (const [key, meta] of Object.entries(VENDOR_FIELDS)) {
    if (!meta.required) continue
    const val = (v[key] ?? '').trim()
    if (!val) push('vendorInfo', key, meta.label, '必填字段为空')
    else if (meta.type === 'email' && !emailOk(val)) push('vendorInfo', key, meta.label, '邮箱格式不正确')
  }

  const t = terms as unknown as Record<string, string>
  for (const [key, meta] of Object.entries(TERMS_FIELDS)) {
    if (!meta.required) continue
    const val = (t[key] ?? '').trim()
    if (!val) push('terms', key, meta.label, '必填字段为空')
    else if (meta.type === 'number') {
      const n = Number(val)
      if (!Number.isFinite(n)) push('terms', key, meta.label, '必须是数字')
      else if (key === 'shareRatio' && (n <= 0 || n > 100)) push('terms', key, meta.label, '必须在 (0, 100] 区间')
      else if (key === 'agreementTerm' && (n <= 0 || !Number.isInteger(n))) push('terms', key, meta.label, '必须是正整数（月）')
    }
  }
  return { ok: missing.length === 0, missing }
}

// ---------- 版本快照哈希 ----------
export function snapshotHash(vendorInfo: VendorInfo, terms: Terms): string {
  const raw = JSON.stringify({ vendorInfo, terms })
  let h = 5381
  for (let i = 0; i < raw.length; i++) h = ((h << 5) + h + raw.charCodeAt(i)) >>> 0
  let g = 52711
  for (let i = raw.length - 1; i >= 0; i--) g = ((g << 5) + g + raw.charCodeAt(i)) >>> 0
  return (h.toString(16).padStart(8, '0') + g.toString(16).padStart(8, '0')).toUpperCase()
}

// ---------- 门禁（纯函数，UI 与 store 双重调用）----------
export function currentVersion(app: Application) {
  return app.versions[app.versions.length - 1]
}

export function validApprovals(app: Application) {
  const cur = currentVersion(app)
  return app.approvals.filter((a) => !a.invalidated && a.versionNo === cur.no && a.versionHash === cur.hash && a.decision === 'approved')
}

/** 门禁一：信息完整性（生成草稿、提交审批、发起签署均要求） */
export function gateValidation(app: Application): GateResult {
  const res = validate(app.vendorInfo, app.terms)
  return { ok: res.ok, reasons: res.ok ? [] : [`关键字段缺失 ${res.missing.length} 项：${res.missing.map((m) => m.label).join('、')}`] }
}

/** 门禁二：当前版本已获两名审批人批准 */
export function gateApprovals(app: Application): GateResult {
  const cur = currentVersion(app)
  if (!cur) return { ok: false, reasons: ['尚无合同版本'] }
  const ok = validApprovals(app)
  const reasons: string[] = []
  if (!ok.some((a) => a.approverRole === 'approverA')) reasons.push('审批人 A（财务负责人 王芸）尚未批准当前版本')
  if (!ok.some((a) => a.approverRole === 'approverB')) reasons.push('审批人 B（法务负责人 陈曦）尚未批准当前版本')
  return { ok: reasons.length === 0, reasons }
}

/** 发起签署：三重门禁（完整性 + 双人审批 + 版本一致） */
export function gateCanInitiateSign(app: Application): GateResult {
  const g1 = gateValidation(app)
  const g2 = gateApprovals(app)
  const reasons = [...g1.reasons, ...g2.reasons]
  const invalidated = app.approvals.filter((a) => a.invalidated)
  if (invalidated.length > 0 && app.status !== 'APPROVED') {
    reasons.push(`存在 ${invalidated.length} 条因版本变更而失效的历史审批，需基于当前版本重新审批`)
  }
  return { ok: g1.ok && g2.ok && app.status === 'APPROVED', reasons }
}

/** 各状态允许的操作（按角色收敛在 store/UI 中） */
export const STATUS_FLOW: AppStatus[] = ['FILLING', 'NEGOTIATING', 'PENDING_APPROVAL', 'APPROVED', 'SIGNING', 'ARCHIVED']

// ---------- 工具 ----------
export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`

export const fmtTime = (iso?: string) => {
  if (!iso) return '—'
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

export const mockCertId = () => `MOCK-CERT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`

export function nextSettlementDate(startDate: string, cycle: string): string {
  const d = new Date(startDate)
  if (Number.isNaN(d.getTime())) return '—'
  if (cycle.includes('季度')) d.setMonth(d.getMonth() + 3)
  else d.setMonth(d.getMonth() + 1)
  d.setDate(15)
  return d.toISOString().slice(0, 10)
}
