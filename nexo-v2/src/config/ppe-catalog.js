import {
  DEFAULT_HELMET_COLORS,
  HELMET_APPLICABILITY,
  helmetContextFromWorker,
  normalizeHelmetRequirement,
  resolveHelmetPolicy,
} from '../../../shared/helmet-policy.js'

export { DEFAULT_HELMET_COLORS, HELMET_APPLICABILITY }

export const HELMET_SIZE_OPTIONS = ['Talla única', 'S', 'M', 'L', 'XL', 'Ajustable']

export const PPE_SIZE_FIELDS = [
  { key: 'casco', draftKey: 'eppCasco', label: 'Casco', sizes: HELMET_SIZE_OPTIONS, helmet: true },
  { key: 'camisa', draftKey: 'eppCamisa', label: 'Camisa de trabajo', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { key: 'pantalon', draftKey: 'eppPantalon', label: 'Pantalón de trabajo', sizes: ['36', '38', '40', '42', '44', '46', '48', '50', '52'] },
  { key: 'calzado', draftKey: 'eppCalzado', label: 'Calzado de seguridad', sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] },
  { key: 'guante', draftKey: 'eppGuante', label: 'Guante', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { key: 'arnes', draftKey: 'eppArnes', label: 'Arnés', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
]

/**
 * Old records did not decide whether a helmet applies. Keep their readable
 * size as a historical value; never infer a requirement from "Talla única".
 */
export function normalizeWorkerEpp(epp = {}) {
  const helmet = normalizeHelmetRequirement(epp)
  return {
    ...(epp || {}),
    helmet,
    casco: epp.casco ?? helmet.size ?? '',
    camisa: epp.camisa ?? epp.polera ?? epp.ropa ?? '',
    pantalon: epp.pantalon ?? '',
    calzado: epp.calzado ?? epp.zapato ?? '',
    guante: epp.guante ?? '',
    arnes: epp.arnes ?? '',
    fitTest: epp.fitTest === true || epp.fitTest === 'aprobado' || epp.fitTest === 'fit test aprobado' || (epp.fitTest == null && /^(?:fit\s*test\s*)?aprobado$/i.test(String(epp.respirador ?? '').trim())),
  }
}

export function updateWorkerEpp(epp, key, value) {
  const normalized = normalizeWorkerEpp(epp)
  if (key === 'casco') {
    return {
      ...(epp || {}),
      ...normalized,
      casco: value,
      helmet: { ...normalized.helmet, size: value },
    }
  }
  return { ...(epp || {}), ...normalized, [key]: value }
}

export function updateWorkerHelmet(epp, patch) {
  const normalized = normalizeWorkerEpp(epp)
  const helmet = { ...normalized.helmet, ...(patch || {}) }
  const casco = helmet.applicability === HELMET_APPLICABILITY.REQUIRED ? helmet.size || '' : ''
  return { ...(epp || {}), ...normalized, casco, helmet }
}

export function helmetOptions(state, worker) {
  const context = helmetContextFromWorker(worker, state)
  const policy = resolveHelmetPolicy(state, context)
  const colors = policy.colors.filter(color => policy.allowedColorCodes.includes(color.code))
  return { context, policy, colors }
}
