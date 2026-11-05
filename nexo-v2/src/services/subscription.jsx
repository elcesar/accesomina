import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api.js'
import { useAuth } from './auth.jsx'
import { errorMessage } from './subscriptions.js'

const SubscriptionContext = createContext({ summary: null, loading: false, error: '', refresh: async () => {} })
export function SubscriptionProvider({ children }) {
  const { session } = useAuth()
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const refresh = useCallback(async () => {
    setLoading(true)
    try { const data = await api.get('/subscription'); setSummary(data); setError(''); return data }
    catch (failure) { setError(errorMessage(failure)); return null }
    finally { setLoading(false) }
  }, [session?.user?.id, session?.tenant?.id])
  useEffect(() => { setSummary(null); refresh() }, [refresh])
  useEffect(() => { const update = () => { refresh() }; window.addEventListener('nexo:subscription-changed', update); return () => window.removeEventListener('nexo:subscription-changed', update) }, [refresh])
  return <SubscriptionContext.Provider value={{ summary, loading, error, refresh }}>{children}</SubscriptionContext.Provider>
}
export function useSubscription() { return useContext(SubscriptionContext) }
