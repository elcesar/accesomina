-- New offer metadata; accepted contract and period snapshots are untouched.
ALTER TABLE subscription_plan_versions ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE subscription_plan_versions ADD COLUMN IF NOT EXISTS public_features jsonb NOT NULL DEFAULT '["Módulos de gestión de la empresa","Acceso según los permisos de cada usuario"]'::jsonb;
ALTER TABLE subscription_plan_versions ADD COLUMN IF NOT EXISTS cta_text text NOT NULL DEFAULT '';
-- The migrator runs this file transactionally. ALTER TABLE holds its lock until
-- commit; only the new marketing field is backfilled before restoring the guard.
ALTER TABLE subscription_plan_versions DISABLE TRIGGER subscription_plan_version_immutable;
UPDATE subscription_plan_versions SET cta_text=CASE WHEN code='FREE' THEN 'Comenzar gratis' ELSE 'Solicitar plan' END WHERE cta_text='';
ALTER TABLE subscription_plan_versions ENABLE TRIGGER subscription_plan_version_immutable;
ALTER TABLE subscription_plan_versions ADD CONSTRAINT subscription_plan_public_features_array CHECK(jsonb_typeof(public_features)='array' AND jsonb_array_length(public_features)<=30);
ALTER TABLE subscription_plan_versions ADD CONSTRAINT subscription_plan_cta_length CHECK(char_length(btrim(cta_text)) BETWEEN 1 AND 80);
ALTER TABLE subscription_plan_versions ADD CONSTRAINT subscription_plan_display_order_range CHECK(display_order BETWEEN 0 AND 10000);
DO $$ DECLARE item record; BEGIN
 FOR item IN SELECT conname FROM pg_constraint WHERE conrelid='subscription_plan_versions'::regclass AND contype='c'
  AND pg_get_constraintdef(oid) LIKE '%trial_months%' AND pg_get_constraintdef(oid) LIKE '%monthly_price%'
 LOOP EXECUTE format('ALTER TABLE subscription_plan_versions DROP CONSTRAINT %I',item.conname); END LOOP;
END $$;
ALTER TABLE subscription_plan_versions ADD CONSTRAINT subscription_plan_trial_policy CHECK((code='FREE' AND monthly_price=0 AND trial_months BETWEEN 1 AND 120 AND grace_days=0) OR (code<>'FREE' AND trial_months=0));
ALTER TABLE subscription_package_versions ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;
ALTER TABLE subscription_package_versions DROP CONSTRAINT IF EXISTS subscription_package_versions_workers_quantity_check;
ALTER TABLE subscription_package_versions ADD CONSTRAINT subscription_package_workers_range CHECK(workers_quantity BETWEEN 1 AND 1000000);
ALTER TABLE subscription_package_versions ADD CONSTRAINT subscription_package_display_order_range CHECK(display_order BETWEEN 0 AND 10000);
-- Unknown historical measurements stay unknown, never backfilled from today.
ALTER TABLE subscription_requests ADD COLUMN IF NOT EXISTS workers_at_request integer CHECK(workers_at_request>=0 AND workers_at_request<=1000000);
CREATE INDEX IF NOT EXISTS subscription_audit_tenant_cursor ON audit_log(tenant_id,created_at DESC,id DESC) WHERE entity_type IN('subscription','subscription_services');
CREATE INDEX IF NOT EXISTS subscription_audit_catalog_cursor ON audit_log(entity_id,created_at DESC,id DESC) WHERE entity_type='subscription_catalog';
