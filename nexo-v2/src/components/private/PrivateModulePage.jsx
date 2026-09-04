import { useEffect, useMemo, useState } from 'react'
import { IconPlus, IconRefresh, IconSearch, IconTable } from '@tabler/icons-react'
import { api } from '../../services/api.js'
import { moduleFor } from './moduleCatalog.js'

const labelFor = key => key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, char => char.toUpperCase())
const asRows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []

export default function PrivateModulePage({ moduleId }) {
  const module = moduleFor(moduleId)
  const [state, setState] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = async () => { setLoading(true); setError(''); try { const result=await api.get('/state'); setState(result?.state || result) } catch { setError('No fue posible cargar la información de este módulo. Revisa tu conexión e inténtalo nuevamente.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [moduleId])
  const source = useMemo(() => module.data.flatMap(key => asRows(state?.[key])), [state, module])
  const rows = useMemo(() => source.filter(row => JSON.stringify(row).toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 20), [source, query])
  const headings = useMemo(() => [...new Set(rows.flatMap(row => Object.keys(row || {})))].filter(key => !['id','tenantId','createdAt','updatedAt'].includes(key)).slice(0, 5), [rows])

  return <section className="nk-module-page">
    <header className="nk-module-header"><div><p className="nk-module-kicker">Nexo Klar · Espacio de trabajo</p><h1>{module.title}</h1><p>{module.description}</p></div><div className="nk-module-actions"><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={16}/> Actualizar</button><button className="nk-button nk-button-primary" onClick={() => window.alert(`${module.action}: esta acción se conecta al formulario específico durante la migración del flujo HTML.`)}><IconPlus size={16}/>{module.action}</button></div></header>
    <div className="nk-module-summary"><article><b>{loading ? '…' : source.length}</b><span>Registros vinculados</span></article><article><b>{module.related.length}</b><span>Relaciones operativas</span></article><article><b>{error ? '!' : '✓'}</b><span>{error ? 'Requiere revisión' : 'Estado de datos'}</span></article></div>
    <article className="nk-module-card"><div className="nk-module-card-header"><div><h2>Información registrada</h2><p>Datos disponibles para esta empresa y vinculados con los módulos relacionados.</p></div><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar en este módulo" /></label></div>
      {error ? <div className="nk-module-empty">{error}</div> : loading ? <div className="nk-module-empty">Cargando información…</div> : rows.length === 0 ? <div className="nk-module-empty"><IconTable size={28}/><b>Aún no hay registros para mostrar</b><span>Utiliza “{module.action}” para comenzar o importa información desde el módulo correspondiente.</span></div> : <div className="nk-data-table"><table><thead><tr>{headings.map(key => <th key={key}>{labelFor(key)}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={row.id || index}>{headings.map(key => <td key={key}>{typeof row[key] === 'object' ? 'Información relacionada' : String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table></div>}
    </article>
    <aside className="nk-module-relationships"><b>Se relaciona con</b>{module.related.map(item => <span key={item}>{item}</span>)}</aside>
  </section>
}
