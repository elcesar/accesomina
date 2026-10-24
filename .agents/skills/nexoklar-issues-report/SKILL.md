---
name: nexoklar-issues-report
description: Genera informes Markdown auditables de todos los issues de NEXO KLAR agrupados por severidad, con estados QA/GitHub, fechas reales, módulos, PR e issues asociados y enlaces. Usar para informes, seguimiento de bloqueantes, inventarios y cortes de issues/PR en elcesar/accesomina.
---

# NEXO KLAR — Skill de reporte de issues

## Ejecución
Cuando el usuario pida un informe de issues, consultar GitHub del repositorio `elcesar/accesomina` mediante las herramientas conectadas; generar un archivo Markdown `reporte-issues-NEXOKLAR-AAAA-MM-DD.md` y entregarlo. Usar `references/plantilla-reporte.md`. No modificar issues ni PR al ejecutar un reporte, salvo instrucción expresa.

**Parámetros por defecto:** todos los issues abiertos y cerrados (sin convertir PR en filas de issue); fecha/hora de corte `America/Santiago`; idioma español; grupos por severidad P0, P1, P2, P3, sin clasificar. Debe informarse si la cobertura es parcial.

## Recolección obligatoria
1. Recuperar **todo** el universo de issues con paginación, `is:issue`, abiertos y cerrados. Nunca inferir completitud de una página de 100. Si la herramienta impone límites, declarar cobertura parcial.
2. Recoger ID, título, URL, `created_at`, `updated_at`, `closed_at`, estado GitHub, etiquetas, cuerpo y comentarios de QA relevantes. Para cambios de estado revisar timeline/eventos cuando estén disponibles.
3. Resolver severidad primero por etiquetas `P0/P1/P2/P3` o `sev:critico/alto/medio/bajo` y luego por declaraciones explícitas en QA/cuerpo. `bloquea-lanzamiento` es clasificación independiente, no convierte automáticamente el issue en P0. Si hay conflicto entre etiqueta y título, explicar la inconsistencia.
4. Determinar el estado funcional con evidencia actual. **PR fusionado no equivale a QA aprobado, despliegue ni cierre.** Si GitHub dice cerrado, usar Cerrado y señalar contradicciones con etiquetas antiguas.
5. Recuperar PR vinculados de forma explícita (Closes/Fixes/Refs, cuerpo, comentarios o enlaces confirmados). Verificar para **cada PR** `merged`, `open`, `draft` o `closed not merged`; enlazarlo. Nunca deducir merge desde el texto histórico de una descripción.
6. Recuperar los issues asociados y comprobar su estado. Clasificar el vínculo como dependencia explícita, defecto encontrado por QA o mera referencia técnica, atribuyendo su fuente; no convertir referencias en bloqueo sin declaración.
7. La fecha **último estado** debe venir del evento de transición, comentario explícito o cambio de etiqueta verificable, no de `updated_at`. Sin esa evidencia escribir **No verificable**; la última actividad puede informarse separadamente.
8. Resumen de cada issue en 1–3 frases: qué falla/impacto, solución existente, último resultado QA y siguiente paso. Enlazar comentario fuente si es relevante. No inventar pruebas, fechas ni despliegues.

## Orden obligatorio
Grupos: **P0 · Crítica**, **P1 · Alta**, **P2 · Media**, **P3 · Baja**, **Sin severidad verificable**. Dentro de cada grupo ordenar de mayor a menor avance funcional, así:
1. Cerrado (incluye cerrado no planificado con anotación).
2. QA aprobado · pendiente de cierre.
3. Listo para probar (`estado:pendiente-validacion-qa` o decisión explícita respaldada).
4. En pruebas / QA fallido (no confundir fallo histórico con fallo posterior a una nueva corrección).
5. En revisión / PR abierto.
6. En desarrollo.
7. Pendiente / por hacer.
8. Abierto / sin clasificar.

Después ordenar por fecha de última transición descendente, y por número de issue ascendente. Los bloqueantes pueden tener cualquier estado: p.ej. **Listo para probar · Bloqueante**.

## Tabla obligatoria por severidad
`Issue | Creación | Estado | Módulo | Fecha último estado | PR asociados y estado | Resumen / comentarios relevantes | Issues asociados y estado`.

- Enlazar IDs a URL canónica de GitHub; enlazar el módulo sólo si existe URL real verificada.
- En las celdas de tablas Markdown, separar relaciones múltiples mediante `<br>` y escapar las barras verticales.
- Usar fechas `DD-MM-AAAA HH:mm`, con zona CLT/CLST cuando corresponda.
- Fecha del último estado **no** significa fecha de última actualización.
- Si un campo carece de evidencia, mostrar `No verificable` o `—`, no completarlo por intuición.
- El mismo issue aparece una sola vez; verificar coherencia de conteos y enlaces.

## Relaciones especiales de NEXO KLAR
El issue #212 tiene PR originales #177, #189, #201 y #203. Los problemas surgidos en QA corresponden a #140 (PR #229) y #283 (PR #313). Los #277/#305/#307 corresponden a verificación física/integraciones adicionales: **no** convertirlos en dependencias obligatorias del cierre de #212 sin constancia explícita en #212.

## Salida y control de calidad
Crear archivo Markdown con título, corte, repositorio, alcance/cobertura, resumen de conteos, tablas agrupadas, leyenda de estados y metodología/limitaciones. Usar plantilla de referencia.

Antes de entregar comprobar: universo completo o limitación indicada; severidades/estados correctamente ordenados; PR e issues asociados con vínculos, estado y fuente; fechas de creación vs transición; ausencia de falsas afirmaciones de QA/merge/deploy; conteos conciliados; sin relaciones inferidas convertidas en dependencia. Entregar enlace al Markdown generado y breve resumen.
