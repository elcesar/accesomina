import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  IconArrowLeft, IconArrowRight, IconCheck, IconLoader2,
  IconUser, IconFileText, IconHeart, IconShield, IconClipboardCheck,
} from '@tabler/icons-react'
import { api } from '../services/api.js'
import '../styles/nuevo-trabajador.css'

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

const TIPOS = [
  { value:'permanente', label:'Trabajador fijo', desc:'Vínculo laboral permanente en la empresa' },
  { value:'esporadico', label:'Trabajador por proyecto', desc:'Movilización según necesidad operacional' },
  { value:'disponible', label:'Trabajador disponible', desc:'En pool, listo para ser asignado' },
]

const STEPS = [
  { key:'identidad', label:'Identidad', icon:IconUser },
  { key:'contrato', label:'Vinculación', icon:IconFileText },
  { key:'salud', label:'Salud', icon:IconHeart },
  { key:'epp', label:'EPP', icon:IconShield },
  { key:'resumen', label:'Resumen', icon:IconClipboardCheck },
]

const INITIAL = {
  nombre:'', rut:'', nacimiento:'', tel:'', email:'',
  region:'', ciudad:'',
  tipo:'permanente', regimen:'5x2',
  cargo:'', rol:'', especialidad:'', calificacion:'7',
  mantId:'',
  afp:'', salud:'', mutual:'',
  eppCasco:'', eppPolera:'', eppPantalon:'', eppZapato:'',
}

function Field({ label, required, hint, children, full = false }) {
  return (
    <div className={`nk-field ${full ? 'nk-person-field-full' : ''}`}>
      <label className="nk-label">
        {label}{required && <span className="nk-person-field-required"> *</span>}
      </label>
      {children}
      {hint && <p className="nk-person-field-hint">{hint}</p>}
    </div>
  )
}

function FInput(props) {
  return <input className="nk-input" {...props} />
}

function FSelect({ children, ...props }) {
  return <select className="nk-select" {...props}>{children}</select>
}

function Stepper({ current }) {
  return (
    <div className="nk-person-stepper" aria-label="Progreso de creación de persona">
      {STEPS.map((step, i) => {
        const done = i < current
        const active = i === current
        const Icon = step.icon
        return (
          <div
            key={step.key}
            className={`nk-person-step ${done ? 'is-done' : ''} ${active ? 'is-active' : ''}`}
            aria-current={active ? 'step' : undefined}
          >
            <div className="nk-person-step-marker-wrap">
              <div className="nk-person-step-marker">
                {done ? <IconCheck size={15} strokeWidth={2.5} /> : <Icon size={15} strokeWidth={1.8} />}
              </div>
              <span className="nk-person-step-label">{step.label}</span>
            </div>
            {i < STEPS.length - 1 && <div className="nk-person-step-connector" />}
          </div>
        )
      })}
    </div>
  )
}

function StepIdentidad({ data, onChange }) {
  return (
    <div className="nk-person-form-grid">
      <Field label="Nombre completo" required full>
        <FInput value={data.nombre} onChange={e => onChange('nombre', e.target.value)} placeholder="Nombre Apellido Apellido" />
      </Field>
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

function StepContrato({ data, onChange, mantenciones }) {
  return (
    <div className="nk-person-form-grid">
      <Field label="Tipo de persona" required full>
        <div className="nk-person-type-grid">
          {TIPOS.map(tipo => {
            const active = data.tipo === tipo.value
            return (
              <button
                key={tipo.value}
                type="button"
                className={`nk-person-type-option ${active ? 'is-active' : ''}`}
                onClick={() => onChange('tipo', tipo.value)}
                aria-pressed={active}
              >
                <p className="nk-person-type-title">{tipo.label}</p>
                <p className="nk-person-type-description">{tipo.desc}</p>
              </button>
            )
          })}
        </div>
      </Field>

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
          <option value="7">7 — A</option><option value="6">6 — B</option><option value="5">5 — B</option>
          <option value="4">4 — C</option><option value="3">3 — C</option><option value="2">2 — D</option><option value="1">1 — D</option>
        </FSelect>
      </Field>

      <Field label="Cargo" required>
        <FInput value={data.cargo} onChange={e => onChange('cargo', e.target.value)} placeholder="Ej: Mecánico mantenedor" />
      </Field>

      <Field label="Rol operacional">
        <FInput value={data.rol} onChange={e => onChange('rol', e.target.value)} placeholder="Ej: Rigger / Supervisor / Maestro" />
      </Field>

      <Field label="Especialidad" required full>
        <FSelect value={data.especialidad} onChange={e => onChange('especialidad', e.target.value)}>
          <option value="">Seleccionar especialidad</option>
          {ESPECIALIDADES.map(e => <option key={e} value={e}>{e}</option>)}
        </FSelect>
      </Field>

      <Field label="Asignar a proyecto / servicio inicial" hint="Opcional — puedes asignar después desde la ficha" full>
        <FSelect value={data.mantId} onChange={e => onChange('mantId', e.target.value)}>
          <option value="">Sin asignar por ahora</option>
          {mantenciones.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
        </FSelect>
      </Field>
    </div>
  )
}

function StepSalud({ data, onChange }) {
  return (
    <div className="nk-person-form-grid">
      <p className="nk-person-step-intro">Información previsional para gestión documental y acceso a faena. Puedes completarla después desde la ficha de la persona.</p>
      <Field label="AFP">
        <FInput value={data.afp} onChange={e => onChange('afp', e.target.value)} placeholder="AFP Habitat, Capital, Provida…" />
      </Field>
      <Field label="Previsión de salud">
        <FInput value={data.salud} onChange={e => onChange('salud', e.target.value)} placeholder="Fonasa / Isapre…" />
      </Field>
      <Field label="Mutual de seguridad" full>
        <FInput value={data.mutual} onChange={e => onChange('mutual', e.target.value)} placeholder="Mutual / ACHS / IST" />
      </Field>
    </div>
  )
}

function StepEPP({ data, onChange }) {
  const fields = [
    ['eppCasco', 'Casco', 'Ej: M o 56 cm'],
    ['eppPolera', 'Polera / Camisa', 'Ej: L'],
    ['eppPantalon', 'Pantalón', 'Ej: 44'],
    ['eppZapato', 'Zapato de seguridad', 'Ej: 42'],
  ]
  return (
    <div className="nk-person-form-grid">
      <p className="nk-person-step-intro">Tallas para la entrega de EPP. Confirmar físicamente antes de la primera entrega; las tallas adicionales se completan desde la ficha.</p>
      {fields.map(([key, label, placeholder]) => (
        <Field key={key} label={label}>
          <FInput value={data[key]} onChange={e => onChange(key, e.target.value)} placeholder={placeholder} />
        </Field>
      ))}
    </div>
  )
}

function StepResumen({ data, mantenciones }) {
  const tipoLabel = TIPOS.find(t => t.value === data.tipo)?.label || data.tipo
  const mantLabel = mantenciones.find(m => m.id === data.mantId)?.nombre
  const rows = [
    ['Nombre', data.nombre], ['RUT', data.rut], ['Teléfono', data.tel], ['Correo', data.email],
    ['Región', data.region], ['Ciudad / Comuna', data.ciudad], ['Tipo de persona', tipoLabel],
    ['Turno / Jornada', data.regimen], ['Cargo', data.cargo], ['Rol operacional', data.rol],
    ['Especialidad', data.especialidad], ['Calificación', data.calificacion], ['Proyecto inicial', mantLabel],
    ['AFP', data.afp], ['Previsión salud', data.salud], ['Mutual', data.mutual],
    ['Casco', data.eppCasco], ['Polera', data.eppPolera], ['Pantalón', data.eppPantalon], ['Zapato', data.eppZapato],
  ].filter(([, value]) => value)

  return (
    <div>
      <p className="nk-person-step-intro">Revisa la información antes de guardar. La documentación, exámenes y recursos adicionales se completan desde la ficha de la persona.</p>
      <div className="nk-person-summary">
        {rows.map(([label, value]) => (
          <div key={label} className="nk-person-summary-row">
            <span className="nk-person-summary-label">{label}</span>
            <span className="nk-person-summary-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function NuevoTrabajadorPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [data, setData] = useState(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stateData, setStateData] = useState(null)

  useEffect(() => {
    api.get('/state').then(r => setStateData(r?.state || r)).catch(() => {})
  }, [])

  const mantenciones = stateData?.mantenciones || []

  function onChange(field, value) {
    setData(current => ({ ...current, [field]: value }))
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
      const stateRes = await api.get('/state')
      const state = stateRes?.state || stateRes
      const trabajadores = state?.trabajadores || []
      const versionT = stateRes?.moduleVersions?.trabajadores ?? 0
      const versionA = stateRes?.moduleVersions?.asignaciones ?? 0

      const tipoInterno = data.tipo === 'disponible' ? 'esporadico' : data.tipo
      const disponibilidad = data.tipo === 'disponible' ? 'disponible' : data.mantId ? 'asignado' : 'disponible'
      const newId = `t_${Date.now()}`
      const nuevo = {
        id: newId,
        nombre: data.nombre,
        rut: data.rut,
        nacimiento: data.nacimiento || undefined,
        tel: data.tel || undefined,
        email: data.email || undefined,
        region: data.region || undefined,
        ciudad: data.ciudad || undefined,
        tipo: tipoInterno,
        employmentProfile: data.tipo,
        regimen: data.regimen,
        cargo: data.cargo,
        rol: data.rol || undefined,
        especialidad: data.especialidad,
        calificacion: Number(data.calificacion),
        disponibilidad,
        afp: data.afp || undefined,
        salud: data.salud || undefined,
        mutual: data.mutual || undefined,
        epp: {
          casco: data.eppCasco || undefined,
          polera: data.eppPolera || undefined,
          pantalon: data.eppPantalon || undefined,
          zapato: data.eppZapato || undefined,
        },
        bloqueado: false,
        mineras: [],
        workerItems: [],
        creado: new Date().toISOString().split('T')[0],
      }

      const changes = {
        trabajadores: { version: versionT, data: [...trabajadores, nuevo] },
      }

      if (data.mantId) {
        const mantencion = mantenciones.find(m => m.id === data.mantId)
        if (mantencion?.minaId && !nuevo.mineras.includes(mantencion.minaId)) nuevo.mineras.push(mantencion.minaId)
        changes.asignaciones = {
          version: versionA,
          data: [
            ...(state?.asignaciones || []),
            { id:`asig_${newId}`, mantId:data.mantId, trabId:newId, turno:'día', estado:'preasignado' },
          ],
        }
      }

      await api.put('/state/modules', {
        reason: `Alta de persona: ${data.nombre}`,
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
    <StepContrato key="contrato" data={data} onChange={onChange} mantenciones={mantenciones} />,
    <StepSalud key="salud" data={data} onChange={onChange} />,
    <StepEPP key="epp" data={data} onChange={onChange} />,
    <StepResumen key="resumen" data={data} mantenciones={mantenciones} />,
  ]

  return (
    <div className="nk-person-create-page">
      <div className="nk-person-create-breadcrumb">
        <button className="nk-button nk-button-quiet" type="button" onClick={() => navigate('/app/trabajadores')}>
          <IconArrowLeft size={15} strokeWidth={2} />
          Personas
        </button>
        <span className="nk-person-create-breadcrumb-separator">/</span>
        <span className="nk-person-create-breadcrumb-current">Nueva persona</span>
      </div>

      <Stepper current={step} />

      <div className="nk-person-create-scroll">
        <div className="nk-person-create-content">
          <div className="nk-person-create-heading">
            <h1 className="nk-person-create-title">{STEPS[step].label}</h1>
            <p className="nk-person-create-progress-label">Paso {step + 1} de {STEPS.length}</p>
          </div>

          {stepContent[step]}

          {error && <div className="nk-person-create-error" role="alert">{error}</div>}

          <div className="nk-person-create-actions">
            <button
              className="nk-button nk-button-secondary"
              type="button"
              onClick={() => step > 0 ? setStep(current => current - 1) : navigate('/app/trabajadores')}
            >
              <IconArrowLeft size={14} strokeWidth={2} />
              {step === 0 ? 'Cancelar' : 'Anterior'}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                className="nk-button nk-button-primary"
                type="button"
                onClick={() => setStep(current => current + 1)}
                disabled={!canNext()}
              >
                Siguiente
                <IconArrowRight size={14} strokeWidth={2} />
              </button>
            ) : (
              <button
                className="nk-button nk-button-success"
                type="button"
                onClick={handleSubmit}
                disabled={loading}
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
