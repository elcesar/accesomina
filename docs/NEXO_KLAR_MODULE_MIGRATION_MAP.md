# Nexo Klar — Mapa de módulos, dependencias y migración

**Estado:** Fases 0 a 6 cerradas · próxima Fase 7  
**Actualizado:** 10 de septiembre de 2026  
**Objetivo:** mantener una referencia única del orden de modernización de Nexo Klar, ownership de datos, dependencias, decisiones de layout y criterios de cierre.

## 1. Principios obligatorios

1. **Fuente funcional antes que wrapper.** Cada dato de negocio tiene un módulo dueño; wrappers y orquestadores consumen y relacionan, no crean modelos paralelos.
2. **Una fuente de verdad por dominio.** Se permiten aliases/fallbacks legacy de lectura durante la migración, pero una única fuente de escritura.
3. **No renombrar legacy sin mapear consumidores.** Especialmente `minas/minaId`, `mantenciones/mantId`, `proyectos`, `cursos`, `examenes` y `eppEntregas`.
4. **Especialización progresiva.** `PrivateModulePage`, `ModuleWorkspacePage` y `OperationalWorkspacePage` son infraestructura legacy/transitoria y referencia de reglas, no fuentes funcionales.
5. **Orquestadores al final.** Gestión de personal por proyecto, Centro Operativo, Alertas y Dashboard se estabilizan después de sus módulos fuente.
6. **Sin refactor global incidental.** Cada cambio se limita al módulo objetivo y dependencias directas.
7. **Design System transversal.** `tokens.css → components.css → CSS específico → JSX`.
8. **Producción React actual primero.** El HTML histórico es referencia funcional/visual, no una arquitectura paralela.
9. **Referencia antes de rediseño.** Antes de modernizar una Page se revisa su HTML/Page/wrapper de origen para recuperar layout, campos, relaciones y flujos válidos.
10. **Acciones globales no se duplican.** `+ Cliente`, `+ Contrato` y `+ Orden de servicio` pertenecen al Header global y no deben repetirse dentro de las páginas.
11. **Densidad operacional media-alta.** Toolbars compactas; cuando existen muchos criterios, mantener filtros primarios visibles y secundarios bajo `Más filtros`.
12. **Libro de Obra al final.** Bitácora/firma asociadas a ese dominio permanecen postergadas.

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
- **Flota:** `vehiculos`; no se migra a `inventoryItems` en Fase 5.
- **Alojamientos:** `hoteles` para catálogo/habitaciones y `hotelAsig` para estadías.
- **Credenciales:** `credenciales`; Persona por `trabId` y Cliente/faena por `minaId`.
- **Terceros:** `subcontratos` para empresa colaboradora.
- **Contratos/convenios de terceros:** `convenios`, relacionados por `subcontratoId`.
- **Personal del contratista:** `personalContratista` como relación Empresa ↔ Persona; `trabajadores` conserva ownership de Persona.
- **Habilitaciones de contratistas:** `habilitaciones`.
- **Evaluación de desempeño de contratistas:** `evaluaciones`.

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
```

Las relaciones se almacenan una vez en el módulo dueño y se visualizan/navegan desde ambos extremos.

## 4. Plan de migración

### FASE 0 · Normalización — ✓ CERRADA
Mapa de ownership, persistencia, aliases legacy, rutas y dependencias establecido.

### FASE 1 · Capital Humano — ✓ CERRADA
Personas, Turnos y asistencia, EPP, Formación, Exámenes, Salud Ocupacional y Restringidos especializados y documentados.

### FASE 2 · Clientes — ✓ CERRADA
`ClientesPage.jsx` recupera **filtros → grid de clientes → ficha al abrir**. `minas` permanece como fuente canónica y `clientes` como fallback.

### FASE 3 · Contratos — ✓ CERRADA
`ContratosPage.jsx` recupera **filtros/KPIs → tabla global → ficha al abrir**, con Cliente, OS y documentación contractual.

### FASE 4 · Órdenes de servicio — ✓ CERRADA
`OrdenesServicioPage.jsx` recupera **filtros → cards operacionales → ficha al abrir**. `mantenciones` es canónico; `proyectos` fallback; personas por `asignaciones.mantId`.

### FASE 5 · Gestión Operacional — ✓ CERRADA
Comunicaciones, Flota, Alojamientos/estadías y Credenciales especializados y contrastados con su origen HTML/wrapper.

### FASE 6 · Contratistas — ✓ CERRADA

**Fecha de cierre:** 10 de septiembre de 2026.

La fase quedó especializada recuperando los layouts útiles del HTML histórico y separando ownership por dominio:

1. **Terceros y subcontratos — COMPLETADO.** `TercerosSubcontratosPage.jsx` reemplaza el flujo genérico y recupera **filtros → KPIs → tabla global → ficha al abrir**. `subcontratos` es la fuente de escritura. El listado muestra F30, F30-1, cotizaciones y seguro como vencimientos individuales con estado y días restantes/vencidos.
2. **Contratos y convenios — COMPLETADO.** `ConveniosPage.jsx` reemplaza `ModuleWorkspacePage` y recupera **KPIs → filtros → tabla de empresa / contrato-convenio / órdenes de compra / vigencia**. `convenios` es canónico; información histórica de `subcontratos` se usa solo como fallback visual cuando corresponde.
3. **Personal del contratista — COMPLETADO.** `PersonalEmpresaServiciosPage.jsx` administra `personalContratista` como relación Empresa ↔ Persona. La Persona sigue perteneciendo a `trabajadores`, incluyendo su ficha, formación, aptitudes, turnos y restricciones.
4. **Habilitaciones y cumplimiento — COMPLETADO.** `HabilitacionesCumplimientoPage.jsx` recupera la vista HTML de **Empresa / Base documental / Pendientes / Estado / Revisión**. `habilitaciones` registra requisitos laborales, previsionales, seguridad, seguros y exigencias del cliente.
5. **Evaluación de desempeño — COMPLETADO.** `EvaluacionDesempenoPage.jsx` recupera la matriz histórica con notas 1–5 en Cumplimiento, Seguridad y Calidad/servicio, resultado consolidado y clasificación. `evaluaciones` es la fuente especializada.

**Regla de ownership confirmada:** Fase 6 no crea Persona, Contrato ni cumplimiento paralelos. Las relaciones se guardan en sus módulos dueños y se consumen desde las vistas de Contratistas.

**Resultado:** Fase 6 cerrada y documentada.

### FASE 7 · Cumplimiento — ○ PENDIENTE
Cumplimiento corporativo, requisitos del cliente, documentación, incidentes y auditoría sobre Cliente–Contrato–OS–Persona.

### FASE 8 · Inventario / Activos — ○ PENDIENTE
Activos, maquinaria, equipos, herramientas, EPP de inventario, materiales, bodegas, movimientos, mantenimiento y préstamos/asignaciones. Evaluar `inventoryItems` como dominio común.

### FASE 9 · Prospectos + operación — ○ PENDIENTE
Prospectos/oportunidades y seguimiento comercial previo a Cliente/Contrato. Libro de Obra permanece fuera de esta fase.

### FASE 10 · Gestión personal por proyecto — ○ PENDIENTE
Orquestador sobre `trabajadores`, OS, `asignaciones`, Turnos y preparación. No es dueño de Persona.

### FASE 11 · Centro Operativo — ○ PENDIENTE
Orquestador transversal de ejecución sobre OS, personas, comunicaciones, flota, alojamientos, credenciales y recursos.

### FASE 12 · Alertas — ○ PENDIENTE
Alertas derivadas de vencimientos, bloqueos, faltantes y riesgos; referencian el dato fuente y no duplican su estado.

### FASE 13 · Dashboard — ○ PENDIENTE
KPIs ejecutivos/operacionales derivados de fuentes consolidadas. Solo lectura, resumen y navegación.

### FASE 14 · Gobierno / Administración — ○ PENDIENTE
Usuarios, roles, permisos, tenant, configuración, privacidad, auditoría administrativa, importar/exportar y gobierno de datos.

### FASE 15 · Cierre de migración — ○ PENDIENTE
Retiro seguro de aliases, fallbacks, wrappers y claves legacy cuando no existan consumidores productivos.

## 5. Estado ejecutivo

```text
FASE 0  Normalización                                    ✓ CERRADA
FASE 1  Capital Humano                                   ✓ CERRADA
FASE 2  Clientes                                         ✓ CERRADA
FASE 3  Contratos                                        ✓ CERRADA
FASE 4  Órdenes de servicio                              ✓ CERRADA
FASE 5  Gestión Operacional                              ✓ CERRADA
FASE 6  Contratistas                                     ✓ CERRADA
FASE 7  Cumplimiento                                     ○ PENDIENTE
FASE 8  Inventario / Activos                             ○ PENDIENTE
FASE 9  Prospectos + operación                           ○ PENDIENTE
FASE 10 Gestión personal por proyecto                    ○ PENDIENTE
FASE 11 Centro Operativo                                 ○ PENDIENTE
FASE 12 Alertas                                          ○ PENDIENTE
FASE 13 Dashboard                                        ○ PENDIENTE
FASE 14 Gobierno / Administración                        ○ PENDIENTE
FASE 15 Cierre de migración                              ○ PENDIENTE
```

**Punto actual:** iniciar Fase 7 · Cumplimiento.

## 6. Criterio de cierre por fase

Una fase se cierra cuando corresponda y se hayan completado: referencia/origen revisado; campos, reglas y relaciones contrastados; ownership y fuentes canónicas/legacy identificadas; dependencias verificadas; Page especializada alineada al Design System; navegación y creación validadas; versionado real en escrituras; validación funcional/visual; y trazabilidad actualizada.

## 7. Checklist obligatorio por módulo

- [ ] identificar Page/ruta activa;
- [ ] revisar HTML/Page/wrapper de referencia;
- [ ] identificar fuentes de lectura y escritura;
- [ ] mapear IDs y relaciones;
- [ ] clasificar legacy vs canónico;
- [ ] definir módulo dueño;
- [ ] revisar dependencias y permisos;
- [ ] revisar Design System antes de CSS/JSX local;
- [ ] evitar duplicar acciones globales del Header;
- [ ] usar toolbars compactas y `Más filtros` cuando la cantidad de controles afecte jerarquía/densidad;
- [ ] mantener navegación entre entidades con ficha propia;
- [ ] usar `moduleVersions` real en escrituras;
- [ ] no eliminar fallback/wrapper mientras existan consumidores;
- [ ] validar visual y funcionalmente antes del cierre.

## 8. Libro de Obra

Libro de Obra, su bitácora, firma y capacidades relacionadas permanecen postergados hasta finalizar las fases funcionales y de gobierno prioritarias.