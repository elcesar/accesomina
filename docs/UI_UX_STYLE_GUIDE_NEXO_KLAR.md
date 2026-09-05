# Nexo Klar | Guía de estilo UI/UX

**Versión:** 1.0  
**Marca:** Nexo Klar, una solución Domian  
**Ámbito:** sitio público, aplicación privada, paneles, formularios, reportes y módulos futuros.

Esta guía define cómo debe verse, sentirse y comunicarse Nexo Klar. Su propósito es que una persona pueda recorrer cualquier módulo con la misma lógica visual, aunque haya sido desarrollado en momentos o por equipos distintos.

## 1. Principios de experiencia

1. **Claridad antes que densidad.** Mostrar primero lo indispensable para decidir o actuar; el detalle aparece al abrir una ficha.
2. **La relación guía la navegación.** Toda vista debe conservar el contexto: `Cliente → Contrato → Orden de servicio → Personas / Recursos / Documentos`.
3. **El estado se entiende de un vistazo.** Usar texto y color, nunca color sin etiqueta: `Listo`, `Pendiente`, `Bloqueado`, `Vencido`.
4. **Una acción principal por vista.** Cada pantalla debe tener un botón primario inequívoco, por ejemplo: `+ Nuevo cliente` o `Guardar cambios`.
5. **Historial sin ruido.** Los cambios relevantes registran responsable, fecha, motivo y evidencia; la información histórica se visualiza en fichas o bitácoras, no en cada tabla.
6. **Respeto por la atención.** No usar modales de bienvenida automáticos, animaciones decorativas ni mensajes que bloqueen el trabajo.

---

## 2. Tipografía

### Familia

Usar la pila nativa actual para obtener máxima nitidez y velocidad en todos los equipos:

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
}
body { font-family: var(--font-sans); }
```

`Georgia, serif` se reserva únicamente para la vista impresa de contratos. No usar más de una familia tipográfica en la interfaz operativa.

### Escala tipográfica

| Uso | Tamaño / interlineado | Peso | Aplicación |
|---|---:|---:|---|
| H1 de página | 28 px / 36 px | 800 | Título de una pantalla principal. Máximo una vez por vista. |
| H2 de bloque | 20 px / 28 px | 750–800 | Secciones, fichas y paneles. |
| H3 / tarjeta | 16 px / 24 px | 700 | Título de tarjeta, modal o columna relevante. |
| Texto base | 14 px / 22 px | 400 | Descripciones, tablas, formularios y ayuda. |
| Texto secundario | 13 px / 20 px | 400–500 | Contexto, fechas, subtítulos y metadatos. |
| Label | 12 px / 16 px | 650–700 | Etiquetas de formulario, chips y encabezados de tabla. |
| Microtexto | 11 px / 16 px | 500 | Estados auxiliares y notas; nunca para contenido crítico. |

### Reglas de composición

- Usar **semibold (600–700)** para acciones, labels, valores importantes y títulos de tarjeta.
- Usar **bold (800)** sólo para jerarquía principal o una cifra de KPI; no para párrafos completos.
- Usar **regular (400)** para texto explicativo. Evitar pesos livianos: reducen legibilidad operativa.
- `letter-spacing: 0` en textos normales. En eyebrow o categorías en mayúsculas: `0.12em` a `0.14em`.
- Alinear a la izquierda todo texto de lectura. Centrar únicamente un estado vacío, confirmación breve o pantalla de acceso.
- Los números de tablas, montos y fechas se alinean a la derecha; los nombres y descripciones, a la izquierda.

---

## 3. Espaciado y grilla

### Sistema base

Toda dimensión debe ser múltiplo de **4 px**. La escala recomendada evita medidas arbitrarias:

```css
:root {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-8: 32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
}
```

### Contenedores y superficies

| Elemento | Desktop | Mobile |
|---|---:|---:|
| Área de contenido | 32 px lateral, 28 px vertical | 16 px lateral, 20 px vertical |
| Tarjeta / panel | 20–24 px | 16 px |
| Modal | 24 px | 16 px |
| Grupo de formulario | 16 px entre campos | 12 px entre campos |
| Bloques dentro de tarjeta | 12–16 px | 12 px |
| Secciones de página | 32–48 px | 24–32 px |

Las tarjetas usan radio de **8 px**. Botones, campos y chips usan 6–8 px según tamaño. No usar tarjetas dentro de tarjetas; dentro de una tarjeta se prefieren divisores o subbloques sin sombra.

### Grilla responsiva

```css
.page-shell { max-width: 1600px; margin: 0 auto; padding: 28px 32px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }

@media (max-width: 1023px) {
  .page-shell { padding: 24px; }
  .grid-3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 767px) {
  .page-shell { padding: 20px 16px; }
  .grid-3, .grid-2 { grid-template-columns: 1fr; gap: 12px; }
}
```

- **Desktop:** desde 1024 px, 12 columnas y barra lateral fija.
- **Tablet:** 768–1023 px, 8 columnas; la barra lateral pasa a navegación contraíble.
- **Móvil:** hasta 767 px, 4 columnas; tablas grandes usan vista de detalle o desplazamiento horizontal controlado.
- Una pantalla no debe requerir desplazamiento horizontal salvo una tabla explícitamente envuelta en `.table-wrap`.

---

## 4. Color y accesibilidad

### Tokens oficiales de marca

La paleta activa es **V4 Magenta e Índigo**, sobre fondo blanco. Los nombres semánticos permiten cambiar la marca sin reescribir componentes.

```css
:root {
  --color-bg: #F9F7FB;
  --color-surface: #FFFFFF;
  --color-surface-subtle: #F1EEF5;
  --color-brand: #E4006E;          /* Magenta Nexo Klar */
  --color-brand-hover: #A3004F;
  --color-brand-soft: #F7D3E4;
  --color-secondary: #2A2A8C;      /* Índigo Nexo Klar */
  --color-secondary-soft: #7775C8;
  --color-text: #14121F;
  --color-text-muted: #5F5B70;
  --color-text-subtle: #7A7688;
  --color-border: #DED9E5;
  --color-border-strong: #CFC8DA;

  --color-success: #16803C;
  --color-warning: #B85A00;
  --color-danger: #C92828;
  --color-info: #2A2A8C;
}

[data-theme="dark"] {
  --color-bg: #14121F;
  --color-surface: #1D1A2B;
  --color-surface-subtle: #29253A;
  --color-brand: #FF3D90;
  --color-brand-hover: #E4006E;
  --color-brand-soft: #6B2148;
  --color-secondary: #9C9AE8;
  --color-secondary-soft: #BBB9F4;
  --color-text: #FFFFFF;
  --color-text-muted: #C8C3D2;
  --color-text-subtle: #9993A8;
  --color-border: #3D384D;
  --color-border-strong: #534C65;
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-danger: #F87171;
  --color-info: #BBB9F4;
}
```

### Uso correcto

- **Magenta:** acción principal, elemento activo, conteo prioritario y foco. No usarlo como color base de párrafos.
- **Índigo:** navegación activa, información estructural, acciones secundarias y gráficos comparativos.
- **Éxito / advertencia / error:** sólo para estados operacionales; siempre acompañados por un ícono y texto.
- **Fondo:** blanco para superficies; `--color-bg` para el área de trabajo. Las sombras deben ser sutiles, no decorativas.
- **Bordes:** `--color-border` por defecto; `--color-border-strong` sólo para separar grupos relevantes.

### Accesibilidad

- Cumplir **WCAG AA**: contraste mínimo 4.5:1 para texto normal y 3:1 para texto grande e iconos informativos.
- No comunicar un estado sólo con color. Ejemplo correcto: `● Bloqueado` con etiqueta; no sólo un punto rojo.
- Todos los elementos interactivos deben tener foco visible de al menos 2 px y contraste alto.
- Usar texto mínimo de 14 px para contenido relevante y objetivos táctiles de al menos 40 x 40 px.

---

## 5. Componentes UI

### Botones

| Variante | Uso | Fondo / texto |
|---|---|---|
| Primario | Acción principal de la vista | Magenta / blanco |
| Secundario | Acción relevante no principal | Blanco / índigo, borde índigo |
| Neutro | Navegación o acción auxiliar | Transparente / texto principal, borde estándar |
| Peligro | Eliminar, revocar, bloquear | Rojo / blanco; requiere confirmación |
| Ícono | Acción conocida y repetitiva | Sólo icono Lucide con tooltip |

```css
.btn { min-height: 40px; padding: 0 14px; border-radius: 8px; font: 700 14px/1 var(--font-sans); }
.btn-primary { background: var(--color-brand); color: #fff; }
.btn-primary:hover { background: var(--color-brand-hover); }
.btn-primary:active { transform: translateY(1px); }
.btn:focus-visible { outline: 3px solid color-mix(in srgb, var(--color-secondary) 35%, transparent); outline-offset: 2px; }
.btn:disabled { opacity: .48; cursor: not-allowed; box-shadow: none; }
```

- El texto inicia con verbo: `Guardar cambios`, `Asignar persona`, `Crear orden`.
- No usar `Aceptar`, `Enviar` o `Continuar` cuando sea posible ser específico.
- Una fila puede tener `Abrir`, `Editar` y menú de más acciones; no más de dos botones visibles.

### Inputs y formularios

```css
.form-label { display:block; margin-bottom: 6px; font-size:12px; line-height:16px; font-weight:700; color:var(--color-text); }
.form-input, .form-select, .form-textarea {
  width:100%; min-height:42px; padding:10px 12px; border:1px solid var(--color-border);
  border-radius:8px; background:var(--color-surface); color:var(--color-text); font:400 14px/20px var(--font-sans);
}
.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color:var(--color-brand); outline:3px solid color-mix(in srgb, var(--color-brand) 18%, transparent);
}
.field-error .form-input { border-color:var(--color-danger); }
.field-help { margin-top:4px; font-size:12px; color:var(--color-text-muted); }
.field-error-text { margin-top:4px; font-size:12px; color:var(--color-danger); }
```

- Labels siempre visibles; no reemplazarlos por placeholder.
- Marcar los campos obligatorios con `Obligatorio`, no sólo con asterisco.
- Validar al abandonar el campo y al guardar. Explicar cómo corregir: `Ingresa un RUT válido, por ejemplo 12.345.678-9.`
- Formularios largos se dividen por secciones con títulos claros y guardado al final; no usar modales para procesos extensos.

### Tarjetas, tablas y modales

- **Tarjeta:** una unidad de información o acción. Encabezado, contenido y acciones en el pie cuando aplica.
- **Tabla:** para comparar múltiples registros. Cabecera fija si supera una pantalla; primera columna prioritaria; acciones al extremo derecho.
- **Estado vacío:** indicar qué falta y ofrecer la acción que lo resuelve. Ejemplo: `Aún no hay órdenes de servicio. Crea la primera orden para asignar personas y recursos.`
- **Modal:** para decisiones puntuales, fichas breves o carga acotada. Ancho máximo 720 px estándar, 1120 px para ficha amplia; alto máximo 90vh; cuerpo desplazable; botón de cerrar visible.
- Acciones destructivas exigen confirmación contextual: `Eliminar contrato “Servicio Norte 2026”`. Nunca confirmar con un `confirm()` del navegador.

### Iconografía

- Usar **Lucide Icons** o el set existente, nunca emojis como control funcional.
- Trazo `2 px`, tamaño estándar `18 px`; `16 px` dentro de tabla; `20 px` en navegación; `24 px` sólo en estados vacíos o encabezados.
- Los botones sólo de ícono requieren tooltip y `aria-label`.
- El ícono refuerza el texto; no reemplaza textos que pueden ser ambiguos.

---

## 6. Tono y voz (microcopy)

### Personalidad

**Clara, práctica y profesional.** Nexo Klar habla como un equipo operativo confiable: directo, humano y preciso. La marca Domian aporta sobriedad; evita lenguaje grandilocuente, técnico sin necesidad o excesivamente informal.

### Reglas de redacción

- Usar español de Chile neutral, frases cortas y voz activa.
- Nombrar la consecuencia y la siguiente acción: `Este documento vence en 15 días. Carga su renovación para mantener a la persona habilitada.`
- Preferir sustantivos claros: `Orden de servicio`, `Persona`, `Cliente`, `Documento`, `Alojamiento`.
- Evitar anglicismos visibles: usar `Guardar borrador`, `Panel`, `Estado`, `Historial`, no `save`, `dashboard`, `status`, `log`.
- Escribir botones en infinitivo o verbo imperativo consistente: `Guardar cambios`, `Renovar documento`, `Ver ficha`.

### Ejemplos

| Situación | Redacción recomendada |
|---|---|
| Confirmación | `Cambios guardados. El historial de esta ficha fue actualizado.` |
| Error de validación | `No fue posible guardar porque falta la fecha de vencimiento.` |
| Alerta | `La credencial de Ana García vence el 12 de agosto.` |
| Estado vacío | `No hay personas asignadas. Agrega una persona disponible para continuar.` |
| Acción sensible | `Vas a bloquear a esta persona para nuevas asignaciones. Podrás revertirlo desde su ficha.` |
| Ayuda | `Usa esta vista para confirmar que la orden cuenta con personas, recursos y documentación vigentes.` |

---

## 7. Consistencia y gobernanza

### Reglas obligatorias para nuevas vistas

1. Construir siempre con tokens (`--color-*`, `--space-*`, `--font-*`); prohibidos los colores hexadecimales y medidas aisladas dentro de componentes nuevos.
2. Reutilizar clases o componentes existentes antes de crear variantes: botones, fichas, badges, filtros, tablas, modales y alertas.
3. Mantener el mismo patrón de página: título + contexto + acción principal + filtros + contenido + estado vacío.
4. Mantener la relación de datos visible cuando corresponda: Cliente, Contrato y Orden de servicio.
5. No introducir `alert`, `prompt` ni `confirm` del navegador. Usar modal propio, validación visual y mensaje posterior.
6. Toda nueva pantalla debe funcionar en 360 px, 768 px, 1024 px y 1440 px sin superposición ni texto cortado.
7. Copiar los cambios equivalentes entre `AccesoMina_v6.html` y `public/index.html` hasta completar la modularización del frontend.
8. Toda modificación de datos debe quedar auditada con usuario, fecha, cambio y motivo cuando corresponda.

### Flujo de aprobación de diseño

1. Definir objetivo, usuario y acción principal de la vista.
2. Diseñar con componentes existentes y tokens de esta guía.
3. Validar estados: carga, vacío, éxito, error, permiso restringido y datos extensos.
4. Revisar accesibilidad, móvil y textos antes de integrar.
5. Probar el flujo completo con datos conectados y registrar el cambio en la bitácora técnica.

### Checklist antes de publicar

- [ ] El título y la acción principal explican qué se puede hacer en la vista.
- [ ] Se usan únicamente tokens oficiales de color, espaciado y tipografía.
- [ ] Los botones tienen estados hover, foco, activo y deshabilitado cuando aplica.
- [ ] Los formularios muestran label, ayuda y error comprensible.
- [ ] Los estados no dependen solamente del color.
- [ ] La vista es legible en móvil, tablet y escritorio.
- [ ] No hay texto cortado, solapado ni desplazamiento horizontal accidental.
- [ ] Tablas, filtros y estados vacíos ofrecen una acción útil.
- [ ] Los modales no exceden la pantalla y pueden cerrarse con claridad.
- [ ] Se mantuvo la terminología oficial de Nexo Klar.
- [ ] El cambio se probó con permisos y datos de más de una empresa.
- [ ] La versión local y la versión pública quedaron sincronizadas.

---

## 8. Referencia rápida de implementación

```css
/* Página privada estándar */
.app-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: var(--space-7, 28px) var(--space-8, 32px);
}
.page-header {
  display:flex;
  gap:var(--space-4);
  align-items:flex-start;
  justify-content:space-between;
  margin-bottom:var(--space-6);
}
.card {
  border:1px solid var(--color-border);
  border-radius:8px;
  background:var(--color-surface);
  padding:var(--space-6);
}
.status-ready { color:var(--color-success); }
.status-warning { color:var(--color-warning); }
.status-blocked { color:var(--color-danger); }
```

**Criterio final:** una persona que aprendió a crear, editar, filtrar y comprender estados en un módulo debe poder hacerlo de inmediato en todos los demás. Esa continuidad es parte central de la promesa de Nexo Klar: datos claros, operación conectada y control que permanece en la empresa.
