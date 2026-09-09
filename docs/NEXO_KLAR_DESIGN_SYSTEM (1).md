# Nexo Klar — Design System Guide
**Version 3.2 · Septiembre 2026**

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

### 4.1 Encabezado de módulo

En escritorio:

```text
[Título]
[Descripción]                         [Actualizar] [Acción principal]
```

Reglas:

- título y descripción a la izquierda;
- acciones agrupadas mediante `.nk-actions` a la derecha;
- acciones en `display:flex` y `flex-direction:row`;
- separación mediante tokens de spacing;
- botones con `white-space: nowrap` cuando sea necesario;
- no apilar botones en escritorio por estilos locales accidentales;
- en pantallas pequeñas se permite `flex-wrap` o apilamiento controlado;
- la acción primaria debe ser la acción de negocio principal; `Actualizar` normalmente es secundaria.

### 4.2 KPIs

Los KPIs deben responder preguntas operacionales. Evitar gráficos o métricas sin capacidad de orientar una acción.

### 4.3 Feedback

Toda acción debe producir feedback perceptible:

| Situación | Patrón |
|---|---|
| Guardado exitoso | estado semántico OK |
| Error | estado semántico error |
| Request activo | loading + control disabled |
| Resultado vacío | explicación + CTA cuando exista una acción posible |
| Filtro sin coincidencias | estado vacío contextual |

No usar color como único indicador.

### 4.4 Filtros progresivos en listados

Los filtros deben ayudar a reducir el contenido sin competir visualmente con el listado, tabla o resultado principal.

Regla general en escritorio:

- mostrar **como máximo cuatro filtros principales visibles** de forma simultánea;
- priorizar los filtros de uso más frecuente o mayor valor operacional;
- cuando existan filtros adicionales, agruparlos bajo una acción **`Más filtros`**;
- `Más filtros` debe indicar cuando contiene criterios activos, idealmente mediante un contador;
- ofrecer una acción clara para limpiar filtros activos;
- los filtros secundarios pueden ser dependientes del contexto cuando exista una relación de dominio clara (por ejemplo Cliente → Contrato → Orden de servicio);
- evitar cards o paneles de filtros sobredimensionados que resten altura al contenido principal;
- en pantallas pequeñas se puede reducir aún más la cantidad de filtros visibles y trasladar controles adicionales a `Más filtros`.

Ejemplo recomendado:

```text
[ Buscar ] [ Especialidad ] [ Disponibilidad ] [ Cliente ] [ Más filtros (2) ]
```

La cantidad total de criterios disponibles no está limitada a cuatro: **el límite aplica a los filtros expuestos simultáneamente en la vista principal**.

---

## 5. Estados semánticos

Estados principales para personas, documentación, habilitaciones y recursos:

| Estado | Significado |
|---|---|
| Vigente | condición válida y al día |
| Por vencer | requiere atención próximamente |
| No habilitado | condición vencida, rechazada o bloqueante |
| Sin información | dato requerido aún no disponible |

Usar exclusivamente los tokens/clases semánticos del Design System. **Un módulo no debe inventar colores, variables o badges propios para representar estos mismos estados.**

Como convención visual, un documento puede mostrarse `Por vencer` dentro de los próximos 30 días. La regla de negocio final pertenece al dominio, no al CSS.

---

## 6. Principio people-first

La entidad principal de experiencia es la **Persona**.

La jerarquía rígida anterior:

```text
Empresa → Oportunidad → Contrato → Persona
```

no debe utilizarse como jerarquía obligatoria de UX.

Modelo conceptual:

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

Pregunta central:

> **¿Quién es esta persona, está habilitada para trabajar y qué necesita para hacerlo correctamente?**

Prioridad de interfaz:

1. identificación;
2. condición/habilitación;
3. documentación;
4. recursos asignados;
5. restricciones/alertas;
6. contexto laboral/contractual.

### Ficha de Persona

```text
Persona
├── Resumen
│   ├── identidad
│   ├── relación laboral
│   ├── proyecto actual
│   ├── habilitación
│   └── alertas críticas
├── Documentación
├── Formación y aptitudes
│   ├── cursos
│   ├── certificaciones
│   ├── exámenes
│   └── salud ocupacional
├── Recursos
│   ├── EPP y tallas
│   ├── herramientas/equipos
│   ├── vehículos
│   └── credenciales
└── Historial
    ├── asignaciones
    ├── proyectos/contratos
    └── movimientos/cambios
```

---

## 7. Módulos funcionales y módulos orquestadores

### 7.1 Módulos funcionales

Son responsables de administrar información propia de un dominio y constituyen las fuentes funcionales del producto.

Ejemplos actuales:

- Personas;
- Turnos y asistencia;
- Protección personal / EPP;
- Formación y certificaciones;
- Exámenes y aptitudes;
- Salud Ocupacional;
- Restringidos;
- futuros módulos de activos, contratos, órdenes, clientes, etc.

Un módulo funcional puede crear o modificar información cuando esa información pertenece a su dominio.

### 7.2 Módulos orquestadores

Integran información proveniente de módulos funcionales para ayudar a decidir o ejecutar un proceso transversal.

En Centro de Control:

- Panel General;
- Alertas;
- Gestión de trabajadores por proyecto;
- Centro Operativo.

Regla:

> **Un módulo orquestador debe consumir, relacionar y accionar sobre las fuentes funcionales existentes; no debe crear un modelo paralelo solo para construir su vista.**

Panel General y Alertas pueden derivar información desde Personas, Formación, Exámenes, Salud, Restricciones, EPP, Turnos y operación. Gestión por Proyecto y Centro Operativo deben evolucionar como capas de coordinación sobre módulos funcionales maduros.

### 7.3 Wrappers

Un wrapper de navegación/composición debe permanecer liviano. Puede seleccionar un módulo, aportar contexto o montar un workspace, pero no debe transformarse prematuramente en un segundo CRUD del mismo dominio.

Antes de especializar un wrapper:

1. identificar los módulos funcionales que debe consumir;
2. confirmar que esos módulos estén construidos y sus fuentes de datos sean estables;
3. reutilizar sus datos y acciones;
4. agregar solo lógica transversal propia de la orquestación.

---

## 8. Una sola fuente de verdad por dato

Toda información de negocio debe tener una fuente funcional primaria. Las vistas transversales pueden leerla y modificarla mediante el flujo oficial, pero no duplicarla en otra colección por conveniencia visual.

Fuentes actualmente consolidadas durante la modernización:

| Dominio | Fuente funcional actual |
|---|---|
| Persona | `trabajadores` |
| Formación / certificaciones de Persona | `trabajador.workerItems` (`curso`, `certificacion`) |
| Exámenes de Persona | `trabajador.workerItems` (`examen`) |
| Entregas de EPP | `eppDeliveries` |
| Salud Ocupacional | `protocolosSalud` |
| Restricciones | `restricted` |

Estas referencias describen la arquitectura vigente; si el modelo de dominio cambia formalmente, esta tabla debe actualizarse en el mismo cambio.

### Regla de compatibilidad

Los datos legacy pueden mantenerse en lectura durante una migración, pero los nuevos registros deben escribirse en la fuente funcional vigente. No perpetuar dos fuentes de verdad.

---

## 9. Navegación por dominios

### Centro de Control
- Panel General
- Alertas
- Gestión de trabajadores por proyecto
- Centro Operativo

### Capital Humano
- Personas
- Turnos y asistencia
- Protección personal / EPP
- Formación y certificaciones
- Exámenes y aptitudes
- Salud Ocupacional
- Restringidos

Los demás dominios del Sidebar mantienen su agrupación funcional: Gestión Operacional, Contratistas, Relación Comercial, Cumplimiento y Calidad, Gestión de Proyectos y Negocios, Activos/Inventario y Gestión/Administración.

La navegación no define propiedad de datos: una misma entidad puede aparecer contextualizada en varias vistas, pero conserva una fuente funcional primaria.

---

## 10. Densidad, formularios y responsividad

### Listados

Mostrar información suficiente para decidir, no toda la ficha. En Personas, priorizar identidad, contexto, habilitación, cumplimiento y acción.

### Formularios

- máximo recomendado: 8 campos por sección/paso;
- dividir formularios complejos;
- máximo recomendado: 5 pasos;
- permitir alta mínima cuando el negocio lo permita;
- completar información progresivamente desde la ficha.

### Responsividad

Nexo Klar se optimiza principalmente para escritorio. En pantallas pequeñas:

- formularios pasan a una columna;
- acciones pueden hacer wrap o apilarse;
- cards se reorganizan;
- tablas mantienen legibilidad mediante scroll horizontal;
- el comportamiento del Sidebar pertenece al componente de Sidebar, no a páginas individuales.

---

## 11. Lo que nunca se debe hacer

```text
❌ Colores corporativos hardcodeados en JSX o CSS específico.
❌ Crear tokens o sistemas visuales paralelos dentro de una página.
❌ Definir tipografía local cuando existe --font-ui / --font-brand.
❌ Usar JSX como hoja de estilos con grandes bloques style={{ ... }}.
❌ Implementar hover/focus mediante handlers JS cuando corresponde a CSS.
❌ Crear nuevos aliases --nk-*.
❌ Duplicar assets oficiales de public/brand.
❌ Usar emojis como iconos funcionales.
❌ Acciones destructivas sin confirmación.
❌ Estados vacíos sin explicación/acción cuando existe una acción posible.
❌ Tablas que intentan representar toda la ficha de Persona.
❌ Diseñar Persona como elemento terminal de una cadena comercial rígida.
❌ Crear una colección paralela solo porque una vista transversal necesita el dato.
❌ Convertir un wrapper/orquestador en otro CRUD antes de construir el módulo funcional.
❌ Inventar nuevos colores/tokens para estados que ya existen en el Design System.
❌ Apilar acciones principales en escritorio cuando existe espacio horizontal suficiente.
```

---

## 12. Implementaciones de referencia

### Estructura global
- `LoginPage.jsx` + `login.css`
- `Sidebar.jsx` + `sidebar.css`
- `Header.jsx` + `header.css`

### Capital Humano
Las implementaciones modernizadas de Personas, Turnos, Formación, Exámenes, Salud, Restringidos y Protección/EPP son referencias para el patrón operacional, especialmente en composición de encabezados, KPIs, filtros, tablas y diálogos.

### Centro de Control
Panel General y Alertas son referencias iniciales para vistas transversales. Gestión de trabajadores por proyecto y Centro Operativo deben permanecer como capas de orquestación hasta que los módulos funcionales que necesitan estén suficientemente consolidados.

---

# Principios ejecutivos

```text
1. Personas primero
   La experiencia operacional se organiza alrededor de personas, habilitación,
   documentación y recursos cuando el proceso involucra Capital Humano.

2. Una sola fuente de verdad
   Una vista puede reutilizar un dato; no debe clonarlo para resolver su UI.

3. Función antes que orquestación
   Construir y estabilizar módulos funcionales antes de enriquecer wrappers y hubs.

4. Estado operativo visible
   Bloqueos, vencimientos, faltantes y próximas acciones deben detectarse rápido.

5. Densidad controlada
   Mostrar lo necesario para decidir, no todo lo disponible.

6. Jerarquía visual clara
   Contexto, estado y acción principal deben ser evidentes.

7. Consistencia antes que creatividad
   Reutilizar tokens, componentes y patrones existentes.

8. CSS antes que styling en JSX
   JSX describe estructura/comportamiento; CSS describe presentación.

9. Feedback inmediato
   Toda acción debe entregar una respuesta perceptible.

10. Acciones destructivas confirmadas
    Sin excepciones.
```

---

*Nexo Klar Design System · Guide v3.2 · tokens.css v3.0 · Septiembre 2026*  
*Estrategia vigente: tokens.css → components.css → CSS específico → JSX.*  
*Modelo UX vigente: people-first, módulos funcionales como fuentes de verdad y Centro de Control como capa de orquestación.*
