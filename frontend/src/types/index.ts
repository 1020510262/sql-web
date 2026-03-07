export type User = {
  id: number
  username: string
  full_name: string
  role: string
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: User
}

export type RoleItem = {
  id: number
  name: string
  description?: string | null
}

export type UserCreateInput = {
  username: string
  full_name: string
  password: string
  role_name: string
}

export type DatabaseItem = {
  id: number
  name: string
  group_name?: string | null
  type: string
  host: string
  port: number
  username?: string | null
  database_name: string
  description?: string | null
}

export type DatabaseFormInput = {
  name: string
  group_name?: string | null
  type: string
  host: string
  port: number
  username?: string | null
  database_name: string
  description?: string | null
}

export type QueryHistoryItem = {
  id: number
  database_id: number
  database_name: string
  sql_text: string
  execution_time_ms: number
  status: string
  created_at: string
}

export type SqlTemplateItem = {
  id: number
  name: string
  category: string
  sql_content: string
  parameter_schema?: string | null
  created_at: string
  created_by_name: string
}

export type SqlTemplateCreateInput = {
  name: string
  category?: string
  sql_content: string
}

export type QueryResponse = {
  columns: string[]
  rows: unknown[][]
  execution_time_ms: number
}

export type AgentConnectionSummary = {
  database_id: string
  type: string
  host: string
  port: number
  database: string
  username: string
  has_password: boolean
  sqlite_path?: string
  ssl_mode?: string
}
