# Télémétrie cockpit

Table Supabase `usage_events` — append-only (RLS bloque UPDATE/DELETE).

Le front envoie les events via `track(eventType, payload)` (cf. [`cockpit/lib/telemetry.js`](../cockpit/lib/telemetry.js)) qui réutilise `postJSON()`. Best-effort : un échec de télémétrie ne casse jamais le cockpit.

Migration : [`jarvis/migrations/005_usage_events.sql`](../jarvis/migrations/005_usage_events.sql).

## Events instrumentés

| event_type | payload | Point d'instrumentation |
|---|---|---|
| `section_opened` | `{section}` | `handleNavigate()` dans `cockpit/app.jsx` |
| `search_performed` | `{query_length, results_count}` | `cockpit/panel-search.jsx` après fetch |
| `link_clicked` | `{url, section}` | Event delegation globale `a[target="_blank"]` dans `app.jsx` |
| `pipeline_triggered` | `{pipeline, mode}` | `cockpit/panel-jarvis.jsx` avant `jarvisSend()` |
| `error_shown` | `{context, message}` | Wrapper `showError()` dans `cockpit/lib/` |
| `profile_field_saved` | `{key}` | `cockpit/panel-profile.jsx` après PATCH + `cockpit/panel-jobs-radar.jsx::JrCalibrage` (édition de job_pref_rules) |
| `profile_payload_copied` | `{size}` | `cockpit/panel-profile.jsx` export |
| `skill_radar_bumped` | `{axis, delta}` | `cockpit/panel-radar.jsx` après bump manuel |
| `challenge_completed` | `{challenge_id, mode}` | `cockpit/panel-challenges.jsx` post-submit |
| `idea_moved` | `{id, from_status, to_status}` | `cockpit/panel-ideas.jsx` drag&drop |
| `wiki_shared` | `{slug}` | `cockpit/panel-wiki.jsx` partage |
| `jobs_action` | `{action, job_id, value}` | `cockpit/panel-jobs-radar.jsx` — statut (snooze/archive/apply) + notes + clôture manuelle (`action:"close"`/`"reopen"`, écrit `closed_at`) |
| `jobs_feedback` | `{verdict, reason, job_id, score_at_vote}` | `cockpit/panel-jobs-radar.jsx::voteJob()` — 👍/👎 + raison. `score_at_vote` mesure le désaccord avec le score (doit décroître). |
| `history_pin_toggled` | `{iso, pinned}` | `cockpit/panel-history.jsx::handleTogglePin()` |
| `review_action` | `{action, id}` | `cockpit/panel-review.jsx::markReadAndAdvance()` |
| `hero_delta_shown` | `{newSinceVisit, hours}` | `cockpit/home.jsx` useEffect quand le hero bascule en mode "nouveautés depuis Xh" |
| `recent_filter_auto_on` | `{reason}` | `cockpit/app.jsx` useState init du toggle "Récent · 24h" quand l'auto-on kick in (visite récurrente 30min-18h) |
| `zero_state_shown` | `{ideas_count}` | `cockpit/home.jsx` useEffect quand le hero bascule en mode "Tu as fait le tour. Bravo." (tout lu/snoozé + unread global = 0) |
| `top_card_collapsed` | `{rank}` | `cockpit/home.jsx` `toggleRead()` quand une card du Top du jour passe en `is-read` (collapsed à 56px) |
| `hero_compact_toggled` | `{state}` (`"compact"` / `"full"`) | `cockpit/home.jsx::toggleHeroCompact()` quand l'utilisateur clique le toggle compact/plein du hero (préférence persistée dans `localStorage.cockpit-hero-compact`) |
| `mediatheque_search` | `{q_len, results, sources}` | `cockpit/panel-mediatheque.jsx` après réponse des deux sources en parallèle (debounce 400 ms). `sources` = nombre de sources ayant répondu avec au moins un résultat (0, 1 ou 2) — permet de repérer une source durablement muette |
| `mediatheque_add` | `{franchise_root_id, entries, source}` | `cockpit/panel-mediatheque.jsx::addFranchise()` après persistance. `source` = `anilist` / `tmdb_tv` / `tmdb_movie` |
| `mediatheque_progress` | `{entry_kind, delta, completed}` | `cockpit/panel-mediatheque.jsx::writeProgress()` après upsert réussi |
| `mediatheque_remove` | `{franchise_root_id}` | `cockpit/panel-mediatheque.jsx::removeFranchise()` après DELETE |
| `mediatheque_release_ack` | `{event_type}` | `cockpit/panel-mediatheque.jsx::ackRelease()` après PATCH |
| `mediatheque_shelve` | `{shelved, franchise_root_id}` | `cockpit/panel-mediatheque.jsx::toggleShelved()` après PATCH réussi |
| `mediatheque_rate` | `{entry_kind, rating, cleared}` | `cockpit/panel-mediatheque.jsx::writeRating()` après upsert réussi |
| `mediatheque_hero_action` | `{action, status}` | `cockpit/panel-mediatheque.jsx::MdtHero` clic CTA primaire (`action:"resume"/"start"/"open"`) |
| `mediatheque_week_click` | `{days_ahead, entry_kind}` | `cockpit/panel-mediatheque.jsx::MdtWeek` clic sur une diffusion de l'agenda « Cette semaine » ou de sa ligne « plus tard » (`days_ahead` = 0 pour aujourd'hui, `null` pour une entrée sans date) |
| `mediatheque_collection_toggle` | `{open, count}` | `cockpit/panel-mediatheque.jsx::MdtCollection` pli/dépli manuel de la section « Ma collection » |
| `mediatheque_filter_local` | `{q_len, matches}` | `cockpit/panel-mediatheque.jsx::PanelMediatheque` requête locale stabilisée (debounce 400 ms), avant tout appel AniList |
| `mediatheque_tonight_budget` | `{budget_min, candidates}` | `cockpit/panel-mediatheque.jsx::pickBudget()` au tap sur une pastille de temps dispo (`budget_min` = `30`, `60` ou `null` pour « 2 h+ ») |
| `mediatheque_tonight_pick` | `{role, media_type, runtime_minutes, budget_min}` | `cockpit/panel-mediatheque.jsx::MdtTonight` clic sur le CTA d'une proposition (`role` = `fresh` / `resume` / `discover`) |
| `mediatheque_tonight_empty` | `{budget_min, hour}` | `cockpit/panel-mediatheque.jsx::PanelMediatheque` rendu d'une bande « Ce soir » sans aucune proposition — signal produit : budget trop serré ou bibliothèque à jour |
| `mediatheque_type_filter` | `{types, count}` | `cockpit/panel-mediatheque.jsx::toggleType()` changement des chips Anime / Séries / Films. Jamais émis avec `count: 0` — le dernier type actif ne peut pas être décoché |
| `veille_feedback` | `{verdict, reason}` | `cockpit/home.jsx::sendVote()` après upsert réussi dans `article_feedback` — vote 👍/👎 sur la sélection du jour. `reason` n'est renseigné que sur un 👎 (`seen` / `off_topic` / `shallow` / `not_actionable`). Pendant exact de `jobs_feedback`. **À suivre comme signal de reprise** : `link_clicked` est à 24 événements au total depuis avril, la sélection n'aura servi à rien si ce compteur reste plat |
| `jp_band_shown` | `{words, evening}` | `cockpit/panel-mediatheque.jsx` useEffect, **une fois par montage**, quand la bande « Avant l'épisode » s'affiche avec au moins un mot non connu. C'est le **dénominateur** de la sonde ci-dessous : sans lui, « 0 marquage » ne distingue pas « jamais affiché » de « affiché et ignoré » |
| `jp_word_marked` | `{status, first_time}` | `cockpit/panel-mediatheque.jsx::markWord()` après upsert réussi dans `jp_seen` — bande « Avant l'épisode ». `first_time` distingue un premier marquage d'un changement d'avis. **Sonde de survie** : à lire comme un ratio sur `jp_band_shown`. Si la bande est affichée régulièrement et que le marquage reste à zéro pendant trois semaines, elle ne sert pas et doit être retirée plutôt que maintenue par principe |

## Règle de maintenance

Ajouter un nouvel `event_type` nécessite **dans le même commit** :

1. Une entrée dans le tableau ci-dessus (payload + point d'instrumentation)
2. L'appel `track('nouveau_type', payload)` dans le composant source
3. Pas de modification du schéma SQL : `usage_events` est append-only avec `payload JSONB` libre

Pas besoin de migration Supabase pour un nouveau type — le schéma `JSONB` est ouvert par design.
