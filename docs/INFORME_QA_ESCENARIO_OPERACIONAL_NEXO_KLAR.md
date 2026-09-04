# Informe QA operacional Nexo Klar

Fecha: 21 de julio de 2026  
Ambiente revisado: repositorio local Nexo Klar / AccesoMina V6  
Objetivo: validar con datos de prueba realistas que el sistema soporte una operación completa, conectada y sin duplicados para empresas de servicios, contratistas y operaciones en terreno.

## 1. Escenario cargado en la prueba

Se creó una prueba automatizada de aceptación operacional en `server/test/qa-operational-scenario.test.js`. El escenario simula una empresa usuaria administrando clientes, contratos, proyectos, trabajadores, EPP, vehículos, hoteles, turnos, credenciales, salud ocupacional, incidentes, permisos, firmas, llamados y grupos de WhatsApp.

| Módulo | Cantidad validada | Resultado |
| --- | ---: | --- |
| Clientes | 5 | OK |
| Contratos | 8 | OK |
| Proyectos / servicios / mantenciones | 12 | OK |
| Trabajadores totales | 36 | OK |
| Personal permanente | 12 | OK |
| Personal spot / esporádico | 24 | OK |
| Asignaciones trabajador-proyecto | 48 | OK |
| Hoteles | 4 | OK |
| Asignaciones hoteleras | 12 | OK |
| Vehículos y equipos | 8 | OK |
| Subcontratistas | 5 | OK |
| Entregas de EPP | 72 | OK |
| Tallas / medidas EPP | 36 trabajadores | OK |
| Turnos y asistencia | 30 | OK |
| Credenciales | 24 | OK |
| Protocolos de salud | 24 | OK |
| Incidentes y no conformidades | 8 | OK |
| Permisos de trabajo | 12 | OK |
| Solicitudes de firma | 18 | OK |
| Llamados | 8 | OK |
| Grupos WhatsApp | 8 | OK |
| Oportunidades comerciales | 2 | OK |

## 2. Flujo validado

La prueba confirma que el sistema puede operar un ciclo completo:

1. Crear clientes.
2. Asociar contratos a cada cliente.
3. Crear proyectos, servicios o mantenciones ligados al contrato correcto.
4. Cargar personal permanente y spot.
5. Asignar trabajadores a proyectos y servicios.
6. Registrar documentos, cursos y exámenes por trabajador.
7. Guardar tallas de EPP y registrar entregas con costo, vida útil, estado, fecha y evidencia.
8. Asociar hoteles, habitaciones, camas, tarifas y estadías por trabajador.
9. Registrar vehículos propios y arrendados, operador, vencimientos y costos.
10. Cargar subcontratistas con contrato, OC, F30, cotizaciones y vencimientos.
11. Gestionar credenciales, protocolos de salud, incidentes, permisos, firmas, llamados y grupos WhatsApp.
12. Exportar e importar el estado completo manteniendo las relaciones.

## 3. Validaciones que pasaron correctamente

La prueba bloqueó errores críticos que en producción podrían generar pérdida de control:

| Validación | Resultado |
| --- | --- |
| No permite dos trabajadores con el mismo RUT, aunque cambie el formato | OK |
| No permite números de contrato duplicados | OK |
| No permite proyectos asociados a contratos de otro cliente | OK |
| No permite vehículos/equipos duplicados por patente o serie | OK |
| No permite sobreocupar una habitación de hotel | OK |
| No permite entregas EPP duplicadas para el mismo trabajador, ítem, fecha y lote | OK |
| No permite referencias rotas entre trabajador, proyecto, hotel, vehículo o cliente | OK |
| Mantiene la data completa al exportar e importar JSON | OK |

## 4. Alertas operativas probadas

El escenario incluye vencimientos próximos para validar que el sistema tenga datos suficientes para mostrar alertas:

| Tipo de alerta | Muestra incluida |
| --- | --- |
| Revisión técnica, arriendo y certificación de vehículos/equipos próximos a vencer | OK |
| Credenciales próximas a vencer | OK |
| Protocolos de salud próximos a vencer | OK |
| Documentos laborales y previsionales con vencimiento | OK |
| EPP con vida útil y reposición futura | OK |

## 5. Resultado técnico

Prueba ejecutada:

```bash
node --test server/test/qa-operational-scenario.test.js
```

Resultado:

```text
tests 3
pass 3
fail 0
duration_ms 126.665625
```

Validación de sintaxis:

```bash
node --check server/validation.js
```

Resultado: OK.

## 6. Conclusión funcional

La arquitectura funcional actual permite representar una operación real de Nexo Klar para múltiples clientes, contratos, proyectos, personal permanente, personal spot, documentación, EPP, hotelería, vehículos, turnos, credenciales, incidentes y subcontratos. La prueba confirma que las relaciones principales están protegidas y que el sistema no acepta duplicados críticos dentro de la misma empresa.

Desde el punto de vista de uso comercial, el sistema ya puede demostrar una operación completa y conectada para clientes que necesitan controlar personal interno y externo, cumplimiento documental, trazabilidad, vencimientos y operación en terreno.

## 7. Observaciones de mejora antes de venta productiva

1. Ejecutar una QA visual con navegador en producción para revisar botones, formularios, filtros y navegación real.
2. Conectar almacenamiento cloud definitivo para archivos, evitando depender de nombres o datos locales.
3. Activar monitoreo productivo, registro centralizado de errores y respaldo automático.
4. Convertir todas las alertas de vencimiento en tareas visibles con responsable, fecha objetivo y estado.
5. Agregar tablero de salud operacional por cliente: personal habilitado, bloqueado, por vencer, en hotel, en turno y costo estimado.
6. Completar pruebas de concurrencia para validar que dos usuarios de la misma empresa no sobrescriban datos al mismo tiempo.
7. Preparar datos demo oficiales para ventas, separados de la data real de clientes.

## 8. Recomendación final

El sistema está en buen pie funcional para demo avanzada y levantamiento comercial. Para venderlo como solución productiva robusta, la prioridad debe ser cerrar infraestructura cloud, almacenamiento documental, seguridad de acceso, monitoreo y QA visual end-to-end en el sitio publicado.
