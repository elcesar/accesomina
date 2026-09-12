import { useEffect, useMemo, useState } from 'react'
import { IconCheck, IconDeviceFloppy, IconRefresh } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/configuracion.css'

const MODULE_OPTIONS = [
  ['trabajadores', 'Personas'],
  ['turnos', 'Turnos y asistencia'],
  ['epp', 'Protección personal / EPP'],
  ['mantenciones', 'Órdenes de servicio'],
  ['contratos', 'Contratos y firmas'],
  ['hoteleria', 'Alojamientos y estadías'],
  ['llamados', 'Comunicaciones y convocatorias'],
  ['vehiculos', 'Vehículos, activos y equipos'],
  ['subcontratos', 'Terceros y subcontratos'],
  ['credenciales', 'Credenciales'],
  ['incidentes', 'Incidentes y no conformidades'],
  ['auditoria', 'Auditoría'],
  ['reportes', 'Reportes y analítica'],
]

const emptyIntegration = { enabled: false, publicConfig: {}, secret: {}, configured: false }

function lineList(value) {
  return String(value || '').split(/\n|,/).map(item => item.trim()).filter(Boolean)
}

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState({
    branding: { displayName: '', theme: 'light', accent: '#2a2a8c', logoUrl: '' },
    modules: {},
    alerts: { warningDays: 30, criticalDays: 7 },
    catalogs: { specialties: [] },
  })
  const [integrations, setIntegrations] = useState({
    smtp: { ...emptyIntegration },
    whatsapp: { ...emptyIntegration },
    signature: { ...emptyIntegration },
  })

  const specialtiesText = useMemo(() => (settings.catalogs?.specialties || []).join('\n'), [settings.catalogs?.specialties])

  const load = async () => {
    setLoading(true)
    setMessage('')
    try {
      const data = await api.get('/settings')
      const current = data?.settings || {}
      setSettings({
        branding: {
          displayName: current.branding?.displayName || '',
          theme: current.branding?.theme || 'light',
          accent: current.branding?.accent || '#2a2a8c',
          logoUrl: current.branding?.logoUrl || '',
        },
        modules: current.modules || {},
        alerts: {
          warningDays: Number(current.alerts?.warningDays) || 30,
          criticalDays: Number(current.alerts?.criticalDays) || 7,
        },
        catalogs: current.catalogs || { specialties: [] },
      })
      const byProvider = Object.fromEntries((data?.integrations || []).map(item => [item.provider, item]))
      setIntegrations({
        smtp: { ...emptyIntegration, ...byProvider.smtp, publicConfig: byProvider.smtp?.public_config || byProvider.smtp?.publicConfig || {}, secret: {} },
        whatsapp: { ...emptyIntegration, ...byProvider.whatsapp, publicConfig: byProvider.whatsapp?.public_config || byProvider.whatsapp?.publicConfig || {}, secret: {} },
        signature: { ...emptyIntegration, ...byProvider.signature, publicConfig: byProvider.signature?.public_config || byProvider.signature?.publicConfig || {}, secret: {} },
      })
    } catch (error) {
      setMessage(error.message || 'No fue posible cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const saveSettings = async () => {
    if (Number(settings.alerts.criticalDays) > Number(settings.alerts.warningDays)) {
      setMessage('La alerta crítica no puede tener más días que la alerta preventiva.')
      return
    }
    setSaving('settings')
    setMessage('')
    try {
      const result = await api.put('/settings', settings)
      setSettings(current => ({ ...current, ...result }))
      setMessage('Configuración guardada correctamente.')
    } catch (error) {
      setMessage(error.message || 'No fue posible guardar la configuración.')
    } finally {
      setSaving('')
    }
  }

  const saveIntegration = async provider => {
    setSaving(provider)
    setMessage('')
    try {
      const current = integrations[provider]
      const payload = { enabled: current.enabled, publicConfig: current.publicConfig, secret: current.secret }
      const result = await api.put(`/settings/integrations/${provider}`, payload)
      setIntegrations(all => ({ ...all, [provider]: { ...all[provider], ...result, publicConfig: result.public_config || result.publicConfig || all[provider].publicConfig, secret: {} } }))
      setMessage(`Integración ${provider === 'smtp' ? 'de correo' : provider === 'whatsapp' ? 'WhatsApp' : 'de firma'} guardada.`)
    } catch (error) {
      setMessage(error.message || 'No fue posible guardar la integración.')
    } finally {
      setSaving('')
    }
  }

  const setBranding = (key, value) => setSettings(current => ({ ...current, branding: { ...current.branding, [key]: value } }))
  const setAlert = (key, value) => setSettings(current => ({ ...current, alerts: { ...current.alerts, [key]: Number(value) } }))
  const toggleModule = key => setSettings(current => ({ ...current, modules: { ...current.modules, [key]: current.modules?.[key] === false } }))
  const updateIntegration = (provider, section, key, value) => setIntegrations(current => ({ ...current, [provider]: { ...current[provider], [section]: { ...current[provider][section], [key]: value } } }))

  return (
    <section className="nk-module-page nk-config-page">
      <header className="nk-module-header">
        <div>
          <h1>Configuración de la empresa</h1>
          <p>Parámetros exclusivos de este sitio privado</p>
        </div>
        <div className="nk-config-header-actions">
          <button className="nk-button nk-button-secondary" onClick={load} disabled={loading}><IconRefresh size={16}/> Actualizar</button>
          <button className="nk-button nk-button-primary" onClick={saveSettings} disabled={loading || saving === 'settings'}><IconDeviceFloppy size={16}/> {saving === 'settings' ? 'Guardando…' : 'Guardar configuración'}</button>
        </div>
      </header>

      {message && <p className="nk-form-message">{message}</p>}

      <div className="nk-config-grid">
        <section className="nk-module-card nk-config-card">
          <header><div><h2>Identidad y alertas</h2><p>Identidad visual, ventanas de alerta y especialidades propias de la empresa.</p></div></header>
          <div className="nk-config-form-grid">
            <label className="nk-config-field full"><span>Nombre visible</span><input className="nk-input" value={settings.branding.displayName} onChange={e => setBranding('displayName', e.target.value)} /></label>
            <label className="nk-config-field"><span>Apariencia</span><select className="nk-input" value={settings.branding.theme} onChange={e => setBranding('theme', e.target.value)}><option value="light">Fondo claro</option><option value="dark">Fondo oscuro</option></select></label>
            <label className="nk-config-field"><span>Color principal</span><div className="nk-config-color"><input type="color" value={settings.branding.accent} onChange={e => setBranding('accent', e.target.value)} /><input className="nk-input" value={settings.branding.accent} onChange={e => setBranding('accent', e.target.value)} /></div></label>
            <label className="nk-config-field full"><span>Logo (URL HTTPS)</span><input className="nk-input" placeholder="https://..." value={settings.branding.logoUrl} onChange={e => setBranding('logoUrl', e.target.value)} /></label>
            <label className="nk-config-field"><span>Alerta preventiva (días)</span><input className="nk-input" type="number" min="1" max="365" value={settings.alerts.warningDays} onChange={e => setAlert('warningDays', e.target.value)} /></label>
            <label className="nk-config-field"><span>Alerta crítica (días)</span><input className="nk-input" type="number" min="1" max="365" value={settings.alerts.criticalDays} onChange={e => setAlert('criticalDays', e.target.value)} /></label>
            <label className="nk-config-field full"><span>Especialidades disponibles</span><textarea className="nk-input nk-config-textarea" value={specialtiesText} onChange={e => setSettings(current => ({ ...current, catalogs: { ...current.catalogs, specialties: lineList(e.target.value) } }))} placeholder="Una especialidad por línea" /></label>
          </div>
        </section>

        <section className="nk-module-card nk-config-card">
          <header><div><h2>Módulos habilitados</h2><p>Configuración declarativa de los módulos disponibles para esta empresa.</p></div></header>
          <div className="nk-config-modules">
            {MODULE_OPTIONS.map(([key, label]) => {
              const enabled = settings.modules?.[key] !== false
              return <label className="nk-config-module" key={key}><input type="checkbox" checked={enabled} onChange={() => toggleModule(key)} /><span className="nk-config-module-check">{enabled && <IconCheck size={14}/>}</span><span>{label}</span></label>
            })}
          </div>
          <p className="nk-config-note">Estos valores se guardan por empresa. La visibilidad efectiva también depende de los permisos del usuario.</p>
        </section>
      </div>

      <section className="nk-module-card nk-config-card nk-config-integrations">
        <header><div><h2>Integraciones privadas</h2><p>Las claves se cifran y nunca se muestran nuevamente.</p></div></header>
        <div className="nk-config-integration-grid">
          <article className="nk-config-integration">
            <div className="nk-config-integration-title"><h3>Correo SMTP</h3><span className={integrations.smtp.configured ? 'ready' : ''}>{integrations.smtp.configured ? 'Configurado' : 'Pendiente'}</span></div>
            <label className="nk-config-field"><span>Servidor SMTP</span><input className="nk-input" placeholder="smtp.empresa.cl" value={integrations.smtp.publicConfig.host || ''} onChange={e => updateIntegration('smtp', 'publicConfig', 'host', e.target.value)} /></label>
            <label className="nk-config-field"><span>Correo remitente</span><input className="nk-input" placeholder="acceso@empresa.cl" value={integrations.smtp.publicConfig.from || ''} onChange={e => updateIntegration('smtp', 'publicConfig', 'from', e.target.value)} /></label>
            <label className="nk-config-field"><span>Usuario SMTP</span><input className="nk-input" value={integrations.smtp.publicConfig.user || ''} onChange={e => updateIntegration('smtp', 'publicConfig', 'user', e.target.value)} /></label>
            <label className="nk-config-field"><span>Clave SMTP nueva</span><input className="nk-input" type="password" value={integrations.smtp.secret.password || ''} onChange={e => updateIntegration('smtp', 'secret', 'password', e.target.value)} /></label>
            <label className="nk-config-toggle"><input type="checkbox" checked={integrations.smtp.enabled} onChange={e => setIntegrations(v => ({ ...v, smtp: { ...v.smtp, enabled: e.target.checked } }))} /> Integración activa</label>
            <button className="nk-button nk-button-secondary" disabled={saving === 'smtp'} onClick={() => saveIntegration('smtp')}>{saving === 'smtp' ? 'Guardando…' : 'Guardar correo'}</button>
          </article>

          <article className="nk-config-integration">
            <div className="nk-config-integration-title"><h3>WhatsApp</h3><span className={integrations.whatsapp.configured ? 'ready' : ''}>{integrations.whatsapp.configured ? 'Configurado' : 'Pendiente'}</span></div>
            <label className="nk-config-field"><span>Phone Number ID</span><input className="nk-input" value={integrations.whatsapp.publicConfig.phoneNumberId || ''} onChange={e => updateIntegration('whatsapp', 'publicConfig', 'phoneNumberId', e.target.value)} /></label>
            <label className="nk-config-field"><span>Token WhatsApp nuevo</span><input className="nk-input" type="password" value={integrations.whatsapp.secret.token || ''} onChange={e => updateIntegration('whatsapp', 'secret', 'token', e.target.value)} /></label>
            <label className="nk-config-toggle"><input type="checkbox" checked={integrations.whatsapp.enabled} onChange={e => setIntegrations(v => ({ ...v, whatsapp: { ...v.whatsapp, enabled: e.target.checked } }))} /> Integración activa</label>
            <button className="nk-button nk-button-secondary" disabled={saving === 'whatsapp'} onClick={() => saveIntegration('whatsapp')}>{saving === 'whatsapp' ? 'Guardando…' : 'Guardar WhatsApp'}</button>
          </article>

          <article className="nk-config-integration">
            <div className="nk-config-integration-title"><h3>Firma electrónica</h3><span className={integrations.signature.configured ? 'ready' : ''}>{integrations.signature.configured ? 'Configurado' : 'Pendiente'}</span></div>
            <label className="nk-config-field"><span>URL proveedor firma</span><input className="nk-input" placeholder="https://..." value={integrations.signature.publicConfig.url || ''} onChange={e => updateIntegration('signature', 'publicConfig', 'url', e.target.value)} /></label>
            <label className="nk-config-field"><span>Token firma nuevo</span><input className="nk-input" type="password" value={integrations.signature.secret.token || ''} onChange={e => updateIntegration('signature', 'secret', 'token', e.target.value)} /></label>
            <label className="nk-config-toggle"><input type="checkbox" checked={integrations.signature.enabled} onChange={e => setIntegrations(v => ({ ...v, signature: { ...v.signature, enabled: e.target.checked } }))} /> Integración activa</label>
            <button className="nk-button nk-button-secondary" disabled={saving === 'signature'} onClick={() => saveIntegration('signature')}>{saving === 'signature' ? 'Guardando…' : 'Guardar firma'}</button>
          </article>
        </div>
      </section>
    </section>
  )
}
