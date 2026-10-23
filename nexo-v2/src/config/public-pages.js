export const PUBLIC_PAGES = {
  inicio: { path: '/', title: 'Control operacional y cumplimiento', description: 'Nexo Klar conecta personas, contratos, documentos y recursos para controlar la operación y el cumplimiento.' },
  solucion: { path: '/plataforma', title: 'Plataforma', description: 'Conecta la oportunidad, el contrato y la ejecución del servicio con información operacional trazable.' },
  resultados: { path: '/beneficios', title: 'Beneficios', description: 'Anticipa vencimientos, reduce búsquedas y toma decisiones con información conectada.' },
  producto: { path: '/producto', title: 'Producto', description: 'Conoce el panel y los módulos de Nexo Klar para gestionar personas, documentos y servicios.' },
  capacidades: { path: '/soluciones', title: 'Soluciones', description: 'Gestiona personas, cumplimiento y recursos desde módulos relacionados entre sí.' },
  industrias: { path: '/industrias', title: 'Industrias', description: 'Control operacional para empresas de minería, energía, construcción y servicios.' },
  implementacion: { path: '/implementacion', title: 'Implementación y privacidad', description: 'Configura tu empresa, prioriza la carga de información y conoce cómo se protege tu espacio privado.' },
  proposito: { path: '/proposito', title: 'Propósito', description: 'Información confiable, conectada y accesible para tomar mejores decisiones.' },
  contacto: { path: '/contacto', title: 'Contacto', description: 'Escribe a contacto@nexoklar.com o solicita una demostración para tu empresa.' },
  'registro-empresa': { path: '/crear-empresa', title: 'Crear empresa', description: 'Registra tu empresa y su administrador con una invitación de Nexo Klar.' },
}
export function publicPageKey(pathname) {
  const normalized = pathname.replace(/\/$/, '') || '/'
  return Object.keys(PUBLIC_PAGES).find(key => PUBLIC_PAGES[key].path === normalized)
}
