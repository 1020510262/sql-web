import { useMemo, useState } from 'react'
import type { User } from '../types'

type SessionState = {
  token: string | null
  user: User | null
}

const STORAGE_KEY = 'sql-central-console-session'

export function useSession() {
  const initial = useMemo(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SessionState) : { token: null, user: null }
  }, [])

  const [token, setToken] = useState<string | null>(initial.token)
  const [user, setUser] = useState<User | null>(initial.user)

  const save = (next: SessionState) => {
    setToken(next.token)
    setUser(next.user)
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  const clear = () => {
    setToken(null)
    setUser(null)
    window.localStorage.removeItem(STORAGE_KEY)
  }

  return { token, user, save, clear }
}
