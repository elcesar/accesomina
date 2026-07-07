-- AccesoMina V7 cloud runtime: authentication, versioned state, files and integrations.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS password_salt TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL,
  csrf_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_token_active ON user_sessions(token_hash, expires_at) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS tenant_state (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  version BIGINT NOT NULL DEFAULT 1,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS file_objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0 AND byte_size <= 26214400),
  storage_provider TEXT NOT NULL CHECK (storage_provider IN ('local','s3')),
  storage_key TEXT UNIQUE NOT NULL,
  sha256 TEXT NOT NULL,
  malware_status TEXT NOT NULL DEFAULT 'pending' CHECK (malware_status IN ('pending','clean','blocked','error')),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_files_tenant_entity ON file_objects(tenant_id, entity_type, entity_id) WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS integration_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','failed','disabled')),
  provider_reference TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audit entries are append-only. Even the application role cannot alter history.
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS trg_audit_immutable ON audit_log;
CREATE TRIGGER trg_audit_immutable BEFORE UPDATE OR DELETE ON audit_log
FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- RLS is defense in depth; the API also scopes every query by tenant_id.
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE file_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_app_users ON app_users;
CREATE POLICY tenant_app_users ON app_users USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
DROP POLICY IF EXISTS tenant_state_policy ON tenant_state;
CREATE POLICY tenant_state_policy ON tenant_state USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
DROP POLICY IF EXISTS tenant_files_policy ON file_objects;
CREATE POLICY tenant_files_policy ON file_objects USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
DROP POLICY IF EXISTS tenant_integrations_policy ON integration_events;
CREATE POLICY tenant_integrations_policy ON integration_events USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
DROP POLICY IF EXISTS tenant_audit_policy ON audit_log;
CREATE POLICY tenant_audit_policy ON audit_log USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Expand RLS coverage and require tenant ownership on writes.
ALTER TABLE worker_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_worker_items ON worker_items;
CREATE POLICY tenant_worker_items ON worker_items USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

ALTER TABLE worker_mines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_worker_mines ON worker_mines;
CREATE POLICY tenant_worker_mines ON worker_mines USING (tenant_id::text = current_setting('app.current_tenant_id', true)) WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));

-- Replace the early read-only policies with read/write tenant policies.
DROP POLICY IF EXISTS tenant_workers ON workers;
CREATE POLICY tenant_workers ON workers USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_mines ON mines;
CREATE POLICY tenant_mines ON mines USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_contracts ON commercial_contracts;
CREATE POLICY tenant_contracts ON commercial_contracts USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_documents ON worker_documents;
CREATE POLICY tenant_documents ON worker_documents USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_exams ON occupational_exams;
CREATE POLICY tenant_exams ON occupational_exams USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_courses ON courses;
CREATE POLICY tenant_courses ON courses USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_projects ON projects;
CREATE POLICY tenant_projects ON projects USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_assignments ON project_assignments;
CREATE POLICY tenant_assignments ON project_assignments USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_hotels ON hotels;
CREATE POLICY tenant_hotels ON hotels USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_hotel_assignments ON hotel_assignments;
CREATE POLICY tenant_hotel_assignments ON hotel_assignments USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_signatures ON digital_signatures;
CREATE POLICY tenant_signatures ON digital_signatures USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_callouts ON whatsapp_callouts;
CREATE POLICY tenant_callouts ON whatsapp_callouts USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_audit_results ON audit_results;
CREATE POLICY tenant_audit_results ON audit_results USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));

INSERT INTO tenant_state (tenant_id, state)
SELECT id, jsonb_build_object(
  'empresa', jsonb_build_object('nombre', company_name, 'rut', rut, 'email', admin_email, 'tel', phone),
  'minas','[]'::jsonb,'contratos','[]'::jsonb,'mantenciones','[]'::jsonb,'hoteles','[]'::jsonb,
  'firmas','[]'::jsonb,'libroObras','[]'::jsonb,'callouts','[]'::jsonb,'trabajadores','[]'::jsonb,'asignaciones','[]'::jsonb,
  'hotelAsig','[]'::jsonb,'waGroups','[]'::jsonb,'contractTemplates','[]'::jsonb,'tenantUsers','[]'::jsonb
)
FROM tenants ON CONFLICT (tenant_id) DO NOTHING;
