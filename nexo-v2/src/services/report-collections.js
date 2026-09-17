export const rows = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.values(value) : []

function stableValue(value) {
  if (Array.isArray(value)) return `[${value.map(stableValue).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableValue(value[key])}`).join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

function recordKey(record) {
  if (record && typeof record === 'object' && record.id !== undefined && record.id !== null && String(record.id).trim()) {
    return `id:${record.id}`
  }
  return `value:${stableValue(record)}`
}

// Read legacy data first, then let a canonical record with the same stable id prevail.
// It is intentionally shared by reports and operational pages while legacy state exists.
export function mergeCollections(state, ...collectionNames) {
  const merged = new Map()
  collectionNames.slice().reverse().forEach(collectionName => {
    rows(state?.[collectionName]).forEach(record => merged.set(recordKey(record), record))
  })
  return [...merged.values()]
}

export const mergeReportCollections = mergeCollections
