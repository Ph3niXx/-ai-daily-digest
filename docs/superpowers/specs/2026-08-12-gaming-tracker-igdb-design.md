# Tracker jeux vidéo — IGDB + seed Steam

Spec de conception. Suivre les jeux joués, détecter les suites des licences aimées et
surveiller les sorties annoncées. L'onglet Gaming cesse d'être un tableau de bord passif
de statistiques Steam pour devenir un tracker.

## Problème

Trois demandes de l'utilisateur, aucune servie aujourd'hui :

1. **Suivre ce à quoi il joue.** L'onglet Gaming affiche des heures Steam, pas un état.
   Rien ne distingue « fini » de « lâché au bout de 3 h », et 3 plateformes sur 4
   (PlayStation, Xbox, Switch) sont des placeholders sans pipeline.
2. **Voir arriver les suites des licences aimées.** Aucune source du cockpit ne connaît
   le lien entre un jeu et sa licence.
3. **Suivre les sorties annoncées.** `gaming_wishlist` (8 titres, CRUD manuel) est la
   seule réponse existante : une saisie à la main, sans détection, sans rappel.

S'y ajoute un constat mesuré le 2026-08-12 : l'onglet Gaming a été ouvert **7 fois en
90 jours**, et ses données sont dégradées — `steam_game_details` à **5 lignes sur 102**
(cap `MAX_ENRICH_PER_RUN = 20`), `steam_achievements` à **0 depuis la mise en service**.
Quatre de ses huit sections (Backlog, Abandonnés, Wishlist, Top all-time) disent déjà, en
moins bien, ce que le tracker dirait.

## Objectif

Un tracker de jeux dans l'onglet Gaming, alimenté par IGDB pour le catalogue et par
Steam pour l'inventaire, qui prévient l'utilisateur **sans qu'il ait à ouvrir l'onglet**.

Hors périmètre, tranché avec l'utilisateur : import d'un historique PSN / Xbox / Switch
(pas d'API exploitable), heures de jeu console, pourcentage d'avancement, suivi de
chapitre, recommandations par similarité (`similar_games` existe, on ne le branche pas).

## Principes directeurs

**1. Le pipeline possède l'inventaire, l'utilisateur possède le sens.**
Transposition ligne pour ligne de la séparation `media_entries` / `media_progress` qui
fait tenir la médiathèque : `game_titles` est écrite par le pipeline (IGDB + Steam),
`game_progress` ne l'est **jamais**. Steam sait combien d'heures ; il ne saura jamais si
c'est « fini » ou « lâché ».

**2. Aucun backlog, aucun compteur de dette.**
Le seed importe ~80 jeux sans statut. L'absence de ligne dans `game_progress` signifie
« non qualifié », pas « à faire ». Aucune UI n'affichera « 80 jeux à qualifier » : c'est
exactement l'arriéré de 47 cartes qui a tué atlas. La détection de suites fonctionne sans
qualification — être dans la bibliothèque avec 10 h au compteur suffit comme signal
« aimé », la note ne fait qu'affiner.

**3. Tables `game_*` dédiées, pas de réutilisation de `media_*`.**
L'ajout de TMDB avait pour critère de réussite explicite (ADR-29) que
`mediatheque-view.js` ne bouge pas d'une ligne — films et séries entraient dans le
vocabulaire `episodes_total` / `airing_status` / `next_episode_airing_at`. **Un jeu n'y
entre pas.** Réutiliser `media_franchises` avec `media_type='game'` forcerait `status()`,
`released()`, `pickHero()`, `pickTonight()`, `buildWeek()` et `pickRail()` à exclure
chacune les jeux — une dizaine de retouches dans un fichier testé de 385 lignes. Le
précédent ADR-29 plaide contre, pas pour. Coût du choix : ~40 lignes de SQL en plus.

**4. Le crochet de rappel est l'encart du Brief, pas l'onglet.**
Le bandeau interne d'un onglet ne se déclenche que si on y est déjà. `cockpit/home.jsx`
est en Tier 1, sur la page d'accueil.

## Source de données — IGDB v4

`api.igdb.com/v4`, compte développeur Twitch, OAuth `client_credentials`. Gratuit.
Limite **4 req/s, 8 requêtes ouvertes**, 429 au-delà — sans commune mesure avec le volume
visé (~25 collections rafraîchies par jour).

Champs vérifiés le 2026-08-12 contre les types générés depuis les docs officielles
(`github.com/DmitryScaletta/igdb-api-types`, `index.ts`) :

| Besoin | Champ IGDB |
|---|---|
| Statut du jeu | `Game.status` — `released=0, alpha=2, beta=3, early_access=4, offline=5, cancelled=6, rumored=7, delisted=8` |
| Date de sortie | `Game.first_release_date` (timestamp) et `Game.release_dates[]` → `ReleaseDate.date`, `.platform`, `.human`, `.date_format` |
| Lien de licence | `Game.collection` / `collections[]` → `Collection.games[]` ; `Game.franchises[]` (maille plus large) |
| Liens directs | `parent_game`, `dlcs[]`, `expansions[]`, `standalone_expansions[]`, `remakes[]`, `remasters[]`, `ports[]` |
| Intérêt | `Game.hypes` (nombre de suiveurs) |
| Durée | endpoint `game_time_to_beat` → `hastily` / `normally` / `completely`, en secondes |
| Pont Steam | endpoint `external_games` → `external_game_source = steam (1)`, `uid` = appid Steam |

`date_format` est le champ décisif : un jeu annoncé n'a souvent qu'une année ou un
trimestre. `human` fournit la chaîne prête à afficher (« Q1 2027 »). Le comportement
« annoncé sans date précise » existe déjà côté médiathèque pour les saisons.

`external_games` rend le raccordement Steam→IGDB **exact** : une requête batchée traduit
les appids en ids IGDB. Pas de matching par nom, qui aurait échoué sur
« FF VII Remake » vs « FINAL FANTASY VII REMAKE INTERGRADE ». L'enum couvre aussi
`xbox_marketplace = 31`, `playstation_store_us = 36` et
`xbox_game_pass_ultimate_cloud = 54` si PSN ou Xbox sont branchés un jour.

**Contrainte** : IGDB refuse les requêtes navigateur (CORS) et exige un client secret. La
recherche front passe donc par un proxy — voir plus bas.

## Schéma — migration `sql/027_game_tracker.sql`

RLS `authenticated` sur les 4 opérations, boucle `DO $$` copiée de `sql/020`.

```
game_franchises          -- une licence suivie, ou un jeu isolé sans collection
  id uuid pk
  igdb_collection_id int UNIQUE       -- null si le jeu n'appartient à aucune collection
  name text not null
  slug text
  cover_url text
  watched boolean not null default false  -- surveillée pour la détection de suites ;
                                          -- mise à true explicitement par la phase A
                                          -- ou par l'utilisateur, jamais par défaut
  added_at, updated_at

game_titles              -- écrite par le pipeline uniquement
  id uuid pk
  franchise_id uuid not null references game_franchises on delete cascade
  igdb_id int not null UNIQUE
  name text not null
  slug, summary, cover_url text
  genres text[], platforms text[]
  igdb_status text                    -- released | alpha | ... | cancelled | rumored
  first_release_date date             -- null si inconnue
  release_human text                  -- « Q1 2027 », « 2027 », « Mar 04, 2027 »
  release_precision text              -- day | month | quarter | year | tbd
  hypes int
  time_to_beat_minutes int            -- game_time_to_beat.normally / 60
  steam_appid int                     -- via external_games, null hors Steam
  sort_order int not null default 0
  created_at, updated_at

game_progress            -- user-owned, JAMAIS écrite par un pipeline
  id uuid pk
  title_id uuid not null UNIQUE references game_titles on delete cascade
  status text not null check (status in ('wishlist','playing','finished','dropped'))
  rating int check (rating between 0 and 100)
  platform text                       -- celle sur laquelle L'UTILISATEUR y joue
  note text
  updated_at

game_releases            -- événements détectés
  id uuid pk
  franchise_id uuid not null references game_franchises on delete cascade
  title_id uuid references game_titles on delete cascade
  event_type text check (event_type in ('announced','date_announced','released','cancelled'))
  title text not null
  event_date date
  detected_at timestamptz not null default now()
  acknowledged boolean not null default false
  UNIQUE (title_id, event_type)
```

Les heures Steam ne sont **pas** dupliquées : `game_titles.steam_appid` permet la
jointure côté client contre `steam_games_snapshot`, que le panel Gaming charge déjà.

### Les quatre événements

- `announced` — un `igdb_id` inconnu apparaît dans une collection `watched`
- `date_announced` — `first_release_date` passe de `null` à une valeur
- `released` — `igdb_status` bascule sur `released`
- `cancelled` — `igdb_status` bascule sur `cancelled`, pour qu'un fantôme ne pourrisse
  pas dans « À venir »

**Pas d'événement sur report de date** : la date se met à jour silencieusement. C'est le
comportement déjà retenu côté médiathèque, et les reports sont la norme dans le jeu vidéo
— en faire des événements produirait du bruit sans décision associée.

## Pipeline — `pipelines/igdb_tracker_sync.py`

Cron `30 8 * * *` (après anime 07:30, TMDB 07:45, jp-vocab 08:00 ; le snapshot Steam de
05:30 est frais). Workflow `.github/workflows/igdb-tracker-sync.yml`. Secrets
`TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`. Sans eux : sortie `[skip]` code 0, workflow
vert — contrat identique à `tmdb_tracker_sync` sans `TMDB_API_KEY`.

Réutilise `sb_get` / `sb_upsert` / `sb_patch` de `pipelines/media_tracker_common.py` tels
quels. **`diff_events` n'est pas réutilisée** : elle parle épisodes et statuts de
diffusion. Une `diff_game_events()` propre (~25 lignes) vit dans le nouveau module.

**Phase A — seed (idempotente, tourne à chaque run).** Lire le dernier
`steam_games_snapshot`, garder `playtime_forever_minutes > 0` (80 jeux au 2026-08-12),
batcher les appids vers `external_games`, résoudre en ids IGDB, créer les
`game_franchises` / `game_titles` manquants. Les jeux à **≥ 600 min** (21 jeux) marquent
leur collection `watched = true` ; les autres arrivent en bibliothèque sans surveiller
leur licence, pour ne pas noyer « À venir ».

**Phase B — refresh.** Pour chaque `game_franchises.watched`, demander `Collection.games`
avec `status`, `first_release_date`, `release_dates.*`, `cover`, `genres`, `platforms`,
`hypes`. Upsert dans `game_titles`.

**Phase C — diff.** `diff_game_events()` compare l'état DB aux lignes fraîches et écrit
`game_releases` en `resolution=ignore-duplicates` sur `(title_id, event_type)`.

**Phase D — enrichissement.** `game_time_to_beat` pour les titres qui n'en ont pas
encore, plafonné à 50 par run.

## Proxy — Edge Function `igdb-proxy`

Nécessaire uniquement au **lot 2** (recherche front pour ajouter un jeu console à la
main). Le pipeline appelle IGDB directement.

Le projet a déjà `jsearch-proxy`, mais son pattern ne doit **pas** être copié tel quel :
il porte sa clé RapidAPI en dur dans le source et tourne en `verify_jwt: false`. Pour
`igdb-proxy` :

- secret via `Deno.env.get("TWITCH_CLIENT_SECRET")`, jamais dans le source
- `verify_jwt: true` — le cockpit envoie déjà son JWT
- token applicatif Twitch mis en cache en mémoire (validité ~60 j) : le redemander à
  chaque requête brûlerait le quota
- en-têtes CORS restreints à l'origine GitHub Pages

Bénéfice de bord : contrairement à la clé TMDB posée en clair dans `user_profile`, le
secret Twitch ne quitte jamais le serveur.

> Constaté au passage, hors périmètre : `jsearch-proxy` expose une clé RapidAPI en dur
> derrière une fonction sans vérification de JWT. À traiter séparément.

## Lot 1 — la boucle sur la page d'accueil

Le seul livrable front : `<GamesBriefCard>` dans `cockpit/home.jsx`, à côté de
`<MdtBriefCard>`. Il lit `game_releases` non acquittés de moins de 30 jours (Tier 1) et
rend une ligne par événement :

```
🎮  Silksong — annoncé le 4 sept. 2026            ✓   ✕ licence
    suite de Hollow Knight · 42 h de jeu
```

Deux actions, toutes deux « décision + écriture » :
- **✓** acquitte l'événement (`acknowledged = true`)
- **✕ licence** passe `game_franchises.watched = false` — la licence cesse de remonter

Aucune navigation, aucun onglet à ouvrir. Zéro accumulation possible : un événement
acquitté ne revient pas, une licence retirée non plus.

Le lot 1 comprend donc : migration 027, pipeline, workflow, seed, `<GamesBriefCard>`,
migration des 8 lignes de `gaming_wishlist` en `game_progress.status = 'wishlist'`.
`gaming_wishlist` et la §5 de `panel-gaming.jsx` sont retirées dans le même lot — sinon
deux endroits coexistent où noter un jeu qui intéresse.

## Lot 2 — refonte de l'onglet Gaming

**Conditionné aux résultats du lot 1** (voir Sonde de survie).

| Section actuelle | Devient |
|---|---|
| §2 Backlog · §2bis Abandonnés · §5 Wishlist | absorbées dans une bibliothèque à statuts (`envie` / `en cours` / `fini` / `lâché`) |
| §6 Top all-time | un tri de cette même bibliothèque |
| — | **À venir** : suites annoncées et datées des licences surveillées |
| §1 En cours · §3 Activité · §4 Genres · §7 Achievements · §8 Milestones | conservées, reléguées sous la bibliothèque |

Fiche jeu : les 4 statuts en un tap, note 0–100 à la fin, plateforme déclarée, lien
« surveiller cette licence ». Recherche IGDB via le proxy pour ajouter un jeu console.

Toute la logique dérivée va dans un `cockpit/lib/games-view.js` séparé, testé sous node
comme `mediatheque-view.js` — aucune logique dans le JSX du panel.

Bénéfice de bord : `§4 Genres` cesse d'afficher « 100 % Autre ». IGDB fournit les genres
de tous les titres, là où l'enrichissement Steam plafonne à 5 jeux sur 102.

## Télémétrie et sonde de survie

Lot 1 : `games_brief_shown {count}`, `games_release_ack {event_type}`,
`games_unwatch_franchise {franchise}`.
Lot 2 : `games_status_set {status}`, `games_rate`, `games_search`, `games_add`.

**Sonde** : trois semaines consécutives sans un seul `games_release_ack` ni
`games_unwatch_franchise` après le premier événement détecté ⇒ le lot 2 n'est pas lancé
et l'encart est retiré. Même contrat que la bande « Avant l'épisode » et que la PWA iOS —
dont la sonde, mesurée le 2026-08-12, est à **zéro event `surface:"pwa"` en deux
semaines**.

## États & edge cases

- **Jeu Steam absent d'IGDB** (`external_games` ne le connaît pas) : ignoré au seed, log
  explicite avec le nom. Pas d'échec du run.
- **Jeu sans collection** (`Game.collection` null) : une `game_franchises` est créée avec
  `igdb_collection_id = null` et le nom du jeu. Il apparaît en bibliothèque ; aucune
  suite ne peut être détectée pour lui, ce qui est correct.
- **Date imprécise** : `release_precision` porte la granularité, l'UI affiche `human`
  tel quel. Jamais de jour inventé.
- **Jeu annulé** : événement `cancelled`, `igdb_status` conservé. La ligne reste en
  bibliothèque, sortie de « À venir ».
- **Collection très large** (une franchise comme « Mario » peut porter des centaines de
  titres) : cap à 100 titres par collection par run, tri par `first_release_date desc`,
  et log du dépassement. Une licence qui déborde est un signal à traiter, pas à masquer.
- **Secrets Twitch absents** : `[skip]` code 0, l'onglet Gaming reste dans son état
  actuel.
- **429 IGDB** : `Retry-After` respecté, throttle 250 ms entre requêtes — même contrat
  que les clients TMDB et AniList.
- **Seed rejoué** : idempotent par `UNIQUE (igdb_id)` et `UNIQUE (igdb_collection_id)`.
- **`watched = false` puis nouveau jeu dans la licence** : aucun événement, par
  construction. C'est le but du bouton.

## Tests

- `tests/test_igdb_tracker.py` — `diff_game_events()` sur les 4 types, mapping
  `date_format` → `release_precision`, résolution `external_games` avec appid inconnu,
  idempotence du seed. Aucun appel réseau (fixtures JSON).
- Lot 2 : `tests/test_games_view.mjs` sous node, sur le modèle de
  `test_mediatheque_view.mjs`.

## Documentation à mettre à jour (même commit)

`docs/specs/tab-gaming.md` (+ bump `last_updated` dans `docs/specs/index.json`) ·
`docs/architecture/pipelines.yaml` · `docs/architecture/dependencies.yaml` ·
`docs/architecture/flows/perso-jeux.yaml` (nouveau) · `docs/architecture/decisions.md`
(ADR : tables dédiées plutôt que `media_*`, et proxy plutôt que clé front) ·
`docs/secrets.md` (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`) · `docs/telemetry.md` ·
`node scripts/sync-sw.mjs` si le front bouge.

Pas de nouvel id de panel — on réutilise `gaming`, donc rien à ajouter à
`KNOWN_SECTIONS` dans `extract_signals.py`.

## Risques assumés

1. **La bascule ne se visite pas tous les jours.** Un statut change quelques fois par
   mois, pas tous les soirs. Il n'y a pas d'équivalent de « Ce soir » ici, et il ne faut
   pas en inventer un. C'est précisément pourquoi le lot 1 met toute la boucle sur la
   page d'accueil et pourquoi le lot 2 est conditionnel.
2. **`actifs sur 14 jours = 1`.** L'activité Steam est basse. Le rail « En cours » côté
   PC sera souvent vide ; ce sont les déclarations console qui le rempliront — donc du
   travail manuel, donc un risque d'abandon. Mesuré par `games_status_set`.
3. **IGDB est communautaire.** Les dates d'annonces peuvent être approximatives ou en
   retard sur l'actualité. Acceptable pour de la veille, pas pour du temps réel.
