# Flujos completos de relacion comercial y empresas colaboradoras

## Prioridad

P1. Este plan complementa los PR #42 y #46, que cubren dotacion y acciones contextuales, con los flujos completos y la cobertura QA que faltan en Relacion Comercial y Terceros.

## Objetivo

Hacer que Clientes, Contratos, Ordenes de Servicio, Terceros, Convenios, Personas de empresas colaboradoras y Habilitacion se puedan operar de punta a punta con acciones claras, relaciones trazables y validacion de negocio.

## Alcance funcional

- Boton principal de creacion dentro de Personas, Clientes, Contratos y Ordenes, conservando los accesos rapidos globales como atajos.
- Estados vacios que lleven al flujo correcto con el nombre real de la accion.
- Creacion contextual definida en PR #46: Cliente a Contrato/OS y Contrato a OS con datos heredados editables.
- Flujo de terceros y empresas colaboradoras: empresa, convenio, persona, OS, requisito, habilitacion y evidencia.
- Vocabulario consistente en menus, pantallas, rutas, filtros y reportes.
- Cobertura de QA de subcontratos, convenios, personas colaboradoras, habilitacion y evaluacion de desempeno.

## Reglas

1. Las relaciones Cliente -> Contrato -> OS y Empresa colaboradora -> Convenio -> Persona -> OS se conservan y son visibles.
2. Un usuario puede cambiar el contexto heredado antes de guardar, pero no puede guardar una relacion invalida o de otro tenant.
3. La habilitacion de una persona colaboradora consume las mismas reglas de requisitos y estado de los PR #39 y #40.
4. Las acciones deben tener permisos, modulo habilitado y contexto de tenant antes de mostrarse o ejecutarse.

## Criterios de aceptacion

1. Cada modulo comercial tiene accion principal propia y accesos globales coherentes.
2. Cliente, Contrato y OS se crean con relaciones correctas y navegacion de regreso sin perdida de contexto.
3. Una empresa colaboradora puede completar su flujo desde convenio hasta persona habilitada en una OS autorizada.
4. Terminos visibles, rutas y reportes usan el vocabulario definido.
5. Las pruebas E2E validan el flujo principal y rechazan referencias cruzadas, permisos insuficientes y modulos deshabilitados.

## Pruebas requeridas

- Cliente nuevo, contrato asociado y dos OS creadas desde ambos contextos.
- Empresa colaboradora, convenio, persona, documento, requisito y habilitacion en OS.
- Estados vacios y botones propios de los modulos involucrados.
- Usuario sin permiso, tenant distinto y modulo deshabilitado.
- Pruebas de navegador con persistencia, navegacion de vuelta y auditoria.

## Fuera de alcance

No implementa el motor de requisitos ni la planificacion de dotacion; consume los contratos definidos en los PR #39, #40, #41 y #42.
