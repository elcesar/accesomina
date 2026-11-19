-- Observabilidad de solicitudes de demostración. Un estado "sent" nuevo significa
-- sólo aceptación por SMTP, no llegada final a una bandeja. Las filas previas
-- conservan una categoría histórica para no afirmar una evidencia inexistente.
ALTER TABLE public_demo_requests
  ADD COLUMN IF NOT EXISTS delivery_outcome TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS delivery_smtp_response_code SMALLINT,
  ADD COLUMN IF NOT EXISTS delivery_message_id_hash TEXT,
  ADD COLUMN IF NOT EXISTS delivery_attempted_at TIMESTAMPTZ;

UPDATE public_demo_requests
SET delivery_outcome = CASE delivery_status
  WHEN 'sent' THEN 'LEGACY_UNVERIFIED'
  WHEN 'failed' THEN 'LEGACY_FAILED'
  ELSE 'PENDING'
END
WHERE delivery_outcome = 'PENDING';

ALTER TABLE public_demo_requests
  ADD CONSTRAINT public_demo_requests_delivery_outcome_check
  CHECK (delivery_outcome IN (
    'PENDING',
    'SMTP_ACCEPTED',
    'SMTP_NOT_CONFIGURED',
    'SMTP_RECIPIENT_REJECTED',
    'SMTP_RECIPIENT_PENDING',
    'SMTP_RECIPIENT_NOT_ACCEPTED',
    'SMTP_AUTH_FAILED',
    'SMTP_CONNECTION_FAILED',
    'SMTP_DELIVERY_FAILED',
    'LEGACY_UNVERIFIED',
    'LEGACY_FAILED'
  ));

ALTER TABLE public_demo_requests
  ADD CONSTRAINT public_demo_requests_delivery_smtp_response_code_check
  CHECK (delivery_smtp_response_code IS NULL OR delivery_smtp_response_code BETWEEN 100 AND 599);

CREATE INDEX IF NOT EXISTS idx_public_demo_requests_delivery_outcome
  ON public_demo_requests(delivery_outcome, delivery_attempted_at DESC);
