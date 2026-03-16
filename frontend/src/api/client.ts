import type {
  AgentConnectionSummary,
  DatabaseFormInput,
  DatabaseItem,
  LoginResponse,
  QueryHistoryItem,
  RoleItem,
  PasswordChangeInput,
  SqlTemplateCreateInput,
  SqlTemplateItem,
  UserCreateInput,
} from '../types'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const AGENT_BASE = import.meta.env.VITE_AGENT_BASE || 'http://127.0.0.1:17890'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.detail || body.error || 'Request failed', response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function agentRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${AGENT_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new ApiError('Local Agent is unavailable. Start the agent at http://127.0.0.1:17890 and try again.', 0)
    }
    throw error
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(body.detail || body.error || 'Local agent request failed', response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  login: (username: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  getDatabases: (token: string) => request<DatabaseItem[]>('/api/databases', {}, token),
  getManagedDatabases: (token: string) => request<DatabaseItem[]>('/api/databases/manage', {}, token),
  getRoles: (token: string) => request<RoleItem[]>('/api/users/roles', {}, token),
  getTemplates: (token: string) => request<SqlTemplateItem[]>('/api/templates', {}, token),

  createTemplate: (token: string, payload: SqlTemplateCreateInput) =>
    request<SqlTemplateItem>('/api/templates', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  createUser: (token: string, payload: UserCreateInput) =>
    request('/api/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  changePassword: (token: string, payload: PasswordChangeInput) =>
    request<void>('/api/users/me/password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  createDatabase: (token: string, payload: DatabaseFormInput) =>
    request<DatabaseItem>('/api/databases', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  updateDatabase: (token: string, databaseId: number, payload: DatabaseFormInput) =>
    request<DatabaseItem>(`/api/databases/${databaseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }, token),

  disableDatabase: (token: string, databaseId: number) =>
    request<DatabaseItem>(`/api/databases/${databaseId}/disable`, {
      method: 'POST',
    }, token),

  getHistory: (token: string) => request<QueryHistoryItem[]>('/api/history', {}, token),

  logHistory: (token: string, payload: { database_id: number; sql: string; execution_time_ms: number; status: string }) =>
    request<QueryHistoryItem>('/api/history', {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  executeLocalQuery: (databaseId: number, sql: string) =>
    agentRequest('/query', {
      method: 'POST',
      body: JSON.stringify({ database_id: String(databaseId), sql }),
    }),

  getLocalConnection: (databaseId: number) =>
    agentRequest<AgentConnectionSummary>(`/connections/${databaseId}`),

  saveLocalConnection: (database: DatabaseItem, password?: string) =>
    agentRequest<AgentConnectionSummary>('/connections/upsert', {
      method: 'POST',
      body: JSON.stringify({
        database_id: String(database.id),
        type: database.type,
        host: database.host,
        port: database.port,
        database: database.database_name,
        username: database.username || '',
        password: password || '',
      }),
    }),

  clearLocalConnection: (databaseId: number) =>
    agentRequest<void>(`/connections/${databaseId}`, {
      method: 'DELETE',
    }),
}
