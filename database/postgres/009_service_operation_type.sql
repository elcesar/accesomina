-- Add continuous operation as a supported service type.
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check;
ALTER TABLE projects ADD CONSTRAINT projects_project_type_check CHECK(project_type IN ('parada_planta','mantencion_mayor','shutdown','emergencia','servicio','operacion'));
ALTER TABLE worker_epp_measurements ADD COLUMN IF NOT EXISTS shirt_size TEXT;
ALTER TABLE worker_epp_measurements ADD COLUMN IF NOT EXISTS pants_size TEXT;
