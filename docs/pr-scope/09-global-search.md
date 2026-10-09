# Búsqueda global

## Objetivo
Encontrar rápidamente entidades autorizadas dentro de la empresa actual, aplicando aislamiento tenant, permisos y módulos habilitados antes de entregar cualquier resultado.

## Control de acceso previo a la búsqueda

La búsqueda no consulta ni devuelve resultados fuera del alcance efectivo del usuario:

```text
Tenant actual
      +
Permiso de consulta para el módulo
      +
Módulo habilitado para el tenant
      ↓
Entidades buscables y resultados visibles
```

Una persona de otro tenant nunca aparece. Una persona del mismo tenant tampoco aparece si el usuario no tiene permiso para Personas o si el módulo está deshabilitado. La verificación se realiza en el servidor antes de buscar, no sólo al ocultar resultados en la interfaz.

Cuando un permiso o módulo se revoca, consultas posteriores y aperturas de resultados dejan de estar autorizadas aunque el resultado haya sido visible previamente.

## Campos indexables y privacidad

Cada entidad expone únicamente campos que el usuario ya puede consultar desde su módulo:

| Entidad | Campos buscables | Contexto mostrado |
| --- | --- | --- |
| Persona | nombre, RUT, cargo, especialidad | Cliente/OS cuando esté autorizado |
| Cliente | nombre, RUT, mandante, contacto autorizado | Región y contratos autorizados |
| Contrato | nombre, número/código, cliente | Vigencia y cliente |
| Orden de Servicio | nombre, código, cliente, contrato | Estado y fechas |
| Activo | nombre, código, patente/serie autorizada | Bodega o estado autorizado |
| Documento | tipo, código/referencia y metadatos permitidos | Entidad dueña y vigencia |

El contenido de archivos nunca se indexa ni se expone como resultado. Nombre, tipo, emisor, fechas u otros metadatos documentales sólo son buscables si el usuario tiene permiso para consultar el documento y su entidad dueña.

## Normalización y ranking

RUT usa la misma normalización definida en PR #37. Por tanto, `138483797` y `13.848.379-7` localizan el mismo registro. El motor conserva el valor formateado sólo para presentación.

Los resultados se agrupan por tipo y se ordenan por coincidencia exacta de identificador, coincidencia exacta de nombre, coincidencia por prefijo y coincidencia parcial. Para homónimos, se muestra tipo y contexto autorizado, por ejemplo: `Juan Pérez — Persona — Cliente ABC` y `Juan Pérez — Contacto — Cliente XYZ`.

Cada resultado incluye una ruta de destino que abre la ficha o sección exacta, aplicando nuevamente los controles de acceso al navegar.

## Criterios de aceptación
1. Resultados separados por tipo y restringidos al tenant antes de ejecutar la búsqueda.
2. Cada resultado exige permiso de consulta y módulo habilitado en el tenant, tanto al buscar como al abrir su destino.
3. Muestra contexto suficiente para distinguir homónimos sin revelar información no autorizada.
4. Documentos sólo exponen metadatos autorizados; nunca contenido de archivos.
5. Soporta RUT con y sin puntuación mediante normalización canónica.
6. Ranking consistente por identificador, nombre exacto, prefijo y coincidencia parcial.

## Pruebas
- Búsqueda por nombre, RUT, código contractual y activo.
- RUT con y sin puntuación retorna el mismo registro autorizado.
- Aislamiento tenant: una entidad de otra empresa no aparece.
- Usuario sin permiso de Personas no obtiene personas del mismo tenant.
- Módulo Personas deshabilitado: no entrega resultados ni permite acceder por URL.
- Homónimos con tipo y contexto diferente se distinguen correctamente.
- Documento sin permiso de consulta: no expone nombre ni metadatos.
- Resultado visible que pierde permiso: una nueva consulta y su destino quedan bloqueados.
