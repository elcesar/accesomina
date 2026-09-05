# Informe QA Cliente Multiplica - Nexo Klar

Fecha: 2026-07-22
Cuenta validada: Multiplica / RUT 76.541.329-K

## Resultado Ejecutivo

Se ejecuto una validacion QA completa para el cliente Multiplica usando una carga realista en todos los modulos principales. El resultado tecnico fue correcto: la data queda conectada entre clientes, contratos, proyectos, trabajadores, EPP, hoteles, vehiculos, subcontratos, turnos, credenciales, incidentes, salud, alertas, auditoria, reportes y oportunidades comerciales.

Pruebas automaticas del software: 78/78 OK.
Cobertura funcional Multiplica: 33/33 vistas OK.

## Volumen cargado

| Item | Cantidad |
| --- | ---: |
| Clientes / mandantes | 5 |
| Contratos | 8 |
| Proyectos / servicios | 12 |
| Trabajadores | 45 |
| Personal planta | 15 |
| Personal spot | 30 |
| Asignaciones | 60 |
| EPP entregado | 90 |
| Hoteles | 5 |
| Alojamientos | 20 |
| Vehiculos y equipos | 8 |
| Subcontratos | 6 |
| Turnos | 36 |
| Credenciales | 30 |
| Protocolos salud | 30 |
| Incidentes / NC | 10 |
| Firmas | 24 |
| Usuarios | 5 |
| Oportunidades | 3 |
| Alertas operativas | 42 |

## Validacion por vista

| Vista / modulo | Estado | Comentario funcional |
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

## Validaciones criticas realizadas

- Trabajadores: se valido unicidad por RUT y documentos por ficha.
- Clientes, contratos y proyectos: se valido relacion cliente -> contrato -> proyecto/servicio.
- Personal spot y planta: se valido asignacion a servicios y trazabilidad de cambios.
- Hoteleria: se valido hotel, habitacion, camas, fechas y control de sobrecupo.
- EPP: se valido talla, entrega, costo, vida util, evidencia y duplicidad.
- Vehiculos/equipos: se valido patente o serie unica, operador, cliente asociado, arriendo y vencimientos.
- Subcontratos: se valido RUT, contrato asociado, F30, F30-1, cotizaciones, OC y documentos.
- Turnos: se valido jornada, asistencia y horas hombre.
- Credenciales y salud: se valido fecha de vencimiento y alerta.
- Incidentes y NC: se valido conexion a servicio, responsable, evidencia y acciones.
- Importar / Exportar: se valido que el respaldo JSON conserva la data conectada.
- Usuarios y permisos: se valido separacion de roles dentro de la empresa.

## Lectura de usabilidad para cliente

Nexo Klar ya se entiende como una plataforma central para controlar operacion, cumplimiento y personal. Para un cliente nuevo, el mayor valor se ve en tres puntos: una sola base de trabajadores, control de vencimientos y trazabilidad por cliente/contrato/proyecto. La navegacion por modulos es amplia y completa, pero para usuarios no tecnicos conviene reforzar una ruta guiada: primero Cliente, luego Contrato, luego Proyecto/Servicio, luego dotacion, documentos, hotel, vehiculos, EPP y alertas.

## Mejoras recomendadas segun mercado

1. Crear un asistente inicial por industria para configurar documentos, EPP, cargos, turnos y requisitos tipo.
2. Agregar una vista 360 por cliente con actividad comercial, operacional, documental, costos y riesgos en una sola pantalla.
3. Crear un tablero de despacho tipo calendario con arrastrar y soltar personas, vehiculos y hotel.
4. Agregar panel financiero por cliente con presupuesto, costo real, OC, margen y facturacion proyectada.
5. Incorporar carga masiva guiada con previsualizacion de errores antes de importar.
6. Crear modo ejecutivo y modo operativo para reducir ruido visual segun perfil.
7. Conectar proveedores reales de OCR, firma electronica, WhatsApp, correo y almacenamiento privado.
8. Agregar portal mandante para revision y aprobacion documental externa.
9. Mejorar reportes PDF/Excel con formato comercial por cliente, contrato, proyecto y cumplimiento.
10. Agregar app movil/PWA para terreno: asistencia, evidencias, EPP, incidentes y firma de entrega.

## Conclusion

La funcionalidad base de Multiplica esta validada y el sistema responde bien como plataforma operativa multisectorial. Para venta a clientes medianos y grandes, la prioridad comercial deberia ser reforzar experiencia guiada, reportes ejecutivos, despacho visual, costos y conectores reales de documentos/firma/notificaciones.
