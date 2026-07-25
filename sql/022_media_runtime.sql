-- ============================================================
-- Migration 022: Médiathèque — durée d'une entrée
-- Nullable à dessein : une entrée sans durée connue reste utilisable partout,
-- seule pickTonight() la traite à part (acceptée à tous les budgets, classée
-- derrière une durée connue compatible). Exclure sur une donnée manquante
-- produirait une carte « Ce soir » vide et inexplicable — c'est le cas de
-- toute la bibliothèque anime avant le premier passage du sync.
-- Alimentée par les deux syncs (AniList `duration`, TMDB `runtime` /
-- `episode_run_time[0]`). Aucun script de backfill one-shot.
-- RLS : policies authenticated déjà en place (sql/020) — la colonne en hérite.
-- Spec : docs/superpowers/specs/2026-07-25-mediatheque-films-series-ce-soir-design.md
-- ============================================================

ALTER TABLE media_entries ADD COLUMN IF NOT EXISTS runtime_minutes int;
