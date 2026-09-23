import { useEffect, useState } from 'react'
import { IconDownload, IconKey, IconRefresh, IconSettings, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useAuth } from '../services/auth.jsx'
import '../styles/admin-clients.css'

const STATUS = { pending: 'Pendiente de aprobación', active: 'Activa', suspended: 'Suspendida', deleted: 'Eliminada' }
const HEALTH = { verde: 'Operación estable', amarillo: 'Requiere revisión', rojo: 'Acceso restringido' }
const TICKETS = { abierto: 'Abierto', en_progreso: 'En progreso', esperando_cliente: 'Esperando cliente', resuelto: 'Resuelto', cerrado: 'Cerrado' }
const date = value => value ? String(value).slice(0, 10) : ''
const number = value => new Intl.NumberFormat('es-CL').format(Number(value || 0))
const dateTime = value => value ? new Intl.DateTimeFormat('es-CL', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin registros'

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
  const [tenants, setTenants] = useState([]); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(true)
  const [changing, setChanging] = useState(''); const [deleting, setDeleting] = useState(''); const [resetting, setResetting] = useState('')
  const [selected, setSelected] = useState(null); const [control, setControl] = useState(null); const [form, setForm] = useState(null)
  const [loadingControl, setLoadingControl] = useState(false); const [saving, setSaving] = useState(false); const [exporting, setExporting] = useState(false); const [controlMessage, setControlMessage] = useState('')
  const [ticket, setTicket] = useState({ subject: '', description: '', severity: 'media', owner: '', dueAt: '' })
  const isNexoAdmin = session?.user?.role === 'domian_admin'

  const load = async () => { setLoading(true); setMessage(''); try { setTenants(await api.get('/tenants')) } catch (error) { setMessage(error.message || 'No fue posible cargar las empresas.') } finally { setLoading(false) } }
  useEffect(() => { if (isNexoAdmin) load(); else setLoading(false) }, [isNexoAdmin])
  const setValue = (key, value) => setForm(current => ({ ...current, [key]: value }))

  const changeStatus = async (tenant, status) => {
    const action = status === 'active' ? 'activar' : 'suspender'
    if (!window.confirm(`¿Deseas ${action} la cuenta de ${tenant.company_name}?`)) return
    setChanging(tenant.id); setMessage('')
    try { const updated = await api.patch(`/tenants/${tenant.id}`, { status }); setTenants(current => current.map(item => item.id === tenant.id ? { ...item, ...updated } : item)); const emailMessage = status === 'active' && updated.approvalEmail ? (updated.approvalEmail.delivered ? ' Se notificó al administrador por correo.' : ' La cuenta fue activada, pero el correo no se pudo enviar. Revisa la configuración SMTP.') : ''; setMessage(`La cuenta de ${tenant.company_name} fue actualizada.${emailMessage}`) }
    catch (error) { setMessage(error.message || `No fue posible ${action} la empresa.`) } finally { setChanging('') }
  }
  const resetAdminAccess = async tenant => {
    if (!window.confirm(`Se restablecerá el acceso del administrador de ${tenant.company_name}. Las sesiones activas se cerrarán. ¿Continuar?`)) return
    setResetting(tenant.id); setMessage('')
    try { const result = await api.post(`/tenants/${tenant.id}/reset-admin-password`, {}); setMessage(result?.temporaryPassword ? `Acceso restablecido. Contraseña temporal: ${result.temporaryPassword}` : 'Acceso restablecido.') }
    catch (error) { setMessage(error.message || 'No fue posible restablecer el acceso.') } finally { setResetting('') }
  }
  const deleteTenant = async tenant => {
    if (!window.confirm(`¿Deseas eliminar el cliente ${tenant.company_name}? Esta acción bloqueará sus accesos.`)) return
    setDeleting(tenant.id); setMessage('')
    try { const updated = await api.delete(`/tenants/${tenant.id}`); setTenants(current => current.map(item => item.id === tenant.id ? { ...item, ...updated } : item)); setMessage(`El cliente ${tenant.company_name} fue eliminado.`) }
    catch (error) { setMessage(error.message || 'No fue posible eliminar el cliente.') } finally { setDeleting('') }
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
    <header className="nk-module-header"><div><h1>Administración de clientes</h1><p>Gestiona cuentas, planes, adopción, soporte y continuidad de cada empresa.</p></div><button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={16} />{loading ? 'Actualizando…' : 'Actualizar'}</button></header>
    {message && <p className="nk-form-message">{message}</p>}
    <section className="nk-module-card nk-admin-clients-card"><header className="nk-admin-clients-card-head"><div><h2>Empresas usuarias</h2><p>El detalle de cada cuenta mantiene separado su control comercial, acceso y soporte.</p></div></header><div className="nk-table-wrapper nk-admin-clients-table-wrap"><table className="nk-table nk-admin-clients-table"><thead><tr><th>Empresa</th><th>Plan y adopción</th><th>Administrador</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>
      {loading ? <tr><td colSpan="5">Cargando empresas…</td></tr> : visible.length ? visible.map(tenant => <tr key={tenant.id}><td><strong>{tenant.company_name}</strong><small>{tenant.rut || 'Sin RUT registrado'}</small></td><td><strong>{tenant.plan_code || 'Plan esencial'}</strong><small>Paso {tenant.onboarding_step || 1}/7 · {tenant.active_users || 0} usuarios activos</small></td><td>{tenant.admin_email || '—'}<small>{tenant.active_sessions || 0} sesiones activas</small></td><td><span className={`nk-admin-clients-status ${tenant.status || ''}`}>{STATUS[tenant.status] || tenant.status || 'Sin estado'}</span></td><td><div className="nk-admin-clients-actions"><button className="nk-button nk-button-secondary nk-button-sm" onClick={() => openControl(tenant)}><IconSettings size={14} />Gestionar</button>{['pending', 'suspended'].includes(tenant.status) && <button className="nk-button nk-button-primary nk-button-sm" disabled={changing === tenant.id} onClick={() => changeStatus(tenant, 'active')}>{changing === tenant.id ? 'Activando…' : 'Activar'}</button>}{tenant.status === 'active' && <button className="nk-button nk-button-secondary nk-button-sm" disabled={changing === tenant.id} onClick={() => changeStatus(tenant, 'suspended')}>{changing === tenant.id ? 'Suspendiendo…' : 'Suspender'}</button>}{tenant.status !== 'deleted' && <button className="nk-button nk-button-secondary nk-button-sm" disabled={resetting === tenant.id} onClick={() => resetAdminAccess(tenant)}><IconKey size={14} />{resetting === tenant.id ? 'Restableciendo…' : 'Restablecer acceso'}</button>}{tenant.status !== 'deleted' && <button className="nk-button nk-button-danger nk-button-sm" disabled={deleting === tenant.id} onClick={() => deleteTenant(tenant)}>{deleting === tenant.id ? 'Eliminando…' : 'Eliminar'}</button>}</div></td></tr>) : <tr><td colSpan="5" className="nk-admin-clients-empty">No hay empresas usuarias registradas.</td></tr>}
    </tbody></table></div></section>
    {selected && <div className="nk-dialog-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setSelected(null) }}><section className="nk-dialog nk-admin-control-dialog" role="dialog" aria-modal="true" aria-labelledby="tenant-control-title"><header className="nk-dialog-header"><div><h2 id="tenant-control-title" className="nk-dialog-title">{selected.company_name}</h2><p>Administración Nexo Klar: continuidad, capacidad, soporte y respaldo.</p></div><button type="button" className="nk-button nk-button-secondary nk-button-sm" onClick={() => setSelected(null)} aria-label="Cerrar administración"><IconX size={16} />Cerrar</button></header>
      {loadingControl ? <p>Cargando administración de la empresa…</p> : control && form ? <div className="nk-dialog-body nk-admin-control-body"><section className="nk-admin-control-summary"><span className={`nk-admin-health ${control.health}`}>{HEALTH[control.health]}</span><div><strong>{control.usage.active_users} usuarios activos</strong><small>{control.usage.active_sessions} sesiones · último acceso {dateTime(control.usage.last_access_at)}</small></div><div><strong>{number(control.usage.files)} archivos</strong><small>{number(control.usage.bytes / 1024 / 1024)} MB almacenados</small></div><button className="nk-button nk-button-secondary nk-button-sm" onClick={downloadBackup} disabled={exporting}><IconDownload size={14} />{exporting ? 'Generando…' : 'Descargar respaldo'}</button></section>{controlMessage && <p className="nk-form-message">{controlMessage}</p>}
        <form className="nk-admin-control-form" onSubmit={saveControl}><section><h3>Plan y capacidad</h3><div className="nk-form-grid"><label><span>Plan contratado</span><select className="nk-input" value={form.planCode} onChange={event => setValue('planCode', event.target.value)}>{Object.keys(control.planDefaults).map(plan => <option key={plan} value={plan}>{plan}</option>)}</select></label><label><span>Precio mensual (CLP)</span><input className="nk-input" type="number" min="0" value={form.monthlyPriceClp} onChange={event => setValue('monthlyPriceClp', event.target.value)} /></label><label><span>Usuarios incluidos</span><input className="nk-input" type="number" min="1" value={form.includedUsers} onChange={event => setValue('includedUsers', event.target.value)} /></label><label><span>Personas incluidas</span><input className="nk-input" type="number" min="0" value={form.includedWorkers} onChange={event => setValue('includedWorkers', event.target.value)} /></label><label><span>Almacenamiento (MB)</span><input className="nk-input" type="number" min="0" value={form.storageLimitMb} onChange={event => setValue('storageLimitMb', event.target.value)} /></label><label><span>Descuento (%)</span><input className="nk-input" type="number" min="0" max="100" value={form.discountPercent} onChange={event => setValue('discountPercent', event.target.value)} /></label></div></section><section><h3>Relación y continuidad</h3><div className="nk-form-grid"><label><span>Estado de pago</span><select className="nk-input" value={form.paymentStatus} onChange={event => setValue('paymentStatus', event.target.value)}><option value="al_dia">Al día</option><option value="por_vencer">Por vencer</option><option value="vencido">Vencido</option><option value="cortesia">Cortesía</option></select></label><label><span>Estado de la cuenta</span><select className="nk-input" value={form.lifecycleStatus} onChange={event => setValue('lifecycleStatus', event.target.value)}><option value="activo">Activa</option><option value="cortesia">Cortesía</option><option value="suspension_programada">Suspensión programada</option><option value="solo_lectura">Solo lectura</option><option value="baja_programada">Baja programada</option><option value="cerrado">Cerrada</option></select></label><label><span>Renovación</span><input className="nk-input" type="date" value={form.renewalDate} onChange={event => setValue('renewalDate', event.target.value)} /></label><label><span>Responsable Nexo Klar</span><input className="nk-input" value={form.accountOwner} onChange={event => setValue('accountOwner', event.target.value)} /></label><label><span>Contacto de facturación</span><input className="nk-input" value={form.billingContact} onChange={event => setValue('billingContact', event.target.value)} /></label><label><span>Onboarding</span><select className="nk-input" value={form.onboardingStep} onChange={event => setValue('onboardingStep', Number(event.target.value))}>{[1,2,3,4,5,6,7].map(step => <option key={step} value={step}>Paso {step} de 7</option>)}</select></label></div><label className="nk-admin-full-field"><span>Notas internas</span><textarea className="nk-input" rows="3" value={form.notes} onChange={event => setValue('notes', event.target.value)} /></label></section><footer className="nk-dialog-footer"><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar administración'}</button></footer></form>
        <section className="nk-admin-tickets"><header><div><h3>Soporte y seguimiento</h3><p>Registra y resuelve solicitudes sin salir de la empresa.</p></div></header><form className="nk-admin-ticket-form" onSubmit={createTicket}><input className="nk-input" placeholder="Asunto de la solicitud" value={ticket.subject} onChange={event => setTicket(current => ({ ...current, subject: event.target.value }))} /><select className="nk-input" value={ticket.severity} onChange={event => setTicket(current => ({ ...current, severity: event.target.value }))}><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option><option value="critica">Crítica</option></select><button className="nk-button nk-button-secondary">Registrar solicitud</button></form><div className="nk-admin-ticket-list">{control.tickets.length ? control.tickets.map(item => <article key={item.id}><div><strong>{item.subject}</strong><small>{item.severity} · {item.owner || 'Sin responsable'} · {dateTime(item.created_at)}</small></div><select className="nk-input" value={item.status} onChange={event => updateTicket(item.id, event.target.value)}>{Object.entries(TICKETS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></article>) : <p>No hay solicitudes de soporte registradas.</p>}</div></section>
      </div> : <p className="nk-form-message">{controlMessage || 'No fue posible cargar esta empresa.'}</p>}
    </section></div>}
  </section>
}
