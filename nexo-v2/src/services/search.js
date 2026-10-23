// Fold accents and spacing for search, preserving the Spanish distinction n / ñ.
export function normalizeSearch(value) {
 return String(value ?? '').toLocaleLowerCase('es-CL').normalize('NFD').replace(/[\u0300-\u036f]/g,mark=>mark==='\u0303'?mark:'').normalize('NFC').trim().replace(/\s+/g,' ')
}
export function includesSearch(value, query) { return normalizeSearch(value).includes(normalizeSearch(query)) }
