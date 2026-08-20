# Santé du cockpit — l'onglet, et le groupe « Coulisses »

Spec de conception. Un onglet qui dit, en clair et sans qu'on ait à connaître les
internes, ce qui fonctionne et ce qui est cassé dans la machinerie du cockpit —
et un regroupement de la sidebar qui rassemble enfin la machine, son coût et ses
plans au même endroit.

## Problème

La santé du cockpit est **écrite trois fois, lisible nulle part**.

1. **Le bandeau du Brief** (`cockpit/app.jsx::PipelineHealthBanner`) n'affiche que
   les pipelines *dégradés*. Il alerte bien, mais il ne répond pas à « est-ce que
   tout le reste va bien ? » — un bandeau absent peut vouloir dire « tout est vert »
   ou « la table a gelé ».
2. **La section Pipelines de Stacks & Limits** (`panel-stacks.jsx::StPipelineHealth`)
   affiche la liste complète, mais noyée au milieu d'un onglet qui parle d'argent
   et de quotas, et sans jamais dire ce qu'une panne coûte concrètement.
3. **L'issue GitHub** ouverte par `pipeline_health.py::sync_alert_issue` vit hors
   du cockpit et parle en `pipeline_id`.

Aucune des trois ne dit **le geste qui répare**. Le 2026-07-26, `strava_sync`,
`withings_sync` et `tft_sync` échouaient depuis des semaines sans qu'aucune surface
ne le signale ; le weekly du 2026-07-19 s'est terminé **vert** avec 0 token et
0 recommandation. Ces deux cas ont produit `pipeline_health` — mais la surface de
lecture, elle, n'a jamais été construite.

S'y ajoutent **trois angles morts mesurés le 2026-08-20** :

- **`jobs_radar_routine` n'est surveillé par rien.** Il vit sous `external_routines:`
  dans `pipelines.yaml`, une clé que `pipeline_health.py::load_pipelines()` ne lit
  pas. C'est exactement la panne d'ADR-31 : trois semaines de quota JSearch saturé,
  `raw_count` à 0 du 10 au 27 juillet, découvertes après coup.
- **`backup_supabase` n'est surveillé que par lui-même** (`if: failure()` dans son
  workflow). Une sauvegarde qu'aucune surface ne regarde est une sauvegarde qu'on
  découvre absente le jour où on en a besoin.
- **Quatre pipelines ont une sonde de fraîcheur fausse ou absente** : `tmdb_tracker_sync`,
  `igdb_tracker_sync` et `jp_vocab_sync` n'ont pas de `table:` (un run vert à vide y
  est invisible), et `anime_tracker_sync` mesure `media_entries` — une table que
  `tmdb_tracker_sync` écrit aussi, donc **AniList peut mourir sans que sa ligne bouge**.

Enfin, la sidebar range **Jarvis Lab dans « Personnel »** alors que ce panel ne
contient que du méta (roadmap Jarvis, catalogue des specs d'onglets, diagrammes
d'architecture), et **Historique dans « Système »** alors que c'est une archive
60 jours de la veille.

## Objectif

Un onglet **Santé**, dans un groupe **Coulisses**, qui répond en un écran à :
*qu'est-ce qui marche, qu'est-ce qui est cassé, depuis quand, ce que ça me coûte,
et qu'est-ce que je fais.*

Autoporteur : lisible dans six mois sans se souvenir de rien.

## Principes directeurs

1. **L'ordre des sections ne bouge jamais.** Une page dont la structure change avec
   l'état ne se mémorise pas. L'urgence est portée par le bandeau de tête et les
   pastilles, jamais par un tri qui déplace les lignes d'un jour à l'autre.
2. **Un jour normal tient en sept lignes.** Une section au vert se replie sur son
   titre. La page ne pèse que quand quelque chose ne va pas.
3. **Le geste qui répare se déclare, il ne se devine pas.** Il vit dans
   `pipelines.yaml`, à côté du pipeline qu'il répare, maintenu dans la même PR.
4. **Ce qu'on ne mesure pas doit se voir.** Un pipeline dont la fraîcheur n'est pas
   sondée ne s'affiche pas « ok » comme les autres : il dit qu'il n'est surveillé
   que sur son verdict de run. Un vert non mesuré est un mensonge poli.
5. **Une seule surface par vérité.** Ce que dit Santé, Stacks & Limits ne le redit pas.

## Le découpage en sections

Sept sections, ordre fixe, **19 briques** (16 surveillées aujourd'hui + 3 ajoutées).

| # | `domain` | Section | Briques | Ce qui s'éteint |
|---|---|---|---|---|
| 1 | `veille_ia` | Veille IA | `daily_digest`, `veille_picks` | Brief, Veille IA, Top du jour |
| 2 | `apprentissage` | Apprentissage | `weekly_analysis` | Recos, Challenges, Opportunités, Signaux faibles |
| 3 | `veille_satellite` | Veille satellite | `sport_sync`, `gaming_sync`, `anime_sync`, `news_sync` | Sport, Gaming (Veille), Anime, Actualités |
| 4 | `mediatheque` | Médiathèque | `anime_tracker_sync`, `tmdb_tracker_sync`, `jp_vocab_sync` | Médiathèque |
| 5 | `perso` | Vie perso | `strava_sync`, `withings_sync`, `lastfm_sync`, `steam_sync`, `tft_sync`, `igdb_tracker_sync` | Forme, Musique, Gaming (Personnel) |
| 6 | `business` | Business | `jobs_radar_routine` **(nouveau)** | Jobs Radar |
| 7 | `socle` | Socle | `backup_supabase` **(nouveau)**, `pipeline_health` **(nouveau)** | rien de visible — et c'est le problème |

`domain` est un **vocabulaire fermé** de sept valeurs, déclaré dans le contrat
`health` et validé par `validate-arch`. Une brique sans `domain` tomberait dans un
trou de la page sans que personne le sache : c'est un échec bloquant, pas un warning.

Le titre de section porte une pastille et **une phrase d'effet en langage utilisateur**,
dérivée des `panels` des briques dégradées de la section — jamais écrite à la main :

```
APPRENTISSAGE                                          ● en panne
Recommandations, Challenges, Opportunités et Signaux faibles
sont figés au 28 avril.
```

## L'anatomie d'une ligne

**Au vert, une ligne :**

```
Veille IA quotidienne (Gemini)          ok            article du jour à 06h04
```

**Dégradée, quatre :**

```
Analyses hebdo (Claude Haiku)           EN PANNE                       118 j
  Compte Anthropic sans crédit — HTTP 400 sur chaque appel.
  Recommandations, Challenges, Opportunités et Signaux faibles
  affichent encore le 28 avril.
  → Recharger le crédit sur console.anthropic.com, puis relancer
    le workflow weekly_analysis.                            [voir le run ↗]
```

Quatre registres, quatre sources :

| Registre | Source | Existant ? |
|---|---|---|
| Verdict + âge | `status`, `data_last_seen`/`last_success_at` | oui |
| Cause | `last_error` | oui |
| Effet | dérivé de `panels` × labels de `COCKPIT_NAV` | non — calcul front |
| Geste | `remediation` | **non — nouveau champ** |

### Les six rendus

Le verdict en base garde ses quatre valeurs (`ok` / `failing` / `stale` / `unknown`).
`ok` se **rend** de trois façons, toutes dérivées de colonnes existantes — aucun
statut supplémentaire en base :

| Rendu | Condition | Exemple |
|---|---|---|
| `ok` | `status='ok'` et `data_last_seen` non nul et `max_age_hours` non nul | `ok · article du jour à 06h04` |
| **`au repos`** | `status='ok'`, `data_last_seen` non nul, **`max_age_hours` nul** | `au repos · rien depuis 37 j` |
| **`non mesuré`** | `status='ok'`, **`data_last_seen` nul** | `run vert · fraîcheur non mesurée` |
| `EN PANNE` | `status='failing'` | le dernier run a échoué |
| `FIGÉ` | `status='stale'` | les runs passent, la table ne bouge plus |
| `inconnu` | `status='unknown'` | aucun run décisif trouvé |

**« Au repos »** existe pour Strava, Withings, Last.fm, TFT et `jp_vocab_sync` :
leur vide est nominal (ils sont pilotés par l'activité de l'utilisateur, d'où
l'absence volontaire de `max_age_hours`). Aujourd'hui ils s'affichent « ok » et
l'âge disparaît de l'écran. Désormais : mesuré, daté, pas alarmé.

**« Non mesuré »** applique le principe 4. Il ne concerne, après les corrections
ci-dessous, plus que `igdb_tracker_sync`, `backup_supabase` et `pipeline_health`.

## Contrat de surveillance — extensions de `pipelines.yaml`

Trois clés ajoutées sous `health:`, plus une pour les routines distantes.
L'en-tête documentaire du fichier (lignes 15-33) est mis à jour en conséquence.

```yaml
health:
  domain: apprentissage          # NOUVEAU — obligatoire, vocabulaire fermé (7 valeurs)
  panels: [recos, challenges, opps, signals]
  table: learning_recommendations
  date_column: created_at
  filter: "source=eq.anilist"    # NOUVEAU — optionnel, fragment PostgREST
  max_age_hours: 192
  remediation: >-                # NOUVEAU — optionnel, une à deux phrases
    Recharger le crédit sur console.anthropic.com, puis relancer le workflow.
  impact: >-                     # NOUVEAU — optionnel, requis si panels est vide
    Aucune surface ne le montre : les saisies manuelles ne sont plus sauvegardées.
```

- **`domain`** — obligatoire sur tout pipeline actif portant un bloc `health`.
- **`filter`** — fragment de requête PostgREST passé tel quel à `data_freshness()`.
  Nécessaire dès que la table de sortie est partagée par plusieurs écrivains.
- **`remediation`** — le geste. Absent ⇒ la ligne dégradée n'affiche pas de flèche.
- **`impact`** — la phrase d'effet, uniquement pour les briques sans `panels`
  (les deux du Socle). Ailleurs, l'effet se dérive des `panels`.

## Schéma — migration `sql/032_pipeline_health_selfcontained.sql`

```sql
ALTER TABLE pipeline_health
  ADD COLUMN IF NOT EXISTS domain      text,
  ADD COLUMN IF NOT EXISTS remediation text,
  ADD COLUMN IF NOT EXISTS impact      text;
```

Pas de contrainte `CHECK` sur `domain` : le vocabulaire fermé est tenu par
`validate-arch` sur le YAML, qui est la source de vérité. Une contrainte SQL en
plus obligerait à une migration à chaque section ajoutée, pour une table que seul
un script de confiance écrit.

Aucune valeur par défaut, aucun backfill : `pipeline_health.py` réécrit **toutes**
les lignes à chaque run quotidien (upsert `merge-duplicates` sur `pipeline_id`).
Les trois colonnes sont peuplées au premier passage suivant le déploiement.

## Pipeline — extensions de `pipelines/pipeline_health.py`

Quatre modifications, toutes locales :

1. **`load_pipelines()` lit aussi `external_routines:`.** Une routine distante n'a
   pas de `workflow_file` : elle est marquée `remote: True` et saute l'appel GitHub.
2. **`verdict()` gère le cas « fraîcheur seule ».** Aujourd'hui, `last_run_conclusion`
   à `None` renvoie `unknown` — ce qui condamnerait toute routine distante à
   l'ignorance perpétuelle. Nouvelle règle : *si le pipeline est `remote` et qu'une
   sonde de fraîcheur existe, le verdict se calcule sur elle seule* (`stale` au-delà
   de `max_age_hours`, `ok` sinon). `unknown` reste réservé au cas « on ne sait rien ».
3. **`data_freshness()` accepte un `filter`.** Le fragment est fusionné aux `params`
   de la requête PostgREST existante.
4. **Les trois nouvelles colonnes sont recopiées du YAML** dans la ligne upsertée.

Le reste est inchangé : les deux signaux, la garde `DECISIVE_CONCLUSIONS`, l'issue
GitHub, le `return 0` inconditionnel.

## Ce qu'on ajoute au contrat de surveillance

Trois briques entrent sous surveillance (a, b, c), quatre sondes existantes sont
corrigées (d).

### a) `jobs_radar_routine` (nouveau sous surveillance)

```yaml
health:
  domain: business
  panels: [jobs]
  table: job_scans
  date_column: scan_date
  max_age_hours: 96          # cron lun/mer/ven ⇒ 2 j + marge
  remediation: >-
    Vérifier le quota JSearch (reset le 27 du mois) via job_scans.tendances->'fetch',
    puis la routine trig_01JtTsMm27eTAGxR5po5KmMQ sur claude.ai.
```

Pas de run GitHub à interroger : verdict sur la fraîcheur seule (cas 2 ci-dessus).
`96 h` couvre le trou lun→mer sans crier sur un week-end normal.

### b) `backup_supabase` (nouveau sous surveillance)

```yaml
health:
  domain: socle
  panels: []
  impact: >-
    Aucune surface ne le montre. Les saisies que rien ne sait refabriquer
    (jobs, profil, idées, engagements, notes, progression média) ne sont plus copiées.
  remediation: "Ouvrir le dernier run et lire quelle table a échoué."
```

Pas de `table:` — le pipeline n'en écrit aucune, sa sortie est un artefact de run
(ADR-37). C'est le **troisième cas** déjà documenté dans l'en-tête du YAML : *ni
table ni max_age ⇒ seul le verdict du run compte*. Le commentaire actuel
« Pas de bloc `health` » est remplacé par une note expliquant pourquoi il n'a pas
de sonde de fraîcheur mais reste surveillé.

`panels: []` ne supprime pas l'alerte : le bandeau du Brief affiche **toutes** les
briques dégradées (`isEntryPoint`), pas seulement celles qui listent l'onglet courant.

### c) `pipeline_health` (le surveillant s'inscrit lui-même)

```yaml
health:
  domain: socle
  panels: []
  impact: >-
    Les états affichés partout ailleurs gèlent sur leur dernier verdict connu.
  remediation: "Ouvrir le dernier run : le plus souvent, un GITHUB_TOKEN expiré."
```

La garde 48 h du bandeau du Brief (`checkStale`) reste où elle est. Ici, elle
devient une **ligne visible** plutôt qu'un cas particulier enfoui dans un composant.

L'auto-observation fonctionne sans rien changer au code : le run en cours n'a pas
encore de `conclusion`, il est donc écarté par `DECISIVE_CONCLUSIONS` et la ligne
rapporte le **run précédent**. Un `pipeline_health` qui échoue est vu au run suivant
— et s'il n'y a pas de run suivant, c'est la garde `checked_at` qui parle.

### d) Les quatre sondes fausses ou absentes (corrections)

| Pipeline | Aujourd'hui | Après | Pourquoi |
|---|---|---|---|
| `anime_tracker_sync` | `media_entries` sans filtre | + `filter: source=eq.anilist` | `tmdb_tracker_sync` écrit la même table : AniList peut mourir sans que la ligne bouge |
| `tmdb_tracker_sync` | aucune sonde | `media_entries`, `updated_at`, `filter: source=in.(tmdb_tv,tmdb_movie)`, `max_age_hours: 30` | un run vert à vide y est invisible |
| `jp_vocab_sync` | aucune sonde | `jp_words`, `created_at`, **sans `max_age_hours`** | table exclusive, mais alimentée à l'ajout d'une franchise ⇒ piloté par l'activité, donc « au repos », jamais `stale` |
| `igdb_tracker_sync` | aucune sonde | **reste sans sonde**, affiché « non mesuré » | ses trois tables sont co-écrites par le front depuis le 2026-08-14 (ADR-36) : aucune colonne ne distingue le pipeline de l'utilisateur |

`media_entries.source` (défaut `'anilist'`) et `jp_words.created_at` sont vérifiés
présents dans `sql/020_media_tracker.sql` et `sql/024_jp_vocab.sql`.

**Correction annexe assumée** : `igdb_tracker_sync` déclare `panels: [brief]`, mais
l'onglet Gaming consomme aussi `game_releases` depuis ADR-35/36
(`panel-gaming.jsx::ackRelease`, `syncFranchiseUpcoming`). Le contrat passe à
`panels: [brief, gaming]` — sans quoi la phrase d'effet mentirait par omission, et
le bandeau n'apparaîtrait pas sur l'onglet Gaming.

## L'onglet — `cockpit/panel-sante.jsx` + `styles-sante.css`

**Aucun fetch.** `bootTier1()` charge déjà la table entière et sans filtre
(`data-loader.js:1194`, cf. le commentaire de la ligne 1190 qui l'explique). Le panel
est un rendu pur sur `window.COCKPIT_DATA.pipeline_health`. Pas de loader Tier 2,
pas d'entrée dans `loadPanel()`, pas de `dataVersion`.

Composition :

- **`SaVerdict`** — bandeau de tête. `N pannes, M figés — 19 briques surveillées`,
  ou `Tout tourne — 19 briques surveillées, dernier contrôle à 09h04`. Reprend la
  garde 48 h sur `checked_at` : si le surveillant n'a pas tourné, le bandeau le dit
  **avant** tout le reste, parce que tout le reste devient alors douteux.
- **`SaSection`** — titre, pastille, phrase d'effet dérivée, repliée par défaut si
  toutes ses briques sont saines, dépliée sinon. L'état de pli est mémorisé en
  `localStorage` (`cockpit-sante-open`), avec la règle : une section qui **devient**
  dégradée s'ouvre, quel que soit l'état mémorisé.
- **`SaRow`** — la ligne, dans ses six rendus.
- **`saPanelLabels()`** — helper qui mappe un id de panel vers son label via
  `window.COCKPIT_NAV`, et **préfixe du groupe en cas d'homonymie** : `gaming` et
  `gaming_news` s'appellent tous deux « Gaming » ⇒ « Gaming (Personnel) » et
  « Gaming (Veille) ».

Le style suit `styles-stacks.css`, dont la liste `st-ph-*` est le point de départ
naturel : mêmes pastilles, mêmes couleurs de statut.

Branchements (étapes 2 et 3 de la checklist en tête de `cockpit/nav.js`) :
`app.jsx` route `activePanel === "sante"`, et `index.html` charge
`cockpit/panel-sante.jsx` + `cockpit/styles-sante.css`.

## Navigation — le groupe « Coulisses »

```js
{ group: "Veille", items: [
    …, { id: "history", label: "Historique", icon: "clock" },   // ← depuis Système
]},
{ group: "Personnel", items: [
    …                                                            // jarvis-lab retiré
]},
{ group: "Coulisses", items: [                                   // ← ex-« Système »
    { id: "sante",      label: "Santé",           icon: "plug"  },  // ← nouveau
    { id: "stacks",     label: "Stacks & Limits", icon: "wallet"},
    { id: "jarvis-lab", label: "Jarvis Lab",      icon: "chart" },  // ← depuis Personnel
]},
```

`plug` est déjà l'icône du bandeau de santé du Brief : le lien visuel est gratuit.

`Historique` redescend dans Veille parce que c'est ce qu'il est — une archive
60 jours des briefs, articles et signaux (`docs/specs/tab-history.md`) — et non de
la machinerie. Le groupe « Coulisses » devient homogène : **la machine (Santé), ce
qu'elle coûte (Stacks), ses plans (Jarvis Lab).**

Le renommage est sans risque CI : aucun linter ne code de nom de groupe en dur
(vérifié sur `lint_specs_produit.py`, `validate_architecture.py`,
`lint_known_sections.py`). Les groupes ne sont que des chaînes de `nav.js` et le
champ `group` de `docs/specs/index.json`. En revanche `KNOWN_SECTIONS`
(`jarvis/scripts/extract_signals.py`, 30 ids) code les **ids** en dur, et son lint
est bloquant : l'ajout de `sante` y est obligatoire.

## Ce qui bouge ailleurs

1. **`panel-stacks.jsx` perd `StPipelineHealth`** (~50 lignes, section « 4bis » de sa
   spec). Remplacée par une ligne de renvoi cliquable : *« 2 pipelines dégradés ·
   voir Santé »* (`onNavigate("sante")`), ou *« Tous les pipelines au vert »*. Deux
   surfaces qui disent la même chose finissent par se contredire ; Stacks redevient
   ce que sa spec annonce — l'argent et les quotas.
2. **`app.jsx::PipelineHealthBanner` ne change pas de logique.** Il gagne, sous sa
   liste, un lien *« Tout voir »* vers l'onglet Santé. C'est le point de passage
   quotidien : il doit continuer d'alerter là où l'utilisateur passe.
3. **`data-loader.js:1238`** — le commentaire `// uniquement les pipelines dégradés`
   est **faux** (la requête n'a aucun filtre) et contredit celui des lignes 1190-1193
   qui explique justement pourquoi on charge tout. Corrigé.

## Télémétrie

**Aucun `event_type` nouveau.** `section_opened{section:"sante"}` répond déjà à
« est-ce qu'il l'ouvre », et `link_clicked` couvre les liens vers les runs GitHub.
Donc aucune entrée à ajouter dans `docs/telemetry.md`.

**Sonde de survie**, à lire au bout de six semaines : si `section_opened{section:"sante"}`
reste à zéro alors que le bandeau du Brief s'est affiché (donc qu'il y avait quelque
chose à voir), c'est le bandeau qui suffit et l'onglet est du décor — il doit être
retiré plutôt que maintenu par principe.

## États & edge cases

| Cas | Comportement |
|---|---|
| `pipeline_health` vide (premier boot, fetch en échec) | La page affiche un état vide explicite : « Aucun relevé — le contrôle de santé n'a jamais écrit ». Jamais « tout va bien ». |
| `checked_at` > 48 h | Bandeau de tête en avertissement, **avant** les sections. Les verdicts affichés sont marqués comme datés. |
| Brique en base absente du YAML | Affichée dans une section « Non classé » en fin de page. Une brique orpheline doit se voir, pas disparaître. |
| `domain` nul (déploiement partiel) | Même traitement : section « Non classé ». `validate-arch` empêche que ça arrive depuis le repo, pas qu'une vieille ligne survive un run. |
| `remediation` absent | La ligne dégradée affiche cause + effet, sans flèche. Pas de texte générique du type « vérifier les logs » : un conseil creux use la confiance dans les autres. |
| `panels: []` et `impact` absent | Aucune phrase d'effet. `validate-arch` le refuse à la source. |
| Deux panels homonymes | Préfixe du groupe (`Gaming (Veille)`). |
| Toutes les briques saines | Sept titres repliés + bandeau vert. La page tient en un écran. |

## Tests

| Test | Fichier | Ce qu'il couvre |
|---|---|---|
| Verdict fraîcheur-seule | `tests/test_pipeline_health_remote.py` (nouveau) | Une routine `remote` sans `workflow_file` produit `ok`/`stale` et jamais `unknown` quand une sonde existe |
| Filtre de fraîcheur | idem | `filter` est bien transmis aux params PostgREST ; son absence ne change pas la requête |
| Chargement du YAML | idem | `external_routines` remontent avec `remote: True` ; les pipelines `status != active` restent exclus |
| Vocabulaire `domain` | `scripts/validate_architecture.py` | Tout bloc `health` d'un pipeline actif porte un `domain` du vocabulaire fermé ; `panels: []` exige `impact`. **Bloquant.** |
| Rendu des cinq états | `tests/test_sante_view.mjs` (nouveau) | Les trois rendus de `ok` (mesuré / au repos / non mesuré), plus `failing` et `stale`, à partir de lignes fixtures |
| Homonymie de labels | idem | `gaming` et `gaming_news` produisent deux libellés distincts |

Le test de rendu suit le harnais SSR Node déjà utilisé pour `test_games_view.mjs`
et `test_mediatheque_view.mjs`.

## Documentation à mettre à jour (même commit)

- `docs/architecture/pipelines.yaml` — en-tête (les 4 nouvelles clés), 3 blocs
  `health` créés, 4 corrigés, `domain` sur les 16 existants.
- `docs/specs/tab-sante.md` (nouveau) + `docs/specs/index.json` (entrée + `group`
  de `history` et `jarvis-lab`) + `jarvis/spec.json::cockpit_tabs`.
- `docs/specs/tab-stacks.md` — retrait de l'étape « 4bis » du parcours.
- `docs/architecture/dependencies.yaml` — `panels[]` : entrée `sante`, `reads`
  de `pipeline_health`.
- `docs/architecture/decisions.md` — ADR : pourquoi une surface de lecture dédiée
  plutôt qu'un enrichissement du bandeau, pourquoi le geste vit dans le YAML.
- `cockpit/nav.js` — le groupe, et la checklist en en-tête si une étape manque.
- `jarvis/scripts/extract_signals.py::KNOWN_SECTIONS` — ajout de `sante`
  (lint bloquant, cf. `scripts/lint_known_sections.py`).
- `node scripts/sync-sw.mjs` — `index.html` et `cockpit/**` changent.
- `CLAUDE.md` — rien à ajouter. Le pointeur `docs/architecture/` couvre déjà le sujet.

## Risques assumés

1. **Un onglet de plus dans un cockpit qui en a déjà 30, dont plusieurs morts.**
   La sonde de survie ci-dessus existe pour ça, et la règle est écrite d'avance :
   zéro ouverture en six semaines ⇒ on retire.
2. **`remediation` va pourrir.** Un geste écrit une fois vieillit avec le service
   qu'il décrit. Atténuation : il est optionnel, il vit à côté du pipeline, et une
   ligne sans geste reste utile. On ne met pas de garde-fou automatique dessus —
   il n'y a rien à vérifier mécaniquement dans une phrase.
3. **`max_age_hours: 96` sur Jobs Radar peut faire un faux positif** si la routine
   distante glisse d'un jour. On préfère un faux positif rattrapable à trois
   semaines de silence.
4. **Retirer la liste Pipelines de Stacks casse une habitude.** Compensé par le
   renvoi cliquable, et c'est le prix du principe 5.

## Hors périmètre (tranché avec l'utilisateur le 2026-08-20)

- **Le journal chronologique** des événements. La page est un **état**, pas un log.
- **Jarvis local** (serveur LM Studio, indexer, nightly learner, brief d'activité).
  `jarvis_status_snapshot` existe et n'est lue par personne : ça reste vrai.
- **Argent et quotas** (crédit Anthropic, Gemini, JSearch) : restent dans Stacks & Limits.
- **Front et CI** (erreurs `error_shown`, service worker, workflows de lint) :
  cassent le développement, pas l'usage quotidien. Autre nature de signal.
