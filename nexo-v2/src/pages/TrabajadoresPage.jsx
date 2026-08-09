import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconPlus, IconDownload, IconSearch, IconX,
  IconFilter, IconUsers, IconUserOff, IconUserCheck,
  IconChevronUp, IconChevronDown,
} from '@tabler/icons-react'
import { api } from '../services/api.js'

// ─── tokens ────────────────────────────────────────────────
const T = {
  bg:    '#F4EFE3', surf:  '#FFFFFF', surf2: '#FBF9F5', line:  '#E3DED2',
  ink:   '#141A20', mut:   '#5D6B7A', sub:   '#8A96A1',
  pri:   '#2A2A8C', priD:  '#1A1A5E', graph: '#26313A',
  acc:   '#00CFC1', accT:  '#00706A',
  ok:    '#1B7F4B', okBg:  '#E6F2EB',
  warn:  '#C77700', warnBg:'#FBF1DF',
  err:   '#B3261E', errBg: '#FBE8E6',
}

// ─── helpers ────────────────────────────────────────────────
function diasHasta(fecha) {
  if (!fecha) return null
  const diff = Math.floor((new Date(fecha) - new Date()) / 86400000)
  return diff
}

function estadoVence(fecha) {
  if (!fecha) return null
  const d = diasHasta(fecha)
  if (d < 0)  return 'vencido'
  if (d <= 30) return 'por_vencer'
  return 'vigente'
}

function acreditacionPct(t) {
  const checks = [
    t.docCI?.vence, t.docContrato?.vence, t.docAFP?.vence,
    t.docSalud?.vence, t.exPreocupacional?.vence, t.curODI?.vence,
    t.curReglamento?.fecha,
  ].filter(Boolean)
  if (!checks.length) return 0
  const ok = checks.filter(v => diasHasta(v) >= 0).length
  return Math.round((ok / checks.length) * 100)
}

function proxVence(t) {
  const fechas = [
    t.docCI?.vence, t.docContrato?.vence, t.docAFP?.vence,
    t.docSalud?.vence, t.exPreocupacional?.vence, t.curODI?.vence,
  ].filter(Boolean).map(f => new Date(f)).filter(d => !isNaN(d))
  if (!fechas.length) return null
  const min = new Date(Math.min(...fechas))
  return min.toISOString().split('T')[0]
}

function initials(nombre) {
  if (!nombre) return '?'
  const parts = nombre.trim().split(' ')
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
}

const AVATAR_COLORS = [
  '#2A2A8C','#1B7F4B','#C77700','#B3261E','#00706A',
  '#26313A','#4A3C8C','#0F6E56','#8C3A1B',
]
function avatarColor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// ─── sub-componentes ────────────────────────────────────────

function Badge({ estado }) {
  const map = {
    vigente:    { label: 'Vigente',    bg: T.okBg,   color: T.ok },
    por_vencer: { label: 'Por vencer', bg: T.warnBg, color: T.warn },
    vencido:    { label: 'Vencido',    bg: T.errBg,  color: T.err },
  }
  const s = map[estado] || { label: '—', bg: T.surf2, color: T.sub }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700,
      padding: '2px 7px', borderRadius: 99,
      whiteSpace: 'nowrap',
    }}>{s.label}</span>
  )
}

function BadgeDisp({ disp }) {
  const map = {
    disponible: { label: 'Disponible', bg: T.okBg,   color: T.ok },
    asignado:   { label: 'Asignado',   bg: '#E3E3F0', color: T.pri },
    vacaciones: { label: 'Vacaciones', bg: T.warnBg,  color: T.warn },
    bloqueado:  { label: 'Bloqueado',  bg: T.errBg,   color: T.err },
  }
  const s = map[disp] || { label: disp || '—', bg: T.surf2, color: T.sub }
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 10, fontWeight: 700,
      padding: '2px 7px', borderRadius: 99,
    }}>{s.label}</span>
  )
}

function ProgBar({ pct }) {
  const color = pct >= 85 ? T.ok : pct >= 60 ? T.warn : T.err
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 52, height: 5, borderRadius: 3, background: T.line, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color, fontWeight: 700, minWidth: 28 }}>{pct}%</span>
    </div>
  )
}

function Avatar({ nombre, id }) {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%',
      background: avatarColor(id),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: 10, fontWeight: 800, flexShrink: 0,
    }}>
      {initials(nombre).toUpperCase()}
    </div>
  )
}

function EmptyState({ tab }) {
  const msg = {
    planta:     'No hay personal de planta registrado.',
    esporadico: 'No hay trabajadores en el pool esporádico.',
    bloqueados: 'No hay trabajadores no habilitados.',
  }
  return (
    <tr>
      <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: T.sub, fontSize: 13 }}>
        <IconUsers size={28} strokeWidth={1.5} style={{ display: 'block', margin: '0 auto 8px', color: T.line }} />
        {msg[tab] || 'Sin resultados.'}
      </td>
    </tr>
  )
}

// ─── página principal ────────────────────────────────────────

const TABS = [
  { key: 'planta',     label: 'Personal planta',  icon: IconUserCheck },
  { key: 'esporadico', label: 'Pool esporádico',  icon: IconUsers },
  { key: 'bloqueados', label: 'No habilitados',   icon: IconUserOff },
]

export default function TrabajadoresPage() {
  const navigate = useNavigate()
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('planta')
  const [search, setSearch] = useState('')
  const [filtEsp, setFiltEsp] = useState('')
  const [filtDisp, setFiltDisp] = useState('')
  const [filtCliente, setFiltCliente] = useState('')
  const [sortCol, setSortCol] = useState('nombre')
  const [sortAsc, setSortAsc] = useState(true)

  useEffect(() => {
    api.get('/state').then(r => {
      setState(r.data?.state || r.data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const trabajadores = state?.trabajadores || []
  const clientes     = state?.minas        || []

  // especialidades únicas
  const especialidades = useMemo(() =>
    [...new Set(trabajadores.map(t => t.especialidad).filter(Boolean))].sort()
  , [trabajadores])

  // filtros + tab
  const filtered = useMemo(() => {
    let list = trabajadores

    if (tab === 'planta')     list = list.filter(t => t.tipo === 'permanente' && !t.bloqueado)
    if (tab === 'esporadico') list = list.filter(t => t.tipo === 'esporadico' && !t.bloqueado)
    if (tab === 'bloqueados') list = list.filter(t => t.bloqueado)

    if (search)     list = list.filter(t =>
      t.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      t.rut?.includes(search)
    )
    if (filtEsp)    list = list.filter(t => t.especialidad === filtEsp)
    if (filtDisp)   list = list.filter(t => t.disponibilidad === filtDisp)
    if (filtCliente) list = list.filter(t => (t.mineras || []).includes(filtCliente))

    // sort
    list = [...list].sort((a, b) => {
      let va = a[sortCol] ?? ''
      let vb = b[sortCol] ?? ''
      if (sortCol === 'acreditacion') { va = acreditacionPct(a); vb = acreditacionPct(b) }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [trabajadores, tab, search, filtEsp, filtDisp, filtCliente, sortCol, sortAsc])

  const filtrosActivos = [search, filtEsp, filtDisp, filtCliente].filter(Boolean).length

  function toggleSort(col) {
    if (sortCol === col) setSortAsc(v => !v)
    else { setSortCol(col); setSortAsc(true) }
  }

  function SortIcon({ col }) {
    if (sortCol !== col) return <IconChevronDown size={11} style={{ opacity: 0.3 }} />
    return sortAsc
      ? <IconChevronUp size={11} style={{ color: T.acc }} />
      : <IconChevronDown size={11} style={{ color: T.acc }} />
  }

  function limpiarFiltros() {
    setSearch(''); setFiltEsp(''); setFiltDisp(''); setFiltCliente('')
  }

  if (loading) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg }}>
      <span style={{ color: T.sub, fontSize: 13 }}>Cargando trabajadores…</span>
    </div>
  )

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>

      {/* ── ZONA 1: encabezado ── */}
      <div style={{ background: T.surf, borderBottom: `1px solid ${T.line}`, padding: '14px 20px 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div>
            <h1 style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 18, color: T.ink, margin: 0 }}>
              Trabajadores
            </h1>
            <p style={{ fontSize: 12, color: T.mut, margin: '3px 0 0' }}>
              {filtered.length} {tab === 'planta' ? 'de planta' : tab === 'esporadico' ? 'esporádicos' : 'no habilitados'}
              {filtrosActivos > 0 && ` · ${filtrosActivos} filtro${filtrosActivos > 1 ? 's' : ''} activo${filtrosActivos > 1 ? 's' : ''}`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', border: `1px solid ${T.line}`, borderRadius: 8, background: T.surf, color: T.mut, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              <IconDownload size={14} strokeWidth={1.8} />
              Exportar
            </button>
            <button
              onClick={() => navigate('/app/trabajadores/nuevo')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: 'none', borderRadius: 8, background: T.pri, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = T.priD}
              onMouseLeave={e => e.currentTarget.style.background = T.pri}
            >
              <IconPlus size={14} strokeWidth={2.2} />
              Trabajador
            </button>
          </div>
        </div>

        {/* ── ZONA 2: tabs ── */}
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = key === 'planta'
              ? trabajadores.filter(t => t.tipo === 'permanente' && !t.bloqueado).length
              : key === 'esporadico'
              ? trabajadores.filter(t => t.tipo === 'esporadico' && !t.bloqueado).length
              : trabajadores.filter(t => t.bloqueado).length
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 14px', border: 'none', background: 'transparent',
                  fontSize: 12, fontWeight: active ? 700 : 500,
                  color: active ? T.pri : T.mut,
                  borderBottom: active ? `2px solid ${T.pri}` : '2px solid transparent',
                  marginBottom: -1, cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                <Icon size={13} strokeWidth={1.8} />
                {label}
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                  background: active ? '#E3E3F0' : T.surf2,
                  color: active ? T.pri : T.sub,
                }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── ZONA 3: filtros ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        padding: '8px 20px', background: T.surf2, borderBottom: `1px solid ${T.line}`,
      }}>
        {/* búsqueda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', border: `1px solid ${T.line}`, borderRadius: 7, background: T.surf, flex: '1 1 160px', maxWidth: 200 }}>
          <IconSearch size={13} strokeWidth={1.8} style={{ color: T.sub, flexShrink: 0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nombre o RUT"
            style={{ border: 'none', outline: 'none', fontSize: 12, color: T.ink, background: 'transparent', width: '100%' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.sub, padding: 0, display: 'flex' }}>
              <IconX size={12} />
            </button>
          )}
        </div>

        {/* especialidad */}
        <select
          value={filtEsp}
          onChange={e => setFiltEsp(e.target.value)}
          style={{ padding: '5px 10px', border: `1px solid ${filtEsp ? T.pri : T.line}`, borderRadius: 7, background: filtEsp ? '#E3E3F0' : T.surf, color: filtEsp ? T.pri : T.mut, fontSize: 12, fontWeight: filtEsp ? 700 : 500, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Especialidad</option>
          {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        {/* disponibilidad */}
        <select
          value={filtDisp}
          onChange={e => setFiltDisp(e.target.value)}
          style={{ padding: '5px 10px', border: `1px solid ${filtDisp ? T.pri : T.line}`, borderRadius: 7, background: filtDisp ? '#E3E3F0' : T.surf, color: filtDisp ? T.pri : T.mut, fontSize: 12, fontWeight: filtDisp ? 700 : 500, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Disponibilidad</option>
          <option value="disponible">Disponible</option>
          <option value="asignado">Asignado</option>
          <option value="vacaciones">Vacaciones</option>
        </select>

        {/* cliente */}
        <select
          value={filtCliente}
          onChange={e => setFiltCliente(e.target.value)}
          style={{ padding: '5px 10px', border: `1px solid ${filtCliente ? T.pri : T.line}`, borderRadius: 7, background: filtCliente ? '#E3E3F0' : T.surf, color: filtCliente ? T.pri : T.mut, fontSize: 12, fontWeight: filtCliente ? 700 : 500, cursor: 'pointer', outline: 'none' }}
        >
          <option value="">Cliente</option>
          {clientes.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>

        {/* limpiar */}
        {filtrosActivos > 0 && (
          <button
            onClick={limpiarFiltros}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', border: 'none', background: 'none', color: T.accT, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginLeft: 'auto' }}
          >
            <IconFilter size={12} />
            Limpiar ({filtrosActivos})
          </button>
        )}
      </div>

      {/* ── ZONA 4: tabla ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 10 }}>
          <thead>
            <tr style={{ background: T.graph }}>
              {[
                { col: 'nombre',       label: 'Trabajador',    w: '22%' },
                { col: 'especialidad', label: 'Especialidad',  w: '16%' },
                { col: 'disponibilidad',label:'Disponibilidad',w: '12%' },
                { col: 'cliente',      label: 'Cliente',       w: '16%' },
                { col: 'acreditacion', label: 'Acreditación',  w: '13%' },
                { col: 'proxVence',    label: 'Próx. vence',   w: '11%' },
                { col: '',             label: '',              w: '10%' },
              ].map(({ col, label, w }) => (
                <th
                  key={col || 'acc'}
                  onClick={() => col && toggleSort(col)}
                  style={{
                    padding: '8px 10px', textAlign: 'left', color: '#fff',
                    fontWeight: 600, fontSize: 11, letterSpacing: '.04em',
                    width: w, whiteSpace: 'nowrap',
                    cursor: col ? 'pointer' : 'default',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                    {label}
                    {col && <SortIcon col={col} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <EmptyState tab={tab} />
            ) : filtered.map((t, i) => {
              const pct = acreditacionPct(t)
              const pv  = proxVence(t)
              const estPv = estadoVence(pv)
              const clienteNombre = clientes.find(m => (t.mineras || []).includes(m.id))?.nombre

              return (
                <tr
                  key={t.id}
                  style={{ background: i % 2 === 0 ? T.surf : T.surf2, cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEF0FF'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? T.surf : T.surf2}
                  onClick={() => navigate(`/app/trabajadores/${t.id}`)}
                >
                  {/* trabajador */}
                  <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.line}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar nombre={t.nombre} id={t.id} />
                      <div>
                        <div style={{ fontWeight: 600, color: T.ink }}>{t.nombre}</div>
                        <div style={{ fontSize: 10, color: T.sub }}>{t.rut}</div>
                      </div>
                    </div>
                  </td>

                  {/* especialidad */}
                  <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.line}`, color: T.mut }}>
                    {t.especialidad || '—'}
                  </td>

                  {/* disponibilidad */}
                  <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.line}` }}>
                    {tab === 'bloqueados'
                      ? <span style={{ fontSize: 11, color: T.err }}>{t.motivoBloq || 'Sin motivo'}</span>
                      : <BadgeDisp disp={t.disponibilidad} />
                    }
                  </td>

                  {/* cliente */}
                  <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.line}`, color: T.mut, fontSize: 11 }}>
                    {clienteNombre || '—'}
                  </td>

                  {/* acreditación */}
                  <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.line}` }}>
                    <ProgBar pct={pct} />
                  </td>

                  {/* próx vence */}
                  <td style={{ padding: '9px 10px', borderBottom: `1px solid ${T.line}` }}>
                    {pv ? <Badge estado={estPv} /> : <span style={{ color: T.sub, fontSize: 11 }}>—</span>}
                  </td>

                  {/* acciones */}
                  <td
                    style={{ padding: '9px 10px', borderBottom: `1px solid ${T.line}`, textAlign: 'right' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => navigate(`/app/trabajadores/${t.id}`)}
                      style={{ padding: '4px 10px', border: `1px solid ${T.line}`, borderRadius: 6, background: T.surf, color: T.mut, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = T.pri; e.currentTarget.style.color = T.pri }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = T.line; e.currentTarget.style.color = T.mut }}
                    >
                      Ficha
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
