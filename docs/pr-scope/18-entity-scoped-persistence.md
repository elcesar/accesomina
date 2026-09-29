# Persistencia segura por entidad y errores accionables

## Prioridad

P0 antes de ampliar el uso productivo. Este plan complementa los PR #43 y #55: aquellos protegen importaciones y datos historicos; este define como las altas y ediciones manuales se guardan sin quedar bloqueadas por datos legacy ajenos.

## Objetivo

Permitir crear y editar una Persona, Cliente, Contrato, Orden de Servicio, Entrega EPP, Vehiculo, Bodega, Alojamiento u otra entidad valida aunque el tenant contenga una inconsistencia historica no relacionada. Cada operacion debe validar exclusivamente la entidad y relaciones que modifica.

## Problema que resuelve

La carga completa del estado y el guardado de colecciones completas pueden hacer fallar una alta valida por un telefono, RUT o relacion legacy de otro registro. El usuario recibe un conflicto generico sin saber que campo corregir.

## Alcance funcional

- Operaciones de crear, editar y eliminar dirigidas a una entidad o relacion concreta.
- Validacion del registro nuevo y de sus referencias directas antes de persistir.
- Proteccion contra duplicados por clave estable de cada dominio.
- Mapeo de errores a campo, relacion o regla concreta; no usar un mensaje generico para conflictos distintos.
- Concurrencia: no sobrescribir cambios de otra persona sin deteccion o resolucion explicita.
- Bitacora de quien creo, modifico o rechazo una operacion y por que.

## Reglas

1. Un dato legacy ajeno no invalida una alta valida.
2. La validacion global historica sigue existiendo para diagnostico y consolidacion, pero no es una precondicion de toda escritura.
3. Una regla del registro nuevo nunca se flexibiliza: RUT, telefono, unicidad, referencias y restricciones del dominio se mantienen.
4. El servidor es la fuente final de integridad; la interfaz replica la regla para prevenir errores antes de enviar.
5. Si hay un conflicto real, la respuesta identifica la entidad, campo o relacion involucrada y la accion posible.

## Dominios iniciales

Personas, Clientes, Contratos, Ordenes de Servicio, Entregas EPP, Vehiculos, Bodegas y Alojamientos. Cada nuevo dominio se incorpora solo cuando su validacion de alta sea equivalente a la validacion estricta.

## Criterios de aceptacion

1. Una Persona valida se crea aunque exista otro trabajador legacy con telefono invalido.
2. Un Cliente, Contrato u OS validos se crean sin revalidar colecciones no relacionadas.
3. EPP, Vehiculos, Bodegas y Alojamientos aplican sus reglas de duplicado especificas sin bloquearse por otra coleccion.
4. RUT, telefono, patente, serie, codigo y referencias duplicadas se rechazan con causa concreta.
5. Un guardado correcto muestra confirmacion y limpia los avisos previos; un error se marca en el campo o contexto afectado.
6. Dos ediciones simultaneas no eliminan silenciosamente datos de la otra.
7. Todas las operaciones quedan aisladas por tenant y auditadas.

## Pruebas requeridas

- Datos legacy inconsistentes y alta valida de cada dominio inicial.
- Duplicados de RUT, cliente/contrato/codigo OS, patente/serie, item EPP y habitacion.
- Referencias inexistentes o de otro tenant.
- Dos administradores editando el mismo registro.
- Pruebas E2E desde formulario hasta registro visible y bitacora.

## Fuera de alcance

No migra ni corrige automaticamente datos historicos; esa consolidacion corresponde al PR #55. No cambia reglas de requisitos ni habilitacion; esas corresponden a los PR #39, #40 y #41.
