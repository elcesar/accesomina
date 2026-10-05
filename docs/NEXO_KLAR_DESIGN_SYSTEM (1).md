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


#### H1 y acción primaria (CTA)

El H1 y la acción primaria deben comunicar de forma inequívoca el contexto y la operación actual. Este criterio es transversal a todos los módulos.

**H1**
- En catálogos o listados, usar el nombre de la página definido en el Sidebar: `Clientes`, `Personas`, `Contratos y firmas`, etc.
- En altas, identificar explícitamente la creación: `Nuevo cliente`, `Nueva persona`, `Nuevo contrato`, `Nueva orden de servicio`.
- En edición o ficha, usar el nombre de la entidad cuando corresponda o el título funcional definido para esa ficha.
- En asistentes de varios pasos, el H1 permanece estable durante todo el flujo; el nombre del paso actual se presenta como H2. No reemplazar el H1 en cada paso.
- Debe existir un único H1 visible por página.

**Acción primaria (CTA)**
- Debe expresar la acción que ocurrirá y ser coherente con el H1 y el estado de la pantalla.
- En catálogos, la creación debe estar disponible de forma contextual dentro del módulo aunque exista además un acceso rápido global: `Nuevo cliente`, `Nueva persona`, `Nuevo contrato`, `Nueva orden`.
- En una alta, preferir una acción específica: `Guardar cliente`, `Guardar persona`, `Guardar contrato`.
- `Guardar cambios` se reserva para la edición de una entidad existente; no usarlo como CTA final de una alta cuando puede identificarse el objeto creado.
- Mantener como máximo una acción primaria visible por contexto principal. Acciones como `Actualizar`, cancelar, volver o descargar deben utilizar la jerarquía secundaria correspondiente.
- Los estados vacíos deben referirse a la misma CTA contextual disponible en la pantalla y no dirigir al usuario a un acceso global si existe una acción local.

**Coherencia obligatoria**

H1, CTA, estado de la pantalla y textos de apoyo deben describir el mismo contexto. Por ejemplo, una pantalla con H1 `Nuevo cliente` no debe terminar con `Guardar cambios`, ni un estado vacío debe indicar “usar el Header” si el módulo ya ofrece `Nuevo cliente`.

Este patrón debe resolverse con los componentes y clases compartidos del encabezado. No crear variantes locales para modificar la jerarquía semántica.


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


---

## 5. Validación y errores de formularios

La validación de formularios es un patrón transversal de Nexo Klar. Debe aplicarse de forma consistente en altas, ediciones, asistentes, diálogos y cualquier pantalla que permita modificar información.

### 5.1 Comportamiento obligatorio

Al intentar avanzar o guardar un formulario:

1. validar **todos los campos aplicables simultáneamente**; no detener la validación en el primer error;
2. mostrar cada mensaje de error **junto al campo que lo provoca**;
3. identificar visualmente cada control inválido mediante el patrón compartido de error;
4. marcar el control inválido con `aria-invalid="true"`;
5. asociar el control con su mensaje mediante `aria-describedby`;
6. mover el foco al **primer campo inválido** siguiendo el orden natural del formulario;
7. retirar el estado de error cuando el valor haya sido corregido y vuelva a ser válido;
8. permitir un mensaje general de resumen únicamente como complemento; nunca debe reemplazar los errores asociados a cada campo.

Los mensajes deben explicar qué dato es inválido y, cuando sea posible, cómo corregirlo. Evitar mensajes genéricos como «Datos inválidos», «Error de validación» o códigos técnicos visibles para el usuario.

### 5.2 Estados visuales

Los estilos de error son transversales y deben definirse en `components.css` utilizando los tokens existentes de estado, especialmente `--err` y sus fondos asociados.

No crear colores de error, bordes, tipografías ni espaciados específicos por página. El CSS local puede resolver únicamente composición o layout.

Estados mínimos del campo:

```text
Normal       → control sin error
Error        → control identificado visualmente + mensaje asociado
Deshabilitado → control no editable con tratamiento visual compartido
```

El atributo `aria-invalid` no reemplaza el tratamiento visual: comunica el estado a tecnologías de asistencia. Del mismo modo, el color no puede ser el único mecanismo para comunicar un error.

### 5.3 Estructura accesible de referencia

```jsx
<label className="nk-label" htmlFor="rut">RUT</label>
<input
  id="rut"
  className="nk-input"
  aria-invalid={Boolean(error)}
  aria-describedby={error ? 'rut-error' : undefined}
/>
{error && (
  <p id="rut-error" className="nk-field-error" role="alert">
    El RUT ingresado no es válido.
  </p>
)}
```

El identificador del mensaje debe ser único dentro de la página.

### 5.4 Componentes especializados

Los componentes reutilizables de entrada, por ejemplo `RutInput`, `PhoneInput`, `BirthDateInput` y futuros inputs especializados, deben respetar este mismo contrato de validación y accesibilidad.

La lógica de negocio no debe duplicarse de manera diferente entre pantallas. Cuando una regla sea reutilizable, debe centralizarse en el componente o utilidad correspondiente y mantenerse consistente con la validación del backend.

### 5.5 Errores provenientes del backend

Cuando el backend rechace una operación:

- mapear el código de error al campo correspondiente siempre que sea posible;
- presentar el mensaje junto al campo afectado;
- conservar un feedback general solo para errores que no puedan asociarse a un campo concreto;
- no mostrar al usuario códigos internos, trazas ni mensajes técnicos del servidor.

### 5.6 Responsabilidad por capa

```text
tokens.css       → colores, tipografía, espaciado y valores visuales compartidos
components.css   → apariencia reutilizable de campo inválido y mensaje de error
JSX / componente → aria-invalid, aria-describedby, mensajes y foco
validación       → determina qué campos son inválidos
backend          → garantiza las reglas de negocio y devuelve errores identificables
```

Por tanto, la validación de formularios **no se resuelve solo con CSS**. CSS define su representación visual; el comportamiento, la accesibilidad y la asociación entre errores y campos pertenecen a los componentes y a la lógica de la interfaz.


---

## 6. Protección de cambios sin guardar

La protección frente a pérdida accidental de información es un patrón transversal para formularios de alta, edición y asistentes.

- Si el usuario intenta **abandonar el flujo** y existen cambios sin guardar, solicitar confirmación antes de descartar la información.
- Navegar entre pasos, pestañas o secciones que forman parte del mismo flujo **no se considera abandono** y no debe solicitar confirmación.
- Si no existen cambios respecto del estado inicial, permitir la salida sin confirmación.
- Una vez guardada correctamente la información, la navegación posterior no debe presentar una advertencia por esos cambios ya persistidos.
- Ante cierre, recarga o navegación fuera de la aplicación, usar la protección estándar del navegador cuando existan cambios sin guardar.
- El mensaje dentro de la aplicación debe indicar claramente que salir descartará la información ingresada.

La implementación específica puede variar según el router o formulario, pero debe conservar este comportamiento funcional en todos los módulos.
