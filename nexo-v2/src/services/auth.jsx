import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { api, setCsrf } from './api.js'
import { setOperationalTimeZone } from './calendar-date.js'

const AuthContext = createContext(null)

async function configureOperationalCalendar(session) {
  setOperationalTimeZone(session?.tenant?.operationalTimeZone || session?.tenant?.timeZone)
  try {
    const data = await api.get('/settings')
    setOperationalTimeZone(data?.settings?.catalogs?.operationalTimeZone)
  } catch {}
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadSession = useCallback(async () => {
    try {
      const data = await api.get('/auth/me')
      setCsrf(data.csrfToken)
      setSession(data)
      await configureOperationalCalendar(data)
      return data
    } catch {
      setSession(null)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadSession() }, [loadSession])

  const login = async ({ rut, email, password, mfaCode }) => {
    const data = await api.post('/auth/login', { rut, email, password, mfaCode })
    setCsrf(data.csrfToken)
    setSession(data)
    await configureOperationalCalendar(data)
    return data
  }

  const logout = async ({ requireSuccess = false } = {}) => {
    try { await api.post('/auth/logout') }
    catch (error) {
      // A 401 confirms there is no server session left to close.
      if (requireSuccess && error.status !== 401) throw error
    }
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
