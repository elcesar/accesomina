# Dominio canónico, sesión y borde público

## Issues relacionados

Refs #78, #79, #89 y #104.

## Objetivo

Definir una única entrada pública y privada para Nexo Klar, sin duplicar sesiones,
metadatos ni comportamientos entre el dominio raíz y `www`.

## Alcance técnico

- Definir `https://nexoklar.com` como host canónico.
- Redirigir `https://www.nexoklar.com/*` al host canónico con redirección permanente,
  preservando ruta y parámetros de consulta.
- Publicar `rel=canonical`, `og:url` y las URLs de sitemap usando exclusivamente el host
  canónico.
- Configurar CORS para los orígenes autorizados y eliminar dependencias del host `www`.
- Configurar las cookies de sesión seguras para que el flujo de acceso y creación de
  empresa no produzca un 403 por diferencia de host.
- Verificar reglas de CloudFront, S3, DNS y cabeceras de error para `robots.txt`,
  `sitemap.xml`, creación de empresa y rutas privadas.

## Fuera de alcance

- No modifica textos, contenido institucional ni imágenes de la portada.
- No rediseña la navegación móvil pública.
- No incorpora secretos ni credenciales AWS en el repositorio.

## Criterios de aceptación

1. Cualquier URL en `www.nexoklar.com` termina en la misma ruta de `nexoklar.com`.
2. El acceso, recuperación y creación de empresa funcionan desde la URL canónica sin 403.
3. La sesión no queda dividida entre hosts.
4. `robots.txt` y `sitemap.xml` responden 200 con contenido válido en producción.
5. `og:url` y `canonical` no contienen el dominio histórico `.cl` ni el host `www`.
6. No se reducen las restricciones de CORS, cookies seguras o HTTPS para lograr el cambio.

## Validación de liberación

- Pruebas HTTP de redirección, cabeceras, cookies y CORS en ambiente controlado.
- Prueba de creación de empresa, acceso, recuperación y navegación privada desde el host
  canónico.
- Inspección de CloudFront/S3/DNS por el administrador con credenciales de AWS.
- Verificación de metadatos y recursos SEO desde una sesión anónima.

## Dependencias y responsable

La aplicación puede preparar su configuración, pero el cambio productivo requiere control
de DNS, CloudFront, S3, CORS y secretos de sesión. Debe ejecutarse con el responsable de
infraestructura y conservar un plan de reversión de DNS/CDN.
