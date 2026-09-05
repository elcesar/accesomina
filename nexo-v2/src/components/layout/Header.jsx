import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconBell, IconSearch, IconX } from '@tabler/icons-react'
import { api } from '../../services/api.js'

const routes = {
  trabajadores: ['personas', 'Personas'], minas: ['clientes', 'Clientes'], clientes: ['clientes', 'Clientes'],
  contratos: ['contratos', 'Contratos y firmas'], mantenciones: ['ordenes-servicio', 'Órdenes de servicio'],
  proyectos: ['ordenes-servicio', 'Órdenes de servicio'], vehiculos: ['vehiculos', 'Flota y equipos móviles'],
  inventoryItems: ['activos-inventario', 'Activos, equipos e inventario'], subcontratos: ['terceros-subcontratos', 'Terceros y subcontratos'],
  prospectos: ['prospectos', 'Prospectos y oportunidades'],
}
const rowsFor = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const nameFor = row => row.nombre || row.name || row.razonSocial || row.rut || row.codigo || row.id || 'Registro sin nombre'

export default function Header() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [state, setState] = useState(null)
  const [open, setOpen] = useState(false)
  useEffect(() => { if (open && !state) api.get('/state').then(result => setState(result?.state || result)).catch(() => setState({})) }, [open, state])
  const results = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (term.length < 2) return []
    return Object.entries(routes).flatMap(([key, [path, module]]) => rowsFor(state?.[key]).map(row => ({ row, path, module }))).filter(({ row }) => JSON.stringify(row).toLocaleLowerCase().includes(term)).slice(0, 8)
  }, [query, state])
  const choose = result => { setQuery(''); setOpen(false); navigate(`/app/${result.path}`) }
  return <header className="nk-global-header">
    <label className="nk-global-search"><IconSearch size={17}/><input value={query} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={event => setQuery(event.target.value)} placeholder="Buscar persona, cliente, contrato, orden o recurso" aria-label="Buscar en Nexo Klar" />{query && <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda"><IconX size={15}/></button>}
      {open && <div className="nk-global-results">{query.trim().length < 2 ? <span>Escribe al menos dos caracteres para buscar en tu empresa.</span> : results.length ? results.map(result => <button type="button" key={`${result.path}-${result.row.id}`} onMouseDown={event => event.preventDefault()} onClick={() => choose(result)}><b>{nameFor(result.row)}</b><small>{result.module}</small></button>) : <span>No encontramos resultados en la empresa actual.</span>}</div>}
    </label>
    <button className="nk-icon-button" type="button" onClick={() => navigate('/app/alertas')} aria-label="Ir a alertas"><IconBell size={18}/></button>
  </header>
}
