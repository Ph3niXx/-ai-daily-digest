# Mirror Anomaly — 2026-06-06

**Type :** 3 jours consécutifs sans action créatrice  
**Détecté le :** 2026-06-06  
**Fenêtre :** 2026-06-04 → 2026-06-06

## Signal

Trois jours consécutifs sans aucune action créatrice détectée dans le cockpit :

| Date       | Sections visitées        | Actions créatrices |
|------------|--------------------------|---------------------|
| 2026-06-04 | claude, ideas, jobs (×1) | 0                   |
| 2026-06-05 | jobs (×1)                | 0                   |
| 2026-06-06 | aucune                   | 0                   |

"Action créatrice" = idée créée/déplacée, challenge complété, skill bump, wiki partagé, recherche effectuée, article cliqué, activité Strava.

## Contexte

- Les 3 briefs du matin étaient présents (pipeline Gemini fonctionnel).
- Pas de Strava ni Withings sur les 3 jours — aucune activité physique tracée non plus.
- Le 04/06, Jean a quand même ouvert les sections `claude` et `ideas` — la curiosité était là, mais sans concrétisation mesurable.

## Ce que ce n'est pas

Ce signal ne signifie pas que Jean n'a pas travaillé. Il peut avoir : eu des journées IRL chargées, utilisé d'autres outils hors cockpit, ou simplement eu besoin de souffler.

## À surveiller

Si le pattern se prolonge au-delà du 08/06, considérer une vérification manuelle du pipeline de télémétrie (`usage_events`) — il est possible que les events ne soient pas correctement flushés côté front.
