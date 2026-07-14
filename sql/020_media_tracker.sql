-- ============================================================
-- Migration 020: Médiathèque — tracker anime (AniList)
-- 4 tables. Séparation stricte : le front crée les entrées à l'ajout,
-- le pipeline (service key) les rafraîchit ensuite ; media_progress
-- appartient à l'utilisateur et n'est JAMAIS écrit par le pipeline.
-- Spec : docs/superpowers/specs/2026-07-14-mediatheque-anime-tracker-design.md
-- ============================================================

CREATE TABLE IF NOT EXISTS media_franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type text NOT NULL DEFAULT 'anime',
  source text NOT NULL DEFAULT 'anilist',
  source_root_id int NOT NULL,
  title_romaji text,
  title_english text,
  title_native text,
  synopsis text,
  genres text[],
  cover_url text,
  banner_url text,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_root_id)
);

CREATE TABLE IF NOT EXISTS media_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES media_franchises(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'anilist',
  source_id int NOT NULL,
  in_main_chain boolean NOT NULL DEFAULT true,
  kind text NOT NULL CHECK (kind IN ('season','movie','ova','special','other')),
  season_number int,
  title_romaji text,
  title_english text,
  title_native text,
  format text,
  airing_status text,
  episodes_total int,
  start_date date,
  end_date date,
  next_episode_number int,
  next_episode_airing_at timestamptz,
  cover_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS media_entries_franchise_idx ON media_entries (franchise_id);

CREATE TABLE IF NOT EXISTS media_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL UNIQUE REFERENCES media_entries(id) ON DELETE CASCADE,
  episodes_watched int NOT NULL DEFAULT 0 CHECK (episodes_watched >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES media_franchises(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES media_entries(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('new_entry','airing_started','date_announced')),
  title text NOT NULL,
  event_date date,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  UNIQUE (entry_id, event_type)
);

CREATE INDEX IF NOT EXISTS media_releases_fresh_idx ON media_releases (acknowledged, detected_at DESC);

-- RLS : pattern challenge_attempts (sql/007) étendu aux 4 opérations.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['media_franchises','media_entries','media_progress','media_releases'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_select" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete" ON %I', t);
    EXECUTE format('CREATE POLICY "auth_select" ON %I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_update" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_delete" ON %I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END $$;
