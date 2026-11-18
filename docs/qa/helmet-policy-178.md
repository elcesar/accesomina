# Casco configurable — decisión y verificación de #178

## Modelo aplicado

- No existe una relación automática entre color y cargo.
- El catálogo de colores pertenece al tenant. Incluye valores iniciales de apoyo y conserva `code` + `label` en cada referencia histórica.
- La política se resuelve por Orden de Servicio (OS), después Cliente/Mandante y finalmente Empresa. Si una persona tiene más de una OS activa, la ficha exige seleccionar el contexto de casco; no reutiliza silenciosamente una OS histórica.
- Sólo se permite **una política activa por alcance** (empresa, cada cliente y cada OS). El servidor rechaza duplicados para que no se elija una regla arbitrariamente.
- La política segura inicial exige color y talla cuando la persona declara que el casco es requerido. Clase/modelo queda desactivado hasta que una política lo habilite.
- Una decisión `No requerido` acepta motivo opcional y no permite guardar atributos de casco.

## Trazabilidad y compatibilidad

- Colores y políticas conservan autor, fecha de creación y última actualización en el servidor; el cambio completo queda además en la auditoría del módulo.
- La persona y la entrega conservan etiqueta histórica junto al código de color. Un color renombrado o inactivado sigue siendo legible en un registro histórico sin reescribirlo.
- El antiguo `casco: "Talla única"` se muestra como dato histórico con aplicabilidad pendiente; nunca se interpreta como una decisión ni se bloquea una corrección no relacionada.
- La pantalla Personas y la ruta general `/state/modules` exigen la decisión Sí/No para toda persona nueva; un ID nuevo que omite casco se rechaza. Los registros históricos existentes continúan legibles. Sólo la importación/restauración administrada marca un casco ausente como `unknown + legacyImport` mediante una autorización interna de servidor: queda pendiente/advisorio, nunca se interpreta como “No requerido”, y el mismo marcador enviado directamente por `/modules` se rechaza.
- Inventario y entrega registran el casco físico (color, talla, clase, marca/modelo, norma/certificación, lote/serie y vencimiento), que se ve también en el historial de la ficha. Una entrega no cambia el requisito de la persona.

## Autorización y alertas

- La edición de catálogo/políticas está disponible en la interfaz sólo para Prevención o administración; el servidor aplica el mismo límite de módulos.
- Alertas, acreditación por cliente, ficha, Personas y Protección EPP consumen el mismo estado de cumplimiento.
- Una decisión pendiente o incompleta genera una advertencia derivada. No bloquea automáticamente la habilitación ni modifica una restricción/manual de acreditación: la severidad/bloqueo futuro requiere una decisión de producto explícita.

## Cobertura automatizada

- Normalización de legados, Sí/No, color/talla obligatorios, precedencia OS/cliente/tenant, colores históricos, entrega física y PATCH de ficha.
- Validación de escritura de módulos mediante `validateTenantState` y su fallback append-only; no se declara como prueba HTTP de `PUT /api/state/modules`.
- Inventario de casco, alertas derivadas, aporte al KPI de acreditación, nombre plural de casco, entrega desde inventario genérico y contexto multi-OS.
