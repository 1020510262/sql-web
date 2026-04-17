import { useMemo, useState } from 'react'
import { useI18n } from '../i18n'
import type { DatabaseItem } from '../types'

type Props = {
  databases: DatabaseItem[]
  selectedId: number | null
  onSelect: (databaseId: number) => void
}

export function DatabaseSidebar({ databases, selectedId, onSelect }: Props) {
  const { t } = useI18n()
  const [search, setSearch] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const groupedDatabases = useMemo(() => {
    const keyword = search.trim().toLowerCase()
    const filtered = databases.filter((db) => {
      const haystack = [db.name, db.group_name || '', db.type, db.host, db.description || '', db.database_name]
        .join(' ')
        .toLowerCase()
      return keyword === '' || haystack.includes(keyword)
    })

    return filtered.reduce<Record<string, DatabaseItem[]>>((acc, db) => {
      const groupName = db.group_name || t('sidebar.ungrouped')
      if (!acc[groupName]) {
        acc[groupName] = []
      }
      acc[groupName].push(db)
      return acc
    }, {})
  }, [databases, search, t])

  const groupEntries = useMemo(
    () => Object.entries(groupedDatabases).sort(([left], [right]) => left.localeCompare(right)),
    [groupedDatabases],
  )

  const toggleGroup = (groupName: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupName]: !prev[groupName],
    }))
  }

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-xl shadow-slate-200/70">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">{t('sidebar.title')}</h2>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">{databases.length}</span>
      </div>
      <label className="mt-4 block text-sm text-slate-500">{t('sidebar.searchLabel')}</label>
      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={t('sidebar.searchPlaceholder')}
        className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-500"
      />
      <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-4">
          {groupEntries.length === 0 ? <p className="text-sm text-slate-500">{t('sidebar.noResults')}</p> : null}
          {groupEntries.map(([groupName, items]) => (
            <section key={groupName} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => toggleGroup(groupName)}
                  className="flex items-center gap-2 text-left"
                >
                  <h3 className="text-sm font-semibold text-slate-700">{groupName}</h3>
                  <span className={`text-xs text-slate-400 transition ${(collapsedGroups[groupName] ?? true) ? '-rotate-90' : ''}`}>▾</span>
                </button>
                <span className="rounded-full bg-white px-2 py-1 text-xs text-slate-500">{items.length}</span>
              </div>
              {!(collapsedGroups[groupName] ?? true) ? (
                <div className="space-y-3">
                  {items.map((db) => {
                    const active = db.id === selectedId
                    return (
                      <button
                        key={db.id}
                        onClick={() => onSelect(db.id)}
                        className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                          active
                            ? 'border-accent bg-emerald-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="font-medium text-slate-900">{db.name}</p>
                            <p className="text-sm text-slate-500">{db.type} · {db.host}:{db.port}</p>
                          </div>
                          <span className="rounded-full bg-slate-950 px-2 py-1 font-mono text-xs uppercase text-white">
                            {db.type}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </aside>
  )
}
