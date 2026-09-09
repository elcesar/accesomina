import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconArrowLeft, IconArrowRight, IconCheck, IconLoader2, IconUser, IconFileText, IconHeart, IconShield, IconClipboardCheck } from '@tabler/icons-react'
import { api } from '../services/api.js'

// ─── tokens ────────────────────────────────────────────────
const T = {
  bg:'#F4EFE3', surf:'#FFFFFF', surf2:'#FBF9F5', line:'#E3DED2',
  ink:'#141A20', mut:'#5D6B7A', sub:'#8A96A1',
  pri:'#2A2A8C', priD:'#1A1A5E',
  acc:'#00CFC1', accT:'#00706A',
  ok:'#1B7F4B', okBg:'#E6F2EB',
  err:'#B3261E', errBg:'#FBE8E6',
}

// ─── constantes ─────────────────────────────────────────────
const ESPECIALIDADES = [
  'Mecánico Industrial','Soldador 6G','Eléctrico','Instrumentista',
  'Rigger','Caldererero','Operador de equipos','Prevencionista',
  'Supervisor','Técnico electrónico','Pintor industrial','Operadora',
  'Enfermero/a','Paramédico','Conductor','Administrativo','Otro',
]

const REGIONES = [
  'Arica y Parinacota','Tarapacá','Antofagasta','Atacama','Coquimbo',
  'Valparaíso','Metropolitana','O\'Higgins','Maule','Ñuble','Biobío',
  'Araucanía','Los Ríos','Los Lagos','Aysén','Magallanes',
]

const STEPS = [
  { key:'identidad',  label:'Identidad',  icon: IconUser },
  { key:'contrato',   label:'Contrato',   icon: IconFileText },
  { key:'salud',      label:'Salud',      icon: IconHeart },
  { key:'epp',        label:'EPP',        icon: IconShield },
  { key:'resumen',    label:'Resumen',    icon: IconClipboardCheck },
]

// ─── sub-componentes ─────────────────────────────────────────

const INPUT_BASE = {
  width:'100%', padding:'9px 12px', border:`1.5px solid ${T.line}`,
  borderRadius:8, fontSize:13, color:T.ink, background:T.surf,
  outline:'none', transition:'border-color 0.15s',
}

function Field({ label, required, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontSize:11.5, fontWeight:700, color:T.mut }}>
        {label}{required && <span style={{ color:T.err }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function Input({ value, onChange, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...INPUT_BASE, borderColor: focused ? T.pri : T.line }}
      {...props}
    />
  )
}

function Select({ value, onChange, children, ...props }) {
  const [focused, setFocused] = useState(false)
  return (
    <select
      value={value}
      onChange={onChange}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{ ...INPUT_BASE, borderColor: focused ? T.pri : T.line, cursor:'pointer' }}
      {...props}
    >
      {children}
    </select>
  )
}

// ─── stepper ─────────────────────────────────────────────────

function Stepper({ current }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, padding:'20px 24px', background:T.surf, borderBottom:`1px solid ${T.line}` }}>
      {STEPS.map((step, i) => {
        const done    = i < current
        const active  = i === current
        const Icon    = step.icon
        return (
          <div key={step.key} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length-1 ? 1 : 'none' }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{
                width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                background: done ? T.ok : active ? T.pri : T.line,
                color: done || active ? '#fff' : T.sub,
                transition:'all 0.2s',
              }}>
                {done ? <IconCheck size={15} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={1.8} />}
              </div>
              <span style={{ fontSize:10, fontWeight: active ? 700 : 500, color: active ? T.pri : done ? T.ok : T.sub, whiteSpace:'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length-1 && (
              <div style={{ flex:1, height:2, background: done ? T.ok : T.line, margin:'0 8px', marginBottom:18, transition:'background 0.2s' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── pasos ───────────────────────────────────────────────────

function StepIdentidad({ data, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Nombre completo" required>
          <Input value={data.nombre} onChange={e => onChange('nombre', e.target.value)} placeholder="Nombre Apellido Apellido" />
        </Field>
      </div>
      <Field label="RUT" required>
        <Input value={data.rut} onChange={e => onChange('rut', e.target.value)} placeholder="12.345.678-9" />
      </Field>
      <Field label="Fecha de nacimiento">
        <Input type="date" value={data.nacimiento} onChange={e => onChange('nacimiento', e.target.value)} />
      </Field>
      <Field label="Teléfono">
        <Input value={data.tel} onChange={e => onChange('tel', e.target.value)} placeholder="+56 9 XXXX XXXX" />
      </Field>
      <Field label="Correo electrónico">
        <Input type="email" value={data.email} onChange={e => onChange('email', e.target.value)} placeholder="correo@email.com" />
      </Field>
      <Field label="Región">
        <Select value={data.region} onChange={e => onChange('region', e.target.value)}>
          <option value="">Seleccionar región</option>
          {REGIONES.map(r => <option key={r} value={r}>{r}</option>)}
        </Select>
      </Field>
      <Field label="Comuna / Ciudad">
        <Input value={data.ciudad} onChange={e => onChange('ciudad', e.target.value)} placeholder="Ciudad o comuna" />
      </Field>
    </div>
  )
}

function StepContrato({ data, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <Field label="Tipo de contrato" required>
        <Select value={data.tipo} onChange={e => onChange('tipo', e.target.value)}>
          <option value="permanente">Permanente / Planta</option>
          <option value="esporadico">Esporádico por proyecto</option>
        </Select>
      </Field>
      <Field label="Turno / Jornada habitual">
        <Select value={data.regimen} onChange={e => onChange('regimen', e.target.value)}>
          <option value="5x2">5x2</option>
          <option value="4x3">4x3</option>
          <option value="7x7">7x7</option>
          <option value="6x1">6x1</option>
          <option value="turno_especial">Turno especial</option>
        </Select>
      </Field>
      <Field label="Cargo" required>
        <Input value={data.cargo} onChange={e => onChange('cargo', e.target.value)} placeholder="Ej: Mecánico mantenedor" />
      </Field>
      <Field label="Rol operacional">
        <Input value={data.rol} onChange={e => onChange('rol', e.target.value)} placeholder="Ej: Rigger / Supervisor" />
      </Field>
      <Field label="Especialidad" required>
        <Select value={data.especialidad} onChange={e => onChange('especialidad', e.target.value)}>
          <option value="">Seleccionar especialidad</option>
          {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
        </Select>
      </Field>
      <Field label="Calificación">
        <Select value={data.calificacion} onChange={e => onChange('calificacion', e.target.value)}>
          <option value="7">7 — A</option>
          <option value="6">6 — B</option>
          <option value="5">5 — B</option>
          <option value="4">4 — C</option>
          <option value="3">3 — C</option>
          <option value="2">2 — D</option>
          <option value="1">1 — D</option>
        </Select>
      </Field>
    </div>
  )
}

function StepSalud({ data, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ gridColumn:'1/-1' }}>
        <p style={{ fontSize:13, color:T.mut, margin:'0 0 16px', lineHeight:1.6 }}>
          Esta información se usa para gestionar documentación previsional y acceso al centro de trabajo. Puedes completarla después desde la ficha del trabajador.
        </p>
      </div>
      <Field label="AFP">
        <Input value={data.afp} onChange={e => onChange('afp', e.target.value)} placeholder="AFP Habitat, Capital, Provida…" />
      </Field>
      <Field label="Previsión de salud">
        <Input value={data.salud} onChange={e => onChange('salud', e.target.value)} placeholder="Fonasa / Isapre…" />
      </Field>
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Mutual de seguridad">
          <Input value={data.mutual} onChange={e => onChange('mutual', e.target.value)} placeholder="Mutual / ACHS / IST" />
        </Field>
      </div>
    </div>
  )
}

function StepEPP({ data, onChange }) {
  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
      <div style={{ gridColumn:'1/-1' }}>
        <p style={{ fontSize:13, color:T.mut, margin:'0 0 16px', lineHeight:1.6 }}>
          Tallas para la entrega de equipos de protección personal. Puedes completarlas después desde la ficha del trabajador.
        </p>
      </div>
      <Field label="Casco">
        <Input value={data.eppCasco} onChange={e => onChange('eppCasco', e.target.value)} placeholder="Ej: M o 56 cm" />
      </Field>
      <Field label="Polera / Camisa">
        <Input value={data.eppPolera} onChange={e => onChange('eppPolera', e.target.value)} placeholder="Ej: L" />
      </Field>
      <Field label="Pantalón">
        <Input value={data.eppPantalon} onChange={e => onChange('eppPantalon', e.target.value)} placeholder="Ej: 44" />
      </Field>
      <Field label="Zapato de seguridad">
        <Input value={data.eppZapato} onChange={e => onChange('eppZapato', e.target.value)} placeholder="Ej: 42" />
      </Field>
    </div>
  )
}

function StepResumen({ data }) {
  const rows = [
    ['Nombre',       data.nombre],
    ['RUT',          data.rut],
    ['Teléfono',     data.tel],
    ['Correo',       data.email],
    ['Región',       data.region],
    ['Ciudad',       data.ciudad],
    ['Tipo contrato',data.tipo === 'permanente' ? 'Permanente / Planta' : 'Esporádico'],
    ['Turno',        data.regimen],
    ['Cargo',        data.cargo],
    ['Especialidad', data.especialidad],
    ['Calificación', data.calificacion],
    ['AFP',          data.afp],
    ['Salud',        data.salud],
    ['Mutual',       data.mutual],
  ].filter(([, v]) => v)

  return (
    <div>
      <p style={{ fontSize:13, color:T.mut, marginBottom:16 }}>
        Revisa la información antes de guardar. Podrás completar documentos, exámenes y EPP desde la ficha del trabajador.
      </p>
      <div style={{ background:T.surf2, border:`1px solid ${T.line}`, borderRadius:10, overflow:'hidden' }}>
        {rows.map(([label, value], i) => (
          <div key={label} style={{
            display:'flex', gap:16, padding:'10px 14px',
            borderBottom: i < rows.length-1 ? `1px solid ${T.line}` : 'none',
            background: i % 2 === 0 ? T.surf : T.surf2,
          }}>
            <span style={{ fontSize:12, color:T.sub, width:130, flexShrink:0 }}>{label}</span>
            <span style={{ fontSize:12, color:T.ink, fontWeight:500 }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── página principal ─────────────────────────────────────────

const INITIAL = {
  nombre:'', rut:'', nacimiento:'', tel:'', email:'', region:'', ciudad:'',
  tipo:'permanente', regimen:'5x2', cargo:'', rol:'', especialidad:'', calificacion:'7',
  afp:'', salud:'', mutual:'',
  eppCasco:'', eppPolera:'', eppPantalon:'', eppZapato:'',
}

export default function NuevoTrabajadorPage() {
  const navigate = useNavigate()
  const [step, setStep]     = useState(0)
  const [data, setData]     = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState(null)

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
      const payload = {
        nombre:       data.nombre,
        rut:          data.rut,
        nacimiento:   data.nacimiento || undefined,
        tel:          data.tel        || undefined,
        email:        data.email      || undefined,
        region:       data.region     || undefined,
        ciudad:       data.ciudad     || undefined,
        tipo:         data.tipo,
        regimen:      data.regimen,
        cargo:        data.cargo,
        rol:          data.rol        || undefined,
        especialidad: data.especialidad,
        calificacion: Number(data.calificacion),
        disponibilidad: 'disponible',
        afp:          data.afp        || undefined,
        salud:        data.salud      || undefined,
        mutual:       data.mutual     || undefined,
        epp: {
          casco:    data.eppCasco    || undefined,
          polera:   data.eppPolera   || undefined,
          pantalon: data.eppPantalon || undefined,
          zapato:   data.eppZapato   || undefined,
        },
      }

      const stateRes = await api.get('/state')
      const trabajadores = stateRes?.state?.trabajadores ?? stateRes?.trabajadores ?? []
      const version = stateRes?.moduleVersions?.trabajadores ?? 0
      const nuevo = { ...payload, id: `t_${Date.now()}`, creado: new Date().toISOString().split('T')[0], bloqueado: false, mineras: [] }

      await api.put('/state/modules', {
        reason: `Alta de trabajador ${data.nombre}`,
        changes: {
          trabajadores: {
            version,
            data: [...trabajadores, nuevo],
          },
        },
      })

      navigate('/app/trabajadores')
    } catch (err) {
      setError(err.message || 'Error al guardar el trabajador.')
    } finally {
      setLoading(false)
    }
  }

  const stepContent = [
    <StepIdentidad data={data} onChange={onChange} />,
    <StepContrato  data={data} onChange={onChange} />,
    <StepSalud     data={data} onChange={onChange} />,
    <StepEPP       data={data} onChange={onChange} />,
    <StepResumen   data={data} />,
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
            Trabajadores
          </button>
          <span style={{ color:T.line }}>/</span>
          <span style={{ fontSize:13, fontWeight:700, color:T.ink }}>Nuevo trabajador</span>
        </div>
      </div>

      {/* stepper */}
      <Stepper current={step} />

      {/* contenido */}
      <div style={{ flex:1, overflow:'auto', padding:'28px 0' }}>
        <div style={{ maxWidth:600, margin:'0 auto', padding:'0 24px' }}>

          {/* título del paso */}
          <div style={{ marginBottom:24 }}>
            <h2 style={{ fontFamily:'Manrope, sans-serif', fontWeight:800, fontSize:18, color:T.ink, margin:'0 0 4px' }}>
              {STEPS[step].label}
            </h2>
            <p style={{ fontSize:12, color:T.sub, margin:0 }}>
              Paso {step + 1} de {STEPS.length}
            </p>
          </div>

          {/* formulario del paso */}
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
                  border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor: canNext() ? 'pointer' : 'not-allowed',
                  background: canNext() ? T.pri : T.line,
                  color: canNext() ? '#fff' : T.sub,
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
                  border:'none', borderRadius:8, fontSize:13, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                  background: loading ? T.line : T.ok,
                  color: loading ? T.sub : '#fff',
                  transition:'background 0.15s',
                }}
              >
                {loading ? <IconLoader2 size={15} className="animate-spin" /> : <IconCheck size={15} strokeWidth={2.5} />}
                {loading ? 'Guardando…' : 'Guardar trabajador'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
