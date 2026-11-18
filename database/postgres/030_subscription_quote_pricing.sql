-- Commercial approval is pending for the published paid offers. Keep the
-- contractual price immutable in existing snapshots, but do not expose an
-- unapproved amount through the public or customer-facing catalog.
ALTER TABLE subscription_plan_versions ADD COLUMN IF NOT EXISTS price_visibility text NOT NULL DEFAULT 'PUBLISHED'
  CHECK(price_visibility IN('PUBLISHED','QUOTE'));
ALTER TABLE subscription_package_versions ADD COLUMN IF NOT EXISTS price_visibility text NOT NULL DEFAULT 'PUBLISHED'
  CHECK(price_visibility IN('PUBLISHED','QUOTE'));

-- This is presentation metadata only. Existing contracts retain their
-- accepted snapshots and amounts. Free remains explicitly free; paid plans
-- and add-on packages require a commercial quotation until the catalog owner
-- publishes their approved pricing.
ALTER TABLE subscription_plan_versions DISABLE TRIGGER subscription_plan_version_immutable;
UPDATE subscription_plan_versions
SET price_visibility=CASE WHEN code='FREE' THEN 'PUBLISHED' ELSE 'QUOTE' END;
ALTER TABLE subscription_plan_versions ENABLE TRIGGER subscription_plan_version_immutable;

ALTER TABLE subscription_package_versions DISABLE TRIGGER subscription_package_version_immutable;
UPDATE subscription_package_versions SET price_visibility='QUOTE';
ALTER TABLE subscription_package_versions ENABLE TRIGGER subscription_package_version_immutable;