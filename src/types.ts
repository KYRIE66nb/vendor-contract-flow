// ---------- 角色 ----------
export type RoleId = 'vendor' | 'biz' | 'legal' | 'approverA' | 'approverB' | 'signerCompany'

export interface RoleInfo {
  id: RoleId
  name: string
  org: 'vendor' | 'company'
  title: string
  desc: string
}

// ---------- 状态机 ----------
export type AppStatus =
  | 'FILLING' // 供应商填写中（未提交）
  | 'NEEDS_INFORMATION' // 已提交但缺关键字段（阻断，不可生成草稿/发签）
  | 'NEGOTIATING' // 草稿已生成，双方磋商/修改中
  | 'PENDING_APPROVAL' // 已提交内部审批，等待审批人决策
  | 'APPROVED' // 当前版本已获两名审批人批准（可发起签署）
  | 'SIGNING' // Mock 电子签进行中
  | 'ARCHIVED' // 双方签署完成，证据已归档

// ---------- 表单数据 ----------
export interface VendorInfo {
  legalName: string // 公司法定名称
  registrationPlace: string // 注册地
  registeredAddress: string // 注册地址
  productName: string // 产品/服务概述
  signatoryName: string // 签字人姓名
  signatoryTitle: string // 签字人职务
  signatoryEmail: string // 签字人邮箱
}

export interface Terms {
  authorizationScope: string // 授权范围
  territory: string // 授权地域
  pricingModel: string // 收费方式
  currency: string // 币种
  revenueBasis: string // 收入计算口径
  shareRatio: string // 分成比例（供应商分成 %）
  settlementCycle: string // 结算周期
  settlementMethod: string // 结算方式
  refundHandling: string // 退款处理
  agreementTerm: string // 协议有效期（月）
  startDate: string // 生效日期
  specialTerms: string // 特殊条款（可选）
}

// ---------- 版本 / 审批 / 签署 / 日志 ----------
export interface Version {
  no: number
  createdAt: string
  actorRole: RoleId
  actorName: string
  changeSummary: string
  snapshot: { vendorInfo: VendorInfo; terms: Terms }
  hash: string
  source: 'initial' | 'edit'
}

export interface Approval {
  id: string
  versionNo: number
  versionHash: string
  approverRole: 'approverA' | 'approverB'
  approverName: string
  decision: 'approved' | 'rejected'
  comment: string
  createdAt: string
  invalidated: boolean
  invalidatedAt?: string
  invalidReason?: string
}

export interface Signer {
  id: string
  name: string
  title: string
  email: string
  party: 'vendor' | 'company'
  status: 'pending' | 'signed'
  signedAt?: string
  certId?: string // Mock 签署证书编号
  signRole: RoleId // 用哪个演示身份代为签署
}

export interface SignEnvelope {
  status: 'not_started' | 'pending' | 'completed'
  initiatedBy?: string
  initiatedAt?: string
  docHash?: string
  signers: Signer[]
  cc: { name: string; email: string }[]
  completedAt?: string
}

export interface EvidenceItem {
  name: string
  desc: string
  ref: string // 文档编号（Mock）
  mock: boolean
}

export interface Archive {
  archivedAt: string
  finalVersionNo: number
  finalVersionHash: string
  evidence: EvidenceItem[]
}

export interface LogEntry {
  id: string
  at: string
  actorRole: RoleId
  actorName: string
  action: string
  detail: string
  statusFrom?: AppStatus
  statusTo?: AppStatus
}

// ---------- 聚合根：一笔供应商合同流程 ----------
export interface Application {
  id: string
  createdAt: string
  title: string
  vendorInfo: VendorInfo
  terms: Terms
  status: AppStatus
  missingFields: MissingField[] // 最近一次校验的缺失清单
  versions: Version[]
  approvals: Approval[]
  envelope: SignEnvelope
  archive?: Archive
  logs: LogEntry[]
}

export interface MissingField {
  section: 'vendorInfo' | 'terms'
  field: string
  label: string
  reason: string
}

// ---------- 校验结果 / 门禁 ----------
export interface ValidationResult {
  ok: boolean
  missing: MissingField[]
}

export interface GateResult {
  ok: boolean
  reasons: string[]
}
