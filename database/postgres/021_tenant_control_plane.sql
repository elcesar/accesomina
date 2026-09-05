-- Nexo Klar - Centro de control SaaS por empresa (tenant).
CREATE TABLE IF NOT EXISTS tenant_commercial_profiles (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  plan_code TEXT NOT NULL DEFAULT 'esencial' CHECK (plan_code IN ('esencial','gestion','operaciones','integral')),
  monthly_price_clp NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (monthly_price_clp >= 0),
  setup_price_clp NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (setup_price_clp >= 0),
  included_users INTEGER NOT NULL DEFAULT 3 CHECK (included_users >= 1),
  included_workers INTEGER NOT NULL DEFAULT 30 CHECK (included_workers >= 0),
  storage_limit_mb INTEGER NOT NULL DEFAULT 1024 CHECK (storage_limit_mb >= 0),
  enabled_modules JSONB NOT NULL DEFAULT '[]'::jsonb,
  payment_status TEXT NOT NULL DEFAULT 'cortesia' CHECK (payment_status IN ('al_dia','por_vencer','vencido','cortesia')),
  renewal_date DATE,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent BETWEEN 0 AND 100),
  billing_contact TEXT NOT NULL DEFAULT '',
  account_owner TEXT NOT NULL DEFAULT '',
  lifecycle_status TEXT NOT NULL DEFAULT 'activo' CHECK (lifecycle_status IN ('activo','cortesia','suspension_programada','solo_lectura','baja_programada','cerrado')),
  suspension_reason TEXT NOT NULL DEFAULT '',
  grace_until DATE,
  read_only_until DATE,
  offboarding_at DATE,
  onboarding_step INTEGER NOT NULL DEFAULT 1 CHECK (onboarding_step BETWEEN 1 AND 7),
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
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
  owner TEXT NOT NULL DEFAULT '',
  due_at TIMESTAMPTZ,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_support_open ON tenant_support_tickets(tenant_id,status,severity,created_at DESC);
INSERT INTO tenant_commercial_profiles(tenant_id) SELECT id FROM tenants ON CONFLICT(tenant_id) DO NOTHING;

ALTER TABLE tenant_commercial_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_support_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_commercial_profiles_policy ON tenant_commercial_profiles;
CREATE POLICY tenant_commercial_profiles_policy ON tenant_commercial_profiles USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
DROP POLICY IF EXISTS tenant_support_tickets_policy ON tenant_support_tickets;
CREATE POLICY tenant_support_tickets_policy ON tenant_support_tickets USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
ALTER TABLE tenant_commercial_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE tenant_support_tickets FORCE ROW LEVEL SECURITY;
