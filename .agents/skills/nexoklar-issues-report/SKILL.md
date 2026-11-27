---
name: nexoklar-issues-report
description: Genera reportes auditables de issues de NEXO KLAR desde GitHub, por defecto sólo abiertos, agrupados por severidad y estado QA, con resumen ejecutivo, enlaces, PR y dependencias verificadas; admite detalle completo e histórico.
---

# NEXO KLAR — Reporte de issues de GitHub

## Cuándo se activa
Ante solicitudes como «reporte de issues», «issues abiertos por severidad», «resumen por estado», «pendientes de QA», «issues críticos», «reporte actualizado» o «reporte detallado con PR». Consultar siempre GitHub en tiempo real; nunca reutilizar conteos de una conversación anterior.

**Repositorio:** `elcesar/accesomina`. **Zona horaria:** `America/Santiago`. **Idioma:** español. **Salida:** Markdown, empleando `references/plantilla-reporte.md`. No modificar issues, etiquetas, PR ni estados al generar el reporte.

### Parámetros y modos
- **Alcance predeterminado: sólo issues abiertos** (`state=open` o búsqueda `is:issue is:open`), excluyendo PRs y cerrados. Si piden explícitamente «todos», «histórico» o «cerrados», ampliar el alcance solicitado.
- **Modo resumen (predeterminado):** KPIs, matriz severidad × estado QA, distribución por severidad, IDs enlazados por estado y análisis breve de bloqueantes y siguientes acciones. Para una lista pequeña, incluir título abreviado de cada issue. Para «reporte completo», incluir todos los issues en una tabla por severidad.
- **Modo detallado:** tabla por issue que añada autor original, creación, módulo, fecha verificable de último cambio de estado, PR relacionados con estado real, issues asociados y resumen/evidencia.
- **Exportación:** si solicitan archivo, crear `reporte-issues-NEXOKLAR-AAAA-MM-DD.md` (y otro formato sólo si lo piden). Entregar enlace al artefacto realmente creado.

## Fuente, completitud y normalización
1. Obtener la **totalidad** del universo solicitado por la API GitHub usando paginación `per_page=100&page=N` hasta página vacía o último enlace `next`. Nunca asumir que una sola página es suficiente. Excluir elementos con campo `pull_request`, porque `/issues` incluye PRs.
2. Leer de cada issue: `number`, `title`, `html_url`, `state`, `labels`, `user.login`, `created_at`, `updated_at`, `closed_at`, `body`, `comments`, `assignees`. El creador `user.login` **no es** el responsable `assignee`.
3. Al solicitar sólo abiertos, filtrar estrictamente `state=open` después de consultar. No mezclar PRs ni cerrados; señalar truncamiento/errores de API y cobertura parcial.
4. **Severidad:** `P0` crítica, `P1` alta, `P2` media, `P3` baja, `Sin severidad`. Normalizar etiquetas `sev:critico`, `sev:alto`, `sev:medio`, `sev:bajo` y expresiones explícitas `[P0]` … `[P3]` en el título. Si divergen etiqueta y título, aplicar la prioridad más exigente, advertir la discrepancia en metodología; nunca convertir automáticamente `bloquea-lanzamiento` en P0. En modo detallado, ampliar con evidencia explícita del cuerpo sólo cuando la prioridad no esté etiquetada. **No adivinar severidad** de solicitudes comerciales o de infraestructura sin clasificación.
5. **Estado GitHub:** siempre `Abierto` o `Cerrado`, independiente del estado de QA. Para abiertos, determinar primero por etiquetas:
   - `estado:listo-para-probar` → **Listo para probar** (etiqueta canónica).
   - `estado:pendiente-validacion-qa` → **Pendiente de validación QA (etiqueta antigua)**; **no** computar automáticamente como Listo para probar a menos que el usuario haya ordenado expresamente normalizar y se haya confirmado el cambio en GitHub.
   - Etiqueta antigua exacta `listo para probar` → **Listo para probar (etiqueta histórica)**; informar recomendación de normalización.
   - Otras etiquetas `estado:*` → conservar nombre real y marcar subestado distinto; si faltan todas → **Sin estado QA**.
   - No inferir «QA aprobado» de CI verde o PR fusionado. Si el último retest QA falló, exponer la contradicción con la etiqueta y vincular evidencia; no cambiar la etiqueta sin autorización.
6. En el modo detallado o cuando se solicite explícitamente PRs: rastrear referencias verificadas `Closes/Fixes/Refs #N`, comentarios y enlaces. Consultar el PR realmente en GitHub y clasificarlo como **Abierto**, **Borrador**, **Fusionado** o **Cerrado sin fusionar**. No equiparar PR aprobado, fusionado, desplegado, probado y issue cerrado.
7. Identificar `bloquea-lanzamiento` como dimensión independiente de severidad y QA. Una etiqueta **Listo para probar** no retira un bloqueo de producción, no autoriza despliegue ni implica prueba efectuada.
8. Fechas en hora de Santiago `DD-MM-AAAA HH:mm`. `updated_at` = última actividad, **no** última transición de estado. Mostrar fecha de último estado sólo cuando se verifique un evento de transición o comentario fechado inequívoco; de lo contrario `No verificable`.
9. Mantener el mismo issue una sola vez. Conciliar conteos: `total = sum(severidades) = sum(estados QA) = sum(celdas de matriz)`. Mostrar conteos y cobertura temporal comprobables, nunca porcentajes con denominador distinto al total filtrado.

## Orden y presentación
Severidades en orden **P0, P1, P2, P3, Sin severidad**. Dentro de cada severidad, **Listo para probar**, **Pendiente de validación QA (antiguo)**, otros subestados verificables y **Sin estado QA**; ordenar por número de issue descendente, a menos que el usuario pida otra ordenación.

### Reporte resumen por defecto
- Encabezado con fecha/hora de corte y enlace al repositorio.
- KPIs: total de abiertos, listos para probar, sin estado QA, etiquetas antiguas y bloqueantes explícitos.
- Tabla de doble entrada: `Severidad | Listo para probar | Pendiente QA (antiguo) | Otros estados | Sin estado QA | Total`; ocultar columnas completamente vacías opcionalmente.
- Detalle por severidad con enlaces a todos los IDs separados según su estado. Si el usuario solicita «resumen», no expandir 100 títulos innecesariamente; si pide «listado completo», mostrar títulos y enlaces.
- Bloqueos/dependencias operacionales respaldados por issues, distinguiendo despliegue, SMTP, CloudFront, permisos y pruebas destructivas en QA cuando corresponda.
- Nota de alcance y discrepancias de etiquetado.
- Cada ID debe ser un vínculo real `https://github.com/elcesar/accesomina/issues/N`, no sólo texto sin enlace.

### Reporte detallado
Por severidad, una fila por issue en:
`Issue | Autor | Creación | Estado GitHub | Estado QA | Módulo | Último cambio de estado | PR asociados y estado | Resumen / QA / siguiente acción | Issues asociados y estado`.
Escapar `|` en tablas; separar múltiples relaciones con `<br>`; URLs reales; autor original; fechas verificadas; resumen de 1–3 frases con hechos y pendientes. Priorizar observaciones QA más recientes y advertir cuando el cuerpo describe un PR «abierto» pero GitHub ya lo muestra fusionado.

## Control de calidad obligatorio
- Verificar la paginación y exclusión de pull requests.
- Reconciliar **todos** los totales, subtotales y números de issue.
- No presentar **Sin estado QA** como **Sin desarrollo**.
- No afirmar que un issue fue probado cuando sólo se cambió su etiqueta.
- No atribuir un PR a un issue sin referencia comprobada; no atribuir el autor de un PR al creador del issue.
- Distinguir la fecha de corte, `updated_at` y fecha de transición.
- Informar si hay errores, cobertura parcial o etiquetas contradictorias.
- No ejecutar cambios en GitHub ni generar issues/PR nuevos durante el reporte salvo petición explícita.

## Ejemplos
- «Resumen de issues abiertos por estado y severidad» → modo resumen, sólo abiertos, matriz y IDs enlazados.
- «Reporte completo de issues abiertos incluyendo PRs y comentarios» → modo detallado, sólo abiertos.
- «Reporte histórico de issues abiertos y cerrados» → modo detallado, universo abierto + cerrado; conservar columnas separadas de estado GitHub y QA.
