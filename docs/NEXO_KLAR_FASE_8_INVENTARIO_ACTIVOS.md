# Nexo Klar · Fase 8 — Inventario / Activos

**Estado:** ✓ CERRADA  
**Fecha de cierre:** 10 de septiembre de 2026  
**Dominio:** Activos, Equipos e Inventario

## Objetivo

Consolidar el dominio de recursos físicos de Nexo Klar sobre un catálogo común, manteniendo especialización operacional por tipo de recurso y separando catálogo, ubicación, movimientos, mantenimiento y préstamos sin duplicar ownership.

## Cobertura cerrada

1. **Inventario y existencias — `ActivosInventarioPage.jsx`.** Página matriz del dominio. Registra recursos usando bodegas y ubicaciones internas reales. El conteo físico quedó conectado a ajustes trazables y la recepción/reposición actualiza existencias y genera movimiento.
2. **Maquinaria — `MaquinariaPage.jsx`.** Vista especializada en estado operativo, asignación, bodega/ubicación, próximo mantenimiento y stock.
3. **Equipos e instrumentos — `EquiposInstrumentosPage.jsx`.** Vista especializada en calibración, certificado, custodia, bodega/ubicación y stock.
4. **Herramientas — `HerramientasPage.jsx`.** Vista especializada en disponibilidad, asignación/préstamo, persona, OS, devolución esperada y bodega/stock.
5. **EPP y protección personal — `EppInventarioPage.jsx`.** Control de inventario físico por talla, stock, mínimo, vencimiento/vida útil y ubicación. La entrega individual a personas permanece en Capital Humano.
6. **Materiales y ferretería — `MaterialesPage.jsx` + `MaterialsInventoryPage.jsx`.** Control de existencia, unidad de medida, mínimo, ubicación y último movimiento.
7. **Insumos y consumibles — `InsumosPage.jsx` + `ConsumablesInventoryPage.jsx`.** Control de consumo, disponible, mínimo/reposición, ubicación y último consumo.
8. **Bodegas y almacenes — `BodegasPage.jsx`.** Catálogo de bodegas e `inventoryLocations`, responsables, zonas, ubicaciones internas y existencias distribuidas.
9. **Movimientos de inventario — `MovimientosInventarioPage.jsx`.** Ingresos/reposiciones, egresos, traslados, ajustes y trazabilidad por recurso y bodega.
10. **Mantenimiento — `MantenimientoPage.jsx`.** Planes preventivos e historial de mantenimiento para maquinaria, equipos y herramientas, incluyendo vencimiento, costo, indisponibilidad y próxima ejecución.
11. **Asignaciones y préstamos — `AsignacionesPrestamosPage.jsx`.** Préstamos para maquinaria, equipos y herramientas, asociados a persona/OS, bodega de origen, devolución esperada y acción de devolución.

## Ownership y fuentes confirmadas

- `inventoryItems`: catálogo canónico común para maquinaria, equipos, herramientas, EPP de inventario, materiales e insumos.
- `warehouses`: catálogo de bodegas; `bodegas` se mantiene como fallback legacy donde corresponda.
- `inventoryLocations`: ubicaciones internas vinculadas a bodega.
- `inventoryMovements`: trazabilidad operacional de movimientos y préstamos.
- `inventoryStocktakes`: registros de conteo físico.
- `replenishmentRequests`: solicitudes/recepciones de reposición cuando corresponde.
- `assetMaintenancePlans`: planificación preventiva.
- `assetMaintenanceRecords`: historial de mantenimiento ejecutado.
- `vehiculos`: permanece fuera de `inventoryItems`; Flota conserva su ownership en Gestión Operacional.
- La entrega de EPP a personas permanece en el dominio de Capital Humano; Fase 8 administra la existencia física.

## Regla transversal de stock

Se consolidó la siguiente regla:

```text
stock = suma de stockByLocation

stockByLocation = {
  warehouseId: cantidad disponible en esa bodega
}

warehouseId = bodega principal / administrativa del recurso
locationId  = ubicación interna principal dentro de esa bodega
```

La capa `/api/state` normaliza el inventario tanto en lectura como antes de persistir cambios. Esto permite compatibilidad progresiva con registros legacy que solo contenían `stock + warehouseId`.

La normalización garantiza que:

- recursos legacy construyan su saldo por bodega sin perder existencias;
- una bodega sin saldo no herede el stock global de otra bodega;
- movimientos trabajen con saldos por bodega;
- préstamos descuenten únicamente desde la bodega elegida;
- devoluciones restituyan la bodega de origen;
- `stock` se recalcule desde `stockByLocation`;
- si la bodega principal queda sin saldo y existe stock en otra, se seleccione una bodega con existencia;
- `locationId` se limpie cuando deje de corresponder a la bodega principal.

## Flujos cerrados

### Conteo físico

`Inventario y existencias` permite registrar cantidad contada por recurso y bodega. El flujo actualiza el saldo, registra `inventoryStocktakes` y genera un movimiento de ajuste con stock anterior, nuevo y diferencia.

### Recepción / reposición

La recepción permite ingresar stock contra una solicitud pendiente o sin solicitud previa. Actualiza `stockByLocation`, recalcula `stock`, registra movimiento de reposición y, cuando corresponde, marca la solicitud como recibida.

### Traslados

Los movimientos manejan origen y destino, validan saldo suficiente e impiden trasladar hacia la misma bodega. El total global permanece derivado de los saldos por bodega.

### Préstamos y devoluciones

Los préstamos se limitan a maquinaria, equipos y herramientas. La asignación registra persona, OS opcional, cantidad, bodega de origen y devolución esperada. La devolución restaura el saldo exactamente en la bodega de origen y cierra el movimiento de préstamo.

## Decisiones arquitectónicas

- El dato se registra una vez en su módulo dueño y otras páginas lo consumen como contexto.
- `inventoryItems` es el catálogo común; no se crean catálogos paralelos por cada categoría.
- Maquinaria, Equipos, Herramientas y EPP comparten `InventoryCategoryPage.jsx` porque mantienen comportamiento estructural común con especialización por `focus`.
- Materiales e Insumos usan componentes especializados porque su semántica principal es stock/consumo y no mantenimiento/asignación.
- Bodegas, Movimientos, Mantenimiento y Asignaciones poseen Pages especializadas propias.
- `InventoryOperationsPage.jsx` fue retirado al comprobarse que no tenía consumidores. Su eliminación evita mantener una arquitectura operacional genérica paralela a las Pages especializadas.

## Limpieza técnica

Se verificó que `InventoryOperationsPage.jsx` no tenía imports ni referencias activas antes de eliminarlo.

Componentes compartidos vigentes en `src/components/inventory`:

- `InventoryCategoryPage.jsx`
- `MaterialsInventoryPage.jsx`
- `ConsumablesInventoryPage.jsx`

Las operaciones especializadas permanecen directamente en sus Pages correspondientes.

## Criterios de cierre cumplidos

- [x] referencia HTML histórica revisada;
- [x] rutas y Pages activas identificadas;
- [x] categorías especializadas funcional y visualmente;
- [x] `inventoryItems` confirmado como catálogo común;
- [x] bodegas y ubicaciones internas conectadas a formularios;
- [x] conteo físico conectado;
- [x] recepción/reposición conectada;
- [x] movimientos y traslados conectados;
- [x] mantenimiento especializado;
- [x] préstamos y devoluciones conectados;
- [x] coherencia `stock / stockByLocation / warehouseId` normalizada;
- [x] compatibilidad con stock legacy protegida;
- [x] componente operacional genérico sin consumidores eliminado;
- [x] Design System y densidad operacional aplicados a las vistas de la fase.

## Commits de cierre relevantes

- `005e5f13` — conexión de Inventario con bodegas, conteo físico y reposiciones.
- `fe6e0785` — protección de stock legacy durante transición.
- `9660b313` — normalización transversal del inventario en `/api/state`.
- `2375242d` — protección de saldos por bodega para préstamos y registros legacy.
- `64d9746f` — eliminación de `InventoryOperationsPage.jsx` sin consumidores.

## Resultado

**Fase 8 cerrada.** Nexo Klar dispone de un dominio de Inventario / Activos con catálogo común, especialización por categoría, bodegas y ubicaciones internas, trazabilidad de movimientos, mantenimiento y préstamos/devoluciones. La consistencia de stock queda gobernada transversalmente y la arquitectura genérica operacional anterior fue retirada al dejar de tener consumidores.

**Siguiente fase:** Fase 9 · Prospectos + operación.