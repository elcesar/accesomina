# Plan de excelencia Nexo Klar

Este documento ordena las mejoras necesarias para que Nexo Klar pase de una plataforma demostrable a una solución robusta para piloto, venta y operación productiva.

## 1. Producto y datos

- Mantener entidades críticas separadas y auditables: clientes, contratos, proyectos/servicios, trabajadores, asignaciones, documentos, EPP, hotelería, vehículos, turnos, credenciales, incidentes, actividades y usuarios.
- Usar catálogos configurables por empresa: cargos, especialidades, EPP, cursos, exámenes, documentos, turnos, tipos de contrato y centros de costo.
- Mantener matriz de requisitos por cliente, contrato, proyecto, cargo y tipo de trabajador.
- Registrar historial por entidad: qué cambió, quién lo hizo, cuándo, motivo y evidencia.

## 2. Interconexión operativa

- Desde cliente: ver contratos, proyectos, personas, recursos, documentos, alertas, actividades y compromisos.
- Desde contrato/proyecto: agregar o quitar trabajadores, vehículos, hotelería, permisos, subcontratos, incidentes y documentos.
- Desde trabajador: ver asignación activa, documentos, cursos, exámenes, EPP, hotel, turno, credencial, estado operativo y bloqueos.
- Bloquear automáticamente cuando falte un documento crítico, exista vencimiento, credencial vencida, examen vencido o contrato no firmado.

## 3. Documentación inteligente

- Mantener flujo formal: requerido, cargado, enviado, en revisión, observado, corregido, aprobado, rechazado y vencido.
- Conectar proveedor externo para OCR, firma electrónica, QR, comparación fotográfica, validación de emisor e integridad del archivo.
- Guardar score de confianza, evidencia del proveedor y revisión humana final.

## 4. Acceso, seguridad y Ley 21.719

- Operar productivamente con PostgreSQL, RLS por empresa, MFA, HTTPS, sesiones seguras y archivos privados por tenant.
- Definir responsable de privacidad, dueño del dato, política de conservación, bloqueo legal y registro de derechos de titulares.
- Mantener auditoría inmutable para cambios, accesos, documentos, usuarios, integraciones y acciones críticas.

## 5. Paneles y usabilidad

- Dashboard ejecutivo con cumplimiento, riesgo, dotación, vencimientos, costos, hotelería, vehículos, EPP, subcontratos y compromisos.
- Centro operativo diario para ingresos, salidas, disponibilidad, bloqueos, alertas, eventos de terreno y reportes.
- Vista móvil/terreno para cargar evidencia, check-in/out, incidentes, EPP y observaciones rápidas.
- Portal mandante para revisión, observación, aprobación y reportes restringidos.

## 6. Infraestructura requerida antes de vender a clientes grandes

- AWS o nube equivalente con base de datos administrada, almacenamiento privado, respaldos, monitoreo, logs centralizados y alertas.
- SMTP/correo real, WhatsApp Business API, firma electrónica, OCR/document AI, antivirus de archivos y prueba de penetración.
- Runbook de operación: respaldo, recuperación, soporte cliente, cambios, incidentes, privacidad y continuidad.

## 7. Enfoque comercial recomendado

- Vender como plataforma multisectorial de control operacional, cumplimiento documental y trazabilidad para empresas con personal interno y externo.
- Preparar demos por industria: minería, energía, construcción, industrial, facilities, logística, mantenimiento, seguridad privada y agroindustria.
- Ofrecer piloto controlado con un cliente real para generar caso de éxito, métricas de reducción de planillas, vencimientos detectados y tiempos de acreditación.

## 8. Mejora ejecutada V9.4

Se incorpora una suite productiva integrada visible en el Centro Operativo, Dashboard, Contratos y Reportes.

- Motor documental inteligente: consolida documentos existentes, estados formales, score de confianza, revisión humana y preparación para OCR, QR, firma, emisor, fotografía e integridad.
- Planificación tipo despacho: muestra servicios por cliente/contrato, dotación requerida/asignada, recursos asociados y brechas antes de movilizar.
- Costos y rentabilidad: calcula hotelería, EPP, vehículos, horas hombre, costo real, facturación proyectada y margen por servicio.
- Inventario y stock: controla EPP, equipos, bodega, stock mínimo, alertas de reposición e historial de movimientos.
- Automatización de alertas: permite programar alertas por correo/WhatsApp, escalamiento y reportes semanales por empresa.
- Contratos y firmas: panel de plantillas, estados de firma, versiones, bloqueo por falta de contrato/anexo y conector preparado para firma electrónica.
- BI ejecutivo: reportes exportables a CSV y salida PDF mediante impresión del navegador para cumplimiento, riesgos, costos, dotación, hotelería, vehículos, EPP, subcontratos, incidentes, auditoría y oportunidades.

Las integraciones reales con OCR, firma electrónica, WhatsApp Business, SMTP, S3, antivirus y monitoreo quedan preparadas a nivel de flujo y conector, pero requieren credenciales y servicios productivos contratados para operar con clientes reales.

## 9. Mejora ejecutada V9.5

Se profundiza la operación diaria en tres frentes críticos para competir con plataformas de field service, contractor management y control operacional.

- Despacho visual: calendario por día, semana y mes; tarjetas movibles por servicio; vista por zona; estado de movilización; disponibilidad por especialidad; brechas visibles; reasignación rápida de trabajadores, vehículos y hotel.
- Costos y rentabilidad: presupuesto inicial por servicio, OC asociadas, horas hombre reales, tarifa HH, costo de hotelería, EPP, EPP por vida útil, vehículos, venta proyectada, desviación de presupuesto, margen y export contable/ERP.
- Inventario real: bodegas múltiples, stock por ubicación, reposición, entrega, devolución, pérdida, daño, firma/respaldo, vida útil, costo unitario, costeo por proyecto e historial por trabajador.
- Arquitectura productiva: migración `016_dispatch_finance_inventory.sql` con tablas normalizadas para planificación, asignaciones, costos, bodegas, inventario, movimientos, auditoría inmutable, aprobaciones de mandante y notificaciones.

Con esto Nexo Klar mejora el control operacional real y no solo documental: permite planificar, movilizar, costear, controlar recursos físicos y dejar trazabilidad por cliente, contrato, proyecto, trabajador y bodega.

## 10. Mejora ejecutada V9.6

Se fortalece el módulo `LEAD / Oportunidades` para control comercial y seguimiento previo a cliente, contrato o proyecto.

- Se agregan región y comuna con validación según la lista oficial de regiones/comunas de Chile ya utilizada por el sistema.
- Se agregan filtros por región y comuna en el listado de oportunidades.
- La tabla muestra ubicación, contacto, etapa, monto, próxima gestión, archivos y acceso directo a bitácora.
- Cada oportunidad cuenta con bitácora de seguimiento para registrar llamadas, correos, reuniones, WhatsApp, propuestas, acuerdos, tareas, próximos pasos y respaldos.
- Al convertir una oportunidad ganada en cliente, la ubicación y datos de contacto se traspasan al registro creado.

Esto permite llevar continuidad comercial real: cualquier persona puede abrir una oportunidad, entender el estado, revisar el historial, ver acuerdos y continuar la gestión sin depender de correos o memoria personal.
