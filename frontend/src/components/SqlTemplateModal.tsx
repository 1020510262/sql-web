import { FormEvent, useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { SqlTemplateCreateInput } from '../types'

type Props = {
  open: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (payload: SqlTemplateCreateInput) => Promise<void>
}

export function SqlTemplateModal({ open, loading, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState<SqlTemplateCreateInput>({ name: '', category: 'default', sql_content: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setForm({ name: '', category: 'default', sql_content: '' })
    setError(null)
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await onSubmit(form)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sqlTemplates.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">{t('sqlTemplates.badge')}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{t('sqlTemplates.addTitle')}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">{t('sqlTemplates.cancel')}</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('sqlTemplates.name')}</span>
            <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="field" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('sqlTemplates.category')}</span>
            <input value={form.category || ''} onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))} className="field" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('sqlTemplates.sql')}</span>
            <textarea value={form.sql_content} onChange={(e) => setForm((prev) => ({ ...prev, sql_content: e.target.value }))} className="field min-h-40" />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100">{t('sqlTemplates.cancel')}</button>
            <button type="submit" disabled={loading} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              {loading ? t('sqlTemplates.saving') : t('sqlTemplates.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
