-- Opt-in subscriptions. Existing tenants and their commercial profiles are unchanged.
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_managed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_services JSONB NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS subscription_plan_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL CHECK(code IN('FREE','LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY')),
 version integer NOT NULL CHECK(version>0), name text NOT NULL, monthly_price numeric(14,0) NOT NULL CHECK(monthly_price>=0),
 currency text NOT NULL DEFAULT 'CLP' CHECK(currency='CLP'), tax_rate numeric(6,4) NOT NULL DEFAULT .19 CHECK(tax_rate>=0 AND tax_rate<=1),
 worker_limit integer NOT NULL CHECK(worker_limit>0 AND worker_limit<=1000000), trial_months integer NOT NULL DEFAULT 0 CHECK(trial_months BETWEEN 0 AND 120),
 grace_days integer NOT NULL DEFAULT 30 CHECK(grace_days BETWEEN 0 AND 365),warning_percent integer NOT NULL DEFAULT 80,critical_percent integer NOT NULL DEFAULT 90,
 allowed_upgrade_targets text[] NOT NULL DEFAULT '{}' CHECK(allowed_upgrade_targets <@ ARRAY['LA_UNION','PURRANQUE','FRUTILLAR','PUERTO_OCTAY']::text[]),
 state text NOT NULL DEFAULT 'DRAFT' CHECK(state IN('DRAFT','PUBLISHED','RETIRED')), public_visible boolean NOT NULL DEFAULT true,
 recommended boolean NOT NULL DEFAULT false, display_order integer NOT NULL, description text NOT NULL DEFAULT '',
 features jsonb NOT NULL DEFAULT '{"allCore":true,"separateServices":["libroObra","oportunidades"]}',
 created_by uuid REFERENCES app_users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 UNIQUE(code,version), CHECK((code='FREE' AND monthly_price=0 AND trial_months=6) OR (code<>'FREE' AND trial_months=0)),
 CHECK(warning_percent>=0 AND warning_percent<critical_percent AND critical_percent<100)
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_plan_published ON subscription_plan_versions(code) WHERE state='PUBLISHED';
CREATE TABLE IF NOT EXISTS subscription_package_versions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL CHECK(code IN('EXTRA_100','EXTRA_200','EXTRA_500')),
 version integer NOT NULL CHECK(version>0), name text NOT NULL, workers_quantity integer NOT NULL CHECK(workers_quantity IN(100,200,500)),
 monthly_price numeric(14,0) NOT NULL CHECK(monthly_price>0), currency text NOT NULL DEFAULT 'CLP' CHECK(currency='CLP'),
 tax_rate numeric(6,4) NOT NULL DEFAULT .19 CHECK(tax_rate>=0 AND tax_rate<=1), stackable boolean NOT NULL DEFAULT true,
 repeatable boolean NOT NULL DEFAULT false, max_quantity integer NOT NULL DEFAULT 1 CHECK(max_quantity BETWEEN 1 AND 1000),
 state text NOT NULL DEFAULT 'DRAFT' CHECK(state IN('DRAFT','PUBLISHED','RETIRED')), display_order integer NOT NULL DEFAULT 0,
 created_by uuid REFERENCES app_users(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz,
 UNIQUE(code,version), CHECK(repeatable OR max_quantity=1)
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_package_published ON subscription_package_versions(code) WHERE state='PUBLISHED';

INSERT INTO subscription_plan_versions(code,version,name,monthly_price,worker_limit,trial_months,display_order,state,published_at)
VALUES('FREE',1,'Free',0,15,6,1,'PUBLISHED',now()),('LA_UNION',1,'La Unión',1000,60,0,2,'PUBLISHED',now()),
 ('PURRANQUE',1,'Purranque',2000,180,0,3,'PUBLISHED',now()),('FRUTILLAR',1,'Frutillar',3000,360,0,4,'PUBLISHED',now()),
 ('PUERTO_OCTAY',1,'Puerto Octay',4000,720,0,5,'PUBLISHED',now()) ON CONFLICT(code,version) DO NOTHING;
UPDATE subscription_plan_versions SET grace_days=0 WHERE code='FREE' AND version=1;
UPDATE subscription_plan_versions SET allowed_upgrade_targets=CASE code WHEN 'FREE' THEN ARRAY['LA_UNION'] WHEN 'LA_UNION' THEN ARRAY['PURRANQUE'] WHEN 'PURRANQUE' THEN ARRAY['FRUTILLAR'] WHEN 'FRUTILLAR' THEN ARRAY['PUERTO_OCTAY'] ELSE '{}'::text[] END WHERE version=1;
INSERT INTO subscription_package_versions(code,version,name,workers_quantity,monthly_price,state,published_at,display_order)
VALUES('EXTRA_100',1,'100 trabajadores adicionales',100,50000,'PUBLISHED',now(),1),
 ('EXTRA_200',1,'200 trabajadores adicionales',200,100000,'PUBLISHED',now(),2),
 ('EXTRA_500',1,'500 trabajadores adicionales',500,300000,'PUBLISHED',now(),3) ON CONFLICT(code,version) DO NOTHING;

CREATE TABLE IF NOT EXISTS subscription_contracts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 plan_version_id uuid NOT NULL REFERENCES subscription_plan_versions(id),plan_code text NOT NULL,
 snapshot jsonb NOT NULL, starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,grace_ends_at timestamptz NOT NULL,
 timezone text NOT NULL DEFAULT 'America/Santiago',anchor_day integer NOT NULL CHECK(anchor_day BETWEEN 1 AND 31),
 status text NOT NULL DEFAULT 'ACTIVE' CHECK(status IN('ACTIVE','GRACE_PERIOD','SUSPENDED')),is_current boolean NOT NULL DEFAULT true,
 current_period_id uuid,created_by uuid REFERENCES app_users(id) ON DELETE SET NULL,created_at timestamptz NOT NULL DEFAULT now(),
 CHECK(ends_at>starts_at),CHECK(grace_ends_at>=ends_at), UNIQUE(id,tenant_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_contract_current ON subscription_contracts(tenant_id) WHERE is_current;
CREATE TABLE IF NOT EXISTS subscription_periods (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 subscription_id uuid NOT NULL,snapshot jsonb NOT NULL,starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,
 grace_ends_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(subscription_id,tenant_id) REFERENCES subscription_contracts(id,tenant_id) ON DELETE CASCADE,
 UNIQUE(id,tenant_id),CHECK(ends_at>starts_at),CHECK(grace_ends_at>=ends_at)
);
CREATE TABLE IF NOT EXISTS subscription_contract_packages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 subscription_id uuid NOT NULL,package_version_id uuid NOT NULL REFERENCES subscription_package_versions(id),
 code text NOT NULL,quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 1000),workers_quantity integer NOT NULL CHECK(workers_quantity>0),
 monthly_price numeric(14,0) NOT NULL CHECK(monthly_price>0),snapshot jsonb NOT NULL,
 starts_at timestamptz NOT NULL,ends_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(subscription_id,tenant_id) REFERENCES subscription_contracts(id,tenant_id) ON DELETE CASCADE,
 UNIQUE(subscription_id,code),CHECK(ends_at>starts_at)
);
CREATE TABLE IF NOT EXISTS subscription_free_benefits (
 company_fingerprint text PRIMARY KEY,tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
 started_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS subscription_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 type text NOT NULL CHECK(type IN('INITIAL','UPGRADE','DOWNGRADE','RENEWAL','PACKAGES')),
 status text NOT NULL DEFAULT 'REQUESTED' CHECK(status IN('REQUESTED','UNDER_REVIEW','APPROVED','SCHEDULED','EXECUTED','REJECTED','CANCELLED','EXPIRED','EXECUTION_FAILED')),
 source_contract_id uuid, target_plan_version_id uuid NOT NULL REFERENCES subscription_plan_versions(id),
 proposal jsonb NOT NULL,documents jsonb NOT NULL DEFAULT '{}',reason text NOT NULL,decision_reason text,
 requested_by uuid REFERENCES app_users(id) ON DELETE SET NULL,reviewed_by uuid REFERENCES app_users(id) ON DELETE SET NULL,
 approved_by uuid REFERENCES app_users(id) ON DELETE SET NULL,approved_at timestamptz,effective_at timestamptz,
 executed_at timestamptz,result_contract_id uuid,idempotency_key text NOT NULL,payload_hash text NOT NULL,
 last_error text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
 FOREIGN KEY(source_contract_id,tenant_id) REFERENCES subscription_contracts(id,tenant_id),
 FOREIGN KEY(result_contract_id,tenant_id) REFERENCES subscription_contracts(id,tenant_id),
 UNIQUE(tenant_id,idempotency_key)
);
CREATE INDEX IF NOT EXISTS subscription_requests_due ON subscription_requests(tenant_id,status,effective_at);
CREATE TABLE IF NOT EXISTS subscription_commercial_requests (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
 company_name text NOT NULL,rut text NOT NULL,contact_name text NOT NULL,contact_last_name text NOT NULL,
 contact_email text NOT NULL,phone text NOT NULL,workers_quantity integer NOT NULL CHECK(workers_quantity>0),
 requested_plan_code text NOT NULL,proposal jsonb NOT NULL,comments text NOT NULL DEFAULT '',
 terms_version text NOT NULL,consent_at timestamptz NOT NULL DEFAULT now(),status text NOT NULL DEFAULT 'NEW',linked_request_id uuid REFERENCES subscription_requests(id) ON DELETE SET NULL,
 idempotency_key text NOT NULL UNIQUE,payload_hash text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS subscription_notifications (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
 subscription_id uuid NOT NULL REFERENCES subscription_contracts(id) ON DELETE CASCADE,
 period_id uuid NOT NULL REFERENCES subscription_periods(id) ON DELETE CASCADE,
 recipient_user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,recipient_email text NOT NULL,
 channel text NOT NULL CHECK(channel IN('EMAIL','IN_APP')),days_before integer NOT NULL CHECK(days_before IN(30,15,7,3,1)),
 scheduled_at timestamptz NOT NULL,available_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN('pending','processing','sent','failed','cancelled')),
 claim_token uuid,claimed_at timestamptz,attempts integer NOT NULL DEFAULT 0,last_error text,provider_reference text,
 sent_at timestamptz,read_at timestamptz,idempotency_key text NOT NULL UNIQUE,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_notifications_due ON subscription_notifications(tenant_id,status,available_at);

-- Published values and accepted agreement snapshots are append-only. Retirement,
-- current-period pointers and computed lifecycle status remain explicit mutable metadata.
CREATE OR REPLACE FUNCTION protect_subscription_catalog_version() RETURNS trigger AS $$
BEGIN
 IF OLD.state IN ('PUBLISHED','RETIRED') AND
   ((to_jsonb(NEW)-'state') IS DISTINCT FROM (to_jsonb(OLD)-'state') OR
    NEW.state NOT IN ('PUBLISHED','RETIRED') OR (OLD.state='RETIRED' AND NEW.state<>'RETIRED')) THEN
  RAISE EXCEPTION 'Published subscription catalog versions are immutable';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS subscription_plan_version_immutable ON subscription_plan_versions;
CREATE TRIGGER subscription_plan_version_immutable BEFORE UPDATE ON subscription_plan_versions FOR EACH ROW EXECUTE FUNCTION protect_subscription_catalog_version();
DROP TRIGGER IF EXISTS subscription_package_version_immutable ON subscription_package_versions;
CREATE TRIGGER subscription_package_version_immutable BEFORE UPDATE ON subscription_package_versions FOR EACH ROW EXECUTE FUNCTION protect_subscription_catalog_version();
CREATE OR REPLACE FUNCTION protect_subscription_snapshot() RETURNS trigger AS $$
BEGIN
 IF (to_jsonb(NEW)-'status'-'is_current'-'current_period_id') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'is_current'-'current_period_id') THEN
  RAISE EXCEPTION 'Accepted subscription snapshots are immutable';
 END IF;
 RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS subscription_contract_snapshot_immutable ON subscription_contracts;
CREATE TRIGGER subscription_contract_snapshot_immutable BEFORE UPDATE ON subscription_contracts FOR EACH ROW EXECUTE FUNCTION protect_subscription_snapshot();
DROP TRIGGER IF EXISTS subscription_period_snapshot_immutable ON subscription_periods;
CREATE TRIGGER subscription_period_snapshot_immutable BEFORE UPDATE ON subscription_periods FOR EACH ROW EXECUTE FUNCTION protect_subscription_snapshot();
DROP TRIGGER IF EXISTS subscription_package_snapshot_immutable ON subscription_contract_packages;
CREATE TRIGGER subscription_package_snapshot_immutable BEFORE UPDATE ON subscription_contract_packages FOR EACH ROW EXECUTE FUNCTION protect_subscription_snapshot();

-- Global catalog has no customer data. Every customer-owned relation is forced RLS.
DO $$ DECLARE tab text; BEGIN
 FOREACH tab IN ARRAY ARRAY['subscription_contracts','subscription_periods','subscription_contract_packages','subscription_free_benefits','subscription_requests','subscription_commercial_requests','subscription_notifications'] LOOP
  EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tab);
  EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY',tab);
  EXECUTE format('DROP POLICY IF EXISTS tenant_subscription_isolation ON %I',tab);
  EXECUTE format('CREATE POLICY tenant_subscription_isolation ON %I USING (tenant_id::text=current_setting(''app.current_tenant_id'',true) OR current_setting(''app.subscription_admin'',true)=''true'') WITH CHECK (tenant_id::text=current_setting(''app.current_tenant_id'',true) OR current_setting(''app.subscription_admin'',true)=''true'')',tab);
 END LOOP;
END $$;
