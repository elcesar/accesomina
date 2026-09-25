const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'IDENTITY_CARD', label: 'Cédula de identidad' },
  { value: 'DRIVER_LICENSE', label: 'Licencia de conducir' },
  { value: 'CV', label: 'Currículum vitae' },
  { value: 'EMPLOYMENT_CONTRACT', label: 'Contrato de trabajo' },
  { value: 'SERVICE_ANNEX', label: 'Anexo asociado al servicio' },
  { value: 'AFP_CERTIFICATE', label: 'Certificado AFP' },
  { value: 'AFC_CERTIFICATE', label: 'Certificado AFC' },
  { value: 'HEALTH_INSURANCE_CERTIFICATE', label: 'Certificado Fonasa o Isapre' },
  { value: 'MEDICAL_EXAM', label: 'Examen ocupacional' },
  { value: 'ODI_ACKNOWLEDGMENT', label: 'ODI / Derecho a Saber' },
  { value: 'INTERNAL_REGULATION_ACKNOWLEDGMENT', label: 'Reglamento Interno' },
  { value: 'CERTIFICATION', label: 'Certificación técnica' },
  { value: 'TRAINING', label: 'Curso o capacitación' },
  { value: 'OTHER', label: 'Otro documento' },
]

const RULES = {
  IDENTITY_CARD: { expiration: 'required', twoSided: true },
  DRIVER_LICENSE: { expiration: 'required', twoSided: true },
  CV: { expiration: 'never', twoSided: false },
  EMPLOYMENT_CONTRACT: { expiration: 'optional', twoSided: false },
  SERVICE_ANNEX: { expiration: 'optional', twoSided: false },
  AFP_CERTIFICATE: { expiration: 'optional', twoSided: false },
  AFC_CERTIFICATE: { expiration: 'optional', twoSided: false },
  HEALTH_INSURANCE_CERTIFICATE: { expiration: 'optional', twoSided: false },
  MEDICAL_EXAM: { expiration: 'optional', twoSided: false },
  ODI_ACKNOWLEDGMENT: { expiration: 'optional', twoSided: false },
  INTERNAL_REGULATION_ACKNOWLEDGMENT: { expiration: 'optional', twoSided: false },
  CERTIFICATION: { expiration: 'optional', twoSided: false },
  TRAINING: { expiration: 'optional', twoSided: false },
  OTHER: { expiration: 'optional', twoSided: false },
}

export function resolveDocumentType(documentType, type, name) {
  if (RULES[documentType]) return documentType
  if (RULES[type]) return type
  const value = normalized(name)
  if (type === 'cv' || /\b(cv|curriculum)\b/.test(value)) return 'CV'
  if (value.includes('cedula de identidad') || value.includes('carnet de identidad') || value === 'cedula' || value === 'ci') return 'IDENTITY_CARD'
  if (value.includes('licencia de conducir') || value.includes('licencia clase')) return 'DRIVER_LICENSE'
  if (value.includes('certificado afp')) return 'AFP_CERTIFICATE'
  if (value.includes('certificado afc')) return 'AFC_CERTIFICATE'
  if (value.includes('fonasa') || value.includes('isapre')) return 'HEALTH_INSURANCE_CERTIFICATE'
  if (value.includes('anexo') && value.includes('servicio')) return 'SERVICE_ANNEX'
  if (value.includes('odi') || value.includes('derecho a saber')) return 'ODI_ACKNOWLEDGMENT'
  if (value.includes('reglamento interno')) return 'INTERNAL_REGULATION_ACKNOWLEDGMENT'
  return type === 'examen' ? 'MEDICAL_EXAM' : type === 'certificacion' ? 'CERTIFICATION' : type === 'curso' ? 'TRAINING' : type === 'contrato' ? 'EMPLOYMENT_CONTRACT' : 'OTHER'
}

export function documentRule(typeOrCode, name, documentType) {
  const code = resolveDocumentType(documentType, typeOrCode, name)
  return { key: code.toLowerCase().replaceAll('_', '-'), code, ...RULES[code] }
}

export function hasRequiredEvidence(item) {
  const rule = documentRule(item?.type, item?.name, item?.documentType)
  if (!rule.twoSided) return true
  const files = Array.isArray(item?.files) ? item.files : []
  const sides = new Set(files.filter(file => file?.fileId && file?.side).map(file => file.side))
  return sides.has('front') && sides.has('back') && Boolean(item?.vence)
}

export function documentEvidenceMessage(item) {
  const rule = documentRule(item?.type, item?.name, item?.documentType)
  if (!rule.twoSided || hasRequiredEvidence(item)) return ''
  const files = Array.isArray(item?.files) ? item.files : []
  const sides = new Set(files.filter(file => file?.fileId && file?.side).map(file => file.side))
  const missing = []
  if (!sides.has('front')) missing.push('anverso')
  if (!sides.has('back')) missing.push('reverso')
  if (!item?.vence) missing.push('fecha de vencimiento')
  return `Falta ${missing.join(', ')}`
}
