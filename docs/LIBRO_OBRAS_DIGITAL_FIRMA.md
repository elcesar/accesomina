# Libro de Obras Digital y firma electronica

## Objetivo

Domian Nexo usa el modulo Incidentes y NC como origen operativo para crear folios de Libro de Obras Digital cuando un registro requiere trazabilidad formal entre contratista, mandante, contrato y servicio.

El flujo implementado mantiene la funcionalidad actual de Incidentes y agrega:

- folio unico por servicio y libro;
- libro maestro, seguridad/HSEC, calidad, terreno/avance y comunicaciones;
- relacion con cliente, contrato, proyecto/servicio e incidente original;
- evidencias y documentos adjuntos;
- firmantes requeridos;
- bitacora de eventos del conector de firma;
- estados borrador, firma pendiente, firma observada, firmado y cerrado.

## Como funciona el Libro de Obras Digital

En el mercado chileno, el Libro de Obras Digital se usa para registrar comunicaciones formales de una obra o contrato mediante anotaciones foliadas, fecha/hora, usuarios, anexos, trazabilidad y firma. Algunos proveedores separan libros maestro, comunicaciones y auxiliares por especialidad. La finalidad es mantener evidencia ordenada entre inspeccion, mandante, ITO/residente y contratista.

Para Domian Nexo, el mismo patron se adapta a empresas de servicios industriales, mineria, mantenimiento y proyectos: el folio nace desde un incidente, observacion, no conformidad o hallazgo, queda asociado al servicio y puede ser firmado por responsables del contratista y del cliente.

## Firma electronica

El repositorio deja un conector generico de firma:

- `POST /api/integrations/signature/envelope`
- entidades habilitadas: contratos, anexos, libro de obras, incidentes, permisos de trabajo, acreditacion y EPP;
- valida firmantes;
- registra evento de integracion y auditoria;
- si no existe proveedor configurado, queda como `pending_config`;
- si existe URL/token del proveedor en configuracion de empresa, envia el sobre por webhook.

Para produccion se debe contratar o configurar un proveedor de firma electronica y probar el flujo completo con documentos reales. Para documentos con mayor exigencia probatoria se recomienda Firma Electronica Avanzada cuando corresponda.

## Fuentes revisadas

- Ley 19.799, Biblioteca del Congreso Nacional: https://www.bcn.cl/leychile/Navegar?idNorma=196640
- Biblioteca Digital de Gobierno, Ley 19.799: https://digital.gob.cl/biblioteca/regulacion/ley-19799-sobre-documentos-electronicos-firma-electronica-y-servicios-de-certificacion-de-dicha-firma/
- SGO Libro de Obras Digital: https://w3.sgo.cl/lod/
- LOD Duomo: https://lod.duomo.cl/
- Referencia sobre obligatoriedad LOD MOP desde 2019: https://www.dconstruccion.cl/?p=23787
- Definicion OGUC de Libro de Obras, BCN: https://www.bcn.cl/leychile/Navegar?idNorma=61564

## Recomendacion productiva

Antes de venderlo como Libro de Obras Digital con validez contractual plena, validar con el proveedor de firma:

- tipo de firma usada por cada libro: FES, FEA o credencial;
- evidencia de identidad del firmante;
- integridad del documento firmado;
- callback de estado firmado/rechazado/observado;
- custodia del PDF firmado y certificado;
- retencion, exportacion y auditoria inmutable por empresa.
