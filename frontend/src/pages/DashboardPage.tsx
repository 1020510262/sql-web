import { useEffect, useMemo, useState } from 'react'
import { ApiError, apiClient } from '../api/client'
import { CredentialModal } from '../components/CredentialModal'
import { DatabaseManagerModal } from '../components/DatabaseManagerModal'
import { DatabaseSidebar } from '../components/DatabaseSidebar'
import { LanguageSelector } from '../components/LanguageSelector'
import { PasswordChangeModal } from '../components/PasswordChangeModal'
import { QueryEditor } from '../components/QueryEditor'
import { ResultsGrid } from '../components/ResultsGrid'
import { SidePanel } from '../components/SidePanel'
import { SqlTemplateModal } from '../components/SqlTemplateModal'
import { UserCreateModal } from '../components/UserCreateModal'
import { useI18n } from '../i18n'
import type {
  DatabaseFormInput,
  DatabaseItem,
  LegacyQueryResponse,
  QueryHistoryItem,
  QueryResponse,
  RoleItem,
  SqlTemplateCreateInput,
  SqlTemplateItem,
  User,
  PasswordChangeInput,
  UserCreateInput,
} from '../types'

type Props = {
  token: string
  user: User
  onLogout: () => void
}

const defaultSql = "SELECT 1 AS id, 'hello' AS message;"

export function DashboardPage({ token, user, onLogout }: Props) {
  const { t } = useI18n()
  const [databases, setDatabases] = useState<DatabaseItem[]>([])
  const [managedDatabases, setManagedDatabases] = useState<DatabaseItem[]>([])
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [templates, setTemplates] = useState<SqlTemplateItem[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [sql, setSql] = useState(defaultSql)
  const [result, setResult] = useState<QueryResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [credentialDatabase, setCredentialDatabase] = useState<DatabaseItem | null>(null)
  const [credentialSaving, setCredentialSaving] = useState(false)
  const [managerOpen, setManagerOpen] = useState(false)
  const [managerLoading, setManagerLoading] = useState(false)
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [userLoading, setUserLoading] = useState(false)
  const [templateModalOpen, setTemplateModalOpen] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const isAdmin = user.role === 'admin'

  const loadDashboard = async () => {
    const requests: Promise<unknown>[] = [
      apiClient.getDatabases(token),
      apiClient.getHistory(token),
      apiClient.getManagedDatabases(token),
      apiClient.getTemplates(token),
    ]
    if (isAdmin) {
      requests.push(apiClient.getRoles(token))
    }

    const response = await Promise.all(requests)
    const dbList = response[0] as DatabaseItem[]
    const historyList = response[1] as QueryHistoryItem[]
    const manageableList = response[2] as DatabaseItem[]
    const templateList = response[3] as SqlTemplateItem[]
    setDatabases(dbList)
    setHistory(historyList)
    setManagedDatabases(manageableList || [])
    setTemplates(templateList || [])
    if (isAdmin) {
      setRoles((response[4] as RoleItem[]) || [])
    }
    if (dbList.length > 0) {
      setSelectedId((current) => (current && dbList.some((db) => db.id === current) ? current : dbList[0].id))
    } else {
      setSelectedId(null)
    }
  }

  useEffect(() => {
    loadDashboard().catch((err) => {
      if (err instanceof ApiError && err.status === 401) {
        onLogout()
        return
      }
      setError(err instanceof Error ? err.message : t('errors.loadDashboard'))
    })
  }, [token, t, onLogout, isAdmin])

  const selectedDatabase = useMemo(
    () => databases.find((item) => item.id === selectedId) || null,
    [databases, selectedId],
  )

  const ensureLocalCredential = async (database: DatabaseItem) => {
    if (database.type === 'sqlite') {
      return true
    }
    try {
      const localConnection = await apiClient.getLocalConnection(database.id)
      return localConnection.has_password
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setCredentialDatabase(database)
        return false
      }
      throw err
    }
  }

  const runQuery = async () => {
    if (!selectedId || !selectedDatabase) {
      setError(t('errors.selectDatabase'))
      setResult(null)
      return
    }

    setLoading(true)
    setError(null)
    try {
      const hasCredential = await ensureLocalCredential(selectedDatabase)
      if (!hasCredential) {
        return
      }
      const response = (await apiClient.executeLocalQuery(selectedId, sql)) as QueryResponse | LegacyQueryResponse
      const normalized = normalizeQueryResponse(response)
      setResult(normalized)
      const historyItem = await apiClient.logHistory(token, {
        database_id: selectedId,
        sql,
        execution_time_ms: normalized.execution_time_ms,
        status: 'success',
      })
      setHistory((prev) => [historyItem, ...prev].slice(0, 50))
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onLogout()
        return
      }
      setResult(null)
      const message = err instanceof ApiError && err.status === 0
        ? t('errors.agentUnavailable')
        : err instanceof Error
          ? err.message
          : t('errors.queryFailed')
      setError(message)
      const failedHistoryItem = await apiClient
        .logHistory(token, {
          database_id: selectedId,
          sql,
          execution_time_ms: 0,
          status: 'failed',
        })
        .catch(() => null)
      if (failedHistoryItem) {
        setHistory((prev) => [failedHistoryItem, ...prev].slice(0, 50))
      }
    } finally {
      setLoading(false)
    }
  }

  const saveCredential = async (password: string) => {
    if (!credentialDatabase) {
      return
    }
    setCredentialSaving(true)
    try {
      await apiClient.saveLocalConnection(credentialDatabase, password)
      setCredentialDatabase(null)
    } finally {
      setCredentialSaving(false)
    }
  }

  const handleCreateDatabase = async (payload: DatabaseFormInput) => {
    setManagerLoading(true)
    try {
      await apiClient.createDatabase(token, payload)
      await loadDashboard()
    } finally {
      setManagerLoading(false)
    }
  }

  const handleUpdateDatabase = async (databaseId: number, payload: DatabaseFormInput) => {
    setManagerLoading(true)
    try {
      const updated = await apiClient.updateDatabase(token, databaseId, payload)
      await apiClient.saveLocalConnection(updated).catch(() => undefined)
      await loadDashboard()
    } finally {
      setManagerLoading(false)
    }
  }

  const handleDeleteDatabase = async (database: DatabaseItem) => {
    if (!window.confirm(t('manager.deleteConfirm'))) {
      return
    }
    setManagerLoading(true)
    try {
      await apiClient.disableDatabase(token, database.id)
      await apiClient.clearLocalConnection(database.id).catch(() => undefined)
      await loadDashboard()
      if (selectedId === database.id) {
        setResult(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('manager.deleteFailed'))
    } finally {
      setManagerLoading(false)
    }
  }

  const handleCreateUser = async (payload: UserCreateInput) => {
    setUserLoading(true)
    try {
      await apiClient.createUser(token, payload)
    } finally {
      setUserLoading(false)
    }
  }

  const handleChangePassword = async (payload: PasswordChangeInput) => {
    setPasswordSaving(true)
    try {
      await apiClient.changePassword(token, payload)
      setPasswordModalOpen(false)
    } finally {
      setPasswordSaving(false)
    }
  }

  const handleCreateTemplate = async (payload: SqlTemplateCreateInput) => {
    setTemplateSaving(true)
    try {
      const template = await apiClient.createTemplate(token, payload)
      setTemplates((prev) => [template, ...prev])
    } finally {
      setTemplateSaving(false)
    }
  }

  return (
    <>
      <div className="h-screen overflow-hidden bg-[linear-gradient(180deg,_#fffaf0,_#ecfeff_45%,_#f8fafc)] px-4 py-4 text-ink sm:px-6 lg:px-8">
        <div className="mx-auto flex h-full min-h-0 max-w-[1600px] flex-col">
          <header className="mb-4 flex flex-col gap-4 rounded-[32px] border border-white/70 bg-white/80 px-6 py-5 shadow-xl shadow-slate-200/60 backdrop-blur lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-accent">{t('dashboard.badge')}</p>
              <h1 className="mt-2 font-display text-3xl font-semibold">{t('dashboard.welcome', { name: user.full_name })}</h1>
              <p className="text-sm text-slate-500">{t('dashboard.role', { role: user.role })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <LanguageSelector />
              {isAdmin ? (
                <button onClick={() => setUserModalOpen(true)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                  {t('dashboard.addUser')}
                </button>
              ) : null}
              <button onClick={() => setPasswordModalOpen(true)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                {t('dashboard.changePassword')}
              </button>
              <button onClick={() => setManagerOpen(true)} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                {t('dashboard.manage')}
              </button>
              {selectedDatabase ? (
                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
                  {t('dashboard.target', { name: selectedDatabase.name })}
                </div>
              ) : null}
              <button onClick={onLogout} className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                {t('dashboard.logout')}
              </button>
            </div>
          </header>

          {error ? (
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <main className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)_340px]">
            <DatabaseSidebar databases={databases} selectedId={selectedId} onSelect={setSelectedId} />
            <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
              <QueryEditor value={sql} onChange={setSql} onRun={runQuery} running={loading} />
              <ResultsGrid result={result} error={error} />
            </div>
            <SidePanel history={history} templates={templates} onAddTemplate={() => setTemplateModalOpen(true)} onUseTemplate={setSql} />
          </main>
        </div>
      </div>
      <CredentialModal
        database={credentialDatabase}
        open={credentialDatabase !== null}
        loading={credentialSaving}
        onClose={() => setCredentialDatabase(null)}
        onSubmit={saveCredential}
      />
      <PasswordChangeModal
        open={passwordModalOpen}
        loading={passwordSaving}
        onClose={() => setPasswordModalOpen(false)}
        onSubmit={handleChangePassword}
      />
      <DatabaseManagerModal
        open={managerOpen}
        databases={managedDatabases}
        loading={managerLoading}
        onClose={() => setManagerOpen(false)}
        onCreate={handleCreateDatabase}
        onUpdate={handleUpdateDatabase}
        onDelete={handleDeleteDatabase}
      />
      <UserCreateModal
        open={userModalOpen}
        roles={roles}
        loading={userLoading}
        onClose={() => setUserModalOpen(false)}
        onSubmit={handleCreateUser}
      />
      <SqlTemplateModal
        open={templateModalOpen}
        loading={templateSaving}
        onClose={() => setTemplateModalOpen(false)}
        onSubmit={handleCreateTemplate}
      />
    </>
  )
}

function normalizeQueryResponse(response: QueryResponse | LegacyQueryResponse): QueryResponse {
  if ('results' in response) {
    return response
  }
  return {
    results: [
      {
        columns: response.columns,
        rows: response.rows,
        execution_time_ms: response.execution_time_ms,
      },
    ],
    execution_time_ms: response.execution_time_ms,
  }
}
