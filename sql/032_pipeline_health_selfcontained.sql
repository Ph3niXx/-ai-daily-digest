-- ============================================================
-- Migration 032: pipeline_health autoporteur
--
-- Pourquoi : la table dit qu'un pipeline est cassé, jamais ce que ça coûte
-- ni quoi faire. Ces deux informations ne se déduisent pas à l'exécution —
-- elles se déclarent, à côté du pipeline, dans docs/architecture/pipelines.yaml
-- sous la clé `health`, et sont recopiées ici à chaque contrôle quotidien.
--
-- domain      : section de l'onglet Santé. Vocabulaire fermé de 7 valeurs,
--               tenu par scripts/validate_architecture.py sur le YAML (source
--               de vérité). Pas de CHECK ici : une contrainte SQL obligerait
--               à une migration à chaque section ajoutée, pour une table que
--               seul un script de confiance écrit.
-- remediation : le geste qui répare, une à deux phrases.
-- impact      : la phrase d'effet, uniquement pour les briques sans `panels`
--               (le Socle). Ailleurs elle se dérive des panels côté front.
--
-- Aucun backfill : pipeline_health.py réécrit TOUTES les lignes à chaque run
-- (upsert merge-duplicates sur pipeline_id). Les colonnes se peuplent au
-- premier passage suivant le déploiement.
-- ============================================================

ALTER TABLE pipeline_health
  ADD COLUMN IF NOT EXISTS domain      text,
  ADD COLUMN IF NOT EXISTS remediation text,
  ADD COLUMN IF NOT EXISTS impact      text;
