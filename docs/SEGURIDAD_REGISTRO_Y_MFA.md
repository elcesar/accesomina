# Seguridad de registro y doble autenticacion

## Politica aplicada

- El repositorio GitHub es privado.
- El registro publico de empresas queda desactivado en produccion.
- Las empresas deben ser creadas o invitadas por la administracion Domian.
- MFA es obligatorio en produccion para acceder a los modulos privados.
- MFA utiliza codigos TOTP compatibles con Google Authenticator, Microsoft Authenticator y aplicaciones equivalentes.
- Los secretos MFA se almacenan cifrados.
- Los codigos de recuperacion se almacenan solamente como hashes y son de un solo uso.
- Los intentos de acceso mantienen limitacion de frecuencia y bloqueo temporal.
- Las sesiones creadas sin completar MFA no pueden acceder a los modulos operativos.

## Variables productivas

Configurar en AWS Secrets Manager o en la definicion segura de la tarea:

```text
REGISTRATION_ENABLED=false
MFA_REQUIRED=true
TENANT_SECRET_KEY=<secreto aleatorio de al menos 32 caracteres>
```

`TENANT_SECRET_KEY` protege los secretos MFA y no debe cambiarse sin un procedimiento de rotacion. Si se pierde, los usuarios tendran que volver a enrolar MFA.

## Primer ingreso

1. El usuario ingresa RUT de empresa, correo y contrasena.
2. Si todavia no tiene MFA, el sistema entrega una clave manual de enrolamiento.
3. El usuario agrega Domian Nexo en su aplicacion autenticadora.
4. Confirma el codigo de seis digitos.
5. Guarda los codigos de recuperacion en un lugar seguro.
6. La sesion queda habilitada para acceder a los modulos privados.

## Ingresos posteriores

1. Ingresar RUT, correo y contrasena.
2. Ingresar el codigo TOTP de seis digitos.
3. Como contingencia, se puede utilizar una vez uno de los codigos de recuperacion.

## Perdida del telefono

1. El usuario intenta primero un codigo de recuperacion.
2. Si no dispone de codigos, solicita restablecimiento a un administrador.
3. El administrador autenticado abre Usuarios y Permisos y selecciona Restablecer MFA.
4. El sistema revoca todas las sesiones del usuario y registra la accion en auditoria.
5. En su siguiente ingreso, el usuario debe configurar MFA nuevamente.

Un administrador no puede restablecer su propio MFA desde la sesion actual. Esto evita que una cuenta comprometida elimine su segundo factor.

## Migracion

Antes de desplegar la nueva version se debe ejecutar:

```text
pnpm run migrate
```

La migracion `014_mfa_and_closed_registration.sql` agrega el estado MFA, secretos cifrados, hashes de recuperacion y validacion MFA de sesiones.

## Verificacion antes de produccion

1. Confirmar que el registro Nuevo cliente no aparezca.
2. Confirmar que una cuenta sin MFA solo pueda acceder al enrolamiento.
3. Confirmar que un codigo incorrecto sea rechazado.
4. Confirmar que un codigo TOTP correcto permita crear la sesion.
5. Confirmar que un codigo de recuperacion no pueda reutilizarse.
6. Confirmar que Restablecer MFA cierre las sesiones del usuario.
7. Revisar la bitacora de auditoria.
