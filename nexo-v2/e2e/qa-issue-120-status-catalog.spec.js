import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { COMPLIANCE_STATES, COMPLIANCE_FILTERS, complianceStatus, expiryComplianceStatus } from '../src/services/semantic-status.js'

test('four canonical compliance states and no module-specific duplicates', () => {
  expect(COMPLIANCE_FILTERS.map(x => x.label)).toEqual([
    'Vigente', 'Por vencer', 'No habilitado', 'Sin información',
  ])
  expect(Object.keys(COMPLIANCE_STATES)).toEqual(['ok','warn','error','none'])
})

test('workflow states never attest compliance automatically', () => {
  for (const flow of ['seguimiento','pendiente','cerrado','finalizado','observado','historico','en_revision']) {
    expect(complianceStatus({ outcome: flow }).key, flow).toBe('none')
  }
})

test('explicit status and expiry use conservative precedence', () => {
  const today = new Date('2026-11-23T15:00:00Z')
  expect(complianceStatus({ outcome:'no_apto', expiresOn:'2027-01-01',today }).key).toBe('error')
  expect(complianceStatus({ outcome:'vigente', expiresOn:'2026-11-22',today }).key).toBe('error')
  expect(complianceStatus({ outcome:'apto', expiresOn:'2026-12-01',today }).key).toBe('warn')
  expect(complianceStatus({ outcome:'apto', expiresOn:'2027-03-01',today }).key).toBe('ok')
  expect(complianceStatus({ outcome:'apto', expiresOn:'2027-03-01',hasEvidence:false,today }).key).toBe('none')
  expect(complianceStatus({ outcome:'apto_con_restriccion',expiresOn:'2027-03-01',today }).key).toBe('none')
  expect(complianceStatus({ outcome:'', expiresOn:'2027-03-01',today }).key).toBe('none')
})

test('replacement dates without evidence are not assumed compliant', () => {
  expect(expiryComplianceStatus('')).toBe(COMPLIANCE_STATES.none)
  expect(expiryComplianceStatus('2000-01-01')).toBe(COMPLIANCE_STATES.error)
  expect(expiryComplianceStatus('2099-01-01')).toBe(COMPLIANCE_STATES.ok)
})

const source = file => readFileSync(resolve(process.cwd(),'src/pages',file),'utf8')
test('health process and normative result are separate in form, table and filters', () => {
  const content=source('SaludOcupacionalPage.jsx')
  expect(content).toContain('resultadoCumplimiento: form.resultadoCumplimiento')
  expect(content).toContain('Etapa del proceso')
  expect(content).toContain('Estado de cumplimiento')
  expect(content).toContain('COMPLIANCE_FILTERS.map')
  expect(content).not.toContain('value="history">Histórico</option>')
  expect(content).not.toContain('value="regularize">Requiere regularización</option>')
})

test('contractor, exams and EPP use the same canonical status service', () => {
  expect(source('HabilitacionesCumplimientoPage.jsx')).toContain('COMPLIANCE_FILTERS.map')
  expect(source('HabilitacionesCumplimientoPage.jsx')).toContain('complianceStatus({outcome:item.estado')
  expect(source('ExamenesPage.jsx')).toContain('expiryComplianceStatus(date)')
  expect(source('ProteccionEppPage.jsx')).toContain('expiryComplianceStatus(date)')
})
