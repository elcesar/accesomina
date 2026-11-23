# Validación de planes y suscripciones — 5 de noviembre de 2026

Base comparada: `22fd446c5d0a41f46375364bc7f995f7498a0956`. Datos ficticios y bases aisladas. No se modificaron registros ni se enviaron correos en producción.

## Resultados ejecutados

- Motor: 23 pruebas aprobadas con todas las migraciones reales en PGlite. Incluyen cinco límites obligatorios, seis meses calendario, horario de verano, fin de mes, renovaciones, gracia, paquetes, versiones inmutables, documentos, reintentos, aislamiento, conservación del beneficio Free tras eliminación y posterior contratación pagada.
- API y guardados: 15 pruebas aprobadas. Catálogo, recomendador, formularios y consentimiento; roles globales y de empresa; versiones/precios obsoletos; límites en guardado, CSV y respaldo; rollback de versiones/configuración/auditoría; documentos de renovación con plan vencido y almacenamiento separado.
- Acceso, permisos y avisos: pruebas de rutas directas, licencias independientes, permisos de módulos, reclamación/reintentos, recuperación tras interrupción, cancelación por renovación y avisos internos visibles sólo para su administrador.
- Chrome: 36 pruebas aprobadas en escritorio y móvil. Planes en 375/768/1024/1440 px; registro y primer acceso con contraseña/MFA; catálogo y solicitudes; condiciones históricas, suspensión y administración. Compilación aprobada; permanece el aviso previo de tamaño de bundle.
- Comprobación adicional en Chrome con API real local y PostgreSQL embebido: cinco ofertas, solicitud pública persistida, recomendación de 850 trabajadores a 920 cupos, Mi plan Free, solicitud privada persistida y visible en administración global. Las 36 pruebas anteriores usan respuestas controladas y no se presentan como QA productiva.

## Regresión existente

La base sin cambios ejecutó 549 casos: 535 aprobados y 14 fallidos. La regresión posterior ejecutó 619: 604 aprobados, los mismos 14 fallidos y una prueba de PostgreSQL externo omitida localmente. El caso de eliminación de empresa gestionada se añadió y aprobó después de esa ejecución. No se declara la suite completa verde.

Fallos reproducidos con idéntico nombre en la base:

1. append validation rejects an operational assignment for a restricted worker
2. retired assignments and enabled workers remain valid
3. historical operational assignments do not block unrelated saves after a later restriction
4. catalog pages distinguish empty catalogs from filtered results
5. AC-28 controla protocolos de salud sin duplicados
6. opportunity CSV import writes the portal module, retains history and can be exported again
7. explicit replacement clears historical aliases atomically instead of showing deleted old rows
8. invalid references roll back CSV import and audit without affecting existing opportunities
9. the backend rejects duplicate active opportunities without RUT across legacy and canonical collections
10. replace requires explicit confirmation and reports its operational impact without writing
11. canonical imports retain archived records in the audit log for restoration
12. overlapping collection IDs retain each persisted RUT during an unrelated state edit
13. state rejects duplicate operational records
14. employment relationship and operational availability remain independent

## Verificaciones externas pendientes

El workflow `Subscription backend QA` aplica las migraciones a PostgreSQL 16 desechable y ejecuta también la competencia entre conexiones independientes. Localmente se probó serialización con PGlite; eso no certifica el bloqueo entre conexiones de PostgreSQL. Consultar el resultado del workflow del último commit antes de liberar.

Faltan la revisión correspondiente, la actualización de ECS por César, la publicación posterior del frontend y el retest productivo con empresa y buzón QA autorizados. SMTP simulado no acredita recepción en un buzón. Conservar abierto el issue de implementación hasta completar estas verificaciones. Procedimiento: [publicación y operación](../subscriptions-production.md).
