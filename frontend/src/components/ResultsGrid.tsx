import { useEffect, useMemo, useState } from 'react'
import { AgGridReact } from '@ag-grid-community/react'
import '@ag-grid-community/styles/ag-grid.css'
import '@ag-grid-community/styles/ag-theme-alpine.css'
import { useI18n } from '../i18n'
import type { QueryResponse, QueryResult } from '../types'

type Props = {
  result: QueryResponse | null
  error: string | null
}

export function ResultsGrid({ result, error }: Props) {
  const { t } = useI18n()
  const [activeIndex, setActiveIndex] = useState(0)
  const results = useMemo<QueryResult[]>(() => result?.results || [], [result])
  const activeResult = results[activeIndex] || null

  useEffect(() => {
    if (activeIndex >= results.length) {
      setActiveIndex(0)
    }
  }, [results, activeIndex])

  const columnDefs = useMemo(
    () =>
      (activeResult?.columns || []).map((column) => ({
        headerName: column,
        field: column,
        sortable: true,
        filter: true,
        resizable: true,
      })),
    [activeResult],
  )

  const rowData = useMemo(() => {
    if (!activeResult) return []
    return activeResult.rows.map((row) =>
      Object.fromEntries(activeResult.columns.map((column, index) => [column, row[index]])),
    )
  }, [activeResult])

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">{t('results.title')}</h2>
        {result ? (
          <p className="text-sm text-slate-500">{t('results.summary', { rows: rowData.length, ms: result.execution_time_ms })}</p>
        ) : null}
        {error ? <p className="mt-1 text-sm text-rose-500">{error}</p> : null}
      </div>
      {results.length > 1 ? (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-4 py-3">
          {results.map((_, index) => (
            <button
              key={`result-${index}`}
              onClick={() => setActiveIndex(index)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                index === activeIndex ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {t('results.tab', { index: index + 1 })}
            </button>
          ))}
        </div>
      ) : null}
      <div className="ag-theme-alpine min-h-0 flex-1 w-full">
        <AgGridReact
          columnDefs={columnDefs}
          rowData={rowData}
          enableCellTextSelection
          ensureDomOrder
        />
      </div>
    </section>
  )
}
