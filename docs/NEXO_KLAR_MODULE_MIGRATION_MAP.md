# Nexo Klar — Mapa de módulos, dependencias y migración

**Estado:** Fase 0 — arquitectura y saneamiento previo a la modernización secuencial  
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

## 4. Capas arquitectónicas objetivo

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

## 5. Alias de navegación detectados

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

## 6. Mapa funcional y de transición

### 6.1 Capital Humano

| Módulo | Tipo objetivo | Lecturas detectadas en referencia | Escritura de referencia | Fuente objetivo / decisión |
|---|---|---|---|---|
| Personas | FUNCIONAL | `trabajadores` | `trabajadores` | `trabajadores` |
| Turnos y asistencia | FUNCIONAL | `turnos`, `asistencias` | `turnos` | revisar consolidación de asistencia |
| Protección EPP | FUNCIONAL | `eppEntregas`, `inventoryItems` | `eppDeliveries` | normalizar entrega EPP y compatibilidad `eppEntregas/eppDeliveries` |
| Formación | FUNCIONAL | `cursos`, `trabajadores` | `cursos` | **objetivo actual:** formación/certificación dentro de `trabajador.workerItems` |
| Exámenes | FUNCIONAL | `examenes`, `trabajadores` | `examenes` | **objetivo actual:** examen dentro de `trabajador.workerItems` |
| Salud ocupacional | FUNCIONAL | `protocolosSalud`, `trabajadores` | `protocolosSalud` | `protocolosSalud` |
| Restringidos | FUNCIONAL | `trabajadores`, `restricted` | `restricted` | `restricted` + disponibilidad persona según regla funcional |

**Acción Fase 1:** reconciliar el catálogo de referencia con las implementaciones especializadas ya modernizadas. No volver a introducir `cursos` o `examenes` como fuente nueva si la implementación especializada ya escribe en `workerItems`.

### 6.2 Relación Comercial

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura de referencia | Fuente objetivo |
|---|---|---|---|---|
| Clientes | FUNCIONAL | `minas`, `clientes` | `minas` | `clientes` |
| Contratos | FUNCIONAL | `contratos` | `contratos` | `contratos` |
| Órdenes de servicio | FUNCIONAL | `proyectos`, `mantenciones`, `asignaciones` | `mantenciones` | `ordenesServicio` (nombre objetivo; migración a diseñar) |
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

**Legacy prioritario:** `minas/minaId` y `mantenciones/proyectos`. No renombrar todavía: primero localizar todos sus consumidores en frontend y backend.

### 6.3 Gestión Operacional

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura de referencia |
|---|---|---|---|
| Comunicaciones | FUNCIONAL | `comunicaciones`, `convocatorias` | `comunicaciones` |
| Vehículos | FUNCIONAL | `vehiculos`, `inventoryItems` | `vehiculos` |
| Alojamientos | FUNCIONAL | `hoteles`, `alojamientos` | `hoteles` |
| Credenciales | FUNCIONAL | `credenciales`, `trabajadores` | `credenciales` |
| Bitácora operativa | FUNCIONAL | `workBookEntries` | `workBookEntries` |

Estos módulos se especializan después de estabilizar Órdenes de servicio, para que las relaciones operativas tengan un identificador de servicio consistente.

### 6.4 Terceros / Contratistas

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura de referencia |
|---|---|---|---|
| Terceros y subcontratos | FUNCIONAL | `subcontratos`, `contratistas` | `subcontratos` |
| Convenios y contratos terceros | FUNCIONAL | `convenios`, `contratos` | `convenios` |
| Personas empresas colaboradoras | FUNCIONAL | `personalContratista`, `trabajadores` | `personalContratista` |
| Habilitaciones y cumplimiento | FUNCIONAL | `habilitaciones`, `subcontratos` | `habilitaciones` |
| Evaluación de desempeño | FUNCIONAL | `evaluaciones` | `evaluaciones` |

Regla: no duplicar personas o contratos si el dominio puede expresarse mediante relaciones con las entidades canónicas.

### 6.5 Cumplimiento

| Módulo | Tipo objetivo | Lecturas detectadas | Escritura de referencia |
|---|---|---|---|
| Cumplimiento corporativo | FUNCIONAL | `empresaDocs`, `documentosEmpresa` | `empresaDocs` |
| Requisitos del cliente | FUNCIONAL | `acreditacionesMandante`, `requisitosCliente` | `acreditacionesMandante` |
| Incidentes | FUNCIONAL | `incidentes` | `incidentes` |
| Auditoría | FUNCIONAL | `auditorias`, `documentos` | `auditorias` |

Se especializan después de Cliente + Contrato + Orden + Persona, porque sus reglas cruzan esos dominios.

### 6.6 Activos, equipos e inventario

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

### 6.7 Orquestadores

| Módulo | Tipo | Lecturas detectadas | Problema a eliminar |
|---|---|---|---|
| Gestión de personal por proyecto | ORQUESTADOR | `trabajadores`, `proyectos` | no debe ser dueño de `trabajadores` |
| Centro Operativo | ORQUESTADOR | `proyectos`, `asignaciones` | no debe escribir `mantenciones` por ser wrapper |
| Alertas | ORQUESTADOR | `alertas` + fuentes funcionales | alertas deben derivar/referenciar entidades fuente |
| Dashboard | ORQUESTADOR | múltiples fuentes | solo lectura/resumen/navegación |

Los orquestadores se construyen al final y sus acciones deben delegar al módulo funcional correspondiente.

### 6.8 Gobierno y transversal

Configuración, usuarios/permisos, privacidad, bitácora de cambios, importar/exportar, administración de clientes y reportes se estabilizan una vez definido el modelo funcional principal.

## 7. Diferencia entre referencia y producción actual

La capa entregada de referencia contiene `moduleCatalog`, wrappers y CRUD genérico. Sin embargo, el `main` React actual conecta directamente páginas especializadas y no contiene actualmente `src/components/private` en la estructura productiva revisada.

Por tanto:

- **no se copiará automáticamente** la infraestructura genérica de la referencia a producción;
- se utilizará como mapa para recuperar reglas, permisos, aliases y dependencias;
- cada incorporación al `main` deberá justificarse por una dependencia real del módulo en modernización.

## 8. Secuencia aprobada

```text
FASE 0  Mapa, ownership, legacy y dependencias          ← ACTUAL
FASE 1  Cierre Capital Humano
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

## 9. Criterio de salida de Fase 0

Fase 0 se considera cerrada cuando:

- existe este mapa como referencia en el repositorio;
- se reconoce explícitamente la diferencia entre producción actual y capa de referencia;
- `minas/minaId`, `mantenciones/proyectos`, `eppEntregas/eppDeliveries`, `cursos/examenes` quedan marcados como puntos de migración y no como decisiones finales;
- ningún wrapper/orquestador se convierte en fuente de verdad;
- el siguiente trabajo se limita a reconciliar Capital Humano y luego cerrar Clientes antes de Contratos/Órdenes.

## 10. Checklist obligatorio por módulo

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
- [ ] no eliminar fallback genérico hasta que no queden consumidores.
