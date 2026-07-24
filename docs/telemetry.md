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
| `mediatheque_search` | `{q_len, results}` | `cockpit/panel-mediatheque.jsx` après réponse AniList (debounce 400 ms) |
| `mediatheque_add` | `{franchise_root_id, entries, source}` | `cockpit/panel-mediatheque.jsx::addFranchise()` après persistance |
| `mediatheque_progress` | `{entry_kind, delta, completed}` | `cockpit/panel-mediatheque.jsx::writeProgress()` après upsert réussi |
| `mediatheque_remove` | `{franchise_root_id}` | `cockpit/panel-mediatheque.jsx::removeFranchise()` après DELETE |
| `mediatheque_release_ack` | `{event_type}` | `cockpit/panel-mediatheque.jsx::ackRelease()` après PATCH |
| `mediatheque_shelve` | `{shelved, franchise_root_id}` | `cockpit/panel-mediatheque.jsx::toggleShelved()` après PATCH réussi |
| `mediatheque_rate` | `{entry_kind, rating, cleared}` | `cockpit/panel-mediatheque.jsx::writeRating()` après upsert réussi |
| `mediatheque_hero_action` | `{action, status}` | `cockpit/panel-mediatheque.jsx::MdtHero` clic CTA primaire (`action:"resume"/"start"/"open"`) |
| `mediatheque_week_click` | `{days_ahead, entry_kind}` | `cockpit/panel-mediatheque.jsx::MdtWeek` clic sur une diffusion du semainier (`days_ahead` = 0 pour aujourd'hui, `null` pour une entrée sans date) |

## Règle de maintenance

Ajouter un nouvel `event_type` nécessite **dans le même commit** :

1. Une entrée dans le tableau ci-dessus (payload + point d'instrumentation)
2. L'appel `track('nouveau_type', payload)` dans le composant source
3. Pas de modification du schéma SQL : `usage_events` est append-only avec `payload JSONB` libre

Pas besoin de migration Supabase pour un nouveau type — le schéma `JSONB` est ouvert par design.
