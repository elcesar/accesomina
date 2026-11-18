// UI capability mirrors server policy. Server checks remain authoritative.
export const canManageTenantModules = role => role === 'client_admin'
