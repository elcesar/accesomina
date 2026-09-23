# Inicio guiado de empresa

## Objetivo
Ayudar a una empresa nueva a completar su primera operación mediante una vista del estado real de configuración y datos del tenant, sin mantener un checklist paralelo que pueda quedar desincronizado.

## Progreso calculado

Cada paso se determina a partir de datos y configuraciones existentes, independientemente de la pantalla desde la que se realizaron. El onboarding no persiste “pasos completados” como una segunda fuente de verdad.

| Paso | Regla de completitud |
| --- | --- |
| Empresa | Datos mínimos de empresa y acceso aprobados. |
| Usuarios | Existe al menos un usuario administrador activo. |
| Cliente | Existe al menos un cliente válido. |
| Contrato | Existe al menos un contrato vinculado a un cliente. |
| Personas | Existe al menos una persona cuando el módulo Personas está habilitado. |
| Orden | Existe al menos una Orden de Servicio vinculada a cliente y contrato cuando el módulo está habilitado. |

Por ejemplo, crear Cliente ABC directamente desde Clientes marca automáticamente el paso Cliente como completado al recalcular el onboarding. La pantalla no exige recorrer el wizard en orden ni crea registros de demostración.

## Módulos, permisos y activación

El onboarding usa los módulos habilitados del tenant y los permisos efectivos del usuario:

- Un paso asociado a un módulo deshabilitado se omite del cálculo y no bloquea que la empresa alcance estado operativo.
- Un usuario sin permiso para completar un paso puede ver progreso permitido, pero no recibe una acción que terminará en acceso denegado.
- Las acciones y destinos respetan los mismos controles de módulo y URL definidos para la aplicación.

Una empresa o usuario pendiente de aprobación no recibe acciones operativas. En ese estado el onboarding muestra exclusivamente el estado de aprobación y la información de espera permitida por el flujo de alta/activación del PR #34.

## Empresa operativa y continuidad

La condición “empresa operativa” se calcula cuando los pasos aplicables a sus módulos habilitados están completos. Al alcanzarla, el onboarding deja de mostrarse por defecto y queda disponible como consulta de progreso desde Configuración para usuarios autorizados.

Cerrar el onboarding sólo lo oculta para ese usuario; no altera el estado calculado. Al retomarlo, se vuelve a evaluar la configuración actual y se muestran los pasos pendientes reales. Si posteriormente se deshabilita un módulo, se elimina del cálculo; si se habilita uno nuevo, aparece como pendiente cuando corresponda.

## Criterios de aceptación
1. Progreso calculado desde empresa, usuarios, clientes, contratos, personas y órdenes reales, sin checklist persistido en paralelo.
2. Crear o configurar información fuera del wizard actualiza automáticamente el paso relacionado.
3. Cada paso sólo aparece si su módulo está habilitado para el tenant y dirige a una acción permitida al usuario.
4. Usuarios o empresas pendientes de aprobación no reciben acciones operativas.
5. La empresa alcanza estado operativo cuando completa todos los pasos aplicables a sus módulos habilitados.
6. Se puede cerrar y retomar sin perder avance, porque el progreso se vuelve a calcular.
7. No aparece como acción operativa para usuarios sin permisos administrativos.

## Pruebas
- Empresa nueva con módulos estándar.
- Cliente creado directamente desde Clientes: el paso se completa sin recorrer el wizard.
- Módulo Personas deshabilitado: no aparece ni bloquea la condición operativa.
- Usuario con permiso insuficiente: no recibe una acción inaccesible.
- Empresa pendiente de aprobación: sólo ve el estado de espera, sin acciones operativas.
- Cierre y retoma: el progreso se recalcula con datos actuales.
- Empresa operativa obtenida mediante configuraciones realizadas fuera del wizard y sin seguir los pasos en orden.
