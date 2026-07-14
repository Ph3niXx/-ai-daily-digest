# Médiathèque — tracker anime (v1), extensible mangas/livres/films/séries

> Design validé le 2026-07-14. Nouvel onglet **Médiathèque** (groupe Personnel) : recherche d'anime en direct via **AniList GraphQL**, regroupement des fiches en **franchises** (saisons TV + films/OVA rattachés), bibliothèque personnelle avec **progression par saison** (compteur « vu jusqu'à l'ép. N »), statuts **dérivés** (À voir / En cours / À jour / Vu), et **pipeline quotidien** qui rafraîchit les entrées suivies et détecte les nouvelles saisons → section « Sorties » dans l'onglet + encart dans le Brief du jour. Schéma `media_*` générique (`media_type`) pour l'extension future mangas/comics/livres/séries/films — v1 = anime uniquement.

## Besoin

Tracker personnel de visionnage :
1. **Rechercher un anime** : titres (anglais + japonais), type/genres, la liste de ses saisons avec dates de sortie, et les prochaines sorties.
2. **Être prévenu quand une nouvelle saison sort** (annonce, date fixée, début de diffusion) pour les animes suivis — sans ouvrir un site tiers.
3. **Déclarer sa progression** : watchlist / vus, épisodes vus par saison.

L'onglet « Anime / Ciné / Séries » existant est un corpus de **veille news** (RSS + Jikan upcoming global) : autre usage, il ne bouge pas. La Médiathèque est un onglet distinct, orienté données personnelles.

## Décisions structurantes (validées en brainstorming)

| Sujet | Décision |
|---|---|
| Placement | Nouvel onglet `mediatheque`, groupe **Personnel**, après Gaming |
| Source de données | **AniList GraphQL** (`https://graphql.anilist.co`) — public, sans clé, CORS OK, `nextAiringEpisode` (date exacte du prochain épisode), manga couvert nativement pour l'extension future. Jikan reste sur la veille. |
| Modèle « un anime » | **Franchise** = chaîne SEQUEL/PREQUEL regroupée (saisons TV/ONA numérotées + films canon de la chaîne) + bonus rattachés (SIDE_STORY 1 saut) |
| Progression | **Compteur par saison** (« vu jusqu'à l'ép. N »), pas de cases par épisode |
| Statuts | **Dérivés** de la progression (À voir / En cours / En cours · à jour / Vu), aucun statut manuel |
| Notification | Section « Sorties » dans l'onglet **+ encart Brief du jour** (lecture directe de `media_releases` par le front — aucun couplage avec `main.py`/Gemini) |
| Extension future | Schéma `media_*` avec `media_type` ('anime' en v1) et `source`/`source_id` agnostiques ; mangas/livres/films = v2+, non couverts par l'UI v1 |

## Modèle de données — `sql/020_media_tracker.sql`

4 tables. Séparation stricte : le front **crée** `media_entries` à l'ajout, mais seul le **pipeline les rafraîchit** ensuite ; **l'utilisateur possède `media_progress`** — le refresh ne peut jamais écraser la progression.

```sql
media_franchises   -- une carte de la bibliothèque (n'existe que si ajoutée)
  id uuid PK default gen_random_uuid()
  media_type text NOT NULL default 'anime'   -- extensible : manga, livre, film, serie, comic
  source text NOT NULL default 'anilist'
  source_root_id int NOT NULL                -- id AniList de la racine de la chaîne
  title_romaji text, title_english text, title_native text
  synopsis text, genres text[], cover_url text, banner_url text
  added_at timestamptz default now(), updated_at timestamptz default now()
  UNIQUE (source, source_root_id)            -- dédup : ajouter via S1 ou S3 = même franchise

media_entries      -- saisons / films / OVA d'une franchise (propriété du pipeline)
  id uuid PK
  franchise_id uuid FK → media_franchises ON DELETE CASCADE
  source text NOT NULL default 'anilist', source_id int NOT NULL
  in_main_chain bool NOT NULL                -- true = chaîne SEQUEL/PREQUEL (saisons + films canon)
  kind text CHECK IN ('season','movie','ova','special','other')
  season_number int                          -- S1..Sn, uniquement kind='season'
  title_romaji text, title_english text, title_native text
  format text                                -- TV, TV_SHORT, MOVIE, OVA, ONA, SPECIAL, MUSIC
  airing_status text                         -- FINISHED | RELEASING | NOT_YET_RELEASED | CANCELLED | HIATUS
  episodes_total int                         -- NULL tant que non annoncé ; 1 pour un film
  start_date date, end_date date
  next_episode_number int, next_episode_airing_at timestamptz   -- si RELEASING
  cover_url text, sort_order int
  created_at, updated_at
  UNIQUE (source, source_id)

media_progress     -- données utilisateur (JAMAIS touchées par le pipeline)
  id uuid PK
  entry_id uuid FK → media_entries ON DELETE CASCADE, UNIQUE
  episodes_watched int NOT NULL default 0 CHECK (episodes_watched >= 0)
  updated_at timestamptz default now()

media_releases     -- événements détectés par le pipeline → section Sorties + encart Brief
  id uuid PK
  franchise_id uuid FK ON DELETE CASCADE
  entry_id uuid FK ON DELETE CASCADE
  event_type text CHECK IN ('new_entry','airing_started','date_announced')
  title text NOT NULL                        -- libellé prêt à afficher ("Nouvelle saison annoncée : …")
  event_date date                            -- date de sortie concernée si connue
  detected_at timestamptz default now()
  acknowledged bool NOT NULL default false
  UNIQUE (entry_id, event_type)              -- un événement ne se déclenche qu'une fois par entrée
```

- **RLS** : pattern `challenge_attempts` — policies `authenticated` SELECT/INSERT/UPDATE/DELETE sur les 4 tables. Le pipeline écrit en `SUPABASE_SERVICE_KEY` (bypass).
- Index : `media_entries (franchise_id)`, `media_releases (acknowledged, detected_at DESC)`.
- Un report de date (délai) **met à jour** `media_entries.start_date` (le calendrier reflète la nouvelle date) mais **ne re-déclenche pas** d'événement (`UNIQUE (entry_id, event_type)`) — anti-bruit assumé, un `date_changed` pourra s'ajouter en v2.

## Règles franchise — le « walk » AniList (contrat commun front + pipeline)

Implémenté deux fois (JS front pour la fiche pré-ajout, Python pipeline pour le refresh) — duplication assumée (~80 lignes chacune), ce contrat fait foi et `--check` permet de comparer les deux sorties.

1. **Chaîne principale** = fermeture des relations `SEQUEL`/`PREQUEL` depuis la fiche choisie, **tous formats confondus** (un film peut être un maillon canon, ex. *Demon Slayer : Mugen Train* entre S1 et S2). Toutes les entrées de la chaîne : `in_main_chain = true`.
2. **kind** : entrées de chaîne TV/TV_SHORT/ONA → `season` ; MOVIE → `movie` ; OVA → `ova` ; SPECIAL → `special` ; autres → `other`. (ONA compte comme saison : les séries modernes Netflix/Crunchyroll sont souvent des ONA.)
3. **Numérotation** : les entrées `kind='season'` triées par `(start_date ASC NULLS LAST, source_id ASC)` reçoivent `season_number` = 1..n. Une saison annoncée sans date passe en dernier. `sort_order` = position dans ce tri (chaîne complète, films inclus).
4. **Bonus** (`in_main_chain = false`) : relations `SIDE_STORY` à **1 saut** depuis les nœuds de la chaîne, tous formats. Trackables, mais n'entrent jamais dans le calcul de statut.
5. **Exclus** : `SPIN_OFF`, `CHARACTER` (autre franchise — se recherche séparément), `SUMMARY` (films récap), `ALTERNATIVE` (retellings), `ADAPTATION`/`SOURCE` (le manga d'origine), `OTHER`, et le format `MUSIC`.
6. **Racine** = entrée de la chaîne avec le `start_date` le plus ancien (fallback : la fiche d'ancrage si toutes sans date). `source_root_id` = son id AniList. Les métadonnées franchise (titres, cover, genres, synopsis) viennent de la racine.
7. GraphQL permet le batch : ancre + relations en 1 requête, puis fermeture par lots `Page { media(id_in: [...]) { ..., relations } }` → **2 à 4 requêtes par franchise**, quelle que soit sa taille.

## Statuts dérivés (calcul front, entrées `in_main_chain` uniquement)

- Épisodes **sortis** d'une entrée = `episodes_total` si FINISHED · `next_episode_number − 1` si RELEASING · `0` si NOT_YET_RELEASED. Films : total = 1. CANCELLED est traité comme FINISHED (`sortis = episodes_total`, ou 0 si inconnu) pour ne pas bloquer le « Vu » à jamais.
- `vus = Σ episodes_watched` · `sortis = Σ sortis` (chaîne principale seulement).
- **À voir** : vus = 0 · **En cours** : 0 < vus < sortis · **Vu** : vus ≥ sortis et toutes les entrées FINISHED · **En cours · à jour** : vus ≥ sortis mais au moins une entrée RELEASING/NOT_YET_RELEASED/HIATUS.
- Un bonus non vu ne bloque jamais « Vu ». Le stepper d'une entrée est plafonné aux épisodes sortis (désactivé si NOT_YET_RELEASED).

## UX de l'onglet

Onglet `{ id: "mediatheque", label: "Médiathèque", icon: "tv" }` (icône `tv` à ajouter dans `cockpit/icons.jsx`, fallback `star`), groupe Personnel après Gaming. Fichiers : `cockpit/panel-mediatheque.jsx` + `cockpit/data-mediatheque.js` (seed vide, pattern `data-anime.js`) + `cockpit/lib/anilist.js` + `cockpit/styles-mediatheque.css` (pattern `styles-jobs-radar.css`).

Trois zones :

1. **Bandeau « Sorties »** (haut de page) :
   - événements `media_releases` non acquittés (< 30 j), bouton ✓ (PATCH `acknowledged=true`) ;
   - calendrier des prochaines diffusions **de ma liste**, dérivé de `media_entries` : saisons RELEASING → « ép. {next_episode_number} · {date/heure locale} », saisons NOT_YET_RELEASED datées → « première le {date} », triées par imminence. Masqué si vide.
2. **Ma bibliothèque** (vue par défaut) : grille de cartes franchise — cover, titre anglais (romaji en sous-titre), badge statut dérivé, barre de progression « 37/87 ép. ». Filtres statut (Tous / À voir / En cours / Vu) + tri (dernière activité / date d'ajout / alphabétique) + filtre texte local. État vide : invite à rechercher.
3. **Recherche** : champ avec debounce 400 ms → AniList live → cartes résultats (cover, titres, format, année, genres, score moyen, badge « déjà dans ta liste » le cas échéant). Clic → **fiche en mode préversion** (walk live, spinner ~2 s) → bouton « + Ajouter à ma liste ».

**Fiche franchise** (préversion ou bibliothèque — même composant) :
- header : cover, titres EN/JP/romaji, genres, format, années, synopsis, statut + progression globale ;
- **Saisons** : « S1 · 2013 · 25 ép. · Terminée » + stepper `− [12/25] +`, saisie directe au clic sur le nombre, bouton « ✓ saison vue » (= sortis) ; saison en diffusion : « 8 ép. sortis · prochain ép. jeudi 18h » ; films canon de la chaîne inline à leur position chronologique (toggle vu 0/1) ;
- **Bonus** (hors progression) : OVA/spéciaux avec toggle ou stepper ;
- « Retirer de ma bibliothèque » (confirmation ; DELETE franchise → CASCADE entrées + progression + releases).

**Écritures** (via `window.sb`, JWT) : ajout = POST `media_franchises` puis POST batch `media_entries` (échec → DELETE de la franchise créée, toast « réessaie » — ajout atomique) ; progression = upsert `media_progress` (`on_conflict=entry_id`), **optimiste** : UI mise à jour immédiatement, rollback + toast si échec.

**Encart Brief du jour** (`cockpit/home.jsx`) : bloc « 📺 Médiathèque » si des `media_releases` non acquittées de < 7 j existent — max 3 lignes + lien vers l'onglet. Données chargées en Tier 1 (léger : 0-5 lignes en pratique).

## Intégration AniList — `cockpit/lib/anilist.js`

- Script classique (pas de module), exposé `window.anilist` : `search(q)`, `fetchFranchise(anchorId)` (le walk), helpers de mapping vers le schéma `media_*`.
- File d'attente interne : **1 requête max / ~700 ms**, gestion 429 (respect `Retry-After`, retry ×2), cache de session (Map) des recherches et walks déjà faits.
- Champs demandés : `id, idMal, title { romaji english native }, format, status, description, genres, episodes, startDate, endDate, season, seasonYear, coverImage { large, color }, bannerImage, averageScore, nextAiringEpisode { episode airingAt }, relations { edges { relationType node { id format status } } }`.
- **CSP** (`index.html`) : `connect-src` += `https://graphql.anilist.co` ; `img-src` += `https://s4.anilist.co`.

## Pipeline — `pipelines/anime_tracker_sync.py`

Workflow `.github/workflows/anime-tracker-sync.yml`, **cron `30 7 * * *`** (quotidien 07:30 UTC, après la veille anime de 07:00) + `workflow_dispatch`. Env : `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` uniquement (AniList sans clé — rien à ajouter à `docs/secrets.md`).

1. Lit franchises + entrées en base.
2. Re-fetch AniList par lots `id_in` (~15 ids/requête, espacées de **2,5 s** — bibliothèque de 100 franchises ≈ 15-20 requêtes, sous la limite ~30 req/min) + re-walk depuis les feuilles de chaîne pour détecter les nouveautés.
3. **Upsert `media_entries`** : `airing_status`, dates, `episodes_total`, `next_episode_*`, nouvelles entrées.
4. **Insère `media_releases`** :
   - `new_entry` — une nouvelle saison / un nouveau film apparaît dans les relations d'une franchise suivie ;
   - `airing_started` — une entrée passe à RELEASING ;
   - `date_announced` — un `start_date` apparaît sur une entrée qui n'en avait pas.
5. Échec d'un lot → log + continue (le run suivant rattrape). Sortie non-zéro si tout a échoué.

Modes debug : `--dry-run` (aucune écriture) · `--check <anilist_id>` (affiche la franchise walkée : chaîne, numéros, bonus, exclusions — pour comparaison visuelle avec la fiche front).

## Data layer

- **Tier 1** (`bootTier1`, `cockpit/lib/data-loader.js`) : + fetch léger `media_releases?acknowledged=eq.false&detected_at=gte.<J-7>&limit=5` → `window.COCKPIT_DATA.media_releases` (encart Brief).
- **Tier 2** : `loadPanel("mediatheque")` fetch les 4 tables → mute `window.MEDIATHEQUE_DATA = { franchises, entries, progress, releases }` ; le panel calcule les statuts dérivés. Re-render via `dataVersion` (pattern standard).

## Télémétrie (`docs/telemetry.md` avant commit)

`mediatheque_search` (payload : `q_len, results`) · `mediatheque_add` (`franchise_root_id, entries, source`) · `mediatheque_remove` (`franchise_root_id`) · `mediatheque_progress` (`entry_kind, delta, completed`) · `mediatheque_release_ack` (`event_type`).

## Intégrations repo (mêmes commits que le code)

- **Les 6 étapes nouvel onglet** (`nav.js`) : nav → routing `app.jsx` → scripts `index.html` → spec `docs/specs/tab-mediatheque.md` (template `_template.md`) → `docs/specs/index.json` + `jarvis/spec.json::cockpit_tabs` → `docs/architecture/dependencies.yaml` (panel : reads 4 tables `media_*` + writes `media_franchises, media_entries, media_progress, media_releases, usage_events`).
- **Architecture** : 4 tables dans `dependencies.yaml` ; pipeline dans `pipelines.yaml` ; flow `docs/architecture/flows/perso-mediatheque` (même format que les flows perso existants) ; **ADR-28** dans `decisions.md` (AniList GraphQL vs Jikan, modèle franchise, séparation pipeline/progression).
- **Service worker** : `node scripts/sync-sw.mjs` après modif `index.html`/`cockpit/**`.
- **CLAUDE.md** : « 29 onglets » → « 30 onglets » (2 mentions).

## Hors périmètre v1 (explicite)

Mangas/comics/livres/films/séries (schéma prêt, UI non) · notes/scores et commentaires · statut manuel « Abandonné » · notifications externes (email/push) · import d'historique MAL/AniList · cases à cocher par épisode · événement `date_changed` (reports de date silencieux, calendrier à jour malgré tout) · carte « épisode sorti aujourd'hui » (le calendrier du bandeau couvre le besoin).

## Comportements attendus (exemples)

| Situation | Résultat |
|---|---|
| Recherche « frieren » | Cartes AniList ; clic → fiche préversion : S1 (28 ép., FINISHED), S2 (NOT_YET_RELEASED, date si annoncée) |
| Ajout *Demon Slayer* via la fiche S3 | 1 franchise (racine = S1 2019), chaîne S1 → film Mugen Train → S2 → S3 → S4…, film canon trackable inline |
| S1 25/25 + S2 12/12, S3-S4 à 0 | Badge **En cours**, 37/87 ép. |
| Tout vu, une saison RELEASING dans la chaîne | **En cours · à jour** ; stepper plafonné aux épisodes sortis |
| Tout vu, tout FINISHED, OVA bonus non vu | **Vu** (le bonus ne bloque pas) |
| Le pipeline découvre « Frieren S2 » annoncée | `media_releases (new_entry)` → bandeau Sorties + encart Brief ; ✓ → disparaît des deux |
| La date de S2 est annoncée plus tard | `date_announced` (1 seule fois) ; un report ultérieur met à jour le calendrier sans nouvel événement |
| AniList 429 / down | Recherche : état d'erreur + retry ; bibliothèque et progression intactes |
| Ajout interrompu (walk échoué) | Rien n'est persisté (rollback franchise), toast « réessaie » |
| Ajouter une franchise déjà présente | Toast « déjà dans ta bibliothèque » + ouverture de sa fiche (dédup `source_root_id`) |
