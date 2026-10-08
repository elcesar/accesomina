-- Solicitudes comerciales públicas: quedan registradas aunque el proveedor de correo no esté disponible.
CREATE TABLE IF NOT EXISTS public_demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  company_name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  industry TEXT NOT NULL DEFAULT '',
  workforce_size TEXT NOT NULL DEFAULT '',
  need TEXT NOT NULL DEFAULT '',
  delivery_status TEXT NOT NULL DEFAULT 'pending' CHECK (delivery_status IN ('pending','sent','failed')),
  delivery_error TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'public_demo_form',
  request_ip_hash TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivered_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_public_demo_requests_created_at
  ON public_demo_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_public_demo_requests_delivery_status
  ON public_demo_requests(delivery_status, created_at DESC);
