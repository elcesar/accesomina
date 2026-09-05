import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowRight, IconBriefcase, IconClipboardCheck, IconPackage, IconRefresh, IconReportAnalytics, IconShieldCheck, IconTruck } from '@tabler/icons-react'
import PrivateModulePage from './PrivateModulePage.jsx'
import { api } from '../../services/api.js'

const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []
const name = item => item?.nombre || item?.title || item?.codigo || item?.id || 'Registro operativo'
const definitions = {
  'centro-operativo': { icon: IconClipboardCheck, kicker: 'Vista de ejecución', title: 'Centro operativo', copy: 'Reúne el estado de las órdenes, las asignaciones y los pendientes antes de iniciar el trabajo.', keys: ['proyectos', 'mantenciones', 'asignaciones'], route: '/app/ordenes-servicio', action: 'Revisar órdenes', stages: ['Preparar', 'Asignar', 'Ejecutar', 'Cerrar'] },
  'ordenes-servicio': { icon: IconBriefcase, kicker: 'Planificación de trabajo', title: 'Órdenes de servicio', copy: 'Gestiona el ciclo de cada orden con responsables, recursos, evidencia y control de brechas.', keys: ['mantenciones', 'proyectos', 'asignaciones'], route: '/app/personas', action: 'Asignar personas', stages: ['Crear orden', 'Completar requisitos', 'Asignar recursos', 'Registrar cierre'] },
  'activos-inventario': { icon: IconPackage, kicker: 'Control de recursos', title: 'Activos, equipos e inventario', copy: 'Consulta existencias, custodia, movimientos y mantenimiento desde una sola vista.', keys: ['inventoryItems', 'activos', 'inventoryMovements'], route: '/app/movimientos-inventario', action: 'Ver movimientos', stages: ['Registrar', 'Ubicar', 'Asignar', 'Mantener'] },
  'terceros-subcontratos': { icon: IconTruck, kicker: 'Empresas colaboradoras', title: 'Terceros y subcontratos', copy: 'Controla empresas colaboradoras, sus requisitos, personas y desempeño antes de asignarlas.', keys: ['subcontratos', 'contratistas', 'habilitaciones'], route: '/app/habilitaciones-cumplimiento', action: 'Revisar cumplimiento', stages: ['Registrar tercero', 'Validar requisitos', 'Asignar a servicio', 'Evaluar'] },
  auditoria: { icon: IconShieldCheck, kicker: 'Revisión de evidencia', title: 'Auditoría', copy: 'Revisa documentos y observaciones, asigna responsables y conserva la trazabilidad de cada revisión.', keys: ['auditorias', 'documentos', 'empresaDocs'], route: '/app/alertas', action: 'Ver alertas', stages: ['Revisar evidencia', 'Registrar observación', 'Corregir', 'Verificar cierre'] },
  reportes: { icon: IconReportAnalytics, kicker: 'Información para decidir', title: 'Reportes y analítica', copy: 'Construye vistas por cliente, contrato, orden de servicio o persona usando datos de la empresa.', keys: ['reportes', 'proyectos', 'trabajadores'], route: '/app/ordenes-servicio', action: 'Explorar órdenes', stages: ['Elegir contexto', 'Seleccionar datos', 'Revisar resultado', 'Compartir'] },
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
  const Icon = definition.icon
  return <section className="nk-specialized-page">
    <header className="nk-module-header"><div><p className="nk-module-kicker">{definition.kicker}</p><h1>{definition.title}</h1><p>{definition.copy}</p></div><button className="nk-button nk-button-secondary" onClick={load}><IconRefresh size={16}/>Actualizar</button></header>
    <section className="nk-specialized-overview"><article><Icon size={20}/><b>{loading ? '…' : allRows.length}</b><span>Registros para gestionar</span></article><article><b>{loading ? '…' : pending.length}</b><span>Requieren revisión</span></article><article><b>{definition.stages.length}</b><span>Etapas del flujo</span></article></section>
    <section className="nk-workflow-card"><div><p className="nk-module-kicker">Ruta recomendada</p><h2>Trabaja en este orden</h2><ol>{definition.stages.map((stage, index) => <li key={stage}><span>{String(index + 1).padStart(2, '0')}</span>{stage}</li>)}</ol></div><button className="nk-button nk-button-primary" onClick={() => navigate(definition.route)}>{definition.action}<IconArrowRight size={16}/></button></section>
    <section className="nk-module-card"><div className="nk-module-card-header"><div><h2>Cola de revisión</h2><p>Prioridades detectadas en los datos vinculados a este módulo.</p></div></div>{loading ? <div className="nk-module-empty">Cargando prioridades…</div> : pending.length ? <ul className="nk-work-queue">{pending.map(({ item, key }, index) => <li key={item.id || `${key}-${index}`}><b>{name(item)}</b><span>{item.estado || item.descripcion || 'Requiere revisión'}</span></li>)}</ul> : <div className="nk-module-empty"><b>No hay prioridades detectadas</b><span>Cuando un registro quede pendiente, en revisión o con una alerta aparecerá aquí.</span></div>}</section>
    <PrivateModulePage moduleId={moduleId} />
  </section>
}
