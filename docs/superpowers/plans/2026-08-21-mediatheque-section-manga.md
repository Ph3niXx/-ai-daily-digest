# Section Manga — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter une quatrième section « Manga » à la Médiathèque, qui suit la progression en tomes des mangas et manhwas, sans agenda ni alertes de sortie — faute de source de dates VF.

**Architecture:** Une entrée `media_entries` = une série manga (`kind='manga'`, `episodes_total` = nombre de tomes AniList). Le client AniList et le pipeline deviennent type-agnostiques : les ids AniList ne collisionnent pas entre ANIME et MANGA (vérifié), donc retirer `type: ANIME` des requêtes suffit. Le pipeline `anime_tracker_sync` est étendu, pas dupliqué, avec un garde-fou qui interdit toute émission de `media_releases` pour un manga.

**Tech Stack:** React 18 + Babel standalone (no build step), Supabase Postgres, AniList GraphQL, Python 3.11 (pipelines), tests node/python maison (pas de framework — chaque fichier est un script qui sort en 1).

**Spec:** [docs/superpowers/specs/2026-08-21-mediatheque-section-manga-design.md](../specs/2026-08-21-mediatheque-section-manga-design.md)

## Global Constraints

- **Pas de build step.** Aucun `import`/`export` ES dans `cockpit/**` — les modules s'exposent sur `window.X` et se doublent d'un `module.exports` sous garde pour être testables sous node.
- **Babel standalone transpile `const` en `var`.** Une variable utilisée avant sa déclaration ne lève pas d'erreur de zone morte : elle vaut `undefined` et fait tomber le panel entier dans l'error boundary. Respecter l'ordre de déclaration dans `PanelMediatheque`.
- **Tests sans framework.** Chaque fichier de test est un script autonome : `check(name, got, expected)`, compteur `failures`, `process.exit(1)` / `sys.exit(1)`. Ne pas introduire pytest ni vitest.
- **CI lance `tests/test_*.mjs` et `tests/test_*.py` un par un.** Un nouveau fichier respectant ce nommage est ramassé automatiquement.
- **`PYTHONIOENCODING=utf-8` obligatoire** devant tout script Python de `scripts/` sous Windows — sans lui `validate_spec.py` plante en cp1252 **avant** d'imprimer son verdict, ce qui masque un vrai échec.
- **Toute modif de `cockpit/**` impose `node scripts/sync-sw.mjs`.** Ne jamais éditer `STATIC[]` ou `CACHE` à la main.
- **Toute modif fonctionnelle d'un onglet impose la MAJ de `docs/specs/tab-mediatheque.md` + bump `last_updated` dans `docs/specs/index.json`.**
- **Vocabulaire imposé, copié de la spec :** libellé de section `Manga`, kicker `Personnel · manga`, unité `tome` (jamais « volume » ni « chapitre »), libellé de progression `tome N sur M`.
- **Le dénominateur est le nombre de tomes japonais**, pas VF. Ne jamais écrire « disponibles en français » nulle part.

---

### Task 1: Migration — `media_entries.kind` accepte `'manga'`

Sans elle, tout `POST media_entries` avec `kind='manga'` viole le CHECK et l'ajout front est rollback. Elle vient donc en premier.

**Files:**
- Create: `sql/033_media_manga.sql`

**Interfaces:**
- Consumes: rien.
- Produces: la valeur `'manga'` devient légale dans `media_entries.kind`. Toutes les tâches suivantes en dépendent.

- [ ] **Step 1: Vérifier que 033 est bien le numéro libre**

Run: `ls sql/ | sort | tail -5`
Expected: le plus haut numéro est `032_pipeline_health_selfcontained.sql`. Si un `033_*` existe déjà, prendre le suivant et corriger le nom partout dans cette tâche.

- [ ] **Step 2: Écrire la migration**

```sql
-- ============================================================
-- Migration 033: Médiathèque — section Manga
-- Une entrée = une série manga (pas un tome) : `episodes_total` porte
-- le nombre de tomes, `media_progress.episodes_watched` les tomes lus.
-- Aucune autre colonne n'est ajoutée — c'est l'intérêt du choix
-- « un seul compteur » (pas de distinction possédés / lus).
-- Spec : docs/superpowers/specs/2026-08-21-mediatheque-section-manga-design.md
-- ============================================================

ALTER TABLE media_entries DROP CONSTRAINT IF EXISTS media_entries_kind_check;
ALTER TABLE media_entries ADD CONSTRAINT media_entries_kind_check
  CHECK (kind IN ('season','movie','ova','special','other','manga'));
```

- [ ] **Step 3: Vérifier le nom réel de la contrainte avant de l'appliquer**

Le `DROP CONSTRAINT IF EXISTS` est silencieux : si Postgres a nommé la contrainte autrement, le DROP ne fait rien et l'ADD échoue en doublon. Interroger le catalogue via MCP Supabase (`mcp__claude_ai_Supabase__execute_sql`, project_id `mrmgptqpflzyavdfqwwv`) :

```sql
select conname from pg_constraint
where conrelid = 'media_entries'::regclass and contype = 'c';
```

Expected: une ligne `media_entries_kind_check`. Si le nom diffère, l'utiliser dans le `DROP`.

- [ ] **Step 4: Appliquer la migration**

Via MCP Supabase `mcp__claude_ai_Supabase__apply_migration`, name `media_manga_kind`, avec le SQL de l'étape 2.

- [ ] **Step 5: Vérifier que la contrainte accepte 'manga' et refuse toujours le reste**

Via `mcp__claude_ai_Supabase__execute_sql` :

```sql
select pg_get_constraintdef(oid) from pg_constraint
where conrelid = 'media_entries'::regclass and conname = 'media_entries_kind_check';
```

Expected: la définition contient `'manga'::text` et les cinq valeurs d'origine.

- [ ] **Step 6: Commit**

```bash
git add sql/033_media_manga.sql
git commit -m "feat(mediatheque): media_entries.kind accepte manga"
```

---

### Task 2: `released()` et le vocabulaire « tome »

Le bug qui rend cette tâche non négociable : pour un manga `RELEASING`, `released()` renvoie `Math.max(0, (null || 1) - 1)` = **0**, donc `MdtStepper` calcule `max = 0` et se désactive. Un manga en cours de publication serait intégralement non déclarable.

**Files:**
- Modify: `cockpit/lib/mediatheque-view.js:19-51` (`released`, `kindTag`, `nextEpLabel`, `curLabel`) et son bloc `const api = {…}` en fin de fichier
- Test: `tests/test_mediatheque_view.mjs` (append avant le bloc final `console.log(failures ? …)`)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `released(entry) -> number` — inchangé pour les autres kinds ; **toujours un nombre, jamais `null`**.
  - `unitOf(entry) -> "tome" | "ép."` — la forme employée dans les libellés, pas un nom canonique ; consommée telle quelle par `nextEpLabel`
  - `nextEpLabel(entry, watched) -> string | null` — rend `"tome 12 sur 37"` pour un manga.
  - `curLabel(entry, progressById) -> string | null` — rend `"11/37"` pour un manga.
  - Les trois sont exposées sur `window.mdtView` et via `module.exports`.

- [ ] **Step 1: Écrire les tests qui échouent**

Append dans `tests/test_mediatheque_view.mjs`, juste avant la ligne `console.log(failures ? …)` :

```javascript
// ── Manga : released() / unitOf() / libelles ──────────────────
// Le piege central : un manga RELEASING n'a pas de nextAiringEpisode, donc
// next_episode_number est null, donc la branche RELEASING de released()
// renverrait 0 -> max=0 dans MdtStepper -> stepper DESACTIVE. Un manga en
// cours de publication serait integralement non declarable.
// `in_main_chain` et `sort_order` ne sont pas decoratifs : currentEntryOf()
// fait `entries.filter((e) => e.in_main_chain)` et rendrait null sans eux.
// toEntryRows ecrit toujours ces deux champs, la fixture colle donc au reel.
const mangaOngoing = { id: "mg1", kind: "manga", airing_status: "RELEASING",
  episodes_total: 37, next_episode_number: null, season_number: null,
  in_main_chain: true, sort_order: 0 };
const mangaDone = { id: "mg2", kind: "manga", airing_status: "FINISHED",
  episodes_total: 29, next_episode_number: null, season_number: null,
  in_main_chain: true, sort_order: 0 };
const mangaUnknown = { id: "mg3", kind: "manga", airing_status: "RELEASING",
  episodes_total: null, next_episode_number: null, season_number: null,
  in_main_chain: true, sort_order: 0 };

check("released: manga RELEASING => ses tomes, PAS 0 (sinon stepper mort)",
  V.released(mangaOngoing), 37);
check("released: manga FINISHED => ses tomes", V.released(mangaDone), 29);
// Jamais null : status() fait `s + released(e)` (que null traverse) mais
// currentEntryOf() fait `watched < released(e)`, et `5 < null` est FAUX —
// le manga ne serait alors jamais l'entree courante, sans aucune erreur.
check("released: manga sans volumes => 0, jamais null", V.released(mangaUnknown), 0);
check("released: le type de retour reste un nombre",
  typeof V.released(mangaUnknown), "number");

// unitOf rend la forme EMPLOYEE DANS LES LIBELLES (« ep. » abrege, « tome »
// non), pas un nom canonique : c'est nextEpLabel qui la consomme telle quelle.
check("unitOf: manga => tome", V.unitOf(mangaOngoing), "tome");
check("unitOf: saison => ep.", V.unitOf({ kind: "season" }), "ép.");
check("unitOf: film => ep.", V.unitOf({ kind: "movie" }), "ép.");
check("unitOf: entree sans kind => ep. (defaut historique)",
  V.unitOf({}), "ép.");

check("nextEpLabel: manga => « tome N sur M », pas « ep. »",
  V.nextEpLabel(mangaOngoing, 11), "tome 12 sur 37");
check("nextEpLabel: manga sans volumes => denominateur inconnu",
  V.nextEpLabel(mangaUnknown, 4), "tome 5");
check("curLabel: manga => « 11/37 » sans etiquette de saison",
  V.curLabel(mangaOngoing, new Map([["mg1", 11]])), "11/37");
check("curLabel: manga jamais lu", V.curLabel(mangaDone, new Map()), "0/29");

// Non-regression : les libelles anime ne bougent pas d'un caractere.
check("nextEpLabel: anime inchange",
  V.nextEpLabel({ kind: "season", season_number: 2, airing_status: "FINISHED", episodes_total: 24 }, 15),
  "S2 · ép. 16 sur 24");

// status() et currentEntryOf() doivent continuer de fonctionner sur un manga.
check("status: manga entame => En cours",
  V.status([mangaOngoing], new Map([["mg1", 11]])).id, "watching");
check("status: manga tout lu et termine => Vu",
  V.status([mangaDone], new Map([["mg2", 29]])).id, "seen");
check("currentEntryOf: le manga entame est bien l'entree courante",
  (V.currentEntryOf([mangaOngoing], new Map([["mg1", 11]])) || {}).id, "mg1");
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `node tests/test_mediatheque_view.mjs`
Expected: FAIL sur `released: manga RELEASING` (got `0`, expected `37`) et sur tous les `unitOf` (`V.unitOf is not a function`).

- [ ] **Step 3: Implémenter**

Dans `cockpit/lib/mediatheque-view.js`, remplacer `released` et ajouter `unitOf` juste après :

```javascript
  // Épisodes réellement sortis pour une entrée. Source de vérité unique :
  // panel-mediatheque.jsx::mdtReleased() délègue ici.
  function released(e) {
    // Un manga n'a AUCUN calendrier de diffusion : AniList ne renvoie pas de
    // nextAiringEpisode pour le type MANGA, donc next_episode_number est null
    // et la branche RELEASING ci-dessous rendrait 0 — soit max=0 dans
    // MdtStepper, soit un manga en cours intégralement non déclarable.
    // Ses tomes parus SONT son total connu.
    //
    // `|| 0` et pas `?? null` : le contrat de retour est un NOMBRE. status()
    // fait `s + released(e)` (que null traverserait sans bruit) mais
    // currentEntryOf() fait `watched < released(e)`, et `5 < null` est faux —
    // le manga ne serait jamais l'entrée courante, sans la moindre erreur.
    if (e.kind === "manga") return e.episodes_total || 0;
    if (e.airing_status === "FINISHED" || e.airing_status === "CANCELLED") return e.episodes_total || 0;
    if (e.airing_status === "RELEASING") return Math.max(0, (e.next_episode_number || 1) - 1);
    return 0;
  }

  // Unité de progression, dans LA FORME employée par les libellés (« ép. »
  // abrégé, « tome » non) — nextEpLabel la consomme telle quelle plutôt que
  // d'écrire l'unité en dur dans deux branches qui divergeraient. Un manga se
  // compte en tomes, jamais en chapitres : l'utilisateur achète des volumes
  // reliés, et 224 chapitres à la place de 29 tomes serait ininterprétable.
  function unitOf(e) {
    return e && e.kind === "manga" ? "tome" : "ép.";
  }
```

Puis remplacer `nextEpLabel` et `curLabel` :

```javascript
  // Libellé du rail : « S2 · ép. 16 sur 24 » — le numéro affiché est le
  // PROCHAIN à voir (watched + 1), pas le dernier vu. Dénominateur =
  // episodes_total si connu, sinon les épisodes sortis à date.
  // Un manga n'a pas d'étiquette de saison : « tome 12 sur 37 » se suffit.
  function nextEpLabel(cur, watched) {
    if (!cur) return null;
    const rel = released(cur);
    const total = cur.episodes_total != null ? cur.episodes_total : rel;
    if (cur.kind === "movie") return watched > 0 ? "Film · vu" : "Film · non vu";
    const unit = unitOf(cur);
    // Un manga n'a pas d'étiquette de saison, et pas de « sur ? » non plus :
    // un dénominateur inconnu suggère une donnée manquante réparable, alors
    // qu'AniList ne comptera les tomes que quand l'éditeur les publiera.
    if (cur.kind === "manga") {
      return total ? `${unit} ${watched + 1} sur ${total}` : `${unit} ${watched + 1}`;
    }
    return `${kindTag(cur)} · ${unit} ${watched + 1} sur ${total || "?"}`;
  }

  // Libellé court de la saison courante pour hero/carte : « S2 · 12/28 ».
  function curLabel(cur, progressById) {
    if (!cur) return null;
    const w = progressById.get(cur.id) || 0;
    const rel = released(cur);
    if (cur.kind === "manga") return `${w}/${rel || "?"}`;
    return `${kindTag(cur)} · ${w}/${rel || "?"}`;
  }
```

Enfin, ajouter `unitOf` à l'export :

```javascript
  const api = {
    released, kindTag, nextEpLabel, curLabel, status, currentEntryOf,
    nextAiringOf, pickHero, normalize, matchesQuery, pickRail, buildWeek,
    isEvening, pickTonight, tonightHeadline, fitsBudget, airedToday,
    typeOf, cardsOfSection, countBySection, unitOf,
  };
```

- [ ] **Step 4: Lancer les tests**

Run: `node tests/test_mediatheque_view.mjs`
Expected: PASS, « Tous les tests passent ».

- [ ] **Step 5: Commit**

```bash
git add cockpit/lib/mediatheque-view.js tests/test_mediatheque_view.mjs
git commit -m "feat(mediatheque): released() et libelles comprennent le tome"
```

---

### Task 3: « Ce soir » ne propose jamais un manga

La bande lit **toutes** les cartes, sans filtre de section — c'est sa décision de conception (ADR-42). Sans garde, elle proposerait de « regarder » un tome de Vagabond pour un créneau de 30 minutes, ce qui discréditerait la bande entière.

**Files:**
- Modify: `cockpit/lib/mediatheque-view.js` — bloc « Ce soir », fonction `pickTonight`
- Test: `tests/test_mediatheque_view.mjs`

**Interfaces:**
- Consumes: `typeOf(franchise)` (existant, ADR-42) ; **`released()` corrige par la tache 2**.
  Cette dependance est reelle et silencieuse : la fixture `mgEntry` ci-dessous est `RELEASING`
  sans `next_episode_number`. Sans le correctif de la tache 2, `released()` rendrait 0,
  `currentEntryOf` rendrait `null`, la carte manga ne produirait aucune entree, et le test
  « le manga n'est jamais propose » passerait **pour la mauvaise raison** — un vert qui ne
  prouve rien. Verifier que la tache 2 est commitee avant de commencer celle-ci.
- Produces: `WATCHABLE_TYPES` (Set interne, non exporté) ; `pickTonight` conserve exactement sa signature `(cards, progressById, ctx, nowMs) -> Array<{role, card, entry}>`.

- [ ] **Step 1: Écrire le test qui échoue**

Append dans `tests/test_mediatheque_view.mjs` :

```javascript
// ── « Ce soir » ignore ce qui ne se regarde pas ───────────────
// La bande lit TOUTES les cartes par design (ADR-42) : sans garde, elle
// proposerait de « regarder » un tome. Le test le plus important est le
// dernier — manga SEUL candidat : c'est la ou un filtre absent se voit.
const mgEntry = { id: "mgt1", kind: "manga", airing_status: "RELEASING",
  episodes_total: 37, next_episode_number: null, in_main_chain: true,
  sort_order: 0, runtime_minutes: null };
const animeEntry = { id: "ant1", kind: "season", season_number: 1,
  airing_status: "FINISHED", episodes_total: 12, in_main_chain: true,
  sort_order: 0, runtime_minutes: 24 };
const mgCard = { f: { id: "fmg", media_type: "manga", shelved: false, title_english: "Vagabond" },
  entries: [mgEntry], st: { id: "watching" }, lastTouch: 99 };
const anCard = { f: { id: "fan", media_type: "anime", shelved: false, title_english: "Frieren" },
  entries: [animeEntry], st: { id: "watching" }, lastTouch: 1 };
const PROG_T = new Map([["mgt1", 11], ["ant1", 3]]);
const nightAt = (h) => new Date(2026, 7, 20, h, 30, 0).getTime();

check("pickTonight: le manga n'est jamais propose, l'anime oui",
  V.pickTonight([mgCard, anCard], PROG_T, { budgetMin: 60 }, nightAt(21))
    .map((p) => p.card.f.id), ["fan"]);
check("pickTonight: budget illimite ne le fait pas entrer non plus",
  V.pickTonight([mgCard, anCard], PROG_T, { budgetMin: null }, nightAt(21))
    .map((p) => p.card.f.id), ["fan"]);
check("pickTonight: manga SEUL candidat => zero proposition, pas de remplissage",
  V.pickTonight([mgCard], PROG_T, { budgetMin: null }, nightAt(21)), []);
check("pickTonight: une carte sans media_type reste traitee comme un anime",
  V.pickTonight([{ ...anCard, f: { ...anCard.f, media_type: null } }], PROG_T,
    { budgetMin: 60 }, nightAt(21)).length, 1);

// ── L'agenda se retire de lui-meme ───────────────────────────
// Aucun `if (section === 'manga')` n'est ajoute nulle part : la brique
// disparait parce qu'elle n'a RIEN a dire (pas de next_episode_airing_at),
// pas parce qu'on l'a exclue. Ce test verrouille cette propriete — sans lui,
// une future valeur de repli dans buildWeek ferait reapparaitre un agenda
// vide dans une section qui n'en aura jamais.
const mgFrById = new Map([["fmg", mgCard.f]]);
const wk = V.buildWeek([mgEntry].map((e) => ({ ...e, franchise_id: "fmg" })),
  mgFrById, nightAt(14));
check("buildWeek: des entrees manga ne produisent aucun jour", wk.count, 0);
check("buildWeek: ni aucune ligne « plus tard »", wk.later.length, 0);

// ── Quatre sections ──────────────────────────────────────────
const FOUR = ["anime", "tv", "movie", "manga"];
check("cardsOfSection: la section manga isole bien ses cartes",
  V.cardsOfSection([mgCard, anCard], "manga").map((c) => c.f.id), ["fmg"]);
check("cardsOfSection: le manga ne fuit pas dans anime",
  V.cardsOfSection([mgCard, anCard], "anime").map((c) => c.f.id), ["fan"]);
check("countBySection: quatre compteurs, pas trois",
  V.countBySection([mgCard, anCard], FOUR), { anime: 1, tv: 0, movie: 0, manga: 1 });
check("invariant: quatre sections partitionnent toujours la bibliotheque",
  FOUR.reduce((n, s) => n + V.cardsOfSection([mgCard, anCard], s).length, 0), 2);
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node tests/test_mediatheque_view.mjs`
Expected: FAIL sur « le manga n'est jamais propose » — got `["fmg","fan"]` ou `["fan","fmg"]`, expected `["fan"]`. Les blocs `buildWeek` et « quatre sections » doivent en revanche passer **dès maintenant** : ils vérifient que le comportement existant tient déjà avec un quatrième type. S'ils échouent, c'est une découverte, pas une étape — s'arrêter et comprendre avant d'implémenter quoi que ce soit.

- [ ] **Step 3: Implémenter**

Dans `cockpit/lib/mediatheque-view.js`, ajouter la constante juste au-dessus de `function pickTonight`, puis une ligne dans le corps :

```javascript
  // « Ce soir » répond à « qu'est-ce que je REGARDE ». Un manga n'entre pas
  // dans cette question : il n'a pas de durée, le budget « 2 h+ » n'a aucun
  // sens sur un tome, et proposer de la lecture au milieu de trois épisodes
  // discréditerait la bande entière. C'est le seul endroit du module qui
  // connaît une liste de types — partout ailleurs la section suffit.
  const WATCHABLE_TYPES = new Set(["anime", "tv", "movie"]);

  function pickTonight(cards, progressById, ctx, nowMs) {
    const budget = ctx && ctx.budgetMin !== undefined ? ctx.budgetMin : 60;
    const late = new Date(nowMs).getHours() >= LATE_HOUR;
    const active = cards.filter((c) => !c.f.shelved && WATCHABLE_TYPES.has(typeOf(c.f)));
    const taken = new Set();
    const out = [];
```

(le reste du corps est inchangé)

- [ ] **Step 4: Lancer les tests**

Run: `node tests/test_mediatheque_view.mjs`
Expected: PASS. Vérifier au passage qu'aucun test « Ce soir » préexistant ne casse — ils n'utilisent pas `media_type`, donc `typeOf` renvoie `"anime"` et ils restent éligibles.

- [ ] **Step 5: Commit**

```bash
git add cockpit/lib/mediatheque-view.js tests/test_mediatheque_view.mjs
git commit -m "feat(mediatheque): « Ce soir » ne propose que ce qui se regarde"
```

---

### Task 4: Client AniList type-agnostique

Les ids AniList ne collisionnent pas entre ANIME et MANGA (`Media(id:30642, type:ANIME)` → `Not Found`, vérifié le 2026-08-21). Retirer `type: ANIME` de `BATCH_QUERY` suffit donc à rendre `fetchFranchiseLive` fonctionnel pour les mangas, **sans changer sa signature**.

**Files:**
- Modify: `cockpit/lib/anilist.js` — `MEDIA_FIELDS`, `SEARCH_QUERY`, `BATCH_QUERY`, `relTargets` (~ligne 20), `kindOf` (ligne 53), `toFranchiseRow` (ligne 204), `toEntryRows` (ligne 220), bloc `api`
- Test: `tests/test_anilist_map.mjs` (existant — accueille aussi les tests de walk manga, voir ci-dessous)

**Interfaces:**
- Consumes: rien.
- Produces:
  - `searchManga(q) -> Promise<Array<Media>>` — jumelle de `searchAnime`.
  - `toFranchiseRow(built, mediaById)` rend désormais `media_type: "manga"` quand la racine est de type MANGA.
  - `toEntryRows(built, mediaById)` rend `kind: "manga"` et `episodes_total = volumes` pour une entrée MANGA.
  - `fetchFranchiseLive(anchorId)` : signature **inchangée**, fonctionne pour les deux types.

- [ ] **Step 1: Écrire les tests qui échouent**

Append dans `tests/test_anilist_map.mjs`, avant son bloc final :

```javascript
// ── Manga ─────────────────────────────────────────────────────
// AniList rend `volumes` et `chapters` pour un MANGA, et `episodes`/`duration`
// a null. On compte en TOMES : episodes_total <- volumes, jamais chapters.
const MANGA_ROOT = {
  id: 30642, type: "MANGA", format: "MANGA", status: "FINISHED",
  volumes: 29, chapters: 224, episodes: null, duration: null,
  title: { romaji: "Vinland Saga", english: "Vinland Saga", native: "ヴィンランド・サガ" },
  startDate: { year: 2005, month: 4, day: 13 }, endDate: {},
  coverImage: { large: "http://x/c.jpg" }, bannerImage: null,
  genres: ["Adventure"], description: "…", nextAiringEpisode: null,
  relations: { edges: [] },
};
const MANGA_BUILT = {
  root_id: 30642,
  entries: [{ source_id: 30642, in_main_chain: true, kind: "manga",
              season_number: null, sort_order: 0 }],
};
const MANGA_BY_ID = { 30642: MANGA_ROOT };

check("toFranchiseRow: media_type derive du type AniList",
  A.toFranchiseRow(MANGA_BUILT, MANGA_BY_ID).media_type, "manga");
check("toFranchiseRow: source reste anilist (ids uniques, pas de namespace)",
  A.toFranchiseRow(MANGA_BUILT, MANGA_BY_ID).source, "anilist");
check("toEntryRows: episodes_total <- volumes (tomes), pas chapters",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].episodes_total, 29);
check("toEntryRows: manga sans duree",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].runtime_minutes, null);
check("toEntryRows: manga sans calendrier",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].next_episode_airing_at, null);
check("toEntryRows: kind manga preserve",
  A.toEntryRows(MANGA_BUILT, MANGA_BY_ID)[0].kind, "manga");

// volumes null (serie en cours qu'AniList n'a pas comptee) : on n'invente pas
// un total a partir des chapitres.
const ONGOING = { ...MANGA_ROOT, id: 105398, status: "RELEASING",
  volumes: null, chapters: 179 };
check("toEntryRows: volumes null => episodes_total null, pas les chapitres",
  A.toEntryRows({ root_id: 105398, entries: [{ source_id: 105398, in_main_chain: true,
    kind: "manga", season_number: null, sort_order: 0 }] },
    { 105398: ONGOING })[0].episodes_total, null);

// Non-regression : un anime ne bouge pas.
check("toFranchiseRow: un anime reste media_type anime",
  A.toFranchiseRow({ root_id: 1, entries: [] },
    { 1: { id: 1, type: "ANIME", title: {}, genres: [], coverImage: {} } }).media_type,
  "anime");
```

Append dans `tests/test_anilist_map.mjs` (et **pas** dans `test_franchise_walk.mjs` : ce fichier n'a pas de helper `check()` — il compare en ligne avec `deepEq` — et il déstructure ses imports sans importer `chainIds`. Le miroir Python de ces mêmes règles vit dans `test_anime_tracker_sync.py`, tâche 5) :

```javascript
// ── Walk d'un manga ───────────────────────────────────────────
// Le piege : relTargets filtrait node.type === "ANIME" en dur. Le walk d'un
// manga ne trouvait donc RIEN (ses SEQUEL/PREQUEL sont de type MANGA), et
// Vinland Saga porte deux ADAPTATION -> ANIME qu'il ne faut surtout pas
// aspirer dans la franchise manga.
const MG_GRAPH = {
  100: { id: 100, type: "MANGA", format: "MANGA", status: "FINISHED",
    title: { romaji: "Tome un" }, startDate: { year: 2005 }, relations: { edges: [
      { relationType: "SEQUEL", node: { id: 101, type: "MANGA", format: "MANGA" } },
      { relationType: "ADAPTATION", node: { id: 900, type: "ANIME", format: "TV" } },
    ] } },
  101: { id: 101, type: "MANGA", format: "MANGA", status: "RELEASING",
    title: { romaji: "Tome deux" }, startDate: { year: 2010 }, relations: { edges: [
      { relationType: "PREQUEL", node: { id: 100, type: "MANGA", format: "MANGA" } },
    ] } },
};
check("walk manga: la chaine suit les SEQUEL de type MANGA",
  [...A.chainIds(MG_GRAPH, 100)].sort(), [100, 101]);
check("walk manga: l'adaptation ANIME n'est jamais aspiree",
  [...A.missingIds(MG_GRAPH, 100)], []);
check("walk manga: buildFranchise produit des entrees kind manga",
  A.buildFranchise(MG_GRAPH, 100).entries.map((e) => e.kind), ["manga", "manga"]);
```

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `node tests/test_anilist_map.mjs`
Expected: FAIL — `media_type` vaut `"anime"`, `episodes_total` vaut `null` (car `m.episodes` est null), et `chainIds` rend `[100]` seul.

- [ ] **Step 3: Implémenter — requêtes et walk**

Dans `cockpit/lib/anilist.js` :

```javascript
  const MEDIA_FIELDS = `
    id idMal type format status episodes volumes chapters duration averageScore genres
    description(asHtml: false)
    title { romaji english native }
    startDate { year month day } endDate { year month day }
    coverImage { large color } bannerImage
    nextAiringEpisode { episode airingAt }
    relations { edges { relationType node { id type format } } }`;
  // La recherche est bornée par type (on cherche « des animes » ou « des mangas »),
  // le batch ne l'est PAS : les ids AniList sont uniques entre ANIME et MANGA
  // (Media(id:30642, type:ANIME) -> Not Found, vérifié le 2026-08-21), donc un
  // même appel rafraîchit les deux et fetchFranchiseLive marche pour les deux
  // sans changer de signature.
  const SEARCH_QUERY = (type) =>
    `query($q:String){Page(page:1,perPage:12){media(search:$q,type:${type},sort:SEARCH_MATCH){${MEDIA_FIELDS}}}}`;
  const BATCH_QUERY = `query($ids:[Int]){Page(page:1,perPage:25){media(id_in:$ids){${MEDIA_FIELDS}}}}`;
```

`relTargets` (remplacer la condition) — filtrer sur le type de l'ancre, pas sur `"ANIME"` :

```javascript
      // Le type de l'ANCRE, pas « ANIME » en dur : sinon le walk d'un manga ne
      // trouve rien (ses SEQUEL/PREQUEL sont de type MANGA) et, pire, on
      // risquerait d'aspirer son adaptation anime dans la même franchise.
      if (relTypes.includes(edge.relationType) && node.type === media.type) out.push(node.id);
```

`kindOf` — la branche manga passe **avant** tout test de format (le format d'un manga vaut `MANGA`, `ONE_SHOT` ou `NOVEL`) :

```javascript
  function kindOf(media, inChain) {
    if (media.type === "MANGA") return "manga";
    const f = media.format || "";
    if (inChain && SEASON_FORMATS.includes(f)) return "season";
    if (f === "MOVIE") return "movie";
    if (f === "OVA") return "ova";
    if (f === "SPECIAL") return "special";
    return "other";
  }
```

- [ ] **Step 4: Implémenter — mapping et recherche**

`toFranchiseRow` :

```javascript
      media_type: root.type === "MANGA" ? "manga" : "anime",
```

`toEntryRows` — remplacer la ligne `episodes_total` :

```javascript
        // Un manga se compte en TOMES. `chapters` n'est jamais un repli : 224
        // chapitres à la place de 29 tomes rendrait le compteur ininterprétable
        // pour quelqu'un qui achète des volumes reliés.
        episodes_total: m.type === "MANGA"
          ? (m.volumes != null ? m.volumes : null)
          : (m.episodes != null ? m.episodes : (m.format === "MOVIE" ? 1 : null)),
```

`searchAnime` / `searchManga` — factoriser sur un `search(q, type)` interne, cache clé par type :

```javascript
  const searchCache = new Map();
  async function search(q, type) {
    const key = type + ":" + q.trim().toLowerCase();
    if (searchCache.has(key)) return searchCache.get(key);
    const data = await gql(SEARCH_QUERY(type), { q });
    const results = (data.Page && data.Page.media) || [];
    searchCache.set(key, results);
    return results;
  }
  async function searchAnime(q) { return search(q, "ANIME"); }
  async function searchManga(q) { return search(q, "MANGA"); }
```

Et l'export :

```javascript
  const api = { chainIds, missingIds, buildFranchise, gql, searchAnime, searchManga,
    fetchFranchiseLive, pruneDanglingEdges, fuzzyDate, toFranchiseRow, toEntryRows };
```

- [ ] **Step 5: Lancer tous les tests node**

Run: `for f in tests/test_*.mjs; do echo "── $f"; node "$f" || echo "ECHEC"; done`
Expected: tous PASS. `test_mediatheque_entry.mjs` doit rester vert (il vérifie l'accord globales/scripts, non touché ici).

- [ ] **Step 6: Commit**

```bash
git add cockpit/lib/anilist.js tests/test_anilist_map.mjs
git commit -m "feat(mediatheque): le client AniList sait lire un manga"
```

---

### Task 5: Pipeline — rafraîchir sans jamais alerter

Le mode d'échec le plus probable de toute cette section est ici : `franchises_qs()` ne sélectionne pas `media_type`, donc un garde-fou naïf lirait `None`, renverrait `True`, et laisserait partir des alertes fausses — **avec un test vert**.

**Files:**
- Modify: `pipelines/anime_tracker_sync.py` — `_rel_targets` (ligne 26), `_kind` (ligne 64), `MEDIA_FIELDS`/`BATCH_QUERY` (ligne ~139-146), `franchises_qs` (ligne 271), `run_sync` (ligne 306)
- Create: `tests/test_anime_tracker_sync.py`
- Modify: `tests/test_franchise_walk.py:9` (bug `sys.path` qui exclut ce test de la CI)
- Modify: `.github/workflows/tests.yml` — retirer l'exclusion devenue inutile

**Interfaces:**
- Consumes: rien du front.
- Produces: `emits_events(franchise) -> bool` ; `_kind(media, in_chain) -> str` rend `"manga"` ; `franchises_qs() -> str` contient `media_type`.

- [ ] **Step 1: Réparer le test de walk exclu de la CI**

C'est un prérequis, pas un à-côté : cette tâche modifie `_rel_targets`, et le seul test qui garde ce comportement côté Python est désactivé. Le corriger d'abord, c'est se donner un filet avant de toucher au fil.

Dans `tests/test_franchise_walk.py`, ligne 9 :

```python
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from anime_tracker_sync import build_franchise, chain_ids, missing_ids
```

- [ ] **Step 2: Vérifier que le test réparé passe AVANT toute modif du pipeline**

Run: `python tests/test_franchise_walk.py`
Expected: PASS. S'il échoue, c'est un bug préexistant à régler avant d'aller plus loin — ne pas empiler.

- [ ] **Step 3: Retirer l'exclusion CI**

Dans `.github/workflows/tests.yml`, supprimer le bloc :

```yaml
            if [[ "$f" == "tests/test_franchise_walk.py" ]]; then
              echo "── $f (excluded: pre-commit failure)"
              continue
            fi
```

…ainsi que les trois lignes de commentaire qui l'annoncent juste au-dessus (`# Exclusion temporaire (bug pre-commit, a corriger ailleurs):` et les deux suivantes).

- [ ] **Step 4: Commit du filet**

```bash
git add tests/test_franchise_walk.py .github/workflows/tests.yml
git commit -m "fix(ci): test_franchise_walk importait depuis la racine du repo"
```

- [ ] **Step 5: Écrire les tests qui échouent**

Create `tests/test_anime_tracker_sync.py` :

```python
#!/usr/bin/env python3
"""Garde-fous manga du sync AniList.
Run: python tests/test_anime_tracker_sync.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from anime_tracker_sync import _kind, _rel_targets, emits_events, franchises_qs

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


# ── _kind ────────────────────────────────────────────────────────
# La branche manga passe AVANT tout test de format : le format d'un manga
# vaut MANGA, ONE_SHOT ou NOVEL, qu'aucune branche existante ne reconnait.
check("_kind: MANGA quel que soit le format",
      _kind({"type": "MANGA", "format": "MANGA"}, True), "manga")
check("_kind: MANGA one-shot reste un manga",
      _kind({"type": "MANGA", "format": "ONE_SHOT"}, False), "manga")
check("_kind: une saison anime n'a pas bouge",
      _kind({"type": "ANIME", "format": "TV"}, True), "season")
check("_kind: un film anime n'a pas bouge",
      _kind({"type": "ANIME", "format": "MOVIE"}, False), "movie")

# ── _rel_targets ─────────────────────────────────────────────────
# Le piege concret : Vinland Saga (manga) porte deux ADAPTATION -> ANIME.
# Un filtre code en dur sur "ANIME" faisait que le walk d'un manga ne
# trouvait RIEN, et un filtre absent aspirerait l'anime dans la franchise.
MANGA = {"type": "MANGA", "relations": {"edges": [
    {"relationType": "SEQUEL", "node": {"id": 101, "type": "MANGA"}},
    {"relationType": "ADAPTATION", "node": {"id": 900, "type": "ANIME"}},
    {"relationType": "SEQUEL", "node": {"id": 902, "type": "ANIME"}},
]}}
check("_rel_targets: un manga ne remonte que des ids MANGA",
      _rel_targets(MANGA, {"SEQUEL"}), [101])

ANIME = {"type": "ANIME", "relations": {"edges": [
    {"relationType": "SEQUEL", "node": {"id": 2, "type": "ANIME"}},
    {"relationType": "ADAPTATION", "node": {"id": 3, "type": "MANGA"}},
]}}
check("_rel_targets: un anime ne remonte que des ids ANIME (non-regression)",
      _rel_targets(ANIME, {"SEQUEL"}), [2])

# ── emits_events ─────────────────────────────────────────────────
# Un tome japonais de plus n'est PAS une sortie VF et peut preceder
# l'edition francaise de deux ans. L'alerte serait fausse par construction.
check("emits_events: un manga n'alerte jamais",
      emits_events({"id": "f1", "media_type": "manga"}), False)
check("emits_events: un anime alerte",
      emits_events({"id": "f2", "media_type": "anime"}), True)
# Cle absente => comportement historique. Une franchise anterieure a la
# colonne ne doit pas cesser d'alerter a cause de ce garde-fou.
check("emits_events: cle absente => True (defaut historique)",
      emits_events({"id": "f3"}), True)

# ── franchises_qs ────────────────────────────────────────────────
# LE test qui attrape l'echec silencieux : sans media_type dans le select,
# emits_events lit None, renvoie True, et les fausses alertes partent quand
# meme — tous les tests ci-dessus restant verts.
check("franchises_qs: media_type est bien selectionne",
      "media_type" in franchises_qs(), True)

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
```

- [ ] **Step 6: Lancer le test pour vérifier qu'il échoue**

Run: `python tests/test_anime_tracker_sync.py`
Expected: FAIL à l'import — `ImportError: cannot import name 'emits_events'`.

- [ ] **Step 7: Implémenter**

Dans `pipelines/anime_tracker_sync.py` :

```python
def _rel_targets(media, rel_types):
    # Le type de l'ANCRE, pas « ANIME » en dur : sinon le walk d'un manga ne
    # trouve rien (ses SEQUEL/PREQUEL sont de type MANGA) et, pire, on
    # aspirerait son adaptation anime dans la meme franchise. Vinland Saga
    # porte deux ADAPTATION -> ANIME.
    out = []
    for edge in ((media.get("relations") or {}).get("edges") or []):
        node = edge.get("node") or {}
        if edge.get("relationType") in rel_types and node.get("type") == media.get("type"):
            out.append(node["id"])
    return out
```

```python
def _kind(media, in_chain):
    # Avant tout test de format : le format d'un manga vaut MANGA, ONE_SHOT ou
    # NOVEL, qu'aucune branche ci-dessous ne reconnait — il tomberait en
    # « other » et le libelle afficherait « OTHER · ep. 3 ».
    if media.get("type") == "MANGA":
        return "manga"
    f = media.get("format") or ""
    if in_chain and f in SEASON_FORMATS:
        return "season"
    if f == "MOVIE":
        return "movie"
    if f == "OVA":
        return "ova"
    if f == "SPECIAL":
        return "special"
    return "other"
```

Ajouter `emits_events` juste après `_kind` :

```python
def emits_events(franchise):
    """Un manga ne produit AUCUN evenement de sortie.

    Les trois event_type existants decriraient une realite japonaise : un 30e
    tome paru a Tokyo n'est pas une sortie VF et peut preceder l'edition
    francaise de deux ans. L'alerte serait fausse par construction, et elle
    remonterait jusqu'a l'encart Mediatheque du Brief du jour.

    Ce predicat vit ici et pas dans diff_events() : « quels types meritent une
    alerte » est une politique de pipeline, pas une regle de comparaison de
    lignes. diff_events est partagee avec tmdb_tracker_sync et son test defend
    explicitement son agnosticisme (tests/test_media_tracker_common.py:1).
    """
    return franchise.get("media_type") != "manga"
```

`BATCH_QUERY` (retirer le filtre de type ; `MEDIA_FIELDS` gagne `volumes chapters`) :

```python
MEDIA_FIELDS = """
  id idMal type format status episodes volumes chapters duration averageScore genres
  description(asHtml: false)
  title { romaji english native }
  startDate { year month day } endDate { year month day }
  coverImage { large color } bannerImage
  nextAiringEpisode { episode airingAt }
  relations { edges { relationType node { id type format } } }"""
# Pas de filtre de type : les ids AniList sont uniques entre ANIME et MANGA
# (Media(id:30642, type:ANIME) -> Not Found, verifie le 2026-08-21), donc un
# meme batch rafraichit les deux. `nextAiringEpisode` reste demande : il vaut
# simplement null pour un manga, et le retirer casserait les animes.
BATCH_QUERY = "query($ids:[Int]){Page(page:1,perPage:25){media(id_in:$ids){%s}}}" % MEDIA_FIELDS
```

`franchises_qs` — **la ligne sans laquelle le garde-fou est inopérant** :

```python
def franchises_qs():
    # media_type est LU par emits_events() : sans lui dans le select, le
    # garde-fou lit None, renvoie True, et les fausses alertes partent.
    return (f"source=eq.{ANILIST_SOURCE}"
            "&select=id,source_root_id,title_english,title_romaji,media_type&order=added_at")
```

`run_sync`, ligne 306 :

```python
        events = diff_events(fr, old_by_sid, fresh_rows) if emits_events(fr) else []
```

Et `to_entry_row` — remplacer la ligne `episodes_total` :

```python
        # Un manga se compte en TOMES. `chapters` n'est jamais un repli : 224
        # chapitres a la place de 29 tomes rendrait le compteur ininterpretable.
        "episodes_total": (media.get("volumes") if media.get("type") == "MANGA"
                           else (episodes if episodes is not None
                                 else (1 if media.get("format") == "MOVIE" else None))),
```

- [ ] **Step 8: Lancer tous les tests python**

Run: `for f in tests/test_*.py; do echo "── $f"; python "$f" || echo "ECHEC"; done`
Expected: tous PASS, `test_franchise_walk.py` et `test_anime_tracker_sync.py` compris.

- [ ] **Step 9: Vérifier à blanc contre la vraie base**

Run: `python pipelines/anime_tracker_sync.py --dry-run` (avec `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` dans l'environnement)
Expected: les 47 franchises anime sont parcourues, `0 événement(s)` de plus qu'avant, et aucune exception. Aucun manga en base à ce stade — c'est une vérification de non-régression.

- [ ] **Step 10: Commit**

```bash
git add pipelines/anime_tracker_sync.py tests/test_anime_tracker_sync.py
git commit -m "feat(mediatheque): le sync AniList rafraichit les mangas sans alerter"
```

---

### Task 6: Front — la quatrième section

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` — `MDT_SECTIONS` (~ligne 476), `MdtStepper` (ligne 83), effet de recherche (~ligne 869)
- Test: harnais SSR `scratchpad/render-mediatheque.mjs`

**Interfaces:**
- Consumes: `window.mdtView.released` via le délégué `mdtReleased` (Task 2 — le panel n'appelle **pas** `unitOf` directement, `nextEpLabel` s'en charge) ; `window.anilist.searchManga` (Task 4).
- Produces: section `manga` navigable.

- [ ] **Step 1: Ajouter la section**

Dans `MDT_SECTIONS`, après l'entrée `movie` :

```javascript
  { id: "manga", label: "Manga",  kicker: "Personnel · manga",
    japanese: false, emptyHint: "cherche un manga ci-dessus pour commencer",
    searchLabel: "Rechercher un manga" },
```

`japanese: false` n'est pas un choix éditorial : `pipelines/jp_vocab_sync.py:138` filtre `media_type == "anime"`, il n'existe aucun mot pour une franchise manga.

- [ ] **Step 2: Rendre le stepper utilisable sur un manga sans `volumes`**

Dans `MdtStepper`, remplacer les trois lignes `max` / `disabled` / `clamp` :

```javascript
  const released = mdtReleased(entry);
  // Un manga dont AniList ne connaît pas encore le nombre de tomes donnerait
  // max=0, donc un stepper désactivé sur une série qu'on est en train de lire.
  // On le déplafonne plutôt que de le condamner.
  const uncapped = entry.kind === "manga" && entry.episodes_total == null;
  const max = released;
  const disabled = entry.airing_status === "NOT_YET_RELEASED" || (max === 0 && !uncapped);
  const clamp = (v) => (uncapped ? Math.max(0, v) : Math.max(0, Math.min(max, v)));
```

Et le bouton `+`, qui teste `watched >= max` :

```javascript
      <button disabled={disabled || (!uncapped && watched >= max)} className="mdt-chip" style={{ marginLeft: 4 }}
```

Enfin `countLabel` gagne une branche manga **en tête**, avant les tests sur `airing_status` :

```javascript
  const total = entry.episodes_total;
  const countLabel =
    entry.kind === "manga"
      ? `${watched}/${total != null ? total : "?"}`
      : entry.airing_status === "RELEASING"
```

(le reste de la chaîne ternaire est inchangé)

- [ ] **Step 3: Ajouter AniList/MANGA comme troisième source de recherche**

Dans l'effet de recherche, remplacer le `Promise.allSettled` et ce qui en découle :

```javascript
      const [ani, manga, tmdb] = await Promise.allSettled([
        window.anilist.searchAnime(q),
        window.anilist.searchManga(q),
        tmdbKey && window.tmdb ? window.tmdb.search(q, tmdbKey) : Promise.resolve([]),
      ]);
      if (cancelled) return;

      // Forme commune aux deux corpus AniList : seul le badge diffère.
      const aniMap = (badge) => (m) => ({
        src: "anilist", kind: null, id: m.id,
        title: (m.title && (m.title.english || m.title.romaji)) || "?",
        native: (m.title && m.title.native) || null,
        year: (m.startDate && m.startDate.year) || null,
        format: m.format || null, poster: (m.coverImage && m.coverImage.large) || null,
        genres: m.genres || [], badge, score: m.averageScore || 0,
      });
      const aniRows = ani.status === "fulfilled" ? ani.value.map(aniMap("Anime")) : [];
      const mangaRows = manga.status === "fulfilled" ? manga.value.map(aniMap("Manga")) : [];
```

Puis, plus bas, remplacer le décompte d'échecs, le `setResults`, le message et la télémétrie :

```javascript
      const sources = [ani, manga, tmdb];
      const failed = sources.filter((p) => p.status === "rejected").length;
      setResults([...aniRows, ...mangaRows, ...tmdbRows].sort((a, b) => b.score - a.score));
      setSearchErr(failed === sources.length ? "Aucune source ne répond — réessaie dans un instant."
        : failed >= 1 ? "Une source n'a pas répondu — résultats partiels." : null);
      mdtTrack("mediatheque_search", {
        q_len: q.length, results: aniRows.length + mangaRows.length + tmdbRows.length,
        sources: (aniRows.length ? 1 : 0) + (mangaRows.length ? 1 : 0) + (tmdbRows.length ? 1 : 0),
      });
```

Chercher « Vinland Saga » renverra désormais l'anime **et** le manga : c'est voulu, ce sont deux parcours avec deux progressions.

- [ ] **Step 4: Étendre le harnais SSR**

Dans `scratchpad/render-mediatheque.mjs`, ajouter une franchise manga aux fixtures :

```javascript
  { id: "f-manga-1", media_type: "manga", source: "anilist", source_root_id: 30642,
    title_english: "Vinland Saga", title_romaji: "Vinland Saga", title_native: "ヴィンランド・サガ",
    genres: ["Adventure"], shelved: false, added_at: iso("2026-04-01") },
```

…l'entrée correspondante :

```javascript
  { id: "e7", franchise_id: "f-manga-1", source: "anilist", source_id: 30642, kind: "manga",
    season_number: null, title: "Vinland Saga", episodes_total: 29,
    airing_status: "FINISHED", in_main_chain: true, start_date: "2005-04-13",
    runtime_minutes: null, next_episode_number: null, next_airing_at: null },
```

…une progression (`{ entry_id: "e7", episodes_watched: 11, updated_at: iso("2026-08-18"), rating: null }`), puis les contrôles :

```javascript
const mangaHtml = render("manga", true, 14);
check("section manga : rendue sans exception", mangaHtml !== "");
check("section manga : compteur d'onglet a 1",
  /Manga<span class="mdt-section-tab-count">1</.test(mangaHtml));
check("section manga : pas d'agenda (aucune date a montrer)",
  !mangaHtml.includes("mdt-agenda"));
check("section manga : pas de bande japonaise",
  !mangaHtml.includes("mdt-jp"));
check("section manga : hero present en journee",
  mangaHtml.includes("mdt-hero"));
check("section manga : le libelle dit « tome », jamais « ep. »",
  mangaHtml.includes("tome") && !grid(mangaHtml).includes("ép."));
check("grille anime : le manga ne fuit pas",
  !grid(render("anime", true, 14)).includes("Vinland"));
check("soiree : « Ce soir » ne propose pas le manga",
  !render("manga", false, 21).slice(0,
    render("manga", false, 21).indexOf("mdt-sections")).includes("Vinland"));
```

- [ ] **Step 5: Lancer le harnais et les tests node**

Run: `node scratchpad/render-mediatheque.mjs` puis `for f in tests/test_*.mjs; do node "$f" || echo "ECHEC $f"; done`
Expected: tous PASS.

- [ ] **Step 6: Resynchroniser le service worker**

Run: `node scripts/sync-sw.mjs`
Expected: `CACHE → cockpit-vNNN` incrémenté.

- [ ] **Step 7: Commit**

```bash
git add cockpit/panel-mediatheque.jsx sw.js
git commit -m "feat(mediatheque): section Manga, stepper en tomes"
```

---

### Task 7: Documentation

**Files:**
- Modify: `docs/specs/tab-mediatheque.md`, `docs/specs/index.json`, `docs/telemetry.md`, `docs/architecture/decisions.md`, `docs/architecture/flows/perso-mediatheque.yaml`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: rien de consommé par du code.

- [ ] **Step 1: Mettre à jour la spec d'onglet**

Dans `docs/specs/tab-mediatheque.md` :
- Ligne de résumé et « Finalité fonctionnelle » : quatre rayons, et **retirer** « Mangas et livres restent hors périmètre » — remplacer par « Les livres et romans restent hors périmètre ».
- Section « Fonctionnalités », entrée « Sections … » : ajouter Manga et la phrase « la section Manga n'a **ni agenda ni bandeau Sorties** : aucune source ne connaît les dates de parution VF, et une brique sans source se retire plutôt que de s'afficher vide ».
- Nouvelle entrée « **Progression en tomes** » : un seul compteur, dénominateur = tomes **japonais**, l'édition VF accuse un à trois ans de retard.
- « États & edge cases » : `volumes` null → stepper non plafonné ; un manga n'apparaît jamais dans « Ce soir » ; une franchise manga et son adaptation anime sont deux franchises distinctes.
- « Limitations connues » : retirer la ligne « mangas et livres non couverts », ajouter « pas de dates de sortie VF — aucune source atteignable (sondes du 2026-08-21 documentées dans la spec de conception) ».
- Préciser que **manhwas et manhuas partagent la section Manga** : AniList les classe en `type: MANGA` avec `countryOfOrigin` KR/CN, et aucune colonne « pays » n'est stockée. Les séparer un jour se fera en changeant `media_type` à la main sur les lignes concernées — le pipeline ne réécrit pas `media_franchises`.
- « Dernière MAJ » : nouvelle entrée datée 2026-08-21.

- [ ] **Step 2: Bumper l'index des specs**

Dans `docs/specs/index.json`, entrée `mediatheque` : `"last_updated": "2026-08-21"`.

- [ ] **Step 3: Télémétrie**

Aucun nouvel `event_type`. Ajouter une note sous la ligne `mediatheque_section` : `section: "manga"` est une valeur admise sans changement de schéma, et la sonde de survie est l'absence de `mediatheque_progress` sur des entrées `kind:'manga'` pendant six semaines alors que la section a été ouverte.

- [ ] **Step 4: ADR-43**

Ajouter à la fin de `docs/architecture/decisions.md`, en suivant le format des précédents (Contexte / Décision / Ce qui est assumé) : les sondes de sources VF et leurs résultats, le choix d'étendre `anime_tracker_sync` plutôt que d'en créer un, l'emplacement du garde-fou `emits_events` et pourquoi pas dans `diff_events`, et le principe « une brique sans source se retire ».

- [ ] **Step 5: Flow d'architecture**

Dans `docs/architecture/flows/perso-mediatheque.yaml`, `panels[].detail` : mentionner la quatrième section et l'absence d'agenda côté manga.

- [ ] **Step 6: Lancer les cinq linters**

Run:
```bash
export PYTHONIOENCODING=utf-8
python scripts/validate_spec.py && python scripts/lint_specs_produit.py \
  && python scripts/lint_known_sections.py && python scripts/validate_architecture.py \
  && python scripts/lint_claude_md.py
```
Expected: tous verts.

- [ ] **Step 7: Commit**

```bash
git add docs/
git commit -m "docs(mediatheque): section Manga — quatre rayons, trois sources"
```

---

## Recette finale (après push sur `main`)

Le front se vérifie en prod : hard-refresh `https://ph3nixx.github.io/jarvis-cockpit/#mediatheque` (deux fois si le service worker s'accroche).

1. L'onglet **Manga · 0** apparaît, la collection est dépliée d'office et invite à chercher.
2. Chercher un manga que tu possèdes → il apparaît avec le badge **Manga**, distinct de l'anime homonyme s'il existe.
3. L'ajouter → la page bascule sur la section Manga, la fiche s'ouvre.
4. Déclarer une progression (`+1`) → le libellé dit « tome N sur M », jamais « ép. ».
5. Vérifier qu'**aucun agenda** et **aucun bandeau Sorties** n'apparaît dans cette section.
6. Passer sur Anime après 18 h → le manga n'est **pas** proposé par « Ce soir ».
7. **Le lendemain**, vérifier via MCP Supabase qu'`anime_tracker_sync` a rafraîchi le manga sans créer de ligne :

```sql
select count(*) from media_releases r
  join media_franchises f on f.id = r.franchise_id
 where f.media_type = 'manga';
```
Expected: `0`. Toute autre valeur signifie que le garde-fou n'a pas tenu — le mode d'échec annoncé.
