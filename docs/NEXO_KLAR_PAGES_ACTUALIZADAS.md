# Nexo Klar · Pages JSX actualizadas

Este documento mantiene la trazabilidad canónica de las páginas React (`nexo-v2/src/pages/*.jsx`) intervenidas o revisadas durante la modernización de Nexo Klar.

**Actualizado:** 12 de septiembre de 2026  
**Estado global:** Fases 0 a 15 cerradas · migración React finalizada.  
**Baseline estable:** Nexo Klar React `v3.0.0`.

## Estados

- **Actualizada:** recibió cambios funcionales, visuales o arquitectónicos.
- **Revisada:** fue contrastada con HTML/Page/wrapper de referencia.
- **Reemplazada:** sustituye una experiencia genérica o legacy anterior.

## Reglas transversales vigentes

- Revisar la referencia histórica antes de rediseñar una Page.
- Mantener una única fuente funcional de escritura por dominio; los fallbacks legacy son solo compatibilidad de lectura cuando corresponda.
- El HTML histórico `AccesoMina_v6.html` permanece como referencia funcional y visual, pero React es la implementación vigente.
- `AppLayout` muestra el dominio/sección una sola vez; las Pages no deben repetirlo como kicker.
- Las acciones globales `+ Cliente`, `+ Contrato` y `+ Orden de servicio` pertenecen al Header.
- Las entidades con ficha propia deben ser navegables desde el contexto operacional.
- Las vistas consolidadas leen señales de los módulos dueños y no duplican ownership.
- Alertas es una vista derivada y priorizada; `callouts` sigue perteneciendo a Comunicaciones.
- Dashboard es una vista ejecutiva derivada y comparte `services/operational-alerts.js` con Alertas.
- Densidad operacional media-alta; filtros secundarios bajo `Más filtros` cuando corresponda.
- Las grillas deben intentar caber en escritorio antes de recurrir a scroll horizontal.
- En el sitio público, `Acceso` navega a `/login`; el landing no duplica autenticación.
- Las rutas legacy que se conserven deben ser redirects hacia una ruta canónica, nunca una segunda implementación funcional.

## Pages registradas

| Área / fase | Page JSX | Estado | Decisión vigente |
| --- | --- | --- | --- |
| Sitio público | `LandingPage.jsx` | Actualizada · Revisada | Landing vertical continuo y registro de nueva empresa. |
| Acceso | `LoginPage.jsx` | Actualizada | Único formulario de autenticación. |
| Acceso | `ForgotPasswordPage.jsx`, `ResetPasswordPage.jsx`, `ChangePasswordPage.jsx` | Actualizada | Recuperación, restablecimiento y cambio obligatorio de contraseña. |
| Acceso | `MfaSetupPage.jsx` | Actualizada | Configuración de doble autenticación cuando la política de la empresa la exige. |
| Fase 1 · Capital Humano | `TrabajadoresPage.jsx` | Actualizada · Revisada | Listado especializado de personas. |
| Fase 1 · Capital Humano | `NuevoTrabajadorPage.jsx` | Actualizada · Revisada | Alta especializada de Persona. |
| Fase 1 · Capital Humano | `FichaTrabajadorPage.jsx` | Actualizada · Revisada | Ficha integral de Persona. |
| Fase 1 · Capital Humano | `TurnosPage.jsx` | Actualizada · Revisada · Reemplazada | `turnos` canónico. |
| Fase 1 · Capital Humano | `ProteccionEppPage.jsx` | Actualizada · Revisada · Reemplazada | `eppDeliveries` canónico; `eppEntregas` compatibilidad. |
| Fase 1 · Capital Humano | `FormacionPage.jsx` | Actualizada · Revisada · Reemplazada | Formación en `trabajadores[].workerItems`. |
| Fase 1 · Capital Humano | `ExamenesPage.jsx` | Actualizada · Revisada · Reemplazada | Exámenes en `trabajadores[].workerItems`. |
| Fase 1 · Capital Humano | `SaludOcupacionalPage.jsx` | Actualizada · Revisada · Reemplazada | `protocolosSalud` canónico. |
| Fase 1 · Capital Humano | `RestringidosPage.jsx` | Actualizada · Revisada · Reemplazada | `restricted` sincroniza estado operacional. |
| Fase 2 · Clientes | `ClientesPage.jsx` | Actualizada · Revisada | `minas` canónico; `clientes` fallback. |
| Fase 3 · Contratos | `ContratosPage.jsx` | Actualizada · Revisada | Tabla global, ficha y relaciones Cliente/OS. |
| Fase 4 · Órdenes de servicio | `OrdenesServicioPage.jsx` | Actualizada · Revisada · Reemplazada | `mantenciones` canónico; `proyectos` fallback. |
| Fase 5 · Gestión Operacional | `ComunicacionesPage.jsx` | Actualizada · Revisada · Reemplazada | `callouts`; ruta canónica `/app/llamados`. |
| Fase 5 · Gestión Operacional | `VehiculosPage.jsx` | Actualizada · Revisada · Reemplazada | Flota asociada a OS. |
| Fase 5 · Gestión Operacional | `AlojamientosPage.jsx` | Actualizada · Revisada · Reemplazada | `hoteles` + `hotelAsig`. |
| Fase 5 · Gestión Operacional | `CredencialesPage.jsx` | Actualizada · Revisada · Reemplazada | Credenciales por Persona/Cliente. |
| Fase 6 · Contratistas | `TercerosSubcontratosPage.jsx` | Actualizada · Revisada · Reemplazada | `subcontratos` fuente de escritura. |
| Fase 6 · Contratistas | `ConveniosPage.jsx` | Actualizada · Revisada · Reemplazada | `convenios` canónico. |
| Fase 6 · Contratistas | `PersonalEmpresaServiciosPage.jsx` | Actualizada · Revisada · Reemplazada | Relación Empresa ↔ Persona. |
| Fase 6 · Contratistas | `HabilitacionesCumplimientoPage.jsx` | Actualizada · Revisada · Reemplazada | Habilitaciones especializadas. |
| Fase 6 · Contratistas | `EvaluacionDesempenoPage.jsx` | Actualizada · Revisada · Reemplazada | Evaluación especializada. |
| Fase 7 · Cumplimiento | `CumplimientoCorporativoPage.jsx` | Actualizada · Revisada · Reemplazada | `empresaDocs` canónico. |
| Fase 7 · Cumplimiento | `HabilitacionClientePage.jsx` | Actualizada · Revisada · Reemplazada | `acreditacionesMandante` canónico. |
| Fase 7 · Cumplimiento | `IncidentesPage.jsx` | Actualizada · Revisada · Reemplazada | `incidentes` canónico. |
| Fase 7 · Cumplimiento | `AuditoriaPage.jsx` | Actualizada · Revisada · Reemplazada | Vista derivada. |
| Fase 8 · Inventario / Activos | `ActivosInventarioPage.jsx` | Actualizada · Revisada · Reemplazada | Página matriz. |
| Fase 8 · Inventario / Activos | `MaquinariaPage.jsx` | Actualizada · Revisada | Adaptador intencional a componente compartido. |
| Fase 8 · Inventario / Activos | `EquiposInstrumentosPage.jsx` | Actualizada · Revisada | Adaptador intencional a componente compartido. |
| Fase 8 · Inventario / Activos | `HerramientasPage.jsx` | Actualizada · Revisada | Adaptador intencional a componente compartido. |
| Fase 8 · Inventario / Activos | `EppInventarioPage.jsx` | Actualizada · Revisada | Inventario físico de EPP. |
| Fase 8 · Inventario / Activos | `MaterialesPage.jsx` | Actualizada · Revisada · Reemplazada | Inventario especializado. |
| Fase 8 · Inventario / Activos | `InsumosPage.jsx` | Actualizada · Revisada · Reemplazada | Inventario especializado. |
| Fase 8 · Inventario / Activos | `BodegasPage.jsx` | Actualizada · Revisada · Reemplazada | Bodegas y ubicaciones. |
| Fase 8 · Inventario / Activos | `MovimientosInventarioPage.jsx` | Actualizada · Revisada · Reemplazada | Trazabilidad de movimientos. |
| Fase 8 · Inventario / Activos | `MantenimientoPage.jsx` | Actualizada · Revisada · Reemplazada | Planes e historial. |
| Fase 8 · Inventario / Activos | `AsignacionesPrestamosPage.jsx` | Actualizada · Revisada · Reemplazada | Préstamos/asignaciones. |
| Fase 9 · Prospectos y oportunidades | `ProspectosPage.jsx` | Actualizada · Revisada · Reemplazada | `prospectos` canónico; conversión trazable. |
| Fase 10 · Gestión personal por proyecto | `GestionPersonalProyectoPage.jsx` | Actualizada · Revisada · Reemplazada | Ruta canónica `/app/reclutamiento`; sin alias `/app/modulos/...` activo. |
| Fase 11 · Centro Operativo | `CentroOperativoPage.jsx` | Actualizada · Revisada · Reemplazada | Ruta canónica `/app/operaciones`; sin alias `/app/modulos/...` activo. |
| Fase 12 · Alertas | `AlertasPage.jsx` | Actualizada · Revisada · Reemplazada | Vista derivada con motor compartido. |
| Fase 13 · Dashboard | `DashboardPage.jsx` | Actualizada · Revisada · Reemplazada | Vista ejecutiva derivada. |
| Fase 14 · Gestión y Administración | `ReportesPage.jsx` | Actualizada · Revisada · Reemplazada | Analítica derivada. |
| Fase 14 · Gestión y Administración | `ImportarExportarPage.jsx` | Actualizada · Revisada · Reemplazada | `/api/data-transfer`. |
| Fase 14 · Gestión y Administración | `UsuariosPermisosPage.jsx` | Actualizada · Revisada · Reemplazada | `/api/users`. |
| Fase 14 · Gestión y Administración | `BitacoraCambiosPage.jsx` | Actualizada · Revisada · Reemplazada | `/api/audit`, solo lectura. |
| Fase 14 · Gestión y Administración | `PrivacidadDatosPage.jsx` | Actualizada · Revisada · Reemplazada | `/api/privacy`. |
| Fase 14 · Gestión y Administración | `ConfiguracionPage.jsx` | Actualizada · Revisada · Reemplazada | `/api/settings`; wrapper genérico retirado. |
| Administración Nexo Klar | `AdministracionClientesPage.jsx` | Actualizada | Vista exclusiva para administrar empresas usuarias y restablecer accesos autorizados. |

## Evolución posterior a la Fase 15

La base React `v3.0.0` conserva la arquitectura y rutas canónicas de la Fase 15. Sobre ella se incorporan las mejoras visuales y de experiencia validadas en la referencia local:

- Ficha de persona simplificada con acciones rápidas, contacto de emergencia, próximo paso y separación entre documentos, aptitudes y formación.
- Capas visuales compartidas para mantener la apariencia de Nexo Klar en sitio público y privado.
- Acceso a configuración MFA y Administración de clientes sin crear rutas paralelas ni reemplazar los módulos especializados.

## Cierre Fase 15 · Migración React — CERRADA

**Fecha:** 12 de septiembre de 2026.

La revisión final se realizó sobre `App.jsx`, `AppLayout`, navegación, Pages activas y referencias legacy.

### Resultado

- No permanecen rutas activas bajo `/app/modulos/...`.
- No se detectan referencias activas a `ModuleWorkspacePage` en la implementación vigente.
- Los wrappers pequeños de Inventario son adaptadores deliberados hacia componentes compartidos y no constituyen una experiencia legacy paralela.
- Las Pages funcionales vigentes están conectadas a rutas activas; no se identificaron Pages de negocio huérfanas para retirar en este cierre.
- Los fallbacks históricos de datos no se eliminan físicamente sin validar previamente datos productivos existentes.

### Rutas canónicas y compatibilidad

| Ruta legacy | Ruta canónica | Estado |
| --- | --- | --- |
| `/app/comunicaciones` | `/app/llamados` | Redirect de compatibilidad. |
| `/app/ordenes-servicio` | `/app/servicios` | Redirect de compatibilidad. |
| `/app/ordenes-servicio/:orderId` | `/app/servicios/:orderId` | Redirect de compatibilidad mediante `LegacyOrderServiceRedirect`. |

Los aliases conservados no renderizan una segunda implementación funcional.

### AppLayout

`AppLayout` quedó reducido a su responsabilidad de layout: branding, Sidebar, Header, dominio visible y `Outlet`. La resolución ruta → dominio se encuentra en `config/page-domains.js` y los estilos estructurales en `styles/app-layout.css`.

**Commits principales:**

- `a279c6a87edcc04e0497a07542d99383c8661064` — configuración ruta/dominio.
- `c2ed17ae38f23920c31d5501328f7bbaaa513d66` — estilos estructurales de AppLayout.
- `cf208fb6f038372640f8cc83be88af79ef4e7bf2` — limpieza de AppLayout.
- `9031bcb34cec1338b5320ff5f1809dd2f52f1fcd` — normalización del alias de detalle de OS.

## Estado final de migración

```text
FASE 0  Normalización                                    ✓ CERRADA
FASE 1  Capital Humano                                   ✓ CERRADA
FASE 2  Clientes                                         ✓ CERRADA
FASE 3  Contratos                                        ✓ CERRADA
FASE 4  Órdenes de servicio                              ✓ CERRADA
FASE 5  Gestión Operacional                              ✓ CERRADA
FASE 6  Contratistas                                     ✓ CERRADA
FASE 7  Cumplimiento                                     ✓ CERRADA
FASE 8  Inventario / Activos                             ✓ CERRADA
FASE 9  Prospectos y oportunidades                       ✓ CERRADA
FASE 10 Gestión personal por proyecto                    ✓ CERRADA
FASE 11 Centro Operativo                                 ✓ CERRADA
FASE 12 Alertas                                          ✓ CERRADA
FASE 13 Dashboard                                        ✓ CERRADA
FASE 14 Gestión y Administración                         ✓ CERRADA
FASE 15 Cierre de migración                              ✓ CERRADA
```

**Conclusión:** la migración React queda finalizada. A partir de `v3.0.0`, nuevas intervenciones corresponden a evolución funcional, QA, optimización o deuda técnica sobre la plataforma React vigente.
