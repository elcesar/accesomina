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
| Fase 1 · Capital Humano | `RestringidosPage.jsx` | Actualizada | Módulo especializado de personas restringidas. |
| Fase 1 · Capital Humano | `ProteccionEppPage.jsx` | Actualizada | Módulo especializado de protección personal / EPP. |
| Fase 2 · Clientes | `ClientesPage.jsx` | Actualizada | Módulo especializado de clientes; mantiene compatibilidad con la fuente estructural actual. |
| Fase 3 · Contratos | `ContratosPage.jsx` | Actualizada | Módulo especializado de contratos. |
| Fase 4 · Órdenes de servicio | `OrdenesServicioPage.jsx` | Actualizada | Módulo especializado de órdenes de servicio y preparación operacional. |
| Centro operativo y control | `DashboardPage.jsx` | Actualizada | Dashboard operacional modernizado. |
| Centro operativo y control | `AlertasPage.jsx` | Actualizada | Gestión especializada de alertas. |

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

## Seguimiento

A partir de este punto, cada página JSX que sea modificada, revisada contra su origen o utilizada para reemplazar una página anterior debe incorporarse a este documento. Cuando corresponda, registrar también la página o arquitectura reemplazada para mantener la trazabilidad de la migración.
