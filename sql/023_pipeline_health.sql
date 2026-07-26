-- ============================================================
-- Migration 023: Santé des pipelines — observation externe
--
-- Pourquoi : le 2026-07-26, strava_sync / withings_sync / tft_sync échouaient
-- quotidiennement depuis des semaines (credentials expirés) sans qu'aucune
-- surface du cockpit ne le signale. Forme et Gaming affichaient du périmé
-- comme s'il était frais. Le weekly du 19/07 a tourné à 0 token / 0 appel
-- sans lever d'erreur — un pipeline peut donc « réussir » et ne rien produire.
--
-- Le check tourne HORS des pipelines (workflow dédié qui lit l'API GitHub +
-- la fraîcheur des données) : un pipeline qui crashe ne peut pas rapporter
-- son propre crash, donc l'observation doit venir de l'extérieur.
--
-- Écriture : service_role uniquement (pipelines/pipeline_health.py).
-- Lecture  : authenticated (Tier 1 du cockpit — table minuscule, ~18 lignes).
-- ============================================================

CREATE TABLE IF NOT EXISTS pipeline_health (
  pipeline_id text PRIMARY KEY,
  label text NOT NULL,
  -- Panels du cockpit dont l'affichage dépend de ce pipeline. Sert à savoir
  -- sur quel onglet afficher le bandeau d'avertissement.
  panels text[] NOT NULL DEFAULT '{}',

  -- Côté exécution (source : API GitHub Actions)
  last_run_at timestamptz,
  last_run_conclusion text,          -- success | failure | cancelled | null
  last_run_url text,                 -- lien vers le run GitHub, pour aller voir le détail
  last_success_at timestamptz,
  consecutive_failures int NOT NULL DEFAULT 0,
  last_error text,

  -- Côté données (source : max(date_column) de la table cible)
  data_last_seen timestamptz,
  data_age_hours numeric,
  max_age_hours int,                 -- seuil déclaré dans pipelines.yaml

  -- Verdict consolidé : ok | failing | stale | unknown
  --   failing = le dernier run a échoué
  --   stale   = les runs passent mais la donnée ne bouge plus (no-op silencieux)
  status text NOT NULL DEFAULT 'unknown'
    CHECK (status IN ('ok', 'failing', 'stale', 'unknown')),

  checked_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pipeline_health_status_idx ON pipeline_health (status);

-- RLS : lecture seule pour le front. Aucune policy d'écriture — seul le
-- service_role (qui bypass RLS) alimente cette table.
ALTER TABLE pipeline_health ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_select" ON pipeline_health;
CREATE POLICY "auth_select" ON pipeline_health
  FOR SELECT TO authenticated USING (true);
