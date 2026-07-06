-- MFA enforcement for production accounts. Secrets are encrypted by the application.
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS mfa_secret_encrypted TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS mfa_pending_secret_encrypted TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS mfa_recovery_code_hashes JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS mfa_enrolled_at TIMESTAMPTZ;

ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS mfa_verified BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_mfa_required ON app_users(tenant_id,mfa_enabled) WHERE active;
