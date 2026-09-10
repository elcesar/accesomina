# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

## Estados de seguimiento

- **Actualizada**: la página recibió cambios funcionales, visuales o arquitectónicos durante la migración.
- **Revisada**: la página fue contrastada con su referencia, versión anterior o flujo de origen para validar que la funcionalidad relevante se conserve.
- **Reemplazada**: la página actual sustituye una página o arquitectura anterior. Se registra también el origen reemplazado.
- Una página puede tener más de un estado.

## Regla de trabajo

- Registrar aquí cada `Page.jsx` que sea actualizado o revisado.
- Mantener el nombre real del archivo del repositorio.
- Cuando exista una versión anterior, indicar explícitamente qué página o flujo fue reemplazado.
- Antes de rediseñar un módulo, revisar sus archivos de referencia para identificar funcionalidad, campos, reglas, relaciones y flujos existentes.
- No incluir componentes auxiliares como páginas, aunque pueden mencionarse como parte de la trazabilidad de origen.
- Este listado debe seguir actualizándose a medida que avancemos con nuevas fases.

## Páginas registradas hasta ahora

| Área / fase | Page JSX actual | Estado | Origen / observación |
| --- | --- | --- | --- |
| Sitio público | `LandingPage.jsx` | Actualizada | Sitio público React modernizado y navegación por vistas. |
| Acceso | `LoginPage.jsx` | Actualizada | Pantalla de acceso alineada al Design System. |
| Fase 1 · Capital Humano | `TrabajadoresPage.jsx` | Actualizada | Listado especializado de personas. |
| Fase 1 · Capital Humano | `NuevoTrabajadorPage.jsx` | Actualizada · Revisada | Revisada contra archivo de referencia; se conserva la versión actual de `main` por ser funcional y arquitectónicamente más completa. |
| Fase 1 · Capital Humano | `FichaTrabajadorPage.jsx` | Actualizada · Revisada | Contrastada con archivo de referencia; conserva ficha, asignaciones, documentación, formación, EPP e historial. |
| Fase 1 · Capital Humano | `TurnosPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza `TurnosAsistenciaPage.jsx` y el flujo genérico `TurnosAsistenciaPage → ModuleWorkspacePage → PrivateModulePage`. `turnos` queda como fuente canónica y la asistencia como atributo de la jornada. |
| Fase 1 · Capital Humano | `FormacionPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el wrapper `FormacionPage.jsx → ModuleWorkspacePage → PrivateModulePage`. Nuevos cursos y certificaciones se consolidan en `trabajadores[].workerItems`; `state.cursos` queda como lectura legacy. |
| Fase 1 · Capital Humano | `ExamenesPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el wrapper `ExamenesPage.jsx → ModuleWorkspacePage → PrivateModulePage`. Los nuevos exámenes se consolidan en `trabajadores[].workerItems`; `state.examenes` queda como lectura legacy. Se incorporó evidencia documental asociada a la persona. |
| Fase 1 · Capital Humano | `SaludOcupacionalPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el wrapper `SaludOcupacionalPage.jsx → ModuleWorkspacePage → PrivateModulePage`. `protocolosSalud` es la fuente canónica y se incorporó evidencia documental asociada a la persona. |
| Fase 1 · Capital Humano | `RestringidosPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el wrapper `RestringidosPage.jsx → ModuleWorkspacePage → PrivateModulePage`. `restricted` mantiene el detalle de restricciones y sincroniza el estado operativo de `trabajadores`. |
| Fase 1 · Capital Humano | `ProteccionEppPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el wrapper `ProteccionEppPage.jsx → ModuleWorkspacePage → PrivateModulePage`. `eppDeliveries` es la fuente canónica; `eppEntregas` se mantiene como compatibilidad legacy. La versión especializada integra persona, tallas, inventario, certificación, entrega y reposición. |
| Fase 2 · Clientes | `ClientesPage.jsx` | Actualizada · Revisada | Contrastada con la implementación especializada de referencia. Conserva el layout lista + ficha, escribe en `minas`, mantiene `clientes` como fallback de lectura y preserva relaciones por `minaId` con contratos y órdenes de servicio. |
| Fase 3 · Contratos | `ContratosPage.jsx` | Actualizada · Revisada | Contrastada con la implementación especializada de referencia. Conserva `contratos` como fuente funcional, relación con clientes por `minaId`, órdenes por `contratoId`, documentación contractual y layout lista + ficha. Se alineó el estado con `StatusBadge` y se eliminó lenguaje técnico de la interfaz. |
| Fase 4 · Órdenes de servicio | `OrdenesServicioPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el wrapper `OrdenesServicioPage.jsx → OperationalWorkspacePage.jsx` con `moduleId="ordenes-servicio"`. La versión actual es especializada y trabaja con `mantenciones` como fuente de órdenes, además de clientes, contratos, asignaciones, personas, restricciones, salud, EPP y recursos. La revisión funcional profunda del orquestador legacy queda condicionada a disponer de `OperationalWorkspacePage.jsx` de referencia. |
| Centro operativo y control | `DashboardPage.jsx` | Actualizada | Dashboard operacional modernizado. |
| Centro operativo y control | `AlertasPage.jsx` | Actualizada | Gestión especializada de alertas. |

## Cierre de Fase 1 · Capital Humano

**Estado:** CERRADA  
**Fecha de cierre:** 10 de septiembre de 2026

La Fase 1 queda formalmente cerrada con cobertura funcional y trazabilidad de Personas, Turnos y asistencia, Protección EPP, Formación, Exámenes, Salud Ocupacional y Restringidos. Personas se documenta además mediante sus páginas especializadas de listado, alta y ficha.

Durante el cierre se contrastaron las páginas especializadas con sus referencias y flujos de origen, se identificaron las fuentes canónicas y legacy relevantes y se confirmó que los wrappers genéricos no deben convertirse en nuevas fuentes de verdad. Las diferencias funcionales detectadas se resolvieron dentro del módulo dueño correspondiente, manteniendo la arquitectura React de producción y el Design System vigente.

## Cierre de Fase 2 · Clientes

**Estado:** CERRADA  
**Fecha de cierre:** 10 de septiembre de 2026

La Fase 2 queda formalmente cerrada después de contrastar `ClientesPage.jsx` con su implementación especializada de referencia y validar visualmente la pantalla actual de producción.

La arquitectura funcional original se conserva: listado de clientes a la izquierda y ficha comercial del cliente seleccionado a la derecha. La versión actual amplía esta propuesta con búsqueda y filtro por estado, navegación directa por cliente y hacia sus relaciones, validación de duplicados, confirmación de acciones destructivas y alineación con el Design System.

`state.minas` se mantiene como fuente canónica estructural y clave de escritura; `state.clientes` permanece únicamente como fallback compatible de lectura. Las relaciones con contratos y órdenes de servicio continúan resolviéndose mediante `minaId`, evitando crear una fuente paralela para Clientes.

La revisión funcional y visual no detectó brechas relevantes que requieran cambios adicionales antes del cierre.

## Cierre de Fase 3 · Contratos

**Estado:** CERRADA  
**Fecha de cierre:** 10 de septiembre de 2026

La Fase 3 queda formalmente cerrada después de contrastar `ContratosPage.jsx` con su implementación especializada de referencia y validar que la versión de producción conserva la arquitectura funcional del módulo.

`state.contratos` se mantiene como fuente funcional y clave de escritura. Cada contrato conserva su relación con Cliente mediante `minaId` y las órdenes relacionadas se resuelven mediante `contratoId`. La página mantiene búsqueda, filtros por estado, indicadores de contratos vigentes, clientes con contrato y contratos con documento, además de carga y descarga de documentación contractual.

La propuesta de layout se conserva como listado de contratos a la izquierda y ficha del contrato seleccionado a la derecha. Como ajuste final de cierre, el estado del contrato en el listado utiliza el componente compartido `StatusBadge` y el texto técnico expuesto en la ficha fue reemplazado por lenguaje funcional orientado al usuario.

No se incorporó flujo de firmas en esta fase; la gestión de firma asociada a Libro de Obra permanece despriorizada para la etapa final según la secuencia acordada.

## Corrección transversal · Creación desde Header

**Fecha:** 10 de septiembre de 2026

Se corrigió el enrutamiento de las acciones globales `+ Cliente`, `+ Contrato` y `+ Orden de servicio` para que las rutas `/nuevo` instancien explícitamente el modo creación y presenten formularios limpios, sin reutilizar el registro previamente seleccionado para edición.

La corrección reside en `App.jsx` y no cambia las fuentes funcionales ni los estados de cierre de Clientes o Contratos. Se registra aquí porque afecta directamente el flujo de creación de `ClientesPage.jsx`, `ContratosPage.jsx` y `OrdenesServicioPage.jsx`.

## Infraestructura legacy / origen común revisado

Esta sección registra infraestructura de referencia utilizada para reconstruir el origen de páginas reemplazadas. Estos archivos **no se consideran módulos funcionales de Fase 1 ni se agregan a la tabla principal de Pages actualizadas**.

| Archivo / infraestructura | Estado | Rol en la migración |
| --- | --- | --- |
| `ModuleWorkspacePage.jsx` | Revisado · Infraestructura legacy | Wrapper que resuelve el módulo solicitado y delega la experiencia a la infraestructura genérica. Forma parte del origen común de Turnos, Formación, Exámenes, Salud Ocupacional, EPP y Restringidos. |
| `PrivateModulePage.jsx` | Revisado · Infraestructura legacy | Implementación CRUD genérica utilizada por los wrappers de referencia. Se revisó para recuperar campos, relaciones, permisos y comportamiento de origen, pero no se adopta como fuente funcional de los módulos especializados. |
| `OperationalWorkspacePage.jsx` | Pendiente de revisión | Orquestador legacy utilizado por el wrapper de referencia de Órdenes de servicio. La referencia confirma la cadena `OrdenesServicioPage.jsx → OperationalWorkspacePage.jsx`; falta disponer del contenido de este archivo para una comparación funcional profunda. |

La cadena legacy común validada para varios módulos de Capital Humano es:

`Page legacy` → `ModuleWorkspacePage.jsx` → `PrivateModulePage.jsx` → configuración del módulo.

La especialización actual reemplaza esa experiencia genérica cuando existe una página funcional dedicada, conservando únicamente las reglas y relaciones de origen que siguen siendo válidas.

## Trazabilidad específica · Turnos y asistencia

La revisión del módulo de Turnos confirmó el siguiente origen:

`TurnosAsistenciaPage.jsx` → `ModuleWorkspacePage.jsx` → `PrivateModulePage.jsx` → configuración de `turnos-asistencia`.

La implementación anterior era una experiencia genérica configurada para planificar turnos, vincular personas y relacionarlos con órdenes de servicio. Declaraba `turnos` y `asistencias` como fuentes visibles, pero su `writeKey` ya era `turnos`.

`TurnosPage.jsx` reemplaza esa experiencia genérica por una implementación especializada que trabaja con `turnos`, `trabajadores`, `mantenciones`, `minas` y `asignaciones`, e incorpora cobertura, brechas, régimen, turno, asistencia, horarios y horas hombre.

El backend actual valida explícitamente `state.turnos`, sus relaciones con persona y servicio y la unicidad por persona, fecha y turno. Por ello, `turnos` se considera la fuente canónica actual; no se mantiene una colección operacional separada de `asistencias`.

## Trazabilidad específica · Formación y certificaciones

La revisión del módulo de Formación confirmó el siguiente origen:

`FormacionPage.jsx` → `ModuleWorkspacePage.jsx` → `PrivateModulePage.jsx` → configuración de `formacion`.

La página anterior era únicamente un wrapper hacia la experiencia genérica. El catálogo conceptual asociaba Formación con `cursos` y `trabajadores`, y utilizaba `cursos` como clave de escritura.

La implementación especializada actual conserva el propósito de administrar cursos, certificaciones y vigencias por persona, y amplía el flujo con búsqueda, filtros por tipo y estado, indicadores de vigencia, evidencia documental y navegación hacia la ficha de la persona.

Los nuevos registros se almacenan en `trabajadores[].workerItems` con tipo `curso` o `certificacion`. `state.cursos` se conserva como fuente legacy de solo lectura durante la migración, evitando duplicar registros ya presentes en la fuente canónica.

## Trazabilidad específica · Exámenes y aptitudes

La revisión del módulo de Exámenes confirmó el siguiente origen:

`ExamenesPage.jsx` → `ModuleWorkspacePage.jsx` → `PrivateModulePage.jsx` → configuración de `examenes`.

La página anterior era un wrapper hacia la experiencia genérica. La implementación especializada actual administra examen o aptitud, resultado, vencimiento, observaciones y estado por persona, con búsqueda, filtros e indicadores de vigencia.

Los nuevos registros se almacenan en `trabajadores[].workerItems` con tipo `examen`; `state.examenes` se conserva como fuente legacy de solo lectura y se evita duplicar registros ya consolidados en la persona.

Como parte de la revisión se identificó la ausencia de respaldo documental en la página especializada. Se incorporó carga de evidencia mediante `/api/files`, asociada como `worker_document` a la persona, guardando `fileId`, `fileName`, `fileType` y `fileSize` dentro del registro de examen. La tabla de Exámenes muestra además la evidencia registrada.

## Trazabilidad específica · Salud Ocupacional

La revisión del módulo de Salud Ocupacional confirmó el siguiente origen:

`SaludOcupacionalPage.jsx` → `ModuleWorkspacePage.jsx` → `PrivateModulePage.jsx` → configuración de `salud-ocupacional`.

La página anterior era un wrapper hacia la experiencia genérica. La implementación especializada actual separa Salud Ocupacional de los exámenes de aptitud y administra protocolos y seguimientos asociados a persona, riesgo o exposición, responsable y estado.

La fuente canónica actual es `state.protocolosSalud`. Los registros se vinculan directamente con `trabajadores` mediante `workerId` y permiten navegar desde el seguimiento hacia la ficha de la persona.

Como parte de la revisión se incorporó respaldo documental al flujo. La evidencia se carga mediante `/api/files`, asociada como `worker_document` a la persona, y el protocolo guarda `fileId`, `fileName`, `fileType` y `fileSize`. La tabla de Salud Ocupacional muestra además la evidencia registrada.

## Trazabilidad específica · Protección personal / EPP

La revisión del módulo de Protección personal / EPP confirmó el siguiente origen:

`ProteccionEppPage.jsx` → `ModuleWorkspacePage.jsx` → `PrivateModulePage.jsx` → configuración de `proteccion-epp`.

La página anterior era un wrapper hacia la experiencia genérica. La implementación especializada actual administra entregas de EPP por persona, con equipo, talla o medida, marca o modelo, certificación, fecha de entrega, fecha de reposición y observaciones.

La fuente canónica actual es `state.eppDeliveries`. `state.eppEntregas` se mantiene como compatibilidad legacy durante la migración. El módulo se relaciona con `trabajadores` y, cuando existe correspondencia, con `inventoryItems` para seleccionar el EPP del inventario.

La versión especializada además sugiere tallas a partir de la información registrada en la ficha de la persona y calcula el estado de reposición como vigente, próxima, vencida o sin información. No se agregó evidencia documental genérica en esta revisión, porque el registro principal representa una entrega física y un futuro respaldo debería tratarse como constancia específica de entrega o recepción.

## Trazabilidad específica · Restringidos

La revisión del módulo de Restringidos confirmó el siguiente origen:

`RestringidosPage.jsx` → `ModuleWorkspacePage.jsx` → `PrivateModulePage.jsx` → configuración de `restringidos`.

La página anterior era un wrapper hacia la experiencia genérica. La implementación especializada actual administra restricciones por persona con motivo, período, alcance y observaciones, y calcula si cada restricción se encuentra vigente o finalizada.

`state.restricted` mantiene el detalle e historial de las restricciones. Al registrar una nueva restricción, el módulo actualiza también `trabajadores`, marcando a la persona con `bloqueado: true` y `disponibilidad: 'bloqueado'`, de forma que el estado operacional se refleje inmediatamente en los demás módulos.

Durante la transición también se detectan como restricciones implícitas las personas que ya se encuentran bloqueadas en `trabajadores` aunque todavía no exista un registro equivalente en `restricted`. No se agregó evidencia documental genérica, porque la evidencia debe permanecer en el módulo funcional que origina la restricción cuando corresponda.

## Trazabilidad específica · Órdenes de servicio

La referencia revisada de Fase 4 corresponde a un wrapper mínimo:

`OrdenesServicioPage.jsx` → `OperationalWorkspacePage.jsx` con `moduleId="ordenes-servicio"`.

La página de producción actual reemplaza ese wrapper por una implementación especializada. Trabaja con `state.mantenciones` como fuente de órdenes de servicio y con `state.asignaciones` para la vinculación de personas. También consume `minas`, `contratos`, `trabajadores`, `restricted`, `protocolosSalud`, `eppDeliveries` / `eppEntregas`, `inventoryItems` y `vehiculos` para preparación operacional y relaciones existentes.

La implementación actual ya incorpora creación y edición, relación Cliente–Contrato, validación de coherencia entre cliente y contrato, responsables, fechas, estado, cierre con observación, búsqueda y filtros, asignación de personas, evaluación de brechas de preparación y recursos relacionados.

Con la referencia disponible se confirma que la página especializada **reemplaza** la arquitectura wrapper anterior. No se inventan reglas adicionales del `OperationalWorkspacePage.jsx` legacy que no estén respaldadas por su archivo de referencia; por ello, la comparación profunda de ese orquestador queda pendiente hasta disponer de dicho archivo.

## Seguimiento

A partir de este punto, cada página JSX que sea modificada, revisada contra su origen o utilizada para reemplazar una página anterior debe incorporarse a este documento. Cuando corresponda, registrar también la página o arquitectura reemplazada para mantener la trazabilidad de la migración.
