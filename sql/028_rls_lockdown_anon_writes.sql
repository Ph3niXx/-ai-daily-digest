-- 028 — Fermer l'écriture anonyme sur jobs et rte_articles
-- Audit du 2026-08-15, vague 0. Voir ADR-37 dans docs/architecture/decisions.md.
--
-- Constat : trois policies étaient déclarées `roles={public}` sur une commande d'écriture.
-- `public` couvre `anon`, et la clé qui active `anon` est publiable par construction
-- (cockpit/lib/supabase.js:6, dépôt GitHub public). Conséquence : n'importe qui pouvait
-- modifier les 2 073 lignes de `jobs` (statuts de candidature, notes) et vider `rte_articles`.
--
-- Ce qui n'est PAS impacté :
--   - la routine Jobs Radar distante lit/écrit via le connecteur MCP Supabase (ADR-19),
--     donc en dehors de PostgREST et de la RLS ;
--   - les pipelines backend écrivent en service_role (bypass RLS) ;
--   - le front écrit avec le JWT utilisateur — cockpit/lib/supabase.js:16-19 remplace
--     l'en-tête Authorization après login, et bootstrap.js attend l'auth avant le mount.
--     Le seul verbe d'écriture qu'il utilise sur jobs est PATCH (panel-jobs-radar.jsx:15).

-- ── 1. jobs : l'UPDATE passe de `public` à `authenticated` ───────────────────
drop policy if exists jobs_user_update on public.jobs;

create policy jobs_user_update on public.jobs
  for update
  to authenticated
  using (true)
  with check (true);

-- ── 2. rte_articles : plus aucune écriture par le rôle public ────────────────
-- Seul main.py écrit cette table, en service_role.
drop policy if exists rte_articles_insert on public.rte_articles;
drop policy if exists rte_articles_delete on public.rte_articles;

-- ── 3. rte_articles : la lecture passe à `authenticated` ────────────────────
-- Aucun consommateur front : `grep -rn "rte_articles" cockpit/` ne renvoie rien.
drop policy if exists rte_articles_select on public.rte_articles;

create policy rte_articles_select on public.rte_articles
  for select
  to authenticated
  using (true);

-- ── 4. Ceinture et bretelles : retirer les GRANT de table à anon ─────────────
-- La RLS suffit en théorie, mais elle est déclarative et se réintroduit par mégarde.
-- Le front n'INSERT ni ne DELETE jamais sur ces tables, et ne lit job_scans qu'en SELECT.
revoke insert, update, delete on public.jobs         from anon;
revoke insert, update, delete on public.job_scans    from anon;
revoke insert, update, delete on public.rte_articles from anon;

-- ── 5. TRUNCATE : le trou que la RLS ne bouche pas ──────────────────────────
-- Le défaut Supabase est `grant all on all tables to anon, authenticated`, ce qui inclut
-- TRUNCATE, REFERENCES et TRIGGER. Or TRUNCATE n'est PAS soumis à la row-level security :
-- aucune policy ne le filtre. Il n'est pas atteignable via PostgREST (qui ne parle que
-- SELECT/INSERT/UPDATE/DELETE et RPC), donc l'exposition est théorique aujourd'hui — mais
-- elle le cesserait au premier chemin d'exécution SQL exposé.
revoke truncate, references, trigger on public.jobs         from anon;
revoke truncate, references, trigger on public.job_scans    from anon;
revoke truncate, references, trigger on public.rte_articles from anon;

-- NOTE ASSUMÉE — la lecture de `jobs` et `job_scans` reste ouverte à `public`
-- (policies jobs_read_public / job_scans_read_public, ADR-19). Fermer aussi la lecture
-- est un arbitrage distinct, hors périmètre de cette migration : voir ADR-37.
