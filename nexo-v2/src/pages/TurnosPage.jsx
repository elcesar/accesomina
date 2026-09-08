import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconClock, IconPlus, IconX } from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/turnos.css'

const REGIMENES = ['7x7', '4x3', '5x2', '6x1', 'turno_especial']
const TURNOS = ['día', 'noche', 'ambos']
const ASISTENCIAS = ['presente', 'ausente', 'licencia', 'permiso', 'observado']

const hoy = () => new Date().toISOString().slice(0, 10)

function AsistenciaBadge({ value }) {
  const classes = {
    presente: 'nk-badge-ok',
    ausente: 'nk-badge-error',
    licencia: 'nk-badge-warn',
    permiso: 'nk-badge-warn',
    observado: 'nk-badge-none',
  }
  return <span className={`nk-badge ${classes[value] || 'nk-badge-none'}`}>{value || 'Sin información'}</span>
}

function CoberturaBadge({ status }) {
  const map = {
    ok: ['Completa', 'nk-badge-ok'],
    warn: ['Casi completa', 'nk-badge-warn'],
    err: ['Brecha', 'nk-badge-error'],
  }
  const [label, cls] = map[status] || ['Sin información', 'nk-badge-none']
  return <span className={`nk-badge ${cls}`}>{label}</span>
}

function KPI({ value, label, tone = '' }) {
  return (
    <div className="nk-card nk-turnos-kpi">
      <p className={`nk-turnos-kpi-value ${tone}`}>{value}</p>
      <p className="nk-turnos-kpi-label">{label}</p>
    </div>
  )
}

function Field({ label, children, wide = false }) {
  return (
    <div className={`nk-field ${wide ? 'nk-turnos-modal-wide' : ''}`}>
      <label className="nk-label">{label}</label>
      {children}
    </div>
  )
}

function ModalNuevoTurno({ trabajadores, mantenciones, saving, onSave, onClose }) {
  const [form, setForm] = useState({
    trabId: trabajadores[0]?.id || '',
    mantId: mantenciones[0]?.id || '',
    regimen: '7x7',
    turno: 'día',
    fecha: hoy(),
    asistencia: 'presente',
    ingreso: '08:00',
    salida: '20:00',
    hh: 12,
  })

  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const canSave = form.trabId && form.mantId && form.fecha

  return (
    <div className="nk-dialog-backdrop" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className="nk-dialog" role="dialog" aria-modal="true" aria-labelledby="nuevo-turno-title">
        <div className="nk-dialog-header">
          <div>
            <h2 id="nuevo-turno-title" className="nk-dialog-title">Programar jornada</h2>
            <p className="nk-card-description">Registra la jornada de una persona dentro de su proyecto o servicio.</p>
          </div>
          <button className="nk-icon-button nk-turnos-close" type="button" onClick={onClose} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <div className="nk-dialog-body nk-turnos-modal-grid">
          <Field label="Persona" wide>
            <select className="nk-select" value={form.trabId} onChange={e => set('trabId', e.target.value)}>
              {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre} · {t.especialidad || 'Sin especialidad'}</option>)}
            </select>
          </Field>
          <Field label="Proyecto / servicio" wide>
            <select className="nk-select" value={form.mantId} onChange={e => set('mantId', e.target.value)}>
              {mantenciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </Field>
          <Field label="Régimen">
            <select className="nk-select" value={form.regimen} onChange={e => set('regimen', e.target.value)}>
              {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <Field label="Turno">
            <select className="nk-select" value={form.turno} onChange={e => set('turno', e.target.value)}>
              {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Fecha">
            <input className="nk-input" type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          </Field>
          <Field label="Asistencia">
            <select className="nk-select" value={form.asistencia} onChange={e => set('asistencia', e.target.value)}>
              {ASISTENCIAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </Field>
          <Field label="Ingreso">
            <input className="nk-input" type="time" value={form.ingreso} onChange={e => set('ingreso', e.target.value)} />
          </Field>
          <Field label="Salida">
            <input className="nk-input" type="time" value={form.salida} onChange={e => set('salida', e.target.value)} />
          </Field>
          <Field label="HH reales" wide>
            <input className="nk-input nk-turnos-modal-hh" type="number" min="0" step="0.5" value={form.hh} onChange={e => set('hh', e.target.value)} />
          </Field>
        </div>

        <div className="nk-dialog-footer">
          <button className="nk-button nk-button-secondary" type="button" onClick={onClose}>Cancelar</button>
          <button className="nk-button nk-button-primary" type="button" disabled={!canSave || saving} onClick={() => onSave(form)}>
            {saving ? 'Guardando…' : 'Guardar jornada'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function TurnosPage() {
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('jornadas')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [filtMant, setFiltMant] = useState('')
  const [filtRegimen, setFiltRegimen] = useState('')
  const [filtTurno, setFiltTurno] = useState('')
  const [filtMina, setFiltMina] = useState('')

  useEffect(() => {
    api.get('/state')
      .then(response => setState(response?.state || response))
      .catch(error => console.error('No fue posible cargar turnos', error))
      .finally(() => setLoading(false))
  }, [])

  const trabajadores = state?.trabajadores || []
  const mantenciones = state?.mantenciones || []
  const minas = state?.minas || []
  const turnos = state?.turnos || []
  const asignaciones = state?.asignaciones || []

  const cobertura = useMemo(() => {
    const activas = mantenciones.filter(m => m.estado !== 'cerrada')
    return activas.map(m => {
      const asigs = asignaciones.filter(a => a.mantId === m.id)
      const jornadasHoy = turnos.filter(t => t.mantId === m.id && t.fecha === hoy())
      const present = jornadasHoy.filter(t => t.asistencia === 'presente').length
      const ausentes = jornadasHoy.filter(t => t.asistencia && t.asistencia !== 'presente').length
      const pending = Math.max(0, (m.personalReq || 0) - present)
      const status = pending === 0 ? 'ok' : pending <= 2 ? 'warn' : 'err'
      return { m, asigs: asigs.length, present, ausentes, pending, status }
    })
  }, [mantenciones, asignaciones, turnos])

  const jornadasFiltradas = useMemo(() => {
    let list = [...turnos]
    if (filtMant) list = list.filter(t => t.mantId === filtMant)
    if (filtRegimen) list = list.filter(t => t.regimen === filtRegimen)
    if (filtTurno) list = list.filter(t => t.turno === filtTurno)
    if (filtMina) {
      const mantsCliente = mantenciones.filter(m => m.minaId === filtMina).map(m => m.id)
      list = list.filter(t => mantsCliente.includes(t.mantId))
    }
    return list
  }, [turnos, filtMant, filtRegimen, filtTurno, filtMina, mantenciones])

  const hhTotal = jornadasFiltradas.reduce((sum, turno) => sum + (Number(turno.hh) || 0), 0)
  const presentes = jornadasFiltradas.filter(t => t.asistencia === 'presente').length
  const ausentes = jornadasFiltradas.filter(t => t.asistencia !== 'presente').length
  const trabNombre = id => trabajadores.find(t => t.id === id)?.nombre || id
  const mantNombre = id => mantenciones.find(m => m.id === id)?.nombre || id

  const handleSave = async form => {
    setSaving(true)
    try {
      const nuevo = { id: `turno_${Date.now()}`, ...form, hh: Number(form.hh) || 0 }
      const nuevosTurnos = [...turnos, nuevo]
      await api.put('/state/modules', {
        changes: { turnos: { version: 0, data: nuevosTurnos } },
        reason: 'Nueva jornada registrada',
      })
      setState(current => ({ ...current, turnos: nuevosTurnos }))
      setShowModal(false)
    } catch (error) {
      console.error('No fue posible guardar la jornada', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="nk-turnos-loading"><div className="nk-turnos-spinner" aria-label="Cargando turnos" /></div>
  }

  return (
    <div className="nk-turnos-page">
      <header className="nk-turnos-head">
        <div>
          <h1 className="nk-turnos-title">Turnos y asistencia</h1>
          <p className="nk-turnos-subtitle">Planifica cobertura, registra asistencia y controla horas hombre con foco en las personas.</p>
        </div>
        <button className="nk-button nk-button-primary" type="button" onClick={() => setShowModal(true)} disabled={!trabajadores.length || !mantenciones.length}>
          <IconPlus size={16} strokeWidth={2} /> Programar turno
        </button>
      </header>

      <div className="nk-tabs" role="tablist" aria-label="Vistas de turnos">
        <button className={`nk-tab ${tab === 'cobertura' ? 'active' : ''}`} type="button" role="tab" aria-selected={tab === 'cobertura'} onClick={() => setTab('cobertura')}>Cobertura diaria</button>
        <button className={`nk-tab ${tab === 'jornadas' ? 'active' : ''}`} type="button" role="tab" aria-selected={tab === 'jornadas'} onClick={() => setTab('jornadas')}>Registro de jornadas</button>
      </div>

      <div className="nk-section">
        {tab === 'cobertura' && (
          <>
            <div className="nk-turnos-kpis">
              <KPI value={mantenciones.filter(m => m.estado !== 'cerrada').length} label="Servicios activos" />
              <KPI value={asignaciones.length} label="Personas asignadas" tone="ok" />
              <KPI value={cobertura.filter(c => c.pending > 0).length} label="Servicios con brecha" tone="error" />
              <KPI value={cobertura.filter(c => c.status === 'ok').length} label="Cobertura completa" tone="accent" />
            </div>

            <div className="nk-card nk-turnos-table-card">
              <div className="nk-table-wrapper">
                <table className="nk-table">
                  <thead><tr><th>Proyecto / servicio</th><th>Cliente</th><th>Asignados</th><th>Presentes hoy</th><th>Brecha</th><th>Estado</th></tr></thead>
                  <tbody>
                    {cobertura.length === 0 ? (
                      <tr><td colSpan={6} className="nk-turnos-empty-cell"><div className="nk-empty"><span className="nk-empty-title">Sin servicios activos</span><span className="nk-empty-description">No hay proyectos o servicios abiertos para calcular cobertura.</span></div></td></tr>
                    ) : cobertura.map(({ m, asigs, present, pending, status }) => {
                      const mina = minas.find(current => current.id === m.minaId)
                      return (
                        <tr key={m.id}>
                          <td><span className="nk-turnos-primary">{m.nombre}</span><div className="nk-turnos-sub">{m.area || 'Sin área informada'}</div></td>
                          <td>{mina?.nombre || '—'}</td>
                          <td>{asigs}</td>
                          <td>{present}</td>
                          <td>{pending > 0 ? <span className="nk-turnos-gap">Faltan {pending}</span> : <span className="nk-turnos-ok-text">Sin brecha</span>}</td>
                          <td><CoberturaBadge status={status} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {tab === 'jornadas' && (
          <>
            <div className="nk-turnos-kpis">
              <KPI value={jornadasFiltradas.length} label="Jornadas" />
              <KPI value={presentes} label="Presentes" tone="ok" />
              <KPI value={hhTotal} label="HH reales" tone="warn" />
              <KPI value={ausentes} label="Ausencias / excepciones" tone="error" />
            </div>

            <div className="nk-turnos-filters" aria-label="Filtros de jornadas">
              <select className="nk-select" value={filtMina} onChange={e => setFiltMina(e.target.value)}><option value="">Todos los clientes</option>{minas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
              <select className="nk-select" value={filtMant} onChange={e => setFiltMant(e.target.value)}><option value="">Todos los proyectos</option>{mantenciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}</select>
              <select className="nk-select" value={filtRegimen} onChange={e => setFiltRegimen(e.target.value)}><option value="">Todos los regímenes</option>{REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}</select>
              <select className="nk-select" value={filtTurno} onChange={e => setFiltTurno(e.target.value)}><option value="">Todos los turnos</option>{TURNOS.filter(t => t !== 'ambos').map(t => <option key={t} value={t}>{t}</option>)}</select>
            </div>

            <div className="nk-card nk-turnos-table-card">
              <div className="nk-table-wrapper">
                <table className="nk-table">
                  <thead><tr><th>Persona</th><th>Proyecto / servicio</th><th>Fecha</th><th>Régimen · turno</th><th>Ingreso</th><th>Salida</th><th>HH reales</th><th>Asistencia</th></tr></thead>
                  <tbody>
                    {jornadasFiltradas.length === 0 ? (
                      <tr><td colSpan={8} className="nk-turnos-empty-cell"><div className="nk-empty nk-turnos-empty"><IconClock size={28} /><span className="nk-empty-title">Sin jornadas registradas</span><span className="nk-empty-description">Programa una jornada para comenzar el registro de asistencia.</span></div></td></tr>
                    ) : jornadasFiltradas.map(t => (
                      <tr key={t.id}>
                        <td><button className="nk-turnos-person" type="button" onClick={() => navigate(`/app/trabajadores/${t.trabId}`)}>{trabNombre(t.trabId)}</button></td>
                        <td>{mantNombre(t.mantId)}</td>
                        <td className="nk-turnos-nowrap">{t.fecha || '—'}</td>
                        <td><span className="nk-turnos-primary">{t.regimen || '—'}</span> <span className="nk-turnos-sub">· {t.turno || '—'}</span></td>
                        <td>{t.ingreso || '—'}</td><td>{t.salida || '—'}</td><td className="nk-turnos-hh">{t.hh || 0}</td><td><AsistenciaBadge value={t.asistencia} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {showModal && <ModalNuevoTurno trabajadores={trabajadores} mantenciones={mantenciones} saving={saving} onSave={handleSave} onClose={() => setShowModal(false)} />}
    </div>
  )
}
