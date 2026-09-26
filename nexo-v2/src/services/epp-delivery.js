const CONDITION_ALIASES = {
  buen_estado: 'reutilizado-inspeccionado',
  usado: 'reutilizado-inspeccionado',
  observado: 'no_registrada',
}

function manualItemId(itemName, id) {
  const key = String(itemName || 'epp')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return `manual:${key || id}`
}

export function buildEppDelivery(form, { id, createdAt }) {
  const itemName = String(form.itemName || '').trim()
  const quantity = Number(form.quantity || 0)

  return {
    id,
    workerId: form.workerId,
    mantId: form.orderId || undefined,
    itemId: form.inventoryId || manualItemId(itemName, id),
    itemName,
    qty: quantity,
    inventoryId: form.inventoryId || undefined,
    warehouseId: form.warehouseId || undefined,
    orderId: form.orderId || undefined,
    size: String(form.size || '').trim(),
    brandModel: String(form.brandModel || '').trim(),
    certification: String(form.certification || '').trim(),
    lotSerial: String(form.lotSerial || '').trim(),
    condition: CONDITION_ALIASES[form.condition] || form.condition || 'no_registrada',
    deliveryStatus: 'entregado',
    deliveredBy: String(form.deliveredBy || '').trim(),
    receivedBy: String(form.receivedBy || '').trim(),
    deliveredAt: form.deliveredAt,
    replaceAt: form.replaceAt,
    notes: String(form.notes || '').trim(),
    createdAt,
  }
}
