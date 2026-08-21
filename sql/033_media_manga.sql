-- ============================================================
-- Migration 033: Médiathèque — section Manga
-- Une entrée = une série manga (pas un tome) : `episodes_total` porte
-- le nombre de tomes, `media_progress.episodes_watched` les tomes lus.
-- Aucune autre colonne n'est ajoutée — c'est l'intérêt du choix
-- « un seul compteur » (pas de distinction possédés / lus).
-- Spec : docs/superpowers/specs/2026-08-21-mediatheque-section-manga-design.md
-- ============================================================

ALTER TABLE media_entries DROP CONSTRAINT IF EXISTS media_entries_kind_check;
ALTER TABLE media_entries ADD CONSTRAINT media_entries_kind_check
  CHECK (kind IN ('season','movie','ova','special','other','manga'));
