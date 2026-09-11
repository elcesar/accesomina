const defaultExperience = {
  workflow: 'Registra la información esencial y vincúlala con los módulos relacionados.',
  formFields: [],
  relations: [],
}

const option = (value, label) => ({ value, label })

export const moduleExperience = {
  'activos-inventario': {
    workflow: 'Registra el activo, define su ubicación y mantiene su custodia y mantenimiento al día.',
    formFields: [
      { key: 'codigo', label: 'Código interno', placeholder: 'Ej.: ACT-001' },
      { key: 'categoria', label: 'Categoría', type: 'select', options: [option('', 'Selecciona una categoría'), option('maquinaria', 'Maquinaria'), option('equipo', 'Equipo o instrumento'), option('herramienta', 'Herramienta'), option('epp', 'Protección personal / EPP'), option('material', 'Material o insumo'), option('otro', 'Otro tipo de activo')] },
      { key: 'ubicacion', label: 'Ubicación o bodega', placeholder: 'Ej.: Bodega central' },
    ],
    relations: [
      { label: 'Bodegas', to: 'bodegas' },
      { label: 'Mantenimiento', to: 'mantenimiento' },
      { label: 'Asignaciones y préstamos', to: 'asignaciones-prestamos' },
    ],
  },
  'terceros-subcontratos': {
    workflow: 'Registra la empresa colaboradora, valida sus antecedentes y habilítala antes de asignarla a un servicio.',
    formFields: [
      { key: 'tipoRelacion', label: 'Tipo de relación', type: 'select', options: [option('', 'Selecciona una relación'), option('contratista', 'Contratista'), option('subcontratista', 'Subcontratista'), option('proveedor', 'Proveedor'), option('otro', 'Otro tipo de relación')] },
      { key: 'rut', label: 'RUT de la empresa', placeholder: 'Ej.: 76.123.456-7' },
      { key: 'especialidad', label: 'Especialidad o servicio', placeholder: 'Ej.: Mantención industrial' },
      { key: 'contacto', label: 'Contacto principal', placeholder: 'Nombre, correo o teléfono' },
    ],
    relations: [
      { label: 'Convenios y contratos de terceros', to: 'contratos-convenios' },
      { label: 'Personas de empresas colaboradoras', to: 'personal-empresa-servicios' },
      { label: 'Habilitaciones y cumplimiento', to: 'habilitaciones-cumplimiento' },
      { label: 'Evaluación de desempeño', to: 'evaluacion-desempeno' },
    ],
  },
  auditoria: {
    workflow: 'Define el alcance, asigna a la persona responsable y registra hallazgos con evidencia y seguimiento.',
    formFields: [
      { key: 'alcance', label: 'Alcance de la revisión', placeholder: 'Ej.: Revisión documental de servicio' },
      { key: 'fechaRevision', label: 'Fecha de revisión', type: 'date' },
      { key: 'tipoAuditoria', label: 'Tipo de revisión', type: 'select', options: [option('', 'Selecciona un tipo'), option('interna', 'Interna'), option('cliente', 'Cliente'), option('cumplimiento', 'Cumplimiento'), option('operacional', 'Operacional'), option('otro', 'Otro tipo de revisión')] },
    ],
    relations: [
      { label: 'Cumplimiento corporativo', to: 'cumplimiento-corporativo' },
      { label: 'Habilitación del cliente', to: 'habilitacion-cliente' },
      { label: 'Incidentes y no conformidades', to: 'incidentes' },
    ],
  },
  'turnos-asistencia': {
    workflow: 'Planifica el turno, vincula a las personas y confirma la asistencia desde la orden de servicio.',
    formFields: [
      { key: 'fecha', label: 'Fecha del turno', type: 'date' },
      { key: 'jornada', label: 'Jornada', type: 'select', options: [option('', 'Selecciona una jornada'), option('diurna', 'Diurna'), option('nocturna', 'Nocturna'), option('mixta', 'Mixta')] },
      { key: 'ordenServicio', label: 'Orden de servicio relacionada', placeholder: 'Código o nombre de la orden' },
    ],
    relations: [
      { label: 'Personas', to: 'personas' },
      { label: 'Órdenes de servicio', to: 'ordenes-servicio' },
      { label: 'Gestión de personal por proyecto', to: 'gestion-personal-proyecto' },
    ],
  },
  'libro-obra': {
    workflow: 'Registra una anotación con contexto, responsable y plazo; luego conserva la evidencia y la firma correspondiente.',
    formFields: [
      { key: 'tipoAnotacion', label: 'Tipo de anotación', type: 'select', options: [option('', 'Selecciona un tipo'), option('avance', 'Avance'), option('instruccion', 'Instrucción'), option('acuerdo', 'Acuerdo'), option('consulta', 'Consulta'), option('respuesta', 'Respuesta'), option('observacion', 'Observación'), option('incidente', 'Incidente'), option('otro', 'Otro tipo de registro')] },
      { key: 'fechaAnotacion', label: 'Fecha de la anotación', type: 'date' },
      { key: 'fechaCompromiso', label: 'Fecha de compromiso', type: 'date' },
    ],
    relations: [
      { label: 'Clientes', to: 'clientes' },
      { label: 'Contratos y firmas', to: 'contratos' },
      { label: 'Órdenes de servicio', to: 'ordenes-servicio' },
    ],
  },
}

export const experienceFor = moduleId => moduleExperience[moduleId] || defaultExperience
