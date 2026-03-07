import { FormEvent, useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { DatabaseItem } from '../types'

type Props = {
  database: DatabaseItem | null
  open: boolean
  loading: boolean
  onClose: () => void
  onSubmit: (password: string) => Promise<void>
}

export function CredentialModal({ database, open, loading, onClose, onSubmit }: Props) {
  const { t } = useI18n()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setPassword('')
      setError(null)
    }
  }, [open, database?.id])

  if (!open || !database) {
    return null
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      await onSubmit(password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('credentials.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
      <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-accent">{t('credentials.badge')}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold text-slate-900">{t('credentials.title')}</h2>
            <p className="mt-2 text-sm text-slate-500">{t('credentials.subtitle', { name: database.name })}</p>
          </div>
          <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-slate-100">{t('credentials.cancel')}</button>
        </div>
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          <p>{database.host}:{database.port}</p>
          <p>{database.database_name}</p>
          {database.username ? <p>{database.username}</p> : null}
        </div>
        <form onSubmit={handleSubmit} className="mt-5">
          <label className="block text-sm text-slate-700">{t('credentials.password')}</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-emerald-500"
          />
          {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
          <div className="mt-5 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100">
              {t('credentials.cancel')}
            </button>
            <button type="submit" disabled={loading || password.trim() === ''} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
              {loading ? t('credentials.saving') : t('credentials.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
