# Administración de clientes SaaS

La sección **Administración de clientes** está disponible solo para el rol administrador de Nexo Klar. Cada ficha concentra la operación comercial, de soporte y seguridad de una empresa sin exponer ni mezclar su información operacional con otras empresas.

## Ficha 360° de empresa

- Estado de la cuenta, plan, renovación, pago y responsable comercial.
- Uso: usuarios activos, MFA, sesiones, archivos y último cambio de datos.
- Alta guiada: datos legales, administrador, plan, módulos, marca, importación y validación final.
- Tickets internos de soporte con prioridad, responsable, compromiso y estado.
- Seguridad: alertas de acceso, MFA y sesiones activas.
- Respaldo JSON auditado de datos, configuración y módulos para recuperación controlada.

## Ciclo de vida seguro

Una cuenta puede mantenerse activa, en cortesía, con suspensión programada, en solo lectura, con baja programada o cerrada. La suspensión y el cierre revocan sesiones activas; no se elimina la evidencia ni la bitácora por defecto.

## Aislamiento y auditoría

El perfil comercial y los tickets incorporan `tenant_id`, políticas RLS y `FORCE ROW LEVEL SECURITY`. Las consultas administrativas abren un contexto acotado por empresa y las acciones crean entradas en la bitácora inmutable de esa empresa.
