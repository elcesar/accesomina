# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 11 de septiembre de 2026  
**Estado global:** Fases 0 a 14 cerradas.

## Estados

- **Actualizada:** recibió cambios funcionales, visuales o arquitectónicos.
- **Revisada:** fue contrastada con HTML/Page/wrapper de referencia.
- **Reemplazada:** sustituye una experiencia genérica o legacy anterior.

## Reglas transversales vigentes

- Revisar la referencia histórica antes de rediseñar una Page.
- Mantener una única fuente funcional de escritura por dominio y aliases legacy solo como lectura cuando corresponda.
- El HTML histórico es la **referencia primaria de layout, distribución y jerarquía funcional**. React moderniza estilos y componentes sin inventar otra estructura cuando el HTML ya define una lógica útil.
- `AppLayout` muestra el dominio/sección una sola vez; las Pages no deben repetirlo como kicker.
- Las acciones globales `+ Cliente`, `+ Contrato` y `+ Orden de servicio` pertenecen al Header y no se duplican dentro de las Pages.
- Las entidades con ficha propia deben ser navegables desde el contexto operacional.
- Las vistas consolidadas leen señales de los módulos dueños y navegan hacia ellos para resolver brechas; no duplican ownership.
- Alertas es una **vista derivada y priorizada**: combina alertas persistidas con señales calculadas desde los módulos dueños; no reemplaza esos módulos ni crea una fuente maestra paralela.
- Dashboard es una **vista ejecutiva derivada**: no mantiene ownership propio y reutiliza las fuentes canónicas de los módulos dueños.
- Dashboard y Alertas comparten un único motor de alertas operacionales (`services/operational-alerts.js`) para evitar métricas divergentes.
- Densidad operacional media-alta: espaciado normal `--space-3/--space-4`, KPIs compactos y toolbars que no se conviertan en formularios extensos.
- Cuando existan muchos criterios de filtrado, mantener filtros principales visibles y secundarios bajo `Más filtros`.
- Las grillas operacionales deben intentar caber completas en una ventana de escritorio, compactando acciones, anchos y contenido antes de recurrir a scroll horizontal.

## Pages registradas

| Área / fase | Page JSX | Estado | Actualización / decisión vigente |
| --- | --- | --- | --- |
| Sitio público | `LandingPage.jsx` | Actualizada | Sitio público React modernizado. |
| Acceso | `LoginPage.jsx` | Actualizada | Acceso alineado al Design System. |
| Fase 1 · Capital Humano | `TrabajadoresPage.jsx` | Actualizada · Revisada | Listado especializado de personas. |
| Fase 1 · Capital Humano | `NuevoTrabajadorPage.jsx` | Actualizada · Revisada | Alta especializada de Persona. |
| Fase 1 · Capital Humano | `FichaTrabajadorPage.jsx` | Actualizada · Revisada | Ficha con asignaciones, documentación, formación, EPP, estadías e historial. |
| Fase 1 · Capital Humano | `TurnosPage.jsx` | Actualizada · Revisada · Reemplazada | `turnos` es canónico; mantiene KPIs, filtros, cobertura y jornadas. |
| Fase 1 · Capital Humano | `ProteccionEppPage.jsx` | Actualizada · Revisada · Reemplazada | Personas / matriz por función / historial. `eppDeliveries` canónico; `eppEntregas` legacy. |
| Fase 1 · Capital Humano | `FormacionPage.jsx` | Actualizada · Revisada · Reemplazada | Formación en `trabajadores[].workerItems`; `cursos` legacy. |
| Fase 1 · Capital Humano | `ExamenesPage.jsx` | Actualizada · Revisada · Reemplazada | Exámenes en `trabajadores[].workerItems`; `examenes` legacy. |
| Fase 1 · Capital Humano | `SaludOcupacionalPage.jsx` | Actualizada · Revisada · Reemplazada | `protocolosSalud` canónico. |
| Fase 1 · Capital Humano | `RestringidosPage.jsx` | Actualizada · Revisada · Reemplazada | `restricted` mantiene historial y sincroniza bloqueo/disponibilidad de Persona. |
| Fase 2 · Clientes | `ClientesPage.jsx` | Actualizada · Revisada | Cards → ficha. `minas` canónico; `clientes` fallback. |
| Fase 3 · Contratos | `ContratosPage.jsx` | Actualizada · Revisada | Tabla global → ficha; documento contractual y relaciones Cliente/OS. |
| Fase 4 · Órdenes de servicio | `OrdenesServicioPage.jsx` | Actualizada · Revisada · Reemplazada | Cards → ficha; preparación, personas, alojamientos, recursos, evidencia y cierre. `mantenciones` canónico; `proyectos` fallback. |
| Fase 5 · Gestión Operacional | `ComunicacionesPage.jsx` | Actualizada · Revisada · Reemplazada | Comunicación/convocatoria contextual a OS y personas; `callouts`. |
| Fase 5 · Gestión Operacional | `VehiculosPage.jsx` | Actualizada · Revisada · Reemplazada | `vehiculos` mantiene ownership; relación directa con OS mediante `mantId` y contexto de cliente/faena mediante `minaIds`. |
| Fase 5 · Gestión Operacional | `AlojamientosPage.jsx` | Actualizada · Revisada · Reemplazada | `hoteles` catálogo; `hotelAsig` mantiene estadías y relación con OS/persona. |
| Fase 5 · Gestión Operacional | `CredencialesPage.jsx` | Actualizada · Revisada · Reemplazada | `credenciales` relacionada con Persona (`trabId`) y Cliente/faena (`minaId`). |
| Fase 6 · Contratistas | `TercerosSubcontratosPage.jsx` | Actualizada · Revisada · Reemplazada | `subcontratos` es fuente de escritura; vencimientos y seguimiento. |
| Fase 6 · Contratistas | `ConveniosPage.jsx` | Actualizada · Revisada · Reemplazada | `convenios` canónico; lectura legacy desde `subcontratos` cuando corresponde. |
| Fase 6 · Contratistas | `PersonalEmpresaServiciosPage.jsx` | Actualizada · Revisada · Reemplazada | `personalContratista` relaciona Empresa ↔ Persona; `trabajadores` conserva ownership de Persona. |
| Fase 6 · Contratistas | `HabilitacionesCumplimientoPage.jsx` | Actualizada · Revisada · Reemplazada | `habilitaciones` mantiene requisitos y avance documental de contratistas. |
| Fase 6 · Contratistas | `EvaluacionDesempenoPage.jsx` | Actualizada · Revisada · Reemplazada | `evaluaciones` es fuente especializada de desempeño. |
| Fase 7 · Cumplimiento | `CumplimientoCorporativoPage.jsx` | Actualizada · Revisada · Reemplazada | `empresaDocs` canónico; `documentosEmpresa` fallback. |
| Fase 7 · Cumplimiento | `HabilitacionClientePage.jsx` | Actualizada · Revisada · Reemplazada | `acreditacionesMandante` es fuente especializada de escritura. |
| Fase 7 · Cumplimiento | `IncidentesPage.jsx` | Actualizada · Revisada · Reemplazada | `incidentes` canónico; cierre exige seguimiento y evidencia. |
| Fase 7 · Cumplimiento | `AuditoriaPage.jsx` | Actualizada · Revisada · Reemplazada | Vista derivada; no crea dominio documental paralelo. |
| Fase 8 · Inventario / Activos | `ActivosInventarioPage.jsx` | Actualizada · Revisada · Reemplazada | Página matriz de inventario y activos. |
| Fase 8 · Inventario / Activos | `MaquinariaPage.jsx` | Actualizada · Revisada | Estado operativo, asignación y mantenimiento. |
| Fase 8 · Inventario / Activos | `EquiposInstrumentosPage.jsx` | Actualizada · Revisada | Calibración, certificado, custodia y stock. |
| Fase 8 · Inventario / Activos | `HerramientasPage.jsx` | Actualizada · Revisada | Disponibilidad, asignación/préstamo y devolución. |
| Fase 8 · Inventario / Activos | `EppInventarioPage.jsx` | Actualizada · Revisada | Inventario físico de EPP; entrega individual permanece en Capital Humano. |
| Fase 8 · Inventario / Activos | `MaterialesPage.jsx` | Actualizada · Revisada · Reemplazada | Existencia, mínimo, bodega/ubicación y movimientos. |
| Fase 8 · Inventario / Activos | `InsumosPage.jsx` | Actualizada · Revisada · Reemplazada | Consumo, mínimo/reposición y ubicación. |
| Fase 8 · Inventario / Activos | `BodegasPage.jsx` | Actualizada · Revisada · Reemplazada | `warehouses` e `inventoryLocations`. |
| Fase 8 · Inventario / Activos | `MovimientosInventarioPage.jsx` | Actualizada · Revisada · Reemplazada | Ingresos, egresos, traslados, ajustes y trazabilidad. |
| Fase 8 · Inventario / Activos | `MantenimientoPage.jsx` | Actualizada · Revisada · Reemplazada | Planes preventivos e historial. |
| Fase 8 · Inventario / Activos | `AsignacionesPrestamosPage.jsx` | Actualizada · Revisada · Reemplazada | Préstamos asociados a persona/OS y devolución. |
| Fase 9 · Prospectos y oportunidades | `ProspectosPage.jsx` | Actualizada · Revisada · Reemplazada | `prospectos` canónico, `oportunidades` fallback; conversión ganada a Cliente/Contrato/OS con trazabilidad. |
| Fase 10 · Gestión personal por proyecto | `GestionPersonalProyectoPage.jsx` | Actualizada · Revisada · Reemplazada | `trabajadores` conserva Persona; `asignaciones` conserva Persona ↔ OS y `estadoGestion`: Candidato → Contactado → Confirmado → Asignado → Habilitado. |
| Fase 11 · Centro Operativo | `CentroOperativoPage.jsx` | Actualizada · Revisada · Reemplazada | Vista consolidada guiada por OS: estado operativo, brechas, Libro diario, CAPA, Alertas y Bitácora. Solo `dailyLogs` y `capaActions` son registros propios. |
| Fase 12 · Alertas | `AlertasPage.jsx` | Actualizada · Revisada · Reemplazada | Vista priorizada y derivada; usa el motor compartido `operational-alerts.js`, agrupa por contexto y navega al módulo dueño. |
| Fase 13 · Dashboard | `DashboardPage.jsx` | Actualizada · Revisada · Reemplazada | Vista ejecutiva derivada bajo Centro de Control; KPIs y prioridades usan fuentes canónicas de Personas, Turnos, Asignaciones, OS, EPP y Alertas. |
| Fase 14 · Gestión y Administración | `ReportesPage.jsx` | Actualizada · Revisada · Reemplazada | Vista analítica derivada, sin ownership propio; extracción y análisis por familias operacionales. |
| Fase 14 · Gestión y Administración | `ImportarExportarPage.jsx` | Actualizada · Revisada · Reemplazada | Layout HTML recuperado; exportación, importación y respaldo sobre `/api/data-transfer`. |
| Fase 14 · Gestión y Administración | `UsuariosPermisosPage.jsx` | Actualizada · Revisada · Reemplazada | Usuarios del tenant, roles, estado, alta y restablecimiento de acceso sobre `/api/users`. |
| Fase 14 · Gestión y Administración | `BitacoraCambiosPage.jsx` | Actualizada · Revisada · Reemplazada | Bitácora inmutable de solo lectura sobre `/api/audit`. |
| Fase 14 · Gestión y Administración | `PrivacidadDatosPage.jsx` | Actualizada · Revisada · Reemplazada | Gobierno de datos: tratamientos, derechos, consentimientos e incidentes sobre `/api/privacy`. |
| Fase 14 · Gestión y Administración | `ConfiguracionPage.jsx` | Actualizada · Revisada · Reemplazada | Sustituye el wrapper `ModuleWorkspacePage(forcedModule="configuracion")`; conserva el layout del HTML y lo conecta a `/api/settings`: identidad y alertas → módulos habilitados → integraciones privadas. |

## Cierres de fases

### Fases 1 a 9
Los cierres y decisiones de ownership registrados durante Fases 1–9 se mantienen vigentes. Fase 9 conserva `prospectos` como fuente canónica y la conversión a `minas` / `contratos` / `mantenciones` con `createdFromLead` y metadatos de conversión.

### Fase 10 · Gestión personal por proyecto — CERRADA
**Fecha:** 10 de septiembre de 2026

`GestionPersonalProyectoPage.jsx` es la vista de preparación de dotación por OS. Ruta `/app/reclutamiento`, alias `/app/modulos/gestion-personal-proyecto`.

**Ownership:** `trabajadores` mantiene Persona. `asignaciones` mantiene la relación Persona ↔ OS (`trabId` + `mantId`) y el estado contextual `estadoGestion`.

**Flujo:** `Candidato → Contactado → Confirmado → Asignado → Habilitado`. Solo Asignado/Habilitado representan dotación efectiva; los estados previos son gestión contextual de esa OS.

**Validación técnica:** commit funcional `8b2c84e985cf2aed393bbf4b640615b06482c7b7`, validado por **Build and Deploy Nexo v2** y **Build and Push to ECR** con `success`.

### Fase 11 · Centro Operativo — CERRADA
**Fecha:** 10 de septiembre de 2026

`CentroOperativoPage.jsx` recupera del HTML histórico el concepto de **Centro Operativo guiado por Orden de servicio**. Ruta principal `/app/operaciones`, con alias `/app/modulos/centro-operativo`, bajo **Centro de Control**.

**Layout definitivo:** `KPIs de preparación → Estado operativo por OS → Libro diario / CAPA / Alertas / Bitácora`. El estado consolidado de cada OS es `Lista para ejecutar`, `Pendiente` o `Restringida`.

**Ownership consolidado:** `mantenciones` mantiene OS; `trabajadores` mantiene Persona; `asignaciones` mantiene Persona ↔ OS; `hotelAsig`, `vehiculos` y `eppDeliveries` continúan bajo sus módulos dueños. Centro Operativo solo mantiene `dailyLogs` y `capaActions` como registros especializados propios y navega al módulo dueño para resolver brechas.

**Correcciones de validación cruzada:** commit `504f0a673db10669a0fe4e87018bcae01348b6bb`, que alinea `estadoGestion`, `workerId`, `mantId`, elimina la dependencia inexistente de `firmas` y evita exigir alojamiento antes de existir dotación efectiva.

**Validación CI:** **Build and Deploy Nexo v2** y **Build and Push to ECR** finalizaron con `success` para el commit `504f0a673db10669a0fe4e87018bcae01348b6bb`.

### Fase 12 · Alertas — CERRADA
**Fecha:** 11 de septiembre de 2026

`AlertasPage.jsx` fue reconstruida usando como referencia conjunta la Page React propuesta y la lógica histórica de `AccesoMina_v6.html`. La ruta `/app/alertas` queda bajo **Centro de Control** y la Page no repite el dominio como kicker.

**Layout definitivo:** `3 categorías de prioridad → contextos agrupados → expandir/contraer → detalle de alertas → abrir contexto / adjuntar evidencia`. Las categorías son `Críticas y vencidas`, `Próximas a vencer` y `Operacionales`.

**Fuentes y ownership:** Alertas no crea un dominio maestro nuevo. La vista combina `state.alertas` persistidas con alertas derivadas en tiempo de lectura desde los módulos dueños. Se recupera del HTML el concepto de cálculo automático de alertas y se mantiene la navegación a la entidad responsable de la resolución.

**Derivación automática vigente:**

- `trabajadores[].workerItems`: antecedente rechazado, vencido, crítico ≤7 días y próximo ≤30 días.
- `trabajadores`: persona bloqueada/restringida.
- `contratos`: vencido o próximo a vencer ≤30 días.
- `mantenciones` (con fallback `proyectos`): OS sin contrato o sin cliente asociado.
- `state.alertas`: alertas persistidas siguen siendo visibles y se mezclan con las derivadas.

**Decisión sobre `callouts`:** las convocatorias/comunicaciones no se incorporan automáticamente como alertas. El módulo de Comunicaciones conserva su ownership.

**Contexto y navegación:** las alertas se agrupan por Persona, OS, Contrato u otro registro relacionado. Desde el detalle se navega a la entidad o módulo responsable. La evidencia adjunta utiliza `entityType: alerta` y no modifica el ownership de la entidad origen.

**Commits principales:** `617c89fc` (reconstrucción funcional), `dd50724a` (estilos) y `3cd5eab3` (clasificación bajo Centro de Control).

**Validación técnica:** los workflows **Build and Deploy Nexo v2** y **Build and Push to ECR** finalizaron con `success` para el commit final de la fase.

### Fase 13 · Dashboard — CERRADA
**Fecha:** 11 de septiembre de 2026

`DashboardPage.jsx` queda como **vista ejecutiva derivada** y puerta de entrada de Centro de Control. No crea ownership ni colecciones propias: resume el estado de los módulos ya cerrados y dirige al usuario al contexto donde debe actuar.

**Compatibilidad consolidada con fases anteriores:**

- Personas desde `state.trabajadores`.
- Restricciones contabilizadas por Persona única a partir del estado vigente y registros de restricción.
- Asistencia del día desde `state.turnos`, reemplazando la lectura legacy de `state.asistencias`.
- Dotación efectiva desde `state.asignaciones[].estadoGestion`; solo `asignado` y `habilitado` cuentan como personas asignadas.
- OS desde `state.mantenciones`, considerando activas y manteniendo fallback legacy cuando corresponde.
- EPP desde `state.eppDeliveries`.
- Alertas desde `state.alertas` más las señales derivadas por el motor compartido; `callouts` no se cuenta automáticamente como alerta.

**Motor compartido de alertas:** se crea `nexo-v2/src/services/operational-alerts.js` como única lógica de derivación para Dashboard y Alertas. Esto evita diferencias entre el KPI ejecutivo y el detalle de `/app/alertas`.

**KPIs ejecutivos definitivos:** `Personas registradas · Personas restringidas · OS activas · Alertas pendientes`. Debajo se mantienen las prioridades operativas y accesos hacia los módulos dueños.

**Navegación vigente:** se eliminan rutas legacy de la referencia React y se usan rutas actuales como `/app/trabajadores`, `/app/operaciones`, `/app/alertas` y módulos especializados de cumplimiento/habilitación. `/app` queda clasificado bajo **Centro de Control** en `AppLayout`.

**Commits principales:** `bf0ec0b2` (motor compartido de alertas), `d30940a1` (Alertas consume helper compartido), `726480a2` (alineación funcional del Dashboard) y `bded9250` (clasificación de Dashboard bajo Centro de Control).

**Validación técnica:** para el commit final `bded92507233c429906c2a7589c314826e3adc56`, **Build and Push to ECR** y **Build and Deploy Nexo v2** finalizaron con `success`.

### Fase 14 · Gestión y Administración — CERRADA
**Fecha:** 11 de septiembre de 2026

La fase consolida las capacidades transversales de administración, gobierno, trazabilidad y configuración del tenant sin crear fuentes operacionales paralelas. El HTML histórico se mantiene como referencia primaria de layout y jerarquía visual; React conserva la arquitectura cloud y las APIs actuales.

**Módulos cerrados:**

- `ReportesPage.jsx`: vista derivada de análisis y exportación; no mantiene ownership propio.
- `ImportarExportarPage.jsx`: respaldo, exportación e importación masiva mediante `/api/data-transfer`.
- `UsuariosPermisosPage.jsx`: administración de usuarios, roles y estado mediante `/api/users`.
- `BitacoraCambiosPage.jsx`: lectura inmutable de auditoría mediante `/api/audit`.
- `PrivacidadDatosPage.jsx`: tratamientos, solicitudes de titulares, consentimientos e incidentes mediante `/api/privacy`.
- `ConfiguracionPage.jsx`: reemplaza el wrapper genérico original y mantiene como layout definitivo del HTML `Identidad y alertas → Módulos habilitados → Integraciones privadas`, conectado a `/api/settings`.

**Layout y navegación:** `Reportes y analítica` permanece como acceso directo de primer nivel. Importar/exportar, Usuarios, Bitácora y Privacidad permanecen en **Gestión y Administración**; Configuración permanece como acción inferior del Sidebar, pero `/app/configuracion` se clasifica bajo el mismo dominio en `AppLayout`.

**Seguridad y ownership:** usuarios, auditoría, privacidad, configuración e integraciones están aislados por tenant en backend. Las claves de integración se almacenan cifradas y no se vuelven a mostrar. Bitácora es de solo lectura desde frontend. Configuración y privacidad requieren rol administrador según sus rutas backend.

**Referencia de layout:** Importar/exportar, Usuarios, Bitácora, Privacidad y Configuración fueron contrastados contra `AccesoMina_v6.html`; se preservó la estructura útil de cards, KPIs, tablas y acciones, aplicando el Design System React vigente. Para Configuración, el Page React previo era únicamente un wrapper de `ModuleWorkspacePage`; la implementación final conserva deliberadamente la estructura del HTML en lugar de reutilizar el layout genérico.

**Commits principales de cierre:** `43a36d2c` / `8503a1c3` (Importar/exportar), `f1e6ee78` / `73eaa111` (Usuarios), `e816cf25` / `f7c94619` (Bitácora), `65749dba` / `6c54de74` (Privacidad), `8b41808b` / `816822f0` / `e75ee935` / `edd0fbb9` (Configuración y navegación).

**Validación técnica:** revisión de rutas, ownership y contratos API completada. El workflow **Build and Push to ECR** del commit de cierre `75af76d8d249d576418bbfcb602db567988cc923` finalizó con `success`.

## Próximo bloque

**Fase 15 · Cierre de migración / retiro de aliases legacy**

Objetivo: revisar rutas y aliases heredados, wrappers genéricos remanentes, Pages no alcanzables y referencias legacy que ya no deban mantenerse antes de declarar finalizada la migración React.