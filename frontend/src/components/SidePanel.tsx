import { useMemo, useState, type MouseEvent } from 'react'
import { useI18n } from '../i18n'
import type { QueryHistoryItem, SqlTemplateItem } from '../types'

type Props = {
  history: QueryHistoryItem[]
  templates: SqlTemplateItem[]
  onAddTemplate: () => void
  onUseTemplate: (sql: string) => void
  onDeleteTemplate: (templateId: number) => Promise<void>
}

function formatDeviceLocalTime(value: string): string {
  const normalized = /z$|[+-]\d{2}:\d{2}$/i.test(value) ? value : `${value}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return value
  }
  return date.toLocaleString()
}

function previewStyle(expanded: boolean) {
  return expanded
    ? { whiteSpace: 'pre-wrap' as const }
    : {
        display: '-webkit-box',
        WebkitBoxOrient: 'vertical' as const,
        WebkitLineClamp: 3,
        overflow: 'hidden',
        whiteSpace: 'pre-wrap' as const,
      }
}

export function SidePanel({ history, templates, onAddTemplate, onUseTemplate, onDeleteTemplate }: Props) {
  const { t } = useI18n()
  const [tab, setTab] = useState<'history' | 'templates'>('history')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [expandedHistory, setExpandedHistory] = useState<Record<number, boolean>>({})
  const [expandedTemplates, setExpandedTemplates] = useState<Record<number, boolean>>({})

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

  const templateGroups = useMemo(
    () => Object.entries(groupedTemplates).sort(([left], [right]) => left.localeCompare(right)),
    [groupedTemplates],
  )

  const toggleGroup = (category: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [category]: !prev[category],
    }))
  }

  const toggleHistory = (historyId: number) => {
    setExpandedHistory((prev) => ({
      ...prev,
      [historyId]: !prev[historyId],
    }))
  }

  const toggleTemplate = (templateId: number) => {
    setExpandedTemplates((prev) => ({
      ...prev,
      [templateId]: !prev[templateId],
    }))
  }

  const handleDeleteTemplate = async (event: MouseEvent, templateId: number) => {
    event.stopPropagation()
    if (!window.confirm(t('sqlTemplates.deleteConfirm'))) {
      return
    }
    await onDeleteTemplate(templateId)
  }

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
            {history.map((item) => {
              const expanded = !!expandedHistory[item.id]
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleHistory(item.id)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="min-w-0 break-all font-medium text-slate-900">{item.database_name}</p>
                    <span className={`rounded-full px-2 py-1 text-xs ${item.status === 'success' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {item.status === 'success' ? t('status.success') : t('status.failed')}
                    </span>
                  </div>
                  <p className="mt-2 break-all font-mono text-xs text-slate-600" style={previewStyle(expanded)}>
                    {item.sql_text}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                    <span>{formatDeviceLocalTime(item.created_at)} · {item.execution_time_ms} ms</span>
                    <span className="text-slate-400">{expanded ? '▴' : '▾'}</span>
                  </div>
                </button>
              )
            })}
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
                      type="button"
                      onClick={() => toggleGroup(category)}
                      className="flex items-center gap-2 text-left"
                    >
                      <span className="text-sm font-semibold text-slate-700">{category}</span>
                      <span className={`text-xs text-slate-400 transition ${collapsed ? '-rotate-90' : ''}`}>▾</span>
                    </button>
                    <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{items.length}</span>
                  </div>
                  {!collapsed ? (
                    <div className="space-y-3">
                      {items.map((item) => {
                        const expanded = !!expandedTemplates[item.id]
                        return (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleTemplate(item.id)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                toggleTemplate(item.id)
                              }
                            }}
                            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-300"
                          >
                            <div className="flex items-center justify-between gap-4">
                              <p className="font-medium text-slate-900">{item.name}</p>
                              <div className="flex items-center gap-2">
                                <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">{item.category}</span>
                                <button
                                  type="button"
                                  onClick={(event) => void handleDeleteTemplate(event, item.id)}
                                  className="inline-flex items-center justify-center rounded-full border border-rose-200 p-2 text-rose-600 hover:bg-rose-50"
                                  aria-label={t('sqlTemplates.delete')}
                                  title={t('sqlTemplates.delete')}
                                >
                                  <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  >
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4.8A1.8 1.8 0 0 1 9.8 3h4.4A1.8 1.8 0 0 1 16 4.8V6" />
                                    <path d="M6 6l1 14a2 2 0 0 0 2 1.8h6a2 2 0 0 0 2-1.8l1-14" />
                                    <path d="M10 10v6" />
                                    <path d="M14 10v6" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                            <p className="mt-2 text-xs text-slate-500">{item.created_by_name}</p>
                            <p className="mt-2 break-all font-mono text-xs text-slate-600" style={previewStyle(expanded)}>
                              {item.sql_content}
                            </p>
                            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-slate-400">
                              <span>{formatDeviceLocalTime(item.created_at)}</span>
                              <span className="text-slate-400">{expanded ? '▴' : '▾'}</span>
                            </div>
                          </div>
                        )
                      })}
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
