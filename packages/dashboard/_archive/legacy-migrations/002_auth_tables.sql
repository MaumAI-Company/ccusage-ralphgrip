-- 002_auth_tables.sql
-- OAuth2 device flow and refresh token tables.
-- Safe to re-run (all CREATE IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS device_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'authorized')),
  user_email TEXT,
  user_name TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_device_challenges_hash ON device_challenges(challenge_hash);
CREATE INDEX IF NOT EXISTS idx_device_challenges_expires ON device_challenges(expires_at);
ALTER TABLE device_challenges ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS allowed_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  added_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE allowed_emails ENABLE ROW LEVEL SECURITY;
