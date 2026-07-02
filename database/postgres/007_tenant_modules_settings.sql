-- Independent module state, per-tenant settings and encrypted integration credentials.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{"modules":{}}'::jsonb;
CREATE TABLE IF NOT EXISTS tenant_module_state (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL CHECK (module_key ~ '^[A-Za-z][A-Za-z0-9_]{0,63}$'),
  version BIGINT NOT NULL DEFAULT 1,
  data JSONB NOT NULL DEFAULT 'null'::jsonb,
  updated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, module_key)
);

INSERT INTO tenant_module_state (tenant_id,module_key,data)
SELECT ts.tenant_id,e.key,e.value FROM tenant_state ts CROSS JOIN LATERAL jsonb_each(ts.state) e
ON CONFLICT (tenant_id,module_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  modules JSONB NOT NULL DEFAULT '{}'::jsonb,
  alerts JSONB NOT NULL DEFAULT '{"warningDays":30,"criticalDays":7}'::jsonb,
  catalogs JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
INSERT INTO tenant_settings(tenant_id) SELECT id FROM tenants ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS tenant_integrations (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK(provider IN ('smtp','whatsapp','signature','erp','accreditation')),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  public_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  encrypted_secret TEXT,
  updated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(tenant_id,provider)
);

ALTER TABLE tenant_module_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_module_state_policy ON tenant_module_state USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY tenant_settings_policy ON tenant_settings USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY tenant_integrations_policy ON tenant_integrations USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));

-- Table owners normally bypass RLS. FORCE keeps tenant isolation active for the application owner too.
ALTER TABLE app_users FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_state FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_module_state FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_integrations FORCE ROW LEVEL SECURITY;
ALTER TABLE file_objects FORCE ROW LEVEL SECURITY;
ALTER TABLE integration_events FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE workers FORCE ROW LEVEL SECURITY;
ALTER TABLE mines FORCE ROW LEVEL SECURITY;
ALTER TABLE commercial_contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE occupational_exams FORCE ROW LEVEL SECURITY;
ALTER TABLE courses FORCE ROW LEVEL SECURITY;
ALTER TABLE projects FORCE ROW LEVEL SECURITY;
ALTER TABLE project_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE hotels FORCE ROW LEVEL SECURITY;
ALTER TABLE hotel_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures FORCE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_callouts FORCE ROW LEVEL SECURITY;
ALTER TABLE audit_results FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_items FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_mines FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_epp_measurements FORCE ROW LEVEL SECURITY;
ALTER TABLE epp_catalog FORCE ROW LEVEL SECURITY;
ALTER TABLE epp_deliveries FORCE ROW LEVEL SECURITY;
