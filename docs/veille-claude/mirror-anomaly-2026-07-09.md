# Anomalie Miroir du Soir — 3 jours consécutifs sans activité cockpit

**Détecté le** : 2026-07-09

## Constat

`usage_events` ne contient plus aucun événement depuis 3 jours :

| Date | Events | Note |
|---|---|---|
| 2026-07-05 | 26 | activité normale |
| 2026-07-06 | 4 | déjà en baisse |
| 2026-07-07 | 0 | silencieux (miroir généré, paragraphe "journée silencieuse") |
| 2026-07-08 | 0 | silencieux — **aucune ligne `daily_mirror` pour cette date**, à vérifier si le run a bien tourné ce jour-là |
| 2026-07-09 | 0 | silencieux (ce run) |

Aucune activité Strava ni Withings non plus sur ces 3 jours. Pas de brief matin (`daily_briefs`) trouvé pour 2026-07-09.

## Lecture

Rupture nette après le 2026-07-05 : de 26 events à 0 en deux jours, puis silence total. Peut être une vraie pause IRL (congés, charge pro RTE) ou un décrochage du cockpit. Le trou dans `daily_mirror` pour le 07-08 (aucune ligne, ni silencieuse ni active) mérite une vérification séparée du cron.

## Action suggérée

Pas d'action automatique. Signal à faire remonter à Jean au prochain point : décrochage volontaire ou pipeline à vérifier (cron Miroir du Soir du 07-08 semble n'avoir rien inséré).
