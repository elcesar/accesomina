-- Business-key uniqueness and relationship integrity for concurrent cloud use.
CREATE UNIQUE INDEX IF NOT EXISTS uq_workers_tenant_normalized_rut
  ON workers (tenant_id, lower(regexp_replace(rut, '[^0-9kK]', '', 'g')));
CREATE UNIQUE INDEX IF NOT EXISTS uq_mines_tenant_name_mandante
  ON mines (tenant_id, lower(trim(name)), lower(trim(coalesce(mandante, ''))));
CREATE UNIQUE INDEX IF NOT EXISTS uq_projects_tenant_natural_key
  ON projects (tenant_id, mine_id, lower(trim(name)), coalesce(start_date, DATE '0001-01-01'));
CREATE UNIQUE INDEX IF NOT EXISTS uq_hotels_tenant_name_city
  ON hotels (tenant_id, lower(trim(name)), lower(trim(coalesce(city, ''))));
CREATE UNIQUE INDEX IF NOT EXISTS uq_epp_delivery_natural_key
  ON epp_deliveries (tenant_id, worker_id, item_name, delivered_at, coalesce(lot_serial, ''));
