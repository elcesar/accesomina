import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconAlertTriangle, IconBook2, IconCheck, IconChevronRight, IconClipboardCheck,
  IconHistory, IconRefresh, IconShieldCheck, IconUsers,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/control-center.css'

const rows = value => Array.isArray(value) ? value : []
const today = () => new Date().toISOString().slice(0, 10)
const text = value => String(value || '').trim()

function daysUntil(value) {
  if (!value) return null
  const target = new Date(`${value}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

function workerHasIssue(worker) {
  if (!worker) return false
  if (worker.bloqueado || worker.operationalStatus === 'bloqueado' || worker.disponibilidad === 'bloqueado') return true
  return rows(worker.workerItems).some(item => {
    if (!['examen', 'curso', 'certificacion'].includes(item.type)) return false
    const left = daysUntil(item.vence)
    return item.estado === 'rechazado' || (left !== null && left < 0)
  })
}

function urgencyFor(item) {
  const value = String(item.urgencia || item.estado || '').toLowerCase()
  if (value.includes('venc') || value.includes('crit') || value.includes('bloq')) return 'critical'
  if (value.includes('proxim') || value.includes('pend') || value.includes('alert')) return 'warning'
  return 'info'
}

export default function CentroOperativoPage() {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [tab, setTab] = useState('libro')
  const [saving, setSaving] = useState(false)
  const [logForm, setLogForm] = useState({ mantId: '', fecha: today(), hh: '', personas: '', avance: '', riesgos: '' })
  const [capaForm, setCapaForm] = useState({ source: '', title: '', owner: '', due: '', rootCause: '', action: '' })

  async function load() {
    setLoading(true); setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar el Centro Operativo.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const projects = rows(state.mantenciones).filter(item => !['cerrada', 'cancelada'].includes(String(item.estado || '').toLowerCase()))
  const workers = rows(state.trabajadores)
  const assignments = rows(state.asignaciones)
  const clients = rows(state.minas)
  const contracts = rows(state.contratos)
  const alerts = [...rows(state.alertas), ...rows(state.callouts)]
  const hotels = rows(state.hotelAsig)
  const vehicles = rows(state.vehiculos)
  const eppDeliveries = rows(state.eppDeliveries)
  const signatures = rows(state.firmas)
  const dailyLogs = rows(state.dailyLogs)
  const capaActions = rows(state.capaActions)

  useEffect(() => {
    if (!logForm.mantId && projects[0]?.id) setLogForm(current => ({ ...current, mantId: projects[0].id }))
  }, [projects, logForm.mantId])

  const serviceRows = useMemo(() => projects.map(project => {
    const relatedAssignments = assignments.filter(item => String(item.mantId) === String(project.id) && ['asignado', 'habilitado', 'confirmado'].includes(String(item.estado || '').toLowerCase()))
    const relatedWorkers = relatedAssignments.map(item => workers.find(worker => String(worker.id) === String(item.trabId))).filter(Boolean)
    const relatedAlerts = alerts.filter(alert => String(alert.mantId || '') === String(project.id) || relatedWorkers.some(worker => String(alert.trabId || alert.workerId || alert.trabajadorId || '') === String(worker.id)))
    const hasHotel = hotels.some(item => String(item.mantId) === String(project.id) && (!item.checkout || item.checkout >= today()))
    const hasVehicle = vehicles.some(vehicle => rows(vehicle.minaIds).map(String).includes(String(project.minaId)))
    const eppOk = !relatedWorkers.length || relatedWorkers.every(worker => eppDeliveries.some(item => String(item.trabId) === String(worker.id)))
    const pendingSignature = signatures.some(item => String(item.mantId) === String(project.id) && !['firmado', 'cerrado', 'cancelado'].includes(String(item.estado || '').toLowerCase()))
    const required = Number(project.personalReq || project.dotacion || 0)
    const gaps = []
    if (!relatedWorkers.length || (required > 0 && relatedWorkers.length < required)) gaps.push('Falta personal')
    if (relatedAlerts.length) gaps.push('Faltan documentos')
    if (!hasHotel) gaps.push('Falta alojamiento')
    if (!hasVehicle) gaps.push('Falta vehículo')
    if (!eppOk) gaps.push('Falta EPP')
    if (pendingSignature) gaps.push('Falta firma')
    const blocked = relatedWorkers.some(workerHasIssue) || ['cancelada', 'bloqueado', 'bloqueada'].includes(String(project.estado || '').toLowerCase())
    const status = blocked ? 'Restringida' : gaps.length ? 'Pendiente' : 'Lista para ejecutar'
    return { project, relatedWorkers, relatedAlerts, gaps, blocked, status, required }
  }), [projects, assignments, workers, alerts, hotels, vehicles, eppDeliveries, signatures])

  const readyCount = serviceRows.filter(item => item.status === 'Lista para ejecutar').length
  const pendingCount = serviceRows.filter(item => item.status === 'Pendiente').length
  const restrictedCount = serviceRows.filter(item => item.status === 'Restringida').length
  const openCapa = capaActions.filter(item => !['cerrada', 'cerrado', 'resuelta', 'resuelto'].includes(String(item.status || item.estado || '').toLowerCase())).length

  function gapRoute(item) {
    const gap = item.gaps[0]
    const routes = {
      'Falta personal': `/app/reclutamiento?proyecto=${item.project.id}`,
      'Faltan documentos': '/app/alertas',
      'Falta alojamiento': '/app/hoteleria',
      'Falta vehículo': '/app/vehiculos',
      'Falta EPP': '/app/epp',
      'Falta firma': `/app/contratos/${item.project.contratoId || ''}`,
    }
    navigate(routes[gap] || `/app/servicios/${item.project.id}`)
  }

  async function saveModule(name, nextData, reason) {
    const currentResponse = await api.get('/state')
    const version = currentResponse?.moduleVersions?.[name] ?? 0
    await api.put('/state/modules', { reason, changes: { [name]: { version, data: nextData } } })
  }

  async function saveDailyLog(event) {
    event.preventDefault()
    if (!logForm.mantId || !text(logForm.avance)) { setError('Selecciona una OS e ingresa el avance realizado.'); return }
    setSaving(true); setError(''); setOk('')
    try {
      const currentResponse = await api.get('/state')
      const current = currentResponse?.state || currentResponse || {}
      const project = rows(current.mantenciones).find(item => String(item.id) === String(logForm.mantId))
      const next = [{
        id: `log_${Date.now()}`,
        mantId: logForm.mantId,
        fecha: logForm.fecha || today(),
        title: project?.nombre || 'Registro diario',
        hh: Number(logForm.hh || 0),
        personas: Number(logForm.personas || 0),
        avance: text(logForm.avance),
        riesgos: text(logForm.riesgos),
        createdAt: new Date().toISOString(),
      }, ...rows(current.dailyLogs)]
      const version = currentResponse?.moduleVersions?.dailyLogs ?? 0
      await api.put('/state/modules', { reason: `Registro diario · ${project?.nombre || logForm.mantId}`, changes: { dailyLogs: { version, data: next } } })
      setLogForm(currentForm => ({ ...currentForm, hh: '', personas: '', avance: '', riesgos: '', fecha: today() }))
      setOk('Registro diario guardado.')
      await load()
    } catch (cause) { setError(cause.message || 'No fue posible guardar el registro diario.') }
    finally { setSaving(false) }
  }

  async function saveCapa(event) {
    event.preventDefault()
    if (!text(capaForm.title) || !text(capaForm.action)) { setError('Ingresa el título y la acción correctiva.'); return }
    setSaving(true); setError(''); setOk('')
    try {
      const currentResponse = await api.get('/state')
      const current = currentResponse?.state || currentResponse || {}
      const next = [{
        id: `capa_${Date.now()}`,
        source: text(capaForm.source),
        title: text(capaForm.title),
        owner: text(capaForm.owner),
        due: capaForm.due,
        rootCause: text(capaForm.rootCause),
        action: text(capaForm.action),
        status: 'abierta',
        createdAt: new Date().toISOString(),
      }, ...rows(current.capaActions)]
      const version = currentResponse?.moduleVersions?.capaActions ?? 0
      await api.put('/state/modules', { reason: `Nueva acción CAPA · ${text(capaForm.title)}`, changes: { capaActions: { version, data: next } } })
      setCapaForm({ source: '', title: '', owner: '', due: '', rootCause: '', action: '' })
      setOk('Acción CAPA creada.')
      await load()
    } catch (cause) { setError(cause.message || 'No fue posible crear la acción CAPA.') }
    finally { setSaving(false) }
  }

  async function updateCapaStatus(item, status) {
    setSaving(true); setError(''); setOk('')
    try {
      const currentResponse = await api.get('/state')
      const current = currentResponse?.state || currentResponse || {}
      const next = rows(current.capaActions).map(row => String(row.id) === String(item.id) ? { ...row, status, updatedAt: new Date().toISOString() } : row)
      const version = currentResponse?.moduleVersions?.capaActions ?? 0
      await api.put('/state/modules', { reason: `CAPA ${item.title || item.id} → ${status}`, changes: { capaActions: { version, data: next } } })
      setOk(`CAPA actualizada a ${status}.`)
      await load()
    } catch (cause) { setError(cause.message || 'No fue posible actualizar la acción CAPA.') }
    finally { setSaving(false) }
  }

  const traceRows = useMemo(() => {
    const logs = dailyLogs.map(item => ({ date: item.createdAt || item.fecha, type: 'Libro diario', title: item.title || projects.find(p => String(p.id) === String(item.mantId))?.nombre || 'Registro', detail: item.avance || item.riesgos || '' }))
    const capa = capaActions.map(item => ({ date: item.updatedAt || item.createdAt, type: 'CAPA', title: item.title || 'Acción correctiva', detail: item.status || item.estado || '' }))
    const subs = rows(state.subcontratos).flatMap(item => rows(item.followUps).map(follow => ({ date: follow.at || follow.date, type: 'Subcontrato', title: item.razon || item.nombre || 'Subcontrato', detail: follow.detail || follow.descripcion || '' })))
    return [...logs, ...capa, ...subs].sort((a, b) => String(b.date || '').localeCompare(String(a.date || ''))).slice(0, 18)
  }, [dailyLogs, capaActions, state.subcontratos, projects])

  const visibleAlerts = alerts.slice(0, 16)

  return <section className="nk-operations-page">
    <header className="nk-module-header"><div><h1>Centro Operativo</h1><p>Gestiona la ejecución diaria de las órdenes de servicio, sus brechas operacionales, registros, alertas y acciones correctivas desde una vista consolidada.</p></div><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={16}/>Actualizar</button></header>

    {(error || ok) && <div className={`nk-control-feedback ${error ? 'error' : 'ok'}`}><span>{error || ok}</span><button className="nk-button nk-button-quiet" type="button" onClick={() => { setError(''); setOk('') }}>Cerrar</button></div>}

    <div className="nk-dashboard-grid nk-ops-kpis">
      <article className="nk-dashboard-metric"><IconShieldCheck size={22}/><div><b>{loading ? '…' : readyCount}</b><span>OS listas para ejecutar</span></div></article>
      <article className="nk-dashboard-metric amber"><IconAlertTriangle size={22}/><div><b>{loading ? '…' : pendingCount}</b><span>OS con brechas</span></div></article>
      <article className="nk-dashboard-metric error"><IconClipboardCheck size={22}/><div><b>{loading ? '…' : restrictedCount}</b><span>OS restringidas</span></div></article>
      <article className="nk-dashboard-metric teal"><IconHistory size={22}/><div><b>{loading ? '…' : openCapa}</b><span>CAPA abiertas</span></div></article>
    </div>

    <section className="nk-module-card nk-ops-service-card">
      <div className="nk-ops-card-head"><div><h2>Estado operativo por orden de servicio</h2><p>Revisa si cada OS está preparada para comenzar y entra directamente al módulo que resuelve su primera brecha.</p></div></div>
      {loading ? <div className="nk-module-empty">Cargando órdenes de servicio…</div> : serviceRows.length ? <div className="nk-table-wrapper"><table className="nk-table nk-ops-service-table"><thead><tr><th>Orden de servicio</th><th>Estado único</th><th>Personas</th><th>Brechas</th><th>Acción</th></tr></thead><tbody>{serviceRows.map(item => {
        const client = clients.find(row => String(row.id) === String(item.project.minaId))
        const contract = contracts.find(row => String(row.id) === String(item.project.contratoId))
        return <tr key={item.project.id}><td><strong>{item.project.nombre || 'Servicio'}</strong><small>{client?.nombre || 'Sin cliente'} · {contract?.nombre || 'Sin contrato'}</small></td><td><span className={`nk-badge ${item.blocked ? 'nk-badge-error' : item.gaps.length ? 'nk-badge-warn' : 'nk-badge-ok'}`}>{item.status}</span></td><td>{item.required ? `${item.relatedWorkers.length}/${item.required}` : item.relatedWorkers.length}</td><td><div className="nk-ops-gap-list">{item.gaps.length ? item.gaps.map(gap => <span key={gap} className="nk-badge nk-badge-error">{gap}</span>) : <span className="nk-badge nk-badge-ok">Sin brechas críticas</span>}</div></td><td><div className="nk-actions"><button className="nk-button nk-button-quiet" type="button" onClick={() => navigate(`/app/servicios/${item.project.id}`)}>Abrir</button>{item.gaps.length > 0 && <button className="nk-button nk-button-primary" type="button" onClick={() => gapRoute(item)}>Resolver<IconChevronRight size={14}/></button>}</div></td></tr>
      })}</tbody></table></div> : <div className="nk-module-empty"><IconBook2 size={28}/><b>Sin órdenes activas</b><span>Las órdenes de servicio activas aparecerán aquí para control operacional.</span></div>}
    </section>

    <section className="nk-module-card nk-ops-guide"><div><h2>Centro Operativo guiado</h2><p>El inventario, las bodegas y el EPP se administran desde Activos, Equipos e Inventario. Aquí se concentra la ejecución de las OS.</p></div><div className="nk-ops-tabs" role="tablist">{[
      ['libro', 'Libro diario', IconBook2], ['capa', 'CAPA', IconClipboardCheck], ['alertas', 'Alertas', IconAlertTriangle], ['bitacora', 'Bitácora', IconHistory],
    ].map(([key, label, Icon]) => <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}><Icon size={15}/>{label}</button>)}</div></section>

    {tab === 'libro' && <section className="nk-ops-tab-grid">
      <article className="nk-module-card"><h2>Libro diario por servicio</h2><p>Registra avances diarios, HH, dotación, riesgos y requerimientos del servicio.</p><form className="nk-ops-form" onSubmit={saveDailyLog}><div className="nk-field"><label className="nk-label">Orden de servicio</label><select className="nk-select" value={logForm.mantId} onChange={event => setLogForm({ ...logForm, mantId: event.target.value })}><option value="">Seleccionar</option>{projects.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div><div className="nk-field"><label className="nk-label">Fecha</label><input className="nk-input" type="date" value={logForm.fecha} onChange={event => setLogForm({ ...logForm, fecha: event.target.value })}/></div><div className="nk-field"><label className="nk-label">Horas hombre</label><input className="nk-input" type="number" min="0" value={logForm.hh} onChange={event => setLogForm({ ...logForm, hh: event.target.value })}/></div><div className="nk-field"><label className="nk-label">Personas en terreno</label><input className="nk-input" type="number" min="0" value={logForm.personas} onChange={event => setLogForm({ ...logForm, personas: event.target.value })}/></div><div className="nk-field nk-ops-full"><label className="nk-label">Avance / trabajo ejecutado</label><textarea className="nk-textarea" value={logForm.avance} onChange={event => setLogForm({ ...logForm, avance: event.target.value })}/></div><div className="nk-field nk-ops-full"><label className="nk-label">Riesgos, restricciones o requerimientos</label><textarea className="nk-textarea" value={logForm.riesgos} onChange={event => setLogForm({ ...logForm, riesgos: event.target.value })}/></div><div className="nk-ops-full nk-ops-form-actions"><button className="nk-button nk-button-primary" disabled={saving}>Guardar avance</button></div></form></article>
      <article className="nk-module-card"><h2>Últimos registros de ejecución</h2><p>Trazabilidad reciente del libro diario.</p><div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Fecha / OS</th><th>HH / personas</th><th>Avance</th><th>Riesgos</th></tr></thead><tbody>{dailyLogs.slice(0, 12).map(item => <tr key={item.id}><td><strong>{item.fecha || '—'}</strong><small>{item.title || projects.find(p => String(p.id) === String(item.mantId))?.nombre || 'Servicio'}</small></td><td>{Number(item.hh || 0)} HH · {Number(item.personas || 0)} pers.</td><td>{item.avance || '—'}</td><td>{item.riesgos || '—'}</td></tr>)}</tbody></table></div></article>
    </section>}

    {tab === 'capa' && <section className="nk-ops-tab-grid">
      <article className="nk-module-card"><h2>Acciones correctivas CAPA</h2><p>Crea acciones correctivas, asigna responsable, controla plazo y registra causa raíz.</p><form className="nk-ops-form" onSubmit={saveCapa}><div className="nk-field"><label className="nk-label">Origen</label><input className="nk-input" value={capaForm.source} onChange={event => setCapaForm({ ...capaForm, source: event.target.value })}/></div><div className="nk-field"><label className="nk-label">Título</label><input className="nk-input" value={capaForm.title} onChange={event => setCapaForm({ ...capaForm, title: event.target.value })}/></div><div className="nk-field"><label className="nk-label">Responsable</label><input className="nk-input" value={capaForm.owner} onChange={event => setCapaForm({ ...capaForm, owner: event.target.value })}/></div><div className="nk-field"><label className="nk-label">Vencimiento</label><input className="nk-input" type="date" value={capaForm.due} onChange={event => setCapaForm({ ...capaForm, due: event.target.value })}/></div><div className="nk-field nk-ops-full"><label className="nk-label">Causa raíz</label><textarea className="nk-textarea" value={capaForm.rootCause} onChange={event => setCapaForm({ ...capaForm, rootCause: event.target.value })}/></div><div className="nk-field nk-ops-full"><label className="nk-label">Acción correctiva</label><textarea className="nk-textarea" value={capaForm.action} onChange={event => setCapaForm({ ...capaForm, action: event.target.value })}/></div><div className="nk-ops-full nk-ops-form-actions"><button className="nk-button nk-button-primary" disabled={saving}>Crear CAPA</button></div></form></article>
      <article className="nk-module-card"><h2>Seguimiento CAPA</h2><p>{capaActions.length} acciones registradas.</p><div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Acción</th><th>Responsable / plazo</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{capaActions.slice(0, 16).map(item => <tr key={item.id}><td><strong>{item.title || 'Acción correctiva'}</strong><small>{item.source || item.rootCause || 'Sin origen informado'}</small></td><td>{item.owner || 'Sin responsable'}<small>{item.due || 'Sin plazo'}</small></td><td><span className={`nk-badge ${['cerrada','resuelta'].includes(String(item.status || '').toLowerCase()) ? 'nk-badge-ok' : 'nk-badge-warn'}`}>{item.status || 'abierta'}</span></td><td>{!['cerrada','resuelta'].includes(String(item.status || '').toLowerCase()) && <button className="nk-button nk-button-secondary" type="button" disabled={saving} onClick={() => updateCapaStatus(item, 'cerrada')}><IconCheck size={14}/>Cerrar</button>}</td></tr>)}</tbody></table></div></article>
    </section>}

    {tab === 'alertas' && <section className="nk-module-card"><div className="nk-ops-card-head"><div><h2>Alertas operativas</h2><p>Vencimientos, restricciones y pendientes que pueden afectar la ejecución.</p></div><button className="nk-button nk-button-secondary" type="button" onClick={() => navigate('/app/alertas')}>Ver alertas completas</button></div>{visibleAlerts.length ? <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Urgencia</th><th>Tipo</th><th>Detalle</th></tr></thead><tbody>{visibleAlerts.map((item, index) => <tr key={item.id || index}><td><span className={`nk-badge ${urgencyFor(item) === 'critical' ? 'nk-badge-error' : urgencyFor(item) === 'warning' ? 'nk-badge-warn' : 'nk-badge-neutral'}`}>{item.urgencia || item.estado || 'alerta'}</span></td><td>{item.tipo || 'Operación'}</td><td>{item.msg || item.mensaje || item.descripcion || item.nombre || 'Pendiente operativo'}</td></tr>)}</tbody></table></div> : <div className="nk-module-empty"><IconAlertTriangle size={28}/><b>Sin alertas operativas</b></div>}</section>}

    {tab === 'bitacora' && <section className="nk-module-card"><h2>Bitácora operativa</h2><p>Consolida registros del libro diario, cambios CAPA y seguimientos de subcontratos.</p>{traceRows.length ? <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Fecha</th><th>Origen</th><th>Registro</th><th>Detalle</th></tr></thead><tbody>{traceRows.map((item, index) => <tr key={`${item.type}-${item.date}-${index}`}><td>{String(item.date || '').slice(0, 10) || '—'}</td><td><span className="nk-badge nk-badge-neutral">{item.type}</span></td><td><strong>{item.title}</strong></td><td>{item.detail || '—'}</td></tr>)}</tbody></table></div> : <div className="nk-module-empty"><IconHistory size={28}/><b>Sin trazabilidad registrada</b></div>}</section>}
  </section>
}
