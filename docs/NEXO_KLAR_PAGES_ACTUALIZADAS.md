# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 10 de septiembre de 2026  
**Estado global:** Fases 0 a 7 cerradas.

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
- Las grillas operacionales deben intentar caber completas en una ventana de escritorio, compactando acciones, anchos y contenido antes de recurrir a scroll horizontal.

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
| Fase 6 · Contratistas | `TercerosSubcontratosPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza `TercerosSubcontratosPage → OperationalWorkspacePage`. Recupera layout HTML **filtros → KPIs → tabla global → ficha al abrir**. `subcontratos` es fuente de escritura. El listado incluye vencimientos F30, F30-1, cotizaciones y seguro como indicadores compactos con estado y días restantes/vencidos. |
| Fase 6 · Contratistas | `ConveniosPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza wrapper `ModuleWorkspacePage`. Recupera layout HTML **KPIs → filtros → tabla de empresa / contrato-convenio / OC / vigencia**. `convenios` es fuente canónica; lectura legacy desde datos históricos de `subcontratos` cuando corresponde. |
| Fase 6 · Contratistas | `PersonalEmpresaServiciosPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza wrapper genérico. Usa `personalContratista` como relación Empresa ↔ Persona y mantiene `trabajadores` como dueño de la Persona. Layout con KPIs, filtros y tabla Empresa / Persona / Cargo / Habilitación / Restricción, con navegación a ficha de Persona. |
| Fase 6 · Contratistas | `HabilitacionesCumplimientoPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza wrapper genérico. Recupera layout HTML centrado en **Empresa / Base documental / Pendientes / Estado / Revisión**. `habilitaciones` mantiene requisitos laborales, previsionales, seguridad, seguros y exigencias del cliente, con avance documental y fallback visual legacy. |
| Fase 6 · Contratistas | `EvaluacionDesempenoPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza wrapper genérico. Recupera matriz HTML por empresa con notas 1–5 para **Cumplimiento / Seguridad / Calidad-servicio**, resultado consolidado y clasificación. `evaluaciones` es la fuente especializada; datos legacy de `subcontratos` solo sirven como fallback inicial. |
| Fase 7 · Cumplimiento | `CumplimientoCorporativoPage.jsx` | Actualizada · Revisada · Reemplazada | Recupera el layout histórico de documentación corporativa con KPIs, ficha de empresa, filtros y requisitos documentales. `empresaDocs` es fuente canónica; `documentosEmpresa` queda como fallback de lectura. Incluye evidencia local/link, vigencia, observación y estados derivados. |
| Fase 7 · Cumplimiento | `HabilitacionClientePage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza `ModuleWorkspacePage`. Recupera la habilitación por Cliente y objeto con KPIs, filtros y grilla compacta de **Entidad / Cliente / Estado / Responsable-plazo / Observación / Evidencia**. `acreditacionesMandante` es fuente especializada de escritura. Los cambios de estado usan actualización optimista para reflejar inmediatamente valores como `Corregido`. |
| Fase 7 · Cumplimiento | `IncidentesPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza wrapper genérico y recupera layout HTML **filtros → KPIs → tabla global → seguimiento al abrir**. `incidentes` es fuente canónica. El cierre exige seguimiento y evidencia; la grilla fue compactada para mantener la acción `Abrir seguimiento` dentro del viewport. |
| Fase 7 · Cumplimiento | `AuditoriaPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza `OperationalWorkspacePage`. Recupera vista de auditoría operacional sobre personas, requisitos y estado de habilitación. Es una vista derivada sobre `trabajadores[].workerItems`, relaciones y fuentes existentes; no crea un dominio documental paralelo. |
| Centro operativo y control | `DashboardPage.jsx` | Actualizada | Dashboard existente; cierre formal corresponde a Fase 13. |
| Centro operativo y control | `AlertasPage.jsx` | Actualizada | Alertas existentes; cierre formal corresponde a Fase 12. |

## Cierres de fases

### Fase 1 · Capital Humano — CERRADA
**Fecha:** 10 de septiembre de 2026

Cobertura: Personas, Turnos, EPP, Formación, Exámenes, Salud Ocupacional y Restringidos. EPP recuperó sus tres vistas históricas; Formación y Exámenes incorporaron contexto Cliente → Contrato → OS y se mantuvieron las fuentes canónicas definidas.

### Fase 2 · Clientes — CERRADA
**Fecha:** 10 de septiembre de 2026

Layout definitivo: `Filtros → Grid de clientes → Ficha 360 al abrir`. `state.minas` sigue como fuente canónica de escritura; `state.clientes` queda como fallback.

### Fase 3 · Contratos — CERRADA
**Fecha:** 10 de septiembre de 2026

Layout definitivo: `Filtros / KPIs → Tabla global → Ficha al abrir`. Se mantienen Cliente por `minaId`, OS por `contratoId` y documentación contractual.

### Fase 4 · Órdenes de servicio — CERRADA
**Fecha:** 10 de septiembre de 2026

Layout definitivo: `Filtros → Cards de OS → Ficha operacional al abrir`. `mantenciones` continúa como fuente canónica; `proyectos` como fallback legacy; personas por `asignaciones.mantId`.

### Fase 5 · Gestión Operacional — CERRADA
**Fecha:** 10 de septiembre de 2026

Comunicaciones, Flota, Alojamientos/estadías y Credenciales quedaron especializados, contrastados con su origen y alineados al Design System.

### Fase 6 · Contratistas — CERRADA
**Fecha:** 10 de septiembre de 2026

La fase queda cerrada con sus cinco módulos especializados:

1. **Terceros y subcontratos:** `TercerosSubcontratosPage.jsx` recupera el layout tabular del HTML, ficha bajo demanda y control visual de vencimientos F30, F30-1, cotizaciones y seguro. `subcontratos` mantiene ownership de la empresa colaboradora.
2. **Contratos y convenios:** `ConveniosPage.jsx` administra contratos, convenios y órdenes de compra de terceros sobre `convenios`, vinculados a `subcontratoId`.
3. **Personal del contratista:** `PersonalEmpresaServiciosPage.jsx` administra únicamente la relación Empresa ↔ Persona mediante `personalContratista`; la ficha y capacidades de la Persona permanecen en `trabajadores`.
4. **Habilitaciones y cumplimiento:** `HabilitacionesCumplimientoPage.jsx` gestiona base documental, pendientes, requisitos y estado mediante `habilitaciones`.
5. **Evaluación de desempeño:** `EvaluacionDesempenoPage.jsx` recupera la matriz de notas del HTML y guarda la evaluación especializada en `evaluaciones`.

**Resultado:** Fase 6 cerrada sin duplicar Persona, Contrato ni datos de cumplimiento. Las relaciones se almacenan en sus módulos dueños y se presentan de forma contextual desde Contratistas.

### Fase 7 · Cumplimiento — CERRADA
**Fecha:** 10 de septiembre de 2026

La fase queda cerrada con cuatro módulos especializados y contrastados con el HTML histórico:

1. **Documentación de la Empresa:** `CumplimientoCorporativoPage.jsx` administra los requisitos corporativos sobre `empresaDocs`, con `documentosEmpresa` solo como fallback de lectura. Mantiene KPIs, ficha de empresa, vigencias, observaciones y evidencia.
2. **Habilitación del Cliente:** `HabilitacionClientePage.jsx` administra el estado de habilitación por Cliente y entidad sobre `acreditacionesMandante`, con responsable, plazo, observación y evidencia. Los cambios de estado se reflejan inmediatamente mediante actualización optimista.
3. **Incidentes y no conformidades:** `IncidentesPage.jsx` administra `incidentes`, acciones correctivas, responsable, compromiso y seguimiento. El cierre requiere verificación y evidencia y se realiza desde el seguimiento, no desde la grilla.
4. **Auditoría:** `AuditoriaPage.jsx` consolida una vista de control sobre personas, relaciones y requisitos existentes. Se mantiene como vista derivada y no duplica documentación ni estados fuente.

**Resultado:** Fase 7 cerrada manteniendo la secuencia Cliente → Contrato → OS → Persona y separando claramente documentación corporativa, habilitación del mandante, eventos de cumplimiento y auditoría.

## Correcciones transversales registradas

### Creación desde Header
Las rutas `/nuevo` de Cliente, Contrato y OS instancian explícitamente formularios limpios. Las Pages no duplican las acciones globales del Header.

### Encabezados y densidad
`AppLayout` muestra una sola vez el dominio de Sidebar. Los títulos internos se alinean mediante el Design System. Se mantiene densidad media-alta y toolbars compactas; filtros secundarios pueden agruparse bajo `Más filtros`.

### Grillas de escritorio
Las grillas operacionales deben priorizar `width: 100%`, `table-layout: fixed`, anchos controlados, truncamiento y acciones compactas antes de introducir scroll horizontal. En Fase 7 se aplicó explícitamente a Documentación de la Empresa e Incidentes.

### Navegación contextual
Cliente, Contrato, OS, Persona y demás entidades con ficha propia deben renderizarse como enlaces cuando aparecen como contexto de otro módulo.

## Infraestructura legacy revisada

| Archivo | Rol |
| --- | --- |
| `ModuleWorkspacePage.jsx` | Wrapper/orquestación genérica utilizada como referencia para recuperar configuración y layout de origen. |
| `PrivateModulePage.jsx` | CRUD genérico legacy; referencia de campos, relaciones, permisos y evidencia. |
| `OperationalWorkspacePage.jsx` | Orquestador legacy; referencia de flujos históricos de módulos operacionales y Terceros. |

Estas piezas no son fuentes funcionales de los módulos especializados.

## Próximo punto

Con Fases 0–7 cerradas, el siguiente bloque es **Fase 8 · Inventario / Activos**. Cada nueva Page modificada o revisada debe incorporarse a esta trazabilidad.