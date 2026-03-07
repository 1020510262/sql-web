import { useMemo } from 'react'
import { AgGridReact } from '@ag-grid-community/react'
import '@ag-grid-community/styles/ag-grid.css'
import '@ag-grid-community/styles/ag-theme-alpine.css'
import { useI18n } from '../i18n'
import type { QueryResponse } from '../types'

type Props = {
  result: QueryResponse | null
  error: string | null
}

export function ResultsGrid({ result, error }: Props) {
  const { t } = useI18n()
  const columnDefs = useMemo(
    () =>
      (result?.columns || []).map((column) => ({
        headerName: column,
        field: column,
        sortable: true,
        filter: true,
        resizable: true,
      })),
    [result],
  )

  const rowData = useMemo(() => {
    if (!result) return []
    return result.rows.map((row) =>
      Object.fromEntries(result.columns.map((column, index) => [column, row[index]])),
    )
  }, [result])

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-display text-lg font-semibold">{t('results.title')}</h2>
        {result ? (
          <p className="text-sm text-slate-500">{t('results.summary', { rows: rowData.length, ms: result.execution_time_ms })}</p>
        ) : null}
        {error ? <p className="mt-1 text-sm text-rose-500">{error}</p> : null}
      </div>
      <div className="ag-theme-alpine min-h-0 flex-1 w-full">
        <AgGridReact columnDefs={columnDefs} rowData={rowData} />
      </div>
    </section>
  )
}
