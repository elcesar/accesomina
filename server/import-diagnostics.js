import { isValidRut, isValidChilePhone, normalizeRut } from './security.js';
import { isValidEmail, workerBirthDateIssue } from './validation.js';
import { optionalHistoricalRut } from '../shared/rut.js';
import {
  canonicalWorkerAfp,
  canonicalWorkerCommune,
  canonicalWorkerHealth,
  canonicalWorkerRegion,
  canonicalWorkerSpecialty,
  workerImportType,
  workerImportValue,
} from '../shared/worker-import-policy.js';
import { opportunityIdentity, opportunityRows } from '../shared/opportunity-domain.js';

const REFERENCE_COLUMNS = {
  contratos: { minera: 'minas' },
  mantenciones: { minera: 'minas', contrato: 'contratos' },
  vehiculos: { operador: 'trabajadores', mineras: 'minas' },
  hoteles: { mineras: 'minas' },
  turnos: { trabajador: 'trabajadores', proyecto: 'mantenciones' },
  credenciales: { trabajador: 'trabajadores', minera: 'minas' },
  subcontratos: { contrato: 'contratos' },
  epp: { trabajador: 'trabajadores', proyecto: 'mantenciones' },
  oportunidades: { cliente: 'minas', contrato: 'contratos' },
};

const text = value => String(value ?? '').trim();
const normalized = value => text(value).toLocaleLowerCase('es-CL').replace(/\s+/g, ' ');
const displayedValue = value => String(value ?? '').slice(0, 200);
const referenceKey = value => String(value ?? '').trim().toLowerCase();
const csvLine = (index, collector = null) => {
  if (!Number.isInteger(index)) return 1;
  const line = collector?.rowLines?.[index];
  return Number.isInteger(line) && line > 0 ? line : index + 2;
};
export const MAX_IMPORT_DIAGNOSTICS = 2_000;

/**
 * Maps each parsed data row to its physical first line before Papa Parse removes
 * blank records or folds quoted multiline fields. This keeps reported rows useful
 * to people editing the original CSV.
 */
export function csvDataRowLines(source) {
  const input = String(source ?? '').replace(/^\uFEFF/, '');
  const recordLines = [];
  let startOffset = 0;
  let startLine = 1;
  let line = 1;
  let quoted = false;
  const saveRecord = end => {
    if (input.slice(startOffset, end).trim()) recordLines.push(startLine);
  };

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (character === '"') {
      if (quoted && input[index + 1] === '"') {
        index += 1;
        continue;
      }
      quoted = !quoted;
      continue;
    }
    if (character !== '\n' && character !== '\r') continue;
    const recordEnds = !quoted;
    if (recordEnds) saveRecord(index);
    if (character === '\r' && input[index + 1] === '\n') index += 1;
    line += 1;
    if (recordEnds) {
      startOffset = index + 1;
      startLine = line;
    }
  }
  if (startOffset < input.length) saveRecord(input.length);
  return recordLines.slice(1);
}

export function createImportDiagnostics(limit = MAX_IMPORT_DIAGNOSTICS, rowLines = []) {
  const safeLimit = Number.isInteger(limit) && limit >= 0 ? limit : MAX_IMPORT_DIAGNOSTICS;
  const issues = [];
  const physicalLines = Array.isArray(rowLines) ? rowLines : [];
  let totalIssues = 0;
  let incomplete = false;
  return {
    add(issue) {
      totalIssues += 1;
      if (issues.length < safeLimit) issues.push(issue);
    },
    markTruncated() {
      incomplete = true;
      if (totalIssues <= issues.length) totalIssues = issues.length + 1;
    },
    get isFull() { return issues.length >= safeLimit; },
    rowLines: physicalLines,
    get issues() { return issues; },
    get totalIssues() { return totalIssues; },
    get truncated() { return incomplete || totalIssues > safeLimit; },
    get totalIssuesExact() { return !incomplete; },
    result() {
      return { issues: [...issues], totalIssues, truncated: incomplete || totalIssues > safeLimit, totalIssuesExact: !incomplete };
    },
  };
}

export function boundedImportIssues(issues, limit = MAX_IMPORT_DIAGNOSTICS) {
  if (issues && typeof issues.result === 'function') return issues.result();
  const values = Array.isArray(issues) ? issues : [];
  const totalIssues = values.length;
  return { issues: values.slice(0, limit), totalIssues, truncated: totalIssues > limit };
}

export function importIssue({ row = null, column = 'archivo', value = '', code, message, suggestion }) {
  return {
    row: Number.isInteger(row) ? row : null,
    column,
    value: displayedValue(value),
    code,
    message,
    suggestion,
  };
}

export function csvParseIssues(errors = [], collector = null) {
  const sink = collector || createImportDiagnostics();
  for (const error of errors) {
    sink.add(importIssue({
      row: csvLine(error?.row, sink),
      column: 'archivo',
      value: '',
      code: error?.code || 'INVALID_CSV',
      message: 'La estructura del CSV no se puede leer en esta fila.',
      suggestion: 'Revisa separadores, comillas y el número de columnas; o descarga una plantilla nueva.',
    }));
  }
  return sink.issues;
}

function workerCsvIssues(rows, collector) {
  const sink = collector || createImportDiagnostics();
  for (let index = 0; index < rows.length; index += 1) {
    if (sink.isFull) {
      sink.markTruncated();
      break;
    }
    const row = rows[index];
    const line = csvLine(index, sink);
    const type = workerImportValue(row, 'tipo');
    if (text(type.value) && !workerImportType(type.value)) {
      sink.add(importIssue({
        row: line,
        column: type.column,
        value: type.value,
        code: 'INVALID_WORKER_TYPE',
        message: 'El tipo de persona no está reconocido.',
        suggestion: 'Usa permanente, esporadico o disponible. También se aceptan los alias históricos fijo, planta, temporal, proyecto, por proyecto y spot.',
      }));
    }

    const birthDate = workerImportValue(row, 'nacimiento', ['fecha_nacimiento', 'fecha_de_nacimiento']);
    const birthDateProblem = workerBirthDateIssue(birthDate.value);
    if (birthDateProblem) {
      sink.add(importIssue({
        row: line,
        column: birthDate.column,
        value: birthDate.value,
        code: birthDateProblem.code,
        message: birthDateProblem.message,
        suggestion: birthDateProblem.suggestion,
      }));
    }

    const catalogChecks = [
      [workerImportValue(row, 'especialidad'), canonicalWorkerSpecialty, 'INVALID_WORKER_SPECIALTY', 'La especialidad no coincide con el catálogo de Personas.', 'Usa una especialidad de la guía de la plantilla o deja el campo vacío si se trata de un archivo histórico.'],
      [workerImportValue(row, 'afp'), canonicalWorkerAfp, 'INVALID_WORKER_AFP', 'La AFP no coincide con el catálogo de Personas.', 'Usa una AFP de la guía de la plantilla o deja el campo vacío si no corresponde informarla.'],
      [workerImportValue(row, 'salud'), canonicalWorkerHealth, 'INVALID_WORKER_HEALTH', 'La previsión de salud no coincide con el catálogo de Personas.', 'Usa Fonasa o una Isapre de la guía de la plantilla; también puedes dejar el campo vacío.'],
    ];
    for (const [field, canonicalize, code, message, suggestion] of catalogChecks) {
      if (!text(field.value) || canonicalize(field.value)) continue;
      sink.add(importIssue({ row: line, column: field.column, value: field.value, code, message, suggestion }));
    }

    const region = workerImportValue(row, 'region');
    const canonicalRegion = canonicalWorkerRegion(region.value);
    if (text(region.value) && !canonicalRegion) {
      sink.add(importIssue({
        row: line,
        column: region.column,
        value: region.value,
        code: 'INVALID_WORKER_REGION',
        message: 'La región no coincide con el catálogo geográfico de Personas.',
        suggestion: 'Usa una región de Chile indicada en la guía de la plantilla.',
      }));
    }

    // A historical CSV may contain only the legacy "ciudad" column. Preserve
    // that optional shape; when a region is supplied, the comuna is validated
    // against the same selector used by the individual flow.
    const commune = workerImportValue(row, 'comuna', ['ciudad']);
    if (text(commune.value) && canonicalRegion && !canonicalWorkerCommune(canonicalRegion, commune.value)) {
      sink.add(importIssue({
        row: line,
        column: commune.column,
        value: commune.value,
        code: 'INVALID_WORKER_COMMUNE',
        message: 'La comuna no pertenece a la región indicada.',
        suggestion: 'Selecciona una comuna correspondiente a la región de esta misma fila.',
      }));
    }
  }
  return sink.issues;
}

/**
 * Validates every row that can be inspected without tenant state. It deliberately
 * mirrors the already-enforced CSV rules, but accumulates diagnoses instead of
 * stopping at the first one. Additional CSV columns remain compatible with the
 * prior importer and are ignored by the existing mapper.
 */
export function csvFileIssues(type, definition, fields = [], rows = [], collector = null) {
  const sink = collector || createImportDiagnostics();
  const headers = Array.isArray(fields) ? fields.map(header => text(header).toLowerCase().replace(/\s+/g, '_')) : [];
  const present = new Set(headers.filter(Boolean));
  const missingHeaders = new Set();

  for (const header of definition.required) {
    if (!present.has(header)) {
      missingHeaders.add(header);
      sink.add(importIssue({
        row: 1,
        column: header,
        value: '',
        code: 'MISSING_COLUMN',
        message: `Falta la columna obligatoria “${header}”.`,
        suggestion: 'Descarga la plantilla y agrega esa columna en la cabecera.',
      }));
    }
  }

  rows.forEach((row, index) => {
    const line = csvLine(index, sink);
    for (const field of definition.required) {
      if (!missingHeaders.has(field) && !text(row?.[field])) {
        sink.add(importIssue({
          row: line,
          column: field,
          value: row?.[field] ?? '',
          code: 'REQUIRED',
          message: 'Este dato es obligatorio.',
          suggestion: 'Completa el valor antes de volver a cargar el archivo.',
        }));
      }
    }

    if (['trabajadores', 'subcontratos'].includes(type) && text(row?.rut) && !isValidRut(row.rut)) {
      sink.add(importIssue({
        row: line,
        column: 'rut',
        value: row.rut,
        code: 'INVALID_RUT',
        message: 'El RUT no tiene un dígito verificador válido.',
        suggestion: 'Corrige el RUT chileno y vuelve a cargar el archivo.',
      }));
    }

    if (type === 'oportunidades' && text(row?.rut) && optionalHistoricalRut(row.rut).error) {
      sink.add(importIssue({
        row: line,
        column: 'rut',
        value: row.rut,
        code: 'INVALID_OPPORTUNITY_RUT',
        message: 'El RUT de la oportunidad no es válido.',
        suggestion: 'Corrige el RUT o deja el campo vacío si no corresponde informarlo.',
      }));
    }

    if (['trabajadores', 'oportunidades'].includes(type)) {
      if (text(row?.email) && !isValidEmail(row.email)) {
        sink.add(importIssue({
          row: line,
          column: 'email',
          value: row.email,
          code: type === 'trabajadores' ? 'INVALID_WORKER_EMAIL' : 'INVALID_OPPORTUNITY_EMAIL',
          message: 'El correo no tiene un formato válido.',
          suggestion: 'Ingresa un correo válido o deja el campo vacío.',
        }));
      }
      if (type === 'trabajadores' && text(row?.telefono || row?.tel) && !isValidChilePhone(row.telefono || row.tel)) {
        sink.add(importIssue({
          row: line,
          column: 'telefono',
          value: row.telefono || row.tel,
          code: 'INVALID_WORKER_PHONE',
          message: 'El teléfono no tiene un formato chileno válido.',
          suggestion: 'Ingresa un número chileno válido, por ejemplo +56 9 1234 5678.',
        }));
      }
    }
  });

  if (type === 'trabajadores') workerCsvIssues(rows, sink);
  return sink.issues;
}


function referenceLookup(rows) {
  const lookup = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = String(row?.id ?? '');
    const name = referenceKey(row?.nombre ?? row?.numero ?? '');
    if (id && !lookup.has('id:' + id)) lookup.set('id:' + id, row);
    if (name && !lookup.has('name:' + name)) lookup.set('name:' + name, row);
  }
  return lookup;
}

function matchingReference(rows, value, lookup = null) {
  // Keep the same resolution semantics as data-transfer.resolveId(): identifiers
  // are exact, while visible names/numbers are trim/lowercase comparisons only.
  const raw = String(value ?? '');
  const wantedNormalized = referenceKey(value);
  if (lookup) return lookup.get('id:' + raw) || lookup.get('name:' + wantedNormalized) || null;
  return (rows || []).find(row => (
    String(row?.id ?? '') === raw ||
    referenceKey(row?.nombre ?? row?.numero ?? '') === wantedNormalized
  )) || null;
}

function referenceId(rows, value) {
  return String(matchingReference(rows, value)?.id ?? text(value));
}


function* delimitedReferences(source) {
  let start = 0;
  for (let index = 0; index <= source.length; index += 1) {
    if (index !== source.length && source[index] !== ';' && source[index] !== ',') continue;
    const value = text(source.slice(start, index));
    if (value) yield value;
    start = index + 1;
  }
}

function referenceIssues(type, rows, state, collector = null) {
  const sink = collector || createImportDiagnostics();
  const references = REFERENCE_COLUMNS[type] || {};
  const lookups = Object.fromEntries(Object.values(references).map(module => [module, referenceLookup(state?.[module])]));
  for (let index = 0; index < rows.length; index += 1) {
    if (sink.isFull) {
      sink.markTruncated();
      break;
    }
    const row = rows[index];
    const line = csvLine(index, sink);
    for (const [column, module] of Object.entries(references)) {
      const source = String(row?.[column] ?? '');
      if (!source) continue;
      const choices = column === 'mineras' ? delimitedReferences(source) : [source];
      for (const value of choices) {
        if (sink.isFull) {
          sink.markTruncated();
          return sink.issues;
        }
        if (!matchingReference(state?.[module], value, lookups[module])) {
          sink.add(importIssue({
            row: line,
            column,
            value,
            code: 'INVALID_REFERENCE',
            message: 'No existe un registro relacionado con ese nombre o identificador en esta empresa.',
            suggestion: 'Crea o corrige primero el registro relacionado y vuelve a cargar el archivo.',
          }));
        }
      }
    }
  }
  return sink.issues;
}
function duplicateIssues(rows, stateRows, mode, { keyFromRow, keyFromState, column, valueFromRow, code, message, suggestion }, collector = null) {
  const sink = collector || createImportDiagnostics();
  const seen = new Set(mode === 'append' ? (stateRows || []).map(keyFromState).filter(Boolean) : []);
  rows.forEach((row, index) => {
    const key = keyFromRow(row);
    if (!key) return;
    if (seen.has(key)) {
      sink.add(importIssue({
        row: csvLine(index, sink),
        column,
        value: valueFromRow(row),
        code,
        message,
        suggestion,
      }));
    }
    seen.add(key);
  });
  return sink.issues;
}

function duplicateRutIssues(type, rows, state, mode, collector = null) {
  const sink = collector || createImportDiagnostics();
  if (!['trabajadores', 'subcontratos'].includes(type)) return sink.issues;
  const module = type === 'trabajadores' ? 'trabajadores' : 'subcontratos';
  duplicateIssues(rows, state?.[module], mode, {
    keyFromRow: row => {
      const value = text(row?.rut);
      return value && isValidRut(value) ? normalizeRut(value) : '';
    },
    keyFromState: row => normalizeRut(row?.rut),
    column: 'rut',
    valueFromRow: row => row?.rut,
    code: type === 'trabajadores' ? 'DUPLICATE_WORKER_RUT' : 'DUPLICATE_SUBCONTRACTOR_RUT',
    message: 'El RUT ya está registrado o se repite dentro de este archivo.',
    suggestion: 'Conserva una sola fila por RUT y revisa los registros existentes antes de reintentar.',
  }, sink);
  return sink.issues;
}

function dateOrderIssues(type, rows, collector = null) {
  const sink = collector || createImportDiagnostics();
  if (!['contratos', 'mantenciones'].includes(type)) return sink.issues;
  rows.forEach((row, index) => {
    if (text(row?.inicio) && text(row?.termino) && row.inicio > row.termino) {
      sink.add(importIssue({
        row: csvLine(index, sink),
        column: 'termino',
        value: row.termino,
        code: 'INVALID_DATES',
        message: 'La fecha de término es anterior a la fecha de inicio.',
        suggestion: 'Usa una fecha de término igual o posterior a la fecha de inicio.',
      }));
    }
  });
  return sink.issues;
}

function entityDuplicateIssues(type, rows, state, mode, collector = null) {
  const sink = collector || createImportDiagnostics();
  if (type === 'minas') {
    duplicateIssues(rows, state?.minas, mode, {
      keyFromRow: row => {
        const name = normalized(row?.nombre);
        return name ? name + '|' + normalized(row?.mandante) : '';
      },
      keyFromState: row => {
        const name = normalized(row?.nombre);
        return name ? name + '|' + normalized(row?.mandante) : '';
      },
      column: 'nombre',
      valueFromRow: row => row?.nombre,
      code: 'DUPLICATE_CLIENT',
      message: 'Ya existe un cliente con el mismo nombre y mandante.',
      suggestion: 'Corrige el nombre o el mandante antes de volver a cargar el archivo.',
    }, sink);
  } else if (type === 'contratos') {
    duplicateIssues(rows, state?.contratos, mode, {
      keyFromRow: row => normalized(row?.numero),
      keyFromState: row => normalized(row?.numero),
      column: 'numero',
      valueFromRow: row => row?.numero,
      code: 'DUPLICATE_CONTRACT_NUMBER',
      message: 'Ya existe un contrato con ese número o código.',
      suggestion: 'Usa un número de contrato distinto o actualiza el registro existente.',
    }, sink);
  } else if (type === 'mantenciones') {
    const projectKey = row => {
      const name = normalized(row?.nombre);
      return name ? referenceId(state?.minas, row?.minera) + '|' + name + '|' + text(row?.inicio) : '';
    };
    duplicateIssues(rows, state?.mantenciones, mode, {
      keyFromRow: projectKey,
      keyFromState: row => {
        const name = normalized(row?.nombre);
        return name ? String(row?.minaId || '') + '|' + name + '|' + text(row?.inicio) : '';
      },
      column: 'nombre',
      valueFromRow: row => row?.nombre,
      code: 'DUPLICATE_PROJECT',
      message: 'Ya existe una orden de servicio con ese cliente, nombre y fecha de inicio.',
      suggestion: 'Corrige los datos de la orden o actualiza el registro existente.',
    }, sink);
  } else if (type === 'hoteles') {
    duplicateIssues(rows, state?.hoteles, mode, {
      keyFromRow: row => {
        const name = normalized(row?.nombre);
        return name ? name + '|' + normalized(row?.ciudad) : '';
      },
      keyFromState: row => {
        const name = normalized(row?.nombre);
        return name ? name + '|' + normalized(row?.ciudad) : '';
      },
      column: 'nombre',
      valueFromRow: row => row?.nombre,
      code: 'DUPLICATE_HOTEL',
      message: 'Ya existe un alojamiento con el mismo nombre y ciudad.',
      suggestion: 'Corrige el nombre o la ciudad antes de volver a cargar el archivo.',
    }, sink);
  } else if (type === 'turnos') {
    duplicateIssues(rows, state?.turnos, mode, {
      keyFromRow: row => referenceId(state?.trabajadores, row?.trabajador) + '|' + referenceId(state?.mantenciones, row?.proyecto) + '|' + text(row?.fecha) + '|' + (text(row?.turno) || 'día'),
      keyFromState: row => String(row?.trabId || '') + '|' + String(row?.mantId || '') + '|' + text(row?.fecha) + '|' + (text(row?.turno) || 'día'),
      column: 'fecha',
      valueFromRow: row => row?.fecha,
      code: 'DUPLICATE_SHIFT',
      message: 'La persona ya tiene una jornada registrada para esa fecha y turno.',
      suggestion: 'Corrige la fecha o el turno, o actualiza el registro existente.',
    }, sink);
  } else if (type === 'credenciales') {
    duplicateIssues(rows, state?.credenciales, mode, {
      keyFromRow: row => {
        const number = normalized(row?.numero);
        return number ? referenceId(state?.minas, row?.minera) + '|' + number : '';
      },
      keyFromState: row => {
        const number = normalized(row?.numero);
        return number ? String(row?.minaId || '') + '|' + number : '';
      },
      column: 'numero',
      valueFromRow: row => row?.numero,
      code: 'DUPLICATE_CREDENTIAL',
      message: 'Ya existe una credencial con ese número para el cliente indicado.',
      suggestion: 'Usa un número distinto o actualiza la credencial existente.',
    }, sink);
  }
  return sink.issues;
}

function vehicleIssues(rows, state, mode, collector = null) {
  const sink = collector || createImportDiagnostics();
  const seen = new Set();
  const key = value => normalized(value).replace(/[^a-z0-9]/g, '');
  if (mode === 'append') {
    for (const row of state?.vehiculos || []) {
      if (text(row?.patente)) seen.add('p:' + key(row.patente));
      if (text(row?.serie)) seen.add('s:' + normalized(row.serie));
    }
  }
  rows.forEach((row, index) => {
    const line = csvLine(index, sink);
    for (const [column, prefix, normalizeKey] of [
      ['patente', 'p:', key],
      ['serie', 's:', normalized],
    ]) {
      const value = text(row?.[column]);
      if (!value) continue;
      const identity = prefix + normalizeKey(value);
      if (seen.has(identity)) {
        sink.add(importIssue({
          row: line,
          column,
          value,
          code: 'DUPLICATE_VEHICLE',
          message: 'Ya existe un vehículo con esa patente o número de serie.',
          suggestion: 'Corrige el valor o actualiza el vehículo existente.',
        }));
      }
      seen.add(identity);
    }
    if (normalized(row?.propiedad) === 'arrendada' && !text(row?.vencimiento_arriendo || row?.arrendado_hasta)) {
      sink.add(importIssue({
        row: line,
        column: 'vencimiento_arriendo',
        value: '',
        code: 'MISSING_RENTAL_EXPIRY',
        message: 'Un vehículo arrendado requiere fecha de vencimiento del arriendo.',
        suggestion: 'Completa la fecha de vencimiento del arriendo.',
      }));
    }
  });
  return sink.issues;
}

function maintenanceRelationshipIssues(rows, state, collector = null) {
  const sink = collector || createImportDiagnostics();
  rows.forEach((row, index) => {
    const mine = matchingReference(state?.minas, row?.minera);
    const contract = matchingReference(state?.contratos, row?.contrato);
    if (!mine || !contract?.minaId || String(contract.minaId) === String(mine.id)) return;
    sink.add(importIssue({
      row: csvLine(index, sink),
      column: 'contrato',
      value: row?.contrato,
      code: 'INVALID_REFERENCE',
      message: 'El contrato no pertenece al cliente indicado para esta orden.',
      suggestion: 'Selecciona un contrato del mismo cliente o corrige el cliente de la fila.',
    }));
  });
  return sink.issues;
}

function eppIssues(rows, state, mode, collector = null) {
  const sink = collector || createImportDiagnostics();
  const seen = new Set(mode === 'append'
    ? (state?.eppDeliveries || []).map(row => String(row?.workerId || '') + '|' + String(row?.itemId || '') + '|' + text(row?.deliveredAt) + '|' + normalized(row?.lotSerial))
    : []);
  rows.forEach((row, index) => {
    const line = csvLine(index, sink);
    const quantity = Number(row?.cantidad) || 1;
    if (quantity < 1) {
      sink.add(importIssue({
        row: line,
        column: 'cantidad',
        value: row?.cantidad,
        code: 'INVALID_EPP_DELIVERY',
        message: 'La cantidad de EPP debe ser al menos 1.',
        suggestion: 'Ingresa una cantidad igual o mayor que 1.',
      }));
    }
    // Preserve the mapper's raw-truthiness behavior: whitespace is not silently
    // converted into a default and must be rejected as it was by domain validation.
    const condition = row?.condicion || 'no_registrada';
    if (!['nuevo', 'reutilizado-inspeccionado', 'repuesto', 'no_registrada'].includes(condition)) {
      sink.add(importIssue({
        row: line,
        column: 'condicion',
        value: row?.condicion,
        code: 'INVALID_EPP_DELIVERY_STATUS',
        message: 'La condición de la entrega de EPP no es válida.',
        suggestion: 'Usa nuevo, reutilizado-inspeccionado, repuesto o no_registrada.',
      }));
    }
    const deliveryStatus = row?.estado_entrega || 'entregado';
    if (!['entregado', 'reposicion', 'prestamo', 'no_registrado'].includes(deliveryStatus)) {
      sink.add(importIssue({
        row: line,
        column: 'estado_entrega',
        value: row?.estado_entrega,
        code: 'INVALID_EPP_DELIVERY_STATUS',
        message: 'El estado de la entrega de EPP no es válido.',
        suggestion: 'Usa entregado, reposicion, prestamo o no_registrado.',
      }));
    }
    const identity = referenceId(state?.trabajadores, row?.trabajador) + '|' + text(row?.epp_id) + '|' + text(row?.fecha_entrega) + '|' + normalized(row?.lote_serie);
    if (text(row?.trabajador) && text(row?.epp_id) && text(row?.fecha_entrega)) {
      if (seen.has(identity)) {
        sink.add(importIssue({
          row: line,
          column: 'epp_id',
          value: row?.epp_id,
          code: 'DUPLICATE_EPP_DELIVERY',
          message: 'Ya existe una entrega de este equipo para la misma persona, fecha y lote.',
          suggestion: 'Corrige el equipo, la fecha o el lote; o actualiza la entrega existente.',
        }));
      }
      seen.add(identity);
    }
  });
  return sink.issues;
}

function opportunityIssues(rows, state, mode, collector = null) {
  const sink = collector || createImportDiagnostics();
  const seen = new Set(mode === 'append'
    ? opportunityRows(state).map(opportunityIdentity).filter(Boolean)
    : []);
  rows.forEach((row, index) => {
    const line = csvLine(index, sink);
    const amount = Number(row?.monto) || 0;
    const probability = Number(row?.probabilidad) || 0;
    if (!Number.isFinite(amount) || amount < 0) {
      sink.add(importIssue({
        row: line,
        column: 'monto',
        value: row?.monto,
        code: 'INVALID_OPPORTUNITY',
        message: 'El monto de la oportunidad no es válido.',
        suggestion: 'Ingresa un monto igual o mayor que cero.',
      }));
    }
    if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
      sink.add(importIssue({
        row: line,
        column: 'probabilidad',
        value: row?.probabilidad,
        code: 'INVALID_OPPORTUNITY',
        message: 'La probabilidad debe estar entre 0 y 100.',
        suggestion: 'Ingresa una probabilidad válida.',
      }));
    }
    const identity = opportunityIdentity({
      type: row?.tipo,
      stage: row?.etapa,
      company: row?.empresa,
      rut: row?.rut,
      clientId: referenceId(state?.minas, row?.cliente),
      contractId: referenceId(state?.contratos, row?.contrato),
    });
    if (identity && seen.has(identity)) {
      sink.add(importIssue({
        row: line,
        column: text(row?.rut) ? 'rut' : 'empresa',
        value: text(row?.rut) || row?.empresa,
        code: 'DUPLICATE_OPPORTUNITY',
        message: 'Ya existe una oportunidad activa equivalente.',
        suggestion: 'Corrige la empresa, el RUT o el alcance comercial; o actualiza la oportunidad existente.',
      }));
    }
    if (identity) seen.add(identity);
  });
  return sink.issues;
}

/**
 * Rules that need the authorized tenant state. The route calls this while
 * holding its tenant transaction, before mapping or writing any records.
 */
export function csvTenantIssues(type, definition, rows = [], state = {}, mode = 'append', collector = null) {
  const sink = collector || createImportDiagnostics();
  duplicateRutIssues(type, rows, state, mode, sink);
  if (sink.truncated) return sink.issues;
  referenceIssues(type, rows, state, sink);
  if (sink.truncated) return sink.issues;
  dateOrderIssues(type, rows, sink);
  if (sink.truncated) return sink.issues;
  entityDuplicateIssues(type, rows, state, mode, sink);
  if (sink.truncated) return sink.issues;
  if (type === 'mantenciones') maintenanceRelationshipIssues(rows, state, sink);
  if (type === 'vehiculos') vehicleIssues(rows, state, mode, sink);
  if (type === 'epp') eppIssues(rows, state, mode, sink);
  if (type === 'oportunidades') opportunityIssues(rows, state, mode, sink);
  return sink.issues;
}


const GLOBAL_RULES = {
  INVALID_WORKER_EMAIL: {
    message: 'Hay un correo de persona que no es válido.',
    suggestion: 'Corrige los correos indicados en el archivo antes de importarlo.',
  },
  INVALID_WORKER_PHONE: {
    message: 'Hay un teléfono de persona que no tiene un formato válido.',
    suggestion: 'Corrige los teléfonos indicados en el archivo antes de importarlo.',
  },
  INVALID_REFERENCE: {
    message: 'El archivo referencia un registro que no existe en esta empresa.',
    suggestion: 'Corrige las referencias y vuelve a cargar el archivo.',
  },
  INVALID_DATES: {
    message: 'Hay fechas incompatibles en el archivo.',
    suggestion: 'Revisa las fechas de inicio, término y vencimiento antes de reintentar.',
  },
  DUPLICATE_WORKER_RUT: {
    message: 'El archivo genera un RUT de persona duplicado.',
    suggestion: 'Conserva una sola fila por RUT y revisa los registros existentes.',
  },
  DUPLICATE_SUBCONTRACTOR_RUT: {
    message: 'El archivo genera un RUT de tercero duplicado.',
    suggestion: 'Conserva una sola fila por RUT y revisa los registros existentes.',
  },
  DUPLICATE_CONTRACT_NUMBER: {
    message: 'El archivo genera un número de contrato duplicado.',
    suggestion: 'Corrige los números de contrato antes de reintentar.',
  },
  DUPLICATE_CLIENT: {
    message: 'El archivo genera un cliente duplicado.',
    suggestion: 'Corrige el nombre o la organización relacionada antes de reintentar.',
  },
  DUPLICATE_PROJECT: {
    message: 'El archivo genera una orden de servicio duplicada.',
    suggestion: 'Corrige los datos de la orden antes de reintentar.',
  },
  INVALID_OPPORTUNITY_RUT: {
    message: 'Hay un RUT de oportunidad que no es válido.',
    suggestion: 'Corrige el RUT o deja el campo vacío cuando sea opcional.',
  },
};

/**
 * Validation in the domain layer can cover a cross-record invariant that has no
 * unambiguous CSV cell. Keep it structured and safe instead of leaking a
 * technical error. Row-level validations above still report every known cell.
 */
export function globalImportIssue(error) {
  const code = String(error?.code || '');
  const validationDomain = /^(INVALID_|DUPLICATE_|INCOMPLETE_|MISSING_|WORKER_|OVERLAPPING_|HOTEL_)/.test(code);
  if (!Number.isInteger(error?.status) || error.status < 400 || error.status >= 500 || !validationDomain) return null;
  const rule = GLOBAL_RULES[code] || {
    message: 'El archivo no cumple una regla de consistencia de la empresa.',
    suggestion: 'Revisa los datos relacionados y vuelve a cargar el archivo. Si persiste, contacta a soporte con la fecha de la carga.',
  };
  return importIssue({
    row: null,
    column: 'archivo',
    value: '',
    code,
    message: rule.message,
    suggestion: rule.suggestion,
  });
}
