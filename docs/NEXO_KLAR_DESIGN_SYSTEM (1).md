# Nexo Klar — Design System Guide
**Version 3.1 · Septiembre 2026**

> **Para desarrolladores humanos y agentes IA (Claude, Codex, Copilot):**
> Este documento es la referencia de diseño y UX de Nexo Klar.
> Antes de crear una clase CSS, modificar una interfaz o introducir un patrón visual,
> revisar este documento, `tokens.css` y `components.css`.
>
> La regla base es simple: **los valores visuales compartidos pertenecen a tokens,
> los componentes reutilizables pertenecen a components.css, los layouts específicos
> pertenecen a un CSS específico y el JSX describe estructura y comportamiento.**

---

## Índice

1. [Arquitectura del sistema](#1-arquitectura-del-sistema)
2. [Estrategia CSS](#2-estrategia-css)
3. [Recursos gráficos](#3-recursos-gráficos)
4. [Tokens de diseño](#4-tokens-de-diseño)
5. [Componentes compartidos](#5-componentes-compartidos)
6. [Reglas de implementación](#6-reglas-de-implementación)
7. [Patrón de páginas y layouts](#7-patrón-de-páginas-y-layouts)
8. [Estados semánticos](#8-estados-semánticos)
9. [Principios de producto y UX](#9-principios-de-producto-y-ux)
10. [Navegación y densidad](#10-navegación-y-densidad)
11. [Lo que nunca se debe hacer](#11-lo-que-nunca-se-debe-hacer)
12. [Implementaciones de referencia](#12-implementaciones-de-referencia)

---

# 1. Arquitectura del sistema

```text
nexo-v2/
└── src/
    ├── styles/
    │   ├── tokens.css       ← fuente única de valores visuales globales
    │   ├── components.css   ← componentes visuales compartidos nk-*
    │   ├── login.css        ← layout/estilos específicos de Login
    │   ├── sidebar.css      ← layout/estilos específicos de Sidebar
    │   ├── header.css       ← layout/estilos específicos de Header
    │   └── [modulo].css     ← CSS específico de páginas o módulos cuando corresponda
    ├── pages/
    └── components/

public/
└── brand/                   ← SVG oficiales de Nexo Klar
```

## Jerarquía oficial

```text
tokens.css
    ↓
components.css
    ↓
CSS específico de layout / página / módulo
    ↓
JSX
```

Esta jerarquía reemplaza el enfoque anterior basado en estilos inline.

### Regla

**El JSX no debe actuar como hoja de estilos.**

Los estilos inline deben evitarse. Solo se aceptan excepcionalmente para valores
realmente dinámicos que dependan de datos en runtime y que no puedan expresarse
razonablemente mediante clases, variables CSS o atributos.

No usar estilos inline para:

- colores;
- tipografía;
- padding o margin estándar;
- borders;
- shadows;
- radios;
- estados hover/focus;
- layouts persistentes de una página;
- valores que ya existan como token.

---

# 2. Estrategia CSS

## 2.1 `src/styles/tokens.css` — Design Tokens v3.0

Es la **única fuente de verdad de valores visuales compartidos**.

Incluye:

- tipografía;
- colores de marca;
- colores semánticos;
- estados;
- espaciado;
- radios;
- sombras;
- motion;
- layout global;
- accesibilidad;
- aliases temporales de compatibilidad.

### Cuándo modificarlo

Solo cuando un valor tenga sentido transversal en toda la aplicación.

No agregar aquí:

- estilos específicos de una página;
- reglas particulares de Sidebar/Header/Login;
- hacks de compatibilidad;
- layouts específicos;
- estilos de un solo componente complejo.

---

## 2.2 `src/styles/components.css` — Shared Components

Contiene componentes visuales reutilizables con prefijo `nk-`.

Ejemplos:

```text
.nk-button
.nk-button-primary
.nk-button-secondary
.nk-icon-button
.nk-input
.nk-select
.nk-card
.nk-badge
.nk-table
.nk-tabs
.nk-dialog
.nk-actions
```

### Regla

`components.css` consume tokens. **No define un segundo sistema visual.**

No incorporar en este archivo:

- colores corporativos hardcodeados;
- nueva tipografía;
- tokens locales;
- estilos específicos de una página;
- layouts propios de Sidebar/Header/Login.

---

## 2.3 CSS específico

Cuando un componente o página tiene composición propia, debe utilizar un archivo CSS
específico que consuma los tokens existentes.

Patrón:

```text
src/components/layout/Sidebar.jsx
src/styles/sidebar.css

src/components/layout/Header.jsx
src/styles/header.css

src/pages/LoginPage.jsx
src/styles/login.css
```

Para una página operacional:

```text
src/pages/TrabajadoresPage.jsx
src/styles/trabajadores.css
```

El archivo específico puede definir:

- grid;
- flex;
- posiciones;
- composición de secciones;
- anchuras propias de esa pantalla;
- variantes de layout que no sean reutilizables globalmente.

Debe consumir tokens mediante `var(--token)`.

---

# 3. Recursos gráficos

Todos los recursos oficiales viven en:

```text
public/brand/
```

Archivos oficiales actuales:

| Archivo | Uso recomendado |
|---|---|
| `NK-color-horizontal.svg` | logo principal sobre fondo claro |
| `NK-color-horizontal-claim.svg` | landing, portada y piezas con claim |
| `NK-blanco-horizontal.svg` | fondos oscuros |
| `NK-favico.svg` | favicon / representación reducida |

### Reglas

- usar siempre las variantes SVG oficiales;
- no duplicar assets dentro de componentes;
- no aplicar filtros CSS al logo;
- no modificar `fill` para alterar colores;
- no recrear el logo como texto;
- no usar logo color sobre fondos oscuros;
- no escalar la versión horizontal por debajo de 24 px de alto.

Ejemplo:

```jsx
<img src="/brand/NK-color-horizontal.svg" alt="Nexo Klar" />
```

La dimensión visual se controla en CSS, no mediante estilos inline en JSX.

---

# 4. Tokens de diseño

Los tokens reales están definidos en `src/styles/tokens.css`. Este documento resume
su uso semántico; **el archivo CSS es la referencia técnica final de nombres y valores.**

## 4.1 Tipografía

```css
--font-ui
--font-brand

--text-xs
--text-sm
--text-base
--text-md
--text-lg
--text-xl
--text-2xl
--text-3xl
--text-4xl

--weight-regular
--weight-medium
--weight-semibold
--weight-bold
--weight-extrabold

--leading-tight
--leading-snug
--leading-normal
--leading-relaxed
```

Uso:

- **Inter / `--font-ui`**: contenido de aplicación;
- **Manrope / `--font-brand`**: títulos y headings.

---

## 4.2 Tokens semánticos principales

### Superficies

```css
--bg
--surf
--surf-2
--line
```

### Texto

```css
--ink
--mut
--sub
--disabled
```

### Marca y acción

```css
--pri
--pri-deep
--pri-light

--action
--action-deep

--acc
--acc-ink
--acc-light

--hot
--hot-ink
--hot-light

--graph
```

### Layout

```css
--sidebar-width
--header-height
--content-max-width
--page-padding
```

### Motion y accesibilidad

```css
--transition-fast
--transition-base
--transition-slow
--focus-ring
```

### Compatibilidad

Los aliases `--nk-*` existen únicamente para migración de código antiguo.

**No crear nuevos `--nk-*` ni usarlos en código nuevo.**

---

# 5. Componentes compartidos

## Botones

```jsx
<button className="nk-button nk-button-primary">Guardar</button>
<button className="nk-button nk-button-action">Confirmar</button>
<button className="nk-button nk-button-secondary">Cancelar</button>
<button className="nk-button nk-button-quiet">Ver detalle</button>
<button className="nk-button nk-button-danger">Eliminar</button>
```

Máximo **1 acción primaria visible por contexto principal**.

## Botón de ícono

```jsx
<button className="nk-icon-button" aria-label="Ir a alertas">
  <IconBell size={18} />
</button>
```

## Cards

```jsx
<div className="nk-card">
  <div className="nk-card-header">
    <div>
      <h3 className="nk-card-title">Título</h3>
      <p className="nk-card-description">Descripción</p>
    </div>
  </div>
</div>
```

## Formularios

```jsx
<div className="nk-field">
  <label className="nk-label" htmlFor="nombre">Nombre completo</label>
  <input className="nk-input" id="nombre" />
</div>
```

## Badges

```jsx
<span className="nk-badge nk-badge-ok">Vigente</span>
<span className="nk-badge nk-badge-warn">Por vencer</span>
<span className="nk-badge nk-badge-error">No habilitado</span>
<span className="nk-badge nk-badge-none">Sin información</span>
```

## Tablas

```jsx
<div className="nk-table-wrapper">
  <table className="nk-table">
    <thead>...</thead>
    <tbody>...</tbody>
  </table>
</div>
```

Reglas:

- máximo 7 columnas sin personalización;
- acciones a la derecha;
- información primaria primero;
- estado documental visible sin necesidad de abrir la ficha.

## Tabs

```jsx
<div className="nk-tabs">
  <button className="nk-tab active">Resumen</button>
  <button className="nk-tab">Documentación</button>
</div>
```

Máximo recomendado: 4 tabs por nivel. En fichas complejas puede usarse un máximo de 5
cuando sea necesario para representar dominios principales.

---

# 6. Reglas de implementación

| Situación | Enfoque correcto |
|---|---|
| Color / tipografía / spacing compartido | token de `tokens.css` |
| Botón / input / badge / tabla / card | clase de `components.css` |
| Layout específico de página | CSS específico |
| Layout específico de componente estructural | CSS específico |
| Componente reutilizable en varias pantallas | `components.css` |
| Estado dinámico | clase semántica / atributo / variable CSS cuando corresponda |
| Color hardcodeado | ❌ no permitido |
| Styling persistente inline | ❌ evitar |

## Íconos

Usar **Tabler Icons**, variante outline.

```jsx
<IconUsers size={16} strokeWidth={1.7} />
```

Referencia:

- `strokeWidth={1.7}` para navegación y acciones;
- `strokeWidth={1.3}` para elementos decorativos.

No usar emojis como íconos funcionales.

---

# 7. Patrón de páginas y layouts

Una página operacional se compone normalmente de cuatro zonas:

```text
┌─────────────────────────────────────────────────┐
│ ZONA 1 · Identidad / contexto                   │
│ título + subtítulo + acción principal           │
├─────────────────────────────────────────────────┤
│ ZONA 2 · Navegación interna                     │
│ tabs cuando sean necesarias                     │
├─────────────────────────────────────────────────┤
│ ZONA 3 · Búsqueda y filtros                     │
│ controles visibles y relevantes                 │
├─────────────────────────────────────────────────┤
│ ZONA 4 · Contenido                              │
│ tabla / lista / ficha / panel operacional       │
└─────────────────────────────────────────────────┘
```

No todas las pantallas necesitan obligatoriamente tabs o filtros; se debe evitar crear
controles vacíos únicamente para cumplir una plantilla.

### Estructura JSX recomendada

```jsx
export default function MiPagina() {
  return (
    <main className="nk-page mi-pagina">
      <section className="mi-pagina-header">
        ...
      </section>

      <section className="mi-pagina-filters">
        ...
      </section>

      <section className="mi-pagina-content">
        ...
      </section>
    </main>
  )
}
```

```css
.mi-pagina {
  background: var(--bg);
}

.mi-pagina-header {
  background: var(--surf);
  border-bottom: 1px solid var(--line);
  padding: var(--space-4) var(--page-padding);
}
```

---

# 8. Estados semánticos

Nexo Klar usa cuatro estados principales para **personas, documentos y habilitaciones**.

| Estado | Significado |
|---|---|
| Vigente | condición válida y al día |
| Por vencer | requiere atención próximamente |
| No habilitado | condición vencida, rechazada o bloqueante |
| Sin información | dato requerido aún no disponible |

Tokens:

```css
--ok
--ok-bg
--warn
--warn-ink
--warn-bg
--err
--err-bg
--none
--none-bg
```

### Regla de 30 días

Como convención visual, un documento puede mostrarse como **Por vencer** cuando su
fecha de término se encuentra dentro de los próximos 30 días. La regla de negocio
final debe permanecer en la lógica del dominio y no codificarse exclusivamente en CSS.

### Principio fundamental

Los estados semánticos no son decoración. Deben permitir responder rápidamente:

- ¿esta persona puede operar hoy?;
- ¿qué documento bloquea su habilitación?;
- ¿qué vence pronto?;
- ¿qué información falta?;
- ¿qué recurso debe ser entregado, renovado o recuperado?.

---

# 9. Principios de producto y UX

## 9.1 Personas como entidad central

A partir de la versión 3.1, Nexo Klar adopta explícitamente un modelo **people-first**.

La entidad principal de experiencia es la **Persona**.

El modelo anterior:

```text
Empresa → Oportunidad → Contrato → Persona
```

no debe utilizarse como jerarquía obligatoria de UX.

El modelo conceptual principal pasa a ser:

```text
                    PERSONA
                       │
        ┌──────────────┼──────────────┐
        │              │              │
 Documentación    Habilitación     Recursos
        │              │              │
 Formación       Cliente/Proyecto    EPP
 Exámenes        Contrato            Equipos
 Salud           Empresa             Herramientas
 Credenciales                       Vehículos
                                    Asignaciones
```

Empresa, cliente, contrato, proyecto y oportunidad siguen siendo entidades relevantes,
pero actúan principalmente como **contexto operacional, comercial o contractual de las
personas y del trabajo que realizan**.

---

## 9.2 Pregunta central de diseño

Cada vista relacionada con Capital Humano debe ayudar a responder:

> **¿Quién es esta persona, está habilitada para trabajar y qué necesita para hacerlo correctamente?**

La interfaz debe priorizar:

1. identificación;
2. condición/habilitación;
3. documentación;
4. recursos asignados;
5. restricciones o alertas;
6. contexto laboral y contractual.

---

## 9.3 Modelo de ficha de Persona

La ficha debe evolucionar hacia esta estructura conceptual:

```text
Persona
│
├── Resumen
│   ├── identidad
│   ├── empresa / relación laboral
│   ├── proyecto actual
│   ├── estado de habilitación
│   └── alertas críticas
│
├── Documentación
│   ├── documentos personales
│   ├── documentos laborales
│   ├── documentos del mandante
│   ├── fechas de vencimiento
│   └── estado documental
│
├── Formación y aptitudes
│   ├── cursos
│   ├── certificaciones
│   ├── exámenes
│   └── salud ocupacional
│
├── Recursos
│   ├── EPP y tallas
│   ├── herramientas
│   ├── equipos
│   ├── vehículos
│   └── credenciales
│
└── Historial
    ├── asignaciones
    ├── proyectos
    ├── contratos
    ├── movimientos
    └── cambios relevantes
```

No es obligación mostrar todos estos dominios simultáneamente; la pantalla debe mantener
densidad controlada y priorizar el estado operativo actual.

---

## 9.4 Relaciones contextuales

La Persona puede relacionarse con:

```text
Persona
  ├─ Empresa empleadora
  ├─ Cliente / mandante
  ├─ Contrato
  ├─ Proyecto / servicio
  ├─ Turno
  ├─ Alojamiento
  ├─ Vehículo
  ├─ EPP / equipo / herramienta
  └─ documentación y habilitaciones
```

Estas relaciones deben poder consultarse desde la ficha sin obligar al usuario a
reconstruir manualmente la cadena comercial.

---

# 10. Navegación y densidad

## 10.1 Sidebar

El Sidebar actual se organiza por dominios funcionales.

### Centro de Control

- Panel General
- Alertas
- Gestión de trabajadores por proyecto
- Centro Operativo

### Capital Humano

- **Personas**
- Turnos y asistencia
- Protección personal / EPP
- Formación y certificaciones
- Exámenes y aptitudes
- Salud Ocupacional
- Restringidos

### Gestión Operacional

- Comunicaciones y convocatorias
- Vehículos, activos y equipos
- Alojamientos y estadías
- Credenciales

### Contratistas

- Terceros y subcontratos
- Contratos y convenios
- Personal del contratista
- Habilitaciones y cumplimiento
- Evaluación de desempeño

### Relación Comercial

- Clientes
- Contratos y firmas
- Órdenes de servicio

### Cumplimiento y Calidad

- Documentación de la Empresa
- Habilitación del Cliente
- Incidentes y no conformidades
- Auditoría

### Gestión de Proyectos y Negocios

- Libro de obra
- Prospectos y oportunidades

### Activos, Equipos e Inventario

Inventario, maquinaria, equipos, herramientas, EPP, materiales, insumos, bodegas,
movimientos, mantenimiento y asignaciones.

### Gestión y Administración

- Reportes y analítica
- Importar y exportar
- Usuarios y permisos
- Bitácora de cambios
- Privacidad y datos

### Comportamiento

Por defecto pueden mantenerse abiertos:

- Centro de Control;
- Capital Humano;
- Relación Comercial.

El Sidebar usa `var(--sidebar-width)` y estilos definidos en `sidebar.css`.

---

## 10.2 Header

El Header global tiene tres responsabilidades:

```text
[ contexto de página ]       [ búsqueda global ] [ alertas ]
```

Debe conservar:

- título;
- subtítulo cuando corresponda;
- búsqueda global;
- acceso a alertas.

Su composición visual se define en `header.css`.

---

## 10.3 Listados de personas

La tabla de Personas debe priorizar datos que permitan tomar una decisión operacional.

Orden conceptual recomendado:

```text
Persona | Identificación | Proyecto / contexto | Habilitación | Documentación | Alertas | Acciones
```

Evitar llenar la tabla con todos los atributos disponibles de la ficha.

Las columnas detalladas pertenecen a la ficha; la tabla responde principalmente:

- quién es;
- dónde está asignado;
- si está habilitado;
- si tiene problemas documentales;
- qué acción requiere atención.

---

## 10.4 Formularios

Reglas generales:

- máximo recomendado de 8 campos por sección/paso;
- formularios complejos divididos en pasos;
- máximo 5 pasos;
- permitir alta inicial con información mínima cuando la lógica de negocio lo permita;
- completar documentación y recursos progresivamente desde la ficha.

El último paso puede ser un resumen antes de confirmar.

---

## 10.5 Feedback

Toda acción debe producir feedback visual inmediato.

| Situación | Patrón |
|---|---|
| Guardado exitoso | feedback semántico OK |
| Error | feedback semántico error |
| Request activo | estado loading + control disabled |
| Resultado vacío | explicación + CTA cuando corresponda |
| Filtro sin coincidencias | contador / estado vacío contextual |

No usar color como único indicador de estado.

---

## 10.6 Responsividad

Nexo Klar está optimizado principalmente para escritorio.

En pantallas pequeñas:

- formularios pasan a una columna;
- acciones pueden apilarse;
- cards se reorganizan verticalmente;
- tablas deben conservar legibilidad mediante scroll horizontal cuando sea necesario;
- el comportamiento responsive del Sidebar pertenece a `Sidebar.jsx/sidebar.css`, no a las páginas.

---

# 11. Lo que nunca se debe hacer

```text
❌ Colores corporativos hardcodeados en JSX o CSS específico.
   Usar tokens semánticos.

❌ Crear un sistema de tokens paralelo dentro de una página.

❌ Definir tipografía local cuando ya existe --font-ui / --font-brand.

❌ Usar JSX como hoja de estilos mediante grandes bloques style={{ ... }}.

❌ Manipular estilos visuales desde onMouseEnter/onMouseLeave.
   Hover y focus pertenecen a CSS.

❌ Agregar estilos de Sidebar/Header/Login en components.css.

❌ Agregar estilos exclusivos de una página a components.css.

❌ Crear nuevos aliases --nk-*.

❌ Duplicar logos de public/brand.

❌ Emojis como íconos funcionales.

❌ Acciones destructivas sin confirmación.

❌ Estados vacíos sin explicación o acción cuando existe una acción posible.

❌ Tablas que intentan representar toda la ficha de una Persona.

❌ Diseñar Personas como elemento terminal de una cadena comercial rígida.
```

---

# 12. Implementaciones de referencia

Las siguientes implementaciones representan el patrón vigente de migración al Design System.

## Login

```text
src/pages/LoginPage.jsx
src/styles/login.css
```

Características:

- usa assets oficiales;
- usa componentes compartidos;
- layout específico en CSS;
- sin colores visuales inline.

## Sidebar

```text
src/components/layout/Sidebar.jsx
src/styles/sidebar.css
```

Características:

- navegación mediante clases `nk-*` específicas;
- estados active/hover en CSS;
- badges dinámicos conservados;
- usuario, configuración y logout conservados;
- valores visuales provenientes de tokens.

## Header

```text
src/components/layout/Header.jsx
src/styles/header.css
```

Características:

- conserva título/subtítulo;
- incorpora búsqueda global;
- acceso a alertas;
- dropdown de resultados;
- sin estilos visuales inline.

---

# Principios ejecutivos

Al tomar decisiones de diseño, aplicar este orden:

```text
1. Personas primero
   La experiencia operacional se organiza alrededor de las personas,
   su habilitación, documentación y recursos.

2. Estado operativo visible
   El usuario debe detectar rápidamente bloqueos, vencimientos y faltantes.

3. Densidad controlada
   Mostrar la información necesaria para decidir, no todo lo disponible.

4. Jerarquía visual clara
   Contexto, estado y acción principal deben ser evidentes.

5. Consistencia antes que creatividad
   Reutilizar tokens y patrones existentes.

6. CSS antes que styling en JSX
   JSX describe estructura y comportamiento; CSS describe presentación.

7. Feedback inmediato
   Toda acción debe entregar respuesta perceptible.

8. Acciones destructivas confirmadas
   Sin excepciones.
```

---

*Nexo Klar Design System · Guide v3.1 · tokens.css v3.0 · Septiembre 2026*  
*Estrategia vigente: tokens.css → components.css → CSS específico → JSX.*  
*Modelo UX vigente: Personas como entidad central; documentación, habilitaciones y recursos como dominios operacionales prioritarios.*
