import { useEffect, useMemo, useState } from 'react'
import { IconPaperclip, IconPlus, IconRefresh, IconSearch, IconTable, IconX } from '@tabler/icons-react'
import { api } from '../../services/api.js'
import { canEditModule, canUseModule, moduleFor } from './moduleCatalog.js'
import { useAuth } from '../../services/auth.jsx'

const labelFor = key => key.replace(/([A-Z])/g, ' $1').replace(/[_-]/g, ' ').replace(/^./, char => char.toUpperCase())
const asRows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const recordId = () => globalThis.crypto?.randomUUID?.() || `nk-${Date.now()}-${Math.random().toString(16).slice(2)}`

function CreateRecordDialog({ module, state, versions, onClose, onSaved }) {
  const [form, setForm] = useState({ nombre: '', descripcion: '', estado: 'activo' })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const save = async event => {
    event.preventDefault()
    if (form.nombre.trim().length < 2) return setError('Indica un nombre o identificador para continuar.')
    setSaving(true); setError('')
    try {
      const id = recordId()
      const uploaded = file ? await api.upload(file, { entityType: module.id, entityId: id }) : null
      const current = asRows(state?.[module.writeKey])
      const item = { id, nombre: form.nombre.trim(), descripcion: form.descripcion.trim(), estado: form.estado, createdAt: new Date().toISOString(), ...(uploaded ? { fileId: uploaded.id, archivo: uploaded.original_name } : {}) }
      await api.put('/state/modules', { changes: { [module.writeKey]: { version: Number(versions?.[module.writeKey] || 0), data: [...current, item] } }, reason: `Registro creado desde ${module.title}` })
      onSaved()
    } catch (cause) {
      setError(cause.message || 'No fue posible guardar el registro. Actualiza la vista e inténtalo nuevamente.')
    } finally { setSaving(false) }
  }
  return <div className="nk-dialog-backdrop" role="presentation" onMouseDown={onClose}>
    <form className="nk-dialog" onSubmit={save} onMouseDown={event => event.stopPropagation()}>
      <header><div><p className="nk-module-kicker">Nuevo registro</p><h2>{module.action}</h2><p>El registro se guarda en la empresa actual y conserva su trazabilidad.</p></div><button type="button" className="nk-icon-button" onClick={onClose} aria-label="Cerrar"><IconX size={18}/></button></header>
      <label>Nombre o identificador<input autoFocus required value={form.nombre} onChange={event => setForm({ ...form, nombre: event.target.value })} placeholder={`Ej.: ${module.title}`} /></label>
      <label>Descripción<textarea value={form.descripcion} onChange={event => setForm({ ...form, descripcion: event.target.value })} placeholder="Detalle útil para el equipo" rows="3" /></label>
      <label>Estado<select value={form.estado} onChange={event => setForm({ ...form, estado: event.target.value })}><option value="activo">Activo</option><option value="en_revision">En revisión</option><option value="pendiente">Pendiente</option></select></label>
      <label className="nk-file-field"><IconPaperclip size={16}/><span>{file?.name || 'Adjuntar evidencia (opcional)'}</span><input type="file" accept="application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      {error && <p className="nk-form-error">{error}</p>}
      <footer><button type="button" className="nk-button nk-button-secondary" onClick={onClose}>Cancelar</button><button className="nk-button nk-button-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar registro'}</button></footer>
    </form>
  </div>
}

export default function PrivateModulePage({ moduleId }) {
  const module = moduleFor(moduleId)
  const { session } = useAuth()
  const [response, setResponse] = useState(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const load = async () => { setLoading(true); setError(''); try { setResponse(await api.get('/state')) } catch { setError('No fue posible cargar la información de este módulo. Revisa tu conexión e inténtalo nuevamente.') } finally { setLoading(false) } }
  useEffect(() => { load() }, [moduleId])
  const state = response?.state || response || {}
  const source = useMemo(() => module.data.flatMap(key => asRows(state?.[key])), [state, module])
  const rows = useMemo(() => source.filter(row => JSON.stringify(row).toLocaleLowerCase().includes(query.toLocaleLowerCase())).slice(0, 50), [source, query])
  const headings = useMemo(() => [...new Set(rows.flatMap(row => Object.keys(row || {})))].filter(key => !['id','tenantId','createdAt','updatedAt','fileId'].includes(key)).slice(0, 5), [rows])
  const canEdit = canEditModule(module, session)

  if (!canUseModule(module, session)) return <section className="nk-module-page"><div className="nk-module-empty"><b>Sin acceso a este módulo</b><span>Tu perfil no tiene permiso para consultar esta información.</span></div></section>
  return <section className="nk-module-page">
    <header className="nk-module-header"><div><p className="nk-module-kicker">Nexo Klar · {session?.tenant?.name || 'Empresa'}</p><h1>{module.title}</h1><p>{module.description}</p></div><div className="nk-module-actions"><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={16}/>Actualizar</button>{canEdit && <button className="nk-button nk-button-primary" onClick={() => setCreating(true)}><IconPlus size={16}/>{module.action}</button>}</div></header>
    <div className="nk-module-summary"><article><b>{loading ? '…' : source.length}</b><span>Registros vinculados</span></article><article><b>{module.related.length}</b><span>Relaciones operativas</span></article><article><b>{error ? '!' : '✓'}</b><span>{error ? 'Requiere revisión' : 'Datos actualizados'}</span></article></div>
    <article className="nk-module-card"><div className="nk-module-card-header"><div><h2>Información registrada</h2><p>Datos de la empresa actual; las relaciones se conservan entre los módulos autorizados.</p></div><label className="nk-search"><IconSearch size={16}/><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar en este módulo" /></label></div>
      {error ? <div className="nk-module-empty">{error}</div> : loading ? <div className="nk-module-empty">Cargando información…</div> : rows.length === 0 ? <div className="nk-module-empty"><IconTable size={28}/><b>Aún no hay registros para mostrar</b><span>{canEdit ? `Utiliza “${module.action}” para comenzar o importa información desde el módulo correspondiente.` : 'Solicita a un administrador que incorpore información a este módulo.'}</span></div> : <div className="nk-data-table"><table><thead><tr>{headings.map(key => <th key={key}>{labelFor(key)}</th>)}</tr></thead><tbody>{rows.map((row,index) => <tr key={row.id || index}>{headings.map(key => <td key={key}>{typeof row[key] === 'object' ? 'Información relacionada' : String(row[key] ?? '—')}</td>)}</tr>)}</tbody></table></div>}
    </article>
    <aside className="nk-module-relationships"><b>Se relaciona con</b>{module.related.map(item => <span key={item}>{item}</span>)}</aside>
    {creating && <CreateRecordDialog module={module} state={state} versions={response?.moduleVersions} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load() }} />}
  </section>
}
