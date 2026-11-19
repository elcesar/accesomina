# Turnos: acciones, confirmaciones y recuperación

Seguimiento: #316. Base: `22fd446c5d0a41f46375364bc7f995f7498a0956`. Corrección independiente de #334 y de los planes #330/#331.

## Comportamiento corregido

- Programar turno explica si faltan una persona habilitada, una orden de servicio o ambas. Los perfiles sin escritura reciben el motivo correspondiente.
- Guardar jornada distingue campos incompletos, falta de permiso, guardado en curso y recuperación pendiente. Durante el envío se bloquean cambios, cierre y doble envío.
- La lista de perfiles autorizados coincide con el servidor: `domian_admin`, `client_admin`, `rrhh` y `prevencion`. `acreditacion` y `consulta` conservan lectura. Los manejadores también comprueban permisos y requisitos si se fuerza un botón.
- El guardado manual solicita una sola confirmación global después del éxito de la API. Carga, sincronización, rechazos y conflictos no producen confirmaciones de escritura.
- Un conflicto real de versión vuelve a consultar jornadas y versiones sin cerrar ni borrar el formulario. Conserva los turnos de otros usuarios y exige una nueva confirmación explícita. Si esa consulta falla, se bloquea otro envío hasta recuperar los datos.
- El error de carga ofrece un reintento local aunque se cierre el aviso global. Las respuestas obsoletas no reinstalan avisos ni limpian errores de otro módulo al abandonarlo.

## Cambio compartido

`api.get` acepta opciones sin alterar su comportamiento por defecto. El reintento global usa `loadFeedback: false` para controlar su propio error sólo después de comprobar que la respuesta sigue vigente. Se mantienen el cliente, autenticación y mensajes centralizados. El evento existente de recuperación limpia únicamente el aviso de carga y no modifica errores locales de escritura ni confirmaciones.

## Validación reproducible

27/27 pruebas Chrome locales: 22 de `turnos-feedback.spec.js` y 5 de `qa-feedback-errors.spec.js`. Incluyen cuatro perfiles con escritura, dos de consulta, requisitos, campos, envío en curso a 375/1440 px, doble clic, rechazos, conflicto real con turno externo, consulta fallida, reintento local y respuestas obsoletas. Build aprobado; revisar también las comprobaciones remotas del último commit del PR.

El workflow dedicado añade la regresión compartida de Oportunidades, RUT, Salud y primer acceso. Sus resultados y artefactos se consultan en el PR; no ejecuta despliegues.

Se usaron APIs controladas y registros ficticios. No hay cambios de servidor ni migraciones. Tras revisión e integración, repetir programación y recuperación con una cuenta QA autorizada en la versión publicada antes de cerrar #316.
