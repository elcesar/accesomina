# Preparacion comercial del sitio publico

## Prioridad

P0 antes de difundir el sitio o activar captacion comercial. Este plan excluye deliberadamente la decision de host canonico y el alcance movil, que requieren definicion separada de socios.

## Objetivo

Alinear el sitio publico con la identidad NEXOKLAR aprobada, hacer trazable la captacion comercial y asegurar navegacion, contenidos y SEO basico correctos.

## Alcance funcional

- Reemplazar toda imagen, texto alternativo y referencia de producto que no sea NEXOKLAR.
- Publicar categoria, proposito, vision, mision y valores aprobados de forma literal y consistente.
- Usar correo corporativo confirmado sobre `nexoklar.com` en contacto, formularios y comunicaciones visibles.
- Convertir la solicitud de demostracion en un flujo recibido por el servidor, con confirmacion visible, validacion de campos, registro y seguimiento.
- Corregir titulos por ruta, metadescripciones, robots.txt, sitemap.xml y enlaces publicos rastreables.
- Corregir formularios de acceso, recuperacion y registro: etiquetas asociadas, obligatoriedad visible, errores por campo y mensajes comprensibles.
- Disenar una pagina 404 coherente con la marca y con salida clara hacia una pagina existente.

## Reglas de contenido y captacion

1. El sitio no puede prometer integraciones, modulos o resultados no disponibles.
2. Solicitar una demostracion no debe depender del cliente de correo del visitante.
3. Cada pagina publica indexable debe tener titulo, descripcion, URL y jerarquia de encabezados propios.
4. Todo formulario debe informar que datos son obligatorios antes de enviarse y conservar valores validos al fallar.
5. La informacion de contacto debe ser corporativa, comprobable y consistente en cada vista.

## Criterios de aceptacion

1. No hay referencias a AccesoMina, dominios `.cl` obsoletos ni contenido institucional no aprobado.
2. La solicitud de demostracion crea un registro auditable y entrega confirmacion en pantalla.
3. Formularios publicos identifican etiquetas, errores y campos requeridos de forma accesible.
4. robots.txt y sitemap.xml son servidos correctamente; cada pagina publica tiene metadata propia.
5. La navegacion publica utiliza enlaces identificables y la pagina 404 mantiene una ruta de recuperacion.
6. Las pruebas de navegador cubren solicitud de demo, registro, login, recuperacion y errores de validacion.

## Pruebas requeridas

- Comparacion de contenidos contra la identidad aprobada.
- Pruebas de accesibilidad de formularios, encabezados y contraste.
- Pruebas de SEO tecnico y vista previa social en entorno controlado.
- Pruebas E2E de solicitud de demostracion y creacion de empresa, una vez resuelta la infraestructura correspondiente.

## Fuera de alcance

No define cual host sera el oficial ni implementa responsive del portal. Esas decisiones se mantienen fuera de este plan por instruccion de producto.
