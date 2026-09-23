# Estado de integraciones

## Objetivo
Dar visibilidad segura de la configuración y salud operacional de correo, WhatsApp, firma, ERP, acreditación, almacenamiento y antivirus, sin revelar secretos ni ejecutar acciones reales por defecto.

## Configuración y salud operacional

La configuración de una integración y su salud son dimensiones distintas. Cada proveedor muestra ambas, con fecha de última comprobación y última operación:

```text
Configuración: no_configurado | configurado
Salud: sin_datos | operativo | degradado | error
```

Ejemplos:

- SMTP puede estar `configurado` y con salud `error` cuando su último envío falla.
- S3 puede estar `configurado` y `operativo` cuando readiness y la última operación privada son correctas.
- Un proveedor sin datos de salud todavía no se declara operativo sólo por tener credenciales registradas.

La salud se deriva de readiness, operaciones reales autorizadas, timeouts, errores de autenticación y recuperaciones observadas. La interfaz diferencia fallo puntual, degradación repetida y recuperación posterior.

## Pruebas seguras y autorizadas

Las acciones de prueba sólo están disponibles para administradores autorizados. Nunca usan por defecto un cliente, número o entidad productiva.

- Correo: utiliza una dirección de prueba aprobada y marcada como no productiva.
- WhatsApp: utiliza sandbox, simulador o destinatario técnico autorizado; no se envía a contactos de clientes por defecto.
- Firma, ERP y acreditación: usan recursos de prueba o consultas no mutantes cuando el proveedor lo permita.
- Almacenamiento y antivirus: usan un archivo de prueba no sensible y un objeto aislado con limpieza controlada.

Toda prueba requiere contexto explícito del destino técnico, conserva resultado y se audita con usuario, proveedor, fecha, correlación y resultado. Las acciones deben respetar el flujo de activación de correo del PR #34 y la disponibilidad de almacenamiento/antivirus de los PR #26 y #51.

## Errores, seguridad y trazabilidad

El usuario recibe un estado y mensaje accionable, por ejemplo: “No fue posible autenticar con el proveedor”. El detalle técnico se guarda sólo en logs protegidos, asociado a un identificador de correlación consultable por soporte autorizado.

La interfaz y la bitácora de usuario nunca muestran tokens, claves, contraseñas, encabezados de autenticación, payloads sensibles ni datos personales innecesarios. Los errores se clasifican al menos como autenticación, timeout, proveedor no disponible, configuración incompleta o error de validación.

La recuperación se registra como un evento nuevo y actualiza la salud sin eliminar el historial de fallos anteriores.

## Criterios de aceptación
1. Muestra configuración y salud operacional como estados separados.
2. Muestra última comprobación, última operación, resultado, recuperación y error legible.
3. Acción de prueba controlada sólo para administradores y con destino técnico seguro.
4. No muestra claves, tokens, contraseñas, headers, payloads ni datos sensibles.
5. Registra bitácora y correlación protegida de cada prueba, fallo y recuperación.
6. Enlaces al evento y entidad relacionados sólo cuando el usuario está autorizado.

## Pruebas
- Servicio no configurado y servicio configurado sin datos de salud.
- Servicio configurado pero caído, credencial inválida y timeout.
- Error externo seguido de recuperación, preservando historial de ambos eventos.
- Prueba de correo, WhatsApp y almacenamiento con destino técnico seguro y auditoría.
- Usuario no administrador sin acceso a configuración ni acciones de prueba.
- Mensaje legible para usuario y detalle técnico protegido por correlación.
- Verificar que secretos, headers y payloads no aparecen en respuesta, UI ni bitácora visible.
