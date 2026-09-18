import { COMPANY_NAME, COMPANY_SIGNER } from '../domain'
import type { Terms, Version } from '../types'

/** 合同模板：根据供应商信息 + 商业条款快照渲染全文（生成草稿 / 版本对比 / 归档终稿共用） */
export default function ContractDoc({ version, appTitle, printable = false }: { version: Version; appTitle: string; printable?: boolean }) {
  const v = version.snapshot.vendorInfo
  const t = version.snapshot.terms as Terms
  const num = (s: string, fallback = '【待补充】') => (s && s.trim() ? s.trim() : fallback)

  const Section = ({ no, title, children }: { no: string; title: string; children: React.ReactNode }) => (
    <section className="mt-5">
      <h3 className="text-[15px] font-bold text-slate-900">
        {no}、{title}
      </h3>
      <div className="mt-1.5 space-y-1.5 text-sm leading-7 text-slate-700">{children}</div>
    </section>
  )

  return (
    <article className={`mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm ${printable ? 'print-doc' : ''}`}>
      <div className="text-center">
        <div className="text-[11px] tracking-widest text-slate-400">分销合作协议 · SaaS / API 产品</div>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{appTitle}</h2>
        <div className="mt-1 font-mono text-xs text-slate-400">
          合同编号：{version.hash.slice(0, 12)} · 版本 v{version.no} · 快照哈希 {version.hash} · 生成于 {new Date(version.createdAt).toLocaleString('zh-CN')}
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-slate-700">
        本分销合作协议（“本协议”）由以下双方于签署页所载日期签署：
      </p>
      <div className="mt-2 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 leading-6">
          <div className="font-semibold text-slate-900">甲方（供应商）</div>
          <div>法定名称：{num(v.legalName)}</div>
          <div>注册地：{num(v.registrationPlace)}</div>
          <div>注册地址：{num(v.registeredAddress)}</div>
          <div>授权产品/服务：{num(v.productName)}</div>
          <div>
            签字人：{num(v.signatoryName)}（{num(v.signatoryTitle)}）
          </div>
          <div>邮箱：{num(v.signatoryEmail)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 leading-6">
          <div className="font-semibold text-slate-900">乙方（分销方）</div>
          <div>法定名称：{COMPANY_NAME}</div>
          <div>注册地：中国·北京</div>
          <div>注册地址：北京市朝阳区望京街 10 号</div>
          <div>
            签字人：{COMPANY_SIGNER.name}（{COMPANY_SIGNER.title}）
          </div>
          <div>邮箱：{COMPANY_SIGNER.email}</div>
        </div>
      </div>

      <Section no="1" title="授权产品与授权范围">
        <p>
          甲方授予乙方在约定地域内对「{num(v.productName)}」的 <b>{num(t.authorizationScope)}</b>。乙方不得超出授权范围对外许可或转授权。
        </p>
      </Section>

      <Section no="2" title="授权地域">
        <p>本协议项下的授权地域为：<b>{num(t.territory)}</b>。超出该地域的销售或推广行为须事先取得甲方书面同意。</p>
      </Section>

      <Section no="3" title="收费方式与币种">
        <p>
          授权产品采用 <b>{num(t.pricingModel)}</b>，计价与结算币种为 <b>{num(t.currency)}</b>。
        </p>
      </Section>

      <Section no="4" title="收入计算口径">
        <p>双方确认，分成计算所依据的收入口径为：{num(t.revenueBasis)}。该口径为双方结算的唯一依据，任何调整须以书面补充协议确认。</p>
      </Section>

      <Section no="5" title="分成比例">
        <p>
          在收入计算口径范围内，甲方获得净收入的 <b>{num(t.shareRatio)}%</b>，乙方获得剩余部分。分成比例不因渠道促销折扣而自动调整，促销让利须双方另行书面确认分担方式。
        </p>
      </Section>

      <Section no="6" title="结算周期与结算方式">
        <p>
          双方按 <b>{num(t.settlementCycle)}</b> 进行对账与结算；结算方式为 <b>{num(t.settlementMethod)}</b>。甲方应在每个结算周期结束后 5 个工作日内提供对账单，乙方核对无误后按上述方式付款。
        </p>
      </Section>

      <Section no="7" title="退款处理">
        <p>客户退款按以下方式处理：<b>{num(t.refundHandling)}</b>。因退款产生的分成调整应在最近一个结算周期内完成冲抵。</p>
      </Section>

      <Section no="8" title="协议期限与生效">
        <p>
          本协议有效期 {num(t.agreementTerm)} 个月，自 <b>{num(t.startDate)}</b> 起生效。期满前 30 日内任何一方未书面提出异议的，可由双方协商续签。
        </p>
      </Section>

      {t.specialTerms && t.specialTerms.trim() && (
        <Section no="9" title="特殊条款">
          <p>{t.specialTerms.trim()}</p>
        </Section>
      )}

      <Section no={t.specialTerms?.trim() ? '10' : '9'} title="陈述、保证与其他">
        <p>
          双方保证其签署人已获得充分授权。本协议任何条款的修改须经双方确认并形成新版本，且新版本须经乙方内部审批后方可发起签署。因本协议产生的争议，双方应先友好协商解决。
        </p>
      </Section>

      <div className="mt-8 grid grid-cols-1 gap-6 text-sm sm:grid-cols-2">
        <div className="rounded-lg border border-slate-300 p-4">
          <div className="mb-8 font-semibold text-slate-900">甲方（供应商）</div>
          <div>签字人：______________________</div>
          <div className="mt-1 text-slate-500">
            {v.signatoryName || '【待补充】'}（{v.signatoryTitle || '【待补充】'}）
          </div>
          <div className="mt-1 text-slate-500">日期：＿＿＿＿＿＿＿＿</div>
        </div>
        <div className="rounded-lg border border-slate-300 p-4">
          <div className="mb-8 font-semibold text-slate-900">乙方（分销方）</div>
          <div>签字人：______________________</div>
          <div className="mt-1 text-slate-500">
            {COMPANY_SIGNER.name}（{COMPANY_SIGNER.title}）
          </div>
          <div className="mt-1 text-slate-500">日期：＿＿＿＿＿＿＿＿</div>
        </div>
      </div>

      <p className="mt-6 text-center text-[11px] text-slate-400">
        本文档由 ContractFlow 根据「{appTitle}」v{version.no} 字段快照自动生成 · 占位字段显示为【待补充】，系统不会自动猜测或填充任何条款
      </p>
    </article>
  )
}
