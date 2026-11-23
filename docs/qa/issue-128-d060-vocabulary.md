# Issue #128 — Conciliación de vocabulario D-060 (v1.0)

Fuente normativa recibida: `07 - Tabla de reemplazo de vocabulario v1.0.csv`, 125 filas de términos, con seis columnas: Término, Rótulo actual, Dónde aparece, Reemplazo, Acción, Por qué.

## Criterios de implementación

La columna **Acción** es vinculante: sustituir únicamente los rótulos marcados `reemplazar`, mantener los `conservar` y **no decidir unilateralmente** las filas `decidir`. Un rótulo concreto puede tener tratamiento distinto del término aislado: no aplicar búsquedas y reemplazos globales a código, claves de API, BD, filtros, CSV históricos o expresiones técnicas legítimas.

### Sustituciones de presentación incluidas en este PR

| Fila D-060 | Original | Nuevo rótulo | Pantalla |
| --- | --- | --- | --- |
| 82 | Reportes y datos | Reportes e información | Menú lateral |
| 83 | Importar datos masivos | Importar información masiva | Importación |
| 69 (estados) | Restringido | No habilitado | Dotación por proyecto, cuando indica una inhabilitación |
| 80–95 (criterio) | Datos, en mensajes generales | Información, según contexto | Mensajes de formulario |
| 114 (excepción de contexto) | Datos para gestionar la entrega de protección personal | Información para gestionar la entrega de protección personal | Ficha de persona |

### Términos expresamente conservados

- **Fila 96:** `Privacidad y datos` → **conservar**, incluso si QA R03 lo marcó pendiente.
- **Fila 97:** `Datos personales` → **conservar**.
- **Fila 98:** `datos clínicos` → **conservar**.
- **Filas 26–28 y 68, 78, 114–116:** expresiones de contexto minero, documentos legales o títulos definidos → **conservar**.

### Requieren definición de la mesa (no se reescriben)

- Fila 25: ejemplos con nombres de empresas mineras.
- Fila 65: tipos de empresas colaboradoras.
- Fila 67: subcontrato/subcontratista.

### Discrepancia pendiente de QA

QA R03 solicita eliminar «faena» en Credenciales y Documentación de la empresa. La tabla entregada **no establece un reemplazo genérico de «faena»** y en la fila 46 incluso dispone «Mandantes/faenas» → «Clientes y faenas». Por lo tanto, esa palabra no se elimina automáticamente: QA/producto debe aclarar el contexto de las apariciones adicionales.

### Compatibilidad y aceptación

- Las propiedades `bloqueado`/`restringido`, los códigos de disponibilidad y las rutas permanecen iguales; cambia solo la etiqueta mostrada.
- La fila 70 propone migrar `bloqueado` a `no-habilitado` como **valor de dato**, pero no debe ejecutarse junto con una corrección de textos sin un plan de migración y contratos de API compatible.
- Se preserva la lectura de archivos CSV históricos; coordinar por separado con PR #300 y no duplicar PR #307.
- Este PR implementa y verifica un **primer conjunto de rótulos concretos**, no afirma haber conciliado todos los 111 reemplazos en todas las pantallas. Completar inventario de apariciones y retest productivo antes de cerrar el issue.
