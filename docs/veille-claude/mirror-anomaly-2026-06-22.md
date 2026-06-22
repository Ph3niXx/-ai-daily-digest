# Mirror Anomaly — 2026-06-22

**Type** : 3 jours consécutifs sans aucune activité cockpit détectée  
**Détecté le** : 2026-06-22 (run Miroir du Soir)  
**Jours concernés** : 2026-06-20, 2026-06-21, 2026-06-22

## Signal

Les daily_mirror des 3 derniers jours affichent tous des compteurs à zéro :

| Date       | links | searches | ideas | strava |
|------------|-------|----------|-------|--------|
| 2026-06-20 | 0     | 0        | 0     | []     |
| 2026-06-21 | 0     | 0        | 0     | []     |
| 2026-06-22 | 0     | 0        | 0     | []     |

Le brief Gemini du 22 juin était présent et fourni (agentic AI en finserv, Samsung/Lloyds/Santander).

## Interprétation possible

- Vraies journées IRL sans ouverture du cockpit (réunions, vacances, week-end prolongé)
- Décrochage du cockpit sans raison externe
- Bug de tracking `section_opened` côté front (les events ne remontent pas)

## Action suggérée

Vérifier dans la console du navigateur si `track('section_opened', ...)` est bien appelé au prochain accès. Si oui : décrochage réel. Si non : bug d'instrumentation à corriger dans `cockpit/lib/bootstrap.js` ou le panel concerné.
