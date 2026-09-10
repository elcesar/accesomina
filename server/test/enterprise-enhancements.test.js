import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = new URL('../../', import.meta.url);
const html = fs.readFileSync(new URL('AccesoMina_v6.html', root), 'utf8');
const production = fs.readFileSync(new URL('public/index.html', root), 'utf8');
const script = fs.readFileSync(new URL('assets/nexo-klar-enterprise.js', root), 'utf8');
const productionScript = fs.readFileSync(new URL('public/assets/nexo-klar-enterprise.js', root), 'utf8');
const styles = fs.readFileSync(new URL('assets/nexo-klar-enterprise.css', root), 'utf8');
const productionStyles = fs.readFileSync(new URL('public/assets/nexo-klar-enterprise.css', root), 'utf8');
const designSystem = fs.readFileSync(new URL('assets/nexo-klar-design-system-v170.css', root), 'utf8');
const productionDesignSystem = fs.readFileSync(new URL('public/assets/nexo-klar-design-system-v170.css', root), 'utf8');
const cloudClient = fs.readFileSync(new URL('public/cloud-client.js', root), 'utf8');
const tenantControl = fs.readFileSync(new URL('public/assets/tenant-control-plane-v169.js', root), 'utf8');
const tenantsRoute = fs.readFileSync(new URL('server/routes/tenants.js', root), 'utf8');

test('enterprise enhancements are loaded and production assets stay synchronized', () => {
  assert.match(html, /assets\/nexo-klar-enterprise\.css/);
  assert.match(html, /assets\/nexo-klar-enterprise\.js/);
  assert.equal(html, production);
  assert.equal(script, productionScript);
  assert.equal(styles, productionStyles);
  assert.equal(designSystem, productionDesignSystem);
  assert.match(html, /assets\/nexo-klar-design-system-v170\.css/);
  assert.match(html, /assets\/tenant-control-plane-v169\.js/);
});

test('Nexo Klar administration includes a tenant control plane', () => {
  for (const feature of ['ficha 360°','Soporte centralizado','Exportar respaldo','Alta guiada']) assert.match(tenantControl, new RegExp(feature));
  for (const endpoint of ["/:id/control", "/:id/tickets", "/:id/export-backup"]) assert.match(tenantsRoute, new RegExp(endpoint.replaceAll('/','\\/')));
  assert.match(tenantsRoute, /tenant\.control_updated/);
  assert.match(tenantsRoute, /tenant\.backup_exported/);
});

test('design system uses the approved indigo and electric teal identity with a complete dark alternative', () => {
  assert.match(html, /--orange:\s*#2a2a8c/i);
  assert.match(html, /--blue:\s*#00706a/i);
  assert.match(html, /--text:\s*#141a20/i);
  assert.match(html, /--bg:\s*#f4efe3/i);
  assert.match(designSystem, /Manrope/);
  assert.match(designSystem, /--nk-primary:\s*#2a2a8c/i);
  assert.match(designSystem, /--nk-accent:\s*#00cfc1/i);
  assert.match(html, /body\.dark\s*\{/);
  assert.match(html, /<option value="light">Fondo claro<\/option><option value="dark">Fondo oscuro<\/option>/);
});

test('requested management improvements are implemented as tenant state', () => {
  for (const stateCollection of [
    'uiRolePreferences', 'alertWorkflow', 'operationTasks', 'signatureReminders',
    'communicationTemplates', 'communicationHistory', 'portalReviews',
    'trainingMatrices', 'healthRiskMatrices', 'importValidations',
    'temporalPreferences', 'monthlyClosures'
  ]) {
    assert.match(script, new RegExp(`S\\.${stateCollection}`), `missing tenant collection ${stateCollection}`);
  }
});

test('commercial, people, compliance and operational enhancements are available', () => {
  for (const feature of [
    'renderDashboardPreferences', 'renderManagedAlerts', 'renderOperationsPlanning',
    'renderOpportunityProjection', 'renderContractReminders', 'injectServiceManagement',
    'renderSubcontractCompliance',
    'renderEppInventoryBridge', 'renderTrainingMatrix', 'renderHealthMatrix',
    'renderReadiness129',
    'renderCommunicationsGovernance', 'renderPortalReviewQueue',
    'renderAuditConfidence', 'installImportPreview', 'installTemporalToolbar',
    'renderTemporalAnalysis'
  ]) {
    assert.match(script, new RegExp(`function ${feature}\\(`), `missing feature ${feature}`);
  }
  assert.doesNotMatch(script, /Vista Kanban de contratación|renderRecruitmentKanban|Estructura, centro de costo y reemplazos|renderPermanentStructure/);
  assert.match(script, /Disponibilidad y asistencia de hoy/);
  assert.match(script, /Aptitud operativa y vigilancia/);
});

test('temporal analysis and immutable monthly closure are available', () => {
  assert.match(script, /Este mes/);
  assert.match(script, /Últimos 12 meses/);
  assert.match(script, /Rango personalizado/);
  assert.match(script, /function periodMetrics\(/);
  assert.match(script, /Cierre mensual operativo/);
  assert.match(script, /Este mes ya tiene un cierre registrado/);
  assert.match(script, /status: "cerrado"/);
  assert.match(script, /function closureDigest\(/);
  assert.match(script, /Solo administración puede realizar el cierre mensual/);
  assert.match(script, /renderWithTemporalCollection\("turnos"/);
  assert.match(script, /renderWithTemporalCollection\("incidentes"/);
  assert.match(script, /renderWithTemporalCollection\("callouts"/);
});

test('mass import checks the complete file and reports internal duplicates', () => {
  assert.match(script, /const allRows = lines\.map\(parseCsvLine\)/);
  assert.match(script, /RUT repetido dentro del archivo/);
  assert.match(script, /downloadImportErrors128/);
});

test('communications track responses and assign only confirmed people to an order', () => {
  for (const feature of [
    'function communicationOptions128(',
    'function enrichCallout128(',
    'window.openCalloutFollowUp128',
    'window.updateCalloutRecipient128',
    'window.assignCalloutRecipient128',
    'Convocatorias con seguimiento',
    'Responder antes de'
  ]) assert.ok(script.includes(feature), `missing communications feature: ${feature}`);
  assert.match(cloudClient, /useWhatsApp=options\.channel!==['"]Correo['"]/);
  assert.match(cloudClient, /useEmail=options\.channel!==['"]WhatsApp['"]/);
  assert.match(cloudClient, /NexoKlarEnterprise\?\.enrichCallout/);
});

test('contractors, assets, EPP, reservations and replenishment stay connected in the private workspace', () => {
  for (const feature of [
    'contractorApprovalV150', 'injectContractorPrequalificationV150',
    'saveContractorPrequalificationV150', 'assetOpenLoanMovementV150',
    'saveAssetReturnV150', 'installEppInventoryBridgeV151',
    'saveEppDelivery=async function', 'assetReservationConflictV152',
    'saveAssetReservationV152', 'openReplenishmentV152', 'saveReplenishmentV152',
    'contractorDirectOrdersV153', 'saveContractorOrderV153',
    'removeContractorOrderV153', 'installF301PeriodV153'
  ]) assert.ok(html.includes(feature), `missing connected operational flow: ${feature}`);
  for (const visibleAction of [
    'Precalificación y seguimiento', 'Descontar EPP de la bodega',
    'Reserva para orden de servicio', 'Solicitar reposición',
    'Préstamos atrasados', 'Reposición por bodega',
    'Órdenes y desempeño operativo', 'Asignar a orden',
    'F30-1 sin período acreditado'
  ]) assert.ok(html.includes(visibleAction), `missing client-facing action: ${visibleAction}`);
});

test('inventory uses physical counts, controlled receipts and code lookup without losing traceability', () => {
  for (const feature of [
    'ensureInventoryControlsV154', 'openInventoryCountV154', 'saveInventoryCountV154',
    'openInventoryReceiptV154', 'saveInventoryReceiptV154', 'openInventoryLookupV154',
    'findInventoryCodeV154', 'inventoryStocktakes'
  ]) assert.ok(html.includes(feature), `missing inventory control: ${feature}`);
  for (const visibleAction of ['Conteo físico', 'Recibir reposición', 'Buscar código', 'Control de existencias']) {
    assert.ok(html.includes(visibleAction), `missing inventory control action: ${visibleAction}`);
  }
});

test('asset workspace keeps the selected area visible in the sidebar and workspace path', () => {
  for (const feature of ['ASSET_AREA_LABELS_V155', 'syncAssetNavigationV155', 'injectAssetPathV155']) {
    assert.ok(html.includes(feature), `missing asset navigation feature: ${feature}`);
  }
  assert.ok(html.includes('Estás en'), 'missing visible asset workspace path');
});

test('inventory tracks internal locations, codes, lots and expiry without duplicating a resource code', () => {
  for (const feature of [
    'inventoryLocations', 'openInventoryLocationV156', 'saveInventoryLocationV156',
    'Ubicaciones internas', 'v156-item-lot', 'v156-item-expiry',
    'El código, QR, patente o serie ya está asignado a otro recurso'
  ]) assert.ok(html.includes(feature), `missing inventory traceability feature: ${feature}`);
});

test('EPP is available as a connected inventory area without duplicating delivery data', () => {
  for (const feature of [
    "openAssetsWorkspaceV146('epp')", 'EPP y protección personal',
    "['maquinaria','equipos','herramientas','epp','materiales','insumos']",
    'Las entregas a personas se registran desde Protección personal / EPP',
    'openInventoryItemModalV157Base'
  ]) assert.ok(html.includes(feature), `missing EPP inventory feature: ${feature}`);
});

test('EPP stock, movements and deliveries are managed from the assets workspace', () => {
  for (const feature of [
    'injectEppInventoryHubV158', 'Control de EPP por bodega', 'openEppMovementV158',
    'saveEppMovementV158', 'Registrar entrega', 'openEppDelivery()',
    'hideOperationalEppEntryV158', 'injectEppOperationGuideV158',
    'Gestión guiada de EPP', 'Registrar movimiento'
  ]) assert.ok(html.includes(feature), `missing centralized EPP operation: ${feature}`);
});

test('asset assignments and loans open a dedicated operational workspace', () => {
  for (const feature of [
    'injectAssignmentsWorkspaceV159', 'openAssetAssignmentV159', 'saveAssetAssignmentV159',
    'Asignaciones y préstamos', 'Asignar recurso', 'Recurso asignado y préstamo registrado'
  ]) assert.ok(html.includes(feature), `missing asset assignment feature: ${feature}`);
});

test('alerts group worker documents in one compliance card and keep direct document upload available', () => {
  for (const feature of [
    'filteredActiveAlerts', 'personAlertCard', 'Personas con antecedentes por gestionar',
    'Cada persona aparece una sola vez', 'Regularizar documento', 'openAlertManagerV129'
  ]) assert.ok(script.includes(feature), `missing grouped alert feature: ${feature}`);
});
