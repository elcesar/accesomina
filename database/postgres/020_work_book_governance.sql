-- Nexo Klar - Gobierno, aprobación y evidencia verificable para Libro de Obra.
ALTER TABLE work_book_signature_requests
  ADD COLUMN IF NOT EXISTS signed_document_url TEXT,
  ADD COLUMN IF NOT EXISTS provider_certificate JSONB,
  ADD COLUMN IF NOT EXISTS signed_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS work_book_entry_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES work_book_entries(id) ON DELETE CASCADE,
  reviewer_role TEXT NOT NULL CHECK (reviewer_role IN ('redactor','supervisor','cliente','inspector')),
  decision TEXT NOT NULL CHECK (decision IN ('aprobado','observado','rechazado')),
  comment TEXT NOT NULL,
  evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  decided_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,entry_id,reviewer_role)
);

CREATE INDEX IF NOT EXISTS idx_work_book_approvals_entry
  ON work_book_entry_approvals(tenant_id,entry_id,decided_at DESC);

ALTER TABLE work_book_entry_approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_book_entry_approvals_policy ON work_book_entry_approvals;
CREATE POLICY work_book_entry_approvals_policy ON work_book_entry_approvals
  USING (tenant_id::text=current_setting('app.current_tenant_id',true))
  WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
ALTER TABLE work_book_entry_approvals FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION reject_work_book_approval_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'work_book_entry_approvals cannot be deleted';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_work_book_approvals_no_delete ON work_book_entry_approvals;
CREATE TRIGGER trg_work_book_approvals_no_delete
  BEFORE DELETE ON work_book_entry_approvals
  FOR EACH ROW EXECUTE FUNCTION reject_work_book_approval_mutation();
