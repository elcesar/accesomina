import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowRight, IconBriefcase, IconClipboardCheck, IconPackage, IconRefresh, IconReportAnalytics, IconShieldCheck, IconTruck } from '@tabler/icons-react'
import PrivateModulePage from './PrivateModulePage.jsx'
import { StatusBadge } from '../ui/StatusBadge.jsx'
import { api } from '../../services/api.js'

const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const name = item => item?.nombre || item?.title || item?.codigo || item?.id || 'Registro operativo'

const definitions = {
  'centro-operativo': { icon: IconClipboardCheck, kicker: 'Vista de ejecución', title: 'Centro operativo', copy: 'Reúne el estado de las órdenes, las asignaciones y los pendientes antes de iniciar el trabajo.', keys: ['proyectos', 'mantenciones', 'asignaciones'], route: '/app/ordenes-servicio', action: 'Revisar órdenes', stages: ['Preparar', 'Asignar', 'Ejecutar', 'Cerrar'], relations: [{ label: 'Órdenes de servicio', route: '/app/ordenes-servicio', keys: ['mantenciones', 'proyectos'] }, { label: 'Personas', route: '/app/personas', keys: ['trabajadores'] }, { label: 'Alertas', route: '/app/alertas', keys: ['alertas', 'callouts'] }] },
  'ordenes-servicio': { icon: IconBriefcase, kicker: 'Planificación de trabajo', title: 'Órdenes de servicio', copy: 'Gestiona el ciclo de cada orden con responsables, recursos, evidencia y control de brechas.', keys: ['mantenciones', 'proyectos', 'asignaciones'], route: '/app/personas', action: 'Asignar personas', stages: ['Crear orden', 'Completar requisitos', 'Asignar recursos', 'Registrar cierre'], relations: [{ label: 'Clientes', route: '/app/clientes', keys: ['minas', 'clientes'] }, { label: 'Contratos', route: '/app/contratos', keys: ['contratos'] }, { label: 'Personas', route: '/app/personas', keys: ['trabajadores'] }] },
  'activos-inventario': { icon: IconPackage, kicker: 'Control de recursos', title: 'Activos, equipos e inventario', copy: 'Consulta existencias, custodia, movimientos y mantenimiento desde una sola vista.', keys: ['inventoryItems', 'activos', 'inventoryMovements'], route: '/app/movimientos-inventario', action: 'Ver movimientos', stages: ['Registrar', 'Ubicar', 'Asignar', 'Mantener'], relations: [{ label: 'Bodegas', route: '/app/bodegas', keys: ['bodegas'] }, { label: 'Movimientos de inventario', route: '/app/movimientos-inventario', keys: ['inventoryMovements', 'movimientosInventario'] }, { label: 'Mantenimiento', route: '/app/mantenimiento', keys: ['mantenimientos'] }, { label: 'Asignaciones y préstamos', route: '/app/asignaciones-prestamos', keys: ['asignacionesActivos', 'prestamos'] }] },
  'terceros-subcontratos': { icon: IconTruck, kicker: 'Empresas colaboradoras', title: 'Terceros y subcontratos', copy: 'Controla empresas colaboradoras, sus requisitos, personas y desempeño antes de asignarlas.', keys: ['subcontratos', 'contratistas', 'habilitaciones'], route: '/app/habilitaciones-cumplimiento', action: 'Revisar cumplimiento', stages: ['Registrar tercero', 'Validar requisitos', 'Asignar a servicio', 'Evaluar'], relations: [{ label: 'Convenios y contratos de terceros', route: '/app/contratos-convenios', keys: ['convenios'] }, { label: 'Personas de empresas colaboradoras', route: '/app/personal-empresa-servicios', keys: ['personalContratista'] }, { label: 'Habilitaciones y cumplimiento', route: '/app/habilitaciones-cumplimiento', keys: ['habilitaciones'] }, { label: 'Evaluación de desempeño', route: '/app/evaluacion-desempeno', keys: ['evaluaciones'] }] },
  auditoria: { icon: IconShieldCheck, kicker: 'Revisión de evidencia', title: 'Auditoría', copy: 'Revisa documentos y observaciones, asigna responsables y conserva la trazabilidad de cada revisión.', keys: ['auditorias', 'documentos', 'empresaDocs'], route: '/app/alertas', action: 'Ver alertas', stages: ['Revisar evidencia', 'Registrar observación', 'Corregir', 'Verificar cierre'], relations: [{ label: 'Cumplimiento corporativo', route: '/app/cumplimiento-corporativo', keys: ['empresaDocs', 'documentosEmpresa'] }, { label: 'Requisitos del cliente', route: '/app/habilitacion-cliente', keys: ['acreditacionesMandante', 'requisitosCliente'] }, { label: 'Incidentes y no conformidades', route: '/app/incidentes', keys: ['incidentes'] }] },
  reportes: { icon: IconReportAnalytics, kicker: 'Información para decidir', title: 'Reportes y analítica', copy: 'Construye vistas por cliente, contrato, orden de servicio o persona usando datos de la empresa.', keys: ['reportes', 'proyectos', 'trabajadores'], route: '/app/ordenes-servicio', action: 'Explorar órdenes', stages: ['Elegir contexto', 'Seleccionar datos', 'Revisar resultado', 'Compartir'] },
}

const queueStatus = item => {
  const text = JSON.stringify(item || {}).toLocaleLowerCase('es-CL')
  if (/vencid|rechaz|restric|bloque|no habil/.test(text)) return 'vencido'
  if (/pendiente|revision|alerta|proxim/.test(text)) return 'pendiente'
  return item?.estado || 'en_revision'
}

export default function OperationalWorkspacePage({ moduleId }) {
  const navigate = useNavigate()
  const [response, setResponse] = useState(null)
  const [loading, setLoading] = useState(true)
  const definition = definitions[moduleId]
  const load = async () => { setLoading(true); try { setResponse(await api.get('/state')) } finally { setLoading(false) } }
  useEffect(() => { load() }, [moduleId])
  const state = response?.state || response || {}
  const allRows = useMemo(() => definition.keys.flatMap(key => rows(state[key]).map(item => ({ item, key }))), [definition, state])
  const pending = allRows.filter(({ item }) => /pendiente|revision|vencid|alerta|bloquead/i.test(JSON.stringify(item))).slice(0, 5)
  const relationCount = relation => relation.keys.reduce((total, key) => total + rows(state[key]).length, 0)
  const Icon = definition.icon
  return <section className="nk-specialized-page">
    <header className="nk-module-header"><div><p className="nk-module-kicker">{definition.kicker}</p><h1>{definition.title}</h1><p>{definition.copy}</p></div><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={16}/>Actualizar</button></header>
    <section className="nk-specialized-overview"><article><Icon size={20}/><b>{loading ? '…' : allRows.length}</b><span>Registros para gestionar</span></article><article><b>{loading ? '…' : pending.length}</b><span>Requieren revisión</span></article><article><b>{definition.stages.length}</b><span>Etapas del flujo</span></article></section>
    <section className="nk-workflow-card"><div><p className="nk-module-kicker">Ruta recomendada</p><h2>Trabaja en este orden</h2><ol>{definition.stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, '0')}</span>{stage}</li>)}</ol></div><button className="nk-button nk-button-primary" onClick={() => navigate(definition.route)}>{definition.action}<IconArrowRight size={16}/></button></section>
    {definition.relations?.length > 0 && <section className="nk-context-relations" aria-label="Información relacionada"><header><div><p className="nk-module-kicker">Contexto relacionado</p><h2>Continúa desde la información vinculada</h2></div></header><div>{definition.relations.map(relation => <button type="button" key={relation.route} onClick={() => navigate(relation.route)}><b>{relationCount(relation)}</b><span>{relation.label}</span><IconArrowRight size={16} aria-hidden="true"/></button>)}</div></section>}
    <section className="nk-module-card"><div className="nk-module-card-header"><div><h2>Cola de revisión</h2><p>Prioridades detectadas en los datos vinculados a este módulo.</p></div></div>{loading ? <div className="nk-module-empty">Cargando prioridades…</div> : pending.length ? <ul className="nk-work-queue">{pending.map(({ item, key }, index) => <li key={item.id || `${key}-${index}`}><div><b>{name(item)}</b><span>{item.descripcion || item.mensaje || 'Requiere revisión y seguimiento.'}</span></div><StatusBadge value={queueStatus(item)} /></li>)}</ul> : <div className="nk-module-empty"><b>No hay prioridades detectadas</b><span>Cuando un registro quede pendiente, en revisión o con una alerta aparecerá aquí.</span></div>}</section>
    <PrivateModulePage moduleId={moduleId} />
  </section>
}
