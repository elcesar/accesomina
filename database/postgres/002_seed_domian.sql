-- AccesoMina Domian - initial seed for AWS RDS PostgreSQL
-- This seed creates the Domian admin tenant. Demo operational data should be loaded separately.

INSERT INTO tenants (tenant_code, company_name, rut, admin_email, phone, is_domian_admin)
VALUES ('domian', 'Domian Servicios Industriales SpA', '78.425.213-2', 'contacto@domian.cl', '+56 9 7649 0489', TRUE)
ON CONFLICT (rut) DO UPDATE SET
  company_name = EXCLUDED.company_name,
  admin_email = EXCLUDED.admin_email,
  phone = EXCLUDED.phone,
  is_domian_admin = TRUE,
  updated_at = now();

INSERT INTO app_users (tenant_id, email, full_name, role, active)
SELECT id, 'contacto@domian.cl', 'Administrador Domian', 'domian_admin', TRUE
FROM tenants
WHERE rut = '78.425.213-2'
ON CONFLICT (tenant_id, email) DO UPDATE SET role = 'domian_admin', active = TRUE;
