import Editor from '@monaco-editor/react'
import type * as monaco from 'monaco-editor'
import { useCallback, useRef } from 'react'
import { useI18n } from '../i18n'

type Props = {
  value: string
  onChange: (value: string) => void
  onRun: () => void
  running: boolean
}

export function QueryEditor({ value, onChange, onRun, running }: Props) {
  const { t } = useI18n()
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)

  const handleMount = useCallback((editor: monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor

    const remeasure = () => {
      editor.updateOptions({ fontFamily: '"IBM Plex Mono", Menlo, Consolas, "Courier New", monospace' })
      
      // ✅ 修改处：使用 (editor as any) 绕过类型检查
      // 或者如果确定是 standalone editor，可以强转为包含该方法的特定类型
      (editor as any).remeasureFonts()
      editor.layout()
    }

    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        remeasure()
      })
    } else {
      setTimeout(remeasure, 300)
    }
  }, [])

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
          onMount={handleMount}
          loading={t('query.loading')}
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
