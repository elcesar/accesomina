# Consolidación de datos actuales e históricos

## Objetivo
Evitar que reportes y fichas omitan registros cuando coexisten colecciones actuales y legacy.

## Criterios de aceptación
- Unir colecciones equivalentes, deduplicar por clave estable y conservar dato vigente.
- Cubrir personas, alertas, alojamiento, clientes, contratos, órdenes, formación, exámenes, vehículos y EPP.
- Mostrar origen y conflictos de datos cuando corresponda.
- Retirar fallbacks que toman solo la primera colección con datos.

## Pruebas
Colecciones coexistentes, registros repetidos y versiones con datos complementarios.
