import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconArrowRight, IconCheck, IconLoader2,
  IconUser, IconFileText, IconHeart, IconShield, IconClipboardCheck,
} from '@tabler/icons-react'
import { api } from '../services/api.js'

// ─── TOKENS ─────────────────────────────────────────────────
const T = {
  bg:'#F4EFE3', surf:'#FFFFFF', surf2:'#FBF9F5', line:'#E3DED2',
  ink:'#141A20', mut:'#5D6B7A', sub:'#8A96A1',
  pri:'#2A2A8C', priD:'#1A1A5E',
  acc:'#00CFC1', accT:'#00706A',
  ok:'#1B7F4B', okBg:'#E6F2EB',
  warn:'#C77700', warnBg:'#FBF1DF',
  err:'#B3261E', errBg:'#FBE8E6',
}

// ─── CONSTANTES ──────────────────────────────────────────────
const ESPECIALIDADES = [
  'Mecánico Industrial','Soldador 6G','Eléctrico','Instrumentista',
  'Rigger','Calderero','Maestro Andamios','Operador de equipos',
  'Prevencionista','Supervisor','Técnico electrónico','Pintor industrial',
  'Operadora','Enfermero/a','Paramédico','Conductor','Administrativo','Otro',
]

const REGIONES = [
  'Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo',
  'Valparaíso','Metropolitana de Santiago',"O'Higgins",'Maule','Ñuble',
  'Biobío','Araucanía','Los Ríos','Los Lagos','Aysén','Magallanes',
]

// Tipos de persona — alineado con Ricardo v6 (3 opciones)
const TIPOS = [
  { value:'permanente',  label:'Trabajador fijo',           desc:'Vínculo laboral permanente en la empresa' },
  { value:'esporadico',  label:'Trabajador por proyecto',   desc:'Movilización según necesidad operacional' },
  { value:'disponible',  label:'Trabajador disponible',     desc:'En pool, listo para ser asignado' },
]

const STEPS = [
  { key:'identidad', label:'Identidad',  icon:IconUser },
  { key:'contrato',  label:'Contrato',   icon:IconFileText },
  { key:'salud',     label:'Salud',      icon:IconHeart },
  { key:'epp',       label:'EPP',        icon:IconShield },
  { key:'resumen',   label:'Resumen',    icon:IconClipboardCheck },
]

const INITIAL = {
  nombre:'', rut:'', nacimiento:'', tel:'', email:'',
  region:'', ciudad:'',                         // ← región separada de ciudad (Ricardo v6)
  tipo:'permanente', regimen:'5x2',
  cargo:'', rol:'', especialidad:'', calificacion:'7',
  mantId:'',                                    // ← asignación inicial a proyecto
  afp:'', salud:'', mutual:'',
  eppCasco:'', eppPolera:'', eppPantalon:'', eppZapato:'',
}

// ─── HELPERS UI ──────────────────────────────────────────────
const INPUT_BASE = {
  width:'100%', padding:'9px 12px', border:`1.5px solid ${T.line}`,
  borderRadius:8, fontSize:13, color:T.ink, background:T.surf,
  outline:'none', transition:'border-color 0.15s',
}

function Field({ label, required, hint, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11.5, fontWeight:700, color:T.mut }}>
        {label}{required && <span style={{ color:T.err }}> *</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize:11, color:T.sub, margin:0 }}>{hint}</p>}
    </div>
  )
}

function FInput({ value, onChange, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      value={value} onChange={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ ...INPUT_BASE, borderColor: focused ? T.pri : T.line }}
      {...props}
    />
  )
}

function FSelect({ value, onChange, children, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value} onChange={onChange}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ ...INPUT_BASE, borderColor: focused ? T.pri : T.line, cursor:'pointer' }}
      {...props}
    >
      {children}
    </select>
  )
}

// ─── STEPPER ─────────────────────────────────────────────────
function Stepper({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', padding:'20px 24px', background:T.surf, borderBottom:`1px solid ${T.line}` }}>
      {STEPS.map((step, i) => {
        const done   = i < current
        const active = i === current
        const Icon   = step.icon
        return (
          <div key={step.key} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{
                width:32, height:32, borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                background: done ? T.ok : active ? T.pri : T.line,
                color: done || active ? '#fff' : T.sub,
                transition:'all 0.2s',
              }}>
                {done ? <IconCheck size={15} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={1.8} />}
              </div>
              <span style={{ fontSize:10, fontWeight:active ? 700 : 500, color:active ? T.pri : done ? T.ok : T.sub, whiteSpace:'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ flex:1, height:2, background:done ? T.ok : T.line, margin:'0 8px', marginBottom:18, transition:'background 0.2s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── PASO 1: IDENTIDAD ───────────────────────────────────────
function StepIdentidad({ data, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Nombre completo" required>
          <FInput value={data.nombre} onChange={e => onChange('nombre', e.target.value)} placeholder="Nombre Apellido Apellido" />
        </Field>
      </div>
      <Field label="RUT" required>
        <FInput value={data.rut} onChange={e => onChange('rut', e.target.value)} placeholder="12.345.678-9" />
      </Field>
      <Field label="Fecha de nacimiento">
        <FInput type="date" value={data.nacimiento} onChange={e => onChange('nacimiento', e.target.value)} />
      </Field>
      <Field label="Teléfono">
        <FInput value={data.tel} onChange={e => onChange('tel', e.target.value)} placeholder="+56 9 XXXX XXXX" />
      </Field>
      <Field label="Correo electrónico">
        <FInput type="email" value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="correo@email.com" />
      </Field>
      {/* Región y Ciudad separadas — igual que Ricardo v6 nt-region / nt-ciudad */}
      <Field label="Región">
        <FSelect value={data.region} onChange={e => onChange('region', e.target.value)}>
          <option value="">Seleccionar región</option>
          {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
        </FSelect>
      </Field>
      <Field label="Comuna / Ciudad" hint="Puedes escribir directamente si tu comuna no aparece">
        <FInput value={data.ciudad} onChange={e => onChange('ciudad', e.target.value)} placeholder="Ej: Antofagasta" />
      </Field>
    </div>
  )
}

// ─── PASO 2: CONTRATO ────────────────────────────────────────
function StepContrato({ data, onChange, mantenciones }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

      {/* Tipo de persona — 3 opciones igual que Ricardo v6 */}
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Tipo de persona" required>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
            {TIPOS.map(t => {
              const active = data.tipo === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onChange('tipo', t.value)}
                  style={{
                    padding:'12px', border:`2px solid ${active ? T.pri : T.line}`,
                    borderRadius:10, background:active ? '#E3E3F0' : T.surf,
                    cursor:'pointer', textAlign:'left', transition:'all 0.15s',
                  }}
                >
                  <p style={{ fontSize:12, fontWeight:700, color:active ? T.pri : T.ink, margin:'0 0 3px' }}>{t.label}</p>
                  <p style={{ fontSize:11, color:T.sub, margin:0, lineHeight:1.4 }}>{t.desc}</p>
                </button>
              )
            })}
          </div>
        </Field>
      </div>

      <Field label="Turno / Jornada habitual">
        <FSelect value={data.regimen} onChange={e => onChange('regimen', e.target.value)}>
          <option value="5x2">5x2</option>
          <option value="4x3">4x3</option>
          <option value="7x7">7x7</option>
          <option value="6x1">6x1</option>
          <option value="turno_especial">Turno especial</option>
        </FSelect>
      </Field>

      <Field label="Calificación">
        <FSelect value={data.calificacion} onChange={e => onChange('calificacion', e.target.value)}>
          <option value="7">7 — A</option>
          <option value="6">6 — B</option>
          <option value="5">5 — B</option>
          <option value="4">4 — C</option>
          <option value="3">3 — C</option>
          <option value="2">2 — D</option>
          <option value="1">1 — D</option>
        </FSelect>
      </Field>

      <Field label="Cargo" required>
        <FInput value={data.cargo} onChange={e => onChange('cargo', e.target.value)} placeholder="Ej: Mecánico mantenedor" />
      </Field>

      <Field label="Rol operacional">
        <FInput value={data.rol} onChange={e => onChange('rol', e.target.value)} placeholder="Ej: Rigger / Supervisor / Maestro" />
      </Field>

      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Especialidad" required>
          <FSelect value={data.especialidad} onChange={e => onChange('especialidad', e.target.value)}>
            <option value="">Seleccionar especialidad</option>
            {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
          </FSelect>
        </Field>
      </div>

      {/* Asignación inicial — incluye turno por defecto 'día' igual que Ricardo v6 */}
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Asignar a proyecto / servicio inicial" hint="Opcional — puedes asignar después desde la ficha">
          <FSelect value={data.mantId} onChange={e => onChange('mantId', e.target.value)}>
            <option value="">Sin asignar por ahora</option>
            {mantenciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </FSelect>
        </Field>
      </div>
    </div>
  )
}

// ─── PASO 3: SALUD ───────────────────────────────────────────
function StepSalud({ data, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ gridColumn:'1/-1' }}>
        <p style={{ fontSize:13, color:T.mut, margin:'0 0 4px', lineHeight:1.6 }}>
          Información previsional para gestión documental y acceso a faena.
        </p>
        <p style={{ fontSize:12, color:T.sub, margin:0 }}>Puedes completarla después desde la ficha del trabajador.</p>
      </div>
      <Field label="AFP">
        <FInput value={data.afp} onChange={e => onChange('afp', e.target.value)} placeholder="AFP Habitat, Capital, Provida…" />
      </Field>
      <Field label="Previsión de salud">
        <FInput value={data.salud} onChange={e => onChange('salud', e.target.value)} placeholder="Fonasa / Isapre…" />
      </Field>
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Mutual de seguridad">
          <FInput value={data.mutual} onChange={e => onChange('mutual', e.target.value)} placeholder="Mutual / ACHS / IST" />
        </Field>
      </div>
    </div>
  )
}

// ─── PASO 4: EPP ─────────────────────────────────────────────
// Tallas básicas del modal de Ricardo v6 (casco, polera, pantalón, zapato)
// Las tallas extendidas (guante, arnés, respirador) se completan en FichaTrabajadorPage
function StepEPP({ data, onChange }) {
  const fields = [
    ['eppCasco',   'Casco',               'Ej: M o 56 cm'],
    ['eppPolera',  'Polera / Camisa',      'Ej: L'],
    ['eppPantalon','Pantalón',             'Ej: 44'],
    ['eppZapato',  'Zapato de seguridad',  'Ej: 42'],
  ]
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ gridColumn:'1/-1' }}>
        <p style={{ fontSize:13, color:T.mut, margin:'0 0 4px', lineHeight:1.6 }}>
          Tallas para la entrega de EPP. Confirmar físicamente antes de la primera entrega.
        </p>
        <p style={{ fontSize:12, color:T.sub, margin:0 }}>Las tallas adicionales (guante, arnés, respirador) se completan en la ficha del trabajador.</p>
      </div>
      {fields.map(([key, label, ph]) => (
        <Field key={key} label={label}>
          <FInput value={data[key]} onChange={e => onChange(key, e.target.value)} placeholder={ph} />
        </Field>
      ))}
    </div>
  )
}

// ─── PASO 5: RESUMEN ─────────────────────────────────────────
function StepResumen({ data, mantenciones }) {
  const tipoLabel = TIPOS.find(t => t.value === data.tipo)?.label || data.tipo
  const mantLabel = mantenciones.find(m => m.id === data.mantId)?.nombre

  const rows = [
    ['Nombre',           data.nombre],
    ['RUT',              data.rut],
    ['Teléfono',         data.tel],
    ['Correo',           data.email],
    ['Región',           data.region],
    ['Ciudad / Comuna',  data.ciudad],
    ['Tipo de persona',  tipoLabel],
    ['Turno / Jornada',  data.regimen],
    ['Cargo',            data.cargo],
    ['Rol operacional',  data.rol],
    ['Especialidad',     data.especialidad],
    ['Calificación',     data.calificacion],
    ['Proyecto inicial', mantLabel],
    ['AFP',              data.afp],
    ['Previsión salud',  data.salud],
    ['Mutual',           data.mutual],
    ['Casco',            data.eppCasco],
    ['Polera',           data.eppPolera],
    ['Pantalón',         data.eppPantalon],
    ['Zapato',           data.eppZapato],
  ].filter(([, v]) => v)

  return (
    <div>
      <p style={{ fontSize:13, color:T.mut, marginBottom:16 }}>
        Revisa la información antes de guardar. Los documentos, exámenes y tallas adicionales se completan desde la ficha del trabajador.
      </p>
      <div style={{ background:T.surf2, border:`1px solid ${T.line}`, borderRadius:10, overflow:'hidden' }}>
        {rows.map(([label, value], i) => (
          <div key={label} style={{
            display:'flex', gap:16, padding:'10px 14px',
            borderBottom: i < rows.length-1 ? `1px solid ${T.line}` : 'none',
            background: i % 2 === 0 ? T.surf : T.surf2,
          }}>
            <span style={{ fontSize:12, color:T.sub, width:140, flexShrink:0 }}>{label}</span>
            <span style={{ fontSize:12, color:T.ink, fontWeight:500 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PÁGINA PRINCIPAL ────────────────────────────────────────
export default function NuevoTrabajadorPage() {
  const navigate  = useNavigate()
  const [step,    setStep]    = useState(0)
  const [data,    setData]    = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const [stateData, setStateData] = useState(null)

  useEffect(() => {
    api.get('/state').then(r => setStateData(r?.state || r)).catch(() => {})
  }, [])

  const mantenciones = stateData?.mantenciones || []
  const asignaciones = stateData?.asignaciones || []

  function onChange(field, value) {
    setData(d => ({ ...d, [field]: value }))
    setError(null)
  }

  function canNext() {
    if (step === 0) return data.nombre.trim() && data.rut.trim()
    if (step === 1) return data.cargo.trim() && data.especialidad
    return true
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      const stateRes   = await api.get('/state')
      const s          = stateRes?.state || stateRes
      const trabajadores = s?.trabajadores || []
      const versionT   = stateRes?.moduleVersions?.trabajadores ?? 0
      const versionA   = stateRes?.moduleVersions?.asignaciones ?? 0

      // Determinar disponibilidad según tipo y asignación (igual que Ricardo v6 saveNuevoTrab)
      // "disponible" profile → tipo esporadico internamente pero disponibilidad: disponible
      const tipoInterno     = data.tipo === 'disponible' ? 'esporadico' : data.tipo
      const disponibilidad  = data.tipo === 'disponible' ? 'disponible'
                            : data.mantId ? 'asignado' : 'disponible'

      const newId = `t_${Date.now()}`
      const nuevo = {
        id:             newId,
        nombre:         data.nombre,
        rut:            data.rut,
        nacimiento:     data.nacimiento  || undefined,
        tel:            data.tel         || undefined,
        email:          data.email       || undefined,
        region:         data.region      || undefined,
        ciudad:         data.ciudad      || undefined,
        tipo:           tipoInterno,
        employmentProfile: data.tipo,    // ← conserva el perfil original (v165 de Ricardo)
        regimen:        data.regimen,
        cargo:          data.cargo,
        rol:            data.rol         || undefined,
        especialidad:   data.especialidad,
        calificacion:   Number(data.calificacion),
        disponibilidad,
        afp:            data.afp         || undefined,
        salud:          data.salud       || undefined,
        mutual:         data.mutual      || undefined,
        epp: {
          casco:    data.eppCasco    || undefined,
          polera:   data.eppPolera   || undefined,
          pantalon: data.eppPantalon || undefined,
          zapato:   data.eppZapato   || undefined,
        },
        bloqueado:    false,
        mineras:      [],
        workerItems:  [],
        creado:       new Date().toISOString().split('T')[0],
      }

      const changes = {
        trabajadores: { version: versionT, data: [...trabajadores, nuevo] },
      }

      // Si hay proyecto inicial, crear asignación con turno 'día' (igual que Ricardo v6)
      if (data.mantId) {
        const mn = mantenciones.find(m => m.id === data.mantId)
        if (mn?.minaId && !nuevo.mineras.includes(mn.minaId)) {
          nuevo.mineras.push(mn.minaId)
        }
        const nuevasAsigs = [
          ...(s?.asignaciones || []),
          { id:`asig_${newId}`, mantId: data.mantId, trabId: newId, turno:'día', estado:'preasignado' },
        ]
        changes.asignaciones = { version: versionA, data: nuevasAsigs }
      }

      await api.put('/state/modules', {
        reason:  `Alta de persona: ${data.nombre}`,
        changes,
      })

      navigate('/app/trabajadores')
    } catch (err) {
      setError(err.message || 'Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const stepContent = [
    <StepIdentidad key="identidad" data={data} onChange={onChange} />,
    <StepContrato  key="contrato"  data={data} onChange={onChange} mantenciones={mantenciones} />,
    <StepSalud     key="salud"     data={data} onChange={onChange} />,
    <StepEPP       key="epp"       data={data} onChange={onChange} />,
    <StepResumen   key="resumen"   data={data} mantenciones={mantenciones} />,
  ]

  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column', background:T.bg, overflow:'hidden' }}>

      {/* header */}
      <div style={{ background:T.surf, borderBottom:`1px solid ${T.line}`, padding:'14px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <button
            onClick={() => navigate('/app/trabajadores')}
            style={{ display:'flex', alignItems:'center', gap:6, border:'none', background:'none', cursor:'pointer', color:T.mut, fontSize:13, fontWeight:600, padding:0 }}
          >
            <IconArrowLeft size={15} strokeWidth={2} />
            Personas
          </button>
          <span style={{ color:T.line }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:T.ink }}>Nueva persona</span>
        </div>
      </div>

      {/* stepper */}
      <Stepper current={step} />

      {/* contenido */}
      <div style={{ flex:1, overflow:'auto', padding:'28px 0' }}>
        <div style={{ maxWidth:620, margin:'0 auto', padding:'0 24px' }}>

          {/* título del paso */}
          <div style={{ marginBottom:24 }}>
            <h2 style={{ fontFamily:'Manrope, sans-serif', fontWeight:800, fontSize:18, color:T.ink, margin:'0 0 4px' }}>
              {STEPS[step].label}
            </h2>
            <p style={{ fontSize:12, color:T.sub, margin:0 }}>Paso {step + 1} de {STEPS.length}</p>
          </div>

          {stepContent[step]}

          {/* error */}
          {error && (
            <div style={{ marginTop:16, padding:'10px 14px', background:T.errBg, border:`1px solid #F5C4C2`, borderRadius:8 }}>
              <p style={{ fontSize:13, color:T.err, margin:0 }}>{error}</p>
            </div>
          )}

          {/* navegación */}
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:32, paddingTop:20, borderTop:`1px solid ${T.line}` }}>
            <button
              onClick={() => step > 0 ? setStep(s => s-1) : navigate('/app/trabajadores')}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'9px 16px', border:`1px solid ${T.line}`, borderRadius:8, background:T.surf, color:T.mut, fontSize:13, fontWeight:600, cursor:'pointer' }}
              onMouseEnter={e => e.currentTarget.style.borderColor = T.pri}
              onMouseLeave={e => e.currentTarget.style.borderColor = T.line}
            >
              <IconArrowLeft size={14} strokeWidth={2} />
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s+1)}
                disabled={!canNext()}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'9px 20px',
                  border:'none', borderRadius:8, fontSize:13, fontWeight:700,
                  cursor:canNext() ? 'pointer' : 'not-allowed',
                  background:canNext() ? T.pri : T.line,
                  color:canNext() ? '#fff' : T.sub,
                  transition:'background 0.15s',
                }}
                onMouseEnter={e => { if (canNext()) e.currentTarget.style.background = T.priD }}
                onMouseLeave={e => { if (canNext()) e.currentTarget.style.background = T.pri }}
              >
                Siguiente
                <IconArrowRight size={14} strokeWidth={2} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  display:'flex', alignItems:'center', gap:6, padding:'9px 20px',
                  border:'none', borderRadius:8, fontSize:13, fontWeight:700,
                  cursor:loading ? 'not-allowed' : 'pointer',
                  background:loading ? T.line : T.ok,
                  color:loading ? T.sub : '#fff',
                }}
              >
                {loading ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} strokeWidth={2.5} />}
                {loading ? 'Guardando…' : 'Guardar persona'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
