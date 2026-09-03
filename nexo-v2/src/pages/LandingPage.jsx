import { Link } from 'react-router-dom'
import {
  IconUsers, IconFileText, IconShieldCheck, IconBell,
  IconBuildingFactory2, IconTruck, IconHelmet, IconChartBar,
  IconArrowRight, IconCheck, IconLock, IconMenu2, IconX,
} from '@tabler/icons-react'
import { useState } from 'react'

// ─── TOKENS (sistema de color Nexo Klar v1.0 — Mezcla F) ────
const T = {
  bg:     '#F4EFE3',
  surf:   '#FFFFFF',
  surf2:  '#FBF9F5',
  line:   '#E3DED2',
  ink:    '#141A20',
  mut:    '#5D6B7A',
  sub:    '#8A96A1',
  pri:    '#2A2A8C',
  priD:   '#1A1A5E',
  priLt:  '#E3E3F0',
  graph:  '#26313A',
  acc:    '#00CFC1',
  accT:   '#00706A',
  ok:     '#1B7F4B',
  okBg:   '#E6F2EB',
  warn:   '#C77700',
  warnBg: '#FBF1DF',
}

// ─── CONTENIDO (basado en Ricardo v6 AccesoMina_v6.html) ─────

const NAV_LINKS = [
  { label: 'Solución',        href: '#solucion' },
  { label: 'Producto',        href: '#producto' },
  { label: 'Industrias',      href: '#industrias' },
  { label: 'Implementación',  href: '#implementacion' },
  { label: 'Propósito',       href: '#proposito' },
]

// Hero — headline, copy y puntos clave del HTML de Ricardo
const HERO_POINTS = [
  {
    title: 'Una fuente común',
    desc:  'Tu equipo trabaja con información ordenada, conectada y disponible.',
  },
  {
    title: 'Servicios preparados',
    desc:  'Detecta vencimientos, faltantes y restricciones antes de ejecutar.',
  },
  {
    title: 'Historial que permanece',
    desc:  'El conocimiento queda en la empresa, no disperso en planillas o correos.',
  },
]

// Ámbitos (audience strip de Ricardo)
const AMBITOS = [
  'Empresas de servicios',
  'Contratistas y empresas colaboradoras',
  'Operaciones en terreno',
  'Órdenes de servicio y proyectos',
  'RR.HH. y prevención',
]

// Solución — módulos principales
const MODULOS = [
  { icon: IconUsers,            title: 'Personas y dotación',        desc: 'Gestiona trabajadores fijos y por proyecto, documentos, exámenes, EPP y habilitaciones desde una sola ficha.' },
  { icon: IconFileText,         title: 'Contratos y órdenes',        desc: 'Conecta clientes, contratos y órdenes de servicio con el personal asignado, sus documentos y su estado de cumplimiento.' },
  { icon: IconShieldCheck,      title: 'Acreditación y cumplimiento',desc: 'Controla el estado documental de personas, vehículos y empresa ante cada mandante. Alertas automáticas de vencimiento.' },
  { icon: IconBell,             title: 'Alertas operativas',         desc: 'Panel centralizado con vencimientos, faltantes y restricciones detectadas antes de que afecten el servicio.' },
  { icon: IconTruck,            title: 'Vehículos y recursos',       desc: 'Equipos, vehículos, credenciales y maquinaria con documentación y trazabilidad por cliente y proyecto.' },
  { icon: IconChartBar,         title: 'Reportes y trazabilidad',    desc: 'Historial completo de cambios, documentos y asignaciones. El conocimiento queda en la empresa.' },
]

// Industrias (industry-grid de Ricardo)
const INDUSTRIAS = [
  { icon: IconBuildingFactory2, label: 'Minería',              desc: 'Gestión de dotación, acreditación y cumplimiento ante mandantes mineros.' },
  { icon: IconHelmet,           label: 'Construcción',         desc: 'Control de personal, subcontratos y documentación en múltiples faenas.' },
  { icon: IconTruck,            label: 'Servicios industriales',desc: 'Contratistas de mantenimiento, montaje y operaciones con personal rotante.' },
  { icon: IconShieldCheck,      label: 'Prevención y RRHH',    desc: 'Centraliza exámenes, protocolos, EPP y cumplimiento de la normativa vigente.' },
]

// Pasos de implementación (steps de Ricardo)
const PASOS = [
  { n: '01', title: 'Configura tu empresa',     desc: 'Define clientes, contratos, órdenes de servicio y los requisitos operacionales que necesitas controlar.' },
  { n: '02', title: 'Incorpora tu información', desc: 'Registra personas y recursos de forma individual o utiliza importación masiva para comenzar más rápido.' },
  { n: '03', title: 'Gestiona desde el panel',  desc: 'Asigna responsables, revisa alertas, actualiza documentos y consulta el avance desde una sola vista.' },
]

// Privacidad (privacy-points de Ricardo)
const PRIVACY_POINTS = [
  { title: 'Acceso individual',    desc: 'Cada integrante utiliza su propia cuenta autorizada.' },
  { title: 'Roles y permisos',     desc: 'Configura administración, edición o consulta según responsabilidades.' },
  { title: 'Datos separados',      desc: 'La información de una empresa no se mezcla con la de otra.' },
  { title: 'Historial y trazabilidad', desc: 'Conserva registros para revisar cambios, estados y antecedentes.' },
]

// Valores (purpose-values de Ricardo)
const VALORES = [
  { title: 'Claridad',      desc: 'Información fácil de entender, seguir y gestionar.' },
  { title: 'Conexión',      desc: 'Áreas, personas, documentos y procesos en una plataforma.' },
  { title: 'Control',       desc: 'Datos seguros, actualizados y dentro de la compañía.' },
  { title: 'Continuidad',   desc: 'El conocimiento permanece aunque cambien los equipos.' },
  { title: 'Confianza',     desc: 'Cuidamos la información como si fuera nuestra: precisa, respaldada y siempre bajo el control de la empresa.' },
]

// ─── SUB-COMPONENTES ─────────────────────────────────────────

function Navbar({ menuOpen, setMenuOpen }) {
  return (
    <nav style={{
      height: 72, display: 'flex', alignItems: 'center',
      justifyContent: 'space-between', padding: '0 6vw',
      background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(16px)',
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
      borderBottom: `1px solid ${T.line}`,
      boxShadow: '0 4px 16px rgba(20,26,32,0.05)',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, background: T.pri,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ color: T.acc, fontWeight: 800, fontSize: 17, fontFamily: 'Manrope, sans-serif' }}>N</span>
        </div>
        <div>
          <p style={{ fontFamily: 'Manrope, sans-serif', fontWeight: 800, fontSize: 16, color: T.ink, margin: 0, lineHeight: 1 }}>
            Nexo <span style={{ color: T.accT }}>Klar</span>
          </p>
          <p style={{ fontSize: 10, color: T.sub, margin: '2px 0 0', lineHeight: 1 }}>Operación conectada</p>
        </div>
      </div>

      {/* Nav links desktop */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }} className="hidden lg:flex">
        {NAV_LINKS.map(({ label, href }) => (
          <a key={href} href={href} style={{
            padding: '6px 14px', fontSize: 13, fontWeight: 500,
            color: T.mut, textDecoration: 'none', borderRadius: 8,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = T.pri; e.currentTarget.style.background = T.priLt }}
          onMouseLeave={e => { e.currentTarget.style.color = T.mut; e.currentTarget.style.background = 'transparent' }}
          >{label}</a>
        ))}
      </div>

      {/* CTA desktop */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="hidden lg:flex">
        <Link to="/login" style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 600,
          color: T.pri, textDecoration: 'none', borderRadius: 8,
          border: `1.5px solid ${T.pri}`, transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.priLt}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >Ingresar</Link>
        <a href="#clientes-access" style={{
          padding: '7px 16px', fontSize: 13, fontWeight: 700,
          color: '#fff', textDecoration: 'none', borderRadius: 8,
          background: T.pri, transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = T.priD}
        onMouseLeave={e => e.currentTarget.style.background = T.pri}
        >Solicitar acceso</a>
      </div>

      {/* Hamburger mobile */}
      <button
        onClick={() => setMenuOpen(v => !v)}
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: T.ink, padding: 6, display: 'flex' }}
        className="flex lg:hidden"
      >
        {menuOpen ? <IconX size={22} /> : <IconMenu2 size={22} />}
      </button>
    </nav>
  )
}

function MobileMenu({ open, onClose }) {
  if (!open) return null
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 49, background: T.surf,
      paddingTop: 80, display: 'flex', flexDirection: 'column', padding: '80px 24px 32px',
    }}>
      {NAV_LINKS.map(({ label, href }) => (
        <a key={href} href={href} onClick={onClose} style={{
          padding: '14px 0', fontSize: 16, fontWeight: 600, color: T.ink,
          textDecoration: 'none', borderBottom: `1px solid ${T.line}`,
        }}>{label}</a>
      ))}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 24 }}>
        <Link to="/login" onClick={onClose} style={{
          padding: '12px', fontSize: 14, fontWeight: 700, color: T.pri,
          textDecoration: 'none', borderRadius: 8, border: `1.5px solid ${T.pri}`,
          textAlign: 'center',
        }}>Ingresar</Link>
        <a href="#clientes-access" onClick={onClose} style={{
          padding: '12px', fontSize: 14, fontWeight: 700, color: '#fff',
          textDecoration: 'none', borderRadius: 8, background: T.pri, textAlign: 'center',
        }}>Solicitar acceso</a>
      </div>
    </div>
  )
}

function Section({ id, children, bg, style = {} }) {
  return (
    <section id={id} style={{ background: bg || T.surf, ...style }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 6vw' }}>
        {children}
      </div>
    </section>
  )
}

function Eyebrow({ children }) {
  return (
    <p style={{
      fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase',
      color: T.accT, marginBottom: 12,
    }}>{children}</p>
  )
}

function Heading({ children, center, style = {} }) {
  return (
    <h2 style={{
      fontFamily: 'Manrope, sans-serif', fontWeight: 800,
      fontSize: 'clamp(26px, 3.5vw, 42px)', color: T.ink,
      lineHeight: 1.18, margin: '0 0 16px',
      textAlign: center ? 'center' : 'left', ...style,
    }}>{children}</h2>
  )
}

function Lead({ children, center, style = {} }) {
  return (
    <p style={{
      fontSize: 16, color: T.mut, lineHeight: 1.7, margin: '0 0 32px',
      maxWidth: center ? 640 : undefined,
      marginLeft: center ? 'auto' : undefined,
      marginRight: center ? 'auto' : undefined,
      textAlign: center ? 'center' : 'left', ...style,
    }}>{children}</p>
  )
}

// ─── PÁGINA ──────────────────────────────────────────────────
export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', background: T.bg }}>
      <Navbar menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── HERO ───────────────────────────────────────────── */}
      <div style={{
        minHeight: 'calc(100vh - 72px)', marginTop: 72,
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 'clamp(32px,4vw,64px)', alignItems: 'center',
        padding: 'clamp(40px,5vw,80px) 6vw',
        maxWidth: 1300, margin: '72px auto 0',
      }}>
        {/* copy */}
        <div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 12px', borderRadius: 99,
            background: T.priLt, marginBottom: 20,
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.acc, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: T.pri, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Plataforma operativa para empresas de servicios
            </span>
          </div>

          <h1 style={{
            fontFamily: 'Manrope, sans-serif', fontWeight: 800,
            fontSize: 'clamp(30px,4vw,52px)', color: T.ink,
            lineHeight: 1.15, margin: '0 0 20px',
          }}>
            Convierte información dispersa en una{' '}
            <span style={{ color: T.pri }}>operación que avanza.</span>
          </h1>

          <p style={{ fontSize: 16, color: T.mut, lineHeight: 1.72, margin: '0 0 28px', maxWidth: 520 }}>
            Nexo Klar conecta clientes, contratos, órdenes de servicio, personas, documentos y recursos para que tu equipo sepa qué está listo, qué falta y quién debe actuar.
          </p>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 40 }}>
            <a href="#clientes-access" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '11px 22px', borderRadius: 9, background: T.pri, color: '#fff',
              fontSize: 14, fontWeight: 700, textDecoration: 'none', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.priD}
            onMouseLeave={e => e.currentTarget.style.background = T.pri}
            >
              Solicitar acceso
              <IconArrowRight size={15} strokeWidth={2.2} />
            </a>
            <a href="#producto" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '11px 22px', borderRadius: 9, color: T.pri,
              fontSize: 14, fontWeight: 600, textDecoration: 'none',
              border: `1.5px solid ${T.pri}`, transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.priLt}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Ver el producto</a>
          </div>

          {/* hero points */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {HERO_POINTS.map(({ title, desc }) => (
              <div key={title} style={{
                padding: 14, borderRadius: 10,
                background: 'rgba(255,255,255,0.72)',
                border: `1px solid ${T.line}`,
                boxShadow: '0 4px 16px rgba(20,26,32,0.05)',
              }}>
                <p style={{ fontWeight: 700, fontSize: 12, color: T.ink, margin: '0 0 5px' }}>{title}</p>
                <p style={{ fontSize: 11, color: T.mut, margin: 0, lineHeight: 1.55 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* visual */}
        <div style={{ position: 'relative' }}>
          <div style={{
            padding: 12, borderRadius: 14,
            border: `1px solid ${T.line}`,
            background: T.surf,
            boxShadow: '0 28px 80px rgba(20,26,32,0.14)',
          }}>
            {/* mockup dashboard */}
            <div style={{ borderRadius: 8, overflow: 'hidden', background: T.bg }}>
              {/* topbar mockup */}
              <div style={{ height: 40, background: T.surf, borderBottom: `1px solid ${T.line}`, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF5A3C' }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.warn }} />
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: T.ok }} />
                <div style={{ flex: 1, height: 24, borderRadius: 6, background: T.surf2, marginLeft: 8 }} />
              </div>
              {/* content mockup */}
              <div style={{ display: 'flex', height: 320 }}>
                {/* sidebar */}
                <div style={{ width: 140, background: T.surf, borderRight: `1px solid ${T.line}`, padding: 10 }}>
                  {['Panel General','Personas','Contratos','Alertas','Reportes'].map((item, i) => (
                    <div key={item} style={{
                      padding: '7px 10px', borderRadius: 7, marginBottom: 3,
                      background: i === 0 ? T.priLt : 'transparent',
                      color: i === 0 ? T.pri : T.mut,
                      fontSize: 10, fontWeight: i === 0 ? 700 : 400,
                    }}>{item}</div>
                  ))}
                </div>
                {/* main */}
                <div style={{ flex: 1, padding: 14 }}>
                  {/* KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 12 }}>
                    {[
                      { label: 'Trabajadores', val: '87', color: T.pri },
                      { label: 'Proyectos activos', val: '12', color: T.ok },
                      { label: 'Alertas', val: '5', color: T.warn },
                      { label: 'Acreditación', val: '94%', color: T.acc },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ padding: '8px 10px', borderRadius: 7, background: T.surf, border: `1px solid ${T.line}` }}>
                        <p style={{ fontSize: 16, fontWeight: 800, color, margin: 0 }}>{val}</p>
                        <p style={{ fontSize: 9, color: T.sub, margin: '2px 0 0' }}>{label}</p>
                      </div>
                    ))}
                  </div>
                  {/* table mockup */}
                  <div style={{ background: T.surf, borderRadius: 7, border: `1px solid ${T.line}`, overflow: 'hidden' }}>
                    <div style={{ background: T.graph, padding: '7px 10px', display: 'flex', gap: 24 }}>
                      {['Trabajador','Especialidad','Estado','Acred.'].map(h => (
                        <span key={h} style={{ fontSize: 9, fontWeight: 700, color: '#fff', flex: 1 }}>{h}</span>
                      ))}
                    </div>
                    {[
                      { nombre:'Juan Pérez', esp:'Mecánico', est:'Vigente', pct:'100%', ok:true },
                      { nombre:'Ana López',  esp:'Rigger',   est:'Por vencer','pct':'80%', ok:false },
                      { nombre:'Carlos Soto',esp:'Eléctrico',est:'Vigente', pct:'95%', ok:true },
                    ].map(({ nombre, esp, est, pct, ok }, i) => (
                      <div key={nombre} style={{ display:'flex', gap:24, padding:'7px 10px', background: i%2===0?T.surf:T.surf2 }}>
                        <span style={{ fontSize:9, color:T.ink, fontWeight:600, flex:1 }}>{nombre}</span>
                        <span style={{ fontSize:9, color:T.mut, flex:1 }}>{esp}</span>
                        <span style={{ fontSize:9, flex:1 }}>
                          <span style={{ padding:'1px 5px', borderRadius:99, fontSize:8, fontWeight:700, background: ok?T.okBg:T.warnBg, color: ok?T.ok:T.warn }}>{est}</span>
                        </span>
                        <span style={{ fontSize:9, color: ok?T.ok:T.warn, fontWeight:700, flex:1 }}>{pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* caption */}
          <p style={{ fontSize: 11, color: T.sub, textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
            Vista real de Nexo Klar con información demostrativa.<br />Cada empresa trabaja con sus propios datos privados.
          </p>
        </div>
      </div>

      {/* ── AUDIENCE STRIP ─────────────────────────────────── */}
      <div style={{ background: T.pri, padding: '14px 6vw', overflowX: 'auto' }}>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', maxWidth: 1200, margin: '0 auto' }}>
          {AMBITOS.map(a => (
            <span key={a} style={{
              padding: '5px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.85)',
              border: '1px solid rgba(255,255,255,0.2)', whiteSpace: 'nowrap',
            }}>{a}</span>
          ))}
        </div>
      </div>

      {/* ── SOLUCIÓN ───────────────────────────────────────── */}
      <Section id="solucion" bg={T.bg}>
        <Eyebrow>Solución</Eyebrow>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(24px,4vw,64px)', alignItems: 'start' }}>
          <div>
            <Heading>Todo lo que necesitas para coordinar tu operación.</Heading>
            <Lead>
              Una plataforma que centraliza personas, documentos, contratos y recursos en un flujo de trabajo ordenado, accesible y trazable para cada equipo autorizado.
            </Lead>
            <a href="#clientes-access" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 8, background: T.pri, color: '#fff',
              fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.priD}
            onMouseLeave={e => e.currentTarget.style.background = T.pri}
            >
              Solicitar demostración
              <IconArrowRight size={14} strokeWidth={2} />
            </a>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {MODULOS.map(({ icon: Icon, title, desc }) => (
              <div key={title} style={{
                padding: 18, borderRadius: 12,
                background: T.surf, border: `1px solid ${T.line}`,
                boxShadow: '0 2px 12px rgba(20,26,32,0.04)',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9,
                  background: T.priLt, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10,
                }}>
                  <Icon size={18} strokeWidth={1.7} style={{ color: T.pri }} />
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, color: T.ink, margin: '0 0 6px' }}>{title}</p>
                <p style={{ fontSize: 11, color: T.mut, margin: 0, lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ── PRODUCTO ───────────────────────────────────────── */}
      <Section id="producto" bg={T.surf}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(32px,4vw,64px)', alignItems: 'center' }}>
          <div>
            <Eyebrow>Producto real</Eyebrow>
            <Heading>Ve la operación antes de que un pendiente detenga el servicio.</Heading>
            <Lead>
              Revisa dotación, órdenes de servicio, vencimientos, pendientes y alertas desde un panel centralizado. Identifica rápidamente qué está listo, qué falta y quién debe actuar.
            </Lead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Alertas automáticas de vencimiento de documentos y exámenes','Panel de cobertura por orden de servicio','Ficha completa por trabajador con historial y documentos','Acreditación consolidada por mandante y proyecto'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: T.okBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                    <IconCheck size={11} strokeWidth={2.5} style={{ color: T.ok }} />
                  </div>
                  <span style={{ fontSize: 13, color: T.mut, lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{
            padding: 12, borderRadius: 14, border: `1px solid ${T.line}`,
            background: T.bg, boxShadow: '0 16px 48px rgba(20,26,32,0.10)',
          }}>
            {/* Panel demo simplificado */}
            <div style={{ background: T.surf, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: T.graph, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>Panel General</p>
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>nexoklar.com</span>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  {[
                    { label:'Órdenes activas', val:'12', color: T.pri },
                    { label:'Alertas urgentes', val:'5',  color: T.warn },
                    { label:'Con brecha',       val:'3',  color: T.ok },
                    { label:'Acreditación',     val:'94%',color: T.acc },
                  ].map(({ label, val, color }) => (
                    <div key={label} style={{ padding:'10px 12px', borderRadius:8, background: T.surf2, border:`1px solid ${T.line}` }}>
                      <p style={{ fontSize:20, fontWeight:800, color, margin:0 }}>{val}</p>
                      <p style={{ fontSize:10, color:T.sub, margin:'3px 0 0' }}>{label}</p>
                    </div>
                  ))}
                </div>
                <div style={{ background: T.surf2, borderRadius: 8, padding: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: T.ink, margin: '0 0 8px' }}>Alertas recientes</p>
                  {[
                    { msg: 'Licencia conducir vence en 3 días — Carlos Soto', tipo: 'warn' },
                    { msg: 'Examen preocupacional vencido — María González', tipo: 'err' },
                    { msg: 'Cobertura completa — OT Faena Norte', tipo: 'ok' },
                  ].map(({ msg, tipo }) => {
                    const colors = { warn: { bg: T.warnBg, c: T.warn }, err: { bg: '#FBE8E6', c: '#B3261E' }, ok: { bg: T.okBg, c: T.ok } }
                    const s = colors[tipo]
                    return (
                      <div key={msg} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:6 }}>
                        <span style={{ width:8, height:8, borderRadius:'50%', background:s.c, flexShrink:0, marginTop:4 }} />
                        <span style={{ fontSize:11, color:T.mut, lineHeight:1.5 }}>{msg}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <p style={{ fontSize:10, color:T.sub, textAlign:'center', margin:'10px 0 0', lineHeight:1.5 }}>
              Vista real con información demostrativa · Cada empresa trabaja con sus propios datos
            </p>
          </div>
        </div>
      </Section>

      {/* ── INDUSTRIAS ─────────────────────────────────────── */}
      <Section id="industrias" bg={T.bg}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Eyebrow>Adaptable a tu industria</Eyebrow>
          <Heading center>Se adapta a la forma en que trabaja tu empresa.</Heading>
          <Lead center>Una misma base de información para coordinar personas, recursos, documentación, turnos y servicios en terreno, adaptada a la realidad de cada industria.</Lead>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
          {INDUSTRIAS.map(({ icon: Icon, label, desc }) => (
            <div key={label} style={{
              padding: 24, borderRadius: 12, background: T.surf,
              border: `1px solid ${T.line}`, textAlign: 'center',
              boxShadow: '0 2px 12px rgba(20,26,32,0.04)',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(42,42,140,0.10)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(20,26,32,0.04)'}
            >
              <div style={{ width:48, height:48, borderRadius:12, background:T.priLt, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }}>
                <Icon size={22} strokeWidth={1.5} style={{ color: T.pri }} />
              </div>
              <p style={{ fontWeight:700, fontSize:14, color:T.ink, margin:'0 0 8px' }}>{label}</p>
              <p style={{ fontSize:12, color:T.mut, margin:0, lineHeight:1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── IMPLEMENTACIÓN ─────────────────────────────────── */}
      <Section id="implementacion" bg={T.surf}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'clamp(32px,4vw,64px)', alignItems: 'start' }}>
          <div>
            <Eyebrow>Puesta en marcha simple</Eyebrow>
            <Heading>Empieza ordenado, sin detener tu operación.</Heading>
            <Lead>Partimos con una estructura clara, acompañamos la carga inicial y dejamos la información disponible para cada equipo autorizado.</Lead>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {PASOS.map(({ n, title, desc }) => (
                <div key={n} style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: T.pri,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, color: '#fff', fontWeight: 800, fontSize: 13,
                    fontFamily: 'Manrope, sans-serif',
                  }}>{n}</div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: T.ink, margin: '0 0 4px' }}>{title}</p>
                    <p style={{ fontSize: 13, color: T.mut, margin: 0, lineHeight: 1.6 }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* privacidad */}
          <div style={{ background: T.bg, borderRadius: 14, padding: 28, border: `1px solid ${T.line}` }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:T.priLt, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <IconLock size={18} strokeWidth={1.7} style={{ color: T.pri }} />
              </div>
              <p style={{ fontWeight:700, fontSize:15, color:T.ink, margin:0 }}>Tu información es de tu empresa.</p>
            </div>
            <p style={{ fontSize:13, color:T.mut, lineHeight:1.7, margin:'0 0 20px' }}>
              Cada empresa trabaja en un espacio privado e independiente. Sus usuarios, permisos, configuraciones y datos permanecen separados de las demás organizaciones.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {PRIVACY_POINTS.map(({ title, desc }) => (
                <div key={title} style={{ padding:'12px 14px', borderRadius:10, background:T.surf, border:`1px solid ${T.line}` }}>
                  <p style={{ fontWeight:700, fontSize:12, color:T.ink, margin:'0 0 4px' }}>{title}</p>
                  <p style={{ fontSize:11, color:T.mut, margin:0, lineHeight:1.5 }}>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── PROPÓSITO ──────────────────────────────────────── */}
      <Section id="proposito" bg={T.pri}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <p style={{ fontSize:11, fontWeight:800, letterSpacing:'0.12em', textTransform:'uppercase', color:T.acc, marginBottom:12 }}>Nuestro propósito</p>
          <h2 style={{ fontFamily:'Manrope, sans-serif', fontWeight:800, fontSize:'clamp(24px,3vw,38px)', color:'#fff', lineHeight:1.2, margin:'0 0 16px' }}>
            Información clara que permanece y genera continuidad.
          </h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.72)', lineHeight:1.7, maxWidth:580, margin:'0 auto 40px' }}>
            Nexo Klar nace para simplificar, unificar y conectar la gestión diaria, evitando que la información crítica quede dispersa en personas, planillas, correos o carpetas.
          </p>
        </div>

        {/* misión / visión */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:40 }}>
          {[
            { label:'Visión', title:'Una operación más simple y controlada', desc:'Ser la plataforma que ayuda a las empresas a simplificar, unificar y controlar su información operativa, manteniendo los datos críticos dentro de la compañía.' },
            { label:'Misión', title:'Conectar la información que mueve a la empresa', desc:'Conectar personas, documentos, contratos y operaciones en un sistema simple, con información clara, estructurada y trazable para reducir riesgos y tomar mejores decisiones.' },
          ].map(({ label, title, desc }) => (
            <div key={label} style={{ padding:24, borderRadius:12, background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)' }}>
              <p style={{ fontSize:10, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:T.acc, margin:'0 0 8px' }}>{label}</p>
              <p style={{ fontWeight:700, fontSize:15, color:'#fff', margin:'0 0 10px' }}>{title}</p>
              <p style={{ fontSize:13, color:'rgba(255,255,255,0.70)', lineHeight:1.65, margin:0 }}>{desc}</p>
            </div>
          ))}
        </div>

        {/* valores — 5C */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
          {VALORES.map(({ title, desc }) => (
            <div key={title} style={{ padding:'16px 18px', borderRadius:10, background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)' }}>
              <p style={{ fontWeight:800, fontSize:13, color:T.acc, margin:'0 0 6px' }}>{title}</p>
              <p style={{ fontSize:12, color:'rgba(255,255,255,0.68)', margin:0, lineHeight:1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── ACCESO CLIENTES ────────────────────────────────── */}
      <Section id="clientes-access" bg={T.surf}>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'clamp(32px,4vw,64px)', alignItems:'center' }}>
          <div>
            <Eyebrow>Clientes Nexo Klar</Eyebrow>
            <Heading>Un espacio privado para cada empresa.</Heading>
            <Lead>Cada integrante accede con su cuenta autorizada y trabaja únicamente con la información, permisos y configuración de su empresa.</Lead>
            <Link to="/login" style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'11px 22px', borderRadius:9, background:T.pri, color:'#fff',
              fontSize:14, fontWeight:700, textDecoration:'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.priD}
            onMouseLeave={e => e.currentTarget.style.background = T.pri}
            >
              Ingresar a mi cuenta
              <IconArrowRight size={15} strokeWidth={2} />
            </Link>
          </div>
          <div style={{ background:T.bg, borderRadius:14, padding:32, border:`1px solid ${T.line}`, textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:14, background:T.priLt, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
              <IconLock size={26} strokeWidth={1.5} style={{ color:T.pri }} />
            </div>
            <p style={{ fontWeight:800, fontSize:16, color:T.ink, margin:'0 0 8px', fontFamily:'Manrope, sans-serif' }}>Acceso seguro y privado</p>
            <p style={{ fontSize:13, color:T.mut, margin:'0 0 24px', lineHeight:1.6 }}>
              Tu empresa tiene su propio espacio. Nadie más puede ver tu información, tus documentos ni tu configuración.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {['Sesión con autenticación en dos pasos (MFA)','Datos cifrados en reposo y en tránsito','Acceso controlado por roles y permisos','Cumplimiento Ley 21.719 de protección de datos'].map(item => (
                <div key={item} style={{ display:'flex', alignItems:'center', gap:10, textAlign:'left' }}>
                  <IconCheck size={13} strokeWidth={2.5} style={{ color:T.ok, flexShrink:0 }} />
                  <span style={{ fontSize:12, color:T.mut }}>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ── FINAL CTA ──────────────────────────────────────── */}
      <div style={{ background:T.bg, padding:'80px 6vw', textAlign:'center' }}>
        <div style={{ maxWidth:560, margin:'0 auto' }}>
          <Eyebrow>¿Lista tu empresa?</Eyebrow>
          <h2 style={{ fontFamily:'Manrope, sans-serif', fontWeight:800, fontSize:'clamp(26px,3.5vw,40px)', color:T.ink, lineHeight:1.2, margin:'0 0 16px' }}>
            Empieza a operar con información confiable.
          </h2>
          <p style={{ fontSize:15, color:T.mut, lineHeight:1.7, margin:'0 0 32px' }}>
            Tu operación comienza con un nexo de información confiable. Conecta tu equipo, tus contratos y tus proyectos en un solo lugar.
          </p>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            <a href="mailto:contacto@nexoklar.com" style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'12px 24px', borderRadius:9, background:T.pri, color:'#fff',
              fontSize:14, fontWeight:700, textDecoration:'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.priD}
            onMouseLeave={e => e.currentTarget.style.background = T.pri}
            >
              Solicitar demostración
              <IconArrowRight size={15} strokeWidth={2} />
            </a>
            <Link to="/login" style={{
              display:'inline-flex', alignItems:'center', gap:6,
              padding:'12px 24px', borderRadius:9, color:T.pri,
              fontSize:14, fontWeight:600, textDecoration:'none',
              border:`1.5px solid ${T.pri}`,
            }}
            onMouseEnter={e => e.currentTarget.style.background = T.priLt}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >Ingresar a mi cuenta</Link>
          </div>
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer style={{ background:T.graph, padding:'32px 6vw' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, borderRadius:7, background:T.pri, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:T.acc, fontWeight:800, fontSize:14 }}>N</span>
            </div>
            <div>
              <p style={{ color:'#fff', fontWeight:700, fontSize:13, margin:0, fontFamily:'Manrope, sans-serif' }}>Nexo Klar</p>
              <p style={{ color:'rgba(255,255,255,0.4)', fontSize:10, margin:0 }}>nexoklar.com</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:20 }}>
            {['#solucion','#producto','#industrias','#implementacion','#proposito'].map((href, i) => (
              <a key={href} href={href} style={{ fontSize:12, color:'rgba(255,255,255,0.55)', textDecoration:'none' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.55)'}
              >{NAV_LINKS[i].label}</a>
            ))}
          </div>
          <p style={{ fontSize:11, color:'rgba(255,255,255,0.35)', margin:0 }}>
            © {new Date().getFullYear()} Nexo Klar · Todos los derechos reservados
          </p>
        </div>
      </footer>
    </div>
  )
}
