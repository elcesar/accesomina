import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../../AccesoMina_v6.html', import.meta.url), 'utf8');
const production = fs.readFileSync(new URL('../../public/index.html', import.meta.url), 'utf8');
const enterpriseCss = fs.readFileSync(new URL('../../assets/nexo-klar-enterprise.css', import.meta.url), 'utf8');

test('local and production frontends remain identical', () => {
  assert.equal(html, production);
});

test('workspace navigation covers commercial, people, operations and administration', () => {
  for (const workspace of ['comercial', 'personas', 'operaciones', 'administracion']) {
    assert.match(html, new RegExp(`${workspace}:\\{label:`));
  }
  for (const criticalPage of ['dashboard', 'mineras', 'trabajadores', 'mantenciones', 'reportes']) {
    assert.match(html, new RegExp(`'${criticalPage}'`));
  }
});

test('professional cloud forms replace critical company and permission prompts', () => {
  assert.match(html, /modal-cloud-tenant-v126/);
  assert.match(html, /saveCloudTenantV126/);
  assert.match(html, /modal-cloud-user-v126/);
  assert.match(html, /saveCloudUserV126/);
  assert.match(html, /AccesoMinaCloud\.createTenantAdmin=openCloudTenantV126/);
  assert.match(html, /AccesoMinaCloud\.editUser=openCloudUserV126/);
});

test('visible terminology supports multiple industries without changing legacy data keys', () => {
  for (const neutralLabel of [
    "'Cliente'",
    'Órdenes de Servicio',
    'Gestión de personal por proyecto',
    'Trabajador fijo',
    'Habilitación del cliente',
    'Cumplimiento corporativo',
    'Alojamientos y estadías',
    'Credenciales de acceso',
    'Libro de Obra'
  ]) assert.ok(html.includes(neutralLabel), `missing neutral label: ${neutralLabel}`);

  assert.match(html, /function translateClientTerminology/);
  assert.match(html, /const plural=.*replacement=plural\?'clientes':'cliente'/);
});

test('people navigation is centralized with fixed, project, available and restricted views', () => {
  const peopleStart = html.indexOf('data-nav-group="capital-humano"');
  const operationsStart = html.indexOf('data-nav-group="gestion-operacional"');
  const peopleNavigation = html.slice(peopleStart, operationsStart);

  assert.match(peopleNavigation, /onclick="nav\('trabajadores'\)"/);
  assert.doesNotMatch(peopleNavigation, /onclick="nav\('personal-planta'\)"/);
  for (const label of ['Trabajador fijo', 'Trabajador por proyecto', 'Trabajador disponible', 'Restringidos']) {
    assert.ok(html.includes(label), `missing people view: ${label}`);
  }
  assert.match(html, /currentTrabTab==='disponible'/);
  assert.match(html, /if\(page==='personal-planta'\)/);
});

test('personnel filters use the same four operational segments', () => {
  const eppFilterStart = html.indexOf('id="filt-epp-tipo"');
  const eppFilter = html.slice(eppFilterStart, eppFilterStart + 700);
  for (const label of ['Trabajador fijo', 'Trabajador por proyecto', 'Trabajador disponible', 'Restringidos']) {
    assert.ok(eppFilter.includes(label), `missing EPP segment: ${label}`);
  }
  assert.match(html, /type==='restringido'\?Boolean\(t\.bloqueado\)/);
  assert.match(html, /type==='disponible'\?!t\.bloqueado/);
  assert.match(html, /const NK_PERSONNEL_LABELS_V162/);
});

test('EPP shows an explicit operational segment control connected to its filter', () => {
  const segmentStart = html.indexOf('id="epp-personnel-segments"');
  const segments = html.slice(segmentStart, segmentStart + 1200);
  assert.ok(segmentStart >= 0, 'EPP segment control is visible in the page');
  for (const value of ['permanente', 'esporadico', 'disponible', 'restringido']) {
    assert.match(segments, new RegExp(`data-epp-segment="${value}"`));
  }
  assert.match(html, /function setEppWorkerSegment\(segment\)/);
  assert.match(html, /function syncEppWorkerSegmentsV163\(\)/);
  assert.match(html, /select\.value=segment;/);
});

test('visible worker restriction language is standardized without changing internal state keys', () => {
  for (const label of ['Calificar / restringir', 'Personas restringidas', 'Restringidos']) {
    assert.ok(html.includes(label), `missing restriction label: ${label}`);
  }
  assert.match(html, /\[\/\\bbloqueado\\b\/gi,'restringido'\]/);
  assert.match(html, /bloqueado:\s*false/);
});

test('operational log remains visible in the project and business management group', () => {
  const generalStart = html.indexOf('data-nav-group="proyectos-negocios"');
  const nextStart = html.indexOf('data-nav-group="activos-inventario"');
  const generalNavigation = html.slice(generalStart, nextStart);

  assert.match(generalNavigation, /id="nav-work-book-v125"/);
  assert.match(generalNavigation, /📖 Bitácora operativa/);
  assert.ok(generalNavigation.includes("nav('oportunidades')"));
});

test('every private navigation group can collapse without hiding the active module permanently', () => {
  for (const group of ['centro-control', 'capital-humano', 'gestion-operacional', 'contratistas', 'relacion-comercial', 'cumplimiento-calidad', 'proyectos-negocios', 'activos-inventario', 'gestion-administracion']) {
    assert.ok(html.includes(`data-nav-group="${group}"`), `missing collapsible group: ${group}`);
  }
  for (const fn of ['toggleNavGroupV147', 'setNavGroupCollapsedV147', 'expandNavGroupContainingV147', 'restoreNavGroupsV147']) {
    assert.match(html, new RegExp(`function ${fn}`));
  }
  assert.match(enterpriseCss, /nav-group-label\.is-collapsed .nav-group-toggle/);
  assert.match(html, /nav-item-collapsed-v147/);
  assert.match(enterpriseCss, /\.nav-item\.nav-item-collapsed-v147\s*\{\s*display: none !important;/);
});

test('contractor and asset workspaces reuse operational data instead of creating silos', () => {
  for (const label of ['Contratistas', 'Activos, equipos e inventario', 'Contratos y convenios', 'Bodegas y almacenes', 'Movimientos de inventario']) {
    assert.ok(html.includes(label), `missing workspace entry: ${label}`);
  }
  for (const fn of ['renderContractorWorkspaceV146', 'renderAssetsWorkspaceV146', 'saveInventoryItemV146', 'saveContractorEvaluationV146']) {
    assert.match(html, new RegExp(`function ${fn}`));
  }
  assert.match(html, /subcontractComplianceV144\(row\)/);
  assert.match(html, /S\.inventoryMovements\.unshift/);
});

test('asset workspace includes preventive maintenance, reliability costs and operational alerts', () => {
  for (const fn of ['ensureAssetReliabilityV167', 'saveAssetMaintenancePlanV167', 'saveAssetMaintenanceRecordV167', 'injectAssetReliabilityV167']) {
    assert.match(html, new RegExp(`function ${fn}`));
  }
  for (const label of ['Confiabilidad y mantenimiento de activos', 'Programar preventivo', 'Registrar mantenimiento', 'Mantenimientos vencidos']) {
    assert.ok(html.includes(label), `missing asset reliability feature: ${label}`);
  }
  assert.match(html, /assetMaintenancePlans/);
  assert.match(html, /assetMaintenanceRecords/);
});

test('contractor governance connects requirements, F30-1, performance and portal access', () => {
  for (const feature of [
    'CONTRACTOR_REQUIREMENT_PROFILES_V164',
    'function contractorMonthlyComplianceV164',
    'function contractorOperationalStateV164',
    'function saveContractorGovernanceV164',
    'function saveContractorPerformanceV164',
    'function saveContractorPortalInviteV164',
    'Control 360 del contratista',
    'Habilitación y acciones prioritarias',
    'F30-1 pendiente',
    'Invitar al portal'
  ]) assert.ok(html.includes(feature), `missing contractor governance feature: ${feature}`);

  assert.match(html, /requirementsProfile=document\.getElementById\('v164-profile'\)/);
  assert.match(html, /S\.contractorPortalInvites\.unshift/);
  assert.match(html, /recordHistoryV90\?\.\('subcontrato'/);
});

test('people can use all operational link profiles and contractors can register their own personnel', () => {
  for (const label of ['Trabajador fijo', 'Trabajador por proyecto', 'Trabajador disponible']) {
    assert.ok(html.includes(label), `missing worker link profile: ${label}`);
  }
  for (const fn of ['workerLinkProfileV165', 'openContractorPersonV165', 'saveContractorPersonV165', 'injectContractorPeopleV165']) {
    assert.match(html, new RegExp(`function ${fn}`));
  }
  assert.match(html, /subcontratoId:contractor\.id/);
  assert.match(html, /Ya existe una persona registrada con este RUT/);
  assert.match(html, /Personal del contratista/);
  assert.match(html, /subc-person-v165/);
  assert.match(html, /Registro directo de personal contratista/);
  assert.match(html, /function openContractorDirectPersonV166/);
});

test('private workspace uses one visual system for typography, controls and data tables', () => {
  for (const token of ['--font-sans', '--space-4', '--radius-md', '--focus-ring']) {
    assert.ok(html.includes(token), `missing UI token: ${token}`);
  }
  for (const rule of ['body.private .section-header', 'body.private .table-wrap', 'body.private .tab-bar', 'body.private .modal', 'body.private .nav-item']) {
    assert.ok(enterpriseCss.includes(rule), `missing private UI rule: ${rule}`);
  }
  assert.match(html, /button, input, select, textarea \{ font:inherit; \}/);
});

test('private workspace uses one canonical vocabulary in navigation, headers and permissions', () => {
  for (const label of [
    'Panel General', 'Órdenes de servicio', 'Personas', 'Protección personal / EPP',
    'Alojamientos y estadías', 'Vehículos, activos y equipos', 'Terceros y subcontratos',
    'Habilitación del cliente', 'Credenciales de acceso', 'Inventario y existencias',
    'Prospectos y oportunidades', 'Reportes y analítica'
  ]) assert.ok(html.includes(label), `missing canonical label: ${label}`);

  assert.match(html, /const NK_PRIVATE_LABELS_V160/);
  assert.match(html, /function applyPrivateTerminologyV160/);
  assert.match(html, /\.card-title \{ font-size:16px; line-height:1\.4; font-weight:700; \}/);
});
