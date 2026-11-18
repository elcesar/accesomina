export const DEFAULT_PRIMARY_COLOR = '#2A2A8C'
export const INACTIVE_INTEGRATIONS = new Set(['whatsapp', 'signature'])
const HEX_COLOR = /^#[0-9a-f]{6}$/i

const own = (value, key) => Object.prototype.hasOwnProperty.call(value || {}, key)
const string = value => typeof value === 'string' ? value.trim() : ''

export function isPrimaryColor(value) {
  return HEX_COLOR.test(String(value || '').trim())
}

export function normalizePrimaryColor(value, fallback = DEFAULT_PRIMARY_COLOR) {
  const color = string(value) || fallback
  if (!isPrimaryColor(color)) {
    throw Object.assign(new Error('Selecciona un color principal válido.'), { status: 400, code: 'INVALID_PRIMARY_COLOR' })
  }
  return color.toUpperCase()
}

// Logo references are server-managed. Keeping them out of the ordinary settings
// update prevents a caller from attaching an arbitrary tenant file by ID.
export function mergeBranding(previous = {}, incoming = {}) {
  const before = previous && typeof previous === 'object' ? previous : {}
  const source = incoming && typeof incoming === 'object' ? incoming : {}
  const logoFileId = string(before.logoFileId)
  const logoUrl = string(before.logoUrl)

  if (own(source, 'logoFileId') && string(source.logoFileId) !== logoFileId) {
    throw Object.assign(new Error('El logo se administra mediante la carga privada de archivos.'), { status: 409, code: 'LOGO_MANAGED_SEPARATELY' })
  }
  if (own(source, 'logoUrl') && string(source.logoUrl) !== logoUrl) {
    throw Object.assign(new Error('El logo se administra mediante la carga privada de archivos.'), { status: 409, code: 'LOGO_MANAGED_SEPARATELY' })
  }

  return {
    displayName: own(source, 'displayName') ? string(source.displayName) : string(before.displayName),
    theme: own(source, 'theme') ? string(source.theme) || 'light' : string(before.theme) || 'light',
    // Legacy URL branding remains readable during migration, but cannot be changed
    // through the normal settings mutation.
    logoUrl,
    logoFileId,
    primaryColor: normalizePrimaryColor(own(source, 'primaryColor') ? source.primaryColor : before.primaryColor),
  }
}

export function brandingWithLogo(previous = {}, fileId) {
  const branding = mergeBranding(previous, {})
  return { ...branding, logoFileId: String(fileId), logoUrl: '' }
}

export function validLogoObject(file) {
  return Boolean(
    file &&
    !file.deleted_at &&
    file.malware_status === 'clean' &&
    ['image/png', 'image/jpeg'].includes(file.content_type) &&
    Number(file.byte_size) > 0 &&
    Number(file.byte_size) <= 2 * 1024 * 1024
  )
}

export async function tenantLogoObject(client, tenantId, fileId) {
  if (!fileId) return null
  const result = await client.query(
    'SELECT * FROM file_objects WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',
    [fileId, tenantId]
  )
  return result.rows[0] || null
}
