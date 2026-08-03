-- Nexo Klar - dispatch, profitability and real inventory backbone.
-- Normalized tables for field-service style planning, operational costing,
-- multi-warehouse inventory, immutable movements, approvals and notifications.

CREATE TABLE IF NOT EXISTS dispatch_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES commercial_contracts(id) ON DELETE SET NULL,
  mine_id UUID REFERENCES mines(id) ON DELETE SET NULL,
  scheduled_date DATE NOT NULL,
  scheduled_end DATE,
  view_zone TEXT,
  status TEXT NOT NULL DEFAULT 'planificado' CHECK (status IN ('planificado','convocando','movilizando','en_ejecucion','observado','cerrado','cancelado')),
  required_workers INTEGER NOT NULL DEFAULT 0,
  required_specialties JSONB NOT NULL DEFAULT '[]'::jsonb,
  gap_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dispatch_resource_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  dispatch_id UUID REFERENCES dispatch_schedules(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  vehicle_id UUID,
  hotel_assignment_id UUID,
  role_required TEXT,
  shift_name TEXT,
  status TEXT NOT NULL DEFAULT 'asignado' CHECK (status IN ('asignado','movilizando','en_faena','reasignado','baja','cerrado')),
  assigned_from TIMESTAMPTZ,
  assigned_to TIMESTAMPTZ,
  assigned_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id, worker_id) DEFERRABLE INITIALLY IMMEDIATE
);

CREATE TABLE IF NOT EXISTS project_financial_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mine_id UUID REFERENCES mines(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES commercial_contracts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  cost_center TEXT,
  initial_budget_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  projected_billing_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  purchase_orders JSONB NOT NULL DEFAULT '[]'::jsonb,
  real_hours NUMERIC(12,2) NOT NULL DEFAULT 0,
  hourly_rate_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  hotel_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  epp_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  epp_lifecycle_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  vehicle_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  tools_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  labor_cost_clp NUMERIC(14,2) GENERATED ALWAYS AS (real_hours * hourly_rate_clp) STORED,
  total_cost_clp NUMERIC(14,2) GENERATED ALWAYS AS (hotel_cost_clp + epp_cost_clp + epp_lifecycle_cost_clp + vehicle_cost_clp + tools_cost_clp + (real_hours * hourly_rate_clp)) STORED,
  margin_clp NUMERIC(14,2) GENERATED ALWAYS AS (projected_billing_clp - (hotel_cost_clp + epp_cost_clp + epp_lifecycle_cost_clp + vehicle_cost_clp + tools_cost_clp + (real_hours * hourly_rate_clp))) STORED,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, project_id)
);

CREATE TABLE IF NOT EXISTS inventory_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  zone TEXT,
  address TEXT,
  responsible_user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('epp','herramienta','equipo_critico','vehiculo','insumo','otro')),
  code TEXT,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unidad',
  unit_cost_clp NUMERIC(14,2) NOT NULL DEFAULT 0,
  useful_life_days INTEGER,
  minimum_stock NUMERIC(12,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_stock_by_location (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, item_id, warehouse_id)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES inventory_warehouses(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrega','devolucion','reposicion','perdida','dano','ajuste','transferencia')),
  quantity NUMERIC(12,2) NOT NULL CHECK (quantity > 0),
  stock_before NUMERIC(12,2),
  stock_after NUMERIC(12,2),
  signed BOOLEAN NOT NULL DEFAULT FALSE,
  evidence_file_id UUID REFERENCES file_objects(id) ON DELETE SET NULL,
  reason TEXT,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS immutable_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_hash TEXT,
  new_hash TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mandante_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mine_id UUID REFERENCES mines(id) ON DELETE CASCADE,
  contract_id UUID REFERENCES commercial_contracts(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pendiente','observado','rechazado','aprobado','pase_emitido')),
  comment TEXT,
  reviewed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  evidence_file_id UUID REFERENCES file_objects(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  related_entity_type TEXT,
  related_entity_id TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp','sistema','webhook')),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','enviado','leido','error','cancelado')),
  provider_message_id TEXT,
  error_message TEXT,
  scheduled_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_schedules_scope ON dispatch_schedules(tenant_id,mine_id,contract_id,project_id,scheduled_date,status);
CREATE INDEX IF NOT EXISTS idx_dispatch_resource_assignments_project ON dispatch_resource_assignments(tenant_id,project_id,status);
CREATE INDEX IF NOT EXISTS idx_project_financial_controls_scope ON project_financial_controls(tenant_id,mine_id,contract_id,project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_warehouses_name ON inventory_warehouses(tenant_id,lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_items_name_code ON inventory_items(tenant_id,lower(name),COALESCE(code,''));
CREATE INDEX IF NOT EXISTS idx_inventory_stock_location ON inventory_stock_by_location(tenant_id,warehouse_id,item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_scope ON inventory_movements(tenant_id,item_id,worker_id,project_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_immutable_audit_log_entity ON immutable_audit_log(tenant_id,entity_type,entity_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mandante_approvals_scope ON mandante_approvals(tenant_id,mine_id,contract_id,project_id,status);
CREATE INDEX IF NOT EXISTS idx_notification_events_status ON notification_events(tenant_id,status,scheduled_at);

ALTER TABLE dispatch_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_resource_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_financial_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_by_location ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE immutable_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE mandante_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dispatch_schedules_policy ON dispatch_schedules;
DROP POLICY IF EXISTS dispatch_resource_assignments_policy ON dispatch_resource_assignments;
DROP POLICY IF EXISTS project_financial_controls_policy ON project_financial_controls;
DROP POLICY IF EXISTS inventory_warehouses_policy ON inventory_warehouses;
DROP POLICY IF EXISTS inventory_items_policy ON inventory_items;
DROP POLICY IF EXISTS inventory_stock_by_location_policy ON inventory_stock_by_location;
DROP POLICY IF EXISTS inventory_movements_policy ON inventory_movements;
DROP POLICY IF EXISTS immutable_audit_log_policy ON immutable_audit_log;
DROP POLICY IF EXISTS mandante_approvals_policy ON mandante_approvals;
DROP POLICY IF EXISTS notification_events_policy ON notification_events;

CREATE POLICY dispatch_schedules_policy ON dispatch_schedules USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY dispatch_resource_assignments_policy ON dispatch_resource_assignments USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY project_financial_controls_policy ON project_financial_controls USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY inventory_warehouses_policy ON inventory_warehouses USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY inventory_items_policy ON inventory_items USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY inventory_stock_by_location_policy ON inventory_stock_by_location USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY inventory_movements_policy ON inventory_movements USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY immutable_audit_log_policy ON immutable_audit_log USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY mandante_approvals_policy ON mandante_approvals USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY notification_events_policy ON notification_events USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));

ALTER TABLE dispatch_schedules FORCE ROW LEVEL SECURITY;
ALTER TABLE dispatch_resource_assignments FORCE ROW LEVEL SECURITY;
ALTER TABLE project_financial_controls FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_warehouses FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_items FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_by_location FORCE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements FORCE ROW LEVEL SECURITY;
ALTER TABLE immutable_audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE mandante_approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE notification_events FORCE ROW LEVEL SECURITY;
