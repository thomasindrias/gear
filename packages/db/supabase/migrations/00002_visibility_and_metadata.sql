-- Add visibility and metadata columns
ALTER TABLE profiles
  ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN audit_results JSONB,
  ADD COLUMN plugin_metadata JSONB;

-- Replace SELECT policy with visibility-aware policies
DROP POLICY "Profiles are viewable by everyone" ON profiles;

CREATE POLICY "Public profiles viewable by everyone"
  ON profiles FOR SELECT
  USING (is_public = true);

CREATE POLICY "Owners can view own profiles"
  ON profiles FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::text));
