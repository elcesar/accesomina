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


---

## 2026-09-23 — Aplicar módulos habilitados también en backend/API

### Mejora
Extender la configuración de módulos habilitados por empresa para que actúe también como control efectivo en el backend y no únicamente como restricción de navegación e interfaz React.

### Situación actual
El PR #32 aplica correctamente los módulos habilitados al menú lateral, acciones rápidas y rutas del frontend, incluyendo rutas hijas. Sin embargo, ocultar o bloquear una pantalla no garantiza por sí solo que los datos o acciones del módulo sean inaccesibles mediante llamadas directas a la API.

### Evolución propuesta
Incorporar validación server-side de los módulos contratados/habilitados para el tenant antes de permitir lectura o modificación de información asociada.

En particular, revisar los endpoints genéricos de estado para evitar que un módulo deshabilitado pueda consultarse o modificarse directamente mediante API. La autorización por rol y la habilitación comercial/funcional del módulo deben actuar como controles complementarios.

### Componentes involucrados
- Configuración de empresa / tenant — fuente de módulos habilitados.
- `server` — middleware o servicio centralizado de autorización por módulo.
- `/api/state` — filtrado o control de lectura de módulos deshabilitados.
- `/api/state/modules` — control de escritura sobre módulos deshabilitados.
- `nexo-v2/src/services/module-access.js` — mantener correspondencia coherente entre módulos de frontend y backend.
- Roles/permisos — conservar autorización por rol como capa independiente.

### Ejemplo
Si una empresa tiene `trabajadores: false`, el frontend no muestra Personas ni permite navegar a `/app/trabajadores`. Como mejora, una llamada directa a la API tampoco debería permitir consultar o modificar los datos del módulo Personas únicamente por estar autenticado.

### Origen
PR #32 — `fix(configuracion): aplicar módulos habilitados`.

### Prioridad
Mejora futura de seguridad y arquitectura. No bloquea el alcance actual del PR #32.
