import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, setToken, clearToken } from '../utils/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('achus_token')
    if (!token) { setLoading(false); return }
    api('/api/auth/me')
      .then(res => { if (res.success) setUser(res.data) })
      .catch(() => clearToken())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (username, password) => {
    const params = new URLSearchParams({ username, password })
    const res = await api('/api/auth/login', { method: 'POST', body: params })
    if (!res.success) throw new Error(res.error)
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data
  }, [])

  const register = useCallback(async (username, password) => {
    const params = new URLSearchParams({ username, password })
    const res = await api('/api/auth/register', { method: 'POST', body: params })
    if (!res.success) throw new Error(res.error)
    setToken(res.data.token)
    setUser(res.data.user)
    return res.data
  }, [])

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' })
    clearToken()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
