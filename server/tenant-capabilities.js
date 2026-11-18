// Configuration capabilities are deliberately separate from module visibility.
// Branding affects presentation only; it must never grant product access.
export const TENANT_SETTINGS_EDITOR_ROLES = new Set(['domian_admin', 'client_admin'])
export const TENANT_MODULE_MANAGER_ROLES = new Set(['client_admin'])

export function canEditTenantSettings(role) {
  return TENANT_SETTINGS_EDITOR_ROLES.has(role)
}

export function canManageTenantModules(role) {
  return TENANT_MODULE_MANAGER_ROLES.has(role)
}
