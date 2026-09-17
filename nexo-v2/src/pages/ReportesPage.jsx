import { useEffect, useMemo, useState } from 'react'
import { IconCategory, IconChartBar, IconDownload, IconFiles, IconRefresh, IconStack2 } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { operationalAlerts } from '../services/operational-alerts.js'
import { mergeReportCollections, rows } from '../services/report-collections.js'
import '../styles/reportes.css'

const norm = value => String(value ?? '').trim().toLowerCase()

function workerItems(state, kind) {
  return rows(state?.trabajadores).flatMap(person => rows(person?.workerItems)
    .filter(item => norm(item?.tipo || item?.type || item?.categoria).includes(kind))
    .map(item => ({ ...item, persona: person?.nombre || person?.name, trabId: person?.id })))
}

function inventoryByType(state, type) {
  return rows(state?.inventoryItems).filter(item => norm(item?.tipo || item?.type || item?.categoria).includes(type))
}

function loans(state) {
  return mergeReportCollections(state, 'inventoryMovements', 'movimientosInventario')
    .filter(item => ['prestamo', 'préstamo', 'loan'].includes(norm(item?.type || item?.tipo)))
}

const MODULES = {
  personas: { label: 'Personas', get: state => rows(state.trabajadores) },
  documentos: { label: 'Documentos de personas', get: state => workerItems(state, 'document').concat(workerItems(state, 'contrato')) },
  asignaciones: { label: 'Asignaciones por proyecto', get: state => rows(state.asignaciones) },
  turnos: { label: 'Turnos y asistencia', get: state => rows(state.turnos) },
  epp: { label: 'Entregas de EPP', get: state => mergeReportCollections(state, 'eppDeliveries', 'eppEntregas') },
  formacion: { label: 'Formación y certificaciones', get: state => workerItems(state, 'curso').concat(workerItems(state, 'formac'), workerItems(state, 'certif')) },
  examenes: { label: 'Exámenes y aptitudes', get: state => workerItems(state, 'examen').concat(workerItems(state, 'aptitud')) },
  salud: { label: 'Salud ocupacional', get: state => rows(state.protocolosSalud) },
  restricciones: { label: 'Restricciones', get: state => rows(state.restricted) },
  credenciales: { label: 'Credenciales', get: state => rows(state.credenciales) },
  clientes: { label: 'Clientes', get: state => mergeReportCollections(state, 'minas', 'clientes') },
  contratos: { label: 'Contratos', get: state => rows(state.contratos) },
  firmas: { label: 'Contratos y firmas', get: state => rows(state.firmas) },
  ordenes: { label: 'Órdenes de servicio', get: state => mergeReportCollections(state, 'mantenciones', 'proyectos') },
  prospectos: { label: 'Prospectos y oportunidades', get: state => mergeReportCollections(state, 'prospectos', 'oportunidades', 'opportunities') },
  libroObra: { label: 'Libro de obra', get: state => rows(state.workBookEntries) },
  estadias: { label: 'Alojamientos y estadías', get: state => rows(state.hotelAsig) },
  comunicaciones: { label: 'Comunicaciones y convocatorias', get: state => rows(state.callouts) },
  incidentes: { label: 'Incidentes y no conformidades', get: state => rows(state.incidentes) },
  libroDiario: { label: 'Libro diario', get: state => rows(state.dailyLogs) },
  capa: { label: 'Acciones CAPA', get: state => rows(state.capaActions) },
  vehiculos: { label: 'Vehículos', get: state => rows(state.vehiculos) },
  maquinaria: { label: 'Maquinaria', get: state => inventoryByType(state, 'maquinaria') },
  inventario: { label: 'Inventario y existencias', get: state => rows(state.inventoryItems) },
  movimientos: { label: 'Movimientos de inventario', get: state => mergeReportCollections(state, 'inventoryMovements', 'movimientosInventario') },
  bodegas: { label: 'Bodegas', get: state => mergeReportCollections(state, 'warehouses', 'bodegas') },
  mantenimiento: { label: 'Mantenimiento', get: state => rows(state.assetMaintenanceRecords).concat(rows(state.assetMaintenancePlans)) },
  prestamos: { label: 'Asignaciones y préstamos', get: state => loans(state) },
  empresaDocs: { label: 'Documentación corporativa', get: state => mergeReportCollections(state, 'empresaDocs', 'documentosEmpresa') },
  acreditaciones: { label: 'Habilitación del cliente', get: state => rows(state.acreditacionesMandante) },
  auditoria: { label: 'Auditoría', get: state => rows(state.auditorias) },
  subcontratos: { label: 'Terceros y subcontratos', get: state => rows(state.subcontratos) },
  convenios: { label: 'Convenios', get: state => rows(state.convenios) },
  personalContratista: { label: 'Personal del contratista', get: state => rows(state.personalContratista) },
  habilitaciones: { label: 'Habilitaciones', get: state => rows(state.habilitaciones) },
  evaluaciones: { label: 'Evaluaciones', get: state => rows(state.evaluaciones) },
  alertas: { label: 'Alertas operacionales', get: state => operationalAlerts(state) },
}

const CATEGORIES = [
  { id: 'personas', name: 'Reportes de trabajadores', description: 'Personas, documentos, asignaciones por proyecto, turnos, EPP, formación, exámenes, credenciales, salud y restricciones.', modules: ['personas', 'documentos', 'asignaciones', 'turnos', 'epp', 'formacion', 'examenes', 'salud', 'restricciones', 'credenciales'] },
  { id: 'comercial', name: 'Reportes de clientes, contratos y proyectos', description: 'Clientes, contratos y firmas, órdenes de servicio, oportunidades y anotaciones del Libro de obra.', modules: ['clientes', 'contratos', 'firmas', 'ordenes', 'prospectos', 'libroObra'] },
  { id: 'operacion', name: 'Reportes de operación y servicios', description: 'Alojamientos, comunicaciones, incidentes, libro diario y acciones CAPA de ejecución.', modules: ['estadias', 'comunicaciones', 'incidentes', 'libroDiario', 'capa'] },
  { id: 'ejecutivos', name: 'Reportes ejecutivos', description: 'Indicadores consolidados de clientes, contratos, órdenes de servicio, personas y alertas.', modules: ['clientes', 'contratos', 'ordenes', 'personas', 'alertas'] },
  { id: 'activos', name: 'Reportes de flota y maquinaria', description: 'Vehículos, maquinaria, inventario, movimientos, bodegas, mantenimiento y préstamos.', modules: ['vehiculos', 'maquinaria', 'inventario', 'movimientos', 'bodegas', 'mantenimiento', 'prestamos'] },
  { id: 'cumplimiento', name: 'Reportes de auditoría y cumplimiento', description: 'Documentación corporativa, habilitación del cliente, incidentes, auditorías, salud, restricciones y alertas.', modules: ['empresaDocs', 'acreditaciones', 'incidentes', 'auditoria', 'salud', 'restricciones', 'alertas'] },
  { id: 'contratistas', name: 'Reportes de contratistas', description: 'Terceros y subcontratos, convenios, personas colaboradoras, habilitaciones y evaluaciones.', modules: ['subcontratos', 'convenios', 'personalContratista', 'habilitaciones', 'evaluaciones'] },
]

const csvEscape = value => `"${String(value ?? '').replaceAll('"', '""')}"`
function recordName(row) { return row?.nombre || row?.name || row?.title || row?.descripcion || row?.description || row?.tipo || row?.id || 'Registro' }
function recordDetail(row) { return row?.estado || row?.status || row?.cargo || row?.rut || row?.patente || row?.codigo || row?.code || '' }

function createCsv(category, collections, onlyKey) {
  const lines = [['Categoría', 'Módulo', 'ID', 'Registro', 'Detalle']]
  collections.filter(([key]) => !onlyKey || key === onlyKey).forEach(([key, items]) => items.forEach(row => lines.push([
    category.name, MODULES[key].label, row?.id || '', recordName(row), recordDetail(row),
  ])))
  return lines.map(line => line.map(csvEscape).join(',')).join('\n')
}

function downloadCsv(category, collections, onlyKey) {
  const content = createCsv(category, collections, onlyKey)
  const url = URL.createObjectURL(new Blob(['\ufeff', content], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `nexo-klar-${onlyKey || category.id}-${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function ReportesPage() {
  const [state, setState] = useState({})
  const [categoryId, setCategoryId] = useState('ejecutivos')
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState('')

  const load = async () => {
    setLoading(true); setNotice('')
    try {
      const [result, workBookEntries] = await Promise.all([api.get('/state'), api.get('/work-books/entries')])
      setState({ ...(result?.state || result || {}), workBookEntries: rows(workBookEntries) })
    }
    catch (error) { setNotice(error?.message || 'No fue posible cargar la información.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const selected = CATEGORIES.find(item => item.id === categoryId) || CATEGORIES[0]
  const collections = useMemo(() => selected.modules.map(key => [key, MODULES[key].get(state)]), [selected, state])
  const total = collections.reduce((sum, [, items]) => sum + items.length, 0)

  return (
    <section className="nk-module-page nk-reports-page">
      <header className="nk-module-header nk-reports-header">
        <div>
          <h1>Reportes y analítica</h1>
          <p>Consulta indicadores y descarga información por categoría, respetando el ownership de cada módulo.</p>
        </div>
        <div className="nk-module-actions">
          <button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={16} /> Actualizar</button>
          <button className="nk-button nk-button-primary" onClick={() => downloadCsv(selected, collections)} disabled={loading || total === 0}><IconDownload size={16} /> Descargar categoría</button>
        </div>
      </header>

      {notice && <p className="nk-form-message">{notice}</p>}

      <div className="nk-report-summary">
        <article className="nk-dashboard-metric"><IconCategory size={22} /><div><b>{CATEGORIES.length}</b><span>Categorías</span></div></article>
        <article className="nk-dashboard-metric teal"><IconChartBar size={22} /><div><b>{selected.name}</b><span>Categoría activa</span></div></article>
        <article className="nk-dashboard-metric amber"><IconStack2 size={22} /><div><b>{selected.modules.length}</b><span>Módulos incluidos</span></div></article>
        <article className="nk-dashboard-metric"><IconFiles size={22} /><div><b>{loading ? '—' : total}</b><span>Registros disponibles</span></div></article>
      </div>

      <div className="nk-report-categories" role="tablist" aria-label="Categorías de reportes">
        {CATEGORIES.map(item => {
          const count = item.modules.reduce((sum, key) => sum + MODULES[key].get(state).length, 0)
          return <button type="button" role="tab" aria-selected={item.id === categoryId} className={item.id === categoryId ? 'active' : ''} key={item.id} onClick={() => setCategoryId(item.id)}><b>{item.name}</b><span>{loading ? '…' : count}</span></button>
        })}
      </div>

      <section className="nk-report-workspace">
        <header><div><h2>{selected.name}</h2><p>{selected.description}</p></div><span className="nk-report-total">{loading ? 'Cargando…' : `${total} registros`}</span></header>
        {loading ? <p className="nk-report-loading">Cargando datos…</p> : (
          <div className="nk-report-grid">
            {collections.map(([key, items]) => (
              <article key={key} className="nk-report-card">
                <div className="nk-report-card-head"><div><b>{MODULES[key].label}</b><strong>{items.length}</strong></div><button type="button" className="nk-report-download" onClick={() => downloadCsv(selected, collections, key)} disabled={!items.length} title={`Descargar ${MODULES[key].label}`}><IconDownload size={15} /></button></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  )
}
