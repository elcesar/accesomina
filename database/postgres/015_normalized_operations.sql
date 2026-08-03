-- Nexo Klar - normalized operational backbone for production growth.
-- These tables complement tenant_module_state and make the critical entities queryable,
-- auditable and easier to integrate with BI, ERP, signature, OCR and client portals.

CREATE TABLE IF NOT EXISTS tenant_catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  catalog_key TEXT NOT NULL,
  code TEXT,
  label TEXT NOT NULL,
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requirement_matrix_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mine_id UUID REFERENCES mines(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES commercial_contracts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  worker_type TEXT CHECK (worker_type IN ('permanente','esporadico','subcontrato','vehiculo','empresa')),
  specialty TEXT,
  cargo TEXT,
  requirement_type TEXT NOT NULL,
  requirement_name TEXT NOT NULL,
  critical BOOLEAN NOT NULL DEFAULT TRUE,
  validity_days INTEGER,
  source_norm TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_change_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  reason TEXT,
  old_value JSONB,
  new_value JSONB,
  evidence_file_id UUID REFERENCES file_objects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS worker_operational_status (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('disponible','convocado','en_validacion','contrato_enviado','contrato_firmado','acreditacion_enviada','aprobado','rechazado','en_faena','finalizado','no_habilitado')),
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  block_reason TEXT,
  updated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_id, project_id)
);

CREATE TABLE IF NOT EXISTS operational_entity_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  relation_type TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, source_type, source_id, target_type, target_id, relation_type)
);

CREATE INDEX IF NOT EXISTS idx_requirement_matrix_scope ON requirement_matrix_rules(tenant_id,mine_id,contract_id,project_id,worker_type,specialty,cargo);
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_catalog_items_label ON tenant_catalog_items(tenant_id,catalog_key,lower(label));
CREATE INDEX IF NOT EXISTS idx_entity_change_history_entity ON entity_change_history(tenant_id,entity_type,entity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worker_operational_status_status ON worker_operational_status(tenant_id,status,blocked);
CREATE INDEX IF NOT EXISTS idx_operational_entity_links_source ON operational_entity_links(tenant_id,source_type,source_id);
CREATE INDEX IF NOT EXISTS idx_operational_entity_links_target ON operational_entity_links(tenant_id,target_type,target_id);

ALTER TABLE tenant_catalog_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE requirement_matrix_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE entity_change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_operational_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_entity_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_catalog_items_policy ON tenant_catalog_items;
DROP POLICY IF EXISTS requirement_matrix_rules_policy ON requirement_matrix_rules;
DROP POLICY IF EXISTS entity_change_history_policy ON entity_change_history;
DROP POLICY IF EXISTS worker_operational_status_policy ON worker_operational_status;
DROP POLICY IF EXISTS operational_entity_links_policy ON operational_entity_links;

CREATE POLICY tenant_catalog_items_policy ON tenant_catalog_items USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY requirement_matrix_rules_policy ON requirement_matrix_rules USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY entity_change_history_policy ON entity_change_history USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY worker_operational_status_policy ON worker_operational_status USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY operational_entity_links_policy ON operational_entity_links USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));

ALTER TABLE tenant_catalog_items FORCE ROW LEVEL SECURITY;
ALTER TABLE requirement_matrix_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE entity_change_history FORCE ROW LEVEL SECURITY;
ALTER TABLE worker_operational_status FORCE ROW LEVEL SECURITY;
ALTER TABLE operational_entity_links FORCE ROW LEVEL SECURITY;
