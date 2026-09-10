# Nexo Klar — Design System Guide
**Version 3.3 · Septiembre 2026**

> **Para desarrolladores humanos y agentes IA (Claude, Codex, Copilot):**
> Este documento es la referencia de diseño, UX y composición modular de Nexo Klar.
> Antes de crear una clase CSS, modificar una interfaz, introducir un patrón visual o crear una nueva vista transversal, revisar este documento, `tokens.css` y `components.css`.
>
> Regla base: **los valores visuales compartidos pertenecen a tokens, los componentes reutilizables pertenecen a `components.css`, los layouts específicos pertenecen a CSS específico y el JSX describe estructura y comportamiento.**

---

## 1. Arquitectura visual oficial

```text
tokens.css
    ↓
components.css
    ↓
CSS específico de layout / página / módulo
    ↓
JSX
```

`tokens.css` es la única fuente de verdad de valores visuales compartidos. `components.css` contiene componentes reutilizables `nk-*`. El CSS de módulo solo debe resolver composición, grid, flex, posiciones, anchuras y excepciones propias de esa pantalla.

### Regla de reutilización

Antes de crear una clase, token o patrón nuevo:

1. comprobar si existe en `tokens.css`;
2. comprobar si existe en `components.css`;
3. comprobar si otro módulo ya resuelve el mismo patrón;
4. crear CSS local únicamente cuando la composición sea realmente específica.

No crear sistemas visuales paralelos, colores corporativos hardcodeados, tipografía local ni nuevos aliases `--nk-*`.

Los estilos inline se aceptan únicamente para valores verdaderamente dinámicos de runtime que no puedan expresarse razonablemente mediante clases, atributos o variables CSS.

---

## 2. Recursos gráficos

Los recursos oficiales viven en `public/brand/`:

- `NK-color-horizontal.svg`: logo principal sobre fondo claro.
- `NK-color-horizontal-claim.svg`: portada y piezas con claim.
- `NK-blanco-horizontal.svg`: fondos oscuros.
- `NK-favico.svg`: favicon y representación reducida.

No duplicar assets, recrear logos como texto, modificar `fill`, aplicar filtros CSS ni usar variantes incompatibles con el fondo.

---

## 3. Tokens y componentes compartidos

Los nombres y valores reales de tokens están definidos en `src/styles/tokens.css`; ese archivo es la referencia técnica final.

Familias principales:

```text
Tipografía: --font-ui, --font-brand, --text-*, --weight-*, --leading-*
Superficies: --bg, --surf, --surf-2, --line
Texto: --ink, --mut, --sub, --disabled
Marca/acción: --pri, --action, --acc, --hot, --graph
Estados: --ok, --warn, --err, --none y sus fondos
Layout: --sidebar-width, --header-height, --content-max-width, --page-padding
Motion/accesibilidad: --transition-*, --focus-ring
```

### Jerarquía de superficies

Las páginas internas deben compartir una misma base visual:

- **`--bg`**: fondo general de la aplicación y del lienzo principal de cada página interna. Es la superficie base común y no debe cambiar según el módulo.
- **`--surf`**: tarjetas, paneles, formularios, tablas contenidas y superficies elevadas sobre el fondo general.
- **`--surf-2`**: superficies secundarias o de apoyo, por ejemplo zonas de filtros o resúmenes cuando se requiere diferenciación suave.
- **`--line`**: separación entre superficies y componentes.

No utilizar `--surf` (blanco) como fondo completo de una página interna por decisión local. Un módulo puede contener encabezados, tablas o paneles blancos, pero el lienzo de página debe permanecer en `--bg`. Las excepciones deben estar justificadas como un patrón transversal y documentadas aquí, no definidas aisladamente en CSS de página.

Componentes compartidos principales:

```text
.nk-button / primary / action / secondary / quiet / danger
.nk-icon-button
.nk-card
.nk-field / .nk-label / .nk-input / .nk-select / .nk-textarea
.nk-badge / ok / warn / error / none
.nk-table-wrapper / .nk-table
.nk-search
.nk-tabs / .nk-tab
.nk-dialog
.nk-empty
.nk-actions
```

Máximo una acción primaria visible por contexto principal. Tablas: máximo recomendado de siete columnas sin personalización, acciones a la derecha e información necesaria para decidir antes que detalle exhaustivo.

Usar Tabler Icons outline. No usar emojis como iconos funcionales.

---

## 4. Patrón estándar de página operacional

La experiencia implementada en Personas, Formación, Exámenes, Salud, EPP, Turnos y Centro de Control establece este patrón:

```text
HEADER DEL MÓDULO
  dominio
  título + descripción                    acciones
                                         Actualizar | Acción principal

FEEDBACK
  éxito / error cuando corresponda

RESUMEN OPERACIONAL
  KPIs relevantes, no decorativos

BÚSQUEDA Y FILTROS
  solo controles que ayudan a decidir

CONTENIDO
  tabla / lista / ficha / panel

ACCIÓN CONTEXTUAL
  diálogo o flujo específico cuando corresponda
```

### 4.1 Encabezado universal de página

Todas las páginas internas deben utilizar la misma jerarquía de encabezado, independientemente del dominio funcional.

En escritorio:

```text
[DOMINIO / SECCIÓN]
[Título de página]
[Descripción funcional breve]          [Actualizar] [Acción principal]
```

#### Regla de nomenclatura

El `Sidebar.jsx` es la referencia visible para los dos primeros niveles del encabezado:

- **Título 1 / dominio:** debe ser exactamente el nombre del grupo que contiene la página en el Sidebar.
- **Título 2 / página:** debe ser exactamente el nombre del ítem correspondiente en el Sidebar.
- No abreviar, reinterpretar ni agregar calificadores locales al dominio o al nombre de la página.
- Si cambia un nombre visible en el Sidebar, el encabezado de la página debe actualizarse en el mismo cambio.
- El dominio debe renderizarse **una sola vez**. Si una página especializada ya incluye `.nk-page-domain` o un kicker equivalente pendiente de migración, el layout no debe agregar una segunda copia.

Ejemplos:

```text
CAPITAL HUMANO
Personas

CAPITAL HUMANO
Formación y certificaciones

RELACIÓN COMERCIAL
Clientes

RELACIÓN COMERCIAL
Contratos y firmas

RELACIÓN COMERCIAL
Órdenes de servicio

GESTIÓN OPERACIONAL
Comunicaciones y convocatorias
```

La transformación a mayúsculas del dominio es visual mediante CSS; el texto fuente debe conservar la escritura definida en el Sidebar.

#### Jerarquía visual

**Línea 1 · Dominio**
- clase: `.nk-page-domain`;
- tamaño: `--text-xs`;
- peso: `--weight-bold`;
- color: `--pri`;
- `letter-spacing: 0.08em`;
- presentación en mayúsculas.

**Línea 2 · Título de página**
- clase: `.nk-page-title`;
- fuente: `--font-brand`;
- tamaño: `--text-3xl`;
- peso: `--weight-bold`;
- color: `--ink`;
- `line-height: --leading-snug`;
- no se permiten tamaños locales distintos para el H1 de una página interna.

**Línea 3 · Descripción**
- clase: `.nk-page-description`;
- tamaño: `--text-md`;
- color: `--mut`;
- ancho máximo recomendado: 760 px;
- describir la función de la pantalla en lenguaje de usuario;
- no exponer nombres de claves, IDs, fuentes JSON, tablas ni detalles técnicos de implementación.

#### Estructura JSX de referencia

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

Clases oficiales del patrón:

```text
.nk-page-header
.nk-page-heading
.nk-page-domain
.nk-page-title
.nk-page-description
.nk-page-header-actions
```

No crear variantes locales como `*-kicker`, `*-page-title` o `*-module-title` cuando representan este mismo patrón.
