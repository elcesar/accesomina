# Fechas operacionales

## Regla canónica

NEXO KLAR distingue dos valores:

- Una fecha de calendario no tiene hora y se conserva como `YYYY-MM-DD`.
- Un evento o auditoría representa un instante y se conserva como UTC ISO-8601.

El día operacional no proviene del navegador. La zona IANA de la empresa, configurada por un administrador en **Configuración de la empresa**, es la referencia. Si una futura orden de servicio incorpora una zona propia, esa zona tendrá precedencia para los cálculos de esa orden; mientras no exista, se aplica la de empresa. El valor inicial y de compatibilidad es `America/Santiago`.

## Vencimientos y visualización

Un vencimiento en el día operacional actual sigue vigente hasta el inicio del día siguiente. Sólo una fecha anterior al día operacional se marca vencida. Esta regla es compartida por indicadores, tablas y filtros.

Los usuarios pueden estar en países distintos: las fechas operacionales y los estados se calculan con la zona de empresa. La zona del navegador se usa sólo para la presentación local cuando una vista lo requiera expresamente, nunca para cambiar estados.

## Libro de obra

Al crear una anotación, la fecha y hora elegida se interpreta en la zona operacional y se convierte a UTC. La zona IANA efectiva queda persistida con la entrada, para interpretar el hecho histórico aunque la configuración de la empresa cambie después.

Las horas inexistentes y las horas repetidas en cambios de horario se rechazan con un mensaje explícito. No se elige un instante de forma silenciosa.

## Datos históricos

No se migra ni reinterpreta información existente. Los campos de fecha pura existentes continúan como `YYYY-MM-DD`; los timestamps ya almacenados siguen siendo instantes UTC. Las entradas históricas sin zona conservada se visualizan con la zona vigente de la empresa.
