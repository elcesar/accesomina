import assert from 'node:assert/strict'
import test from 'node:test'
import { helmetCompliance, helmetComplianceContribution } from '../../nexo-v2/src/services/helmet-compliance.js'
import { deriveOperationalAlerts } from '../../nexo-v2/src/services/operational-alerts.js'
import { workerClientIds } from '../../nexo-v2/src/services/worker-list.js'
import { helmetContextForWorkerScope, helmetContextFromWorker } from '../../shared/helmet-policy.js'

const worker = (epp = {}) => ({ id: 'w1', nombre: 'Persona QA', mineras: ['m1'], epp })
const state = {
  minas: [{ id: 'm1', nombre: 'Cliente QA' }],
  mantenciones: [{ id: 'os1', minaId: 'm1', nombre: 'OS QA' }],
  helmetColors: [{ code: 'azul', label: 'Azul', active: true }],
  helmetPolicies: [{ id: 'tenant', scope: 'tenant', active: true, requireColor: true, requireSize: true, requireModelClass: false, allowedColorCodes: ['azul'] }],
}

test('helmet compliance leaves legacy helmet size pending instead of inferring a requirement', () => {
  const result = helmetCompliance(worker({ casco: 'Talla única' }), state)
  assert.equal(result.status, 'pending')
  assert.equal(result.warning, true)
  assert.equal(result.blocksOperation, false)
})

test('helmet compliance respects no-required and complete decisions', () => {
  assert.equal(helmetCompliance(worker({ helmet: { applicability: 'not_required', reason: 'Administrativo' } }), state).status, 'not_required')
  assert.equal(helmetCompliance(worker({ casco: 'M', helmet: { applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M' } }), state).status, 'complete')
})

test('helmet KPI contribution is neutral only when the helmet is explicitly not required', () => {
  const pending = helmetCompliance(worker({ casco: 'Talla única' }), state)
  const notRequired = helmetCompliance(worker({ helmet: { applicability: 'not_required' } }), state)
  const complete = helmetCompliance(worker({ casco: 'M', helmet: { applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M' } }), state)
  assert.deepEqual(helmetComplianceContribution(pending), { required: 1, completed: 0 })
  assert.deepEqual(helmetComplianceContribution(notRequired), { required: 0, completed: 0 })
  assert.deepEqual(helmetComplianceContribution(complete), { required: 1, completed: 1 })
})

test('operational alerts expose helmet incompleteness as an advisory warning only', () => {
  const alerts = deriveOperationalAlerts({ ...state, trabajadores: [worker({ helmet: { applicability: 'required', colorCode: '', colorLabel: '', size: '' } })] })
  const alert = alerts.find(item => item.id === 'derived-person-helmet-w1')
  assert.ok(alert)
  assert.equal(alert.urgencia, 'proximo')
  assert.equal(alert.advisory, true)
  assert.equal(alert.blocksOperation, false)
})


test('shared helmet context ignores forged top-level selectors and keeps the active assignment', () => {
  const scopedState = {
    ...state,
    minas: [{ id: 'm1', nombre: 'Cliente uno' }, { id: 'm2', nombre: 'Cliente ajeno' }],
    mantenciones: [
      { id: 'os1', minaId: 'm1', nombre: 'OS uno', estado: 'activo', inicio: '2026-01-01', termino: '2099-01-01' },
      { id: 'os2', minaId: 'm2', nombre: 'OS ajena', estado: 'activo', inicio: '2026-01-01', termino: '2099-01-01' },
    ],
    asignaciones: [{ id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' }],
  }
  const persona = {
    ...worker({
      casco: 'M',
      helmet: { applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M' },
      helmetContext: {},
    }),
    // These top-level values are not an authoritative helmet selector.
    mantId: 'os2',
    minaId: 'm2',
  }

  const context = helmetContextFromWorker(persona, scopedState)
  assert.deepEqual({ mantId: context.mantId, minaId: context.minaId }, { mantId: 'os1', minaId: 'm1' })
})

test('shared scope requires an active OS assignment even when the client is linked', () => {
  const scopedState = {
    ...state,
    mantenciones: [
      { id: 'os1', minaId: 'm1', nombre: 'OS asignada' },
      { id: 'os1-alt', minaId: 'm1', nombre: 'OS no asignada' },
    ],
    asignaciones: [{ id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' }],
  }
  const persona = worker({ casco: 'M', helmet: { applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M' } })
  assert.equal(
    helmetContextForWorkerScope(persona, scopedState, { mantId: 'os1-alt', minaId: 'm1' }),
    null,
  )
  assert.equal(
    helmetCompliance(persona, scopedState, { context: { mantId: 'os1-alt', minaId: 'm1' } }).status,
    'context_required',
  )
})

test('shared display uses only server-materialized context, never raw epp context', () => {
  const scopedState = {
    ...state,
    mantenciones: [
      { id: 'os1', minaId: 'm1', nombre: 'OS uno' },
      { id: 'os1-alt', minaId: 'm1', nombre: 'OS alternativa' },
    ],
    asignaciones: [
      { id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' },
      { id: 'a2', trabId: 'w1', mantId: 'os1-alt', estado: 'confirmado' },
    ],
  }
  const raw = worker({
    casco: 'M',
    helmet: { applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M' },
    helmetContext: { mantId: 'os1-alt', minaId: 'm1' },
  })
  const rawContext = helmetContextFromWorker(raw, scopedState)
  assert.equal(rawContext.multipleActiveOrders, true)
  assert.equal(rawContext.mantId, '')

  const materialized = worker({
    casco: 'M',
    helmet: {
      applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M',
      resolvedContext: { mantId: 'os1-alt', minaId: 'm1' },
      policySnapshot: { mantId: 'os1-alt', minaId: 'm1', resolvedAt: '2026-11-18T00:00:00.000Z' },
    },
    helmetContext: { mantId: 'os1', minaId: 'm1' },
  })
  const canonical = helmetContextFromWorker(materialized, scopedState)
  assert.deepEqual({ mantId: canonical.mantId, minaId: canonical.minaId }, { mantId: 'os1-alt', minaId: 'm1' })
})

test('client-row helmet compliance does not leak an OS policy from another client', () => {
  const scopedState = {
    ...state,
    minas: [{ id: 'm1', nombre: 'Cliente uno' }, { id: 'm2', nombre: 'Cliente dos' }],
    mantenciones: [
      { id: 'os1', minaId: 'm1', nombre: 'OS uno', estado: 'activo', inicio: '2026-01-01', termino: '2099-01-01' },
    ],
    asignaciones: [{ id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' }],
    helmetColors: [
      { code: 'azul', label: 'Azul', active: true },
      { code: 'verde', label: 'Verde', active: true },
    ],
    helmetPolicies: [
      { id: 'tenant', scope: 'tenant', active: true, requireColor: true, requireSize: true, allowedColorCodes: ['azul'] },
      { id: 'os-m1', scope: 'os', mantId: 'os1', active: true, requireColor: true, requireSize: true, allowedColorCodes: ['azul'] },
      { id: 'client-m2', scope: 'cliente', minaId: 'm2', active: true, requireColor: true, requireSize: true, allowedColorCodes: ['verde'] },
    ],
  }
  const persona = {
    ...worker({ casco: 'M', helmet: { applicability: 'required', colorCode: 'verde', colorLabel: 'Verde', size: 'M' } }),
    mineras: ['m1', 'm2'],
  }

  const clientContext = helmetContextForWorkerScope(persona, scopedState, { minaId: 'm2' })
  assert.deepEqual(clientContext, { mantId: '', minaId: 'm2' })
  const status = helmetCompliance(persona, scopedState, { context: { minaId: 'm2' } })
  assert.equal(status.context.mantId, '')
  assert.equal(status.context.minaId, 'm2')
  assert.equal(status.policy.id, 'client-m2')
  assert.equal(status.status, 'complete')
})

test('client derivation includes a current operational assignment without a duplicated worker client link', () => {
  const persona = { id: 'w-operational', mineras: [] }
  const projects = [{ id: 'os-operational', minaId: 'm1', estado: 'activo', inicio: '2026-01-01', termino: '2099-01-01' }]
  const assignments = [{ id: 'a-operational', trabId: 'w-operational', mantId: 'os-operational', estado: 'confirmado' }]
  assert.deepEqual(workerClientIds(persona, assignments, projects), ['m1'])
})


test('shared status flags an out-of-scope persisted helmet selector instead of applying it', () => {
  const scopedState = {
    ...state,
    minas: [{ id: 'm1', nombre: 'Cliente uno' }, { id: 'm2', nombre: 'Cliente ajeno' }],
    mantenciones: [
      { id: 'os1', minaId: 'm1', nombre: 'OS uno', estado: 'activo', inicio: '2026-01-01', termino: '2099-01-01' },
      { id: 'os2', minaId: 'm2', nombre: 'OS ajena', estado: 'activo', inicio: '2026-01-01', termino: '2099-01-01' },
    ],
    asignaciones: [{ id: 'a1', trabId: 'w1', mantId: 'os1', estado: 'confirmado' }],
  }
  const persona = worker({
    casco: 'M',
    helmet: { applicability: 'required', colorCode: 'azul', colorLabel: 'Azul', size: 'M' },
    helmetContext: { mantId: 'os2', minaId: 'm2' },
  })
  const status = helmetCompliance(persona, scopedState)
  assert.equal(status.status, 'context_required')
  assert.equal(status.context.invalidContext, true)
})
