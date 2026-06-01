-- 019_articles_url_unique.sql
-- Veille IA (ADR-24) — contrainte UNIQUE(url) sur articles.
--
-- Cause racine des doublons : main.py::save_to_supabase postait avec
-- `Prefer: resolution=ignore-duplicates` MAIS sans `?on_conflict=url` ni
-- contrainte UNIQUE. PostgREST résolvait donc les conflits sur la PK `id`
-- (UUID toujours neuf) → aucun dédup, chaque republication RSS ré-insérée.
-- Les 4 corpus satellites (anime/gaming/sport/news_articles) ont déjà
-- UNIQUE(url) et 0 doublon ; on aligne `articles` dessus.
--
-- Pré-requis : dédoublonnage one-shot des 244 doublons effectué le 2026-06-01
-- (garde la 1re capture par url ; embeddings memories_vectors re-routés/purgés).
-- 0 doublon au moment de la création de la contrainte.
-- Couplé au passage de save_to_supabase à `?on_conflict=url`.
-- RLS inchangée (contrainte ajoutée à une table existante).

ALTER TABLE articles ADD CONSTRAINT articles_url_key UNIQUE (url);

COMMENT ON CONSTRAINT articles_url_key ON articles IS
  'Dedup veille IA (ADR-24). Alimente par main.py::save_to_supabase via ?on_conflict=url + Prefer: resolution=ignore-duplicates.';
