# Arquitectura frontend modular de Nexo Klar

## Objetivo

Reducir progresivamente el tamaño y acoplamiento del archivo principal sin interrumpir la operación actual.

## Primera extracción aplicada

- `assets/nexo-klar-guidance.css`: presentación de ayudas contextuales.
- `assets/nexo-klar-guidance.js`: contenido y comportamiento de ayudas por módulo.
- El archivo principal conserva temporalmente la navegación, los formularios y la lógica funcional.

## Secuencia recomendada

1. Separar sitio público y aplicación privada.
2. Extraer utilidades compartidas: validación, formato, seguridad de contenido y persistencia.
3. Extraer clientes, contratos y órdenes de servicio.
4. Extraer personas, reclutamiento, formación, salud y EPP.
5. Extraer operación: alojamientos, vehículos, inventario, turnos y credenciales.
6. Extraer cumplimiento: documentos, habilitación, incidentes y auditoría.
7. Extraer paneles, reportes, catálogos y configuración.

## Reglas

- Mantener las mismas entidades y relaciones del backend.
- No duplicar estado entre módulos.
- Conservar aislamiento por empresa.
- Incorporar pruebas antes de cada extracción.
- Mantener una versión productiva desplegable en cada etapa.
