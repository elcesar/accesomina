import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { IconPlus, IconRefresh, IconSearch, IconUsers, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/control-workspaces.css'

const rows = value => Array.isArray(value) ? value : []

function daysUntil(value) {
  if (!value) return null
  const target = new Date(`${value}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

function habilitationFor(worker) {
  if (worker.disponibilidad === 'bloqueado') return { label: 'Restringido', cls: 'nk-badge-error', key: 'blocked' }
  const items = rows(worker.workerItems)
  const invalid = items.some(item => ['examen', 'curso', 'certificacion'].includes(item.type) && (item.estado === 'rechazado' || (daysUntil(item.vence) !== null && daysUntil(item.vence) < 0)))
  if (invalid) return { label: 'Requiere revisión', cls: 'nk-badge-warn', key: 'review' }
  return { label: 'Disponible', cls: 'nk-badge-ok', key: 'ok' }
}

function workerType(worker) {
  const raw = String(worker.tipoTrabajador || worker.tipoContrato || worker.modalidad || '').toLowerCase()
  if (raw.includes('proyecto') || raw.includes('plazo') || raw.includes('temporal')) return 'Por proyecto'
  return 'Fijo'
}

export default function GestionPersonalProyectoPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [savingId, setSavingId] = useState('')

  async function load() {
    setLoading(true); setError('')
    try { setResponse(await api.get('/state')) }
    catch (cause) { setError(cause.message || 'No fue posible cargar la gestión de personal.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const workers = rows(state.trabajadores)
  const projects = rows(state.mantenciones).filter(item => item.estado !== 'cerrada')
  const assignments = rows(state.asignaciones)
  const clients = rows(state.minas)
  const contracts = rows(state.contratos)
  const selectedId = searchParams.get('proyecto') || projects[0]?.id || ''
  const project = projects.find(item => item.id === selectedId)

  useEffect(() => {
    if (!searchParams.get('proyecto') && projects[0]?.id) setSearchParams({ proyecto: projects[0].id }, { replace: true })
  }, [projects, searchParams, setSearchParams])

  const assignedIds = useMemo(() => new Set(assignments.filter(item => item.mantId === selectedId).map(item => item.trabId)), [assignments, selectedId])
  const assigned = workers.filter(worker => assignedIds.has(worker.id))
  const roster = useMemo(() => {
    const term = query.trim().toLowerCase()
    return workers.map(worker => ({ worker, assigned: assignedIds.has(worker.id), habilitation: habilitationFor(worker) })).filter(item => {
      if (statusFilter === 'assigned' && !item.assigned) return false
      if (statusFilter === 'available' && item.assigned) return false
      if (statusFilter === 'review' && item.habilitation.key === 'ok') return false
      if (!term) return true
      return [item.worker.nombre, item.worker.rut, item.worker.cargo, item.worker.especialidad].some(value => String(value || '').toLowerCase().includes(term))
    })
  }, [workers, assignedIds, query, statusFilter])

  async function assign(worker) {
    if (!project || savingId) return
    setSavingId(worker.id); setError(''); setOk('')
    try {
      const currentResponse = await api.get('/state')
      const current = currentResponse?.state || currentResponse || {}
      const versionA = currentResponse?.moduleVersions?.asignaciones ?? 0
      const versionT = currentResponse?.moduleVersions?.trabajadores ?? 0
      const currentAssignments = rows(current.asignaciones)
      if (currentAssignments.some(item => item.mantId === project.id && item.trabId === worker.id)) throw new Error('La persona ya está asignada a este proyecto.')
      const nextAssignments = [...currentAssignments, { id: `asig_${Date.now()}`, mantId: project.id, trabId: worker.id, turno: 'día', estado: 'confirmado' }]
      const nextWorkers = rows(current.trabajadores).map(item => item.id === worker.id ? { ...item, disponibilidad: 'asignado' } : item)
      await api.put('/state/modules', { reason: `Asignación de ${worker.nombre} a ${project.nombre}`, changes: { asignaciones: { version: versionA, data: nextAssignments }, trabajadores: { version: versionT, data: nextWorkers } } })
      setOk(`${worker.nombre} quedó asignado a ${project.nombre}.`)
      await load()
    } catch (cause) { setError(cause.message || 'No fue posible asignar la persona.') }
    finally { setSavingId('') }
  }

  async function remove(worker) {
    if (!project || savingId) return
    setSavingId(worker.id); setError(''); setOk('')
    try {
      const currentResponse = await api.get('/state')
      const current = currentResponse?.state || currentResponse || {}
      const versionA = currentResponse?.moduleVersions?.asignaciones ?? 0
      const versionT = currentResponse?.moduleVersions?.trabajadores ?? 0
      const nextAssignments = rows(current.asignaciones).filter(item => !(item.mantId === project.id && item.trabId === worker.id))
      const stillAssigned = nextAssignments.some(item => item.trabId === worker.id)
      const nextWorkers = rows(current.trabajadores).map(item => item.id === worker.id ? { ...item, disponibilidad: stillAssigned ? 'asignado' : 'disponible' } : item)
      await api.put('/state/modules', { reason: `Retiro de ${worker.nombre} de ${project.nombre}`, changes: { asignaciones: { version: versionA, data: nextAssignments }, trabajadores: { version: versionT, data: nextWorkers } } })
      setOk(`${worker.nombre} fue retirado de ${project.nombre}.`)
      await load()
    } catch (cause) { setError(cause.message || 'No fue posible retirar la persona.') }
    finally { setSavingId('') }
  }

  const client = clients.find(item => item.id === project?.minaId)
  const contract = contracts.find(item => item.id === project?.contratoId)
  const required = Number(project?.personalReq || 0)
  const gap = Math.max(0, required - assigned.length)
  const enabledAssigned = assigned.filter(worker => habilitationFor(worker).key === 'ok').length

  return <div className="nk-control-workspace nk-staffing-workspace">
    <header className="nk-control-workspace-header"><div><h1>Gestión de trabajadores por proyecto</h1><p>Controla la dotación de cada servicio desde una sola vista: disponibilidad, asignación y condición de habilitación.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15}/>Actualizar</button></div></header>
    {(error || ok) && <div className={`nk-control-feedback ${error ? 'error' : 'ok'}`}><span>{error || ok}</span><button className="nk-icon-button" type="button" onClick={() => { setError(''); setOk('') }} aria-label="Cerrar"><IconX size={15}/></button></div>}

    <section className="nk-card nk-staffing-context">
      <div className="nk-control-toolbar"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, RUT, cargo o especialidad"/></label><div className="nk-field"><label className="nk-label">Proyecto / servicio</label><select className="nk-select" value={selectedId} onChange={event => setSearchParams({ proyecto: event.target.value })}><option value="">Seleccionar</option>{projects.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div></div>
      {project && <div className="nk-staffing-project-line"><span><strong>{client?.nombre || 'Sin cliente'}</strong> · {contract?.nombre || 'Sin contrato'}</span><span>{project.nombre}</span></div>}
    </section>

    {project ? <>
      <section className="nk-control-kpis nk-staffing-kpis"><div className="nk-control-kpi"><strong>{required || '—'}</strong><span>Dotación requerida</span></div><div className="nk-control-kpi"><strong>{assigned.length}</strong><span>Asignados</span></div><div className="nk-control-kpi"><strong>{enabledAssigned}</strong><span>Habilitados asignados</span></div><div className={`nk-control-kpi ${gap > 0 ? 'nk-staffing-kpi-alert' : ''}`}><strong>{required ? gap : '—'}</strong><span>Brecha de dotación</span></div></section>

      <section className="nk-card nk-staffing-roster-card">
        <header className="nk-control-list-head nk-staffing-roster-head"><div><h2>Dotación del proyecto</h2><p>{roster.length} persona{roster.length === 1 ? '' : 's'} visibles para gestión.</p></div><div className="nk-staffing-filters"><button type="button" className={`nk-button ${statusFilter === 'all' ? 'nk-button-primary' : 'nk-button-quiet'}`} onClick={() => setStatusFilter('all')}>Todas</button><button type="button" className={`nk-button ${statusFilter === 'assigned' ? 'nk-button-primary' : 'nk-button-quiet'}`} onClick={() => setStatusFilter('assigned')}>Asignadas</button><button type="button" className={`nk-button ${statusFilter === 'available' ? 'nk-button-primary' : 'nk-button-quiet'}`} onClick={() => setStatusFilter('available')}>Disponibles</button><button type="button" className={`nk-button ${statusFilter === 'review' ? 'nk-button-primary' : 'nk-button-quiet'}`} onClick={() => setStatusFilter('review')}>Con observación</button></div></header>
        {roster.length ? <div className="nk-table-wrapper"><table className="nk-table nk-staffing-table"><thead><tr><th>Persona</th><th>Tipo</th><th>Cargo / especialidad</th><th>Disponibilidad</th><th>Asignación</th><th>Habilitación</th><th>Acciones</th></tr></thead><tbody>{roster.map(({ worker, assigned: isAssigned, habilitation }) => <tr key={worker.id}><td><div className="nk-control-person"><strong>{worker.nombre}</strong><span>{worker.rut || 'Sin RUT'}</span></div></td><td>{workerType(worker)}</td><td><div className="nk-control-person"><strong>{worker.cargo || 'Sin cargo'}</strong><span>{worker.especialidad || 'Sin especialidad'}</span></div></td><td><span className={`nk-badge ${worker.disponibilidad === 'bloqueado' ? 'nk-badge-error' : isAssigned ? 'nk-badge-neutral' : 'nk-badge-ok'}`}>{worker.disponibilidad === 'bloqueado' ? 'Bloqueado' : isAssigned ? 'Asignado' : 'Disponible'}</span></td><td><span className={`nk-badge ${isAssigned ? 'nk-badge-ok' : 'nk-badge-neutral'}`}>{isAssigned ? 'Asignado a OS' : 'Sin asignar'}</span></td><td><span className={`nk-badge ${habilitation.cls}`}>{habilitation.label}</span></td><td><div className="nk-actions nk-staffing-actions"><button className="nk-button nk-button-quiet" type="button" onClick={() => navigate(`/app/trabajadores/${worker.id}`)}>Ver ficha</button>{isAssigned ? <button className="nk-button nk-button-secondary" type="button" disabled={savingId === worker.id} onClick={() => remove(worker)}>Retirar</button> : <button className="nk-button nk-button-primary" type="button" disabled={savingId === worker.id || habilitation.key === 'blocked'} onClick={() => assign(worker)}><IconPlus size={14}/>Asignar</button>}</div></td></tr>)}</tbody></table></div> : <div className="nk-empty"><IconUsers size={28}/><p className="nk-empty-title">Sin personas para mostrar</p><p>Ajusta la búsqueda o el filtro seleccionado.</p></div>}
      </section>
    </> : <div className="nk-empty"><IconUsers size={30}/><p className="nk-empty-title">No hay proyectos o servicios activos</p></div>}
  </div>
}
