import { FormEvent, useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { RoleItem, UserCreateInput } from '../types'

type Props = {
  open: boolean
  roles: RoleItem[]
  loading: boolean
  onClose: () => void
  onSubmit: (payload: UserCreateInput) => Promise<void>
}

export function UserCreateModal({ open, roles, loading, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [form, setForm] = useState<UserCreateInput>({ username: '', full_name: '', password: '', role_name: 'finance' })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setError(null)
    setForm({
      username: '',
      full_name: '',
      password: '',
      role_name: roles[0]?.name || 'finance',
    })
  }, [open, roles])

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
      setError(err instanceof Error ? err.message : t('users.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">{t('users.badge')}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{t('users.title')}</h2>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">{t('users.close')}</button>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('users.username')}</span>
            <input value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="field" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('users.fullName')}</span>
            <input value={form.full_name} onChange={(e) => setForm((prev) => ({ ...prev, full_name: e.target.value }))} className="field" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('users.password')}</span>
            <input type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} className="field" />
          </label>
          <label className="text-sm text-slate-700">
            <span className="mb-2 block">{t('users.role')}</span>
            <select value={form.role_name} onChange={(e) => setForm((prev) => ({ ...prev, role_name: e.target.value }))} className="field">
              {roles.map((role) => (
                <option key={role.id} value={role.name}>{role.name}</option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100">{t('users.close')}</button>
            <button type="submit" disabled={loading} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              {loading ? t('users.saving') : t('users.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
