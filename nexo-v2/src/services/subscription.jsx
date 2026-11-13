import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { api } from './api.js'
import { useAuth } from './auth.jsx'
import { errorMessage } from './subscriptions.js'

const SubscriptionContext = createContext({ summary: null, loading: false, error: '', refresh: async () => {}, administration: null, administrationLoading: false, administrationError: '', refreshAdministration: async () => {} })
export function SubscriptionProvider({ children }) {
  const { session } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [administration, setAdministration] = useState(null)
  const [administrationLoading, setAdministrationLoading] = useState(true)
  const [administrationError, setAdministrationError] = useState('')
  const summaryGeneration = useRef(0)
  const accessGeneration = useRef(0)
  const refresh = useCallback(async () => {
    const generation = ++summaryGeneration.current
    setLoading(true)
    try { const data = await api.get('/subscription'); if (generation !== summaryGeneration.current) return null; setSummary(data); setError(''); return data }
    catch (failure) { if (generation === summaryGeneration.current) setError(errorMessage(failure)); return null }
    finally { if (generation === summaryGeneration.current) setLoading(false) }
  }, [session?.user?.id, session?.tenant?.id])
  const refreshAdministration = useCallback(async () => {
    const generation = ++accessGeneration.current
    setAdministrationLoading(true)
    try { const data = await api.get('/subscriptions/admin/access'); if (generation !== accessGeneration.current) return null; setAdministration(data); setAdministrationError(''); return data }
    catch (failure) { if (generation === accessGeneration.current) { setAdministration(null); setAdministrationError([401, 403].includes(failure.status) ? '' : errorMessage(failure)) } return null }
    finally { if (generation === accessGeneration.current) setAdministrationLoading(false) }
  }, [session?.user?.id, session?.tenant?.id])
  useEffect(() => { setSummary(null); setError(''); refresh(); return () => { summaryGeneration.current++ } }, [refresh])
  useEffect(() => { setAdministration(null); setAdministrationError(''); refreshAdministration(); return () => { accessGeneration.current++ } }, [refreshAdministration])
  useEffect(() => { const update = () => { refresh() }; window.addEventListener('nexo:subscription-changed', update); return () => window.removeEventListener('nexo:subscription-changed', update) }, [refresh])
  return <SubscriptionContext.Provider value={{ summary, loading, error, refresh, administration, administrationLoading, administrationError, refreshAdministration }}>{children}</SubscriptionContext.Provider>
}
export function useSubscription() { return useContext(SubscriptionContext) }
