# Nexo Klar · Estándar universal de encabezados

**Design System:** v3.3  
**Fecha:** 10 de septiembre de 2026  
**Ámbito:** todas las páginas internas de Nexo Klar.

## Objetivo

Eliminar diferencias de jerarquía, tamaño y nomenclatura entre módulos. Todas las páginas internas deben utilizar el mismo patrón de encabezado, independientemente del dominio funcional al que pertenezcan.

## Regla de nomenclatura

El Sidebar es la referencia funcional de nomenclatura visible para el encabezado.

- **Título 1 / dominio:** debe ser exactamente el nombre del grupo que contiene la página en el Sidebar.
- **Título 2 / página:** debe ser exactamente el nombre del ítem correspondiente en el Sidebar.
- No abreviar, reinterpretar ni agregar calificadores locales al dominio o al nombre de la página.
- Si se cambia un nombre visible en el Sidebar, el encabezado de la página debe actualizarse en el mismo cambio.

Ejemplos:

```text
CAPITAL HUMANO
Personas

CAPITAL HUMANO
Turnos y asistencia

RELACIÓN COMERCIAL
Clientes

RELACIÓN COMERCIAL
Contratos y firmas

RELACIÓN COMERCIAL
Órdenes de servicio

GESTIÓN OPERACIONAL
Comunicaciones y convocatorias
```

## Jerarquía visual

### Línea 1 · Dominio

Clase: `.nk-page-domain`

- contenido: nombre exacto del grupo del Sidebar;
- presentación: mayúsculas;
- tamaño: `--text-xs` (11 px);
- peso: `--weight-bold`;
- color: `--pri`;
- letter-spacing: `0.08em`.

La transformación a mayúsculas es únicamente visual mediante CSS. El texto fuente debe conservar la escritura definida en el Sidebar.

### Línea 2 · Título de página

Clase: `.nk-page-title`

- contenido: nombre exacto del ítem del Sidebar;
- fuente: `--font-brand`;
- tamaño: `--text-3xl` (28 px);
- peso: `--weight-bold`;
- color: `--ink`;
- line-height: `--leading-snug`.

No se permiten tamaños locales distintos para el H1 de una página interna.

### Línea 3 · Descripción

Clase: `.nk-page-description`

- descripción funcional breve de la pantalla;
- tamaño: `--text-md` (14 px);
- color: `--mut`;
- ancho máximo recomendado: 760 px;
- no exponer nombres de claves, IDs, fuentes JSON, nombres de tablas ni detalles de implementación.

## Estructura JSX de referencia

```jsx
<header className="nk-page-header">
  <div className="nk-page-heading">
    <p className="nk-page-domain">Capital Humano</p>
    <h1 className="nk-page-title">Personas</h1>
    <p className="nk-page-description">
      Administra personas, disponibilidad y contexto operacional.
    </p>
  </div>

  <div className="nk-page-header-actions">
    {/* acciones contextuales */}
  </div>
</header>
```

## Clases oficiales

El patrón transversal vive en `nexo-v2/src/styles/page-header.css`:

- `.nk-page-header`
- `.nk-page-heading`
- `.nk-page-domain`
- `.nk-page-title`
- `.nk-page-description`
- `.nk-page-header-actions`

No crear variantes como `*-kicker`, `*-page-title`, `*-module-title` o tamaños de H1 específicos cuando representan este mismo patrón.

## Compatibilidad durante la migración

Mientras se sustituyen encabezados locales existentes, `.nk-app-main h1` normaliza temporalmente la tipografía de todos los H1 internos al mismo tamaño, familia, peso y color del título oficial. Esta compatibilidad no reemplaza la obligación de adoptar la estructura completa de tres líneas cuando la página sea intervenida.

## Regla para nuevas fases

Desde Fase 5 en adelante, toda página nueva, revisada o reemplazada debe salir ya con este encabezado. Las páginas modernizadas de fases anteriores deben converger al mismo patrón mediante una corrección transversal, sin alterar su lógica funcional ni sus fuentes de datos.

## Fuente de nombres vigente

Los nombres visibles se toman de `nexo-v2/src/components/layout/Sidebar.jsx`. Ejemplos actuales:

- Centro de Control → Panel General, Alertas, Gestión de trabajadores por proyecto, Centro Operativo.
- Capital Humano → Personas, Turnos y asistencia, Protección personal / EPP, Formación y certificaciones, Exámenes y aptitudes, Salud Ocupacional, Restringidos.
- Gestión Operacional → Comunicaciones y convocatorias, Vehículos, activos y equipos, Alojamientos y estadías, Credenciales.
- Relación Comercial → Clientes, Contratos y firmas, Órdenes de servicio.

El resto de dominios sigue exactamente la misma regla.
