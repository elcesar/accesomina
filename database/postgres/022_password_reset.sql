-- Recuperación de contraseña: tokens aleatorios, de un solo uso y con vencimiento.
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  requested_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  requested_ip TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_active ON password_reset_tokens(tenant_id,user_id,expires_at DESC) WHERE used_at IS NULL;

ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_password_reset_tokens_policy ON password_reset_tokens;
CREATE POLICY tenant_password_reset_tokens_policy ON password_reset_tokens
  USING (tenant_id::text=current_setting('app.current_tenant_id',true))
  WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
ALTER TABLE password_reset_tokens FORCE ROW LEVEL SECURITY;
