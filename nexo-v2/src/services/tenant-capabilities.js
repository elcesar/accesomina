export const TENANT_MODULE_MANAGER_ROLES = new Set(['client_admin'])

export function canManageTenantModules(role) {
  return TENANT_MODULE_MANAGER_ROLES.has(role)
}
