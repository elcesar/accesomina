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
| Fase 1 · Capital Humano | `FormacionPage.jsx` | Actualizada | Módulo especializado de formación y certificaciones. |
| Fase 1 · Capital Humano | `ExamenesPage.jsx` | Actualizada | Módulo especializado de exámenes y aptitudes. |
| Fase 1 · Capital Humano | `SaludOcupacionalPage.jsx` | Actualizada | Módulo especializado de salud ocupacional. |
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

## Seguimiento

A partir de este punto, cada página JSX que sea modificada, revisada contra su origen o utilizada para reemplazar una página anterior debe incorporarse a este documento. Cuando corresponda, registrar también la página o arquitectura reemplazada para mantener la trazabilidad de la migración.
