import { NavLink, Outlet } from 'react-router-dom'
import { ROLES, roleById } from '../domain'
import { useStore } from '../store'

export default function Layout() {
  const role = useStore((s) => s.role)
  const setRole = useStore((s) => s.setRole)
  const cur = roleById(role)

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-3">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">CF</span>
            <span>
              <span className="block text-sm font-bold leading-tight text-slate-900">ContractFlow · 供应商合同流水线</span>
              <span className="block text-[11px] leading-tight text-slate-400">SaaS/API 分销协议 · 提交 → 校验 → 草稿 → 磋商 → 审批 → 签署 → 归档</span>
            </span>
          </NavLink>

          <nav className="flex items-center gap-1">
            <NavLink to="/" className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              工作台
            </NavLink>
            <NavLink to="/demo" className={({ isActive }) => `rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
              演示与说明
            </NavLink>
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <span className="hidden rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 sm:inline">演示环境 · Mock 登录</span>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 outline-none focus:border-slate-500"
            >
              {ROLES.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.org === 'vendor' ? '【供应商】' : '【我方】'}
                  {r.name} · {r.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-1.5">
          <div className="mx-auto max-w-7xl text-xs text-slate-500">
            当前身份：<span className="font-semibold text-slate-700">{cur.name}（{cur.title}）</span> · 可执行：{cur.desc}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>

      <footer className="no-print mx-auto max-w-7xl px-4 pb-8 pt-2 text-xs text-slate-400">
        ContractFlow · 内部试运行演示工具 · 合同审批与签署状态由版本门禁保证 · 电子签为 Mock（可接 DocuSign / e签宝）
      </footer>
    </div>
  )
}
