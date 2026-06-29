-- Optional row-level security template for PostgreSQL RDS.
-- Use this after the backend sets: SET app.current_tenant_id = '<tenant uuid>';
-- Keep disabled until the backend is ready to set the tenant context on every request.

ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE mines ENABLE ROW LEVEL SECURITY;
ALTER TABLE commercial_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupational_exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE digital_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_callouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_workers ON workers USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_mines ON mines USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_contracts ON commercial_contracts USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_documents ON worker_documents USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_exams ON occupational_exams USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_courses ON courses USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_projects ON projects USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_assignments ON project_assignments USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_hotels ON hotels USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_hotel_assignments ON hotel_assignments USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_signatures ON digital_signatures USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_callouts ON whatsapp_callouts USING (tenant_id::text = current_setting('app.current_tenant_id', true));
CREATE POLICY tenant_audit_results ON audit_results USING (tenant_id::text = current_setting('app.current_tenant_id', true));
