export interface DbUser {
  id: string;
  supabase_auth_id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface DbCliToken {
  id: string;
  user_id: string;
  token_hash: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

export interface DbProfile {
  id: string;
  user_id: string;
  slug: string;
  name: string;
  description: string;
  tags: string[];
  compatibility: string[];
  gearfile_content: string;
  downloads_count: number;
  created_at: string;
  updated_at: string;
}
