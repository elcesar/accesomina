import { z } from 'zod';
import { OPPORTUNITY_COLLECTIONS, opportunityIdentity, opportunityIsClosed, opportunityRows, opportunityFields } from '../shared/opportunity-domain.js';
import { isValidChilePhone, isValidRut, normalizeChilePhone, normalizeRut } from './security.js';
import { operationalDay } from '../shared/operational-date.js';
import { validateOptionalHistoricalEmail } from './email-policy.js';
import { optionalHistoricalRut } from '../shared/rut.js';
import {
  changedWorkerDocuments,
  requireWorkerDocumentEvidence,
} from './worker-document-evidence.js';
import {
  HELMET_APPLICABILITY,
  helmetColorForCode,
  helmetPolicySnapshot,
  isHelmetItem,
  materializeHelmetState,
  normalizeHelmetColors,
  normalizeHelmetPolicies,
  normalizeHelmetRequirement,
  resolveHelmetPolicy,
} from '../shared/helmet-policy.js';

export const emailSchema = z.string().trim().email().max(254);

// Helmet data is scoped configuration, never a global colour-to-role matrix.
// Legacy records have no explicit helmet object and remain readable until a
// user intentionally completes the decision.
function helmetConflict(message, code) {
  throw Object.assign(new Error(message), { status: 409, code });
}

function sameHelmetRequirement(left, right) {
  return JSON.stringify(left || null) === JSON.stringify(right || null);
}

function validateHelmetConfiguration(state) {
  const colors = normalizeHelmetColors(state.helmetColors);
  const policies = normalizeHelmetPolicies(state.helmetPolicies);
  const codeSet = new Set();
  for (const color of colors) {
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(color.code) || !String(color.label || '').trim()) {
      helmetConflict('El catálogo de colores de casco contiene un valor inválido.', 'INVALID_HELMET_COLOR');
    }
    if (codeSet.has(color.code)) helmetConflict('El catálogo de colores de casco tiene códigos duplicados.', 'DUPLICATE_HELMET_COLOR');
    codeSet.add(color.code);
  }
  const policyIds = new Set();
  const activeScopes = new Set();
  const mineIds = new Set(collection(state, 'minas').map(row => String(row?.id || '')));
  const projectIds = new Set(collection(state, 'mantenciones').map(row => String(row?.id || '')));
  for (const policy of policies) {
    if (!policy.id || policyIds.has(policy.id)) helmetConflict('Las políticas de casco requieren identificadores únicos.', 'DUPLICATE_HELMET_POLICY');
    policyIds.add(policy.id);
    const scopeKey = policy.scope === 'tenant' ? 'tenant' : `${policy.scope}:${policy.scope === 'cliente' ? policy.minaId : policy.mantId}`;
    if (policy.active && activeScopes.has(scopeKey)) {
      helmetConflict('Sólo puede existir una política de casco activa para el mismo alcance.', 'DUPLICATE_HELMET_POLICY_SCOPE');
    }
    if (policy.active) activeScopes.add(scopeKey);
    if (policy.scope === 'cliente' && (!policy.minaId || !mineIds.has(String(policy.minaId)))) {
      helmetConflict('La política de casco referencia un cliente inexistente.', 'INVALID_REFERENCE');
    }
    if (policy.scope === 'os' && (!policy.mantId || !projectIds.has(String(policy.mantId)))) {
      helmetConflict('La política de casco referencia una orden inexistente.', 'INVALID_REFERENCE');
    }
    if (policy.scope === 'os') {
      const project = collection(state, 'mantenciones').find(row => String(row?.id) === String(policy.mantId));
      if (policy.minaId && String(policy.minaId) !== String(project?.minaId || '')) {
        helmetConflict('La política de casco no coincide con el cliente de la orden.', 'INVALID_REFERENCE');
      }
    }
    if (policy.allowedColorCodes.some(code => !codeSet.has(code))) {
      helmetConflict('La política de casco referencia un color inexistente.', 'INVALID_HELMET_COLOR');
    }
  }
  state.helmetColors = colors;
  state.helmetPolicies = policies;
}

function selectorText(value) {
  return String(value || '').trim();
}

function selectorObject(value, source) {
  if (value == null) return null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    helmetConflict('El contexto de casco no es válido.', 'INVALID_HELMET_CONTEXT');
  }
  const mantValues = ['mantId', 'orderId', 'projectId']
    .map(key => selectorText(value[key])).filter(Boolean);
  const minaValues = ['minaId', 'clientId']
    .map(key => selectorText(value[key])).filter(Boolean);
  if (new Set(mantValues).size > 1 || new Set(minaValues).size > 1) {
    helmetConflict('Los identificadores del contexto de casco son contradictorios.', 'INVALID_HELMET_CONTEXT');
  }
  const mantId = mantValues[0] || '';
  const minaId = minaValues[0] || '';
  return mantId || minaId ? { source, mantId, minaId } : null;
}

// Every selector is a request, never authority. An empty selector cannot hide a
// second non-empty one, and aliases must agree before policy resolution.
function requestedHelmetContext(worker, requestedContext = null) {
  const selectors = [];
  const add = (value, source) => {
    const selector = selectorObject(value, source);
    if (selector) selectors.push(selector);
  };
  // A freshly supplied selector intentionally supersedes the last
  // server-materialized one; both are still validated against trusted scope.
  const explicitEppContext = selectorObject(worker?.epp?.helmetContext, 'epp.helmetContext');
  if (explicitEppContext) selectors.push(explicitEppContext);
  else add(worker?.epp?.helmet?.resolvedContext, 'helmet.resolvedContext');
  add({
    mantId: worker?.mantId,
    orderId: worker?.orderId,
    projectId: worker?.projectId,
    minaId: worker?.minaId,
    clientId: worker?.clientId,
  }, 'worker');
  add(requestedContext, 'requested');
  const mantIds = new Set(selectors.map(item => item.mantId).filter(Boolean));
  const minaIds = new Set(selectors.map(item => item.minaId).filter(Boolean));
  if (mantIds.size > 1 || minaIds.size > 1) {
    helmetConflict('Los contextos de casco enviados no coinciden.', 'INVALID_HELMET_CONTEXT');
  }
  return {
    hasSelector: selectors.length > 0,
    mantId: [...mantIds][0] || '',
    minaId: [...minaIds][0] || '',
  };
}

function workerHelmetIsHistorical(worker, previousWorker) {
  if (!previousWorker) return false;
  return sameHelmetRequirement(
    normalizeHelmetRequirement(worker?.epp),
    normalizeHelmetRequirement(previousWorker?.epp),
  ) && contextFingerprint(worker) === contextFingerprint(previousWorker);
}

const inactiveHelmetAssignmentStates = new Set(['retirado', 'cancelado', 'finalizado', 'inactivo']);
function activeHelmetAssignments(worker, referenceState) {
  return collection(referenceState, 'asignaciones').filter(row => (
    String(row?.trabId || row?.workerId || '') === String(worker?.id || '')
    && String(row?.mantId || '').trim()
    && !inactiveHelmetAssignmentStates.has(String(row?.estado || '').trim().toLowerCase())
  ));
}
function referenceProject(referenceState, mantId) {
  return collection(referenceState, 'mantenciones')
    .find(project => String(project?.id || '') === String(mantId || ''));
}
function knownMine(referenceState, minaId) {
  return collection(referenceState, 'minas')
    .some(mine => String(mine?.id || '') === String(minaId || ''));
}
function candidateWorkerMineIds(worker, state) {
  const ids = new Set((Array.isArray(worker?.mineras) ? worker.mineras : [])
    .map(value => selectorText(value)).filter(Boolean));
  for (const minaId of ids) {
    if (!knownMine(state, minaId)) {
      helmetConflict('La persona referencia un cliente inexistente.', 'INVALID_REFERENCE');
    }
  }
  return ids;
}
function assignmentMineIds(assignments, referenceState) {
  const mineIds = new Set();
  for (const assignment of assignments) {
    const project = referenceProject(referenceState, assignment?.mantId);
    if (project?.minaId && knownMine(referenceState, project.minaId)) {
      mineIds.add(String(project.minaId));
    }
  }
  return mineIds;
}
function validateCandidateHelmetAssignments(assignments, candidateState) {
  for (const assignment of assignments) {
    const project = referenceProject(candidateState, assignment?.mantId);
    if (!project || !project.minaId || !knownMine(candidateState, project.minaId)) {
      helmetConflict('La asignación candidata no tiene una orden y cliente válidos.', 'INVALID_HELMET_CONTEXT');
    }
    const contractId = project.contratoId || project.contractId;
    if (contractId) {
      const contract = collection(candidateState, 'contratos').find(row => String(row?.id || '') === String(contractId));
      if (!contract || String(contract.minaId || '') !== String(project.minaId || '')) {
        helmetConflict('La asignación candidata no coincide con su contrato y cliente.', 'INVALID_HELMET_CONTEXT');
      }
    }
  }
}
function contextFingerprint(worker) {
  return JSON.stringify({
    helmetContext: worker?.epp?.helmetContext || null,
    resolvedContext: worker?.epp?.helmet?.resolvedContext || null,
    mantId: worker?.mantId || '',
    orderId: worker?.orderId || '',
    projectId: worker?.projectId || '',
    minaId: worker?.minaId || '',
    clientId: worker?.clientId || '',
    mineras: Array.isArray(worker?.mineras) ? worker.mineras.map(value => String(value || '')).sort() : [],
  });
}
function historicalHelmetContext(snapshot, referenceState) {
  const snapshotMantId = selectorText(snapshot?.mantId);
  const project = referenceProject(referenceState, snapshotMantId);
  return {
    mantId: project ? snapshotMantId : '',
    minaId: selectorText(project?.minaId || snapshot?.minaId),
  };
}

// The only authoritative policy resolver. Existing records derive scope from
// persisted assignments and clients; a new record can use an association only
// when it is part of this same validated state transition.
function resolveTrustedHelmetContext(worker, state, {
  previousWorker = null,
  previousState = null,
  requestedContext = null,
  allowHistorical = false,
  historicalSnapshot = null,
} = {}) {
  const existingWorker = Boolean(previousWorker);
  const referenceState = existingWorker && previousState ? previousState : state;
  const scopeWorker = previousWorker || worker;
  if (allowHistorical) return historicalHelmetContext(historicalSnapshot, referenceState);

  const requested = requestedHelmetContext(worker, requestedContext);
  const assignments = activeHelmetAssignments(scopeWorker, referenceState);
  let knownMineIds;
  if (existingWorker) {
    knownMineIds = new Set([
      ...(Array.isArray(scopeWorker?.mineras) ? scopeWorker.mineras : []).map(selectorText).filter(minaId => knownMine(referenceState, minaId)),
      ...assignmentMineIds(assignments, referenceState),
    ]);
  } else {
    // Candidate links are authoritative only because validation and persistence
    // happen in the same server transaction.
    validateCandidateHelmetAssignments(assignments, state);
    knownMineIds = new Set([
      ...candidateWorkerMineIds(scopeWorker, state),
      ...assignmentMineIds(assignments, state),
    ]);
  }

  if (requested.mantId) {
    const project = referenceProject(referenceState, requested.mantId);
    if (!project || !project.minaId || !knownMine(referenceState, project.minaId)) {
      helmetConflict('La orden seleccionada para casco no existe.', 'INVALID_HELMET_CONTEXT');
    }
    const projectMineId = String(project.minaId);
    if (requested.minaId && projectMineId !== requested.minaId) {
      helmetConflict('El cliente del contexto de casco no coincide con la orden.', 'INVALID_HELMET_CONTEXT');
    }
    const assigned = assignments.some(assignment => String(assignment?.mantId || '') === requested.mantId);
    if (!assigned && !knownMineIds.has(projectMineId)) {
      helmetConflict('La orden seleccionada para casco no pertenece al alcance de la persona.', 'HELMET_CONTEXT_OUT_OF_SCOPE');
    }
    return { mantId: requested.mantId, minaId: projectMineId };
  }
  if (requested.minaId) {
    if (!knownMine(referenceState, requested.minaId) || !knownMineIds.has(requested.minaId)) {
      helmetConflict('El cliente seleccionado para casco no pertenece al alcance de la persona.', 'HELMET_CONTEXT_OUT_OF_SCOPE');
    }
    return { mantId: '', minaId: requested.minaId };
  }
  if (assignments.length > 1) {
    helmetConflict('Selecciona la orden de servicio aplicable antes de guardar el requisito de casco.', 'HELMET_POLICY_CONTEXT_REQUIRED');
  }
  if (assignments.length === 1) {
    const project = referenceProject(referenceState, assignments[0].mantId);
    return { mantId: String(assignments[0].mantId || ''), minaId: String(project?.minaId || '') };
  }
  if (knownMineIds.size > 1) {
    helmetConflict('Selecciona el cliente aplicable antes de guardar el requisito de casco.', 'HELMET_POLICY_CONTEXT_REQUIRED');
  }
  return { mantId: '', minaId: [...knownMineIds][0] || '' };
}

function canonicalContext(context = {}) {
  const mantId = selectorText(context.mantId);
  const minaId = selectorText(context.minaId);
  return mantId || minaId ? { mantId, minaId } : undefined;
}
function clearUntrustedWorkerContext(worker) {
  for (const key of ['mantId', 'orderId', 'projectId', 'minaId', 'clientId']) delete worker[key];
}
function deliveryHelmetContext(delivery, state, previousDelivery, previousWorker, previousState, historical) {
  const workerId = String(delivery?.workerId || delivery?.trabId || '');
  const worker = collection(state, 'trabajadores').find(row => String(row?.id || '') === workerId);
  return resolveTrustedHelmetContext(worker, state, {
    previousWorker,
    previousState,
    requestedContext: delivery,
    allowHistorical: historical,
    historicalSnapshot: previousDelivery?.helmetSnapshot,
  });
}

function validateWorkerHelmet(worker, state, previousWorker, {
  requireDecisionForNew = false,
  allowLegacyImport = false,
  previousState = null,
} = {}) {
  const epp = worker?.epp;
  const hasExplicitHelmet = Boolean(epp && typeof epp === 'object' && Object.hasOwn(epp, 'helmet'));
  const hadExplicitHelmet = Boolean(previousWorker?.epp && typeof previousWorker.epp === 'object' && Object.hasOwn(previousWorker.epp, 'helmet'));
  const unchangedHistorical = workerHelmetIsHistorical(worker, previousWorker);
  if (unchangedHistorical) return;

  const resolverOptions = {
    previousWorker,
    previousState,
    historicalSnapshot: normalizeHelmetRequirement(previousWorker?.epp).policySnapshot,
  };
  if (!hasExplicitHelmet) {
    const requested = requestedHelmetContext(worker);
    if (requested.hasSelector) resolveTrustedHelmetContext(worker, state, resolverOptions);
    if (hadExplicitHelmet || (requireDecisionForNew && !previousWorker)) {
      helmetConflict('Selecciona si el casco es requerido para la persona.', 'HELMET_APPLICABILITY_REQUIRED');
    }
    return;
  }

  const helmet = normalizeHelmetRequirement(epp);
  const previousHelmet = normalizeHelmetRequirement(previousWorker?.epp);
  const context = resolveTrustedHelmetContext(worker, state, resolverOptions);
  if (helmet.applicability === HELMET_APPLICABILITY.UNKNOWN) {
    if (allowLegacyImport && !hadExplicitHelmet && helmet.legacyImport === true) {
      clearUntrustedWorkerContext(worker);
      const { helmetContext, ...safeEpp } = epp;
      worker.epp = { ...safeEpp, casco: safeEpp.casco || '', helmet: { applicability: HELMET_APPLICABILITY.UNKNOWN, legacyImport: true } };
      return;
    }
    helmetConflict('Selecciona si el casco es requerido para la persona.', 'HELMET_APPLICABILITY_REQUIRED');
  }

  const { helmetContext, ...safeEpp } = epp;
  clearUntrustedWorkerContext(worker);
  if (helmet.applicability === HELMET_APPLICABILITY.NOT_REQUIRED) {
    if (helmet.colorCode || helmet.colorLabel || helmet.size || helmet.modelClass) {
      helmetConflict('Una persona sin casco requerido no puede tener color, talla o clase de casco.', 'INVALID_HELMET_NOT_REQUIRED');
    }
    worker.epp = {
      ...safeEpp,
      casco: '',
      helmet: {
        applicability: HELMET_APPLICABILITY.NOT_REQUIRED,
        reason: helmet.reason,
      },
    };
    return;
  }

  const policy = resolveHelmetPolicy(state, context);
  const color = helmetColorForCode(state, helmet.colorCode);
  const previousContext = canonicalContext(
    previousHelmet.resolvedContext || previousWorker?.epp?.helmetContext || previousHelmet.policySnapshot,
  );
  const keepingHistoricalColor = previousWorker
    && previousHelmet.colorCode === helmet.colorCode
    && previousHelmet.colorLabel === helmet.colorLabel
    && previousHelmet.applicability === HELMET_APPLICABILITY.REQUIRED
    && previousContext?.mantId === canonicalContext(context)?.mantId
    && previousContext?.minaId === canonicalContext(context)?.minaId;
  if (policy.requireColor && !helmet.colorCode) helmetConflict('El color de casco es obligatorio para esta política.', 'HELMET_COLOR_REQUIRED');
  if (policy.requireSize && !helmet.size) helmetConflict('La talla de casco es obligatoria para esta política.', 'HELMET_SIZE_REQUIRED');
  if (policy.requireModelClass && !helmet.modelClass) helmetConflict('La clase o modelo de casco es obligatorio para esta política.', 'HELMET_MODEL_CLASS_REQUIRED');
  if (helmet.colorCode) {
    if (!color && !keepingHistoricalColor) helmetConflict('El color de casco no existe en el catálogo de la empresa.', 'INVALID_HELMET_COLOR');
    if (color && !color.active && !keepingHistoricalColor) helmetConflict('El color de casco está inactivo.', 'INACTIVE_HELMET_COLOR');
    if (policy.hasColorRestriction && !policy.allowedColorCodes.includes(helmet.colorCode) && !keepingHistoricalColor) {
      helmetConflict('El color de casco no está habilitado para este cliente u orden.', 'HELMET_COLOR_NOT_ALLOWED');
    }
    if (color && helmet.colorLabel !== color.label && !keepingHistoricalColor) {
      helmetConflict('La etiqueta del color de casco no coincide con el catálogo vigente.', 'INVALID_HELMET_COLOR');
    }
  }
  const { legacySize, ...storedHelmet } = helmet;
  const canonical = canonicalContext(context);
  worker.epp = {
    ...safeEpp,
    ...(canonical ? { helmetContext: canonical } : {}),
    casco: helmet.size || '',
    helmet: {
      ...storedHelmet,
      resolvedContext: canonical,
      policySnapshot: helmetPolicySnapshot(policy, color || { code: helmet.colorCode, label: helmet.colorLabel }, context),
    },
  };
}

function deliveryIsHistorical(delivery, previousDelivery) {
  return Boolean(previousDelivery && JSON.stringify(previousDelivery) === JSON.stringify(delivery));
}
function legacyDeliverySignature(delivery = {}) {
  return JSON.stringify({
    workerId: String(delivery.workerId || delivery.trabId || ''),
    inventoryId: String(delivery.inventoryId || delivery.itemId || ''),
    itemId: String(delivery.itemId || delivery.inventoryId || ''),
    itemName: String(delivery.itemName || delivery.nombre || delivery.epp || ''),
    category: String(delivery.category || delivery.type || ''),
    qty: Number(delivery.qty ?? delivery.quantity ?? delivery.cantidad ?? 0),
    size: String(delivery.size || 'Sin talla registrada'),
    helmetClass: String(delivery.helmetClass || ''),
    helmetExpiryDate: String(delivery.helmetExpiryDate || delivery.expiryDate || ''),
    brandModel: String(delivery.brandModel || ''),
    certification: String(delivery.certification || ''),
    lotSerial: String(delivery.lotSerial || ''),
    condition: String(delivery.condition || 'no_registrada'),
    deliveryStatus: String(delivery.deliveryStatus || 'no_registrado'),
    deliveredAt: String(delivery.deliveredAt || ''),
    replaceAt: String(delivery.replaceAt || ''),
    mantId: String(delivery.mantId || ''),
    orderId: String(delivery.orderId || ''),
    projectId: String(delivery.projectId || ''),
    minaId: String(delivery.minaId || ''),
    clientId: String(delivery.clientId || ''),
    helmetSnapshot: delivery.helmetSnapshot || null,
  });
}
function legacyDeliveryUnchanged(delivery, previousDelivery) {
  return Boolean(previousDelivery
    && !selectorText(previousDelivery.helmetColorCode || previousDelivery.colorCode)
    && !selectorText(previousDelivery.helmetColorLabel || previousDelivery.colorLabel)
    && !selectorText(delivery.helmetColorCode || delivery.colorCode)
    && !selectorText(delivery.helmetColorLabel || delivery.colorLabel)
    && legacyDeliverySignature(delivery) === legacyDeliverySignature(previousDelivery));
}

function validateHelmetDelivery(delivery, state, previousDelivery, previousWorker, previousState) {
  const inventoryItem = collection(state, 'inventoryItems').find(item => (
    String(item?.id || '') === String(delivery?.inventoryId || '')
    || String(item?.id || '') === String(delivery?.itemId || '')
  ));
  const isHelmet = isHelmetItem(delivery) || isHelmetItem(inventoryItem)
    || isHelmetItem(previousDelivery) || Boolean(previousDelivery?.helmetSnapshot);
  if (!isHelmet) return;
  const historical = deliveryIsHistorical(delivery, previousDelivery);
  const code = selectorText(delivery.helmetColorCode || delivery.colorCode).toLowerCase();
  const label = selectorText(delivery.helmetColorLabel || delivery.colorLabel);
  if (!code || !label) {
    if (historical || legacyDeliveryUnchanged(delivery, previousDelivery)) return;
    helmetConflict('La entrega de casco requiere el color físico del artículo.', 'HELMET_DELIVERY_COLOR_REQUIRED');
  }
  const context = deliveryHelmetContext(delivery, state, previousDelivery, previousWorker, previousState, historical);
  const policy = resolveHelmetPolicy(state, context);
  const color = helmetColorForCode(state, code);
  const sameHistoricalLabel = previousDelivery
    && String(previousDelivery.helmetColorCode || previousDelivery.colorCode || '') === code
    && String(previousDelivery.helmetColorLabel || previousDelivery.colorLabel || '') === label;
  if (!color && !sameHistoricalLabel) helmetConflict('El color físico del casco no existe en el catálogo.', 'INVALID_HELMET_COLOR');
  if (color && (!color.active || (policy.hasColorRestriction && !policy.allowedColorCodes.includes(code))) && !sameHistoricalLabel) {
    helmetConflict('El color físico del casco no está habilitado para este contexto.', 'HELMET_COLOR_NOT_ALLOWED');
  }
  if (color && color.label !== label && !sameHistoricalLabel) helmetConflict('La etiqueta histórica del color de casco no coincide.', 'INVALID_HELMET_COLOR');
  delivery.helmetColorCode = code;
  delivery.helmetColorLabel = label;
  // The delivery snapshot is server materialized. A caller cannot supply a
  // different context or policy as an authoritative historical record.
  delivery.helmetSnapshot = helmetPolicySnapshot(policy, color || { code, label }, context);
}

function legacyInventoryHarmlessChange(item, previousItem) {
  if (!previousItem
    || selectorText(previousItem.helmetColorCode || previousItem.colorCode)
    || selectorText(previousItem.helmetColorLabel || previousItem.colorLabel)
    || selectorText(item.helmetColorCode || item.colorCode)
    || selectorText(item.helmetColorLabel || item.colorLabel)) return false;
  const protectedFields = [
    'name', 'nombre', 'itemName', 'epp', 'category', 'type',
    'mantId', 'orderId', 'projectId', 'minaId', 'clientId',
    'helmetClass', 'brandModel', 'certification', 'lotSerial', 'helmetExpiryDate', 'expiryDate',
  ];
  return protectedFields.every(key => JSON.stringify(item?.[key] ?? null) === JSON.stringify(previousItem?.[key] ?? null));
}

function validateHelmetInventoryItem(item, state, previousItem) {
  const isHelmet = isHelmetItem(item) || isHelmetItem(previousItem);
  if (!isHelmet) return;
  const historical = previousItem && JSON.stringify(previousItem) === JSON.stringify(item);
  const code = selectorText(item.helmetColorCode || item.colorCode).toLowerCase();
  const label = selectorText(item.helmetColorLabel || item.colorLabel);
  if (!code || !label) {
    // Legacy physical records remain usable for stock/location maintenance,
    // but identity, classification and policy context cannot be rewritten
    // until the physical colour snapshot is completed.
    if (historical || legacyInventoryHarmlessChange(item, previousItem)) return;
    helmetConflict('El casco de inventario requiere color físico y etiqueta histórica.', 'HELMET_INVENTORY_COLOR_REQUIRED');
  }
  const color = helmetColorForCode(state, code);
  const sameHistoricalLabel = previousItem
    && String(previousItem.helmetColorCode || previousItem.colorCode || '') === code
    && String(previousItem.helmetColorLabel || previousItem.colorLabel || '') === label;
  if (!color && !sameHistoricalLabel) helmetConflict('El color del casco de inventario no existe en el catálogo.', 'INVALID_HELMET_COLOR');
  if (color && (!color.active || color.label !== label) && !sameHistoricalLabel) helmetConflict('El color del casco de inventario no es válido.', 'INVALID_HELMET_COLOR');
  item.helmetColorCode = code;
  item.helmetColorLabel = label;
}


export function isValidEmail(value) {
  return emailSchema.safeParse(value).success;
}

export const loginSchema = z.object({
  rut: z.string().min(8).max(20),
  email: emailSchema,
  password: z.string().min(1).max(128),
  mfaCode: z.string().trim().min(6).max(20).optional(),
});
export const registerSchema = z.object({
  companyName: z.string().trim().min(3).max(160), rut: z.string().min(8).max(20),
  adminName: z.string().trim().min(3).max(160), email: emailSchema,
  phone: z.string().max(40).optional().default(''), password: z.string().min(12).max(128), inviteCode: z.string().max(200),
  acceptedTerms: z.literal(true), termsVersion: z.literal('2026-11-05'),
});

const workerEmailSchema = z.string().trim().max(254).email();
function validateWorkerEmail(worker, previousWorker) {
  // The previous record comes from the server's tenant state. Carrying its
  // unchanged email must not force a cleanup when another record is saved.
  if (previousWorker && sameRecord(worker.email, previousWorker.email)) return;
  if (worker.email == null) return;
  if (typeof worker.email === 'string' && !worker.email.trim()) {
    worker.email = '';
    return;
  }
  const result = workerEmailSchema.safeParse(worker.email);
  if (!result.success) throw Object.assign(new Error('Worker email is invalid'), { status: 409, code: 'INVALID_WORKER_EMAIL' });
  worker.email = result.data;
}

function legacyContactKey(contact) {
  const name = normalizedText(contact?.nombre);
  const phone = normalizedText(contact?.telefono);
  return name && phone ? `${name}|${phone}` : '';
}

function previousContactFor(contact, previousContacts) {
  if (contact?.id != null && String(contact.id).trim()) {
    return previousContacts.find(item => item?.id != null && String(item.id) === String(contact.id));
  }

  // Legacy contacts can be retained only when a stable name/phone fingerprint
  // identifies exactly one prior contact. Position in the array is never identity.
  const key = legacyContactKey(contact);
  if (!key) return undefined;
  const matches = previousContacts.filter(item => item?.id == null && legacyContactKey(item) === key);
  return matches.length === 1 ? matches[0] : undefined;
}

function validateClientEmails(client, previousClient) {
  client.emailMandante = validateOptionalHistoricalEmail(client.emailMandante, previousClient?.emailMandante, {
    code: 'INVALID_CLIENT_EMAIL',
    hasPreviousRecord: Boolean(previousClient),
  });
  const previousContacts = Array.isArray(previousClient?.contactos) ? previousClient.contactos : [];
  client.contactos = (Array.isArray(client.contactos) ? client.contactos : []).map(contact => {
    const previous = previousContactFor(contact, previousContacts);
    return {
      ...contact,
      email: validateOptionalHistoricalEmail(contact?.email, previous?.email, {
        code: 'INVALID_CLIENT_CONTACT_EMAIL',
        hasPreviousRecord: Boolean(previous),
      }),
    };
  });
}

function validateOpportunityEmails(state, previousState) {
  const previous = new Map(
    ['prospectos', 'oportunidades', 'opportunities']
      .flatMap(key => Array.isArray(previousState?.[key]) ? previousState[key] : [])
      .filter(row => row?.id != null)
      .map(row => [String(row.id), row]),
  );
  for (const key of ['prospectos', 'oportunidades', 'opportunities']) {
    if (!Array.isArray(state[key])) continue;
    state[key] = state[key].map(row => {
      const previousRecord = previous.get(String(row?.id || ''));
      return {
        ...row,
        email: validateOptionalHistoricalEmail(row?.email, previousRecord?.email, {
          code: 'INVALID_OPPORTUNITY_EMAIL',
          hasPreviousRecord: Boolean(previousRecord),
        }),
      };
    });
  }
}

export const MINIMUM_WORKER_AGE = Number(process.env.MINIMUM_WORKER_AGE || 18);
function validateWorkerBirthDate(worker, today = new Date().toISOString().slice(0, 10)) {
  if (!worker.nacimiento) return;
  if (worker.nacimiento > today) throw Object.assign(new Error(`Worker ${worker.id} has a future birth date`), { status: 409, code: 'INVALID_WORKER_BIRTH_DATE' });
  const [year, month, day] = today.split('-').map(Number);
  const cutoff = `${year - MINIMUM_WORKER_AGE}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (worker.nacimiento > cutoff) throw Object.assign(new Error(`Worker ${worker.id} is under the minimum age of ${MINIMUM_WORKER_AGE}`), { status: 409, code: 'WORKER_UNDERAGE', minimumAge: MINIMUM_WORKER_AGE });
}

export const userSchema = z.object({ fullName: z.string().trim().min(3).max(160), email: emailSchema, role: z.enum(['client_admin','rrhh','prevencion','acreditacion','consulta']), password: z.string().min(12).max(128).optional(), permissions:z.object({modules:z.record(z.string(),z.boolean()).default({})}).optional() });

const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);
export function sanitizeJson(value, key = '', parentKey = '', context = {}) {
  // Only state paths that subsequently validate the typed RUT opt in. Generic
  // sanitization still cleans object properties and blocked keys everywhere else.
  if (context.preserveOpportunityRut && context.preserveOpportunityRutValues) return structuredClone(value);
  if (Array.isArray(value)) {
    const collectionKey = key || context.collectionKey || '';
    return value.map(item => sanitizeJson(item, '', collectionKey, {
      ...context,
      collectionKey,
      depth: (context.depth || 0) + 1,
      directWorkerRecord: collectionKey === 'trabajadores',
      directOpportunityRecord: Boolean(context.opportunityCollection),
      opportunityCollection: false,
      preserveOpportunityRut: false,
      preserveWorkerEmail: false,
    }));
  }
  if (value && typeof value === 'object') {
    const childContext = { ...context, depth: (context.depth || 0) + 1, directWorkerRecord: false, directOpportunityRecord: false, preserveWorkerEmail: false, preserveOpportunityRut: false };
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (blockedKeys.has(k)) continue;
      out[k] = sanitizeJson(v, k, key, {
        ...childContext,
        // Typed address/identifier fields have their own strict validation.
        // Preserve their raw value for comparison with persisted history.
        preserveWorkerEmail: Boolean(context.directWorkerRecord && k === 'email'),
        preserveOpportunityRut: Boolean(context.directOpportunityRecord && k === 'rut'),
        directOpportunityRecord: Boolean(context.opportunityCollection),
        opportunityCollection: !context.depth && OPPORTUNITY_COLLECTIONS.includes(k),
      });
    }
    return out;
  }
  if (typeof value !== 'string') return value;
  // Typography replacement, stripping or truncation must not turn an invalid
  // address/identifier into a different valid value or rewrite persisted history.
  if (context.preserveWorkerEmail || context.preserveOpportunityRut) return value;
  if (['fileData'].includes(key)) return null;
  if (['cloudUrl','inviteUrl'].includes(key)) {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; }
  }
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[<>]/g, '').replace(/"/g, '”').replace(/'/g, '’').replace(/`/g, '´').slice(0, 20_000);
}

export function summarizeChanges(before, after, path = '', output = []) {
  if (output.length >= 200) return output;
  if (Object.is(before, after)) return output;
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    output.push({ path: path || '/', before, after }); return output;
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    const a=Array.isArray(before)?before:[],b=Array.isArray(after)?after:[],identifiable=[...a,...b].every(x=>x&&typeof x==='object'&&x.id);
    if(identifiable){const am=new Map(a.map(x=>[String(x.id),x])),bm=new Map(b.map(x=>[String(x.id),x]));for(const id of new Set([...am.keys(),...bm.keys()])){if(output.length>=200)break;if(!am.has(id))output.push({path:`${path}/${id}`,action:'created',after:bm.get(id)});else if(!bm.has(id))output.push({path:`${path}/${id}`,action:'deleted',before:am.get(id)});else summarizeChanges(am.get(id),bm.get(id),`${path}/${id}`,output);}}
    else if (JSON.stringify(before) !== JSON.stringify(after)) output.push({ path: path || '/', beforeCount: a.length, afterCount: b.length });
    return output;
  }
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) summarizeChanges(before[key], after[key], `${path}/${key}`, output);
  return output;
}

const roleScopes={
  rrhh:new Set(['trabajadores','asignaciones','firmas','callouts','turnos','credenciales','hotelAsig','waGroups','contractTemplates','eppDeliveries','eppMeasurements']),
  prevencion:new Set(['trabajadores','incidentes','protocolosSalud','permisosTrabajo','vehiculos','turnos','eppCatalog','eppDeliveries','eppMeasurements','helmetColors','helmetPolicies']),
  acreditacion:new Set(['trabajadores','empresaDocs','acreditacionesMandante','permisosTrabajo','credenciales','firmas','eppDeliveries','eppMeasurements'])
};
export function enforceStateScope(role,before,after){const allowed=roleScopes[role];if(!allowed)return;const changed=new Set([...Object.keys(before||{}),...Object.keys(after||{})].filter(k=>JSON.stringify(before?.[k])!==JSON.stringify(after?.[k])));const forbidden=[...changed].filter(k=>!allowed.has(k));if(forbidden.length)throw Object.assign(new Error(`Role ${role} cannot modify: ${forbidden.join(', ')}`),{status:403,code:'FIELD_PERMISSION_DENIED'});}

function duplicate(values) { const seen = new Set(); return values.find(v => v && (seen.has(v) || !seen.add(v))); }
const normalizedText = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
// A document classification is a stable business identity. Keep the visible
// reference too, so distinct evidence of the same classification can retain
// its own traceability without confusing a contract with a service annex.
const workerDocumentKey = item => [
  normalizedText(item?.type),
  normalizedText(item?.documentType),
  normalizedText(item?.name),
  item?.vence || '',
].join('|');
function assertUnique(values, message, code = 'DUPLICATE_DATA') {
  const value = duplicate(values);
  if (value) throw Object.assign(new Error(`${message}: ${value}`), { status: 409, code });
}

const collection = (state, key) => Array.isArray(state?.[key]) ? state[key] : [];
const sameRecord = (left, right) => JSON.stringify(left) === JSON.stringify(right);
// Health protocols read historical aliases, but every write is resolved against
// the canonical trabajadores[].id before reference and duplicate validation.
function healthProtocolScope(row) {
  if (row?.scope === 'global') return 'global';
  return row?.scope === 'cliente' || row?.minaId ? 'cliente' : 'global';
}

function healthProtocolReferenceSignature(row) {
  return [row?.workerId || '', row?.trabId || '', row?.personaId || '', row?.scope || '', row?.minaId || '']
    .map(value => String(value)).join('|');
}

function resolveHealthProtocolWorkerId(row, workerIds) {
  const references = [row?.workerId, row?.trabId, row?.personaId]
    .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
    .map(value => String(value).trim());
  if (new Set(references).size !== 1 || !workerIds.has(references[0])) {
    throw Object.assign(new Error('Health protocol references an unknown or ambiguous worker'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  return references[0];
}

// The fallback is intentionally narrow. A module can only opt in once its
// append validation covers every strict validation rule for new records.
export const APPEND_FALLBACK_MODULES = new Set([
  'trabajadores',
  'minas',
  'contratos',
  'mantenciones',
]);

export function appendOnlyRows(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after)) return null;
  const previous = new Map(before.filter(row => row?.id).map(row => [String(row.id), row]));
  for (const row of after) {
    if (!row?.id || !previous.has(String(row.id))) continue;
    if (!sameRecord(previous.get(String(row.id)), row)) return null;
  }
  if ([...previous.keys()].some(id => !after.some(row => String(row?.id) === id))) return null;
  return after.filter(row => !previous.has(String(row?.id)));
}

function appendOnlyWorkerChanges(before, after) {
  if (!Array.isArray(before) || !Array.isArray(after)) return null;
  if (duplicate(after.map(row => String(row?.id || '')))) return null;
  const previous = new Map(before.filter(row => row?.id).map(row => [String(row.id), row]));
  const documentAdditions = [];

  for (const worker of after) {
    const existing = previous.get(String(worker?.id || ''));
    if (!existing) continue;
    const existingFields = { ...existing };
    const nextFields = { ...worker };
    delete existingFields.workerItems;
    delete nextFields.workerItems;
    if (!sameRecord(existingFields, nextFields)) return null;

    const currentItems = collection(existing, 'workerItems');
    const proposedItems = collection(worker, 'workerItems');
    if (proposedItems.length < currentItems.length) return null;
    if (!currentItems.every((item, index) => sameRecord(item, proposedItems[index]))) return null;
    const items = proposedItems.slice(currentItems.length);
    if (items.length) documentAdditions.push({ worker, previous: existing, items });
  }

  if ([...previous.keys()].some(id => !after.some(row => String(row?.id) === id))) return null;
  return {
    workers: after.filter(row => !previous.has(String(row?.id))),
    documentAdditions,
  };
}

function conflict(message, code) {
  throw Object.assign(new Error(message), { status: 409, code });
}

const OPERATIONAL_ASSIGNMENT_STATES = new Set([
  'asignado', 'habilitado', 'confirmado', 'activa', 'activo', 'en_curso',
  'contrato_enviado', 'contrato_firmado', 'acreditado', 'acreditacion_enviada',
]);
const INACTIVE_RESTRICTION_STATES = new Set(['levantada', 'cerrada', 'inactiva']);

function assignmentIsOperationalForAvailability(assignment) {
  return OPERATIONAL_ASSIGNMENT_STATES.has(normalizedText(assignment?.recruitmentStage || assignment?.estadoGestion || assignment?.estado));
}

export function workerHasBlockingRestriction(state, workerId, today = operationalDay()) {
  const worker = collection(state, 'trabajadores').find(row => String(row?.id) === String(workerId));
  if (worker?.bloqueado || normalizedText(worker?.disponibilidad) === 'bloqueado') return true;
  return collection(state, 'restricted').some(restriction => (
    String(restriction?.workerId || restriction?.trabId || restriction?.personaId) === String(workerId) &&
    restriction?.activa !== false &&
    !INACTIVE_RESTRICTION_STATES.has(normalizedText(restriction?.estado)) &&
    (!restriction?.hasta || String(restriction.hasta) >= today)
  ));
}

function ensureUniqueNew(rows, existing, key, message, code) {
  const known = new Set(existing.map(key).filter(Boolean));
  for (const row of rows) {
    const value = key(row);
    if (!value) continue;
    if (known.has(value)) conflict(message, code);
    known.add(value);
  }
}

function validateWorkerItems(worker, reject = conflict, previousWorker = null) {
  const items = collection(worker, 'workerItems');
  const duplicateId = duplicate(items.map(item => String(item.id || '')));
  if (duplicateId) reject(`Documento duplicado para la persona ${worker.id}.`, 'DUPLICATE_WORKER_DOCUMENT_ID');
  const duplicateDocument = duplicate(items.map(workerDocumentKey));
  if (duplicateDocument) reject(`Documento equivalente duplicado para la persona ${worker.id}.`, 'DUPLICATE_WORKER_DOCUMENT');
  for (const item of items) {
    if (item.emision && item.vence && item.emision > item.vence) {
      reject(`El documento ${item.id || item.name || 'sin nombre'} tiene fechas inválidas.`, 'INVALID_DATES');
    }
  }
  for (const item of changedWorkerDocuments(previousWorker ? [previousWorker] : [], [worker], sanitizeJson)) requireWorkerDocumentEvidence(item);
}

function validateAppendedWorkerItems(worker, previous, additions) {
  const knownIds = new Set(collection(previous, 'workerItems').map(item => String(item?.id || '')).filter(Boolean));
  const knownDocuments = new Set(collection(previous, 'workerItems').map(workerDocumentKey));
  for (const item of additions) {
    const id = String(item?.id || '');
    if (id && knownIds.has(id)) conflict(`Documento duplicado para la persona ${worker.id}.`, 'DUPLICATE_WORKER_DOCUMENT_ID');
    if (id) knownIds.add(id);
    const documentKey = workerDocumentKey(item);
    if (knownDocuments.has(documentKey)) conflict(`Documento equivalente duplicado para la persona ${worker.id}.`, 'DUPLICATE_WORKER_DOCUMENT');
    knownDocuments.add(documentKey);
    if (item?.emision && item?.vence && item.emision > item.vence) {
      conflict(`El documento ${item.id || item.name || 'sin nombre'} tiene fechas inválidas.`, 'INVALID_DATES');
    }
    requireWorkerDocumentEvidence(item);
  }
}

// A document is append-only evidence. Its validation must not depend on
// unrelated legacy inconsistencies in the rest of the tenant state.
export function validateWorkerDocumentAppend(worker, item) {
  if (!worker?.id) conflict('La persona no existe.', 'WORKER_NOT_FOUND');
  if (!item || typeof item !== 'object' || Array.isArray(item) || !String(item.id || '').trim() || !String(item.name || '').trim()) {
    conflict('El documento requiere identificador y nombre.', 'INCOMPLETE_WORKER_DOCUMENT');
  }
  validateAppendedWorkerItems(worker, worker, [item]);
}

// Removing a single evidence must not revalidate unrelated fields in a legacy
// worker profile. The route persists only the resulting workerItems array.
export function removeWorkerDocument(worker, documentId) {
  if (!worker?.id) conflict('La persona no existe.', 'WORKER_NOT_FOUND');
  const items = collection(worker, 'workerItems');
  const index = items.findIndex(item => String(item?.id || '') === String(documentId || ''));
  if (index < 0) conflict('No encontramos la evidencia que deseas eliminar.', 'WORKER_DOCUMENT_NOT_FOUND');
  const item = items[index];
  return {
    item,
    worker: { ...worker, workerItems: items.filter((_, itemIndex) => itemIndex !== index) },
  };
}

// New records must be safe on their own. Existing legacy data is diagnosed separately
// instead of preventing a company from creating a valid new record.
export function validateAppendChanges(current, proposed, keys) {
  if (!Array.isArray(keys) || keys.some(key => !APPEND_FALLBACK_MODULES.has(key))) return false;
  const additions = new Map();
  const appendedWorkerItems = [];
  for (const key of keys) {
    if (key === 'trabajadores') {
      const workerChanges = appendOnlyWorkerChanges(collection(current, key), collection(proposed, key));
      if (!workerChanges) return false;
      if (workerChanges.documentAdditions.length && keys.length !== 1) return false;
      additions.set(key, workerChanges.workers);
      appendedWorkerItems.push(...workerChanges.documentAdditions);
    } else {
      const rows = appendOnlyRows(collection(current, key), collection(proposed, key));
      if (!rows) return false;
      additions.set(key, rows);
    }
  }

  const workers = [...collection(current, 'trabajadores'), ...(additions.get('trabajadores') || [])];
  const mines = [...collection(current, 'minas'), ...(additions.get('minas') || [])];
  const contracts = [...collection(current, 'contratos'), ...(additions.get('contratos') || [])];
  const projects = [...collection(current, 'mantenciones'), ...(additions.get('mantenciones') || [])];
  const mineIds = new Set(mines.map(row => String(row?.id || '')).filter(Boolean));
  const contractIds = new Set(contracts.map(row => String(row?.id || '')).filter(Boolean));

  for (const key of keys) {
    ensureUniqueNew(additions.get(key), collection(current, key), row => String(row?.id || ''), 'Ya existe un registro con ese identificador.', 'DUPLICATE_ID');
  }

  const newWorkers = additions.get('trabajadores') || [];
  const workerIds = new Set(workers.map(row => String(row?.id || '')).filter(Boolean));
  const projectIds = new Set(projects.map(row => String(row?.id || '')).filter(Boolean));
  // The append fallback validates against the same candidate graph that the
  // transaction will persist. This prevents a new worker from falling back to
  // the tenant policy when a client/OS association is appended atomically.
  const appendState = {
    ...current,
    trabajadores: workers,
    minas: mines,
    contratos: contracts,
    mantenciones: projects,
    asignaciones: [...collection(current, 'asignaciones'), ...(additions.get('asignaciones') || [])],
    restricted: [...collection(current, 'restricted'), ...(additions.get('restricted') || [])],
  };
  for (const assignment of additions.get('asignaciones') || []) {
    if (!workerIds.has(String(assignment?.trabId)) || !projectIds.has(String(assignment?.mantId))) {
      conflict('La asignación referencia una persona u orden inexistente.', 'INVALID_REFERENCE');
    }
    if (assignmentIsOperationalForAvailability(assignment) && workerHasBlockingRestriction(appendState, assignment.trabId)) {
      conflict('La persona no está habilitada para recibir asignaciones.', 'WORKER_NOT_AVAILABLE');
    }
  }
  for (const worker of newWorkers) {
    if (!worker?.id || !String(worker.nombre || '').trim() || !worker.rut) conflict('La persona requiere identificador, nombre y RUT.', 'INCOMPLETE_WORKER');
    if (!isValidRut(worker.rut)) conflict('El RUT de la persona no es válido.', 'INVALID_WORKER_RUT');
    if (worker.tel) {
      const phone = normalizeChilePhone(worker.tel);
      if (!isValidChilePhone(phone)) conflict('El teléfono de la persona no es válido.', 'INVALID_WORKER_PHONE');
      worker.tel = phone;
    }
    validateWorkerBirthDate(worker);
    validateWorkerEmail(worker);
    validateWorkerHelmet(worker, appendState, null, { requireDecisionForNew: true });
    validateWorkerItems(worker);
    if ((worker.mineras || []).some(id => !mineIds.has(String(id)))) conflict('La persona referencia un cliente inexistente.', 'INVALID_REFERENCE');
  }
  for (const change of appendedWorkerItems) validateAppendedWorkerItems(change.worker, change.previous, change.items);
  ensureUniqueNew(newWorkers, collection(current, 'trabajadores'), row => normalizeRut(row?.rut), 'Ya existe una persona con ese RUT.', 'DUPLICATE_WORKER_RUT');

  const newMines = additions.get('minas') || [];
  for (const mine of newMines) {
    if (!mine?.id || !String(mine.nombre || '').trim()) conflict('El cliente requiere identificador y nombre.', 'INCOMPLETE_CLIENT');
    if (mine.rut && !isValidRut(mine.rut)) conflict('El RUT del cliente no es válido.', 'INVALID_CLIENT_RUT');
  }
  ensureUniqueNew(newMines, collection(current, 'minas'), row => normalizeRut(row?.rut), 'Ya existe un cliente con ese RUT.', 'DUPLICATE_CLIENT_RUT');
  ensureUniqueNew(newMines, collection(current, 'minas'), row => `${normalizedText(row?.nombre)}|${normalizedText(row?.mandante)}`, 'Ya existe un cliente equivalente.', 'DUPLICATE_CLIENT');

  const newContracts = additions.get('contratos') || [];
  for (const contract of newContracts) {
    if (contract.minaId && !mineIds.has(String(contract.minaId))) conflict('El contrato referencia un cliente inexistente.', 'INVALID_REFERENCE');
    if (contract.inicio && contract.termino && contract.inicio > contract.termino) conflict('Las fechas del contrato no son válidas.', 'INVALID_DATES');
  }
  ensureUniqueNew(newContracts, collection(current, 'contratos'), row => normalizedText(row?.numero), 'Ya existe un contrato con ese número o código.', 'DUPLICATE_CONTRACT_NUMBER');

  const newProjects = additions.get('mantenciones') || [];
  for (const project of newProjects) {
    if (project.minaId && !mineIds.has(String(project.minaId))) conflict('La orden de servicio referencia un cliente inexistente.', 'INVALID_REFERENCE');
    if (project.contratoId && !contractIds.has(String(project.contratoId))) conflict('La orden de servicio referencia un contrato inexistente.', 'INVALID_REFERENCE');
    const contract = contracts.find(row => String(row?.id) === String(project.contratoId));
    if (contract?.minaId && project.minaId && String(contract.minaId) !== String(project.minaId)) conflict('El contrato no pertenece al cliente seleccionado.', 'INVALID_REFERENCE');
    if (project.inicio && project.termino && project.inicio > project.termino) conflict('Las fechas de la orden de servicio no son válidas.', 'INVALID_DATES');
  }
  ensureUniqueNew(
    newProjects,
    collection(current, 'mantenciones'),
    row => `${row?.minaId || ''}|${normalizedText(row?.nombre)}|${row?.inicio || ''}`,
    'Ya existe una orden de servicio con ese cliente, nombre y fecha de inicio.',
    'DUPLICATE_PROJECT'
  );

  return true;
}
function assignmentIdentity(assignment) {
  if (assignment?.id) return `id:${String(assignment.id)}`

  return [
    assignment?.trabId,
    assignment?.mantId,
    assignment?.inicio || assignment?.fechaInicio || '',
    assignment?.termino || assignment?.fechaTermino || '',
  ]
    .map(value => String(value || ''))
    .join('|')
}

function requiresAvailabilityValidation(assignment, previousAssignments) {
  if (!assignmentIsOperationalForAvailability(assignment)) return false
  if (!previousAssignments) return true

  const before = previousAssignments.get(assignmentIdentity(assignment))

  return !before || !assignmentIsOperationalForAvailability(before)
}

export function validateTenantState(input, { previousState = null, legacyHelmetImportIds = null } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('State must be an object'), { status: 400 });
  const state = materializeHelmetState(sanitizeJson(input, '', '', { preserveOpportunityRutValues: true }));
  validateHelmetConfiguration(state);
  const previousAssignments = previousState
    ? new Map(collection(previousState, 'asignaciones').map(assignment => [assignmentIdentity(assignment), assignment]))
    : null;
  const workers = Array.isArray(state.trabajadores) ? state.trabajadores : [];
  const previousWorkers = new Map((Array.isArray(previousState?.trabajadores) ? previousState.trabajadores : []).map(worker => [String(worker.id), worker]));
  const previousClients = new Map((Array.isArray(previousState?.minas) ? previousState.minas : []).filter(client => client?.id != null).map(client => [String(client.id), client]));
  const projects = Array.isArray(state.mantenciones) ? state.mantenciones : [];
  const mines = Array.isArray(state.minas) ? state.minas : [];
  const contracts = Array.isArray(state.contratos) ? state.contratos : [];
  for (const client of mines) {
    if (!client.id || !String(client.nombre || '').trim()) throw Object.assign(new Error('Client requires id and name'), { status: 409, code: 'INCOMPLETE_CLIENT' });
    if (client.rut && !isValidRut(client.rut)) throw Object.assign(new Error(`Client ${client.id} has invalid RUT`), { status: 409, code: 'INVALID_CLIENT_RUT' });
    validateClientEmails(client, previousClients.get(String(client.id)));
  }
  for (const worker of workers) {
    if (!worker.id || !String(worker.nombre || '').trim() || !worker.rut) throw Object.assign(new Error('Worker requires id, name and RUT'), { status: 409, code: 'INCOMPLETE_WORKER' });
    if (!isValidRut(worker.rut)) throw Object.assign(new Error(`Worker ${worker.id} has invalid RUT`), { status: 409, code: 'INVALID_WORKER_RUT' });
    if (worker.tel) {
      worker.tel = normalizeChilePhone(worker.tel);
      if (!isValidChilePhone(worker.tel)) throw Object.assign(new Error(`Worker ${worker.id} has invalid Chilean phone`), { status: 409, code: 'INVALID_WORKER_PHONE' });
    }
    validateWorkerBirthDate(worker);
    const previousWorker = previousWorkers.get(String(worker.id));
    validateWorkerEmail(worker, previousWorker);
    const allowLegacyImport = legacyHelmetImportIds instanceof Set && legacyHelmetImportIds.has(String(worker.id));
    validateWorkerHelmet(worker, state, previousWorker, {
      requireDecisionForNew: Boolean(previousState),
      allowLegacyImport,
      previousState,
    });
  }
  for(const subcontractor of Array.isArray(state.subcontratos)?state.subcontratos:[])if(subcontractor.rut&&!isValidRut(subcontractor.rut))throw Object.assign(new Error(`Subcontractor ${subcontractor.id} has invalid RUT`),{status:409,code:'INVALID_SUBCONTRACTOR_RUT'});
  assertUnique(workers.map(w => normalizeRut(w.rut)), 'Duplicate worker RUT', 'DUPLICATE_WORKER_RUT');
  assertUnique(contracts.map(c => normalizedText(c.numero)), 'Duplicate contract number', 'DUPLICATE_CONTRACT_NUMBER');
  assertUnique(mines.filter(m => m.rut).map(m => normalizeRut(m.rut)), 'Duplicate client RUT', 'DUPLICATE_CLIENT_RUT');
  assertUnique(mines.map(m => `${normalizedText(m.nombre)}|${normalizedText(m.mandante)}`), 'Duplicate client', 'DUPLICATE_CLIENT');
  assertUnique(projects.map(p => `${p.minaId}|${normalizedText(p.nombre)}|${p.inicio || ''}`), 'Duplicate project', 'DUPLICATE_PROJECT');
  assertUnique((state.hoteles || []).map(h => `${normalizedText(h.nombre)}|${normalizedText(h.ciudad)}`), 'Duplicate hotel', 'DUPLICATE_HOTEL');
  assertUnique((state.subcontratos || []).map(s => normalizeRut(s.rut)), 'Duplicate subcontractor RUT', 'DUPLICATE_SUBCONTRACTOR_RUT');
  assertUnique((state.vehiculos || []).flatMap(v => [v.patente ? `p:${normalizedText(v.patente).replace(/[^a-z0-9]/g, '')}` : '', v.serie ? `s:${normalizedText(v.serie)}` : '']), 'Duplicate vehicle plate or serial', 'DUPLICATE_VEHICLE');
  assertUnique((state.incidentes || []).map(x => `${x.mantId}|${x.fecha || ''}|${normalizedText(x.tipo)}|${normalizedText(x.descripcion)}`), 'Duplicate incident', 'DUPLICATE_INCIDENT');
  assertUnique((state.permisosTrabajo || []).map(x => `${x.mantId}|${normalizedText(x.nombre)}`), 'Duplicate work permit', 'DUPLICATE_WORK_PERMIT');
  assertUnique((state.waGroups || []).map(x => `${x.minaId || ''}|${x.mantId || ''}|${normalizedText(x.nombre)}`), 'Duplicate WhatsApp group', 'DUPLICATE_WHATSAPP_GROUP');
  assertUnique((state.firmas || []).filter(x => !['firmado','rechazado','vencido'].includes(normalizedText(x.estado))).map(x => `${x.trabId}|${x.mantId}|${normalizedText(x.tipo)}`), 'Duplicate active signature request', 'DUPLICATE_SIGNATURE_REQUEST');
  const allCollections = [
    workers, projects, mines, contracts, state.hoteles, state.asignaciones, state.hotelAsig,
    state.turnos, state.credenciales, state.incidentes, state.protocolosSalud,
    state.vehiculos, state.subcontratos, state.firmas, state.callouts, state.waGroups,
    state.permisosTrabajo, state.eppDeliveries, state.prospectos, state.oportunidades, state.opportunities
  ].filter(Array.isArray);
  for (const collection of allCollections) {
    const duplicateId = duplicate(collection.map(x => String(x.id || '')));
    if (duplicateId) throw Object.assign(new Error(`Duplicate entity id: ${duplicateId}`), { status: 409, code: 'DUPLICATE_ID' });
  }
  const workerIds = new Set(workers.map(x => String(x.id)));
  const healthProtocols = collection(state, 'protocolosSalud');
  const previousHealthProtocols = new Map(
    collection(previousState, 'protocolosSalud').filter(row => row?.id).map(row => [String(row.id), row])
  );
  const resolvedHealthProtocols = healthProtocols.map(row => {
    try {
      return { row, workerId: resolveHealthProtocolWorkerId(row, workerIds), legacyReference: false };
    } catch (error) {
      const before = previousHealthProtocols.get(String(row?.id || ''));
      // Retain unchanged legacy contradictions for audit, but reject any new or edited invalid reference.
      if (error?.code === 'INVALID_REFERENCE' && before && healthProtocolReferenceSignature(before) === healthProtocolReferenceSignature(row)) {
        return { row, workerId: null, legacyReference: true };
      }
      throw error;
    }
  });
  const projectIds = new Set(projects.map(x => String(x.id)));
  const mineIds = new Set(mines.map(x => String(x.id)));
  const contractIds = new Set(contracts.map(x => String(x.id)));
  const hotelIds = new Set((state.hoteles || []).map(x => String(x.id)));
  for (const c of contracts) {
    if (c.minaId && !mineIds.has(String(c.minaId))) throw Object.assign(new Error(`Contract ${c.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
    if (c.inicio && c.termino && c.inicio > c.termino) throw Object.assign(new Error(`Contract ${c.id} has invalid dates`), { status: 409, code: 'INVALID_DATES' });
  }
  for (const p of projects) {
    if (p.minaId && !mineIds.has(String(p.minaId))) throw Object.assign(new Error(`Project ${p.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
    if (p.contratoId && !contractIds.has(String(p.contratoId))) throw Object.assign(new Error(`Project ${p.id} references an unknown contract`), { status: 409, code: 'INVALID_REFERENCE' });
    const relatedContract = contracts.find(c => String(c.id) === String(p.contratoId));
    if (relatedContract?.minaId && p.minaId && String(relatedContract.minaId) !== String(p.minaId)) {
      throw Object.assign(new Error(`Project ${p.id} and its contract belong to different mines`), { status: 409, code: 'INVALID_REFERENCE' });
    }
    if (p.inicio && p.termino && p.inicio > p.termino) throw Object.assign(new Error(`Project ${p.id} has invalid dates`), { status: 409, code: 'INVALID_DATES' });
  }
  for (const worker of workers) {
    if ((worker.mineras || []).some(id => !mineIds.has(String(id)))) throw Object.assign(new Error(`Worker ${worker.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const hotel of Array.isArray(state.hoteles) ? state.hoteles : []) {
    if ((hotel.minaIds || []).some(id => !mineIds.has(String(id)))) throw Object.assign(new Error(`Hotel ${hotel.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
    const rooms=Array.isArray(hotel.rooms)?hotel.rooms:[];
    assertUnique(rooms.map(room=>normalizedText(room.number)),`Duplicate room number for hotel ${hotel.id}`,'DUPLICATE_HOTEL_ROOM');
    for(const room of rooms)if(Number(room.beds)<1||Number(room.rate)<0)throw Object.assign(new Error(`Hotel room ${room.id} has invalid capacity or rate`),{status:409,code:'INVALID_HOTEL_ROOM'});
  }
  for (const a of Array.isArray(state.asignaciones) ? state.asignaciones : []) {
    if (!workerIds.has(String(a.trabId)) || !projectIds.has(String(a.mantId))) throw Object.assign(new Error('Assignment references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
    if (requiresAvailabilityValidation(a, previousAssignments) && workerHasBlockingRestriction(state, a.trabId)) {
      throw Object.assign(new Error('Worker is not enabled for a new operational assignment'), { status: 409, code: 'WORKER_NOT_AVAILABLE' });
    }
  }
  assertUnique((state.asignaciones || []).map(a => `${a.trabId}|${a.mantId}`), 'Duplicate worker assignment', 'DUPLICATE_ASSIGNMENT');
  for (const row of Array.isArray(state.hotelAsig) ? state.hotelAsig : []) {
    if (!workerIds.has(String(row.trabId)) || !projectIds.has(String(row.mantId)) || !hotelIds.has(String(row.hotelId))) throw Object.assign(new Error('Hotel assignment references an unknown worker, project or hotel'), { status: 409, code: 'INVALID_REFERENCE' });
    if (row.checkin && row.checkout && row.checkin > row.checkout) throw Object.assign(new Error('Hotel assignment has invalid dates'), { status: 409, code: 'INVALID_DATES' });
  }
  assertUnique((state.hotelAsig || []).map(x => `${x.trabId}|${x.mantId}|${x.hotelId}|${x.checkin || ''}`), 'Duplicate hotel assignment', 'DUPLICATE_HOTEL_ASSIGNMENT');
  const lodgings=(Array.isArray(state.hotelAsig)?state.hotelAsig:[]).filter(x=>!['cancelada','reasignada'].includes(normalizedText(x.status)));
  for(let i=0;i<lodgings.length;i++)for(let j=i+1;j<lodgings.length;j++){const a=lodgings[i],b=lodgings[j],aStart=a.checkin||'0001-01-01',aEnd=a.checkout||'9999-12-31',bStart=b.checkin||'0001-01-01',bEnd=b.checkout||'9999-12-31';if(String(a.trabId)===String(b.trabId)&&aStart<bEnd&&bStart<aEnd)throw Object.assign(new Error('Worker has overlapping hotel assignments'),{status:409,code:'OVERLAPPING_HOTEL_ASSIGNMENT'});}
  for(const hotel of Array.isArray(state.hoteles)?state.hoteles:[])for(const room of Array.isArray(hotel.rooms)?hotel.rooms:[]){const events=lodgings.filter(x=>String(x.hotelId)===String(hotel.id)&&String(x.pieza)===String(room.number)).flatMap(x=>[{date:x.checkin||'0001-01-01',delta:1},{date:x.checkout||'9999-12-31',delta:-1}]).sort((a,b)=>a.date.localeCompare(b.date)||a.delta-b.delta);let occupied=0;for(const event of events){occupied+=event.delta;if(occupied>Number(room.beds))throw Object.assign(new Error(`Hotel room ${room.number} exceeds bed capacity`),{status:409,code:'HOTEL_ROOM_OVER_CAPACITY'});}}
  for (const row of Array.isArray(state.turnos) ? state.turnos : []) {
    if (!workerIds.has(String(row.trabId)) || !projectIds.has(String(row.mantId))) throw Object.assign(new Error('Shift references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  assertUnique((state.turnos || []).map(x => `${x.trabId}|${x.fecha}|${x.turno}`), 'Duplicate shift', 'DUPLICATE_SHIFT');
  for (const row of Array.isArray(state.credenciales) ? state.credenciales : []) {
    if (!workerIds.has(String(row.trabId)) || !mineIds.has(String(row.minaId))) throw Object.assign(new Error('Credential references an unknown worker or mine'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  assertUnique((state.credenciales || []).map(x => x.numero ? `${x.minaId}|${normalizedText(x.numero)}` : ''), 'Duplicate credential number', 'DUPLICATE_CREDENTIAL');
  for (const { row, legacyReference } of resolvedHealthProtocols) {
    if (legacyReference) continue;
    if (row.scope && !['global', 'cliente'].includes(row.scope)) {
      throw Object.assign(new Error('Health protocol has an invalid scope'), { status: 409, code: 'INVALID_HEALTH_PROTOCOL_SCOPE' });
    }
    const scope = healthProtocolScope(row);
    if (scope === 'cliente') {
      if (!row.minaId || !mineIds.has(String(row.minaId))) {
        throw Object.assign(new Error('A client-scoped health protocol requires a known client'), { status: 409, code: 'INVALID_REFERENCE' });
      }
    } else if (row.minaId) {
      throw Object.assign(new Error('A global health protocol cannot include a client reference'), { status: 409, code: 'INVALID_REFERENCE' });
    }
    for (const field of ['evaluatedOn', 'vence']) {
      if (row[field] && !/^\d{4}-\d{2}-\d{2}$/.test(row[field])) {
        throw Object.assign(new Error('Health protocol has an invalid ' + field + ' date'), { status: 409, code: 'INVALID_DATES' });
      }
    }
    if (row.evaluatedOn && row.vence && row.evaluatedOn > row.vence) {
      throw Object.assign(new Error('Health protocol has invalid evaluation and expiry dates'), { status: 409, code: 'INVALID_DATES' });
    }
  }
  for (const row of Array.isArray(state.incidentes) ? state.incidentes : []) if (!projectIds.has(String(row.mantId))) throw Object.assign(new Error('Incident references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.subcontratos) ? state.subcontratos : []) if (row.contratoId && !contractIds.has(String(row.contratoId))) throw Object.assign(new Error('Subcontractor references an unknown contract'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.vehiculos) ? state.vehiculos : []) {
    if (row.operadorId && !workerIds.has(String(row.operadorId))) throw Object.assign(new Error('Vehicle references an unknown operator'), { status: 409, code: 'INVALID_REFERENCE' });
    if ((row.minaIds || []).some(id => !mineIds.has(String(id)))) throw Object.assign(new Error('Vehicle references an unknown mine'), { status: 409, code: 'INVALID_REFERENCE' });
    if (normalizedText(row.propiedad) === 'arrendada' && !(row.arriendoVence || row.arriendoFin || row.arrendadoHasta)) {
      throw Object.assign(new Error('Rented vehicle requires a rental expiry date'), { status: 409, code: 'MISSING_RENTAL_EXPIRY' });
    }
  }
  for (const row of Array.isArray(state.firmas) ? state.firmas : []) if (!workerIds.has(String(row.trabId)) || !projectIds.has(String(row.mantId))) throw Object.assign(new Error('Signature references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.callouts) ? state.callouts : []) if (!projectIds.has(String(row.mantId))) throw Object.assign(new Error('Callout references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.waGroups) ? state.waGroups : []) {
    if (row.mantId && !projectIds.has(String(row.mantId))) throw Object.assign(new Error('WhatsApp group references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
    if (row.minaId && !mineIds.has(String(row.minaId))) throw Object.assign(new Error('WhatsApp group references an unknown mine'), { status: 409, code: 'INVALID_REFERENCE' });
    if ((row.trabIds || []).some(id => !workerIds.has(String(id)))) throw Object.assign(new Error('WhatsApp group references an unknown worker'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const row of Array.isArray(state.permisosTrabajo) ? state.permisosTrabajo : []) if (!projectIds.has(String(row.mantId))) throw Object.assign(new Error('Work permit references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
validateOpportunityEmails(state, previousState);

// An overlapping ID can have distinct persisted values in legacy stores.
// Existing rows compare within their own collection. Only migration into the
// canonical store may use the previously resolved winner for that identity.
const recordsFor = (source, key) =>
  Array.isArray(source?.[key])
    ? source[key]
    : source?.[key] && typeof source[key] === 'object'
      ? Object.values(source[key])
      : [];

const identified = rows =>
  new Map(
    rows
      .filter(row => row?.id != null && String(row.id).trim())
      .map(row => [String(row.id), row])
  );

const previousByCollection = new Map(
  OPPORTUNITY_COLLECTIONS.map(key => [
    key,
    identified(recordsFor(previousState, key))
  ])
);

const previousCanonical = identified(opportunityRows(previousState));

for (const key of OPPORTUNITY_COLLECTIONS) {
  for (const row of recordsFor(state, key)) {
    const id = row?.id != null ? String(row.id) : '';

    const previous =
      previousByCollection.get(key).get(id) ||
      (key === 'prospectos'
        ? previousCanonical.get(id)
        : undefined);

    const result = optionalHistoricalRut(row.rut, {
      hasPrevious: Boolean(previous),
      previousValue: previous?.rut
    });

    if (result.error) {
      throw Object.assign(
        new Error('Opportunity RUT is invalid'),
        {
          status: 409,
          code: 'INVALID_OPPORTUNITY_RUT'
        }
      );
    }

    if (Object.hasOwn(row, 'rut') || result.value !== undefined) {
      row.rut = result.value;
    }
  }
}
  const opportunities=opportunityRows(state).map(opportunityFields);
  assertUnique(opportunities.filter(x=>!opportunityIsClosed(x)).map(opportunityIdentity),'Duplicate active opportunity','DUPLICATE_OPPORTUNITY');
  for(const row of opportunities){if(row.clientId&&!mineIds.has(String(row.clientId)))throw Object.assign(new Error('Opportunity references an unknown client'),{status:409,code:'INVALID_REFERENCE'});if(row.contractId&&!contractIds.has(String(row.contractId)))throw Object.assign(new Error('Opportunity references an unknown contract'),{status:409,code:'INVALID_REFERENCE'});if(!Number.isFinite(Number(row.amount))||!Number.isFinite(Number(row.probability))||Number(row.amount)<0||Number(row.probability)<0||Number(row.probability)>100)throw Object.assign(new Error('Opportunity has invalid amount or probability'),{status:409,code:'INVALID_OPPORTUNITY'});}
  const previousDeliveries = new Map(collection(previousState, 'eppDeliveries').filter(row => row?.id).map(row => [String(row.id), row]));
  for (const delivery of Array.isArray(state.eppDeliveries) ? state.eppDeliveries : []) {
    if (!workerIds.has(String(delivery.workerId)) || (delivery.mantId && !projectIds.has(String(delivery.mantId)))) {
      throw Object.assign(new Error('EPP delivery references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
    }
    if (!delivery.itemId || !delivery.itemName || Number(delivery.qty) < 1 || !delivery.deliveredAt) {
      throw Object.assign(new Error('EPP delivery is incomplete'), { status: 409, code: 'INVALID_EPP_DELIVERY' });
    }
    delivery.size=String(delivery.size||'Sin talla registrada').trim();delivery.condition=delivery.condition||'no_registrada';delivery.deliveryStatus=delivery.deliveryStatus||'no_registrado';
    if(!['nuevo','reutilizado-inspeccionado','repuesto','no_registrada'].includes(delivery.condition)||!['entregado','reposicion','prestamo','no_registrado'].includes(delivery.deliveryStatus))throw Object.assign(new Error('EPP delivery has an invalid condition or status'),{status:409,code:'INVALID_EPP_DELIVERY_STATUS'});
    validateHelmetDelivery(
      delivery,
      state,
      previousDeliveries.get(String(delivery.id)),
      previousWorkers.get(String(delivery.workerId || delivery.trabId || '')),
      previousState,
    );
  }
  const previousInventory = new Map(collection(previousState, 'inventoryItems').filter(row => row?.id).map(row => [String(row.id), row]));
  for (const item of collection(state, 'inventoryItems')) validateHelmetInventoryItem(item, state, previousInventory.get(String(item.id)));
  assertUnique((state.eppDeliveries || []).map(x => `${x.workerId}|${x.itemId}|${x.deliveredAt}|${normalizedText(x.lotSerial)}`), 'Duplicate EPP delivery', 'DUPLICATE_EPP_DELIVERY');
  for (const workerId of Object.keys(state.eppMeasurements || {})) {
    if (!workerIds.has(String(workerId))) throw Object.assign(new Error('EPP measurements reference an unknown worker'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const worker of workers) validateWorkerItems(worker, conflict, previousWorkers.get(String(worker.id)));
  const workBookEntries=Array.isArray(state.workBookEntries)?state.workBookEntries:[];
  assertUnique(workBookEntries.map(row=>`${normalizedText(row.folio)}|${Number(row.entryNumber)||1}`),'Duplicate work book entry','DUPLICATE_WORK_BOOK_ENTRY');
  for(const row of workBookEntries){
    if(!mineIds.has(String(row.mineRef))||!projectIds.has(String(row.projectRef))||(row.contractRef&&!contractIds.has(String(row.contractRef))))throw Object.assign(new Error('Work book entry references an unknown client, contract or project'),{status:409,code:'INVALID_WORK_BOOK_REFERENCE'});
    const project=(state.mantenciones||[]).find(item=>String(item.id)===String(row.projectRef));
    const contract=row.contractRef?(state.contratos||[]).find(item=>String(item.id)===String(row.contractRef)):null;
    if(String(project?.minaId||'')!==String(row.mineRef)||(contract&&String(contract.minaId||'')!==String(row.mineRef)))throw Object.assign(new Error('Work book scope mismatch'),{status:409,code:'WORK_BOOK_SCOPE_MISMATCH'});
    if(!['borrador','pendiente_firma','observado','firmado','cerrado'].includes(row.status))throw Object.assign(new Error('Work book entry has invalid status'),{status:409,code:'INVALID_WORK_BOOK_STATUS'});
    if(!String(row.subject||'').trim()||!String(row.body||'').trim())throw Object.assign(new Error('Work book entry is incomplete'),{status:409,code:'INVALID_WORK_BOOK_ENTRY'});
  }
  return state;
}
