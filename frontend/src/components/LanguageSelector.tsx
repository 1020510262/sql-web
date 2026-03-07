import { useI18n } from '../i18n'

export function LanguageSelector() {
  const { language, setLanguage, t } = useI18n()

  return (
    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm text-slate-600 shadow-sm">
      <span>{t('language.label')}</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value as 'en' | 'zh-CN')}
        className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-emerald-500"
      >
        <option value="en">{t('language.english')}</option>
        <option value="zh-CN">{t('language.chinese')}</option>
      </select>
    </label>
  )
}
