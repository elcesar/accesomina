UPDATE tenant_state
SET state = jsonb_set(state, '{libroObras}', COALESCE(state->'libroObras', '[]'::jsonb), true)
WHERE NOT (state ? 'libroObras');

INSERT INTO tenant_module_state (tenant_id, module_key, data, version, updated_at)
SELECT tenant_id, 'libroObras', COALESCE(state->'libroObras', '[]'::jsonb), 1, now()
FROM tenant_state
ON CONFLICT (tenant_id, module_key) DO NOTHING;
