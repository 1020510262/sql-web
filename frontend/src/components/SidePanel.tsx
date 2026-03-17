import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import type { QueryHistoryItem, SqlTemplateItem } from '../types'

type Props = {
  history: QueryHistoryItem[]
  templates: SqlTemplateItem[]
  onAddTemplate: () => void
  onUseTemplate: (sql: string) => void
}

function formatDeviceLocalTime(value: string): string {
  const normalized = /z$|[+-]\d{2}:\d{2}$/i.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

export function SidePanel({ history, templates, onAddTemplate, onUseTemplate }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'history' | 'templates'>('history')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const groupedTemplates = useMemo(() => {
    const sortedTemplates = [...templates].sort((a, b) => {
      const aTime = new Date(a.created_at).getTime()
      const bTime = new Date(b.created_at).getTime()
      return bTime - aTime
    })
    return sortedTemplates.reduce<Record<string, SqlTemplateItem[]>>((acc, item) => {
      const category = item.category?.trim() || t('sqlTemplates.uncategorized')
      if (!acc[category]) {
        acc[category] = []
      }
      acc[category].push(item)
      return acc
    }, {})
  }, [templates, t])

  const templateGroups = useMemo(() => {
    return Object.entries(groupedTemplates).sort(([left], [right]) => left.localeCompare(right))
  }, [groupedTemplates])

  return (
    <section className="flex h-full min-h-0 w-full min-w-[340px] max-w-[340px] flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/70">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl bg-slate-100 p-1">
          <button onClick={() => setTab('history')} className={`rounded-2xl px-4 py-2 text-sm ${tab === 'history' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
            {t('history.title')}
          </button>
          <button onClick={() => setTab('templates')} className={`rounded-2xl px-4 py-2 text-sm ${tab === 'templates' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
            {t('sqlTemplates.tab')}
          </button>
        </div>
        {tab === 'history' ? (
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{t('history.audit')}</span>
        ) : (
          <button onClick={onAddTemplate} className="rounded-full bg-slate-950 px-3 py-2 text-sm font-medium text-white">+</button>
        )}
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        {tab === 'history' ? (
          <div className="space-y-3">
            {history.length === 0 ? <p className="text-sm text-slate-500">{t('history.empty')}</p> : null}
            {history.map((item) => (
              <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="min-w-0 break-all font-medium text-slate-900">{item.database_name}</p>
                  <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {item.status === 'success' ? t('status.success') : t('status.failed')}
                  </span>
                </div>
                <p className="mt-2 break-all font-mono text-xs text-slate-600">{item.sql_text}</p>
                <p className="mt-2 text-xs text-slate-400">{formatDeviceLocalTime(item.created_at)} · {item.execution_time_ms} ms</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {templates.length === 0 ? <p className="text-sm text-slate-500">{t('sqlTemplates.empty')}</p> : null}
            {templateGroups.map(([category, items]) => {
              const collapsed = collapsedGroups[category]
              return (
                <section key={category} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <button
                      onClick={() =>
                        setCollapsedGroups((prev) => ({
                          ...prev,
                        [category]: !prev[category],
                      }))
                    }
                    className="flex items-center gap-2 text-left"
                  >
                    <span className="text-sm font-semibold text-slate-700">{category}</span>
                    <span className={`text-xs text-slate-400 transition ${collapsed ? '-rotate-90' : ''}`}>▾</span>
                  </button>
                  <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{items.length}</span>
                </div>
                {!collapsed ? (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <button key={item.id} onClick={() => onUseTemplate(item.sql_content)} className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-slate-300">
                        <div className="flex items-center justify-between gap-4">
                          <p className="font-medium text-slate-900">{item.name}</p>
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{item.category}</span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">{item.created_by_name}</p>
                        <p className="mt-2 line-clamp-3 break-all font-mono text-xs text-slate-600">{item.sql_content}</p>
                      </button>
                    ))}
                  </div>
                ) : null}
              </section>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
