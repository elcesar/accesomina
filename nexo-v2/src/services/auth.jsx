import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, setCsrf } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const data = await api.get('/auth/me')
      setCsrf(data.csrfToken)
      setSession(data)
    } catch {
      setSession(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSession() }, [loadSession])

  const login = async ({ rut, email, password, mfaCode }) => {
    const data = await api.post('/auth/login', { rut, email, password, mfaCode })
    setCsrf(data.csrfToken)
    setSession(data)
    return data
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } catch {}
    setCsrf(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout, reload: loadSession }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
