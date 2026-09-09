-- Control comercial y soporte por empresa. Estas tablas respaldan la administración
-- global sin mezclar datos entre clientes.
CREATE TABLE IF NOT EXISTS tenant_commercial_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL DEFAULT 'esencial',
  monthly_price_clp NUMERIC(14,2),
  setup_price_clp NUMERIC(14,2),
  included_users INTEGER NOT NULL DEFAULT 5 CHECK (included_users >= 0),
  included_workers INTEGER NOT NULL DEFAULT 30 CHECK (included_workers >= 0),
  storage_limit_mb INTEGER NOT NULL DEFAULT 1024 CHECK (storage_limit_mb >= 0),
  enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_status TEXT NOT NULL DEFAULT 'al_dia' CHECK (payment_status IN ('al_dia','pendiente','vencido','exento')),
  renewal_date DATE,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  billing_contact TEXT,
  account_owner TEXT,
  lifecycle_status TEXT NOT NULL DEFAULT 'activo' CHECK (lifecycle_status IN ('activo','solo_lectura','cerrado')),
  suspension_reason TEXT,
  grace_until TIMESTAMPTZ,
  read_only_until TIMESTAMPTZ,
  offboarding_at TIMESTAMPTZ,
  onboarding_step INTEGER NOT NULL DEFAULT 1 CHECK (onboarding_step >= 1),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tenant_support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  severity TEXT NOT NULL DEFAULT 'media' CHECK (severity IN ('baja','media','alta','critica')),
  status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','en_progreso','esperando_cliente','resuelto','cerrado')),
  owner TEXT,
  due_at TIMESTAMPTZ,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_support_tickets_open
  ON tenant_support_tickets(tenant_id, status, created_at DESC);

ALTER TABLE tenant_commercial_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_commercial_profiles_policy ON tenant_commercial_profiles;
CREATE POLICY tenant_commercial_profiles_policy ON tenant_commercial_profiles
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
ALTER TABLE tenant_commercial_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE tenant_support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_support_tickets_policy ON tenant_support_tickets;
CREATE POLICY tenant_support_tickets_policy ON tenant_support_tickets
  USING (tenant_id::text = current_setting('app.current_tenant_id', true))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant_id', true));
ALTER TABLE tenant_support_tickets FORCE ROW LEVEL SECURITY;
