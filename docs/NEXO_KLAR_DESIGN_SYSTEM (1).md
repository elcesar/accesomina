# Nexo Klar — Design System Guide
**Version 3.0 · Septiembre 2026**

> **Para desarrolladores humanos y agentes IA (Claude, Codex, Copilot):**
> Este documento es la fuente de verdad para construir interfaces en Nexo Klar.
> Antes de escribir cualquier estilo inline o clase CSS nueva, consulta este archivo.
> Si un token o componente que necesitas no existe aquí, créalo en el archivo correcto
> y documéntalo — no lo definas localmente en el componente.

---

## Índice

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Archivos de estilos](#2-archivos-de-estilos)
3. [Recursos gráficos — public/brand/](#3-recursos-gráficos--publicbrand)
4. [Tokens de diseño — tokens.css](#4-tokens-de-diseño--tokenscss)
5. [Componentes compartidos — components.css](#5-componentes-compartidos--componentscss)
6. [Reglas de uso](#6-reglas-de-uso)
7. [Patrones de implementación en JSX](#7-patrones-de-implementación-en-jsx)
8. [Estados semánticos](#8-estados-semánticos)
9. [Lo que nunca se debe hacer](#9-lo-que-nunca-se-debe-hacer)

---

## 1. Arquitectura del sistema

```
src/
  styles/
    tokens.css      ← Variables CSS globales. Fuente de verdad de todos los valores visuales.
    components.css  ← Clases reutilizables. Importa tokens.css. No define valores propios.
  pages/            ← Cada página puede tener su propio CSS solo para layout específico.
  components/       ← Componentes JSX. Usan clases nk-* o estilos inline con vars de tokens.

public/
  brand/            ← Logos SVG. Archivos estáticos. No pasan por Vite. URLs predecibles.
```

**Jerarquía de precedencia:**
```
tokens.css → components.css → estilos inline de componente JSX (solo layout)
```

Los estilos inline en JSX están permitidos únicamente para valores de layout que
son específicos de esa pantalla (posición, grid, flex local). Nunca para colores,
tipografía ni espaciado que ya exista como token.

---

## 2. Archivos de estilos

### `src/styles/tokens.css` — Design Tokens v3.0

**Propósito:** Define todas las variables CSS (`--nombre`) que representan los
valores visuales del sistema: colores, tipografía, espaciado, sombras, radios,
motion y layout. Es el único lugar donde se declaran valores primitivos.

**Quién lo importa:** `components.css` lo importa con `@import`. En React,
se importa en `main.jsx` como primer import para que esté disponible globalmente.

```jsx
// main.jsx — primer import, antes de cualquier componente
import './styles/tokens.css'
import './styles/components.css'
```

**Cuándo modificarlo:** Solo cuando se necesite agregar un nuevo token global
o actualizar un valor del brandbook. Nunca para estilos de una página específica.

---

### `src/styles/components.css` — Shared Components v1.0

**Propósito:** Clases CSS reutilizables con prefijo `nk-` que implementan los
componentes visuales estándar de la plataforma: botones, cards, tablas, formularios,
modales, badges, tabs y más. Consume exclusivamente variables de `tokens.css`.

**Quién lo usa:** Cualquier página o componente JSX puede aplicar estas clases
directamente en el `className` de los elementos HTML.

**Cuándo modificarlo:** Solo para agregar nuevos componentes compartidos que
se vayan a usar en más de una pantalla. Nunca para personalizar el look de
una sola página.

---

## 3. Recursos gráficos — public/brand/

Todos los logos viven en `public/brand/`. Al estar en `public/`, Vite los copia
tal cual al bundle final sin procesarlos. Las URLs son predecibles y estables.

### Archivos disponibles

| Archivo | Uso recomendado | Fondo compatible |
|---|---|---|
| `NK-color-horizontal.svg` | Logo principal. Header de landing, presentaciones, material externo. | Blanco / Ivory (#F4EFE3) |
| `NK-color-horizontal-claim.svg` | Logo con frase de bajada integrada. Portadas, onboarding, splash. | Blanco / Ivory (#F4EFE3) |
| `NK-blanco-horizontal.svg` | Logo en blanco. Sidebar oscuro, fondos índigo (#2A2A8C), fondos grafito (#26313A). | Fondos oscuros |
| `NK-favico.svg` | Favicon y logo reducido. Tab del browser, notificaciones, avatar 32×32 o menor. | Cualquiera (tiene fondo propio) |

### Cómo referenciarlos en JSX

```jsx
// Siempre con ruta absoluta desde la raíz del sitio
<img src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" height={32} />

// En el Sidebar (fondo blanco) → logo color
<img src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" height={28} />

// En LoginPage panel izquierdo (fondo índigo) → logo blanco
<img src="/brand/NK-blanco-horizontal.svg" alt="Nexo Klar" height={28} />

// En <head> del index.html → favicon
<link rel="icon" type="image/svg+xml" href="/brand/NK-favico.svg" />
```

### Reglas de uso del logo

- **No escalar por debajo de 24px de alto** — el texto pierde legibilidad.
- **No aplicar filtros CSS** (saturate, brightness, etc.) sobre el logo color.
- **No cambiar colores** con `fill` o `color` en CSS — usar la variante correcta.
- **No usar el logo color sobre fondos oscuros** — usar `NK-blanco-horizontal.svg`.
- **No reemplazar el logo** por texto con la tipografía de marca — siempre SVG.

---

## 4. Tokens de diseño — tokens.css

Todos los tokens son variables CSS nativas (`--nombre`). Se usan con `var(--nombre)`.

### 4.1 Tipografía

```css
/* Familias */
--font-ui:    'Inter', system-ui, sans-serif;   /* Todo el contenido de la app */
--font-brand: 'Manrope', system-ui, sans-serif; /* Títulos, headings, logo text */

/* Escala de tamaños */
--text-xs:   11px   /* Labels de tabla, badges, notas de pie */
--text-sm:   12px   /* Texto secundario, metadatos */
--text-base: 13px   /* Texto base de la app */
--text-md:   14px   /* Cuerpo de formularios, inputs, párrafos */
--text-lg:   16px   /* Subtítulos de sección */
--text-xl:   18px   /* Títulos de card */
--text-2xl:  22px   /* Títulos de modal */
--text-3xl:  28px   /* Títulos de página */
--text-4xl:  36px   /* Display / hero */

/* Pesos */
--weight-regular:   400
--weight-medium:    500
--weight-semibold:  600  /* Labels, botones, encabezados de tabla */
--weight-bold:      700  /* Títulos */
--weight-extrabold: 800  /* Headings de marca */

/* Interlineado */
--leading-tight:   1.15  /* Headings grandes */
--leading-snug:    1.30  /* Títulos */
--leading-normal:  1.50  /* Cuerpo */
--leading-relaxed: 1.60  /* Párrafos largos */
```

**Clases de tipografía listas para usar:**
```html
<h1 class="heading-xl">Título display</h1>   <!-- 36px extrabold brand -->
<h2 class="heading-lg">Título grande</h2>    <!-- 28px bold brand -->
<h3 class="heading-md">Título sección</h3>  <!-- 22px bold brand -->
<h4 class="heading-sm">Título card</h4>     <!-- 18px bold brand -->
<p  class="claim">Frase ancla</p>           <!-- 16px semibold brand -->
```

---

### 4.2 Colores de marca (primitivos)

Estos son los colores crudos del brandbook. **No usarlos directamente en
componentes** — usar los tokens semánticos de la sección 4.3.

```css
/* Índigo — color primario de la marca */
--color-indigo:       #2A2A8C
--color-indigo-deep:  #1A1A5E  /* hover / pressed */
--color-indigo-light: #E3E3F0  /* fondos activos en sidebar */

/* Cobalto — acción primaria (botones de acción, focus ring) */
--color-cobalt:       #1E3AE0
--color-cobalt-deep:  #1229A8

/* Grafito — encabezados de tabla, nav secundario */
--color-graphite:     #26313A
--color-graphite-mid: #3D4E5A

/* Magenta — alertas críticas, highlights de campaña */
--color-magenta:       #E4006E
--color-magenta-ink:   #A3004F
--color-magenta-light: #FFE0EF

/* Teal / Turquesa — acento, links, indicadores positivos de acción */
--color-teal:       #00CFC1
--color-teal-ink:   #00706A
--color-teal-light: #E0F7F5

/* Ámbar — advertencias, estado "por vencer" */
--color-amber:       #E9A319
--color-amber-ink:   #8A5A00
--color-amber-light: #FEF3DC
```

---

### 4.3 Tokens semánticos (usar estos en los componentes)

```css
/* Superficies */
--bg:     #F4EFE3   /* Fondo de página — ivory cálido */
--surf:   #FFFFFF   /* Cards, paneles, modales */
--surf-2: #FBF9F5   /* Zebra en tablas, fondos alternativos, filtros */
--line:   #E3DED2   /* Bordes, separadores, dividers */

/* Texto */
--ink:      #141A20  /* Texto principal */
--mut:      #5D6B7A  /* Texto secundario, placeholders de labels */
--sub:      #8A96A1  /* Texto terciario, placeholders de inputs */
--disabled: #C7D0D6  /* Elementos deshabilitados */

/* Primario de marca */
--pri:       #2A2A8C  /* Índigo — botón primario, tabs activos, links */
--pri-deep:  #1A1A5E  /* Hover del primario */
--pri-light: #E3E3F0  /* Fondo de ítem activo en sidebar */

/* Acción (botones de acción, focus ring) */
--action:      #1E3AE0  /* Cobalto */
--action-deep: #1229A8

/* Acento */
--acc:       #00CFC1  /* Teal — decorativo, indicadores */
--acc-ink:   #00706A  /* Teal como texto o ícono */
--acc-light: #E0F7F5

/* Highlight / alerta */
--hot:       #E4006E  /* Magenta — alertas críticas */
--hot-ink:   #A3004F
--hot-light: #FFE0EF

/* Encabezados de tabla */
--graph: #26313A  /* Grafito */
```

---

### 4.4 Estados semánticos

Nexo Klar usa exactamente 4 estados para documentos, personas y habilitaciones.
**Siempre usar estos tokens** — nunca colores hardcodeados para estados.

```css
/* Vigente / OK — documentos al día, trabajador habilitado */
--ok:    #146B3E
--ok-bg: #E6F2EB

/* Por vencer — vence en menos de 30 días */
--warn:     #E9A319
--warn-ink: #8A5A00  /* Para texto sobre fondo claro */
--warn-bg:  #FEF3DC

/* No habilitado / Error — vencido, rechazado, bloqueado */
--err:    #9B2226
--err-bg: #FBE8E6

/* Sin información — campo vacío, dato no cargado */
--none:    #5D6B7A
--none-bg: #F2F4F5
```

**Terminología oficial de estados:**
- `--ok` → "Vigente"
- `--warn` → "Por vencer"
- `--err` → "No habilitado"
- `--none` → "Sin información"

---

### 4.5 Espaciado

Escala de 4px. Usar siempre estos tokens en `padding`, `margin`, `gap`.

```css
--space-1:   4px
--space-2:   8px
--space-3:  12px
--space-4:  16px
--space-5:  20px
--space-6:  24px
--space-8:  32px
--space-10: 40px
--space-12: 48px
--space-16: 64px
```

---

### 4.6 Radios de borde

```css
--radius-sm:    6px   /* Chips pequeños, tooltips */
--radius-md:    8px   /* Inputs, botones, cards pequeñas */
--radius-lg:   12px   /* Cards principales, paneles */
--radius-xl:   16px   /* Modales, drawers */
--radius-pill: 99px   /* Badges, tags, pills */
```

---

### 4.7 Sombras

```css
--shadow-sm:  0 2px 8px rgba(20,26,32,0.06)   /* Cards en reposo */
--shadow-md:  0 4px 16px rgba(20,26,32,0.10)  /* Cards hover, dropdowns */
--shadow-lg:  0 8px 32px rgba(20,26,32,0.14)  /* Paneles flotantes */
--shadow-xl:  0 16px 48px rgba(20,26,32,0.18) /* Modales */
```

---

### 4.8 Motion

```css
--transition-fast: 0.12s ease   /* Hover de íconos, toggles */
--transition-base: 0.18s ease   /* Botones, inputs, la mayoría */
--transition-slow: 0.28s ease   /* Acordeones, expansiones */
```

---

### 4.9 Layout global

```css
--sidebar-width:     224px
--header-height:      56px
--content-max-width: 1200px
--page-padding:      clamp(16px, 4vw, 24px)  /* Responsivo automático */
```

---

### 4.10 Accesibilidad

```css
--focus-ring: 0 0 0 3px rgba(30,58,224,0.22)  /* Cobalto 22% — foco visible */
```

Se aplica automáticamente a `:focus-visible`. No necesita configuración adicional.

---

### 4.11 Aliases de compatibilidad (--nk-*)

Existen solo para migrar código legacy. **No usar en código nuevo.**

```css
--nk-bg, --nk-surface, --nk-surface-2, --nk-line
--nk-text, --nk-muted, --nk-subtle
--nk-primary, --nk-primary-deep
--nk-accent, --nk-accent-ink
--nk-graphite
--nk-success, --nk-warning, --nk-error
```

---

## 5. Componentes compartidos — components.css

Todas las clases tienen prefijo `nk-`. Son independientes de framework —
funcionan con cualquier HTML o JSX.

### 5.1 Contenedores

```html
<div class="nk-container">  <!-- Ancho máximo 1200px, centrado, padding responsivo -->
<section class="nk-section"> <!-- Padding vertical 48px -->
```

---

### 5.2 Botones

**Regla:** Máximo 1 botón primario visible por pantalla.

```html
<!-- Primario — acción principal de la vista -->
<button class="nk-button nk-button-primary">Guardar</button>

<!-- Acción — acción secundaria importante (cobalto) -->
<button class="nk-button nk-button-action">Confirmar</button>

<!-- Secundario — acción alternativa -->
<button class="nk-button nk-button-secondary">Cancelar</button>

<!-- Quiet — acción terciaria discreta -->
<button class="nk-button nk-button-quiet">Ver detalle</button>

<!-- Danger — siempre con confirmación modal antes de ejecutar -->
<button class="nk-button nk-button-danger">Eliminar</button>

<!-- Deshabilitado — agregar atributo disabled, no solo clase -->
<button class="nk-button nk-button-primary" disabled>Guardando…</button>
```

**Botón ícono:**
```html
<button class="nk-icon-button" aria-label="Buscar">
  <IconSearch size={16} />
</button>
```

---

### 5.3 Cards

```html
<div class="nk-card">
  <div class="nk-card-header">
    <div>
      <h3 class="nk-card-title">Título</h3>
      <p class="nk-card-description">Descripción opcional</p>
    </div>
    <button class="nk-button nk-button-primary">Acción</button>
  </div>
  <!-- contenido de la card -->
</div>
```

---

### 5.4 Formularios

```html
<form class="nk-form">
  <div class="nk-field">
    <label class="nk-label" for="nombre">Nombre completo</label>
    <input class="nk-input" id="nombre" type="text" placeholder="Juan Pérez" />
  </div>

  <div class="nk-field">
    <label class="nk-label" for="estado">Estado</label>
    <select class="nk-select" id="estado">
      <option>Vigente</option>
    </select>
  </div>

  <!-- Grid de 2 columnas (1 columna en mobile) -->
  <div class="nk-form-grid">
    <div class="nk-field">...</div>
    <div class="nk-field">...</div>
  </div>

  <div class="nk-form-actions">
    <button class="nk-button nk-button-secondary">Cancelar</button>
    <button class="nk-button nk-button-primary">Guardar</button>
  </div>
</form>
```

---

### 5.5 Badges de estado

```html
<!-- Documentos vigentes, trabajador habilitado -->
<span class="nk-badge nk-badge-ok">Vigente</span>

<!-- Vence en menos de 30 días -->
<span class="nk-badge nk-badge-warn">Por vencer</span>

<!-- Vencido, rechazado, bloqueado -->
<span class="nk-badge nk-badge-error">No habilitado</span>

<!-- Sin datos cargados -->
<span class="nk-badge nk-badge-none">Sin información</span>
```

---

### 5.6 Tablas

```html
<div class="nk-table-wrapper">
  <table class="nk-table">
    <thead>
      <tr>
        <th>Trabajador</th>
        <th>Estado</th>
        <th>Acreditación</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Juan Pérez</td>
        <td><span class="nk-badge nk-badge-ok">Vigente</span></td>
        <td>85%</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Reglas de tabla:**
- Máximo 7 columnas sin opción de personalización
- Columna de acciones siempre a la derecha
- Altura mínima de fila: 40px (el padding `var(--space-3)` de `td` lo logra)

---

### 5.7 Búsqueda

```html
<div class="nk-search">
  <IconSearch size={16} />
  <input type="text" placeholder="Buscar por nombre o RUT…" />
</div>
```

---

### 5.8 Tabs

```html
<div class="nk-tabs">
  <button class="nk-tab active">Trabajador fijo</button>
  <button class="nk-tab">Por proyecto</button>
  <button class="nk-tab">Disponible</button>
  <button class="nk-tab">Restringidos</button>
</div>
```

**Regla:** Máximo 4 tabs por nivel de navegación.

---

### 5.9 Modal / Dialog

```html
<div class="nk-dialog-backdrop">
  <div class="nk-dialog">
    <div class="nk-dialog-header">
      <h2 class="nk-dialog-title">Confirmar acción</h2>
      <button class="nk-icon-button" aria-label="Cerrar">✕</button>
    </div>
    <div class="nk-dialog-body">
      ¿Estás seguro de que deseas eliminar este registro?
    </div>
    <div class="nk-dialog-footer">
      <button class="nk-button nk-button-secondary">Cancelar</button>
      <button class="nk-button nk-button-danger">Eliminar</button>
    </div>
  </div>
</div>
```

**Regla:** Nunca modales dentro de modales.

---

### 5.10 Estado vacío

```html
<div class="nk-empty">
  <IconUsers size={32} strokeWidth={1.3} />
  <p class="nk-empty-title">Sin trabajadores registrados</p>
  <p class="nk-empty-description">
    Agrega el primer trabajador para comenzar.
  </p>
  <button class="nk-button nk-button-primary">+ Nueva persona</button>
</div>
```

**Regla:** Todo estado vacío debe tener un CTA. Nunca dejar una lista vacía
sin explicación ni acción.

---

### 5.11 Divider y grupos de acción

```html
<hr class="nk-divider" />

<div class="nk-actions">
  <button class="nk-button nk-button-secondary">Exportar</button>
  <button class="nk-button nk-button-primary">+ Nueva persona</button>
</div>
```

---

## 6. Reglas de uso

### Cuándo usar clases `nk-*` vs estilos inline

| Situación | Enfoque correcto |
|---|---|
| Botón, badge, card, tabla, input | Clase `nk-*` de components.css |
| Color, tipografía, espaciado | `var(--token)` en style inline o CSS local |
| Layout de una página específica | Style inline o CSS local del componente |
| Nuevo componente compartido | Agregar clase `nk-*` en components.css |
| Color hardcodeado (`#2A2A8C`) | ❌ Nunca — usar `var(--pri)` |

### Íconos

- Usar **Tabler Icons** en variante `outline` exclusivamente.
- `strokeWidth={1.7}` para íconos de navegación y acciones.
- `strokeWidth={1.3}` para íconos decorativos (estados vacíos, ilustraciones).
- **Nunca usar emojis como íconos funcionales.**

```jsx
import { IconUsers, IconShield, IconClock } from '@tabler/icons-react'

<IconUsers size={16} strokeWidth={1.7} />   // Navegación
<IconUsers size={28} strokeWidth={1.3} />   // Estado vacío
```

---

## 7. Patrones de implementación en JSX

### Patrón básico de página (4 zonas)

```jsx
export default function MiPagina() {
  return (
    <div style={{ flex:1, display:'flex', flexDirection:'column',
                  background:'var(--bg)', overflow:'hidden' }}>

      {/* ZONA 1 — Encabezado */}
      <div style={{ background:'var(--surf)', borderBottom:'1px solid var(--line)',
                    padding:'14px 20px 0' }}>
        <div style={{ display:'flex', justifyContent:'space-between',
                      alignItems:'flex-start', marginBottom:10 }}>
          <div>
            <h1 style={{ fontFamily:'var(--font-brand)', fontWeight:'var(--weight-extrabold)',
                         fontSize:'var(--text-2xl)', color:'var(--ink)', margin:0 }}>
              Título de la página
            </h1>
            <p style={{ fontSize:'var(--text-sm)', color:'var(--mut)', margin:'3px 0 0' }}>
              Subtítulo descriptivo
            </p>
          </div>
          <div className="nk-actions">
            <button className="nk-button nk-button-secondary">Exportar</button>
            <button className="nk-button nk-button-primary">+ Nuevo</button>
          </div>
        </div>

        {/* ZONA 2 — Tabs (máx 4) */}
        <div className="nk-tabs">
          <button className="nk-tab active">Tab 1</button>
          <button className="nk-tab">Tab 2</button>
        </div>
      </div>

      {/* ZONA 3 — Filtros (siempre visibles, fondo surf-2) */}
      <div style={{ background:'var(--surf-2)', borderBottom:'1px solid var(--line)',
                    padding:'8px 20px', display:'flex', gap:'var(--space-2)',
                    flexWrap:'wrap' }}>
        <div className="nk-search" style={{ maxWidth:200 }}>
          <input placeholder="Buscar…" />
        </div>
        <select className="nk-select" style={{ width:'auto' }}>
          <option>Todos los estados</option>
        </select>
      </div>

      {/* ZONA 4 — Contenido principal */}
      <div style={{ flex:1, overflow:'auto', padding:'0 20px 20px' }}>
        <div className="nk-table-wrapper" style={{ marginTop:10 }}>
          <table className="nk-table">
            <thead>
              <tr>
                <th>Columna A</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Dato</td>
                <td><span className="nk-badge nk-badge-ok">Vigente</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
```

### Patrón de badge de estado desde variable

```jsx
function BadgeEstado({ estado }) {
  const map = {
    vigente:        { cls: 'nk-badge-ok',    label: 'Vigente' },
    por_vencer:     { cls: 'nk-badge-warn',  label: 'Por vencer' },
    no_habilitado:  { cls: 'nk-badge-error', label: 'No habilitado' },
    sin_informacion:{ cls: 'nk-badge-none',  label: 'Sin información' },
  }
  const s = map[estado] || map.sin_informacion
  return <span className={`nk-badge ${s.cls}`}>{s.label}</span>
}
```

### Patrón de logo en JSX

```jsx
// Sidebar — fondo blanco
<img src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" style={{ height:28 }} />

// Login panel izquierdo — fondo índigo
<img src="/brand/NK-blanco-horizontal.svg" alt="Nexo Klar" style={{ height:28 }} />

// Landing o portada — con claim
<img src="/brand/NK-color-horizontal-claim.svg" alt="Nexo Klar" style={{ height:40 }} />
```

---

## 8. Estados semánticos

### Regla de los 30 días

Nexo Klar usa esta lógica para calcular el estado de cualquier documento o habilitación:

```js
function calcularEstado(fechaVencimiento) {
  if (!fechaVencimiento) return 'sin_informacion'
  const dias = Math.floor((new Date(fechaVencimiento) - new Date()) / 86400000)
  if (dias < 0)   return 'no_habilitado'   // vencido → --err
  if (dias <= 30) return 'por_vencer'      // próximo a vencer → --warn
  return 'vigente'                          // al día → --ok
}
```

### Barra de acreditación

```jsx
function ProgBar({ pct }) {
  const color = pct >= 85 ? 'var(--ok)' : pct >= 60 ? 'var(--warn)' : 'var(--err)'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'var(--space-2)' }}>
      <div style={{ width:60, height:6, borderRadius:'var(--radius-sm)',
                    background:'var(--line)', overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color,
                      borderRadius:'var(--radius-sm)' }} />
      </div>
      <span style={{ fontSize:'var(--text-xs)', color, fontWeight:'var(--weight-bold)',
                     minWidth:32 }}>{pct}%</span>
    </div>
  )
}
```

---

## 9. Lo que nunca se debe hacer

```
❌ Colores hardcodeados en componentes
   color: '#2A2A8C'  →  usar var(--pri)

❌ Emojis como íconos funcionales
   🔴 estado error  →  usar nk-badge nk-badge-error + Tabler Icon

❌ Más de 1 botón primario por vista

❌ Modales dentro de modales

❌ Tablas con más de 7 columnas sin personalización

❌ Más de 4 tabs por nivel de navegación

❌ Filtros colapsados — siempre visibles en zona 3

❌ Estados vacíos sin CTA

❌ Acciones destructivas sin confirmación modal

❌ Usar tokens --nk-* en código nuevo
   --nk-primary  →  usar var(--pri)

❌ Definir colores en components.css
   Solo se permiten var(--token) en ese archivo

❌ Escalar logos por debajo de 24px de alto

❌ Aplicar filtros CSS sobre los logos SVG de marca

❌ Logo color sobre fondos oscuros
   Usar NK-blanco-horizontal.svg sobre --pri, --graph o fondos dark
```

---

*Nexo Klar Design System · tokens.css v3.0 · components.css v1.0 · Septiembre 2026*
*Para cambios en este documento, coordinar con el equipo de producto antes de modificar tokens o agregar componentes.*

---

## 10. Lineamiento UX — Densidad y estructura de pantallas

> **Para agentes IA:** Esta sección define las reglas de diseño de experiencia
> de usuario que rigen TODAS las pantallas de Nexo Klar. Antes de generar
> cualquier página nueva, revisar estas reglas y aplicarlas sin excepción.

---

### 10.1 Jerarquía de información

La navegación refleja la estructura real del negocio. Nunca romper esta cadena:

```
Empresa  →  Mandante / Minera  →  Contrato  →  Proyecto  →  Trabajador
```

**Regla:** Nunca más de 3 niveles de navegación simultáneos visibles en pantalla.

---

### 10.2 Las 4 zonas de pantalla

Toda pantalla de Nexo Klar sigue exactamente esta estructura vertical.
No se inventa una estructura nueva por pantalla.

```
┌─────────────────────────────────────────────┐
│  ZONA 1 · Encabezado                        │  fondo: --surf
│  Título + subtítulo + acciones              │  borde: 1px --line abajo
├─────────────────────────────────────────────┤
│  ZONA 2 · Tabs                              │  fondo: --surf
│  Navegación interna (máx 4 pestañas)        │  borde: 2px --pri en activa
├─────────────────────────────────────────────┤
│  ZONA 3 · Filtros                           │  fondo: --surf-2
│  Controles siempre visibles (máx 5)         │  borde: 1px --line abajo
├─────────────────────────────────────────────┤
│  ZONA 4 · Contenido principal               │  fondo: --bg
│  Tabla, lista o contenido de la pantalla    │  padding: 0 20px 20px
└─────────────────────────────────────────────┘
```

| Zona | Reglas clave |
|---|---|
| **Encabezado** | Título (`--font-brand`, `--text-2xl`, bold) + subtítulo (`--text-sm`, `--mut`). Máx 1 botón primario + 1 secundario. |
| **Tabs** | Máx 4 pestañas. Tab activa: `border-bottom: 2px solid var(--pri)` + color `--pri`. Tab inactiva: color `--mut`. |
| **Filtros** | Fondo `--surf-2`. Padding `12px 20px`. Siempre visibles — nunca colapsados. Máx 5 filtros. Botón "Limpiar" aparece solo cuando hay filtros activos. |
| **Tabla** | Encabezado `--graph` fondo blanco. Zebra blanco / `--surf-2`. Hover `#EEF0FF`. Altura mínima de fila: 40px. Máx 7 columnas. |

---

### 10.3 Densidad de pantalla

#### Dashboard

```
Máx 4 KPIs en la franja superior
Máx 2 widgets (gráficos o listas) en el área principal
```

Estructura de KPI:
```jsx
<div style={{ display:'flex', gap:'var(--space-3)', flexWrap:'wrap' }}>
  {/* Cada KPI: número grande + label + delta opcional */}
  <div className="nk-card" style={{ flex:1, minWidth:120 }}>
    <p style={{ fontSize:'var(--text-3xl)', fontWeight:'var(--weight-extrabold)',
                color:'var(--pri)', margin:0, fontFamily:'var(--font-brand)' }}>
      {valor}
    </p>
    <p style={{ fontSize:'var(--text-sm)', color:'var(--mut)', margin:'4px 0 0' }}>
      {label}
    </p>
  </div>
</div>
```

Delta de KPI usa colores semánticos:
- Positivo → `var(--ok)`
- Negativo → `var(--err)`
- Sin cambio → `var(--sub)`

#### Listas / Tablas

```
Máx 7 columnas sin opción de personalización
Columna de acciones siempre a la derecha, fija
Altura mínima de fila: 40px
```

#### Formularios

```
Máx 8 campos por paso o sección
Formularios complejos → máx 5 pasos
Guardar con datos mínimos, completar progresivamente
```

#### Ficha de trabajador

```
Máx 5 tabs:
  1. Datos personales
  2. Documentos
  3. Cursos y exámenes
  4. EPP y Tallas
  5. Historial
```

---

### 10.4 Sidebar — Estructura de navegación

**Ancho:** `var(--sidebar-width)` = 224px  
**Fondo:** `var(--surf)` con `border-right: 1px solid var(--line)`

Grupos colapsables. Por defecto abiertos: Centro de Control, Capital Humano,
Relación Comercial. El resto colapsado para reducir largo visual.

```
Centro de Control
  Panel General · Alertas · Gestión de trabajadores por proyecto · Centro Operativo

Capital Humano
  Personas · Turnos y asistencia · Protección personal / EPP · Formación y certificaciones
  Exámenes y aptitudes · Salud Ocupacional · Restringidos

Relación Comercial
  Clientes · Contratos y firmas · Órdenes de servicio

Contratistas
  Terceros y subcontratos · Contratos y convenios · Personal del contratista
  Habilitaciones y cumplimiento · Evaluación de desempeño

Gestión Operacional
  Comunicaciones y convocatorias · Vehículos, activos y equipos
  Alojamientos y estadías · Credenciales

Cumplimiento y Calidad
  Documentación de la Empresa · Habilitación del Cliente
  Incidentes y no conformidades · Auditoría

Gestión de Proyectos y Negocios
  Libro de obra · Prospectos y oportunidades

Activos, Equipos e Inventario
  (11 sub-módulos)

Gestión y Administración
  Reportes y analítica · Importar y exportar · Usuarios y permisos
  Bitácora de cambios · Privacidad y datos

[Configuración]  ← pie del sidebar
[Cerrar sesión]  ← pie del sidebar, hover rojo
[Avatar + nombre + rol]  ← pie del sidebar
```

**Estados de ítem sidebar:**
```css
/* Activo */
background: var(--pri-light);  /* #E3E3F0 */
color: var(--pri);
font-weight: var(--weight-semibold);

/* Hover */
background: var(--surf-2);
color: var(--ink);

/* Normal */
color: var(--mut);

/* Badge de alerta */
background: var(--err-bg);
color: var(--err);
border-radius: var(--radius-pill);
```

---

### 10.5 Paginación

Nexo Klar **no usa paginación clásica** (páginas 1/2/3) en las tablas de operación.
El modelo de datos JSONB carga el state completo en memoria del navegador.

**Estrategia de navegación en tablas:**

```
Tablas con < 200 filas    → Scroll virtual (mostrar todas, sin paginación)
Tablas con 200–500 filas  → Infinite scroll con chunks de 50 filas
Tablas con > 500 filas    → Filtros obligatorios + chunks de 50 filas
```

**Regla de filtros como sustituto de paginación:**
Antes de paginar, los filtros de Zona 3 deben reducir el dataset. El mensaje
de "X resultados" en el subtítulo del encabezado es el indicador de cuántos
registros se están mostrando.

```jsx
// Subtítulo dinámico en encabezado — patrón estándar
<p style={{ fontSize:'var(--text-sm)', color:'var(--mut)', margin:'3px 0 0' }}>
  {filtrados.length} {labelTab}
  {filtrosActivos > 0 && ` · ${filtrosActivos} filtro${filtrosActivos > 1 ? 's' : ''} activo${filtrosActivos > 1 ? 's' : ''}`}
</p>
```

**Ordenamiento de tablas:**
- Click en encabezado de columna activa ordenamiento asc/desc
- Ícono `IconChevronUp` / `IconChevronDown` en color `var(--acc)` indica columna activa
- Íconos en `opacity: 0.3` en columnas inactivas

```jsx
function SortIcon({ col, sortCol, sortAsc }) {
  if (sortCol !== col) return <IconChevronDown size={11} style={{ opacity:0.3 }} />
  return sortAsc
    ? <IconChevronUp   size={11} style={{ color:'var(--acc)' }} />
    : <IconChevronDown size={11} style={{ color:'var(--acc)' }} />
}
```

---

### 10.6 Formularios de múltiples pasos

Patrón estándar para formularios complejos (Nuevo trabajador, Nuevo contrato, etc.)

```
Paso 1 → Paso 2 → Paso 3 → Paso 4 → Paso 5 (Resumen)
```

**Reglas:**
- Máx 5 pasos. Más de 5 → revisar si el formulario puede simplificarse.
- Máx 8 campos por paso.
- El paso "Resumen" es siempre el último — muestra todos los datos antes de guardar.
- "Guardar con mínimos" está permitido — los campos opcionales se completan después desde la ficha.
- El botón "Guardar" aparece solo en el último paso con color `var(--ok)` (verde), no `var(--pri)`.
- Navegación: botón "Anterior" siempre visible. Botón "Siguiente" deshabilitado si faltan campos requeridos.

**Stepper visual:**
```
● ──── ● ──── ○ ──── ○ ──── ○
✓     activo   pendiente
```
- Paso completado: fondo `var(--ok)`, ícono `IconCheck`
- Paso activo: fondo `var(--pri)`
- Paso pendiente: fondo `var(--line)`, color `var(--sub)`
- Conector completado: fondo `var(--ok)`
- Conector pendiente: fondo `var(--line)`

---

### 10.7 Modales y confirmaciones

**Cuándo usar modal:**
- Confirmación de acción destructiva (eliminar, bloquear, retirar)
- Formulario simple de máx 3 campos
- Alerta crítica que requiere decisión inmediata

**Cuándo NO usar modal:**
- Formularios de más de 3 campos → usar página dedicada
- Información que cabe en la pantalla principal → mostrar inline
- Detalle de un registro → usar página de ficha dedicada (`/app/modulo/:id`)

**Estructura de confirmación destructiva:**
```jsx
<div className="nk-dialog-backdrop">
  <div className="nk-dialog">
    <div className="nk-dialog-header">
      <h2 className="nk-dialog-title">¿Eliminar este registro?</h2>
      <button className="nk-icon-button">✕</button>
    </div>
    <div className="nk-dialog-body">
      <p style={{ color:'var(--mut)' }}>
        Esta acción no se puede deshacer. El registro será eliminado permanentemente.
      </p>
    </div>
    <div className="nk-dialog-footer">
      <button className="nk-button nk-button-secondary">Cancelar</button>
      <button className="nk-button nk-button-danger">Sí, eliminar</button>
    </div>
  </div>
</div>
```

---

### 10.8 Feedback inmediato

Toda acción del usuario debe tener respuesta visual en menos de 200ms.

**Patrones de feedback:**

| Situación | Componente | Duración |
|---|---|---|
| Guardado exitoso | Banner verde (`--ok-bg`) con `IconCheck` | 2.5 segundos, luego desaparece |
| Error al guardar | Banner rojo (`--err-bg`) con `IconAlertTriangle` | Permanece hasta que el usuario lo cierra |
| Cargando / procesando | Spinner en el botón + `disabled` | Durante el request |
| Acción sin efecto (filtro vacío) | Texto en subtítulo "0 resultados" | Permanente mientras dure el filtro |

**Spinner estándar:**
```jsx
// Dentro del botón mientras carga
{saving
  ? <IconLoader2 size={15} className="animate-spin" />
  : <IconDeviceFloppy size={15} strokeWidth={2} />
}

// Spinner de página completa (carga inicial)
<div style={{ display:'flex', alignItems:'center', justifyContent:'center',
              height:'100%', background:'var(--bg)' }}>
  <div style={{
    width:28, height:28,
    border:`2.5px solid var(--pri)`,
    borderTopColor:'transparent',
    borderRadius:'50%',
    animation:'spin 0.7s linear infinite'
  }} />
  <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
</div>
```

---

### 10.9 Navegación y rutas

**Estructura de rutas estándar:**
```
/                          → LandingPage
/login                     → LoginPage
/app                       → Dashboard (ruta índice)
/app/[modulo]              → Página de lista del módulo
/app/[modulo]/nuevo        → Formulario de creación
/app/[modulo]/:id          → Ficha / detalle del registro
/app/configuracion         → Configuración del tenant
/cambiar-password          → Cambio de contraseña obligatorio
/configurar-mfa            → Configuración MFA
/404                       → NotFoundPage
```

**Breadcrumb estándar en páginas de ficha:**
```jsx
<button onClick={() => navigate('/app/trabajadores')}
  style={{ display:'flex', alignItems:'center', gap:6,
           border:'none', background:'none', cursor:'pointer',
           color:'var(--mut)', fontSize:'var(--text-base)',
           fontWeight:'var(--weight-semibold)', padding:0 }}>
  <IconArrowLeft size={15} strokeWidth={2} />
  Personas
</button>
<span style={{ color:'var(--line)' }}>/</span>
<span style={{ fontSize:'var(--text-base)', fontWeight:'var(--weight-bold)',
               color:'var(--ink)' }}>
  {nombre}
</span>
```

**Regla:** La ruta `nuevo` siempre antes de `/:id` en App.jsx para que
"nuevo" no se interprete como un ID.

```jsx
<Route path="trabajadores/nuevo" element={<NuevoTrabajadorPage />} />
<Route path="trabajadores/:id"   element={<FichaTrabajadorPage />} />
```

---

### 10.10 Responsividad

Nexo Klar es una aplicación de escritorio. Mobile es secundario.
El punto de quiebre principal es `768px`.

```css
/* En mobile */
@media (max-width: 768px) {
  /* Formularios: 1 columna en vez de 2 */
  .nk-form-grid { grid-template-columns: 1fr; }

  /* Acciones: columna, botones full width */
  .nk-form-actions {
    flex-direction: column-reverse;
    align-items: stretch;
  }
  .nk-form-actions .nk-button { width: 100%; }

  /* Card header: stack vertical */
  .nk-card-header { flex-direction: column; }
}
```

El sidebar colapsa a ícono-only en mobile. Esta funcionalidad es del componente
`Sidebar.jsx` — no necesita CSS adicional en las páginas.

---

### 10.11 Principios de diseño (resumen ejecutivo)

Aplicar en este orden de prioridad al tomar cualquier decisión de diseño:

```
1. Densidad controlada
   La información mínima necesaria en cada vista, sin saturar.

2. Jerarquía visual clara
   El usuario siempre sabe dónde está y qué puede hacer.

3. Consistencia antes que creatividad
   Reutilizar los patrones establecidos en este documento.

4. Feedback inmediato
   Cada acción tiene respuesta visual en < 200ms.

5. Estados semánticos consistentes
   Verde / Amarillo / Rojo / Gris con el mismo significado en toda la app.

6. Acciones destructivas siempre con confirmación
   Sin excepciones.

7. Estados vacíos con CTA
   Nunca una lista vacía sin explicación ni acción posible.
```

---

*Nexo Klar Design System · tokens.css v3.0 · components.css v1.0 · UX Guidelines v1.0 · Septiembre 2026*
*Para cambios estructurales en este documento, coordinar con el equipo de producto.*
