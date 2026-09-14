# Nexo Klar · Inventario JSX vigente

Este documento mantiene la trazabilidad canónica de los archivos React JSX vigentes bajo `nexo-v2/src` y reemplaza el inventario parcial anterior centrado solo en `src/pages`.

**Actualizado:** 14 de septiembre de 2026  
**Estado global:** migración React cerrada; evolución funcional y visual activa.  
**Baseline:** rama `main` de Nexo Klar React.

## Alcance de este inventario

Se registran todos los archivos `.jsx` actualmente presentes en `nexo-v2/src`, agrupados por responsabilidad:

- entrada y composición de la aplicación;
- Pages de negocio y acceso;
- componentes de layout;
- componentes públicos y secciones del landing;
- componentes de inventario reutilizables;
- componentes UI compartidos;
- servicio React de autenticación.

El HTML histórico `AccesoMina_v6.html` continúa siendo referencia funcional y visual cuando corresponda, pero React es la implementación vigente.

## Reglas transversales vigentes

- Revisar la referencia histórica antes de rediseñar una Page.
- Mantener una única fuente funcional de escritura por dominio; los fallbacks legacy son solo compatibilidad de lectura cuando corresponda.
- `AppLayout` muestra el dominio/sección una sola vez; las Pages no deben repetirlo como kicker.
- Las acciones globales `+ Cliente`, `+ Contrato` y `+ Orden de servicio` pertenecen al Header.
- Las entidades con ficha propia deben ser navegables desde el contexto operacional.
- Las vistas consolidadas leen señales de los módulos dueños y no duplican ownership.
- Alertas es una vista derivada y priorizada; `callouts` sigue perteneciendo a Comunicaciones.
- Dashboard es una vista ejecutiva derivada y comparte `services/operational-alerts.js` con Alertas.
- Densidad operacional media-alta; filtros secundarios bajo `Más filtros` cuando corresponda.
- Las grillas deben intentar caber en escritorio antes de recurrir a scroll horizontal.
- En el sitio público, `Acceso` navega a `/login` y se mantiene la forma de acceso actualmente implementada.
- Las rutas legacy que se conserven deben ser redirects hacia una ruta canónica, nunca una segunda implementación funcional.

---

# 1. Entrada y composición general

| Archivo JSX | Responsabilidad |
| --- | --- |
| `src/main.jsx` | Bootstrap de React. |
| `src/App.jsx` | Definición de rutas y composición principal. |

# 2. Pages React vigentes

## Sitio público y acceso

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `LandingPage.jsx` | Landing público; compone todas las secciones públicas y CTA final. |
| `LoginPage.jsx` | Acceso principal a la plataforma. |
| `ForgotPasswordPage.jsx` | Solicitud de recuperación de contraseña. |
| `ResetPasswordPage.jsx` | Restablecimiento de contraseña. |
| `ChangePasswordPage.jsx` | Cambio de contraseña para usuario autenticado. |
| `NotFoundPage.jsx` | Página 404 / ruta no encontrada. |

## Centro de control

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `DashboardPage.jsx` | Panel ejecutivo derivado de la operación. |
| `AlertasPage.jsx` | Alertas operacionales priorizadas. |
| `GestionPersonalProyectoPage.jsx` | Gestión de personal por proyecto / reclutamiento. |
| `CentroOperativoPage.jsx` | Centro operativo y coordinación de procesos. |

## Capital humano

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `TrabajadoresPage.jsx` | Listado principal de personas. |
| `NuevoTrabajadorPage.jsx` | Alta de nueva persona. |
| `FichaTrabajadorPage.jsx` | Ficha 360 de persona. |
| `TurnosPage.jsx` | Turnos y asistencia. |
| `ProteccionEppPage.jsx` | Entregas y control de EPP por persona. |
| `FormacionPage.jsx` | Formación y certificaciones. |
| `ExamenesPage.jsx` | Exámenes y aptitudes. |
| `SaludOcupacionalPage.jsx` | Salud ocupacional y protocolos. |
| `RestringidosPage.jsx` | Personas restringidas / bloqueadas. |

## Relación comercial

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `ClientesPage.jsx` | Clientes y vista consolidada Cliente 360. |
| `ContratosPage.jsx` | Contratos y firmas. |
| `OrdenesServicioPage.jsx` | Órdenes de servicio. |
| `ProspectosPage.jsx` | Prospectos y oportunidades. |

## Gestión operacional

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `ComunicacionesPage.jsx` | Comunicaciones y convocatorias. |
| `VehiculosPage.jsx` | Flota y equipos móviles. |
| `AlojamientosPage.jsx` | Alojamientos y estadías. |
| `CredencialesPage.jsx` | Credenciales de acceso. |

## Contratistas y empresas colaboradoras

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `TercerosSubcontratosPage.jsx` | Terceros y subcontratos. |
| `ConveniosPage.jsx` | Convenios y contratos de terceros. |
| `PersonalEmpresaServiciosPage.jsx` | Personas de empresas colaboradoras. |
| `HabilitacionesCumplimientoPage.jsx` | Habilitaciones y cumplimiento de terceros. |
| `EvaluacionDesempenoPage.jsx` | Evaluación de desempeño de terceros. |

## Cumplimiento y calidad

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `CumplimientoCorporativoPage.jsx` | Documentación / cumplimiento corporativo. |
| `HabilitacionClientePage.jsx` | Requisitos y habilitación por cliente. |
| `IncidentesPage.jsx` | Incidentes y no conformidades. |
| `AuditoriaPage.jsx` | Auditoría documental. |

## Gestión de proyectos y negocios

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `LibroObraPage.jsx` | Libro de Obra: anotaciones, compromisos, evidencias, estados y solicitudes de firma. |

## Activos, equipos e inventario

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `ActivosInventarioPage.jsx` | Página matriz de activos e inventario. |
| `MaquinariaPage.jsx` | Adaptador a inventario especializado de maquinaria. |
| `EquiposInstrumentosPage.jsx` | Adaptador a equipos e instrumentos. |
| `HerramientasPage.jsx` | Adaptador a herramientas. |
| `EppInventarioPage.jsx` | Inventario físico de EPP. |
| `MaterialesPage.jsx` | Inventario de materiales. |
| `InsumosPage.jsx` | Inventario de insumos y consumibles. |
| `BodegasPage.jsx` | Bodegas y ubicaciones. |
| `MovimientosInventarioPage.jsx` | Trazabilidad de movimientos de inventario. |
| `MantenimientoPage.jsx` | Planes e historial de mantenimiento. |
| `AsignacionesPrestamosPage.jsx` | Asignaciones y préstamos. |

## Reportes, datos y administración

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `ReportesPage.jsx` | Reportería y analítica. |
| `ImportarExportarPage.jsx` | Importación y exportación de datos. |
| `UsuariosPermisosPage.jsx` | Usuarios y permisos. |
| `BitacoraCambiosPage.jsx` | Bitácora / auditoría de cambios. |
| `PrivacidadDatosPage.jsx` | Privacidad y gobernanza de datos. |
| `ConfiguracionPage.jsx` | Configuración de empresa. |
| `AdministracionClientesPage.jsx` | Administración Nexo Klar de clientes / tenants. |

**Total Pages JSX en `src/pages`: 55.**

---

# 3. Public landing · JSX vigentes

El sitio público ya no debe documentarse solo como `LandingPage.jsx`: el landing se compone de navegación, diálogos y nueve secciones JSX independientes.

## Composición pública

| Archivo JSX | Responsabilidad |
| --- | --- |
| `components/public/BrandLogo.jsx` | Marca / logo reutilizable. |
| `components/public/PublicNavigation.jsx` | Navegación superior y pestañas del sitio público. |
| `components/public/PublicDialogs.jsx` | Diálogo de demostración y contenidos informativos. |

## Secciones públicas

| Archivo JSX | Sección visible |
| --- | --- |
| `components/public/sections/HomeSection.jsx` | Inicio / hero con propuesta de valor y vista del producto. |
| `components/public/sections/PlatformSection.jsx` | Plataforma. |
| `components/public/sections/BenefitsSection.jsx` | Beneficios. |
| `components/public/sections/ProductSection.jsx` | Producto. |
| `components/public/sections/SolutionsSection.jsx` | Soluciones / capacidades. |
| `components/public/sections/IndustriesSection.jsx` | Industrias. |
| `components/public/sections/ImplementationSection.jsx` | Implementación y privacidad. |
| `components/public/sections/PurposeSection.jsx` | Propósito. |
| `components/public/sections/CustomerAccessSection.jsx` | Acceso / creación de empresa, manteniendo la lógica de acceso React vigente. |

### Estructura actual del landing

`LandingPage.jsx` compone actualmente:

1. Inicio
2. Plataforma
3. Beneficios
4. Producto
5. Soluciones / Capacidades
6. Industrias
7. Implementación y privacidad
8. Propósito
9. Acceso clientes
10. CTA final / contacto

La navegación pública principal utiliza las ocho secciones de contenido institucional y mantiene `Acceso` como acción hacia `/login`; el acceso/registro de clientes conserva la implementación React vigente.

---

# 4. Componentes de layout JSX

| Archivo JSX | Responsabilidad |
| --- | --- |
| `components/layout/AppLayout.jsx` | Layout privado principal y `Outlet`. |
| `components/layout/Header.jsx` | Header de la aplicación privada y acciones globales. |
| `components/layout/Sidebar.jsx` | Navegación lateral por dominios. |

# 5. Componentes JSX de inventario reutilizables

| Archivo JSX | Responsabilidad |
| --- | --- |
| `components/inventory/InventoryCategoryPage.jsx` | Base compartida para categorías de inventario. |
| `components/inventory/MaterialsInventoryPage.jsx` | Implementación compartida de materiales. |
| `components/inventory/ConsumablesInventoryPage.jsx` | Implementación compartida de consumibles / insumos. |

# 6. Componentes UI JSX

| Archivo JSX | Responsabilidad |
| --- | --- |
| `components/ui/StatusBadge.jsx` | Badge de estado reutilizable. |

# 7. Servicios JSX

| Archivo JSX | Responsabilidad |
| --- | --- |
| `services/auth.jsx` | Contexto / integración React de autenticación. |

---

# 8. Resumen del inventario JSX

```text
src/pages                                      55 JSX
src/components/public/sections                  9 JSX
src/components/public                           3 JSX
src/components/layout                           3 JSX
src/components/inventory                        3 JSX
src/components/ui                               1 JSX
src/App.jsx + src/main.jsx                      2 JSX
src/services/auth.jsx                           1 JSX
------------------------------------------------------
TOTAL                                           77 JSX
```

# 9. Cierre de migración React

La Fase 15 de migración React permanece cerrada. Este documento no implica reapertura de la migración: registra la estructura vigente después de las evoluciones posteriores, entre ellas Libro de Obra y la descomposición completa del sitio público.

## Rutas legacy y compatibilidad

| Ruta legacy | Ruta canónica | Estado |
| --- | --- | --- |
| `/app/comunicaciones` | `/app/llamados` | Redirect de compatibilidad. |
| `/app/ordenes-servicio` | `/app/servicios` | Redirect de compatibilidad. |
| `/app/ordenes-servicio/:orderId` | `/app/servicios/:orderId` | Redirect de compatibilidad mediante `LegacyOrderServiceRedirect`. |

Los aliases conservados no renderizan una segunda implementación funcional.

## Estado de fases

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

**Conclusión:** React sigue siendo la implementación canónica. Este inventario debe actualizarse cada vez que se agregue, retire o renombre un archivo JSX bajo `nexo-v2/src`.