# Validación previa de carga documental

## Objetivo
Comprobar almacenamiento y antivirus antes de recibir archivos grandes.

## Criterios de aceptación
- Autorización y disponibilidad de infraestructura antes de Multer.
- Errores 503 específicos para servicio no disponible.
- Mantener 413 para exceso de tamaño y 422 para malware.
- Mensaje claro para el usuario y registro técnico correlacionable.

## Pruebas
S3 no configurado, antivirus no disponible, archivo mayor a 25 MB y archivo limpio.
