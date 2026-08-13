# Gaming

> Vue consolidée de l'activité gaming perso — bibliothèque Steam (918 jeux), TFT live, backlog, abandonnés, courbe d'activité 90j, genres 14j, top all-time, milestones YTD. 4 "profils plateformes" (Steam + Riot live, PSN + Xbox en placeholder). Heatmap affichée mais jamais calculée depuis les données réelles (voir « Heatmap » dans États & edge cases).

## Scope
perso

## Finalité fonctionnelle
Agrégateur multi-plateforme centré sur Steam (source principale) avec TFT live (pipeline Riot) et deux placeholders PSN/Xbox (pas de pipeline). Répond à "où en suis-je de ma vie de joueur ?" en 7 sections verticales : état live (dernière session + profils plateformes), jeux en cours (14 derniers jours), backlog jamais ouvert, **abandonnés** (>1h cumulées, 0h sur 14j — candidats finir ou désinstaller), courbe temps de jeu 90j, genres 14j, top all-time par heures, achievements récents, milestones YTD. Toutes les stats sont calculées **côté client** par `transformGaming` à partir des 6 tables lues par ce panel — aucune agrégation backend au-delà du sync Steam quotidien.

## Parcours utilisateur
1. Clic sidebar "Gaming" (groupe Personnel) — le panel charge en parallèle snapshot Steam, stats quotidiennes, achievements, détails de jeux, rang TFT.
2. Lecture du hero : eyebrow (Steam + Riot · heures cumulées), titre (heures 30 jours + jeux lancés/owned + backlog), sous-titre avec genre dominant et rang TFT live. Carte dernière session à droite avec pochette du jeu.
3. Lecture de la grille des quatre profils plateformes : Steam (réel), Riot/TFT (live avec rang + LP + W/L), PlayStation + Xbox (placeholders grisés "pipeline non branché").
4. Lecture de la §1 En cours : jusqu'à quatre cartes de jeux Steam les plus joués sur 14 jours + TFT ongoing si des matchs sont trackés.
5. Lecture de la §2 Backlog : huit jeux possédés jamais lancés, avec tag "shame".
6. Lecture de la §2bis Abandonnés (si au moins un jeu) : jeux avec 1h cumulée ou plus mais 0 minute sur les 14 derniers jours — signal "commencé sérieusement puis lâché".
7. Lecture de la §3 Activité : courbe 30 ou 90 jours avec moyenne mobile 7 jours, toggle pour basculer.
8. Lecture de la §4 Genres 14 jours : barre horizontale proportionnelle + table détaillée.
9. Lecture de la §6 Top all-time : dix premiers jeux par heures cumulées avec barre de progression.
10. Lecture de la §7 Achievements : jusqu'à six achievements récents avec icône par type (platine / or / argent / bronze / spécial / commun) et rareté en pourcentage des joueurs.
11. Lecture de la §8 Milestones YTD : six indicateurs (heures vs objectif annuel, taille de bibliothèque, heures cumulées, achievements, rang TFT, sessions 30 jours).

## Fonctionnalités
- **Hero multi-plateforme** : titre avec heures de jeu 30 jours + jeux lancés sur owned + backlog. Carte dernière session (pochette + nom + temps récent) et sous-titre avec genre dominant et rang TFT live.
- **Grid 4 profils plateformes** : cartes Steam (réelle, heures cumulées), Riot/TFT (live avec rang + LP + W/L), PlayStation + Xbox en placeholders grisés (« pipeline non branché »).
- **§1 En cours** : jeux les plus joués sur les 14 derniers jours sur Steam, plus une carte TFT si des matchs sont trackés. Pochette via le CDN Steam direct.
- **§2 Backlog** : huit jeux possédés jamais lancés, avec tag « shame » pour les candidats à finir ou désinstaller.
- **§2bis Abandonnés** : jeux avec au moins 1h cumulée mais 0 minute sur les 14 derniers jours — signal honnête « commencé sérieusement puis lâché », distinct du backlog.
- **§3 Activité** : courbe de temps de jeu sur 30 ou 90 jours avec moyenne mobile 7 jours pour lisser les variations.
- **§4 Genres 14 jours** : barre horizontale empilée + table détaillée des principaux genres joués, calculée à partir des jeux enrichis (les autres tombent en « Autre »).
- **§6 Top all-time** : dix jeux les plus joués par heures cumulées, avec barre de progression relative au maximum.
- **§7 Achievements récents** : jusqu'à six derniers achievements Steam débloqués (platine / or / argent / bronze / spécial / commun) avec rareté en pourcentage des joueurs.
- **§8 Milestones YTD** : six indicateurs annuels (heures vs objectif 500h, taille de bibliothèque, heures cumulées, achievements, rang TFT, sessions 30j).
- **Empty state pipeline** : n'existe pas dans le code actuel malgré une entrée « fixé » historique du TODO — voir « Snapshot vide » dans États & edge cases.

## Front — structure UI
Fichier : [cockpit/panel-gaming.jsx](cockpit/panel-gaming.jsx) — 582 lignes (après retrait de la §5 Wishlist le 2026-08-13, commit `39c7692`), monté par [app.jsx:411](cockpit/app.jsx:411). CSS dédié : [cockpit/styles-gaming.css](cockpit/styles-gaming.css) — ~1020 lignes, scope `gm-*` + `mz-*` résiduel pour la heatmap (voir « Heatmap » dans États & edge cases — toujours rendue, jamais réellement supprimée). Ressources dans [index.html:29, 70, 95](index.html:29) (versions `css?v=5`, `data?v=2`, `jsx?v=5`).

Structure DOM :
- `.gm-wrap[data-screen-label="Gaming"]` — **pas d'empty state dédié** (cf. « Snapshot vide » dans États & edge cases : le short-circuit décrit plus bas dans cette spec n'existe pas dans le code actuel) :
    - `.gm-hero` — eyebrow + H1 + sub à gauche, `.gm-last` à droite (cover + meta dernière session)
    - `.gm-profiles` — 4 `.gm-profile` (1 avec `.is-placeholder` si `_placeholder: true`)
    - 7 `<section class="gm-section">` numérotées 01, 02, 02b, 03, 04, 06, 07, 08 — **05 n'existe plus** (ex-Wishlist, retirée le 2026-08-13 sans renumérotation des sections suivantes) :
      - §01 `.gm-ip-grid` → `.gm-ip-card` avec `.gm-ip-cover` + `.gm-ip-body` (progress bar conditionnelle)
      - §02 `.gm-bl-list` → header `.gm-bl-row.is-head` + N rows classés `.is-shame` si priority
      - §02b `.gm-abandoned-grid` → `.gm-abandoned-card`
      - §03 `.gm-chart-wrap` avec toggle 30j/90j → `<GmActivityChart>` SVG, suivi conditionnellement de `.mz-heatmap` → `<GmHeatmap>` (toujours données mock, cf. « Heatmap » dans États & edge cases)
      - §04 `.gm-genre-bar` horizontale + grid 2 cols (table + paragraph italique)
      - §06 `.gm-top-row` table 5 cols (# / jeu / plateforme / heures / spacer)
      - §07 `.gm-ach-list` → `.gm-ach` avec icône typée
      - §08 `.gm-milestones` grid 3 cols avec `.gm-milestone-bar` optionnel

Route id = `"gaming"`. **Panel Tier 2** ([data-loader.js:4681](cockpit/lib/data-loader.js:4681)).

## Front — fonctions JS
| Fonction | Rôle | Fichier/ligne |
|----------|------|---------------|
| `PanelGaming({ onNavigate })` | Composant racine — lit `GAMING_PERSO_DATA`, state `chartRange` 30j/90j uniquement. **Aucun short-circuit empty state** (cf. « Snapshot vide » dans États & edge cases) | [panel-gaming.jsx:111](cockpit/panel-gaming.jsx:111) |
| `GmActivityChart({ series, range })` | SVG 1000×200 : yTicks + bars opacity 22% + ligne moyenne mobile 7j. Guard data.length>1 pour éviter NaN | [panel-gaming.jsx:17](cockpit/panel-gaming.jsx:17) |
| `GmHeatmap({ grid })` | Composant heure×jour — **toujours rendu et toujours faux** : `transformGaming` n'a pas de clé `heatmap` dans son shape, donc `replaceShape` ne touche jamais `D.heatmap` ; la grille mock 2026-04-24 de `data-gaming-perso.js` reste affichée indéfiniment, y compris avec un snapshot Steam réel chargé | [panel-gaming.jsx:78](cockpit/panel-gaming.jsx:78) |
| `T2.steam_snapshot()` | `GET steam_games_snapshot?snapshot_date=eq.{today}&limit=2000&order=playtime_forever_minutes.desc.nullslast` | [data-loader.js:1309](cockpit/lib/data-loader.js:1309) |
| `T2.steam_stats()` | `GET gaming_stats_daily?order=stat_date.desc&limit=180` | [data-loader.js:1313](cockpit/lib/data-loader.js:1313) |
| `T2.steam_achievements()` | `GET steam_achievements?order=unlocked_at.desc&limit=50` | [data-loader.js:1314](cockpit/lib/data-loader.js:1314) |
| `T2.steam_game_details()` | `GET steam_game_details?select=appid,name,genres,header_image_url,release_date&limit=2000` | [data-loader.js:1315](cockpit/lib/data-loader.js:1315) |
| `T2.tft_rank_latest()` | `GET tft_rank_history?order=captured_at.desc&limit=1` | [data-loader.js:1316](cockpit/lib/data-loader.js:1316) |
| `T2.tft_match_count()` | `GET tft_matches?select=match_id&limit=1000` puis `rows.length` | [data-loader.js:1317](cockpit/lib/data-loader.js:1317) |
| `transformGaming({ snapshot, stats, achievements, gameDetails, tftRank, tftMatchCount })` | Build complet du shape `GAMING_PERSO_DATA` (profiles + totals + 6 sections). Ne prend plus de paramètre `wishlist` depuis le 2026-08-13 | [data-loader.js:2517](cockpit/lib/data-loader.js:2517) |
| `steamHeaderUrl(appid)` | URL CDN header.jpg | [data-loader.js:2505](cockpit/lib/data-loader.js:2505) |
| `steamLibraryUrl(appid)` | URL CDN library_600x900.jpg — défini mais **non utilisé** par ce panel | [data-loader.js:2508](cockpit/lib/data-loader.js:2508) |
| `loadPanel("gaming")` case | `Promise.all` de 6 fetchs (plus de fetch wishlist) + `transformGaming` + `replaceShape` | [data-loader.js:4681](cockpit/lib/data-loader.js:4681) |
| `replaceShape(target, source)` | Object.assign-like (overwrite keys de source, **ne supprime pas** les keys orphelines) | [data-loader.js:1401](cockpit/lib/data-loader.js:1401) |

## Back — sources de données

| Table | Colonnes lues | Volumétrie actuelle |
|-------|---------------|--------------------|
| `steam_games_snapshot` | `appid, name, playtime_forever_minutes, playtime_2weeks_minutes, snapshot_date`. Filtré `snapshot_date=eq.{today}`. | **918 rows** (snapshot du jour 2026-04-24). DDL versionné dans [sql/013_gaming.sql](sql/013_gaming.sql). |
| `steam_game_details` | `appid, name, genres, header_image_url, release_date`. Cache permanent. | **2 rows** — enrichissement Store API plafonné à 20/run par le pipeline, catch-up extrêmement lent. Conséquence : `genres_30d` est dominé par "Autre". DDL versionné dans [sql/013_gaming.sql](sql/013_gaming.sql). |
| `gaming_stats_daily` | `stat_date, total_playtime_minutes` (autres colonnes `games_played_count, top_game_name, top_game_minutes, tft_games_count` ignorées par le panel). | **8 jours** (pipeline jeune). Chart 90j a 82 zéro-fills pour l'instant. DDL versionné dans [sql/013_gaming.sql](sql/013_gaming.sql). |
| `steam_achievements` | `appid, achievement_name, achievement_api_name, unlocked_at`. | **0 rows** — phase D du pipeline ne déclenche que lundi ou via `--force`, et n'a jamais rempli. Zone 07 affiche empty state. DDL versionné dans [sql/013_gaming.sql](sql/013_gaming.sql). |
| `tft_rank_history` | `tier, rank, lp, wins, losses, captured_at`. Dernière ligne seulement. | 8 snapshots. |
| `tft_matches` | `match_id` uniquement (pour count via `rows.length`). Les autres colonnes sont consommées par le panel TFT dédié, pas ici. | — |

`gaming_wishlist` n'est plus lue par ce panel depuis le 2026-08-13 (commit `39c7692`) — voir « Tracker jeux — lot 1 » plus bas : la table reste en base (8 lignes), absorbée dans `game_progress` via `igdb_tracker_sync.py --import-wishlist`.

## Back — pipelines qui alimentent
- **Pipeline Steam** ([pipelines/steam_sync.py](pipelines/steam_sync.py) — 415 lignes) — cron `30 5 * * *` via [.github/workflows/steam-sync.yml](.github/workflows/steam-sync.yml), workflow tourne avec `--force` pour bypasser la gate lundi d'achievements.
  - **Phase A** : Daily library snapshot → `steam_games_snapshot`. `GetOwnedGames` (profil public requis — 403 = exit) + `GetRecentlyPlayedGames` pour `playtime_2weeks_minutes`. Upsert via `(appid, snapshot_date)`.
  - **Phase B** : Delta stats vs hier → `gaming_stats_daily`. `total_playtime_minutes` = somme des deltas `playtime_forever_minutes`. Upsert par `stat_date`.
  - **Phase C** : Enrichissement Store API → `steam_game_details`. Cap `MAX_ENRICH_PER_RUN = 20`. Délai `STORE_DELAY = 0.3s`. 403 traité graciously (skip).
  - **Phase D** : Achievements → `steam_achievements`. `GetUserStatsForGame` per-game, 403 silencieux si jeu sans achievements. Déclenché lundi ou `--force`.
- **Pipeline TFT** ([tft_pipeline.py](tft_pipeline.py)) — toutes les 2h via [.github/workflows/tft-sync.yml](.github/workflows/tft-sync.yml). Écrit `tft_matches`, `tft_rank_history` (+ `tft_match_units`, `tft_match_traits`, `tft_match_lobby` non lus ici). Utilisé par le panel TFT Matches dédié + count partiel ici.
- **Front** : aucun writer, lecture seule sur les 6 tables ci-dessus.

## Appels externes
- **Supabase REST (lecture)** : 6 requêtes parallèles — détail dans "Fonctions JS".
- **Steam CDN** (public, no-auth) : `shared.cloudflare.steamstatic.com/store_item_assets/steam/apps/{appid}/header.jpg` pour chaque cover. ~30-50 images par page view.
- **Steam Web API** (backend uniquement) — `GetOwnedGames`, `GetRecentlyPlayedGames`, `GetUserStatsForGame`, `GetSchemaForGame`, `GetPlayerAchievements`. Délai `DELAY_BETWEEN_REQUESTS = 0.2s` entre chaque call.
- **Steam Store API** (backend uniquement) — `/api/appdetails?appids=X` pour genres + description + header + release date. Délai `STORE_DELAY = 0.3s`.
- **Riot TFT API** (backend via `tft_pipeline.py`) — non documentée dans ce panel (cf. tab-tft dédié).
- **`window.open(..., "_blank")`** : aucun dans le panel Gaming (pas de lien sortie par jeu).
- **Supabase REST (écriture)** : aucune. Le panel est lecture seule depuis le retrait de la §5 Wishlist (2026-08-13).
- **Telemetry** : aucun event émis par `panel-gaming.jsx` — les trois events du tracker jeux (`games_brief_shown`, `games_release_ack`, `games_unwatch_franchise`) vivent dans `cockpit/home.jsx::GamesBriefCard`, pas ici (cf. « Tracker jeux — lot 1 » et [docs/telemetry.md](docs/telemetry.md)).

## Dépendances
- **Onglets in** : sidebar "Gaming" (groupe Personnel). Aucun cross-nav entrant.
- **Onglets out** : aucun. Le cross-nav vers `gaming_news` ("Veille gaming →") vivait dans la §5 Wishlist, retirée le 2026-08-13 — `onNavigate` reste dans la signature de `PanelGaming` mais n'est plus appelé nulle part dans le composant.
- **Pipelines obligatoires** :
  - `steam-sync.yml` — sans ça, toutes les sections sauf Riot sont vides, la condition `(snapshot || []).length` dans `loadPanel("gaming")` empêche même le `replaceShape` → fake data persist.
  - `tft-sync.yml` — sans ça, le profil Riot est "—" et la card "Teamfight Tactics" n'apparaît pas.
- **Variables d'env / secrets** : `STEAM_API_KEY`, `STEAM_ID` (pipeline), `RIOT_API_KEY`, `RIOT_PUUID` (TFT), `SUPABASE_SERVICE_KEY` (écriture).

## États & edge cases
- **Loading** : `<PanelLoader>` Tier 2 pendant les 6 fetchs parallèles.
- **Snapshot vide** : **claim invalidée le 2026-08-13, non liée au lot jeux.** `data-gaming-perso.js` n'a jamais été vidé (inchangé depuis le commit `86e1460`, migration initiale) — il contient toujours le jeu de démo complet du 2026-04-24 (Persona 5 Royal, TFT Master, wishlist Hollow Knight Silksong…). `PanelGaming` ne fait aucun short-circuit empty state : si `steam_games_snapshot` revenait vide, la garde `if (... && (snapshot||[]).length)` de `loadPanel("gaming")` empêcherait `replaceShape` de tourner, et **tout** le panel — pas seulement le hero — continuerait d'afficher ce jeu de données fictif sans aucun indice pour l'utilisateur. Non observé en production (918 rows), mais le filet de sécurité que ce paragraphe décrivait n'existe pas dans le code actuel.
- **`in_progress` vide** (aucun jeu Steam joué 14j + pas de TFT) : "Aucun jeu joué les 14 derniers jours sur Steam."
- **Backlog vide** (bibliothèque à 100% lancée) : "Bibliothèque entièrement explorée."
- **Abandoned section** : skippée entièrement (`{(D.abandoned || []).length > 0 && (...)}`) si 0 match.
- **`daily_sessions` vide** : "Pas de stats quotidiennes — pipeline trop récent."
- **`genres_30d` vide** (0 jeu enrichi avec playtime 14j) : "Pas assez de données enrichies (steam_game_details quasi vide)." — explicite sur la cause racine.
- **`top_alltime` vide** : "Pas de snapshot Steam disponible."
- **`achievements` vide** (actuel) : "Aucun achievement Steam tracké pour l'instant — phase D du pipeline ne déclenche que sur les jeux joués les 14 derniers jours." — description légèrement imprécise (en vrai, phase D tourne lundi/--force, pas gated par 14j).
- **Heatmap** : **toujours affichée, toujours fictive.** `transformGaming` ne calcule jamais de `heatmap` ; `replaceShape` ne remplaçant que les clés qu'il reçoit, la grille mock de `data-gaming-perso.js` (générée le 2026-04-24, jamais rebranchée sur une vraie source) reste affichée en permanence — y compris avec des données Steam réelles partout ailleurs sur l'écran. Aucune table Supabase n'expose aujourd'hui l'heure d'une session.
- **`lastGame` null** (in_progress vide) : bloc "aucune session récente" avec opacity 0.6.
- **`tftRow.tier` null** : rang = "—", matchs = 0, la card "Teamfight Tactics" n'apparaît pas.
- **PSN/Xbox placeholders** : toujours affichés, toujours à 45% opacity, "pipeline non branché". Aucun moyen de les masquer.
- **Erreur réseau Tier 2** : `PanelError` avec bouton Réessayer. Les 3 fetchs avec `.catch()` (game_details, tft_rank, tft_match_count) se dégradent silencieusement.
- **Steam CDN down** : les covers deviennent les backgrounds fallback `#1b2838` (Steam dark).

## Limitations connues / TODO
- [ ] **Fake data persist si DB vide** — claim « fixé » invalidée le 2026-08-13, en marge du lot jeux : `data-gaming-perso.js` n'a jamais été vidé (inchangé depuis le commit `86e1460`) et le panel n'a pas de short-circuit empty state. Si `steam_games_snapshot` revenait vide un jour, tout le panel — pas seulement la heatmap — resterait figé sur le jeu de démo du 2026-04-24 sans avertissement. Non observé en prod (918 rows), mais le filet de sécurité documenté n'existe pas dans le code. À vérifier/réparer hors de ce lot.
- [ ] **Heatmap = mock 100% du temps, en permanence** — `transformGaming` n'a jamais calculé de `heatmap` (aucune table Supabase n'expose l'heure d'une session) : la clé est absente de son shape de retour, et `replaceShape` ne touchant que les clés qu'il reçoit, la grille mock de `data-gaming-perso.js` reste affichée indéfiniment, y compris avec un snapshot Steam réel. À supprimer la section pour de vrai, ou à rebrancher sur une vraie source.
- [x] ~~Wishlist lecture seule~~ — **correction 2026-08-13** : cette entrée décrivait un `<WishlistEditor>` avec POST/PATCH/DELETE (`gmWishlistPost/Patch/Delete`, handlers `handleWishlistCreate/Update/Delete`) qui n'a **jamais existé** dans `panel-gaming.jsx` — dérive documentaire retirée. Ce qui existait réellement était une §5 en lecture seule (cartes wishlist, pas d'édition), retirée le jour même : la table `gaming_wishlist` est désormais absorbée dans `game_progress` via `igdb_tracker_sync.py --import-wishlist` (cf. « Tracker jeux — lot 1 »).
- [x] ~~Pas de migration SQL versionnée~~ — **fixé** : [sql/013_gaming.sql](sql/013_gaming.sql) idempotent pour 5 tables Steam + wishlist + trigger `updated_at`.
- [x] ~~`sessions` toujours 0 dans top_alltime~~ — **fixé** : colonne retirée de l'UI (5 cols au lieu de 6), label "plateforme · depuis" remplacé par "plateforme" (depuis=null).
- [x] ~~Zero telemetry~~ — **claim à vérifier** : les events `gaming_wishlist_added|updated|deleted` documentaient le CRUD de la ligne ci-dessus, qui n'a jamais existé — ils n'ont donc jamais été émis. `panel-gaming.jsx` n'a aujourd'hui aucun appel `track()` (cf. Appels externes).
- [x] ~~NaN dans GmActivityChart si data.length=1~~ — **fixé en marge** : guard `data.length > 1` sur la fonction `x(i)`.
- [ ] **`steam_game_details` à 2/918** : taux d'enrichissement catastrophique (cap `MAX_ENRICH_PER_RUN = 20`). Soit lever le cap, soit prioriser les jeux joués 14j, soit tolérer un catch-up lent (année). Vérifier pourquoi 2 seulement alors que le pipeline tourne depuis plusieurs jours.
- [ ] **Achievements à 0 depuis release** : phase D --force dans le workflow est censée déclencher à chaque run, mais zéro achievement importé. Bug probable dans `GetUserStatsForGame` ou `GetPlayerAchievements`.
- [ ] **`hltb_main` / `progress_pct` tous null** : UI supporte ces champs mais aucune source HLTB. Intégrer l'API HowLongToBeat (non-officielle) OU retirer les champs de l'UI (comme fait pour sessions).
- [ ] **`shame_years`, `acquired_how`, `acquired`** hardcoded à `null` / `"—"` / `"Steam · jamais lancé"` pour le backlog. Steam API ne fournit pas la date d'achat. Retirer les colonnes ou brancher sur Steam store history (login requis).
- [ ] **Slices hardcoded** : `in_progress.slice(0, 4)`, `backlog.slice(0, 8)`, `abandoned.slice(0, 12)`, `top_alltime.slice(0, 10)`, `recent_achievements.slice(0, 6)`. Pas de "Load more", pas de config.
- [ ] **PSN / Xbox placeholders permanents** : si l'utilisateur ne compte pas brancher un jour, masquer les cards au lieu d'afficher "pipeline non branché".
- [ ] **`milestones` hardcoded** : 6 entrées toujours affichées, dont "Jeux terminés" à 0 faute de signal "done". Pas de config par utilisateur.
- [ ] **Chart range limité à 30/90** : toggle "180j" absent même si le fetch récupère 180 jours (`limit=180`). Juste un ajout de bouton à faire.
- [ ] **Aucun cross-nav** : le seul lien sortant (`gaming_news` via §5 Wishlist) a disparu avec elle le 2026-08-13 ; `onNavigate` reste dans la signature de `PanelGaming` sans être appelé. Pas de bouton "Ouvrir sur Steam" par jeu, pas de copie vers Carnet d'idées non plus. Panel figé, sans issue.
- [ ] **Moyenne mobile 7j "centrée"** : la fenêtre est `[i-3, i+4]` — inclut le futur sur les 3 derniers jours, causant un artefact de lissage près de "aujourd'hui".
- [ ] **`data-gaming.js` ≠ `data-gaming-perso.js`** : deux fichiers similaires dans index.html. Le premier alimente `GAMING_DATA` (veille gaming/gaming_news), le second `GAMING_PERSO_DATA` (ce panel). Confusion potentielle.

## Tracker jeux — lot 1

Le lot 1 du tracker jeux (IGDB) **n'ajoute rien à cet onglet**. Il vit entièrement dans le Brief (`cockpit/home.jsx::GamesBriefCard`, cf. [tab-brief](tab-brief.md)) et dans quatre nouvelles tables dédiées, sans aucune table `gaming_*`/`steam_*` existante touchée :

- **4 tables** (`sql/027_game_tracker.sql`, RLS `authenticated` sur les 4 opérations) : `game_franchises` (licences suivies), `game_titles` (jeux, IGDB), `game_releases` (événements annonce/date/sortie/annulation détectés par diff), `game_progress` (statuts wishlist/playing/finished/dropped — **user-owned**, jamais écrite par un pipeline sauf `import_wishlist()` en `ignore_dupes`, un one-shot qui absorbe l'ancienne `gaming_wishlist`).
- **Pipeline** `pipelines/igdb_tracker_sync.py`, cron quotidien `30 8 * * *` via [.github/workflows/igdb-tracker-sync.yml](.github/workflows/igdb-tracker-sync.yml). Quatre phases : seed (bibliothèque Steam → IGDB via `external_games`), refresh des collections `watched`, diff → `game_releases`, durée de jeu (`game_time_to_beats`). Nécessite `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` (non posés au 2026-08-13 — voir [docs/secrets.md](secrets.md)) ; sans eux, sortie `[skip]` code 0.
- **Seul point de contact** : l'encart `<GamesBriefCard>` du Brief, alimenté en Tier 1 par `game_releases` non acquittés < 30 jours. Deux actions : acquitter (✓) ou cesser de suivre la licence (✕ licence) — les deux écrivent en base, rien ne s'accumule côté écran.
- **La refonte de cet onglet Gaming (lot 2)** — bibliothèque à statuts lisant les 4 tables `game_*`, rail « À venir » — **est conditionnée à la sonde de survie télémétrie** : `games_brief_shown` / `games_release_ack` / `games_unwatch_franchise` (déjà dans [docs/telemetry.md](telemetry.md)). Trois semaines sans acquittement ni désabonnement après le premier événement détecté ⇒ le lot 2 n'est pas lancé et l'encart est retiré.
- Détails d'architecture et alternative rejetée : ADR-34 dans [docs/architecture/decisions.md](architecture/decisions.md). Flow déclaratif : [docs/architecture/flows/perso-jeux.yaml](architecture/flows/perso-jeux.yaml).

## Dernière MAJ
2026-08-13 — Task 8 du lot tracker jeux (IGDB) : (1) retrait de la §5 Wishlist (Parcours, Fonctionnalités, structure DOM, fonctions JS, table `gaming_wishlist`, appels externes, télémétrie, dépendances) — la table reste en base, absorbée dans `game_progress` ; (2) correction d'une dérive documentaire : le `<WishlistEditor>` CRUD (POST/PATCH/DELETE, handlers, 4 events télémétrie) décrit par cette spec n'a **jamais existé** dans `panel-gaming.jsx` — seule une §5 en lecture seule existait réellement, retirée le même jour (commit `39c7692`) ; (3) ajout de la section « Tracker jeux — lot 1 » ; (4) constat annexe, hors scope du lot jeux : plusieurs claims « fixé » de cette spec (empty state dédié, fake data purgée, heatmap supprimée) sont invalidées par le code actuel — `data-gaming-perso.js` n'a jamais été vidé depuis la migration initiale et `transformGaming` n'écrase jamais `D.heatmap`, qui reste la grille mock du 2026-04-24 en permanence ; sections correspondantes corrigées en l'état, correctif de code non fait (hors périmètre docs).
2026-04-24 — réécriture Parcours utilisateur en vocabulaire produit.
2026-04-24 — réécriture Fonctionnalités en vocabulaire produit.
2026-04-24 — rétro-doc + 7 correctifs appliqués (empty state dédié, fake data purgée, section heatmap supprimée, wishlist CRUD UI, migration 013 versionnée, télémétrie, NaN fix GmActivityChart) — commit `c456ac9` (base). **Correctifs invalidés le 2026-08-13, voir entrée ci-dessus.**
