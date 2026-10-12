# Corrección de navegación pública móvil

## Issue relacionado

Refs #187.

## Contexto

Después de la liberación de la navegación compacta, a 375 px el botón **Crear empresa**
se superpone al control de menú. El menú existe y expone atributos accesibles, pero no puede
abrirse con clic o toque porque otro control recibe el evento.

## Objetivo

Restablecer una navegación pública operable en móvil y tablet sin retirar las acciones
**Crear empresa** ni **Acceso**.

## Alcance

- Definir una disposición de cabecera con áreas independientes para marca, menú, Crear
  empresa y Acceso bajo 1024 px.
- Eliminar solapamientos por posicionamiento, ancho mínimo, `z-index` o áreas táctiles.
- Garantizar controles de al menos 44 px y foco visible.
- Mantener la apertura/cierre del panel por toque, clic, teclado, Escape y selección de
  enlace.
- Conservar el bloqueo del desplazamiento del fondo cuando se abre un modal o panel.

## Fuera de alcance

- No cubre Sidebar ni Header del portal privado; ese trabajo corresponde al Issue #139.
- No altera el contenido comercial ni los flujos de registro.

## Criterios de aceptación

1. A 375 x 812, menú, Crear empresa y Acceso se ven completos y se pueden pulsar de forma
   independiente.
2. El toque/clic en el menú abre el panel y permite navegar a todas las secciones.
3. A 768 px no reaparece el solapamiento ni scroll horizontal involuntario.
4. El foco por teclado, Escape y el cierre al seleccionar un enlace se mantienen operables.
5. No existe un elemento invisible que intercepte el puntero sobre el botón hamburguesa.

## Validación requerida

- Prueba manual con puntero y toque en 375, 390, 768 y 1024 px.
- Prueba de teclado para abrir, recorrer y cerrar el panel.
- Captura comparativa de cabecera y menú abierto antes de liberar.
- Regresión de diálogo de demostración y bloqueo de scroll.
