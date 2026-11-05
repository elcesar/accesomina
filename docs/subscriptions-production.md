# Planes y suscripciones: publicación y operación

## Condiciones confirmadas

El catálogo conserva Free, La Unión, Purranque, Frutillar y Puerto Octay, con los módulos actuales y diferencias por capacidad. Los precios mensuales son CLP netos: 0 / 1.000 / 2.000 / 3.000 / 4.000. Los paquetes de capacidad +100 / +200 / +500 cuestan CLP 50.000 / 100.000 / 300.000 netos mensuales. Se informa IVA aparte; la tasa general es 19% ([SII](https://www.sii.cl/preguntas_frecuentes/impuestos_mensuales/001_130_0572.htm)). Libro de Obra y Gestor de Oportunidades permanecen separados. No se recalculan contratos existentes sin una operación comercial explícita.

Free dura seis meses calendario; la gracia confirmada de 30 días corresponde a la finalización de períodos pagados y no amplía el beneficio gratuito. La renovación es manual: una solicitud no acredita pago ni activa por sí sola una nueva vigencia. Ningún cambio comercial borra documentos ni elimina una empresa.

Los servicios separados se representan con `tenants.subscription_services`: `libroObra` y `oportunidades`, cada uno con `enabled` y, cuando corresponda, `endsAt`. Una licencia vigente habilita exclusivamente su servicio y conserva las restricciones del rol y los permisos del módulo. La vigencia de la suscripción principal y las licencias separadas se evalúan de forma independiente; una licencia de servicio no permite modificar Personas, clientes, contratos u órdenes de la suscripción principal vencida. Las empresas anteriores sin `subscription_managed` conservan su comportamiento vigente.

## Publicación coordinada

Este procedimiento describe tareas por ejecutar; su presencia en el repositorio no acredita que estén completadas en producción.

1. Registrar el SHA aprobado, evidencia de pruebas y artefactos de frontend/backend. Confirmar snapshot y recuperación a un punto en el tiempo de RDS. Identificar la imagen anterior por digest y conservar la versión anterior del frontend.
2. Ejecutar el conjunto de pruebas de backend y frontend y el build. Aplicar todas las migraciones en una base aislada; probar que `027` conserva datos y deja `tenants.subscription_managed=false` para las empresas existentes. Verificar que el catálogo público y las operaciones existentes funcionan antes de activar una empresa de prueba.
3. Aplicar la migración aditiva y desplegar primero el backend compatible. El `Dockerfile` actual ejecuta `pnpm run migrate` antes de arrancar; confirmar el resultado real en los logs y evitar una ejecución manual paralela sin coordinación. El bloqueo del migrador no reemplaza la revisión del resultado.
4. El workflow `.github/workflows/deploy-ecr.yml` construye y publica la imagen en ECR al actualizar `main`; **no actualiza el servicio ECS**. Registrar el digest de la imagen, actualizar la task definition y el servicio por César, responsable confirmado de este paso, mediante el mecanismo operativo autorizado y esperar estabilidad. Publicar en ECR no equivale a desplegar el backend.
5. Comprobar `/api/health` y `/api/ready` y comparar el commit declarado con el aprobado antes de habilitar la nueva interfaz. Verificar el catálogo público, la suscripción autenticada, aislamiento entre dos empresas y la conservación de módulos/roles.
6. El workflow `.github/workflows/deploy-v2.yml` se ejecuta por cambios en `nexo-v2/**` de `main`: construye, sincroniza S3 con `--delete` e invalida CloudFront. Coordinar la entrada a `main` para que esta publicación automática no exponga una interfaz que requiera un backend aún no desplegado. El HTML se publica sin caché; los assets llevan caché larga.
7. Validar una empresa QA autorizada primero. Activar el catálogo/contrato por el flujo administrativo; no convertir masivamente a las empresas existentes ni restablecer el beneficio Free. Registrar antes/después, versión, usuario y fecha efectiva.
8. Para correo real se requiere un buzón QA autorizado. Las pruebas automatizadas usan SMTP simulado y no envían correos. Validar una recepción real no autoriza a contactar a trabajadores ni a efectuar campañas.

Si no se puede garantizar el orden backend → frontend con los workflows actuales, mantener la funcionalidad sin publicar y separar los cambios de backend/frontend o usar el control operativo de publicación acordado. No deshabilitar controles de despliegue sin evidencia y autorización.

## Avisos de vencimiento

`scheduleSubscriptionNotifications` se llama dentro de la transacción que activa o renueva el período. Crea una salida durable por período, usuario administrador, canal y umbral de 30/15/7/3/1 días. Los destinatarios son administradores activos de la propia empresa. Los canales son `IN_APP` y `EMAIL`, y la clave de idempotencia incluye el umbral para permitir los cinco avisos previstos.

Las fechas se calculan por días calendario en la zona del contrato, conservando la hora local frente al horario de verano. Se programan únicamente avisos futuros. Cada aviso tiene una ventana máxima de 24 horas, limitada por la fecha de vencimiento. Si el servicio vuelve después de esa ventana, cancela el aviso vencido y no envía todos los avisos anteriores juntos.

El worker reclama lotes con `FOR UPDATE SKIP LOCKED` y confirma la transacción antes de SMTP. Usa un token por reclamo y una concesión de cinco minutos para recuperar procesos interrumpidos. Reintenta fallos con espera progresiva de 5 a 25 minutos y hasta cinco intentos. Al agotar los intentos queda `failed` para revisión; el código de error es una categoría sin detalles del proveedor ni credenciales.

Una renovación cancela avisos pendientes de períodos anteriores. Antes de enviar, el worker verifica que el contrato sigue siendo actual, el período coincide, la empresa continúa activa y gestionada, y el destinatario mantiene su rol administrador activo. La cuenta recibe el correo en su dirección vigente, no necesariamente en la registrada al programar. Un resultado tardío no puede sobreescribir la cancelación o un reclamo posterior.

`sent` en `IN_APP` significa publicado para el panel. `sent` en `EMAIL` significa aceptado por SMTP para el destinatario esperado; **no confirma recepción, lectura ni ausencia de spam**. El `Message-ID` estable facilita la correlación de reintentos. SMTP y PostgreSQL no comparten una transacción: una caída después de la aceptación SMTP y antes de registrar el resultado puede producir un envío repetido. No se promete entrega exactamente una vez. Una renovación concurrente puede coincidir con un correo ya iniciado; las verificaciones y cancelaciones impiden nuevos reclamos del período anterior.

La configuración usa la integración SMTP de la empresa si existe y está habilitada, con los secretos cifrados ya soportados; si no existe usa la configuración global. Una integración explícitamente deshabilitada no hace fallback. Los logs y la evidencia no deben contener contraseñas, tokens ni respuestas completas del proveedor.

## Retest mínimo

- Free: fin calculado en seis meses calendario; capacidad de personas; edición/importación concurrente; ausencia de cobro automático.
- Planes pagados: CLP neto, IVA separado, paquetes y capacidad total, renovación manual, aprobación con período futuro e idempotencia al repetir solicitudes.
- Roles: consulta de la propia empresa, prohibición de mutaciones comerciales sin permisos y aislamiento por `tenant_id` en las API.
- Fechas: final de mes, año bisiesto, transición de horario de verano, gracia de pago y vencimiento Free.
- Avisos: sólo futuros, doble ejecución del worker, renovación/cancelación, SMTP ausente/rechazado, reclamo abandonado y recuperación sin enviar un historial de recordatorios vencidos.
- Regresión: empresa existente sin gestión de suscripciones mantiene sus módulos, permisos y operaciones anteriores.

Conservar por caso fecha, entorno, commit, datos QA, resultado y evidencia. No cerrar el issue ni declarar validación productiva por el solo éxito del build, migración o respuesta de salud.

## Revisión y recuperación

Consultar en una sesión administrativa autorizada los conteos por `status`, los `attempts`, `last_error`, `available_at`, `claimed_at` y `sent_at` de `subscription_notifications`, restringidos a la empresa que se investiga. No copiar direcciones o datos de clientes a logs públicos. Un aviso `processing` reciente tiene un proceso dueño; no desbloquearlo manualmente antes de agotar la concesión.

Tras corregir SMTP, los fallos con menos de cinco intentos se reintentan automáticamente dentro de la ventana del aviso. Un fallo agotado requiere una operación administrativa documentada; no reiniciar intentos en bloque ni reactivar avisos caducados o de contratos reemplazados. `IN_APP` funciona independientemente del correo.

Para rollback, restaurar la task definition con el digest anterior y la versión previa del frontend. La migración aditiva se conserva; no borrar tablas, contratos ni auditoría para volver de versión. Antes de volver a una versión que no aplica límites comerciales, deshabilitar nuevas activaciones y evaluar los contratos ya activados; registrar cómo se preservará su comportamiento. Si la reversión requiere recuperar datos, hacerlo desde respaldo verificado en un entorno aislado y seguir el procedimiento de incidente, evitando una restauración destructiva sin evaluación del impacto.

## Compatibilidad durante la liberación

Publicar en dos PR: primero servidor/migración; después de que César actualice ECS y se verifique la versión 7.8.0, integrar el PR de interfaz. El servidor nuevo exige consentimiento explícito en el registro público: completar ambos pasos dentro de la misma ventana de liberación para que el formulario anterior no permanezca publicado contra esa validación nueva. No inferir consentimiento de un cliente anterior. Las empresas existentes continúan fuera de la gestión nueva hasta una contratación explícita.

Si un RUT ya consumió Free y su cuenta se vuelve a crear, la aprobación conserva el acceso a Mi plan para contratar un plan pagado; no reinicia la gratuidad ni permite operar sin contrato.
