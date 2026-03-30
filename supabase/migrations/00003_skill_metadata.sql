-- Add skill_metadata column for skills.sh URL enrichment
ALTER TABLE profiles
  ADD COLUMN skill_metadata JSONB;
