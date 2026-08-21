import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconClock, IconPlus, IconCheck, IconX, IconAlertTriangle,
  IconUser, IconBuildingFactory2, IconCalendar, IconChartBar,
} from '@tabler/icons-react'
import { api } from '../services/api.js'

// ─── TOKENS ────────────────────────────────────────────────────────────────
const T = {
  bg: '#F4EFE3', surf: '#FFFFFF', surf2: '#FBF9F5', line: '#E3DED2',
  ink: '#141A20', mut: '#5D6B7A', sub: '#8A96A1',
  pri: '#2A2A8C', priDeep: '#1A1A5E', graphite: '#26313A',
  acc: '#00CFC1', accTxt: '#00706A',
  ok: '#1B7F4B', okBg: '#E6F2EB',
  warn: '#C77700', warnBg: '#FBF1DF',
  err: '#B3261E', errBg: '#FBE8E6',
}

const REGIMENES = ['7x7', '4x3', '5x2', '6x1', 'turno_especial']
const TURNOS    = ['día', 'noche', 'ambos']
const ASISTENCIAS = ['presente', 'ausente', 'licencia', 'permiso', 'observado']

// ─── HELPERS ────────────────────────────────────────────────────────────────
const hoy = () => new Date().toISOString().slice(0, 10)

function asistenciaBadge(val) {
  const map = {
    presente:  { bg: T.okBg,   txt: T.ok },
    ausente:   { bg: T.errBg,  txt: T.err },
    licencia:  { bg: T.warnBg, txt: T.warn },
    permiso:   { bg: T.warnBg, txt: T.warn },
    observado: { bg: '#F2F4F5', txt: T.sub },
  }
  const s = map[val] || map.observado
  return (
    <span style={{
      background: s.bg, color: s.txt,
      fontSize: 11, fontWeight: 700, padding: '2px 8px',
      borderRadius: 9, textTransform: 'capitalize',
    }}>{val || '—'}</span>
  )
}

function KPI({ value, label, color }) {
  return (
    <div style={{
      background: T.surf, border: `1px solid ${T.line}`, borderRadius: 12,
      padding: '16px 20px', flex: 1, minWidth: 120,
    }}>
      <p style={{ fontSize: 28, fontWeight: 800, color, margin: 0, fontFamily: 'Manrope, sans-serif' }}>{value}</p>
      <p style={{ fontSize: 12, color: T.mut, margin: '4px 0 0' }}>{label}</p>
    </div>
  )
}

// ─── MODAL NUEVO TURNO ──────────────────────────────────────────────────────
function ModalNuevoTurno({ trabajadores, mantenciones, onSave, onClose }) {
  const [form, setForm] = useState({
    trabId: trabajadores[0]?.id || '',
    mantId: mantenciones[0]?.id || '',
    regimen: '7x7', turno: 'día',
    fecha: hoy(), asistencia: 'presente',
    ingreso: '08:00', salida: '20:00', hh: 12,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const field = (label, children) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: T.mut, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </label>
      {children}
    </div>
  )

  const inputStyle = {
    padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${T.line}`,
    background: T.surf, color: T.ink, fontSize: 14, outline: 'none',
  }

  const selectStyle = { ...inputStyle }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{
        background: T.surf, borderRadius: 16, width: '100%', maxWidth: 520,
        maxHeight: '90vh', overflowY: 'auto', padding: 28, boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: T.ink, fontFamily: 'Manrope, sans-serif' }}>
            + Programar jornada
          </h2>
          <button onClick={onClose} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.mut }}>
            <IconX size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            {field('Trabajador',
              <select style={selectStyle} value={form.trabId} onChange={e => set('trabId', e.target.value)}>
                {trabajadores.map(t => <option key={t.id} value={t.id}>{t.nombre} · {t.especialidad}</option>)}
              </select>
            )}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            {field('Proyecto / Orden de servicio',
              <select style={selectStyle} value={form.mantId} onChange={e => set('mantId', e.target.value)}>
                {mantenciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            )}
          </div>
          {field('Régimen',
            <select style={selectStyle} value={form.regimen} onChange={e => set('regimen', e.target.value)}>
              {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
          {field('Turno',
            <select style={selectStyle} value={form.turno} onChange={e => set('turno', e.target.value)}>
              {TURNOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
          {field('Fecha',
            <input style={inputStyle} type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} />
          )}
          {field('Asistencia',
            <select style={selectStyle} value={form.asistencia} onChange={e => set('asistencia', e.target.value)}>
              {ASISTENCIAS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          )}
          {field('Ingreso',
            <input style={inputStyle} value={form.ingreso} placeholder="08:00" onChange={e => set('ingreso', e.target.value)} />
          )}
          {field('Salida',
            <input style={inputStyle} value={form.salida} placeholder="20:00" onChange={e => set('salida', e.target.value)} />
          )}
          <div style={{ gridColumn: '1 / -1' }}>
            {field('HH reales',
              <input style={{ ...inputStyle, maxWidth: 120 }} type="number" value={form.hh} onChange={e => set('hh', e.target.value)} />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8, border: `1.5px solid ${T.line}`,
            background: 'transparent', color: T.ink, fontSize: 14, cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={() => onSave(form)} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none',
            background: T.pri, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}>Guardar jornada</button>
        </div>
      </div>
    </div>
  )
}

// ─── PAGE ───────────────────────────────────────────────────────────────────
export default function TurnosPage() {
  const navigate = useNavigate()
  const [state, setState]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [tab, setTab]             = useState('jornadas')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving]       = useState(false)

  // filtros
  const [filtMant,    setFiltMant]    = useState('')
  const [filtRegimen, setFiltRegimen] = useState('')
  const [filtTurno,   setFiltTurno]   = useState('')
  const [filtMina,    setFiltMina]    = useState('')

  useEffect(() => {
    api.get('/state').then(r => {
      const s = r?.state || r
      setState(s)
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const trabajadores  = state?.trabajadores  || []
  const mantenciones  = state?.mantenciones  || []
  const minas         = state?.minas         || []
  const turnos        = state?.turnos        || []
  const asignaciones  = state?.asignaciones  || []

  // Asignaciones por orden de servicio para vista de cobertura
  const cobertura = useMemo(() => {
    const activas = mantenciones.filter(m => m.estado !== 'cerrada')
    return activas.map(m => {
      const asigs    = asignaciones.filter(a => a.mantId === m.id)
      const present  = turnos.filter(t => t.mantId === m.id && t.asistencia === 'presente').length
      const ausentes = turnos.filter(t => t.mantId === m.id && t.asistencia !== 'presente').length
      const pending  = Math.max(0, (m.personalReq || 0) - present)
      const status   = pending === 0 ? 'ok' : pending <= 2 ? 'warn' : 'err'
      return { m, asigs: asigs.length, present, ausentes, pending, status }
    })
  }, [mantenciones, asignaciones, turnos])

  // Jornadas filtradas
  const jornadasFiltradas = useMemo(() => {
    let list = [...turnos]
    if (filtMant)    list = list.filter(t => t.mantId === filtMant)
    if (filtRegimen) list = list.filter(t => t.regimen === filtRegimen)
    if (filtTurno)   list = list.filter(t => t.turno === filtTurno)
    if (filtMina) {
      const mantsCliente = mantenciones.filter(m => m.minaId === filtMina).map(m => m.id)
      list = list.filter(t => mantsCliente.includes(t.mantId))
    }
    return list
  }, [turnos, filtMant, filtRegimen, filtTurno, filtMina, mantenciones])

  const hhTotal    = jornadasFiltradas.reduce((a, t) => a + (Number(t.hh) || 0), 0)
  const presentes  = jornadasFiltradas.filter(t => t.asistencia === 'presente').length
  const ausentes   = jornadasFiltradas.filter(t => t.asistencia !== 'presente').length

  const trabNombre  = id => trabajadores.find(t => t.id === id)?.nombre || id
  const mantNombre  = id => mantenciones.find(m => m.id === id)?.nombre || id
  const minaNombre  = id => minas.find(m => m.id === id)?.nombre || id

  const handleSave = async (form) => {
    setSaving(true)
    try {
      const nuevo = { id: `turno_${Date.now()}`, ...form }
      const nuevosTurnos = [...turnos, nuevo]
      await api.put('/state/modules', {
        changes: { turnos: { version: 0, data: nuevosTurnos } },
        reason: 'Nueva jornada registrada',
      })
      setState(s => ({ ...s, turnos: nuevosTurnos }))
      setShowModal(false)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: T.bg }}>
      <div style={{ width: 28, height: 28, border: `2.5px solid ${T.pri}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // ── Estilos reutilizables ─────────────────────────────────────────────────
  const selectStyle = {
    padding: '7px 10px', borderRadius: 8, border: `1px solid ${T.line}`,
    background: T.surf, color: T.ink, fontSize: 13, cursor: 'pointer',
  }

  const thStyle = {
    padding: '10px 14px', fontSize: 12, fontWeight: 700,
    color: '#fff', background: T.graphite, textAlign: 'left',
    whiteSpace: 'nowrap',
  }

  const tdStyle = (i) => ({
    padding: '10px 14px', fontSize: 13, color: T.ink,
    background: i % 2 === 0 ? T.surf : T.surf2,
    borderBottom: `1px solid ${T.line}`,
  })

  return (
    <div style={{ padding: 24, background: T.bg, minHeight: '100%' }}>

      {/* ── ENCABEZADO ──────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: T.ink, fontFamily: 'Manrope, sans-serif' }}>
            Turnos y Asistencia
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: T.mut }}>
            Planifica cobertura, registra asistencia y controla horas hombre por orden de servicio.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            borderRadius: 8, border: 'none', background: T.pri, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
          onMouseEnter={e => e.currentTarget.style.background = T.priDeep}
          onMouseLeave={e => e.currentTarget.style.background = T.pri}
        >
          <IconPlus size={16} strokeWidth={2} />
          Programar turno
        </button>
      </div>

      {/* ── PESTAÑAS ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4, borderBottom: `2px solid ${T.line}`, marginBottom: 20 }}>
        {[
          { key: 'cobertura', label: 'Cobertura diaria' },
          { key: 'jornadas',  label: 'Registro de jornadas' },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '9px 16px', fontSize: 13, fontWeight: tab === key ? 700 : 500,
            color: tab === key ? T.pri : T.mut,
            borderBottom: tab === key ? `2px solid ${T.pri}` : '2px solid transparent',
            marginBottom: -2, border: 'none', background: 'transparent', cursor: 'pointer',
          }}>{label}</button>
        ))}
      </div>

      {/* ── TAB COBERTURA ───────────────────────────────────────────────── */}
      {tab === 'cobertura' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <KPI value={mantenciones.filter(m => m.estado !== 'cerrada').length} label="Órdenes activas" color={T.pri} />
            <KPI value={asignaciones.length} label="Personas asignadas" color={T.ok} />
            <KPI value={cobertura.filter(c => c.pending > 0).length} label="Órdenes con brecha" color={T.err} />
            <KPI value={cobertura.filter(c => c.status === 'ok').length} label="Órdenes completas" color={T.acc} />
          </div>

          {/* Tabla cobertura */}
          <div style={{ background: T.surf, borderRadius: 12, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Orden de servicio', 'Cliente', 'Asignados', 'Presentes hoy', 'Pendientes', 'Estado'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cobertura.length === 0 ? (
                  <tr><td colSpan={6} style={{ ...tdStyle(0), textAlign: 'center', color: T.sub, padding: 32 }}>
                    Sin órdenes de servicio activas
                  </td></tr>
                ) : cobertura.map(({ m, asigs, present, pending, status }, i) => {
                  const mina = minas.find(mn => mn.id === m.minaId)
                  const estadoColor = status === 'ok' ? T.ok : status === 'warn' ? T.warn : T.err
                  const estadoBg   = status === 'ok' ? T.okBg : status === 'warn' ? T.warnBg : T.errBg
                  const estadoLabel = status === 'ok' ? 'Completa' : status === 'warn' ? 'Casi completa' : 'Brecha'
                  return (
                    <tr key={m.id} style={{ cursor: 'pointer' }}
                      onMouseEnter={e => e.currentTarget.querySelectorAll('td').forEach(td => td.style.background = '#EEF0FF')}
                      onMouseLeave={e => e.currentTarget.querySelectorAll('td').forEach((td, j) => td.style.background = i % 2 === 0 ? T.surf : T.surf2)}
                    >
                      <td style={tdStyle(i)}>
                        <p style={{ margin: 0, fontWeight: 600, color: T.ink }}>{m.nombre}</p>
                        <p style={{ margin: '2px 0 0', fontSize: 11, color: T.sub }}>{m.area || '—'}</p>
                      </td>
                      <td style={tdStyle(i)}>{mina?.nombre || '—'}</td>
                      <td style={tdStyle(i)}>{asigs}</td>
                      <td style={tdStyle(i)}>{present}</td>
                      <td style={tdStyle(i)}>
                        {pending > 0
                          ? <span style={{ color: T.err, fontWeight: 700 }}>Faltan {pending}</span>
                          : <span style={{ color: T.ok }}>—</span>
                        }
                      </td>
                      <td style={tdStyle(i)}>
                        <span style={{ background: estadoBg, color: estadoColor, fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 9 }}>
                          {estadoLabel}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── TAB JORNADAS ────────────────────────────────────────────────── */}
      {tab === 'jornadas' && (
        <>
          {/* KPIs */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <KPI value={jornadasFiltradas.length} label="Jornadas" color={T.pri} />
            <KPI value={presentes} label="Presentes" color={T.ok} />
            <KPI value={hhTotal} label="HH reales" color={T.warn} />
            <KPI value={ausentes} label="Ausencias / excepciones" color={T.err} />
          </div>

          {/* Filtros */}
          <div style={{
            background: T.surf2, border: `1px solid ${T.line}`, borderRadius: 10,
            padding: '12px 16px', display: 'flex', gap: 10, flexWrap: 'wrap',
            alignItems: 'center', marginBottom: 16,
          }}>
            <select style={selectStyle} value={filtMina} onChange={e => setFiltMina(e.target.value)}>
              <option value="">Todos los clientes</option>
              {minas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <select style={selectStyle} value={filtMant} onChange={e => setFiltMant(e.target.value)}>
              <option value="">Todos los proyectos</option>
              {mantenciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
            <select style={selectStyle} value={filtRegimen} onChange={e => setFiltRegimen(e.target.value)}>
              <option value="">Todos los regímenes</option>
              {REGIMENES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <select style={selectStyle} value={filtTurno} onChange={e => setFiltTurno(e.target.value)}>
              <option value="">Todos los turnos</option>
              {TURNOS.filter(t => t !== 'ambos').map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Tabla jornadas */}
          <div style={{ background: T.surf, borderRadius: 12, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Trabajador', 'Proyecto / Servicio', 'Fecha', 'Régimen · Turno', 'Ingreso', 'Salida', 'HH reales', 'Asistencia'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {jornadasFiltradas.length === 0 ? (
                  <tr><td colSpan={8} style={{ ...tdStyle(0), textAlign: 'center', color: T.sub, padding: 40 }}>
                    <IconClock size={28} style={{ color: T.line, display: 'block', margin: '0 auto 8px' }} />
                    Sin jornadas registradas
                    <p style={{ fontSize: 12, color: T.sub, margin: '4px 0 0' }}>
                      Usa el botón "Programar turno" para agregar la primera jornada
                    </p>
                  </td></tr>
                ) : jornadasFiltradas.map((t, i) => (
                  <tr key={t.id}
                    onMouseEnter={e => e.currentTarget.querySelectorAll('td').forEach(td => td.style.background = '#EEF0FF')}
                    onMouseLeave={e => e.currentTarget.querySelectorAll('td').forEach(td => td.style.background = i % 2 === 0 ? T.surf : T.surf2)}
                  >
                    <td style={tdStyle(i)}>
                      <button onClick={() => navigate(`/app/trabajadores/${t.trabId}`)} style={{
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: T.pri, fontWeight: 600, fontSize: 13, padding: 0,
                      }}>
                        {trabNombre(t.trabId)}
                      </button>
                    </td>
                    <td style={tdStyle(i)}>{mantNombre(t.mantId)}</td>
                    <td style={{ ...tdStyle(i), whiteSpace: 'nowrap' }}>{t.fecha || '—'}</td>
                    <td style={tdStyle(i)}>
                      <span style={{ fontWeight: 600, color: T.pri }}>{t.regimen}</span>
                      <span style={{ color: T.sub, marginLeft: 6 }}>· {t.turno}</span>
                    </td>
                    <td style={tdStyle(i)}>{t.ingreso || '—'}</td>
                    <td style={tdStyle(i)}>{t.salida || '—'}</td>
                    <td style={{ ...tdStyle(i), fontWeight: 700, color: T.ink }}>{t.hh || 0}</td>
                    <td style={tdStyle(i)}>{asistenciaBadge(t.asistencia)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── MODAL ───────────────────────────────────────────────────────── */}
      {showModal && (
        <ModalNuevoTurno
          trabajadores={trabajadores}
          mantenciones={mantenciones}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
