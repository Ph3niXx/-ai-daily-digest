# Mirror Anomaly — 2026-06-17

**Type** : 3 jours consécutifs sans activité cockpit détectée  
**Période** : 2026-06-15 · 2026-06-16 · 2026-06-17  
**Détecté par** : Miroir du Soir, run du 2026-06-17

## Signal

Les trois derniers miroirs enregistrés montrent :
- 0 sections visitées
- 0 liens cliqués
- 0 idées créées ou déplacées
- 0 challenges complétés
- 0 skill bumps
- 0 activité Strava
- 0 mesure Withings

Les briefs Gemini du matin ont bien été générés (présence confirmée en base), mais aucune interaction cockpit n'a été tracée côté `usage_events`.

## Hypothèses

1. **Décrochage réel** — Jean n'a pas ouvert le cockpit depuis 3 jours.
2. **Problème de télémétrie** — La télémétrie `usage_events` ne remonte plus (bug dans `track()`, RLS bloquant, ou panel qui n'émet plus les événements).
3. **Usage hors cockpit** — Jean consomme l'information ailleurs (mobile, autres outils) sans passer par le cockpit.

## Recommandation

Vérifier en priorité si `track()` émet bien dans la console navigateur à l'ouverture d'un onglet. Si les events disparaissent côté réseau, c'est un bug de pipeline telemetry, pas un décrochage.
