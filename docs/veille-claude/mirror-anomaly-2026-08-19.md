# Anomalie Miroir du Soir — 2026-08-19

## Signal

Six jours consécutifs (2026-08-14 → 2026-08-19) sans la moindre action
créatrice enregistrée dans `usage_events` : `ideas_created_count`,
`ideas_moved_count`, `challenges_completed_count`, `skill_bumps` et
`wiki_shares_count` sont à 0 sur toute la période (source :
table `daily_mirror`, colonne `stats`). Seule de la consultation
passive (sections ouvertes) est observée.

En parallèle, `morning_brief_present` (présence d'une ligne
`daily_briefs` pour le jour) est passé à `false` deux jours de suite
(2026-08-18 et 2026-08-19), après avoir été `true` les jours
précédents — à vérifier côté pipeline (cron génération brief matinal).

## Données brutes (stats daily_mirror, 2026-08-14 → 2026-08-19)

| date | sections visitées | morning_brief_present | actions créatrices |
|---|---|---|---|
| 08-14 | mediatheque ×2 | true | 0 |
| 08-15 | — | true | 0 |
| 08-16 | — | true | 0 |
| 08-17 | jobs ×2, brief ×1 | true | 0 |
| 08-18 | brief ×3, mediatheque ×1 | false | 0 |
| 08-19 | brief ×11, evening ×2, gaming ×1, mediatheque ×1 | false | 0 |

## Hypothèses

- Pause réelle côté usage du cockpit (période chargée en dehors, RTE
  Train Vente, etc.) — pas d'action requise.
- OU pipeline `daily_briefs` en échec silencieux depuis 2 jours,
  ce qui pourrait expliquer les 11 réouvertures de la section brief le
  19/08 (recherche d'un contenu jamais généré).

## À vérifier

- Logs du cron génération brief matinal (`jarvis_data/*.log` ou run
  GitHub Actions correspondant) pour les 18 et 19 août.
- Si le pipeline est en échec, corriger avant que le miroir du soir
  ne continue de pointer un manque sans cause identifiée.

_Note générée automatiquement par le Miroir du Soir (`daily_mirror`)._
