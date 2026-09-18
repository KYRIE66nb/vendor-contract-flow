import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { TERMS_FIELDS, VENDOR_FIELDS, validate } from '../domain'
import { useCtx, useApp, useStore } from '../store'
import { Alert, Badge, Btn, Card, CardHeader, Field, inputCls } from '../components/ui'
import type { Terms, VendorInfo } from '../types'

export default function ApplyForm() {
  const { id } = useParams()
  const app = useApp(id)
  const { submitApplication, updateDraft } = useStore()
  const ctx = useCtx()
  const role = useStore((s) => s.role)
  const navigate = useNavigate()

  const [vendorInfo, setVendorInfo] = useState<VendorInfo | null>(null)
  const [terms, setTerms] = useState<Terms | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (app && !vendorInfo) {
      setVendorInfo({ ...app.vendorInfo })
      setTerms({ ...app.terms })
    }
  }, [app, vendorInfo])

  const liveCheck = useMemo(() => (vendorInfo && terms ? validate(vendorInfo, terms) : null), [vendorInfo, terms])

  if (!app || !vendorInfo || !terms) return <Card className="p-6 text-sm text-slate-500">未找到该申请。</Card>
  if (app.status !== 'FILLING' && app.status !== 'NEEDS_INFORMATION') {
    navigate(`/contract/${app.id}`, { replace: true })
    return null
  }

  const setV = (k: keyof VendorInfo, val: string) => setVendorInfo((p) => ({ ...(p as VendorInfo), [k]: val }))
  const setT = (k: keyof Terms, val: string) => setTerms((p) => ({ ...(p as Terms), [k]: val }))

  const errorOf = (section: 'vendorInfo' | 'terms', field: string) => {
    const all = [...app.missingFields, ...(liveCheck && !liveCheck.ok ? liveCheck.missing : [])]
    const hit = all.find((m) => m.section === section && m.field === field)
    return hit?.reason
  }

  const renderInput = (
    section: 'vendorInfo' | 'terms',
    field: string,
    meta: { label: string; required: boolean; type?: string; options?: string[]; placeholder?: string; hint?: string },
    value: string,
    onChange: (v: string) => void,
  ) => {
    const err = errorOf(section, field)
    const common = { className: `${inputCls} ${err ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-100' : ''}`, placeholder: meta.placeholder }
    let control: React.ReactNode
    if (meta.type === 'select')
      control = (
        <select {...common} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">请选择…</option>
          {meta.options!.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      )
    else if (meta.type === 'textarea') control = <textarea {...common} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
    else control = <input {...common} type={meta.type ?? 'text'} value={value} onChange={(e) => onChange(e.target.value)} />
    return (
      <Field key={field} label={meta.label} required={meta.required} hint={meta.hint} error={err}>
        {control}
      </Field>
    )
  }

  const onSubmit = () => {
    updateDraft(app.id, vendorInfo, terms)
    const ok = submitApplication(app.id, ctx)
    if (ok) navigate(`/contract/${app.id}`)
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{app.title}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            供应商信息与商业条款填报 · 提交后系统执行必填校验：<b>缺失关键字段将进入 Needs Information 并阻断</b>，通过则自动按模板生成合同草稿
          </p>
        </div>
        {liveCheck && (liveCheck.ok ? <Badge tone="green">当前填写完整，可提交</Badge> : <Badge tone="red">尚缺 {liveCheck.missing.length} 项关键字段</Badge>)}
      </div>

      {app.status === 'NEEDS_INFORMATION' && app.missingFields.length > 0 && (
        <Alert tone="error" title={`Needs Information：上次提交校验未通过，已阻断（不能生成草稿、不能发起签署）`}>
          缺失/问题字段（{app.missingFields.length} 项）：{app.missingFields.map((m) => `${m.label}（${m.reason}）`).join('；')}。系统不会自动猜测或填充这些条款，请补齐后重新提交。
        </Alert>
      )}

      <Card>
        <CardHeader title="一、供应商信息" desc="公司主体与签字人信息（要求 1）" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {Object.entries(VENDOR_FIELDS).map(([k, meta]) => renderInput('vendorInfo', k, meta, vendorInfo[k as keyof VendorInfo], (v) => setV(k as keyof VendorInfo, v)))}
        </div>
      </Card>

      <Card>
        <CardHeader title="二、商业条款 / 合同关键字段" desc="分销协议核心条款（要求 2）；带 * 为发签门禁必填项" />
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
          {Object.entries(TERMS_FIELDS).map(([k, meta]) =>
            renderInput('terms', k, meta, terms[k as keyof Terms], (v) => setT(k as keyof Terms, v)),
          )}
          <div className="sm:col-span-2">{renderInput('terms', 'specialTerms', TERMS_FIELDS.specialTerms, terms.specialTerms, (v) => setT('specialTerms', v))}</div>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="text-xs text-slate-500">
          {saved ? '✅ 草稿已暂存（本浏览器）' : '提交时将执行完整必填校验；校验通过后立即生成合同草稿 v1 并进入磋商阶段'}
        </div>
        <div className="flex gap-2">
          <Btn
            variant="secondary"
            onClick={() => {
              updateDraft(app.id, vendorInfo, terms)
              setSaved(true)
            }}
          >
            暂存草稿
          </Btn>
          <Btn variant="primary" onClick={onSubmit} disabled={role !== 'vendor'} title={role !== 'vendor' ? '请切换到【供应商】身份提交（演示用角色权限）' : undefined}>
            提交并校验
          </Btn>
        </div>
      </div>
    </div>
  )
}
