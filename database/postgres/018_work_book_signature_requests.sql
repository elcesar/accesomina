-- Solicitudes de firma electrónica vinculadas a anotaciones del Libro de Obra.
CREATE TABLE IF NOT EXISTS work_book_signature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES work_book_entries(id) ON DELETE CASCADE,
  signer_name TEXT NOT NULL,
  signer_email TEXT,
  signer_phone TEXT,
  channel TEXT NOT NULL CHECK (channel IN ('email','whatsapp','ambos')),
  status TEXT NOT NULL DEFAULT 'pendiente_configuracion'
    CHECK (status IN ('pendiente_configuracion','enviando','enviada','entregada','vista','firmada','rechazada','vencida','error')),
  provider TEXT,
  provider_envelope_id TEXT,
  signing_url TEXT,
  delivery_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_book_signature_entry
  ON work_book_signature_requests(tenant_id,entry_id,requested_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_book_signature_active
  ON work_book_signature_requests(tenant_id,entry_id)
  WHERE status IN ('enviando','enviada','entregada','vista');

ALTER TABLE work_book_signature_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_book_signature_requests_policy ON work_book_signature_requests;
CREATE POLICY work_book_signature_requests_policy ON work_book_signature_requests
  USING (tenant_id::text=current_setting('app.current_tenant_id',true))
  WITH CHECK (tenant_id::text=current_setting('app.current_tenant_id',true));
ALTER TABLE work_book_signature_requests FORCE ROW LEVEL SECURITY;
