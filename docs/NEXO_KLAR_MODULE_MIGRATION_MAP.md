# Nexo Klar — Mapa de módulos, dependencias y migración

**Estado:** Fases 0 a 5 cerradas · próxima Fase 6  
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
              ├── Recursos / inventario
              └── Cumplimiento
```

Las relaciones se almacenan una vez en el módulo dueño y se visualizan/navegan desde ambos extremos.

## 4. Plan de migración

### FASE 0 · Normalización — ✓ CERRADA
Mapa de ownership, persistencia, aliases legacy, rutas y dependencias establecido.

### FASE 1 · Capital Humano — ✓ CERRADA

**Módulos:** Personas, Turnos y asistencia, EPP, Formación, Exámenes, Salud Ocupacional y Restringidos.

**Ajustes finales de layout (10-09-2026):**
- `ProteccionEppPage.jsx`: recupera la arquitectura histórica **Personas | Matriz por función | Historial de entregas**, segmentos de personas y KPIs orientados a cobertura/reposición, manteniendo `Registrar entrega`.
- `FormacionPage.jsx`: conserva tabla especializada e incorpora contexto **Cliente → Contrato → OS** derivado de asignaciones. La toolbar se compactó a búsqueda + Cliente + `Más filtros`; Contrato, OS, Tipo y Estado quedan como filtros secundarios.
- `ExamenesPage.jsx`: incorpora contexto **Cliente → Contrato → OS** y mantiene tabla especializada, evidencia y vigencia.
- `RestringidosPage.jsx`: se mantiene compacto con búsqueda + Estado; no requiere expansión adicional.
- Personas, Turnos y Salud Ocupacional mantienen su estructura React por estar alineada o mejorar el patrón histórico.

**Estado:** validada, documentada y cerrada.

### FASE 2 · Clientes — ✓ CERRADA

`ClientesPage.jsx` fue revalidada contra el HTML histórico. El layout final recupera el patrón **filtros → grid de clientes → ficha al abrir**, evitando selección automática del primer cliente. La ficha conserva contactos, requisitos y relaciones Cliente → Contrato → OS. No duplica `+ Cliente` ni otras acciones globales del Header.

### FASE 3 · Contratos — ✓ CERRADA

`ContratosPage.jsx` recupera el patrón **filtros/KPIs → tabla global → ficha al abrir**. Conserva documentación contractual, relación con Cliente y OS, y navegación entre entidades. No duplica `+ Contrato` del Header.

### FASE 4 · Órdenes de servicio — ✓ CERRADA

`OrdenesServicioPage.jsx` recupera el patrón histórico **filtros → cards operacionales → ficha al abrir**, manteniendo la implementación React especializada de preparación de personas, requisitos, alojamientos, recursos, evidencias y cierre. La ficha dispone de scroll vertical propio y encabezado sticky para operaciones extensas. No duplica `+ Orden de servicio` del Header.

`mantenciones` continúa como fuente canónica de escritura; `proyectos` queda como fallback legacy y `asignaciones.mantId` conserva la relación de personas.

### FASE 5 · Gestión Operacional — ✓ CERRADA

**Fecha de cierre:** 10 de septiembre de 2026.

Los cuatro submódulos fueron especializados, contrastados con su origen y ajustados al Design System:

1. **Comunicaciones y convocatorias — COMPLETADO.** Flujo OS → personas elegibles → comunicación/convocatoria → respuesta → asignación. Navegación al contexto operacional y KPIs derivados de `callouts`.
2. **Flota y equipos móviles — COMPLETADO.** `VehiculosPage.jsx` recupera layout operacional tabular: filtros → KPIs → tabla global → ficha bajo demanda. `vehiculos` mantiene ownership; `inventoryItems` se reserva para Fase 8.
3. **Alojamientos y estadías — COMPLETADO.** `AlojamientosPage.jsx` recupera cards de alojamiento + tabla global de asignaciones. `hoteles` mantiene catálogo/habitaciones y `hotelAsig` las estadías, relacionadas con Persona y OS sin duplicación.
4. **Credenciales de acceso — COMPLETADO.** `CredencialesPage.jsx` recupera filtros + KPIs + tabla global + ficha bajo demanda. `credenciales` mantiene número, emisión, vencimiento, zona, campamento y respaldo, relacionada con Persona y Cliente/faena.

**Resultado:** Fase 5 cerrada. Gestión Operacional consume Cliente–Contrato–OS–Persona ya estabilizados y deja Cumplimiento documental transversal para Fase 7.

### FASE 6 · Contratistas — ○ PENDIENTE
Empresas colaboradoras, subcontratos/convenios, personas vinculadas, habilitaciones y evaluación de desempeño. No duplicar Persona o Contrato cuando pueda expresarse mediante relaciones existentes.

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
FASE 6  Contratistas                                     ○ PENDIENTE
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

**Punto actual:** iniciar Fase 6 · Contratistas.

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