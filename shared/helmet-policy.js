/**
 * Shared helmet applicability, colour catalogue and policy helpers.
 *
 * This module deliberately contains no colour-to-role mapping. Colour meanings
 * belong to the tenant and, where required, to a client or service order.
 */
export const DEFAULT_HELMET_COLORS = Object.freeze([
  { code: 'blanco', label: 'Blanco' },
  { code: 'amarillo', label: 'Amarillo' },
  { code: 'azul', label: 'Azul' },
  { code: 'verde', label: 'Verde' },
  { code: 'rojo', label: 'Rojo' },
  { code: 'naranjo', label: 'Naranjo' },
  { code: 'gris', label: 'Gris' },
  { code: 'otro-mandante', label: 'Otro según mandante' },
]);

export const HELMET_APPLICABILITY = Object.freeze({
  REQUIRED: 'required',
  NOT_REQUIRED: 'not_required',
  UNKNOWN: 'unknown',
});

const SCOPE_PRIORITY = Object.freeze({ tenant: 1, cliente: 2, os: 3 });
const VALID_SCOPES = new Set(Object.keys(SCOPE_PRIORITY));
const colorCode = value => String(value || '').trim().toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const text = value => String(value || '').trim();
const unique = values => [...new Set(values.filter(Boolean))];

export function isHelmetItem(item) {
  const source = typeof item === 'string'
    ? item
    : [item?.itemName, item?.nombre, item?.name, item?.epp, item?.category, item?.type].join(' ');
  return /\bcasco(?:s)?\b|helmet/i.test(String(source || ''));
}

export function normalizeHelmetColors(input) {
  const source = Array.isArray(input) && input.length ? input : DEFAULT_HELMET_COLORS;
  const seen = new Set();
  return source.map((value, index) => {
    const code = colorCode(value?.code || value?.helmetColorCode || value?.label);
    const label = text(value?.label || value?.helmetColorLabel || value?.name) || DEFAULT_HELMET_COLORS[index]?.label || code;
    if (!code || seen.has(code)) return null;
    seen.add(code);
    return {
      ...(value && typeof value === 'object' ? value : {}),
      code,
      label,
      active: value?.active !== false,
    };
  }).filter(Boolean);
}

export function defaultHelmetPolicy() {
  return {
    id: 'default-tenant-helmet-policy',
    scope: 'tenant',
    active: true,
    requireColor: true,
    requireSize: true,
    requireModelClass: false,
    allowedColorCodes: [],
  };
}

export function normalizeHelmetPolicy(value = {}) {
  const scope = VALID_SCOPES.has(value.scope) ? value.scope : 'tenant';
  return {
    ...(value && typeof value === 'object' ? value : {}),
    id: text(value.id) || (scope === 'tenant' ? 'default-tenant-helmet-policy' : ''),
    scope,
    minaId: scope === 'cliente' ? text(value.minaId) : '',
    mantId: scope === 'os' ? text(value.mantId || value.orderId) : '',
    active: value.active !== false,
    requireColor: value.requireColor !== false,
    requireSize: value.requireSize !== false,
    // Model/class is explicitly opt-in. A missing value must never make it mandatory.
    requireModelClass: value.requireModelClass === true,
    allowedColorCodes: unique((Array.isArray(value.allowedColorCodes) ? value.allowedColorCodes : [])
      .map(colorCode)),
  };
}

export function normalizeHelmetPolicies(input) {
  const policies = Array.isArray(input) ? input.map(normalizeHelmetPolicy).filter(policy => policy.id) : [];
  const tenant = policies.find(policy => policy.scope === 'tenant' && policy.active);
  return tenant ? policies : [defaultHelmetPolicy(), ...policies];
}

function policyMatches(policy, context = {}) {
  if (!policy.active) return false;
  if (policy.scope === 'tenant') return true;
  if (policy.scope === 'cliente') return Boolean(context.minaId) && String(policy.minaId) === String(context.minaId);
  return Boolean(context.mantId) && String(policy.mantId) === String(context.mantId);
}

export function resolveHelmetPolicy(state = {}, context = {}) {
  const colors = normalizeHelmetColors(state.helmetColors);
  if (context.multipleActiveOrders) {
    const activeCodes = colors.filter(color => color.active).map(color => color.code);
    return { ...defaultHelmetPolicy(), colors, allowedColorCodes: activeCodes, ambiguousContext: true };
  }
  const policies = normalizeHelmetPolicies(state.helmetPolicies);
  const matching = policies
    .filter(policy => policyMatches(policy, context))
    .sort((left, right) => {
      const priority = SCOPE_PRIORITY[right.scope] - SCOPE_PRIORITY[left.scope];
      if (priority) return priority;
      return String(right.updatedAt || right.createdAt || '').localeCompare(String(left.updatedAt || left.createdAt || ''));
    });
  const policy = matching[0] || defaultHelmetPolicy();
  const activeCodes = new Set(colors.filter(color => color.active).map(color => color.code));
  const hasColorRestriction = policy.allowedColorCodes.length > 0;
  const allowedColorCodes = hasColorRestriction
    ? policy.allowedColorCodes.filter(code => activeCodes.has(code))
    : [...activeCodes];
  return { ...policy, allowedColorCodes, hasColorRestriction, colors };
}

export function helmetColorForCode(state = {}, code) {
  const normalizedCode = colorCode(code);
  return normalizeHelmetColors(state.helmetColors).find(color => color.code === normalizedCode) || null;
}

export function normalizeHelmetRequirement(epp = {}) {
  const source = epp && typeof epp === 'object' ? epp : {};
  const raw = source.helmet && typeof source.helmet === 'object' ? source.helmet : {};
  const applicability = Object.values(HELMET_APPLICABILITY).includes(raw.applicability)
    ? raw.applicability
    : HELMET_APPLICABILITY.UNKNOWN;
  const legacySize = text(source.casco);
  return {
    ...raw,
    applicability,
    colorCode: colorCode(raw.colorCode || raw.helmetColorCode),
    colorLabel: text(raw.colorLabel || raw.helmetColorLabel),
    size: text(raw.size || (applicability === HELMET_APPLICABILITY.UNKNOWN ? legacySize : '')),
    modelClass: text(raw.modelClass || raw.class),
    reason: text(raw.reason),
    policySnapshot: raw.policySnapshot && typeof raw.policySnapshot === 'object' ? raw.policySnapshot : undefined,
    legacySize: applicability === HELMET_APPLICABILITY.UNKNOWN ? legacySize : '',
  };
}

export function helmetPolicySnapshot(policy, color, context = {}) {
  return {
    policyId: policy.id,
    scope: policy.scope,
    minaId: context.minaId || policy.minaId || '',
    mantId: context.mantId || policy.mantId || '',
    requireColor: Boolean(policy.requireColor),
    requireSize: Boolean(policy.requireSize),
    requireModelClass: Boolean(policy.requireModelClass),
    allowedColorCodes: [...policy.allowedColorCodes],
    hasColorRestriction: Boolean(policy.hasColorRestriction),
    colorCode: color?.code || '',
    colorLabel: color?.label || '',
    resolvedAt: new Date().toISOString(),
  };
}

const inactiveHelmetAssignmentStates = new Set(['retirado', 'cancelado', 'finalizado', 'inactivo']);
const rows = value => Array.isArray(value) ? value : [];
const helmetProjects = state => rows(state?.mantenciones).length ? rows(state.mantenciones) : rows(state?.proyectos);

// Context used for an operational decision is derived from persisted
// assignments/client links. UI data may contain legacy/raw selectors, but those
// selectors are never authoritative by themselves.
export function helmetActiveAssignments(worker = {}, state = {}) {
  return rows(state?.asignaciones)
    .filter(row => String(row?.trabId || row?.workerId || '') === String(worker?.id || ''))
    .filter(row => text(row?.mantId))
    .filter(row => !inactiveHelmetAssignmentStates.has(String(row?.estado || '').trim().toLowerCase()));
}

export function helmetClientIds(worker = {}, state = {}) {
  const ids = new Set(rows(worker?.mineras).map(text).filter(Boolean));
  const projects = helmetProjects(state);
  for (const assignment of helmetActiveAssignments(worker, state)) {
    const project = projects.find(row => String(row?.id || '') === String(assignment?.mantId || ''));
    const minaId = text(project?.minaId);
    if (minaId) ids.add(minaId);
  }
  return [...ids];
}

function helmetContextFields(context = {}) {
  if (!context || typeof context !== 'object' || Array.isArray(context)) return null;
  const mantId = text(context.mantId || context.orderId || context.projectId);
  const minaId = text(context.minaId || context.clientId);
  return mantId || minaId ? { mantId, minaId } : null;
}

// Returns a context only when the requested selector belongs to a persisted
// active assignment or a persisted allowed client for this worker.
export function helmetContextForWorkerScope(worker = {}, state = {}, requestedContext = {}) {
  const requested = helmetContextFields(requestedContext);
  if (!requested) return null;
  const assignments = helmetActiveAssignments(worker, state);
  const knownClientIds = new Set(helmetClientIds(worker, state));
  const projects = helmetProjects(state);

  if (requested.mantId) {
    const project = projects.find(row => String(row?.id || '') === requested.mantId);
    const minaId = text(project?.minaId);
    if (!project || !minaId || (requested.minaId && requested.minaId !== minaId)) return null;
    const assigned = assignments.some(row => String(row?.mantId || '') === requested.mantId);
    if (!assigned && !knownClientIds.has(minaId)) return null;
    return { mantId: requested.mantId, minaId };
  }

  return knownClientIds.has(requested.minaId)
    ? { mantId: '', minaId: requested.minaId }
    : null;
}

export function helmetContextFromWorker(worker = {}, state = {}) {
  const epp = worker?.epp || {};
  const helmet = normalizeHelmetRequirement(epp);
  const assignments = helmetActiveAssignments(worker, state);
  const rawContext = helmetContextFields(helmet?.resolvedContext)
    || helmetContextFields(epp?.helmetContext);
  const explicit = helmetContextForWorkerScope(worker, state, rawContext || {});
  const invalidContext = Boolean(rawContext && !explicit);

  // A verified explicit OS selection resolves an otherwise ambiguous set of
  // active orders. A client-only selection never masks multiple active OS.
  if (explicit?.mantId) {
    return { ...explicit, multipleActiveOrders: false, multipleActiveClients: false, invalidContext };
  }
  if (assignments.length > 1) {
    return { mantId: '', minaId: '', multipleActiveOrders: true, multipleActiveClients: false, invalidContext };
  }
  if (assignments.length === 1) {
    const project = helmetProjects(state).find(row => String(row?.id || '') === String(assignments[0]?.mantId || ''));
    return {
      mantId: text(assignments[0]?.mantId),
      minaId: text(project?.minaId),
      multipleActiveOrders: false,
      multipleActiveClients: false,
      invalidContext,
    };
  }
  if (explicit?.minaId) {
    return { ...explicit, multipleActiveOrders: false, multipleActiveClients: false, invalidContext };
  }
  const clientIds = helmetClientIds(worker, state);
  if (clientIds.length > 1) {
    return { mantId: '', minaId: '', multipleActiveOrders: false, multipleActiveClients: true, invalidContext };
  }
  return {
    mantId: '',
    minaId: clientIds[0] || '',
    multipleActiveOrders: false,
    multipleActiveClients: false,
    invalidContext,
  };
}

export function materializeHelmetState(state = {}) {
  return {
    ...state,
    helmetColors: normalizeHelmetColors(state.helmetColors),
    helmetPolicies: normalizeHelmetPolicies(state.helmetPolicies),
  };
}

export function stampHelmetConfiguration(nextState = {}, previousState = {}, { actorId = '', now = new Date().toISOString() } = {}) {
  const previousColors = new Map(normalizeHelmetColors(previousState.helmetColors).map(color => [color.code, color]));
  const previousPolicies = new Map(normalizeHelmetPolicies(previousState.helmetPolicies).map(policy => [policy.id, policy]));
  const helmetColors = normalizeHelmetColors(nextState.helmetColors).map(color => {
    const before = previousColors.get(color.code);
    const changed = !before || JSON.stringify({ ...before, updatedAt: undefined, updatedBy: undefined }) !== JSON.stringify({ ...color, updatedAt: undefined, updatedBy: undefined });
    return {
      ...color,
      createdAt: before?.createdAt || color.createdAt || now,
      createdBy: before?.createdBy || color.createdBy || actorId || undefined,
      updatedAt: changed ? now : before?.updatedAt || color.updatedAt || now,
      updatedBy: changed ? actorId || undefined : before?.updatedBy || color.updatedBy || undefined,
    };
  });
  const helmetPolicies = normalizeHelmetPolicies(nextState.helmetPolicies).map(policy => {
    const before = previousPolicies.get(policy.id);
    const changed = !before || JSON.stringify({ ...before, updatedAt: undefined, updatedBy: undefined }) !== JSON.stringify({ ...policy, updatedAt: undefined, updatedBy: undefined });
    return {
      ...policy,
      createdAt: before?.createdAt || policy.createdAt || now,
      createdBy: before?.createdBy || policy.createdBy || actorId || undefined,
      updatedAt: changed ? now : before?.updatedAt || policy.updatedAt || now,
      updatedBy: changed ? actorId || undefined : before?.updatedBy || policy.updatedBy || undefined,
    };
  });
  return { ...nextState, helmetColors, helmetPolicies };
}
