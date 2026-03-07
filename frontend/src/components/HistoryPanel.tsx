import { useI18n } from '../i18n'
import type { QueryHistoryItem } from '../types'

type Props = {
  items: QueryHistoryItem[]
}

function formatDeviceLocalTime(value: string): string {
  const normalized = /z$|[+-]\d{2}:\d{2}$/i.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function HistoryPanel({ items }: Props) {
  const { t } = useI18n()

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/70">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{t('history.title')}</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('history.audit')}</span>
      </div>
      <div className="mt-4 space-y-3">
        {items.length === 0 ? <p className="text-sm text-slate-500">{t('history.empty')}</p> : null}
        {items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="font-medium text-slate-900">{item.database_name}</p>
              <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                {item.status === 'success' ? t('status.success') : t('status.failed')}
              </span>
            </div>
            <p className="mt-2 break-all font-mono text-xs text-slate-600">{item.sql_text}</p>
            <p className="mt-2 text-xs text-slate-400">{formatDeviceLocalTime(item.created_at)} · {item.execution_time_ms} ms</p>
          </div>
        ))}
      </div>
    </section>
  )
}
