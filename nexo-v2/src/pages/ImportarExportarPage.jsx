import { useMemo, useState } from 'react'
import {
  IconDatabaseExport,
  IconDatabaseImport,
  IconDownload,
  IconFileSpreadsheet,
  IconRefresh,
  IconShieldCheck,
  IconUpload,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/data-transfer.css'

const TYPES = [
  { id: 'trabajadores', label: 'Personas', group: 'Capital Humano' },
  { id: 'turnos', label: 'Turnos y asistencia', group: 'Capital Humano' },
  { id: 'epp', label: 'Entregas de EPP', group: 'Capital Humano' },
  { id: 'minas', label: 'Clientes', group: 'Relación Comercial' },
  { id: 'contratos', label: 'Contratos', group: 'Relación Comercial' },
  { id: 'mantenciones', label: 'Órdenes de servicio', group: 'Relación Comercial' },
  { id: 'oportunidades', label: 'Prospectos y oportunidades', group: 'Relación Comercial' },
  { id: 'vehiculos', label: 'Vehículos', group: 'Gestión Operacional' },
  { id: 'hoteles', label: 'Alojamientos', group: 'Gestión Operacional' },
  { id: 'credenciales', label: 'Credenciales', group: 'Gestión Operacional' },
  { id: 'subcontratos', label: 'Contratistas', group: 'Contratistas' },
  { id: 'documentos', label: 'Documentos importados', group: 'Cumplimiento' },
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
  const [tab, setTab] = useState('exportar')
  const [type, setType] = useState('trabajadores')
  const [file, setFile] = useState(null)
  const [mode, setMode] = useState('append')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')

  const selected = useMemo(() => TYPES.find(item => item.id === type) || TYPES[0], [type])
  const groups = useMemo(() => [...new Set(TYPES.map(item => item.group))], [])

  const importCsv = async () => {
    if (!file) {
      setMessage('Selecciona un archivo CSV antes de importar.')
      return
    }
    setSending(true)
    setMessage('')
    try {
      const result = await api.upload(`/data-transfer/import/${type}`, file, { mode })
      const count = result?.imported ?? result?.rowCount ?? result?.count
      setMessage(count !== undefined ? `Importación completada: ${count} registros procesados.` : 'Importación completada correctamente.')
      setFile(null)
    } catch (error) {
      setMessage(error?.message || 'No fue posible importar el archivo.')
    } finally {
      setSending(false)
    }
  }

  const restoreBackup = async () => {
    if (!file) {
      setMessage('Selecciona un archivo JSON de respaldo.')
      return
    }
    if (!window.confirm('Restaurar un respaldo reemplazará la información actual de los módulos incluidos. ¿Continuar?')) return
    setSending(true)
    setMessage('')
    try {
      await api.upload('/data-transfer/import/backup', file, { mode: 'replace' })
      setMessage('Respaldo restaurado correctamente.')
      setFile(null)
    } catch (error) {
      setMessage(error?.message || 'No fue posible restaurar el respaldo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="nk-module-page nk-transfer-page">
      <header className="nk-module-header">
        <div>
          <p className="nk-module-kicker">Gestión y administración</p>
          <h1>Importar y exportar</h1>
          <p>Transfiere datos mediante plantillas controladas o genera respaldos completos sin alterar el ownership de cada módulo.</p>
        </div>
      </header>

      {message && <p className="nk-form-message">{message}</p>}

      <div className="nk-transfer-summary nk-dashboard-grid">
        <article className="nk-dashboard-metric"><IconFileSpreadsheet size={22}/><div><b>{TYPES.length}</b><span>Tipos disponibles</span></div></article>
        <article className="nk-dashboard-metric teal"><IconDatabaseExport size={22}/><div><b>CSV</b><span>Exportación por módulo</span></div></article>
        <article className="nk-dashboard-metric amber"><IconDatabaseImport size={22}/><div><b>CSV / JSON</b><span>Formatos de importación</span></div></article>
        <article className="nk-dashboard-metric"><IconShieldCheck size={22}/><div><b>Admin</b><span>Acceso restringido</span></div></article>
      </div>

      <nav className="nk-transfer-tabs" aria-label="Opciones de transferencia">
        <button className={tab === 'exportar' ? 'active' : ''} onClick={() => { setTab('exportar'); setMessage('') }}>Exportar</button>
        <button className={tab === 'importar' ? 'active' : ''} onClick={() => { setTab('importar'); setMessage(''); setFile(null) }}>Importar</button>
        <button className={tab === 'backup' ? 'active' : ''} onClick={() => { setTab('backup'); setMessage(''); setFile(null) }}>Respaldo completo</button>
      </nav>

      {tab !== 'backup' && (
        <section className="nk-module-card nk-transfer-workspace">
          <header className="nk-transfer-head">
            <div>
              <h2>{tab === 'exportar' ? 'Exportar datos' : 'Importar datos'}</h2>
              <p>{tab === 'exportar' ? 'Descarga información de un módulo en CSV o su plantilla vacía.' : 'Carga un CSV utilizando la estructura oficial del módulo seleccionado.'}</p>
            </div>
            <span className="nk-transfer-current">{selected.group} · {selected.label}</span>
          </header>

          <div className="nk-transfer-layout">
            <aside className="nk-transfer-selector">
              {groups.map(group => (
                <div key={group}>
                  <small>{group}</small>
                  {TYPES.filter(item => item.group === group).map(item => (
                    <button key={item.id} className={item.id === type ? 'active' : ''} onClick={() => { setType(item.id); setFile(null); setMessage('') }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              ))}
            </aside>

            <div className="nk-transfer-action">
              <div className="nk-transfer-action-title">
                <IconFileSpreadsheet size={22}/>
                <div><h3>{selected.label}</h3><p>{selected.group}</p></div>
              </div>

              {tab === 'exportar' ? (
                <div className="nk-transfer-buttons">
                  <button className="nk-button nk-button-primary" onClick={() => download(`/export/${type}`)}><IconDownload size={16}/> Descargar CSV</button>
                  <button className="nk-button nk-button-secondary" onClick={() => download(`/template/${type}`)}><IconDownload size={16}/> Descargar plantilla</button>
                </div>
              ) : (
                <div className="nk-transfer-import-form">
                  <label className="nk-transfer-file">
                    <span>Archivo CSV</span>
                    <input key={`${type}-${file ? file.name : 'empty'}`} type="file" accept=".csv,text/csv" onChange={event => setFile(event.target.files?.[0] || null)} />
                    <small>{file ? file.name : 'Selecciona el archivo a cargar'}</small>
                  </label>
                  <label className="nk-transfer-mode">
                    <span>Modo de importación</span>
                    <select className="nk-input" value={mode} onChange={event => setMode(event.target.value)}>
                      <option value="append">Agregar registros</option>
                      <option value="replace">Reemplazar módulo</option>
                    </select>
                    <small>“Reemplazar módulo” elimina los registros actuales de este módulo antes de cargar el archivo.</small>
                  </label>
                  <div className="nk-transfer-buttons">
                    <button className="nk-button nk-button-secondary" onClick={() => download(`/template/${type}`)}><IconDownload size={16}/> Plantilla</button>
                    <button className="nk-button nk-button-primary" disabled={sending || !file} onClick={importCsv}><IconUpload size={16}/>{sending ? 'Importando…' : 'Importar CSV'}</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {tab === 'backup' && (
        <section className="nk-module-card nk-transfer-workspace">
          <header className="nk-transfer-head">
            <div><h2>Respaldo completo</h2><p>Exporta o restaura una copia integral de los módulos y configuración de la empresa.</p></div>
          </header>
          <div className="nk-transfer-backup-grid">
            <article>
              <IconDatabaseExport size={24}/><div><h3>Generar respaldo</h3><p>Descarga un archivo JSON con todos los módulos y configuraciones disponibles.</p></div>
              <button className="nk-button nk-button-primary" onClick={() => download('/export')}><IconDownload size={16}/> Descargar respaldo</button>
            </article>
            <article>
              <IconRefresh size={24}/><div><h3>Restaurar respaldo</h3><p>Reemplaza la información incluida en el respaldo. Esta acción requiere confirmación.</p></div>
              <label className="nk-transfer-file compact"><input key={file ? file.name : 'backup-empty'} type="file" accept=".json,application/json" onChange={event => setFile(event.target.files?.[0] || null)} /><small>{file ? file.name : 'Selecciona un respaldo JSON'}</small></label>
              <button className="nk-button nk-button-secondary" disabled={sending || !file} onClick={restoreBackup}><IconUpload size={16}/>{sending ? 'Restaurando…' : 'Restaurar respaldo'}</button>
            </article>
          </div>
        </section>
      )}
    </section>
  )
}
