import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconArrowLeft, IconUser, IconFileText, IconBook,
  IconHistory, IconShield, IconDeviceFloppy, IconLoader2,
  IconBrandWhatsapp, IconAlertTriangle,
} from '@tabler/icons-react'
import { api } from '../services/api.js'

// ─── tokens ────────────────────────────────────────────────
const T = {
  bg:'#F4EFE3', surf:'#FFFFFF', surf2:'#FBF9F5', line:'#E3DED2',
  ink:'#141A20', mut:'#5D6B7A', sub:'#8A96A1',
  pri:'#2A2A8C', priD:'#1A1A5E',
  acc:'#00CFC1', accT:'#00706A',
  ok:'#1B7F4B', okBg:'#E6F2EB',
  warn:'#C77700', warnBg:'#FBF1DF',
  err:'#B3261E', errBg:'#FBE8E6',
}

// ─── helpers ────────────────────────────────────────────────
const AVATAR_COLORS = ['#2A2A8C','#1B7F4B','#C77700','#B3261E','#00706A','#26313A']
function avatarColor(id) {
  let h = 0
  for (let i = 0; i < (id||'').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(nombre) {
  if (!nombre) return '?'
  const p = nombre.trim().split(' ')
  return ((p[0]?.[0]||'') + (p[1]?.[0]||'')).toUpperCase()
}
function diasHasta(fecha) {
  if (!fecha) return null
  return Math.floor((new Date(fecha) - new Date()) / 86400000)
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

const ESPECIALIDADES = [
  'Mecánico Industrial','Soldador 6G','Eléctrico','Instrumentista',
  'Rigger','Calderero','Operador de equipos','Prevencionista',
  'Supervisor','Técnico electrónico','Pintor industrial','Operadora',
  'Enfermero/a','Paramédico','Conductor','Administrativo','Otro',
]

// ─── sub-componentes ─────────────────────────────────────────

function Badge({ label, bg, color }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:bg, color, whiteSpace:'nowrap' }}>{label}</span>
}

function BadgeDisp({ disp }) {
  const map = {
    disponible: { label:'Disponible', bg:T.okBg,   color:T.ok },
    asignado:   { label:'Asignado',   bg:'#E3E3F0', color:T.pri },
    vacaciones: { label:'Vacaciones', bg:T.warnBg,  color:T.warn },
    bloqueado:  { label:'Bloqueado',  bg:T.errBg,   color:T.err },
  }
  const s = map[disp] || { label: disp||'—', bg:T.surf2, color:T.sub }
  return <Badge {...s} />
}

function ProgBar({ pct }) {
  const color = pct >= 85 ? T.ok : pct >= 60 ? T.warn : T.err
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, borderRadius:4, background:T.line, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width 0.3s' }} />
      </div>
      <span style={{ fontSize:12, color, fontWeight:700, minWidth:34 }}>{pct}%</span>
    </div>
  )
}

const INPUT_BASE = {
  width:'100%', padding:'8px 11px', border:`1.5px solid ${T.line}`,
  borderRadius:8, fontSize:13, color:T.ink, background:T.surf,
  outline:'none',
}

function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, color:T.sub }}>{label}</label>
      {children}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display:'flex', gap:12, padding:'9px 0', borderBottom:`1px solid ${T.line}` }}>
      <span style={{ fontSize:12, color:T.sub, width:120, flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:12, color:T.ink, fontWeight:500 }}>{value || '—'}</span>
    </div>
  )
}

// ─── TAB: Datos personales ────────────────────────────────────

function TabDatos({ t, clientes, saving, onChange, onSave }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* editar campos operacionales */}
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Datos operacionales</p>
            <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>Cargo, especialidad, disponibilidad y asignación</p>
          </div>
          <button
            onClick={onSave}
            disabled={saving}
            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}
          >
            {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconDeviceFloppy size={13} strokeWidth={2} />}
            Guardar
          </button>
        </div>
        <div style={{ padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Cargo">
            <input value={t.cargo||''} onChange={e=>onChange('cargo',e.target.value)} style={INPUT_BASE} placeholder="Cargo contractual" />
          </Field>
          <Field label="Rol operacional">
            <input value={t.rol||''} onChange={e=>onChange('rol',e.target.value)} style={INPUT_BASE} placeholder="Rol en faena" />
          </Field>
          <Field label="Especialidad">
            <select value={t.especialidad||''} onChange={e=>onChange('especialidad',e.target.value)} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              <option value="">Seleccionar</option>
              {ESPECIALIDADES.map(e=><option key={e} value={e}>{e}</option>)}
            </select>
          </Field>
          <Field label="Disponibilidad">
            <select value={t.disponibilidad||'disponible'} onChange={e=>onChange('disponibilidad',e.target.value)} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              <option value="disponible">Disponible</option>
              <option value="asignado">Asignado</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </Field>
          <Field label="Tipo de personal">
            <select value={t.tipo||'permanente'} onChange={e=>onChange('tipo',e.target.value)} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              <option value="permanente">Planta / permanente</option>
              <option value="esporadico">Esporádico por proyecto</option>
            </select>
          </Field>
          <Field label="Turno / Jornada">
            <select value={t.regimen||'5x2'} onChange={e=>onChange('regimen',e.target.value)} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              {['5x2','4x3','7x7','6x1','turno_especial'].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <div style={{ gridColumn:'1/-1' }}>
            <Field label="Minas / Clientes habilitados">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                {clientes.length === 0
                  ? <span style={{ fontSize:12, color:T.sub }}>Sin clientes configurados</span>
                  : clientes.map(m => {
                    const activo = (t.mineras||[]).includes(m.id)
                    return (
                      <label key={m.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background: activo ? '#E3E3F0' : T.surf2, border:`1px solid ${activo ? T.pri : T.line}`, cursor:'pointer', fontSize:12, fontWeight: activo ? 700 : 400, color: activo ? T.pri : T.mut }}>
                        <input
                          type="checkbox"
                          checked={activo}
                          onChange={e => {
                            const minas = t.mineras || []
                            onChange('mineras', e.target.checked ? [...minas, m.id] : minas.filter(id => id !== m.id))
                          }}
                          style={{ accentColor: T.pri }}
                        />
                        {m.nombre}
                      </label>
                    )
                  })
                }
              </div>
            </Field>
          </div>
        </div>
      </div>

      {/* datos personales (solo lectura) */}
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Datos personales</p>
        </div>
        <div style={{ padding:'0 16px' }}>
          <InfoRow label="Teléfono"   value={t.tel} />
          <InfoRow label="Correo"     value={t.email} />
          <InfoRow label="Región"     value={t.region} />
          <InfoRow label="Ciudad"     value={t.ciudad} />
          <InfoRow label="Nacimiento" value={t.nacimiento} />
          <InfoRow label="AFP"        value={t.afp} />
          <InfoRow label="Salud"      value={t.salud} />
          <InfoRow label="Mutual"     value={t.mutual} />
        </div>
      </div>
    </div>
  )
}

// ─── TAB: Documentos ─────────────────────────────────────────

const TIPOS_DOC = [
  'CI / Cédula identidad','Contrato de trabajo','Finiquito',
  'Examen preocupacional','Examen altura geográfica','Examen psicosensotécnico',
  'Curso ODI','Curso Reglamento Interno','Curso RISC','Licencia conducir',
  'Certificado AFP','Certificado salud','Certificado mutual',
  'Certificación técnica','Otro documento',
]

function TabDocumentos({ t, onAddDoc, onDelDoc }) {
  const [form, setForm] = useState({ tipo:'CI / Cédula identidad', nombre:'', vence:'', notas:'' })
  const docs = t.workerItems || []

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* cargar documento */}
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Cargar documento</p>
            <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>Alerta crítica cuando falten 7 días o esté vencido</p>
          </div>
          <button
            onClick={() => { onAddDoc(form); setForm({ tipo:'CI / Cédula identidad', nombre:'', vence:'', notas:'' }) }}
            style={{ padding:'7px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}
          >
            Guardar
          </button>
        </div>
        <div style={{ padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Tipo de documento">
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              {TIPOS_DOC.map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Nombre / referencia">
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} style={INPUT_BASE} placeholder="Ej: Examen preocupacional ACHS" />
          </Field>
          <Field label="Fecha de vencimiento">
            <input type="date" value={form.vence} onChange={e=>setForm(f=>({...f,vence:e.target.value}))} style={INPUT_BASE} />
          </Field>
          <Field label="Notas">
            <input value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} style={INPUT_BASE} placeholder="Centro médico, folio, observación…" />
          </Field>
        </div>
      </div>

      {/* lista de documentos */}
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Documentos cargados ({docs.length})</p>
        </div>
        {docs.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:T.sub, fontSize:13 }}>
            <IconFileText size={28} strokeWidth={1.3} style={{ display:'block', margin:'0 auto 8px', color:T.line }} />
            Sin documentos cargados
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:T.graph||T.surf2 }}>
                {['Tipo','Nombre','Vencimiento','Estado',''].map(h=>(
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', fontWeight:600, fontSize:11, color:T.mut, borderBottom:`1px solid ${T.line}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {docs.map((d,i)=>{
                const dias = diasHasta(d.vence)
                const estado = dias === null ? null : dias < 0 ? 'vencido' : dias <= 30 ? 'por_vencer' : 'vigente'
                const estadoMap = { vigente:{label:'Vigente',bg:T.okBg,color:T.ok}, por_vencer:{label:'Por vencer',bg:T.warnBg,color:T.warn}, vencido:{label:'Vencido',bg:T.errBg,color:T.err} }
                const s = estadoMap[estado]
                return (
                  <tr key={i} style={{ background: i%2===0 ? T.surf : T.surf2 }}>
                    <td style={{ padding:'9px 12px', borderBottom:`1px solid ${T.line}`, color:T.mut }}>{d.tipo}</td>
                    <td style={{ padding:'9px 12px', borderBottom:`1px solid ${T.line}`, fontWeight:500, color:T.ink }}>{d.nombre||'—'}</td>
                    <td style={{ padding:'9px 12px', borderBottom:`1px solid ${T.line}`, color:T.mut }}>{d.vence||'—'}</td>
                    <td style={{ padding:'9px 12px', borderBottom:`1px solid ${T.line}` }}>
                      {s ? <Badge {...s} /> : <span style={{ color:T.sub }}>—</span>}
                    </td>
                    <td style={{ padding:'9px 12px', borderBottom:`1px solid ${T.line}`, textAlign:'right' }}>
                      <button onClick={()=>onDelDoc(i)} style={{ padding:'3px 8px', border:`1px solid ${T.line}`, borderRadius:6, background:T.surf, color:T.err, fontSize:11, cursor:'pointer' }}>Eliminar</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── TAB: Cursos ─────────────────────────────────────────────

const TIPOS_CURSO = [
  'Curso ODI','Curso Reglamento Interno','Curso RISC','Manejo defensivo',
  'Trabajo en altura','Espacios confinados','Izaje','Primeros auxilios',
  'Prevención de riesgos','Otro curso',
]

function TabCursos({ t, onAddDoc, onDelDoc }) {
  const [form, setForm] = useState({ tipo:'Curso ODI', nombre:'', vence:'', notas:'' })
  const cursos = (t.workerItems||[]).filter(d=>TIPOS_CURSO.includes(d.tipo))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Registrar curso o certificación</p>
          <button onClick={()=>{ onAddDoc(form); setForm({tipo:'Curso ODI',nombre:'',vence:'',notas:''}) }} style={{ padding:'7px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Guardar</button>
        </div>
        <div style={{ padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Tipo de curso">
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              {TIPOS_CURSO.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="OTEC / Institución">
            <input value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} style={INPUT_BASE} placeholder="Nombre del organismo" />
          </Field>
          <Field label="Fecha de vencimiento">
            <input type="date" value={form.vence} onChange={e=>setForm(f=>({...f,vence:e.target.value}))} style={INPUT_BASE} />
          </Field>
          <Field label="Notas">
            <input value={form.notas} onChange={e=>setForm(f=>({...f,notas:e.target.value}))} style={INPUT_BASE} placeholder="Folio, observación…" />
          </Field>
        </div>
      </div>
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, padding:16 }}>
        <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:'0 0 12px' }}>Cursos registrados ({cursos.length})</p>
        {cursos.length === 0
          ? <p style={{ fontSize:13, color:T.sub, textAlign:'center', padding:'16px 0' }}>Sin cursos registrados</p>
          : cursos.map((c,i)=>(
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:`1px solid ${T.line}` }}>
              <div>
                <p style={{ fontSize:12, fontWeight:600, color:T.ink, margin:0 }}>{c.tipo}</p>
                <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>{c.nombre||'—'} · Vence: {c.vence||'—'}</p>
              </div>
              <button onClick={()=>onDelDoc(i)} style={{ padding:'3px 8px', border:`1px solid ${T.line}`, borderRadius:6, background:T.surf, color:T.err, fontSize:11, cursor:'pointer' }}>Eliminar</button>
            </div>
          ))
        }
      </div>
    </div>
  )
}

// ─── TAB: EPP ────────────────────────────────────────────────

function TabEPP({ t, saving, onChange, onSave }) {
  return (
    <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Tallas de EPP</p>
          <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>Para gestión de entrega de equipos de protección personal</p>
        </div>
        <button onClick={onSave} disabled={saving} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
          {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconDeviceFloppy size={13} strokeWidth={2} />}
          Guardar
        </button>
      </div>
      <div style={{ padding:16, display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
        {[
          ['eppCasco',   'Casco',                'M / 56 cm'],
          ['eppPolera',  'Polera / Camisa',       'L / XL'],
          ['eppPantalon','Pantalón',              '44 / 46'],
          ['eppZapato',  'Zapato de seguridad',   '42 / 43'],
          ['eppGuantes', 'Guantes',               'M / L'],
          ['eppChaqueta','Chaqueta / Parka',      'L / XL'],
        ].map(([key,label,ph])=>(
          <Field key={key} label={label}>
            <input
              value={t.epp?.[key.replace('epp','').toLowerCase()] || t[key] || ''}
              onChange={e=>{
                const eppKey = key.replace('epp','').toLowerCase()
                onChange('epp', { ...(t.epp||{}), [eppKey]: e.target.value })
              }}
              style={INPUT_BASE}
              placeholder={ph}
            />
          </Field>
        ))}
      </div>
    </div>
  )
}

// ─── TAB: Historial ──────────────────────────────────────────

function TabHistorial({ t, asignaciones, clientes }) {
  const asigs = (asignaciones||[]).filter(a=>a.trabId===t.id)
  return (
    <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
        <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Historial operativo</p>
      </div>
      {asigs.length === 0 ? (
        <div style={{ padding:32, textAlign:'center', color:T.sub, fontSize:13 }}>
          <IconHistory size={28} strokeWidth={1.3} style={{ display:'block', margin:'0 auto 8px', color:T.line }} />
          Sin proyectos asignados
        </div>
      ) : asigs.map((a,i)=>(
        <div key={i} style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
          <p style={{ fontSize:13, fontWeight:600, color:T.ink, margin:'0 0 4px' }}>{a.mantId}</p>
          <p style={{ fontSize:11, color:T.sub, margin:0 }}>Turno: {a.turno||'—'} · Estado: {a.estado||'—'}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Tabs nav ────────────────────────────────────────────────

const TABS = [
  { key:'datos',    label:'Datos personales',    icon: IconUser },
  { key:'docs',     label:'Documentos',          icon: IconFileText },
  { key:'cursos',   label:'Cursos y exámenes',   icon: IconBook },
  { key:'epp',      label:'EPP',                 icon: IconShield },
  { key:'historial',label:'Historial',           icon: IconHistory },
]

// ─── página principal ─────────────────────────────────────────

export default function FichaTrabajadorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stateData, setStateData] = useState(null)
  const [trabajador, setTrabajador] = useState(null)
  const [tab, setTab] = useState('datos')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [successMsg, setSuccessMsg] = useState(null)

  useEffect(() => {
    api.get('/state').then(r => {
      const s = r?.state || r
      setStateData(s)
      const t = (s?.trabajadores||[]).find(w => w.id === id)
      setTrabajador(t ? { ...t } : null)
    })
  }, [id])

  function onChange(field, value) {
    setTrabajador(t => ({ ...t, [field]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const r = await api.get('/state')
      const s = r?.state || r
      const version = r?.moduleVersions?.trabajadores ?? 0
      const lista = (s?.trabajadores||[]).map(t => t.id === id ? trabajador : t)
      await api.put('/state/modules', {
        reason: `Actualización ficha ${trabajador.nombre}`,
        changes: { trabajadores: { version, data: lista } },
      })
      setSuccessMsg('Cambios guardados')
      setTimeout(() => setSuccessMsg(null), 2500)
    } catch (e) {
      setError(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  function handleAddDoc(form) {
    const docs = [...(trabajador.workerItems||[]), { ...form, id:`d_${Date.now()}`, cargado: new Date().toISOString().split('T')[0] }]
    setTrabajador(t => ({ ...t, workerItems: docs }))
  }

  function handleDelDoc(idx) {
    const docs = (trabajador.workerItems||[]).filter((_,i)=>i!==idx)
    setTrabajador(t => ({ ...t, workerItems: docs }))
  }

  if (!trabajador) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:T.bg }}>
      <p style={{ color:T.sub, fontSize:13 }}>
        {stateData ? 'Trabajador no encontrado.' : 'Cargando…'}
      </p>
    </div>
  )

  const pct = acreditacionPct(trabajador)
  const clientes = stateData?.minas || []
  const asignaciones = stateData?.asignaciones || []

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:T.bg, overflow:'hidden' }}>

      {/* header */}
      <div style={{ background:T.surf, borderBottom:`1px solid ${T.line}`, padding:'14px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button
              onClick={()=>navigate('/app/trabajadores')}
              style={{ display:'flex', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer', color:T.mut, fontSize:13, fontWeight:600, padding:0 }}
            >
              <IconArrowLeft size={15} strokeWidth={2} />
              Trabajadores
            </button>
            <span style={{ color:T.line }}>/</span>

            {/* avatar + nombre */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:avatarColor(trabajador.id), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, flexShrink:0 }}>
                {initials(trabajador.nombre)}
              </div>
              <div>
                <p style={{ fontSize:16, fontWeight:800, color:T.ink, margin:0, fontFamily:'Manrope, sans-serif' }}>{trabajador.nombre}</p>
                <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>{trabajador.rut} · {trabajador.cargo || trabajador.especialidad || 'Sin cargo'}</p>
              </div>
            </div>
          </div>

          {/* badges + acciones */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <BadgeDisp disp={trabajador.disponibilidad} />
            <div style={{ display:'flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:99, background: pct>=85?T.okBg:pct>=60?T.warnBg:T.errBg }}>
              <span style={{ fontSize:11, fontWeight:700, color: pct>=85?T.ok:pct>=60?T.warn:T.err }}>{pct}% acreditado</span>
            </div>
            {trabajador.tel && (
              <a
                href={`https://wa.me/${(trabajador.tel||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${trabajador.nombre.split(' ')[0]}, le contacta Nexo Klar.`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'#25D366', color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none' }}
              >
                <IconBrandWhatsapp size={14} strokeWidth={2} />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* barra de acreditación */}
        <div style={{ maxWidth:320, marginBottom:12 }}>
          <ProgBar pct={pct} />
        </div>

        {/* tabs */}
        <div style={{ display:'flex' }}>
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'8px 14px', border:'none', background:'transparent',
                fontSize:12, fontWeight: tab===key ? 700 : 500,
                color: tab===key ? T.pri : T.mut,
                borderBottom: tab===key ? `2px solid ${T.pri}` : '2px solid transparent',
                marginBottom:-1, cursor:'pointer',
              }}
            >
              <Icon size={13} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* mensajes */}
      {(error || successMsg) && (
        <div style={{ padding:'10px 20px', background: error ? T.errBg : T.okBg, borderBottom:`1px solid ${error?'#F5C4C2':T.line}` }}>
          <p style={{ fontSize:13, color: error ? T.err : T.ok, margin:0, display:'flex', alignItems:'center', gap:6 }}>
            {error && <IconAlertTriangle size={14} />}
            {error || successMsg}
          </p>
        </div>
      )}

      {/* contenido del tab */}
      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        {tab==='datos'    && <TabDatos     t={trabajador} clientes={clientes} saving={saving} onChange={onChange} onSave={handleSave} />}
        {tab==='docs'     && <TabDocumentos t={trabajador} onAddDoc={handleAddDoc} onDelDoc={handleDelDoc} />}
        {tab==='cursos'   && <TabCursos     t={trabajador} onAddDoc={handleAddDoc} onDelDoc={handleDelDoc} />}
        {tab==='epp'      && <TabEPP        t={trabajador} saving={saving} onChange={onChange} onSave={handleSave} />}
        {tab==='historial'&& <TabHistorial  t={trabajador} asignaciones={asignaciones} clientes={clientes} />}
      </div>
    </div>
  )
}
