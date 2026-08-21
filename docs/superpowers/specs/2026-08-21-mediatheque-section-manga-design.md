# Médiathèque — section Manga (AniList, sans calendrier)

Spec de conception. Ouvrir la Médiathèque aux mangas et manhwas que l'utilisateur
**achète en VF**, en assumant qu'une des trois briques du tracker — le calendrier de
sorties — n'a pas de source et ne sera pas livrée.

## Problème

La section Manga a été demandée comme « la même logique que pour les séries ». Elle ne
l'est pas, pour deux raisons de natures très différentes.

**1. Le tracker parle « épisode » de bout en bout.** `media_entries.kind` porte un CHECK
`('season','movie','ova','special','other')` où un tome n'entre pas. Les colonnes
s'appellent `episodes_total`, `episodes_watched`, `next_episode_number`. Les deux clients
AniList — front (`cockpit/lib/anilist.js:103-104`) et pipeline
(`pipelines/anime_tracker_sync.py:146`) — codent `type: ANIME` en dur, et le walk de
franchise filtre `node.get("type") == "ANIME"` (`anime_tracker_sync.py:31`). Chercher un
manga aujourd'hui ne renvoie rien.

**2. L'utilisateur achète les tomes VF, il ne lit pas les scans.** L'unité utile est le
**tome français**, et l'alerte utile serait « le tome 12 sort chez Ki-oon le 14 mars ».
Cette information n'a pas de source atteignable :

| Source sondée le 2026-08-21 | Résultat |
|---|---|
| MangaDex | API publique, `links.al` donne l'id AniList — mais c'est un agrégateur de **scanlation anglaise**. Hors sujet. |
| Google Books | HTTP 429, quota anonyme épuisé. **Non concluant**, pas négatif : exigerait une clé et une mesure de couverture. |
| OpenLibrary | `numFound: 0` sur Frieren en français. Inexploitable. |
| Nautiljon | **HTTP 403**, Cloudflare. Le site refuse explicitement les robots ; on ne construira pas de scraper contre cette volonté. |
| manga-news.com | 404 sur les URLs de flux devinées. Absence non prouvée, mais rien trouvé. |
| BnF | Non testée — le dépôt légal a lieu **à** la parution : structurellement incapable d'annoncer un tome à paraître. |

AniList, lui, ne connaît que l'édition japonaise.

## Objectif

Une section Manga qui répond à **« où j'en suis et quel tome il me manque »**, avec le
hero, le rail « Continuer », la collection, les statuts, les notes et la mise de côté que
les autres sections ont déjà.

**Hors périmètre, tranché avec l'utilisateur :**
- Calendrier des sorties VF et alertes de nouveau tome — pas de source (voir ci-dessus).
- Distinction tomes possédés / tomes lus — un seul compteur suffit.
- Chapitres : on compte en tomes, jamais en chapitres.
- Livres, romans, light novels.

## Principe directeur

**Une brique sans source ne se dégrade pas, elle se retire.** L'agenda « Cette semaine »
et le bandeau Sorties ne seront pas rendus vides ni remplis de faux : ils n'existeront
simplement pas dans cette section, et la spec dit pourquoi.

Le mode d'échec qu'on refuse est précis : deux rayons vides que l'utilisateur lira comme
une panne, et sur lesquels il reviendra plusieurs fois avant de comprendre qu'ils ne se
rempliront jamais. Une fausse alerte coûte plus cher qu'une alerte absente.

## Ce que les sondes ont établi

Deux hypothèses vérifiées le 2026-08-21 contre l'API AniList, parce qu'elles décident du
découpage :

**Les ids AniList ne collisionnent pas entre ANIME et MANGA.** `Media(id:30642, type:ANIME)`
renvoie `Not Found` là où `type:MANGA` renvoie Vinland Saga. Conséquence : `source = 'anilist'`
suffit pour les mangas, et `UNIQUE(source, source_id)` tient. Pas besoin du namespace
séparé qu'il a fallu inventer pour TMDB (`tmdb_tv` / `tmdb_movie`), où les ids de films et
de saisons pouvaient bel et bien collider.

**Une requête `id_in` sans filtre de type renvoie les deux types mélangés.**
`media(id_in:[30642,21])` a rendu One Piece (ANIME) et Vinland Saga (MANGA) dans un seul
appel. Le rafraîchissement quotidien est donc mutualisable sans effort.

Champs d'un manga : `volumes: 29`, `chapters: 224`, `episodes: null`, `duration: null`,
`nextAiringEpisode: null`, `status: FINISHED`. Ses `relations` contiennent son
`ADAPTATION → ANIME` et ses `SPIN_OFF → MANGA`.

## Modèle de données

**Une entrée = une série, pas un tome.** Trente-sept lignes pour Vagabond serait absurde :
AniList n'expose aucune donnée par tome, le pipeline devrait les synthétiser, et la
progression deviendrait trente-sept lignes de `media_progress`. Une série manga est
l'analogue d'une saison : une entrée, un compteur, un total.

| Colonne | Valeur pour un manga |
|---|---|
| `media_franchises.media_type` | `'manga'` |
| `media_franchises.source` | `'anilist'` (pas de namespace séparé — vérifié) |
| `media_entries.kind` | `'manga'` — **nécessite la migration ci-dessous** |
| `media_entries.episodes_total` | AniList `volumes` (nombre de tomes), nullable |
| `media_entries.season_number` | `null` |
| `media_entries.runtime_minutes` | `null` — un tome n'a pas de durée |
| `media_entries.next_episode_number` / `next_episode_airing_at` | `null`, définitivement |
| `media_progress.episodes_watched` | tomes lus |

### Migration `sql/033_media_manga.sql`

La seule. Le CHECK actuel refuse `'manga'` :

```sql
ALTER TABLE media_entries DROP CONSTRAINT IF EXISTS media_entries_kind_check;
ALTER TABLE media_entries ADD CONSTRAINT media_entries_kind_check
  CHECK (kind IN ('season','movie','ova','special','other','manga'));
```

`media_progress` n'est pas touchée : c'est l'intérêt du choix « un seul compteur ».

## Client AniList

`cockpit/lib/anilist.js` :
- `MEDIA_FIELDS` gagne `volumes chapters`.
- `SEARCH_QUERY` et `BATCH_QUERY` prennent le type en paramètre au lieu de le coder en dur.
- `searchAnime(q)` est conservée telle quelle (site d'appel existant) et une
  `searchManga(q)` la double, toutes deux déléguant à un `search(q, type)` interne.
- `toEntryRows` : pour un `type === "MANGA"`, `episodes_total = volumes`.

**Recherche à trois sources.** Le champ de recherche est global depuis ADR-42 ; il
interrogera AniList/ANIME, AniList/MANGA et TMDB en parallèle. Chaque résultat porte déjà
un `badge` de provenance, qui gagne « Manga ». La dégradation gracieuse existante
(« une source n'a pas répondu — résultats partiels ») couvre le troisième appel sans
modification.

Chercher « Vinland Saga » renverra donc l'anime **et** le manga. C'est voulu : ce sont deux
choses qu'on suit séparément, avec deux progressions distinctes.

## Pipeline — on étend, on n'en crée pas

C'était le seul vrai embranchement du design.

**Rejeté : un `manga_tracker_sync` séparé.** C'est le réflexe par symétrie avec
`tmdb_tracker_sync`, et il est trompeur. `tmdb_tracker_sync` existe parce que TMDB est une
*autre API*, avec son auth, son throttle et son vocabulaire. Ici c'est la même API, le même
endpoint, et — sonde à l'appui — le **même appel** peut ramener anime et manga ensemble. Un
pipeline séparé paierait un workflow, un cron, une entrée `pipelines.yaml` et une sonde de
santé pour dupliquer un batch identique.

**Retenu : trois gardes dans `anime_tracker_sync.py`.**

1. `BATCH_QUERY` perd son `type: ANIME`. Sans risque : les ids sont uniques entre les deux
   types, une entrée ne peut pas être confondue avec l'autre.
2. `_rel_targets(media, rel_types)` filtre sur `media["type"]` — le type de l'ancre — au
   lieu de `"ANIME"` en dur. Sans ça le walk d'un manga ne trouve **rien** : ses relations
   SEQUEL/PREQUEL sont de type MANGA et sont toutes rejetées par le filtre actuel.
3. `_kind(media, in_chain)` renvoie `'manga'` quand `media["type"] == "MANGA"`, avant tout
   test de format.

**Et une règle, la plus importante de cette spec : aucun `media_releases` n'est émis pour
un manga.** Les trois `event_type` existants (`new_entry`, `airing_started`,
`date_announced`) décriraient une réalité **japonaise**. Un 30ᵉ tome paru à Tokyo n'est pas
une sortie VF et peut précéder l'édition française de deux ans. Émettre l'événement
produirait une alerte fausse, dans le Brief du jour, sur une information que l'utilisateur
ne peut pas utiliser.

**Où poser ce garde-fou — et pourquoi pas dans la fonction qui décide des événements.**
`diff_events()` vit dans `pipelines/media_tracker_common.py:49` et est **partagée avec
`tmdb_tracker_sync`**. Son fichier de test s'ouvre sur : *« diff_events est
source-agnostique : elle ne lit que des lignes normalisées »*. Son paramètre `franchise`
est d'ailleurs **inutilisé aujourd'hui** — il serait tentant de lui donner enfin un rôle
en y lisant `media_type`. Ce serait une erreur : « quels types de média méritent une
alerte » est une politique de pipeline, pas une règle de comparaison de lignes, et
l'inscrire là ferait mentir un contrat que le test défend explicitement.

Le garde-fou va donc dans `anime_tracker_sync.py`, sous forme d'un prédicat pur — testable
sans I/O, contrairement à un `if` enfoui dans `run_sync()` :

```python
def emits_events(franchise):
    """Un manga ne produit aucun evenement : un tome japonais de plus n'est pas une
    sortie VF, et l'alerte serait fausse par construction (spec 2026-08-21)."""
    return franchise.get("media_type") != "manga"
```

**Corollaire à ne pas oublier :** `franchises_qs()` ne sélectionne aujourd'hui que
`id, source_root_id, title_english, title_romaji`. Sans y ajouter `media_type`, le prédicat
lirait `None`, renverrait `True`, et les alertes fausses partiraient quand même — en
silence, avec un test vert. C'est le mode d'échec le plus probable de cette section.

**Le nom `anime_tracker_sync` est conservé** bien qu'il devienne partiellement faux.
Renommer coûte un fichier de workflow, un id dans `pipelines.yaml`, une entrée de santé et
la continuité de l'historique de runs, pour un gain cosmétique. La docstring du module dit
explicitement qu'il couvre AniList entier, anime et manga.

## Trois pièges dans la logique pure

Ces trois-là sont la vraie raison pour laquelle cette section n'était pas « une ligne dans
`MDT_SECTIONS` ».

**`released()` tuerait le stepper.** Pour une entrée `RELEASING`, il renvoie
`next_episode_number - 1`. Un manga n'a pas de `nextAiringEpisode`, donc `next_episode_number`
est `null`, donc `released()` renvoie **0**, donc `MdtStepper` calcule `max = 0` et se
désactive (`disabled = … || max === 0`). Un manga en cours de publication serait
intégralement non déclarable. Correctif : branche `kind === 'manga'` en tête de `released()`,
qui renvoie `episodes_total`.

**`pickTonight()` proposerait de « regarder » un manga.** La bande « Ce soir » lit *toutes*
les cartes, sans filtre de section — c'est sa décision de conception depuis 2026-07-25,
maintenue par ADR-42. Il lui faut donc une notion de ce qui se regarde :
`WATCHABLE_TYPES = new Set(['anime','tv','movie'])`, appliquée à l'entrée de `pickTonight`.
Ce n'est pas un filtre de confort : proposer un tome de Vagabond pour un créneau de 30 min
n'a aucun sens et discréditerait la bande entière.

**Le vocabulaire.** `nextEpLabel()` produit « S2 · ép. 16 sur 24 » et `curLabel()`
« S2 · 12/28 ». Pour un manga il faut « tome 12 sur 37 » et « 11/37 ». Une fonction
`unitOf(entry)` pilotée par `kind` porte le contrat, et les deux libellés la consultent —
plutôt qu'un ternaire dupliqué dans chacun, qui divergerait (précédent vécu :
`mdtCurLabel` / `nextEpLabel` avaient divergé sur le durcissement de `kind`).

## Front — la section

`MDT_SECTIONS` gagne sa quatrième ligne :

```js
{ id: "manga", label: "Manga", kicker: "Personnel · manga",
  japanese: false, emptyHint: "cherche un manga ci-dessus pour commencer",
  searchLabel: "Rechercher un manga" }
```

`japanese: false` : `pipelines/jp_vocab_sync.py:138` filtre déjà `media_type == "anime"`.
La bande « Avant l'épisode » n'aurait aucun mot à montrer — et son cadrage (« ce que tu
t'apprêtes à regarder ce soir ») ne s'applique pas à un tome.

**Ce qui fonctionne sans une ligne de code :** hero (`pickHero` est type-agnostique), rail
« Continuer à regarder », collection, chips de statut, tri, notes, mise de côté, fiche
franchise. Les statuts dérivés (`status()`) marchent tels quels — un manga `FINISHED` dont
tous les tomes sont lus est « Vu », un manga en cours entamé est « En cours ».

**L'agenda se retire tout seul.** `buildWeek()` ne trouve aucune entrée datée, donc
`MdtWeek` renvoie `null` par sa garde existante `if (!week.count && !week.later.length)`.
Aucun `if (section === 'manga')` n'est ajouté : la brique disparaît parce qu'elle n'a rien
à dire, pas parce qu'on l'a exclue. Un test verrouille ce comportement, faute de quoi il
serait cassé par mégarde par une future valeur de repli dans `buildWeek`.

## Manhwa et manhua

AniList les classe en `type: MANGA` avec `countryOfOrigin` valant `KR` ou `CN`. **Une seule
section les accueille tous**, conformément à la demande (« mangas / manhwas » d'un souffle).

Aucune colonne « pays » n'est ajoutée par anticipation. Si la séparation devient
souhaitable, elle se fera en changeant `media_type` sur les lignes concernées — et il faudra
le faire à la main, car le pipeline ne réécrit pas `media_franchises` (précédent : le titre
et les genres des 2 franchises TMDB avaient dû être backfillés à la main le 2026-07-26). À
l'échelle attendue — moins d'une dizaine de séries — c'est moins cher qu'une colonne qui
ne servirait peut-être jamais.

## Télémétrie

Aucun nouvel `event_type`. `mediatheque_section` (ADR-42) porte déjà `{section, count}` et
accueille `section: "manga"` sans changement de schéma. `mediatheque_add` porte `source`,
qui vaudra `anilist` — indistinguable d'un ajout d'anime. Si la distinction devient utile,
elle se fera en lisant `media_type` en base, pas en dupliquant un événement.

**Sonde de survie.** Le critère d'arrêt est écrit d'avance : si `mediatheque_progress` ne
porte aucun événement sur une entrée `kind:'manga'` pendant six semaines alors que la
section a été ouverte, c'est que déclarer sa progression de lecture n'est pas un geste que
l'utilisateur fait — et la section doit être retirée plutôt que maintenue par principe.
C'est le même critère que celui appliqué à la bande « Avant l'épisode ».

## Tests

**`tests/test_mediatheque_view.mjs`** (node, logique pure) :
- `released()` sur un manga `RELEASING` renvoie `episodes_total`, pas 0 — le cas qui tue le
  stepper.
- `released()` sur un manga sans `volumes` renvoie `null`, et le stepper reste utilisable.
- `unitOf()` : `'tome'` pour `kind:'manga'`, `'épisode'` sinon.
- `nextEpLabel()` / `curLabel()` sur un manga : « tome 12 sur 37 », « 11/37 ».
- `pickTonight()` : un manga n'est **jamais** proposé, quel que soit le budget, y compris
  quand il est le seul candidat en cours.
- `cardsOfSection(cards, 'manga')` et `countBySection` avec quatre sections.
- `buildWeek()` sur des entrées manga : renvoie un semainier vide.

**`tests/test_anime_tracker_sync.py`** — **à créer**, ce fichier n'existe pas (seuls
`test_media_tracker_common.py` et `test_igdb_tracker.py` couvrent les pipelines média) :
- `_kind` renvoie `'manga'` pour `type: MANGA` quel que soit le format.
- `_rel_targets` d'un manga ne remonte que des ids MANGA — jamais son adaptation anime,
  qui est le piège concret : Vinland Saga porte deux `ADAPTATION → ANIME`.
- `emits_events` : `False` pour `media_type: 'manga'`, `True` pour `'anime'`, et **`True`
  quand la clé est absente** — pour que le comportement historique reste le défaut.
- `franchises_qs()` contient `media_type` dans son `select`. Test d'une ligne, mais c'est
  le seul qui attrape l'échec silencieux décrit plus haut.

**`tests/test_media_tracker_common.py`** (existant) : inchangé. Son invariant
« `diff_events` est source-agnostique » doit rester vrai après cette spec — c'est
précisément ce qui a décidé de l'emplacement du garde-fou.

**Harnais SSR** (`scratchpad/render-mediatheque.mjs`) : rendre la section manga en journée
et en soirée, vérifier l'absence d'agenda et de bande japonaise, et la présence du hero.

## Vérification

Ordre imposé par les dépendances :

1. Migration appliquée via MCP Supabase **avant** tout ajout front, sinon le premier
   `POST media_entries` viole le CHECK et l'ajout est rollback.
2. `node tests/test_mediatheque_view.mjs`, `node tests/test_mediatheque_entry.mjs`, tests
   Python du pipeline.
3. Les quatre linters bloquants, avec `PYTHONIOENCODING=utf-8` (sans quoi `validate_spec.py`
   plante en cp1252 **avant** d'imprimer son verdict, et masque un vrai échec).
4. `node scripts/sync-sw.mjs`.
5. Recette en prod après push sur `main` : ajouter un manga réel, déclarer une progression,
   vérifier qu'aucun agenda ni bandeau n'apparaît dans la section.
6. Le lendemain : vérifier que le run de `anime_tracker_sync` a rafraîchi le manga **sans**
   créer de ligne dans `media_releases`.

## Ce qui est assumé

**Le dénominateur est japonais.** « 11 / 37 » veut dire « 11 tomes lus sur les 37 que compte
la série », **pas** « 37 disponibles en français ». L'édition VF accuse couramment un à
trois ans de retard. La fiche doit le dire en toutes lettres — sinon le chiffre ment à
quelqu'un qui achète en librairie. C'est la limite directe de l'absence de source VF, et
elle ne se corrige pas côté code.

**Aucune alerte de sortie, jamais.** C'est la contrepartie acceptée du choix « sans
calendrier ». Si une source VF fiable apparaît un jour, elle se branchera sur les
`media_releases` existants — le schéma l'accepte déjà, c'est la donnée qui manque.

**`volumes` peut être null** pour une série en cours qu'AniList n'a pas encore comptée.
Le stepper reste alors non plafonné et le libellé s'affiche sans dénominateur (« tome 12 »),
plutôt que « tome 12 sur ? » qui suggère une donnée manquante réparable.

**Une franchise manga et son adaptation anime sont deux franchises distinctes**, avec deux
progressions. C'est cohérent avec le doublon cross-source déjà assumé par ADR-29, et c'est
le comportement souhaitable ici : lire le manga et regarder l'anime sont deux parcours.

## Suite

Plan d'implémentation à produire avec la skill `writing-plans`. Ordre contraint : migration,
puis logique pure + tests, puis client AniList, puis pipeline, puis front, puis docs.
