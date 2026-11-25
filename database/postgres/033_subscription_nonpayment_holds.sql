-- Explicit commercial holds for non-payment. They never change a contract
-- snapshot or the generic tenant status: access derives from the active hold.
CREATE TABLE IF NOT EXISTS subscription_nonpayment_holds (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 subscription_id uuid NOT NULL,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 2000),
 billing_reference text NOT NULL CHECK(length(trim(billing_reference)) BETWEEN 3 AND 500),
 effective_at timestamptz NOT NULL,
 created_by uuid NOT NULL REFERENCES app_users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 suspension_idempotency_key text NOT NULL CHECK(length(suspension_idempotency_key) BETWEEN 8 AND 160),
 suspension_payload_hash text NOT NULL CHECK(length(suspension_payload_hash)=64),
 released_at timestamptz,
 released_by uuid REFERENCES app_users(id),
 reactivation_reason text CHECK(reactivation_reason IS NULL OR length(trim(reactivation_reason)) BETWEEN 3 AND 2000),
 regularization_reference text CHECK(regularization_reference IS NULL OR length(trim(regularization_reference)) BETWEEN 3 AND 500),
 reactivation_idempotency_key text CHECK(reactivation_idempotency_key IS NULL OR length(reactivation_idempotency_key) BETWEEN 8 AND 160),
 reactivation_payload_hash text CHECK(reactivation_payload_hash IS NULL OR length(reactivation_payload_hash)=64),
 updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(subscription_id,tenant_id) REFERENCES subscription_contracts(id,tenant_id) ON DELETE CASCADE,
 CHECK((released_at IS NULL AND released_by IS NULL AND reactivation_reason IS NULL AND regularization_reference IS NULL AND reactivation_idempotency_key IS NULL AND reactivation_payload_hash IS NULL)
   OR (released_at IS NOT NULL AND released_by IS NOT NULL AND reactivation_reason IS NOT NULL AND regularization_reference IS NOT NULL AND reactivation_idempotency_key IS NOT NULL AND reactivation_payload_hash IS NOT NULL)),
 CHECK(released_by IS NULL OR released_by<>created_by)
);

CREATE UNIQUE INDEX IF NOT EXISTS subscription_nonpayment_holds_suspension_idempotency
 ON subscription_nonpayment_holds(tenant_id,suspension_idempotency_key);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_nonpayment_holds_reactivation_idempotency
 ON subscription_nonpayment_holds(tenant_id,reactivation_idempotency_key)
 WHERE reactivation_idempotency_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subscription_nonpayment_holds_one_open
 ON subscription_nonpayment_holds(tenant_id,subscription_id)
 WHERE released_at IS NULL;
CREATE INDEX IF NOT EXISTS subscription_nonpayment_holds_history
 ON subscription_nonpayment_holds(tenant_id,subscription_id,created_at DESC);

ALTER TABLE subscription_nonpayment_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_nonpayment_holds FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_subscription_nonpayment_isolation ON subscription_nonpayment_holds;
CREATE POLICY tenant_subscription_nonpayment_isolation ON subscription_nonpayment_holds
 USING (tenant_id::text=current_setting('app.current_tenant_id',true) OR current_setting('app.subscription_admin',true)='true')
 WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true) OR current_setting('app.subscription_admin',true)='true');
