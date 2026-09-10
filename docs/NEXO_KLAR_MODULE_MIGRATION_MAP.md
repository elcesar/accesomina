# Nexo Klar — Mapa de módulos, dependencias y migración

**Estado:** Fases 0 a 4 cerradas · Fase 5 en curso  
**Actualizado:** 10 de septiembre de 2026  
**Objetivo:** mantener una referencia única del orden de modernización de Nexo Klar, el alcance de cada fase, ownership de datos, dependencias y criterios de cierre.

## 1. Principios obligatorios

1. **Fuente funcional antes que wrapper.** Cada dato de negocio debe tener un módulo dueño. Los wrappers y orquestadores consumen, relacionan, resumen y navegan; no crean modelos paralelos.
2. **Una fuente de verdad por dominio.** Durante la migración se permite leer claves legacy, pero cada módulo especializado debe converger a una única fuente canónica de escritura.
3. **No renombrar legacy sin mapear consumidores.** Antes de cambiar `minas`, `minaId`, `mantenciones`, `mantId`, `proyectos`, `eppEntregas` u otras claves estructurales se identifican todos sus lectores, escritores y relaciones.
4. **Especialización progresiva.** `PrivateModulePage`, `ModuleWorkspacePage` y `OperationalWorkspacePage` son infraestructura legacy/transitoria; sirven para recuperar reglas y origen, no como nuevas fuentes funcionales.
5. **Orquestadores al final.** Gestión de personal por proyecto, Centro Operativo, Alertas y Dashboard se estabilizan después de sus módulos fuente.
6. **Sin refactor global incidental.** Cada cambio se limita al módulo objetivo y sus dependencias directas.
7. **Design System transversal.** `tokens.css → components.css → CSS específico → JSX`.
8. **Producción React actual primero.** No existe ni se mantiene una arquitectura HTML paralela, fallback HTML o backup funcional HTML.
9. **Referencia antes de rediseño.** Antes de construir o modernizar una Page se revisan los archivos de referencia para recuperar campos, reglas, relaciones y flujos existentes.
10. **Libro de Obra al final.** Todo lo asociado a Libro de Obra, incluyendo firma vinculada a ese flujo, queda despriorizado hasta terminar las fases principales.

## 2. Golden rule por cambio

Toda actualización debe responder:

1. ¿Cuál es el módulo dueño del dato?
2. ¿Cuál es su fuente canónica actual?
3. ¿Qué fuentes legacy quedan solo como lectura?
4. ¿Qué módulos dependen de esta fuente?
5. ¿El cambio agrega lógica funcional o solo orquestación?

Si alguna respuesta no está clara, no se implementa hasta mapear la dependencia.

## 3. Persistencia y claves estructurales

Producción reconstruye `/api/state` desde `tenant_module_state`, donde cada `module_key` mantiene JSONB y versión. Las escrituras se realizan mediante `/api/state/modules` usando `moduleVersions` real, validación transversal y auditoría.

### Claves críticas actualmente confirmadas

- **Clientes:** `minas` es la fuente estructural/canónica actual de escritura; `clientes` puede existir como fallback de lectura. Las relaciones actuales utilizan `minaId`.
- **Contratos:** `contratos` es fuente funcional; relación con Cliente mediante `minaId`.
- **Órdenes de servicio:** `mantenciones` es fuente canónica actual de escritura; `proyectos` queda como fallback legacy de lectura. Relaciones mediante `mantId`; contratos mediante `contratoId`.
- **Personas:** `trabajadores`.
- **Turnos:** `turnos`, con asistencia incorporada al registro de jornada.
- **Formación y Exámenes:** nuevos registros en `trabajadores[].workerItems`; `cursos` y `examenes` quedan como lectura legacy.
- **Salud Ocupacional:** `protocolosSalud`.
- **EPP:** `eppDeliveries`; `eppEntregas` queda como lectura legacy.
- **Restricciones:** `restricted`, sincronizado con `trabajadores.bloqueado` y disponibilidad.

Que una clave sea **canónica actual** no significa que su nombre sea definitivo. Significa que es la fuente oficial de escritura durante esta etapa y que no se alimentan dos modelos en paralelo. La eliminación o renombre de claves legacy estructurales se reserva para Fase 15.

## 4. Dependencia funcional principal

```text
Cliente
  └── Contrato
        └── Orden de servicio
              ├── Personas / asignaciones / turnos
              ├── Comunicaciones y convocatorias
              ├── Flota y equipos móviles
              ├── Alojamientos y estadías
              ├── Credenciales de acceso
              ├── Recursos / inventario
              └── Cumplimiento
```

Los módulos posteriores deben reutilizar estas relaciones y no crear entidades paralelas para Cliente, Contrato, Orden o Persona.

## 5. Plan completo de migración — 15 fases

> La numeración considera **Fase 0** de preparación más **Fases 1–15** de modernización y cierre.

### FASE 0 · Mapa, ownership, legacy y dependencias — ✓ CERRADA

**Objetivo:** entender la arquitectura real antes de modernizar módulos.

**Contenido:**
- mapear rutas y Pages activas;
- identificar wrappers y orquestadores legacy;
- verificar persistencia real del backend;
- identificar fuentes canónicas y fallbacks legacy;
- mapear `minas/minaId`, `mantenciones/mantId` y consumidores;
- fijar la regla de no crear fuentes paralelas;
- establecer la secuencia de migración.

**Resultado:** existe un mapa de ownership y dependencias que guía las fases posteriores.

### FASE 1 · Capital Humano — ✓ CERRADA

**Objetivo:** consolidar Persona como núcleo funcional y estabilizar sus capacidades operacionales.

**Módulos:**
- Personas;
- Turnos y asistencia;
- Protección personal / EPP;
- Formación y certificaciones;
- Exámenes y aptitudes;
- Salud Ocupacional;
- Restringidos.

**Decisiones principales:**
- `trabajadores` es la fuente de Persona;
- `turnos` es canónico y contiene asistencia;
- Formación y Exámenes escriben en `trabajadores[].workerItems`;
- `protocolosSalud` mantiene Salud Ocupacional separada de Exámenes;
- `eppDeliveries` es canónico para entregas EPP;
- `restricted` conserva el historial de restricciones y sincroniza el estado operacional de Persona.

**Estado:** validada, documentada y cerrada.

### FASE 2 · Clientes — ✓ CERRADA

**Objetivo:** estabilizar la ficha comercial del cliente y sus relaciones sin romper `minaId`.

**Contenido:**
- ficha comercial;
- contactos;
- requisitos;
- búsqueda y estados;
- contratos relacionados;
- órdenes de servicio relacionadas;
- navegación entre entidades.

**Decisión:** `minas` continúa como fuente estructural de escritura; `clientes` queda como fallback compatible cuando corresponda. No se realiza todavía el renombre estructural.

**Estado:** validada visual y funcionalmente, documentada y cerrada.

### FASE 3 · Contratos — ✓ CERRADA

**Objetivo:** consolidar la relación Cliente–Contrato y la documentación contractual.

**Contenido:**
- listado y ficha de contrato;
- cliente relacionado por `minaId`;
- vigencia y responsable;
- estados normalizados;
- documento contractual;
- órdenes relacionadas mediante `contratoId`;
- navegación directa entre Cliente, Contrato y Orden.

**Decisión:** `contratos` es la fuente funcional. No se incorpora firma de Libro de Obra en esta fase.

**Estado:** revisada contra referencia, documentada y cerrada.

### FASE 4 · Órdenes de servicio — ✓ CERRADA

**Objetivo:** convertir la Orden de servicio en el eje de preparación y ejecución operacional.

**Contenido:**
- Cliente y Contrato;
- requisitos;
- responsables y fechas;
- asignación y preparación de personas;
- consumo de restricciones, formación, exámenes, salud y EPP;
- recursos asociados;
- evidencia documental;
- cierre operacional.

**Flujo conservado:**

`Crear orden → Completar requisitos → Asignar recursos → Registrar cierre`

**Decisión:** `mantenciones` es fuente canónica actual de escritura; `proyectos` queda como fallback legacy de lectura; `asignaciones.mantId` conserva la relación de personas.

**Estado:** validada visual y funcionalmente, documentada y cerrada.

### FASE 5 · Gestión Operacional — ◐ EN CURSO

**Objetivo:** especializar las capacidades necesarias para ejecutar una Orden de servicio ya estabilizada.

**Módulos y orden de trabajo:**
1. **Comunicaciones y convocatorias**;
2. **Flota y equipos móviles**;
3. **Alojamientos y estadías**;
4. **Credenciales de acceso**.

**Comunicaciones y convocatorias:** debe recuperar el flujo histórico de convocatoria por Orden, especialidades, turno, cupos, elegibilidad, plantilla de mensaje y seguimiento de enviados/respondieron/asignados, sin inventar integraciones externas no soportadas por backend. La referencia original `ComunicacionesPage.jsx` era un wrapper de `ModuleWorkspacePage`; la Page especializada actual lo reemplaza.

**Flota y equipos móviles:** revisar `vehiculos`, `inventoryItems`, disponibilidad y relación con Orden antes de decidir ownership definitivo.

**Alojamientos y estadías:** revisar `hoteles/alojamientos`, relaciones con Cliente, Orden y personas antes de especializar.

**Credenciales de acceso:** revisar `credenciales`, Persona, Cliente y Orden; controlar vigencia/habilitación sin duplicar cumplimiento.

**Fuera de alcance de esta fase:** Libro de Obra / bitácora asociada a ese dominio queda para el final.

### FASE 6 · Terceros / Contratistas — PENDIENTE

**Objetivo:** consolidar empresas colaboradoras y su relación con personas, contratos y operación sin duplicar entidades principales.

**Módulos previstos:**
- Terceros y subcontratos;
- Convenios y contratos de terceros;
- Personas de empresas colaboradoras;
- Habilitaciones y cumplimiento de contratistas;
- Evaluación de desempeño.

**Fuentes de referencia detectadas:** `subcontratos`, `contratistas`, `convenios`, `personalContratista`, `habilitaciones`, `evaluaciones`.

**Regla:** no duplicar Persona o Contrato cuando pueda expresarse mediante relación con las entidades ya consolidadas.

### FASE 7 · Cumplimiento — PENDIENTE

**Objetivo:** consolidar requisitos, documentación, habilitación, incidentes y auditoría sobre Cliente–Contrato–Orden–Persona.

**Módulos previstos:**
- Cumplimiento corporativo;
- requisitos del cliente;
- incidentes;
- auditoría.

**Fuentes de referencia:** `empresaDocs/documentosEmpresa`, `acreditacionesMandante/requisitosCliente`, `incidentes`, `auditorias/documentos`.

**Regla:** cumplimiento debe consumir entidades funcionales existentes y no crear una Persona, Cliente u Orden paralela.

### FASE 8 · Inventario / Activos — PENDIENTE

**Objetivo:** consolidar activos, equipos, materiales e inventario y sus eventos de asignación/movimiento.

**Ámbitos previstos:**
- activos e inventario;
- maquinaria;
- equipos e instrumentos;
- herramientas;
- EPP de inventario;
- materiales e insumos;
- bodegas;
- movimientos;
- mantenimiento;
- asignaciones/préstamos.

**Lineamiento:** evaluar `inventoryItems` como dominio común por tipo/categoría y mantener colecciones separadas para eventos/relaciones como movimientos, bodegas, mantenimiento y asignaciones.

### FASE 9 · Prospectos — PENDIENTE

**Objetivo:** modernizar el ciclo previo a Cliente/Contrato sin mezclarlo con la operación ya adjudicada.

**Contenido previsto:**
- prospectos/oportunidades;
- seguimiento comercial;
- conversión o vinculación hacia Cliente y Contrato cuando corresponda.

**Fuente objetivo de referencia:** `prospectos`; `oportunidades` se trata como alias/legacy durante la migración.

**Nota de alcance:** el mapa histórico agrupaba aquí “Prospectos + bitácora operativa”. La bitácora asociada a Libro de Obra se retira del alcance de Fase 9 y queda expresamente despriorizada para el final.

### FASE 10 · Gestión de personal por proyecto — PENDIENTE

**Objetivo:** construir una vista de orquestación de personas por Orden/proyecto utilizando las fuentes funcionales ya estabilizadas.

**Tipo:** ORQUESTADOR.

**Debe consumir:**
- `trabajadores`;
- Órdenes / `mantenciones`;
- `asignaciones`;
- Turnos;
- cumplimiento y preparación de Persona.

**Regla:** no debe convertirse en dueño de `trabajadores` ni crear un modelo paralelo de Persona.

### FASE 11 · Centro Operativo — PENDIENTE

**Objetivo:** entregar una vista transversal de ejecución operacional sobre módulos funcionales consolidados.

**Tipo:** ORQUESTADOR.

**Debe integrar:**
- Órdenes de servicio;
- asignaciones;
- personas;
- recursos;
- comunicaciones;
- flota;
- alojamientos;
- credenciales;
- estados de preparación y ejecución.

**Regla:** el Centro Operativo resume, relaciona y navega; las modificaciones deben delegarse al módulo dueño correspondiente.

### FASE 12 · Alertas — PENDIENTE

**Objetivo:** consolidar alertas operacionales y de cumplimiento derivadas de fuentes funcionales.

**Tipo:** ORQUESTADOR / TRANSVERSAL.

**Contenido:**
- vencimientos;
- bloqueos;
- faltantes;
- riesgos de preparación;
- alertas por Cliente/Contrato/Orden/Persona/recurso.

**Regla:** una alerta referencia el dato fuente; no duplica el estado de negocio que la originó.

### FASE 13 · Dashboard — PENDIENTE

**Objetivo:** consolidar indicadores ejecutivos y operacionales una vez estabilizadas las fuentes que los alimentan.

**Tipo:** ORQUESTADOR de solo lectura/resumen/navegación.

**Contenido:**
- KPIs ejecutivos;
- indicadores operacionales;
- cumplimiento;
- personas y recursos;
- contratos y órdenes;
- navegación hacia el módulo dueño del dato.

**Regla:** Dashboard no crea una fuente paralela para métricas de negocio persistentes que puedan calcularse desde las fuentes funcionales.

### FASE 14 · Gobierno / Administración — PENDIENTE

**Objetivo:** estabilizar capacidades transversales de administración de la plataforma después del modelo funcional principal.

**Contenido previsto:**
- usuarios y roles;
- permisos;
- tenant/empresa;
- configuración;
- privacidad;
- auditoría/bitácora de cambios administrativa;
- importar/exportar;
- administración y gobierno de datos;
- reportes transversales cuando corresponda.

**Regla:** separar gobierno de la lógica funcional de los módulos.

### FASE 15 · Retiro definitivo de aliases y claves legacy — PENDIENTE

**Objetivo:** cerrar la migración eliminando compatibilidades temporales solo cuando no existan consumidores productivos.

**Contenido:**
- inventario final de aliases;
- migración coordinada de datos;
- actualización de frontend y backend;
- retiro de fallbacks de lectura;
- retiro de wrappers genéricos sin consumidores;
- eliminación de claves legacy estructurales cuando sea seguro;
- verificación de integridad de referencias;
- limpieza final de CSS/componentes legacy asociados a Pages reemplazadas.

**Ejemplos a reevaluar en esta fase:** `minas/clientes`, `mantenciones/proyectos/ordenesServicio`, `cursos`, `examenes`, `eppEntregas` y aliases de navegación.

**Condición:** ninguna clave o alias se elimina hasta demostrar que no tiene lectores, escritores, validaciones backend ni datos históricos dependientes.

## 6. Libro de Obra · alcance postergado

Libro de Obra es funcionalidad opcional y se mantiene fuera de la secuencia prioritaria de modernización. Su bitácora, firma y capacidades relacionadas se revisarán **al final**, después de estabilizar las fases funcionales y de gobierno necesarias.

Esta postergación evita introducir dependencias de firma o workflows específicos dentro de Contratos, Órdenes, Comunicaciones u otros módulos antes de que el modelo principal esté consolidado.

## 7. Estado ejecutivo

```text
FASE 0  Mapa, ownership, legacy y dependencias          ✓ CERRADA
FASE 1  Capital Humano                                  ✓ CERRADA
FASE 2  Clientes                                        ✓ CERRADA
FASE 3  Contratos                                       ✓ CERRADA
FASE 4  Órdenes de servicio                             ✓ CERRADA
FASE 5  Gestión Operacional                             ◐ EN CURSO
FASE 6  Terceros / Contratistas                         ○ PENDIENTE
FASE 7  Cumplimiento                                    ○ PENDIENTE
FASE 8  Inventario / Activos                            ○ PENDIENTE
FASE 9  Prospectos                                      ○ PENDIENTE
FASE 10 Gestión de personal por proyecto                ○ PENDIENTE
FASE 11 Centro Operativo                                ○ PENDIENTE
FASE 12 Alertas                                         ○ PENDIENTE
FASE 13 Dashboard                                       ○ PENDIENTE
FASE 14 Gobierno / Administración                       ○ PENDIENTE
FASE 15 Retiro definitivo de aliases y claves legacy    ○ PENDIENTE
```

**Punto actual:** Fase 5 → `Comunicaciones y convocatorias`.

## 8. Criterio de cierre por fase

Una fase no se considera cerrada únicamente porque exista una Page React. Para cerrarla deben cumplirse, según corresponda:

- referencia/origen revisado;
- campos, reglas, relaciones y flujos contrastados;
- fuente canónica y legacy identificadas;
- dependencias verificadas;
- Page especializada alineada al Design System;
- nomenclatura de encabezado consistente con Sidebar;
- fondo/superficies conforme al Design System;
- navegación y creación validadas;
- versionado real utilizado en escrituras;
- validación funcional y visual completada;
- trazabilidad actualizada en `NEXO_KLAR_PAGES_ACTUALIZADAS.md`;
- cierre registrado en este mapa cuando corresponda.

## 9. Checklist obligatorio por módulo

Antes de modificar un módulo:

- [ ] identificar página/ruta activa en producción;
- [ ] revisar Page/arquitectura de referencia;
- [ ] identificar fuente(s) que lee;
- [ ] identificar fuente que escribe;
- [ ] buscar IDs y relaciones relacionadas;
- [ ] clasificar claves legacy vs canónicas;
- [ ] definir módulo dueño;
- [ ] listar dependencias aguas arriba y abajo;
- [ ] confirmar permisos afectados;
- [ ] revisar `tokens.css`, `components.css` y patrones existentes antes de CSS/JSX local;
- [ ] aplicar encabezado universal según Sidebar;
- [ ] mantener `--bg` como lienzo de página y `--surf` para superficies elevadas;
- [ ] mantener compatibilidad de lectura solo cuando sea necesaria;
- [ ] usar `moduleVersions` real en toda escritura modular;
- [ ] no eliminar fallback/wrapper hasta que no queden consumidores;
- [ ] validar visual y funcionalmente antes del cierre.
