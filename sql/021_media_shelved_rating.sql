-- ============================================================
-- Migration 021: Médiathèque — statut manuel « mis de côté » + note par saison
-- shelved : niveau franchise. Sûr : le pipeline anime_tracker_sync ne PATCH que
--   media_franchises.updated_at (pipelines/anime_tracker_sync.py:354).
-- rating  : niveau entrée, sur media_progress (user-owned, JAMAIS écrit par le pipeline).
-- RLS : policies authenticated déjà en place (sql/020) — les colonnes en héritent.
-- Spec : docs/superpowers/specs/2026-07-22-mediatheque-statuts-manuels-notes-design.md
-- ============================================================

ALTER TABLE media_franchises ADD COLUMN IF NOT EXISTS shelved boolean NOT NULL DEFAULT false;
ALTER TABLE media_progress   ADD COLUMN IF NOT EXISTS rating  int CHECK (rating >= 0 AND rating <= 100);
