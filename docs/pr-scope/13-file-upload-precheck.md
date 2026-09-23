# Validación previa de carga documental

## Objetivo
Comprobar almacenamiento y antivirus antes de recibir archivos grandes, resolviendo formalmente la observación de orden de ejecución registrada en PR #26.

## Orden obligatorio del flujo

La ruta de carga debe ejecutar los controles en este orden:

```text
Autorización
     ↓
Readiness de almacenamiento / antivirus requerido
     ↓
Multer recibe archivo
     ↓
Validación de tipo, tamaño y contenido permitido
     ↓
Escaneo antimalware
     ↓
Persistencia privada y auditoría
```

La prevalidación se implementa como middleware anterior a `upload.single('file')`. Cuando storage o antivirus requerido no está listo, la ruta responde sin invocar Multer ni leer el body del archivo. Así no se mantiene en memoria un archivo de hasta 25 MB para descubrir recién después que S3 o el scanner están indisponibles.

La prevalidación no sustituye controles posteriores. Almacenamiento o antivirus pueden fallar entre readiness y la operación real; esos fallos siguen manejándose sin persistir un archivo incompleto ni considerarlo cargado.

## Contrato de errores

| Código | Situación | Comportamiento visible |
| --- | --- | --- |
| 401 / 403 | Usuario no autenticado o no autorizado | Se rechaza antes de recibir archivo. |
| 413 | Tamaño máximo excedido | Informa límite permitido. |
| 422 | Tipo, contenido o malware rechazado según contrato | Informa que el archivo no fue aceptado. |
| 503 | Storage o antivirus requerido no disponible | Informa indisponibilidad temporal y permite reintentar después. |

Cada error técnico genera un identificador de correlación. El usuario recibe un mensaje útil con ese identificador cuando corresponda; soporte autorizado puede usarlo para localizar el detalle técnico protegido. La respuesta y la interfaz no exponen buckets, credenciales, rutas internas, firmas de antivirus ni otros secretos.

## Integridad y auditoría

Un archivo sólo se registra como disponible después de validación, escaneo requerido y persistencia exitosa. Si ocurre un fallo intermedio, se limpia cualquier objeto temporal posible y se registra el resultado como fallido con su correlación. La auditoría conserva usuario, tenant, entidad dueña, resultado y correlación, sin almacenar contenido sensible en el log.

## Criterios de aceptación
1. Autorización y disponibilidad de infraestructura se validan antes de Multer.
2. Si readiness falla, Multer no procesa ni mantiene el body del archivo en memoria.
3. La caída de storage o antivirus después del precheck se trata como fallo real sin persistencia parcial.
4. 401/403, 413, 422 y 503 mantienen la semántica indicada en el contrato.
5. Mensaje claro para el usuario y registro técnico correlacionable sin secretos.
6. Un archivo sólo queda disponible tras validación, escaneo requerido y persistencia completa.

## Pruebas
- S3 no configurado o no listo: respuesta 503 y comprobar que Multer no procesa el body.
- Antivirus requerido no disponible: respuesta 503 antes de Multer.
- Usuario sin sesión o permiso: 401/403 antes de recibir archivo.
- Archivo mayor a 25 MB: respuesta 413.
- Archivo de tipo/contenido inválido o con malware: respuesta 422.
- Archivo limpio con storage y antivirus disponibles: persiste y queda auditado.
- Infraestructura cae después del precheck: no deja archivo disponible ni objeto parcial.
- Error visible incluye correlación; respuesta no contiene secretos ni detalles internos.
