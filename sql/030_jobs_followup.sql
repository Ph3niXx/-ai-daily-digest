-- 030 — Jobs Radar : boucle de relance et suivi de funnel
-- Vague 2 de l'audit du 2026-08-15. Voir ADR-39.
--
-- Constat : 30 candidatures sur 32 dépassent 10 jours sans mouvement, la plus
-- ancienne remonte au 2026-04-28. Le cockpit instrumente tout l'amont — 2 073
-- offres scorées, 73 scans, une rubrique calibrée — puis s'arrête net au moment
-- où l'enjeu commence. Le calcul de relance existait déjà dans data-loader.js ;
-- il ne manquait qu'un `onClick`, un plafond à lever, et les colonnes ci-dessous.

-- ── 1. Dates propres au suivi de candidature ────────────────────────────────
--
-- Pourquoi de nouvelles colonnes plutôt que réutiliser l'existant : AUCUNE date
-- déjà présente ne dit quand la candidature a été envoyée.
--   `last_seen_date` = dernière fois que JSearch a re-listé l'offre. Elle bouge
--                      à chaque scan, sans rapport avec la candidature.
--   `updated_at`     = dernière écriture, quelle qu'elle soit. Vérifié le
--                      2026-08-17 : l'offre Accor a `updated_at` au jour même
--                      parce que la routine l'a rescannée le matin, alors que
--                      la candidature date de la semaine précédente.
--
-- Conséquence assumée : `applied_at` reste NULL sur les 32 candidatures
-- existantes. Il n'y a pas de date à backfiller — en inventer une afficherait
-- « candidaté il y a 0 jour » sur une candidature de juillet, ce qui est pire
-- que de ne rien dire. Le front dégrade honnêtement le libellé (voir ADR-39).
alter table public.jobs add column if not exists applied_at timestamptz;

comment on column public.jobs.applied_at is
  'Horodatage du passage en status=applied, posé par le front. NULL sur les '
  'lignes antérieures au 2026-08-17 : aucune date fiable n''existait pour elles.';

-- ── 2. Relance : un événement sur une candidature, pas une étape de funnel ──
--
-- On n'ajoute PAS un statut `relance_1`. Une relance n'est pas un état du
-- dossier : on peut relancer deux fois, et une candidature relancée reste une
-- candidature. Un statut l'aurait rendue mutuellement exclusive avec `applied`,
-- et aurait forcé `relance_2`, `relance_3`… à chaque itération.
alter table public.jobs add column if not exists last_followup_at timestamptz;
alter table public.jobs add column if not exists followup_count integer not null default 0;

comment on column public.jobs.last_followup_at is
  'Dernière relance envoyée. Sert de point de départ au recalcul de l''ancienneté : '
  'une offre relancée sort de la liste des candidatures en souffrance.';

-- ── 3. Issues de candidature ────────────────────────────────────────────────
--
-- Trois valeurs, pas un CRM. Élargir un CHECK ne casse aucun écrivain existant :
-- la routine distante (ADR-19) continue d'écrire ses cinq valeurs.
alter table public.jobs drop constraint if exists jobs_status_check;

alter table public.jobs add constraint jobs_status_check check (
  status = any (array[
    'new', 'to_apply', 'applied', 'snoozed', 'archived',
    'interview',   -- au moins un échange engagé
    'rejected',    -- refus explicite reçu
    'ghosted'      -- sans réponse et abandonné, ≠ archived (jamais candidaté)
  ])
);

-- ── 4. Index pour la liste des candidatures en souffrance ───────────────────
-- Partiel : seules les lignes `applied` sont concernées, soit 32 sur 2 073.
create index if not exists jobs_applied_followup_idx
  on public.jobs (coalesce(last_followup_at, applied_at))
  where status = 'applied';
