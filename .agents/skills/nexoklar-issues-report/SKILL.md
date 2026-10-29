---
name: nexoklar-issues-report
description: Genera informes Markdown auditables de todos los issues de NEXO KLAR, agrupados por severidad, con estado GitHub, subestado de issues abiertos, autor, fechas verificadas, módulo, PR e issues asociados y enlaces.
---

# NEXO KLAR — Skill de reporte de issues

## Ejecución
Cuando el usuario pida un informe de issues, consultar GitHub del repositorio `elcesar/accesomina` mediante las herramientas conectadas; generar un archivo Markdown `reporte-issues-NEXOKLAR-AAAA-MM-DD.md` y entregarlo. Usar `references/plantilla-reporte.md`. No modificar issues ni PR al ejecutar un reporte, salvo instrucción expresa.

**Parámetros por defecto:** todos los issues abiertos y cerrados (sin convertir PR en filas de issue); corte en `America/Santiago`; idioma español; grupos por severidad P0, P1, P2, P3, sin clasificar. Informar cobertura parcial cuando corresponda.

## Recolección obligatoria
1. Recuperar **todo** el universo de issues con paginación, `is:issue`, abiertos y cerrados. Nunca inferir completitud de una página de 100.
2. Recoger ID, título, URL, `created_at`, `updated_at`, `closed_at`, **autor original del issue (`user.login`, URL real del perfil GitHub)**, estado nativo GitHub (`open`/`closed`), etiquetas, cuerpo y comentarios de QA relevantes. No confundir autor con asignado ni con quien comentó.
3. Resolver severidad primero por etiquetas `P0/P1/P2/P3` o `sev:critico/alto/medio/bajo` y luego por declaraciones explícitas en QA/cuerpo. `bloquea-lanzamiento` es clasificación independiente; no convierte automáticamente un issue en P0.
4. Separar **Estado GitHub** de **Subestado de trabajo**. El estado GitHub solo puede ser **Cerrado** o **Abierto**. Para los abiertos, establecer uno de los subestados de la siguiente sección a partir de etiquetas, cambios de estado, comentarios y evidencia fechada. Si no hay evidencia suficiente, usar **Sin subestado verificable**. **PR fusionado no equivale a QA aprobado, despliegue ni cierre**.
5. Recuperar PR vinculados de forma explícita (Closes/Fixes/Refs, cuerpo, comentarios o enlaces confirmados). Verificar para cada PR `merged`, `open`, `draft` o `closed not merged`; enlazarlo. Nunca deducir merge desde un texto histórico.
6. Recuperar issues asociados y comprobar su estado nativo y subestado cuando sea verificable. Clasificar el vínculo como dependencia explícita, defecto QA o mera referencia; no convertir referencias en bloqueos.
7. La **Fecha último estado** debe corresponder a la transición verificable más reciente del **estado o subestado** (evento, etiqueta con historial o comentario explícito y fechado), no simplemente a `updated_at`. Cuando no se conoce, mostrar **No verificable**. Para cerrados, `closed_at` acredita la transición a Cerrado.
8. Resumen de cada issue en 1–3 frases: falla/impacto, solución, último resultado QA y siguiente paso. Enlazar comentario fuente cuando aporte evidencia; no inventar pruebas ni fechas.

## Estados y orden obligatorio
Agrupar por severidad: **P0 · Crítica**, **P1 · Alta**, **P2 · Media**, **P3 · Baja**, **Sin severidad verificable**.

En cada grupo, ordenar primero por **Estado GitHub**, y dentro de los abiertos por **Subestado**:

1. **Cerrado** — Estado GitHub `closed`; subestado `—`.
2. **Abierto · QA aprobado, pendiente de cierre** — aprobación explícita y vigente de QA.
3. **Abierto · Listo para probar** — etiqueta `estado:pendiente-validacion-qa` o decisión explícita de enviar a pruebas, como #212.
4. **Abierto · En pruebas / QA fallido** — prueba en curso o último resultado fallido sin corrección posterior lista para probar.
5. **Abierto · En revisión / PR abierto** — evidencia de revisión o PR correctivo abierto, sin subestado QA posterior.
6. **Abierto · En desarrollo** — trabajo activo respaldado.
7. **Abierto · Pendiente / por hacer** — tarea aún no iniciada según evidencia.
8. **Abierto · Sin subestado verificable** — no suponer avance basándose solo en una referencia a un PR.

Dentro del mismo subestado ordenar por fecha **verificada** de última transición (más reciente primero) y después por número de issue ascendente. Si la fecha falta, situarla después de las que sí tengan fecha.

El atributo **Bloqueante / No bloqueante** se muestra adicionalmente, nunca reemplaza el estado ni subestado: p. ej. `Abierto · Listo para probar · Bloqueante`. Si existe contradicción entre comentarios y etiquetas, consignarla y explicar la fuente usada.

## Tabla obligatoria por severidad
`Issue | Autor | Creación | Estado GitHub | Subestado | Módulo | Fecha último estado | PR asociados y estado | Resumen / comentarios relevantes | Issues asociados y estado`.

- **Autor**: enlazar `@login` a `https://github.com/login` si el usuario original y la URL son verificables. Si no hay autor visible, mostrar `No verificable`. No usar el asignado ni el autor de PR en su lugar.
- **Estado GitHub**: exclusivamente `Cerrado` / `Abierto`; **Subestado**: usar la taxonomía anterior; para Cerrado mostrar `—`.
- El ID de issue debe enlazar a GitHub, igual que IDs de PR e issues asociados. Enlazar módulo solo si se dispone de una URL real.
- En las tablas Markdown, separar múltiples relaciones con `<br>` y escapar barras verticales.
- Fechas `DD-MM-AAAA HH:mm` en hora de Santiago. No confundir última transición con última actividad.
- Si falta evidencia, mostrar `No verificable` o `—` sin inventar.
- El mismo issue aparece una sola vez; conciliar conteos de abiertos, cerrados, subestados y severidades.

## Relaciones especiales de NEXO KLAR
El issue #212 tiene PR originales #177, #189, #201 y #203. Los problemas surgidos en QA corresponden a #140 (PR #229) y #283 (PR #313). Los #277/#305/#307 son trabajos complementarios: **no** convertirlos en dependencias obligatorias del cierre de #212 sin constancia explícita.

## Salida y control de calidad
Crear archivo Markdown con título, corte, repositorio, alcance/cobertura, resumen de conteos, tablas agrupadas, leyenda de estados/subestados y metodología/limitaciones. Usar la plantilla.

Antes de entregar comprobar: universo completo o limitación indicada; autor original de cada issue (no asignado); estado GitHub y subestado en columnas distintas y ordenados; fechas de creación y transición; estado de cada PR; vínculos con fuente; ausencia de falsas afirmaciones sobre QA/merge/deploy; conteos conciliados y ninguna referencia convertida en dependencia sin evidencia.
