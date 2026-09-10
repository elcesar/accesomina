# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 10 de septiembre de 2026  
**Estado global:** Fases 0 a 11 cerradas.

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
- Las vistas consolidadas, como Centro Operativo, **leen señales de los módulos dueños y navegan hacia ellos para resolver brechas**; no duplican su ownership.
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
| Fase 5 · Gestión Operacional | `VehiculosPage.jsx` | Actualizada · Revisada · Reemplazada | `vehiculos` mantiene ownership; soporta relación directa con OS mediante `mantId` y habilitación por cliente/faena mediante `minaIds`. |
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
| Fase 11 · Centro Operativo | `CentroOperativoPage.jsx` | Actualizada · Revisada · Reemplazada | Vista consolidada guiada por OS: estado operativo, brechas, Libro diario, CAPA, Alertas y Bitácora. Lee ownership de Fases 1/4/5/8/10 y navega al módulo dueño para resolver; solo `dailyLogs` y `capaActions` son registros propios del Centro Operativo. |
| Centro de Control · Fase 12 | `AlertasPage.jsx` | Actualizada | Alertas existentes; cierre formal corresponde a Fase 12. |
| Centro de Control · Fase 13 | `DashboardPage.jsx` | Actualizada | Dashboard existente; cierre formal corresponde a Fase 13. |

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

**Integración y ownership validado:**

- **OS:** `mantenciones` es la fuente canónica del servicio; Centro Operativo no crea ni modifica la OS.
- **Personas:** `trabajadores` mantiene Persona y `asignaciones` mantiene la relación con OS. Centro Operativo interpreta `estadoGestion` y compatibilidad legacy para considerar solo `Asignado/Habilitado` como dotación efectiva.
- **Alojamiento:** la preparación se deriva de `hotelAsig.mantId`; el catálogo `hoteles` continúa bajo Alojamientos.
- **Flota:** se prioriza la relación directa `vehiculos.mantId`; `minaIds` se utiliza como habilitación/contexto de cliente-faena cuando corresponde. Centro Operativo no escribe en `vehiculos`.
- **EPP:** la entrega individual se deriva de `eppDeliveries.workerId` con compatibilidad `trabId`; el inventario físico continúa en Fase 8 y la entrega en Capital Humano.
- **Alertas:** se leen `alertas` y `callouts`. Una alerta relacionada con OS/persona se presenta como **Alerta pendiente**, no como supuesto documento faltante. La resolución se deriva a `/app/alertas`.
- **Firma:** se retiró como brecha automática porque la implementación React actual de Contratos no mantiene una colección canónica `firmas` asociada a OS. No se inventa ownership solo para replicar el HTML histórico.
- **Libro diario:** `dailyLogs` es registro propio del Centro Operativo, relacionado mediante `mantId`.
- **CAPA:** `capaActions` es registro propio del Centro Operativo para causa raíz, acción correctiva/preventiva, responsable, plazo y cierre.
- **Bitácora:** es una vista consolidada sobre `dailyLogs`, `capaActions` y seguimientos existentes; no crea una fuente paralela de trazabilidad.

**Correcciones de validación cruzada:** el commit `504f0a673db10669a0fe4e87018bcae01348b6bb` alinea Centro Operativo con los contratos reales de datos de Gestión de personal, Alojamientos, Flota, EPP y Alertas. Corrige la lectura de `estadoGestion`, `workerId`, `mantId`, elimina la dependencia inexistente de `firmas` y evita exigir alojamiento antes de existir dotación efectiva.

**Principio consolidado:** Centro Operativo es un **orquestador/visor operacional**, no un nuevo dueño de Personas, Flota, Alojamientos, EPP, Alertas ni Inventario. Sus únicas escrituras especializadas son `dailyLogs` y `capaActions`.

**Validación CI:** los workflows correspondientes al commit de alineación funcional `504f0a673db10669a0fe4e87018bcae01348b6bb` fueron iniciados al cierre de esta revisión. La conclusión final debe verificarse antes de considerar validado el despliegue, aunque la fase funcional y de ownership queda cerrada.

## Correcciones transversales registradas

### Creación desde Header
Las rutas `/nuevo` de Cliente, Contrato y OS instancian formularios limpios. Las Pages no duplican las acciones globales del Header.

### Encabezados y densidad
`AppLayout` muestra una sola vez el dominio de Sidebar. Los títulos internos se alinean mediante el Design System.

### Grillas de escritorio
Las grillas operacionales priorizan `width: 100%`, `table-layout: fixed`, anchos controlados, truncamiento y acciones compactas antes del scroll horizontal.

### Navegación contextual
Cliente, Contrato, OS, Persona y demás entidades con ficha propia deben ser navegables cuando aparecen como contexto de otro módulo.

### Stock e inventario
Fase 8 mantiene `stock = suma(stockByLocation)` y ownership especializado de inventario.

### Conversión comercial
Fase 9 mantiene `Prospecto ganado → Cliente / Contrato / OS`, escribiendo siempre en el módulo dueño.

### Gestión de dotación por OS
Fase 10 mantiene `Persona maestra en trabajadores + estado contextual en asignaciones`.

### Orquestación operacional
Fase 11 mantiene `Centro Operativo = lectura consolidada + navegación al módulo dueño`. No debe recrear datos maestros que ya pertenecen a otros módulos.

## Infraestructura legacy revisada

| Archivo | Rol |
| --- | --- |
| `ModuleWorkspacePage.jsx` | Wrapper/orquestación genérica utilizada como referencia para recuperar configuración y layout de origen. |
| `PrivateModulePage.jsx` | CRUD genérico legacy; referencia de campos, relaciones, permisos y evidencia. |
| `OperationalWorkspacePage.jsx` | Orquestador legacy y referencia funcional principal para Centro Operativo. |
| `InventoryOperationsPage.jsx` | Genérico de Fase 8 retirado; reemplazado por Pages especializadas. |
| `AccesoMina_v6.html` | Referencia histórica de evolución funcional y layout conceptual; no es fuente de ownership React. |

## Próximo punto

Con Fases 0–11 cerradas, el siguiente bloque es **Fase 12 · Alertas**. Antes de iniciar cambios de Fase 12, verificar la conclusión final de CI del commit `504f0a673db10669a0fe4e87018bcae01348b6bb`.