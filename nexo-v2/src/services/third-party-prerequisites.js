const rows = value => Array.isArray(value) ? value : []

export function thirdPartyPrerequisites({ loading = false, error = false, companies = [], workers = [] } = {}) {
  if (loading) {
    return {
      state: 'loading',
      conventionBlocked: true,
      associationBlocked: true,
      showConventionNotice: false,
      showAssociationNotice: false,
      needsCompanies: false,
      needsWorkers: false,
      associationMessage: '',
    }
  }

  if (error) {
    return {
      state: 'error',
      conventionBlocked: true,
      associationBlocked: true,
      showConventionNotice: false,
      showAssociationNotice: false,
      needsCompanies: false,
      needsWorkers: false,
      associationMessage: '',
    }
  }

  const needsCompanies = rows(companies).length === 0
  const needsWorkers = rows(workers).length === 0
  const associationMessage = needsCompanies && needsWorkers
    ? 'Para asociar una persona, primero registra una empresa colaboradora en Terceros y crea una Persona desde + Persona en el encabezado.'
    : needsCompanies
      ? 'Para asociar una persona, primero registra una empresa colaboradora en Terceros.'
      : needsWorkers
        ? 'Primero registra una Persona desde + Persona en el encabezado.'
        : ''

  return {
    state: 'ready',
    conventionBlocked: needsCompanies,
    associationBlocked: needsCompanies || needsWorkers,
    showConventionNotice: needsCompanies,
    showAssociationNotice: needsCompanies || needsWorkers,
    needsCompanies,
    needsWorkers,
    associationMessage,
  }
}


export function thirdPartyPrerequisiteActions({
  needsCompanies = false,
  needsWorkers = false,
  canCreateCompanies = false,
  canCreateWorkers = false,
} = {}) {
  const actions = []
  if (needsCompanies && canCreateCompanies) {
    actions.push({ id: 'companies', label: 'Ir a Terceros', path: '/app/subcontratos' })
  }
  if (needsWorkers && canCreateWorkers) {
    actions.push({ id: 'workers', label: 'Ir a Capital Humano', path: '/app/trabajadores' })
  }
  return actions
}
