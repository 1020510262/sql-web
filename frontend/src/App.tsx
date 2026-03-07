import { apiClient } from './api/client'
import { LoginForm } from './components/LoginForm'
import { useSession } from './hooks/useSession'
import { I18nProvider } from './i18n'
import { DashboardPage } from './pages/DashboardPage'

export default function App() {
  const session = useSession()

  return (
    <I18nProvider>
      {!session.token || !session.user ? (
        <LoginForm
          onSubmit={async (username, password) => {
            const response = await apiClient.login(username, password)
            session.save({ token: response.access_token, user: response.user })
          }}
        />
      ) : (
        <DashboardPage token={session.token} user={session.user} onLogout={session.clear} />
      )}
    </I18nProvider>
  )
}
