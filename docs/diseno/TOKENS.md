# Nexo Klar — Design Tokens

## Propósito

`nexo-v2/src/styles/tokens.css` es la **fuente única de verdad de los valores visuales compartidos** de Nexo Klar.

La regla de arquitectura es:

```text
tokens.css
  ↓
theme / base
  ↓
components.css
  ↓
layouts compartidos
  ↓
CSS específico de página
  ↓
JSX
```

Un nivel inferior puede **consumir** valores del nivel anterior, pero no debe volver a crear una segunda fuente de verdad para colores, espaciados, radios, sombras o tipografías.

## Qué debe vivir en tokens.css

Los tokens representan decisiones visuales reutilizables y no estilos de una pantalla particular. Deben centralizar:

- colores de marca y colores semánticos;
- superficies, bordes y texto;
- estados: éxito, advertencia, error y sin información;
- tipografías y escala tipográfica;
- espaciado;
- radios;
- sombras/elevación;
- motion/transiciones;
- medidas globales de layout cuando sean realmente transversales;
- valores de accesibilidad como focus;
- valores necesarios para temas claro/oscuro.

## Qué NO debe vivir en tokens.css

No deben incorporarse:

- estilos específicos de una página;
- layouts particulares del Landing;
- estructura visual de componentes complejos;
- reglas de tablas, botones o formularios completas;
- hacks o correcciones específicas de una pantalla;
- selectores que sólo existen para resolver un caso particular.

Esos elementos pertenecen a `components.css`, layouts compartidos o al CSS específico de la página.

## Convención de nombres

La evolución propuesta utiliza `--nk-*` como nomenclatura canónica del sistema de diseño.

Ejemplos:

```css
--nk-base
--nk-surface
--nk-line
--nk-ink
--nk-primary
--nk-action
--nk-space-4
--nk-radius-md
--nk-elev-2
--nk-family-ui
```

El `tokens.css` actual de Nexo Klar utiliza además nombres históricos como:

```css
--bg
--surf
--line
--ink
--pri
--space-4
--radius-md
--shadow-md
```

Durante la migración estos nombres deben mantenerse como **aliases de compatibilidad**, de forma que adoptar el nuevo sistema no obligue a modificar todas las páginas simultáneamente.

Ejemplo:

```css
--bg: var(--nk-base);
--surf: var(--nk-surface);
--line: var(--nk-line);
--ink: var(--nk-ink);
--pri: var(--nk-primary);
--space-4: var(--nk-space-4);
--radius-md: var(--nk-radius-md);
--shadow-md: var(--nk-elev-2);
```

Los aliases no deben contener un segundo valor visual: deben apuntar siempre al token canónico correspondiente.

## Regla para nuevos desarrollos

Los nuevos estilos deben utilizar los tokens canónicos `--nk-*`.

```css
.nk-example {
  padding: var(--nk-space-4);
  color: var(--nk-ink);
  background: var(--nk-surface);
  border: 1px solid var(--nk-line);
  border-radius: var(--nk-radius-md);
}
```

Evitar:

```css
.nk-example {
  padding: 16px;
  color: #141A20;
  background: #FFFFFF;
  border: 1px solid #E3DED2;
  border-radius: 8px;
}
```

La excepción son valores estrictamente locales que no representan una decisión reutilizable del sistema de diseño.

## Propagación de cambios

Una de las razones principales para centralizar los tokens es permitir cambios globales sin editar cada página.

Si componentes y páginas utilizan:

```css
color: var(--nk-primary);
```

un cambio de `--nk-primary` en `tokens.css` se propaga automáticamente a todos sus consumidores.

Por eso los CSS de componentes y páginas deben evitar duplicar valores que ya tengan representación semántica en `tokens.css`.

## Tema claro y oscuro

Los temas deben cambiar el **valor de los tokens semánticos**, no redefinir cada componente.

Conceptualmente:

```css
:root {
  --nk-base: ...;
  --nk-surface: ...;
  --nk-ink: ...;
}

:root[data-tema="oscuro"] {
  --nk-base: ...;
  --nk-surface: ...;
  --nk-ink: ...;
}
```

Un componente que utiliza `var(--nk-surface)` no necesita conocer si está en modo claro u oscuro.

## Relación con components.css

`tokens.css` define **valores**; `components.css` define **cómo se construyen los componentes**.

Ejemplo:

```text
Token:      --nk-primary
                 ↓
Componente: .nk-button-primary
                 ↓
Página:     utiliza nk-button-primary
```

Una página no debería redefinir el color, radio y tipografía de `.nk-button-primary` salvo que exista una variante explícita del componente.

## Regla de control de duplicidad

Antes de agregar un valor visual en otro CSS, validar:

1. ¿Ya existe un token con ese significado?
2. ¿El valor será utilizado por más de un componente o página?
3. ¿Representa una decisión del sistema de diseño o sólo un caso local?

Si representa una decisión global, debe resolverse mediante un token. Si representa estructura de un componente, debe ir en `components.css`. Si es exclusivo de una pantalla, debe ir en el CSS de esa página.

## Estrategia de migración

La migración se realizará de forma secuencial para minimizar riesgo:

1. Consolidar `tokens.css` y mantener aliases compatibles.
2. Validar `theme.css` / `theme.js`.
3. Consolidar `components.css` como autoridad única de componentes base.
4. Ordenar layouts compartidos.
5. Revisar CSS página por página, reemplazando hardcodes y duplicaciones por tokens/componentes.
6. Revisar JSX sólo cuando un cambio visual requiera estructura adicional, separándolo de cambios funcionales.

## Criterio de aceptación

La capa de tokens se considera consolidada cuando:

- existe una nomenclatura canónica clara;
- los aliases legacy no duplican valores;
- colores, spacing, radios, tipografía, elevación y estados compartidos tienen token;
- los temas modifican tokens y no componentes individualmente;
- no se introducen nuevos hardcodes globales fuera de esta capa sin justificación;
- modificar un token compartido no requiere editar manualmente todas las páginas consumidoras.
