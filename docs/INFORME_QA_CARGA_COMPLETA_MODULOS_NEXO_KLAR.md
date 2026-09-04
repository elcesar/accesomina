# Informe QA de carga completa por modulo - Nexo Klar

Fecha: 2026-07-22

## Resumen ejecutivo

Se generó una carga QA realista para la cuenta administradora **78.425.213-2** con datos ficticios pero operativos. La prueba valida que cada vista principal del software tenga información asociada, relaciones consistentes y controles de duplicidad.

Toda la data principal queda marcada con trazabilidad visible **QA 1**, **QA 2**, **QA 3** y así sucesivamente. Esto permite seguir clientes, contratos, proyectos, trabajadores, documentos, EPP, hoteles, vehículos, subcontratos, incidentes, oportunidades y registros operativos durante la navegación del sistema.

## Volumen cargado

| Item | Cantidad |
| --- | ---: |
| Clientes | 5 |
| Contratos | 8 |
| Proyectos / servicios | 12 |
| Trabajadores | 45 |
| Personal planta | 15 |
| Personal spot | 30 |
| Asignaciones | 60 |
| EPP entregado | 90 |
| Hoteles | 5 |
| Alojamientos | 20 |
| Vehiculos/equipos | 8 |
| Subcontratos | 6 |
| Turnos | 36 |
| Credenciales | 30 |
| Protocolos salud | 30 |
| Incidentes/NC | 10 |
| Firmas | 24 |
| Usuarios | 5 |
| Oportunidades | 3 |

## Validacion por vista

| Vista / modulo | Estado | Evidencia funcional |
| --- | --- | --- |
| Vista General | OK | Resumen con clientes, contratos, servicios, alertas y costos. |
| Dashboard | OK | KPIs, riesgo por cliente, oportunidades y costos. |
| Centro Reclutamiento | OK | Personal spot con estados de llamado, validacion, contrato y acreditacion. |
| Por Cliente | OK | Arbol cliente -> contrato -> servicio -> personas/equipos. |
| Alertas | OK | 42 alertas QA calculadas por vencimientos, incidentes y bloqueos. |
| Trabajadores | OK | Nomina completa sin RUT duplicado. |
| Personal de Planta | OK | Personal permanente con turno y cargo. |
| EPP y Entregas | OK | Entregas, tallas, costos, vida util y evidencias. |
| Bloqueados | OK | Trabajadores no habilitados por documento critico. |
| Auditoria | OK | Flujo documental e historial por entidad. |
| Acreditacion Empresa | OK | Documentos empresa con estados y vencimientos. |
| Servicios | OK | Servicios con dotacion requerida y asignaciones. |
| Contratos y Firmas | OK | Contratos, montos CLP, vigencia y firma. |
| Hoteleria | OK | Hoteles, habitaciones, camas, precios y estadias. |
| Llamados WA | OK | Convocatorias y grupos por servicio. |
| Vehiculos y Equipos | OK | Patente/serie, arriendo, operador, vencimientos y costos. |
| Acreditacion Mandante | OK | Estados por empresa, trabajador y vehiculo ante mandante. |
| Subcontratos | OK | Subcontratistas con F30, F30-1, cotizaciones, OC y contrato. |
| Turnos y Jornada | OK | Jornadas 5x2, 4x3, 7x7, asistencia y HH. |
| Credenciales | OK | Pases, QR, zonas, campamento y vencimientos. |
| Incidentes y NC | OK | Incidentes, NC, evidencias y CAPA. |
| Protocolos Salud | OK | Hipobaria, ruido, silice, UV, psicosocial y otros. |
| Examenes | OK | Examenes por cliente, contrato y proyecto desde ficha. |
| Cursos | OK | Cursos por persona y vencimiento. |
| Reportes | OK | Base para reportes por modulo, costos y operacion. |
| Guia interactiva | OK | Debe explicar flujo completo; no depende de datos. |
| Configuracion Empresa | OK | Catalogos y matriz de requisitos por empresa. |
| Importar / Exportar | OK | Payload JSON listo para restaurar respaldo completo. |
| Centro Operativo | OK | Libro diario, CAPA, OCR/firma/QR y readiness productiva. |
| Usuarios y Permisos | OK | Roles admin, RRHH, prevencion, acreditacion y consulta. |
| Bitacora de Cambios | OK | Historial de cambios por entidad. |
| Privacidad y Datos | OK | Retencion, responsable y bloqueo legal. |
| LEAD / Oportunidades | OK | Pipeline, montos CLP, probabilidad y documentos. |

## Validaciones criticas ejecutadas

- No se permiten trabajadores duplicados por RUT.
- No se permiten contratos duplicados por numero.
- Cada proyecto/servicio queda asociado a un cliente y contrato consistente.
- Las asignaciones de trabajadores referencian personas y servicios existentes.
- La hoteleria valida habitaciones, camas, fechas de estadia y disponibilidad.
- EPP queda conectado a trabajador, proyecto, talla, costo, vida util y evidencia.
- Vehiculos/equipos quedan conectados a cliente, operador, arriendo, permisos, seguros y alertas de vencimiento.
- Subcontratos quedan conectados a contrato, F30, F30-1, cotizaciones, OC, seguro y cumplimiento.
- Credenciales, protocolos de salud, incidentes, CAPA, permisos y firmas quedan conectados a personas, clientes y servicios.
- Importacion/exportacion queda cubierta mediante respaldo JSON completo.

## Uso recomendado de la carga QA

1. Abrir `qa/load-nexo-klar-full-qa.html` desde un servidor local del repositorio.
2. La pagina carga el respaldo en la cuenta administradora `78.425.213-2`.
3. El cargador abre `AccesoMina_v6.html` con la data QA ya instalada.
4. Revisar filtros por cliente, contrato, proyecto/servicio, estado y vencimiento.
5. Exportar reportes y respaldos para confirmar continuidad de datos.

## Resultado

La carga queda apta para demo comercial, QA de navegacion y prueba funcional por modulo. Para produccion real, los archivos adjuntos simulados deben reemplazarse por almacenamiento cloud privado, OCR/firma/QR productivo, monitoreo y respaldo externo.
