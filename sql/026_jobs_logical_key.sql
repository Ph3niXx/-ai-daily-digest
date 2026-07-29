-- ============================================================
-- Migration 026 — Clé logique permanente + mémoire des décisions utilisateur
--
-- Contexte (ADR-32, 2026-07-29) :
--   Symptôme utilisateur : « des offres ressortent alors que les candidatures
--   ne sont plus acceptées » (ex. Engagement Manager chez Postman).
--
--   Trois défauts s'empilaient :
--
--   1) La routine dédoublonne (ADR-25) en chargeant `WHERE last_seen_date >=
--      CURRENT_DATE - 45 days`, soit 365 lignes sur 1889. Une offre connue mais
--      non revue depuis 46 jours est invisible → réinsérée comme lead neuf.
--      Postman : last_seen 2026-06-12, re-fetchée 2026-07-28 = 46 jours.
--      Ratée d'un jour. Le fenêtrage est le mauvais outil : la question
--      « ai-je déjà vu cette offre ? » n'a pas de date de péremption.
--
--   2) Le trigger 013/018 matche sur (lower(title), lower(company)) exact.
--      « Product Manager H/F » et « Product Manager (H/F) » sont deux offres
--      différentes pour lui, alors que la routine les fusionne. Les deux
--      normalisations doivent être LA MÊME, et vivre à un seul endroit.
--
--   3) Le trigger ignore complètement `closed_at`. Or le bouton « Marquer
--      clôturée » du front (ADR-18) n'écrit QUE `closed_at`, sans toucher au
--      status. Une republication ne matche donc rien et renaît avec
--      closed_at = NULL : l'offre que l'utilisateur a explicitement déclarée
--      morte revient, l'air neuve. C'est le cœur du symptôme.
--
--   JSearch n'expose AUCUN champ d'expiration (35 champs vérifiés le
--   2026-07-29 : pas de job_offer_expiration_*), et LinkedIn republie les
--   annonces mortes avec un posted_date rafraîchi. Il n'existe donc aucun
--   signal externe de clôture : la seule connaissance fiable est celle de
--   l'utilisateur, et le système doit cesser de la perdre.
--
-- Ce que fait cette migration :
--   - `jobs_logical_key(company, title)` IMMUTABLE : la normalisation d'ADR-25
--     devient du code, unique et partagé (trigger + routine + requêtes d'audit).
--   - colonne générée `logical_key` + index : la routine peut interroger
--     l'historique COMPLET en une requête, sans fenêtre temporelle.
--   - trigger réécrit : matche sur la clé logique, hérite `closed_at` SANS
--     péremption, hérite `applied`, et exclut les auto-archivages (ADR-26/31)
--     dont le marqueur vit dans user_notes — ce qui restaure l'intention
--     d'ADR-23 que le vieillissement automatique avait rendue inopérante.
--
-- Idempotent : CREATE OR REPLACE + ADD COLUMN IF NOT EXISTS.
-- ============================================================

-- ── 1. La normalisation, une fois pour toutes ───────────────
-- IMMUTABLE est obligatoire : une colonne générée l'exige. D'où `translate`
-- pour les accents plutôt que unaccent() (extension, seulement STABLE).
CREATE OR REPLACE FUNCTION public.jobs_logical_key(p_company text, p_title text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT
    -- employeur : minuscules, sans accents, sans ponctuation ni espaces
    regexp_replace(
      translate(lower(coalesce(p_company, '')),
                'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc'),
      '[^a-z0-9]', '', 'g')
    || '|' ||
    -- titre : idem, mais on retire d'ABORD les parenthèses et les mentions
    -- de genre (h/f, f/h, m/f, h/f/d…) — sinon « H/F » survivrait en « hf »
    -- après suppression de la ponctuation et casserait l'égalité des clés.
    regexp_replace(
      regexp_replace(
        regexp_replace(
          translate(lower(coalesce(p_title, '')),
                    'àâäéèêëîïôöùûüç', 'aaaeeeeiioouuuc'),
          '\(.*?\)', '', 'g'),
        '[hfmxw]\s*/\s*[hfmdxw](\s*/\s*[hfmdxw])?', '', 'g'),
      '[^a-z0-9]', '', 'g')
$$;

COMMENT ON FUNCTION public.jobs_logical_key(text, text) IS
  'Clé de dédup logique ADR-25 (employeur|titre normalisés). Source unique de vérité : le trigger ET la routine distante doivent produire la même chaîne.';

-- ── 2. Colonne générée + index ──────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS logical_key text
  GENERATED ALWAYS AS (public.jobs_logical_key(company, title)) STORED;

CREATE INDEX IF NOT EXISTS jobs_logical_key_idx ON public.jobs (logical_key);

-- ── 3. Trigger : ne plus jamais perdre une décision utilisateur ──
CREATE OR REPLACE FUNCTION public.jobs_inherit_user_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prior   RECORD;
  v_key   text;
  v_corp  text;
BEGIN
  IF NEW.title IS NULL OR NEW.company IS NULL THEN
    RETURN NEW;
  END IF;

  -- NB : on appelle la fonction plutôt que de lire NEW.logical_key — les
  -- colonnes générées sont calculées APRÈS les triggers BEFORE.
  v_key  := public.jobs_logical_key(NEW.company, NEW.title);
  v_corp := split_part(v_key, '|', 1);

  -- Garde-fou anti-sur-fusion (ADR-25) : deux employeurs masqués distincts
  -- partageraient la clé. On n'hérite alors de rien.
  IF v_corp IN ('', 'confidential', 'confidentialcareers', 'undisclosed') THEN
    RETURN NEW;
  END IF;

  SELECT status, user_notes, closed_at INTO prior
  FROM public.jobs
  WHERE logical_key = v_key
    AND (
      -- « cette annonce est morte » : décision explicite, sans péremption
      closed_at IS NOT NULL
      -- « j'ai déjà candidaté » : ne jamais la reproposer comme neuve
      OR status = 'applied'
      OR (status = 'snoozed'  AND updated_at >= now() - interval '14 days')
      -- ADR-23 : n'hériter que d'un archivage qui reflète une décision USER.
      -- Le NOT LIKE exclut les auto-archivages de vieillissement (ADR-26/31),
      -- qui portent score_total >= 5 et deviendraient sinon indistinguables
      -- d'un archivage manuel — ce qui enterrerait une offre re-scorée.
      OR (status = 'archived' AND updated_at >= now() - interval '90 days'
          AND (user_verdict IS NOT NULL OR score_total >= 5)
          AND coalesce(user_notes, '') NOT LIKE '%auto-archive vieillissement%')
    )
  ORDER BY (closed_at IS NOT NULL) DESC,
           (status = 'applied')    DESC,
           updated_at              DESC
  LIMIT 1;

  IF FOUND THEN
    -- Une offre clôturée revient archivée, sauf si on y avait candidaté :
    -- `applied` prime (le front ne considère pas une candidature comme morte).
    NEW.status := CASE
      WHEN prior.closed_at IS NOT NULL AND prior.status <> 'applied' THEN 'archived'
      ELSE prior.status
    END;
    NEW.closed_at := coalesce(NEW.closed_at, prior.closed_at);
    IF (NEW.user_notes IS NULL OR NEW.user_notes = '') AND prior.user_notes IS NOT NULL THEN
      NEW.user_notes := prior.user_notes;
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- Le trigger BEFORE INSERT de la migration 013 reste en place (même nom de
-- fonction) ; on le recrée par sécurité si la base est repartie de zéro.
DROP TRIGGER IF EXISTS jobs_inherit_user_status ON public.jobs;
CREATE TRIGGER jobs_inherit_user_status
  BEFORE INSERT ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.jobs_inherit_user_status();
