# Tracker jeux — Lot 2 — Refonte de l'onglet Gaming — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer l'onglet Gaming d'un tableau de bord passif de statistiques Steam en un tracker où l'utilisateur déclare où il en est de ses jeux et voit arriver les suites de ses licences.

**Architecture:** Toute la logique dérivée vit dans un `cockpit/lib/games-view.js` pur, testé sous node — le JSX du panel n'en garde que des délégués. Les données viennent des 4 tables `game_*` livrées au lot 1, jointes côté client au snapshot Steam déjà chargé par l'onglet. La recherche de jeux console passe par une Edge Function Supabase, IGDB refusant les requêtes navigateur.

**Tech Stack:** React 18 via Babel standalone sans build, Supabase REST + Edge Function (Deno), Postgres, tests node autonomes.

**Spec:** [docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md](../specs/2026-08-12-gaming-tracker-igdb-design.md), section « Lot 2 ».

## Global Constraints

- **`game_titles` contient 451 lignes, dont seules ~94 sont les jeux de l'utilisateur.** Les 357 autres sont des titres frères découverts dans les collections par le pipeline (DLC de Civilization, vieilles entrées Mass Effect). **La bibliothèque n'affiche QUE** les titres portant un `steam_appid` **ou** ayant une ligne dans `game_progress`. Afficher les 451 rendrait l'onglet inutilisable. C'est la règle centrale de ce lot.
- **Aucun backlog, aucun compteur de dette.** 86 jeux arrivent sans statut : c'est un état normal, pas une tâche. Aucune UI n'affiche « N jeux à qualifier », aucun badge rouge, aucune barre de complétion de la qualification. C'est l'arriéré de 47 cartes qui a tué l'outil précédent de l'utilisateur.
- **`game_progress` appartient à l'utilisateur.** Le front est le seul à y écrire. Ne jamais déduire ni écrire un statut automatiquement depuis les heures Steam — Steam peut suggérer, l'utilisateur déclare.
- **Front sans étape de build** : pas d'`import`/`export` ES modules dans `cockpit/**`, composants exposés sur `window.X`, React en globale.
- **Le site est servi sous `/jarvis-cockpit/`** : aucun chemin absolu partant de `/`.
- **`window.sb.patchJSON` / `deleteRequest` renvoient la `Response` brute et ne lèvent PAS sur 4xx/5xx**, contrairement à `postJSON`. Toute écriture passe par un helper qui teste `r.ok` et lève.
- Après modification de `cockpit/**` : bumper le `?v=` du fichier dans `index.html`, puis `node scripts/sync-sw.mjs`. Ne jamais éditer `STATIC[]` ou `CACHE` à la main.
- Tout nouvel `event_type` de télémétrie → entrée dans `docs/telemetry.md` **avant** le commit.
- Toute modif fonctionnelle d'onglet → MAJ `docs/specs/tab-gaming.md` + bump `last_updated` dans `docs/specs/index.json` (`lint-specs` bloquant).
- Tests node : scripts autonomes, helper `check(nom, obtenu, attendu)` comparant en `JSON.stringify`, `process.exit(failures ? 1 : 0)`. Modèle : `tests/test_mediatheque_view.mjs`.

## État des données au 2026-08-13 (mesuré)

| | |
|---|---|
| `game_titles` total | 451 |
| dont portant un `steam_appid` | 86 |
| `game_progress` | 8 (tous `wishlist`) |
| `game_franchises` surveillées | 24 |
| `game_releases` non acquittés | 7 |
| titres avec `time_to_beat_minutes` | 48 |
| jeux Steam joués sur 14 j | 1 |

## Structure des fichiers

| Fichier | Responsabilité |
|---|---|
| `cockpit/lib/games-view.js` (créé) | Logique pure : constitution de la bibliothèque, statuts, tri, recherche locale, rail « À venir », libellés. Zéro DOM, zéro React. |
| `tests/test_games_view.mjs` (créé) | Verrouille la logique ci-dessus sous node. |
| `cockpit/lib/data-loader.js` (modifié) | Charge les 4 tables `game_*` au Tier 2 de l'onglet. |
| `cockpit/panel-gaming.jsx` (modifié) | Rendu seul. Nouvelles sections bibliothèque / À venir / fiche jeu ; sections Steam conservées et reléguées. |
| `cockpit/styles-gaming.css` (modifié) | Styles `gm-lib-*`, `gm-up-*`, `gm-sheet-*`. |
| `supabase/functions/igdb-proxy/index.ts` (créé) | Proxy de recherche IGDB, secret côté serveur, JWT exigé. |
| `docs/specs/tab-gaming.md`, `docs/telemetry.md`, `docs/architecture/*` (modifiés) | Documentation. |

---

### Task 1 : `cockpit/lib/games-view.js` — la logique pure

C'est le socle : tout le reste n'est que rendu. La règle de constitution de la bibliothèque (86 et non 451) vit ici et nulle part ailleurs.

**Files:**
- Create: `cockpit/lib/games-view.js`
- Create: `tests/test_games_view.mjs`

**Interfaces:**
- Consumes: rien.
- Produces, sur `window.gamesView` et `module.exports` :
  - `buildLibrary(titles, progressRows, snapshotRows) -> card[]` où `card = {t, prog, minutes, minutes2w, status, franchiseId}`
  - `statusOf(card) -> "wishlist"|"playing"|"finished"|"dropped"|"unqualified"`
  - `ratingOf(card) -> number|null`
  - `STATUS_LABELS` — objet `{wishlist:"Envie", playing:"En cours", finished:"Fini", dropped:"Lâché", unqualified:"Non qualifié"}`
  - `sortLibrary(cards, mode) -> card[]` avec `mode` ∈ `"hours"|"name"|"rating"|"recent"`
  - `matchesQuery(card, q) -> boolean`
  - `filterByStatus(cards, statuses) -> card[]`
  - `buildUpcoming(releases, titlesById, franchisesById) -> item[]` où `item = {id, titleId, franchiseId, name, licence, when, precision, hypes, cover}`
  - `hoursLabel(minutes) -> string`
  - `ttbLabel(minutes) -> string|null`
  - `suggestPlaying(cards) -> card[]` — jeux joués sur 14 j et non encore déclarés, pour la bande de suggestion

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `tests/test_games_view.mjs` :

```js
// Tests du module de présentation Gaming (JS pur, sans DOM).
// Run: node tests/test_games_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "games-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── buildLibrary : la regle centrale du lot ──────────────────
// game_titles contient les jeux de l'utilisateur ET les titres freres
// decouverts dans les collections. Seuls les premiers sont sa bibliotheque.
const TITLES = [
  { id: "t1", igdb_id: 1, name: "Civilization VI", steam_appid: 289070, franchise_id: "f1", genres: ["Strategy"], time_to_beat_minutes: 3000 },
  { id: "t2", igdb_id: 2, name: "Civ VI: Babylon Pack", steam_appid: null, franchise_id: "f1", genres: ["Strategy"] },
  { id: "t3", igdb_id: 3, name: "Silksong", steam_appid: null, franchise_id: "f2", genres: ["Platform"] },
  { id: "t4", igdb_id: 4, name: "Mass Effect 2", steam_appid: 24980, franchise_id: "f3", genres: ["RPG"] },
];
const PROGRESS = [
  { title_id: "t3", status: "wishlist", rating: null, platform: null },
  { title_id: "t4", status: "finished", rating: 92, platform: "PC" },
];
const SNAP = [
  { appid: 289070, playtime_forever_minutes: 6733, playtime_2weeks_minutes: 0 },
  { appid: 24980, playtime_forever_minutes: 1427, playtime_2weeks_minutes: 120 },
  { appid: 999999, playtime_forever_minutes: 50, playtime_2weeks_minutes: 0 },
];

const lib = V.buildLibrary(TITLES, PROGRESS, SNAP);
check("bibliotheque = steam_appid OU progress, jamais les freres de collection",
      lib.map(c => c.t.id).sort(), ["t1", "t3", "t4"]);
check("le DLC sans appid ni progress est exclu",
      lib.some(c => c.t.id === "t2"), false);
check("les heures Steam sont jointes par appid",
      lib.find(c => c.t.id === "t1").minutes, 6733);
check("un titre sans appid n'a pas d'heures",
      lib.find(c => c.t.id === "t3").minutes, 0);
check("heures 14 jours jointes",
      lib.find(c => c.t.id === "t4").minutes2w, 120);
check("un appid Steam sans titre IGDB n'invente pas de carte",
      lib.some(c => c.minutes === 50), false);

// ── statusOf : declare par l'utilisateur, jamais deduit ──────
check("statut declare gagne", V.statusOf(lib.find(c => c.t.id === "t4")), "finished");
check("statut wishlist", V.statusOf(lib.find(c => c.t.id === "t3")), "wishlist");
// 6733 minutes de jeu ne suffisent PAS a declarer « fini » : Steam ne sait pas.
check("jeu joue mais non declare => non qualifie",
      V.statusOf(lib.find(c => c.t.id === "t1")), "unqualified");
check("libelle de statut", V.STATUS_LABELS.dropped, "Lâché");

// ── tri ──────────────────────────────────────────────────────
check("tri par heures decroissantes",
      V.sortLibrary(lib, "hours").map(c => c.t.id), ["t1", "t4", "t3"]);
check("tri par nom",
      V.sortLibrary(lib, "name").map(c => c.t.id), ["t1", "t4", "t3"]);
check("tri par note, non notes en dernier",
      V.sortLibrary(lib, "rating").map(c => c.t.id), ["t4", "t1", "t3"]);

// ── recherche locale ─────────────────────────────────────────
check("recherche insensible a la casse", V.matchesQuery(lib.find(c => c.t.id === "t1"), "civ"), true);
check("recherche insensible aux accents",
      V.matchesQuery({ t: { name: "Pokémon" }, prog: null }, "pokemon"), true);
check("recherche vide accepte tout", V.matchesQuery(lib[0], "   "), true);
check("recherche qui ne matche pas", V.matchesQuery(lib.find(c => c.t.id === "t1"), "zelda"), false);

// ── filtre par statut ────────────────────────────────────────
check("filtre sur un statut",
      V.filterByStatus(lib, ["finished"]).map(c => c.t.id), ["t4"]);
check("filtre vide = tout",
      V.filterByStatus(lib, []).length, 3);

// ── rail « A venir » ─────────────────────────────────────────
const RELEASES = [
  { id: "r1", title_id: "t3", franchise_id: "f2", title: "À venir : Silksong", event_date: "2026-09-04", acknowledged: false },
  { id: "r2", title_id: "t2", franchise_id: "f1", title: "À venir : Babylon", event_date: null, acknowledged: false },
  { id: "r3", title_id: "t1", franchise_id: "f1", title: "Sorti : Civ VI", event_date: "2016-10-21", acknowledged: true },
];
const BY_ID = Object.fromEntries(TITLES.map(t => [t.id, t]));
const FR = { f1: { id: "f1", name: "Civilization" }, f2: { id: "f2", name: "Hollow Knight" } };
const up = V.buildUpcoming(RELEASES, BY_ID, FR);
check("les evenements acquittes sortent du rail", up.map(i => i.id), ["r1", "r2"]);
check("les dates connues passent avant les inconnues", up[0].id, "r1");
check("le rail porte le nom de la licence", up[0].licence, "Hollow Knight");
check("le rail porte le nom du jeu, pas le libelle d'evenement", up[0].name, "Silksong");

// ── libelles ─────────────────────────────────────────────────
check("heures : moins d'une heure", V.hoursLabel(45), "45 min");
check("heures : arrondi", V.hoursLabel(6733), "112 h");
check("heures : zero", V.hoursLabel(0), "jamais lancé");
check("duree pour finir", V.ttbLabel(3000), "≈ 50 h pour finir");
check("duree inconnue", V.ttbLabel(null), null);

// ── suggestion « tu y as joué » ──────────────────────────────
// Steam suggere, l'utilisateur declare : on ne fait que proposer.
check("suggere un jeu joue recemment et non declare en cours",
      V.suggestPlaying(lib).map(c => c.t.id), ["t4"]);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
node tests/test_games_view.mjs
```

Attendu : `Cannot find module ... games-view.js`.

- [ ] **Step 3 : Écrire `cockpit/lib/games-view.js`**

```js
// cockpit/lib/games-view.js
// Logique de présentation pure de l'onglet Gaming : constitution de la
// bibliothèque, statuts déclarés, tri, recherche locale, rail « À venir ».
// Script classique compatible Babel standalone : expose window.gamesView.
// Guard module.exports => testable sous node (tests/test_games_view.mjs).
//
// CONTRAINTE : aucune dépendance au DOM, à React ou à window.GAMING_PERSO_DATA.
(function () {
  const STATUS_LABELS = {
    wishlist: "Envie",
    playing: "En cours",
    finished: "Fini",
    dropped: "Lâché",
    unqualified: "Non qualifié",
  };

  // `game_titles` porte DEUX populations : les jeux de l'utilisateur (un
  // steam_appid, ou une ligne game_progress qu'il a créée) et les titres
  // frères remontés des collections par le pipeline — 357 sur 451 au
  // 2026-08-13. Afficher les seconds rendrait l'onglet illisible.
  function buildLibrary(titles, progressRows, snapshotRows) {
    const progByTitle = new Map((progressRows || []).map((p) => [p.title_id, p]));
    const snapByAppid = new Map((snapshotRows || []).map((s) => [s.appid, s]));
    const out = [];
    for (const t of titles || []) {
      const prog = progByTitle.get(t.id) || null;
      if (t.steam_appid == null && !prog) continue;
      const snap = t.steam_appid != null ? snapByAppid.get(t.steam_appid) : null;
      out.push({
        t,
        prog,
        franchiseId: t.franchise_id,
        minutes: (snap && snap.playtime_forever_minutes) || 0,
        minutes2w: (snap && snap.playtime_2weeks_minutes) || 0,
      });
    }
    return out;
  }

  // Le statut est DECLARE, jamais deduit. 112 h sur un jeu ne disent pas
  // s'il est fini ou lâché — aucune API ne le sait, seul l'utilisateur.
  function statusOf(card) {
    return (card && card.prog && card.prog.status) || "unqualified";
  }

  function ratingOf(card) {
    return (card && card.prog && card.prog.rating != null) ? card.prog.rating : null;
  }

  function sortLibrary(cards, mode) {
    const list = (cards || []).slice();
    const byName = (a, b) => String(a.t.name || "").localeCompare(String(b.t.name || ""), "fr");
    if (mode === "name") return list.sort(byName);
    if (mode === "rating") {
      return list.sort((a, b) => {
        const ra = ratingOf(a), rb = ratingOf(b);
        if (ra == null && rb == null) return byName(a, b);
        if (ra == null) return 1;
        if (rb == null) return -1;
        return rb - ra;
      });
    }
    if (mode === "recent") return list.sort((a, b) => b.minutes2w - a.minutes2w || byName(a, b));
    return list.sort((a, b) => b.minutes - a.minutes || byName(a, b));
  }

  function normalize(s) {
    // ̀-ͯ = diacritiques combinants : « Pokémon » et « Pokemon »
    // doivent matcher. Notation echappee volontaire — les caracteres litteraux
    // ne survivent pas toujours a un copier-coller.
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function matchesQuery(card, q) {
    const n = normalize(q).trim();
    if (!n) return true;
    return normalize(card && card.t && card.t.name).includes(n);
  }

  function filterByStatus(cards, statuses) {
    if (!statuses || !statuses.length) return (cards || []).slice();
    const set = new Set(statuses);
    return (cards || []).filter((c) => set.has(statusOf(c)));
  }

  // Le rail affiche des JEUX, pas des libellés d'événement : « Silksong »
  // et non « À venir : Silksong ». Les acquittés en sortent.
  function buildUpcoming(releases, titlesById, franchisesById) {
    const items = [];
    for (const r of releases || []) {
      if (r.acknowledged) continue;
      const t = (titlesById || {})[r.title_id] || null;
      const f = (franchisesById || {})[r.franchise_id] || null;
      items.push({
        id: r.id,
        titleId: r.title_id,
        franchiseId: r.franchise_id,
        name: (t && t.name) || String(r.title || "").replace(/^[^:]+ : /, ""),
        licence: (f && f.name) || null,
        when: (t && t.release_human) || r.event_date || null,
        precision: (t && t.release_precision) || null,
        hypes: (t && t.hypes) || 0,
        cover: (t && t.cover_url) || null,
        sortKey: r.event_date || null,
      });
    }
    // Daté d'abord, du plus proche au plus lointain ; sans date ensuite,
    // le plus attendu en tête.
    return items.sort((a, b) => {
      if (a.sortKey && b.sortKey) return a.sortKey < b.sortKey ? -1 : (a.sortKey > b.sortKey ? 1 : 0);
      if (a.sortKey) return -1;
      if (b.sortKey) return 1;
      return b.hypes - a.hypes;
    });
  }

  function hoursLabel(minutes) {
    const m = minutes || 0;
    if (!m) return "jamais lancé";
    if (m < 60) return `${m} min`;
    return `${Math.round(m / 60)} h`;
  }

  function ttbLabel(minutes) {
    if (!minutes) return null;
    return `≈ ${Math.round(minutes / 60)} h pour finir`;
  }

  // Steam sait qu'un jeu a tourné ces 14 jours ; il ne sait pas ce que
  // l'utilisateur en pense. On propose, on n'écrit pas.
  function suggestPlaying(cards) {
    return (cards || []).filter((c) => c.minutes2w > 0 && statusOf(c) !== "playing");
  }

  const api = {
    STATUS_LABELS, buildLibrary, statusOf, ratingOf, sortLibrary,
    normalize, matchesQuery, filterByStatus, buildUpcoming,
    hoursLabel, ttbLabel, suggestPlaying,
  };
  if (typeof window !== "undefined") window.gamesView = Object.assign(window.gamesView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

```bash
node tests/test_games_view.mjs
```

Attendu : `Tous les tests passent`, code de sortie 0.

- [ ] **Step 5 : Commit**

```bash
git add cockpit/lib/games-view.js tests/test_games_view.mjs
git commit -m "feat(games): logique de presentation pure de l'onglet Gaming

buildLibrary porte la regle centrale du lot : la bibliotheque est faite des
titres portant un steam_appid ou une ligne game_progress, jamais des 357
titres freres remontes des collections par le pipeline.

statusOf ne deduit jamais un statut des heures Steam : 112 h ne disent pas
si un jeu est fini ou lache, seul l'utilisateur le sait."
```

---

### Task 2 : charger les tables `game_*` au Tier 2

**Files:**
- Modify: `cockpit/lib/data-loader.js` — bloc `T2` (~ligne 1320) et `case "gaming"` (~ligne 4700)

**Interfaces:**
- Consumes: rien.
- Produces: `window.GAMING_PERSO_DATA.games = {titles, franchises, progress, releases}` — quatre tableaux de lignes brutes, non transformées. La transformation vit dans `games-view.js`, appelée par le panel.

- [ ] **Step 1 : Ajouter les quatre accesseurs T2**

Dans `cockpit/lib/data-loader.js`, dans l'objet `T2`, juste après `async gaming_wishlist` s'il existe encore, sinon après `async tft_match_count` :

```js
    // Tracker jeux (lot 2). game_titles porte 451 lignes dont ~357 sont des
    // titres freres de collection : le filtrage en bibliotheque se fait dans
    // games-view.js::buildLibrary(), pas ici — le panel a besoin de TOUS les
    // titres pour resoudre les evenements du rail « A venir ».
    async game_titles(){
      return once("game_titles", () => q("game_titles", "select=*&limit=5000"));
    },
    async game_franchises(){
      return once("game_franchises", () => q("game_franchises", "select=*&limit=2000"));
    },
    async game_progress(){
      return once("game_progress", () => q("game_progress", "select=*&limit=2000"));
    },
    async game_releases(){
      const from = new Date(Date.now() - 180 * 86400000).toISOString();
      return once("game_releases", () =>
        q("game_releases", `detected_at=gte.${from}&order=detected_at.desc&limit=200`));
    },
```

- [ ] **Step 2 : Les charger dans `loadPanel("gaming")`**

Remplacer le corps du `case "gaming"` par :

```js
      case "gaming": {
        const [snapshot, stats, achievements, gameDetails, tftRank, tftMatchCount,
               gTitles, gFranchises, gProgress, gReleases] = await Promise.all([
          T2.steam_snapshot(),
          T2.steam_stats(),
          T2.steam_achievements(),
          T2.steam_game_details().catch(() => []),
          T2.tft_rank_latest().catch(() => []),
          T2.tft_match_count().catch(() => 0),
          T2.game_titles().catch(() => []),
          T2.game_franchises().catch(() => []),
          T2.game_progress().catch(() => []),
          T2.game_releases().catch(() => []),
        ]);
        const games = { titles: gTitles, franchises: gFranchises,
                        progress: gProgress, releases: gReleases };
        if (window.GAMING_PERSO_DATA) {
          // Le tracker s'affiche meme sans snapshot Steam : un utilisateur
          // qui ne joue que sur console a une bibliotheque valide.
          if ((snapshot || []).length) {
            const shape = transformGaming({ snapshot, stats, achievements, gameDetails, tftRank, tftMatchCount });
            replaceShape(window.GAMING_PERSO_DATA, shape);
          }
          window.GAMING_PERSO_DATA.games = games;
          window.GAMING_PERSO_DATA._raw = { snapshot, stats, achievements, gameDetails, tftRank, tftMatchCount };
        }
        return { snapshot, stats, achievements, gameDetails, tftRank, tftMatchCount, games };
      }
```

- [ ] **Step 3 : Vérifier le rang de la destructuration**

Compter les entrées du `Promise.all` et les noms destructurés : il doit y en avoir **10 des deux côtés**, dans le même ordre. Un décalage donnerait à chaque variable les données d'une autre, en silence.

```bash
cd ~/projects/jarvis-cockpit
sed -n '/case "gaming"/,/^      }/p' cockpit/lib/data-loader.js | head -20
```

Relire le bloc et confirmer l'alignement position par position.

- [ ] **Step 4 : Vérifier que le fichier compile**

```bash
node -e "require('./cockpit/lib/data-loader.js')" 2>&1 | head -3 || echo "(erreur attendue: window absent sous node — seule la syntaxe compte)"
node --check cockpit/lib/data-loader.js && echo "syntaxe ok"
```

Attendu : `syntaxe ok`.

- [ ] **Step 5 : Commit**

```bash
git add cockpit/lib/data-loader.js
git commit -m "feat(games): charge les 4 tables game_* au Tier 2 de l'onglet Gaming

Lignes brutes, sans transformation : le filtrage bibliotheque vit dans
games-view.js. Le panel a besoin de TOUS les titres pour resoudre les
evenements du rail « A venir » vers leur jeu."
```

---

### Task 3 : le rail « À venir »

La section qui justifie tout le lot : les suites annoncées des licences suivies. 7 items au 2026-08-13.

**Files:**
- Modify: `cockpit/panel-gaming.jsx` — nouveau composant + montage en tête de panel
- Modify: `cockpit/styles-gaming.css` — styles `gm-up-*`
- Modify: `index.html` — charger `games-view.js`, bumper `?v=` de `panel-gaming.jsx` et `styles-gaming.css`

**Interfaces:**
- Consumes: `window.gamesView.buildUpcoming`, `window.GAMING_PERSO_DATA.games`.
- Produces: composant `GmUpcoming` (fonction locale au fichier, comme ses voisins — les composants de ce panel ne sont pas exposés sur `window`).

- [ ] **Step 1 : Charger `games-view.js` dans la page**

Dans `index.html`, à côté de la ligne qui charge `cockpit/lib/mediatheque-view.js`, ajouter :

```html
<script src="cockpit/lib/games-view.js?v=1"></script>
```

Ce script doit être chargé **avant** `panel-gaming.jsx`.

- [ ] **Step 2 : Écrire le composant**

Dans `cockpit/panel-gaming.jsx`, après le composant `GmActivityChart` :

```jsx
// Rail « À venir » — les suites annoncées des licences suivies. C'est la
// raison d'être du tracker : le reste de l'onglet raconte le passé, cette
// section est la seule qui parle de ce qui arrive.
function GmUpcoming({ items, onAck, onUnwatch }) {
  if (!items.length) {
    return (
      <div className="gm-empty">
        Rien d'annoncé dans tes licences suivies pour l'instant. Le suivi tourne
        tous les matins ; un jeu apparaîtra ici dès qu'il sera annoncé.
      </div>
    );
  }
  return (
    <div className="gm-up-grid">
      {items.map((it) => (
        <article className="gm-up-card" key={it.id}>
          {it.cover
            ? <div className="gm-up-cover" style={{ backgroundImage: `url("${it.cover}")` }} />
            : <div className="gm-up-cover is-empty" />}
          <div className="gm-up-body">
            <div className="gm-up-name">{it.name}</div>
            {it.licence && <div className="gm-up-licence">{it.licence}</div>}
            <div className="gm-up-when">
              {it.when || "date inconnue"}
              {it.precision === "year" || it.precision === "quarter"
                ? <span className="gm-up-approx"> · approximatif</span> : null}
            </div>
            <div className="gm-up-actions">
              <button className="gm-up-btn" onClick={() => onAck(it)} title="J'ai vu">✓ vu</button>
              <button className="gm-up-btn is-dismiss" onClick={() => onUnwatch(it)}
                      title="Ne plus suivre cette licence">✕ licence</button>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
```

- [ ] **Step 3 : Brancher dans `PanelGaming`**

Dans `PanelGaming`, après les hooks existants, ajouter l'état et les écritures :

```jsx
  const G = (D && D.games) || { titles: [], franchises: [], progress: [], releases: [] };
  const [relLocal, setRelLocal] = React.useState(null);
  const releases = relLocal || G.releases;
  const titlesById = React.useMemo(
    () => Object.fromEntries((G.titles || []).map((t) => [t.id, t])), [G.titles]);
  const franchisesById = React.useMemo(
    () => Object.fromEntries((G.franchises || []).map((f) => [f.id, f])), [G.franchises]);
  const upcoming = React.useMemo(
    () => window.gamesView.buildUpcoming(releases, titlesById, franchisesById),
    [releases, titlesById, franchisesById]);

  // window.sb.patchJSON renvoie la Response BRUTE et ne leve pas sur 4xx/5xx
  // (cockpit/lib/supabase.js), contrairement a postJSON. Sans ce controle, un
  // refus RLS passerait pour un succes et la carte disparaitrait sans que
  // rien ne soit ecrit.
  async function gmPatch(path, body) {
    const r = await window.sb.patchJSON(window.SUPABASE_URL + path, body);
    if (!r.ok) throw new Error(String(r.status));
    return r;
  }

  async function ackRelease(it) {
    const before = releases;
    setRelLocal(before.map((r) => (r.id === it.id ? { ...r, acknowledged: true } : r)));
    window.track && window.track("games_release_ack", { surface: "gaming" });
    try {
      await gmPatch("/rest/v1/game_releases?id=eq." + it.id, { acknowledged: true });
    } catch (e) {
      setRelLocal(before);
      window.track && window.track("error_shown", { context: "games_ack", message: e.message });
    }
  }

  async function unwatchFranchise(it) {
    const before = releases;
    setRelLocal(before.map((r) => (r.franchise_id === it.franchiseId ? { ...r, acknowledged: true } : r)));
    window.track && window.track("games_unwatch_franchise", { surface: "gaming" });
    try {
      await gmPatch("/rest/v1/game_franchises?id=eq." + it.franchiseId, { watched: false });
      await gmPatch("/rest/v1/game_releases?franchise_id=eq." + it.franchiseId + "&acknowledged=eq.false",
                    { acknowledged: true });
    } catch (e) {
      setRelLocal(before);
      window.track && window.track("error_shown", { context: "games_unwatch", message: e.message });
    }
  }
```

Puis, dans le JSX, **juste après `.gm-profiles`** et avant la §1 :

```jsx
      {/* ══ À VENIR ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <h2 className="gm-section-title">À venir · <em>dans tes licences suivies</em></h2>
          <span className="gm-section-meta">{upcoming.length} annonce{upcoming.length > 1 ? "s" : ""}</span>
        </div>
        <GmUpcoming items={upcoming} onAck={ackRelease} onUnwatch={unwatchFranchise} />
      </section>
```

- [ ] **Step 4 : Ajouter les styles**

À la fin de `cockpit/styles-gaming.css` :

```css
/* ── Rail « À venir » (lot 2) ─────────────────────────────── */
.gm-up-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px;
}
.gm-up-card {
  display: flex;
  gap: 12px;
  border: 1px solid var(--bd);
  border-radius: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--brand) 4%, transparent);
}
.gm-up-cover {
  width: 64px;
  height: 86px;
  flex-shrink: 0;
  border-radius: 8px;
  background-size: cover;
  background-position: center;
  background-color: var(--bg2);
}
.gm-up-cover.is-empty { opacity: 0.5; }
.gm-up-body { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.gm-up-name { font-weight: 600; line-height: 1.25; }
.gm-up-licence { font-size: 12px; color: var(--tx2); }
.gm-up-when { font-size: 12px; color: var(--tx2); margin-top: 2px; }
.gm-up-approx { opacity: 0.7; }
.gm-up-actions { display: flex; gap: 6px; margin-top: auto; padding-top: 8px; }
.gm-up-btn {
  border: 1px solid var(--bd);
  background: transparent;
  color: inherit;
  border-radius: 8px;
  min-height: 44px;   /* cible tactile, meme regle que la passe mobile mediatheque */
  padding: 0 10px;
  cursor: pointer;
  font-size: 12px;
}
.gm-up-btn.is-dismiss { opacity: 0.7; }
@media (hover: hover) {
  .gm-up-btn:hover { background: var(--bg2); }
}
```

- [ ] **Step 5 : Bumper les versions et resynchroniser le service worker**

Dans `index.html` : `panel-gaming.jsx?v=8` → `?v=9`, `styles-gaming.css?v=8` → `?v=9`.

```bash
node scripts/sync-sw.mjs
node tests/test_sw_static.mjs
```

Attendu : 8/8 assertions passent.

- [ ] **Step 6 : Vérifier en prod**

```bash
git add -A && git commit -m "feat(games): rail « À venir » dans l'onglet Gaming" && git push
```

Ouvrir `https://ph3nixx.github.io/jarvis-cockpit/#gaming` avec un hard-refresh (Ctrl+Shift+R). Attendu : la section « À venir » affiche **7 cartes** — Marvel's Wolverine, Trails in the Sky 2nd Chapter, God of War Laufey, Hollow Knight: Silksong — Sea of Sorrow, Stellar Blade: Blood Rain, Black Myth: Zhong Kui, Mass Effect. Les datées d'abord.

Cliquer `✓ vu` sur une carte : elle disparaît. Vérifier l'écriture :

```sql
select title, acknowledged from game_releases order by detected_at desc limit 8;
```

Attendu : la ligne cliquée porte `acknowledged = true`. La remettre à `false` après le test pour ne pas consommer une annonce réelle :

```sql
update game_releases set acknowledged = false where acknowledged = true;
```

---

### Task 4 : la bibliothèque à statuts

Remplace §2 Backlog, §2bis Abandonnés et §6 Top all-time par une seule section.

**Files:**
- Modify: `cockpit/panel-gaming.jsx` — suppression des §2, §2bis, §6 ; nouveau composant `GmLibrary`
- Modify: `cockpit/styles-gaming.css` — styles `gm-lib-*`

**Interfaces:**
- Consumes: `window.gamesView.{buildLibrary,statusOf,STATUS_LABELS,sortLibrary,matchesQuery,filterByStatus,hoursLabel,ttbLabel}`.
- Produces: composant `GmLibrary({cards, onOpen})`, et l'état `libQuery` / `libStatuses` / `libSort` dans `PanelGaming`.

- [ ] **Step 1 : Écrire le composant**

Dans `cockpit/panel-gaming.jsx` :

```jsx
const GM_STATUS_ORDER = ["playing", "wishlist", "finished", "dropped", "unqualified"];

// La bibliotheque n'affiche JAMAIS de compteur de « jeux a qualifier » :
// 86 jeux sans statut est un etat normal, pas une dette. Un arriere affiche
// produit culpabilite puis evitement — c'est ce qui a tue l'outil precedent.
function GmLibrary({ cards, onOpen }) {
  const V = window.gamesView;
  if (!cards.length) {
    return <div className="gm-empty">Aucun jeu ne correspond à ce filtre.</div>;
  }
  return (
    <div className="gm-lib-grid">
      {cards.map((c) => {
        const st = V.statusOf(c);
        const rating = V.ratingOf(c);
        return (
          <button className={`gm-lib-card is-${st}`} key={c.t.id} onClick={() => onOpen(c)}>
            {c.t.cover_url
              ? <div className="gm-lib-cover" style={{ backgroundImage: `url("${c.t.cover_url}")` }} />
              : <div className="gm-lib-cover is-empty" />}
            <div className="gm-lib-body">
              <div className="gm-lib-name">{c.t.name}</div>
              <div className="gm-lib-meta">
                <span className={`gm-lib-chip is-${st}`}>{V.STATUS_LABELS[st]}</span>
                <span className="gm-lib-hours">{V.hoursLabel(c.minutes)}</span>
                {rating != null && <span className="gm-lib-rating">{rating}</span>}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2 : Brancher dans `PanelGaming`**

Ajouter les états et le calcul :

```jsx
  const [libQuery, setLibQuery] = React.useState("");
  const [libStatuses, setLibStatuses] = React.useState([]);
  const [libSort, setLibSort] = React.useState("hours");
  const [progLocal, setProgLocal] = React.useState(null);
  const progressRows = progLocal || G.progress;

  const library = React.useMemo(
    () => window.gamesView.buildLibrary(G.titles, progressRows, (D && D._raw && D._raw.snapshot) || []),
    [G.titles, progressRows, D]);
  const libraryView = React.useMemo(() => {
    const V = window.gamesView;
    return V.sortLibrary(
      V.filterByStatus(library, libStatuses).filter((c) => V.matchesQuery(c, libQuery)),
      libSort);
  }, [library, libStatuses, libQuery, libSort]);

  function toggleStatus(s) {
    setLibStatuses((cur) => cur.includes(s) ? cur.filter((x) => x !== s) : cur.concat([s]));
  }
```

Puis remplacer intégralement les blocs `{/* ══ §2 BACKLOG ══ */}`, `{/* ══ §2bis JEUX ABANDONNÉS ══ */}` et `{/* ══ §6 TOP ALL-TIME ══ */}` par cette unique section, placée juste après « À venir » :

```jsx
      {/* ══ MA BIBLIOTHÈQUE ══ */}
      <section className="gm-section">
        <div className="gm-section-head">
          <h2 className="gm-section-title">Ma bibliothèque</h2>
          <span className="gm-section-meta">{libraryView.length} jeu{libraryView.length > 1 ? "x" : ""}</span>
        </div>
        <div className="gm-lib-toolbar">
          <input className="gm-lib-search" type="search" placeholder="Chercher un jeu…"
                 value={libQuery} onChange={(e) => setLibQuery(e.target.value)} />
          <div className="gm-lib-chips">
            {GM_STATUS_ORDER.map((s) => (
              <button key={s}
                      className={`gm-lib-filter ${libStatuses.includes(s) ? "is-on" : ""}`}
                      onClick={() => toggleStatus(s)}>
                {window.gamesView.STATUS_LABELS[s]}
              </button>
            ))}
          </div>
          <select className="gm-lib-sort" value={libSort} onChange={(e) => setLibSort(e.target.value)}>
            <option value="hours">Heures jouées</option>
            <option value="recent">Joué récemment</option>
            <option value="name">Nom</option>
            <option value="rating">Ma note</option>
          </select>
        </div>
        <GmLibrary cards={libraryView} onOpen={setSheetCard} />
      </section>
```

Ajouter l'état de la fiche, consommé à la tâche suivante :

```jsx
  const [sheetCard, setSheetCard] = React.useState(null);
```

- [ ] **Step 3 : Ajouter les styles**

À la fin de `cockpit/styles-gaming.css` :

```css
/* ── Bibliothèque à statuts (lot 2) ───────────────────────── */
.gm-lib-toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
.gm-lib-search {
  flex: 1 1 220px;
  min-height: 44px;
  padding: 0 12px;
  font-size: 16px;   /* 16px minimum : en dessous, Safari iOS zoome au focus */
  border: 1px solid var(--bd);
  border-radius: 10px;
  background: var(--bg2);
  color: var(--tx);
}
.gm-lib-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.gm-lib-filter {
  border: 1px solid var(--bd); background: transparent; color: var(--tx2);
  border-radius: 999px; min-height: 44px; padding: 0 12px; cursor: pointer; font-size: 12px;
}
.gm-lib-filter.is-on { color: var(--tx); background: color-mix(in srgb, var(--brand) 14%, transparent); }
.gm-lib-sort {
  min-height: 44px; padding: 0 10px; border: 1px solid var(--bd);
  border-radius: 10px; background: var(--bg2); color: var(--tx); font-size: 14px;
}
.gm-lib-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 12px; }
.gm-lib-card {
  display: flex; gap: 10px; text-align: left; cursor: pointer;
  border: 1px solid var(--bd); border-radius: 12px; padding: 8px;
  background: transparent; color: inherit; font: inherit;
}
.gm-lib-cover {
  width: 52px; height: 70px; flex-shrink: 0; border-radius: 6px;
  background-size: cover; background-position: center; background-color: var(--bg2);
}
.gm-lib-cover.is-empty { opacity: 0.5; }
.gm-lib-body { min-width: 0; }
.gm-lib-name {
  font-weight: 600; font-size: 13px; line-height: 1.3;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.gm-lib-meta { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 6px; }
.gm-lib-chip { font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color: var(--tx2); }
.gm-lib-chip.is-playing { color: var(--brand); }
.gm-lib-hours, .gm-lib-rating { font-size: 11px; color: var(--tx2); }
@media (hover: hover) {
  .gm-lib-card:hover { background: var(--bg2); }
}
```

- [ ] **Step 4 : Vérifier qu'aucune référence aux sections supprimées ne subsiste**

```bash
cd ~/projects/jarvis-cockpit
grep -n "gm-bl-\|gm-abandoned\|gm-top-row\|D\.backlog\|D\.abandoned\|D\.top_alltime" cockpit/panel-gaming.jsx || echo "(aucune)"
```

Attendu : `(aucune)`. Les règles CSS correspondantes peuvent rester, elles seront nettoyées à la Task 8.

- [ ] **Step 5 : Commit**

```bash
node scripts/sync-sw.mjs
git add -A
git commit -m "feat(games): bibliotheque a statuts, remplace backlog/abandonnes/top

Une seule section a la place de trois. Aucun compteur de « jeux a
qualifier » : 86 jeux sans statut est un etat normal, pas une dette."
```

---

### Task 5 : la fiche jeu

Le seul endroit où l'utilisateur écrit. Sans elle, la bibliothèque est en lecture seule et le lot ne sert à rien.

**Files:**
- Modify: `cockpit/panel-gaming.jsx` — composant `GmSheet` + handlers d'écriture
- Modify: `cockpit/styles-gaming.css` — styles `gm-sheet-*`
- Modify: `docs/telemetry.md`

**Interfaces:**
- Consumes: `sheetCard` (Task 4), `gmPatch` (Task 3), `window.sb.postJSON`.
- Produces: `GmSheet({card, franchise, onClose, onWrite})` ; handlers `setStatus(card, status)`, `setRating(card, rating)`, `setPlatform(card, platform)`, `toggleWatch(franchiseId, watched)`.

- [ ] **Step 1 : Écrire les handlers d'écriture**

Dans `PanelGaming` :

```jsx
  const PLATFORMS = ["PC", "PlayStation", "Xbox", "Switch", "Autre"];

  // game_progress appartient a l'utilisateur : le front est le seul a y
  // ecrire. Upsert manuel — une ligne peut ne pas exister encore (86 jeux
  // seedes par le pipeline n'en ont aucune).
  async function writeProgress(card, patch) {
    const before = progressRows;
    const existing = before.find((p) => p.title_id === card.t.id);
    const next = existing
      ? before.map((p) => (p.title_id === card.t.id ? { ...p, ...patch } : p))
      : before.concat([{ title_id: card.t.id, status: "unqualified", ...patch }]);
    setProgLocal(next);
    try {
      if (existing) {
        await gmPatch("/rest/v1/game_progress?title_id=eq." + card.t.id,
                      { ...patch, updated_at: new Date().toISOString() });
      } else {
        await window.sb.postJSON(window.SUPABASE_URL + "/rest/v1/game_progress",
                                 { title_id: card.t.id, ...patch });
      }
    } catch (e) {
      setProgLocal(before);
      window.track && window.track("error_shown", { context: "games_progress", message: e.message });
    }
  }

  async function toggleWatch(franchiseId, watched) {
    window.track && window.track("games_watch_toggle", { watched });
    try {
      await gmPatch("/rest/v1/game_franchises?id=eq." + franchiseId, { watched });
    } catch (e) {
      window.track && window.track("error_shown", { context: "games_watch", message: e.message });
    }
  }
```

Note : `status` est `NOT NULL` avec une contrainte `CHECK` sur quatre valeurs — `unqualified` n'en fait pas partie. Un `POST` sans statut réel échouerait. Le premier geste de l'utilisateur sur un jeu non qualifié est donc toujours de poser un statut : `writeProgress(card, {status: "playing"})` crée la ligne. Les écritures de note ou de plateforme sur un jeu sans ligne ne peuvent pas survenir, l'UI ne les propose qu'après un statut (Step 2).

- [ ] **Step 2 : Écrire le composant fiche**

```jsx
// Fiche jeu — le seul endroit où l'utilisateur écrit. Quatre statuts en un
// tap ; la note et la plateforme n'apparaissent qu'une fois un statut posé,
// parce que `game_progress.status` est NOT NULL et contraint à ces quatre
// valeurs : il n'existe pas de ligne « sans statut ».
function GmSheet({ card, franchise, onClose, onStatus, onRating, onPlatform, onWatch, platforms }) {
  const V = window.gamesView;
  if (!card) return null;
  const st = V.statusOf(card);
  const rating = V.ratingOf(card);
  const ttb = V.ttbLabel(card.t.time_to_beat_minutes);
  return (
    <div className="gm-sheet-backdrop" onClick={onClose}>
      <div className="gm-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={card.t.name}>
        <button className="gm-sheet-close" onClick={onClose} aria-label="Fermer">✕</button>
        <div className="gm-sheet-head">
          {card.t.cover_url && <div className="gm-sheet-cover" style={{ backgroundImage: `url("${card.t.cover_url}")` }} />}
          <div>
            <h3 className="gm-sheet-title">{card.t.name}</h3>
            {franchise && <div className="gm-sheet-licence">{franchise.name}</div>}
            <div className="gm-sheet-facts">
              <span>{V.hoursLabel(card.minutes)}</span>
              {ttb && <span> · {ttb}</span>}
              {card.t.release_human && <span> · {card.t.release_human}</span>}
            </div>
            {(card.t.genres || []).length > 0 &&
              <div className="gm-sheet-genres">{card.t.genres.join(" · ")}</div>}
          </div>
        </div>

        <div className="gm-sheet-block">
          <div className="gm-sheet-label">Où j'en suis</div>
          <div className="gm-sheet-row">
            {["wishlist", "playing", "finished", "dropped"].map((s) => (
              <button key={s} className={`gm-sheet-btn ${st === s ? "is-on" : ""}`}
                      onClick={() => onStatus(card, s)}>
                {V.STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {st !== "unqualified" && (
          <>
            <div className="gm-sheet-block">
              <div className="gm-sheet-label">Ma note</div>
              <input className="gm-sheet-rating" type="number" min="0" max="100"
                     placeholder="0–100" defaultValue={rating == null ? "" : rating}
                     onBlur={(e) => {
                       const v = e.target.value.trim();
                       onRating(card, v === "" ? null : Math.max(0, Math.min(100, Number(v))));
                     }} />
            </div>
            <div className="gm-sheet-block">
              <div className="gm-sheet-label">Sur quelle plateforme</div>
              <div className="gm-sheet-row">
                {platforms.map((p) => (
                  <button key={p}
                          className={`gm-sheet-btn ${card.prog && card.prog.platform === p ? "is-on" : ""}`}
                          onClick={() => onPlatform(card, p)}>{p}</button>
                ))}
              </div>
            </div>
          </>
        )}

        {franchise && (
          <div className="gm-sheet-block">
            <label className="gm-sheet-watch">
              <input type="checkbox" defaultChecked={!!franchise.watched}
                     onChange={(e) => onWatch(franchise.id, e.target.checked)} />
              M'avertir des prochaines sorties de <strong>{franchise.name}</strong>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
```

Monter la fiche à la fin du JSX de `PanelGaming`, avant la balise fermante :

```jsx
      <GmSheet card={sheetCard}
               franchise={sheetCard ? franchisesById[sheetCard.franchiseId] : null}
               platforms={PLATFORMS}
               onClose={() => setSheetCard(null)}
               onStatus={(c, s) => { window.track && window.track("games_status_set", { status: s }); writeProgress(c, { status: s }); }}
               onRating={(c, r) => { window.track && window.track("games_rate", {}); writeProgress(c, { rating: r }); }}
               onPlatform={(c, p) => writeProgress(c, { platform: p })}
               onWatch={toggleWatch} />
```

- [ ] **Step 3 : Ajouter les styles**

```css
/* ── Fiche jeu (lot 2) ────────────────────────────────────── */
.gm-sheet-backdrop {
  position: fixed; inset: 0; z-index: 60;
  background: rgba(0, 0, 0, .45);
  display: flex; align-items: center; justify-content: center; padding: 16px;
}
.gm-sheet {
  position: relative; width: min(560px, 100%); max-height: 90vh; overflow: auto;
  background: var(--bg); border: 1px solid var(--bd); border-radius: 14px; padding: 20px;
}
.gm-sheet-close {
  position: absolute; top: 10px; right: 10px;
  min-width: 44px; min-height: 44px;
  border: 1px solid var(--bd); border-radius: 10px;
  background: transparent; color: inherit; cursor: pointer;
}
.gm-sheet-head { display: flex; gap: 14px; margin-bottom: 18px; padding-right: 44px; }
.gm-sheet-cover {
  width: 86px; height: 115px; flex-shrink: 0; border-radius: 8px;
  background-size: cover; background-position: center; background-color: var(--bg2);
}
.gm-sheet-title { margin: 0 0 4px; font-size: 18px; }
.gm-sheet-licence { font-size: 13px; color: var(--tx2); }
.gm-sheet-facts, .gm-sheet-genres { font-size: 12px; color: var(--tx2); margin-top: 6px; }
.gm-sheet-block { margin-bottom: 16px; }
.gm-sheet-label { font-size: 11px; text-transform: uppercase; letter-spacing: .05em; color: var(--tx2); margin-bottom: 8px; }
.gm-sheet-row { display: flex; flex-wrap: wrap; gap: 8px; }
.gm-sheet-btn {
  border: 1px solid var(--bd); background: transparent; color: var(--tx2);
  border-radius: 10px; min-height: 44px; padding: 0 14px; cursor: pointer; font-size: 13px;
}
.gm-sheet-btn.is-on {
  color: var(--tx); border-color: var(--brand);
  background: color-mix(in srgb, var(--brand) 14%, transparent);
}
.gm-sheet-rating {
  min-height: 44px; width: 120px; padding: 0 12px; font-size: 16px;
  border: 1px solid var(--bd); border-radius: 10px; background: var(--bg2); color: var(--tx);
}
.gm-sheet-watch { display: flex; gap: 10px; align-items: center; font-size: 13px; cursor: pointer; }
@media (hover: hover) {
  .gm-sheet-btn:hover { background: var(--bg2); }
}
@media (max-width: 760px) {
  .gm-sheet-backdrop { padding: 0; align-items: stretch; }
  .gm-sheet { width: 100%; max-height: 100vh; border-radius: 0; }
}
```

- [ ] **Step 4 : Documenter la télémétrie**

Dans `docs/telemetry.md`, ajouter, dans la section de l'onglet Gaming :

- `games_status_set` `{status}` — l'utilisateur pose ou change le statut d'un jeu
- `games_rate` `{}` — l'utilisateur note un jeu
- `games_watch_toggle` `{watched}` — l'utilisateur active ou coupe le suivi d'une licence

Préciser que `games_status_set` est la **sonde de survie du lot 2** : trois semaines sans un seul, après la phase de qualification initiale, signifient que la bibliothèque n'a pas trouvé son usage.

- [ ] **Step 5 : Vérifier en prod**

```bash
node scripts/sync-sw.mjs
git add -A && git commit -m "feat(games): fiche jeu — 4 statuts, note, plateforme, suivi de licence" && git push
```

Hard-refresh sur `#gaming`, ouvrir un jeu, poser le statut « En cours ». Vérifier :

```sql
select t.name, p.status, p.rating, p.platform from game_progress p
join game_titles t on t.id = p.title_id order by p.updated_at desc limit 5;
```

Attendu : la ligne existe avec le bon statut. Poser une note, rouvrir la fiche : la note doit être là.

---

### Task 6 : Edge Function `igdb-proxy`

IGDB refuse les requêtes navigateur ; sans ce proxy, aucun jeu console ne peut être ajouté.

**Files:**
- Create: `supabase/functions/igdb-proxy/index.ts`
- Modify: `docs/secrets.md`

**Interfaces:**
- Consumes: secrets Supabase `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`.
- Produces: `GET {SUPABASE_URL}/functions/v1/igdb-proxy?q=<terme>` → `[{id, name, cover_url, release_human, first_release_date, collection_id, collection_name, genres, platforms}]`, JWT obligatoire.

- [ ] **Step 1 : Écrire la fonction**

`supabase/functions/igdb-proxy/index.ts` :

```ts
// Proxy de recherche IGDB pour l'onglet Gaming.
// IGDB refuse les requetes navigateur (CORS) et exige un client secret :
// la recherche front ne peut donc pas l'appeler directement.
//
// Ce fichier NE reproduit PAS le pattern de l'ancienne jsearch-proxy,
// supprimee le 2026-08-13 : elle portait sa cle en dur et tournait sans
// verification de JWT, donc appelable par quiconque devinait son slug.
// Ici : secret via Deno.env, verify_jwt a true, CORS borne a l'origine Pages.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ORIGIN = "https://ph3nixx.github.io";
const CORS = {
  "Access-Control-Allow-Origin": ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Le token applicatif Twitch vit ~60 jours : le redemander a chaque requete
// brulerait du quota pour rien. Cache en memoire, renouvele a l'expiration.
let cached: { token: string; expires: number } | null = null;

async function getToken(id: string, secret: string): Promise<string> {
  const now = Date.now();
  if (cached && cached.expires > now + 60_000) return cached.token;
  const u = new URL("https://id.twitch.tv/oauth2/token");
  u.searchParams.set("client_id", id);
  u.searchParams.set("client_secret", secret);
  u.searchParams.set("grant_type", "client_credentials");
  const r = await fetch(u, { method: "POST" });
  if (!r.ok) throw new Error(`twitch ${r.status}`);
  const j = await r.json();
  cached = { token: j.access_token, expires: now + (j.expires_in ?? 3600) * 1000 };
  return cached.token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });

  const id = Deno.env.get("TWITCH_CLIENT_ID");
  const secret = Deno.env.get("TWITCH_CLIENT_SECRET");
  if (!id || !secret) {
    return new Response(JSON.stringify({ error: "secrets absents" }),
      { status: 500, headers: { ...CORS, "Content-Type": "application/json" } });
  }

  const q = (new URL(req.url).searchParams.get("q") || "").trim();
  if (q.length < 2) {
    return new Response(JSON.stringify([]),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  }

  try {
    const token = await getToken(id, secret);
    const body = `search "${q.replace(/"/g, "")}"; ` +
      `fields id,name,first_release_date,cover.image_id,collections,genres.name,platforms.name,` +
      `release_dates.human,release_dates.date; limit 12;`;
    const r = await fetch("https://api.igdb.com/v4/games", {
      method: "POST",
      headers: { "Client-ID": id, Authorization: `Bearer ${token}` },
      body,
    });
    if (!r.ok) throw new Error(`igdb ${r.status}`);
    const games = await r.json();

    const collIds = [...new Set(games.flatMap((g: any) => g.collections ?? []))];
    let names: Record<number, string> = {};
    if (collIds.length) {
      const cr = await fetch("https://api.igdb.com/v4/collections", {
        method: "POST",
        headers: { "Client-ID": id, Authorization: `Bearer ${token}` },
        body: `fields id,name; where id = (${collIds.join(",")}); limit 50;`,
      });
      if (cr.ok) for (const c of await cr.json()) names[c.id] = c.name;
    }

    const out = games.map((g: any) => {
      const coll = (g.collections ?? [])[0] ?? null;
      const rd = (g.release_dates ?? []).slice().sort(
        (a: any, b: any) => (a.date ?? 0) - (b.date ?? 0))[0];
      return {
        id: g.id,
        name: g.name,
        cover_url: g.cover?.image_id
          ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
          : null,
        release_human: rd?.human ?? null,
        first_release_date: g.first_release_date
          ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : null,
        collection_id: coll,
        collection_name: coll ? (names[coll] ?? null) : null,
        genres: (g.genres ?? []).map((x: any) => x.name),
        platforms: (g.platforms ?? []).map((x: any) => x.name),
      };
    });
    return new Response(JSON.stringify(out),
      { headers: { ...CORS, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } });
  }
});
```

- [ ] **Step 2 : Poser les secrets côté Supabase**

Les secrets GitHub Actions ne sont **pas** visibles par une Edge Function : il faut les poser séparément.

```bash
supabase secrets set TWITCH_CLIENT_ID=<id> TWITCH_CLIENT_SECRET=<secret> --project-ref mrmgptqpflzyavdfqwwv
supabase secrets list --project-ref mrmgptqpflzyavdfqwwv | grep -i twitch
```

Attendu : les deux apparaissent.

- [ ] **Step 3 : Déployer**

Via le MCP Supabase, outil `deploy_edge_function`, `project_id = mrmgptqpflzyavdfqwwv`, `name = "igdb-proxy"`, `entrypoint_path = "index.ts"`, **`verify_jwt = true`**, `files = [{name: "index.ts", content: <contenu du fichier>}]`.

- [ ] **Step 4 : Vérifier que l'authentification est bien exigée**

```bash
curl -s -o /dev/null -w "sans JWT: %{http_code}\n" \
  "https://mrmgptqpflzyavdfqwwv.supabase.co/functions/v1/igdb-proxy?q=zelda"
```

Attendu : `401`. Un `200` signifierait que `verify_jwt` est resté à `false` — c'est exactement le défaut qui a fait supprimer `jsearch-proxy`, ne pas le reproduire.

- [ ] **Step 5 : Documenter**

Dans `docs/secrets.md`, sous la section Twitch/IGDB, ajouter que les deux secrets vivent désormais à **deux** endroits — GitHub Actions pour le pipeline, secrets Supabase pour l'Edge Function — et que la rotation doit se faire aux deux.

- [ ] **Step 6 : Commit**

```bash
git add supabase/functions/igdb-proxy/index.ts docs/secrets.md
git commit -m "feat(games): Edge Function igdb-proxy pour la recherche front

Secret via Deno.env, verify_jwt a true, CORS borne a l'origine Pages —
exactement ce que jsearch-proxy ne faisait pas."
```

---

### Task 7 : ajouter un jeu console

**Files:**
- Modify: `cockpit/panel-gaming.jsx` — composant `GmAddGame`
- Modify: `cockpit/styles-gaming.css`

**Interfaces:**
- Consumes: l'Edge Function de la Task 6, `window.sb.postJSON`, `window.sb.headers`.
- Produces: composant `GmAddGame({onAdded})`.

- [ ] **Step 1 : Écrire le client et le composant**

```jsx
// Recherche IGDB via l'Edge Function : le navigateur ne peut pas appeler
// IGDB directement (CORS + client secret). Le JWT de la session part dans
// l'en-tete, la fonction est deployee en verify_jwt.
async function gmSearchIgdb(q) {
  const r = await fetch(
    window.SUPABASE_URL + "/functions/v1/igdb-proxy?q=" + encodeURIComponent(q),
    { headers: window.sb.headers });
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

function GmAddGame({ onAdded }) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [rows, setRows] = React.useState([]);
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState(null);

  async function run(e) {
    e.preventDefault();
    if (q.trim().length < 2) return;
    setBusy(true); setErr(null);
    try {
      setRows(await gmSearchIgdb(q.trim()));
      window.track && window.track("games_search", {});
    } catch (ex) {
      setErr("La recherche n'a pas répondu. Réessaie.");
      window.track && window.track("error_shown", { context: "games_search", message: ex.message });
    } finally { setBusy(false); }
  }

  if (!open) {
    return <button className="gm-add-open" onClick={() => setOpen(true)}>+ Ajouter un jeu console</button>;
  }
  return (
    <div className="gm-add">
      <form className="gm-add-form" onSubmit={run}>
        <input className="gm-lib-search" type="search" autoFocus placeholder="Titre du jeu…"
               value={q} onChange={(e) => setQ(e.target.value)} />
        <button className="gm-sheet-btn" type="submit" disabled={busy}>{busy ? "…" : "Chercher"}</button>
        <button className="gm-sheet-btn" type="button" onClick={() => { setOpen(false); setRows([]); }}>Fermer</button>
      </form>
      {err && <div className="gm-empty">{err}</div>}
      <div className="gm-add-rows">
        {rows.map((g) => (
          <div className="gm-add-row" key={g.id}>
            {g.cover_url && <div className="gm-lib-cover" style={{ backgroundImage: `url("${g.cover_url}")` }} />}
            <div className="gm-add-body">
              <div className="gm-lib-name">{g.name}</div>
              <div className="gm-lib-hours">
                {g.release_human || "date inconnue"}
                {g.collection_name ? ` · ${g.collection_name}` : ""}
              </div>
            </div>
            <button className="gm-sheet-btn" onClick={() => onAdded(g)}>Ajouter</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2 : Écrire l'ajout en base**

Dans `PanelGaming` :

```jsx
  // Un jeu console ajoute a la main : on cree sa franchise si sa collection
  // IGDB est inconnue, puis son titre, puis son statut. bootstrapped_at
  // reste NULL — seule la phase B du pipeline, qui parcourt reellement la
  // collection, a le droit de le poser.
  async function addConsoleGame(g) {
    try {
      let fr = (G.franchises || []).find(
        (f) => g.collection_id != null && f.igdb_collection_id === g.collection_id);
      if (!fr) {
        const created = await window.sb.postJSON(
          window.SUPABASE_URL + "/rest/v1/game_franchises",
          { igdb_collection_id: g.collection_id, name: g.collection_name || g.name, watched: true });
        fr = created[0];
      }
      const t = await window.sb.postJSON(
        window.SUPABASE_URL + "/rest/v1/game_titles",
        { franchise_id: fr.id, igdb_id: g.id, name: g.name, cover_url: g.cover_url,
          genres: g.genres, platforms: g.platforms,
          first_release_date: g.first_release_date, release_human: g.release_human });
      await window.sb.postJSON(window.SUPABASE_URL + "/rest/v1/game_progress",
                               { title_id: t[0].id, status: "wishlist" });
      window.track && window.track("games_add", { igdb_id: g.id });
      window.cockpitDataLoader.invalidateCache && window.cockpitDataLoader.invalidateCache();
      window.location.reload();
    } catch (e) {
      window.track && window.track("error_shown", { context: "games_add", message: e.message });
    }
  }
```

Monter le composant dans la toolbar de la bibliothèque, après le `<select>` de tri :

```jsx
          <GmAddGame onAdded={addConsoleGame} />
```

- [ ] **Step 3 : Ajouter les styles**

```css
/* ── Ajout d'un jeu console (lot 2) ───────────────────────── */
.gm-add-open {
  border: 1px dashed var(--bd); background: transparent; color: var(--tx2);
  border-radius: 10px; min-height: 44px; padding: 0 14px; cursor: pointer; font-size: 13px;
}
.gm-add { flex: 1 1 100%; }
.gm-add-form { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
.gm-add-rows { display: flex; flex-direction: column; gap: 8px; }
.gm-add-row {
  display: flex; gap: 10px; align-items: center;
  border: 1px solid var(--bd); border-radius: 10px; padding: 8px;
}
.gm-add-body { flex: 1; min-width: 0; }
```

- [ ] **Step 4 : Documenter la télémétrie**

Dans `docs/telemetry.md` : `games_search` `{}` et `games_add` `{igdb_id}`.

- [ ] **Step 5 : Vérifier en prod**

```bash
node scripts/sync-sw.mjs
git add -A && git commit -m "feat(games): recherche IGDB et ajout d'un jeu console" && git push
```

Hard-refresh, cliquer « + Ajouter un jeu console », chercher un jeu que tu possèdes sur console. Vérifier :

```sql
select t.name, t.igdb_id, p.status, f.name as licence
from game_titles t
join game_progress p on p.title_id = t.id
join game_franchises f on f.id = t.franchise_id
where t.steam_appid is null order by t.created_at desc limit 3;
```

Attendu : le jeu ajouté apparaît avec `status = 'wishlist'` et sa licence.

---

### Task 8 : reléguer les sections Steam et nettoyer

**Files:**
- Modify: `cockpit/panel-gaming.jsx` — ordre des sections, suppression de `GmHeatmap`
- Modify: `cockpit/data-gaming-perso.js` — purge des données de démonstration
- Modify: `cockpit/styles-gaming.css` — suppression des règles orphelines

- [ ] **Step 1 : Réordonner**

L'ordre final des sections doit être : profils plateformes → **À venir** → **Ma bibliothèque** → §1 En cours → §3 Activité → §4 Genres → §7 Achievements → §8 Milestones. Déplacer les blocs JSX en conséquence, sans en modifier le contenu.

- [ ] **Step 2 : Supprimer le composant mort `GmHeatmap`**

`transformGaming` ne renvoie aucune clé `heatmap` — le composant `GmHeatmap` (`cockpit/panel-gaming.jsx:78`) n'est jamais rendu. Le supprimer intégralement, ainsi que ses règles CSS `.mz-*` si elles subsistent.

```bash
grep -n "GmHeatmap\|mz-" cockpit/panel-gaming.jsx cockpit/styles-gaming.css || echo "(aucune)"
```

- [ ] **Step 3 : Purger les données de démonstration**

`cockpit/data-gaming-perso.js` contient encore un tableau `wishlist` et une clé `wishlist_count` inertes, plus des données de démonstration jamais écrasées pour les clés que `transformGaming` ne produit pas. Ramener le fichier à un shape vide, sur le modèle de ce qui a déjà été fait pour les profils :

```bash
grep -n "wishlist\|heatmap" cockpit/data-gaming-perso.js
```

Supprimer ces clés. Vérifier qu'aucune n'est lue :

```bash
grep -rn "D\.wishlist\|D\.heatmap\|wishlist_count" cockpit/ || echo "(aucune lecture)"
```

- [ ] **Step 4 : Supprimer les règles CSS orphelines**

```bash
grep -n "gm-bl-\|gm-abandoned\|gm-top-row\|gm-wl-" cockpit/styles-gaming.css | head
```

Supprimer les blocs correspondants — les sections qu'ils stylaient n'existent plus.

- [ ] **Step 5 : Rebrancher la §4 Genres sur IGDB**

Exigé par la spec (« bénéfice de bord »), et c'est le seul endroit du lot où
une section existante gagne en exactitude plutôt qu'en place.

Aujourd'hui `transformGaming` calcule `genres_30d` depuis `steam_game_details`,
qui plafonne à **5 lignes sur 102** — d'où le « 100 % Autre » affiché. Or
`game_titles.genres` est renseigné par IGDB pour la totalité des titres.

Dans `cockpit/panel-gaming.jsx`, remplacer la source de la §4 par un calcul
local à partir de la bibliothèque, en pondérant par les minutes des 14 derniers
jours :

```jsx
  // IGDB renseigne les genres de tous les titres, la ou steam_game_details
  // plafonne a 5 lignes sur 102 — c'est ce qui affichait « 100 % Autre ».
  const genres14j = React.useMemo(() => {
    const tally = new Map();
    for (const c of library) {
      if (!c.minutes2w) continue;
      const gs = (c.t.genres || []).length ? c.t.genres : ["Autre"];
      for (const g of gs) tally.set(g, (tally.get(g) || 0) + c.minutes2w / gs.length);
    }
    const total = [...tally.values()].reduce((a, b) => a + b, 0);
    return [...tally.entries()]
      .map(([name, min]) => ({ name, minutes: Math.round(min),
                               pct: total ? Math.round((min / total) * 100) : 0 }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [library]);
```

Puis alimenter la §4 avec `genres14j` au lieu de `D.genres_30d`. Si `genres14j`
est vide (aucun jeu joué sur 14 jours — c'est le cas au 2026-08-13, un seul
jeu actif), afficher « Rien joué ces 14 derniers jours. » plutôt qu'un
graphique vide.

- [ ] **Step 6 : Vérifier**

```bash
node scripts/sync-sw.mjs
node tests/test_sw_static.mjs
for f in tests/test_*.mjs; do node "$f" >/dev/null 2>&1 || echo "FAIL $f"; done
```

Attendu : aucun `FAIL`.

- [ ] **Step 7 : Commit**

```bash
git add -A
git commit -m "refactor(games): relegue les stats Steam sous le tracker, purge le mort

Ordre final : A venir, bibliotheque, puis les stats. GmHeatmap supprime
(jamais rendu depuis que transformGaming ne produit plus la cle), donnees
de demonstration de data-gaming-perso.js purgees, CSS orphelin retire."
```

---

### Task 9 : documentation

**Files:**
- Modify: `docs/specs/tab-gaming.md`, `docs/specs/index.json`
- Modify: `docs/architecture/dependencies.yaml`, `docs/architecture/flows/perso-jeux.yaml`, `docs/architecture/decisions.md`

- [ ] **Step 1 : Réécrire la spec de l'onglet**

Dans `docs/specs/tab-gaming.md` : remplacer les sections §2, §2bis, §5, §6 par la bibliothèque à statuts ; ajouter le rail « À venir », la fiche jeu, l'ajout de jeu console. Décrire l'ordre final des sections. Mentionner la règle centrale — la bibliothèque affiche les titres portant un `steam_appid` ou une ligne `game_progress`, jamais les 357 titres frères. Ajouter une entrée datée du 2026-08-13 en tête de « Dernière MAJ ». Bumper `last_updated` de `tab-gaming` dans `docs/specs/index.json`.

- [ ] **Step 2 : Mettre à jour l'architecture**

`docs/architecture/dependencies.yaml` : le panel `gaming` lit désormais `game_titles`, `game_franchises`, `game_progress`, `game_releases` et écrit `game_progress`, `game_franchises`, `game_releases`, `game_titles`.

`docs/architecture/flows/perso-jeux.yaml` : le panel `gaming` passe de « lot 2 conditionné » à son état réel, et l'Edge Function `igdb-proxy` rejoint les `source_api`.

`docs/architecture/decisions.md` : ajouter une entrée ADR au numéro suivant disponible (`grep -n "^## ADR-" docs/architecture/decisions.md | tail -1`) documentant que le lot 2 a été lancé **sans attendre la sonde de survie du lot 1**, sur décision explicite de l'utilisateur le 2026-08-13, l'encart du Brief n'ayant pas suffi à rendre le tracker visible pour lui.

- [ ] **Step 3 : Vérifier les linters**

```bash
python scripts/lint_specs_produit.py; echo "lint-specs=$?"
python scripts/validate_architecture.py; echo "validate-arch=$?"
```

Attendu : `0` pour les deux.

- [ ] **Step 4 : Commit**

```bash
git add docs/
git commit -m "docs(games): spec et architecture de l'onglet Gaming refondu"
```

---

## Vérification finale

- [ ] **Toutes les suites passent**

```bash
cd ~/projects/jarvis-cockpit
for f in tests/test_*.mjs; do echo "── $f"; node "$f" || echo "ECHEC"; done
for f in tests/test_*.py;  do echo "── $f"; PYTHONUTF8=1 python "$f" || echo "ECHEC"; done
```

Attendu : aucun `ECHEC` hormis `tests/test_franchise_walk.py`, exclu du CI pour un bug de `sys.path` antérieur à ce lot.

- [ ] **L'onglet rend le bon contenu**

Hard-refresh sur `#gaming`. Attendu : le rail « À venir » avec ses annonces, la bibliothèque avec **environ 94 jeux et non 451**, chaque carte ouvrant sa fiche, les statuts s'écrivant en base.

- [ ] **Aucune régression sur la médiathèque**

```sql
select (select count(*) from media_franchises) f,
       (select count(*) from media_progress) p;
```

Attendu : inchangé par ce lot.
