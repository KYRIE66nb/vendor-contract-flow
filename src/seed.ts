import { COMPANY_SIGNER, mockCertId, snapshotHash } from './domain'
import type { Application, Terms, VendorInfo } from './types'

const offset = (base: number, min: number) => new Date(base + min * 60_000).toISOString()

const fullVendor: VendorInfo = {
  legalName: '星澜科技（上海）有限公司',
  registrationPlace: '中国·上海',
  registeredAddress: '上海市浦东新区世纪大道 1001 号 环球金融中心 32F',
  productName: '智能语音转写 API（SaaS）',
  signatoryName: '李文博',
  signatoryTitle: 'CTO',
  signatoryEmail: 'liwenbo@stellarwave.cn',
}

const fullTerms: Terms = {
  authorizationScope: '非独占分销权（可转售）',
  territory: '中国大陆',
  pricingModel: '按量计费（API 调用量）',
  currency: 'CNY 人民币',
  revenueBasis: '净收入 = 客户实付金额 − 退款 − 增值税 − 支付渠道手续费',
  shareRatio: '70',
  settlementCycle: '自然月结算（次月15日前）',
  settlementMethod: '银行转账（对公账户）',
  refundHandling: '退款从当期分成中等额扣除',
  agreementTerm: '12',
  startDate: new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
  specialTerms: '单月调用量超过 1,000 万次时，供应商分成比例上浮 2 个百分点（当月生效）。',
}

function blankApp(id: string, title: string, base: number): Application {
  return {
    id,
    createdAt: offset(base, 0),
    title,
    vendorInfo: { ...fullVendor },
    terms: { ...fullTerms },
    status: 'FILLING',
    missingFields: [],
    versions: [],
    approvals: [],
    envelope: { status: 'not_started', signers: [], cc: [] },
    logs: [],
  }
}

/** 用例 A：星澜科技 · 信息齐全，等待提交（演示主流程的起点） */
function caseA(): Application {
  const base = Date.now() - 30 * 60_000
  const a = blankApp('VC-DEMO-A', '星澜科技 · 智能语音转写 API 分销协议', base)
  a.logs.push({
    id: 'log-a0',
    at: offset(base, 1),
    actorRole: 'vendor',
    actorName: '李文博',
    action: 'CREATE',
    detail: '创建供应商合同申请：星澜科技 · 智能语音转写 API 分销协议',
    statusTo: 'FILLING',
  })
  return a
}

/** 用例 B：云帆传媒 · 故意缺失「分成比例」「结算方式」，演示 Needs Information 阻断 */
function caseB(): Application {
  const base = Date.now() - 20 * 60_000
  const a = blankApp('VC-DEMO-B', '云帆传媒 · 短视频内容分发收益分成协议', base)
  a.vendorInfo = {
    legalName: '云帆传媒（杭州）有限公司',
    registrationPlace: '中国·杭州',
    registeredAddress: '杭州市余杭区文一西路 969 号',
    productName: '短视频内容包（月度授权）',
    signatoryName: '周雨桐',
    signatoryTitle: '总经理',
    signatoryEmail: 'zhou.yutong@yunfanmedia.cn',
  }
  a.terms = {
    ...fullTerms,
    authorizationScope: '非独占推广引荐权（不可转售）',
    territory: '大中华地区',
    pricingModel: '年度订阅（含用量阶梯）',
    currency: 'CNY 人民币',
    revenueBasis: '净收入 = 客户实付金额 − 退款 − 增值税',
    shareRatio: '', // ← 缺失：分成比例
    settlementCycle: '自然季度结算（次季首月15日前）',
    settlementMethod: '', // ← 缺失：结算方式
    specialTerms: '',
  }
  a.logs.push({
    id: 'log-b0',
    at: offset(base, 1),
    actorRole: 'vendor',
    actorName: '李文博',
    action: 'CREATE',
    detail: '创建供应商合同申请：云帆传媒 · 短视频内容包收益分成协议（模板演示数据）',
    statusTo: 'FILLING',
  })
  return a
}

/** 用例 C：已经走完全程的成品（提交→v1→磋商 v2→双人审批→签署→归档），供快速查看终态 */
function caseC(): Application {
  const base = Date.now() - 3 * 24 * 60 * 60_000 // 3 天前开始
  const a = blankApp('VC-DEMO-C', '奥创智能 · 机器学习平台分销协议', base)
  a.vendorInfo = {
    legalName: '奥创智能科技（北京）有限公司',
    registrationPlace: '中国·北京',
    registeredAddress: '北京市海淀区中关村南大街 6 号',
    productName: 'Aurora 机器学习平台（SaaS 订阅）',
    signatoryName: '郑海涛',
    signatoryTitle: 'COO',
    signatoryEmail: 'zheng.haitao@aochuang.ai',
  }
  const termsV1: Terms = { ...fullTerms, shareRatio: '60', specialTerms: '' }
  const termsV2: Terms = { ...termsV1, shareRatio: '65', specialTerms: '首年保底采购额 50 万元，未达部分次年续约时分成比例下调 3 个百分点。' }
  a.terms = { ...termsV2 }

  const h1 = snapshotHash(a.vendorInfo, termsV1)
  const h2 = snapshotHash(a.vendorInfo, termsV2)

  a.versions = [
    { no: 1, createdAt: offset(base, 10), actorRole: 'vendor', actorName: '郑海涛', changeSummary: '供应商首次提交，生成初始草稿', snapshot: { vendorInfo: { ...a.vendorInfo }, terms: termsV1 }, hash: h1, source: 'initial' },
    { no: 2, createdAt: offset(base, 60 * 26), actorRole: 'biz', actorName: '赵启明', changeSummary: '磋商结果：分成比例 60% → 65%，增加首年保底采购额条款', snapshot: { vendorInfo: { ...a.vendorInfo }, terms: termsV2 }, hash: h2, source: 'edit' },
  ]

  a.approvals = [
    { id: 'apr-c1', versionNo: 1, versionHash: h1, approverRole: 'approverA', approverName: '王芸', decision: 'approved', comment: '分成比例与结算方式可接受', createdAt: offset(base, 30), invalidated: true, invalidatedAt: offset(base, 60 * 26), invalidReason: '合同内容已修改并生成新版本 v2，针对 v1 的审批自动失效' },
    { id: 'apr-c2', versionNo: 1, versionHash: h1, approverRole: 'approverB', approverName: '陈曦', decision: 'approved', comment: '条款无法律风险', createdAt: offset(base, 40), invalidated: true, invalidatedAt: offset(base, 60 * 26), invalidReason: '合同内容已修改并生成新版本 v2，针对 v1 的审批自动失效' },
    { id: 'apr-c3', versionNo: 2, versionHash: h2, approverRole: 'approverA', approverName: '王芸', decision: 'approved', comment: '65% 分成 + 保底采购额组合可行', createdAt: offset(base, 60 * 28), invalidated: false },
    { id: 'apr-c4', versionNo: 2, versionHash: h2, approverRole: 'approverB', approverName: '陈曦', decision: 'approved', comment: '修改后条款无法律风险，同意发签', createdAt: offset(base, 60 * 29), invalidated: false },
  ]

  a.envelope = {
    status: 'completed',
    initiatedBy: '赵启明',
    initiatedAt: offset(base, 60 * 30),
    docHash: h2,
    signers: [
      { id: 'sgn-c1', name: '郑海涛', title: 'COO', email: 'zheng.haitao@aochuang.ai', party: 'vendor', status: 'signed', signedAt: offset(base, 60 * 31), certId: mockCertId(), signRole: 'vendor' },
      { id: 'sgn-c2', name: COMPANY_SIGNER.name, title: COMPANY_SIGNER.title, email: COMPANY_SIGNER.email, party: 'company', status: 'signed', signedAt: offset(base, 60 * 32), certId: mockCertId(), signRole: 'signerCompany' },
    ],
    cc: [
      { name: '赵启明（商务负责人）', email: 'zhao.qiming@example-tech.cn' },
      { name: '孙倩（法务）', email: 'sun.qian@example-tech.cn' },
    ],
    completedAt: offset(base, 60 * 32),
  }

  const h8 = h2.slice(0, 8)
  a.archive = {
    archivedAt: offset(base, 60 * 32),
    finalVersionNo: 2,
    finalVersionHash: h2,
    evidence: [
      { name: '合同终稿（v2）', desc: '双方签署版本的合同全文，可打印/导出 PDF', ref: `DOC-${h8}`, mock: false },
      { name: '内部审批记录', desc: '针对 v2 的两名审批人批准记录（王芸·财务 / 陈曦·法务），含审批意见与时间戳', ref: `APR-${h8}`, mock: false },
      { name: '签署证明（Mock）', desc: `各方签署证书 ${a.envelope.signers.map((x) => x.certId).join(' / ')}，文档哈希 ${h2}`, ref: `CERT-${h8}`, mock: true },
      { name: '操作审计日志', desc: '从提交到归档的全量操作日志，可导出 JSON 留档', ref: `AUDIT-${h8}`, mock: false },
      { name: '结算信息卡', desc: '结算周期/方式/币种/分成比例与首个结算日，供财务执行付款结算', ref: `STL-${h8}`, mock: false },
    ],
  }
  a.status = 'ARCHIVED'

  a.logs = [
    { id: 'log-c0', at: offset(base, 1), actorRole: 'vendor', actorName: '郑海涛', action: 'CREATE', detail: '创建供应商合同申请：奥创智能 · Aurora 机器学习平台分销协议', statusTo: 'FILLING' },
    { id: 'log-c1', at: offset(base, 10), actorRole: 'vendor', actorName: '郑海涛', action: 'VALIDATE_PASS', detail: '信息完整性校验通过（无缺失字段）' },
    { id: 'log-c2', at: offset(base, 10), actorRole: 'vendor', actorName: '郑海涛', action: 'DRAFT_GENERATED', detail: `根据合同模板自动生成合同草稿 v1（快照哈希 ${h1}）`, statusFrom: 'FILLING', statusTo: 'NEGOTIATING' },
    { id: 'log-c3', at: offset(base, 25), actorRole: 'biz', actorName: '赵启明', action: 'SUBMIT_APPROVAL', detail: '将合同 v1 提交内部审批（需审批人 A、B 双人批准）', statusFrom: 'NEGOTIATING', statusTo: 'PENDING_APPROVAL' },
    { id: 'log-c4', at: offset(base, 30), actorRole: 'approverA', actorName: '王芸', action: 'APPROVE_PASS', detail: '审批人 王芸（财务负责人）批准合同 v1。意见：分成比例与结算方式可接受' },
    { id: 'log-c5', at: offset(base, 40), actorRole: 'approverB', actorName: '陈曦', action: 'APPROVE_PASS', detail: '审批人 陈曦（法务负责人）批准合同 v1。意见：条款无法律风险' },
    { id: 'log-c6', at: offset(base, 40), actorRole: 'approverB', actorName: '陈曦', action: 'ALL_APPROVED', detail: '合同 v1 已获两名审批人批准，进入「可发起签署」状态', statusFrom: 'PENDING_APPROVAL', statusTo: 'APPROVED' },
    { id: 'log-c7', at: offset(base, 60 * 26), actorRole: 'biz', actorName: '赵启明', action: 'TERM_EDITED', detail: `条款修改保存为新版本 v2（快照哈希 ${h2}）。修改说明：磋商结果：分成比例 60% → 65%，增加首年保底采购额条款`, statusFrom: 'APPROVED', statusTo: 'NEGOTIATING' },
    { id: 'log-c8', at: offset(base, 60 * 26), actorRole: 'biz', actorName: '赵启明', action: 'APPROVALS_INVALIDATED', detail: '2 条内部审批因版本变更自动失效（王芸@v1、陈曦@v1），需基于 v2 重新审批' },
    { id: 'log-c9', at: offset(base, 60 * 27), actorRole: 'legal', actorName: '孙倩', action: 'SUBMIT_APPROVAL', detail: '将合同 v2 提交内部审批（需审批人 A、B 双人批准）', statusFrom: 'NEGOTIATING', statusTo: 'PENDING_APPROVAL' },
    { id: 'log-c10', at: offset(base, 60 * 28), actorRole: 'approverA', actorName: '王芸', action: 'APPROVE_PASS', detail: '审批人 王芸（财务负责人）批准合同 v2。意见：65% 分成 + 保底采购额组合可行' },
    { id: 'log-c11', at: offset(base, 60 * 29), actorRole: 'approverB', actorName: '陈曦', action: 'APPROVE_PASS', detail: '审批人 陈曦（法务负责人）批准合同 v2。意见：修改后条款无法律风险，同意发签' },
    { id: 'log-c12', at: offset(base, 60 * 29), actorRole: 'approverB', actorName: '陈曦', action: 'ALL_APPROVED', detail: '合同 v2 已获两名审批人批准，进入「可发起签署」状态', statusFrom: 'PENDING_APPROVAL', statusTo: 'APPROVED' },
    { id: 'log-c13', at: offset(base, 60 * 30), actorRole: 'biz', actorName: '赵启明', action: 'SIGN_INITIATED', detail: `发起 Mock 电子签（信封文档哈希 ${h2}）：签署人 2 名（供应商 郑海涛、我方 张岚），CC 2 名。正式环境此处调用 DocuSign / e签宝 API`, statusFrom: 'APPROVED', statusTo: 'SIGNING' },
    { id: 'log-c14', at: offset(base, 60 * 31), actorRole: 'vendor', actorName: '郑海涛', action: 'SIGNED', detail: `签署完成：郑海涛（供应商方）已签署，Mock 证书编号 ${a.envelope.signers[0].certId}` },
    { id: 'log-c15', at: offset(base, 60 * 32), actorRole: 'signerCompany', actorName: '张岚', action: 'SIGNED', detail: `签署完成：张岚（我方）已签署，Mock 证书编号 ${a.envelope.signers[1].certId}` },
    { id: 'log-c16', at: offset(base, 60 * 32), actorRole: 'signerCompany', actorName: '张岚', action: 'ARCHIVED', detail: '双方签署完成，证据包已归档（5 项），结算信息已同步财务视角', statusFrom: 'SIGNING', statusTo: 'ARCHIVED' },
  ]
  return a
}

export function buildSeed(): Application[] {
  return [caseA(), caseB(), caseC()]
}
