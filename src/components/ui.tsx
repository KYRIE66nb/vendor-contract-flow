import type { ReactNode } from 'react'
import { STATUS_META } from '../domain'
import type { AppStatus } from '../types'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>
}

export function CardHeader({ title, extra, desc }: { title: ReactNode; extra?: ReactNode; desc?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {desc && <p className="mt-0.5 text-sm text-slate-500">{desc}</p>}
      </div>
      {extra && <div className="flex items-center gap-2">{extra}</div>}
    </div>
  )
}

export function StatusBadge({ status }: { status: AppStatus }) {
  const m = STATUS_META[status]
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${m.cls}`}>{m.label}</span>
}

export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'red' | 'amber' | 'blue' | 'violet' }) {
  const map: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red: 'bg-rose-50 text-rose-700 border-rose-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    violet: 'bg-violet-50 text-violet-700 border-violet-200',
  }
  return <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium ${map[tone]}`}>{children}</span>
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}

export function Btn({ variant = 'primary', size = 'md', className = '', ...rest }: BtnProps) {
  const base = 'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:cursor-not-allowed disabled:opacity-50'
  const sz = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm'
  const map = {
    primary: 'bg-slate-900 text-white hover:bg-slate-700',
    secondary: 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
    danger: 'border border-rose-300 bg-white text-rose-700 hover:bg-rose-50',
    ghost: 'text-slate-600 hover:bg-slate-100',
  }
  return <button className={`${base} ${sz} ${map[variant]} ${className}`} {...rest} />
}

export function Alert({ tone = 'info', title, children }: { tone?: 'info' | 'warn' | 'error' | 'success'; title?: ReactNode; children?: ReactNode }) {
  const map = {
    info: { cls: 'border-blue-200 bg-blue-50 text-blue-900', icon: 'ℹ️' },
    warn: { cls: 'border-amber-300 bg-amber-50 text-amber-900', icon: '⚠️' },
    error: { cls: 'border-rose-300 bg-rose-50 text-rose-900', icon: '⛔' },
    success: { cls: 'border-emerald-300 bg-emerald-50 text-emerald-900', icon: '✅' },
  }[tone]
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${map.cls}`}>
      <div className="flex items-start gap-2">
        <span className="no-print">{map.icon}</span>
        <div className="min-w-0 flex-1">
          {title && <div className="font-semibold">{title}</div>}
          {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
        </div>
      </div>
    </div>
  )
}

export function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string
  required?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-rose-600">{error}</span>}
    </label>
  )
}

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 disabled:bg-slate-50 disabled:text-slate-400'

export function Tabs<T extends string>({ tabs, active, onChange }: { tabs: { key: T; label: string; badge?: ReactNode }[]; active: T; onChange: (k: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
            active === t.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {t.label}
          {t.badge}
        </button>
      ))}
    </div>
  )
}

export function KV({ k, v, mono }: { k: string; v: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-100 py-1.5 last:border-0">
      <span className="shrink-0 text-xs text-slate-500">{k}</span>
      <span className={`text-right text-sm text-slate-800 ${mono ? 'font-mono text-xs' : ''}`}>{v || '—'}</span>
    </div>
  )
}
