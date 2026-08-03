-- Nexo Klar V4: magenta and indigo, light by default.
-- Preserve tenant-specific branding and explicit dark-mode selections.
UPDATE tenant_settings
SET branding =
      CASE
        WHEN lower(COALESCE(branding->>'accent', '')) IN ('#f07d36', '#f97316')
          OR COALESCE(branding->>'accent', '') = ''
        THEN jsonb_set(branding, '{accent}', '"#e4006e"'::jsonb, true)
        ELSE branding
      END,
    updated_at = now();

UPDATE tenant_settings
SET branding = jsonb_set(branding, '{theme}', '"light"'::jsonb, true),
    updated_at = now()
WHERE COALESCE(branding->>'theme', '') NOT IN ('light', 'dark');
