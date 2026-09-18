import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Btn, Card, CardHeader } from '../components/ui'
import { useStore } from '../store'

const STEPS: { n: string; title: string; role: string; desc: string; link?: { to: string; text: string } }[] = [
  {
    n: '1',
    title: '供应商提交信息（用例 A）',
    role: '供应商 · 李文博',
    desc: '打开工作台的「星澜科技」申请 → 核对预填的供应商信息与商业条款 → 点击「提交并校验」。系统执行必填校验：通过则立即按模板生成合同草稿 v1。',
    link: { to: '/apply/VC-DEMO-A', text: '去提交用例 A' },
  },
  {
    n: '2',
    title: '校验阻断演示（用例 B）',
    role: '供应商 · 李文博',
    desc: '打开「云帆传媒」申请（故意缺失：分成比例、结算方式）→ 点击「提交并校验」。状态变为 Needs Information，页面列出缺失清单，明确阻断：不能生成草稿、不能发签，且系统不会自动猜测填充。',
    link: { to: '/apply/VC-DEMO-B', text: '去提交用例 B（看阻断）' },
  },
  {
    n: '3',
    title: '查看自动生成的合同草稿',
    role: '任意身份',
    desc: '进入合同工作台 →「合同预览」：系统将供应商信息与商业条款套入分销协议模板生成全文，缺失字段显示【待补充】。可切换版本、可打印/导出 PDF。',
    link: { to: '/contract/VC-DEMO-A', text: '查看草稿' },
  },
  {
    n: '4',
    title: '磋商修改条款 → 形成新版本 v2',
    role: '供应商 · 李文博（或商务/法务）',
    desc: '「条款修改」页把分成比例 70 改为 65、填写修改说明 → 保存。系统生成 v2：版本历史出现新条目、字段级 diff 可见、快照哈希变化。',
    link: { to: '/contract/VC-DEMO-A', text: '去修改条款' },
  },
  {
    n: '5',
    title: '提交审批 → 双人批准（中途演示审批失效）',
    role: '商务 · 赵启明 → 审批人 A · 王芸 → 审批人 B · 陈曦',
    desc: '商务在「内部审批」提交 v2 → 切换王芸批准 → 切换陈曦批准 → 状态变为「已批准（可发起签署）」。中途彩蛋：若在批准后又修改条款，两条审批立即显示「已失效」，需重新审批。',
    link: { to: '/contract/VC-DEMO-A', text: '去审批' },
  },
  {
    n: '6',
    title: '发起 Mock 电子签 → 双方签署 → 归档',
    role: '商务发起 → 双方签署人签署',
    desc: '「电子签署」页展示三重门禁自检，全绿后商务点击发起：信封含双方签署人 + CC。切换身份依次签署（各生成 Mock 证书编号）。全部签完自动归档。',
    link: { to: '/contract/VC-DEMO-A', text: '去签署' },
  },
  {
    n: '7',
    title: '查看归档证据包与结算信息',
    role: '任意身份',
    desc: '「归档」页展示证据链：合同终稿、双人审批记录、签署证明（Mock 证书）、可导出的审计日志 JSON、结算信息卡（周期/方式/币种/分成比例/首个结算日）。「操作日志」可回看全程谁在何时做了什么。',
    link: { to: '/contract/VC-DEMO-C', text: '直接看已归档的成品（用例 C）' },
  },
]

const IMPL_ROWS: { area: string; status: 'real' | 'mock' | 'future'; detail: string }[] = [
  { area: '必填校验 / Needs Information 阻断', status: 'real', detail: '19 个关键字段规则校验（含邮箱格式、分成比例区间），缺失即阻断并给出清单；不猜测、不补默认值' },
  { area: '合同草稿生成（模板引擎）', status: 'real', detail: '字段快照 → 分销协议模板渲染全文；缺失字段渲染为【待补充】占位' },
  { area: '版本管理 + 字段级 diff', status: 'real', detail: '每次保存自动生成新版本（含快照哈希），版本历史可看全文与逐字段对比' },
  { area: '双人审批 + 版本锁定', status: 'real', detail: '审批记录绑定版本号与快照哈希；条款一变，旧审批自动失效，必须基于新版本重新审批' },
  { area: '发起签署三重门禁', status: 'real', detail: '运行时门禁函数：完整性 + 当前版本双人审批 + 状态检查，UI 与 store 双重执行' },
  { area: '操作日志（审计）', status: 'real', detail: '提交/校验/修改/审批/退回/发签/签署/归档全量留痕，可导出 JSON' },
  { area: '归档证据包 + 结算信息卡', status: 'real', detail: '签署完成自动生成证据清单与结算卡片（演示数据）' },
  { area: '登录 / 角色', status: 'mock', detail: '右上角身份切换器（Mock 登录）；真实系统接 SSO + 组织架构' },
  { area: '电子签', status: 'mock', detail: '本地 Mock 信封/证书；正式环境对接 DocuSign / e签宝 / 法大大 API（创建信封 → 签署链接 → Webhook 状态回传）' },
  { area: '数据持久化', status: 'mock', detail: '浏览器 localStorage（演示友好：每位评审独立可重放）；正式环境为数据库 + 对象存储 + 审计防篡改' },
  { area: 'PDF 生成', status: 'mock', detail: '走浏览器打印导出；正式环境服务端渲染 PDF 并计算文件哈希入证据链' },
  { area: '消息通知', status: 'future', detail: '审批待办/发签/签署完成通知（邮件 / 飞书 / Slack），在状态机迁移点预留了事件位' },
  { area: '审批流配置 / 多合同模板', status: 'future', detail: '按金额/类型路由不同审批链、多模板（Order Form、NDA 等）与条款库' },
]

const STATUS_BADGE = { real: { tone: 'green' as const, label: '已实现' }, mock: { tone: 'amber' as const, label: 'Mock（演示）' }, future: { tone: 'slate' as const, label: '未来接入' } }

export default function DemoPage() {
  const resetDemo = useStore((s) => s.resetDemo)
  const navigate = useNavigate()

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">演示脚本与实现说明</h1>
          <p className="mt-0.5 text-sm text-slate-500">用一条模拟供应商数据完整走通：提交申请 → 信息校验 → 生成合同草稿 → 修改条款形成新版本 → 内部审批 → 发起签署 → 归档</p>
        </div>
        <Btn
          variant="secondary"
          onClick={() => {
            if (confirm('重置演示数据？将恢复 3 个预置用例的初始状态。')) {
              resetDemo()
              navigate('/')
            }
          }}
        >
          ↺ 重置演示数据
        </Btn>
      </div>

      <Alert tone="info" title="演示方式">
        本页是「提词器」：按步骤 1→7 操作，需要换身份时在右上角切换。每一步的链接直达对应页面。走完约 5 分钟；若想直接看终态，步骤 7 提供已归档的成品用例 C。
      </Alert>

      <Card>
        <CardHeader title="Demo Use Case：星澜科技 · 智能语音转写 API 分销协议（用例 A）" desc="另附：用例 B（缺字段阻断演示）、用例 C（已归档成品）" />
        <ol className="divide-y divide-slate-100">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-4 px-5 py-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">{s.n}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-slate-900">{s.title}</span>
                  <Badge tone="blue">{s.role}</Badge>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-600">{s.desc}</p>
                {s.link && (
                  <button onClick={() => navigate(s.link!.to)} className="mt-2 text-xs font-medium text-blue-600 hover:underline">
                    {s.link.text} →
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <Card>
        <CardHeader title="实现说明：已实现 / Mock / 未来接真实接口" desc="诚实标注，交付评估用" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                <th className="px-5 py-2.5 font-medium">能力</th>
                <th className="px-5 py-2.5 font-medium">状态</th>
                <th className="px-5 py-2.5 font-medium">说明</th>
              </tr>
            </thead>
            <tbody>
              {IMPL_ROWS.map((r) => (
                <tr key={r.area} className="border-b border-slate-100 align-top">
                  <td className="px-5 py-3 font-medium text-slate-800">{r.area}</td>
                  <td className="px-5 py-3">
                    <Badge tone={STATUS_BADGE[r.status].tone}>{STATUS_BADGE[r.status].label}</Badge>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{r.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card>
        <CardHeader title="产品说明：为什么这样设计（3 个核心取舍）" />
        <div className="space-y-3 p-5 text-sm leading-6 text-slate-600">
          <p>
            <b className="text-slate-800">① 合同是流程，不是文档。</b>
            工具的核心不是“生成一份合同文本”，而是把信息校验、版本、审批、签署、归档、结算放进同一条可追溯的状态机：漏字段会被阻断、条款变更会作废审批、签署只能发生在双人批准的版本上。
          </p>
          <p>
            <b className="text-slate-800">② 宁可阻断，不可猜测。</b>
            所有商业条款缺失时一律阻断并显示清单，系统绝不自动补默认值——错误版本的合同发出去比慢一点更危险。
          </p>
          <p>
            <b className="text-slate-800">③ 演示可用性优先。</b>
            纯前端 + localStorage 持久化：演示链接零后端依赖、每位评审独立可重放（顶部/本页可一键重置）。真实系统替换为数据库与 SSO，状态机与门禁逻辑不变。
          </p>
        </div>
      </Card>
    </div>
  )
}
