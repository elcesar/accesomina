import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const catalog = read('../../nexo-v2/src/components/private/moduleCatalog.js');
const sidebar = read('../../nexo-v2/src/components/layout/Sidebar.jsx');
const router = read('../../nexo-v2/src/pages/PrivateModuleRouter.jsx');
const app = read('../../nexo-v2/src/App.jsx');
const landing = read('../../nexo-v2/src/pages/LandingPage.jsx');
const navigation = read('../../nexo-v2/src/components/public/PublicNavigation.jsx');
const access = read('../../nexo-v2/src/components/public/sections/CustomerAccessSection.jsx');
const publicLayout = read('../../nexo-v2/src/styles/public-layout-fixes.css');
const server = read('../index.js');

const officialModuleIds = [
  'alertas', 'gestion-personal-proyecto', 'centro-operativo',
  'personas', 'turnos-asistencia', 'proteccion-epp', 'formacion', 'examenes', 'salud-ocupacional', 'restringidos',
  'comunicaciones', 'vehiculos', 'alojamientos', 'credenciales',
  'terceros-subcontratos', 'contratos-convenios', 'personal-empresa-servicios', 'habilitaciones-cumplimiento', 'evaluacion-desempeno',
  'clientes', 'contratos', 'ordenes-servicio',
  'cumplimiento-corporativo', 'habilitacion-cliente', 'incidentes', 'auditoria',
  'libro-obra', 'prospectos',
  'activos-inventario', 'maquinaria', 'equipos-instrumentos', 'herramientas', 'epp-inventario', 'materiales', 'insumos', 'bodegas', 'movimientos-inventario', 'mantenimiento', 'asignaciones-prestamos',
  'reportes', 'configuracion', 'importar-exportar', 'usuarios-permisos', 'bitacora', 'privacidad', 'administracion-clientes',
];

test('React contiene los 46 módulos privados oficiales, cada uno con JSX y ruta', () => {
  assert.equal(officialModuleIds.length, 46);
  for (const id of officialModuleIds) {
    const property = `(?:['"]${id}['"]|${id})`;
    assert.match(catalog, new RegExp(`${property}: \\{ title:`), `catálogo ausente: ${id}`);
    assert.match(router, new RegExp(`${property}: \\w+Page,`), `JSX no asignado: ${id}`);
  }
  assert.match(app, /path="modulos\/:modulePath" element=\{<PrivateModuleRouter \/>\}/);
  assert.match(app, /path=":modulePath" element=\{<PrivateModuleRouter \/>\}/);
});

test('el menú React conserva el orden operacional oficial y separa la administración global', () => {
  for (const group of ['Centro de Control', 'Capital Humano', 'Gestión Operacional', 'Contratistas', 'Relación Comercial', 'Cumplimiento y Calidad', 'Gestión de Proyectos y Negocios', 'Activos, Equipos e Inventario', 'Gestión y administración', 'Administración Nexo Klar']) {
    assert.ok(sidebar.includes(`['${group}',`), `grupo ausente: ${group}`);
  }
  const orderedIds = ['alertas', 'gestion-personal-proyecto', 'centro-operativo', 'personas', 'turnos-asistencia', 'proteccion-epp', 'formacion', 'examenes', 'salud-ocupacional', 'restringidos', 'comunicaciones', 'vehiculos', 'alojamientos', 'credenciales', 'terceros-subcontratos', 'contratos-convenios', 'personal-empresa-servicios', 'habilitaciones-cumplimiento', 'evaluacion-desempeno', 'clientes', 'contratos', 'ordenes-servicio', 'cumplimiento-corporativo', 'habilitacion-cliente', 'incidentes', 'auditoria', 'libro-obra', 'prospectos', 'activos-inventario', 'maquinaria', 'equipos-instrumentos', 'herramientas', 'epp-inventario', 'materiales', 'insumos', 'bodegas', 'movimientos-inventario', 'mantenimiento', 'asignaciones-prestamos', 'reportes', 'configuracion', 'importar-exportar', 'usuarios-permisos', 'bitacora', 'privacidad', 'administracion-clientes'];
  let previous = -1;
  for (const id of orderedIds) {
    const position = sidebar.indexOf(`['${id}',`);
    assert.ok(position > previous, `orden inválido o módulo ausente: ${id}`);
    previous = position;
  }
  assert.match(sidebar, /\['Administración Nexo Klar', \[\['administracion-clientes'/);
  assert.match(catalog, /id === 'administracion-clientes' \? \['domian_admin'\]/);
});

test('el sitio público, acceso y API permanecen conectados en la arquitectura React', () => {
  for (const component of ['HomeSection', 'PlatformSection', 'BenefitsSection', 'ProductSection', 'SolutionsSection', 'IndustriesSection', 'ImplementationSection', 'PurposeSection', 'CustomerAccessSection']) {
    assert.match(landing, new RegExp(`<${component}`), `sección pública ausente: ${component}`);
  }
  for (const label of ['Inicio', 'Plataforma', 'Beneficios', 'Producto', 'Soluciones', 'Industrias', 'Implementación y privacidad', 'Propósito', 'Acceso']) {
    assert.ok(navigation.includes(`'${label}'`), `navegación pública ausente: ${label}`);
  }
  for (const route of ['/api/auth', '/api/state', '/api/users', '/api/files', '/api/integrations', '/api/audit', '/api/tenants', '/api/settings', '/api/data-transfer', '/api/privacy', '/api/operations', '/api/work-books']) {
    assert.ok(server.includes(`app.use('${route}'`), `ruta API ausente: ${route}`);
  }
  assert.match(access, /const update=set=>key=>event=>set\(current=>/);
  assert.match(publicLayout, /margin-block: 0/);
});
