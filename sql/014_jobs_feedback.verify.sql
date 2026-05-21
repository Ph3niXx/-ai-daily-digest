BEGIN;

-- Cas 1 — vote 'down' il y a 10 jours, offre NON archivée (status reste 'new').
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status,
                         user_verdict, user_verdict_reason, user_verdict_at)
VALUES ('verif-old-1', 'Verif Role A', 'Verif Co A', 'https://x', 'new',
        'down', 'run/BAU', now() - interval '10 days');
-- Republication : nouvel id, même (titre, boîte), sans verdict.
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status)
VALUES ('verif-new-1', 'Verif Role A', 'Verif Co A', 'https://x', 'new');

-- Cas 2 — vote 'down' il y a 200 jours (hors fenêtre).
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status,
                         user_verdict, user_verdict_reason, user_verdict_at)
VALUES ('verif-old-2', 'Verif Role B', 'Verif Co B', 'https://x', 'new',
        'down', 'secteur', now() - interval '200 days');
INSERT INTO public.jobs (linkedin_job_id, title, company, url, status)
VALUES ('verif-new-2', 'Verif Role B', 'Verif Co B', 'https://x', 'new');

DO $$
BEGIN
  IF (SELECT user_verdict FROM public.jobs WHERE linkedin_job_id = 'verif-new-1') IS DISTINCT FROM 'down' THEN
    RAISE EXCEPTION 'FAIL cas1 : verdict non hérité (attendu down)';
  END IF;
  IF (SELECT user_verdict_reason FROM public.jobs WHERE linkedin_job_id = 'verif-new-1') IS DISTINCT FROM 'run/BAU' THEN
    RAISE EXCEPTION 'FAIL cas1 : reason non héritée';
  END IF;
  IF (SELECT user_verdict FROM public.jobs WHERE linkedin_job_id = 'verif-new-2') IS NOT NULL THEN
    RAISE EXCEPTION 'FAIL cas2 : vote >180j ne doit PAS être hérité';
  END IF;
  RAISE NOTICE 'OK : cas1 hérité, cas2 expiré';
END $$;

ROLLBACK;
