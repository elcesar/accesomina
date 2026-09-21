# Backlog NEXOKLAR

## 2026-09-21 — Requisitos documentales configurables por contexto

### Mejora
Evolucionar la validación documental de personas desde un conjunto universal de requisitos hardcodeados hacia un modelo configurable por contexto operacional.

### Situación actual
Se consideran requisitos base obligatorios para todas las personas de todos los clientes:

- Cédula de identidad
- Contrato de trabajo
- Certificado AFP
- Certificado Fonasa o Isapre
- Examen preocupacional
- ODI / Derecho a Saber
- Reglamento Interno

Esta definición es válida para la versión actual.

### Evolución propuesta
Calcular los documentos exigibles a una persona combinando:

1. Requisitos base NEXOKLAR.
2. Requisitos específicos del cliente.
3. Requisitos del contrato.
4. Requisitos de la Orden de Servicio.
5. Cuando corresponda, requisitos asociados al cargo, especialidad o tipo de trabajador.

El motor de alertas debería utilizar la misma fuente de requisitos que los módulos de cumplimiento y preparación de personas, evitando definiciones duplicadas.

### Componentes involucrados
- `nexo-v2/src/services/operational-alerts.js` — generación de alertas por documentación faltante.
- `workerItems` — documentos y antecedentes registrados en la ficha de la persona.
- Clientes — definición de requisitos particulares.
- Contratos — requisitos documentales asociados a la relación contractual.
- Órdenes de Servicio (`mantenciones`) — requisitos operacionales específicos.
- Gestión de Personal por Proyecto — validación de preparación/habilitación de personas.
- Vista Alertas — presentación de brechas documentales derivadas.

### Origen
PR #30 — `fix(alertas): detectar documentos faltantes de trabajadores`.

### Prioridad
Mejora futura. No bloquea el comportamiento actual del PR #30.
