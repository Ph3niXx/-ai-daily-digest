# GitHub Secrets

Liste des secrets injectés dans les GitHub Actions et utilisés par les pipelines / le module Jarvis.

> **Écriture côté Supabase** : tous les pipelines backend utilisent `SUPABASE_SERVICE_KEY` pour bypass la RLS. Le front consomme uniquement la publishable key (hardcodée dans `cockpit/lib/supabase.js`).

## Cockpit core

| Secret | Usage |
|---|---|
| `GEMINI_API_KEY` | Google AI Studio — `main.py` (RSS + web search + brief Flash-Lite gratuit) |
| `ANTHROPIC_API_KEY` | Claude API — `weekly_analysis.py` (Haiku 4.5, budget 1$/run) + mode Cloud de Jarvis |
| `SUPABASE_URL` | `https://mrmgptqpflzyavdfqwwv.supabase.co` |
| `SUPABASE_KEY` | Publishable key (`sb_publishable_...`) — usage lecture front |
| `SUPABASE_SERVICE_KEY` | Service role key — bypass RLS pour les pipelines backend (Jarvis refuse de démarrer sans) |
| `SUPABASE_USER_ID` | UUID de l'utilisateur Supabase auth (injecté dans certaines requêtes RPC) |

## Email

| Secret | Usage |
|---|---|
| `GMAIL_ADDRESS` | Email expéditeur (SMTP daily) |
| `GMAIL_APP_PASSWORD` | Mot de passe d'app Gmail |
| `RECIPIENT_EMAIL` | Email destinataire |

## TFT

| Secret | Usage |
|---|---|
| `RIOT_API_KEY` | Riot Games Developer API (https://developer.riotgames.com) |
| `RIOT_PUUID` | PUUID du joueur TFT à tracker |

## Strava (pipeline `pipelines/strava_sync.py`)

Setup : voir [strava-setup.md](strava-setup.md).

| Secret | Usage |
|---|---|
| `STRAVA_CLIENT_ID` | Strava API app client ID |
| `STRAVA_CLIENT_SECRET` | Strava API app client secret |
| `STRAVA_REFRESH_TOKEN` | OAuth2 refresh token (obtenu via `scripts/strava_oauth_init.py`) |

## Withings (pipeline `pipelines/withings_sync.py`)

Setup : voir [withings-setup.md](withings-setup.md).

| Secret | Usage |
|---|---|
| `WITHINGS_CLIENT_ID` | Withings API app client ID |
| `WITHINGS_CLIENT_SECRET` | Withings API app consumer secret |
| `WITHINGS_REFRESH_TOKEN` | OAuth2 refresh token (obtenu via `scripts/withings_oauth_init.py`) |

## Last.fm (pipeline `pipelines/lastfm_sync.py`)

Setup : voir [lastfm-setup.md](lastfm-setup.md).

| Secret | Usage |
|---|---|
| `LASTFM_API_KEY` | Last.fm API key (https://www.last.fm/api/account/create) |
| `LASTFM_USERNAME` | Last.fm username |

## Steam (pipeline `pipelines/steam_sync.py`)

Setup : voir [steam-setup.md](steam-setup.md).

| Secret | Usage |
|---|---|
| `STEAM_API_KEY` | Steam Web API key (https://steamcommunity.com/dev/apikey) |
| `STEAM_ID` | Steam ID 64-bit (17 chiffres) |

## TMDB (pipeline `pipelines/tmdb_tracker_sync.py`)

Clé gratuite à demander sur https://developer.themoviedb.org/ (compte + formulaire, validation immédiate pour un usage perso).

| Secret | Usage |
|---|---|
| `TMDB_API_KEY` | TMDB REST v3 — `pipelines/tmdb_tracker_sync.py` (sync quotidien des films et séries de la médiathèque) et `pipelines/tmdb_sync.py` (calendrier de l'onglet Veille, dormant) |

⚠️ **Doublon assumé côté front** : la recherche de la médiathèque interroge TMDB depuis le navigateur et ne peut pas lire un secret GitHub. La même clé est donc **aussi** stockée dans `user_profile.tmdb_api_key`, lue via `window.PROFILE_DATA._values` — même pattern que `lastfm_api_key`. Elle est masquée de l'éditeur de profil via `window.PROFILE_HIDDEN_KEYS` ([cockpit/data-profile.js](../cockpit/data-profile.js)). **Rotation : penser aux deux endroits.**

Sans le secret, `tmdb_tracker_sync.py` sort en `[skip]` avec le code 0 — le workflow reste vert. Sans la clé en base, la recherche n'interroge qu'AniList et le signale en pied de liste.

## Twitch / IGDB (pipeline `pipelines/igdb_tracker_sync.py`)

IGDB v4 s'authentifie via OAuth `client_credentials` Twitch (IGDB appartient à Twitch/Amazon). Créer une application sur https://dev.twitch.tv/console/apps (compte Twitch requis) pour obtenir le couple client ID / client secret.

| Secret | Usage |
|---|---|
| `TWITCH_CLIENT_ID` | Twitch Developer Console — `pipelines/igdb_tracker_sync.py` (OAuth `client_credentials` vers IGDB v4) |
| `TWITCH_CLIENT_SECRET` | Twitch Developer Console — idem |

⚠️ **Pas encore posés (2026-08-13)** : le lot 1 a livré la migration, le pipeline et le workflow, mais ces deux secrets n'ont jamais été ajoutés à GitHub Actions — le pipeline n'a donc jamais tourné en écriture. Sans eux, `igdb_tracker_sync.py` sort en `[skip]` avec le code 0 dès la première ligne (avant tout appel réseau) : le workflow reste vert, zéro écriture, comportement nominal documenté dans `docs/architecture/pipelines.yaml::igdb_tracker_sync.health`.

## Jobs Radar — routine Claude Code distante (aucun secret GitHub)

La routine Jobs Radar ([cowork-routines/jobs-radar.md](cowork-routines/jobs-radar.md), ADR-19) **ne consomme aucun secret GitHub Actions** — elle tourne en remote sur claude.ai, pas dans un workflow.

- **Clé RapidAPI (JSearch)** : portée **en clair dans le prompt de la routine** (config claude.ai privée), jamais dans `secrets`. Un agent distant ne peut pas lire les secrets GitHub. ⚠️ Si cette clé fuite (transcript, partage), la régénérer sur RapidAPI et mettre à jour le prompt de la routine.
- **Supabase** : accès via le **connecteur MCP Supabase** (auth propre), pas via `SUPABASE_SERVICE_KEY` en env.
- **LLM** : pas d'`ANTHROPIC_API_KEY` — la routine est couverte par le plan Max.

> Ne pas ajouter de secret `RAPIDAPI_KEY` aux GitHub Actions : aucun workflow ne l'utilise (le plan GH Actions + Gemini a été abandonné, cf. ADR-19).

### Edge Function `jsearch-proxy` — supprimée le 2026-08-13

Une Edge Function Supabase `jsearch-proxy` (déployée le 2026-05-28, vestige de la migration JSearch) portait une **seconde copie de la clé RapidAPI en clair dans son source**, en contradiction avec la règle ci-dessus, et tournait en `verify_jwt: false` — donc appelable sans authentification par quiconque devinait son slug, l'URL de base du projet étant publique ([cockpit/lib/supabase.js](../cockpit/lib/supabase.js)). Chaque appel aurait puisé dans le quota de **200 requêtes/mois** qui a déjà mis le radar en panne deux fois (juin 2026, puis 10-27 juillet 2026).

Aucun appelant : rien dans le repo, zéro `functions/v1` côté front, 0 invocation sur 24 h — la routine interroge JSearch en `curl` direct. Fonction supprimée plutôt que verrouillée, la clé RapidAPI ne devant vivre qu'à **un** endroit.

**Leçon** : une clé peut avoir des copies hors du repo. `git grep` ne les voit pas — vérifier aussi les Edge Functions (`supabase functions list`) et les prompts de routines distantes.

Si un proxy redevient nécessaire (IGDB l'exige, cf. [spec tracker jeux](superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md)) : secret via `Deno.env.get()`, jamais en dur, et `verify_jwt: true`.

## Règle de maintenance

Tout nouveau secret ajouté à GitHub Actions doit :

1. Apparaître dans ce fichier sous la section correspondante (existante ou nouvelle)
2. Avoir une entrée dans [architecture/decisions.md](architecture/decisions.md) si son introduction implique une décision structurante (nouveau pipeline, nouveau service)
3. Être consommé dans le workflow correspondant uniquement via `secrets.NOM_DU_SECRET` (jamais en dur)
