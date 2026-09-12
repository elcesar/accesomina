# Nexo Klar — Mapa de módulos, dependencias y migración

**Estado:** Fases 0 a 15 cerradas · migración React finalizada  
**Actualizado:** 12 de septiembre de 2026  
**Objetivo:** mantener una referencia única del orden de modernización de Nexo Klar, ownership de datos, dependencias, decisiones de layout y criterios de cierre.

## 1. Principios obligatorios

1. **Fuente funcional antes que wrapper.** Cada dato de negocio tiene un módulo dueño; wrappers y orquestadores consumen y relacionan, no crean modelos paralelos.
2. **Una fuente de verdad por dominio.** Los aliases/fallbacks legacy que deban mantenerse son únicamente de compatibilidad y no constituyen una segunda fuente de escritura.
3. **No renombrar legacy sin mapear consumidores.** Especialmente `minas/minaId`, `mantenciones/mantId`, `proyectos`, `cursos`, `examenes` y `eppEntregas`.
4. **Pages especializadas como arquitectura vigente.** Los wrappers genéricos utilizados durante la migración fueron sustituidos en los módulos modernizados; adaptadores pequeños de dominio, como los de inventario, pueden permanecer cuando delegan intencionalmente en componentes compartidos.
5. **Orquestadores consumen módulos dueños.** Gestión de personal por proyecto, Centro Operativo, Alertas y Dashboard no crean ownership operacional paralelo.
6. **Sin refactor global incidental.** Cada cambio se limita al módulo objetivo y dependencias directas.
7. **Design System transversal.** `tokens.css → components.css → CSS específico → JSX`.
8. **Producción React actual primero.** El HTML histórico es referencia funcional/visual, no una arquitectura paralela.
9. **Referencia antes de rediseño.** Antes de modernizar una Page se revisa su HTML/Page/wrapper de origen para recuperar layout, campos, relaciones y flujos válidos.
10. **Acciones globales no se duplican.** `+ Cliente`, `+ Contrato` y `+ Orden de servicio` pertenecen al Header global y no deben repetirse dentro de las páginas.
11. **Densidad operacional media-alta.** Toolbars compactas; cuando existen muchos criterios, mantener filtros primarios visibles y secundarios bajo `Más filtros`.
12. **Grillas contenidas.** Las tablas operacionales deben intentar caber completas en una ventana de escritorio mediante anchos controlados, truncamiento y acciones compactas antes de usar scroll horizontal.
13. **Compatibilidad legacy controlada.** Las rutas antiguas que aún se conservan deben redirigir a una ruta canónica; no deben renderizar una segunda experiencia funcional.

## 2. Fuentes canónicas confirmadas

- **Clientes:** `minas`; `clientes` fallback de lectura. Relaciones por `minaId`.
- **Contratos:** `contratos`; Cliente por `minaId` y OS por `contratoId`.
- **Órdenes de servicio:** `mantenciones`; `proyectos` fallback legacy. Personas por `asignaciones.mantId`.
- **Personas:** `trabajadores`.
- **Turnos:** `turnos`, incluyendo asistencia.
- **Formación / Exámenes:** nuevos registros en `trabajadores[].workerItems`; `cursos` y `examenes` lectura legacy.
- **Salud Ocupacional:** `protocolosSalud`.
- **EPP:** `eppDeliveries`; `eppEntregas` compatibilidad legacy.
- **Restricciones:** `restricted`, sincronizado con estado operacional de `trabajadores`.
- **Comunicaciones:** `callouts`.
- **Flota:** `vehiculos`.
- **Alojamientos:** `hoteles` para catálogo/habitaciones y `hotelAsig` para estadías.
- **Credenciales:** `credenciales`; Persona por `trabId` y Cliente/faena por `minaId`.
- **Terceros:** `subcontratos` para empresa colaboradora.
- **Contratos/convenios de terceros:** `convenios`, relacionados por `subcontratoId`.
- **Personal del contratista:** `personalContratista` como relación Empresa ↔ Persona; `trabajadores` conserva ownership de Persona.
- **Habilitaciones de contratistas:** `habilitaciones`.
- **Evaluación de desempeño de contratistas:** `evaluaciones`.
- **Documentación corporativa:** `empresaDocs`; `documentosEmpresa` fallback de lectura.
- **Habilitación del Cliente / mandante:** `acreditacionesMandante`, relacionada por `minaId`, tipo de entidad y referencia de entidad.
- **Incidentes y no conformidades:** `incidentes`, relacionados a OS por `mantId`.
- **Auditoría:** vista derivada sobre fuentes de cumplimiento existentes.

## 3. Dependencia funcional principal

```text
Cliente
  └── Contrato
        └── Orden de servicio
              ├── Personas / asignaciones / turnos
              ├── Comunicaciones y convocatorias
              ├── Flota y equipos móviles
              ├── Alojamientos y estadías
              ├── Credenciales de acceso
              ├── Terceros / contratistas
              │     ├── Convenios
              │     ├── Personal relacionado
              │     ├── Habilitaciones
              │     └── Evaluaciones
              ├── Recursos / inventario
              └── Cumplimiento
                    ├── Documentación corporativa
                    ├── Habilitación del Cliente
                    ├── Incidentes / no conformidades
                    └── Auditoría
```

Las relaciones se almacenan una vez en el módulo dueño y se visualizan/navegan desde ambos extremos.

## 4. Plan de migración

### FASE 0 · Normalización — ✓ CERRADA
Mapa de ownership, persistencia, aliases legacy, rutas y dependencias establecido.

### FASE 1 · Capital Humano — ✓ CERRADA
Personas, Turnos y asistencia, EPP, Formación, Exámenes, Salud Ocupacional y Restringidos especializados y documentados.

### FASE 2 · Clientes — ✓ CERRADA
`ClientesPage.jsx` recupera filtros, grilla y ficha; `minas` permanece como fuente canónica.

### FASE 3 · Contratos — ✓ CERRADA
`ContratosPage.jsx` recupera filtros/KPIs, tabla global y ficha con Cliente, OS y documentación contractual.

### FASE 4 · Órdenes de servicio — ✓ CERRADA
`OrdenesServicioPage.jsx` recupera filtros, cards operacionales y ficha. `mantenciones` es canónico.

### FASE 5 · Gestión Operacional — ✓ CERRADA
Comunicaciones, Flota, Alojamientos/estadías y Credenciales especializados.

### FASE 6 · Contratistas — ✓ CERRADA
Terceros, convenios, personal del contratista, habilitaciones y evaluación de desempeño especializados con ownership separado.

### FASE 7 · Cumplimiento — ✓ CERRADA
Documentación corporativa, habilitación del Cliente, incidentes/no conformidades y Auditoría especializados sin ownership paralelo.

### FASE 8 · Inventario / Activos — ✓ CERRADA
Activos, maquinaria, equipos, herramientas, EPP de inventario, materiales, insumos, bodegas, movimientos, mantenimiento y préstamos/asignaciones especializados sobre componentes compartidos cuando corresponde.

### FASE 9 · Prospectos y oportunidades — ✓ CERRADA
`prospectos` canónico, `oportunidades` fallback y conversión trazable a Cliente/Contrato/OS.

### FASE 10 · Gestión personal por proyecto — ✓ CERRADA
Orquestador sobre `trabajadores`, OS y `asignaciones`; Persona mantiene ownership en `trabajadores`.

### FASE 11 · Centro Operativo — ✓ CERRADA
Orquestador transversal de ejecución sobre OS y módulos dueños; solo `dailyLogs` y `capaActions` son registros especializados propios.

### FASE 12 · Alertas — ✓ CERRADA
Vista derivada de vencimientos, bloqueos, faltantes y riesgos mediante motor operacional compartido; no duplica el estado fuente.

### FASE 13 · Dashboard — ✓ CERRADA
Vista ejecutiva derivada y de solo lectura sobre fuentes consolidadas.

### FASE 14 · Gobierno / Administración — ✓ CERRADA
Reportes, importar/exportar, usuarios/permisos, bitácora, privacidad y configuración especializados y conectados a sus APIs vigentes.

### FASE 15 · Cierre de migración — ✓ CERRADA

**Fecha de cierre:** 12 de septiembre de 2026.

Se realizó la revisión final de Router, Pages y referencias legacy antes de declarar cerrada la migración React.

1. **Rutas canónicas verificadas.** La navegación funcional utiliza las rutas React vigentes. No permanecen rutas activas bajo `/app/modulos/...`.
2. **Aliases de compatibilidad acotados.** Se mantienen únicamente redirects deliberados para URLs históricas que pueden existir en marcadores o enlaces externos:
   - `/app/comunicaciones` → `/app/llamados`.
   - `/app/ordenes-servicio` → `/app/servicios`.
   - `/app/ordenes-servicio/:orderId` → `/app/servicios/:orderId`.
3. **Sin renderizado paralelo en aliases.** El detalle legacy de Orden de servicio fue normalizado para redirigir a la URL canónica mediante `LegacyOrderServiceRedirect`; no renderiza una segunda instancia funcional de `OrdenesServicioPage`.
4. **Wrappers genéricos legacy retirados del flujo activo.** No se detectan referencias activas a `ModuleWorkspacePage` en el código vigente. Los wrappers pequeños de Inventario se consideran adaptadores intencionales porque parametrizan componentes especializados compartidos y no mantienen lógica legacy paralela.
5. **Pages alcanzables.** La revisión del Router confirma que las Pages funcionales vigentes están conectadas a rutas activas; no se identificaron Pages de negocio huérfanas que requieran retiro como parte del cierre.
6. **Fallbacks de datos.** Los fallbacks de lectura documentados (`clientes`, `proyectos`, `cursos`, `examenes`, `eppEntregas`, `documentosEmpresa`, entre otros) no se eliminan automáticamente en esta fase: su retiro físico queda condicionado a comprobar que no existen datos productivos históricos que dependan de ellos. No son fuentes de escritura nuevas.

**Commit de normalización de rutas:** `9031bcb34cec1338b5320ff5f1809dd2f52f1fcd`.

**Resultado:** la migración funcional a React queda cerrada. A partir de este punto, nuevas intervenciones se consideran evolución normal del producto, deuda técnica o retiro controlado de compatibilidad; ya no forman parte del plan de migración 0–15.

## 5. Estado ejecutivo

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
FASE 14 Gobierno / Administración                        ✓ CERRADA
FASE 15 Cierre de migración                              ✓ CERRADA
```

**Punto actual:** migración React finalizada. Próximo trabajo: evolución funcional, estabilización, QA y deuda técnica priorizada sobre la plataforma vigente.

## 6. Criterio de cierre por fase

Una fase se cierra cuando corresponda y se hayan completado: referencia/origen revisado; campos, reglas y relaciones contrastados; ownership y fuentes canónicas/legacy identificadas; dependencias verificadas; Page especializada alineada al Design System; navegación y creación validadas; versionado real en escrituras; validación funcional/visual; y trazabilidad actualizada.

## 7. Checklist obligatorio para evolución posterior

- [ ] identificar Page/ruta activa;
- [ ] identificar fuentes de lectura y escritura;
- [ ] mapear IDs y relaciones;
- [ ] respetar módulo dueño;
- [ ] revisar dependencias y permisos;
- [ ] revisar Design System antes de CSS/JSX local;
- [ ] evitar duplicar acciones globales del Header;
- [ ] mantener navegación entre entidades con ficha propia;
- [ ] usar `moduleVersions` real en escrituras;
- [ ] mantener aliases solo como redirects cuando exista una necesidad de compatibilidad;
- [ ] retirar fallbacks de datos únicamente después de validar datos productivos;
- [ ] validar visual y funcionalmente antes de publicar.

## 8. Estado post-migración

`AccesoMina_v6.html` permanece como referencia histórica funcional y visual. La aplicación React bajo `nexo-v2` es la implementación vigente y la única base para evolución del producto. Los aliases y fallbacks documentados son compatibilidad controlada y deben reducirse progresivamente cuando la evidencia productiva permita retirarlos.