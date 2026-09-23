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


---

## 2026-09-23 — Validación semántica de datos también en backend/API

### Mejora
Extender al backend/API las reglas de normalización y validación de los campos semánticos que NEXOKLAR incorpora en sus formularios, de modo que la integridad de los datos no dependa exclusivamente de los componentes React.

### Situación actual
Los PR #35 y #37 incorporan reglas reutilizables para teléfono chileno y RUT. En frontend se propone además utilizar inputs semánticos globales como `PhoneInput` y `RutInput`, evitando repetir formato y validación en cada formulario.

Esta capa mejora la experiencia del usuario, pero una integración externa, una importación o un consumidor directo de la API puede ingresar datos sin pasar por esos componentes.

### Evolución propuesta
Mantener las responsabilidades separadas y reutilizables:

```text
Input semántico global
(formato + UX + error)
        ↓
Servicio/validador
(normalización + reglas)
        ↓
Backend/API
(validación de integridad)
        ↓
Persistencia
```

El backend debe validar nuevamente los campos antes de persistirlos y utilizar, cuando sea posible, las mismas reglas de dominio o equivalentes server-side.

### Campos iniciales
- **RUT:** normalización, formato admitido y validación del dígito verificador.
- **Teléfono:** normalización, prefijo/código país y estructura válida.
- **Email:** normalización y validación de estructura.
- Extender el patrón en el futuro a otros datos semánticos cuando exista una regla de negocio aplicable.

### Ejemplos de usabilidad e integración
En formularios React:

```jsx
<RutInput value={persona.rut} onChange={...} />
<PhoneInput value={persona.tel} onChange={...} country="CL" />
<EmailInput value={persona.email} onChange={...} />
```

Una integración futura podría enviar directamente:

```json
{
  "nombre": "Juan Pérez",
  "rut": "13.848.379-6",
  "telefono": "123",
  "email": "correo-invalido"
}
```

Aunque estos valores nunca hayan pasado por los componentes React, la API debe rechazarlos o informar los errores correspondientes antes de persistirlos.

Otro ejemplo: si un ERP envía `912345678` como teléfono, la capa de normalización puede convertirlo al formato canónico definido por NEXOKLAR, por ejemplo `+56912345678`, siempre que el valor sea válido.

### Componentes involucrados
- Inputs semánticos globales de frontend: `RutInput`, `PhoneInput`, `EmailInput` y futuros componentes equivalentes.
- `nexo-v2/src/services/rut.js`.
- `nexo-v2/src/services/chile-phone.js`.
- Validadores/esquemas del backend.
- Endpoints de creación y modificación de Personas.
- Futuras APIs de integración e importación.
- Pruebas de API para comprobar rechazo/normalización de valores inválidos.

### Origen
PR #35 — `fix(personas): validar teléfono chileno`.
PR #37 — `fix(personas): formatear y validar RUT chileno`.

### Prioridad
Mejora futura de integridad de datos y arquitectura. El objetivo es asegurar que las mismas reglas se cumplan tanto desde la interfaz NEXOKLAR como desde futuras integraciones vía API.


---

## 2026-09-23 — Código de invitación personalizado por empresa

### Mejora
Reemplazar el código de invitación global obtenido desde un secreto/configuración de AWS por códigos de invitación administrados por NEXOKLAR y asociados explícitamente a cada empresa o proceso de alta.

### Situación actual
El registro de una nueva empresa requiere un código de invitación. Actualmente la validación depende de un valor global configurado como secreto en la infraestructura AWS.

Este mecanismo permite restringir el registro, pero no identifica para qué empresa fue emitida cada invitación ni permite administrar su ciclo de vida desde NEXOKLAR.

### Evolución propuesta
Incorporar una entidad de invitación persistida en la aplicación, generada desde una función administrativa de NEXOKLAR.

Cada invitación debería contemplar al menos:

- Código/token único y no predecible.
- Empresa o prospecto al que está asociada.
- Estado: pendiente, utilizada, vencida o revocada.
- Fecha de creación.
- Fecha de expiración.
- Usuario administrador que la generó.
- Fecha de utilización.
- Empresa/tenant creado a partir de la invitación.
- Uso único por defecto.

El código no debería almacenarse en texto plano cuando no sea necesario. Preferir almacenar un hash verificable del token y mostrar el valor original únicamente al momento de generarlo.

### Flujo propuesto

```text
Administrador NEXOKLAR
        ↓
Generar invitación
        ↓
Código único asociado a empresa/prospecto
        ↓
Cliente recibe código
        ↓
Crear empresa
        ↓
Backend valida invitación
        ↓
Crea tenant + administrador
        ↓
Invitación queda UTILIZADA
```

La validación debe realizarse en backend y de forma atómica con el alta, evitando que dos solicitudes puedan reutilizar simultáneamente la misma invitación.

### Administración
Incorporar posteriormente una vista de administración que permita:

- generar una invitación;
- copiar/entregar el código;
- consultar a qué empresa corresponde;
- revisar fecha y estado;
- revocar una invitación pendiente;
- regenerar/reemplazar una invitación;
- revisar trazabilidad de utilización.

### Consideraciones de seguridad
- No utilizar un código global compartido entre clientes.
- No exponer el secreto/token completo en logs.
- Definir expiración configurable.
- Invalidar el código después de su uso.
- Aplicar rate limiting a los intentos de validación.
- Registrar auditoría de creación, revocación y utilización.
- Mantener los secretos de infraestructura AWS para credenciales técnicas; las invitaciones de negocio deben administrarse como datos de aplicación.

### Componentes involucrados
- Flujo público **Crear empresa**.
- Endpoint de registro/autenticación del backend.
- Persistencia de invitaciones.
- Administración NEXOKLAR de clientes/altas.
- Auditoría.
- Notificaciones futuras para enviar la invitación al contacto de la empresa.

### Origen
PR #34 — `feat(onboarding): reforzar aprobación y acceso de clientes`.

### Prioridad
Mejora de onboarding, seguridad y trazabilidad. Sustituir el código de invitación global de infraestructura por invitaciones individuales administrables por empresa.


---

## 2026-09-23 — Mantener visible la opción activa del Sidebar

### Mejora
Hacer que el Sidebar mantenga automáticamente visible la opción correspondiente a la pantalla/ruta actualmente activa, ajustando su posición de scroll cuando sea necesario.

### Situación actual
Cuando el menú lateral contiene más opciones que el alto disponible y el usuario navega hacia una pantalla ubicada fuera de la zona visible, el Sidebar puede conservar una posición de scroll que deja fuera de vista la opción activa.

Esto reduce la orientación del usuario dentro de la estructura de NEXOKLAR, especialmente en resoluciones menores o en módulos ubicados hacia el final del menú.

### Comportamiento esperado
Cada vez que cambie la ruta activa:

1. Identificar el elemento del Sidebar correspondiente a la pantalla actual.
2. Mantener su estado visual de selección/focus.
3. Si el elemento activo no está completamente visible dentro del área desplazable del Sidebar, hacer scroll automático hasta mostrarlo.
4. Evitar movimientos innecesarios cuando la opción ya se encuentre visible.
5. Preferir un desplazamiento suave siempre que no afecte accesibilidad o preferencias de movimiento reducido.

### Ejemplo

```text
Sidebar con scroll
│
├─ Inicio
├─ Clientes
├─ Contratos
│   ...
│
│   ← zona visible
│
├─ Cumplimiento
├─ Reportes        ← ruta activa, inicialmente fuera de vista
└─ Configuración

Usuario entra a /app/reportes
        ↓
Sidebar detecta Reportes como activo
        ↓
scroll automático
        ↓
Reportes queda visible y seleccionado
```

### Consideraciones de implementación
- Resolverlo en el componente global del Sidebar y no individualmente por página.
- Utilizar la ruta activa como fuente de verdad.
- Considerar rutas hijas: una pantalla hija debe mantener visible y activa su opción/módulo padre cuando corresponda.
- No alterar el scroll del contenido principal de la página.
- No forzar el Sidebar al inicio en cada navegación.
- Considerar `scrollIntoView` o lógica equivalente limitada al contenedor del Sidebar.
- Respetar `prefers-reduced-motion`.
- Mantener compatibilidad con módulos ocultos por configuración y permisos.

### Criterios de aceptación
- Al navegar a cualquier pantalla desde una URL directa, la opción correspondiente queda visible en el Sidebar.
- Al navegar mediante acciones internas o enlaces, el Sidebar acompaña la ruta activa.
- Si la opción ya está visible, no se produce un salto de scroll innecesario.
- Las rutas hijas mantienen correctamente visible la sección correspondiente.
- El comportamiento funciona con diferentes alturas de viewport y con menús configurados por módulos/permisos.

### Componentes involucrados
- Sidebar/navegación privada global.
- Router de la aplicación.
- Lógica de rutas activas.
- Configuración de módulos habilitados y permisos.

### Prioridad
Mejora de navegación y experiencia usuaria. No modifica reglas de negocio.
