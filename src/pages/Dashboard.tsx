import { useNavigate } from 'react-router-dom'
import { currentVersion, fmtTime, STATUS_META, validate } from '../domain'
import { useStore } from '../store'
import { Alert, Badge, Btn, Card, StatusBadge } from '../components/ui'
import type { Application } from '../types'

function nextHint(app: Application): string {
  switch (app.status) {
    case 'FILLING':
      return app.versions.length === 0 ? '下一步：供应商完善信息并提交校验' : '下一步：继续填写'
    case 'NEEDS_INFORMATION':
      return `已阻断：缺失 ${app.missingFields.length} 项关键字段，补齐前不能生成草稿 / 发起签署`
    case 'NEGOTIATING':
      return `当前 v${currentVersion(app).no}：双方可继续磋商修改（保存即产生新版本），或由商务/法务提交内部审批`
    case 'PENDING_APPROVAL':
      return `等待审批人 A（王芸·财务）与 B（陈曦·法务）对 v${currentVersion(app).no} 作出决定`
    case 'APPROVED':
      return `v${currentVersion(app).no} 已获双人批准，商务可发起 Mock 电子签`
    case 'SIGNING':
      return 'Mock 电子签进行中：等待各方签署'
    case 'ARCHIVED':
      return '流程完结：证据包与结算信息已归档'
  }
}

export default function Dashboard() {
  const apps = useStore((s) => s.apps)
  const createApplication = useStore((s) => s.createApplication)
  const resetDemo = useStore((s) => s.resetDemo)
  const role = useStore((s) => s.role)
  const navigate = useNavigate()

  const open = (id: string, status: Application['status']) => {
    navigate(status === 'FILLING' || status === 'NEEDS_INFORMATION' ? `/apply/${id}` : `/contract/${id}`)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">供应商合同工作台</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            SaaS/API 分销协议场景 · 信息校验 → 自动草稿 → 磋商版本化 → 双人审批 → Mock 电子签 → 归档结算
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn
            variant="primary"
            onClick={() => {
              const id = createApplication(`新供应商申请 · ${new Date().toLocaleDateString('zh-CN')}`)
              navigate(`/apply/${id}`)
            }}
            disabled={role !== 'vendor'}
            title={role !== 'vendor' ? '请切换到【供应商】身份创建申请（演示用角色权限）' : undefined}
          >
            + 新建供应商申请
          </Btn>
          <Btn variant="secondary" onClick={() => navigate('/demo')}>
            演示脚本与说明
          </Btn>
          <Btn
            variant="ghost"
            onClick={() => {
              if (confirm('重置演示数据？将恢复 3 个预置用例的初始状态（不影响其他浏览器）。')) resetDemo()
            }}
          >
            重置演示数据
          </Btn>
        </div>
      </div>

      {role !== 'vendor' && (
        <Alert tone="info" title="当前不是供应商身份">
          新建申请由供应商发起。演示时可在右上角切换身份；已有流程的查看不受身份限制。
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
        {apps.map((app) => {
          const cur = app.versions[app.versions.length - 1]
          const missingNow = app.status !== 'FILLING' ? app.missingFields : validate(app.vendorInfo, app.terms).missing
          return (
            <Card key={app.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900" title={app.title}>
                    {app.title}
                  </div>
                  <div className="mt-0.5 font-mono text-[11px] text-slate-400">{app.id}</div>
                </div>
                <StatusBadge status={app.status} />
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                {cur ? <Badge tone="blue">当前版本 v{cur.no}</Badge> : <Badge>尚未生成草稿</Badge>}
                {app.envelope.status === 'completed' && <Badge tone="green">双方已签署</Badge>}
                {app.approvals.some((a) => a.invalidated) && <Badge tone="amber">含已失效审批</Badge>}
                {missingNow.length > 0 && <Badge tone="red">缺失 {missingNow.length} 项</Badge>}
              </div>

              <p className="mt-3 flex-1 text-xs leading-5 text-slate-500">{nextHint(app)}</p>

              {missingNow.length > 0 && (app.status === 'NEEDS_INFORMATION' || app.status === 'FILLING') && (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  缺失：{missingNow.map((m) => m.label).join('、')}
                </div>
              )}

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-[11px] text-slate-400">创建于 {fmtTime(app.createdAt)}</span>
                <Btn size="sm" variant="secondary" onClick={() => open(app.id, app.status)}>
                  {app.status === 'FILLING' || app.status === 'NEEDS_INFORMATION' ? '去填写/校验' : '进入合同工作台'}
                </Btn>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-5">
        <h3 className="text-sm font-semibold text-slate-900">流程总览（状态机）</h3>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {(Object.keys(STATUS_META) as (keyof typeof STATUS_META)[]).map((k, i, arr) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`rounded-md border px-2 py-1 font-medium ${STATUS_META[k].cls}`}>{STATUS_META[k].label.split('（')[0]}</span>
              {i < arr.length - 1 && <span className="text-slate-300">→</span>}
            </span>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-slate-500">
          门禁规则：① 缺失关键字段即阻断（Needs Information），且系统不自动猜测/补默认条款；② 任何条款修改自动生成新版本，并使旧版本审批全部失效；
          ③ 发起签署要求「校验通过 + 当前版本双人审批通过」同时满足。
        </p>
      </Card>
    </div>
  )
}
