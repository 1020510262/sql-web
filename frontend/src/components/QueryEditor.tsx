import Editor from '@monaco-editor/react'
import { useI18n } from '../i18n'

type Props = {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  running: boolean
}

export function QueryEditor({ value, onChange, onRun, running }: Props) {
  const { t } = useI18n()

  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <div>
          <h2 className="font-display text-lg font-semibold">{t('query.title')}</h2>
          <p className="text-sm text-slate-500">{t('query.subtitle')}</p>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
        >
          {running ? t('query.running') : t('query.run')}
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <Editor
          height="100%"
          defaultLanguage="sql"
          value={value}
          onChange={(next) => onChange(next || '')}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            fontFamily: '"IBM Plex Mono", Menlo, Consolas, "Courier New", monospace',
            fontLigatures: false,
            automaticLayout: true,
          }}
        />
      </div>
    </section>
  )
}
