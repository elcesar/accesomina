# Casco EPP: aplicabilidad, catálogo de color y trazabilidad

## Issue relacionado

Refs #178.

## Objetivo

Preparar una implementación que permita registrar si el casco aplica a una persona y, cuando
aplica, usar un color controlado por la empresa o el mandante sin asumir una equivalencia
universal entre color y cargo.

## Regla funcional propuesta

- La ficha de Persona debe preguntar **¿Casco requerido?** con opciones Sí y No.
- Si la respuesta es No, no se exigen talla, color, modelo, serie ni entrega de casco; se
  puede registrar un motivo opcional.
- Si la respuesta es Sí, se solicita color y talla según la política de EPP aplicable. Modelo,
  clase, serie y vigencia se exigen sólo cuando la política lo requiera.
- La entrega registra el artículo físico entregado y no modifica de forma implícita el
  requisito de la persona.

## Catálogo y datos

- Mantener un catálogo de colores por empresa, ampliable o restringible por cliente y Orden
  de Servicio.
- Persistir un código estable y la etiqueta histórica del color para no alterar entregas
  antiguas si el catálogo cambia.
- Conservar auditoría de reglas, cambios, actor, contexto y artículo entregado.
- Los datos históricos sin aplicabilidad explícita deben seguir siendo legibles y completarse
  gradualmente.

## Valores iniciales sugeridos

Blanco, amarillo, azul, verde, rojo, naranjo, gris y otro definido por mandante. Son valores
de inicio, no reglas de seguridad ni asignaciones automáticas por cargo.

## Criterios de aceptación

1. No permite guardar datos de casco obligatorios cuando se eligió No.
2. Sí muestra un combobox de color, no texto libre, cuando se eligió Sí.
3. Las reglas de cliente/OS pueden limitar los colores disponibles.
4. Persona, inventario, entrega, acreditación y alertas exponen la misma aplicabilidad.
5. Frontend y backend validan las reglas; una integración no puede omitirlas.
6. Se prueban Sí, No, cambio de política, entrega, historial y datos legacy.

## Dependencia de producto

Requiere validación funcional de César antes de abrir el PR de implementación. Este alcance
no modifica datos, catálogos ni reglas vigentes por sí solo.
