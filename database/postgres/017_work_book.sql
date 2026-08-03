-- Nexo Klar - Libro de Obra formal, trazable y aislado por empresa.
CREATE TABLE IF NOT EXISTS work_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  folio TEXT NOT NULL,
  mine_ref TEXT NOT NULL,
  contract_ref TEXT,
  project_ref TEXT NOT NULL,
  book_type TEXT NOT NULL CHECK (book_type IN ('maestro','seguridad_hsec','calidad','terreno_avance','comunicaciones')),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'abierto' CHECK (status IN ('abierto','suspendido','cerrado')),
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  closed_at DATE,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,folio)
);

CREATE TABLE IF NOT EXISTS work_book_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES work_books(id) ON DELETE CASCADE,
  entry_number INTEGER NOT NULL CHECK (entry_number > 0),
  entry_type TEXT NOT NULL CHECK (entry_type IN ('instruccion','consulta','respuesta','avance','incidente','acuerdo','observacion','recepcion','otro')),
  occurred_at TIMESTAMPTZ NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  responsible TEXT,
  due_at DATE,
  status TEXT NOT NULL DEFAULT 'borrador' CHECK (status IN ('borrador','pendiente_firma','observado','firmado','cerrado')),
  signature_state TEXT NOT NULL DEFAULT 'sin_firma' CHECK (signature_state IN ('sin_firma','pendiente','firmado','rechazado')),
  evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id,book_id,entry_number)
);

CREATE TABLE IF NOT EXISTS work_book_entry_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES work_book_entries(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  reason TEXT,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_books_scope ON work_books(tenant_id,mine_ref,contract_ref,project_ref,status,opened_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_book_entries_scope ON work_book_entries(tenant_id,book_id,status,occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_book_entries_due ON work_book_entries(tenant_id,due_at,status) WHERE due_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_work_book_history_entry ON work_book_entry_history(tenant_id,entry_id,changed_at DESC);

ALTER TABLE work_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_book_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_book_entry_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_books_policy ON work_books;
DROP POLICY IF EXISTS work_book_entries_policy ON work_book_entries;
DROP POLICY IF EXISTS work_book_entry_history_policy ON work_book_entry_history;
CREATE POLICY work_books_policy ON work_books USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY work_book_entries_policy ON work_book_entries USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
CREATE POLICY work_book_entry_history_policy ON work_book_entry_history USING (tenant_id::text=current_setting('app.current_tenant_id',true)) WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
ALTER TABLE work_books FORCE ROW LEVEL SECURITY;
ALTER TABLE work_book_entries FORCE ROW LEVEL SECURITY;
ALTER TABLE work_book_entry_history FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION reject_work_book_history_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'work_book_entry_history is append-only';
END;
$$;
DROP TRIGGER IF EXISTS trg_work_book_history_immutable ON work_book_entry_history;
CREATE TRIGGER trg_work_book_history_immutable BEFORE UPDATE OR DELETE ON work_book_entry_history FOR EACH ROW EXECUTE FUNCTION reject_work_book_history_mutation();
