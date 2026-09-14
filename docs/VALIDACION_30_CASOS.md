# Validacion operativa de 30 casos

Fecha: 2026-07-04

## Resultado

Los 30 casos de aceptacion minera fueron ejecutados automaticamente y quedaron incorporados en `server/test/mining-acceptance.test.js`. Todos finalizaron correctamente. La suite completa debe ejecutarse con `pnpm run check` antes de cada despliegue.

## Cobertura

1. Creacion de dos mineras independientes.
2. Contratos asociados a su minera.
3. Proyecto, operacion y mantencion asociados a contratos.
4. Rechazo de fechas contractuales invertidas.
5. Rechazo de contratos con minera inexistente.
6. Rechazo de numeros de contrato duplicados.
7. Rechazo de mineras duplicadas.
8. Rechazo de proyectos conectados a contratos de otra minera.
9. Separacion de personal permanente y spot.
10. Rechazo de RUT de trabajador invalido.
11. Rechazo de trabajador sin identificacion minima.
12. Rechazo de RUT duplicado con formato diferente.
13. Asignacion de personal planta y spot al mismo servicio.
14. Rechazo de asignacion duplicada.
15. Rechazo de asignacion con trabajador inexistente.
16. Registro de cursos y examenes vigentes.
17. Rechazo de documento, curso o examen duplicado.
18. Rechazo de emision posterior al vencimiento.
19. Entrega multiple de EPP con tallas.
20. Rechazo de entrega EPP duplicada.
21. Rechazo de EPP asociado a trabajador inexistente.
22. Asignacion de hotel y habitacion.
23. Rechazo de alojamientos superpuestos.
24. Registro de jornada, asistencia y horas.
25. Rechazo de turno duplicado.
26. Rechazo de credencial duplicada en una minera.
27. Rechazo de patente o serie duplicada.
28. Rechazo de protocolo de salud duplicado.
29. Relacion entre permiso, incidente, firma, WhatsApp y servicio.
30. Permisos de usuario y sanitizacion de contenido.

## Validacion visual

- Escritorio probado a 1280 px sin desplazamiento horizontal.
- Telefono probado a 390 px sin desplazamiento horizontal.
- Menu movil operativo.
- Quince modulos privados abiertos y comprobados con contenido.
- Veinticuatro modales identificados como dialogos.
- Cero campos visibles sin etiqueta o nombre accesible.
- Consola del navegador sin errores ni advertencias durante la navegacion validada.
- Portada con propuesta comercial, privacidad, capacidades, llamada a demostracion y vista real del producto.

## Arquitectura validada

- PostgreSQL con aislamiento RLS forzado por empresa.
- Unicidad e integridad referencial de los registros operacionales.
- Sesiones con cookie segura, CSRF, control de origen y bloqueo de intentos.
- Contrasenas cifradas y restablecimiento con cierre de sesiones.
- Auditoria inmutable.
- Archivos privados, deduplicacion, antivirus obligatorio y S3 obligatorio en produccion.
- Automatizaciones con toma exclusiva para evitar envios duplicados.
- Migraciones protegidas frente a despliegues simultaneos.
- Contenedor ejecutado sin privilegios.
- Metricas y endpoints de salud disponibles para monitoreo externo.

## Pendientes externos para habilitar produccion

1. Contratar y configurar PostgreSQL administrado, S3, antivirus y dominio HTTPS.
2. Configurar monitoreo externo, alertas, logs centralizados y restauracion de respaldos.
3. Habilitar MFA o SSO con el proveedor de identidad seleccionado.
4. Completar el acceso autenticado del portal del mandante; actualmente existe la administracion de permisos, no el portal independiente terminado.
5. Configurar y probar OCR, firma, QR, correo y WhatsApp con credenciales productivas.
6. Modularizar el frontend para retirar `unsafe-inline` de CSP y reemplazar las ventanas administrativas antiguas.
7. Ejecutar prueba de penetracion externa y prueba formal de recuperacion.

Sin evidencia de estos siete puntos, la solucion esta validada como aplicacion y arquitectura base, pero no debe declararse infraestructura productiva habilitada.
