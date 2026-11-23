-- Subscription-only delegation preserves the existing authentication roles.
CREATE TABLE IF NOT EXISTS subscription_operator_profiles (
 tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
 profile text NOT NULL CHECK(profile IN ('COMMERCIAL','OPERATIONS')),
 granted_by uuid NOT NULL REFERENCES app_users(id), granted_at timestamptz NOT NULL DEFAULT now(),
 revoked_by uuid REFERENCES app_users(id), revoked_at timestamptz,
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 2000),
 updated_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(tenant_id,user_id)
);
CREATE TABLE IF NOT EXISTS subscription_governance_policies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('CANCELLATION','RETENTION')), version integer NOT NULL CHECK(version>0),
 status text NOT NULL CHECK(status IN ('DRAFT','APPROVED')),
 notice_days integer CHECK(notice_days BETWEEN 0 AND 36500),
 retention_days integer CHECK(retention_days BETWEEN 0 AND 36500),
 reference text NOT NULL DEFAULT '' CHECK(length(reference)<=2000),
 reason text NOT NULL CHECK(length(trim(reason)) BETWEEN 3 AND 2000),
 automatic_deletion boolean NOT NULL DEFAULT false CHECK(automatic_deletion=false),
 created_by uuid NOT NULL REFERENCES app_users(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(tenant_id,kind,version),
 CHECK(status<>'APPROVED' OR (length(trim(reference))>=3 AND
   ((kind='CANCELLATION' AND notice_days IS NOT NULL) OR (kind='RETENTION' AND retention_days IS NOT NULL))))
);
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['subscription_operator_profiles','subscription_governance_policies'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('DROP POLICY IF EXISTS subscription_governance_isolation ON %I',tab);
  EXECUTE format('CREATE POLICY subscription_governance_isolation ON %I USING (tenant_id::text=current_setting(''app.current_tenant_id'',true)) WITH CHECK (tenant_id::text=current_setting(''app.current_tenant_id'',true))',tab);
 END LOOP;
END $$;
