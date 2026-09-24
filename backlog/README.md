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

Esta capa mejora la experiencia del usuario, pero una integración externa, una importación o un consumidor directo de la API puede ingresar datos sin pasar por esos componentes.

### Evolución propuesta
Mantener las responsabilidades separadas y reutilizables entre inputs semánticos globales, servicios/validadores, backend/API y persistencia. El backend debe validar nuevamente los campos antes de persistirlos y utilizar, cuando sea posible, las mismas reglas de dominio o equivalentes server-side.

### Campos iniciales
- **RUT:** normalización, formato admitido y validación del dígito verificador.
- **Teléfono:** normalización, prefijo/código país y estructura válida.
- **Email:** normalización y validación de estructura.

### Componentes involucrados
- Inputs semánticos globales de frontend: `RutInput`, `PhoneInput`, `EmailInput` y futuros componentes equivalentes.
- `nexo-v2/src/services/rut.js`.
- `nexo-v2/src/services/chile-phone.js`.
- Validadores/esquemas del backend.
- Endpoints de creación y modificación de Personas.
- Futuras APIs de integración e importación.

### Origen
PR #35 — `fix(personas): validar teléfono chileno`.
PR #37 — `fix(personas): formatear y validar RUT chileno`.

### Prioridad
Mejora futura de integridad de datos y arquitectura.


---

## 2026-09-23 — Código de invitación personalizado por empresa

### Mejora
Reemplazar el código de invitación global obtenido desde un secreto/configuración de AWS por códigos de invitación administrados por NEXOKLAR y asociados explícitamente a cada empresa o proceso de alta.

### Situación actual
El registro de una nueva empresa requiere un código de invitación. Actualmente la validación depende de un valor global configurado como secreto en la infraestructura AWS.

### Evolución propuesta
Incorporar una entidad de invitación persistida en la aplicación, generada desde una función administrativa de NEXOKLAR. Cada invitación debe contemplar token único, empresa/prospecto, estado, fechas, usuario administrador, trazabilidad y uso único por defecto. La validación debe realizarse en backend y de forma atómica con el alta.

### Consideraciones de seguridad
- No utilizar un código global compartido entre clientes.
- No exponer el secreto/token completo en logs.
- Definir expiración configurable.
- Invalidar el código después de su uso.
- Aplicar rate limiting a los intentos de validación.
- Registrar auditoría de creación, revocación y utilización.

### Componentes involucrados
- Flujo público **Crear empresa**.
- Endpoint de registro/autenticación del backend.
- Persistencia de invitaciones.
- Administración NEXOKLAR de clientes/altas.
- Auditoría.

### Origen
PR #34 — `feat(onboarding): reforzar aprobación y acceso de clientes`.

### Prioridad
Mejora de onboarding, seguridad y trazabilidad.


---

## 2026-09-23 — Mantener visible la opción activa del Sidebar

### Mejora
Hacer que el Sidebar mantenga automáticamente visible la opción correspondiente a la pantalla/ruta actualmente activa, ajustando su posición de scroll cuando sea necesario.

### Situación actual
Cuando el menú lateral contiene más opciones que el alto disponible y el usuario navega hacia una pantalla ubicada fuera de la zona visible, el Sidebar puede conservar una posición de scroll que deja fuera de vista la opción activa.

### Comportamiento esperado
1. Identificar el elemento del Sidebar correspondiente a la pantalla actual.
2. Mantener su estado visual de selección/focus.
3. Si el elemento activo no está completamente visible, hacer scroll automático hasta mostrarlo.
4. Evitar movimientos innecesarios cuando ya se encuentre visible.
5. Respetar preferencias de movimiento reducido.

### Componentes involucrados
- Sidebar/navegación privada global.
- Router de la aplicación.
- Lógica de rutas activas.
- Configuración de módulos habilitados y permisos.

### Prioridad
Mejora de navegación y experiencia usuaria. No modifica reglas de negocio.


---

## 2026-09-24 — Mensajes y errores siempre visibles para el usuario

### Mejora
Estandarizar la presentación de mensajes de error, advertencia, confirmación e información para que aparezcan siempre dentro del área visible del usuario y no queden fuera del viewport.

### Situación actual
En algunos flujos, por ejemplo en el login cuando la contraseña es incorrecta, el mensaje puede renderizarse en una zona inferior de la pantalla que queda fuera de la vista actual. El sistema informa correctamente el problema, pero el usuario puede no percibir el mensaje y asumir que la acción no tuvo respuesta.

### Evolución propuesta
Definir un patrón global de feedback visible para toda la aplicación. Ante una acción que produzca un mensaje relevante, este debe mostrarse en una posición inmediatamente perceptible sin exigir que el usuario haga scroll para encontrarlo.

### Comportamiento esperado
- Los errores de validación o autenticación deben quedar visibles inmediatamente después de la acción.
- Los mensajes no deben aparecer fuera del viewport actual.
- Los errores asociados a un campo deben mantener relación clara con dicho campo cuando corresponda.
- Los mensajes globales deben utilizar un componente/patrón común en NEXOKLAR.
- El usuario debe poder distinguir visualmente error, advertencia, información y éxito.
- La solución debe funcionar en escritorio y resoluciones móviles.
- Considerar accesibilidad: foco, `aria-live`/roles adecuados y lectura por tecnologías de asistencia.

### Ejemplo
En el login, si las credenciales son incorrectas, el mensaje debe ser visible inmediatamente junto al formulario o mediante el mecanismo global definido, sin que el usuario tenga que desplazarse hacia abajo.

### Componentes involucrados
- Login y autenticación.
- Formularios y acciones de guardado.
- Componente global de alertas/notificaciones.
- Layout y manejo de scroll/foco.
- Servicio/API de mensajes y traducción de errores.

### Prioridad
Mejora transversal de experiencia usuaria y accesibilidad. Aplicar como estándar a todos los módulos de NEXOKLAR.


---

## 2026-09-24 — Estandarización responsive global y soporte 1280×800

### Mejora
Definir un estándar responsive transversal para NEXOKLAR, evitando correcciones aisladas por pantalla y asegurando que los componentes globales y módulos se adapten correctamente al ancho y alto disponibles.

### Situación actual
La aplicación no cuenta con un comportamiento responsive global suficientemente consistente para resoluciones intermedias. En una revisión realizada en un proyector con resolución **1280×800** se observaron elementos que se superponen o consumen demasiado espacio.

### Ejemplo observado
En **1280×800**, el header puede quedarse sin espacio suficiente y acciones como **“+ Cliente”** y **“+ Orden de servicio”** pueden superponerse o consumir demasiado ancho. El diseño responsive debe reorganizar, compactar o agrupar estas acciones sin perder accesibilidad ni funcionalidad.

### Evolución propuesta
Definir breakpoints y comportamientos comunes para:

1. **Desktop amplio (>1440 px):** disposición completa.
2. **Desktop compacto (1024–1440 px):** reorganizar acciones, permitir `flex-wrap`, compactar espacios y evitar anchos rígidos. **1280×800 debe quedar explícitamente soportado.**
3. **Tablet:** adaptar navegación, formularios, grillas y acciones a una disposición más compacta.
4. **Móvil:** disposición vertical/colapsable y priorización de acciones esenciales.

Los componentes no deben limitarse a reducir tamaño: cuando el espacio sea insuficiente deben cambiar de disposición de forma controlada.

### Criterios de aceptación
- **1280×800 se considera resolución mínima desktop de aceptación.**
- Ningún label, botón, filtro o acción debe superponerse en esa resolución.
- Las acciones principales deben permanecer visibles y utilizables.
- Headers y barras de acciones pueden pasar a más de una fila o agrupar acciones secundarias cuando falte espacio.
- Tablas/grillas anchas deben usar estrategias controladas como scroll horizontal, columnas secundarias adaptables u otras soluciones sin comprimir contenido hasta hacerlo ilegible.
- Sidebar y contenido principal deben coordinar su ancho disponible; evaluar sidebar compacto/colapsable en resoluciones intermedias.
- Validar como mínimo en **1920×1080, 1440×900, 1280×800, 1024×768 y móvil**.

### Componentes involucrados
- Header global y acciones rápidas.
- Sidebar.
- Layout privado principal.
- Headers de página y barras de acciones.
- Formularios.
- Tablas y grillas.
- Breakpoints/estilos responsive globales.

### Prioridad
Mejora transversal de experiencia usuaria. El objetivo es establecer un estándar responsive de NEXOKLAR y evitar que cada pantalla resuelva independientemente los problemas de espacio.
