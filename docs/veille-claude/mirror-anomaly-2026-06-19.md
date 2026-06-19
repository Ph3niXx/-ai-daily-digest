# Anomalie Miroir — 2026-06-19

**Signal** : 3 jours consécutifs sans aucune action cockpit tracée

## Données brutes

| Date | Links | Searches | Ideas créées | Ideas déplacées | Challenges |
|------|-------|----------|-------------|-----------------|------------|
| 2026-06-17 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-18 | 0 | 0 | 0 | 0 | 0 |
| 2026-06-19 | 0 | 0 | 0 | 0 | 0 |

Strava : aucune activité sur les 3 jours. Withings : aucune mesure.

## Contexte supplémentaire (19 juin)

Le brief Gemini du matin a planté avec une erreur 503 (`UNAVAILABLE` — modèle sous forte demande). Jean n'a donc eu ni brief du matin ni aucune trace d'usage cockpit dans la journée.

## Interprétation

Soit 3 vraies journées IRL sans ouverture du cockpit (possible en cas de semaine chargée / déplacement / week-end étendu), soit un problème de tracking (telemetry non envoyée). À investiguer si le pattern continue sur le 4e jour.

## Action suggérée

- Vérifier que `cockpit/lib/telemetry.js` est bien chargé et que `track()` s'exécute sans erreur côté front
- Si le tracking fonctionne, c'est un décrochage réel — pas d'alerte urgente, mais signal à mentionner lors du prochain accès au cockpit
