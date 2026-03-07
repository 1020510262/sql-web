import { FormEvent, useState } from 'react'
import { useI18n } from '../i18n'
import { LanguageSelector } from './LanguageSelector'

type Props = {
  onSubmit: (username: string, password: string) => Promise<void>
}

export function LoginForm({ onSubmit }: Props) {
  const { t } = useI18n()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await onSubmit(username, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f3e8d3,_#f8fafc_45%,_#d1fae5)] px-6 py-10 text-ink">
      <div className="mx-auto mb-6 flex max-w-6xl justify-end">
        <LanguageSelector />
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[32px] border border-white/70 bg-white/75 p-10 shadow-2xl shadow-emerald-950/10 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-accent">{t('login.badge')}</p>
          <h1 className="mt-4 max-w-xl font-display text-5xl font-semibold leading-tight">
            {t('login.title')}
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600">{t('login.subtitle')}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              [t('login.card1.title'), t('login.card1.body')],
              [t('login.card2.title'), t('login.card2.body')],
              [t('login.card3.title'), t('login.card3.body')],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-slate-950 px-5 py-4 text-slate-50">
                <h2 className="font-medium">{title}</h2>
                <p className="mt-2 text-sm text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="rounded-[32px] bg-slate-950 p-8 text-white shadow-2xl shadow-slate-950/30">
          <h2 className="font-display text-2xl font-semibold">{t('login.signIn')}</h2>
          <label className="mt-8 block text-sm text-slate-300">{t('login.username')}</label>
          <input
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-emerald-400"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <label className="mt-5 block text-sm text-slate-300">{t('login.password')}</label>
          <input
            type="password"
            className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 outline-none transition focus:border-emerald-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="mt-8 w-full rounded-2xl bg-accent px-4 py-3 font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {loading ? t('login.submitting') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  )
}
