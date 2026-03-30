-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supabase_auth_id text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- CLI tokens table
CREATE TABLE cli_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  name text NOT NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  compatibility text[] NOT NULL DEFAULT '{}',
  gearfile_content text NOT NULL,
  downloads_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Indexes
CREATE INDEX idx_profiles_tags ON profiles USING GIN (tags);
CREATE INDEX idx_profiles_compatibility ON profiles USING GIN (compatibility);

-- Full-text search index
ALTER TABLE profiles ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) STORED;
CREATE INDEX idx_profiles_search ON profiles USING GIN (search_vector);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE cli_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users: public read, self write
CREATE POLICY "Users are viewable by everyone"
  ON users FOR SELECT USING (true);

CREATE POLICY "Users can update own record"
  ON users FOR UPDATE USING (supabase_auth_id = auth.uid()::text);

-- CLI tokens: owner only
CREATE POLICY "Users can manage own tokens"
  ON cli_tokens FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::text)
  );

-- Profiles: public read, owner write
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);

CREATE POLICY "Users can manage own profiles"
  ON profiles FOR ALL USING (
    user_id IN (SELECT id FROM users WHERE supabase_auth_id = auth.uid()::text)
  );

-- RPC for atomic download count increment
CREATE OR REPLACE FUNCTION increment_downloads(profile_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET downloads_count = downloads_count + 1 WHERE id = profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
