# Regresión de navegador: contratos de prueba vigentes

12 de noviembre de 2026. Complemento del issue #333; no modifica código del producto.

La ampliación de la ejecución a toda la suite detectó **21 fallos en 278 casos**. Se repitieron casos representativos sobre `main 2748adf` antes de editar y se comprobó que los componentes afectados coinciden con los de la integración: los fallos proceden de fixtures/selectores anteriores al contrato actual. Los 14 fallos originales de servidor siguen tratados en #334; estos 21 son un conjunto de navegador distinto.

| Archivo | Causa y corrección |
|---|---|
| app.spec.js | La navegación pública usa enlaces. Se verifican rol link, href, cambio de URL y contenido de Plataforma/Propósito. |
| people-list-regression.spec.js | Ficha lee GET individual; devolver sólo /state dejaba Persona no encontrada. Respuesta {record,revision}, identidad pedida y conservación de Asignado/filtro. |
| qa-worker-form.spec.js | Mismo contrato individual para llegar al formulario documental real; se verifica primero la persona cargada y después selector único. |
| worker-email-regression.spec.js | Perfil usa GET/PATCH por registro y revisión, no PUT masivo. Verifica versión, payload parcial sin changes, persistencia, foco/ARIA, correo opcional, rechazo 409 y otra persona histórica intacta. Se realiza un cambio real antes de probar rechazo; guardado desde EPP se limita a la tarjeta Tallas. |
| worker-evidence-required.spec.js | Lectura individual y datos relacionados separados. El vínculo aria-describedby debe contener el ID de ayuda obligatorio; puede incluir ayuda adicional del componente. Se conservan archivos, reverso, vencimiento, deduplicación y limpieza tras rechazo. |
| transversal-confirmations.spec.js | La denegación ya usa ErrorPage 403. Se comprueban título/código/texto, navegación de regreso, 0 llamadas administrativas y 0 escrituras. |

Ejecuciones por bloque sobre fuente de producto `main 2748adf` intacta: 22/22 (app/personas/correo), 60/60 (formulario/confirmaciones) y 8/8 (evidencias), **90 casos únicos aprobados**. Se añade CI con los seis archivos, dependencias reales de validación y build. Estos tests usan API simulada; no acreditan entrega de correo ni una modificación productiva.

La integración completa de planes #337/#338, Contratos/importación #334 y Turnos #335 se verifica en una copia aislada. Sus resultados se registran en #329 y en la descripción de los PR, sin fusionar esas ramas automáticamente. Mantener la revisión de César antes de integrar.
