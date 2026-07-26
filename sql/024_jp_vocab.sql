-- ============================================================
-- Migration 024: « Avant l'épisode » — vocabulaire japonais contextuel
--
-- Pourquoi : l'utilisateur apprend le japonais (Anki + Duolingo) mais suit
-- aussi 44 franchises anime dans la Médiathèque, sans que les deux ne se
-- parlent. Duolingo enseigne « le chat boit du lait » ; Anki fait tourner le
-- deck qu'on lui donne. Ni l'un ni l'autre ne sait qu'on va lancer 無職転生
-- dans dix minutes.
--
-- CE QUE CE N'EST PAS, et c'est le cœur du design :
--   - pas de SRS          → Anki le fait mieux
--   - pas de leçon        → Duolingo le fait mieux
--   - pas de file d'attente, pas d'échéance, pas de streak
--
-- Aucune colonne `due_at` / `interval` / `streak` ici, volontairement. Un
-- backlog est précisément ce qui a tué la tentative précédente (app Atlas :
-- 47 cartes en retard + 941 en attente → dette → culpabilité → évitement,
-- une seule journée de pratique en trois mois). Si l'utilisateur saute un
-- soir, RIEN ne s'accumule. Un mot revient parce que la série revient.
-- ============================================================

-- Vocabulaire extrait des titres natifs, par franchise.
-- Écrit par pipelines/jp_vocab_sync.py (service_role), lu par le front.
CREATE TABLE IF NOT EXISTS jp_words (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES media_franchises(id) ON DELETE CASCADE,
  word text NOT NULL,              -- 転生
  reading text,                    -- てんせい (kana)
  romaji text,                     -- tensei
  meaning_fr text NOT NULL,        -- réincarnation
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (franchise_id, word)
);

CREATE INDEX IF NOT EXISTS jp_words_franchise_idx ON jp_words (franchise_id);

-- Ce que l'utilisateur a marqué. Clé = le MOT, pas (mot, franchise) : 転生
-- revient dans une demi-douzaine de titres isekai, et le marquer connu une
-- fois doit valoir partout. C'est un marqueur, pas une file d'attente.
CREATE TABLE IF NOT EXISTS jp_seen (
  word text PRIMARY KEY,
  status text NOT NULL CHECK (status IN ('known', 'new')),
  seen_count int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE jp_words ENABLE ROW LEVEL SECURITY;
ALTER TABLE jp_seen  ENABLE ROW LEVEL SECURITY;

-- jp_words : lecture seule côté front, le pipeline écrit en service_role.
DROP POLICY IF EXISTS "auth_select" ON jp_words;
CREATE POLICY "auth_select" ON jp_words
  FOR SELECT TO authenticated USING (true);

-- jp_seen : possédée par l'utilisateur, écrite depuis le front. Pas de DELETE
-- (on ne supprime pas un marqueur, on le repasse à 'new').
DROP POLICY IF EXISTS "auth_select" ON jp_seen;
DROP POLICY IF EXISTS "auth_insert" ON jp_seen;
DROP POLICY IF EXISTS "auth_update" ON jp_seen;
CREATE POLICY "auth_select" ON jp_seen FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth_insert" ON jp_seen FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth_update" ON jp_seen FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
