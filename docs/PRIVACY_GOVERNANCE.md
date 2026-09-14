# Gobernanza de datos y Ley 21.719

## Alcance incorporado

El modulo `Privacidad y Datos` mantiene registros independientes por empresa para:

- actividades de tratamiento, finalidad, base de licitud, categorias, destinatarios, conservacion y riesgo;
- solicitudes de acceso, rectificacion, supresion, oposicion, bloqueo y portabilidad;
- evidencia de otorgamiento o revocacion de consentimientos;
- incidentes de privacidad, severidad, afectados, contencion, notificaciones y cierre;
- auditoria inmutable de altas y cambios de estado.

Todos los registros usan `tenant_id`, politicas PostgreSQL RLS forzadas y permisos exclusivos de administradores de la empresa.

## Responsabilidades del cliente

Cada empresa debe definir sus finalidades, bases de licitud, plazos de conservacion, responsables, procedimientos y textos legales con asesoria juridica. Domian actua como plataforma y encargado de tratamiento segun el contrato que se suscriba; la herramienta no reemplaza una evaluacion legal ni certifica por si sola el cumplimiento.

## Pendientes de infraestructura y organizacion

1. Publicar politica y aviso de privacidad versionados.
2. Designar responsable o delegado de proteccion de datos.
3. Aprobar procedimiento de verificacion de identidad para solicitudes de titulares.
4. Definir matriz de conservacion y eliminacion por tipo documental.
5. Definir plan de respuesta y notificacion de vulneraciones.
6. Mantener registro contractual de proveedores y transferencias internacionales.
7. Realizar evaluaciones de impacto para tratamientos de alto riesgo.
8. Contratar prueba de penetracion y revisar el programa de cumplimiento con asesoria legal.

La Ley 21.719 entra en vigencia el 1 de diciembre de 2026. El producto debe revisarse nuevamente cuando la Agencia de Proteccion de Datos Personales publique instrucciones aplicables.
