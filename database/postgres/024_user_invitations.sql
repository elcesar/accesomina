-- Primer acceso: sólo se conserva el hash del enlace vigente de cada usuario.
CREATE TABLE IF NOT EXISTS user_invitations (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','accepted')),
  expires_at TIMESTAMPTZ NOT NULL,
  last_sent_at TIMESTAMPTZ,
  failure_code TEXT CHECK (failure_code IN ('SMTP_NOT_CONFIGURED','SMTP_AUTH_FAILED','SMTP_CONNECTION_FAILED','DELIVERY_FAILED')),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_tenant ON user_invitations(tenant_id,user_id);
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_user_invitations_policy ON user_invitations;
CREATE POLICY tenant_user_invitations_policy ON user_invitations
  USING (tenant_id::text=current_setting('app.current_tenant_id',true))
  WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
ALTER TABLE user_invitations FORCE ROW LEVEL SECURITY;
