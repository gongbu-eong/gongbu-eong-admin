BEGIN;

-- Admin accounts are separate from public.users (the legacy reviewed_by FK).
-- Keep each decision and the acting admin's identity together as an audit entry.
ALTER TABLE public.community_reports
  ADD COLUMN IF NOT EXISTS moderation_history JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.community_reports'::regclass
      AND conname = 'community_reports_moderation_history_array'
  ) THEN
    ALTER TABLE public.community_reports
      ADD CONSTRAINT community_reports_moderation_history_array
      CHECK (jsonb_typeof(moderation_history) = 'array');
  END IF;
END $$;

COMMIT;
