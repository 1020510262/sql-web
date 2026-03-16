import { FormEvent, useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { PasswordChangeInput } from '../types'

type Props = {
  open: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (payload: PasswordChangeInput) => Promise<void>
}

export function PasswordChangeModal({ open, loading, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setError(null)
    setForm({ current: '', next: '', confirm: '' })
  }, [open])

  if (!open) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)

    if (form.next.trim().length < 8) {
      setError(t('password.minLength'))
      return
    }
    if (form.next !== form.confirm) {
      setError(t('password.mismatch'))
      return
    }

    try {
      await onSubmit({ current_password: form.current, new_password: form.next })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('password.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">{t('password.badge')}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{t('password.title')}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">{t('password.close')}</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('password.current')}</span>
            <input type="password" value={form.current} onChange={(e) => setForm((prev) => ({ ...prev, current: e.target.value }))} className="field" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('password.new')}</span>
            <input type="password" value={form.next} onChange={(e) => setForm((prev) => ({ ...prev, next: e.target.value }))} className="field" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('password.confirm')}</span>
            <input type="password" value={form.confirm} onChange={(e) => setForm((prev) => ({ ...prev, confirm: e.target.value }))} className="field" />
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100">{t('password.close')}</button>
            <button type="submit" disabled={loading} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              {loading ? t('password.saving') : t('password.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
