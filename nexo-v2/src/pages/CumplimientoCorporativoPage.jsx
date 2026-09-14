import { useEffect, useMemo, useRef, useState } from 'react'
import { IconBuilding, IconExternalLink, IconFile, IconRefresh, IconSearch, IconUpload, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/cumplimiento-corporativo.css'

const AREA_LABELS = {
  legal: 'Legal',
  laboral: 'Laboral / previsional',
  sst: 'Seguridad y salud',
  operacional: 'Cumplimiento operacional',
  financiero: 'Financiero / tributario',
}

const REQUIREMENTS = [
  { id: 'rut_empresa', area: 'legal', name: 'RUT empresa / carpeta tributaria', expires: false, src: 'SII / acreditación mandante' },
  { id: 'escritura', area: 'legal', name: 'Escritura de constitución y poderes', expires: false, src: 'Acreditación empresa' },
  { id: 'vigencia_sociedad', area: 'legal', name: 'Certificado de vigencia de sociedad', expires: true, src: 'Registro de Comercio' },
  { id: 'mutualidad', area: 'sst', name: 'Certificado de adhesión a mutualidad', expires: true, src: 'Ley 16.744 / mandante' },
  { id: 'reglamento_interno', area: 'sst', name: 'Reglamento Interno de Orden, Higiene y Seguridad', expires: false, src: 'Código del Trabajo / DT' },
  { id: 'comite_paritario', area: 'sst', name: 'Comité Paritario o registro de no obligación', expires: true, src: 'Prevención de riesgos' },
  { id: 'f30', area: 'laboral', name: 'Certificado F30 obligaciones laborales y previsionales', expires: true, src: 'Dirección del Trabajo' },
  { id: 'f30_1', area: 'laboral', name: 'Certificado F30-1 trabajadores por contrato', expires: true, src: 'Dirección del Trabajo' },
  { id: 'cotizaciones', area: 'laboral', name: 'Pago de cotizaciones previsionales', expires: true, src: 'RRHH / Previred' },
  { id: 'nomina_contrato', area: 'laboral', name: 'Nómina de personal por contrato, proyecto o mantención', expires: true, src: 'Acreditación mandante' },
  { id: 'matriz_riesgos', area: 'sst', name: 'Matriz IPER / matriz de riesgos por actividad', expires: true, src: 'DS 44 / gestión preventiva' },
  { id: 'procedimientos', area: 'sst', name: 'Procedimientos de trabajo seguro aplicables', expires: true, src: 'DS 132 / mandante' },
  { id: 'programa_sst', area: 'sst', name: 'Programa de Seguridad y Salud en el Trabajo', expires: true, src: 'DS 44 / Ley 16.744' },
  { id: 'prevencionista', area: 'sst', name: 'Registro del prevencionista responsable', expires: true, src: 'Organización preventiva' },
  { id: 'organigrama', area: 'operacional', name: 'Organigrama y responsables del contrato', expires: false, src: 'Mandante / contratista' },
  { id: 'polizas', area: 'financiero', name: 'Pólizas de seguro exigidas por contrato', expires: true, src: 'Contrato comercial' },
  { id: 'tributarios', area: 'financiero', name: 'Certificados tributarios y comerciales', expires: true, src: 'Mandante / finanzas' },
  { id: 'reglamento_especial', area: 'operacional', name: 'Reglamento Especial de Empresas Contratistas firmado', expires: true, src: 'Ley 20.123 / mandante' },
  { id: 'credenciales_portal', area: 'operacional', name: 'Usuarios y vigencia en portal de acreditación minera', expires: true, src: 'Sistema mandante' },
  { id: 'equipos_vehiculos', area: 'operacional', name: 'Listado de vehículos/equipos y documentación asociada', expires: true, src: 'Acceso a faena' },
]

const asRows = value => Array.isArray(value) ? value : []

function daysUntil(date) {
  if (!date) return null
  const target = new Date(`${date}T23:59:59`)
  if (Number.isNaN(target.getTime())) return null
  return Math.ceil((target - new Date()) / 86400000)
}

function statusFor(doc) {
  const requirement = REQUIREMENTS.find(item => item.id === doc.reqId) || doc
  const hasEvidence = Boolean(doc.fileName || doc.cloudUrl)
  if (!hasEvidence) return { key: 'faltante', label: 'Faltante', cls: 'nk-badge-error' }
  if (requirement.expires && !doc.vence) return { key: 'faltante', label: 'Faltante', cls: 'nk-badge-error' }
  if (!requirement.expires) return { key: 'ok', label: 'Vigente', cls: 'nk-badge-ok' }
  const days = daysUntil(doc.vence)
  if (days === null) return { key: 'faltante', label: 'Faltante', cls: 'nk-badge-error' }
  if (days < 0) return { key: 'vencido', label: 'Vencido', cls: 'nk-badge-error' }
  if (days <= 15) return { key: 'critico', label: 'Crítico', cls: 'nk-badge-error' }
  if (days <= 30) return { key: 'proximo', label: 'Próximo', cls: 'nk-badge-warn' }
  return { key: 'ok', label: 'Vigente', cls: 'nk-badge-ok' }
}

function normalizeDocs(current) {
  return REQUIREMENTS.map(requirement => {
    const existing = current.find(doc => doc.reqId === requirement.id || doc.id === `ed_${requirement.id}`)
    return existing || {
      id: `ed_${requirement.id}`,
      reqId: requirement.id,
      area: requirement.area,
      name: requirement.name,
      vence: '',
      estado: 'faltante',
      fileName: '',
      cloudUrl: '',
      notes: '',
      src: requirement.src,
      created: new Date().toISOString().slice(0, 10),
      documents: [],
    }
  })
}

export default function CumplimientoCorporativoPage() {
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState('')
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [areaFilter, setAreaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [drafts, setDrafts] = useState({})
  const [uploadId, setUploadId] = useState('')
  const fileInputRef = useRef(null)

  async function load() {
    setLoading(true)
    setError('')
    try {
      const result = await api.get('/state')
      setResponse(result)
      const state = result?.state || result || {}
      const docs = normalizeDocs(asRows(state.empresaDocs).length ? asRows(state.empresaDocs) : asRows(state.documentosEmpresa))
      setDrafts(Object.fromEntries(docs.map(doc => [doc.id, { vence: doc.vence || '', notes: doc.notes || '', cloudUrl: doc.cloudUrl || '', fileName: doc.fileName || '' }])))
    } catch (cause) {
      setError(cause.message || 'No fue posible cargar el cumplimiento corporativo.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const state = response?.state || response || {}
  const moduleVersions = response?.moduleVersions || {}
  const sourceDocs = asRows(state.empresaDocs).length ? asRows(state.empresaDocs) : asRows(state.documentosEmpresa)
  const docs = useMemo(() => normalizeDocs(sourceDocs).map(doc => ({ ...doc, ...(drafts[doc.id] || {}) })), [sourceDocs, drafts])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return docs.filter(doc => {
      const status = statusFor(doc)
      const matchesText = !term || [doc.name, doc.src, doc.notes].some(value => String(value || '').toLowerCase().includes(term))
      const matchesArea = !areaFilter || doc.area === areaFilter
      const matchesStatus = !statusFilter || (statusFilter === 'ok' ? status.key === 'ok' : statusFilter === 'faltante' ? status.key === 'faltante' : ['vencido', 'critico', 'proximo'].includes(status.key))
      return matchesText && matchesArea && matchesStatus
    })
  }, [docs, query, areaFilter, statusFilter])

  const summary = useMemo(() => docs.reduce((acc, doc) => {
    const status = statusFor(doc)
    acc.total += 1
    if (status.key === 'ok') acc.ok += 1
    if (status.key === 'faltante') acc.missing += 1
    if (['vencido', 'critico', 'proximo'].includes(status.key)) acc.expiring += 1
    return acc
  }, { total: 0, ok: 0, missing: 0, expiring: 0 }), [docs])
  const compliance = summary.total ? Math.round((summary.ok / summary.total) * 100) : 0

  function patchDraft(id, field, value) {
    setDrafts(current => ({ ...current, [id]: { ...(current[id] || {}), [field]: value } }))
  }

  async function persistDoc(id, patch = {}) {
    if (savingId) return
    setSavingId(id)
    setError('')
    try {
      const current = normalizeDocs(asRows(state.empresaDocs).length ? asRows(state.empresaDocs) : asRows(state.documentosEmpresa))
      const next = current.map(doc => {
        if (doc.id !== id) return doc
        const merged = { ...doc, ...(drafts[id] || {}), ...patch }
        return { ...merged, estado: statusFor(merged).key, updatedAt: new Date().toISOString() }
      })
      const result = await api.put('/state/modules', {
        reason: `Cumplimiento corporativo actualizado: ${next.find(doc => doc.id === id)?.name || id}`,
        changes: { empresaDocs: { version: Number(moduleVersions.empresaDocs || 0), data: next } },
      })
      setResponse(currentResponse => ({
        ...(currentResponse || {}),
        state: { ...(currentResponse?.state || state), empresaDocs: next },
        moduleVersions: { ...(currentResponse?.moduleVersions || moduleVersions), ...(result?.moduleVersions || {}) },
      }))
    } catch (cause) {
      setError(cause.message || 'No fue posible guardar el documento.')
    } finally {
      setSavingId('')
    }
  }

  function chooseFile(id) {
    setUploadId(id)
    fileInputRef.current?.click()
  }

  function onFileSelected(event) {
    const file = event.target.files?.[0]
    if (!file || !uploadId) return
    patchDraft(uploadId, 'fileName', file.name)
    patchDraft(uploadId, 'cloudUrl', '')
    persistDoc(uploadId, { fileName: file.name, cloudUrl: '', created: new Date().toISOString().slice(0, 10) })
    event.target.value = ''
    setUploadId('')
  }

  function setCloudUrl(doc) {
    const url = window.prompt('URL https del respaldo', doc.cloudUrl || '')
    if (url === null) return
    patchDraft(doc.id, 'cloudUrl', url)
    persistDoc(doc.id, { cloudUrl: url, fileName: '' })
  }

  const company = state.empresa || {}
  const activeContracts = asRows(state.contratos).filter(contract => String(contract.estado || '').toLowerCase() !== 'cerrado').length

  return (
    <div className="nk-compliance-page">
      <header className="nk-compliance-header">
        <div><h1>Documentación de la Empresa</h1><p>Documentación legal, laboral, previsional y preventiva de la empresa.</p></div>
        <button className="nk-button nk-button-secondary" type="button" onClick={load} disabled={loading}><IconRefresh size={15} /> Actualizar</button>
      </header>

      {error && <div className="nk-compliance-feedback error"><span>{error}</span><button className="nk-icon-button" type="button" onClick={() => setError('')}><IconX size={15} /></button></div>}

      <section className="nk-card nk-compliance-filters" aria-label="Filtros de documentación corporativa">
        <label className="nk-search"><IconSearch size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar documento..." /></label>
        <select className="nk-select" value={areaFilter} onChange={event => setAreaFilter(event.target.value)}><option value="">Todas las áreas</option>{Object.entries(AREA_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        <select className="nk-select" value={statusFilter} onChange={event => setStatusFilter(event.target.value)}><option value="">Todos los estados</option><option value="ok">Cargado y vigente</option><option value="faltante">Faltante</option><option value="vencido">Vencido / crítico</option></select>
      </section>

      <section className="nk-compliance-summary" aria-label="Resumen de cumplimiento corporativo">
        <article><strong>{loading ? '…' : summary.total}</strong><span>Requisitos empresa</span></article>
        <article><strong>{loading ? '…' : summary.ok}</strong><span>Cargados vigentes</span></article>
        <article><strong>{loading ? '…' : summary.missing}</strong><span>Faltantes</span></article>
        <article><strong>{loading ? '…' : `${compliance}%`}</strong><span>Cumplimiento empresa</span></article>
      </section>

      <section className="nk-card nk-company-summary">
        <div className="nk-company-summary-icon"><IconBuilding size={22} /></div>
        <div><span>Empresa</span><strong>{company.nombre || company.name || 'Empresa no configurada'}</strong><small>{company.rut || 'Sin RUT'}</small></div>
        <div><span>Representante</span><strong>{company.representante || company.adminName || '—'}</strong></div>
        <div><span>Correo</span><strong>{company.email || '—'}</strong><small>{company.tel || company.telefono || ''}</small></div>
        <div><span>Contratos activos</span><strong>{activeContracts}</strong></div>
      </section>

      <section className="nk-card nk-compliance-table-card">
        {loading ? <div className="nk-empty nk-compliance-empty"><IconFile size={30} /><p className="nk-empty-title">Cargando documentación…</p></div> : (
          <div className="nk-table-wrapper">
            <table className="nk-table nk-compliance-table">
              <thead><tr><th>Documento</th><th>Área</th><th>Estado</th><th>Vence</th><th>Respaldo</th><th>Observación</th></tr></thead>
              <tbody>{filtered.map(doc => {
                const status = statusFor(doc)
                const requirement = REQUIREMENTS.find(item => item.id === doc.reqId)
                return (
                  <tr key={doc.id}>
                    <td><div className="nk-compliance-doc"><strong title={doc.name}>{doc.name}</strong><span title={doc.src || requirement?.src || ''}>{doc.src || requirement?.src || ''}</span></div></td>
                    <td><span className="nk-compliance-area">{AREA_LABELS[doc.area] || doc.area}</span></td>
                    <td><span className={`nk-badge ${status.cls}`}>{status.label}</span></td>
                    <td>{requirement?.expires === false ? <span className="nk-compliance-na">No aplica</span> : <input className="nk-input nk-compliance-date" type="date" value={doc.vence || ''} onChange={event => patchDraft(doc.id, 'vence', event.target.value)} onBlur={() => persistDoc(doc.id)} />}</td>
                    <td>
                      <div className="nk-compliance-evidence-cell">
                        {doc.cloudUrl ? <a className="nk-context-link nk-compliance-evidence" href={doc.cloudUrl} target="_blank" rel="noreferrer" title={doc.cloudUrl}><IconExternalLink size={13} /> Ver</a> : doc.fileName ? <span className="nk-compliance-file" title={doc.fileName}><IconFile size={13} /> Archivo</span> : <span className="nk-compliance-na">Sin respaldo</span>}
                        <div className="nk-compliance-actions">
                          <button className="nk-compliance-action" type="button" onClick={() => chooseFile(doc.id)} disabled={savingId === doc.id} title="Cargar archivo desde PC"><IconUpload size={13} /> PC</button>
                          <button className="nk-compliance-action" type="button" onClick={() => setCloudUrl(doc)} disabled={savingId === doc.id} title="Registrar enlace en nube">Link</button>
                        </div>
                      </div>
                    </td>
                    <td><input className="nk-input nk-compliance-note" title={doc.notes || ''} value={doc.notes || ''} onChange={event => patchDraft(doc.id, 'notes', event.target.value)} onBlur={() => persistDoc(doc.id)} placeholder="Observación" /></td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      <input ref={fileInputRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={onFileSelected} />
    </div>
  )
}
