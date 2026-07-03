-- Domian global account governance and customer approval workflow.
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_status_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_status_check CHECK(status IN ('pending','active','suspended','deleted'));
ALTER TABLE tenants ALTER COLUMN status SET DEFAULT 'pending';

UPDATE tenants SET status='active',is_domian_admin=true,admin_email='contacto@domian.cl',updated_at=now()
WHERE regexp_replace(lower(rut),'[^0-9k]','','g')='784252132';

UPDATE app_users SET role='domian_admin',active=true,updated_at=now()
WHERE tenant_id=(SELECT id FROM tenants WHERE regexp_replace(lower(rut),'[^0-9k]','','g')='784252132')
  AND lower(email)='contacto@domian.cl';
