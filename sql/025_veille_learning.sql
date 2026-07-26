-- ============================================================
-- Migration 025: La veille qui apprend
--
-- Constat du 2026-07-26 : ~35 articles ingérés par jour, 40 000 en base,
-- brief généré 114 jours d'affilée — et `link_clicked` = 24 événements au
-- total, le dernier le 25 avril. La veille produit, personne ne consomme.
--
-- Cause racine trouvée dans buildTop() : le « Top du jour » prenait
-- `order=date_fetched.desc` puis `.slice(0, 3)` — soit les trois derniers
-- articles aspirés par le crawler, ni plus ni moins — et leur collait un
-- score `94 - i * 6`. Un chiffre d'apparence savante, calculé à partir de
-- rien. Le Top n'a jamais été un top.
--
-- Le cockpit a pourtant DÉJÀ une boucle d'apprentissage qui fonctionne :
-- Jobs Radar (`jobs_feedback` → `user_profile.job_pref_rules`, 42 votes,
-- règles réellement ajustées). On la reproduit ici, à l'identique.
--
-- `daily_picks`      : la sélection du jour, calculée par un pipeline dédié
--                      (jamais par le front, qui ne peut pas juger du fond).
-- `article_feedback` : le vote, qui alimente la recalibration.
-- ============================================================

-- Sélection du jour. Écrite par pipelines/veille_picks.py (service_role).
-- `why` remplace le score fabriqué : une raison lisible vaut mieux qu'un
-- nombre sans référent.
CREATE TABLE IF NOT EXISTS daily_picks (
  pick_date date NOT NULL,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  rank int NOT NULL CHECK (rank BETWEEN 1 AND 5),
  why text NOT NULL,
  confidence text CHECK (confidence IN ('low', 'medium', 'high')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (pick_date, rank),
  UNIQUE (pick_date, article_id)
);

CREATE INDEX IF NOT EXISTS daily_picks_date_idx ON daily_picks (pick_date DESC);

-- Vote de l'utilisateur. Le pendant exact de jobs_feedback.
-- `reason` n'est demandé que sur un 👎 : sur un 👍 la raison est le choix
-- lui-même, et exiger une justification pour approuver ferait chuter le taux.
CREATE TABLE IF NOT EXISTS article_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  verdict text NOT NULL CHECK (verdict IN ('up', 'down')),
  reason text,
  pick_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (article_id)
);

CREATE INDEX IF NOT EXISTS article_feedback_created_idx ON article_feedback (created_at DESC);

-- RLS
ALTER TABLE daily_picks       ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_feedback  ENABLE ROW LEVEL SECURITY;

-- daily_picks : lecture seule côté front.
DROP POLICY IF EXISTS "auth_select" ON daily_picks;
CREATE POLICY "auth_select" ON daily_picks
  FOR SELECT TO authenticated USING (true);

-- article_feedback : possédée par l'utilisateur. Pas de DELETE — on change
-- d'avis en réécrivant le verdict, on n'efface pas une trace d'apprentissage.
DROP POLICY IF EXISTS "auth_select" ON article_feedback;
DROP POLICY IF EXISTS "auth_insert" ON article_feedback;
DROP POLICY IF EXISTS "auth_update" ON article_feedback;
CREATE POLICY "auth_select" ON article_feedback FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert" ON article_feedback FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON article_feedback FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
