# Médiathèque — films & séries (TMDB) + carte « Ce soir »

Spec de conception. Deux chantiers liés : ouvrir la médiathèque à une seconde source
(TMDB, films et séries) et livrer la carte de décision du soir que cette ouverture rend
enfin intéressante.

## Problème

La médiathèque suit 44 franchises anime et sait dire ce qui sort cette semaine, mais :

1. **Elle est mono-source.** Le schéma 020 avait anticipé l'élargissement (`media_type`,
   `source`, `kind IN (…,'movie',…)`) mais rien n'a été branché. Films et séries — que
   l'utilisateur suit déjà en veille dans l'onglet « Anime / Ciné / Séries » — n'ont pas
   de place où atterrir.
2. **Elle ne tranche pas.** Le hero met en avant un titre selon une table de priorité
   fixe. À 22 h — le pic d'activité réel de l'utilisateur — la question n'est pas « quel
   est le titre le plus pertinent » mais « qu'est-ce que je regarde avec le temps que
   j'ai ». Un épisode de 24 min et un film de 2 h ne sont pas la même décision, et rien
   dans le modèle actuel ne connaît une durée.
3. **Le sync anime va corrompre les données à la première franchise non-AniList.**
   `run_sync()` charge toutes les franchises et toutes les entrées sans filtrer sur
   `source`, puis envoie chaque `source_root_id` à AniList. Un id TMDB qui correspond par
   hasard à un anime écrase silencieusement la fiche.

## Objectif

Une médiathèque source-agnostique où films et séries cohabitent avec l'anime sans
dupliquer une ligne de logique dérivée, et une bande « Ce soir » qui propose au plus
trois choix calibrés sur le temps disponible.

Hors périmètre, tranché avec l'utilisateur : mangas, livres, note au niveau franchise,
import d'historique (Trakt / Letterboxd / MAL), recommandations par similarité.

## Principe directeur

**Le contrat de données est celui d'AniList. Toute nouvelle source y est traduite à
l'ingestion, une fois.** `released()`, `status()`, `currentEntryOf()`, `pickHero()` et
`buildWeek()` ne sont pas modifiés — ils ne savent pas qu'une seconde source existe.

C'est le choix structurant de cette spec. Sa contrepartie doit être assumée : le
vocabulaire AniList (`airing_status`, `episodes_total`, `next_episode_number`) devient un
contrat implicite pour toutes les sources futures. Il est documenté ici et dans
`docs/architecture/decisions.md` (ADR à ajouter), faute de quoi la troisième source
dérivera en silence.

## Étanchéité par source (prérequis)

À faire **avant** toute écriture TMDB, sinon le premier sync nocturne corrompt la base.

`pipelines/anime_tracker_sync.py::run_sync()` — ajouter le filtre sur ses deux `sb_get` :

```python
franchises = sb_get(url, headers, "media_franchises", "source=eq.anilist&select=…")
entries    = sb_get(url, headers, "media_entries",    "source=eq.anilist&select=…")
```

Symétriquement, `tmdb_tracker_sync.py` filtrera `source=in.(tmdb_movie,tmdb_tv)` et
`source=in.(tmdb_movie,tmdb_season)`.

### Nommage des sources

Sur TMDB, les ids de films et les ids de saisons vivent dans deux namespaces distincts et
**peuvent collider numériquement**. `media_entries` porte `UNIQUE (source, source_id)` :
la discrimination passe donc par `source`, sans migration.

| Table | Valeurs de `source` |
|---|---|
| `media_franchises` | `anilist` · `tmdb_movie` · `tmdb_tv` |
| `media_entries` | `anilist` · `tmdb_movie` · `tmdb_season` |

`media_franchises.media_type` : `anime` · `tv` · `movie`. Il ne sert qu'au filtrage UI et
aux libellés — jamais à brancher de la logique métier.

## Modèle de données

### Migration `sql/022_media_runtime.sql`

```sql
ALTER TABLE media_entries ADD COLUMN IF NOT EXISTS runtime_minutes int;
```

Une seule colonne. Tout le reste existe depuis 020/021. RLS héritée (policies
`authenticated` déjà en place sur les 4 tables).

`runtime_minutes` est **nullable** : une entrée sans durée connue reste utilisable
partout, seule `pickTonight()` la traite à part (voir « Durée inconnue »).

Backfill : aucun script one-shot. Le sync anime lit désormais `duration` d'AniList et
remplit la colonne au premier passage ; le sync TMDB la remplit dès la première écriture.

### Traduction TMDB → contrat AniList

| TMDB | Colonne |
|---|---|
| `id` (`/tv/{id}` ou `/movie/{id}`) | `media_franchises.source_root_id` |
| `name` / `title` | `title_english` |
| `original_name` / `original_title` | `title_native` |
| `overview` | `synopsis` (strip HTML, même helper que l'existant) |
| `genres[].name` | `genres[]` |
| `poster_path` | `cover_url` — préfixe `https://image.tmdb.org/t/p/w342` |
| `backdrop_path` | `banner_url` — préfixe `https://image.tmdb.org/t/p/w780` |
| `seasons[]` où `season_number >= 1` | une `media_entries` par saison, `kind='season'`, `sort_order` = numéro |
| `seasons[]` où `season_number = 0` | `kind='special'`, `in_main_chain=false` |
| `season.episode_count` | `episodes_total` |
| `season.air_date` | `start_date` |
| `next_episode_to_air.{episode_number,air_date}` | `next_episode_number`, `next_episode_airing_at` |
| un film | 1 entrée `kind='movie'`, `episodes_total=1`, `in_main_chain=true` |
| `runtime` (film) / `episode_run_time[0]` (série) | `runtime_minutes` |

**`status` → `airing_status`** :

| TMDB | → |
|---|---|
| `Returning Series`, `In Production` | `RELEASING` |
| `Ended` | `FINISHED` |
| `Canceled` | `CANCELLED` |
| `Planned`, `Rumored` | `NOT_YET_RELEASED` |

Deux règles imposées par TMDB, dont le `status` est au niveau **série** et non saison :

- **La dernière saison hérite du statut de la série ; toutes les précédentes sont
  `FINISHED`.** Sans ça, `released()` renverrait `next_episode_number - 1` sur une saison
  ancienne et sous-compterait ses épisodes.
- **`next_episode_to_air` s'accroche à la seule saison en diffusion.** Une série avec
  8 saisons ne doit porter qu'une date de prochaine diffusion.

Pour un film non encore sorti (`release_date` future) : `airing_status='NOT_YET_RELEASED'`,
ce qui le fait apparaître dans l'agenda via la branche « premiere » de `buildWeek()` sans
aucune modification.

## Pipeline `pipelines/tmdb_tracker_sync.py`

Cron `45 7 * * *` (après `anime-tracker-sync` à 07:30), workflow
`.github/workflows/tmdb-tracker-sync.yml`. Même contrat que l'existant : rafraîchir les
entrées suivies, détecter les événements, écrire dans `media_releases`.

**Factorisation** : `diff_events()` compare des lignes déjà normalisées, pas des payloads
AniList — elle est source-agnostique telle quelle. Elle est extraite dans
`pipelines/media_tracker_common.py` avec les helpers Supabase (`sb_env`, `sb_get`,
`sb_upsert`, `sb_patch`), et les deux pipelines l'importent. Aucune duplication.

Endpoints TMDB : `/tv/{id}?append_to_response=external_ids`, `/movie/{id}`,
`/search/multi`. Throttle 250 ms (TMDB tolère ~50 req/s, on reste très en deçà), respect
de `Retry-After` sur 429 comme le client AniList.

Secret `TMDB_API_KEY` → entrée dans `docs/secrets.md`. Pas d'ADR : c'est une clé de
service, pas une décision structurante.

Ne pas confondre avec `pipelines/tmdb_sync.py`, qui existe déjà, dort (aucun workflow),
et alimente `anime_articles` pour le calendrier de l'onglet Veille. Les deux coexistent
sans interaction ; seul le secret est partagé.

## Front — client TMDB

`cockpit/lib/tmdb.js`, exposé sur `window.tmdb`, contrat calqué sur `anilist.js` :
`search()`, `fetchFranchiseLive()`, `toFranchiseRow()`, `toEntryRows()`. Script classique
compatible Babel standalone, `module.exports` gardé pour les tests node.

**Clé de lecture** : `user_profile.tmdb_api_key`, lue via
`window.PROFILE_DATA._values.tmdb_api_key` (Tier 1). C'est exactement le pattern de
`lastfm_api_key` (`cockpit/panel-musique.jsx:25`) — clé plate en snake_case, pas de
namespace pointé. Elle rejoint `window.PROFILE_HIDDEN_KEYS` dans
`cockpit/data-profile.js` pour ne pas polluer l'éditeur de profil, comme ses deux
voisines Last.fm.

Pas d'Edge Function : ce serait la première du projet pour un gain nul — la clé reste
lisible par tout utilisateur authentifié, et il n'y en a qu'un.

Si la clé est absente : la recherche en ligne n'interroge qu'AniList et affiche en pied
de liste « TMDB non configuré ». Aucune erreur bloquante.

CSP : ajouter `api.themoviedb.org` et `image.tmdb.org` au `meta` de `index.html`.

## Front — recherche

La bascule reste **binaire** — `Ma bibliothèque · N | En ligne · M`. Trois onglets pour
une seule intention serait un pas en arrière sur le travail du 2026-07-24.

Les deux sources sont interrogées en parallèle à partir de 3 caractères, les résultats
fusionnés et triés par pertinence (score AniList / `popularity` TMDB, normalisés), chaque
carte portant une pastille discrète de provenance. Si une source échoue ou timeout,
l'autre s'affiche et une mention apparaît en pied de liste — jamais d'écran d'erreur
quand la moitié du résultat est disponible.

## Front — filtres de type

Chips `Anime · Séries · Films` dans la collection, **`Anime` actif par défaut** (décision
utilisateur : ne pas noyer les 44 franchises existantes). État mémorisé en localStorage
(`mdt.typeFilter`), aligné sur le pattern des filtres existants du panel.

Le rail « Continuer à regarder » et l'agenda respectent le filtre.

**`pickTonight()` l'ignore délibérément.** Les chips gouvernent la navigation, pas la
décision : filtrer sur l'anime rendrait `runtime_minutes` et le budget « 2 h+ » inutiles,
puisqu'un épisode d'anime dure 24 minutes. On filtre quand on explore, pas quand on
demande quoi regarder.

## « Ce soir »

### Pourquoi déterministe et non LLM

Un appel quotidien serait figé au moment du run et ne saurait pas répondre à « finalement
j'ai deux heures » — or le budget est précisément la variable qui bouge. Tout est déjà en
base, il n'y a rien à interpréter. Un LLM n'apporterait qu'une phrase d'habillage, et
`weekly_analysis` sait déjà en écrire.

`pickTonight(cards, entries, ctx, nowMs)` rejoint donc `cockpit/lib/mediatheque-view.js` :
pure, sans dépendance DOM/React, instant courant passé en argument, testée sous node comme
tout le reste du module.

### Entrées

```
ctx = { budgetMin: 30 | 60 | null, dayLoad: {count, total_minutes} | null }
```

`budgetMin` vient d'un tap sur trois pastilles `30 min · 1 h · 2 h+`. **`null` encode
« 2 h+ » — c'est-à-dire pas de plafond**, plutôt qu'une borne arbitraire à 150 qui se
comporterait comme un filtre déguisé.

Il est mémorisé pour la **session du soir** en localStorage (`mdt.tonightBudget`), datée
par le jour de *début* de session : entre minuit et 2 h, la clé reste celle de la veille.
Sinon, choisir « 2 h+ » à 23 h 50 se réinitialiserait dix minutes plus tard, au milieu du
film.

**Aucune inférence** : rien ne permet de deviner le temps disponible, et une mauvaise
inférence coûte plus cher qu'un tap.

### Les trois rôles

Trois propositions à rôles **distincts**, pas un top-3 scoré — trois candidats classés
par le même critère se ressemblent tous et n'aident pas à trancher.

| Rôle | Candidat | Départage |
|---|---|---|
| `fresh` — « Ça vient de sortir » | Une entrée dont un épisode a été diffusé aujourd'hui et n'est pas vu | Le plus récemment diffusé |
| `resume` — « Reprendre » | `status.id === 'watching'`, épisodes sortis non vus | `lastTouch` décroissant |
| `discover` — « Sortir du lot » | `status.id === 'to_watch'` | La durée la plus proche du budget par en-dessous ; à budget `null` ou durée inconnue, `added_at` décroissant |

**Un rôle sans candidat disparaît.** La carte affiche 3, 2, 1 ou zéro proposition — jamais
de remplissage. Zéro proposition affiche un état vide honnête qui renvoie vers la
recherche.

**Déduplication** : une franchise ne peut occuper qu'un rôle. `fresh` est servi en premier,
puis `resume`, puis `discover` ; un candidat déjà pris est sauté au profit du suivant.

### Filtrage par budget

`runtime_minutes` de l'entrée courante, comparé à `budgetMin` :

| Pastille | `budgetMin` | Accepte |
|---|---|---|
| 30 min | `30` | `runtime <= 35` |
| 1 h | `60` | `runtime <= 70` |
| 2 h+ | `null` | tout, sans plafond |

**Durée inconnue** (`runtime_minutes IS NULL`) : l'entrée est acceptée à tous les budgets
mais reléguée derrière les candidats dont la durée est connue et compatible. Exclure
silencieusement une entrée parce qu'une donnée manque produirait une carte vide
inexplicable ; c'est le cas de toute la bibliothèque anime avant le premier backfill.

### Modulation par l'heure et par la journée

- **L'heure agit sur le classement.** Passé 23 h, les entrées de plus de 70 min reculent
  derrière les formats courts, et la carte l'annonce (« il est tard »). Elle ne les
  supprime pas : c'est un signal, pas une interdiction.
- **La charge de la journée n'agit que sur la phrase d'accroche.** `dayLoad` est lu dans
  `activity_briefs.stats.meetings` du jour — `{count, total_minutes, teams_count}`,
  upserté par `jarvis/observers/daily_brief_generator.py` depuis l'observer Outlook. Il
  module le libellé, jamais l'ordre. Fabriquer un classement à partir d'un signal aussi
  indirect serait une intelligence simulée ; et la carte ne fait aucun commentaire sur le
  sport ou le sommeil.

`activity_briefs` n'est chargé nulle part côté front aujourd'hui : `loadPanel("mediatheque")`
gagne donc un cinquième fetch parallèle, volontairement minuscule —
`activity_briefs?date=eq.<aujourd'hui>&select=stats&limit=1`. Une ligne, sur un panel qui
en lance déjà quatre de front.

`dayLoad` reste **optionnel** : l'observer est local et ne tourne pas tous les jours. Le
fetch est en `.catch(() => null)` comme ses voisins, et une absence fait retomber
l'accroche sur une formulation neutre. Il ne bloque jamais le rendu de la carte.

### Placement

De **18 h à 2 h**, la bande « Ce soir » **remplace** `<MdtHero>`. Le reste de la journée,
la médiathèque est strictement inchangée. Deux surfaces de décision qui se disputent la
même place à 22 h, c'est une de trop.

Conséquence sur un invariant existant : `pickRail()` exclut aujourd'hui la franchise du
hero pour éviter un doublon. Le soir, il doit exclure **les franchises proposées par
`pickTonight()`**. L'invariant devient `tonight ∩ rail = ∅`, verrouillé par un test dédié
comme l'actuel `hero ∉ rail`.

### UI

`<MdtTonight>` dans `cockpit/panel-mediatheque.jsx`, styles `.mdt-tonight*` dans
`cockpit/styles-mediatheque.css`.

- En-tête : accroche contextuelle + trois pastilles de budget (l'active en plein).
- Une carte par rôle : jaquette, titre, libellé de rôle, libellé de progression réutilisé
  de `nextEpLabel()`, durée, et CTA primaire identique à celui du hero (`resume` / `start`
  / `open`).
- État vide : « Rien qui rentre dans 30 minutes » + bouton pour élargir le budget, puis
  lien vers la recherche.

## Écritures

Aucune nouvelle écriture utilisateur. `pickTonight()` lit, ne mute rien. Les CTA
réutilisent `writeProgress()` (upsert optimiste existant).

## Télémétrie (`docs/telemetry.md` avant commit)

| Event | Payload | Emplacement |
|---|---|---|
| `mediatheque_tonight_budget` | `{budget_min, candidates}` | `MdtTonight` au tap sur une pastille |
| `mediatheque_tonight_pick` | `{role, media_type, runtime_minutes, budget_min}` | `MdtTonight` au clic sur un CTA |
| `mediatheque_tonight_empty` | `{budget_min, hour}` | `MdtTonight` au rendu d'un état vide |
| `mediatheque_type_filter` | `{types, count}` | `MdtCollection` au changement de chips |

`mediatheque_search` et `mediatheque_add` gagnent `source` dans leur payload (déjà présent
sur `add`, à ajouter sur `search`).

## Tests

`tests/test_mediatheque_view.mjs` — `pickTonight()` :

- bibliothèque vide → zéro proposition, pas de crash ;
- budget 30 min face à un seul film de 120 min → zéro proposition (état vide), pas un film ;
- une entrée diffusée aujourd'hui non vue → rôle `fresh` en tête ;
- une même franchise éligible à deux rôles → n'apparaît qu'une fois ;
- franchise `shelved` → jamais proposée ;
- `runtime_minutes` null → acceptée, mais classée après une durée connue compatible ;
- après 23 h → un format long recule derrière un format court ;
- rôle sans candidat → la carte se réduit, aucun remplissage ;
- invariant `tonight ∩ rail = ∅`.

`tests/test_tmdb_map.mjs` (nouveau) — traduction :

- les 6 valeurs de `status` TMDB → `airing_status` ;
- dernière saison `RELEASING`, précédentes `FINISHED` ;
- `next_episode_to_air` accroché à la seule saison en diffusion ;
- saison 0 → `kind='special'`, `in_main_chain=false` ;
- film → une entrée `kind='movie'`, `episodes_total=1` ;
- film à sortir → `NOT_YET_RELEASED`.

## Fichiers touchés

| Fichier | Nature |
|---|---|
| `sql/022_media_runtime.sql` | création |
| `pipelines/anime_tracker_sync.py` | filtre `source=eq.anilist` + lecture `duration` |
| `pipelines/media_tracker_common.py` | création (extraction `diff_events` + helpers Supabase) |
| `pipelines/tmdb_tracker_sync.py` | création |
| `pipelines/requirements-tmdb.txt` | existe déjà |
| `.github/workflows/tmdb-tracker-sync.yml` | création |
| `cockpit/lib/tmdb.js` | création |
| `cockpit/lib/mediatheque-view.js` | `pickTonight()` + `pickRail()` conscient de `tonight` |
| `cockpit/panel-mediatheque.jsx` | `<MdtTonight>`, chips de type, recherche fusionnée |
| `cockpit/styles-mediatheque.css` | `.mdt-tonight*`, `.mdt-typechips*` |
| `cockpit/lib/data-loader.js` | clé TMDB au Tier 1, `runtime_minutes` au select |
| `index.html` | `<script src="cockpit/lib/tmdb.js">` + CSP |
| `tests/test_mediatheque_view.mjs`, `tests/test_tmdb_map.mjs` | tests |
| `docs/specs/tab-mediatheque.md` + `docs/specs/index.json` | règle cardinale specs |
| `docs/architecture/{pipelines,dependencies}.yaml`, `decisions.md` | règle cardinale archi + ADR contrat de source |
| `docs/telemetry.md`, `docs/secrets.md` | règles cardinales |
| `sw.js` | via `node scripts/sync-sw.mjs`, jamais à la main |

## États & edge cases

- **Clé TMDB absente** → recherche AniList seule, mention en pied de liste, aucun blocage.
- **TMDB 429** → `Retry-After` respecté ; côté front la source est simplement absente des
  résultats.
- **Série sans saison** (`seasons: []`) → franchise créée, zéro entrée, statut « À voir »,
  pas de crash sur `currentEntryOf()` qui renvoie déjà `null`.
- **Film sans `runtime`** (fréquent sur les sorties récentes) → `runtime_minutes` null,
  traité par la règle « durée inconnue ».
- **Série renumérotée par TMDB** (saison fusionnée, ordre modifié) → l'upsert sur
  `(source, source_id)` conserve la progression ; seul `sort_order` change.
- **Même œuvre présente sur les deux sources** (un anime référencé sur TMDB) → deux
  franchises distinctes, doublon visible. Assumé en v1 : la déduplication cross-source
  demande une table de correspondance, et le cas est rare dans un usage réel.
- **`pickTonight()` avant 18 h** → non rendu, le hero reste. Aucun calcul.
- **Passage de minuit** → la clé de budget est datée du jour de début de session, donc
  rien ne bouge entre 23 h 50 et 00 h 10. Le budget ne retombe sur `60` qu'à la session
  suivante (18 h le lendemain).
- **Observer Outlook éteint** → `dayLoad` null, accroche neutre.

## Séquencement suggéré

1. Étanchéité par source (`anime_tracker_sync`) — seul, commitable, corrige un bug latent.
2. Migration `022` + backfill `duration` par le sync anime.
3. `pickTonight()` + `<MdtTonight>` sur l'anime seul — la carte est utilisable et
   validable en usage réel avant que TMDB n'existe.
4. `media_tracker_common.py` + client `tmdb.js` + pipeline + workflow + secret.
5. Chips de type, recherche fusionnée, doc.

Les étapes 1 à 3 livrent de la valeur sans dépendre d'une clé API. Si TMDB devait être
abandonné, `pickTonight()` resterait acquis.
