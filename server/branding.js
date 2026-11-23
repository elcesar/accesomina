export function normalizeBranding(input = {}) {
  const branding={displayName:String(input.displayName||'').trim(),theme:String(input.theme||'light').trim(),logoUrl:String(input.logoUrl||'').trim(),logoFileId:String(input.logoFileId||'').trim(),primaryColor:String(input.primaryColor||'#2A2A8C').trim()}
  if(!/^#[0-9a-f]{6}$/i.test(branding.primaryColor)) throw Object.assign(new Error('Selecciona un color válido.'),{status:400,code:'INVALID_PRIMARY_COLOR'})
  if(branding.logoFileId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(branding.logoFileId))throw Object.assign(new Error('El archivo de logo no es válido.'),{status:400,code:'INVALID_LOGO_FILE'})
  return branding
}
export function validLogoObject(file) {return Boolean(file&&!file.deleted_at&&file.malware_status==='clean'&&['image/png','image/jpeg'].includes(file.content_type)&&Number(file.byte_size)>0&&Number(file.byte_size)<=2*1024*1024)}
export const INACTIVE_INTEGRATIONS = new Set(['whatsapp','signature'])
export async function tenantLogoObject(client,tenantId,fileId) {
 if(!fileId)return null
 return (await client.query('SELECT * FROM file_objects WHERE id=$1 AND tenant_id=$2 AND deleted_at IS NULL',[fileId,tenantId])).rows[0] || null
}
