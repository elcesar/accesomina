-- POST /tenants is a durable, idempotent platform operation.  The saved
-- response deliberately excludes an administrator's temporary password: a retry
-- may recover the created company, but credentials must be reset through the
-- audited access-recovery flow instead of being stored in plaintext.
CREATE TABLE IF NOT EXISTS tenant_creation_idempotency (
  actor_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL CHECK (char_length(idempotency_key) BETWEEN 8 AND 192),
  payload_hash TEXT NOT NULL CHECK (payload_hash ~ '^[a-f0-9]{64}$'),
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  PRIMARY KEY (actor_user_id,idempotency_key),
  CHECK (response IS NULL OR jsonb_typeof(response)='object')
);

CREATE INDEX IF NOT EXISTS tenant_creation_idempotency_actor_created
  ON tenant_creation_idempotency(actor_tenant_id,created_at DESC);

ALTER TABLE tenant_creation_idempotency ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_creation_idempotency FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_creation_idempotency_actor ON tenant_creation_idempotency;
CREATE POLICY tenant_creation_idempotency_actor ON tenant_creation_idempotency
  USING (
    actor_tenant_id::text=current_setting('app.current_tenant_id',true)
    OR current_setting('app.subscription_admin',true)='true'
  )
  WITH CHECK (
    actor_tenant_id::text=current_setting('app.current_tenant_id',true)
    OR current_setting('app.subscription_admin',true)='true'
  );
