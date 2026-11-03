import { ActionButton } from '../components/ui/ActionButton.jsx'
import { useEffect, useRef, useState } from 'react'
import { IconDownload, IconKey, IconRefresh, IconSettings, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { useConfirmation } from '../services/useConfirmation.js'
import '../styles/admin-clients.css'

const STATUS = { pending: 'Pendiente de aprobación', active: 'Activa', suspended: 'Suspendida', deleted: 'Eliminada' }
const HEALTH = { verde: 'Operación estable', amarillo: 'Requiere revisión', rojo: 'Acceso restringido' }
const TICKETS = { abierto: 'Abierto', en_progreso: 'En progreso', esperando_cliente: 'Esperando cliente', resuelto: 'Resuelto', cerrado: 'Cerrado' }
const date = value => value ? String(value).slice(0, 10) : ''
const number = value => new Intl.NumberFormat('es-CL').format(Number(value || 0))
const dateTime = value => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin registros'
const ERASURE_REASONS = { solicitud_cliente: 'Solicitud del cliente', cuenta_prueba: 'Cuenta de prueba', alta_incorrecta: 'Alta incorrecta', termino_servicio: 'Término de servicio' }
const pendingFiles = value => Number.isInteger(value) && value >= 0 ? value : null
const cleanupComplete = result => result?.cleanupPending === false && pendingFiles(result.filesPending) === 0
const pendingDescription = count => pendingFiles(count) === null ? 'Cantidad de archivos por confirmar' : `${number(count)} ${count === 1 ? 'archivo pendiente' : 'archivos pendientes'}`

function controlForm(data) {
  const profile = data.profile || {}; const defaults = data.planDefaults?.[profile.plan_code || 'esencial'] || {}
  return {
    planCode: profile.plan_code || 'esencial', monthlyPriceClp: profile.monthly_price_clp ?? 0, setupPriceClp: profile.setup_price_clp ?? 0,
    includedUsers: profile.included_users ?? defaults.users ?? 3, includedWorkers: profile.included_workers ?? defaults.workers ?? 30,
    storageLimitMb: profile.storage_limit_mb ?? defaults.storage ?? 1024, enabledModules: profile.enabled_modules || [], paymentStatus: profile.payment_status || 'cortesia',
    renewalDate: date(profile.renewal_date), discountPercent: profile.discount_percent ?? 0, billingContact: profile.billing_contact || '', accountOwner: profile.account_owner || '',
    lifecycleStatus: profile.lifecycle_status || 'activo', suspensionReason: profile.suspension_reason || '', graceUntil: date(profile.grace_until), readOnlyUntil: date(profile.read_only_until),
    offboardingAt: date(profile.offboarding_at), onboardingStep: profile.onboarding_step || 1, onboardingCompleted: Boolean(profile.onboarding_completed), notes: profile.notes || '',
  }
}

export default function AdministracionClientesPage() {
  const { session } = useAuth()
  const confirmation = useConfirmation()
  const [tenants, setTenants] = useState([]); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(''); const [deleting, setDeleting] = useState(''); const [resetting, setResetting] = useState('')
  const [selected, setSelected] = useState(null); const [control, setControl] = useState(null); const [form, setForm] = useState(null)
  const [loadingControl, setLoadingControl] = useState(false); const [saving, setSaving] = useState(false); const [exporting, setExporting] = useState(false); const [controlMessage, setControlMessage] = useState('')
  const [ticket, setTicket] = useState({ subject: '', description: '', severity: 'media', owner: '', dueAt: '' })
  const [tenantToErase, setTenantToErase] = useState(null); const [erasureConfirmation, setErasureConfirmation] = useState(''); const [erasureReason, setErasureReason] = useState(''); const [erasing, setErasing] = useState('')
  const [cleanups, setCleanups] = useState([]); const [cleanupsLoading, setCleanupsLoading] = useState(true); const [cleanupError, setCleanupError] = useState(''); const [cleanupMessage, setCleanupMessage] = useState('')
  const [tenantLoadError, setTenantLoadError] = useState(''); const [retryingCleanup, setRetryingCleanup] = useState('')
  const [erasureError, setErasureError] = useState(''); const [erasureUncertain, setErasureUncertain] = useState(false); const [erasureFieldError, setErasureFieldError] = useState(false)
  const erasureRunning = useRef(false); const cleanupRunning = useRef(false); const loadSequence = useRef(0); const erasureDialogRef = useRef(null); const erasureConfirmationRef = useRef(null); const cleanupHeadingRef = useRef(null)
  const isNexoAdmin = session?.user?.role === 'domian_admin'

  const load = async ({ preserveMessage = false } = {}) => {
    if (!isNexoAdmin) return { tenants: null, cleanups: null }
    const sequence = ++loadSequence.current
    setLoading(true); setCleanupsLoading(true); setTenantLoadError(''); setCleanupError('')
    if (!preserveMessage) { setMessage(''); setCleanupMessage('') }
    const [tenantResult, cleanupResult] = await Promise.allSettled([api.get('/tenants'), api.get('/tenants/erasure-cleanups')])
    const snapshot = { tenants: tenantResult.status === 'fulfilled' && Array.isArray(tenantResult.value) ? tenantResult.value : null, cleanups: cleanupResult.status === 'fulfilled' && Array.isArray(cleanupResult.value) ? cleanupResult.value : null }
    if (sequence === loadSequence.current) {
      if (snapshot.tenants) setTenants(snapshot.tenants)
      else setTenantLoadError('No fue posible actualizar las empresas. Reintenta la actualización para confirmar su estado.')
      if (snapshot.cleanups) setCleanups(snapshot.cleanups)
      else setCleanupError('No fue posible actualizar las limpiezas pendientes. El último listado puede estar desactualizado. Reintenta la actualización.')
      setLoading(false); setCleanupsLoading(false)
    }
    return snapshot
  }
  useEffect(() => { if (isNexoAdmin) load(); else setLoading(false) }, [isNexoAdmin])
  useEffect(() => {
    if (!tenantToErase) return undefined
    const opener = document.activeElement, dialog = erasureDialogRef.current
    dialog?.querySelector('select')?.focus()
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); if (!erasureRunning.current) setTenantToErase(null); return }
      if (event.key !== 'Tab' || !dialog) return
      const controls = [...dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')]
      if (!controls.length) { event.preventDefault(); return }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus() }
      else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus() }
    }
    document.addEventListener('keydown', keydown)
    return () => { document.removeEventListener('keydown', keydown); if (opener?.isConnected) opener.focus(); else cleanupHeadingRef.current?.focus() }
  }, [tenantToErase])
  const setValue = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const changeStatus = async (tenant, status) => {
    const action = status === 'active' ? 'activar' : 'suspender'
    setChanging(tenant.id); setMessage('')
    try { const updated = await api.patch(`/tenants/${tenant.id}`, { status }); setTenants(current => current.map(item => item.id === tenant.id ? { ...item, ...updated } : item)); const emailMessage = status === 'active' && updated.approvalEmail ? (updated.approvalEmail.delivered ? ' Se notificó al administrador por correo.' : ' La cuenta fue activada, pero el correo no se pudo enviar. Revisa la configuración SMTP.') : ''; setMessage(`La cuenta de ${tenant.company_name} fue actualizada.${emailMessage}`) }
    catch (error) { throw new Error(error.message || `No fue posible ${action} la empresa.`) } finally { setChanging('') }
  }
  const resetAdminAccess = async tenant => {
    setResetting(tenant.id); setMessage('')
    try { const result = await api.post(`/tenants/${tenant.id}/reset-admin-password`, {}); setMessage(result?.temporaryPassword ? `Acceso restablecido. Contraseña temporal: ${result.temporaryPassword}` : 'Acceso restablecido.') }
    catch (error) { throw new Error(error.message || 'No fue posible restablecer el acceso.') } finally { setResetting('') }
  }
  const deleteTenant = async tenant => {
    setDeleting(tenant.id); setMessage('')
    try { const updated = await api.delete(`/tenants/${tenant.id}`); setTenants(current => current.map(item => item.id === tenant.id ? { ...item, ...updated } : item)); setMessage(`El cliente ${tenant.company_name} fue eliminado.`) }
    catch (error) { throw new Error(error.message || 'No fue posible eliminar el cliente.') } finally { setDeleting('') }
  }
  const openErasure = tenant => { if (erasureRunning.current) return; setTenantToErase(tenant); setErasureConfirmation(''); setErasureReason(''); setErasureError(''); setErasureFieldError(false); setErasureUncertain(false); setMessage(''); setCleanupMessage('') }
  const reconcileErasure = async tenant => {
    const snapshot = await load({ preserveMessage: true })
    if (snapshot.tenants && !snapshot.tenants.some(item => item.id === tenant.id)) {
      setTenantToErase(null)
      setMessage('La actualización confirmó que la cuenta ya no está registrada. Revisa el listado de limpiezas pendientes para comprobar el estado de sus archivos.')
    } else if (snapshot.tenants && snapshot.cleanups) {
      setErasureUncertain(false)
      setErasureError('La cuenta sigue registrada. No se confirmó la eliminación; revisa los datos y vuelve a intentar si corresponde.')
    } else setErasureError('No pudimos confirmar el resultado de la eliminación. Actualiza las empresas y las limpiezas antes de volver a enviar la solicitud.')
  }
  const checkErasure = async () => {
    if (!tenantToErase || erasureRunning.current) return
    erasureRunning.current = true; setErasing(tenantToErase.id)
    try { await reconcileErasure(tenantToErase) } finally { erasureRunning.current = false; setErasing('') }
  }
  const eraseTenant = async event => {
    event.preventDefault()
    if (!tenantToErase || erasureRunning.current || erasureUncertain) return
    const tenant = tenantToErase
    erasureRunning.current = true; setErasing(tenant.id); setMessage(''); setErasureError(''); setErasureFieldError(false)
    try {
      const result = await api.delete(`/tenants/${tenant.id}/data`, { body: { confirmation: erasureConfirmation, reasonCode: erasureReason }, feedback: false })
      if (result?.erased !== true) throw new Error('Resultado de eliminación no confirmado')
      setTenants(current => current.filter(item => item.id !== tenant.id)); setTenantToErase(null)
      if (cleanupComplete(result)) setMessage('La cuenta, sus datos y sus archivos fueron eliminados definitivamente.')
      else {
        if (result.erasureId) setCleanups(current => [{ erasureId: result.erasureId, deletedAt: null, reasonCode: erasureReason, filesPending: pendingFiles(result.filesPending), lastError: null }, ...current.filter(item => item.erasureId !== result.erasureId)])
        setMessage('La cuenta y sus datos fueron eliminados. La limpieza de archivos sigue pendiente; puedes continuarla desde Limpiezas de archivos pendientes.')
      }
      await load({ preserveMessage: true })
    } catch (error) {
      if (!error.status || error.status >= 500 || error.status === 404) {
        setErasureUncertain(true)
        setErasureError('No pudimos confirmar el resultado de la eliminación. Estamos actualizando las empresas y las limpiezas pendientes.')
        await reconcileErasure(tenant)
      } else {
        setErasureError(error.code === 'TENANT_ERASURE_CONFIRMATION_REQUIRED' ? 'Revisa el motivo y escribe la confirmación exactamente como se muestra.' : error.message || 'No fue posible eliminar la cuenta. Revisa la confirmación e inténtalo nuevamente.')
        if (error.code === 'TENANT_ERASURE_CONFIRMATION_REQUIRED') { setErasureFieldError(true); requestAnimationFrame(() => erasureConfirmationRef.current?.focus()) }
      }
    } finally { erasureRunning.current = false; setErasing('') }
  }
  const retryCleanup = async cleanup => {
    if (cleanupRunning.current || !isNexoAdmin) return
    cleanupRunning.current = true; setRetryingCleanup(cleanup.erasureId); setCleanupError(''); setCleanupMessage('')
    try {
      const result = await api.post(`/tenants/erasure-cleanup/${encodeURIComponent(cleanup.erasureId)}`, {}, { feedback: false })
      if (cleanupComplete(result)) {
        setCleanups(current => current.filter(item => item.erasureId !== cleanup.erasureId))
        setCleanupMessage('La limpieza de archivos se completó para la referencia seleccionada.')
      } else {
        setCleanups(current => current.map(item => item.erasureId === cleanup.erasureId ? { ...item, filesPending: pendingFiles(result.filesPending) } : item))
        setCleanupMessage(`La limpieza sigue pendiente. ${pendingDescription(result.filesPending)}. Puedes volver a intentarlo.`)
      }
    } catch {
      await load({ preserveMessage: true })
      setCleanupError('No pudimos confirmar que la limpieza se haya completado. Se solicitó actualizar el listado; revisa su estado antes de volver a intentar.')
    } finally { cleanupRunning.current = false; setRetryingCleanup('') }
  }
  const openControl = async tenant => {
    setSelected(tenant); setControl(null); setForm(null); setControlMessage(''); setLoadingControl(true)
    try { const data = await api.get(`/tenants/${tenant.id}/control`); setControl(data); setForm(controlForm(data)) }
    catch (error) { setControlMessage(error.message || 'No fue posible cargar la administración de la empresa.') } finally { setLoadingControl(false) }
  }
  const saveControl = async event => {
    event.preventDefault(); if (!selected || !form) return
    setSaving(true); setControlMessage('')
    try { const profile = await api.put(`/tenants/${selected.id}/control`, form); const updated = { ...control, profile }; setControl(updated); setForm(controlForm(updated)); setControlMessage('Administración comercial y operativa guardada.'); await load() }
    catch (error) { setControlMessage(error.message || 'No fue posible guardar la administración.') } finally { setSaving(false) }
  }
  const createTicket = async event => {
    event.preventDefault(); if (!selected || ticket.subject.trim().length < 3) return
    try { const created = await api.post(`/tenants/${selected.id}/tickets`, ticket); setControl(current => ({ ...current, tickets: [created, ...(current.tickets || [])] })); setTicket({ subject: '', description: '', severity: 'media', owner: '', dueAt: '' }); setControlMessage('Solicitud de soporte registrada.'); await load() }
    catch (error) { setControlMessage(error.message || 'No fue posible registrar la solicitud.') }
  }
  const updateTicket = async (id, status) => {
    try { const updated = await api.patch(`/tenants/${selected.id}/tickets/${id}`, { status }); setControl(current => ({ ...current, tickets: current.tickets.map(item => item.id === id ? updated : item) })); await load() }
    catch (error) { setControlMessage(error.message || 'No fue posible actualizar la solicitud.') }
  }
  const downloadBackup = async () => {
    setExporting(true); setControlMessage('')
    try { const backup = await api.post(`/tenants/${selected.id}/export-backup`, {}); const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = `respaldo-${selected.company_name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.json`; link.click(); URL.revokeObjectURL(url); setControlMessage('Respaldo descargado y registrado en la bitácora.') }
    catch (error) { setControlMessage(error.message || 'No fue posible generar el respaldo.') } finally { setExporting(false) }
  }

  if (!isNexoAdmin) return <section className="nk-module-page nk-admin-clients-page"><header className="nk-module-header"><div><h1>Administración de clientes</h1><p>Este módulo está disponible únicamente para Administración Nexo Klar.</p></div></header></section>
  const visible = tenants.filter(tenant => !tenant.is_domian_admin)
  return <section className="nk-module-page nk-admin-clients-page">
    <header className="nk-module-header"><div><h1>Administración de clientes</h1><p>Gestiona cuentas, planes, adopción, soporte y continuidad de cada empresa.</p></div><ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary" onClick={() => load()} disabled={loading || Boolean(erasing) || Boolean(retryingCleanup)}><IconRefresh size={16} />{loading ? 'Actualizando…' : 'Actualizar'}</ActionButton></header>
    {message && <p className="nk-form-message" role="status">{message}</p>}
    {tenantLoadError && <p className="nk-field-error" role="alert">{tenantLoadError}</p>}
    <section className="nk-module-card nk-admin-clients-card"><header className="nk-admin-clients-card-head"><div><h2>Empresas usuarias</h2><p>El detalle de cada cuenta mantiene separado su control comercial, acceso y soporte.</p></div></header><div className="nk-table-wrapper nk-admin-clients-table-wrap"><table className="nk-table nk-admin-clients-table"><thead><tr><th>Empresa</th><th>Plan y adopción</th><th>Administrador</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {loading ? <tr><td colSpan="5">Cargando empresas…</td></tr> : visible.length ? visible.map(tenant => <tr key={tenant.id}><td><strong>{tenant.company_name}</strong><small>{tenant.rut || 'Sin RUT registrado'}</small></td><td><strong>{tenant.plan_code || 'Plan esencial'}</strong><small>Paso {tenant.onboarding_step || 1}/7 · {tenant.active_users || 0} usuarios activos</small></td><td>{tenant.admin_email || '—'}<small>{tenant.active_sessions || 0} sesiones activas</small></td><td><span className={`nk-admin-clients-status ${tenant.status || ''}`}>{STATUS[tenant.status] || tenant.status || 'Sin estado'}</span></td><td><div className="nk-admin-clients-actions"><button className="nk-button nk-button-secondary nk-button-sm" onClick={() => openControl(tenant)}><IconSettings size={14} />Gestionar</button>{['pending', 'suspended'].includes(tenant.status) && <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-primary nk-button-sm" disabled={changing === tenant.id} onClick={() => confirmation.ask({title:'Activar cuenta',description:`Se activará la cuenta de ${tenant.company_name}. El servidor puede notificar al administrador por correo.`,confirmLabel:'Activar cuenta',onConfirm:()=>changeStatus(tenant,'active')})}>{changing === tenant.id ? 'Activando…' : 'Activar'}</ActionButton>}{tenant.status === 'active' && <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary nk-button-sm" disabled={changing === tenant.id} onClick={() => confirmation.ask({title:'Suspender cuenta',description:`Se suspenderá la cuenta de ${tenant.company_name} y se bloqueará su acceso.`,confirmLabel:'Suspender cuenta',variant:'danger',onConfirm:()=>changeStatus(tenant,'suspended')})}>{changing === tenant.id ? 'Suspendiendo…' : 'Suspender'}</ActionButton>}{tenant.status === 'suspended' && <button className="nk-button nk-button-danger nk-button-sm" onClick={() => openErasure(tenant)}>Eliminar datos</button>}{tenant.status !== 'deleted' && <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary nk-button-sm" disabled={resetting === tenant.id} onClick={() => confirmation.ask({title:'Restablecer acceso del administrador',description:`Se restablecerá el acceso del administrador de ${tenant.company_name}. Las sesiones activas se cerrarán.`,confirmLabel:'Restablecer acceso',variant:'danger',onConfirm:()=>resetAdminAccess(tenant)})}><IconKey size={14} />{resetting === tenant.id ? 'Restableciendo…' : 'Restablecer acceso'}</ActionButton>}{tenant.status !== 'deleted' && <ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-danger nk-button-sm" disabled={deleting === tenant.id} onClick={() => confirmation.ask({title:'Eliminar cuenta de cliente',description:`Se eliminará la cuenta de ${tenant.company_name} y se bloquearán sus accesos.`,confirmLabel:'Eliminar cuenta',variant:'danger',onConfirm:()=>deleteTenant(tenant)})}>{deleting === tenant.id ? 'Eliminando…' : 'Eliminar'}</ActionButton>}</div></td></tr>) : <tr><td colSpan="5" className="nk-admin-clients-empty">No hay empresas usuarias registradas.</td></tr>}
    </tbody></table></div></section>
    <section className="nk-module-card nk-admin-clients-card nk-admin-cleanups" aria-labelledby="tenant-erasure-cleanups-title">
      <header className="nk-admin-clients-card-head"><div><h2 ref={cleanupHeadingRef} tabIndex={-1} id="tenant-erasure-cleanups-title">Limpiezas de archivos pendientes</h2><p>Las cuentas y sus datos ya fueron eliminados. Estas referencias permiten completar la eliminación de archivos, incluso después de volver a ingresar.</p></div></header>
      <div className="nk-admin-cleanups-body">
        {cleanupError && <p className="nk-field-error" role="alert">{cleanupError}</p>}
        {cleanupMessage && <p role="status">{cleanupMessage}</p>}
        {cleanupsLoading ? <p role="status">Cargando limpiezas pendientes…</p> : cleanups.length ? <ul className="nk-admin-cleanup-list">{cleanups.map(cleanup => <li key={cleanup.erasureId}>
          <div><strong>Referencia de eliminación</strong><code>{cleanup.erasureId}</code><p>{pendingDescription(cleanup.filesPending)}</p><small>{ERASURE_REASONS[cleanup.reasonCode] || 'Motivo registrado'} · {cleanup.deletedAt ? dateTime(cleanup.deletedAt) : 'Fecha por confirmar'}</small>{cleanup.lastError && <p>El último intento no pudo completar la limpieza de archivos.</p>}</div>
          <ActionButton className="nk-button nk-button-secondary" disabled={Boolean(retryingCleanup) || loading || Boolean(erasing)} disabledReason="Espera mientras se actualiza o reintenta la limpieza." onClick={() => retryCleanup(cleanup)}>{retryingCleanup === cleanup.erasureId ? 'Reintentando…' : 'Reintentar limpieza'}</ActionButton>
        </li>)}</ul> : !cleanupError && <p>No hay limpiezas de archivos pendientes.</p>}
      </div>
    </section>
    {tenantToErase && <div className="nk-dialog-backdrop" role="presentation"><section ref={erasureDialogRef} className="nk-dialog nk-admin-erasure-dialog" role="dialog" aria-modal="true" aria-labelledby="tenant-erasure-title" aria-busy={Boolean(erasing)}><form className="nk-admin-erasure-form" onSubmit={eraseTenant}>
      <header><h2 id="tenant-erasure-title">Eliminar cuenta y datos definitivamente</h2><p>Se eliminarán usuarios, registros, archivos, configuraciones e integraciones de {tenantToErase.company_name}. Esta acción no se puede deshacer. Si quedan archivos pendientes, podrás continuar su limpieza desde esta pantalla.</p></header>
      <label className="nk-field"><span className="nk-label">Motivo</span><select className="nk-select" value={erasureReason} onChange={event => setErasureReason(event.target.value)} disabled={Boolean(erasing)} required><option value="">Seleccionar motivo</option>{Object.entries(ERASURE_REASONS).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select></label>
      <label className="nk-field"><span className="nk-label">Escribe “ELIMINAR {tenantToErase.rut}” para confirmar</span><input ref={erasureConfirmationRef} className="nk-input" autoComplete="off" value={erasureConfirmation} onChange={event => { setErasureConfirmation(event.target.value); if (erasureFieldError) { setErasureFieldError(false); setErasureError('') } }} disabled={Boolean(erasing)} aria-invalid={erasureFieldError} aria-describedby={erasureFieldError ? 'tenant-erasure-error' : undefined} required /></label>
      {erasureError && <p id="tenant-erasure-error" className="nk-field-error" role="alert">{erasureError}</p>}
      {erasureUncertain && <button className="nk-button nk-button-secondary" type="button" disabled={Boolean(erasing)} onClick={checkErasure}>Comprobar estado de eliminación</button>}
      <footer className="nk-dialog-footer"><button className="nk-button nk-button-secondary" type="button" onClick={() => setTenantToErase(null)} disabled={Boolean(erasing)}>Cancelar</button><ActionButton className="nk-button nk-button-danger" type="submit" disabled={Boolean(erasing) || erasureUncertain} disabledReason={erasureUncertain ? 'Comprueba el estado antes de volver a enviar la eliminación.' : 'Espera mientras se elimina la cuenta.'}>{erasing ? 'Eliminando datos…' : 'Eliminar definitivamente'}</ActionButton></footer>
    </form></section></div>}
    {selected && <div className="nk-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}><section className="nk-dialog nk-admin-control-dialog" role="dialog" aria-modal="true" aria-labelledby="tenant-control-title"><header className="nk-dialog-header"><div><h2 id="tenant-control-title" className="nk-dialog-title">{selected.company_name}</h2><p>Administración Nexo Klar: continuidad, capacidad, soporte y respaldo.</p></div><button type="button" className="nk-button nk-button-secondary nk-button-sm" onClick={() => setSelected(null)} aria-label="Cerrar administración"><IconX size={16} />Cerrar</button></header>
      {loadingControl ? <p>Cargando administración de la empresa…</p> : control && form ? <div className="nk-dialog-body nk-admin-control-body"><section className="nk-admin-control-summary"><span className={`nk-admin-health ${control.health}`}>{HEALTH[control.health]}</span><div><strong>{control.usage.active_users} usuarios activos</strong><small>{control.usage.active_sessions} sesiones · último acceso {dateTime(control.usage.last_access_at)}</small></div><div><strong>{number(control.usage.files)} archivos</strong><small>{number(control.usage.bytes / 1024 / 1024)} MB almacenados</small></div><ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-secondary nk-button-sm" onClick={downloadBackup} disabled={exporting}><IconDownload size={14} />{exporting ? 'Generando…' : 'Descargar respaldo'}</ActionButton></section>{controlMessage && <p className="nk-form-message">{controlMessage}</p>}
        <form className="nk-admin-control-form" onSubmit={saveControl}><section><h3>Plan y capacidad</h3><div className="nk-form-grid"><label><span>Plan contratado</span><select className="nk-input" value={form.planCode} onChange={event => setValue('planCode', event.target.value)}>{Object.keys(control.planDefaults).map(plan => <option key={plan} value={plan}>{plan}</option>)}</select></label><label><span>Precio mensual (CLP)</span><input className="nk-input" type="number" min="0" value={form.monthlyPriceClp} onChange={event => setValue('monthlyPriceClp', event.target.value)} /></label><label><span>Usuarios incluidos</span><input className="nk-input" type="number" min="1" value={form.includedUsers} onChange={event => setValue('includedUsers', event.target.value)} /></label><label><span>Personas incluidas</span><input className="nk-input" type="number" min="0" value={form.includedWorkers} onChange={event => setValue('includedWorkers', event.target.value)} /></label><label><span>Almacenamiento (MB)</span><input className="nk-input" type="number" min="0" value={form.storageLimitMb} onChange={event => setValue('storageLimitMb', event.target.value)} /></label><label><span>Descuento (%)</span><input className="nk-input" type="number" min="0" max="100" value={form.discountPercent} onChange={event => setValue('discountPercent', event.target.value)} /></label></div></section><section><h3>Relación y continuidad</h3><div className="nk-form-grid"><label><span>Estado de pago</span><select className="nk-input" value={form.paymentStatus} onChange={event => setValue('paymentStatus', event.target.value)}><option value="al_dia">Al día</option><option value="por_vencer">Por vencer</option><option value="vencido">Vencido</option><option value="cortesia">Cortesía</option></select></label><label><span>Estado de la cuenta</span><select className="nk-input" value={form.lifecycleStatus} onChange={event => setValue('lifecycleStatus', event.target.value)}><option value="activo">Activa</option><option value="cortesia">Cortesía</option><option value="suspension_programada">Suspensión programada</option><option value="solo_lectura">Solo lectura</option><option value="baja_programada">Baja programada</option><option value="cerrado">Cerrada</option></select></label><label><span>Renovación</span><input className="nk-input" type="date" value={form.renewalDate} onChange={event => setValue('renewalDate', event.target.value)} /></label><label><span>Responsable Nexo Klar</span><input className="nk-input" value={form.accountOwner} onChange={event => setValue('accountOwner', event.target.value)} /></label><label><span>Contacto de facturación</span><input className="nk-input" value={form.billingContact} onChange={event => setValue('billingContact', event.target.value)} /></label><label><span>Onboarding</span><select className="nk-input" value={form.onboardingStep} onChange={event => setValue('onboardingStep', Number(event.target.value))}>{[1,2,3,4,5,6,7].map(step => <option key={step} value={step}>Paso {step} de 7</option>)}</select></label></div><label className="nk-admin-full-field"><span>Notas internas</span><textarea className="nk-input" rows="3" value={form.notes} onChange={event => setValue('notes', event.target.value)} /></label></section><footer className="nk-dialog-footer"><ActionButton disabledReason="Espera mientras se completa la operación en curso." className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar administración'}</ActionButton></footer></form>
        <section className="nk-admin-tickets"><header><div><h3>Soporte y seguimiento</h3><p>Registra y resuelve solicitudes sin salir de la empresa.</p></div></header><form className="nk-admin-ticket-form" onSubmit={createTicket}><input className="nk-input" placeholder="Asunto de la solicitud" value={ticket.subject} onChange={event => setTicket(current => ({ ...current, subject: event.target.value }))} /><select className="nk-input" value={ticket.severity} onChange={event => setTicket(current => ({ ...current, severity: event.target.value }))}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select><button className="nk-button nk-button-secondary">Registrar solicitud</button></form><div className="nk-admin-ticket-list">{control.tickets.length ? control.tickets.map(item => <article key={item.id}><div><strong>{item.subject}</strong><small>{item.severity} · {item.owner || 'Sin responsable'} · {dateTime(item.created_at)}</small></div><select className="nk-input" value={item.status} onChange={event => updateTicket(item.id, event.target.value)}>{Object.entries(TICKETS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></article>) : <p>No hay solicitudes de soporte registradas.</p>}</div></section>
      </div> : <p className="nk-form-message">{controlMessage || 'No fue posible cargar esta empresa.'}</p>}
    </section></div>}
    <ConfirmDialog {...confirmation.dialogProps} />
  </section>
}
