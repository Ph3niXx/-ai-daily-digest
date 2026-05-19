# Anomalie Miroir — 2026-05-19

**Signal** : 3 jours consécutifs sans aucune action créatrice détectée (17, 18, 19 mai 2026).

## Données observées

| Date       | Clics | Recherches | Idées créées | Idées déplacées | Challenges | Strava |
|------------|-------|------------|--------------|-----------------|------------|--------|
| 2026-05-17 | 0     | 0          | 0            | 0               | 0          | 0      |
| 2026-05-18 | 0     | 0          | 0            | 0               | 0          | 0      |
| 2026-05-19 | 0     | 0          | 0            | 0               | 0          | 0      |

## Contexte aggravant

Le brief Gemini du 2026-05-19 a planté (erreur 503 UNAVAILABLE) — Jean a commencé cette journée sans synthèse matinale. Le pipeline Gemini mérite une vérification.

## Interprétations possibles

1. **Vraie déconnexion IRL** — week-end, congés, ou journées chargées sans temps pour le cockpit.
2. **Décrochage progressif** — le cockpit n'est plus consulté comme habitude quotidienne.
3. **Problème technique** — télémétrie cassée (events non trackés côté front) ou sessions non authentifiées.

## Action suggérée

- Vérifier que `track()` est bien appelé dans les panels (console navigateur, onglet Network).
- Vérifier le pipeline Gemini (`main.py`) — erreur 503 à surveiller.
- Si données techniques OK et décrochage confirmé : ouvrir le cockpit sur l'onglet Opportunités ou Challenges pour relancer la dynamique.
