-- Migration 014 — Feedback utilisateur sur les offres (calibrage du scoring)
--
-- Ajoute le signal de préférence par offre (👍/👎 + raison) que la routine
-- Cowork relit pour calibrer le scoring : 3 colonnes sur `jobs`.
-- Étend le trigger d'héritage (013) pour que le verdict survive aux
-- republications LinkedIn (nouveau linkedin_job_id, même titre+boîte), sur
-- une fenêtre glissante de 180 jours mesurée sur user_verdict_at.
--
-- Idempotent : ADD COLUMN IF NOT EXISTS + CREATE OR REPLACE FUNCTION.

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS user_verdict        text,
  ADD COLUMN IF NOT EXISTS user_verdict_reason text,
  ADD COLUMN IF NOT EXISTS user_verdict_at     timestamptz;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_user_verdict_check;
ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_user_verdict_check
  CHECK (user_verdict IS NULL OR user_verdict IN ('up','down'));

-- On REMPLACE la fonction du trigger d'héritage (le trigger lui-même, créé
-- en 013, continue de pointer vers cette fonction — pas besoin de le recréer).
CREATE OR REPLACE FUNCTION public.jobs_inherit_user_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prior      RECORD;
  prior_vote RECORD;
BEGIN
  IF NEW.title IS NULL OR NEW.company IS NULL THEN
    RETURN NEW;
  END IF;

  -- (1) Héritage status/notes — comportement migration 013, inchangé.
  SELECT status, user_notes INTO prior
  FROM public.jobs
  WHERE lower(trim(title))   = lower(trim(NEW.title))
    AND lower(trim(company)) = lower(trim(NEW.company))
    AND status IN ('archived', 'snoozed')
    AND (
      (status = 'archived' AND updated_at >= now() - interval '30 days')
      OR (status = 'snoozed' AND updated_at >= now() - interval '7 days')
    )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    NEW.status := prior.status;
    IF (NEW.user_notes IS NULL OR NEW.user_notes = '') AND prior.user_notes IS NOT NULL THEN
      NEW.user_notes := prior.user_notes;
    END IF;
  END IF;

  -- (2) Héritage du verdict — NOUVEAU. Indépendant du status (un 👍/👎 reste
  -- valide même sans archivage). Fenêtre 180j sur user_verdict_at (l'âge du
  -- vote, pas updated_at qui bougerait à chaque édition de notes).
  IF NEW.user_verdict IS NULL THEN
    SELECT user_verdict, user_verdict_reason, user_verdict_at INTO prior_vote
    FROM public.jobs
    WHERE lower(trim(title))   = lower(trim(NEW.title))
      AND lower(trim(company)) = lower(trim(NEW.company))
      AND user_verdict IS NOT NULL
      AND user_verdict_at >= now() - interval '180 days'
    ORDER BY user_verdict_at DESC
    LIMIT 1;

    IF FOUND THEN
      NEW.user_verdict        := prior_vote.user_verdict;
      NEW.user_verdict_reason := prior_vote.user_verdict_reason;
      NEW.user_verdict_at     := prior_vote.user_verdict_at;
    END IF;
  END IF;

  RETURN NEW;
END $$;
