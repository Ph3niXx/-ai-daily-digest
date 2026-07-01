# Anomalie Miroir du Soir — 2026-07-01

## Constat

4 jours consécutifs (28, 29, 30 juin, 1er juillet) avec **zéro event
`usage_events`** côté cockpit : aucune section ouverte, aucun lien
cliqué, aucune recherche, aucune idée créée/déplacée, aucun challenge,
aucun bump de skill radar. Seule exception : une sortie Strava le
30 juin (5,59 km).

## Corrélation

Sur les mêmes 4 jours, le `daily_brief` du matin (pipeline Gemini,
`main.py`) a échoué avec la **même erreur 503** :

> `Erreur de génération : 503 UNAVAILABLE. ... 'This model is currently
> experiencing high demand. Spikes in demand are usually temporary.
> Please try again later.'`

Le brief plante depuis au moins le 28 juin sans interruption. C'est
la 4ᵉ occurrence de suite du même code d'erreur — au-delà du seuil de
"spike temporaire" annoncé par Google, ça ressemble à un incident
persistant côté clé API (quota grillé, modèle down, ou rate limit mal
géré).

## Hypothèse

Le lien de causalité pourrait être direct : sans brief du matin, Jean
n'a plus de point d'entrée éditorial pour ouvrir le cockpit —
d'où la chute d'activité qui coïncide exactement avec les jours
d'échec du brief. À vérifier avant de conclure à un désengagement
personnel.

## Action suggérée

- Vérifier le usage/quota de la clé Gemini utilisée par `main.py`.
- Ajouter un retry avec backoff (ou un fallback de contenu) dans le
  pipeline `daily_brief` pour éviter une série d'échecs silencieux.
- Ne pas interpréter les 4 jours de silence cockpit comme un signal
  de désintérêt tant que le pipeline brief n'est pas confirmé stable.

*Généré automatiquement par le Miroir du Soir (`daily_mirror`,
2026-07-01) — croisement avec les 3 jours précédents.*
