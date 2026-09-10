# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad de las páginas React (`src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 10 de septiembre de 2026  
**Estado global:** Fases 0 a 9 cerradas.

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

### Fase 8 · Inventario / Activos — CERRADA
**Fecha:** 10 de septiembre de 2026

La fase queda cerrada con once módulos revisados y especializados sobre un dominio común de recursos físicos:

1. **Inventario y existencias:** `ActivosInventarioPage.jsx` actúa como página matriz; registra recursos con bodega y ubicación interna, conecta conteo físico y recepción/reposición y mantiene trazabilidad.
2. **Maquinaria, Equipos, Herramientas y EPP:** usan especialización por categoría sobre `inventoryItems`, mostrando estado operativo, calibración, custodia, préstamos, vida útil y stock según corresponda.
3. **Materiales e Insumos:** mantienen componentes especializados orientados a existencias, mínimos, reposición, consumo y último movimiento.
4. **Bodegas y ubicaciones:** `BodegasPage.jsx` administra `warehouses`/`bodegas` e `inventoryLocations`.
5. **Movimientos:** `MovimientosInventarioPage.jsx` administra entradas, salidas, traslados y ajustes por bodega.
6. **Mantenimiento:** `MantenimientoPage.jsx` administra `assetMaintenancePlans` y `assetMaintenanceRecords`.
7. **Asignaciones y préstamos:** `AsignacionesPrestamosPage.jsx` administra préstamos de maquinaria, equipos y herramientas y su devolución a la bodega de origen.

**Ownership confirmado:** `inventoryItems` es el catálogo canónico común de recursos de Fase 8. `vehiculos` permanece fuera del dominio y conserva ownership en Gestión Operacional. La entrega individual de EPP permanece en Capital Humano.

**Regla de stock:** `stock` representa el saldo total y debe corresponder a la suma de `stockByLocation`. `warehouseId` representa la bodega principal y `locationId` la ubicación interna principal. La capa `/api/state` normaliza registros legacy y evita que una bodega sin saldo herede stock global de otra.

**Limpieza técnica:** `InventoryOperationsPage.jsx` fue eliminado después de verificar que no tenía imports ni consumidores activos. Bodegas, Movimientos, Mantenimiento y Asignaciones permanecen como Pages especializadas y no como variantes de un wrapper operacional común.

**Resultado:** Fase 8 cerrada con catálogo, bodegas, ubicaciones, movimientos, conteo físico, reposición, mantenimiento y préstamos/devoluciones integrados bajo una única lógica de stock y ownership.

### Fase 9 · Prospectos y oportunidades — CERRADA
**Fecha:** 10 de septiembre de 2026

`ProspectosPage.jsx` reemplaza el workspace genérico y queda contrastada con la referencia histórica V124. El layout definitivo combina **filtros principales + Más filtros → 5 KPIs → Kanban comercial → grilla operacional → ficha/bitácora bajo demanda**. La creación y edición usa una ventana de trabajo alineada al Design System, organizada en Oportunidad, Contacto, Gestión comercial e Información adicional.

**Modelo comercial:** `state.prospectos` es la fuente canónica de escritura y `state.oportunidades` se mantiene como fallback de lectura. Se conservan score 0–100, temperatura, etapa, industria, origen, necesidad/dolor, monto, probabilidad, cierre estimado, próxima gestión, responsable, motivo de pérdida, historial y bitácora de seguimiento.

**Conversión:** solo una oportunidad en etapa `ganada` puede convertirse. Según su tipo, la conversión crea un Cliente en `minas`, un Contrato en `contratos` o una Orden de servicio/proyecto en `mantenciones`. Contrato exige Cliente asociado y OS exige Contrato asociado. La operación evita conversiones duplicadas y conserva trazabilidad mediante `createdFromLead`, `convertedId`, `convertedType` y `convertedAt`.

**Validación técnica:** el commit funcional `2f30adbf0ee173ce1f7951a519df10a73414337c` fue validado por GitHub Actions el 10 de septiembre de 2026. Los workflows **Build and Deploy Nexo v2** y **Build and Push to ECR** finalizaron con conclusión `success`.

**Resultado:** Fase 9 cerrada con pipeline comercial completo desde prospecto hasta entidad formal, sin duplicar ownership de Cliente, Contrato u Orden de servicio y manteniendo trazabilidad de origen.

## Correcciones transversales registradas

### Creación desde Header
Las rutas `/nuevo` de Cliente, Contrato y OS instancian explícitamente formularios limpios. Las Pages no duplican las acciones globales del Header.

### Encabezados y densidad
`AppLayout` muestra una sola vez el dominio de Sidebar. Los títulos internos se alinean mediante el Design System. Se mantiene densidad media-alta y toolbars compactas; filtros secundarios pueden agruparse bajo `Más filtros`.

### Grillas de escritorio
Las grillas operacionales deben priorizar `width: 100%`, `table-layout: fixed`, anchos controlados, truncamiento y acciones compactas antes de introducir scroll horizontal. En Fases 7, 8 y 9 se aplicó explícitamente a las vistas de cumplimiento, inventario y oportunidades.

### Navegación contextual
Cliente, Contrato, OS, Persona y demás entidades con ficha propia deben renderizarse como enlaces cuando aparecen como contexto de otro módulo.

### Stock e inventario
En Fase 8 se consolidó la regla `stock = suma(stockByLocation)`. Los registros legacy se normalizan desde `/api/state`, y movimientos, préstamos y devoluciones operan siempre contra la bodega correspondiente.

### Conversión comercial
En Fase 9 se consolidó la regla `Prospecto ganado → Cliente / Contrato / OS`, escribiendo siempre en el módulo dueño y conservando `createdFromLead` y metadatos de conversión en la oportunidad.

## Infraestructura legacy revisada

| Archivo | Rol |
| --- | --- |
| `ModuleWorkspacePage.jsx` | Wrapper/orquestación genérica utilizada como referencia para recuperar configuración y layout de origen. |
| `PrivateModulePage.jsx` | CRUD genérico legacy; referencia de campos, relaciones, permisos y evidencia. |
| `OperationalWorkspacePage.jsx` | Orquestador legacy; referencia de flujos históricos de módulos operacionales y Terceros. |
| `InventoryOperationsPage.jsx` | Componente genérico de Fase 8 retirado tras confirmar que no tenía consumidores; reemplazado por Pages operacionales especializadas. |

Estas piezas no son fuentes funcionales de los módulos especializados.

## Próximo punto

Con Fases 0–9 cerradas, el siguiente bloque es **Fase 10 · Gestión personal por proyecto**. Cada nueva Page modificada o revisada debe incorporarse a esta trazabilidad.