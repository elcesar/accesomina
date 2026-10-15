export const PPE_SIZE_FIELDS = [
  { key: 'casco', draftKey: 'eppCasco', label: 'Casco', sizes: ['Talla única'], fixed: true },
  { key: 'camisa', draftKey: 'eppCamisa', label: 'Camisa de trabajo', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { key: 'pantalon', draftKey: 'eppPantalon', label: 'Pantalón de trabajo', sizes: ['36', '38', '40', '42', '44', '46', '48', '50', '52'] },
  { key: 'calzado', draftKey: 'eppCalzado', label: 'Calzado de seguridad', sizes: ['35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'] },
  { key: 'guante', draftKey: 'eppGuante', label: 'Guante', sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { key: 'arnes', draftKey: 'eppArnes', label: 'Arnés', sizes: ['S', 'M', 'L', 'XL', 'XXL'] },
  { key: 'respirador', draftKey: 'eppRespirador', label: 'Respirador / fit test', sizes: ['S', 'M', 'L', 'No aplica'] },
]

export function normalizeWorkerEpp(epp = {}) {
  return {
    ...(epp || {}),
    casco: epp.casco || 'Talla única',
    camisa: epp.camisa ?? epp.polera ?? epp.ropa ?? '',
    pantalon: epp.pantalon ?? '',
    calzado: epp.calzado ?? epp.zapato ?? '',
    guante: epp.guante ?? '',
    arnes: epp.arnes ?? '',
    respirador: epp.respirador ?? epp.fitTest ?? '',
  }
}

export function updateWorkerEpp(epp, key, value) {
  return { ...(epp || {}), ...normalizeWorkerEpp(epp), [key]: value }
}
