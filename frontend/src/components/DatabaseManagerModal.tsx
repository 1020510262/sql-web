import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import type { DatabaseFormInput, DatabaseItem } from '../types'

type Props = {
  open: boolean
  databases: DatabaseItem[]
  loading: boolean
  onClose: () => void
  onCreate: (payload: DatabaseFormInput) => Promise<void>
  onUpdate: (databaseId: number, payload: DatabaseFormInput) => Promise<void>
  onDelete: (database: DatabaseItem) => Promise<void>
}

const emptyForm: DatabaseFormInput = {
  name: '',
  group_name: '',
  type: 'mysql',
  host: '',
  port: 3306,
  username: '',
  database_name: '',
  description: '',
}

export function DatabaseManagerModal({ open, databases, loading, onClose, onCreate, onUpdate, onDelete }: Props) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<DatabaseItem | null>(null)
  const [form, setForm] = useState<DatabaseFormInput>(emptyForm)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }
    setSelected(null)
    setForm(emptyForm)
    setError(null)
  }, [open])

  if (!open) {
    return null
  }

  const loadDatabase = (database: DatabaseItem | null) => {
    setSelected(database)
    setError(null)
    if (!database) {
      setForm(emptyForm)
      return
    }
    setForm({
      name: database.name,
      group_name: database.group_name || '',
      type: database.type,
      host: database.host,
      port: database.port,
      username: database.username || '',
      database_name: database.database_name,
      description: database.description || '',
    })
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      if (selected) {
        await onUpdate(selected.id, form)
      } else {
        await onCreate(form)
      }
      loadDatabase(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('manager.saveFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4 py-8">
      <div className="grid h-full max-h-[90vh] w-full max-w-6xl gap-4 overflow-hidden rounded-[32px] bg-white p-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[28px] border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold text-slate-900">{t('manager.title')}</h2>
            <button onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500 hover:bg-white">{t('manager.close')}</button>
          </div>
          <button onClick={() => loadDatabase(null)} className="mt-4 w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white">
            {t('manager.new')}
          </button>
          <div className="mt-4 space-y-3 overflow-y-auto">
            {databases.map((database) => (
              <button
                key={database.id}
                onClick={() => loadDatabase(database)}
                className={`w-full rounded-2xl border px-4 py-3 text-left ${selected?.id === database.id ? 'border-accent bg-emerald-50' : 'border-slate-200 bg-white'}`}
              >
                <p className="font-medium text-slate-900">{database.name}</p>
                <p className="text-sm text-slate-500">{database.group_name || t('sidebar.ungrouped')}</p>
              </button>
            ))}
          </div>
        </aside>
        <section className="overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-accent">{t('manager.badge')}</p>
              <h3 className="mt-2 font-display text-2xl font-semibold text-slate-900">
                {selected ? t('manager.edit') : t('manager.create')}
              </h3>
            </div>
            {selected ? (
              <button onClick={() => onDelete(selected)} className="rounded-2xl border border-rose-300 px-4 py-3 text-sm font-medium text-rose-600 hover:bg-rose-50">
                {t('manager.delete')}
              </button>
            ) : null}
          </div>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label={t('manager.name')}>
              <input value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} className="field" />
            </Field>
            <Field label={t('manager.group')}>
              <input value={form.group_name || ''} onChange={(e) => setForm((prev) => ({ ...prev, group_name: e.target.value }))} className="field" />
            </Field>
            <Field label={t('manager.type')}>
              <select value={form.type} onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value, port: e.target.value === 'postgresql' ? 5432 : e.target.value === 'mysql' ? 3306 : 0 }))} className="field">
                <option value="mysql">MySQL</option>
                <option value="postgresql">PostgreSQL</option>
                <option value="sqlite">SQLite</option>
              </select>
            </Field>
            <Field label={t('manager.port')}>
              <input type="number" value={form.port} onChange={(e) => setForm((prev) => ({ ...prev, port: Number(e.target.value) }))} className="field" />
            </Field>
            <Field label={t('manager.host')}>
              <input value={form.host} onChange={(e) => setForm((prev) => ({ ...prev, host: e.target.value }))} className="field" />
            </Field>
            <Field label={t('manager.username')}>
              <input value={form.username || ''} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} className="field" />
            </Field>
            <Field label={t('manager.database')}>
              <input value={form.database_name} onChange={(e) => setForm((prev) => ({ ...prev, database_name: e.target.value }))} className="field" />
            </Field>
            <Field label={t('manager.description')}>
              <input value={form.description || ''} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} className="field" />
            </Field>
            {error ? <p className="sm:col-span-2 text-sm text-rose-600">{error}</p> : null}
            <div className="sm:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={onClose} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-700 hover:bg-slate-100">{t('manager.close')}</button>
              <button type="submit" disabled={loading} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-medium text-white disabled:opacity-50">
                {loading ? t('manager.saving') : t('manager.save')}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm text-slate-700">
      <span className="mb-2 block">{label}</span>
      {children}
    </label>
  )
}
