# Miroir du Soir — anomalie détectée (2026-07-16)

## Signal

4 jours consécutifs quasi sans interaction avec le cockpit :

| Date | Événements `usage_events` | Détail |
|---|---|---|
| 2026-07-13 | 0 | aucun |
| 2026-07-14 | 1 | `section_opened` → anime |
| 2026-07-15 | 1 | `section_opened` → brief |
| 2026-07-16 | 1 | `section_opened` → jobs |

Sur les 4 jours : aucun clic d'article, aucune recherche, aucune
idée créée/déplacée, aucun challenge complété, aucun skill bump,
aucun partage wiki, aucune activité Strava/Withings enregistrée.

## Lecture

Ce n'est pas nécessairement un problème — ça peut être 4 jours
IRL chargés sans lien avec le cockpit. Mais le pattern (visite
unique, quasi passive, sur des sections différentes chaque jour)
ressemble plus à un décrochage progressif qu'à une simple pause :
pas d'ouverture du cockpit sans un minimum de clic derrière.

## Pas d'action automatique

Ce fichier est une trace, pas une alerte à traiter. Le Miroir du
Soir du 16/07 a inséré le paragraphe "journée silencieuse" standard
en base (`daily_mirror`). Si la tendance se poursuit au-delà de
J+2, ça vaut la peine d'être mentionné explicitement à Jean plutôt
que de continuer à générer des miroirs silencieux muets sur le
cumul.
