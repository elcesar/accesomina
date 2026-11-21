import { createContext, useContext } from 'react'
import { moduleIsEnabled } from './module-access.js'
import { isReadOnly, userCanWriteModule } from '../../../shared/role-access.js'

const ModuleAccessContext = createContext({ loading: true, modules: {}, isEnabled: () => true, canWrite: () => true, readOnly: false })

export function ModuleAccessProvider({ modules = {}, userModules = {}, role = 'client_admin', loading = false, children }) {
  const value = {
    loading,
    modules,
    readOnly: isReadOnly(role),
    isEnabled: moduleKey => moduleIsEnabled(modules, moduleKey, userModules, role),
    canWrite: moduleKey => moduleIsEnabled(modules, moduleKey, userModules, role) && userCanWriteModule({ role, modules: userModules }, moduleKey),
  }
  return <ModuleAccessContext.Provider value={value}>{children}</ModuleAccessContext.Provider>
}

export function useModuleAccess() {
  return useContext(ModuleAccessContext)
}
