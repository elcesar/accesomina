const transitions = {
  borrador: new Set(['borrador', 'pendiente_firma', 'cerrado']),
  pendiente_firma: new Set(['pendiente_firma', 'observado', 'firmado']),
  observado: new Set(['observado', 'borrador', 'pendiente_firma']),
  firmado: new Set(['firmado', 'cerrado']),
  cerrado: new Set(['cerrado'])
};

export function canTransitionWorkBookEntry(from, to) {
  return Boolean(transitions[from]?.has(to));
}

export function workBookFolio(year, sequence) {
  return `LOD-${year}-${String(sequence).padStart(5, '0')}`;
}
