# Anomalie Miroir du Soir — 2026-07-04

## Signal

3 jours consécutifs sans le moindre `usage_event` côté cockpit :

| Date | Événements | Détail |
|---|---|---|
| 2026-06-30 | 11 | 8× `section_opened`, 1× `jobs_action`, 2× `zero_state_shown` |
| 2026-07-01 | 2 | 2× `section_opened` |
| 2026-07-02 | 0 | — |
| 2026-07-03 | 0 | — |
| 2026-07-04 | 0 | — (ni Strava, ni Withings) |

Décroissance nette puis silence total sur 3 jours pleins, pas seulement
absence d'action créatrice (idées, challenges, skill bumps) mais absence
totale d'ouverture du cockpit.

## Contexte additionnel

Le brief matin du 2026-07-04 a échoué à la génération (Gemini 503
UNAVAILABLE) — `daily_briefs.brief_html` contient le message d'erreur brut
au lieu d'un vrai brief. Pas de lien de cause à effet évident avec le
silence côté usage (le silence a commencé le 07-02, avant cet échec), mais
à surveiller si le pattern brief cassé + silence usage se répète.

## Pas d'action automatique

Ce fichier est une note d'observation, pas une alerte actionnable. Si le
silence se prolonge au-delà du 07-05, ça vaut la peine de vérifier
manuellement si c'est une vraie pause (voyage, surcharge pro) ou un
décrochage du cockpit.
