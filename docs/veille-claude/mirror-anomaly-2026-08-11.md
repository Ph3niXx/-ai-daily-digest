# Anomalie Miroir du Soir — 2026-08-11

**Signal** : 5 jours consécutifs de journée "silencieuse" côté cockpit (0-2 `usage_events`, aucune activité Strava/Withings), du 2026-08-07 au 2026-08-11 inclus. Seule exception récente : 2026-08-06 (activité perso Last.fm).

## Données

Comptage `usage_events` par jour (14 derniers jours, toutes tables confondues) :

| Date | Events | Miroir du soir |
|---|---|---|
| 2026-08-11 | 0 | silencieuse |
| 2026-08-10 | 2 | silencieuse |
| 2026-08-09 | 6 | silencieuse |
| 2026-08-08 | 7 | silencieuse |
| 2026-08-07 | 2 | silencieuse |
| 2026-08-06 | 9 | perso (Last.fm) |
| 2026-08-05 | 6 | silencieuse |
| 2026-08-04 | 7 | silencieuse |
| 2026-08-03 | 15 | — |
| 2026-08-02 | 1 | — |
| 2026-08-01 | 5 | — |

Le dernier `usage_events` réellement enregistré avant aujourd'hui date du **2026-08-07**. Les comptages > 0 les jours suivants (08, 09, 10) proviennent d'events hors périmètre des requêtes du miroir (probablement hors event_types trackés : `section_opened`, `link_clicked`, `search_performed`, `idea_moved`, `challenge_completed`, `skill_radar_bumped`, `wiki_shared`), donc le miroir les classe quand même "silencieuse" — cohérent avec le fait qu'aucune de ces catégories n'a de volume.

## Lecture

Deux hypothèses non tranchées par la donnée seule :
1. Jean traverse une période chargée IRL (RTE Train Vente, contexte SAFe) et n'ouvre plus le cockpit le soir.
2. Un problème de tracking front (télémétrie qui ne remonte plus certains `event_type`) fausse le signal — à vérifier si le pattern persiste au-delà d'une semaine complète.

Pas d'action automatique déclenchée ; ce fichier trace le signal pour permettre un suivi humain si le silence se prolonge.
