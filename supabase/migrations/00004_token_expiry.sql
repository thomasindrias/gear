-- Add expiration to CLI tokens (default 1 year from creation)
ALTER TABLE cli_tokens
  ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 year');

-- Backfill existing tokens with 1 year from creation
UPDATE cli_tokens SET expires_at = created_at + interval '1 year' WHERE expires_at IS NULL;
