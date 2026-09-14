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
| `RestringidosPage.jsx` | Personas no habilitadas / restringidas operacionalmente. |

## Relación comercial

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `ClientesPage.jsx` | Clientes y vista consolidada Cliente 360. |
| `ContratosPage.jsx` | Contratos y firmas. |
| `OrdenesServicioPage.jsx` | Órdenes de servicio. |

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
| `ProspectosPage.jsx` | Prospectos y oportunidades; pertenece al dominio Gestión de Proyectos y Negocios. |

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

## Reportes, información y administración

| Page JSX | Estado / responsabilidad |
| --- | --- |
| `ReportesPage.jsx` | Reportería y analítica. |
| `ImportarExportarPage.jsx` | Importación y exportación de información. |
| `UsuariosPermisosPage.jsx` | Usuarios y permisos. |
| `BitacoraCambiosPage.jsx` | Bitácora / auditoría de cambios. |
| `PrivacidadDatosPage.jsx` | Privacidad y gobernanza de información. |
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

---

# 9. Lineamiento gráfico y de interfaz

Este bloque resume el lineamiento operativo aportado en `Nexo Klar · Memoria de contexto v1.0`. **No reemplaza al Manual de marca v1.0 ni a los tokens oficiales**: ante cualquier diferencia, manda el Manual de marca y, para decisiones formales, la Matriz de decisiones.

## 9.1 Principio rector

- Base visual clara: marfil y blanco como superficies principales.
- El **chrome es de la marca**: índigo, cobalto y magenta.
- El **área de información operacional usa el semáforo**: verde, ámbar, rojo y gris.
- El ámbar dentro del producto significa una sola cosa: **Por vencer**.
- Todo valor de color, espacio, radio, tipografía, sombra o movimiento debe salir de un **token**. Si falta un token, no se inventa un valor local.
- Proporción orientativa de uso de color: 62 % marfil/blanco · 26 % índigo/grafito · 5 % cobalto · 4 % turquesa · 2 % magenta · 1 % ámbar. El color vivo combinado no debe dominar la interfaz.

## 9.2 Marca y logotipo

- Escritura oficial: **Nexo Klar**.
- Bajada única: **Información que conecta**.
- El logotipo debe utilizar los armados oficiales: horizontal, horizontal con claim, vertical y vertical con claim; isotipo suelto solo para espacios reducidos.
- Tamaño mínimo del isotipo: **16 px**.
- El claim utiliza gris tinta `#5D6B7A`.
- Los seis colores del logotipo no se reinterpretan ni sustituyen por tonos parecidos.

## 9.3 Tipografía

- Marca, titulares y bajadas: **Manrope**.
- Interfaz y textos del producto: **Inter**.
- El logotipo usa Arial Rounded trazada; la fuente no se instala ni distribuye como dependencia de la aplicación.
- Escala canónica de interfaz:
  - display: 40 px / 1.08 / 800 · Manrope;
  - title-1: 30 px / 1.14 / 800 · Manrope;
  - title-2: 23 px / 1.2 / 700 · Manrope;
  - title-3: 18 px / 1.3 / 700 · Inter;
  - body-lg: 16 px / 1.55 / 400 · Inter;
  - body: 14 px / 1.55 / 400 · Inter;
  - body-sm: 13 px / 1.5 / 400 · Inter;
  - label: 12 px / 1.35 / 600 · Inter;
  - caption: 12 px / 1.45 / 400 · Inter;
  - overline: 11 px / 1.2 / 700 · Inter.

## 9.4 Tokens base de color

Los JSX no deben hardcodear colores. Deben consumir los tokens canónicos ya disponibles en estilos.

| Token | Modo claro | Uso principal |
| --- | --- | --- |
| `--nk-base` | `#F4EFE3` | Fondo general de aplicación. |
| `--nk-surface` | `#FFFFFF` | Tarjetas, tablas y modales. |
| `--nk-surface-2` | `#FBF9F5` | Superficie secundaria / zebra. |
| `--nk-line` | `#E3DED2` | Separadores. |
| `--nk-border-control` | `#78848F` | Bordes de campos y controles. |
| `--nk-ink` | `#141A20` | Texto principal. |
| `--nk-ink-2` | `#5D6B7A` | Texto secundario y claim. |
| `--nk-primary` | `#2A2A8C` | Estructura / chrome. |
| `--nk-action` | `#1E3AE0` | Botón principal y enlaces. |
| `--nk-support` | `#26313A` | Apoyo / encabezados. |
| `--nk-accent-warm` | `#E4006E` | Acento comercial. |
| `--nk-accent-data` | `#00CFC1` | Realce de información. |
| `--nk-attention` | `#E9A319` | Atención / por vencer. |
| `--nk-focus` | `#00706A` | Anillo de foco accesible. |

El modo oscuro es oficial y debe **espejar los tokens por rol**, no introducir una paleta paralela escrita a mano.

## 9.5 Espaciado, radios, elevación y movimiento

- Espaciado únicamente en la escala: 0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 y 80 px mediante `--nk-space-*`.
- Radios: `sm` 6 px · `md` 8 px · `lg` 12 px · `xl` 16 px · `pill` 999 px.
- Sombras únicamente mediante `--nk-elev-1` a `--nk-elev-4`.
- Movimiento: rápido 120 ms · normal 180 ms · lento 260 ms, usando la curva canónica.
- Control mínimo: 40 px; objetivo táctil: 44 px.

## 9.6 Semáforo operacional/documental

Existen **cuatro estados y solo cuatro**:

| Estado visible | Rol |
| --- | --- |
| **Vigente** | Información/documento al día. |
| **Por vencer** | Dentro de ventana de aviso. |
| **No habilitado** | Vencido o acreditación rechazada. |
| **Sin información** | No cargado o pendiente de revisión. |

Reglas:

- Nunca comunicar un estado solo por color: debe llevar texto completo e ícono de forma diferenciable.
- `Sin información` no es error y no debe verse rojo.
- El rótulo visible debe ser **No habilitado**, no “bloqueado”.

## 9.7 Componentes, tablas y accesibilidad

- Todo componente interactivo debe contemplar: normal, hover, foco, activo, deshabilitado, cargando, error y vacío.
- El foco debe ser siempre visible; usar anillo de 3 px en `--nk-focus` o equivalente tokenizado.
- Contraste mínimo: 4,5:1 para texto normal; 3:1 para texto grande, bordes funcionales, íconos e indicadores de estado.
- No usar `outline: none` sin reemplazo equivalente.
- Etiquetas de formulario deben estar asociadas semánticamente al control.
- Elementos clickeables deben ser alcanzables por teclado; evitar `div` interactivos sin semántica de botón/enlace.
- Los modales deben gestionar foco correctamente.
- Nada se trunca en silencio: si hay más contenido, debe indicarse y ofrecer acceso al resto.
- Listas largas deben paginar y mostrar total de registros.
- Estados vacíos deben explicar qué falta y qué acción corresponde.
- En tablas, números alineados a la derecha con cifras tabulares; zebra con `--nk-surface-2` y encabezado con `--nk-support`.

## 9.8 Voz visual y de contenido

- Voz: **clara, precisa y cercana**.
- Orden del mensaje: **primero qué ocurre, después qué debe hacer la persona**.
- Español latinoamericano neutro.
- En textos institucionales y de producto: preferir **información** sobre “datos”, salvo textos aprobados que explícitamente mantengan la excepción.
- Nunca presentar a Nexo Klar como “gestión documental”; la categoría aprobada es **control operacional y cumplimiento**.
- La interfaz debe respetar el principio rector de producto: **simple y destacado**.

---

# 10. Cierre de migración React

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
FASE 9  Gestión de Proyectos y Negocios                  ✓ CERRADA
FASE 10 Gestión personal por proyecto                    ✓ CERRADA
FASE 11 Centro Operativo                                 ✓ CERRADA
FASE 12 Alertas                                          ✓ CERRADA
FASE 13 Dashboard                                        ✓ CERRADA
FASE 14 Gestión y Administración                         ✓ CERRADA
FASE 15 Cierre de migración                              ✓ CERRADA
```

**Conclusión:** React sigue siendo la implementación canónica. Este inventario debe actualizarse cada vez que se agregue, retire o renombre un archivo JSX bajo `nexo-v2/src`.