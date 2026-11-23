# NEXO KLAR — Reporte de issues {{alcance}}

**Corte:** {{fecha-hora}} (America/Santiago)  
**Repositorio:** [elcesar/accesomina](https://github.com/elcesar/accesomina)  
**Cobertura:** {{paginas-consultadas}} páginas, {{issues-incluidos}} issues; PRs excluidos. {{limitaciones}}

## Resumen ejecutivo

| Métrica | Cantidad |
|---|---:|
| Issues {{alcance}} | {{total}} |
| Listos para probar (canónico) | {{listos}} |
| Pendiente de validación QA (etiqueta antigua) | {{pendientes-antiguos}} |
| Otros estados QA | {{otros-estados}} |
| Sin estado QA | {{sin-estado}} |
| Bloqueantes explícitos | {{bloqueantes}} |

## Matriz de severidad y estado QA

| Severidad | Listo para probar | Pendiente QA (antiguo) | Otros | Sin estado QA | Total |
|---|---:|---:|---:|---:|---:|
| P0 · Crítica | {{p0-listo}} | {{p0-pendiente}} | {{p0-otros}} | {{p0-sin}} | {{p0-total}} |
| P1 · Alta | {{p1-listo}} | {{p1-pendiente}} | {{p1-otros}} | {{p1-sin}} | {{p1-total}} |
| P2 · Media | {{p2-listo}} | {{p2-pendiente}} | {{p2-otros}} | {{p2-sin}} | {{p2-total}} |
| P3 · Baja | {{p3-listo}} | {{p3-pendiente}} | {{p3-otros}} | {{p3-sin}} | {{p3-total}} |
| Sin severidad | {{sx-listo}} | {{sx-pendiente}} | {{sx-otros}} | {{sx-sin}} | {{sx-total}} |
| **Total** | **{{listos}}** | **{{pendientes-antiguos}}** | **{{otros-estados}}** | **{{sin-estado}}** | **{{total}}** |

## P0 · Crítica
**Listo para probar:** {{lista-de-ids-enlazados}}  
**Otros estados / sin estado:** {{lista-de-ids-enlazados}}

## P1 · Alta
{{mismo-formato}}

## P2 · Media
{{mismo-formato}}

## P3 · Baja
{{mismo-formato}}

## Sin severidad
{{mismo-formato}}

## Bloqueos y próximos pasos
{{resumen-basado-en-evidencia-verificada-con-links}}

## Metodología y limitaciones
- Sólo issues del alcance solicitado; no PRs como filas.
- El estado GitHub y estado QA son campos distintos.
- «Listo para probar» no es QA aprobado, despliegue, ni retiro de bloqueo.
- {{discrepancias-y-cobertura}}

---

# Plantilla opcional: modo detallado
Repetir por severidad:

| Issue | Autor | Creación | Estado GitHub | Estado QA | Módulo | Último cambio de estado | PR y estado | Resumen / QA / siguiente paso | Issues relacionados |
|---|---|---|---|---|---|---|---|---|---|
| [#{{id}}](https://github.com/elcesar/accesomina/issues/{{id}}) | [@{{autor}}]({{autor-url}}) | {{creacion-chile}} | {{abierto-o-cerrado}} | {{estado-qa}} | {{modulo}} | {{fecha-transicion-o-no-verificable}} | [#{{pr}}](https://github.com/elcesar/accesomina/pull/{{pr}}) · {{estado-real}} | {{resumen-evidencia-pendiente}} | [#{{rel}}](https://github.com/elcesar/accesomina/issues/{{rel}}) · {{relacion-y-estado}} |
