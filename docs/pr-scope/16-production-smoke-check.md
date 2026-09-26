# Verificación controlada de producción

## Objetivo
Tener una pauta de verificación productiva segura, repetible y sin efectos sobre clientes reales, ejecutable antes de habilitar una empresa y después de cambios relevantes de despliegue.

## Alcance y momentos de ejecución

La verificación se puede ejecutar en tres momentos controlados:

1. Antes de habilitar un tenant productivo.
2. Después de un despliegue relevante de aplicación o infraestructura.
3. Bajo ejecución manual autorizada por un administrador técnico.

Cada ejecución usa un tenant técnico o de prueba, nunca una empresa cliente. Si el proveedor no dispone de sandbox, la verificación se limita a una comprobación no mutante o a recursos técnicos explícitamente autorizados.

## Pruebas sin efecto sobre clientes

| Integración | Recurso controlado | Garantía |
| --- | --- | --- |
| Correo | Buzón técnico NEXOKLAR | Asunto identificado como prueba; nunca correo de cliente. |
| WhatsApp | Sandbox o número técnico autorizado | No usa contactos ni grupos reales. |
| Firma | Entorno sandbox o documento no vinculante | No crea solicitudes de firma reales. |
| Acreditación | Cuenta/recurso de prueba o consulta no mutante | No modifica acreditaciones de faena. |
| Almacenamiento y antivirus | Archivo de prueba no sensible y objeto aislado | No toca documentos de clientes y se limpia de forma controlada. |
| Descarga | Evidencia técnica generada para la prueba | No descarga archivos de un cliente real. |

Las pruebas deben etiquetar toda comunicación, archivo o evento con el identificador de la ejecución para distinguirlos de operación comercial.

## Readiness, salud y evidencia

Antes de ejecutar conectores se revisa `/api/ready` para base de datos, almacenamiento y antivirus conforme a PR #51 y PR #26. Los resultados de cada prueba alimentan el estado de salud operacional definido en PR #49, sin convertir una configuración existente en salud operativa por sí sola.

La evidencia mínima por ejecución incluye fecha/hora, ambiente, versión o commit desplegado, tenant técnico, responsable o proceso autorizado, proveedor, prueba realizada, resultado, identificador de correlación y enlace seguro al evento técnico. No se guardan ni muestran secretos, tokens, payloads sensibles ni datos personales innecesarios.

Si una prueba parcial falla, el informe distingue dependencias correctas de la dependencia fallida, mantiene evidencia de la ejecución y no declara el ambiente validado hasta una ejecución posterior exitosa. Las recuperaciones generan un nuevo evento verificable, preservando el historial del fallo.

## Criterios de aceptación
1. Revisión de `/api/ready` para base, almacenamiento y antivirus antes de recibir archivos o ejecutar conectores.
2. Pruebas controladas de correo, WhatsApp, firma, acreditación, almacenamiento/antivirus y descarga.
3. Cada conector usa tenant, cuenta, destinatario o recurso técnico controlado; nunca datos de clientes reales.
4. La ejecución se permite antes de habilitar tenant, tras despliegue relevante o manualmente por rol autorizado.
5. Evidencia de ambiente, versión, responsable, resultado y correlación técnica.
6. Los resultados actualizan de forma coherente la salud de integraciones definida en PR #49.
7. Sin exponer secretos ni datos reales innecesarios.

## Pruebas
- Entorno listo con todas las dependencias y recursos técnicos disponibles.
- Base, storage o antivirus caído: readiness falla y no se declara ambiente validado.
- Correo, WhatsApp, firma y acreditación verifican exclusivamente sandbox/cuentas técnicas.
- Prueba parcial fallida: evidencia identifica proveedor fallido y proveedores correctos.
- Recuperación posterior: nueva ejecución marca resultado correcto sin borrar el fallo previo.
- Evidencia contiene ambiente, commit, responsable y correlación, sin secretos ni datos personales.
- Validar que no se creó mensaje, firma, acreditación ni documento sobre un cliente real.
