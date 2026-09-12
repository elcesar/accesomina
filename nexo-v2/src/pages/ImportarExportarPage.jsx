import { useMemo, useState } from 'react'
import { IconDatabaseExport, IconDatabaseImport, IconDownload, IconUpload } from '@tabler/icons-react'
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
  { id: 'subcontratos', label: 'Contratistas' },
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
    if (backupImport && !window.confirm('Restaurar un respaldo reemplazará la información actual de los módulos incluidos. ¿Continuar?')) return

    setSending(true)
    setMessage('')
    try {
      if (backupImport) {
        await api.upload('/data-transfer/import/backup', file, { mode: 'replace' })
        setMessage('Respaldo restaurado correctamente.')
      } else {
        const result = await api.upload(`/data-transfer/import/${importType}`, file, { mode })
        const count = result?.imported ?? result?.rowCount ?? result?.count
        setMessage(count !== undefined ? `Importación completada: ${count} registros procesados.` : 'Importación completada correctamente.')
      }
      setFile(null)
    } catch (error) {
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

      {message && <p className="nk-form-message">{message}</p>}

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
                <select className="nk-input" value={importType} onChange={event => { setImportType(event.target.value); setFile(null); setMessage('') }}>
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
                onChange={event => setFile(event.target.files?.[0] || null)}
              />
              <small>{file ? file.name : `Selecciona un archivo ${backupImport ? 'JSON de respaldo' : 'CSV'}`}</small>
            </label>

            <div className="nk-transfer-panel-actions split">
              {!backupImport && (
                <button className="nk-button nk-button-secondary" onClick={() => download(`/template/${importType}`)}>
                  <IconDownload size={16}/> Descargar plantilla
                </button>
              )}
              <button className="nk-button nk-button-primary" disabled={sending || !file} onClick={importData}>
                <IconUpload size={16}/>{sending ? 'Procesando…' : backupImport ? 'Restaurar respaldo' : 'Validar e importar'}
              </button>
            </div>

            {!backupImport && <p className="nk-transfer-hint">La plantilla seleccionada corresponde a <b>{selectedImport.label}</b>. Revisa su estructura antes de cargar información masiva.</p>}
            {backupImport && <p className="nk-transfer-hint warning">La restauración reemplaza los módulos incluidos en el respaldo y requiere confirmación.</p>}
          </div>
        </section>
      </div>
    </section>
  )
}
