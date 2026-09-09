import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconChevronDown,
  IconChevronUp,
  IconDownload,
  IconFilter,
  IconSearch,
  IconUserCheck,
  IconUserOff,
  IconUsers,
  IconX,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/trabajadores.css'

function diasHasta(fecha) {
  if (!fecha) return null
  return Math.floor((new Date(fecha) - new Date()) / 86400000)
}

const REQUIRED_ITEMS = [
  { type: 'documento', name: 'Cédula de identidad' },
  { type: 'contrato', name: 'Contrato de trabajo' },
  { type: 'documento', name: 'Certificado AFP' },
  { type: 'documento', name: 'Certificado Fonasa/Isapre' },
  { type: 'examen', name: 'Examen preocupacional' },
  { type: 'curso', name: 'ODI / Derecho a Saber' },
  { type: 'curso', name: 'Reglamento Interno' },
]

function acreditacionPct(persona) {
  const items = persona.workerItems || []
  if (!items.length) return 0

  const ok = REQUIRED_ITEMS.filter(req => (
    items.some(item => (
      item.type === req.type &&
      item.name?.toLowerCase().includes(req.name.toLowerCase().split('/')[0].trim()) &&
      item.estado !== 'rechazado' &&
      !(item.vence && diasHasta(item.vence) < 0)
    ))
  )).length

  return Math.round((ok / REQUIRED_ITEMS.length) * 100)
}

function initials(nombre) {
  if (!nombre) return '?'
  const parts = nombre.trim().split(' ')
  return `${parts[0]?.[0] || ''}${parts[1]?.[0] || ''}`.toUpperCase()
}

function workerProjectIds(persona, asignaciones) {
  return asignaciones
    .filter(asignacion => asignacion.trabId === persona.id)
    .map(asignacion => asignacion.mantId)
}

function workerContractIds(persona, asignaciones, mantenciones) {
  const projectIds = workerProjectIds(persona, asignaciones)
  return [...new Set(
    projectIds
      .map(projectId => mantenciones.find(project => project.id === projectId)?.contratoId)
      .filter(Boolean)
  )]
}

function AvailabilityBadge({ value, blocked }) {
  if (blocked) return <span className="nk-badge nk-badge-error">Restringido</span>

  const map = {
    disponible: ['nk-badge-ok', 'Disponible'],
    vacaciones: ['nk-badge-warn', 'Vacaciones'],
    asignado: ['nk-badge-none', 'Asignado'],
  }
  const [cls, label] = map[value] || ['nk-badge-none', value || 'Sin información']
  return <span className={`nk-badge ${cls}`}>{label}</span>
}

function LinkTypeBadge({ type }) {
  return type === 'permanente'
    ? <span className="nk-badge nk-badge-none">Fijo</span>
    : <span className="nk-badge nk-badge-warn">Por proyecto</span>
}

function ProgressBar({ pct }) {
  const stateClass = pct >= 85 ? 'is-ok' : pct >= 60 ? 'is-warn' : 'is-error'

  return (
    <div className="nk-people-progress" aria-label={`${pct}% de cumplimiento documental`}>
      <div className="nk-people-progress-track" aria-hidden="true">
        <div
          className={`nk-people-progress-bar ${stateClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`nk-people-progress-value ${stateClass}`}>{pct}%</span>
    </div>
  )
}

const TABS = [
  { key: 'planta', label: 'Personal fijo', icon: IconUserCheck },
  { key: 'esporadico', label: 'Por proyecto', icon: IconUsers },
  { key: 'disponible', label: 'Disponibles', icon: IconUserCheck },
  { key: 'bloqueados', label: 'Restringidos', icon: IconUserOff },
]

const TAB_LABELS = {
  planta: 'personas con vínculo fijo',
  esporadico: 'personas vinculadas por proyecto',
  disponible: 'personas disponibles',
  bloqueados: 'personas restringidas',
}

export default function TrabajadoresPage() {
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('planta')
  const [search, setSearch] = useState('')
  const [specialty, setSpecialty] = useState('')
  const [availability, setAvailability] = useState('')
  const [clientId, setClientId] = useState('')
  const [projectId, setProjectId] = useState('')
  const [sortCol, setSortCol] = useState('nombre')
  const [sortAsc, setSortAsc] = useState(true)

  const loadState = () => {
    setLoading(true)
    api.get('/state')
      .then(result => {
        setState(result?.state || result)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadState()
    window.addEventListener('focus', loadState)
    return () => window.removeEventListener('focus', loadState)
  }, [])

  const personas = state?.trabajadores || []
  const clientes = state?.minas || []
  const proyectos = state?.mantenciones || []
  const contratos = state?.contratos || []
  const asignaciones = state?.asignaciones || []

  const specialties = useMemo(() => (
    [...new Set(personas.map(persona => persona.especialidad).filter(Boolean))].sort()
  ), [personas])

  const tabCount = key => {
    if (key === 'planta') return personas.filter(p => p.tipo === 'permanente' && !p.bloqueado).length
    if (key === 'esporadico') return personas.filter(p => p.tipo === 'esporadico' && !p.bloqueado).length
    if (key === 'disponible') return personas.filter(p => !p.bloqueado && p.disponibilidad === 'disponible').length
    return personas.filter(p => p.bloqueado).length
  }

  const getContext = persona => {
    const clientNames = (persona.mineras || [])
      .map(id => clientes.find(cliente => cliente.id === id)?.nombre)
      .filter(Boolean)

    const workerProjects = workerProjectIds(persona, asignaciones)
    const projectNames = workerProjects
      .map(id => proyectos.find(project => project.id === id)?.nombre)
      .filter(Boolean)

    const workerContracts = workerContractIds(persona, asignaciones, proyectos)
    const contractNames = workerContracts
      .map(id => contratos.find(contract => contract.id === id)?.nombre)
      .filter(Boolean)

    return {
      clients: clientNames.join(', '),
      projects: projectNames.join(', '),
      contracts: contractNames.join(', '),
    }
  }

  const filtered = useMemo(() => {
    let list = personas

    if (tab === 'planta') list = list.filter(p => p.tipo === 'permanente' && !p.bloqueado)
    if (tab === 'esporadico') list = list.filter(p => p.tipo === 'esporadico' && !p.bloqueado)
    if (tab === 'disponible') list = list.filter(p => !p.bloqueado && p.disponibilidad === 'disponible')
    if (tab === 'bloqueados') list = list.filter(p => p.bloqueado)

    if (search) {
      const term = search.toLocaleLowerCase()
      list = list.filter(p => (
        p.nombre?.toLocaleLowerCase().includes(term) || p.rut?.includes(search)
      ))
    }
    if (specialty) list = list.filter(p => p.especialidad === specialty)
    if (availability) list = list.filter(p => p.disponibilidad === availability)
    if (clientId) list = list.filter(p => (p.mineras || []).includes(clientId))
    if (projectId) list = list.filter(p => workerProjectIds(p, asignaciones).includes(projectId))

    return [...list].sort((a, b) => {
      let valueA = a[sortCol] ?? ''
      let valueB = b[sortCol] ?? ''

      if (sortCol === 'acreditacion') {
        valueA = acreditacionPct(a)
        valueB = acreditacionPct(b)
      }

      if (valueA < valueB) return sortAsc ? -1 : 1
      if (valueA > valueB) return sortAsc ? 1 : -1
      return 0
    })
  }, [personas, asignaciones, tab, search, specialty, availability, clientId, projectId, sortCol, sortAsc])

  const activeFilters = [search, specialty, availability, clientId, projectId].filter(Boolean).length

  const toggleSort = col => {
    if (sortCol === col) setSortAsc(value => !value)
    else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setSpecialty('')
    setAvailability('')
    setClientId('')
    setProjectId('')
  }

  const SortIcon = ({ col }) => {
    if (sortCol !== col) return <IconChevronDown className="nk-people-sort-muted" size={11} />
    return sortAsc
      ? <IconChevronUp className="nk-people-sort-active" size={11} />
      : <IconChevronDown className="nk-people-sort-active" size={11} />
  }

  if (loading) {
    return (
      <div className="nk-people-loading">
        <div className="nk-people-loading-content">
          <div className="nk-people-spinner" aria-hidden="true" />
          <span>Cargando personas…</span>
        </div>
      </div>
    )
  }

  return (
    <div className="nk-people-page">
      <section className="nk-people-header">
        <div className="nk-people-header-row">
          <div>
            <h1 className="nk-people-title">Personas</h1>
            <p className="nk-people-subtitle">
              {filtered.length} {TAB_LABELS[tab]}
              {activeFilters > 0 && ` · ${activeFilters} filtro${activeFilters > 1 ? 's' : ''} activo${activeFilters > 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="nk-actions">
            <button className="nk-button nk-button-secondary" type="button">
              <IconDownload size={15} strokeWidth={1.7} />
              Exportar
            </button>
          </div>
        </div>

        <div className="nk-tabs nk-people-tabs" role="tablist" aria-label="Segmentos de personas">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              className={`nk-tab nk-people-tab ${tab === key ? 'active' : ''}`}
              type="button"
              role="tab"
              aria-selected={tab === key}
              key={key}
              onClick={() => setTab(key)}
            >
              <Icon size={14} strokeWidth={1.7} />
              {label}
              <span className="nk-people-tab-count">{tabCount(key)}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="nk-people-filters" aria-label="Filtros de personas">
        <div className="nk-search nk-people-search">
          <IconSearch size={14} strokeWidth={1.7} />
          <input
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="Nombre o RUT"
            aria-label="Buscar persona por nombre o RUT"
          />
          {search && (
            <button
              className="nk-people-search-clear"
              type="button"
              onClick={() => setSearch('')}
              aria-label="Limpiar búsqueda"
            >
              <IconX size={13} />
            </button>
          )}
        </div>

        <select
          className={`nk-select nk-people-filter ${specialty ? 'is-active' : ''}`}
          value={specialty}
          onChange={event => setSpecialty(event.target.value)}
          aria-label="Filtrar por especialidad"
        >
          <option value="">Especialidad</option>
          {specialties.map(item => <option key={item} value={item}>{item}</option>)}
        </select>

        <select
          className={`nk-select nk-people-filter ${availability ? 'is-active' : ''}`}
          value={availability}
          onChange={event => setAvailability(event.target.value)}
          aria-label="Filtrar por disponibilidad"
        >
          <option value="">Disponibilidad</option>
          <option value="disponible">Disponible</option>
          <option value="asignado">Asignado</option>
          <option value="vacaciones">Vacaciones</option>
        </select>

        <select
          className={`nk-select nk-people-filter ${clientId ? 'is-active' : ''}`}
          value={clientId}
          onChange={event => setClientId(event.target.value)}
          aria-label="Filtrar por cliente"
        >
          <option value="">Cliente</option>
          {clientes.map(cliente => (
            <option key={cliente.id} value={cliente.id}>{cliente.nombre}</option>
          ))}
        </select>

        <select
          className={`nk-select nk-people-filter ${projectId ? 'is-active' : ''}`}
          value={projectId}
          onChange={event => setProjectId(event.target.value)}
          aria-label="Filtrar por proyecto"
        >
          <option value="">Proyecto / servicio</option>
          {proyectos.map(project => (
            <option key={project.id} value={project.id}>{project.nombre}</option>
          ))}
        </select>

        {activeFilters > 0 && (
          <button
            className="nk-button nk-button-quiet nk-people-clear-filters"
            type="button"
            onClick={clearFilters}
          >
            <IconFilter size={14} strokeWidth={1.7} />
            Limpiar ({activeFilters})
          </button>
        )}
      </section>

      <main className="nk-people-content">
        <div className="nk-table-wrapper">
          <table className="nk-table nk-people-table">
            <thead>
              <tr>
                <th>
                  <button className="nk-people-sort-button" type="button" onClick={() => toggleSort('nombre')}>
                    Persona <SortIcon col="nombre" />
                  </button>
                </th>
                <th>
                  <button className="nk-people-sort-button" type="button" onClick={() => toggleSort('especialidad')}>
                    Especialidad <SortIcon col="especialidad" />
                  </button>
                </th>
                <th>Vinculación</th>
                <th>Contexto operacional</th>
                <th>
                  <button className="nk-people-sort-button" type="button" onClick={() => toggleSort('disponibilidad')}>
                    Disponibilidad <SortIcon col="disponibilidad" />
                  </button>
                </th>
                <th>
                  <button className="nk-people-sort-button" type="button" onClick={() => toggleSort('acreditacion')}>
                    Cumplimiento <SortIcon col="acreditacion" />
                  </button>
                </th>
                <th aria-label="Acciones" />
              </tr>
            </thead>

            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td className="nk-people-empty-cell" colSpan={7}>
                    <div className="nk-empty">
                      <IconUsers className="nk-people-empty-icon" size={32} strokeWidth={1.3} />
                      <p className="nk-empty-title">Sin personas en esta vista</p>
                      <p className="nk-empty-description">
                        Ajusta los filtros o utiliza la acción + Persona del Header para registrar una nueva persona.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : filtered.map(persona => {
                const pct = acreditacionPct(persona)
                const context = getContext(persona)

                return (
                  <tr
                    className="nk-people-row"
                    key={persona.id}
                    tabIndex={0}
                    onClick={() => navigate(`/app/trabajadores/${persona.id}`)}
                    onKeyDown={event => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        navigate(`/app/trabajadores/${persona.id}`)
                      }
                    }}
                  >
                    <td>
                      <div className="nk-people-person">
                        <div className="nk-people-avatar" aria-hidden="true">
                          {initials(persona.nombre)}
                        </div>
                        <div>
                          <div className="nk-people-name">{persona.nombre || 'Sin nombre'}</div>
                          <div className="nk-people-rut">{persona.rut || 'Sin RUT'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="nk-people-cell-muted">{persona.especialidad || '—'}</td>
                    <td><LinkTypeBadge type={persona.tipo} /></td>
                    <td>
                      <div>{context.clients || '—'}</div>
                      {(context.projects || context.contracts) && (
                        <div className="nk-people-muted">
                          {[context.projects, context.contracts].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td>
                      <AvailabilityBadge value={persona.disponibilidad} blocked={persona.bloqueado} />
                    </td>
                    <td><ProgressBar pct={pct} /></td>
                    <td onClick={event => event.stopPropagation()}>
                      <button
                        className="nk-button nk-button-quiet"
                        type="button"
                        onClick={() => navigate(`/app/trabajadores/${persona.id}`)}
                      >
                        Ficha
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
