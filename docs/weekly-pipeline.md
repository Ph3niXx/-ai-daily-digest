# Weekly Pipeline

Le projet tourne un pipeline hebdomadaire en 3 étapes séquentielles. L'étape 1 (signals) est couplée au démarrage Jarvis (`start_jarvis.bat` → `run_nightly_after_deps.bat`) — un démarrage quotidien fiable de Jean. Les étapes 2 et 3 (veille + audit Cowork) restent en tâche planifiée. Toutes les étapes communiquent via des fichiers sur disque (pas d'orchestrateur central), ce qui garantit la robustesse en cas d'échec partiel.

## Calendrier

| Heure / Trigger          | Étape | Outil                                          | Input                                              | Output                                  |
|--------------------------|-------|------------------------------------------------|----------------------------------------------------|-----------------------------------------|
| Au démarrage Jarvis      | 1     | Python via `run_nightly_after_deps.bat`        | Supabase, git, jarvis_data/logs                    | `jarvis/intel/YYYY-MM-DD-signals.md`    |
| 06h00                    | 2     | Cowork                                         | project_status.yaml, dernier audit                 | `jarvis/intel/YYYY-MM-DD-veille.md`     |
| 07h00                    | 3     | Cowork                                         | signals.md + veille.md + CLAUDE.md + INDEX.md      | `jarvis/upgrades/YYYY-MM-DD-audit.md`   |

## Marges et fail-safe

- Étape 1 démarre dès que Jean lance `start_jarvis.bat` (typiquement matin) — bypass volontaire de Task Scheduler après 3 jours consécutifs sans `signals.md` (25-27/04).
- 1h entre étape 2 et 3 (la veille Cowork peut occasionnellement prendre 5-8 min).
- Étapes 2 et 3 dépendent de la fraîcheur de `signals.md` du jour (donc de `start_jarvis.bat` ayant tourné). Chaque tâche Cowork DOIT vérifier que ses fichiers d'entrée portent la date d'aujourd'hui. Si elle lit un fichier daté d'un autre jour, elle s'arrête et log une erreur.

## Lancement manuel

```
python jarvis/scripts/extract_signals.py
# puis lancer manuellement les 2 tâches Cowork via l'interface
```

## Règles de détection d'anomalies (extract_signals.py)

Le script applique 8 règles d'anomalies pour transformer les statistiques brutes
en signaux exploitables par l'audit. Une anomalie est levée quand l'observé dévie
significativement de l'attendu, pas sur des seuils absolus arbitraires.

Liste : sous-utilisation cockpit, sections mortes, erreurs récurrentes, engagement
faible, recherche désertée, pipeline cassé, aucun commit, section inconnue détectée.

"RAS" en sortie signifie qu'aucune des 8 règles n'a déclenché. Si tu trouves le
script trop ou pas assez sensible, ajuste les seuils dans `extract_signals.py`
(constantes en haut de fichier).
