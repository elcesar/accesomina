-- Definitive erasure must also remove immutable work-book history, while
-- preserving append-only protection outside the target's transaction.
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND current_setting('nexo.tenant_erasure', true) = 'approved'
    AND OLD.tenant_id::text = current_setting('nexo.tenant_erasure_target', true)
  THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'audit_log is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reject_work_book_history_mutation()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE'
    AND current_setting('nexo.tenant_erasure', true) = 'approved'
    AND OLD.tenant_id::text = current_setting('nexo.tenant_erasure_target', true)
  THEN RETURN OLD; END IF;
  RAISE EXCEPTION 'work_book_entry_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION hard_delete_tenant(target_tenant_id UUID, actor_user_id UUID, deletion_reason TEXT, deletion_fingerprint TEXT)
RETURNS VOID AS $$
BEGIN
  PERFORM 1 FROM tenants WHERE id = target_tenant_id AND is_domian_admin = false AND status = 'suspended' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Only suspended non-platform tenants can be erased'; END IF;
  PERFORM set_config('nexo.tenant_erasure', 'approved', true);
  PERFORM set_config('nexo.tenant_erasure_target', target_tenant_id::text, true);
  DELETE FROM audit_log WHERE tenant_id = target_tenant_id;
  DELETE FROM tenants WHERE id = target_tenant_id;
  INSERT INTO tenant_erasure_log (tenant_fingerprint, requested_by, reason_code) VALUES (deletion_fingerprint, actor_user_id, deletion_reason);
END;
$$ LANGUAGE plpgsql;
