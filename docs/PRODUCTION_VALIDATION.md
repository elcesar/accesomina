# Validacion de produccion

Fecha de última revisión: 2026-07-27

## Estado

La aplicacion esta validada a nivel de codigo y flujo de datos. El despliegue comercial queda condicionado a probar la infraestructura real con PostgreSQL, almacenamiento S3, escaneo antimalware, HTTPS y credenciales definitivas de las integraciones.

## Verificado

- Sitio publico, acceso y registro sin credenciales precargadas.
- Separacion de datos por empresa mediante `tenant_id` y politicas RLS forzadas en PostgreSQL.
- Prueba multiempresa con tres organizaciones simultaneas: usuarios, trabajadores, integraciones, modulos, alertas, nombre, color y logotipo permanecen aislados.
- Cambio de sesion entre empresas reinicia la marca y los catalogos antes de aplicar la configuracion de la siguiente organizacion.
- Roles, permisos y administracion de usuarios restringida a administradores.
- Relaciones entre mineras, contratos, servicios, proyectos, trabajadores, hoteleria, EPP y modulos operacionales.
- Rechazo de trabajadores con RUT duplicado, incluso si cambia su formato.
- Importacion y exportacion con validacion y trazabilidad.
- Documentos privados en S3, limite de tamano, tipos permitidos y escaneo antimalware obligatorio en produccion.
- Sesiones en cookie segura, CSRF, control de origen, limites de intentos y contrasenas con hash y cambio obligatorio inicial.
- Auditoria inmutable de cambios y control de concurrencia por versiones.
- 88 pruebas automáticas aprobadas y dependencias sin vulnerabilidades conocidas.
- Entregas EPP por lote con talla, cantidad, condicion, estado, fecha, certificacion, lote, reposicion, capacitacion y acta comun para todos los elementos entregados.
- Unicidad por empresa para RUT de trabajadores y subcontratistas, contratos, mineras, proyectos, hoteles, vehiculos, protocolos, incidentes, permisos, turnos, firmas activas, grupos, documentos y entregas EPP.
- Reutilizacion transaccional de archivos identicos mediante SHA-256, evitando copias duplicadas incluso ante cargas simultaneas.
- Deteccion de alojamientos superpuestos para una misma persona y rechazo de referencias operacionales inexistentes.
- Interfaz privada adaptable a telefono y escritorio, sin desbordamiento horizontal en 390 px y 1280 px.
- Campos identificados, modales con semantica de dialogo y navegacion principal utilizable con teclado.
- Ejecutor automatico de correo, WhatsApp y reportes con toma exclusiva, recuperacion de bloqueos y registro de fallos.
- Migraciones protegidas frente a despliegues simultaneos y contenedor ejecutado como usuario no privilegiado.
- Metricas operativas protegidas por token para integracion con monitoreo externo.
- Conexion opcional con proveedor documental real; archivo, resultado, evidencia, puntaje y revision humana quedan auditados.

## Obligatorio antes de vender

1. Crear PostgreSQL administrado con respaldo automatico, cifrado y recuperacion probada.
2. Crear bucket S3 privado con versionado, cifrado, ciclo de vida y bloqueo de acceso publico.
3. Contratar y configurar un servicio HTTPS de escaneo antimalware.
4. Publicar bajo dominio HTTPS y guardar secretos en el gestor de secretos del proveedor cloud.
5. Ejecutar migraciones y la inicializacion del administrador; cambiar la clave en el primer ingreso.
6. Probar con dos empresas reales que sus usuarios, archivos, configuraciones e integraciones no se mezclen.
7. Probar correo, WhatsApp y firma con cuentas productivas y registrar consentimiento de comunicaciones.
8. Configurar monitoreo externo sobre salud, disponibilidad y metricas, centralizacion de logs y un procedimiento de respuesta a incidentes.
9. Ejecutar una restauracion completa desde respaldo antes de incorporar datos de clientes.
10. Realizar una prueba de seguridad externa. La politica CSP aun permite codigo y estilos inline por la estructura monolitica actual; debe endurecerse al modularizar completamente la interfaz.
11. Habilitar MFA o SSO corporativo con el proveedor de identidad elegido antes de incorporar administradores de clientes regulados.

## Criterio de habilitacion

Produccion se considera habilitada solo cuando los diez puntos anteriores tengan evidencia, responsable y fecha de aprobacion. El endpoint `/api/health` debe responder correctamente y el arranque rechazara automaticamente una configuracion productiva sin HTTPS, S3, secretos robustos o escaneo antimalware.
