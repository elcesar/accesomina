import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

const NAV_SECTIONS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'solucion', label: 'Plataforma' },
  { id: 'resultados', label: 'Beneficios' },
  { id: 'producto', label: 'Producto' },
  { id: 'capacidades', label: 'Soluciones' },
  { id: 'industrias', label: 'Industrias' },
  { id: 'implementacion', label: 'Implementación' },
  { id: 'proposito', label: 'Propósito' },
  { id: 'privacidad', label: 'Privacidad' },
]

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const handler = () => {
      const marker = window.scrollY + 150
      let current = ids[0]
      ids.forEach(id => {
        const el = document.getElementById(id)
        if (el && el.offsetTop <= marker) current = id
      })
      setActive(current)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [ids])
  return active
}

export default function LandingPage() {
  const navigate = useNavigate()
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const navRef = useRef(null)
  const activeSection = useActiveSection(NAV_SECTIONS.map(s => s.id))

  useEffect(() => {
    if (lightboxOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [lightboxOpen])

  useEffect(() => {
    const activeLink = navRef.current?.querySelector('.active')
    if (activeLink) {
      const left = activeLink.offsetLeft - (navRef.current.clientWidth - activeLink.clientWidth) / 2
      navRef.current.scrollTo({ left: Math.max(0, left), behavior: 'smooth' })
    }
  }, [activeSection])

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#17202a] scroll-smooth">

      {/* NAV PRINCIPAL */}
      <nav className="h-[72px] flex items-center justify-between px-[6vw] bg-white/96 backdrop-blur-md fixed top-0 left-0 right-0 z-50 shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-3 font-black text-lg">
          <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center text-white font-black text-lg">N</div>
          <div>
            Nexo Klar
            <small className="block text-gray-400 font-medium text-[11px] mt-0.5">Datos claros · Operación conectada</small>
          </div>
        </div>
        <div className="hidden md:flex items-center gap-6 text-sm text-gray-500">
          {['solucion','resultados','capacidades','privacidad'].map(id => (
            <button key={id} onClick={() => scrollTo(id)} className="hover:text-gray-900 transition-colors">
              {id === 'solucion' ? 'La plataforma' : id === 'resultados' ? 'Beneficios' : id === 'capacidades' ? 'Soluciones' : 'Privacidad'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <a href="mailto:contacto@nexoklar.com" className="hidden md:block text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            contacto@nexoklar.com
          </a>
          <button onClick={() => navigate('/login')} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            Acceso
          </button>
        </div>
      </nav>

      {/* NAV PROGRESO */}
      <nav ref={navRef} className="fixed top-[72px] left-0 right-0 z-40 flex justify-center gap-1.5 px-[6vw] py-2 bg-[#f6f8fb]/96 backdrop-blur-md shadow-md overflow-x-auto scrollbar-none" aria-label="Secciones">
        {NAV_SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => scrollTo(id)}
            className={`flex-none px-3 py-2 rounded-lg text-[11px] font-extrabold transition-all whitespace-nowrap ${
              activeSection === id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-700 hover:bg-white'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* HERO */}
      <section id="inicio" className="min-h-[calc(100vh-118px)] grid lg:grid-cols-2 gap-14 px-[6vw] pt-8 pb-9 items-center max-w-[1600px] mx-auto mt-[118px]">
        <div>
          <div className="text-blue-600 font-extrabold text-xs uppercase tracking-widest mb-3.5">Control operativo para empresas de servicios</div>
          <h1 className="text-5xl lg:text-7xl font-black leading-none tracking-tight max-w-[900px]">
            Personas, contratos y servicios <span className="text-orange-500">bajo control</span>.
          </h1>
          <p className="text-gray-500 text-lg leading-relaxed max-w-[760px] mt-5">
            Nexo Klar centraliza la información crítica de tu operación, anticipa vencimientos y conecta personas y recursos con cada cliente, contrato y orden de servicio.
          </p>
          <div className="flex gap-3 flex-wrap mt-7">
            <a href="mailto:contacto@nexoklar.com?subject=Quiero%20conocer%20Nexo%20Klar" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-3 rounded-lg transition-colors text-sm">
              Solicitar demostración
            </a>
            <button onClick={() => scrollTo('solucion')} className="border border-gray-300 hover:bg-white text-gray-700 font-semibold px-5 py-3 rounded-lg transition-colors text-sm">
              Ver cómo funciona
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-8 max-w-[900px]">
            {[
              { title: 'Información disponible', desc: 'Tu equipo trabaja con una fuente común, ordenada y autorizada.' },
              { title: 'Riesgos visibles a tiempo', desc: 'Detecta vencimientos, faltantes y bloqueos antes de ejecutar.' },
              { title: 'Continuidad operacional', desc: 'El conocimiento permanece en la empresa y no en personas o planillas.' },
            ].map(({ title, desc }) => (
              <div key={title} className="p-3.5 rounded-lg bg-white/72 shadow-sm">
                <b className="block text-sm text-gray-800 mb-1">{title}</b>
                <span className="text-gray-500 text-xs leading-tight">{desc}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="p-2.5 border border-gray-200 rounded-xl bg-white shadow-2xl">
            <img
              src="/assets/dashboard-demo.png"
              alt="Panel de control real de Nexo Klar"
              className="w-full rounded-lg cursor-zoom-in"
              onClick={() => setLightboxOpen(true)}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[
              { title: 'Estado operativo', desc: 'Identifica qué servicios están listos y cuáles tienen brechas.' },
              { title: 'Alertas prioritarias', desc: 'Concentra pendientes y vencimientos que requieren acción.' },
              { title: 'Información conectada', desc: 'Accede desde el cliente hasta cada persona, recurso y documento.' },
            ].map(({ title, desc }) => (
              <div key={title} className="min-h-[70px] p-3 border border-gray-100 rounded-lg bg-white">
                <b className="block text-xs text-gray-800 mb-1">{title}</b>
                <span className="block text-gray-500 text-[11px] leading-tight">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUDIENCE STRIP */}
      <div className="flex justify-center gap-3.5 flex-wrap px-[6vw] py-4 bg-white/72 text-gray-500 text-xs font-bold">
        {['Empresas de servicios','Contratistas y empresas colaboradoras','Operaciones en terreno','Órdenes de servicio y proyectos','RR.HH. y prevención'].map(label => (
          <button key={label} onClick={() => scrollTo('industrias')} className="px-3 py-2 rounded-full bg-[#f6f8fb] hover:bg-white hover:text-blue-600 transition-all text-xs font-bold">
            {label}
          </button>
        ))}
      </div>

      {/* SOLUCIÓN */}
      <section id="solucion" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-12">
        <div className="max-w-[1320px] mx-auto grid lg:grid-cols-2 gap-16 items-center w-full">
          <div>
            <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Una visión completa</div>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-[850px]">Deja de buscar información. Empieza a gestionar.</h2>
            <p className="text-gray-500 text-lg leading-relaxed max-w-[760px] mt-4">
              Nexo Klar simplifica, unifica y estructura la información que normalmente vive dispersa entre planillas, correos, carpetas y teléfonos. Cada dato permanece dentro de la compañía y queda vinculado con el cliente, contrato, orden de servicio, persona y recurso correspondiente.
            </p>
            <div className="grid gap-4 mt-7">
              {[
                { num: '01', title: 'Todo relacionado', desc: 'Visualiza responsables, personas asignadas, documentos, alojamiento, turnos y recursos desde el contexto correcto.' },
                { num: '02', title: 'Control diario más simple', desc: 'Los paneles y filtros permiten detectar rápidamente pendientes, vencimientos y necesidades de la operación.' },
                { num: '03', title: 'Historial para responder', desc: 'Mantén evidencia organizada para revisiones internas, clientes, auditorías y nuevos trabajos.' },
              ].map(({ num, title, desc }) => (
                <div key={num} className="flex gap-4 items-start">
                  <div className="text-blue-600 font-black text-sm w-8 flex-shrink-0 mt-0.5">{num}</div>
                  <div>
                    <b className="text-sm text-gray-800">{title}</b>
                    <span className="block text-gray-500 text-sm mt-1">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Mock producto */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xl">
            <div className="flex items-center gap-1.5 px-4 py-3 border-b border-gray-100 bg-gray-50">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-gray-300"></span>
              <span className="ml-2 text-xs text-gray-400">Nexo Klar · Panel de control</span>
            </div>
            <div className="grid grid-cols-[140px_1fr]">
              <div className="border-r border-gray-100 p-3 bg-gray-50 text-xs space-y-1">
                {['Panel de control','Empresas y clientes','Contratos','Órdenes de servicio','Personas','Documentos','Alertas','Reportes y analítica'].map((item, i) => (
                  <div key={item} className={`px-2 py-1.5 rounded text-[11px] ${i === 0 ? 'bg-orange-500 text-white font-semibold' : 'text-gray-500 hover:bg-gray-100'}`}>{item}</div>
                ))}
              </div>
              <div className="p-4">
                <div className="font-extrabold text-sm">Resumen de la operación</div>
                <div className="text-gray-400 text-[11px] mt-0.5">Información centralizada y actualizada</div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[{v:'12',l:'Servicios activos'},{v:'86%',l:'Documentación vigente'},{v:'7',l:'Alertas por atender',orange:true}].map(({v,l,orange}) => (
                    <div key={l} className="bg-gray-50 rounded-lg p-2.5 text-center border border-gray-100">
                      <strong className={`block text-xl font-black ${orange ? 'text-orange-500' : 'text-gray-800'}`}>{v}</strong>
                      <small className="text-[10px] text-gray-500">{l}</small>
                    </div>
                  ))}
                </div>
                <div className="mt-3 space-y-1.5">
                  {[{op:'Servicio en terreno',resp:'Equipo de Operaciones',est:'Al día',color:'text-green-600'},
                    {op:'Proyecto de instalación',resp:'Equipo de Proyectos',est:'En curso',color:'text-blue-600'},
                    {op:'Orden programada',resp:'Equipo técnico',est:'Revisar',color:'text-yellow-600'}].map(({op,resp,est,color}) => (
                    <div key={op} className="grid grid-cols-3 text-[11px] py-1.5 border-b border-gray-50">
                      <span className="text-gray-700 font-medium">{op}</span>
                      <span className="text-gray-500">{resp}</span>
                      <span className={`font-bold ${color}`}>{est}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RESULTADOS */}
      <section id="resultados" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-12 bg-[#f0f2f5]">
        <div className="max-w-[1320px] mx-auto w-full">
          <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Resultados para la operación</div>
          <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-[850px]">Anticipa riesgos y ejecuta cada servicio con información confiable.</h2>
          <p className="text-gray-500 text-lg leading-relaxed max-w-[760px] mt-4">
            Cada área consulta la misma información y puede actuar antes de que una brecha documental, contractual o logística afecte la operación.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[
              { n:'01', title:'Personas habilitadas para trabajar', desc:'Revisa habilitación, asignaciones, documentos, formación, aptitudes, EPP y credenciales.' },
              { n:'02', title:'Servicios preparados', desc:'Detecta brechas de personal, alojamiento, vehículos y recursos antes de movilizar.' },
              { n:'03', title:'Cumplimiento trazable', desc:'Conserva estados, responsables, vencimientos, observaciones e historial de cambios.' },
              { n:'04', title:'Información que permanece', desc:'Protege la continuidad cuando cambian personas, equipos o responsables internos.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                <strong className="block text-3xl font-black text-gray-200 mb-3">{n}</strong>
                <b className="block text-sm font-bold text-gray-800 mb-2">{title}</b>
                <span className="text-gray-500 text-sm leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTO REAL */}
      <section id="producto" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-16">
        <div className="max-w-[1320px] mx-auto grid lg:grid-cols-[0.72fr_1.28fr] gap-12 items-center w-full">
          <div>
            <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Producto real</div>
            <h2 className="text-4xl font-black leading-tight">Así se ve el control diario de tu operación.</h2>
            <p className="text-gray-500 text-lg leading-relaxed mt-4">
              Revisa dotación, órdenes de servicio, vencimientos, pendientes y alertas desde un panel centralizado. Identifica rápidamente qué está listo, qué falta y quién debe actuar.
            </p>
          </div>
          <div>
            <img
              src="/assets/dashboard-demo.png"
              alt="Panel real de Nexo Klar"
              className="w-full rounded-lg border border-gray-200 shadow-2xl cursor-zoom-in max-h-[58vh] object-contain bg-white"
              onClick={() => setLightboxOpen(true)}
            />
            <div className="text-gray-400 text-xs mt-2.5">Vista real de Nexo Klar con información demostrativa. Cada empresa trabaja con su propia configuración, usuarios y datos privados.</div>
            <button onClick={() => setLightboxOpen(true)} className="mt-2 text-blue-600 font-bold text-xs hover:underline">Ampliar imagen</button>
          </div>
        </div>
      </section>

      {/* CAPACIDADES */}
      <section id="capacidades" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-12 bg-[#f0f2f5]">
        <div className="max-w-[1320px] mx-auto w-full">
          <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Control centralizado</div>
          <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-[850px]">Lo esencial para administrar servicios, personas y cumplimiento.</h2>
          <p className="text-gray-500 text-lg leading-relaxed max-w-[760px] mt-4">
            Activa la información que necesita tu empresa y conserva una visión común entre administración, operaciones, RR.HH. y prevención.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-8">
            {[
              { n:'01', title:'Clientes y contratos', desc:'Registra empresas, vigencias, alcance, responsables y servicios asociados a cada relación comercial.' },
              { n:'02', title:'Órdenes de servicio', desc:'Organiza trabajos permanentes y órdenes de servicio, junto con las personas y los recursos asignados.' },
              { n:'03', title:'Personas y asignaciones', desc:'Administra personal permanente y equipos temporales, cargos, turnos, datos de contacto y asignaciones.' },
              { n:'04', title:'Documentos y vencimientos', desc:'Centraliza antecedentes, revisa estados y recibe alertas sobre documentos faltantes o próximos a vencer.' },
              { n:'05', title:'Seguridad y recursos', desc:'Controla EPP, exámenes y aptitudes, formación y certificaciones, permisos, vehículos, equipos, credenciales e incidentes.' },
              { n:'06', title:'Comunicación, reportes y analítica', desc:'Segmenta equipos, prepara comunicaciones y genera reportes y analítica por cliente, contrato, orden de servicio o persona.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-blue-500"></div>
                <small className="text-blue-600 text-[10px] font-black tracking-widest">{n}</small>
                <h3 className="mt-4 font-bold text-gray-800 text-sm mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INDUSTRIAS */}
      <section id="industrias" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-12">
        <div className="max-w-[1320px] mx-auto w-full">
          <div className="grid lg:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Adaptable a tu industria</div>
              <h2 className="text-4xl font-black leading-tight max-w-[720px]">Una plataforma flexible para distintas formas de operar.</h2>
            </div>
            <p className="text-gray-500 text-sm leading-relaxed self-end">
              Nexo Klar conecta personas, clientes, contratos, documentos, recursos, turnos, alertas, reportes y analítica en una vista clara y trazable. Tu equipo administrativo, comercial y operativo trabaja con la misma información, sin depender de planillas, correos o carpetas dispersas.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { n:'01', title:'Minería', desc:'Habilitación, centros de trabajo, contratistas y documentos críticos siempre al día.' },
              { n:'02', title:'Energía', desc:'Cuadrillas, permisos, mantenimiento y seguridad operacional en terreno.' },
              { n:'03', title:'Construcción', desc:'Contratistas, avances, turnos, evidencias y control por obra.' },
              { n:'04', title:'Mantenimiento industrial', desc:'Despacho de técnicos, herramientas, repuestos, costos y trazabilidad.' },
              { n:'05', title:'Gestión de instalaciones', desc:'Personal externo, acuerdos de nivel de servicio, alojamiento, servicios y reportes por cliente.' },
              { n:'06', title:'Logística', desc:'Turnos, vehículos, credenciales, rutas operativas y respaldo documental.' },
              { n:'07', title:'Seguridad privada', desc:'Dotación, credenciales, turnos, asistencia y cumplimiento por instalación.' },
              { n:'08', title:'Agroindustria', desc:'Temporadas, cuadrillas, EPP, asistencia y documentación del personal.' },
              { n:'09', title:'Servicios técnicos', desc:'Agenda, recursos, contratos, documentación, costos y margen operativo.' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="relative min-h-[168px] p-6 border border-gray-200 rounded-lg bg-white overflow-hidden shadow-sm">
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-orange-400 to-blue-500 opacity-90"></div>
                <small className="text-blue-600 text-[10px] font-black tracking-widest">{n}</small>
                <b className="block mt-4 text-lg text-gray-800">{title}</b>
                <span className="block mt-1 text-gray-500 text-sm">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IMPLEMENTACIÓN */}
      <section id="implementacion" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-12 bg-[#f0f2f5]">
        <div className="max-w-[1320px] mx-auto w-full">
          <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Puesta en marcha simple</div>
          <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-[850px]">Ordena tu operación en tres pasos.</h2>
          <div className="grid lg:grid-cols-3 gap-6 mt-10">
            {[
              { step:'PASO 1', title:'Configura tu empresa', desc:'Configura clientes, contratos, órdenes de servicio y los requisitos operacionales que necesitas controlar.' },
              { step:'PASO 2', title:'Incorpora tu información', desc:'Registra personas y recursos de forma individual o utiliza la importación masiva para comenzar más rápido.' },
              { step:'PASO 3', title:'Gestiona desde el panel', desc:'Asigna responsables, revisa alertas, actualiza documentos y consulta el avance desde una sola vista.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="bg-white rounded-xl p-8 border border-gray-200 shadow-sm">
                <div className="text-blue-600 font-black text-xs tracking-widest mb-4">{step}</div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROPÓSITO */}
      <section id="proposito" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-12">
        <div className="max-w-[1320px] mx-auto w-full">
          <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Nuestro propósito</div>
          <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-[850px]">Información clara que permanece y genera continuidad.</h2>
          <p className="text-gray-500 text-lg leading-relaxed max-w-[760px] mt-4">
            Nexo Klar nace para simplificar, unificar y conectar la gestión diaria, evitando que la información crítica quede dispersa en personas, planillas, correos o carpetas.
          </p>
          <div className="grid lg:grid-cols-2 gap-6 mt-8">
            {[
              { label:'Visión', title:'Una operación más simple y controlada', desc:'Ser la plataforma que ayuda a las empresas a simplificar, unificar y controlar su información operativa, manteniendo los datos críticos dentro de la compañía.' },
              { label:'Misión', title:'Conectar la información que mueve a la empresa', desc:'Conectar personas, documentos, contratos y operaciones en un sistema fácil de usar, con información clara, estructurada y trazable para reducir riesgos y tomar mejores decisiones.' },
            ].map(({ label, title, desc }) => (
              <article key={label} className="bg-[#f6f8fb] rounded-xl p-8 border border-gray-200">
                <small className="text-gray-400 text-xs font-bold uppercase tracking-widest">{label}</small>
                <h3 className="text-lg font-bold text-gray-800 mt-2 mb-3">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </article>
            ))}
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {[
              { title:'Claridad', desc:'Información fácil de entender, seguir y gestionar.' },
              { title:'Conexión', desc:'Áreas, personas, documentos y procesos en una plataforma.' },
              { title:'Control', desc:'Datos seguros, actualizados y dentro de la compañía.' },
              { title:'Simplicidad', desc:'Una herramienta práctica y pensada para el uso diario.' },
              { title:'Trazabilidad', desc:'Cada cambio, documento y vencimiento deja historial.' },
              { title:'Continuidad', desc:'El conocimiento permanece aunque cambien los equipos.' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white rounded-lg p-4 border border-gray-200">
                <b className="block text-sm text-gray-800 mb-1">{title}</b>
                <span className="text-gray-500 text-xs leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACIDAD */}
      <section id="privacidad" className="min-h-[calc(100vh-118px)] flex items-center px-[6vw] py-12 bg-[#1a2236] text-white">
        <div className="max-w-[1320px] mx-auto grid lg:grid-cols-2 gap-16 items-center w-full">
          <div>
            <div className="text-blue-400 text-[11px] font-black uppercase tracking-widest mb-3">Tu información es de tu empresa</div>
            <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-[850px]">Un espacio privado para trabajar con confianza.</h2>
            <p className="text-gray-400 text-lg leading-relaxed max-w-[760px] mt-4">
              Cada empresa usuaria opera en un entorno privado e independiente. Sus usuarios, permisos, configuraciones y datos permanecen separados de las demás organizaciones.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title:'Acceso individual', desc:'Cada integrante utiliza su propia cuenta autorizada.' },
              { title:'Roles y permisos', desc:'Configura administración, edición o consulta según responsabilidades.' },
              { title:'Datos separados', desc:'La información de una empresa no se mezcla con la de otra.' },
              { title:'Respaldo y trazabilidad', desc:'Conserva registros para revisar cambios, estados y antecedentes.' },
            ].map(({ title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 border-l-2 border-l-blue-500 rounded-lg p-4">
                <b className="block text-sm text-white mb-1">{title}</b>
                <span className="text-gray-400 text-xs leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-[6vw] py-20 text-center bg-white">
        <div className="text-orange-500 text-[11px] font-black uppercase tracking-widest mb-3">Conversemos</div>
        <h2 className="text-4xl lg:text-5xl font-black leading-tight max-w-[850px] mx-auto">Descubre cómo Nexo Klar puede ordenar tu operación.</h2>
        <p className="text-gray-500 text-lg leading-relaxed max-w-[760px] mx-auto mt-4">
          Revisamos contigo tus procesos, equipos, contratos y órdenes de servicio para definir la configuración que realmente necesita tu empresa.
        </p>
        <div className="flex justify-center gap-3 flex-wrap mt-7">
          <a href="mailto:contacto@nexoklar.com?subject=Solicitud%20de%20demostración%20Nexo%20Klar" className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors">
            Solicitar demostración
          </a>
          <button onClick={() => navigate('/login')} className="border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-lg transition-colors">
            Ingresar al sitio privado
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="flex justify-between gap-5 px-[6vw] py-6 text-gray-400 text-xs bg-[#f6f8fb] border-t border-gray-200">
        <span>Nexo Klar · Gestión operativa, información y cumplimiento</span>
        <a href="mailto:contacto@nexoklar.com" className="hover:text-gray-700 transition-colors">contacto@nexoklar.com</a>
      </footer>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-7 bg-[#0f172a]/82 backdrop-blur-md"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-5xl w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-10 right-0 text-white text-3xl font-bold hover:text-gray-300 transition-colors"
            >
              ×
            </button>
            <img src="/assets/dashboard-demo.png" alt="Vista ampliada del panel de Nexo Klar" className="w-full rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  )
}
