# Plan de operación de liberación

## Trazabilidad
Refs #191, #211 y #212.

## Objetivo
Cerrar condiciones operacionales de cambios ya integrados sin confundir configuración o QA de producción con cambios de código.

## SMTP y solicitud de demostración
- Aplicar migración `022_public_demo_requests.sql`.
- Configurar secretos SMTP fuera del repositorio.
- Confirmar destinatario comercial y ejecutar envío real, registro y contingencia.

## Evidencias de Personas
- Probar carga consecutiva, eliminación, recarga, evidencia de doble cara, descarga y auditoría con una sesión productiva autorizada.
- Documentar resultado en #212; una regresión abre un PR correctivo separado.

## Cierre
Los tres Issues son controles de liberación. No se cierran por este plan: requieren evidencia real de producción y autorización de quien administra infraestructura.