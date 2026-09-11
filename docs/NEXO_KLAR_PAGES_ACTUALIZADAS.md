# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 11 de septiembre de 2026  
**Estado global:** Fases 0 a 12 cerradas.

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
- Las vistas consolidadas leen señales de los módulos dueños y navegan hacia ellos para resolver brechas; no duplican ownership.
- Alertas es una **vista derivada y priorizada**: combina alertas persistidas con señales calculadas desde los módulos dueños; no reemplaza esos módulos ni crea una fuente maestra paralela.
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
| Fase 12 · Alertas | `AlertasPage.jsx` | Actualizada · Revisada · Reemplazada | Vista priorizada y derivada. Combina `state.alertas` con señales calculadas desde Personas, Contratos y OS; clasifica Críticas/vencidas, Próximas a vencer y Operacionales; agrupa por contexto y navega al módulo dueño. |
| Fase 13 · Dashboard | `DashboardPage.jsx` | Actualizada | Dashboard existente; cierre formal corresponde a Fase 13. |

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

**Decisión sobre `callouts`:** las convocatorias/comunicaciones no se incorporan automáticamente como alertas. El HTML histórico las trata como una capacidad distinta y el módulo de Comunicaciones conserva su ownership.

**Contexto y navegación:** las alertas se agrupan por Persona, OS, Contrato u otro registro relacionado. Desde el detalle se navega a `/app/trabajadores/:id`, `/app/servicios/:id`, `/app/contratos/:id`, `/app/clientes/:id` o al módulo de activos según corresponda. La evidencia adjunta utiliza `entityType: alerta` y no modifica el ownership de la entidad origen.

**Commits principales:** `617c89fced9294304dd1f9b1387b3ccd0b371f27` reconstruye la funcionalidad; `dd50724a92062f2b85716c8c2dca3dace00797d9` incorpora la UX/estilos; `3cd5eab3e1e1f548053c246589d8a6a40a8bd973` clasifica `/app/alertas` bajo Centro de Control.

**Validación CI:** para el commit final `3cd5eab3e1e1f548053c246589d8a6a40a8bd973`, **Build and Deploy Nexo v2** y **Build and Push to ECR** finalizaron con `success`.

**Resultado:** Fase 12 cerrada con Alertas como una vista de control transversal, priorizada y derivada, sin duplicar Persona, Contrato, OS, Comunicaciones ni Activos.

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
Fase 11 mantiene `Centro Operativo = lectura consolidada + navegación al módulo dueño`.

### Alertas derivadas
Fase 12 mantiene `Alertas = señales persistidas + cálculo derivado desde módulos dueños + navegación al contexto`. `callouts` no se convierte automáticamente en alerta.

## Infraestructura legacy revisada

| Archivo | Rol |
| --- | --- |
| `ModuleWorkspacePage.jsx` | Wrapper/orquestación genérica utilizada como referencia para recuperar configuración y layout de origen. |
| `PrivateModulePage.jsx` | CRUD genérico legacy; referencia de campos, relaciones, permisos y evidencia. |
| `OperationalWorkspacePage.jsx` | Orquestador legacy y referencia funcional principal para Centro Operativo. |
| `InventoryOperationsPage.jsx` | Genérico de Fase 8 retirado; reemplazado por Pages especializadas. |
| `AccesoMina_v6.html` | Referencia histórica de evolución funcional y layout conceptual, incluida la lógica histórica de cálculo de alertas; no es fuente de ownership React. |

## Próximo punto

Con Fases 0–12 cerradas, el siguiente bloque es **Fase 13 · Dashboard**.