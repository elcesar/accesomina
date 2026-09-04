import test from 'node:test';
import assert from 'node:assert/strict';
import { validateTenantState } from '../validation.js';

const calcRut = number => {
  let sum = 0;
  let factor = 2;
  for (const digit of String(number).split('').reverse()) {
    sum += Number(digit) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const raw = 11 - (sum % 11);
  const dv = raw === 11 ? '0' : raw === 10 ? 'K' : String(raw);
  return `${number}-${dv}`;
};

const evidence = name => [{ name, type: 'application/pdf', size: 184000, objectId: `qa-${name}`, uploadedAt: '2026-07-21T12:00:00.000Z' }];

const workerDocs = index => [
  { id: `doc-${index}-ci`, type: 'documento', name: 'Cedula de identidad', emision: '2026-01-01', vence: '2028-01-01', estado: 'aprobado', evidenceFiles: evidence(`cedula-${index}.pdf`) },
  { id: `doc-${index}-contrato`, type: 'documento', name: 'Contrato de trabajo', emision: '2026-07-01', vence: '2027-07-01', estado: 'aprobado', evidenceFiles: evidence(`contrato-${index}.pdf`) },
  { id: `doc-${index}-f30`, type: 'documento', name: 'F30-1 obligaciones laborales', emision: '2026-07-01', vence: '2026-08-31', estado: 'vigente', evidenceFiles: evidence(`f30-${index}.pdf`) },
  { id: `doc-${index}-examen`, type: 'examen', name: 'Examen preocupacional', emision: '2026-06-15', vence: '2027-06-15', estado: 'vigente', evidenceFiles: evidence(`examen-${index}.pdf`) },
  { id: `doc-${index}-altura`, type: 'examen', name: 'Altura fisica', emision: '2026-06-20', vence: '2027-06-20', estado: 'vigente', evidenceFiles: evidence(`altura-${index}.pdf`) },
  { id: `doc-${index}-curso`, type: 'curso', name: 'Induccion hombre nuevo', emision: '2026-07-05', vence: '2027-07-05', estado: 'vigente', evidenceFiles: evidence(`induccion-${index}.pdf`) }
];

const makeWorkers = mines => {
  const cargos = ['Supervisor terreno', 'Prevencionista HSEC', 'Mecanico mantenedor', 'Electrico SEC', 'Soldador calificado', 'Rigger', 'Operador camioneta', 'Instrumentista', 'Administrador contrato', 'Planificador'];
  const specialties = ['Supervision', 'Prevencion', 'Mecanica', 'Electricidad', 'Soldadura', 'Izaje', 'Conduccion', 'Instrumentacion', 'Administracion', 'Planificacion'];
  return Array.from({ length: 36 }, (_, index) => {
    const n = index + 1;
    const mine = mines[index % mines.length];
    return {
      id: `w${String(n).padStart(2, '0')}`,
      nombre: `Trabajador QA ${String(n).padStart(2, '0')}`,
      rut: calcRut(17000000 + n),
      tipo: n <= 12 ? 'permanente' : 'esporadico',
      cargo: cargos[index % cargos.length],
      especialidad: specialties[index % specialties.length],
      telefono: `+569${String(80000000 + n).slice(0, 8)}`,
      email: `trabajador.qa${n}@nexoklar.cl`,
      region: n % 3 === 0 ? 'Region de Antofagasta' : n % 3 === 1 ? 'Region Metropolitana de Santiago' : 'Region del Biobio',
      comuna: n % 3 === 0 ? 'Calama' : n % 3 === 1 ? 'Santiago' : 'Concepcion',
      turno: n <= 12 ? ['5x2', '4x3', '7x7'][index % 3] : 'spot por servicio',
      estadoOperativo: n <= 12 ? 'disponible' : ['convocado', 'confirmado', 'acreditacion enviada', 'aprobado'][index % 4],
      mineras: [mine.id],
      workerItems: workerDocs(n)
    };
  });
};

const buildQaScenario = () => {
  const minas = [
    { id: 'm01', nombre: 'Cliente Norte Cobre', mandante: 'Compania Minera Norte', region: 'Region de Antofagasta', comuna: 'Calama' },
    { id: 'm02', nombre: 'Cliente Energia Andes', mandante: 'Energia Andes SpA', region: 'Region de Antofagasta', comuna: 'Mejillones' },
    { id: 'm03', nombre: 'Cliente Construccion Sur', mandante: 'Infraestructura Sur', region: 'Region del Biobio', comuna: 'Concepcion' },
    { id: 'm04', nombre: 'Cliente Logistica Central', mandante: 'Terminal Central', region: 'Region Metropolitana de Santiago', comuna: 'Pudahuel' },
    { id: 'm05', nombre: 'Cliente Industrial Pacifico', mandante: 'Procesos Pacifico', region: 'Region de Valparaiso', comuna: 'Quintero' }
  ];
  const contratos = [
    ['c01', 'NK-2026-001', 'Servicio integral mantenimiento planta', 'm01'],
    ['c02', 'NK-2026-002', 'Apoyo operacional turnos críticos', 'm01'],
    ['c03', 'NK-2026-003', 'Montaje electrico parque industrial', 'm02'],
    ['c04', 'NK-2026-004', 'Servicios spot parada mayor', 'm02'],
    ['c05', 'NK-2026-005', 'Construccion y comisionamiento', 'm03'],
    ['c06', 'NK-2026-006', 'Operacion logistica y bodegaje', 'm04'],
    ['c07', 'NK-2026-007', 'Mantenimiento mecanico industrial', 'm05'],
    ['c08', 'NK-2026-008', 'Soporte HSEC y acreditacion', 'm05']
  ].map(([id, numero, nombre, minaId], index) => ({
    id, numero, nombre, minaId, inicio: '2026-07-01', termino: index % 2 ? '2027-06-30' : '2028-06-30',
    alcance: 'Control documental, personal, turnos, EPP, vehiculos, hoteleria y reportabilidad operativa.'
  }));
  const mantenciones = [
    ['p01', 'Cambio correa transportadora CV-101', 'mantencion', 'm01', 'c01'],
    ['p02', 'Operacion planta chancado turno A', 'operacion', 'm01', 'c02'],
    ['p03', 'Parada mayor molino SAG', 'mantencion', 'm01', 'c01'],
    ['p04', 'Montaje sala electrica SE-22', 'proyecto', 'm02', 'c03'],
    ['p05', 'Servicio spot limpieza tecnica', 'mantencion', 'm02', 'c04'],
    ['p06', 'Construccion nave mantenimiento', 'proyecto', 'm03', 'c05'],
    ['p07', 'Comisionamiento linea productiva', 'proyecto', 'm03', 'c05'],
    ['p08', 'Operacion patio logistico', 'operacion', 'm04', 'c06'],
    ['p09', 'Implementacion control inventario', 'proyecto', 'm04', 'c06'],
    ['p10', 'Mantenimiento bombas proceso', 'mantencion', 'm05', 'c07'],
    ['p11', 'Auditoria documental contratistas', 'operacion', 'm05', 'c08'],
    ['p12', 'Reemplazo piping acero inoxidable', 'mantencion', 'm05', 'c07']
  ].map(([id, nombre, tipo, minaId, contratoId], index) => ({
    id, nombre, tipo, minaId, contratoId, inicio: `2026-${String(8 + (index % 4)).padStart(2, '0')}-01`, termino: `2026-${String(8 + (index % 4)).padStart(2, '0')}-25`,
    dotacionPlanificada: [
      { especialidad: 'Mecanica', cantidad: 4 },
      { especialidad: 'Prevencion', cantidad: 1 },
      { especialidad: 'Electricidad', cantidad: index % 2 ? 2 : 1 }
    ]
  }));
  const trabajadores = makeWorkers(minas);
  const asignaciones = mantenciones.flatMap((project, pIndex) => Array.from({ length: 4 }, (_, offset) => {
    const worker = trabajadores[(pIndex * 3 + offset) % trabajadores.length];
    return { id: `asg-${project.id}-${offset + 1}`, trabId: worker.id, mantId: project.id, rol: worker.especialidad, estado: offset === 0 ? 'lider' : 'asignado' };
  }));
  const hoteles = [
    { id: 'h01', nombre: 'Hotel Norte Operaciones', ciudad: 'Calama', contacto: '+56991234567', email: 'reservas.norte@nexoklar.cl', minaIds: ['m01'], rooms: [{ id: 'h01-r101', number: '101', beds: 2, rate: 62000 }, { id: 'h01-r102', number: '102', beds: 1, rate: 48000 }, { id: 'h01-r201', number: '201', beds: 2, rate: 62000 }] },
    { id: 'h02', nombre: 'Hotel Bahia Energia', ciudad: 'Mejillones', contacto: '+56992345678', email: 'reservas.bahia@nexoklar.cl', minaIds: ['m02'], rooms: [{ id: 'h02-r11', number: '11', beds: 1, rate: 52000 }, { id: 'h02-r12', number: '12', beds: 2, rate: 70000 }] },
    { id: 'h03', nombre: 'Hotel Sur Industrial', ciudad: 'Concepcion', contacto: '+56993456789', email: 'reservas.sur@nexoklar.cl', minaIds: ['m03'], rooms: [{ id: 'h03-r301', number: '301', beds: 2, rate: 58000 }, { id: 'h03-r302', number: '302', beds: 1, rate: 45000 }] },
    { id: 'h04', nombre: 'Hotel Central Logistica', ciudad: 'Pudahuel', contacto: '+56994567890', email: 'reservas.central@nexoklar.cl', minaIds: ['m04', 'm05'], rooms: [{ id: 'h04-r401', number: '401', beds: 2, rate: 65000 }, { id: 'h04-r402', number: '402', beds: 2, rate: 65000 }] }
  ];
  const hotelAsig = [
    ['ha01', 'w13', 'p01', 'h01', '101', '2026-08-01', '2026-08-12'],
    ['ha02', 'w14', 'p01', 'h01', '101', '2026-08-01', '2026-08-12'],
    ['ha03', 'w15', 'p03', 'h01', '102', '2026-08-02', '2026-08-15'],
    ['ha04', 'w16', 'p04', 'h02', '11', '2026-08-01', '2026-08-20'],
    ['ha05', 'w17', 'p04', 'h02', '12', '2026-08-01', '2026-08-20'],
    ['ha06', 'w18', 'p04', 'h02', '12', '2026-08-01', '2026-08-20'],
    ['ha07', 'w19', 'p06', 'h03', '301', '2026-09-01', '2026-09-18'],
    ['ha08', 'w20', 'p06', 'h03', '301', '2026-09-01', '2026-09-18'],
    ['ha09', 'w21', 'p08', 'h04', '401', '2026-08-05', '2026-08-30'],
    ['ha10', 'w22', 'p08', 'h04', '401', '2026-08-05', '2026-08-30'],
    ['ha11', 'w23', 'p10', 'h04', '402', '2026-09-01', '2026-09-10'],
    ['ha12', 'w24', 'p10', 'h04', '402', '2026-09-01', '2026-09-10']
  ].map(([id, trabId, mantId, hotelId, pieza, checkin, checkout]) => ({ id, trabId, mantId, hotelId, pieza, checkin, checkout, status: 'activa' }));
  const turnos = asignaciones.slice(0, 30).map((assignment, index) => ({
    id: `turno-${index + 1}`, trabId: assignment.trabId, mantId: assignment.mantId,
    fecha: `2026-08-${String((index % 25) + 1).padStart(2, '0')}`,
    turno: index % 2 ? 'noche' : 'dia', ingreso: index % 2 ? '20:00' : '08:00', salida: index % 2 ? '08:00' : '20:00', hh: 12, asistencia: 'presente'
  }));
  const credenciales = trabajadores.slice(0, 24).map((worker, index) => ({
    id: `cred-${index + 1}`, trabId: worker.id, minaId: worker.mineras[0], numero: `PASE-${worker.mineras[0].toUpperCase()}-${String(index + 1).padStart(3, '0')}`,
    tipo: 'Pase faena', emision: '2026-07-15', vence: index < 3 ? '2026-08-10' : '2027-07-15', zona: 'Operacion controlada', evidenceFiles: evidence(`credencial-${index + 1}.pdf`)
  }));
  const protocolosSalud = trabajadores.slice(0, 24).map((worker, index) => ({
    id: `salud-${index + 1}`, trabId: worker.id, minaId: worker.mineras[0], tipo: ['hipobaria', 'ruido', 'silice', 'radiacion UV', 'alcohol y drogas', 'altura fisica'][index % 6],
    emision: '2026-06-10', vence: index < 4 ? '2026-08-05' : '2027-06-10', estado: 'vigente', evidenceFiles: evidence(`protocolo-salud-${index + 1}.pdf`)
  }));
  const vehiculos = [
    { id: 'veh-01', tipo: 'Camioneta 4x4', nombre: 'Camioneta terreno 01', propiedad: 'propia', patente: 'QA-BC-11', operadorId: 'w07', minaIds: ['m01'], permisoCirculacionVence: '2027-03-31', revisionTecnicaVence: '2026-08-15', soapVence: '2027-03-31', costoArriendoMensual: 0, evidenceFiles: evidence('camioneta-01.pdf') },
    { id: 'veh-02', tipo: 'Camioneta 4x4', nombre: 'Camioneta terreno 02', propiedad: 'arrendada', patente: 'QA-BC-12', operadorId: 'w08', minaIds: ['m01', 'm02'], arriendoVence: '2026-08-20', permisoCirculacionVence: '2027-03-31', revisionTecnicaVence: '2027-01-10', soapVence: '2027-03-31', costoArriendoMensual: 950000, evidenceFiles: evidence('contrato-arriendo-veh-02.pdf') },
    { id: 'veh-03', tipo: 'Bus traslado', nombre: 'Bus traslado personal', propiedad: 'arrendada', patente: 'QA-BU-30', operadorId: 'w21', minaIds: ['m03', 'm04'], arriendoVence: '2027-02-28', permisoCirculacionVence: '2027-03-31', revisionTecnicaVence: '2026-09-01', soapVence: '2027-03-31', costoArriendoMensual: 1800000, evidenceFiles: evidence('bus-traslado.pdf') },
    { id: 'veh-04', tipo: 'Grua horquilla', nombre: 'Grua horquilla patio', propiedad: 'propia', serie: 'GH-QA-004', operadorId: 'w06', minaIds: ['m04'], certificacionVence: '2026-08-18', costoArriendoMensual: 0, evidenceFiles: evidence('cert-grua.pdf') },
    { id: 'veh-05', tipo: 'Manlift', nombre: 'Manlift articulado', propiedad: 'arrendada', serie: 'ML-QA-005', operadorId: 'w16', minaIds: ['m02'], arriendoVence: '2026-08-12', certificacionVence: '2026-08-30', costoArriendoMensual: 2100000, evidenceFiles: evidence('manlift.pdf') },
    { id: 'veh-06', tipo: 'Equipo levante', nombre: 'Tecles certificados', propiedad: 'propia', serie: 'LEV-QA-006', minaIds: ['m05'], certificacionVence: '2027-01-31', costoArriendoMensual: 0, evidenceFiles: evidence('tecles.pdf') },
    { id: 'veh-07', tipo: 'Camioneta 4x4', nombre: 'Camioneta proyecto sur', propiedad: 'arrendada', patente: 'QA-CD-44', operadorId: 'w10', minaIds: ['m03'], arriendoVence: '2026-12-31', permisoCirculacionVence: '2027-03-31', revisionTecnicaVence: '2027-02-15', soapVence: '2027-03-31', costoArriendoMensual: 920000, evidenceFiles: evidence('camioneta-sur.pdf') },
    { id: 'veh-08', tipo: 'Herramienta critica', nombre: 'Torquimetro calibrado', propiedad: 'propia', serie: 'TOR-QA-008', minaIds: ['m05'], certificacionVence: '2026-08-25', costoArriendoMensual: 0, evidenceFiles: evidence('torquimetro.pdf') }
  ];
  const eppMeasurements = Object.fromEntries(trabajadores.map((worker, index) => [worker.id, {
    helmet: ['M', 'L'][index % 2], shirt: ['M', 'L', 'XL'][index % 3], pants: ['42', '44', '46', '48'][index % 4], shoe: String(40 + (index % 5)), gloves: ['8', '9', '10'][index % 3], respirator: ['M', 'L'][index % 2]
  }]));
  const eppDeliveries = trabajadores.slice(0, 24).flatMap((worker, index) => [
    { id: `epp-${index + 1}-casco`, batchId: `batch-${index + 1}`, workerId: worker.id, mantId: mantenciones[index % mantenciones.length].id, itemId: 'casco', itemName: 'Casco seguridad', qty: 1, size: eppMeasurements[worker.id].helmet, condition: 'nuevo', deliveryStatus: 'entregado', deliveredAt: '2026-07-25', lotSerial: `CAS-${index + 1}`, costoUnitario: 18000, vidaUtilMeses: 24, evidenceFiles: evidence(`epp-casco-${index + 1}.pdf`) },
    { id: `epp-${index + 1}-zapato`, batchId: `batch-${index + 1}`, workerId: worker.id, mantId: mantenciones[index % mantenciones.length].id, itemId: 'zapato', itemName: 'Zapato seguridad', qty: 1, size: eppMeasurements[worker.id].shoe, condition: 'nuevo', deliveryStatus: 'entregado', deliveredAt: '2026-07-25', lotSerial: `ZAP-${index + 1}`, costoUnitario: 52000, vidaUtilMeses: 12, evidenceFiles: evidence(`epp-zapato-${index + 1}.pdf`) },
    { id: `epp-${index + 1}-polera`, batchId: `batch-${index + 1}`, workerId: worker.id, mantId: mantenciones[index % mantenciones.length].id, itemId: 'polera', itemName: 'Polera manga larga UV', qty: 2, size: eppMeasurements[worker.id].shirt, condition: 'nuevo', deliveryStatus: 'entregado', deliveredAt: '2026-07-25', lotSerial: `POL-${index + 1}`, costoUnitario: 14000, vidaUtilMeses: 6, evidenceFiles: evidence(`epp-polera-${index + 1}.pdf`) }
  ]);
  const subcontratos = [
    { id: 'sub-01', nombre: 'Izajes Norte SpA', rut: calcRut(76000001), servicios: 'Gruas e izajes criticos', contratoId: 'c01', f30Vence: '2026-08-31', cotizacionesVence: '2026-08-31', contratoVence: '2027-07-01', ordenesCompra: ['OC-1001', 'OC-1002'], evidenceFiles: evidence('sub-izajes.pdf') },
    { id: 'sub-02', nombre: 'Aseo Industrial Andes SpA', rut: calcRut(76000002), servicios: 'Aseo tecnico industrial', contratoId: 'c04', f30Vence: '2026-08-31', cotizacionesVence: '2026-08-31', contratoVence: '2027-03-30', ordenesCompra: ['OC-2001'], evidenceFiles: evidence('sub-aseo.pdf') },
    { id: 'sub-03', nombre: 'Transporte Personal Sur SpA', rut: calcRut(76000003), servicios: 'Transporte de personal', contratoId: 'c06', f30Vence: '2026-08-31', cotizacionesVence: '2026-08-31', contratoVence: '2027-12-31', ordenesCompra: ['OC-3001'], evidenceFiles: evidence('sub-transporte.pdf') },
    { id: 'sub-04', nombre: 'Soldaduras Especiales Pacifico SpA', rut: calcRut(76000004), servicios: 'Soldadura certificada', contratoId: 'c07', f30Vence: '2026-08-31', cotizacionesVence: '2026-08-31', contratoVence: '2027-06-30', ordenesCompra: ['OC-4001'], evidenceFiles: evidence('sub-soldadura.pdf') },
    { id: 'sub-05', nombre: 'Control Documental HSEC SpA', rut: calcRut(76000005), servicios: 'Acreditacion y control documental', contratoId: 'c08', f30Vence: '2026-08-31', cotizacionesVence: '2026-08-31', contratoVence: '2027-06-30', ordenesCompra: ['OC-5001'], evidenceFiles: evidence('sub-hsec.pdf') }
  ];
  const incidentes = mantenciones.slice(0, 8).map((project, index) => ({
    id: `inc-${index + 1}`, mantId: project.id, fecha: `2026-08-${String(index + 3).padStart(2, '0')}`, tipo: ['observacion', 'no conformidad', 'incidente sin lesion', 'hallazgo auditoria'][index % 4],
    descripcion: `Hallazgo QA ${index + 1} asociado a ${project.nombre}`, responsable: trabajadores[index].nombre, estado: index % 3 === 0 ? 'abierto' : 'cerrado', evidenceFiles: evidence(`incidente-${index + 1}.pdf`)
  }));
  const permisosTrabajo = mantenciones.map((project, index) => ({
    id: `perm-${index + 1}`, mantId: project.id, nombre: ['AST', 'ART', 'Trabajo en caliente', 'Izaje', 'Altura', 'Bloqueo LOTO'][index % 6],
    estado: index % 4 === 0 ? 'pendiente' : 'aprobado', responsable: trabajadores[index % trabajadores.length].nombre, vence: `2026-08-${String((index % 20) + 5).padStart(2, '0')}`, evidenceFiles: evidence(`permiso-${index + 1}.pdf`)
  }));
  const firmas = asignaciones.slice(0, 18).map((assignment, index) => ({
    id: `firma-${index + 1}`, trabId: assignment.trabId, mantId: assignment.mantId, tipo: index % 2 ? 'anexo trabajo' : 'contrato trabajo',
    estado: index < 8 ? 'firmado' : 'enviado', proveedor: 'conector firma pendiente', evidenceFiles: evidence(`firma-${index + 1}.pdf`)
  }));
  const callouts = mantenciones.slice(0, 8).map((project, index) => ({
    id: `llamado-${index + 1}`, mantId: project.id, fecha: `2026-07-${String(index + 20).padStart(2, '0')}`, canal: index % 2 ? 'WhatsApp' : 'Correo', estado: index % 3 === 0 ? 'respondido' : 'enviado'
  }));
  const waGroups = mantenciones.slice(0, 8).map((project, index) => ({
    id: `wa-${index + 1}`, minaId: project.minaId, mantId: project.id, nombre: `Grupo ${project.nombre}`, trabIds: asignaciones.filter(a => a.mantId === project.id).map(a => a.trabId).slice(0, 4)
  }));

  return {
    empresa: { nombre: 'Nexo Klar QA Operacional', rut: '78.425.213-2', adminEmail: 'contacto@domian.cl' },
    minas, contratos, mantenciones, trabajadores, asignaciones, hoteles, hotelAsig, turnos, credenciales,
    protocolosSalud, incidentes, vehiculos, subcontratos, firmas, callouts, waGroups, permisosTrabajo,
    eppDeliveries, eppMeasurements,
    opportunities: [
      { id: 'opp-01', type: 'cliente', stage: 'propuesta', company: 'Servicios Industriales Futuro', rut: calcRut(76000100), amount: 48000000, probability: 70, documents: [{ id: 'opp-doc-1', type: 'Bases', evidenceFiles: evidence('bases-oportunidad.pdf') }] },
      { id: 'opp-02', type: 'contrato', stage: 'negociacion', company: 'Energia Andes SpA', rut: calcRut(76000101), clientId: 'm02', contractId: 'c03', amount: 72000000, probability: 55, documents: [{ id: 'opp-doc-2', type: 'Cotizacion', evidenceFiles: evidence('cotizacion-oportunidad.pdf') }] }
    ]
  };
};

test('QA operacional: carga 5 clientes, 8 contratos, 12 proyectos y flujo conectado completo', () => {
  const clean = validateTenantState(buildQaScenario());

  assert.equal(clean.minas.length, 5);
  assert.equal(clean.contratos.length, 8);
  assert.equal(clean.mantenciones.length, 12);
  assert.equal(clean.trabajadores.length, 36);
  assert.equal(clean.trabajadores.filter(worker => worker.tipo === 'permanente').length, 12);
  assert.equal(clean.trabajadores.filter(worker => worker.tipo === 'esporadico').length, 24);
  assert.equal(clean.asignaciones.length, 48);
  assert.equal(clean.hoteles.length, 4);
  assert.equal(clean.hotelAsig.length, 12);
  assert.equal(clean.vehiculos.length, 8);
  assert.equal(clean.subcontratos.length, 5);
  assert.equal(clean.eppDeliveries.length, 72);
  assert.equal(Object.keys(clean.eppMeasurements).length, 36);
  assert.equal(clean.turnos.length, 30);
  assert.equal(clean.credenciales.length, 24);
  assert.equal(clean.protocolosSalud.length, 24);
  assert.equal(clean.incidentes.length, 8);
  assert.equal(clean.permisosTrabajo.length, 12);
  assert.equal(clean.firmas.length, 18);
  assert.equal(clean.callouts.length, 8);
  assert.equal(clean.waGroups.length, 8);

  for (const contract of clean.contratos) {
    assert.ok(clean.minas.some(client => client.id === contract.minaId), `Contrato ${contract.numero} sin cliente`);
  }
  for (const project of clean.mantenciones) {
    const contract = clean.contratos.find(row => row.id === project.contratoId);
    assert.equal(project.minaId, contract.minaId, `Proyecto ${project.nombre} debe pertenecer al mismo cliente del contrato`);
  }
  for (const assignment of clean.asignaciones) {
    assert.ok(clean.trabajadores.some(worker => worker.id === assignment.trabId), `Asignacion ${assignment.id} sin trabajador`);
    assert.ok(clean.mantenciones.some(project => project.id === assignment.mantId), `Asignacion ${assignment.id} sin proyecto`);
  }

  const expiringVehicleControls = clean.vehiculos.filter(vehicle =>
    ['revisionTecnicaVence', 'arriendoVence', 'certificacionVence'].some(field => vehicle[field] >= '2026-07-21' && vehicle[field] <= '2026-08-20')
  );
  const expiringCredentials = clean.credenciales.filter(row => row.vence >= '2026-07-21' && row.vence <= '2026-08-20');
  const expiringHealthProtocols = clean.protocolosSalud.filter(row => row.vence >= '2026-07-21' && row.vence <= '2026-08-20');

  assert.ok(expiringVehicleControls.length >= 4, 'Debe existir muestra de alertas de vehiculos/equipos a 30 dias');
  assert.ok(expiringCredentials.length >= 3, 'Debe existir muestra de alertas de credenciales a 30 dias');
  assert.ok(expiringHealthProtocols.length >= 4, 'Debe existir muestra de alertas de salud ocupacional a 30 dias');
});

test('QA operacional: bloquea duplicados y relaciones incorrectas del escenario masivo', () => {
  const duplicateWorker = buildQaScenario();
  duplicateWorker.trabajadores.push({ ...duplicateWorker.trabajadores[0], id: 'w-duplicado', nombre: 'Duplicado QA', rut: duplicateWorker.trabajadores[0].rut.replace('-', '') });
  assert.throws(() => validateTenantState(duplicateWorker), error => error.code === 'DUPLICATE_WORKER_RUT');

  const duplicateContract = buildQaScenario();
  duplicateContract.contratos[7].numero = ' nk-2026-001 ';
  assert.throws(() => validateTenantState(duplicateContract), error => error.code === 'DUPLICATE_CONTRACT_NUMBER');

  const brokenProject = buildQaScenario();
  brokenProject.mantenciones[0].contratoId = 'c03';
  assert.throws(() => validateTenantState(brokenProject), error => error.code === 'INVALID_REFERENCE');

  const duplicateVehicle = buildQaScenario();
  duplicateVehicle.vehiculos[7].patente = 'QA-BC11';
  assert.throws(() => validateTenantState(duplicateVehicle), error => error.code === 'DUPLICATE_VEHICLE');

  const hotelOverCapacity = buildQaScenario();
  hotelOverCapacity.hotelAsig.push({ id: 'ha-over', trabId: 'w25', mantId: 'p01', hotelId: 'h01', pieza: '101', checkin: '2026-08-05', checkout: '2026-08-09', status: 'activa' });
  assert.throws(() => validateTenantState(hotelOverCapacity), error => error.code === 'HOTEL_ROOM_OVER_CAPACITY');

  const duplicateEpp = buildQaScenario();
  duplicateEpp.eppDeliveries.push({ ...duplicateEpp.eppDeliveries[0], id: 'epp-duplicate' });
  assert.throws(() => validateTenantState(duplicateEpp), error => error.code === 'DUPLICATE_EPP_DELIVERY');
});

test('QA operacional: exportacion e importacion JSON mantienen la data completa', () => {
  const state = validateTenantState(buildQaScenario());
  const backup = JSON.stringify({ format: 'nexo-klar-qa-backup', version: 1, modules: state });
  const imported = JSON.parse(backup);
  const clean = validateTenantState(imported.modules);

  assert.equal(clean.minas.length, 5);
  assert.equal(clean.trabajadores.length, 36);
  assert.equal(clean.eppDeliveries.length, 72);
  assert.equal(clean.vehiculos[1].costoArriendoMensual, 950000);
  assert.equal(clean.hoteles[0].rooms[0].rate, 62000);
  assert.equal(clean.opportunities.length, 2);
});
