-- 016_jobs_is_remote.sql
-- Jobs Radar v2.1 (ADR-20) — ajoute jobs.is_remote.
-- Alimenté par la routine Jobs Radar distante depuis le champ JSearch
-- `job_is_remote`. NULL = inconnu (jamais déduit). Lecture seule côté front
-- (badge « Remote » + filtre) — hors whitelist PATCH.
-- RLS inchangée (colonne ajoutée à une table existante, policies `using(true)`).

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS is_remote boolean;

COMMENT ON COLUMN jobs.is_remote IS
  'Remote-friendly (JSearch job_is_remote). NULL = inconnu. Écrit par la routine Jobs Radar (ADR-20), lecture seule front.';
