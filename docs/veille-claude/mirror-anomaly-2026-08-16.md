# Anomalie Miroir du Soir — 2026-08-16

## Signal

6 jours consécutifs (2026-08-11 → 2026-08-16) sans aucune action
créatrice détectée dans `daily_mirror.stats` :

| Date | idées créées | idées déplacées | challenges | skill bumps | Strava | Withings |
|---|---|---|---|---|---|---|
| 2026-08-11 | 0 | 0 | 0 | 0 | — | — |
| 2026-08-12 | 0 | 0 | 0 | 0 | — | — |
| 2026-08-13 | 0 | 0 | 0 | 0 | — | — |
| 2026-08-14 | 0 | 0 | 0 | 0 | — | — |
| 2026-08-15 | 0 | 0 | 0 | 0 | — | — |
| 2026-08-16 | 0 | 0 | 0 | 0 | — | — |

Sur la même fenêtre, la consommation (`sections_visited`,
`links_clicked_count`) est elle-même quasi nulle — pic ponctuel le
13/08 (gaming + mediatheque). Le 16/08 est une journée totalement
silencieuse côté cockpit (0 event traqué, aucune activité
Strava/Withings), la 4ᵉ des 6 dans ce cas.

## Lecture

Dépasse largement le seuil de 3 jours consécutifs mentionné dans le
prompt du Miroir. Deux hypothèses non tranchées par les données :
usage réel du cockpit en baisse (vraie vie prend le dessus, congés,
charge Malakoff Humanis) ou télémétrie qui ne remonte plus certains
events (à vérifier : les events `section_opened`/`link_clicked`
sont-ils bien émis par le front sur cette période, ou y a-t-il eu un
souci de déploiement/cache ?).

## Action suggérée

- Vérifier côté front que `track()` est toujours appelé sur les
  interactions clés (pas de régression silencieuse post-déploiement).
- Si confirmé qu'il s'agit d'une vraie baisse d'usage : pas d'action
  technique, c'est un signal humain à laisser remonter via le Miroir
  lui-même.

_Généré automatiquement par le Miroir du Soir._
