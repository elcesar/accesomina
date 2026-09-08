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

export default function GestionPersonalProyectoPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [query, setQuery] = useState('')
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
  const candidates = useMemo(() => {
    const term = query.trim().toLowerCase()
    return workers.filter(worker => !assignedIds.has(worker.id)).filter(worker => {
      if (!term) return true
      return [worker.nombre, worker.rut, worker.cargo, worker.especialidad].some(value => String(value || '').toLowerCase().includes(term))
    })
  }, [workers, assignedIds, query])

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
      await api.put('/state/modules', {
        reason: `Asignación de ${worker.nombre} a ${project.nombre}`,
        changes: {
          asignaciones: { version: versionA, data: nextAssignments },
          trabajadores: { version: versionT, data: nextWorkers },
        },
      })
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
      await api.put('/state/modules', {
        reason: `Retiro de ${worker.nombre} de ${project.nombre}`,
        changes: {
          asignaciones: { version: versionA, data: nextAssignments },
          trabajadores: { version: versionT, data: nextWorkers },
        },
      })
      setOk(`${worker.nombre} fue retirado de ${project.nombre}.`)
      await load()
    } catch (cause) { setError(cause.message || 'No fue posible retirar la persona.') }
    finally { setSavingId('') }
  }

  const client = clients.find(item => item.id === project?.minaId)
  const contract = contracts.find(item => item.id === project?.contratoId)
  const required = Number(project?.personalReq || 0)
  const gap = Math.max(0, required - assigned.length)

  return <div className="nk-control-workspace">
    <header className="nk-control-workspace-header"><div><h1>Gestión de trabajadores por proyecto</h1><p>Selecciona un proyecto o servicio, revisa su dotación y asigna personas disponibles con su condición de habilitación visible.</p></div><div className="nk-actions"><button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15}/>Actualizar</button></div></header>
    {(error || ok) && <div className={`nk-control-feedback ${error ? 'error' : 'ok'}`}><span>{error || ok}</span><button className="nk-icon-button" type="button" onClick={() => { setError(''); setOk('') }} aria-label="Cerrar"><IconX size={15}/></button></div>}
    <section className="nk-card"><div className="nk-control-toolbar"><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, RUT o especialidad"/></label><div className="nk-field"><label className="nk-label">Proyecto / servicio</label><select className="nk-select" value={selectedId} onChange={event => setSearchParams({ proyecto: event.target.value })}><option value="">Seleccionar</option>{projects.map(item => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></div></div></section>
    {project ? <>
      <section className="nk-control-project-summary"><div><span>Cliente</span><strong>{client?.nombre || 'Sin información'}</strong></div><div><span>Contrato</span><strong>{contract?.nombre || 'Sin información'}</strong></div><div><span>Dotación asignada</span><strong>{assigned.length}{required ? ` / ${required}` : ''}</strong></div><div><span>Brecha</span><strong>{required ? gap : 'Sin objetivo definido'}</strong></div></section>
      <section className="nk-control-columns">
        <article className="nk-card nk-control-list-card"><header className="nk-control-list-head"><div><h2>Personas asignadas</h2><p>{assigned.length} persona{assigned.length === 1 ? '' : 's'} en este servicio.</p></div></header>{assigned.length ? <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Persona</th><th>Estado</th><th /></tr></thead><tbody>{assigned.map(worker => { const st = habilitationFor(worker); return <tr key={worker.id}><td><div className="nk-control-person"><strong>{worker.nombre}</strong><span>{worker.rut || 'Sin RUT'} · {worker.cargo || worker.especialidad || 'Sin cargo'}</span></div></td><td><span className={`nk-badge ${st.cls}`}>{st.label}</span></td><td><div className="nk-actions"><button className="nk-button nk-button-quiet" type="button" onClick={() => navigate(`/app/trabajadores/${worker.id}`)}>Ver ficha</button><button className="nk-button nk-button-secondary" type="button" disabled={savingId === worker.id} onClick={() => remove(worker)}>Retirar</button></div></td></tr>})}</tbody></table></div> : <div className="nk-empty"><IconUsers size={28}/><p className="nk-empty-title">Sin personas asignadas</p></div>}</article>
        <article className="nk-card nk-control-list-card"><header className="nk-control-list-head"><div><h2>Personas disponibles</h2><p>La habilitación se muestra antes de asignar.</p></div></header>{candidates.length ? <div className="nk-table-wrapper"><table className="nk-table"><thead><tr><th>Persona</th><th>Condición</th><th /></tr></thead><tbody>{candidates.map(worker => { const st = habilitationFor(worker); return <tr key={worker.id}><td><div className="nk-control-person"><strong>{worker.nombre}</strong><span>{worker.rut || 'Sin RUT'} · {worker.especialidad || worker.cargo || 'Sin especialidad'}</span></div></td><td><span className={`nk-badge ${st.cls}`}>{st.label}</span></td><td><button className="nk-button nk-button-primary" type="button" disabled={savingId === worker.id || st.key === 'blocked'} onClick={() => assign(worker)}><IconPlus size={14}/>Asignar</button></td></tr>})}</tbody></table></div> : <div className="nk-empty"><IconUsers size={28}/><p className="nk-empty-title">Sin candidatos para mostrar</p></div>}</article>
      </section>
    </> : <div className="nk-empty"><IconUsers size={30}/><p className="nk-empty-title">No hay proyectos o servicios activos</p></div>}
  </div>
}
