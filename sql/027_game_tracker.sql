-- ============================================================
-- Migration 027: Tracker jeux video (IGDB + seed Steam)
-- 4 tables dediees. Volontairement SANS reutilisation de media_*
-- (cf. spec, principe directeur 3) : un jeu n'entre pas dans le
-- vocabulaire episodes_total / airing_status / next_episode_*.
-- Separation stricte : le pipeline ecrit game_titles, l'utilisateur
-- possede game_progress qui n'est JAMAIS ecrite par un pipeline.
-- Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md
-- ============================================================

CREATE TABLE IF NOT EXISTS game_franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  igdb_collection_id int UNIQUE,   -- null si le jeu n'appartient a aucune collection
  name text NOT NULL,
  slug text,
  cover_url text,
  -- false par defaut : la phase A ne met a true que les licences des jeux
  -- joues >= 600 min, pour ne pas noyer « A venir ».
  watched boolean NOT NULL DEFAULT false,
  -- Horodate le premier PARCOURS COMPLET de la collection, pose par la seule
  -- phase B (ni le seed Steam, ni l'import wishlist, qui n'ecrivent qu'un
  -- titre). Tant qu'elle est null, la phase C n'emet AUCUN evenement pour
  -- cette franchise : sinon le premier parcours inonderait le Brief de
  -- centaines de « Annonce » pour des jeux sortis il y a dix ans.
  bootstrapped_at timestamptz,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES game_franchises(id) ON DELETE CASCADE,
  igdb_id int NOT NULL UNIQUE,
  name text NOT NULL,
  slug text,
  summary text,
  cover_url text,
  genres text[],
  platforms text[],
  igdb_status text,                -- released | alpha | beta | early_access
                                   -- | offline | cancelled | rumored | delisted
  first_release_date date,         -- null si inconnue
  release_human text,              -- « Q1 2027 », « 2027 », « Mar 04, 2027 »
  release_precision text,          -- day | month | quarter | year | tbd
  hypes int,
  time_to_beat_minutes int,
  steam_appid int,                 -- via external_games ; null hors Steam
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_titles_franchise_idx ON game_titles (franchise_id);
CREATE INDEX IF NOT EXISTS game_titles_steam_idx ON game_titles (steam_appid);

-- User-owned. Aucun pipeline n'ecrit ici, jamais.
CREATE TABLE IF NOT EXISTS game_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id uuid NOT NULL UNIQUE REFERENCES game_titles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('wishlist','playing','finished','dropped')),
  rating int CHECK (rating >= 0 AND rating <= 100),
  platform text,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES game_franchises(id) ON DELETE CASCADE,
  title_id uuid REFERENCES game_titles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('announced','date_announced','released','cancelled')),
  title text NOT NULL,
  event_date date,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  UNIQUE (title_id, event_type)
);

CREATE INDEX IF NOT EXISTS game_releases_fresh_idx ON game_releases (acknowledged, detected_at DESC);

-- RLS : meme pattern que sql/020_media_tracker.sql, 4 operations.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['game_franchises','game_titles','game_progress','game_releases'] LOOP
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
