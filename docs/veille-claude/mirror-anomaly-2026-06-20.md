# Anomalie Miroir — 2026-06-20

**Signal détecté** : 3 jours consécutifs sans aucun événement cockpit ni activité physique.

| Date       | Events usage | Strava | Withings |
|------------|-------------|--------|----------|
| 2026-06-18 | 0           | 0      | 0        |
| 2026-06-19 | 0           | 0      | 0        |
| 2026-06-20 | 0           | 0      | 0        |

**Interprétations possibles**
- Décrochage du cockpit (week-end prolongé, surcharge pro, baisse de motivation)
- Problème technique côté télémétrie (events non enregistrés)
- Pipelines Strava/Withings en échec silencieux (tokens expirés ?)

**Action suggérée**
Vérifier en priorité si les pipelines de sync sont bien en vie (`strava_sync`, `withings_sync`) avant de conclure à un décrochage comportemental. Si les pipelines sont OK, c'est un signal comportemental réel.
