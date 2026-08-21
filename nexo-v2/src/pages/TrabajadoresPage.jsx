import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconPlus, IconDownload, IconSearch, IconX,
  IconFilter, IconUsers, IconUserOff, IconUserCheck, IconUserCheck as IconUserAvail,
  IconChevronUp, IconChevronDown,
} from '@tabler/icons-react'
import { api } from '../services/api.js'

// ─── TOKENS ─────────────────────────────────────────────────
const T = {
  bg:    '#F4EFE3', surf:  '#FFFFFF', surf2: '#FBF9F5', line:  '#E3DED2',
  ink:   '#141A20', mut:   '#5D6B7A', sub:   '#8A96A1',
  pri:   '#2A2A8C', priD:  '#1A1A5E', graph: '#26313A',
  acc:   '#00CFC1', accT:  '#00706A',
  ok:    '#1B7F4B', okBg:  '#E6F2EB',
  warn:  '#C77700', warnBg:'#FBF1DF',
  err:   '#B3261E', errBg: '#FBE8E6',
}

// ─── HELPERS ────────────────────────────────────────────────
function diasHasta(fecha) {
  if (!fecha) return null
  return Math.floor((new Date(fecha) - new Date()) / 86400000)
}
function estadoVence(fecha) {
  if (!fecha) return null
  const d = diasHasta(fecha)
  if (d < 0)   return 'vencido'
  if (d <= 30) return 'por_vencer'
  return 'vigente'
}

// Acreditación usando workerItems (igual que Ricardo v6)
const REQUIRED_ITEMS = [
  { type:'documento',    name:'Cédula de identidad' },
  { type:'contrato',     name:'Contrato de trabajo' },
  { type:'documento',    name:'Certificado AFP' },
  { type:'documento',    name:'Certificado Fonasa/Isapre' },
  { type:'examen',       name:'Examen preocupacional' },
  { type:'curso',        name:'ODI / Derecho a Saber' },
  { type:'curso',        name:'Reglamento Interno' },
]
function acreditacionPct(t) {
  const items = t.workerItems || []
  if (!items.length) return 0
  const ok = REQUIRED_ITEMS.filter(req =>
    items.some(it =>
      it.type === req.type &&
      it.name.toLowerCase().includes(req.name.toLowerCase().split('/')[0].trim()) &&
      !(it.estado === 'rechazado') &&
      !(it.vence && diasHasta(it.vence) < 0)
    )
  ).length
  return Math.round((ok / REQUIRED_ITEMS.length) * 100)
}

function initials(nombre) {
  if (!nombre) return '?'
  const parts = nombre.trim().split(' ')
  return (parts[0]?.[0] || '') + (parts[1]?.[0] || '')
}
const AVATAR_COLORS = ['#2A2A8C','#1B7F4B','#C77700','#B3261E','#00706A','#26313A']
function avatarColor(id) {
  let h = 0
  for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

// Proyectos y contratos de un trabajador (igual que workerMantIds / workerContratoIds de Ricardo)
function workerMantIds(t, asignaciones) {
  return asignaciones.filter(a => a.trabId === t.id).map(a => a.mantId)
}
function workerContratoIds(t, asignaciones, mantenciones) {
  const mantIds = workerMantIds(t, asignaciones)
  return [...new Set(
    mantIds.map(mid => mantenciones.find(m => m.id === mid)?.contratoId).filter(Boolean)
  )]
}

// ─── SUB-COMPONENTES ────────────────────────────────────────
function BadgeDisp({ disp }) {
  const map = {
    disponible: { label:'Disponible', bg:T.okBg,   color:T.ok },
    asignado:   { label:'Asignado',   bg:'#E3E3F0', color:T.pri },
    vacaciones: { label:'Vacaciones', bg:T.warnBg,  color:T.warn },
    bloqueado:  { label:'Restringido',bg:T.errBg,   color:T.err },
  }
  const s = map[disp] || { label:disp||'—', bg:T.surf2, color:T.sub }
  return <span style={{ background:s.bg, color:s.color, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, whiteSpace:'nowrap' }}>{s.label}</span>
}

function BadgeTipo({ tipo }) {
  const fijo = tipo === 'permanente'
  return <span style={{ background:fijo?'#E3E3F0':T.warnBg, color:fijo?T.pri:T.warn, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, whiteSpace:'nowrap' }}>
    {fijo ? 'Fijo' : 'Por proyecto'}
  </span>
}

function ProgBar({ pct }) {
  const color = pct >= 85 ? T.ok : pct >= 60 ? T.warn : T.err
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
      <div style={{ width:52, height:5, borderRadius:3, background:T.line, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:3 }} />
      </div>
      <span style={{ fontSize:10, color, fontWeight:700, minWidth:28 }}>{pct}%</span>
    </div>
  )
}

function Avatar({ nombre, id }) {
  return (
    <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(id), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:10, fontWeight:800, flexShrink:0 }}>
      {initials(nombre).toUpperCase()}
    </div>
  )
}

// ─── TABS (4 tabs igual que Ricardo v6) ─────────────────────
const TABS = [
  { key:'planta',     label:'Trabajador fijo',         icon:IconUserCheck },
  { key:'esporadico', label:'Trabajador por proyecto',  icon:IconUsers },
  { key:'disponible', label:'Trabajador disponible',    icon:IconUserAvail },
  { key:'bloqueados', label:'Restringidos',             icon:IconUserOff },
]

const TAB_SUBTITULOS = {
  planta:     'trabajadores fijos',
  esporadico: 'trabajadores por proyecto',
  disponible: 'trabajadores disponibles',
  bloqueados: 'personas restringidas',
}

// ─── COLUMNAS (9 cols igual que Ricardo v6) ─────────────────
const COLS = [
  { col:'nombre',       label:'Trabajador',          w:'18%' },
  { col:'especialidad', label:'Especialidad',         w:'12%' },
  { col:'tipo',         label:'Tipo',                 w:'10%' },
  { col:'clientes',     label:'Cliente(s)',           w:'10%' },
  { col:'proyecto',     label:'Proyecto / Servicio',  w:'12%' },
  { col:'contrato',     label:'Contrato',             w:'10%' },
  { col:'disponibilidad',label:'Disp.',              w:'9%'  },
  { col:'acreditacion', label:'Acred.',               w:'9%'  },
  { col:'',             label:'',                     w:'5%'  },
]

// ─── FILTRO CALIFICACIÓN (igual que Ricardo v6) ──────────────
const CALS = [
  { value:'7', label:'A (7)'   },
  { value:'5', label:'B+ (5-6)'},
  { value:'3', label:'C (3-4)' },
  { value:'1', label:'D (1-2)' },
]

// ─── PÁGINA ─────────────────────────────────────────────────
export default function TrabajadoresPage() {
  const navigate = useNavigate()
  const [state,    setState]    = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [tab,      setTab]      = useState('planta')
  const [search,   setSearch]   = useState('')
  const [filtEsp,  setFiltEsp]  = useState('')
  const [filtDisp, setFiltDisp] = useState('')
  const [filtCal,  setFiltCal]  = useState('')
  const [filtCliente,  setFiltCliente]  = useState('')
  const [filtMant,     setFiltMant]     = useState('')
  const [filtContrato, setFiltContrato] = useState('')
  const [sortCol,  setSortCol]  = useState('nombre')
  const [sortAsc,  setSortAsc]  = useState(true)

  const loadState = () => {
    setLoading(true)
    api.get('/state').then(r => {
      setState(r?.state || r)
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => {
    loadState()
    window.addEventListener('focus', loadState)
    return () => window.removeEventListener('focus', loadState)
  }, [])

  const trabajadores  = state?.trabajadores  || []
  const clientes      = state?.minas         || []
  const mantenciones  = state?.mantenciones  || []
  const contratos     = state?.contratos     || []
  const asignaciones  = state?.asignaciones  || []

  const especialidades = useMemo(() =>
    [...new Set(trabajadores.map(t => t.especialidad).filter(Boolean))].sort()
  , [trabajadores])

  // helpers de nombres
  const clienteNombres = (t) =>
    (t.mineras || []).map(id => clientes.find(c => c.id === id)?.nombre).filter(Boolean).join(', ') || '—'
  const proyectoNombres = (t) =>
    workerMantIds(t, asignaciones).map(id => mantenciones.find(m => m.id === id)?.nombre).filter(Boolean).join(', ') || '—'
  const contratoNombres = (t) =>
    workerContratoIds(t, asignaciones, mantenciones).map(id => contratos.find(c => c.id === id)?.nombre).filter(Boolean).join(', ') || '—'

  // conteos por tab para badge
  const tabCount = (key) => {
    if (key === 'planta')     return trabajadores.filter(t => t.tipo === 'permanente' && !t.bloqueado).length
    if (key === 'esporadico') return trabajadores.filter(t => t.tipo === 'esporadico' && !t.bloqueado).length
    if (key === 'disponible') return trabajadores.filter(t => !t.bloqueado && t.disponibilidad === 'disponible').length
    return trabajadores.filter(t => t.bloqueado).length
  }

  // filtrado principal
  const filtered = useMemo(() => {
    let list = trabajadores

    // tab (igual que Ricardo v6 switchTrabTab)
    if (tab === 'planta')     list = list.filter(t => t.tipo === 'permanente' && !t.bloqueado)
    if (tab === 'esporadico') list = list.filter(t => t.tipo === 'esporadico' && !t.bloqueado)
    if (tab === 'disponible') list = list.filter(t => !t.bloqueado && t.disponibilidad === 'disponible')
    if (tab === 'bloqueados') list = list.filter(t => t.bloqueado)

    // filtros
    if (search)      list = list.filter(t => t.nombre?.toLowerCase().includes(search.toLowerCase()) || t.rut?.includes(search))
    if (filtEsp)     list = list.filter(t => t.especialidad === filtEsp)
    if (filtDisp)    list = list.filter(t => t.disponibilidad === filtDisp)
    if (filtCliente) list = list.filter(t => (t.mineras || []).includes(filtCliente))
    if (filtMant)    list = list.filter(t => workerMantIds(t, asignaciones).includes(filtMant))
    if (filtContrato)list = list.filter(t => workerContratoIds(t, asignaciones, mantenciones).includes(filtContrato))
    if (filtCal) {
      const n = parseInt(filtCal)
      list = list.filter(t =>
        n === 7 ? t.calificacion === 7 :
        n === 5 ? t.calificacion >= 5 && t.calificacion < 7 :
        n === 3 ? t.calificacion >= 3 && t.calificacion < 5 :
        t.calificacion < 3
      )
    }

    // sort (conservamos esta mejora del JSX que Ricardo no tiene)
    list = [...list].sort((a, b) => {
      let va = a[sortCol] ?? ''
      let vb = b[sortCol] ?? ''
      if (sortCol === 'acreditacion') { va = acreditacionPct(a); vb = acreditacionPct(b) }
      if (va < vb) return sortAsc ? -1 : 1
      if (va > vb) return sortAsc ? 1 : -1
      return 0
    })

    return list
  }, [trabajadores, asignaciones, mantenciones, tab, search, filtEsp, filtDisp, filtCal, filtCliente, filtMant, filtContrato, sortCol, sortAsc])

  const filtrosActivos = [search, filtEsp, filtDisp, filtCal, filtCliente, filtMant, filtContrato].filter(Boolean).length

  function toggleSort(col) {
    if (sortCol === col) setSortAsc(v => !v)
    else { setSortCol(col); setSortAsc(true) }
  }
  function SortIcon({ col }) {
    if (sortCol !== col) return <IconChevronDown size={11} style={{ opacity:0.3 }} />
    return sortAsc ? <IconChevronUp size={11} style={{ color:T.acc }} /> : <IconChevronDown size={11} style={{ color:T.acc }} />
  }
  function limpiarFiltros() {
    setSearch(''); setFiltEsp(''); setFiltDisp(''); setFiltCal('')
    setFiltCliente(''); setFiltMant(''); setFiltContrato('')
  }

  const selStyle = (active) => ({
    padding:'5px 10px', border:`1px solid ${active ? T.pri : T.line}`,
    borderRadius:7, background:active ? '#E3E3F0' : T.surf,
    color:active ? T.pri : T.mut, fontSize:12,
    fontWeight:active ? 700 : 500, cursor:'pointer', outline:'none',
  })

  if (loading) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:T.bg }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, border:`2.5px solid ${T.pri}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <span style={{ color:T.sub, fontSize:13 }}>Cargando personas…</span>
      </div>
    </div>
  )

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:T.bg, overflow:'hidden' }}>

      {/* ── ZONA 1: encabezado ── */}
      <div style={{ background:T.surf, borderBottom:`1px solid ${T.line}`, padding:'14px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
          <div>
            <h1 style={{ fontFamily:'Manrope, sans-serif', fontWeight:800, fontSize:18, color:T.ink, margin:0 }}>
              Personas
            </h1>
            <p style={{ fontSize:12, color:T.mut, margin:'3px 0 0' }}>
              {filtered.length} {TAB_SUBTITULOS[tab] || 'personas'}
              {filtrosActivos > 0 && ` · ${filtrosActivos} filtro${filtrosActivos > 1 ? 's' : ''} activo${filtrosActivos > 1 ? 's' : ''}`}
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', border:`1px solid ${T.line}`, borderRadius:8, background:T.surf, color:T.mut, fontSize:12, fontWeight:600, cursor:'pointer' }}>
              <IconDownload size={14} strokeWidth={1.8} />
              Exportar
            </button>
            <button
              onClick={() => navigate('/app/trabajadores/nuevo')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.background = T.priD}
              onMouseLeave={e => e.currentTarget.style.background = T.pri}
            >
              <IconPlus size={14} strokeWidth={2.2} />
              Nueva persona
            </button>
          </div>
        </div>

        {/* ── ZONA 2: 4 tabs (igual que Ricardo v6) ── */}
        <div style={{ display:'flex', gap:0 }}>
          {TABS.map(({ key, label, icon:Icon }) => {
            const count  = tabCount(key)
            const active = tab === key
            return (
              <button
                key={key}
                onClick={() => setTab(key)}
                style={{
                  display:'flex', alignItems:'center', gap:6,
                  padding:'8px 14px', border:'none', background:'transparent',
                  fontSize:12, fontWeight:active ? 700 : 500,
                  color:active ? T.pri : T.mut,
                  borderBottom:active ? `2px solid ${T.pri}` : '2px solid transparent',
                  marginBottom:-1, cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap',
                }}
              >
                <Icon size={13} strokeWidth={1.8} />
                {label}
                <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99, background:active ? '#E3E3F0' : T.surf2, color:active ? T.pri : T.sub }}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── ZONA 3: 7 filtros (igual que Ricardo v6) ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', padding:'8px 20px', background:T.surf2, borderBottom:`1px solid ${T.line}` }}>

        {/* búsqueda texto */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', border:`1px solid ${search ? T.pri : T.line}`, borderRadius:7, background:T.surf, flex:'1 1 150px', maxWidth:200 }}>
          <IconSearch size={13} strokeWidth={1.8} style={{ color:T.sub, flexShrink:0 }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Nombre o RUT"
            style={{ border:'none', outline:'none', fontSize:12, color:T.ink, background:'transparent', width:'100%' }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ border:'none', background:'none', cursor:'pointer', color:T.sub, padding:0, display:'flex' }}>
              <IconX size={12} />
            </button>
          )}
        </div>

        {/* especialidad */}
        <select value={filtEsp} onChange={e => setFiltEsp(e.target.value)} style={selStyle(!!filtEsp)}>
          <option value="">Especialidad</option>
          {especialidades.map(e => <option key={e} value={e}>{e}</option>)}
        </select>

        {/* disponibilidad */}
        <select value={filtDisp} onChange={e => setFiltDisp(e.target.value)} style={selStyle(!!filtDisp)}>
          <option value="">Disponibilidad</option>
          <option value="disponible">Disponible</option>
          <option value="asignado">Asignado</option>
          <option value="vacaciones">Vacaciones</option>
          <option value="bloqueado">Restringido</option>
        </select>

        {/* calificación — nuevo, igual que Ricardo v6 */}
        <select value={filtCal} onChange={e => setFiltCal(e.target.value)} style={selStyle(!!filtCal)}>
          <option value="">Calificación</option>
          {CALS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>

        {/* cliente */}
        <select value={filtCliente} onChange={e => setFiltCliente(e.target.value)} style={selStyle(!!filtCliente)}>
          <option value="">Cliente</option>
          {clientes.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>

        {/* proyecto — nuevo, igual que Ricardo v6 */}
        <select value={filtMant} onChange={e => setFiltMant(e.target.value)} style={selStyle(!!filtMant)}>
          <option value="">Proyecto / servicio</option>
          {mantenciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </select>

        {/* contrato — nuevo, igual que Ricardo v6 */}
        <select value={filtContrato} onChange={e => setFiltContrato(e.target.value)} style={selStyle(!!filtContrato)}>
          <option value="">Contrato</option>
          {contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>

        {/* limpiar */}
        {filtrosActivos > 0 && (
          <button
            onClick={limpiarFiltros}
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', border:'none', background:'none', color:T.accT, fontSize:12, fontWeight:700, cursor:'pointer', marginLeft:'auto' }}
          >
            <IconFilter size={12} />
            Limpiar ({filtrosActivos})
          </button>
        )}
      </div>

      {/* ── ZONA 4: tabla 9 columnas ── */}
      <div style={{ flex:1, overflow:'auto', padding:'0 20px 20px' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12, marginTop:10 }}>
          <thead>
            <tr style={{ background:T.graph }}>
              {COLS.map(({ col, label, w }) => (
                <th
                  key={col || 'acc'}
                  onClick={() => col && toggleSort(col)}
                  style={{
                    padding:'8px 10px', textAlign:'left', color:'#fff',
                    fontWeight:600, fontSize:11, letterSpacing:'.04em',
                    width:w, whiteSpace:'nowrap',
                    cursor:col ? 'pointer' : 'default', userSelect:'none',
                  }}
                >
                  <span style={{ display:'inline-flex', alignItems:'center', gap:4 }}>
                    {label}
                    {col && <SortIcon col={col} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ textAlign:'center', padding:'40px 0', color:T.sub, fontSize:13 }}>
                  <IconUsers size={28} strokeWidth={1.5} style={{ display:'block', margin:'0 auto 8px', color:T.line }} />
                  Sin personas para este filtro
                </td>
              </tr>
            ) : filtered.map((t, i) => {
              const pct = acreditacionPct(t)
              const bg  = i % 2 === 0 ? T.surf : T.surf2
              return (
                <tr
                  key={t.id}
                  style={{ background:bg, cursor:'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#EEF0FF'}
                  onMouseLeave={e => e.currentTarget.style.background = bg}
                  onClick={() => navigate(`/app/trabajadores/${t.id}`)}
                >
                  {/* trabajador */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}` }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <Avatar nombre={t.nombre} id={t.id} />
                      <div>
                        <div style={{ fontWeight:600, color:T.ink }}>{t.nombre}</div>
                        <div style={{ fontSize:10, color:T.sub }}>{t.rut}</div>
                      </div>
                    </div>
                  </td>

                  {/* especialidad */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}`, color:T.mut }}>
                    {t.especialidad || '—'}
                  </td>

                  {/* tipo — nuevo badge igual que Ricardo v6 */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}` }}>
                    <BadgeTipo tipo={t.tipo} />
                  </td>

                  {/* clientes */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}`, color:T.mut, fontSize:11 }}>
                    {clienteNombres(t)}
                  </td>

                  {/* proyecto — nueva columna */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}`, color:T.mut, fontSize:11 }}>
                    {proyectoNombres(t)}
                  </td>

                  {/* contrato — nueva columna */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}`, color:T.sub, fontSize:11 }}>
                    {contratoNombres(t)}
                  </td>

                  {/* disponibilidad */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}` }}>
                    {tab === 'bloqueados'
                      ? <span style={{ fontSize:11, color:T.err }}>{t.motivoBloq || 'Sin motivo'}</span>
                      : <BadgeDisp disp={t.disponibilidad} />
                    }
                  </td>

                  {/* acreditación */}
                  <td style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}` }}>
                    <ProgBar pct={pct} />
                  </td>

                  {/* acción */}
                  <td
                    style={{ padding:'9px 10px', borderBottom:`1px solid ${T.line}`, textAlign:'right' }}
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={() => navigate(`/app/trabajadores/${t.id}`)}
                      style={{ padding:'4px 10px', border:`1px solid ${T.line}`, borderRadius:6, background:T.surf, color:T.mut, fontSize:11, fontWeight:600, cursor:'pointer' }}
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
