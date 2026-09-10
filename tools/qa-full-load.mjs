import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, resolve } from 'node:path';
import { validateTenantState } from '../server/validation.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const today = '2026-07-22';

const calcRut = number => {
  let sum = 0;
  let factor = 2;
  for (const digit of String(number).split('').reverse()) {
    sum += Number(digit) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const raw = 11 - (sum % 11);
  const dv = raw === 11 ? '0' : raw === 10 ? 'K' : String(raw);
  const body = String(number).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${body}-${dv}`;
};

const evidence = (name, module = 'qa') => [{
  name,
  type: name.endsWith('.png') ? 'image/png' : 'application/pdf',
  size: 220000,
  objectId: `qa-${module}-${name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`,
  uploadedAt: `${today}T12:00:00.000Z`,
  status: 'cargado'
}];

const docSet = (worker, i) => [
  { id: `${worker}-doc-ci`, type: 'documento', name: 'Cedula de identidad', emision: '2026-01-05', vence: i < 3 ? '2026-08-08' : '2028-01-05', estado: 'aprobado', fileName: `${worker}-cedula.pdf`, evidenceFiles: evidence(`${worker}-cedula.pdf`, 'worker') },
  { id: `${worker}-doc-contrato`, type: 'documento', name: 'Contrato de trabajo', emision: '2026-07-01', vence: '2027-07-01', estado: i % 9 === 0 ? 'observado' : 'aprobado', fileName: `${worker}-contrato.pdf`, evidenceFiles: evidence(`${worker}-contrato.pdf`, 'worker') },
  { id: `${worker}-doc-afp`, type: 'documento', name: 'Certificado AFP', emision: '2026-07-01', vence: i < 6 ? '2026-08-15' : '2026-12-31', estado: 'vigente', fileName: `${worker}-afp.pdf`, evidenceFiles: evidence(`${worker}-afp.pdf`, 'worker') },
  { id: `${worker}-ex-pre`, type: 'examen', name: 'Examen preocupacional', emision: '2026-06-01', vence: i < 4 ? '2026-08-03' : '2027-06-01', estado: 'vigente', fileName: `${worker}-preocupacional.pdf`, evidenceFiles: evidence(`${worker}-preocupacional.pdf`, 'worker') },
  { id: `${worker}-ex-altura`, type: 'examen', name: 'Altura fisica', emision: '2026-06-15', vence: i < 2 ? '2026-07-18' : '2027-06-15', estado: i < 2 ? 'vencido' : 'vigente', fileName: `${worker}-altura.pdf`, evidenceFiles: evidence(`${worker}-altura.pdf`, 'worker') },
  { id: `${worker}-cur-odi`, type: 'curso', name: 'ODI', emision: '2026-07-02', vence: '2027-07-02', estado: 'vigente', fileName: `${worker}-odi.pdf`, evidenceFiles: evidence(`${worker}-odi.pdf`, 'worker') },
  { id: `${worker}-cur-loto`, type: 'curso', name: 'Bloqueo LOTO', emision: '2026-07-05', vence: i < 5 ? '2026-08-12' : '2027-07-05', estado: 'vigente', fileName: `${worker}-loto.pdf`, evidenceFiles: evidence(`${worker}-loto.pdf`, 'worker') }
];

const traceKeys = new Set([
  'nombre', 'name', 'title', 'company', 'razon', 'razonSocial', 'mandante',
  'descripcion', 'description', 'detalle', 'detail', 'observacion', 'observations',
  'notes', 'accion', 'action', 'reason', 'service', 'contact', 'owner',
  'responsable', 'responsible', 'message', 'template', 'alcance', 'entregables'
]);

function applyQaTraceLabels(state) {
  let count = 1;
  const traceObject = value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return;
    const label = `QA ${count++}`;
    value.qaTraceLabel = label;
    for (const key of traceKeys) {
      if (typeof value[key] === 'string' && value[key].trim() && !/^QA\s+\d+\s+-\s+/i.test(value[key])) {
        value[key] = `${label} - ${value[key]}`;
      }
    }
  };
  traceObject(state.empresa);
  for (const value of Object.values(state)) {
    if (Array.isArray(value)) value.forEach(traceObject);
  }
  for (const worker of state.trabajadores || []) {
    (worker.workerItems || []).forEach(traceObject);
  }
  for (const opportunity of state.opportunities || []) {
    (opportunity.documents || []).forEach(traceObject);
    (opportunity.history || []).forEach(traceObject);
  }
  return state;
}

export function buildFullQaState() {
  const minas = [
    { id: 'qa-cli-01', nombre: 'Cliente QA Norte Cobre', mandante: 'Mandante Cobre Norte SpA', region: 'Region de Antofagasta', comuna: 'Calama', altura: 2450, sistema: 'SICEP', contacto: 'Marcela Rojas · +56981234567', color: '#f07d36' },
    { id: 'qa-cli-02', nombre: 'Cliente QA Energia Solar', mandante: 'Energia Solar Andes SpA', region: 'Region de Antofagasta', comuna: 'Mejillones', altura: 30, sistema: 'Acredita Web', contacto: 'Pablo Rivera · +56982345678', color: '#4db8e8' },
    { id: 'qa-cli-03', nombre: 'Cliente QA Construccion Sur', mandante: 'Constructora Industrial Sur SpA', region: 'Region del Biobio', comuna: 'Concepcion', altura: 12, sistema: 'Portal Mandante', contacto: 'Camila Fuentes · +56983456789', color: '#34d399' },
    { id: 'qa-cli-04', nombre: 'Cliente QA Logistica Central', mandante: 'Terminal Logistico Central SpA', region: 'Region Metropolitana de Santiago', comuna: 'Pudahuel', altura: 510, sistema: 'Propio', contacto: 'Ignacio Vidal · +56984567890', color: '#fbbf24' },
    { id: 'qa-cli-05', nombre: 'Cliente QA Industrial Pacifico', mandante: 'Servicios Industriales Pacifico SpA', region: 'Region de Valparaiso', comuna: 'Quintero', altura: 20, sistema: 'Portal HSEC', contacto: 'Andrea Molina · +56985678901', color: '#a78bfa' }
  ];

  const contratos = [
    ['qa-ctr-01', 'NK-QA-2026-001', 'Contrato marco mantenimiento mecanico', 'qa-cli-01', 98000000],
    ['qa-ctr-02', 'NK-QA-2026-002', 'Apoyo operacional planta turno continuo', 'qa-cli-01', 144000000],
    ['qa-ctr-03', 'NK-QA-2026-003', 'Montaje electrico e instrumentacion', 'qa-cli-02', 86000000],
    ['qa-ctr-04', 'NK-QA-2026-004', 'Servicios spot parada mayor energia', 'qa-cli-02', 64000000],
    ['qa-ctr-05', 'NK-QA-2026-005', 'Construccion industrial y comisionamiento', 'qa-cli-03', 210000000],
    ['qa-ctr-06', 'NK-QA-2026-006', 'Operacion logistica y bodegaje', 'qa-cli-04', 76000000],
    ['qa-ctr-07', 'NK-QA-2026-007', 'Mantenimiento planta procesos', 'qa-cli-05', 118000000],
    ['qa-ctr-08', 'NK-QA-2026-008', 'Acreditacion, HSEC y control documental', 'qa-cli-05', 56000000]
  ].map(([id, numero, nombre, minaId, montoCLP], i) => ({
    id, numero, nombre, minaId, montoCLP, tipo: i % 2 ? 'servicio permanente' : 'obra o faena',
    inicio: '2026-07-01', termino: i < 2 ? '2026-08-18' : '2027-06-30', estado: i === 7 ? 'proceso' : 'activo',
    origen: i % 2 ? 'cliente' : 'contratista', adminContratista: 'Ricardo Hornig', adminMandante: `Administrador mandante ${i + 1}`,
    alcance: 'Control de dotacion, documentos, seguridad, trazabilidad operacional, turnos, alojamiento, EPP y reportabilidad.',
    entregables: 'Informe semanal, control documental, nomina habilitada, evidencias y cierre operativo.'
  }));

  const mantenciones = [
    ['qa-pro-01', 'Cambio correa transportadora CV-101', 'mantencion', 'qa-cli-01', 'qa-ctr-01', 12],
    ['qa-pro-02', 'Operacion planta chancado turno A', 'operacion', 'qa-cli-01', 'qa-ctr-02', 18],
    ['qa-pro-03', 'Parada mayor molino SAG', 'mantencion', 'qa-cli-01', 'qa-ctr-01', 16],
    ['qa-pro-04', 'Montaje sala electrica SE-22', 'proyecto', 'qa-cli-02', 'qa-ctr-03', 10],
    ['qa-pro-05', 'Servicio spot limpieza tecnica paneles', 'mantencion', 'qa-cli-02', 'qa-ctr-04', 8],
    ['qa-pro-06', 'Construccion nave mantenimiento', 'proyecto', 'qa-cli-03', 'qa-ctr-05', 20],
    ['qa-pro-07', 'Comisionamiento linea productiva', 'proyecto', 'qa-cli-03', 'qa-ctr-05', 14],
    ['qa-pro-08', 'Operacion patio logistico nocturno', 'operacion', 'qa-cli-04', 'qa-ctr-06', 9],
    ['qa-pro-09', 'Implementacion control inventario', 'proyecto', 'qa-cli-04', 'qa-ctr-06', 7],
    ['qa-pro-10', 'Mantenimiento bombas proceso', 'mantencion', 'qa-cli-05', 'qa-ctr-07', 11],
    ['qa-pro-11', 'Auditoria documental contratistas', 'operacion', 'qa-cli-05', 'qa-ctr-08', 6],
    ['qa-pro-12', 'Reemplazo piping acero inoxidable', 'mantencion', 'qa-cli-05', 'qa-ctr-07', 13]
  ].map(([id, nombre, tipo, minaId, contratoId, personalReq], i) => ({
    id, nombre, tipo, minaId, contratoId, personalReq, area: ['Chancado', 'Planta', 'Electrica', 'Patio', 'Procesos'][i % 5],
    inicio: `2026-${String(8 + (i % 4)).padStart(2, '0')}-01`,
    termino: `2026-${String(8 + (i % 4)).padStart(2, '0')}-25`,
    estado: i % 5 === 0 ? 'en_curso' : 'planificada',
    criticidad: ['alta', 'media', 'baja'][i % 3],
    hh: personalReq * 120,
    especialidadesReq: [
      { name: 'Mecanico mantenedor', count: Math.max(2, Math.floor(personalReq / 3)) },
      { name: 'Prevencionista HSEC', count: 1 },
      { name: i % 2 ? 'Electrico SEC' : 'Soldador calificado', count: 2 }
    ],
    permisos: 'AST, ART, bloqueo LOTO, trabajo en caliente, izaje y altura segun actividad.'
  }));

  const cargos = ['Administrador contrato', 'Supervisor terreno', 'Prevencionista HSEC', 'Mecanico mantenedor', 'Electrico SEC', 'Soldador calificado', 'Rigger', 'Operador camioneta', 'Instrumentista', 'Planificador'];
  const trabajadores = Array.from({ length: 45 }, (_, i) => {
    const n = i + 1;
    const id = `qa-tra-${String(n).padStart(2, '0')}`;
    const mine = minas[i % minas.length];
    const tipo = n <= 15 ? 'permanente' : 'esporadico';
    return {
      id,
      nombre: `Persona QA ${String(n).padStart(2, '0')} ${tipo === 'permanente' ? 'Planta' : 'Spot'}`,
      rut: calcRut(18000000 + n),
      nacimiento: `19${80 + (i % 18)}-${String((i % 12) + 1).padStart(2, '0')}-12`,
      tel: `+569${String(70000000 + n).slice(0, 8)}`,
      email: `persona.qa${n}@nexoklar.cl`,
      region: mine.region,
      comuna: mine.comuna,
      ciudad: mine.comuna,
      tipo,
      cargo: cargos[i % cargos.length],
      especialidad: cargos[i % cargos.length],
      calificacion: 4 + (i % 4),
      disponibilidad: i < 6 ? 'asignado' : i % 13 === 0 ? 'bloqueado' : 'disponible',
      estadoReclutamiento: tipo === 'esporadico' ? ['reclutamiento', 'confirmado', 'validacion examenes', 'contrato enviado', 'contrato firmado', 'acreditacion enviada', 'aprobado'][i % 7] : 'planta activa',
      operationalStatus: i < 3 ? 'no_habilitado' : i % 7 === 0 ? 'en_validacion' : 'habilitado',
      bloqueado: i % 13 === 0,
      motivoBloq: i % 13 === 0 ? 'Documento critico vencido en QA' : '',
      mineras: [mine.id],
      contratoId: contratos[i % contratos.length].id,
      turno: tipo === 'permanente' ? ['5x2', '4x3', '7x7'][i % 3] : 'spot por servicio',
      afp: ['AFP Habitat', 'AFP Capital', 'AFP Modelo', 'AFP Uno'][i % 4],
      salud: ['Fonasa', 'Isapre Colmena', 'Isapre Vida Tres'][i % 3],
      mutual: ['Mutual de Seguridad', 'ACHS', 'IST'][i % 3],
      workerItems: docSet(id, i)
    };
  });

  const asignaciones = mantenciones.flatMap((m, i) => Array.from({ length: 5 }, (_, j) => {
    const worker = trabajadores[(i * 3 + j) % trabajadores.length];
    return { id: `qa-asg-${m.id}-${j + 1}`, mantId: m.id, trabId: worker.id, turno: j % 2 ? 'noche' : 'dia', estado: j === 0 ? 'lider' : 'confirmado' };
  }));

  const hoteles = [
    ['qa-hot-01', 'Hotel QA Norte Operaciones', 'Calama', 'Region de Antofagasta', 'qa-cli-01', 2, 3, 62000],
    ['qa-hot-02', 'Hotel QA Bahia Energia', 'Mejillones', 'Region de Antofagasta', 'qa-cli-02', 2, 2, 70000],
    ['qa-hot-03', 'Hotel QA Sur Industrial', 'Concepcion', 'Region del Biobio', 'qa-cli-03', 2, 3, 58000],
    ['qa-hot-04', 'Hotel QA Central Logistica', 'Pudahuel', 'Region Metropolitana de Santiago', 'qa-cli-04', 3, 2, 65000],
    ['qa-hot-05', 'Hotel QA Pacifico Procesos', 'Quintero', 'Region de Valparaiso', 'qa-cli-05', 2, 2, 61000]
  ].map(([id, nombre, comuna, region, minaId, simples, dobles, tarifa]) => ({
    id, nombre, direccion: `Av. Principal ${id.slice(-2)}00`, region, comuna, ciudad: comuna,
    contacto: `Reservas ${nombre}`, tel: '+56990001122', mail: `reservas.${id}@nexoklar.cl`, tieneContrato: 'si',
    simples, dobles, tarifa, piezas: simples + dobles, camasPorPieza: 1, minaIds: [minaId],
    rooms: [
      ...Array.from({ length: simples }, (_, i) => ({ id: `${id}-s-${i + 1}`, number: `S${i + 1}`, beds: 1, type: 'simple', rate: tarifa, active: true })),
      ...Array.from({ length: dobles }, (_, i) => ({ id: `${id}-d-${i + 1}`, number: `D${i + 1}`, beds: 2, type: 'doble', rate: tarifa + 12000, active: true }))
    ]
  }));

  const hotelAsig = asignaciones.slice(0, 20).map((a, i) => {
    const project = mantenciones.find(m => m.id === a.mantId);
    const hotel = hoteles.find(h => h.minaIds.includes(project.minaId)) || hoteles[0];
    const room = hotel.rooms[i % hotel.rooms.length];
    return { id: `qa-ha-${i + 1}`, trabId: a.trabId, mantId: a.mantId, hotelId: hotel.id, pieza: room.number, tipo: room.type, turno: a.turno, checkin: project.inicio, checkout: project.termino, status: 'activa' };
  });

  const eppMeasurements = Object.fromEntries(trabajadores.map((w, i) => [w.id, {
    helmet: ['M', 'L'][i % 2], shirt: ['M', 'L', 'XL'][i % 3], pants: ['42', '44', '46', '48'][i % 4],
    shoe: String(39 + (i % 6)), gloves: ['8', '9', '10'][i % 3], respirator: ['M', 'L'][i % 2]
  }]));
  const eppDeliveries = trabajadores.slice(0, 30).flatMap((w, i) => [
    { id: `qa-epp-${i + 1}-casco`, batchId: `qa-batch-${i + 1}`, workerId: w.id, mantId: mantenciones[i % mantenciones.length].id, itemId: 'casco', itemName: 'Casco con barbiquejo', qty: 1, size: eppMeasurements[w.id].helmet, condition: 'nuevo', deliveryStatus: 'entregado', deliveredAt: '2026-07-22', nextReplacement: '2028-07-22', lotSerial: `CAS-QA-${i + 1}`, unitCost: 18000, costoUnitario: 18000, vidaUtilMeses: 24, evidenceFiles: evidence(`epp-casco-${i + 1}.pdf`, 'epp') },
    { id: `qa-epp-${i + 1}-zapato`, batchId: `qa-batch-${i + 1}`, workerId: w.id, mantId: mantenciones[i % mantenciones.length].id, itemId: 'zapato', itemName: 'Zapato de seguridad', qty: 1, size: eppMeasurements[w.id].shoe, condition: i % 10 === 0 ? 'repuesto' : 'nuevo', deliveryStatus: i % 10 === 0 ? 'reposicion' : 'entregado', deliveredAt: '2026-07-22', nextReplacement: '2027-07-22', lotSerial: `ZAP-QA-${i + 1}`, unitCost: 52000, costoUnitario: 52000, vidaUtilMeses: 12, evidenceFiles: evidence(`epp-zapato-${i + 1}.pdf`, 'epp') },
    { id: `qa-epp-${i + 1}-uv`, batchId: `qa-batch-${i + 1}`, workerId: w.id, mantId: mantenciones[i % mantenciones.length].id, itemId: 'polera-uv', itemName: 'Polera manga larga UV', qty: 2, size: eppMeasurements[w.id].shirt, condition: 'nuevo', deliveryStatus: 'entregado', deliveredAt: '2026-07-22', nextReplacement: '2027-01-22', lotSerial: `UV-QA-${i + 1}`, unitCost: 14000, costoUnitario: 14000, vidaUtilMeses: 6, evidenceFiles: evidence(`epp-polera-${i + 1}.pdf`, 'epp') }
  ]);

  const vehiculos = [
    ['qa-veh-01', 'Camioneta 4x4 supervision norte', 'Camioneta 4x4', 'QA-BC-11', '', 'propia', 'qa-tra-08', ['qa-cli-01'], 0, '2027-03-31', '2026-08-15', '2027-03-31', '2027-02-28', '2027-01-31'],
    ['qa-veh-02', 'Camioneta arrendada parada mayor', 'Camioneta 4x4', 'QA-BC-12', '', 'arrendada', 'qa-tra-09', ['qa-cli-01', 'qa-cli-02'], 950000, '2027-03-31', '2026-08-05', '2026-08-10', '2026-08-20', '2027-01-31'],
    ['qa-veh-03', 'Bus traslado personal', 'Bus', 'QA-BU-30', '', 'arrendada', 'qa-tra-21', ['qa-cli-03', 'qa-cli-04'], 1800000, '2027-03-31', '2026-09-01', '2027-03-31', '2027-02-28', '2027-01-31'],
    ['qa-veh-04', 'Grua horquilla patio', 'Grua horquilla', '', 'GH-QA-004', 'propia', 'qa-tra-06', ['qa-cli-04'], 0, '', '', '', '2026-08-18', '2026-08-18'],
    ['qa-veh-05', 'Manlift articulado 20 m', 'Manlift', '', 'ML-QA-005', 'arrendada', 'qa-tra-16', ['qa-cli-02'], 2100000, '', '2026-07-28', '2026-12-31', '2026-07-29', '2026-07-27'],
    ['qa-veh-06', 'Torquimetro calibrado', 'Herramienta critica', '', 'TOR-QA-006', 'propia', '', ['qa-cli-05'], 0, '', '', '', '', '2026-08-25'],
    ['qa-veh-07', 'Camioneta proyecto sur', 'Camioneta 4x4', 'QA-CD-44', '', 'arrendada', 'qa-tra-10', ['qa-cli-03'], 920000, '2027-03-31', '2027-02-15', '2027-03-31', '2027-01-15', '2027-01-31'],
    ['qa-veh-08', 'Equipo levante certificado', 'Equipo levante', '', 'LEV-QA-008', 'propia', '', ['qa-cli-05'], 0, '', '', '', '', '2027-01-31']
  ].map(([id, nombre, tipo, patente, serie, propiedad, operadorId, minaIds, rentalCost, permisoCirculacion, revisionTecnica, seguro, autorizacionMinera, certificacion]) => ({
    id, nombre, tipo, patente, serie, propiedad, operadorId, minaIds, rentalCost, currency: 'CLP',
    arriendoVence: propiedad === 'arrendada' ? (id === 'qa-veh-05' ? '2026-08-10' : '2027-01-31') : '',
    permisoCirculacion, revisionTecnica, seguro, autorizacionMinera, certificacion, estado: id === 'qa-veh-05' ? 'observado' : 'activo',
    documents: evidence(`${id}-documentos.pdf`, 'vehiculos'), evidenceFiles: evidence(`${id}-respaldo.pdf`, 'vehiculos')
  }));

  const subcontratos = Array.from({ length: 6 }, (_, i) => ({
    id: `qa-sub-${i + 1}`,
    razon: ['Izajes Norte SpA', 'Aseo Tecnico Andes SpA', 'Transporte Personal Sur SpA', 'Soldaduras Especiales Pacifico SpA', 'Control Documental HSEC SpA', 'Servicios Electricos Alto Voltaje SpA'][i],
    rut: calcRut(76010000 + i),
    servicios: ['Gruas e izajes', 'Aseo industrial', 'Transporte personal', 'Soldadura certificada', 'Acreditacion documental', 'Montaje electrico'][i],
    contratoId: contratos[i % contratos.length].id,
    responsable: `Responsable Subcontrato ${i + 1}`,
    contacto: `+56988${String(100000 + i).slice(0, 6)}`,
    personal: 4 + i,
    estado: i === 1 ? 'observado' : 'vigente',
    f30: i < 2 ? '2026-08-05' : '2026-12-31',
    f301: i < 2 ? '2026-08-05' : '2026-12-31',
    cotizaciones: i < 2 ? '2026-08-05' : '2026-12-31',
    seguro: i === 1 ? '2026-08-08' : '2027-01-31',
    ordenesCompra: [`OC-QA-${1000 + i}`, `OC-QA-${2000 + i}`],
    documents: evidence(`subcontrato-${i + 1}.pdf`, 'subcontratos')
  }));

  const turnos = asignaciones.slice(0, 36).map((a, i) => ({
    id: `qa-turno-${i + 1}`,
    trabId: a.trabId,
    mantId: a.mantId,
    fecha: `2026-08-${String((i % 25) + 1).padStart(2, '0')}`,
    regimen: ['5x2', '4x3', '7x7'][i % 3],
    turno: i % 2 ? 'noche' : 'dia',
    ingreso: i % 2 ? '20:00' : '08:00',
    salida: i % 2 ? '08:00' : '20:00',
    hhPlan: i % 3 === 0 ? 8 : 12,
    hh: i % 11 === 0 ? 10 : (i % 3 === 0 ? 8 : 12),
    asistencia: i % 11 === 0 ? 'observado' : 'presente'
  }));

  const credenciales = trabajadores.slice(0, 30).map((w, i) => ({
    id: `qa-cred-${i + 1}`,
    trabId: w.id,
    minaId: w.mineras[0],
    tipo: i % 3 === 0 ? 'QR digital' : 'Pase faena',
    numero: `PASE-${w.mineras[0].slice(-2)}-${String(i + 1).padStart(3, '0')}`,
    emision: '2026-07-10',
    vence: i < 4 ? '2026-08-10' : '2027-07-10',
    zona: i % 2 ? 'Porteria, planta, casino' : 'Porteria, patio, bodega',
    campamento: i % 5 === 0 ? 'si' : 'no',
    estado: i < 4 ? 'proximo' : 'vigente',
    evidenceFiles: evidence(`credencial-${i + 1}.pdf`, 'credenciales')
  }));

  const protocolosSalud = trabajadores.slice(0, 30).map((w, i) => ({
    id: `qa-prot-${i + 1}`,
    trabId: w.id,
    minaId: w.mineras[0],
    tipo: ['hipobaria', 'ruido', 'silice', 'uv', 'psicosocial', 'sustancias', 'altura_fisica', 'alcohol_drogas'][i % 8],
    examen: ['Examen altura geografica', 'Audiometria', 'Radiografia torax', 'Evaluacion UV', 'ISTAS21', 'Sustancias peligrosas', 'Altura fisica', 'Alcohol y drogas'][i % 8],
    curso: 'Induccion y protocolo ocupacional vigente',
    vence: i < 5 ? '2026-08-09' : '2027-06-15',
    estado: i < 5 ? 'por renovar' : 'vigente',
    observacion: i < 5 ? 'Vencimiento proximo generado para QA' : 'OK',
    evidenceFiles: evidence(`protocolo-${i + 1}.pdf`, 'protocolos')
  }));

  const incidentes = mantenciones.slice(0, 10).map((m, i) => ({
    id: `qa-inc-${i + 1}`,
    mantId: m.id,
    tipo: ['observacion', 'no_conformidad', 'incidente', 'hallazgo_auditoria'][i % 4],
    fecha: `2026-08-${String(i + 3).padStart(2, '0')}`,
    descripcion: `Registro QA ${i + 1}: desviacion operacional controlada en ${m.nombre}`,
    accion: 'Generar accion correctiva, evidencia fotografica y cierre con responsable.',
    responsable: trabajadores[i].nombre,
    compromiso: `2026-08-${String(i + 15).padStart(2, '0')}`,
    estado: i % 4 === 0 ? 'abierto' : i % 4 === 1 ? 'en_cierre' : 'cerrado',
    evidenceFiles: evidence(`incidente-${i + 1}.pdf`, 'incidentes')
  }));

  const permisosTrabajo = mantenciones.map((m, i) => ({
    id: `qa-perm-${i + 1}`,
    mantId: m.id,
    nombre: ['AST', 'ART', 'Trabajo en caliente', 'Izaje', 'Altura', 'Espacio confinado', 'Bloqueo LOTO', 'Energia peligrosa'][i % 8],
    estado: i % 5 === 0 ? 'observado' : 'aprobado',
    responsable: trabajadores[i].nombre,
    vence: i % 5 === 0 ? '2026-08-08' : '2026-12-31',
    evidenceFiles: evidence(`permiso-${i + 1}.pdf`, 'permisos')
  }));

  const firmas = asignaciones.slice(0, 24).map((a, i) => ({
    id: `qa-firma-${i + 1}`,
    trabId: a.trabId,
    mantId: a.mantId,
    tipo: i % 2 ? 'Anexo de movilizacion' : 'Contrato por obra/faena',
    canal: i % 3 === 0 ? 'email' : 'whatsapp',
    enviado: '2026-07-21',
    firmado: i < 12 ? '2026-07-22' : '',
    estado: i < 12 ? 'firmado' : 'enviado',
    evidenceFiles: evidence(`firma-${i + 1}.pdf`, 'firmas')
  }));

  const callouts = mantenciones.slice(0, 10).map((m, i) => ({
    id: `qa-call-${i + 1}`,
    fecha: `2026-07-${String(21 + (i % 8)).padStart(2, '0')}`,
    mantId: m.id,
    especialidades: m.especialidadesReq.map(e => e.name),
    turno: i % 2 ? 'noche' : 'dia',
    cupos: m.personalReq,
    enviados: 18 + i,
    respondieron: 10 + i,
    asignados: Math.min(5, m.personalReq),
    fallidos: i % 3
  }));

  const waGroups = mantenciones.slice(0, 10).map((m, i) => ({
    id: `qa-wa-${i + 1}`,
    minaId: m.minaId,
    mantId: m.id,
    nombre: `Grupo WA ${m.nombre}`,
    trabIds: asignaciones.filter(a => a.mantId === m.id).map(a => a.trabId),
    message: `Equipo confirmado para ${m.nombre}. Favor revisar requisitos y horario.`,
    inviteUrl: ''
  }));

  const empresaDocs = [
    ['qa-edoc-01', 'Escritura sociedad', '2027-12-31', 'aprobado'],
    ['qa-edoc-02', 'Certificado F30', '2026-08-15', 'vigente'],
    ['qa-edoc-03', 'Certificado F30-1', '2026-08-15', 'vigente'],
    ['qa-edoc-04', 'Reglamento interno', '2027-12-31', 'aprobado'],
    ['qa-edoc-05', 'Matriz de riesgos', '2026-08-05', 'observado']
  ].map(([id, nombre, vence, estado]) => ({ id, nombre, type: 'empresa', vence, estado, evidenceFiles: evidence(`${id}.pdf`, 'empresa') }));

  const acreditacionesMandante = [
    ...minas.map((m, i) => ({ id: `qa-acred-emp-${i + 1}`, tipo: 'empresa', entityId: 'empresa', minaId: m.id, estado: i < 2 ? 'pase_emitido' : i === 2 ? 'observado' : 'pendiente', fecha: '2026-07-21', responsable: 'Control documental QA', plazo: '2026-08-10', observacion: i === 2 ? 'Falta actualizar matriz de riesgos' : 'Registro QA' })),
    ...trabajadores.slice(0, 12).map((w, i) => ({ id: `qa-acred-tra-${i + 1}`, tipo: 'trabajador', entityId: w.id, minaId: w.mineras[0], estado: i < 6 ? 'aprobado' : i < 9 ? 'observado' : 'pendiente', fecha: '2026-07-21', responsable: 'Acreditacion QA', plazo: '2026-08-12', observacion: 'Flujo mandante QA' })),
    ...vehiculos.slice(0, 5).map((v, i) => ({ id: `qa-acred-veh-${i + 1}`, tipo: 'vehiculo', entityId: v.id, minaId: v.minaIds[0], estado: i < 3 ? 'aprobado' : 'observado', fecha: '2026-07-21', responsable: 'Logistica QA', plazo: '2026-08-12', observacion: 'Revisión vehículo QA' }))
  ];

  const tenantUsers = [
    { id: 'usr_domian_admin', nombre: 'Administrador Nexo Klar', email: 'contacto@domian.cl', rol: 'admin', activo: true, creado: today },
    { id: 'usr_rrhh_qa', nombre: 'Usuario RRHH QA', email: 'rrhh.qa@nexoklar.cl', rol: 'editor', activo: true, creado: today },
    { id: 'usr_prev_qa', nombre: 'Usuario Prevencion QA', email: 'prevencion.qa@nexoklar.cl', rol: 'prevencion', activo: true, creado: today },
    { id: 'usr_acred_qa', nombre: 'Usuario Acreditacion QA', email: 'acreditacion.qa@nexoklar.cl', rol: 'acreditacion', activo: true, creado: today },
    { id: 'usr_lector_qa', nombre: 'Usuario Consulta QA', email: 'consulta.qa@nexoklar.cl', rol: 'lector', activo: true, creado: today }
  ];

  const dailyLogs = mantenciones.slice(0, 8).map((m, i) => ({
    id: `qa-dl-${i + 1}`, mantId: m.id, title: `Libro diario QA ${i + 1}`, fecha: `2026-08-${String(i + 2).padStart(2, '0')}`,
    clima: 'Despejado', hh: 96 + i * 8, personas: 8 + i, equipos: 'Camioneta, herramientas criticas, equipo levante',
    avance: `${45 + i * 5}% avance registrado`, riesgos: i % 3 === 0 ? 'Controlar interferencia con operacion' : 'Sin desviaciones relevantes',
    fileName: `libro-diario-${i + 1}.pdf`, createdAt: `${today}T12:00:00.000Z`
  }));

  const capaActions = incidentes.filter(i => i.estado !== 'cerrado').map((i, index) => ({
    id: `qa-capa-${index + 1}`,
    source: i.id,
    title: `Accion correctiva QA ${index + 1}`,
    owner: i.responsable,
    due: i.compromiso,
    rootCause: 'Desviacion de procedimiento / evidencia incompleta',
    action: 'Actualizar procedimiento, cargar evidencia y cerrar con validacion HSEC.',
    status: index % 2 ? 'en_proceso' : 'abierta',
    createdAt: `${today}T12:00:00.000Z`
  }));

  const state = {
    empresa: {
      nombre: 'Nexo Klar / Domian Servicios Industriales SpA',
      razonSocial: 'Domian Servicios Industriales SpA',
      rut: '78.425.213-2',
      representante: 'Ricardo Hornig',
      email: 'contacto@domian.cl',
      tel: '+56 9 7649 0489'
    },
    minas, contratos, mantenciones, trabajadores, asignaciones, hoteles, hotelAsig,
    firmas, callouts, waGroups, empresaDocs, tenantUsers, vehiculos, subcontratos, turnos, credenciales,
    incidentes, protocolosSalud, permisosTrabajo, acreditacionesMandante, eppMeasurements, eppDeliveries,
    opportunities: [
      { id: 'qa-opp-01', type: 'cliente', stage: 'propuesta', company: 'Empresa Servicios Zona Norte SpA', rut: calcRut(76020001), service: 'Control documental y personal spot', contact: 'Gerente Operaciones', email: 'operaciones@norteqa.cl', phone: '+56981110000', amount: 48000000, currency: 'CLP', probability: 65, expectedClose: '2026-09-30', nextAction: '2026-08-01', owner: 'Ricardo Hornig', documents: [{ id: 'qa-opp-doc-1', type: 'Bases', evidenceFiles: evidence('oportunidad-bases.pdf', 'oportunidades') }], history: [] },
      { id: 'qa-opp-02', type: 'contrato', stage: 'negociacion', company: 'Mandante Energia Solar Andes SpA', rut: calcRut(76020002), service: 'Expansión control turnos y EPP', contact: 'Jefa Abastecimiento', email: 'abastecimiento@energiaqa.cl', phone: '+56982220000', amount: 72000000, currency: 'CLP', probability: 50, expectedClose: '2026-10-15', nextAction: '2026-07-19', owner: 'Ricardo Hornig', clientId: 'qa-cli-02', contractId: 'qa-ctr-03', documents: [{ id: 'qa-opp-doc-2', type: 'Cotizacion', evidenceFiles: evidence('oportunidad-cotizacion.pdf', 'oportunidades') }], history: [] },
      { id: 'qa-opp-03', type: 'proyecto', stage: 'calificada', company: 'Constructora Industrial Sur SpA', rut: calcRut(76020003), service: 'Portal mandante y auditoria', contact: 'Administrador de contrato', email: 'contrato@surqa.cl', phone: '+56983330000', amount: 36000000, currency: 'CLP', probability: 45, expectedClose: '2026-11-15', nextAction: '2026-08-07', owner: 'Equipo Comercial', clientId: 'qa-cli-03', contractId: 'qa-ctr-05', documents: [], history: [] }
    ],
    workerPortalAccess: trabajadores.slice(0, 8).map((w, i) => ({ id: `qa-portal-worker-${i + 1}`, workerId: w.id, email: w.email, phone: w.tel, status: 'activo', expiresAt: '2026-12-31' })),
    documentWorkflows: trabajadores.slice(0, 12).map((w, i) => ({ id: `qa-docflow-${i + 1}`, entityType: 'trabajador', entityId: w.id, documentType: i % 2 ? 'Examen' : 'Contrato', status: i < 4 ? 'observado' : i < 8 ? 'enviado' : 'aprobado', responsible: 'Control documental QA', due: '2026-08-10', observations: i < 4 ? 'Requiere correccion de archivo' : 'Flujo QA', evidenceFiles: evidence(`workflow-${i + 1}.pdf`, 'documentos') })),
    legalMatrix: [
      { id: 'qa-legal-01', norma: 'Ley 20.123', requisito: 'Control subcontratacion', modulo: 'Subcontratos', estado: 'implementado' },
      { id: 'qa-legal-02', norma: 'DS 44', requisito: 'Gestion preventiva', modulo: 'Protocolos Salud', estado: 'implementado' },
      { id: 'qa-legal-03', norma: 'DS 132', requisito: 'Seguridad minera y permisos', modulo: 'Permisos Trabajo', estado: 'implementado' }
    ],
    dataGovernance: {
      retentionPolicy: 'Conservacion por contrato y bloqueo legal segun solicitud',
      privacyOfficer: 'Administrador Nexo Klar',
      legalHold: [{ id: 'qa-hold-01', entityType: 'incidente', entityId: 'qa-inc-01', reason: 'Investigacion HSEC abierta', createdAt: today }]
    },
    fieldEvents: [
      { id: 'qa-field-01', type: 'entrada_faena', workerId: 'qa-tra-01', mantId: 'qa-pro-01', at: '2026-08-01T08:00:00.000Z', status: 'permitido' },
      { id: 'qa-field-02', type: 'bloqueo_ingreso', workerId: 'qa-tra-02', mantId: 'qa-pro-01', at: '2026-08-01T08:15:00.000Z', status: 'bloqueado', reason: 'Examen vencido' }
    ],
    operatingRules: [
      { id: 'qa-rule-01', name: 'Bloquear ingreso con examen vencido', enabled: true, module: 'trabajadores' },
      { id: 'qa-rule-02', name: 'Alertar vehículo 30 días antes', enabled: true, module: 'vehiculos' }
    ],
    dailyLogs, capaActions,
    aiDocumentConfig: { provider: 'QA mock', endpoint: 'https://api.nexoklar.local/ocr', enabled: false, ocr: true, signature: true, qr: true, issuer: true, tamper: true, reviewRequired: true },
    productionReadiness: { database: true, storage: true, monitoring: false, security: false, ai: false, mobile: false },
    financialControls: { monthlySaas: 520000, setup: 500000, hotelBudget: 8000000, eppBudget: 4500000, vehicleBudget: 6500000, subcontractBudget: 12000000 },
    catalogosEmpresa: {
      cargos: ['Administrador contrato', 'Supervisor terreno', 'Prevencionista HSEC', 'Mecanico mantenedor', 'Electrico SEC', 'Soldador calificado', 'Rigger', 'Operador camioneta'],
      especialidades: ['Mecanica', 'Electricidad', 'Soldadura', 'Izaje', 'HSEC', 'Instrumentacion'],
      turnos: ['5x2', '4x3', '7x7', 'spot por servicio'],
      epp: ['Casco con barbiquejo', 'Lentes de seguridad', 'Guantes anticorte', 'Respirador', 'Arnes', 'Zapato seguridad']
    },
    requirementMatrix: [
      { id: 'qa-req-01', clientId: 'qa-cli-01', contractId: 'qa-ctr-01', role: 'Mecanico mantenedor', requirements: ['Cedula', 'Contrato', 'ODI', 'LOTO', 'Examen preocupacional', 'EPP completo'] },
      { id: 'qa-req-02', clientId: 'qa-cli-02', contractId: 'qa-ctr-03', role: 'Electrico SEC', requirements: ['Cedula', 'Contrato', 'Arc Flash', 'Licencia SEC', 'Bloqueo LOTO'] },
      { id: 'qa-req-03', clientId: 'qa-cli-05', contractId: 'qa-ctr-07', role: 'Soldador calificado', requirements: ['Certificacion soldador', 'Trabajo caliente', 'Examen altura', 'EPP ignifugo'] }
    ],
    entityHistory: [
      { id: 'qa-hist-01', entityType: 'trabajador', entityId: 'qa-tra-01', action: 'creado', by: 'QA', at: `${today}T12:00:00.000Z`, reason: 'Carga QA completa' },
      { id: 'qa-hist-02', entityType: 'vehiculo', entityId: 'qa-veh-02', action: 'observado', by: 'QA', at: `${today}T12:05:00.000Z`, reason: 'Vencimiento proximo SOAP' }
    ],
    productViewMode: 'ejecutivo',
    ESPECIALIDADES: ['Mecanico mantenedor', 'Prevencionista HSEC', 'Electrico SEC', 'Soldador calificado', 'Rigger', 'Operador camioneta', 'Instrumentista', 'Planificador']
  };
  return applyQaTraceLabels(state);
}

const unique = values => new Set(values.filter(Boolean)).size === values.filter(Boolean).length;

export function moduleCoverage(state) {
  const alerts = [
    ...state.trabajadores.flatMap(w => (w.workerItems || []).filter(d => d.vence && d.vence <= '2026-08-20').map(d => ({ module: d.type, workerId: w.id, name: d.name }))),
    ...state.vehiculos.filter(v => [v.arriendoVence, v.revisionTecnica, v.seguro, v.autorizacionMinera, v.certificacion].some(date => date && date <= '2026-08-20')).map(v => ({ module: 'vehiculos', id: v.id })),
    ...state.credenciales.filter(c => c.vence && c.vence <= '2026-08-20').map(c => ({ module: 'credenciales', id: c.id })),
    ...state.protocolosSalud.filter(p => p.vence && p.vence <= '2026-08-20').map(p => ({ module: 'protocolos', id: p.id })),
    ...state.incidentes.filter(i => i.estado !== 'cerrado').map(i => ({ module: 'incidentes', id: i.id })),
    ...state.permisosTrabajo.filter(p => p.estado !== 'aprobado').map(p => ({ module: 'permisos', id: p.id }))
  ];
  return [
    ['Vista General', state.minas.length >= 5 && state.contratos.length >= 8 && state.mantenciones.length >= 12, 'Resumen con clientes, contratos, servicios, alertas y costos.'],
    ['Dashboard', alerts.length > 0 && state.financialControls.monthlySaas > 0, 'KPIs, riesgo por cliente, oportunidades y costos.'],
    ['Centro Reclutamiento', state.trabajadores.some(w => w.tipo === 'esporadico' && w.estadoReclutamiento), 'Personal spot con estados de llamado, validacion, contrato y acreditacion.'],
    ['Por Cliente', state.minas.every(m => state.contratos.some(c => c.minaId === m.id)), 'Arbol cliente -> contrato -> servicio -> personas/equipos.'],
    ['Alertas', alerts.length > 0, `${alerts.length} alertas QA calculadas por vencimientos, incidentes y bloqueos.`],
    ['Trabajadores', state.trabajadores.length >= 45 && unique(state.trabajadores.map(w => w.rut)), 'Nomina completa sin RUT duplicado.'],
    ['Personal de Planta', state.trabajadores.filter(w => w.tipo === 'permanente').length >= 15, 'Personal permanente con turno y cargo.'],
    ['EPP y Entregas', state.eppDeliveries.length >= 90 && Object.keys(state.eppMeasurements).length === state.trabajadores.length, 'Entregas, tallas, costos, vida util y evidencias.'],
    ['Bloqueados', state.trabajadores.some(w => w.bloqueado), 'Trabajadores no habilitados por documento critico.'],
    ['Auditoria', state.documentWorkflows.length > 0 && state.entityHistory.length > 0, 'Flujo documental e historial por entidad.'],
    ['Acreditacion Empresa', state.empresaDocs.length >= 5, 'Documentos empresa con estados y vencimientos.'],
    ['Servicios', state.mantenciones.length === 12 && state.asignaciones.length >= 60, 'Servicios con dotacion requerida y asignaciones.'],
    ['Contratos y Firmas', state.contratos.length === 8 && state.firmas.length >= 24, 'Contratos, montos CLP, vigencia y firma.'],
    ['Hoteleria', state.hoteles.length >= 5 && state.hotelAsig.length >= 20, 'Hoteles, habitaciones, camas, precios y estadias.'],
    ['Llamados WA', state.callouts.length >= 10 && state.waGroups.length >= 10, 'Convocatorias y grupos por servicio.'],
    ['Vehiculos y Equipos', state.vehiculos.length >= 8, 'Patente/serie, arriendo, operador, vencimientos y costos.'],
    ['Acreditacion Mandante', state.acreditacionesMandante.length >= 20, 'Estados por empresa, trabajador y vehiculo ante mandante.'],
    ['Subcontratos', state.subcontratos.length >= 6, 'Subcontratistas con F30, F30-1, cotizaciones, OC y contrato.'],
    ['Turnos y Jornada', state.turnos.length >= 36, 'Jornadas 5x2, 4x3, 7x7, asistencia y HH.'],
    ['Credenciales', state.credenciales.length >= 30, 'Pases, QR, zonas, campamento y vencimientos.'],
    ['Incidentes y NC', state.incidentes.length >= 10 && state.capaActions.length > 0, 'Incidentes, NC, evidencias y CAPA.'],
    ['Protocolos Salud', state.protocolosSalud.length >= 30, 'Hipobaria, ruido, silice, UV, psicosocial y otros.'],
    ['Examenes', state.trabajadores.some(w => w.workerItems.some(d => d.type === 'examen')), 'Examenes por cliente, contrato y proyecto desde ficha.'],
    ['Cursos', state.trabajadores.some(w => w.workerItems.some(d => d.type === 'curso')), 'Cursos por persona y vencimiento.'],
    ['Reportes', state.dailyLogs.length > 0 && state.financialControls.hotelBudget > 0, 'Base para reportes por modulo, costos y operacion.'],
    ['Guia interactiva', true, 'Debe explicar flujo completo; no depende de datos.'],
    ['Configuracion Empresa', state.catalogosEmpresa.cargos.length > 0 && state.requirementMatrix.length > 0, 'Catalogos y matriz de requisitos por empresa.'],
    ['Importar / Exportar', true, 'Payload JSON listo para restaurar respaldo completo.'],
    ['Centro Operativo', state.dailyLogs.length > 0 && state.aiDocumentConfig, 'Libro diario, CAPA, OCR/firma/QR y readiness productiva.'],
    ['Usuarios y Permisos', state.tenantUsers.length >= 5, 'Roles admin, RRHH, prevencion, acreditacion y consulta.'],
    ['Bitacora de Cambios', state.entityHistory.length > 0, 'Historial de cambios por entidad.'],
    ['Privacidad y Datos', Boolean(state.dataGovernance?.retentionPolicy), 'Retencion, responsable y bloqueo legal.'],
    ['LEAD / Oportunidades', state.opportunities.length >= 3, 'Pipeline, montos CLP, probabilidad y documentos.']
  ].map(([module, ok, detail]) => ({ module, ok, detail }));
}

export function validateFullQaState(state = buildFullQaState()) {
  const clean = validateTenantState(state);
  const coverage = moduleCoverage(clean);
  const failures = coverage.filter(row => !row.ok);
  if (failures.length) {
    const error = new Error(`QA coverage failed: ${failures.map(f => f.module).join(', ')}`);
    error.failures = failures;
    throw error;
  }
  return { state: clean, coverage };
}

export function buildReport({ state, coverage }) {
  const rows = coverage.map(row => `| ${row.module} | ${row.ok ? 'OK' : 'REVISAR'} | ${row.detail} |`).join('\n');
  const counts = [
    ['Clientes', state.minas.length],
    ['Contratos', state.contratos.length],
    ['Proyectos / servicios', state.mantenciones.length],
    ['Trabajadores', state.trabajadores.length],
    ['Personal planta', state.trabajadores.filter(w => w.tipo === 'permanente').length],
    ['Personal spot', state.trabajadores.filter(w => w.tipo === 'esporadico').length],
    ['Asignaciones', state.asignaciones.length],
    ['EPP entregado', state.eppDeliveries.length],
    ['Hoteles', state.hoteles.length],
    ['Alojamientos', state.hotelAsig.length],
    ['Vehiculos/equipos', state.vehiculos.length],
    ['Subcontratos', state.subcontratos.length],
    ['Turnos', state.turnos.length],
    ['Credenciales', state.credenciales.length],
    ['Protocolos salud', state.protocolosSalud.length],
    ['Incidentes/NC', state.incidentes.length],
    ['Firmas', state.firmas.length],
    ['Usuarios', state.tenantUsers.length],
    ['Oportunidades', state.opportunities.length]
  ].map(([name, value]) => `| ${name} | ${value} |`).join('\n');
  return `# Informe QA de carga completa por modulo - Nexo Klar

Fecha: ${today}

## Resumen ejecutivo

Se generó una carga QA realista para la cuenta administradora **78.425.213-2** con datos ficticios pero operativos. La prueba valida que cada vista principal del software tenga información asociada, relaciones consistentes y controles de duplicidad.

Toda la data principal queda marcada con trazabilidad visible **QA 1**, **QA 2**, **QA 3** y así sucesivamente. Esto permite seguir clientes, contratos, proyectos, trabajadores, documentos, EPP, hoteles, vehículos, subcontratos, incidentes, oportunidades y registros operativos durante la navegación del sistema.

## Volumen cargado

| Item | Cantidad |
| --- | ---: |
${counts}

## Validacion por vista

| Vista / modulo | Estado | Evidencia funcional |
| --- | --- | --- |
${rows}

## Validaciones criticas ejecutadas

- No se permiten trabajadores duplicados por RUT.
- No se permiten contratos duplicados por numero.
- Cada proyecto/servicio queda asociado a un cliente y contrato consistente.
- Las asignaciones de trabajadores referencian personas y servicios existentes.
- La hoteleria valida habitaciones, camas, fechas de estadia y disponibilidad.
- EPP queda conectado a trabajador, proyecto, talla, costo, vida util y evidencia.
- Vehiculos/equipos quedan conectados a cliente, operador, arriendo, permisos, seguros y alertas de vencimiento.
- Subcontratos quedan conectados a contrato, F30, F30-1, cotizaciones, OC, seguro y cumplimiento.
- Credenciales, protocolos de salud, incidentes, CAPA, permisos y firmas quedan conectados a personas, clientes y servicios.
- Importacion/exportacion queda cubierta mediante respaldo JSON completo.

## Uso recomendado de la carga QA

1. Abrir \`qa/load-nexo-klar-full-qa.html\` desde un servidor local del repositorio.
2. La pagina carga el respaldo en la cuenta administradora \`78.425.213-2\`.
3. El cargador abre \`AccesoMina_v6.html\` con la data QA ya instalada.
4. Revisar filtros por cliente, contrato, proyecto/servicio, estado y vencimiento.
5. Exportar reportes y respaldos para confirmar continuidad de datos.

## Resultado

La carga queda apta para demo comercial, QA de navegacion y prueba funcional por modulo. Para produccion real, los archivos adjuntos simulados deben reemplazarse por almacenamiento cloud privado, OCR/firma/QR productivo, monitoreo y respaldo externo.
`;
}

export async function writeQaArtifacts() {
  const result = validateFullQaState();
  const qaDir = resolve(root, 'qa');
  const docsDir = resolve(root, 'docs');
  await mkdir(qaDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });
  await writeFile(resolve(qaDir, 'nexo-klar-carga-qa-completa.json'), `${JSON.stringify(result.state, null, 2)}\n`, 'utf8');
  await writeFile(resolve(docsDir, 'INFORME_QA_CARGA_COMPLETA_MODULOS_NEXO_KLAR.md'), buildReport(result), 'utf8');
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { state, coverage } = await writeQaArtifacts();
  console.log(JSON.stringify({
    ok: coverage.every(row => row.ok),
    modules: coverage.length,
    clientes: state.minas.length,
    contratos: state.contratos.length,
    proyectos: state.mantenciones.length,
    trabajadores: state.trabajadores.length,
    epp: state.eppDeliveries.length,
    vehiculos: state.vehiculos.length,
    hoteles: state.hoteles.length
  }, null, 2));
}
