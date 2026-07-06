# Mejoras operacionales V8.1

## Objetivo

Esta versión refuerza el control diario de contratistas: relaciona personas, clientes, contratos y servicios; conserva versiones documentales; anticipa vencimientos; y muestra costos y excepciones relevantes en el dashboard.

## Funciones incorporadas

- Cursos y exámenes: filtros por cliente, contrato y proyecto o servicio.
- Credenciales e incidentes: carga inicial y actualización de archivos sin borrar la evidencia anterior.
- Turnos y jornada: filtros por cliente, contrato y servicio, manteniendo asistencia y horas reales.
- Subcontratistas: archivos para contrato, F30, F30-1, cotizaciones y seguros; renovación e historial documental.
- Vehículos y equipos: costo mensual de arriendo, moneda, archivos de arriendo, permiso de circulación, SOAP y revisión técnica, además de sus vencimientos.
- Hotelería: ficha de habitaciones, camas, tarifa, ocupación vigente, disponibilidad y reasignación con historial.
- Acreditación de empresa: nuevas versiones documentales sin pérdida del historial.
- EPP: costo unitario, vida útil, motivo de reposición y evidencia de desgaste, rotura, pérdida o vencimiento.
- Dashboard: cumplimiento documental, excepciones críticas, vencimientos a 30 días y costo operacional registrado.

## Criterios aplicados

- Los documentos renovados se agregan como nuevas versiones y no reemplazan el historial.
- Las alertas preventivas se mantienen a 30 días y permiten priorizar las excepciones.
- Las relaciones se derivan desde la asignación del trabajador al servicio, y desde este al contrato y cliente.
- Los datos nuevos forman parte del respaldo completo y permanecen aislados por empresa.
- La aprobación documental conserva estados separados de la simple carga del archivo.

## Referencias operacionales

- Dirección del Trabajo, certificado F30: https://www.dt.gob.cl/portal/1626/w3-article-100359.html
- Dirección del Trabajo, certificado F30-1: https://www.dt.gob.cl/portal/1628/w3-article-94243.html
- ChileAtiende, permiso de circulación: https://www.chileatiende.gob.cl/fichas/9611-permiso-de-circulacion
- Ley 20.123 sobre subcontratación: https://www.bcn.cl/leychile/navegar?idNorma=254080
- DS 44 sobre gestión preventiva: https://www.bcn.cl/leychile/navegar?idNorma=1205298

## Validación

La versión fue comprobada con la suite productiva del repositorio: 67 pruebas cubren aislamiento multiempresa, RUT únicos, relaciones entre módulos, documentos, EPP, turnos, hotelería, permisos, sanitización, importación y exportación.

## Ampliación V8.2

- Hotelería trabaja con habitaciones individuales, una o dos camas, tarifa por habitación y disponibilidad por rango de fechas.
- El `check-out` libera automáticamente la cama para un nuevo ingreso el mismo día, conservando la estadía anterior en el historial.
- Las reasignaciones mantienen una copia de la asignación previa y la ficha del trabajador permanece accesible desde hotelería.
- Vehículos, credenciales, incidentes, subcontratos y acreditaciones muestran archivos, renovaciones y vencimientos desde su propia tabla.
- Cursos, exámenes y turnos muestran la relación completa cliente, contrato y proyecto o servicio.
- Acreditación Mandante incorpora responsable, plazo, observación, evidencia y estados de revisión.
- Se agregó `LEAD / Oportunidades` con etapas, monto, probabilidad, próxima gestión, archivos e historial.
- Una oportunidad ganada puede convertirse en cliente, contrato o proyecto sin duplicar la información de origen.
- Importación y exportación CSV incluye oportunidades comerciales.
- El dashboard prioriza cumplimiento por cliente, excepciones, vencimientos, costos y embudo comercial.

La ampliación fue validada con 71 pruebas automatizadas, incluyendo capacidad hotelera, liberación de camas, relaciones comerciales e aislamiento multiempresa.
