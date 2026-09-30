# Consistencia, accesibilidad y vocabulario del portal

## Prioridad

P1. Debe abordarse despues de estabilizar las altas y antes de ampliar el uso a mas clientes. No incluye la decision de soporte movil/tablet.

## Objetivo

Construir una experiencia consistente y accesible en los modulos del portal mediante componentes y reglas compartidas, en lugar de corregir cada pantalla de forma aislada.

## Alcance funcional

- Nombre unico de cada modulo en menu, H1, titulo de navegador, configuracion, rutas y estados vacios.
- Aplicacion completa del vocabulario aprobado: terceros, empresa colaboradora, cliente y demas reemplazos definidos.
- Componente comun de estado vacio con accion contextual real.
- Estados de vigencia comunes, con texto e icono, separados de estados propios de flujo.
- Componentes de formulario para etiqueta, ayuda, error por campo, requerido, foco, estado deshabilitado y confirmacion de guardado.
- Tablas accesibles: encabezados, alcance, ordenamiento anunciado y filtros identificables.
- Tamano tactil, contraste, tipografia y foco compatibles con WCAG 2.1 AA en escritorio.
- Sustitucion de abreviaturas ambiguas como PC o Link por texto comprensible.

## Reglas

1. Un concepto tiene un nombre visible y una definicion unica en todo el portal.
2. Estados de vigencia: Vigente, Por vencer, No habilitado y Sin informacion. Los estados de flujo se conservan solo donde representan un proceso.
3. Ningun control depende solo de color; toda alerta, estado o exito comunica texto e icono cuando corresponda.
4. Los botones deshabilitados explican que falta para habilitarse.
5. Un error no persiste al cambiar de ficha o pestana cuando ya no corresponde.

## Criterios de aceptacion

1. Menu, H1 y configuracion muestran el mismo nombre para cada modulo.
2. Estados vacios llevan a una accion existente y contextual.
3. Formularios y tablas cumplen etiquetas, foco, contraste, tamano y semantica requeridos.
4. Guardados correctos muestran confirmacion y no dejan errores obsoletos visibles.
5. Ninguna pantalla muestra vocabulario, colores, etiquetas o abreviaturas fuera del sistema aprobado.

## Pruebas requeridas

- Regresion visual y de accesibilidad sobre los diez grupos de menu.
- Navegacion por teclado, lector de pantalla basico y contraste automatizado.
- Pruebas de formularios con error, exito, campo requerido y boton deshabilitado.
- Muestra funcional de todos los modulos para verificar nombres, estados vacios y estados de vigencia.

## Fuera de alcance

No rediseña el portal para movil/tablet. No redefine reglas de habilitacion, las cuales se implementan desde los PR #39, #40 y #41.
