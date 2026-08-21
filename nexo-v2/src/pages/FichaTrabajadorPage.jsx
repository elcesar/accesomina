import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  IconArrowLeft, IconUser, IconFileText, IconBook,
  IconHistory, IconShield, IconDeviceFloppy, IconLoader2,
  IconBrandWhatsapp, IconAlertTriangle, IconCheck, IconX,
  IconPaperclip, IconBed, IconPlus, IconTrash,
} from '@tabler/icons-react'
import { api } from '../services/api.js'

// ─── TOKENS ─────────────────────────────────────────────────
const T = {
  bg:'#F4EFE3', surf:'#FFFFFF', surf2:'#FBF9F5', line:'#E3DED2',
  ink:'#141A20', mut:'#5D6B7A', sub:'#8A96A1',
  pri:'#2A2A8C', priD:'#1A1A5E', graph:'#26313A',
  acc:'#00CFC1', accT:'#00706A',
  ok:'#1B7F4B', okBg:'#E6F2EB',
  warn:'#C77700', warnBg:'#FBF1DF',
  err:'#B3261E', errBg:'#FBE8E6',
}

// ─── CONSTANTES ──────────────────────────────────────────────
const ITEM_TYPES = {
  documento:    'Documento trabajador',
  examen:       'Examen médico',
  curso:        'Curso / capacitación',
  certificacion:'Certificación técnica',
  contrato:     'Contrato / anexo',
  cv:           'Currículum / antecedentes',
}

const REQUIRED_ITEMS = [
  { type:'documento',    name:'Cédula de identidad' },
  { type:'contrato',     name:'Contrato de trabajo' },
  { type:'contrato',     name:'Anexo de faena' },
  { type:'documento',    name:'Certificado AFP' },
  { type:'documento',    name:'Certificado AFC' },
  { type:'documento',    name:'Certificado Fonasa/Isapre' },
  { type:'examen',       name:'Examen preocupacional' },
  { type:'curso',        name:'ODI / Derecho a Saber' },
  { type:'curso',        name:'Reglamento Interno' },
  { type:'documento',    name:'CV actualizado' },
]

const REQUIRED_BY_SPECIALTY = {
  'Eléctrico':            [{ type:'curso', name:'Arc Flash' }, { type:'certificacion', name:'Certificación eléctrica' }],
  'Instrumentista':       [{ type:'curso', name:'LOTO / Bloqueo y Etiquetado' }],
  'Mecánico Industrial':  [{ type:'curso', name:'LOTO / Bloqueo y Etiquetado' }],
  'Soldador 6G':          [{ type:'curso', name:'Trabajos en caliente' }, { type:'certificacion', name:'Calificación soldador 6G' }],
  'Rigger':               [{ type:'certificacion', name:'Certificación Rigger' }, { type:'curso', name:'Izaje de cargas' }],
  'Maestro Andamios':     [{ type:'curso', name:'Trabajo en altura física' }],
}

const ESPECIALIDADES = [
  'Mecánico Industrial','Soldador 6G','Eléctrico','Instrumentista',
  'Rigger','Calderero','Maestro Andamios','Operador de equipos',
  'Prevencionista','Supervisor','Técnico electrónico','Pintor industrial',
  'Operadora','Enfermero/a','Paramédico','Conductor','Administrativo','Otro',
]

// ─── HELPERS ────────────────────────────────────────────────
const AVATAR_COLORS = ['#2A2A8C','#1B7F4B','#C77700','#B3261E','#00706A','#26313A']
function avatarColor(id) {
  let h = 0
  for (let i = 0; i < (id||'').length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffff
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}
function initials(n) {
  const p = (n||'').trim().split(' ')
  return ((p[0]?.[0]||'') + (p[1]?.[0]||'')).toUpperCase()
}
function diasHasta(f) {
  if (!f) return null
  return Math.floor((new Date(f) - new Date()) / 86400000)
}
function itemValid(item) {
  if (!item) return false
  if (item.estado === 'rechazado') return false
  if (item.vence && diasHasta(item.vence) < 0) return false
  return true
}
function matchItem(item, req) {
  return item.type === req.type &&
    item.name.toLowerCase().includes(req.name.toLowerCase().split('/')[0].trim())
}
function getRequiredItems(t) {
  const extra = REQUIRED_BY_SPECIALTY[t.especialidad] || []
  return [...REQUIRED_ITEMS, ...extra]
}
function reqStatus(t, req) {
  const items = t.workerItems || []
  const item = items.find(it => matchItem(it, req))
  if (item) return itemValid(item)
    ? { ok: true, src: 'cargado', vence: item.vence }
    : { ok: false, src: 'vencido/rechazado', vence: item.vence }
  return { ok: false, src: 'faltante', vence: null }
}
function acreditacionPct(t) {
  const reqs = getRequiredItems(t)
  if (!reqs.length) return 0
  return Math.round(reqs.filter(r => reqStatus(t, r).ok).length / reqs.length * 100)
}

// ─── SUB-COMPONENTES ─────────────────────────────────────────
function Badge({ label, bg, color }) {
  return <span style={{ fontSize:10, fontWeight:700, padding:'2px 8px', borderRadius:99, background:bg, color }}>{label}</span>
}
function BadgeDisp({ disp }) {
  const map = {
    disponible: { label:'Disponible', bg:T.okBg,   color:T.ok },
    asignado:   { label:'Asignado',   bg:'#E3E3F0', color:T.pri },
    vacaciones: { label:'Vacaciones', bg:T.warnBg,  color:T.warn },
    bloqueado:  { label:'Bloqueado',  bg:T.errBg,   color:T.err },
  }
  const s = map[disp] || { label:disp||'—', bg:T.surf2, color:T.sub }
  return <Badge {...s} />
}
function ProgBar({ pct }) {
  const color = pct >= 85 ? T.ok : pct >= 60 ? T.warn : T.err
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ flex:1, height:6, borderRadius:4, background:T.line, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4 }} />
      </div>
      <span style={{ fontSize:12, color, fontWeight:700, minWidth:34 }}>{pct}%</span>
    </div>
  )
}
const INPUT_BASE = {
  width:'100%', padding:'8px 11px', border:`1.5px solid ${T.line}`,
  borderRadius:8, fontSize:13, color:T.ink, background:T.surf, outline:'none',
}
function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11, fontWeight:700, color:T.sub }}>{label}</label>
      {children}
    </div>
  )
}
function CardSection({ title, subtitle, action, children }) {
  return (
    <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>{title}</p>
          {subtitle && <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      <div style={{ padding:16 }}>{children}</div>
    </div>
  )
}

const BTN_SAVE = ({ saving, onClick }) => (
  <button onClick={onClick} disabled={saving} style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
    {saving ? <IconLoader2 size={13} className="animate-spin" /> : <IconDeviceFloppy size={13} strokeWidth={2} />}
    Guardar
  </button>
)

// ─── TAB: Datos personales ───────────────────────────────────
function TabDatos({ t, clientes, proyectos, contratos, asignaciones, saving, onChange, onSave, onAsignar, onRetirar }) {
  const [filtContrato, setFiltContrato] = useState('')
  const [filtProyecto, setFiltProyecto] = useState('')

  const proyectosFiltrados = filtContrato
    ? proyectos.filter(p => p.contratoId === filtContrato)
    : proyectos

  const asigs = asignaciones.filter(a => a.trabId === t.id)

  function clienteDeProyecto(mantId) {
    const p = proyectos.find(m => m.id === mantId)
    return clientes.find(c => c.id === p?.minaId)?.nombre || '—'
  }
  function contratoDeProyecto(mantId) {
    const p = proyectos.find(m => m.id === mantId)
    return contratos.find(c => c.id === p?.contratoId)?.nombre || '—'
  }
  function proyectoNombre(mantId) {
    return proyectos.find(m => m.id === mantId)?.nombre || mantId
  }

  return (
    <div>
      {/* 1 — Asignación a contrato/proyecto (igual que Ricardo v6) */}
      <CardSection
        title="Asignación a contrato y proyecto"
        subtitle="Agrega o mueve personal de planta y spot sin perder sus documentos"
      >
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto', gap:12, alignItems:'end', marginBottom:16 }}>
          <Field label="Contrato">
            <select value={filtContrato} onChange={e => setFiltContrato(e.target.value)} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              <option value="">Seleccionar contrato…</option>
              {contratos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </Field>
          <Field label="Proyecto / servicio">
            <select value={filtProyecto} onChange={e => setFiltProyecto(e.target.value)} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              <option value="">Primero selecciona contrato</option>
              {proyectosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <Field label="Turno">
            <select id="asig-turno-nuevo" style={{ ...INPUT_BASE, cursor:'pointer' }}>
              <option value="día">Día</option>
              <option value="noche">Noche</option>
              <option value="ambos">Ambos</option>
            </select>
          </Field>
          <button
            onClick={() => {
              const turno = document.getElementById('asig-turno-nuevo')?.value || 'día'
              if (filtProyecto) onAsignar(filtProyecto, turno)
            }}
            style={{ padding:'8px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}
          >
            <IconPlus size={13} strokeWidth={2} style={{ marginRight:4, verticalAlign:'middle' }} />
            Asignar
          </button>
        </div>

        {/* tabla asignaciones activas */}
        {asigs.length === 0 ? (
          <p style={{ fontSize:13, color:T.sub, margin:0 }}>Sin asignaciones activas</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:T.graph }}>
                {['Cliente','Contrato','Proyecto','Turno',''].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#fff', fontWeight:600, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {asigs.map((a, i) => (
                <tr key={a.id||i} style={{ background: i%2===0 ? T.surf : T.surf2 }}>
                  <td style={{ padding:'8px 12px', color:T.ink }}>{clienteDeProyecto(a.mantId)}</td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{contratoDeProyecto(a.mantId)}</td>
                  <td style={{ padding:'8px 12px', fontWeight:600, color:T.ink }}>{proyectoNombre(a.mantId)}</td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{a.turno||'—'}</td>
                  <td style={{ padding:'8px 12px', textAlign:'right' }}>
                    <button
                      onClick={() => onRetirar(a.mantId)}
                      style={{ padding:'3px 8px', border:`1px solid ${T.line}`, borderRadius:6, background:T.surf, color:T.err, fontSize:11, cursor:'pointer' }}
                    >
                      Retirar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardSection>

      {/* 2 — Datos personales */}
      <CardSection
        title="Datos personales"
        subtitle="Información de contacto y previsión"
        action={<BTN_SAVE saving={saving} onClick={onSave} />}
      >
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Teléfono">
            <input value={t.tel||''} onChange={e=>onChange('tel',e.target.value)} style={INPUT_BASE} placeholder="+56 9 XXXX XXXX" />
          </Field>
          <Field label="Correo electrónico">
            <input type="email" value={t.email||''} onChange={e=>onChange('email',e.target.value)} style={INPUT_BASE} placeholder="correo@email.com" />
          </Field>
          <Field label="Ciudad / Región">
            <input value={t.ciudad||''} onChange={e=>onChange('ciudad',e.target.value)} style={INPUT_BASE} placeholder="Ciudad o región" />
          </Field>
          <Field label="Fecha de nacimiento">
            <input type="date" value={t.nacimiento||''} onChange={e=>onChange('nacimiento',e.target.value)} style={INPUT_BASE} />
          </Field>
          <Field label="AFP">
            <input value={t.afp||''} onChange={e=>onChange('afp',e.target.value)} style={INPUT_BASE} placeholder="AFP Habitat, Capital…" />
          </Field>
          <Field label="Previsión de salud">
            <input value={t.salud||''} onChange={e=>onChange('salud',e.target.value)} style={INPUT_BASE} placeholder="Fonasa / Isapre…" />
          </Field>
          <div style={{ gridColumn:'1/-1' }}>
            <Field label="Mutual de seguridad">
              <input value={t.mutual||''} onChange={e=>onChange('mutual',e.target.value)} style={INPUT_BASE} placeholder="ACHS / Mutual / IST" />
            </Field>
          </div>
        </div>
      </CardSection>

      {/* 3 — Datos operacionales */}
      <CardSection
        title="Datos operacionales"
        subtitle="Cargo, especialidad, disponibilidad y clientes habilitados"
        action={<BTN_SAVE saving={saving} onClick={onSave} />}
      >
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
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
          <Field label="Turno / Jornada habitual">
            <select value={t.regimen||'5x2'} onChange={e=>onChange('regimen',e.target.value)} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              {['5x2','4x3','7x7','6x1','turno_especial'].map(r=><option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
          <div style={{ gridColumn:'1/-1' }}>
            <Field label="Clientes / Minas habilitadas">
              <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                {clientes.length === 0
                  ? <span style={{ fontSize:12, color:T.sub }}>Sin clientes configurados</span>
                  : clientes.map(m => {
                    const activo = (t.mineras||[]).includes(m.id)
                    return (
                      <label key={m.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 10px', borderRadius:8, background:activo?'#E3E3F0':T.surf2, border:`1px solid ${activo?T.pri:T.line}`, cursor:'pointer', fontSize:12, fontWeight:activo?700:400, color:activo?T.pri:T.mut }}>
                        <input type="checkbox" checked={activo} onChange={e=>{
                          const minas = t.mineras||[]
                          onChange('mineras', e.target.checked ? [...minas,m.id] : minas.filter(id=>id!==m.id))
                        }} style={{ accentColor:T.pri }} />
                        {m.nombre}
                      </label>
                    )
                  })
                }
              </div>
            </Field>
          </div>
        </div>
      </CardSection>

      {/* 4 — Alojamiento asignado (nuevo, igual que Ricardo v6 renderFichaHotelV74) */}
      <CardSection
        title="Alojamiento asignado"
        subtitle="Estadías activas vinculadas a proyectos"
        action={
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <IconBed size={14} strokeWidth={1.7} style={{ color:T.sub }} />
          </div>
        }
      >
        {(t._hotelAsig||[]).length === 0 ? (
          <p style={{ fontSize:13, color:T.sub, margin:0 }}>Sin alojamiento asignado actualmente</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:T.graph }}>
                {['Hotel','Proyecto','Pieza','Tipo','Turno','Check-in','Check-out'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#fff', fontWeight:600, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(t._hotelAsig||[]).map((ha, i) => (
                <tr key={ha.id||i} style={{ background: i%2===0 ? T.surf : T.surf2 }}>
                  <td style={{ padding:'8px 12px', fontWeight:600, color:T.ink }}>{ha.hotelNombre||ha.hotelId||'—'}</td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{ha.mantNombre||ha.mantId||'—'}</td>
                  <td style={{ padding:'8px 12px', color:T.ink }}>#{ha.pieza||'—'}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <Badge label={ha.tipo||'—'} bg='#E3E3F0' color={T.pri} />
                  </td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{ha.turno||'—'}</td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{ha.checkin||'—'}</td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{ha.checkout||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </CardSection>
    </div>
  )
}

// ─── TAB: Documentos / Cursos ────────────────────────────────
const TIPOS_POR_TAB = {
  docs: [
    { value:'documento',     label:'Documento trabajador' },
    { value:'contrato',      label:'Contrato / anexo' },
    { value:'examen',        label:'Examen médico' },
    { value:'certificacion', label:'Certificación técnica' },
    { value:'cv',            label:'Currículum / antecedentes' },
  ],
  cursos: [
    { value:'curso',         label:'Curso / capacitación' },
    { value:'certificacion', label:'Certificación técnica' },
  ],
}

function TabDocs({ t, tabKey, onAddDoc, onDelDoc }) {
  const fileRef = useRef()
  const tipos = TIPOS_POR_TAB[tabKey]
  const [form, setForm] = useState({ type: tipos[0].value, name:'', vence:'', notes:'', fileName:'' })

  const docs = (t.workerItems||[]).filter(d =>
    tabKey === 'cursos' ? ['curso','certificacion'].includes(d.type) : !['curso'].includes(d.type)
  )
  const reqs = getRequiredItems(t)
  const reqsFiltrados = tabKey === 'cursos'
    ? reqs.filter(r => ['curso','certificacion'].includes(r.type))
    : reqs.filter(r => !['curso'].includes(r.type))

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (f) setForm(prev => ({ ...prev, fileName: f.name }))
  }
  function handleGuardar() {
    if (!form.name.trim()) return
    onAddDoc({ ...form, id:`d_${Date.now()}`, cargado: new Date().toISOString().split('T')[0] })
    setForm({ type: tipos[0].value, name:'', vence:'', notes:'', fileName:'' })
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <CardSection
        title={tabKey === 'cursos' ? 'Registrar curso o certificación' : 'Cargar documento o examen'}
        subtitle="La alerta crítica se activa cuando falten 7 días o esté vencido"
        action={
          <button onClick={handleGuardar} style={{ padding:'7px 14px', border:'none', borderRadius:8, background:T.pri, color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>
            Guardar carga
          </button>
        }
      >
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          <Field label="Tipo">
            <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} style={{ ...INPUT_BASE, cursor:'pointer' }}>
              {tipos.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Field>
          <Field label="Nombre / referencia">
            <input
              value={form.name}
              onChange={e=>setForm(f=>({...f,name:e.target.value}))}
              list={`sugg-${tabKey}`}
              style={INPUT_BASE}
              placeholder="Ej: Examen preocupacional ACHS"
            />
            <datalist id={`sugg-${tabKey}`}>
              {reqs.map(r=><option key={r.name} value={r.name} />)}
            </datalist>
          </Field>
          <Field label="Fecha de vencimiento">
            <input type="date" value={form.vence} onChange={e=>setForm(f=>({...f,vence:e.target.value}))} style={INPUT_BASE} />
          </Field>
          <Field label="Archivo">
            <input ref={fileRef} type="file" onChange={handleFile} style={{ ...INPUT_BASE, padding:'6px 11px', cursor:'pointer' }} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
            {form.fileName && <span style={{ fontSize:11, color:T.accT, marginTop:4, display:'flex', alignItems:'center', gap:4 }}><IconPaperclip size={12}/>{form.fileName}</span>}
          </Field>
          <div style={{ gridColumn:'1/-1' }}>
            <Field label="Notas (OTEC, centro médico, folio, observación)">
              <input value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} style={INPUT_BASE} placeholder="Ej: ACHS Antofagasta · Folio 234" />
            </Field>
          </div>
        </div>
      </CardSection>

      {/* checklist */}
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden', marginBottom:16 }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Checklist de ingreso</p>
          <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>Requisitos según especialidad y mina asignada</p>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:T.graph }}>
              {['Requisito','Tipo','Estado','Fuente'].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#fff', fontWeight:600, fontSize:11 }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {reqsFiltrados.map((req,i)=>{
              const st = reqStatus(t, req)
              return (
                <tr key={i} style={{ background: i%2===0?T.surf:T.surf2 }}>
                  <td style={{ padding:'8px 12px', fontWeight:600, color:T.ink }}>{req.name}</td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{ITEM_TYPES[req.type]||req.type}</td>
                  <td style={{ padding:'8px 12px' }}>
                    {st.ok
                      ? <Badge label="Cumple" bg={T.okBg} color={T.ok} />
                      : <Badge label="Falta / vencido" bg={T.errBg} color={T.err} />
                    }
                  </td>
                  <td style={{ padding:'8px 12px', color:T.sub, fontSize:11 }}>{st.src}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* documentos cargados */}
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>
            {tabKey==='cursos'?'Cursos registrados':'Documentos cargados'} ({docs.length})
          </p>
          <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>Puedes eliminar registros erróneos y volver a cargarlos</p>
        </div>
        {docs.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:T.sub, fontSize:13 }}>
            <IconFileText size={28} strokeWidth={1.3} style={{ display:'block', margin:'0 auto 8px', color:T.line }} />
            Sin registros cargados
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:T.graph }}>
                {['Tipo','Nombre','Vence','Estado','Archivo',''].map(h=><th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#fff', fontWeight:600, fontSize:11 }}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {docs.map((d,i)=>{
                const dias = diasHasta(d.vence)
                const estado = dias===null ? null : dias<0 ? 'vencido' : dias<=30 ? 'por_vencer' : 'vigente'
                const eMap = { vigente:{label:'Vigente',bg:T.okBg,color:T.ok}, por_vencer:{label:'Por vencer',bg:T.warnBg,color:T.warn}, vencido:{label:'Vencido',bg:T.errBg,color:T.err} }
                const s = eMap[estado]
                const globalIdx = (t.workerItems||[]).findIndex(x=>x.id===d.id)
                return (
                  <tr key={d.id||i} style={{ background:i%2===0?T.surf:T.surf2 }}>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.line}` }}>
                      <Badge label={ITEM_TYPES[d.type]||d.type} bg='#E3E3F0' color={T.pri} />
                    </td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.line}` }}>
                      <p style={{ fontWeight:600, color:T.ink, margin:0 }}>{d.name}</p>
                      {d.notes && <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>{d.notes}</p>}
                    </td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.line}`, color:T.mut }}>{d.vence||'—'}</td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.line}` }}>
                      {s ? <Badge {...s} /> : <Badge label="Cargado" bg='#E3E3F0' color={T.pri} />}
                    </td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.line}` }}>
                      {d.fileName
                        ? <span style={{ fontSize:11, color:T.accT, display:'flex', alignItems:'center', gap:4 }}><IconPaperclip size={12}/>{d.fileName}</span>
                        : <span style={{ color:T.sub }}>—</span>
                      }
                    </td>
                    <td style={{ padding:'8px 12px', borderBottom:`1px solid ${T.line}`, textAlign:'right' }}>
                      <button onClick={()=>onDelDoc(globalIdx)} style={{ padding:'3px 8px', border:`1px solid ${T.line}`, borderRadius:6, background:T.surf, color:T.err, fontSize:11, cursor:'pointer' }}>
                        Eliminar
                      </button>
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

// ─── TAB: EPP y Tallas ───────────────────────────────────────
// Tallas extendidas según Ricardo v6 (ropa, calzado, guante, casco, arnés, respirador, pantalón)
function TabEPP({ t, saving, onChange, onSave, eppDeliveries }) {
  const epp = t.epp || {}
  const fields = [
    ['ropa',        'Ropa / Polera',         'XS a 5XL'],
    ['pantalon',    'Pantalón',              'Talla o número'],
    ['calzado',     'Calzado',               'Número'],
    ['guante',      'Guante / contorno mano','Talla o cm'],
    ['casco',       'Casco / contorno cabeza','Talla o cm'],
    ['arnes',       'Arnés / estatura / peso','Talla, cm y kg'],
    ['respirador',  'Respirador / fit test', 'Talla y fecha fit test'],
  ]

  const entregas = eppDeliveries.filter(d => d.workerId === t.id)
    .sort((a,b) => String(b.deliveredAt).localeCompare(String(a.deliveredAt)))

  return (
    <div>
      {/* Tallas */}
      <CardSection
        title="Tallas y medidas personales"
        subtitle="Confirmar físicamente antes de entregar. No asumir talla solo por cargo."
        action={<BTN_SAVE saving={saving} onClick={onSave} />}
      >
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
          {fields.map(([key, label, ph]) => (
            <Field key={key} label={label}>
              <input
                value={epp[key]||''}
                onChange={e => onChange('epp', { ...epp, [key]: e.target.value })}
                style={INPUT_BASE}
                placeholder={ph}
              />
            </Field>
          ))}
        </div>
      </CardSection>

      {/* Historial de entregas individuales — nuevo vs versión anterior */}
      <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
        <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
          <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Historial de entregas EPP</p>
          <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>Registro de cada entrega con marca, certificación y fecha de reposición</p>
        </div>
        {entregas.length === 0 ? (
          <div style={{ padding:32, textAlign:'center', color:T.sub, fontSize:13 }}>
            <IconShield size={28} strokeWidth={1.3} style={{ display:'block', margin:'0 auto 8px', color:T.line }} />
            Sin entregas registradas
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
            <thead>
              <tr style={{ background:T.graph }}>
                {['Fecha','EPP','Talla','Marca / Certificación','Reposición'].map(h => (
                  <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#fff', fontWeight:600, fontSize:11 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entregas.map((d, i) => (
                <tr key={d.id||i} style={{ background: i%2===0 ? T.surf : T.surf2 }}>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{d.deliveredAt||'—'}</td>
                  <td style={{ padding:'8px 12px', fontWeight:600, color:T.ink }}>{d.itemName||'—'}</td>
                  <td style={{ padding:'8px 12px', color:T.ink }}>{d.size||'—'}</td>
                  <td style={{ padding:'8px 12px' }}>
                    <p style={{ margin:0, color:T.ink }}>{d.brandModel||'—'}</p>
                    <p style={{ margin:'2px 0 0', fontSize:11, color:T.sub }}>{d.certification||'Sin certificado registrado'}</p>
                  </td>
                  <td style={{ padding:'8px 12px', color:T.mut }}>{d.replaceAt||'Según inspección'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

// ─── TAB: Historial ──────────────────────────────────────────
function TabHistorial({ t, proyectos, clientes, asignacionesHistorial }) {
  const asigs = t._asignaciones || []

  function proyectoNombre(mantId) {
    return proyectos.find(m => m.id === mantId)?.nombre || mantId
  }
  function clienteDeProyecto(mantId) {
    const p = proyectos.find(m => m.id === mantId)
    return clientes.find(c => c.id === p?.minaId)?.nombre || '—'
  }

  return (
    <div style={{ background:T.surf, border:`1px solid ${T.line}`, borderRadius:12, overflow:'hidden' }}>
      <div style={{ padding:'12px 16px', borderBottom:`1px solid ${T.line}` }}>
        <p style={{ fontSize:13, fontWeight:700, color:T.ink, margin:0 }}>Historial operativo</p>
        <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>Proyectos y servicios en los que ha participado</p>
      </div>
      {asigs.length === 0 ? (
        <div style={{ padding:32, textAlign:'center', color:T.sub, fontSize:13 }}>
          <IconHistory size={28} strokeWidth={1.3} style={{ display:'block', margin:'0 auto 8px', color:T.line }} />
          Sin proyectos en el historial
        </div>
      ) : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
          <thead>
            <tr style={{ background:T.graph }}>
              {['Proyecto / Servicio','Cliente','Turno','Estado'].map(h => (
                <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:'#fff', fontWeight:600, fontSize:11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {asigs.map((a, i) => (
              <tr key={a.id||i} style={{ background: i%2===0 ? T.surf : T.surf2 }}>
                <td style={{ padding:'8px 12px', fontWeight:600, color:T.ink }}>{proyectoNombre(a.mantId)}</td>
                <td style={{ padding:'8px 12px', color:T.mut }}>{clienteDeProyecto(a.mantId)}</td>
                <td style={{ padding:'8px 12px', color:T.mut }}>{a.turno||'—'}</td>
                <td style={{ padding:'8px 12px' }}>
                  <Badge
                    label={a.estado||'activo'}
                    bg={a.estado==='confirmado'?T.okBg:a.estado==='preasignado'?T.warnBg:'#E3E3F0'}
                    color={a.estado==='confirmado'?T.ok:a.estado==='preasignado'?T.warn:T.pri}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── TABS CONFIG ─────────────────────────────────────────────
const TABS = [
  { key:'datos',    label:'Datos personales',  icon:IconUser },
  { key:'docs',     label:'Documentos',        icon:IconFileText },
  { key:'cursos',   label:'Cursos y exámenes', icon:IconBook },
  { key:'epp',      label:'EPP y Tallas',      icon:IconShield },
  { key:'historial',label:'Historial',         icon:IconHistory },
]

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────
export default function FichaTrabajadorPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [stateData,   setStateData]   = useState(null)
  const [trabajador,  setTrabajador]  = useState(null)
  const [asignaciones, setAsignaciones] = useState([])
  const [tab,         setTab]         = useState('datos')
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState(null)
  const [ok,          setOk]          = useState(null)

  useEffect(() => {
    api.get('/state').then(r => {
      const s = r?.state || r
      setStateData(s)
      const t = (s?.trabajadores||[]).find(w => w.id === id)
      if (t) {
        const asigs    = (s?.asignaciones||[]).filter(a => a.trabId === id)
        const hotelAsig = (s?.hotelAsig||[]).filter(h => h.trabId === id).map(h => {
          const hotel = (s?.hoteles||[]).find(ho => ho.id === h.hotelId)
          const mant  = (s?.mantenciones||[]).find(m => m.id === h.mantId)
          return { ...h, hotelNombre: hotel?.nombre, mantNombre: mant?.nombre }
        })
        setTrabajador({ ...t, _asignaciones: asigs, _hotelAsig: hotelAsig })
        setAsignaciones(s?.asignaciones || [])
      }
    })
  }, [id])

  function onChange(field, value) {
    setTrabajador(t => ({ ...t, [field]: value }))
  }
  function handleAddDoc(doc) {
    setTrabajador(t => ({ ...t, workerItems: [...(t.workerItems||[]), doc] }))
  }
  function handleDelDoc(idx) {
    setTrabajador(t => ({ ...t, workerItems: (t.workerItems||[]).filter((_,i) => i !== idx) }))
  }

  // Asignar trabajador a proyecto
  function handleAsignar(mantId, turno) {
    if (!mantId) return
    const ya = asignaciones.some(a => a.trabId === id && a.mantId === mantId)
    if (ya) { setError('Ya está asignado a ese proyecto'); return }
    const nueva = { id:`asig_${Date.now()}`, mantId, trabId: id, turno, estado:'confirmado' }
    const nuevasAsigs = [...asignaciones, nueva]
    setAsignaciones(nuevasAsigs)
    setTrabajador(t => ({ ...t, _asignaciones: nuevasAsigs.filter(a => a.trabId === id), disponibilidad:'asignado' }))
    guardarAsignaciones(nuevasAsigs)
  }

  // Retirar trabajador de proyecto
  function handleRetirar(mantId) {
    const nuevasAsigs = asignaciones.filter(a => !(a.trabId === id && a.mantId === mantId))
    const sigueAsignado = nuevasAsigs.some(a => a.trabId === id)
    setAsignaciones(nuevasAsigs)
    setTrabajador(t => ({
      ...t,
      _asignaciones: nuevasAsigs.filter(a => a.trabId === id),
      disponibilidad: sigueAsignado ? 'asignado' : 'disponible',
    }))
    guardarAsignaciones(nuevasAsigs)
  }

  async function guardarAsignaciones(nuevasAsigs) {
    try {
      const r = await api.get('/state')
      const s = r?.state || r
      const version = r?.moduleVersions?.asignaciones ?? 0
      await api.put('/state/modules', {
        reason: `Asignaciones actualizadas para ${trabajador?.nombre}`,
        changes: { asignaciones: { version, data: nuevasAsigs } },
      })
    } catch(e) {
      setError('Error al guardar asignación')
    }
  }

  async function handleSave() {
    setSaving(true); setError(null); setOk(null)
    try {
      const r = await api.get('/state')
      const s = r?.state || r
      const version = r?.moduleVersions?.trabajadores ?? 0
      const { _asignaciones, _hotelAsig, ...tClean } = trabajador
      const lista = (s?.trabajadores||[]).map(t => t.id===id ? tClean : t)
      await api.put('/state/modules', {
        reason: `Actualización ficha ${trabajador.nombre}`,
        changes: { trabajadores: { version, data: lista } },
      })
      setOk('Cambios guardados correctamente')
      setTimeout(() => setOk(null), 2500)
    } catch(e) {
      setError(e.message||'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!stateData) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:T.bg }}>
      <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
        <div style={{ width:28, height:28, border:`2.5px solid ${T.pri}`, borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ color:T.sub, fontSize:13 }}>Cargando ficha…</p>
      </div>
    </div>
  )
  if (!trabajador) return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:T.bg }}>
      <p style={{ color:T.sub, fontSize:13 }}>Trabajador no encontrado.</p>
    </div>
  )

  const pct       = acreditacionPct(trabajador)
  const clientes  = stateData?.minas         || []
  const proyectos = stateData?.mantenciones  || []
  const contratos = stateData?.contratos     || []
  const eppDeliveries = stateData?.eppDeliveries || []

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:T.bg, overflow:'hidden' }}>

      {/* ── HEADER ── */}
      <div style={{ background:T.surf, borderBottom:`1px solid ${T.line}`, padding:'14px 20px 0' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>

          {/* breadcrumb + avatar */}
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>navigate('/app/trabajadores')} style={{ display:'flex', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer', color:T.mut, fontSize:13, fontWeight:600, padding:0 }}>
              <IconArrowLeft size={15} strokeWidth={2} />
              Trabajadores
            </button>
            <span style={{ color:T.line }}>/</span>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:'50%', background:avatarColor(trabajador.id), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:13, fontWeight:800, flexShrink:0 }}>
                {initials(trabajador.nombre)}
              </div>
              <div>
                <p style={{ fontSize:16, fontWeight:800, color:T.ink, margin:0, fontFamily:'Manrope, sans-serif' }}>{trabajador.nombre}</p>
                <p style={{ fontSize:11, color:T.sub, margin:'2px 0 0' }}>{trabajador.rut} · {trabajador.cargo||trabajador.especialidad||'Sin cargo'}</p>
              </div>
            </div>
          </div>

          {/* badges + WhatsApp */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
            <BadgeDisp disp={trabajador.disponibilidad} />
            <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:99, background:pct>=85?T.okBg:pct>=60?T.warnBg:T.errBg, color:pct>=85?T.ok:pct>=60?T.warn:T.err }}>
              {pct}% acreditado
            </span>
            {/* WhatsApp directo — agregado según Ricardo v6 ficha-wa-btn */}
            {trabajador.tel && (
              <a
                href={`https://wa.me/${(trabajador.tel||'').replace(/\D/g,'')}?text=${encodeURIComponent(`Hola ${trabajador.nombre.split(' ')[0]}, le contacta el equipo de operaciones.`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', borderRadius:8, background:'#25D366', color:'#fff', fontSize:12, fontWeight:700, textDecoration:'none' }}
              >
                <IconBrandWhatsapp size={14} strokeWidth={2} />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* barra acreditación */}
        <div style={{ maxWidth:300, marginBottom:12 }}>
          <ProgBar pct={pct} />
        </div>

        {/* tabs */}
        <div style={{ display:'flex', overflowX:'auto' }}>
          {TABS.map(({ key, label, icon:Icon }) => (
            <button key={key} onClick={()=>setTab(key)} style={{
              display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
              border:'none', background:'transparent', fontSize:12, whiteSpace:'nowrap',
              fontWeight:tab===key?700:500, color:tab===key?T.pri:T.mut,
              borderBottom:tab===key?`2px solid ${T.pri}`:'2px solid transparent',
              marginBottom:-1, cursor:'pointer',
            }}>
              <Icon size={13} strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* mensajes */}
      {(error||ok) && (
        <div style={{ padding:'10px 20px', background:error?T.errBg:T.okBg, borderBottom:`1px solid ${error?'#F5C4C2':T.line}`, display:'flex', alignItems:'center', gap:8 }}>
          {error ? <IconAlertTriangle size={14} style={{ color:T.err }} /> : <IconCheck size={14} style={{ color:T.ok }} />}
          <p style={{ fontSize:13, color:error?T.err:T.ok, margin:0 }}>{error||ok}</p>
          <button onClick={()=>{setError(null);setOk(null)}} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:error?T.err:T.ok }}>
            <IconX size={14} />
          </button>
        </div>
      )}

      {/* contenido tab */}
      <div style={{ flex:1, overflow:'auto', padding:20 }}>
        {tab==='datos'     && (
          <TabDatos
            t={trabajador}
            clientes={clientes}
            proyectos={proyectos}
            contratos={contratos}
            asignaciones={asignaciones}
            saving={saving}
            onChange={onChange}
            onSave={handleSave}
            onAsignar={handleAsignar}
            onRetirar={handleRetirar}
          />
        )}
        {tab==='docs'      && <TabDocs t={trabajador} tabKey="docs"   onAddDoc={handleAddDoc} onDelDoc={handleDelDoc} />}
        {tab==='cursos'    && <TabDocs t={trabajador} tabKey="cursos" onAddDoc={handleAddDoc} onDelDoc={handleDelDoc} />}
        {tab==='epp'       && <TabEPP  t={trabajador} saving={saving} onChange={onChange} onSave={handleSave} eppDeliveries={eppDeliveries} />}
        {tab==='historial' && <TabHistorial t={trabajador} proyectos={proyectos} clientes={clientes} />}
      </div>
    </div>
  )
}
