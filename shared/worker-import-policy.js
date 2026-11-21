import { CHILE_REGIONES_COMUNAS } from './chile-geography.js';
import { AFP_CHILE, PREVISION_SALUD_CHILE } from './chile-social-security.js';
import { WORKER_SPECIALTIES } from './worker-catalogs.js';

const text = value => String(value ?? '').trim();
export const normalizeWorkerImportText = value => text(value)
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLocaleLowerCase('es-CL')
  .replace(/\s+/g, ' ');

function catalogIndex(items, valueOf = item => item, labelsOf = item => [item]) {
  const index = new Map();
  for (const item of items) {
    const value = valueOf(item);
    for (const label of labelsOf(item)) {
      const key = normalizeWorkerImportText(label);
      if (key) index.set(key, value);
    }
  }
  return index;
}

function canonicalFrom(index, value) {
  const raw = text(value);
  if (!raw) return '';
  return index.get(normalizeWorkerImportText(raw)) || null;
}

/**
 * Values accepted by the high-individual flow, plus the historical aliases that
 * the CSV importer already normalized. The stored employment category and the
 * operational availability are deliberately separate.
 */
export const WORKER_IMPORT_TYPES = [
  { value: 'permanente', label: 'Trabajador fijo', aliases: ['permanente', 'fijo', 'planta'] },
  { value: 'esporadico', label: 'Trabajador por proyecto', aliases: ['esporadico', 'esporádico', 'temporal', 'proyecto', 'por proyecto', 'spot'] },
  { value: 'disponible', label: 'Trabajador disponible', aliases: ['disponible'] },
];

const typeIndex = catalogIndex(WORKER_IMPORT_TYPES, option => option, option => option.aliases);

export function workerImportType(value) {
  const raw = text(value);
  if (!raw) return null;
  const option = typeIndex.get(normalizeWorkerImportText(raw));
  if (!option) return null;
  return {
    value: option.value,
    // The individual flow stores "disponible" as an employment profile while
    // retaining the historical "esporadico" category for compatibility.
    tipo: option.value === 'disponible' ? 'esporadico' : option.value,
    employmentProfile: option.value,
    disponibilidad: 'disponible',
  };
}

const specialtyIndex = catalogIndex(
  WORKER_SPECIALTIES,
  option => option.value,
  option => [option.value, option.label],
);
const afpIndex = catalogIndex(AFP_CHILE);
const healthIndex = catalogIndex(PREVISION_SALUD_CHILE);
const regionIndex = catalogIndex(CHILE_REGIONES_COMUNAS, option => option.region, option => [option.region]);
const communeIndexes = new Map(CHILE_REGIONES_COMUNAS.map(option => [
  option.region,
  catalogIndex(option.comunas),
]));

export const canonicalWorkerSpecialty = value => canonicalFrom(specialtyIndex, value);
export const canonicalWorkerAfp = value => canonicalFrom(afpIndex, value);
export const canonicalWorkerHealth = value => canonicalFrom(healthIndex, value);
export const canonicalWorkerRegion = value => canonicalFrom(regionIndex, value);

export function canonicalWorkerCommune(region, value) {
  const raw = text(value);
  if (!raw) return '';
  const canonicalRegion = canonicalWorkerRegion(region);
  if (!canonicalRegion) return null;
  return canonicalFrom(communeIndexes.get(canonicalRegion), raw);
}

export function workerImportValue(row, primary, aliases = []) {
  for (const column of [primary, ...aliases]) {
    if (Object.hasOwn(row || {}, column)) {
      const value = row?.[column];
      if (text(value)) return { column, value };
    }
  }
  return { column: primary, value: '' };
}

export const WORKER_IMPORT_GUIDE = {
  types: WORKER_IMPORT_TYPES,
  specialties: WORKER_SPECIALTIES,
  afps: AFP_CHILE,
  healthPlans: PREVISION_SALUD_CHILE,
  regions: CHILE_REGIONES_COMUNAS.map(item => item.region),
};
