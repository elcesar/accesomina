import { ActionButton } from '../components/ui/ActionButton.jsx'
import { useMemo, useState } from 'react'
import { IconDatabaseExport, IconDatabaseImport, IconDownload, IconUpload } from '@tabler/icons-react'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { api } from '../services/api.js'
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

function download(path) {
  const link = document.createElement('a')
  link.href = `/api/data-transfer${path}`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export default function ImportarExportarPage() {
  const [exportType, setExportType] = useState('backup')
  const [importType, setImportType] = useState('trabajadores')
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('append')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [issues, setIssues] = useState([])
  const [hasError, setHasError] = useState(false)
  const [confirming, setConfirming] = useState(false)

  const selectedImport = useMemo(() => TYPES.find(item => item.id === importType) || TYPES[0], [importType])
  const backupImport = importType === 'backup'

  const exportData = () => {
    setMessage('')
    download(exportType === 'backup' ? '/export' : `/export/${exportType}`)
  }

  const importData = async () => {
    if (!file) {
      setMessage(`Selecciona un archivo ${backupImport ? 'JSON' : 'CSV'} antes de importar.`)
      return
    }


    setConfirming(false)
    setSending(true)
    setMessage('')
    setIssues([])
    setHasError(false)
    try {
      if (backupImport) {
        await api.upload('/data-transfer/import/backup', file, { mode: 'replace' })
        setMessage('Respaldo restaurado correctamente.')
      } else {
        const result = await api.upload(`/data-transfer/import/${importType}`, file, { mode, ...(mode === 'replace' ? { confirmReplace: 'REEMPLAZAR' } : {}) })
        const count = result?.rows ?? result?.imported ?? result?.rowCount ?? result?.count
        setMessage(count !== undefined ? `Importación completada: ${count} ${Number(count) === 1 ? 'registro procesado' : 'registros procesados'}.` : 'Importación completada correctamente.')
      }
      setFile(null)
    } catch (error) {
      setHasError(true)
      setIssues(error?.issues || error?.metadata?.issues || [])
      setMessage(error?.message || 'No fue posible importar el archivo.')
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

      {message && <p className="nk-form-message" role={hasError ? 'alert' : 'status'} aria-live="polite">{message}</p>}

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
                <select className="nk-input" value={importType} onChange={event => { setImportType(event.target.value); setFile(null); setMessage(''); setIssues([]) }}>
                  {TYPES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
                  <option value="backup">Respaldo completo</option>
                </select>
              </label>

              <label className="nk-transfer-field">
                <span>Acción</span>
                <select className="nk-input" value={backupImport ? 'replace' : mode} disabled={backupImport} onChange={event => setMode(event.target.value)}>
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
                accept={backupImport ? '.json,application/json' : '.csv,text/csv'}
                onChange={event => { setFile(event.target.files?.[0] || null); setIssues([]); setMessage('') }}
              />
              <small id="import-file-help">{file ? file.name : `Selecciona un archivo ${backupImport ? 'JSON de respaldo' : 'CSV'}`}</small>
            </label>

            <div className="nk-transfer-panel-actions split">
              {!backupImport && (
                <button className="nk-button nk-button-secondary" onClick={() => download(`/template/${importType}`)}>
                  <IconDownload size={16}/> Descargar plantilla
                </button>
              )}
              <ActionButton disabledReason="Selecciona un archivo antes de continuar." className="nk-button nk-button-primary" disabled={sending || !file} aria-describedby={!file ? 'import-file-help' : undefined} onClick={() => backupImport || mode === 'replace' ? setConfirming(true) : importData()}>
                <IconUpload size={16}/>{sending ? 'Procesando…' : backupImport ? 'Restaurar respaldo' : 'Validar e importar'}
              </ActionButton>
            </div>

            {issues.length > 0 && <section aria-label="Errores de importación" role="region" tabIndex={0} style={{overflowX:'auto'}}>
              <p role="status">Se encontraron {issues.length} errores. Corrige el archivo y vuelve a cargarlo. No se guardó ninguna fila.</p>
              <table className="nk-table"><caption>Informe de validación del archivo</caption><thead><tr>{['Fila','Columna','Valor','Qué corregir'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{issues.map((issue,index)=><tr key={index}><td>{issue.row || 'Cabecera'}</td><th scope="row">{issue.column || 'Archivo'}</th><td>{issue.value}</td><td>{issue.message}</td></tr>)}</tbody></table>
              <button className="nk-button nk-button-secondary" type="button" onClick={() => {
                const escape = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replaceAll('"','""')}"`
                const csv = '\uFEFF' + [['Fila','Columna','Valor','Qué corregir'], ...issues.map(item=>[item.row,item.column,item.value,item.message])].map(row=>row.map(escape).join(',')).join('\r\n')
                const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); const link=document.createElement('a');link.href=url;link.download='errores_importacion.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000)
              }}>Descargar informe de errores</button>
            </section>}
            {importType === 'trabajadores' && <button className="nk-button nk-button-quiet" type="button" onClick={() => download('/instructions/trabajadores')}>Descargar instrucciones y valores admitidos</button>}
            {!backupImport && <p className="nk-transfer-hint">La plantilla seleccionada corresponde a <b>{selectedImport.label}</b>. Revisa su estructura antes de cargar información masiva.</p>}
            {backupImport && <p className="nk-transfer-hint warning">La restauración reemplaza los módulos incluidos en el respaldo y requiere confirmación.</p>}
          </div>
        </section>
      </div>
      <ConfirmDialog open={confirming} title={backupImport ? 'Restaurar respaldo' : 'Reemplazar información'} description="Esta acción reemplazará los registros actuales de los módulos incluidos. Conserva un respaldo antes de continuar." variant="danger" confirmLabel="Reemplazar" onConfirm={importData} onCancel={()=>setConfirming(false)} />
    </section>
  )
}
