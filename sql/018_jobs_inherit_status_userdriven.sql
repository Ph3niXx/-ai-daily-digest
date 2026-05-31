-- Migration 018 — jobs_inherit_user_status n'hérite que des décisions UTILISATEUR
--
-- Contexte (ADR-23, 2026-05-31) :
--   Le trigger 013 héritait du statut 'archived' de TOUTE republication (title, company),
--   y compris les archivages AUTOMATIQUES (score < 5 au scan, sans verdict utilisateur).
--   Conséquence : une offre re-scorée à la hausse lors d'une republication (ex. AI6
--   « Head of Delivery » re-scoré 9.5 sous les nouvelles règles EM le 2026-05-31) était
--   re-archivée en héritant d'un vieux archivage auto à 4.5 — enterrant un top lead.
--
--   Fix : n'hériter que d'un archivage qui reflète une DÉCISION UTILISATEUR :
--     - status 'snoozed' (le snooze est toujours une action utilisateur) ; OU
--     - status 'archived' AVEC (user_verdict renseigné OU score_total >= 5).
--       Un 'archived' à score >= 5 ne peut venir que d'une action user (la routine crée
--       'new' dès score >= 5) ; un user_verdict 👍/👎 est une action user explicite.
--   Les archivages auto (archived + score < 5 + user_verdict NULL) n'écrasent plus
--   les republications re-scorées.
--
-- Idempotent : CREATE OR REPLACE FUNCTION (le trigger 013 BEFORE INSERT reste en place).

CREATE OR REPLACE FUNCTION public.jobs_inherit_user_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prior RECORD;
BEGIN
  IF NEW.title IS NULL OR NEW.company IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT status, user_notes INTO prior
  FROM public.jobs
  WHERE lower(trim(title))   = lower(trim(NEW.title))
    AND lower(trim(company)) = lower(trim(NEW.company))
    AND (
      (status = 'snoozed' AND updated_at >= now() - interval '7 days')
      OR (status = 'archived' AND updated_at >= now() - interval '30 days'
          AND (user_verdict IS NOT NULL OR score_total >= 5))
    )
  ORDER BY updated_at DESC
  LIMIT 1;

  IF FOUND THEN
    NEW.status := prior.status;
    IF (NEW.user_notes IS NULL OR NEW.user_notes = '') AND prior.user_notes IS NOT NULL THEN
      NEW.user_notes := prior.user_notes;
    END IF;
  END IF;

  RETURN NEW;
END $$;
