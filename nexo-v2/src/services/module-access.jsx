import { createContext, useContext } from 'react'
import { moduleIsEnabled } from './module-access.js'

const ModuleAccessContext = createContext({ loading: true, modules: {}, isEnabled: () => true })

export function ModuleAccessProvider({ modules = {}, loading = false, children }) {
  const value = { loading, modules, isEnabled: moduleKey => moduleIsEnabled(modules, moduleKey) }
  return <ModuleAccessContext.Provider value={value}>{children}</ModuleAccessContext.Provider>
}

export function useModuleAccess() {
  return useContext(ModuleAccessContext)
}
