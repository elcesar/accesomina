# Nexo Klar — Mapa de módulos, dependencias y migración

**Estado:** Fase 0 cerrada — arquitectura, ownership y dependencias verificadas en producción  
**Objetivo:** fijar una referencia única para decidir qué módulo es dueño de cada dato, qué claves legacy siguen vigentes, qué wrappers/orquestadores deben esperar y en qué orden se moderniza la aplicación.

## 1. Principios obligatorios

1. **Fuente funcional antes que wrapper.** Cada dato de negocio debe tener un módulo dueño. Los wrappers/orquestadores consumen, relacionan, resumen y navegan; no crean modelos paralelos.
2. **Una fuente de verdad por dominio.** Durante la migración se permite leer claves legacy, pero cada módulo especializado debe converger a una única fuente canónica de escritura.
3. **No renombrar legacy sin mapear consumidores.** Antes de cambiar `minas`, `minaId`, `mantenciones`, `proyectos`, `eppEntregas`, etc., se identifican todos sus lectores, escritores y relaciones.
4. **Especialización progresiva.** `PrivateModulePage`, `ModuleWorkspacePage` y `OperationalWorkspacePage` son infraestructura transitoria/fallback; no se eliminan mientras existan módulos productivos que dependan de ellos.
5. **Orquestadores al final.** Dashboard, Alertas, Gestión de personal por proyecto y Centro Operativo se estabilizan después de sus módulos fuente.
6. **Sin refactor global incidental.** Cada cambio debe limitarse al módulo objetivo y a sus dependencias directas.
7. **Design System transversal.** `tokens.css` → `components.css` → CSS local → JSX. No se crean tokens, tipografías o componentes visuales paralelos.
8. **Producción actual primero.** No se crea ni mantiene una variante HTML, fallback HTML o arquitectura paralela.

## 2. Golden rule por cambio

Toda actualización debe responder explícitamente:

1. ¿Cuál es el módulo dueño del dato?
2. ¿Cuál es su fuente canónica?
3. ¿Qué fuentes legacy solo se leen durante transición?
4. ¿Qué módulos dependen de esta fuente?
5. ¿El cambio agrega lógica funcional o solo orquestación?

Si alguna respuesta no está clara, el cambio se detiene hasta mapear la dependencia.

## 3. Estado real de producción React en `main`

Las rutas especializadas actualmente conectadas en `App.jsx` son:

- Dashboard
- Alertas
- Personas
- Nueva persona
- Ficha de persona
- Turnos
- EPP
- Formación
- Exámenes
- Salud ocupacional
- Restringidos
- Clientes

El resto de páginas/wrappers analizados provienen de la capa de referencia entregada para la migración y **no debe asumirse que están conectados hoy en producción**.

## 4. Persistencia real confirmada en backend

Producción no persiste cada módulo como una tabla SQL de dominio independiente. `/api/state` reconstruye el estado desde `tenant_module_state`, donde cada `module_key` almacena un bloque JSONB y una versión. `/api/state/modules` actualiza únicamente las claves declaradas, con control optimista por `version`, validación transversal y auditoría.

```text
Página React
   ↓
GET /api/state
   ↓
tenant_module_state
(module_key + JSONB + version)

PUT /api/state/modules
   ↓
validateTenantState(estado propuesto completo)
   ↓
actualiza module_key + incrementa version
   ↓
auditoría
```

**Consecuencia:** una clave como `minas` sí es una dependencia del backend actual, aunque no sea una tabla SQL llamada `minas`. El nombre forma parte del contrato de estado y de sus validaciones.

## 5. Capas arquitectónicas objetivo

```text
RUTA / SIDEBAR
      │
      ▼
Página especializada o alias
      │
      ├─────────────── módulo funcional
      │                        │
      │                        ▼
      │                 fuente canónica
      │
      └─────────────── wrapper/orquestador
                               │
                               ▼
                  consume módulos funcionales
```

### Tipos

- **FUNCIONAL**: dueño de datos/reglas del dominio; puede crear y modificar registros.
- **WRAPPER**: adapta una ruta/moduleId a infraestructura genérica; no debe poseer negocio propio.
- **ORQUESTADOR**: cruza varias fuentes funcionales; no debe introducir una fuente paralela.
- **TRANSVERSAL**: gobierno, configuración, permisos, importación/exportación o analítica.

## 6. Alias de navegación detectados

La capa de referencia define, entre otros:

| Alias/ruta histórica | moduleId canónico |
|---|---|
| `reclutamiento` | `gestion-personal-proyecto` |
| `operaciones` | `centro-operativo` |
| `turnos` | `turnos-asistencia` |
| `epp` | `proteccion-epp` |
| `cursos` | `formacion` |
| `salud` | `salud-ocupacional` |
| `bloqueados` | `restringidos` |
| `llamados` | `comunicaciones` |
| `hoteleria` | `alojamientos` |
| `subcontratos` | `terceros-subcontratos` |
| `oportunidades` | `prospectos` |
| `mantenimientos` / `servicios` | `ordenes-servicio` |
| `mineras` | `clientes` |
| `activos` / `inventario` | `activos-inventario` |

Los alias se mantienen solo por compatibilidad de navegación mientras se consolida el modelo.

## 7. Inventario verificado de claves críticas en producción

### 7.1 `minas` / `minaId`

**Estado:** legacy activo, no renombrable todavía.

Consumidores confirmados:

- `ClientesPage`: lee `state.minas` con fallback `state.clientes`, escribe actualmente **`minas`**.
- `ClientesPage`: relaciona contratos y órdenes por `item.minaId`.
- `TurnosPage`: lee `minas`; filtra servicios mediante `mantencion.minaId`.
- backend `validateTenantState`:
  - considera `state.minas` colección de clientes/minas;
  - valida unicidad;
  - valida `contrato.minaId`;
  - valida `mantencion/proyecto.minaId`;
  - valida `trabajador.mineras[]`;
  - valida `hotel.minaIds[]`;
  - valida credenciales, salud y otras relaciones mediante `minaId`.

**Decisión:** `clientes` es el nombre objetivo del dominio, pero la migración `minas → clientes` exige una migración coordinada frontend + validación backend + foreign keys JSON + datos existentes. No se realizará dentro de una actualización visual de Clientes.

### 7.2 `mantenciones` / `mantId` / `proyectos`

**Estado:** legacy estructural activo.

Consumidores confirmados:

- `ClientesPage`: usa `mantenciones || proyectos` para órdenes relacionadas.
- `TurnosPage`: usa `mantenciones` como proyecto/servicio; `turnos.mantId` y `asignaciones.mantId` dependen de sus IDs.
- backend `validateTenantState` trata `state.mantenciones` como proyectos/servicios y valida referencias desde asignaciones, turnos, hotelería y otras colecciones.

**Decisión:** el objetivo de dominio continúa siendo una entidad explícita de **Orden de servicio**, pero no se crea todavía `ordenesServicio` hasta diseñar migración de `mantenciones/mantId` y distinguir proyecto, servicio y mantenimiento de activos.

### 7.3 `cursos` / `examenes`

**Estado:** lectura legacy solamente en las páginas especializadas actuales.

- Formación escribe nuevos registros en `trabajadores[].workerItems` con `type: curso|certificacion` y conserva lectura de `state.cursos` para históricos.
- Exámenes escribe nuevos registros en `trabajadores[].workerItems` con `type: examen` y conserva lectura de `state.examenes` para históricos.

**Decisión:** `trabajadores[].workerItems` es la fuente canónica actual para nuevos registros de Formación y Exámenes. `cursos` y `examenes` quedan marcados para retiro posterior, no para nueva escritura.

### 7.4 `protocolosSalud`

**Estado:** canónico actual.

Salud Ocupacional lee y escribe `protocolosSalud`, vinculando cada registro a una persona. Se mantiene separado conceptualmente de Exámenes/Aptitudes.

### 7.5 `eppDeliveries` / `eppEntregas`

**Estado:** transición activa.

Protección EPP:

- lee `eppDeliveries || eppEntregas`;
- escribe nuevos registros en `eppDeliveries`;
- utiliza `inventoryItems` como catálogo opcional del elemento entregado.

**Decisión:** `eppDeliveries` es la fuente canónica de entregas; `eppEntregas` queda como lectura legacy hasta migrar datos históricos.

### 7.6 `turnos`

**Estado:** fuente funcional vigente con dependencia fuerte de `mantenciones`.

Turnos escribe `turnos`, pero la implementación actual envía `version: 0` al guardar una jornada. Como `/api/state/modules` exige coincidencia con la versión real, esto puede provocar conflicto después de que el módulo tenga una versión distinta de cero.

**Acción Fase 1:** corregir Turnos para conservar `moduleVersions.turnos` al cargar el estado y escribir con la versión real.

## 8. Mapa funcional y de transición

### 8.1 Capital Humano

| Módulo | Tipo objetivo | Lectura actual confirmada | Escritura actual | Decisión |
|---|---|---|---|---|
| Personas | FUNCIONAL | `trabajadores` | `trabajadores` | mantener |
| Turnos y asistencia | FUNCIONAL | `trabajadores`, `mantenciones`, `minas`, `turnos`, `asignaciones` | `turnos` | mantener `turnos`; corregir versionado; desacoplar de legacy al migrar órdenes/clientes |
| Protección EPP | FUNCIONAL | `trabajadores`, `inventoryItems`, `eppDeliveries/eppEntregas` | `eppDeliveries` | `eppDeliveries` canónico |
| Formación | FUNCIONAL | `trabajadores.workerItems` + `cursos` legacy | `trabajadores.workerItems` | retirar `cursos` después de migración |
| Exámenes | FUNCIONAL | `trabajadores.workerItems` + `examenes` legacy | `trabajadores.workerItems` | retirar `examenes` después de migración |
| Salud ocupacional | FUNCIONAL | `protocolosSalud`, `trabajadores` | `protocolosSalud` | mantener |
| Restringidos | FUNCIONAL | `trabajadores`, `restricted` | `restricted` + persona | revisar en Fase 1 |

### 8.2 Relación Comercial

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura actual/referencia | Fuente objetivo |
|---|---|---|---|---|
| Clientes | FUNCIONAL | `minas`, `clientes`, `contratos`, `mantenciones/proyectos` | `minas` | `clientes` mediante migración coordinada posterior |
| Contratos | FUNCIONAL | `contratos` | `contratos` | `contratos` |
| Órdenes de servicio | FUNCIONAL | `proyectos`, `mantenciones`, `asignaciones` | `mantenciones` | entidad explícita a diseñar en Fase 4 |
| Prospectos | FUNCIONAL | `prospectos`, `oportunidades` | `prospectos` | `prospectos` |

**Dependencia principal objetivo:**

```text
Cliente
  └── Contrato
        └── Orden de servicio
              ├── Personas
              ├── Recursos
              ├── Credenciales
              ├── Alojamientos
              └── Comunicaciones
```

### 8.3 Gestión Operacional

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura de referencia |
|---|---|---|---|
| Comunicaciones | FUNCIONAL | `comunicaciones`, `convocatorias` | `comunicaciones` |
| Vehículos | FUNCIONAL | `vehiculos`, `inventoryItems` | `vehiculos` |
| Alojamientos | FUNCIONAL | `hoteles`, `alojamientos` | `hoteles` |
| Credenciales | FUNCIONAL | `credenciales`, `trabajadores` | `credenciales` |
| Bitácora operativa | FUNCIONAL | `workBookEntries` | `workBookEntries` |

Estos módulos se especializan después de estabilizar Órdenes de servicio, para que las relaciones operativas tengan un identificador de servicio consistente.

### 8.4 Terceros / Contratistas

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura de referencia |
|---|---|---|---|
| Terceros y subcontratos | FUNCIONAL | `subcontratos`, `contratistas` | `subcontratos` |
| Convenios y contratos terceros | FUNCIONAL | `convenios`, `contratos` | `convenios` |
| Personas empresas colaboradoras | FUNCIONAL | `personalContratista`, `trabajadores` | `personalContratista` |
| Habilitaciones y cumplimiento | FUNCIONAL | `habilitaciones`, `subcontratos` | `habilitaciones` |
| Evaluación de desempeño | FUNCIONAL | `evaluaciones` | `evaluaciones` |

Regla: no duplicar personas o contratos si el dominio puede expresarse mediante relaciones con las entidades canónicas.

### 8.5 Cumplimiento

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura de referencia |
|---|---|---|---|
| Cumplimiento corporativo | FUNCIONAL | `empresaDocs`, `documentosEmpresa` | `empresaDocs` |
| Requisitos del cliente | FUNCIONAL | `acreditacionesMandante`, `requisitosCliente` | `acreditacionesMandante` |
| Incidentes | FUNCIONAL | `incidentes` | `incidentes` |
| Auditoría | FUNCIONAL | `auditorias`, `documentos` | `auditorias` |

Se especializan después de Cliente + Contrato + Orden + Persona, porque sus reglas cruzan esos dominios.

### 8.6 Activos, equipos e inventario

La referencia muestra una convergencia clara en `inventoryItems`.

| Módulo/vista | Lecturas detectadas | Escritura de referencia |
|---|---|---|
| Activos e inventario | `inventoryItems`, `activos` | `inventoryItems` |
| Maquinaria | `inventoryItems`, `maquinaria` | `maquinaria` |
| Equipos e instrumentos | `inventoryItems`, `equipos` | `equipos` |
| Herramientas | `inventoryItems`, `herramientas` | `herramientas` |
| EPP inventario | `inventoryItems`, `eppEntregas` | `inventoryItems` |
| Materiales | `inventoryItems`, `materiales` | `materiales` |
| Insumos | `inventoryItems`, `insumos` | `insumos` |
| Bodegas | `bodegas`, `inventoryItems` | `bodegas` |
| Movimientos | `inventoryMovements`, `movimientosInventario` | `inventoryMovements` |
| Mantenimiento | `mantenimientos`, `inventoryItems` | `mantenimientos` |
| Asignaciones/préstamos | `asignacionesActivos`, `prestamos` | `asignacionesActivos` |

**Lineamiento objetivo:** evaluar un dominio común `inventoryItems` con tipo/categoría, manteniendo colecciones separadas solo para eventos/relaciones (`inventoryMovements`, bodegas, mantenimiento, asignaciones).

### 8.7 Orquestadores

| Módulo | Tipo | Lecturas detectadas | Problema a eliminar |
|---|---|---|---|
| Gestión de personal por proyecto | ORQUESTADOR | `trabajadores`, `proyectos` | no debe ser dueño de `trabajadores` |
| Centro Operativo | ORQUESTADOR | `proyectos`, `asignaciones` | no debe escribir `mantenciones` por ser wrapper |
| Alertas | ORQUESTADOR | `alertas` + fuentes funcionales | alertas deben derivar/referenciar entidades fuente |
| Dashboard | ORQUESTADOR | múltiples fuentes | solo lectura/resumen/navegación |

Los orquestadores se construyen al final y sus acciones deben delegar al módulo funcional correspondiente.

### 8.8 Gobierno y transversal

Configuración, usuarios/permisos, privacidad, bitácora de cambios, importar/exportar, administración de clientes y reportes se estabilizan una vez definido el modelo funcional principal.

## 9. Diferencia entre referencia y producción actual

La capa entregada de referencia contiene `moduleCatalog`, wrappers y CRUD genérico. Sin embargo, el `main` React actual conecta directamente páginas especializadas y no contiene actualmente `src/components/private` en la estructura productiva revisada.

Por tanto:

- **no se copiará automáticamente** la infraestructura genérica de la referencia a producción;
- se utilizará como mapa para recuperar reglas, permisos, aliases y dependencias;
- cada incorporación al `main` deberá justificarse por una dependencia real del módulo en modernización.

## 10. Secuencia aprobada

```text
FASE 0  Mapa, ownership, legacy y dependencias          ✓ CERRADA
FASE 1  Cierre Capital Humano                           ← SIGUIENTE
FASE 2  Clientes
FASE 3  Contratos
FASE 4  Órdenes de servicio
FASE 5  Gestión operacional
FASE 6  Terceros / contratistas
FASE 7  Cumplimiento
FASE 8  Inventario / activos
FASE 9  Prospectos + bitácora operativa
FASE 10 Gestión de personal por proyecto
FASE 11 Centro Operativo
FASE 12 Alertas
FASE 13 Dashboard
FASE 14 Gobierno / administración
FASE 15 Retiro definitivo de aliases y claves legacy
```

## 11. Resultado de Fase 0

Fase 0 queda cerrada porque:

- existe un mapa versionado en el repositorio;
- se verificó el contrato real de persistencia modular del backend;
- se distinguió producción actual de la capa genérica de referencia;
- se identificaron consumidores reales de `minas/minaId` y `mantenciones/mantId`;
- se fijaron fuentes canónicas actuales para Formación, Exámenes, Salud y EPP;
- se detectó el problema de versionado en Turnos como corrección prioritaria de Fase 1;
- ningún wrapper/orquestador fue convertido en fuente de verdad.

## 12. Checklist obligatorio por módulo

Antes de modificar un módulo:

- [ ] identificar página/ruta activa en producción;
- [ ] identificar fuente(s) que lee;
- [ ] identificar fuente que escribe;
- [ ] buscar referencias a IDs/foreign keys relacionadas;
- [ ] clasificar claves legacy vs canónicas;
- [ ] definir módulo dueño;
- [ ] listar dependencias aguas arriba y abajo;
- [ ] confirmar permisos afectados;
- [ ] revisar componentes/tokens existentes antes de CSS/JSX local;
- [ ] mantener compatibilidad de lectura solo cuando sea necesaria;
- [ ] usar `moduleVersions` real en toda escritura modular;
- [ ] no eliminar fallback genérico hasta que no queden consumidores.
