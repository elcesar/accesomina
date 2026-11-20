import { ActionButton } from '../components/ui/ActionButton.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { IconDatabaseExport, IconDatabaseImport, IconDownload, IconUpload } from '@tabler/icons-react'
import { api } from '../services/api.js'
import { useSubscription } from '../services/subscription.jsx'
import { WORKER_IMPORT_GUIDE } from '../../../shared/worker-import-policy.js'
import '../styles/data-transfer.css'

const TYPES = [
  { id: 'trabajadores', label: 'Personas' },
  { id: 'turnos', label: 'Turnos y asistencia' },
  { id: 'epp', label: 'Entregas de EPP' },
  { id: 'minas', label: 'Clientes' },
  { id: 'contratos', label: 'Contratos' },
  { id: 'mantenciones', label: 'Órdenes de servicio' },
  { id: 'oportunidades', label: 'Prospectos y oportunidades' },
  { id: 'vehiculos', label: 'Vehículos' },
  { id: 'hoteles', label: 'Alojamientos' },
  { id: 'credenciales', label: 'Credenciales' },
  { id: 'subcontratos', label: 'Terceros' },
  { id: 'documentos', label: 'Documentos importados' },
]

function WorkerImportGuide() {
  return (
    <section className="nk-worker-import-guide" id="worker-import-guide" aria-labelledby="worker-import-guide-title">
      <h3 id="worker-import-guide-title">Guía de plantilla de Personas</h3>
      <p><strong>Obligatorias:</strong> <code>nombre</code> y <code>rut</code>. Las demás columnas siguen siendo opcionales para conservar archivos históricos.</p>
      <ul>
        <li><code>tipo</code>: si se informa, debe ser uno de los valores admitidos. Nunca se convierte un valor desconocido en “disponible”.</li>
        <li><code>nacimiento</code>: usa una fecha real en formato <code>AAAA-MM-DD</code>; si se informa, la persona debe tener al menos 18 años.</li>
        <li><code>region</code> y <code>comuna</code>: usa las opciones de Chile. La columna histórica <code>ciudad</code> continúa aceptándose cuando no se incluye región.</li>
        <li><code>especialidad</code>, <code>afp</code> y <code>salud</code>: cuando se informan, deben coincidir con sus listas.</li>
      </ul>
      <p className="nk-worker-import-guide-note">Una persona sin asignación inicia operativamente disponible, pero su categoría e intención de alta se conservan por separado.</p>
      <details>
        <summary>Ver valores admitidos</summary>
        <div className="nk-worker-import-guide-catalogs">
          <section>
            <h4>Tipo</h4>
            <ul>{WORKER_IMPORT_GUIDE.types.map(type => <li key={type.value}><code>{type.value}</code> · {type.label}. Alias: {type.aliases.filter(alias => alias !== type.value).join(', ') || 'sin alias'}.</li>)}</ul>
          </section>
          <section>
            <h4>Especialidad</h4>
            <ul>{WORKER_IMPORT_GUIDE.specialties.map(item => <li key={item.value}>{item.value}</li>)}</ul>
          </section>
          <section>
            <h4>AFP</h4>
            <ul>{WORKER_IMPORT_GUIDE.afps.map(item => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h4>Previsión de salud</h4>
            <ul>{WORKER_IMPORT_GUIDE.healthPlans.map(item => <li key={item}>{item}</li>)}</ul>
          </section>
          <section>
            <h4>Región</h4>
            <ul>{WORKER_IMPORT_GUIDE.regions.map(item => <li key={item}>{item}</li>)}</ul>
          </section>
        </div>
      </details>
    </section>
  )
}

function download(path) {
  const link = document.createElement('a')
  link.href = `/api/data-transfer${path}`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function csvCell(value) {
  const raw = String(value ?? '')
  const protectedValue = /^\s*[=+@-]/u.test(raw) ? `'${raw}` : raw
  const escaped = protectedValue.replaceAll('"', '""')
  return `"${escaped}"`
}

function downloadIssueReport(issues, totalIssues, truncated) {
  const rows = [
    ['Fila', 'Columna', 'Valor', 'Problema', 'Qué corregir', 'Código'],
    ...(truncated ? [['Aviso', '', '', `El informe se limitó a los primeros ${issues.length} errores; corrige los mostrados y vuelve a validar para revisar los restantes.`, 'Corrige los errores mostrados y vuelve a validar el archivo.', 'REPORT_TRUNCATED']] : []),
    ...issues.map(issue => [
      issue.row == null ? 'Archivo' : issue.row,
      issue.column || 'archivo',
      issue.value || '',
      issue.message || '',
      issue.suggestion || '',
      issue.code || '',
    ]),
  ]
  const csv = '\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = 'informe-validacion-importacion.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
}

export default function ImportarExportarPage() {
  const { summary } = useSubscription()
  const [exportType, setExportType] = useState('backup')
  const [importType, setImportType] = useState('trabajadores')
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('append')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [messageKind, setMessageKind] = useState('')
  const [issues, setIssues] = useState([])
  const [totalIssues, setTotalIssues] = useState(0)
  const [truncated, setTruncated] = useState(false)
  const [outcome, setOutcome] = useState('')
  const [reportRevision, setReportRevision] = useState(0)
  const validationRef = useRef(null)

  const selectedImport = useMemo(() => TYPES.find(item => item.id === importType) || TYPES[0], [importType])
  const backupImport = importType === 'backup'
  const separateService = importType === 'oportunidades' && summary?.separateServices?.oportunidades
  const separateAllowed = separateService?.enabled && (!separateService.endsAt || Date.parse(separateService.endsAt) > Date.now())
  const importBlocked = summary?.managed && summary.canOperate === false && !separateAllowed
  const blockedReason = 'Tu plan está suspendido o pendiente de activación. Puedes exportar tu información y gestionar el plan antes de importar.'

  const clearImportFeedback = () => {
    setMessage('')
    setMessageKind('')
    setIssues([])
    setTotalIssues(0)
    setTruncated(false)
    setOutcome('')
  }

  useEffect(() => {
    if (!issues.length) return
    const frame = window.requestAnimationFrame(() => validationRef.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [issues.length, reportRevision])

  const exportData = () => {
    clearImportFeedback()
    download(exportType === 'backup' ? '/export' : `/export/${exportType}`)
  }

  const importData = async () => {
    if (sending || importBlocked) {
      if (importBlocked) {
        clearImportFeedback()
        setMessage(blockedReason)
        setMessageKind('error')
      }
      return
    }
    if (!file) {
      clearImportFeedback()
      setMessage(`Selecciona un archivo ${backupImport ? 'JSON' : 'CSV'} antes de importar.`)
      setMessageKind('error')
      return
    }
    if (backupImport && !window.confirm('Restaurar un respaldo reemplazará la información actual de los módulos incluidos. ¿Continuar?')) return

    setSending(true)
    clearImportFeedback()
    try {
      if (backupImport) {
        await api.upload('/data-transfer/import/backup', file, { mode: 'replace' })
        setMessage('Respaldo restaurado correctamente.')
      } else {
        const result = await api.upload(`/data-transfer/import/${importType}`, file, { mode })
        const count = result?.imported ?? result?.rows ?? result?.rowCount ?? result?.count
        if (count !== undefined) {
          const noun = Number(count) === 1 ? 'registro' : 'registros'
          const singular = Number(count) === 1
          const verb = mode === 'append' ? (singular ? 'agregó' : 'agregaron') : (singular ? 'reemplazó' : 'reemplazaron')
          setMessage(`Importación completada: se ${verb} ${count} ${noun}.`)
        } else {
          setMessage('Importación completada correctamente.')
        }
      }
      setMessageKind('success')
      setFile(null)
    } catch (error) {
      const reported = Array.isArray(error?.issues)
        ? error.issues
        : Array.isArray(error?.metadata?.issues)
          ? error.metadata.issues
          : []
      const reportedTotal = Number.isInteger(error?.totalIssues)
        ? error.totalIssues
        : Number.isInteger(error?.metadata?.totalIssues)
          ? error.metadata.totalIssues
          : reported.length
      const reportTruncated = Boolean(error?.truncated ?? error?.metadata?.truncated)
      const confirmedNoWrites = error?.persisted === false || error?.metadata?.persisted === false

      setIssues(reported)
      if (reported.length) setReportRevision(revision => revision + 1)
      setTotalIssues(reportedTotal)
      setTruncated(reportTruncated)
      setMessageKind('error')

      if (error?.code === 'SUBSCRIPTION_WORKER_LIMIT') {
        const detail = error.metadata?.details || error.metadata || error
        const additional = Math.max(0, Number(detail.requested || 0) - Number(detail.used || 0))
        const noWriteNotice = confirmedNoWrites ? ' No se guardó ningún registro de la carga.' : ''
        setMessage(`Tu plan permite registrar hasta ${Number(detail.available || 0)} trabajadores adicionales. Esta carga requiere ${additional} nuevos cupos.${noWriteNotice} Revisa tu plan antes de volver a importar.`)
      } else {
        setMessage(error?.message || 'No fue posible importar el archivo.')
      }

      if (confirmedNoWrites) setOutcome('not-persisted')
      else if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) setOutcome('rejected')
      else setOutcome('unknown')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="nk-module-page nk-transfer-page">
      <header className="nk-module-header">
        <div>
          <h1>Importar y exportar</h1>
          <p>Respaldo empresarial y carga masiva validada.</p>
        </div>
      </header>

      {message && <p className={`nk-form-message nk-transfer-feedback ${messageKind ? `is-${messageKind}` : ''}`} role={messageKind === 'error' ? 'alert' : 'status'} aria-live="polite">{message}</p>}
      {outcome === 'not-persisted' && <p className="nk-transfer-outcome" role="status">No se guardó ningún registro: corrige el archivo y vuelve a validarlo.</p>}
      {outcome === 'rejected' && <p className="nk-transfer-outcome" role="status">La solicitud fue rechazada. Revisa los datos mostrados antes de volver a intentarlo.</p>}
      {outcome === 'unknown' && <p className="nk-transfer-outcome" role="status">No se pudo confirmar si la importación se completó. Revisa los registros antes de volver a intentarlo para evitar duplicados.</p>}
      {summary?.managed && summary.capacity && <p>{summary.capacity.used} de {summary.capacity.total} trabajadores registrados; {summary.capacity.available} cupos disponibles.</p>}
      {importBlocked && <p role="status">{blockedReason}</p>}

      <div className="nk-transfer-grid">
        <section className="nk-module-card nk-transfer-panel">
          <header className="nk-transfer-panel-head">
            <span className="nk-transfer-panel-icon"><IconDatabaseExport size={20}/></span>
            <div>
              <h2>Exportar información</h2>
              <p>Descarga un respaldo completo o la información de un módulo específico.</p>
            </div>
          </header>

          <div className="nk-transfer-panel-body">
            <label className="nk-transfer-field">
              <span>Contenido</span>
              <select className="nk-input" value={exportType} onChange={event => setExportType(event.target.value)}>
                <option value="backup">Respaldo completo</option>
                {TYPES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
              <small>{exportType === 'backup' ? 'Genera un archivo JSON con todos los módulos y configuraciones disponibles.' : 'Genera un archivo CSV con los registros actuales del módulo seleccionado.'}</small>
            </label>

            <div className="nk-transfer-panel-actions">
              <button className="nk-button nk-button-primary" onClick={exportData}>
                <IconDownload size={16}/> Descargar archivo
              </button>
            </div>
          </div>
        </section>

        <section className="nk-module-card nk-transfer-panel">
          <header className="nk-transfer-panel-head">
            <span className="nk-transfer-panel-icon teal"><IconDatabaseImport size={20}/></span>
            <div>
              <h2>Importar datos masivos</h2>
              <p>Carga información usando las plantillas oficiales y reglas de validación del sistema.</p>
            </div>
          </header>

          <div className="nk-transfer-panel-body">
            <div className="nk-transfer-form-grid">
              <label className="nk-transfer-field">
                <span>Tipo de archivo</span>
                <select className="nk-input" value={importType} disabled={sending} onChange={event => { setImportType(event.target.value); setFile(null); clearImportFeedback() }}>
                  {TYPES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  <option value="backup">Respaldo completo</option>
                </select>
              </label>

              <label className="nk-transfer-field">
                <span>Acción</span>
                <select className="nk-input" value={backupImport ? 'replace' : mode} disabled={backupImport || sending || importBlocked} onChange={event => setMode(event.target.value)}>
                  <option value="append">Agregar registros</option>
                  <option value="replace">Reemplazar módulo</option>
                </select>
              </label>
            </div>

            <label className="nk-transfer-field nk-transfer-file-field">
              <span>Archivo</span>
              <input
                key={`${importType}-${file ? file.name : 'empty'}`}
                type="file"
                disabled={sending || importBlocked}
                accept={backupImport ? '.json,application/json' : '.csv,text/csv'}
                aria-describedby={importType === 'trabajadores' ? 'import-file-help worker-import-guide' : 'import-file-help'}
                onChange={event => { setFile(event.target.files?.[0] || null); clearImportFeedback() }}
              />
              <small id="import-file-help">{file ? file.name : `Selecciona un archivo ${backupImport ? 'JSON de respaldo' : 'CSV'}`}</small>
            </label>

            <div className="nk-transfer-panel-actions split">
              {!backupImport && (
                <button className="nk-button nk-button-secondary" onClick={() => download(`/template/${importType}`)}>
                  <IconDownload size={16}/> Descargar plantilla
                </button>
              )}
              <ActionButton disabledReason={importBlocked ? blockedReason : sending ? 'Espera mientras se procesa la importación.' : 'Selecciona un archivo antes de continuar.'} className="nk-button nk-button-primary" disabled={sending || !file || importBlocked} onClick={importData}>
                <IconUpload size={16}/>{sending ? 'Procesando…' : backupImport ? 'Restaurar respaldo' : 'Validar e importar'}
              </ActionButton>
            </div>

            {!backupImport && importType === 'trabajadores' && <WorkerImportGuide />}

            {issues.length > 0 && (
              <section className="nk-import-report" ref={validationRef} tabIndex="-1" aria-labelledby="import-report-title">
                <h3 id="import-report-title">Informe de validación</h3>
                <p role="status">
                  {truncated
                    ? `El informe es parcial: se muestran los primeros ${issues.length} errores. Corrige los mostrados y vuelve a validar el archivo para revisar los restantes.`
                    : totalIssues === 1 ? 'Se encontró 1 error.' : `Se encontraron ${totalIssues} errores.`}
                  {!truncated && (outcome === 'not-persisted' ? ' No se guardó ningún registro.' : ' Corrige el archivo antes de volver a intentarlo.')}
                </p>
                <div className="nk-import-report-table">
                  <table className="nk-table">
                    <caption>Errores encontrados en el archivo cargado</caption>
                    <thead>
                      <tr>
                        <th scope="col">Fila</th>
                        <th scope="col">Columna</th>
                        <th scope="col">Valor</th>
                        <th scope="col">Problema y corrección</th>
                      </tr>
                    </thead>
                    <tbody>
                      {issues.map((issue, index) => (
                        <tr key={`${issue.row ?? 'archivo'}-${issue.column ?? 'archivo'}-${index}`}>
                          <td>{issue.row == null ? 'Archivo' : `Fila ${issue.row}`}</td>
                          <td>{issue.column || 'archivo'}</td>
                          <td>{issue.value || '—'}</td>
                          <td>
                            <span className="nk-import-report-problem">{issue.message || 'Revisa este dato.'}</span>
                            {issue.suggestion && <span className="nk-import-report-suggestion">{issue.suggestion}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button className="nk-button nk-button-secondary" type="button" onClick={() => downloadIssueReport(issues, totalIssues, truncated)}>
                  <IconDownload size={16}/> Descargar informe de errores
                </button>
              </section>
            )}

            {!backupImport && <p className="nk-transfer-hint">La plantilla seleccionada corresponde a <b>{selectedImport.label}</b>. Revisa su estructura antes de cargar información masiva.</p>}
            {backupImport && <p className="nk-transfer-hint warning">La restauración reemplaza los módulos incluidos en el respaldo y requiere confirmación.</p>}
          </div>
        </section>
      </div>
    </section>
  )
}
