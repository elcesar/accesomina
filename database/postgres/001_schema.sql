-- AccesoMina Domian - PostgreSQL schema for AWS RDS
-- Target: PostgreSQL 15+ on Amazon RDS
-- Goal: multi-tenant data model. Every customer's operational data is separated by tenant_id.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_code TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  rut TEXT UNIQUE NOT NULL,
  admin_email TEXT NOT NULL,
  phone TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','deleted')),
  is_domian_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client_admin' CHECK (role IN ('domian_admin','client_admin','rrhh','prevencion','acreditacion','consulta')),
  cognito_sub TEXT UNIQUE,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS mines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  mandante TEXT,
  region TEXT,
  altitude_msnm INTEGER DEFAULT 0,
  access_system TEXT,
  contact_name TEXT,
  color TEXT DEFAULT '#f07d36',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commercial_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mine_id UUID REFERENCES mines(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  contract_number TEXT,
  contract_type TEXT CHECK (contract_type IN ('permanente','esporadico','obra_faena','marco')),
  start_date DATE,
  end_date DATE,
  amount_uf NUMERIC(14,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','process','closed','expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, contract_number)
);

CREATE TABLE IF NOT EXISTS workers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  rut TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  emergency_phone TEXT,
  emergency_contact TEXT,
  email TEXT,
  address TEXT,
  city TEXT,
  worker_type TEXT NOT NULL DEFAULT 'esporadico' CHECK (worker_type IN ('permanente','esporadico')),
  specialty TEXT,
  rating INTEGER DEFAULT 3 CHECK (rating BETWEEN 1 AND 7),
  availability TEXT DEFAULT 'disponible' CHECK (availability IN ('disponible','asignado','no_disponible','bloqueado')),
  afp TEXT,
  health_system TEXT,
  mutual TEXT,
  shirt_size TEXT,
  shoe_size TEXT,
  blocked BOOLEAN NOT NULL DEFAULT FALSE,
  blocked_reason TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, rut)
);

CREATE TABLE IF NOT EXISTS worker_mines (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  mine_id UUID NOT NULL REFERENCES mines(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'enabled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_id, mine_id)
);

CREATE TABLE IF NOT EXISTS worker_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','uploaded','approved','rejected','expired','not_applicable')),
  issue_date DATE,
  expiry_date DATE,
  reviewed_by UUID REFERENCES app_users(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS occupational_exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  exam_type TEXT NOT NULL,
  medical_center TEXT,
  result TEXT DEFAULT 'pending' CHECK (result IN ('pending','approved','rejected','conditional','expired')),
  exam_date DATE,
  expiry_date DATE,
  s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  course_type TEXT NOT NULL,
  course_name TEXT NOT NULL,
  provider TEXT,
  issue_date DATE,
  expiry_date DATE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','expired','not_applicable')),
  s3_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  mine_id UUID REFERENCES mines(id) ON DELETE SET NULL,
  contract_id UUID REFERENCES commercial_contracts(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  project_type TEXT CHECK (project_type IN ('parada_planta','mantencion_mayor','shutdown','emergencia','servicio')),
  area TEXT,
  start_date DATE,
  end_date DATE,
  estimated_hours INTEGER DEFAULT 0,
  required_people INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planificada' CHECK (status IN ('planificada','en_curso','cerrada','cancelada')),
  admin_name TEXT,
  counterpart_name TEXT,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  zones TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  shift TEXT DEFAULT 'dia' CHECK (shift IN ('dia','noche','ambos')),
  role_name TEXT,
  accreditation_status TEXT DEFAULT 'review' CHECK (accreditation_status IN ('approved','review','blocked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (project_id, worker_id)
);

CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  city TEXT,
  phone TEXT,
  single_rooms INTEGER DEFAULT 0,
  double_rooms INTEGER DEFAULT 0,
  nightly_rate NUMERIC(12,2) DEFAULT 0,
  mine_ids UUID[] DEFAULT ARRAY[]::UUID[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS hotel_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  room_number TEXT,
  room_type TEXT CHECK (room_type IN ('simple','doble')),
  shift TEXT,
  checkin DATE,
  checkout DATE,
  shares_with TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS digital_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID REFERENCES workers(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  channel TEXT CHECK (channel IN ('whatsapp','email','ambos')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','pending','signed','rejected','expired')),
  sent_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  s3_key TEXT,
  provider_envelope_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS whatsapp_callouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
  shift TEXT,
  available_slots INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  answered_count INTEGER DEFAULT 0,
  assigned_count INTEGER DEFAULT 0,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  mine_id UUID REFERENCES mines(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  result TEXT NOT NULL CHECK (result IN ('puede_ingresar','revisar','no_puede_ingresar')),
  findings JSONB NOT NULL DEFAULT '[]'::jsonb,
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  action TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Useful indexes for scale and tenant isolation
CREATE INDEX IF NOT EXISTS idx_workers_tenant ON workers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_workers_tenant_rut ON workers(tenant_id, rut);
CREATE INDEX IF NOT EXISTS idx_documents_worker_expiry ON worker_documents(tenant_id, worker_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_exams_worker_expiry ON occupational_exams(tenant_id, worker_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_courses_worker_expiry ON courses(tenant_id, worker_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_dates ON projects(tenant_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_assignments_project ON project_assignments(tenant_id, project_id);
CREATE INDEX IF NOT EXISTS idx_audit_results_worker ON audit_results(tenant_id, worker_id, calculated_at DESC);

-- Updated-at helper
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tenants_updated_at ON tenants;
CREATE TRIGGER trg_tenants_updated_at BEFORE UPDATE ON tenants FOR EACH ROW EXECUTE FUNCTION set_updated_at();
DROP TRIGGER IF EXISTS trg_workers_updated_at ON workers;
CREATE TRIGGER trg_workers_updated_at BEFORE UPDATE ON workers FOR EACH ROW EXECUTE FUNCTION set_updated_at();
