-- An irreversible erasure keeps only a non-identifying operational receipt.
CREATE TABLE IF NOT EXISTS tenant_erasure_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_fingerprint TEXT NOT NULL,
  requested_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  reason_code TEXT NOT NULL CHECK (reason_code IN ('solicitud_cliente','cuenta_prueba','alta_incorrecta','termino_servicio')),
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_erasure_log_deleted_at ON tenant_erasure_log(deleted_at DESC);

CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' AND current_setting('nexo.tenant_erasure', true) = 'approved' THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION hard_delete_tenant(target_tenant_id UUID, actor_user_id UUID, deletion_reason TEXT, deletion_fingerprint TEXT)
RETURNS VOID AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tenants WHERE id = target_tenant_id AND is_domian_admin = false) THEN RAISE EXCEPTION 'Tenant cannot be erased'; END IF;
  PERFORM set_config('nexo.tenant_erasure', 'approved', true);
  DELETE FROM audit_log WHERE tenant_id = target_tenant_id;
  DELETE FROM tenants WHERE id = target_tenant_id;
  INSERT INTO tenant_erasure_log (tenant_fingerprint, requested_by, reason_code) VALUES (deletion_fingerprint, actor_user_id, deletion_reason);
END;
$$ LANGUAGE plpgsql;
