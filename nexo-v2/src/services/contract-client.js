const rows = value => Array.isArray(value) ? value : []

// Commercial records historically used three keys for the client relationship.
// Keep that compatibility in one place so selectors and persistence agree.
export function contractClientId(contract) {
  return contract?.minaId ?? contract?.clientId ?? contract?.clienteId ?? ''
}

export function contractBelongsToClient(contract, clientId) {
  const relatedClientId = contractClientId(contract)
  return Boolean(contract && relatedClientId && clientId && String(relatedClientId) === String(clientId))
}

export function contractsForClient(contracts, clientId) {
  const list = rows(contracts)
  return clientId ? list.filter(contract => contractBelongsToClient(contract, clientId)) : list
}

export function retainCompatibleContract(contractId, contracts, clientId) {
  if (!contractId) return ''
  const contract = rows(contracts).find(item => String(item?.id) === String(contractId))
  return contractBelongsToClient(contract, clientId) ? contractId : ''
}
