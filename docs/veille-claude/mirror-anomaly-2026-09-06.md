# Anomalie Miroir du Soir — 2026-09-06

> Note générée par la routine "Miroir du Soir" (`docs/cowork-routines/daily-mirror.md`), Étape 5 — signal fort détecté en croisant le miroir du jour avec l'historique complet de `daily_mirror`.

## Constat

Le miroir du 2026-09-06 est, comme les 130 jours précédents recensés dans `daily_mirror` (depuis le 2026-04-26), une journée à **momentum zéro** : aucune idée créée/déplacée, aucun challenge complété, aucun bump de radar de compétences, aucune recherche, aucun partage wiki.

En croisant directement avec `usage_events` (au lieu de seulement le miroir du jour), le motif est plus net qu'un simple "encore une journée creuse" :

| `event_type` | Total (depuis avril) | Première occurrence | Dernière occurrence |
|---|---|---|---|
| `idea_moved` | 2 | 2026-04-23 | 2026-04-23 (même jour) |
| `skill_radar_bumped` | 1 | 2026-04-23 | 2026-04-23 |
| `wiki_shared` | 1 | 2026-04-23 | 2026-04-23 |
| `challenge_completed` | 2 | 2026-04-23 | 2026-04-24 |
| `search_performed` | 7 | 2026-04-11 | 2026-04-20 |
| `link_clicked` | 29 | 2026-04-11 | 2026-08-25 (en baisse, dernier il y a >1 mois) |
| `section_opened` (pour comparaison) | 1502 | 2026-04-11 | 2026-09-06 (continu) |

Les cinq event types "action" (idées, radar, recherche, challenges, wiki) se concentrent quasi intégralement sur une fenêtre de 10 jours au tout début de vie du cockpit (11 → 24 avril — vraisemblablement la phase de prise en main / test des fonctionnalités), puis tombent à zéro pour **plus de quatre mois consécutifs**, alors que la lecture (`section_opened`) reste active tous les jours.

Ce n'est donc pas une journée isolée à signaler, mais un plateau plat depuis la création de la table `daily_mirror` elle-même — jamais détecté jusqu'ici car aucune version antérieure de la routine n'avait comparé le jour courant à l'historique complet.

## Deux lectures possibles

1. **Fonctionnalités mortes** : le carnet d'idées (drag & drop), le bump manuel du radar, la recherche, les challenges et le partage wiki ne correspondent pas à un usage réel — Jean consulte le cockpit en lecture seule (brief, médiathèque, veille) et fait sa réflexion IA/business ailleurs (papier, autre outil, tête).
2. **Friction ou visibilité** : ces actions existent mais sont mal exposées, ou le geste (glisser une carte, cliquer un bouton discret) ne s'est simplement jamais imposé comme réflexe.

Aucune conclusion tranchée n'est possible depuis la seule télémétrie — seul Jean peut trancher.

## Suggestion

Ne pas retirer de fonctionnalité sur la seule base de cette note. Mais si ce plateau se poursuit encore plusieurs semaines, ça vaut la même discipline que celle déjà appliquée à d'autres sondes de survie du repo (`games_status_set`, `panorama_pin_toggled`, etc. — voir `docs/telemetry.md`) : décider explicitement de garder, retravailler ou retirer chacune de ces cinq fonctionnalités plutôt que de les laisser en jachère par défaut.

---
_Généré par la routine Miroir du Soir (Claude Code)._
