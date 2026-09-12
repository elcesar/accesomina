import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/audit-log.css'

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

function actionLabel(value = '') {
  const labels = {
    'tenant.created': 'Empresa creada',
    'session.login': 'Inicio de sesión',
    'session.logout': 'Cierre de sesión',
    'user.created': 'Usuario creado',
    'user.updated': 'Usuario actualizado',
    'user.password_reset_by_company_admin': 'Acceso restablecido',
    'user.mfa_reset_by_admin': 'MFA restablecido',
    'user.password_changed': 'Contraseña modificada',
    'user.mfa_enabled': 'MFA activado',
    'user.mfa_disabled': 'MFA desactivado',
  }
  return labels[value] || value.replaceAll('.', ' · ')
}

function entityLabel(value = '') {
  const labels = {
    tenant: 'Empresa',
    session: 'Sesión',
    user: 'Usuario',
  }
  return labels[value] || value || '—'
}

function changedSummary(row) {
  const before = row.old_value && typeof row.old_value === 'object' ? row.old_value : null
  const after = row.new_value && typeof row.new_value === 'object' ? row.new_value : null

  if (!before && !after) return 'Evento registrado'
  if (!before && after) return Object.keys(after).slice(0, 3).join(', ') || 'Registro creado'
  if (before && !after) return 'Registro actualizado'

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])]
  const changed = keys.filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
  return changed.slice(0, 3).join(', ') || 'Sin cambios de campos visibles'
}

export default function BitacoraCambiosPage() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadAudit = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.get('/audit?limit=200')
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.message || 'No fue posible cargar la bitácora.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadAudit() }, [loadAudit])

  const total = rows.length
  const users = useMemo(() => new Set(rows.map(row => row.user_email || row.user_name).filter(Boolean)).size, [rows])

  return (
    <section className="nk-module-page nk-audit-page">
      <header className="nk-module-header">
        <div>
          <h1>Bitácora de cambios</h1>
          <p>Quién cambió qué, cuándo y dentro de la empresa actual.</p>
        </div>
        <button className="nk-button nk-button-secondary" onClick={loadAudit} disabled={loading}>
          <IconRefresh size={16}/>{loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      {error && <p className="nk-form-message">{error}</p>}

      <section className="nk-module-card nk-audit-card">
        <header className="nk-audit-card-head">
          <div>
            <h2>Eventos de seguridad y operación</h2>
            <p>Los eventos productivos se almacenan en el servidor y no pueden editarse ni eliminarse.</p>
          </div>
          <div className="nk-audit-meta">
            <span>{total} eventos</span>
            <span>{users} usuarios</span>
          </div>
        </header>

        <div className="nk-audit-table-wrap">
          <table className="nk-audit-table">
            <thead>
              <tr>
                <th>Fecha y hora</th>
                <th>Usuario</th>
                <th>Evento</th>
                <th>Entidad</th>
                <th>Detalle</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr><td colSpan="5" className="nk-audit-empty">Cargando eventos…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan="5" className="nk-audit-empty">No hay eventos registrados.</td></tr>
              ) : rows.map(row => (
                <tr key={row.id}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>
                    <strong>{row.user_name || row.user_email || 'Sistema'}</strong>
                    {row.user_name && row.user_email && <small>{row.user_email}</small>}
                  </td>
                  <td><span className="nk-audit-action">{actionLabel(row.action)}</span></td>
                  <td>
                    <strong>{entityLabel(row.entity_type)}</strong>
                    {row.entity_id && <small>{row.entity_id}</small>}
                  </td>
                  <td>{changedSummary(row)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
