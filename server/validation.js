import { z } from 'zod';
import { normalizeRut } from './security.js';

export const loginSchema = z.object({ rut: z.string().min(8).max(20), email: z.string().email().max(254), password: z.string().min(1).max(128) });
export const registerSchema = z.object({
  companyName: z.string().trim().min(3).max(160), rut: z.string().min(8).max(20),
  adminName: z.string().trim().min(3).max(160), email: z.string().email().max(254),
  phone: z.string().max(40).optional().default(''), password: z.string().min(12).max(128), inviteCode: z.string().max(200)
});
export const userSchema = z.object({ fullName: z.string().trim().min(3).max(160), email: z.string().email().max(254), role: z.enum(['client_admin','rrhh','prevencion','acreditacion','consulta']), password: z.string().min(12).max(128).optional(), permissions:z.object({modules:z.record(z.string(),z.boolean()).default({})}).optional() });

const blockedKeys = new Set(['__proto__', 'prototype', 'constructor']);
export function sanitizeJson(value, key = '') {
  if (Array.isArray(value)) return value.map(v => sanitizeJson(v, key));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (!blockedKeys.has(k)) out[k] = sanitizeJson(v, k);
    return out;
  }
  if (typeof value !== 'string') return value;
  if (['fileData'].includes(key)) return null;
  if (['cloudUrl','inviteUrl'].includes(key)) {
    try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : ''; } catch { return ''; }
  }
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').replace(/[<>]/g, '').replace(/"/g, '”').replace(/'/g, '’').replace(/`/g, '´').slice(0, 20_000);
}

export function summarizeChanges(before, after, path = '', output = []) {
  if (output.length >= 200) return output;
  if (Object.is(before, after)) return output;
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') {
    output.push({ path: path || '/', before, after }); return output;
  }
  if (Array.isArray(before) || Array.isArray(after)) {
    const a=Array.isArray(before)?before:[],b=Array.isArray(after)?after:[],identifiable=[...a,...b].every(x=>x&&typeof x==='object'&&x.id);
    if(identifiable){const am=new Map(a.map(x=>[String(x.id),x])),bm=new Map(b.map(x=>[String(x.id),x]));for(const id of new Set([...am.keys(),...bm.keys()])){if(output.length>=200)break;if(!am.has(id))output.push({path:`${path}/${id}`,action:'created',after:bm.get(id)});else if(!bm.has(id))output.push({path:`${path}/${id}`,action:'deleted',before:am.get(id)});else summarizeChanges(am.get(id),bm.get(id),`${path}/${id}`,output);}}
    else if (JSON.stringify(before) !== JSON.stringify(after)) output.push({ path: path || '/', beforeCount: a.length, afterCount: b.length });
    return output;
  }
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) summarizeChanges(before[key], after[key], `${path}/${key}`, output);
  return output;
}

const roleScopes={
  rrhh:new Set(['trabajadores','asignaciones','firmas','callouts','turnos','credenciales','hotelAsig','waGroups','contractTemplates','eppDeliveries','eppMeasurements']),
  prevencion:new Set(['trabajadores','incidentes','protocolosSalud','permisosTrabajo','vehiculos','turnos','eppCatalog','eppDeliveries','eppMeasurements']),
  acreditacion:new Set(['trabajadores','empresaDocs','acreditacionesMandante','permisosTrabajo','credenciales','firmas','eppDeliveries','eppMeasurements'])
};
export function enforceStateScope(role,before,after){const allowed=roleScopes[role];if(!allowed)return;const changed=new Set([...Object.keys(before||{}),...Object.keys(after||{})].filter(k=>JSON.stringify(before?.[k])!==JSON.stringify(after?.[k])));const forbidden=[...changed].filter(k=>!allowed.has(k));if(forbidden.length)throw Object.assign(new Error(`Role ${role} cannot modify: ${forbidden.join(', ')}`),{status:403,code:'FIELD_PERMISSION_DENIED'});}

function duplicate(values) { const seen = new Set(); return values.find(v => v && (seen.has(v) || !seen.add(v))); }
const normalizedText = value => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
function assertUnique(values, message, code = 'DUPLICATE_DATA') {
  const value = duplicate(values);
  if (value) throw Object.assign(new Error(`${message}: ${value}`), { status: 409, code });
}
export function validateTenantState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw Object.assign(new Error('State must be an object'), { status: 400 });
  const state = sanitizeJson(input);
  const workers = Array.isArray(state.trabajadores) ? state.trabajadores : [];
  const projects = Array.isArray(state.mantenciones) ? state.mantenciones : [];
  const mines = Array.isArray(state.minas) ? state.minas : [];
  const contracts = Array.isArray(state.contratos) ? state.contratos : [];
  assertUnique(workers.map(w => normalizeRut(w.rut)), 'Duplicate worker RUT', 'DUPLICATE_WORKER_RUT');
  assertUnique(contracts.map(c => normalizedText(c.numero)), 'Duplicate contract number', 'DUPLICATE_CONTRACT_NUMBER');
  assertUnique(mines.map(m => `${normalizedText(m.nombre)}|${normalizedText(m.mandante)}`), 'Duplicate mine', 'DUPLICATE_MINE');
  assertUnique(projects.map(p => `${p.minaId}|${normalizedText(p.nombre)}|${p.inicio || ''}`), 'Duplicate project', 'DUPLICATE_PROJECT');
  assertUnique((state.hoteles || []).map(h => `${normalizedText(h.nombre)}|${normalizedText(h.ciudad)}`), 'Duplicate hotel', 'DUPLICATE_HOTEL');
  assertUnique((state.subcontratos || []).map(s => normalizeRut(s.rut)), 'Duplicate subcontractor RUT', 'DUPLICATE_SUBCONTRACTOR_RUT');
  assertUnique((state.vehiculos || []).flatMap(v => [v.patente ? `p:${normalizedText(v.patente).replace(/[^a-z0-9]/g, '')}` : '', v.serie ? `s:${normalizedText(v.serie)}` : '']), 'Duplicate vehicle plate or serial', 'DUPLICATE_VEHICLE');
  const allCollections = [
    workers, projects, mines, contracts, state.hoteles, state.asignaciones, state.hotelAsig,
    state.turnos, state.credenciales, state.incidentes, state.protocolosSalud,
    state.vehiculos, state.subcontratos, state.firmas, state.callouts, state.waGroups,
    state.permisosTrabajo, state.eppDeliveries
  ].filter(Array.isArray);
  for (const collection of allCollections) {
    const duplicateId = duplicate(collection.map(x => String(x.id || '')));
    if (duplicateId) throw Object.assign(new Error(`Duplicate entity id: ${duplicateId}`), { status: 409, code: 'DUPLICATE_ID' });
  }
  const workerIds = new Set(workers.map(x => String(x.id)));
  const projectIds = new Set(projects.map(x => String(x.id)));
  const mineIds = new Set(mines.map(x => String(x.id)));
  const contractIds = new Set(contracts.map(x => String(x.id)));
  const hotelIds = new Set((state.hoteles || []).map(x => String(x.id)));
  for (const c of contracts) {
    if (c.minaId && !mineIds.has(String(c.minaId))) throw Object.assign(new Error(`Contract ${c.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
    if (c.inicio && c.termino && c.inicio > c.termino) throw Object.assign(new Error(`Contract ${c.id} has invalid dates`), { status: 409, code: 'INVALID_DATES' });
  }
  for (const p of projects) {
    if (p.minaId && !mineIds.has(String(p.minaId))) throw Object.assign(new Error(`Project ${p.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
    if (p.contratoId && !contractIds.has(String(p.contratoId))) throw Object.assign(new Error(`Project ${p.id} references an unknown contract`), { status: 409, code: 'INVALID_REFERENCE' });
    const relatedContract = contracts.find(c => String(c.id) === String(p.contratoId));
    if (relatedContract?.minaId && p.minaId && String(relatedContract.minaId) !== String(p.minaId)) {
      throw Object.assign(new Error(`Project ${p.id} and its contract belong to different mines`), { status: 409, code: 'INVALID_REFERENCE' });
    }
    if (p.inicio && p.termino && p.inicio > p.termino) throw Object.assign(new Error(`Project ${p.id} has invalid dates`), { status: 409, code: 'INVALID_DATES' });
  }
  for (const worker of workers) {
    if ((worker.mineras || []).some(id => !mineIds.has(String(id)))) throw Object.assign(new Error(`Worker ${worker.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const hotel of Array.isArray(state.hoteles) ? state.hoteles : []) {
    if ((hotel.minaIds || []).some(id => !mineIds.has(String(id)))) throw Object.assign(new Error(`Hotel ${hotel.id} references an unknown mine`), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const a of Array.isArray(state.asignaciones) ? state.asignaciones : []) {
    if (!workerIds.has(String(a.trabId)) || !projectIds.has(String(a.mantId))) throw Object.assign(new Error('Assignment references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  assertUnique((state.asignaciones || []).map(a => `${a.trabId}|${a.mantId}`), 'Duplicate worker assignment', 'DUPLICATE_ASSIGNMENT');
  for (const row of Array.isArray(state.hotelAsig) ? state.hotelAsig : []) {
    if (!workerIds.has(String(row.trabId)) || !projectIds.has(String(row.mantId)) || !hotelIds.has(String(row.hotelId))) throw Object.assign(new Error('Hotel assignment references an unknown worker, project or hotel'), { status: 409, code: 'INVALID_REFERENCE' });
    if (row.checkin && row.checkout && row.checkin > row.checkout) throw Object.assign(new Error('Hotel assignment has invalid dates'), { status: 409, code: 'INVALID_DATES' });
  }
  assertUnique((state.hotelAsig || []).map(x => `${x.trabId}|${x.mantId}|${x.hotelId}|${x.checkin || ''}`), 'Duplicate hotel assignment', 'DUPLICATE_HOTEL_ASSIGNMENT');
  for (const row of Array.isArray(state.turnos) ? state.turnos : []) {
    if (!workerIds.has(String(row.trabId)) || !projectIds.has(String(row.mantId))) throw Object.assign(new Error('Shift references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  assertUnique((state.turnos || []).map(x => `${x.trabId}|${x.mantId}|${x.fecha}|${x.turno}`), 'Duplicate shift', 'DUPLICATE_SHIFT');
  for (const row of Array.isArray(state.credenciales) ? state.credenciales : []) {
    if (!workerIds.has(String(row.trabId)) || !mineIds.has(String(row.minaId))) throw Object.assign(new Error('Credential references an unknown worker or mine'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  assertUnique((state.credenciales || []).map(x => x.numero ? `${x.minaId}|${normalizedText(x.numero)}` : ''), 'Duplicate credential number', 'DUPLICATE_CREDENTIAL');
  for (const row of Array.isArray(state.protocolosSalud) ? state.protocolosSalud : []) {
    if (!workerIds.has(String(row.trabId)) || !mineIds.has(String(row.minaId))) throw Object.assign(new Error('Health protocol references an unknown worker or mine'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const row of Array.isArray(state.incidentes) ? state.incidentes : []) if (!projectIds.has(String(row.mantId))) throw Object.assign(new Error('Incident references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.subcontratos) ? state.subcontratos : []) if (row.contratoId && !contractIds.has(String(row.contratoId))) throw Object.assign(new Error('Subcontractor references an unknown contract'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.vehiculos) ? state.vehiculos : []) {
    if (row.operadorId && !workerIds.has(String(row.operadorId))) throw Object.assign(new Error('Vehicle references an unknown operator'), { status: 409, code: 'INVALID_REFERENCE' });
    if ((row.minaIds || []).some(id => !mineIds.has(String(id)))) throw Object.assign(new Error('Vehicle references an unknown mine'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const row of Array.isArray(state.firmas) ? state.firmas : []) if (!workerIds.has(String(row.trabId)) || !projectIds.has(String(row.mantId))) throw Object.assign(new Error('Signature references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.callouts) ? state.callouts : []) if (!projectIds.has(String(row.mantId))) throw Object.assign(new Error('Callout references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const row of Array.isArray(state.waGroups) ? state.waGroups : []) {
    if (row.mantId && !projectIds.has(String(row.mantId))) throw Object.assign(new Error('WhatsApp group references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
    if (row.minaId && !mineIds.has(String(row.minaId))) throw Object.assign(new Error('WhatsApp group references an unknown mine'), { status: 409, code: 'INVALID_REFERENCE' });
    if ((row.trabIds || []).some(id => !workerIds.has(String(id)))) throw Object.assign(new Error('WhatsApp group references an unknown worker'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  for (const row of Array.isArray(state.permisosTrabajo) ? state.permisosTrabajo : []) if (!projectIds.has(String(row.mantId))) throw Object.assign(new Error('Work permit references an unknown project'), { status: 409, code: 'INVALID_REFERENCE' });
  for (const delivery of Array.isArray(state.eppDeliveries) ? state.eppDeliveries : []) {
    if (!workerIds.has(String(delivery.workerId)) || (delivery.mantId && !projectIds.has(String(delivery.mantId)))) {
      throw Object.assign(new Error('EPP delivery references an unknown worker or project'), { status: 409, code: 'INVALID_REFERENCE' });
    }
    if (!delivery.itemId || !delivery.itemName || Number(delivery.qty) < 1 || !delivery.deliveredAt) {
      throw Object.assign(new Error('EPP delivery is incomplete'), { status: 409, code: 'INVALID_EPP_DELIVERY' });
    }
  }
  assertUnique((state.eppDeliveries || []).map(x => `${x.workerId}|${x.itemId}|${x.deliveredAt}|${normalizedText(x.lotSerial)}`), 'Duplicate EPP delivery', 'DUPLICATE_EPP_DELIVERY');
  for (const workerId of Object.keys(state.eppMeasurements || {})) {
    if (!workerIds.has(String(workerId))) throw Object.assign(new Error('EPP measurements reference an unknown worker'), { status: 409, code: 'INVALID_REFERENCE' });
  }
  return state;
}
