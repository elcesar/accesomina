# Panel de control por rol

## Objetivo
Priorizar el trabajo pendiente según responsabilidades del usuario, respetando simultáneamente su rol, permisos explícitos y los módulos habilitados para la empresa.

## Regla de visibilidad efectiva

Una tarjeta, indicador, lista o acción sólo está disponible cuando se cumplen las tres condiciones:

```text
Permiso del usuario para el módulo
          +
Módulo habilitado para el tenant
          +
Regla de visibilidad del rol
          ↓
Contenido visible y navegable
```

Si una condición falla, el panel no muestra el KPI, su lista, conteo, acción ni enlace. La restricción se aplica también al destino de la URL; ocultar una tarjeta no sustituye el control de acceso del módulo.

Ejemplos:

- Un usuario RR.HH. con permiso Personas no ve Personas si ese módulo está deshabilitado para su empresa.
- Un Client Admin puede ver EPP cuando EPP está habilitado, pero no ve indicadores ni accesos de Libro de Obra cuando ese módulo está deshabilitado.

## Fuentes canónicas de indicadores

El panel no recalcula reglas de negocio que ya resuelven los módulos de origen. Cada KPI consume la fuente canónica correspondiente y conserva sus filtros al navegar.

| Indicador | Fuente oficial | Destino |
| --- | --- | --- |
| Personas no habilitadas | Motor de habilitación del PR #40 | Personas filtradas por estado no habilitado |
| Brechas documentales | Matriz de requisitos del PR #39 | Persona / requisitos pendientes |
| Alertas pendientes | Motor de alertas del PR #41 | Alertas con el mismo conjunto filtrado |
| EPP pendiente | Módulo de EPP habilitado | Lista EPP con filtro equivalente |

El conteo del indicador y su lista de destino deben representar exactamente el mismo conjunto de registros bajo el mismo tenant, fecha y filtros de acceso.

## Vista general

La vista general no es una excepción a permisos ni módulos. Reorganiza información permitida para el usuario, pero no revela datos, conteos, enlaces o acciones que no pueda consultar desde los módulos de origen.

Cuando no existan módulos disponibles para una sección, el panel presenta un estado vacío permitido, sin sugerir enlaces directos a funcionalidades deshabilitadas.

## Criterios de aceptación
1. Client Admin, RR.HH., Prevención, Acreditación y consulta ven paneles pertinentes a su rol.
2. Todo KPI, lista, acción y enlace requiere permiso efectivo y módulo habilitado para el tenant.
3. Un módulo deshabilitado no se expone en el panel ni puede consultarse desde sus enlaces directos.
4. Cada indicador usa la fuente canónica de su módulo; no replica cálculos de habilitación, requisitos ni alertas.
5. Cada indicador enlaza a una lista filtrada con exactamente el mismo conjunto contado.
6. La vista general mantiene permisos y módulos habilitados; no revela información adicional.

## Pruebas
- Matriz rol × permiso × módulo habilitado, validando tarjetas, conteos, acciones y URLs.
- RR.HH. con permiso Personas y módulo Personas deshabilitado: no ve KPI, lista ni acción de Personas.
- Client Admin con EPP habilitado y Libro de Obra deshabilitado: ve sólo EPP y no recibe enlaces de Libro de Obra.
- Indicador de personas no habilitadas coincide con el resultado del motor del PR #40 y su lista destino.
- Indicador de alertas pendientes coincide con el motor del PR #41 y su lista destino.
- Vista general para cada rol: no muestra datos ni enlaces de módulos sin permiso o deshabilitados.
