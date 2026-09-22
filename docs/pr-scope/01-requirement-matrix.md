# Matriz de requisitos operacionales configurable

## Objetivo
Permitir definir requisitos documentales y de habilitación por empresa, cliente, contrato, orden de servicio, cargo y condición operacional, sin reemplazar la base obligatoria actual.

## Alcance funcional
- Mantener los requisitos base de Nexo Klar.
- Agregar reglas adicionales con vigencia, obligatoriedad y alcance explícito.
- Resolver requisitos efectivos de una persona para una orden de servicio.
- Mostrar el origen de cada requisito y el motivo de una brecha.

## Criterios de aceptación
1. Un requisito de cliente se suma a los requisitos base.
2. Un requisito de una orden no elimina reglas anteriores.
3. La ficha de persona identifica el requisito, su fuente y su estado.
4. Las alertas usan la misma resolución de requisitos.

## Pruebas requeridas
- Persona sin documentos base.
- Persona con documentos base pero sin requisito de altura.
- Dos órdenes con requisitos distintos para la misma persona.
- Regla vencida, desactivada y no obligatoria.
