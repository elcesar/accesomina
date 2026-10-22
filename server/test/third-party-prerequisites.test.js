import test from 'node:test'
import assert from 'node:assert/strict'
import { thirdPartyPrerequisiteActions, thirdPartyPrerequisites } from '../../nexo-v2/src/services/third-party-prerequisites.js'

test('does not expose missing prerequisites while third-party data is loading or failed', () => {
  const loading = thirdPartyPrerequisites({ loading: true, companies: [], workers: [] })
  const failed = thirdPartyPrerequisites({ error: true, companies: [], workers: [] })

  assert.equal(loading.showConventionNotice, false)
  assert.equal(loading.showAssociationNotice, false)
  assert.equal(failed.showConventionNotice, false)
  assert.equal(failed.showAssociationNotice, false)
  assert.equal(loading.conventionBlocked, true)
  assert.equal(failed.associationBlocked, true)
})

test('explains the exact prerequisite missing for third-party association', () => {
  const noCompanies = thirdPartyPrerequisites({ companies: [], workers: [{ id: 'P-1' }] })
  const noWorkers = thirdPartyPrerequisites({ companies: [{ id: 'E-1' }], workers: [] })
  const neither = thirdPartyPrerequisites({ companies: [], workers: [] })

  assert.equal(noCompanies.associationBlocked, true)
  assert.equal(noCompanies.needsCompanies, true)
  assert.equal(noCompanies.needsWorkers, false)
  assert.match(noCompanies.associationMessage, /empresa colaboradora/)
  assert.equal(noWorkers.associationBlocked, true)
  assert.equal(noWorkers.needsCompanies, false)
  assert.equal(noWorkers.needsWorkers, true)
  assert.match(noWorkers.associationMessage, /Persona/)
  assert.equal(neither.needsCompanies, true)
  assert.equal(neither.needsWorkers, true)
  assert.match(neither.associationMessage, /empresa colaboradora/)
  assert.match(neither.associationMessage, /Persona/)
})

test('enables association and convention creation only after prerequisites exist', () => {
  const ready = thirdPartyPrerequisites({
    companies: [{ id: 'E-1' }, { id: 'E-2' }],
    workers: [{ id: 'P-1' }, { id: 'P-2' }],
  })

  assert.equal(ready.conventionBlocked, false)
  assert.equal(ready.associationBlocked, false)
  assert.equal(ready.showConventionNotice, false)
  assert.equal(ready.showAssociationNotice, false)
})


test('does not expose prerequisite actions that the user cannot execute', () => {
  assert.deepEqual(thirdPartyPrerequisiteActions({
    needsCompanies: true,
    needsWorkers: true,
    canCreateCompanies: false,
    canCreateWorkers: false,
  }), [])

  assert.deepEqual(thirdPartyPrerequisiteActions({
    needsCompanies: true,
    needsWorkers: true,
    canCreateCompanies: true,
    canCreateWorkers: true,
  }), [
    { id: 'companies', label: 'Ir a Terceros', path: '/app/subcontratos' },
    { id: 'workers', label: 'Ir a Capital Humano', path: '/app/trabajadores' },
  ])
})
