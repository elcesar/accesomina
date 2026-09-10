# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 10 de septiembre de 2026  
**Estado global:** Fases 0 a 10 cerradas.

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
| Fase 8 · Inventario / Activos | `ActivosInventarioPage.jsx` | Actualizada · Revisada · Reemplazada | Página matriz del dominio. Usa bodegas y ubicaciones internas reales; conecta conteo físico y recepción/reposición con actualización de stock y trazabilidad. |
| Fase 8 · Inventario / Activos | `MaquinariaPage.jsx` | Actualizada · Revisada | Vista especializada en estado operativo, asignación, bodega/ubicación, próximo mantenimiento y stock. |
| Fase 8 · Inventario / Activos | `EquiposInstrumentosPage.jsx` | Actualizada · Revisada | Vista especializada en calibración, certificado, custodia, bodega/ubicación y stock. |
| Fase 8 · Inventario / Activos | `HerramientasPage.jsx` | Actualizada · Revisada | Vista especializada en disponibilidad, asignación/préstamo, persona, OS, devolución esperada y bodega/stock. |
| Fase 8 · Inventario / Activos | `EppInventarioPage.jsx` | Actualizada · Revisada | Control de inventario físico de EPP por talla, stock, mínimo, vencimiento/vida útil y ubicación; entrega individual permanece en Capital Humano. |
| Fase 8 · Inventario / Activos | `MaterialesPage.jsx` | Actualizada · Revisada · Reemplazada | Usa `MaterialsInventoryPage.jsx`; controla existencia, unidad de medida, mínimo, bodega/ubicación y último movimiento. |
| Fase 8 · Inventario / Activos | `InsumosPage.jsx` | Actualizada · Revisada · Reemplazada | Usa `ConsumablesInventoryPage.jsx`; controla consumo, disponible, mínimo/reposición, bodega/ubicación y último consumo. |
| Fase 8 · Inventario / Activos | `BodegasPage.jsx` | Actualizada · Revisada · Reemplazada | Administra bodegas e `inventoryLocations`, responsables, zonas, ubicaciones internas y existencias distribuidas. |
| Fase 8 · Inventario / Activos | `MovimientosInventarioPage.jsx` | Actualizada · Revisada · Reemplazada | Registra ingresos/reposiciones, egresos, traslados, ajustes y trazabilidad por recurso y bodega. |
| Fase 8 · Inventario / Activos | `MantenimientoPage.jsx` | Actualizada · Revisada · Reemplazada | Planes preventivos e historial para maquinaria, equipos y herramientas, con vencimiento, costo, indisponibilidad y próxima ejecución. |
| Fase 8 · Inventario / Activos | `AsignacionesPrestamosPage.jsx` | Actualizada · Revisada · Reemplazada | Préstamos de maquinaria, equipos y herramientas asociados a persona/OS, bodega de origen, devolución esperada y devolución efectiva. |
| Fase 9 · Prospectos y oportunidades | `ProspectosPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el workspace genérico y recupera el flujo comercial V124: KPIs, filtros, score/temperatura, Kanban, grilla compacta, bitácora y avance de etapa. `prospectos` es la fuente canónica con `oportunidades` como fallback. Las oportunidades ganadas se convierten en Cliente (`minas`), Contrato (`contratos`) u Orden de servicio (`mantenciones`) según su tipo, preservando `createdFromLead`, `convertedId`, `convertedType` y `convertedAt`. |
| Fase 10 · Gestión personal por proyecto | `GestionPersonalProyectoPage.jsx` | Actualizada · Revisada · Reemplazada | Reemplaza el wrapper genérico por una vista operacional contextual a OS. Layout: búsqueda + selector de proyecto/OS → contexto Cliente/Contrato/OS → KPIs de dotación → grilla única. `trabajadores` mantiene ownership de Persona y `asignaciones` mantiene la relación Persona ↔ OS y su estado de gestión. Flujo: Candidato → Contactado → Confirmado → Asignado → Habilitado. |
| Centro operativo y control | `DashboardPage.jsx` | Actualizada | Dashboard existente; cierre formal corresponde a Fase 13. |
| Centro operativo y control | `AlertasPage.jsx` | Actualizada | Alertas existentes; cierre formal corresponde a Fase 12. |

## Cierres de fases

### Fases 1 a 9
Los cierres detallados de Fases 1–9 se mantienen vigentes según las decisiones y ownership registrados en las Pages anteriores. Fase 9 conserva `prospectos` como fuente canónica, conversión a `minas`/`contratos`/`mantenciones` y trazabilidad mediante `createdFromLead` y metadatos de conversión.

### Fase 10 · Gestión personal por proyecto — CERRADA
**Fecha:** 10 de septiembre de 2026

`GestionPersonalProyectoPage.jsx` deja de ser un wrapper genérico y queda como vista operacional de preparación de dotación por Orden de servicio/proyecto. La ruta activa es `/app/reclutamiento`, con alias legacy `/app/modulos/gestion-personal-proyecto`, y se clasifica bajo **Centro de Control**.

**Layout definitivo:** `Búsqueda + selector OS → contexto Cliente / Contrato / OS → KPIs de dotación → grilla operacional única`. Los KPIs muestran dotación requerida, asignados, habilitados asignados y brecha. La grilla consolida Persona, Tipo, Cargo/especialidad, Disponibilidad, Gestión OS, Habilitación y Acciones; incluye filtros rápidos para todas, asignadas, disponibles, en gestión y con observación.

**Ownership:** `trabajadores` continúa siendo la fuente maestra de Persona. `asignaciones` es la fuente de la relación Persona ↔ OS (`trabId` + `mantId`) y contiene el estado de gestión específico para esa OS; no se replica ese estado en la Persona global.

**Flujo operacional:** `Candidato → Contactado → Confirmado → Asignado → Habilitado`. Candidato, Contactado y Confirmado son estados de preparación de la relación y no alteran la disponibilidad global. Al alcanzar Asignado se sincroniza la disponibilidad de Persona; Habilitado exige que la persona no esté bloqueada ni presente observaciones de habilitación. Los registros legacy con `estado: confirmado` se interpretan como asignados para mantener compatibilidad.

**Acciones:** desde la grilla se puede abrir la ficha de Persona, iniciar gestión para la OS seleccionada, avanzar o retroceder el estado y retirar/quitar la relación. El proyecto seleccionado funciona como contexto activo y destino inequívoco de las acciones.

**Validación técnica:** el commit funcional `8b2c84e985cf2aed393bbf4b640615b06482c7b7` fue validado por GitHub Actions el 10 de septiembre de 2026. Los workflows **Build and Deploy Nexo v2** y **Build and Push to ECR** finalizaron con conclusión `success`.

**Resultado:** Fase 10 cerrada con una única vista de preparación y asignación de dotación por OS, recuperando el flujo histórico de gestión sin duplicar Persona ni crear una nueva fuente maestra de reclutamiento.

## Correcciones transversales registradas

### Creación desde Header
Las rutas `/nuevo` de Cliente, Contrato y OS instancian explícitamente formularios limpios. Las Pages no duplican las acciones globales del Header.

### Encabezados y densidad
`AppLayout` muestra una sola vez el dominio de Sidebar. Los títulos internos se alinean mediante el Design System. Se mantiene densidad media-alta y toolbars compactas; filtros secundarios pueden agruparse bajo `Más filtros`.

### Grillas de escritorio
Las grillas operacionales deben priorizar `width: 100%`, `table-layout: fixed`, anchos controlados, truncamiento y acciones compactas antes de introducir scroll horizontal. En Fases 7, 8, 9 y 10 se aplicó explícitamente a las vistas de cumplimiento, inventario, oportunidades y dotación por proyecto.

### Navegación contextual
Cliente, Contrato, OS, Persona y demás entidades con ficha propia deben renderizarse como enlaces cuando aparecen como contexto de otro módulo.

### Stock e inventario
En Fase 8 se consolidó la regla `stock = suma(stockByLocation)`. Los registros legacy se normalizan desde `/api/state`, y movimientos, préstamos y devoluciones operan siempre contra la bodega correspondiente.

### Conversión comercial
En Fase 9 se consolidó la regla `Prospecto ganado → Cliente / Contrato / OS`, escribiendo siempre en el módulo dueño y conservando `createdFromLead` y metadatos de conversión en la oportunidad.

### Gestión de dotación por OS
En Fase 10 se consolidó la regla `Persona maestra en trabajadores + estado contextual en asignaciones`. La preparación, convocatoria, asignación y habilitación pertenecen a la relación con la OS y no alteran atributos maestros de Persona salvo la disponibilidad cuando efectivamente queda asignada.

## Infraestructura legacy revisada

| Archivo | Rol |
| --- | --- |
| `ModuleWorkspacePage.jsx` | Wrapper/orquestación genérica utilizada como referencia para recuperar configuración y layout de origen. |
| `PrivateModulePage.jsx` | CRUD genérico legacy; referencia de campos, relaciones, permisos y evidencia. |
| `OperationalWorkspacePage.jsx` | Orquestador legacy; referencia de flujos históricos de módulos operacionales y Terceros. |
| `InventoryOperationsPage.jsx` | Componente genérico de Fase 8 retirado tras confirmar que no tenía consumidores; reemplazado por Pages operacionales especializadas. |

Estas piezas no son fuentes funcionales de los módulos especializados.

## Próximo punto

Con Fases 0–10 cerradas, el siguiente bloque es **Fase 11 · Centro Operativo**. Cada nueva Page modificada o revisada debe incorporarse a esta trazabilidad.