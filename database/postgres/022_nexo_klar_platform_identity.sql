-- Rebrands the legacy platform administrator without changing the technical
-- role or field names that are already referenced by permissions and RLS.

UPDATE tenants
SET
  tenant_code = 'nexo-klar',
  company_name = 'Nexo Klar SpA',
  admin_email = 'contacto@nexoklar.com',
  updated_at = now()
WHERE is_domian_admin = TRUE;

UPDATE app_users
SET
  email = 'contacto@nexoklar.com',
  full_name = 'Administrador Nexo Klar',
  updated_at = now()
WHERE role = 'domian_admin'
  AND lower(email) = 'contacto@domian.cl'
  AND NOT EXISTS (
    SELECT 1
    FROM app_users existing_user
    WHERE existing_user.tenant_id = app_users.tenant_id
      AND lower(existing_user.email) = 'contacto@nexoklar.com'
  );
