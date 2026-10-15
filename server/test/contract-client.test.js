import test from 'node:test'
import assert from 'node:assert/strict'
import {
  contractBelongsToClient,
  contractClientId,
  contractsForClient,
  retainCompatibleContract,
} from '../../nexo-v2/src/services/contract-client.js'

const clientId = 'CLI-1'
const contracts = [
  { id: 'CT-MINA', minaId: clientId },
  { id: 'CT-CLIENT', clientId },
  { id: 'CT-CLIENTE', clienteId: clientId },
  { id: 'CT-OTHER', minaId: 'CLI-2' },
  { id: 'CT-UNKNOWN' },
]

test('contract client relationship accepts every historical client key', () => {
  assert.equal(contractClientId(contracts[0]), clientId)
  assert.equal(contractClientId(contracts[1]), clientId)
  assert.equal(contractClientId(contracts[2]), clientId)
  assert.equal(contractClientId(contracts[4]), '')
  assert.deepEqual(contractsForClient(contracts, clientId).map(contract => contract.id), [
    'CT-MINA',
    'CT-CLIENT',
    'CT-CLIENTE',
  ])
})

test('contract selection is retained only when it belongs to the selected client', () => {
  assert.equal(retainCompatibleContract('CT-CLIENT', contracts, clientId), 'CT-CLIENT')
  assert.equal(retainCompatibleContract('CT-CLIENTE', contracts, clientId), 'CT-CLIENTE')
  assert.equal(retainCompatibleContract('CT-CLIENT', contracts, 'CLI-2'), '')
  assert.equal(retainCompatibleContract('CT-DELETED', contracts, clientId), '')
})

test('contract validation rejects foreign, missing and unscoped contracts while allowing no contract', () => {
  assert.equal(contractBelongsToClient(contracts[0], clientId), true)
  assert.equal(contractBelongsToClient(contracts[3], clientId), false)
  assert.equal(contractBelongsToClient(contracts[4], clientId), false)
  assert.equal(contractBelongsToClient(undefined, clientId), false)
  assert.equal(retainCompatibleContract('', contracts, clientId), '')
})
