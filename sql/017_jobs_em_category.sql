-- 017_jobs_em_category.sql — ajoute la valeur 'em' (Engagement/Delivery Manager) à l'enum role_category.
-- Voir ADR-22 (2026-05-31). Idempotent : DROP IF EXISTS puis recreate.
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_role_category_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_role_category_check
  CHECK (role_category IN ('produit','rte','pgm','pjm','cos','em'));
