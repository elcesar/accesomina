# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 10 de septiembre de 2026  
**Estado global:** Fases 0 a 5 cerradas.

## Estados

- **Actualizada:** recibió cambios funcionales, visuales o arquitectónicos.
- **Revisada:** fue contrastada con HTML/Page/wrapper de referencia.
- **Reemplazada:** sustituye una experiencia genérica o legacy anterior.

## Reglas transversales vigentes

- Revisar la referencia histórica antes de rediseñar una Page.
- Mantener una única fuente funcional de escritura por dominio y aliases legacy solo como lectura cuando corresponda.
- Recuperar el **layout conceptual útil** del HTML sin regresar la arquitectura de datos.
- `AppLayout` muestra el dominio/sección una sola vez; las Pages no deben repetirlo como kicker.
- Las acciones globales `+ Cliente`, `+ Contrato` y `+ Orden de servicio` pertenecen al Header y no se duplican dentro de las Pages.
- Las entidades con ficha propia deben ser navegables desde el contexto operacional.
- Densidad operacional media-alta: espaciado normal `--space-3/--space-4`, KPIs compactos y toolbars que no se conviertan en formularios extensos.
- Cuando existan muchos criterios de filtrado, mantener filtros principales visibles y secundarios bajo `Más filtros`.

## Pages registradas

| Área / fase | Page JSX | Estado | Actualización / decisión vigente |
| --- | --- | --- | --- |
| Sitio público | `LandingPage.jsx` | Actualizada | Sitio público React modernizado. |
| Acceso | `LoginPage.jsx` | Actualizada | Acceso alineado al Design System. |
| Fase 1 · Capital Humano | `TrabajadoresPage.jsx` | Actualizada · Revisada | Listado especializado de personas; mantiene tabs, filtros y grilla operacional. |
| Fase 1 · Capital Humano | `NuevoTrabajadorPage.jsx` | Actualizada · Revisada | Alta especializada de Persona. |
| Fase 1 · Capital Humano | `FichaTrabajadorPage.jsx` | Actualizada · Revisada | Ficha con asignaciones, documentación, formación, EPP, estadías e historial. |
| Fase 1 · Capital Humano | `TurnosPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza flujo genérico. Mantiene KPIs + filtros + tabla y agrega Cobertura/Jornadas. `turnos` es canónico. |
| Fase 1 · Capital Humano | `ProteccionEppPage.jsx` | Actualizada · Revisada · Reemplazada | Recupera layout histórico **Personas / Matriz por función / Historial de entregas**, segmentos y KPIs de personas. `eppDeliveries` canónico; `eppEntregas` legacy. |
| Fase 1 · Capital Humano | `FormacionPage.jsx` | Actualizada · Revisada · Reemplazada | Formación en `trabajadores[].workerItems`; `cursos` legacy. Incorpora contexto Cliente–Contrato–OS. Toolbar compacta: búsqueda + Cliente + `Más filtros` para Contrato, OS, Tipo y Estado. |
| Fase 1 · Capital Humano | `ExamenesPage.jsx` | Actualizada · Revisada · Reemplazada | Exámenes en `trabajadores[].workerItems`; `examenes` legacy. Incorpora contexto Cliente–Contrato–OS, vigencia y evidencia documental. |
| Fase 1 · Capital Humano | `SaludOcupacionalPage.jsx` | Actualizada · Revisada · Reemplazada | `protocolosSalud` canónico; seguimiento y evidencia por Persona. |
| Fase 1 · Capital Humano | `RestringidosPage.jsx` | Actualizada · Revisada · Reemplazada | `restricted` mantiene historial y sincroniza bloqueo/disponibilidad de Persona. Layout compacto con búsqueda + Estado. |
| Fase 2 · Clientes | `ClientesPage.jsx` | Actualizada · Revisada | Layout restaurado desde HTML: **filtros → grid de cards → ficha al abrir**. Sin auto-selección inicial. Conserva contactos, requisitos y relaciones Contrato/OS. `minas` canónico; `clientes` fallback. |
| Fase 3 · Contratos | `ContratosPage.jsx` | Actualizada · Revisada | Layout restaurado: **filtros/KPIs → tabla global → ficha al abrir**. Conserva documento contractual y relaciones Cliente/OS. |
| Fase 4 · Órdenes de servicio | `OrdenesServicioPage.jsx` | Actualizada · Revisada · Reemplazada | Layout restaurado: **filtros → cards operacionales → ficha al abrir**. Conserva preparación, personas, alojamientos, recursos, evidencia y cierre. Ficha con scroll vertical propio y header sticky. `mantenciones` canónico; `proyectos` fallback. |
| Fase 5 · Gestión Operacional | `ComunicacionesPage.jsx` | Actualizada · Revisada · Reemplazada | Comunicación/convocatoria contextual a OS y personas; KPIs derivados de `callouts` y navegación operacional. |
| Fase 5 · Gestión Operacional | `VehiculosPage.jsx` | Actualizada · Revisada · Reemplazada | Layout histórico operacional: filtros → KPIs → tabla global → ficha bajo demanda. `vehiculos` mantiene ownership. |
| Fase 5 · Gestión Operacional | `AlojamientosPage.jsx` | Actualizada · Revisada · Reemplazada | Layout histórico: cards de alojamientos + tabla global de estadías. `hoteles` catálogo; `hotelAsig` asignaciones/estadías. |
| Fase 5 · Gestión Operacional | `CredencialesPage.jsx` | Actualizada · Revisada · Reemplazada | Layout histórico: filtros → KPIs → tabla global → ficha bajo demanda. `credenciales` relacionada con Persona (`trabId`) y Cliente/faena (`minaId`). |
| Centro operativo y control | `DashboardPage.jsx` | Actualizada | Dashboard existente; cierre formal corresponde a Fase 13. |
| Centro operativo y control | `AlertasPage.jsx` | Actualizada | Alertas existentes; cierre formal corresponde a Fase 12. |

## Cierre Fase 1 · Capital Humano

**Estado:** CERRADA  
**Fecha:** 10 de septiembre de 2026

Cobertura: Personas, Turnos, EPP, Formación, Exámenes, Salud Ocupacional y Restringidos.

La revisión final contra el HTML confirmó que Personas y Turnos ya mantenían o mejoraban el patrón histórico. EPP recuperó su arquitectura de tres vistas y orientación a personas. Formación y Exámenes recuperaron el contexto comercial/operacional Cliente → Contrato → OS sin duplicar esas relaciones dentro de sus registros. Formación compactó la toolbar para respetar la densidad del Design System; Restringidos permanece con búsqueda + Estado por no requerir filtros adicionales.

## Cierre Fase 2 · Clientes

**Estado:** CERRADA  
**Fecha:** 10 de septiembre de 2026

La revisión final modificó el layout respecto del cierre preliminar. La vista raíz ya no usa lista lateral + ficha permanente ni selecciona automáticamente el primer registro. El patrón definitivo recuperado desde el HTML es:

`Filtros → Grid de clientes → Ficha 360 al abrir`

Se conservan los campos, contactos, requisitos, validaciones y relaciones modernas. `state.minas` sigue como fuente canónica de escritura; `state.clientes` permanece como fallback de lectura. Las acciones de creación globales permanecen exclusivamente en Header.

## Cierre Fase 3 · Contratos

**Estado:** CERRADA  
**Fecha:** 10 de septiembre de 2026

El layout definitivo recupera el patrón tabular del HTML:

`Filtros / KPIs → Tabla global de contratos → Ficha al abrir`

Se mantienen vigencia, responsable, estado, documento contractual, Cliente mediante `minaId`, OS mediante `contratoId` y navegación entre entidades. Firma Digital/plantillas contractuales legacy no se reactivan en esta fase. `+ Contrato` permanece en Header.

## Cierre Fase 4 · Órdenes de servicio

**Estado:** CERRADA  
**Fecha:** 10 de septiembre de 2026

El layout definitivo recupera:

`Filtros → Cards de OS → Ficha operacional al abrir`

La implementación React conserva requisitos, Cliente/Contrato, preparación de personas, asignaciones, recursos, alojamientos/estadías, evidencia y cierre. La ficha extensa dispone de scroll vertical propio y encabezado sticky. `mantenciones` continúa como fuente canónica; `proyectos` como fallback legacy; personas por `asignaciones.mantId`. `+ Orden de servicio` permanece en Header.

## Cierre Fase 5 · Gestión Operacional

**Estado:** CERRADA  
**Fecha:** 10 de septiembre de 2026

### Comunicaciones y convocatorias
Especialización completada con contexto OS, personas/elegibilidad, seguimiento y KPIs derivados del estado actual. El módulo no se convierte en mensajería genérica: su propósito es la coordinación operacional trazable.

### Flota y equipos móviles
`VehiculosPage.jsx` trabaja con `state.vehiculos` y recupera el layout tabular original. Administra identificación, disponibilidad, propiedad/arriendo, operador, Cliente/faena y OS. `inventoryItems` no absorbe Flota en esta fase.

### Alojamientos y estadías
`AlojamientosPage.jsx` utiliza `state.hoteles` como catálogo y `state.hotelAsig` como dueño de las estadías. Recupera cards de alojamiento y tabla global de asignaciones; Persona, Cliente y OS son navegables y no se duplican datos en sus entidades.

### Credenciales de acceso
`CredencialesPage.jsx` reemplaza el wrapper genérico y recupera filtros, KPIs, tabla global y ficha bajo demanda. Administra número de pase, emisión, vencimiento, zona, campamento, observación y respaldo existente. La relación se mantiene con Persona mediante `trabId` y Cliente/faena mediante `minaId`.

**Resultado:** los cuatro submódulos de Gestión Operacional están especializados y validados. Fase 5 se considera cerrada.

## Correcciones transversales registradas

### Creación desde Header
Las rutas `/nuevo` de Cliente, Contrato y OS instancian explícitamente formularios limpios. Las Pages no duplican las acciones globales del Header.

### Encabezados y densidad
`AppLayout` muestra una sola vez el dominio de Sidebar. Los títulos internos se alinean mediante el Design System. Se mantiene densidad media-alta y toolbars compactas; filtros secundarios pueden agruparse bajo `Más filtros`.

### Navegación contextual
Cliente, Contrato, OS, Persona y demás entidades con ficha propia deben renderizarse como enlaces cuando aparecen como contexto de otro módulo.

## Infraestructura legacy revisada

| Archivo | Rol |
| --- | --- |
| `ModuleWorkspacePage.jsx` | Wrapper/orquestación genérica utilizada como referencia para recuperar configuración y layout de origen. |
| `PrivateModulePage.jsx` | CRUD genérico legacy; referencia de campos, relaciones, permisos y evidencia. |
| `OperationalWorkspacePage.jsx` | Orquestador legacy de OS; referencia del flujo Crear → Requisitos → Recursos → Cierre. |

Estas piezas no son fuentes funcionales de los módulos especializados.

## Próximo punto

Con Fases 0–5 cerradas, el siguiente bloque de migración es **Fase 6 · Contratistas**. Cada nueva Page modificada o revisada debe incorporarse a esta trazabilidad.