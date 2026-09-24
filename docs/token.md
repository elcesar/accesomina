# Nexo Klar · Tokens y patrones de interfaz

Este documento complementa `src/styles/tokens.css` con reglas de uso de los tokens y patrones UX transversales. Los valores visuales deben provenir del sistema de tokens; una pantalla no debe redefinir color, espaciado, radio, tipografía, sombra, foco o movimiento de forma aislada.

## Patrón UX — Persona en listados

**Regla:** siempre que una grilla o listado represente una Persona vinculada a una ficha, la celda **Persona** es el acceso principal a esa ficha.

### Presentación

La celda debe mantener el patrón visual común:

- avatar circular con iniciales;
- nombre de la persona;
- RUT como información secundaria.

El nombre debe comunicar visualmente la interacción en `hover` y el control completo debe disponer de foco visible para navegación por teclado.

### Comportamiento

- Clic en avatar, nombre, RUT o espacio interactivo de la celda Persona → abre `/app/trabajadores/:id`.
- El resto de la fila no navega a la ficha de Persona por defecto.
- No agregar botones redundantes `Ver ficha`, `Ver persona` o equivalentes cuando la celda Persona ya permite acceder a la ficha.
- La columna de acciones queda reservada para acciones propias del módulo o del registro.
- Si el registro no tiene una Persona vinculada, la celda conserva el patrón visual pero no debe simular navegación.
- Una grilla cuyo objeto principal sea exclusivamente Persona puede permitir navegación adicional desde la fila solo cuando no exista conflicto con controles o acciones internas; esta es una excepción y no el patrón transversal.

### Accesibilidad

La celda interactiva debe ser operable mediante teclado, tener nombre accesible (por ejemplo, `Abrir ficha de {nombre}`) y utilizar el foco definido por los tokens del sistema.

### Aplicación

Este patrón es transversal a Capital Humano y debe reutilizarse en cualquier módulo futuro que incluya una columna Persona. La ficha de Persona continúa siendo la fuente de detalle; cada listado conserva en sus demás columnas únicamente el contexto propio del módulo.


## Patrón UX — Navegación entre listado y ficha

**Regla:** cuando una ficha o vista de detalle se abre desde un listado dentro de un módulo, el retorno debe indicar explícitamente el destino. La navegación de retorno no se representa mediante una X.

### Presentación y comportamiento

- Usar un control textual con flecha y destino, por ejemplo: `← Volver a alojamientos`, `← Volver a clientes` o `← Volver a personas`.
- Ubicar el retorno en la zona superior izquierda de la ficha, antes de su título o contexto principal.
- Reservar la X para cerrar modales, paneles flotantes, diálogos y otros elementos superpuestos.
- Mantener a la derecha las acciones propias del objeto, como `Guardar`, `Editar`, `Asignar` o equivalentes.
- Volver al listado debe conservar búsqueda, filtros y contexto visible siempre que la arquitectura de la pantalla lo permita.
- El control debe ser operable por teclado y utilizar el foco definido por los tokens del sistema.
- No duplicar simultáneamente una X y un control `Volver` cuando ambos realizan la misma navegación.

### Aplicación

Este patrón es transversal. Debe aplicarse progresivamente a fichas de Persona, Cliente, Contrato, Orden de servicio, Alojamiento y cualquier otra entidad que se abra desde un listado.
