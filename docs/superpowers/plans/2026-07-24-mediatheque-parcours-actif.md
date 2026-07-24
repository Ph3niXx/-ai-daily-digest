# Médiathèque — parcours de la bibliothèque qui a grossi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remplacer la grille à plat de 44 affiches par une pile de rayons — rail « Continuer à regarder », semainier des diffusions, collection repliée — et unifier la recherche en « bibliothèque d'abord ».

**Architecture:** Toute la logique *pure* (libellés, normalisation de titres, sélection du rail, découpage du semainier) part dans un nouveau module `cockpit/lib/mediatheque-view.js` — script classique avec guard `module.exports`, exactement le pattern de `cockpit/lib/anilist.js`, donc **testable sous node**. Le JSX (`panel-mediatheque.jsx`, déjà 745 lignes) ne garde que du rendu et du câblage React. Zéro migration SQL, zéro changement de pipeline.

**Tech Stack:** React 18 + `@babel/standalone` via CDN (no build step), composants sur `window.*`, CSS piloté par tokens de thème. Tests : asserts node purs (`node tests/*.mjs`), pas de framework. Spec : `docs/superpowers/specs/2026-07-24-mediatheque-parcours-actif-design.md`.

## Global Constraints

- **Pas de test-runner front.** Le JSX est compilé dans le navigateur : aucun test unitaire de composant React n'est possible, ne pas en inventer. Ce qui est testé, c'est le module `cockpit/lib/mediatheque-view.js` (JS pur, sans DOM ni React) via `node tests/test_mediatheque_view.mjs`.
- **Le module ne doit dépendre de rien** : pas de `window`, pas de `document`, pas de `Date.now()` interne — `now` est toujours passé en argument (déterminisme des tests).
- **3 thèmes** (Dawn clair, Obsidian sombre, Atlas clair) : uniquement des tokens (`--bg`, `--bg2`, `--tx`, `--tx2`, `--tx3`, `--brand`, `--font-*`, `--radius-lg`, `--shadow-sm`). Seule exception : voiles `rgba(0,0,0,α)` **posés sur une image**.
- **Pas de `max-width`** sur le contenu (CLAUDE.md).
- **Composants et modules sur `window.*`**, aucun `import`/`export` ES dans `cockpit/**` (incompatible Babel standalone).
- **Préfixe CSS `mdt-`** conservé.
- **Règles cardinales** (même commit que le code) : nouvel `event_type` → `docs/telemetry.md` **avant** le commit ; modif fonctionnelle d'onglet → `docs/specs/tab-mediatheque.md` + bump `last_updated` dans `docs/specs/index.json` ; modif `cockpit/**` ou `index.html` → `node scripts/sync-sw.mjs`.
- **Commits directs sur `main`** (cible GitHub Pages), push groupé en Task 7. Chaque message de commit se termine par ces deux lignes, reprises telles quelles :
  ```
  Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
  ```
- **Vérification finale en prod**, pas en local : push sur `main` puis hard-refresh de la page GitHub Pages (le service worker sert du cache).

## Structure des fichiers

| Fichier | Responsabilité | Action |
|---|---|---|
| `cockpit/lib/mediatheque-view.js` | Logique de présentation pure : `released`, `nextEpLabel`, `normalize`, `matchesQuery`, `pickRail`, `buildWeek`. Aucune dépendance. | **Créer** |
| `tests/test_mediatheque_view.mjs` | Asserts node sur le module ci-dessus. | **Créer** |
| `index.html` | Charge le module avant le panel. | Modifier (1 ligne) |
| `cockpit/panel-mediatheque.jsx` | Rendu React uniquement : `<MdtRail>`, `<MdtWeek>`, `<MdtCollection>`, `<MdtCard compact>`, câblage recherche. | Modifier |
| `cockpit/styles-mediatheque.css` | Styles rail / semainier / en-têtes de section / grille dense. | Modifier |
| `docs/telemetry.md` | 3 nouveaux events. | Modifier |
| `docs/specs/tab-mediatheque.md`, `docs/specs/index.json` | Spec produit de l'onglet. | Modifier |
| `docs/architecture/flows/perso-mediatheque.yaml` | `panels[].detail` obsolète. | Modifier |
| `sw.js` | Régénéré par `scripts/sync-sw.mjs`, **jamais à la main**. | Généré |

---

## Task 1 : Module `mediatheque-view.js` — libellés + recherche locale (TDD)

Créer le module et ses deux premières familles de fonctions : le libellé de saison courante du rail, et la normalisation/correspondance de titres pour la recherche locale.

**Files:**
- Create: `cockpit/lib/mediatheque-view.js`
- Create: `tests/test_mediatheque_view.mjs`

**Interfaces:**
- Consumes: rien (module autonome).
- Produces :
  - `released(entry) → number` — épisodes réellement sortis. Miroir exact de `mdtReleased()` dans le panel, qui déléguera à cette fonction en Task 3.
  - `nextEpLabel(cur, watched) → string | null` — `"S2 · ép. 16 sur 24"`, `"Film · non vu"`, `null` si `cur` est `null`.
  - `normalize(s) → string` — minuscules sans diacritiques.
  - `matchesQuery(franchise, q) → boolean` — teste `title_english`, `title_romaji`, `title_native`.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `tests/test_mediatheque_view.mjs` (asserts purs, pas de framework — pattern de `tests/test_franchise_walk.mjs`) :

```js
// Tests du module de présentation Médiathèque (JS pur, sans DOM).
// Run: node tests/test_mediatheque_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "mediatheque-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── released() ────────────────────────────────────────────────
check("released: saison terminee", V.released({ airing_status: "FINISHED", episodes_total: 24 }), 24);
check("released: saison en diffusion (ep 4 a venir => 3 sortis)",
  V.released({ airing_status: "RELEASING", next_episode_number: 4, episodes_total: null }), 3);
check("released: saison annoncee", V.released({ airing_status: "NOT_YET_RELEASED", episodes_total: 12 }), 0);
check("released: annulee compte ses episodes sortis",
  V.released({ airing_status: "CANCELLED", episodes_total: 6 }), 6);

// ── nextEpLabel() ─────────────────────────────────────────────
check("nextEpLabel: null si pas de saison courante", V.nextEpLabel(null, 0), null);
check("nextEpLabel: saison terminee, prochain = vus + 1",
  V.nextEpLabel({ kind: "season", season_number: 2, airing_status: "FINISHED", episodes_total: 24 }, 15),
  "S2 · ép. 16 sur 24");
check("nextEpLabel: saison en diffusion sans total => episodes sortis au denominateur",
  V.nextEpLabel({ kind: "season", season_number: 3, airing_status: "RELEASING", next_episode_number: 4, episodes_total: null }, 0),
  "S3 · ép. 1 sur 3");
check("nextEpLabel: film non vu",
  V.nextEpLabel({ kind: "movie", airing_status: "FINISHED", episodes_total: 1 }, 0), "Film · non vu");
check("nextEpLabel: bonus ova",
  V.nextEpLabel({ kind: "ova", airing_status: "FINISHED", episodes_total: 3 }, 1), "OVA · ép. 2 sur 3");

// ── normalize() / matchesQuery() ──────────────────────────────
check("normalize: accents et casse", V.normalize("Frieren: Au-delà"), "frieren: au-dela");
check("normalize: null tolere", V.normalize(null), "");

const FR = { title_english: "The Apothecary Diaries", title_romaji: "Kusuriya no Hitorigoto", title_native: "薬屋のひとりごと" };
check("matchesQuery: titre anglais partiel", V.matchesQuery(FR, "apoth"), true);
check("matchesQuery: titre romaji", V.matchesQuery(FR, "kusuriya"), true);
check("matchesQuery: titre natif", V.matchesQuery(FR, "薬屋"), true);
check("matchesQuery: insensible aux accents", V.matchesQuery({ title_english: "Café Terrace" }, "cafe"), true);
check("matchesQuery: aucune correspondance", V.matchesQuery(FR, "naruto"), false);
check("matchesQuery: requete vide = faux", V.matchesQuery(FR, "   "), false);
check("matchesQuery: titres manquants toleres", V.matchesQuery({ title_english: null, title_romaji: null }, "x"), false);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `node tests/test_mediatheque_view.mjs`
Attendu : `Error: Cannot find module ...cockpit\lib\mediatheque-view.js` (le module n'existe pas encore).

- [ ] **Step 3 : Écrire le module**

Créer `cockpit/lib/mediatheque-view.js` :

```js
// cockpit/lib/mediatheque-view.js
// Logique de présentation pure de l'onglet Médiathèque : libellés, recherche
// locale, sélection du rail « Continuer à regarder », découpage du semainier.
// Script classique compatible Babel standalone : expose window.mdtView.
// Guard module.exports => testable sous node (tests/test_mediatheque_view.mjs).
//
// CONTRAINTE : aucune dépendance au DOM, à React ou à window.MEDIATHEQUE_DATA.
// L'instant courant est TOUJOURS passé en argument (déterminisme des tests).
(function () {

  // Épisodes réellement sortis pour une entrée. Source de vérité unique :
  // panel-mediatheque.jsx::mdtReleased() délègue ici.
  function released(e) {
    if (e.airing_status === "FINISHED" || e.airing_status === "CANCELLED") return e.episodes_total || 0;
    if (e.airing_status === "RELEASING") return Math.max(0, (e.next_episode_number || 1) - 1);
    return 0;
  }

  // Libellé du rail : « S2 · ép. 16 sur 24 » — le numéro affiché est le
  // PROCHAIN à voir (watched + 1), pas le dernier vu. Dénominateur =
  // episodes_total si connu, sinon les épisodes sortis à date.
  function nextEpLabel(cur, watched) {
    if (!cur) return null;
    const rel = released(cur);
    const total = cur.episodes_total != null ? cur.episodes_total : rel;
    if (cur.kind === "movie") return watched > 0 ? "Film · vu" : "Film · non vu";
    const tag = cur.kind === "season" ? `S${cur.season_number}` : String(cur.kind || "?").toUpperCase();
    return `${tag} · ép. ${watched + 1} sur ${total || "?"}`;
  }

  // Plage ̀-ͯ = diacritiques combinants. Échappée volontairement :
  // pas de garantie sur les classes Unicode \p{...} sous Babel standalone.
  function normalize(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function matchesQuery(f, q) {
    const n = normalize(q).trim();
    if (!n) return false;
    return [f.title_english, f.title_romaji, f.title_native]
      .some((t) => t && normalize(t).includes(n));
  }

  const api = { released, nextEpLabel, normalize, matchesQuery };
  if (typeof window !== "undefined") window.mdtView = Object.assign(window.mdtView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run : `node tests/test_mediatheque_view.mjs`
Attendu : 17 lignes `ok`, puis `Tous les tests passent`, code de sortie 0.

- [ ] **Step 5 : Commit**

```bash
git add cockpit/lib/mediatheque-view.js tests/test_mediatheque_view.mjs
git commit -m "$(cat <<'EOF'
feat(mediatheque): module de presentation pur (libelles + recherche locale)

Nouveau cockpit/lib/mediatheque-view.js sur le pattern de anilist.js
(window.mdtView + guard module.exports) : released, nextEpLabel, normalize,
matchesQuery. Testable sous node, contrairement au JSX.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
EOF
)"
```

---

## Task 2 : `pickRail` + `buildWeek` dans le module (TDD)

Les deux fonctions qui portent la vraie logique métier des nouveaux rayons : qui va dans le rail, et comment se répartissent les diffusions sur 7 jours.

**Files:**
- Modify: `cockpit/lib/mediatheque-view.js`
- Modify: `tests/test_mediatheque_view.mjs`

**Interfaces:**
- Consumes: `released()` (Task 1).
- Produces :
  - `pickRail(cards, heroFranchiseId) → card[]` — `cards` a la forme `{ f, entries, st, lastTouch }` construite dans le panel ; renvoie les `st.id === "watching"` non `shelved` privés de la franchise du hero, triés par `lastTouch` décroissant.
  - `buildWeek(entries, franchiseById, nowMs) → { days, later, laterTotal, count }` où
    `days` = 7 objets `{ ts, items }` (`ts` = minuit local de J+i),
    `items` / `later` = `{ entryId, franchiseId, label, kind, ep, at, reason }`,
    `reason ∈ {"airing","premiere","undated"}`, `later` plafonné à 6 (`laterTotal` = total avant plafond),
    `count` = nombre d'items dans la grille.

- [ ] **Step 1 : Ajouter les tests qui échouent**

Dans `tests/test_mediatheque_view.mjs`, insérer **avant** la ligne `console.log(failures ? ...)` finale :

```js
// ── pickRail() ────────────────────────────────────────────────
const card = (id, stId, touch, shelved) => ({
  f: { id, shelved: !!shelved, title_english: id }, entries: [],
  st: { id: stId }, lastTouch: touch,
});
const CARDS = [
  card("black-clover", "watching", 300),
  card("apothecary", "watching", 500),
  card("code-geass", "watching", 100),
  card("slime", "up_to_date", 900),
  card("naruto", "seen", 800),
  card("range", "watching", 999, true),
];
check("pickRail: watching seuls, tries par activite, hero exclu, shelved exclu",
  V.pickRail(CARDS, "apothecary").map((c) => c.f.id), ["black-clover", "code-geass"]);
check("pickRail: sans hero connu, tout le watching non range",
  V.pickRail(CARDS, null).map((c) => c.f.id), ["apothecary", "black-clover", "code-geass"]);
check("pickRail: aucune serie en cours => vide",
  V.pickRail([card("slime", "up_to_date", 1)], null), []);

// ── buildWeek() ───────────────────────────────────────────────
// Ancrage : vendredi 24 juillet 2026, 10 h locales (construit en heure locale
// pour rester indépendant du fuseau de la machine de test).
const NOW = new Date(2026, 6, 24, 10, 0, 0).getTime();
const localAt = (y, m, d, h, min) => new Date(y, m, d, h, min, 0).toISOString();

const FRANCHISES = new Map([
  ["f-slime", { id: "f-slime", shelved: false, title_english: "Slime" }],
  ["f-rezero", { id: "f-rezero", shelved: false, title_english: "Re:ZERO" }],
  ["f-frieren", { id: "f-frieren", shelved: false, title_english: "Frieren" }],
  ["f-range", { id: "f-range", shelved: true, title_english: "Rangee" }],
]);
const ENTRIES = [
  { id: "e-slime", franchise_id: "f-slime", kind: "season", in_main_chain: true, title_english: "Slime S5",
    airing_status: "RELEASING", next_episode_number: 16, next_episode_airing_at: localAt(2026, 6, 24, 16, 0) },
  { id: "e-rezero", franchise_id: "f-rezero", kind: "season", in_main_chain: true, title_english: "Re:ZERO S5",
    airing_status: "RELEASING", next_episode_number: 12, next_episode_airing_at: localAt(2026, 7, 12, 15, 0) },
  { id: "e-frieren-s3", franchise_id: "f-frieren", kind: "season", in_main_chain: true, title_english: null,
    title_romaji: "Frieren S3", airing_status: "NOT_YET_RELEASED", start_date: "2027-10-01" },
  { id: "e-frieren-bonus", franchise_id: "f-frieren", kind: "other", in_main_chain: false, title_english: null,
    title_romaji: null, airing_status: "RELEASING", next_episode_number: null, next_episode_airing_at: null },
  { id: "e-main-undated", franchise_id: "f-slime", kind: "season", in_main_chain: true, title_english: "Slime S6",
    airing_status: "RELEASING", next_episode_number: null, next_episode_airing_at: null },
  { id: "e-range", franchise_id: "f-range", kind: "season", in_main_chain: true, title_english: "Rangee S2",
    airing_status: "RELEASING", next_episode_number: 3, next_episode_airing_at: localAt(2026, 6, 26, 12, 0) },
];
const W = V.buildWeek(ENTRIES, FRANCHISES, NOW);

check("buildWeek: 7 colonnes", W.days.length, 7);
check("buildWeek: la premiere colonne est aujourd'hui minuit",
  W.days[0].ts, new Date(2026, 6, 24, 0, 0, 0).getTime());
check("buildWeek: diffusion du jour dans la colonne 0",
  W.days[0].items.map((i) => i.entryId), ["e-slime"]);
check("buildWeek: numero d'episode remonte", W.days[0].items[0].ep, 16);
check("buildWeek: franchise rangee exclue de la grille",
  W.days.flatMap((d) => d.items).filter((i) => i.franchiseId === "f-range"), []);
check("buildWeek: un seul item dans la grille", W.count, 1);
check("buildWeek: au-dela de J+6 en 'plus tard'",
  W.later.filter((i) => i.reason === "airing").map((i) => i.entryId), ["e-rezero"]);
check("buildWeek: premiere annoncee en 2027 hors horizon J+90",
  W.later.filter((i) => i.entryId === "e-frieren-s3"), []);
check("buildWeek: bonus hors chaine sans date ignore",
  W.later.filter((i) => i.entryId === "e-frieren-bonus"), []);
check("buildWeek: saison de la chaine sans date => 'date inconnue' en dernier",
  W.later.map((i) => [i.entryId, i.reason]), [["e-rezero", "airing"], ["e-main-undated", "undated"]]);
check("buildWeek: libelle replie sur le titre romaji puis la franchise",
  V.buildWeek([{ id: "x", franchise_id: "f-slime", kind: "season", in_main_chain: true,
    airing_status: "RELEASING", next_episode_number: 2,
    next_episode_airing_at: localAt(2026, 6, 25, 12, 0) }], FRANCHISES, NOW).days[1].items[0].label,
  "Slime");

// Première annoncée dans la fenêtre => elle entre dans la grille, sans numéro d'épisode.
const W2 = V.buildWeek([{ id: "p", franchise_id: "f-slime", kind: "season", in_main_chain: true,
  title_english: "Slime S6", airing_status: "NOT_YET_RELEASED", start_date: "2026-07-27" }], FRANCHISES, NOW);
check("buildWeek: premiere proche placee dans la grille",
  W2.days.map((d) => d.items.length), [0, 0, 0, 1, 0, 0, 0]);
check("buildWeek: premiere sans numero d'episode", W2.days[3].items[0].ep, null);
check("buildWeek: semaine vide et rien apres => tout a zero",
  V.buildWeek([], FRANCHISES, NOW), { days: W.days.map((d) => ({ ts: d.ts, items: [] })), later: [], laterTotal: 0, count: 0 });
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

Run : `node tests/test_mediatheque_view.mjs`
Attendu : `TypeError: V.pickRail is not a function` (ou `V.buildWeek is not a function`), code de sortie ≠ 0.

- [ ] **Step 3 : Implémenter `pickRail` et `buildWeek`**

Dans `cockpit/lib/mediatheque-view.js`, insérer **après** la fonction `matchesQuery` et **avant** la ligne `const api = { ... }` :

```js
  // ── Rail « Continuer à regarder » ───────────────────────────
  // Les franchises où il reste des épisodes SORTIS non vus, privées de celle
  // que le hero met déjà en avant (pickHero privilégie watching en règle 1,
  // donc le rail affiche systématiquement « les autres »).
  function pickRail(cards, heroFranchiseId) {
    return cards
      .filter((c) => !c.f.shelved && c.st.id === "watching" && c.f.id !== heroFranchiseId)
      .slice()
      .sort((a, b) => b.lastTouch - a.lastTouch);
  }

  // ── Semainier ───────────────────────────────────────────────
  // Bornes construites via setDate() plutôt que par arithmétique sur des ms :
  // un passage à l'heure d'été ne fait pas 24 h et décalerait les colonnes.
  function addDays(ms, n) { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d.getTime(); }

  // start_date est une date nue (« 2026-07-27 ») : new Date(s) la lirait en UTC
  // et la ferait basculer d'un jour dans les fuseaux à l'ouest de Greenwich.
  // On la lit explicitement comme minuit LOCAL.
  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s == null ? "" : s));
    if (!m) return NaN;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  }

  const LATER_CAP = 6;        // items affichés dans la ligne « plus tard »
  const HORIZON_DAYS = 90;    // au-delà, une première annoncée est de l'annonce, pas du calendrier

  function buildWeek(entries, franchiseById, nowMs) {
    const bounds = [];
    for (let i = 0; i <= 7; i++) bounds.push(addDays(nowMs, i));
    const start = bounds[0];
    const end = bounds[7];
    const horizon = addDays(nowMs, HORIZON_DAYS);

    const days = [];
    for (let i = 0; i < 7; i++) days.push({ ts: bounds[i], items: [] });
    const later = [];
    let count = 0;

    for (const e of entries) {
      const f = franchiseById.get(e.franchise_id);
      if (!f || f.shelved) continue;

      const label = e.title_english || e.title_romaji || f.title_english || f.title_romaji || "?";
      const base = { entryId: e.id, franchiseId: f.id, label, kind: e.kind, ep: null };

      let at = null, reason = null;
      if (e.airing_status === "RELEASING" && e.next_episode_airing_at) {
        at = new Date(e.next_episode_airing_at).getTime();
        reason = "airing";
        base.ep = e.next_episode_number || null;
      } else if (e.airing_status === "NOT_YET_RELEASED" && e.start_date) {
        at = parseDay(e.start_date);
        reason = "premiere";
      } else if (e.airing_status === "RELEASING" && e.in_main_chain) {
        // Saison qui diffuse mais sans date remontée par AniList : sans cette
        // branche elle disparaîtrait de l'écran. Réservé à la chaîne
        // principale — un bonus sans titre ni date serait du bruit permanent.
        later.push(Object.assign({}, base, { at: null, reason: "undated" }));
        continue;
      } else {
        continue;
      }

      if (!Number.isFinite(at) || at < start) continue;
      if (reason === "premiere" && at > horizon) continue;

      if (at < end) {
        let i = 0;
        while (i < 6 && at >= bounds[i + 1]) i++;
        days[i].items.push(Object.assign({}, base, { at, reason }));
        count++;
      } else {
        later.push(Object.assign({}, base, { at, reason }));
      }
    }

    for (const d of days) d.items.sort((a, b) => a.at - b.at);
    later.sort((a, b) => {
      if (a.at == null && b.at == null) return 0;
      if (a.at == null) return 1;
      if (b.at == null) return -1;
      return a.at - b.at;
    });
    return { days, later: later.slice(0, LATER_CAP), laterTotal: later.length, count };
  }
```

Puis remplacer la ligne `const api = { released, nextEpLabel, normalize, matchesQuery };` par :

```js
  const api = { released, nextEpLabel, normalize, matchesQuery, pickRail, buildWeek };
```

- [ ] **Step 4 : Lancer le test pour vérifier qu'il passe**

Run : `node tests/test_mediatheque_view.mjs`
Attendu : toutes les lignes en `ok`, `Tous les tests passent`, code de sortie 0.

- [ ] **Step 5 : Commit**

```bash
git add cockpit/lib/mediatheque-view.js tests/test_mediatheque_view.mjs
git commit -m "$(cat <<'EOF'
feat(mediatheque): pickRail + buildWeek (semainier 7 jours glissants)

buildWeek repartit les diffusions sur 7 colonnes construites via setDate
(sûr au changement d'heure), plafonne les premieres annoncees a J+90 et
garde les saisons de la chaine principale sans date en « plus tard ».

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
EOF
)"
```

---

## Task 3 : Câblage du module + rail « Continuer à regarder »

Charger le module dans la page, faire déléguer `mdtReleased` pour qu'il n'existe qu'une source de vérité, et afficher le rail.

**Files:**
- Modify: `index.html:65` (zone des `<script>` de `cockpit/lib/`)
- Modify: `cockpit/panel-mediatheque.jsx:14-18` (`mdtReleased`), ajout de `<MdtRail>` avant `function PanelMediatheque`, câblage dans le `return`
- Modify: `cockpit/styles-mediatheque.css`

**Interfaces:**
- Consumes: `window.mdtView.released`, `window.mdtView.nextEpLabel`, `window.mdtView.pickRail` (Tasks 1-2) ; `currentEntryOf`, `pickHero`, `writeProgress` (existants).
- Produces : `<MdtRail cards progressById onOpen onProgress />` — `cards` est le retour de `pickRail`, `onOpen(f)` ouvre la fiche, `onProgress(entry, value)` = `writeProgress`.

- [ ] **Step 1 : Charger le module dans `index.html`**

Après la ligne 65 (`<script src="cockpit/lib/anilist.js?v=1"></script>`), ajouter :

```html
<script src="cockpit/lib/mediatheque-view.js?v=1"></script>
```

- [ ] **Step 2 : Faire déléguer `mdtReleased` au module**

Dans `cockpit/panel-mediatheque.jsx`, remplacer le corps de `mdtReleased` (lignes 14-18) par :

```jsx
// Source de vérité dans cockpit/lib/mediatheque-view.js (testé sous node).
function mdtReleased(e) {
  return window.mdtView.released(e);
}
```

- [ ] **Step 3 : Ajouter le composant `<MdtRail>`**

Dans `cockpit/panel-mediatheque.jsx`, insérer juste **après** le composant `MdtHero` (après sa dernière accolade, avant `function MdtCard`) :

```jsx
function MdtRail({ cards, progressById, onOpen, onProgress }) {
  if (!cards.length) return null;
  return (
    <section className="mdt-section" aria-label="Continuer à regarder">
      <div className="mdt-section-head">
        <h3 className="mdt-section-title">Continuer à regarder</h3>
        <span className="mdt-section-count">{cards.length}</span>
      </div>
      <div className="mdt-rail">
        {cards.map(({ f, entries }) => {
          const cur = currentEntryOf(entries, progressById);
          const watched = cur ? (progressById.get(cur.id) || 0) : 0;
          const rel = cur ? mdtReleased(cur) : 0;
          const pct = rel ? Math.min(100, Math.round((100 * watched) / rel)) : 0;
          const shot = f.banner_url || f.cover_url;
          return (
            <div className="mdt-rail-card" key={f.id}>
              <button className="mdt-rail-shot" onClick={() => onOpen(f)}
                aria-label={`Ouvrir ${f.title_english || f.title_romaji}`}>
                {shot ? <img src={shot} alt="" loading="lazy" /> : <div className="mdt-rail-ph" />}
                <div className="mdt-rail-bar" aria-hidden="true"><div style={{ width: pct + "%" }} /></div>
              </button>
              <div className="mdt-rail-body">
                <p className="mdt-rail-title">{f.title_english || f.title_romaji}</p>
                <p className="mdt-rail-sub">{window.mdtView.nextEpLabel(cur, watched)}</p>
                {cur && (
                  <button className="mdt-chip mdt-rail-plus"
                    onClick={() => onProgress(cur, Math.min(rel, watched + 1))}>
                    +1 épisode
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
```

- [ ] **Step 4 : Calculer `railCards` et rendre le rail**

Dans `PanelMediatheque`, juste **après** la ligne `const hero = useMdtMemo(() => pickHero(cards), [cards]);`, ajouter :

```jsx
  // Le hero met déjà en avant une franchise « en cours » (pickHero règle 1) :
  // le rail affiche les autres pour qu'un même titre n'apparaisse pas deux fois.
  const railCards = useMdtMemo(
    () => window.mdtView.pickRail(cards, hero && hero.card ? hero.card.f.id : null),
    [cards, hero]);
```

Puis, dans le `return`, juste **après** le bloc `{!inSearchView && (<MdtHero … />)}` (qui se termine par `)}`), insérer :

```jsx
      {!inSearchView && (
        <MdtRail cards={railCards} progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress} />
      )}
```

- [ ] **Step 5 : Ajouter les styles (en-têtes de section + rail)**

Dans `cockpit/styles-mediatheque.css`, insérer juste **avant** le commentaire `/* Grille bibliothèque */` :

```css
/* En-têtes de section (rail, semainier, collection) */
.mdt-section { margin-bottom: 6px; }
.mdt-section-head { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; margin: 26px 0 10px; }
.mdt-section-title { font-family: var(--font-display); font-weight: 600; font-size: 17px; margin: 0; }
.mdt-section-count { font-family: var(--font-mono); font-size: 11px; color: var(--tx3); }

/* Rail « Continuer à regarder » — cartes bannière 16:9 à défilement horizontal */
.mdt-rail { display: flex; gap: 14px; overflow-x: auto; scroll-snap-type: x proximity;
  padding-bottom: 8px; scrollbar-width: thin; }
.mdt-rail-card { flex: 0 0 240px; scroll-snap-align: start; }
.mdt-rail-shot { display: block; width: 100%; padding: 0; border: none; background: none; cursor: pointer;
  position: relative; border-radius: var(--radius-lg, 12px); overflow: hidden; box-shadow: var(--shadow-sm);
  transition: transform .18s ease, box-shadow .18s ease; }
.mdt-rail-shot img, .mdt-rail-ph { display: block; width: 100%; aspect-ratio: 16/9; object-fit: cover;
  background: color-mix(in srgb, var(--tx) 8%, transparent); }
.mdt-rail-card:hover .mdt-rail-shot, .mdt-rail-card:focus-within .mdt-rail-shot {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(0,0,0,.26), 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent); }
.mdt-rail-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(0,0,0,.45); }
.mdt-rail-bar > div { height: 100%; background: var(--brand); }
.mdt-rail-body { padding: 9px 2px 0; }
.mdt-rail-title { font-size: 13.5px; font-weight: 600; line-height: 1.25; margin: 0 0 2px;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mdt-rail-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--tx3); margin: 0 0 8px; }
```

- [ ] **Step 6 : Vérifier que les tests du module passent toujours**

Run : `node tests/test_mediatheque_view.mjs`
Attendu : `Tous les tests passent`, code de sortie 0.

- [ ] **Step 7 : Commit**

```bash
git add index.html cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css
git commit -m "$(cat <<'EOF'
feat(mediatheque): rail « Continuer a regarder » (hero dedoublonne)

Charge cockpit/lib/mediatheque-view.js, fait deleguer mdtReleased au module,
ajoute <MdtRail> : cartes banniere 16:9 avec +1 visible sans survol. La
franchise mise en avant par le hero est exclue du rail.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
EOF
)"
```

---

## Task 4 : Semainier `<MdtWeek>` + retrait du calendrier texte

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (`MdtReleasesStrip` amputé de son calendrier, nouveau `<MdtWeek>`, câblage)
- Modify: `cockpit/styles-mediatheque.css`
- Modify: `docs/telemetry.md`

**Interfaces:**
- Consumes: `window.mdtView.buildWeek` (Task 2), `mdtFmtDate` (existant).
- Produces : `<MdtWeek D tick onOpen />` — `onOpen(franchiseId)` ouvre la fiche.

- [ ] **Step 1 : Déclarer l'event de télémétrie AVANT le code (règle cardinale)**

Dans `docs/telemetry.md`, après la ligne `| \`mediatheque_hero_action\` | ... |` (ligne 40), ajouter :

```markdown
| `mediatheque_week_click` | `{days_ahead, entry_kind}` | `cockpit/panel-mediatheque.jsx::MdtWeek` clic sur une diffusion du semainier (`days_ahead` = 0 pour aujourd'hui, `null` pour une entrée sans date) |
```

- [ ] **Step 2 : Amputer `MdtReleasesStrip` de son calendrier**

Dans `cockpit/panel-mediatheque.jsx`, remplacer intégralement la fonction `MdtReleasesStrip` (de `function MdtReleasesStrip(` jusqu'à son accolade fermante) par :

```jsx
// Événements non acquittés uniquement — le calendrier des prochaines diffusions
// est passé dans <MdtWeek> (semainier).
function MdtReleasesStrip({ D, onAck }) {
  const events = D.releases.filter((r) => !r.acknowledged);
  if (!events.length) return null;
  return (
    <section className="mdt-releases" aria-label="Sorties">
      <div className="mdt-releases-head">Sorties de ta bibliothèque</div>
      {events.map((r) => (
        <div key={r.id} className="mdt-release">
          <span>🆕 {r.title}</span>
          <span className="mdt-release-date">{r.event_date ? mdtFmtDate(r.event_date) : mdtFmtDate(r.detected_at)}</span>
          <button className="mdt-release-ack" onClick={() => onAck(r)} title="Marquer comme vu" aria-label="Acquitter">✓</button>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 3 : Ajouter le composant `<MdtWeek>`**

Insérer juste **après** `MdtReleasesStrip` :

```jsx
function MdtWeek({ D, tick, onOpen }) {
  const franchiseById = useMdtMemo(
    () => new Map(D.franchises.map((f) => [f.id, f])), [D.franchises, tick]);
  const week = useMdtMemo(
    () => window.mdtView.buildWeek(D.entries, franchiseById, Date.now()),
    [D.entries, franchiseById, tick]);

  if (!week.count && !week.later.length) return null;

  const dayLabel = (ts) => new Date(ts).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric" });
  const timeLabel = (ts) => new Date(ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const open = (item, daysAhead) => {
    onOpen(item.franchiseId);
    window.track && window.track("mediatheque_week_click", { days_ahead: daysAhead, entry_kind: item.kind });
  };
  const laterNote = (item) => {
    if (item.reason === "undated") return "date inconnue";
    if (item.reason === "premiere") return `première le ${mdtFmtDate(new Date(item.at).toISOString())}`;
    return `ép. ${item.ep || "?"} le ${mdtFmtDate(new Date(item.at).toISOString())}`;
  };

  return (
    <section className="mdt-section" aria-label="Cette semaine">
      <div className="mdt-section-head"><h3 className="mdt-section-title">Cette semaine</h3></div>
      <div className="mdt-week">
        {week.days.map((d, i) => (
          <div key={d.ts} className={`mdt-week-day ${i === 0 ? "is-today" : ""}`}>
            <div className="mdt-week-date">{i === 0 ? "Aujourd'hui" : dayLabel(d.ts)}</div>
            {d.items.map((item) => (
              <button key={item.entryId} className="mdt-week-pill" onClick={() => open(item, i)}>
                <span className="mdt-week-name">{item.label}</span>
                <span className="mdt-week-ep">
                  {item.ep ? `ép. ${item.ep}` : "première"} · {timeLabel(item.at)}
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
      {week.later.length > 0 && (
        <div className="mdt-week-later">
          <span className="mdt-week-later-lbl">plus tard</span>
          {week.later.map((item) => (
            <button key={item.entryId} onClick={() => open(item, item.at == null ? null : Math.round((item.at - week.days[0].ts) / 86400000))}>
              <strong>{item.label}</strong> — {laterNote(item)}
            </button>
          ))}
          {week.laterTotal > week.later.length && <span>…</span>}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4 : Câbler dans `PanelMediatheque`**

Remplacer la ligne `<MdtReleasesStrip D={D} tick={tick} onAck={ackRelease} />` par :

```jsx
      <MdtReleasesStrip D={D} onAck={ackRelease} />
```

Puis, juste **après** le bloc `{!inSearchView && (<MdtRail … />)}` ajouté en Task 3, insérer :

```jsx
      {!inSearchView && (
        <MdtWeek D={D} tick={tick} onOpen={(id) => setFiche({ mode: "library", franchiseId: id })} />
      )}
```

- [ ] **Step 5 : Ajouter les styles du semainier**

Dans `cockpit/styles-mediatheque.css`, juste **après** le bloc `.mdt-rail-sub { … }` ajouté en Task 3 :

```css
/* Semainier — 7 colonnes glissantes, aujourd'hui en tête */
.mdt-week { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.mdt-week-day { border: 1px solid color-mix(in srgb, var(--tx) 10%, transparent); border-radius: 10px;
  padding: 8px 9px 10px; min-height: 84px; background: color-mix(in srgb, var(--tx) 2%, transparent); }
.mdt-week-day.is-today { border-color: color-mix(in srgb, var(--brand) 55%, transparent);
  background: color-mix(in srgb, var(--brand) 8%, transparent); }
.mdt-week-date { font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em;
  text-transform: uppercase; color: var(--tx3); margin-bottom: 7px; }
.mdt-week-day.is-today .mdt-week-date { color: var(--brand); }
.mdt-week-pill { display: block; width: 100%; text-align: left; border: none; background: transparent;
  padding: 3px 0; font: inherit; color: var(--tx); cursor: pointer; }
.mdt-week-name { display: block; font-size: 11.5px; font-weight: 600; line-height: 1.3;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mdt-week-pill:hover .mdt-week-name { color: var(--brand); }
.mdt-week-ep { font-family: var(--font-mono); font-size: 10px; color: var(--tx3); }
.mdt-week-later { display: flex; align-items: baseline; gap: 6px 16px; flex-wrap: wrap; margin-top: 10px;
  font-size: 12px; color: var(--tx3); }
.mdt-week-later-lbl { font-family: var(--font-mono); font-size: 10px; letter-spacing: .12em;
  text-transform: uppercase; }
.mdt-week-later button { border: none; background: transparent; padding: 0; font: inherit;
  color: inherit; cursor: pointer; }
.mdt-week-later button:hover { color: var(--brand); }
.mdt-week-later strong { color: var(--tx2); font-weight: 600; }
@media (max-width: 900px) { .mdt-week { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
@media (max-width: 560px) { .mdt-week { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
```

- [ ] **Step 6 : Vérifier qu'aucune référence au calendrier supprimé ne subsiste**

Run : `grep -n "mdt-calendar" cockpit/`
Attendu : uniquement les 2 règles CSS `.mdt-calendar` / `.mdt-calendar-item` dans `styles-mediatheque.css`. Les supprimer (elles n'ont plus de porteur), puis relancer le grep : aucun résultat.

- [ ] **Step 7 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css docs/telemetry.md
git commit -m "$(cat <<'EOF'
feat(mediatheque): semainier des diffusions (remplace le calendrier texte)

<MdtWeek> : 7 colonnes glissantes, aujourd'hui surligne, ligne « plus tard »
pour les diffusions au-dela de J+6, les premieres jusqu'a J+90 et les saisons
de la chaine principale sans date. MdtReleasesStrip ne garde que les
evenements non acquittes. Event mediatheque_week_click.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
EOF
)"
```

---

## Task 5 : Collection repliable + cartes compactes + chips déplacés

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (`MdtCard` prop `compact`, nouveau `<MdtCollection>`, toolbar allégée, état `collectionOpen`)
- Modify: `cockpit/styles-mediatheque.css`
- Modify: `docs/telemetry.md`

**Interfaces:**
- Consumes: `<MdtCard>` (existant), `currentEntryOf`, `visible` (mémo existant).
- Produces : `<MdtCollection visible total open onToggle statusFilter onStatusFilter sort onSort progressById onOpen onProgress queryActive />`.

- [ ] **Step 1 : Déclarer l'event de télémétrie**

Dans `docs/telemetry.md`, après la ligne `mediatheque_week_click` ajoutée en Task 4 :

```markdown
| `mediatheque_collection_toggle` | `{open, count}` | `cockpit/panel-mediatheque.jsx::MdtCollection` pli/dépli manuel de la section « Ma collection » |
```

- [ ] **Step 2 : Rendre `<MdtCard>` compactable**

Dans `cockpit/panel-mediatheque.jsx`, remplacer la signature et le bloc d'actions de `MdtCard`. Signature :

```jsx
function MdtCard({ f, entries, st, cur, progressById, onOpen, onProgress, compact }) {
```

et remplacer le bloc `<div className="mdt-card-actions" …>…</div>` par :

```jsx
      {!compact && (
        <div className="mdt-card-actions" onClick={(e) => e.stopPropagation()}>
          {cur
            ? <MdtStepper entry={cur} progressById={progressById} onProgress={onProgress} />
            : st.id === "seen"
              ? <button className="mdt-chip" onClick={() => onOpen(f)}>Revoir</button>
              : <span className="mdt-card-actions-note">à jour</span>}
        </div>
      )}
```

- [ ] **Step 3 : Ajouter le composant `<MdtCollection>`**

Insérer juste **après** `MdtCard` (avant `function PanelMediatheque`) :

```jsx
// Toute la bibliothèque (actives incluses) : c'est la seule vue exhaustive.
// Repliée par défaut — 36 des 44 franchises sont « Vu » et n'appellent aucune action.
function MdtCollection({ visible, total, open, onToggle, statusFilter, onStatusFilter,
                         sort, onSort, progressById, onOpen, onProgress, queryActive }) {
  return (
    <section className="mdt-section" aria-label="Ma collection">
      <div className="mdt-section-head">
        <button className="mdt-collection-toggle" aria-expanded={open}
          onClick={onToggle} disabled={queryActive}>
          <span className="mdt-chev" aria-hidden="true">▸</span>
          <span className="mdt-section-title">Ma collection</span>
          <span className="mdt-section-count">{visible.length}{visible.length !== total ? ` / ${total}` : ""}</span>
        </button>
        {open && !queryActive && (
          <div className="mdt-filters" role="group" aria-label="Filtrer par statut">
            {[["all", "Tous"], ["to_watch", "À voir"], ["watching", "En cours"], ["seen", "Vu"], ["shelved", "Mis de côté"]].map(([id, label]) => (
              <button key={id} className={`mdt-chip ${statusFilter === id ? "is-active" : ""}`}
                onClick={() => onStatusFilter(id)}>{label}</button>
            ))}
          </div>
        )}
        {open && (
          <select className="mdt-select" value={sort} onChange={(e) => onSort(e.target.value)} aria-label="Trier">
            <option value="activity">Dernière activité</option>
            <option value="added">Date d'ajout</option>
            <option value="alpha">Alphabétique</option>
          </select>
        )}
      </div>
      {open && (
        visible.length === 0 ? (
          <div className="mdt-empty">
            {total === 0
              ? "Ta bibliothèque est vide — cherche un anime ci-dessus pour commencer."
              : "Aucune franchise ne correspond."}
          </div>
        ) : (
          <div className="mdt-grid">
            {visible.map(({ f, entries, st }) => (
              <MdtCard key={f.id} f={f} entries={entries} st={st} compact
                cur={currentEntryOf(entries, progressById)}
                progressById={progressById}
                onOpen={onOpen} onProgress={onProgress} />
            ))}
          </div>
        )
      )}
    </section>
  );
}
```

- [ ] **Step 4 : Ajouter l'état `collectionOpen` dans `PanelMediatheque`**

Juste **après** la ligne `const [sort, setSort] = useMdtState("activity");`, ajouter :

```jsx
  const [collectionOpen, setCollectionOpen] = useMdtState(() => {
    try { return localStorage.getItem("mdt-collection-open") === "1"; } catch { return false; }
  });
  function toggleCollection() {
    setCollectionOpen((v) => {
      const next = !v;
      try { localStorage.setItem("mdt-collection-open", next ? "1" : "0"); } catch {}
      window.track && window.track("mediatheque_collection_toggle", { open: next, count: visible.length });
      return next;
    });
  }
```

> `visible` est déclaré plus bas dans le composant mais n'est lu qu'au moment du clic (après le premier rendu) : la fermeture capture la valeur courante à chaque rendu, pas à la définition.

- [ ] **Step 5 : Retirer chips et tri de la toolbar, remplacer la grille par `<MdtCollection>`**

Dans le `return`, remplacer tout le bloc `<div className="mdt-toolbar">…</div>` par :

```jsx
      <div className="mdt-toolbar">
        <input
          className="mdt-search"
          type="search"
          placeholder="Rechercher — ta bibliothèque, puis AniList…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un anime"
        />
      </div>
```

Puis remplacer tout le bloc ternaire final `{inSearchView ? ( … ) : visible.length === 0 ? ( … ) : ( <div className="mdt-grid">…</div> )}` par :

```jsx
      {inSearchView ? (
        results === null ? <div className="mdt-spinner">Recherche…</div> :
        searchErr ? <div className="mdt-error">{searchErr}</div> :
        results.length === 0 ? <div className="mdt-empty">Aucun résultat pour « {query.trim()} ».</div> : (
          <div className="mdt-results">
            {results.map((m) => {
              const inLib = libSourceIds.has(m.id);
              return (
                <button key={m.id} className="mdt-result" onClick={() => openPreview(m.id)}>
                  {m.coverImage && m.coverImage.large ? <img src={m.coverImage.large} alt="" loading="lazy" /> : <div style={{ width: 56 }} />}
                  <div>
                    <p className="mdt-result-title">{(m.title && (m.title.english || m.title.romaji)) || "?"}</p>
                    <p className="mdt-result-sub">
                      {m.format || "?"} · {(m.startDate && m.startDate.year) || "?"}
                      {m.averageScore ? ` · ${m.averageScore}%` : ""}
                      {m.title && m.title.native ? ` · ${m.title.native}` : ""}
                    </p>
                    <p className="mdt-result-genres">{(m.genres || []).slice(0, 3).join(" · ")}</p>
                    {inLib && <span className="mdt-inlib">déjà dans ta bibliothèque</span>}
                  </div>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <MdtCollection
          visible={visible} total={D.franchises.length}
          open={collectionOpen} onToggle={toggleCollection}
          statusFilter={statusFilter} onStatusFilter={setStatusFilter}
          sort={sort} onSort={setSort}
          progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress}
          queryActive={false} />
      )}
```

> `queryActive` reste `false` ici : il devient dynamique en Task 6.

- [ ] **Step 6 : Densifier la grille et styler l'en-tête repliable**

Dans `cockpit/styles-mediatheque.css` :

Remplacer la règle `.mdt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 24px 20px; }` par :

```css
.mdt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 20px 16px; }
```

Remplacer la règle `.mdt-search { order: 3; margin-left: auto; flex: 0 1 300px; …` en changeant uniquement son début (le reste de la déclaration est inchangé) :

```css
.mdt-search { flex: 0 1 340px; padding: 8px 14px 8px 34px; font: inherit; font-size: 13.5px;
```

Ajouter, après le bloc `.mdt-week-later strong { … }` :

```css
/* En-tête repliable de la collection */
.mdt-collection-toggle { display: flex; align-items: baseline; gap: 8px; border: none;
  background: transparent; padding: 0; font: inherit; color: var(--tx); cursor: pointer; }
.mdt-collection-toggle:disabled { cursor: default; opacity: .6; }
.mdt-chev { font-size: 11px; color: var(--tx3); transition: transform .16s ease; }
.mdt-collection-toggle[aria-expanded="true"] .mdt-chev { transform: rotate(90deg); }
.mdt-section-head .mdt-filters { margin-left: auto; }
```

- [ ] **Step 7 : Vérifier les tests du module**

Run : `node tests/test_mediatheque_view.mjs`
Attendu : `Tous les tests passent`.

- [ ] **Step 8 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/styles-mediatheque.css docs/telemetry.md
git commit -m "$(cat <<'EOF'
feat(mediatheque): collection repliable + grille dense + cartes compactes

<MdtCollection> replie les 44 affiches (etat memorise dans localStorage),
grille passee de 200px a 140px, chips et tri descendus dans son en-tete.
Les cartes de la collection perdent leur panneau d'actions au survol : les
actions rapides vivent dans le rail. Event mediatheque_collection_toggle.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
EOF
)"
```

---

## Task 6 : Recherche unique « bibliothèque d'abord »

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (états de recherche, effets, bascule, gates de rendu)
- Modify: `docs/telemetry.md`

**Interfaces:**
- Consumes: `window.mdtView.matchesQuery` (Task 1), `<MdtCollection>` (Task 5).
- Produces : rien de nouveau pour les tâches suivantes.

- [ ] **Step 1 : Déclarer l'event de télémétrie**

Dans `docs/telemetry.md`, après la ligne `mediatheque_collection_toggle` :

```markdown
| `mediatheque_filter_local` | `{q_len, matches}` | `cockpit/panel-mediatheque.jsx::PanelMediatheque` requête locale stabilisée (debounce 400 ms), avant tout appel AniList |
```

- [ ] **Step 2 : Remplacer les états et effets de recherche**

Dans `PanelMediatheque`, remplacer la ligne :

```jsx
  const searching = query.trim().length >= 3;
```

par :

```jsx
  const q = query.trim();
  const queryActive = q.length >= 1;      // filtrage local instantané
  const searching = q.length >= 3;        // seuil d'appel AniList (inchangé)
```

Puis remplacer la ligne :

```jsx
  const inSearchView = searching && view === "search"; // corps = résultats ; sinon = grille bibliothèque
```

par :

```jsx
  const inSearchView = queryActive && view === "search"; // corps = résultats AniList ; sinon = bibliothèque
```

- [ ] **Step 3 : Ajouter le mémo `localMatches` et l'effet de vue par défaut**

Immédiatement **après** le mémo `cards` et **avant** le mémo `visible` (l'ordre importe : `localMatches` lit `cards`, `visible` lit `localMatches`), ajouter :

```jsx
  const localMatches = useMdtMemo(
    () => (queryActive ? cards.filter((c) => window.mdtView.matchesQuery(c.f, q)) : []),
    [cards, q, queryActive]);
```

Puis remplacer l'effet de recherche AniList existant (`useMdtEffect(() => { if (!searching) { … } }, [query, searching]);`) par ces **deux** effets :

```jsx
  // Vue par défaut : ta bibliothèque d'abord. On ne bascule sur AniList que
  // si la requête ne correspond à rien de ce que tu possèdes déjà.
  useMdtEffect(() => {
    if (!queryActive) { setView("library"); setResults(null); setSearchErr(null); return; }
    setView(localMatches.length > 0 ? "library" : "search");
    const t = setTimeout(() => {
      window.track && window.track("mediatheque_filter_local", { q_len: q.length, matches: localMatches.length });
    }, 400);
    return () => clearTimeout(t);
  }, [q, queryActive]);

  useMdtEffect(() => {
    if (!searching) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const media = await window.anilist.searchAnime(q);
        if (cancelled) return;
        setResults(media);
        setSearchErr(null);
        window.track && window.track("mediatheque_search", { q_len: q.length, results: media.length });
      } catch (e) {
        if (!cancelled) { setResults([]); setSearchErr("AniList ne répond pas — réessaie dans un instant."); }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, searching]);
```

- [ ] **Step 4 : Faire filtrer la collection par la recherche**

Remplacer le mémo `visible` par :

```jsx
  const visible = useMdtMemo(() => {
    // Une recherche active prime sur les chips : elle porte sur TOUTE la
    // bibliothèque, mises de côté comprises (chercher doit retrouver ce qu'on a rangé).
    let list = localMatches;
    if (!queryActive) {
      list = cards;
      if (statusFilter === "shelved") {
        list = list.filter((c) => c.f.shelved);
      } else {
        list = list.filter((c) => !c.f.shelved);   // "Tous" + buckets actifs excluent les mis de côté
        if (statusFilter === "to_watch") list = list.filter((c) => c.st.id === "to_watch");
        else if (statusFilter === "watching") list = list.filter((c) => c.st.id === "watching" || c.st.id === "up_to_date");
        else if (statusFilter === "seen") list = list.filter((c) => c.st.id === "seen");
      }
    }
    const bySort = {
      activity: (a, b) => b.lastTouch - a.lastTouch,
      added: (a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0),
      alpha: (a, b) => (a.f.title_english || a.f.title_romaji || "").localeCompare(b.f.title_english || b.f.title_romaji || ""),
    };
    return [...list].sort(bySort[sort] || bySort.activity);
  }, [cards, localMatches, queryActive, statusFilter, sort]);
```

- [ ] **Step 5 : Mettre à jour la bascule et les gates de rendu**

Remplacer le bloc `{searching && (<div className="mdt-viewtoggle" …>…</div>)}` par :

```jsx
      {queryActive && (
        <div className="mdt-viewtoggle" role="group" aria-label="Basculer entre ma bibliothèque et les résultats AniList">
          <button className={`mdt-viewtoggle-btn ${view === "library" ? "is-active" : ""}`}
            aria-pressed={view === "library"} onClick={() => setView("library")}>
            Ma bibliothèque · {localMatches.length}
          </button>
          <button className={`mdt-viewtoggle-btn ${view === "search" ? "is-active" : ""}`}
            aria-pressed={view === "search"} onClick={() => setView("search")}>
            AniList{results ? ` · ${results.length}` : ""}
          </button>
        </div>
      )}
```

Remplacer les trois gates `{!inSearchView && (…)}` (hero, rail, semainier) par `{!queryActive && (…)}` — une recherche active masque le hero, le rail et le semainier même en vue « Ma bibliothèque ».

Dans le bloc `inSearchView`, remplacer la branche « moins de 3 caractères » : `results === null` est atteint aussi quand `q.length < 3`. Remplacer `results === null ? <div className="mdt-spinner">Recherche…</div> :` par :

```jsx
        !searching ? <div className="mdt-empty">Tape au moins 3 caractères pour chercher sur AniList.</div> :
        results === null ? <div className="mdt-spinner">Recherche…</div> :
```

Enfin, passer `queryActive` réellement à `<MdtCollection>` : remplacer `queryActive={false}` par :

```jsx
          queryActive={queryActive} />
```

et remplacer la prop `open={collectionOpen}` par :

```jsx
          open={collectionOpen || queryActive}
```

- [ ] **Step 6 : Vérifier l'absence de références mortes**

Run : `grep -n "query.trim()" cockpit/panel-mediatheque.jsx`
Attendu : une seule occurrence restante, dans le message « Aucun résultat pour « … » ». La remplacer par `{q}` :

```jsx
        results.length === 0 ? <div className="mdt-empty">Aucun résultat pour « {q} ».</div> : (
```

Run : `node tests/test_mediatheque_view.mjs`
Attendu : `Tous les tests passent`.

- [ ] **Step 7 : Commit**

```bash
git add cockpit/panel-mediatheque.jsx docs/telemetry.md
git commit -m "$(cat <<'EOF'
feat(mediatheque): recherche unique, bibliotheque d'abord

Le champ filtre d'abord la bibliotheque (des 1 caractere, sans accents, mises
de cote comprises) ; AniList reste a >= 3 caracteres. La bascule devient
« Ma bibliotheque · N | AniList · M » et atterrit sur la bibliotheque des
qu'il y a une correspondance locale. Event mediatheque_filter_local.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
EOF
)"
```

---

## Task 7 : Docs, service worker, validations, push

**Files:**
- Modify: `docs/specs/tab-mediatheque.md`
- Modify: `docs/specs/index.json:282`
- Modify: `docs/architecture/flows/perso-mediatheque.yaml:31`
- Generated: `sw.js`

- [ ] **Step 1 : Mettre à jour la spec produit de l'onglet**

Dans `docs/specs/tab-mediatheque.md` :

Remplacer la puce `- **Bibliothèque** : …` de la section « Fonctionnalités » par :

```markdown
- **Bibliothèque** : hero cinématique mettant en avant le titre le plus pertinent, puis trois rayons — rail « Continuer à regarder » (cartes bannière avec `+1 épisode` visible sans survol, la franchise du hero exclue), semainier des 7 prochains jours de diffusion, et « Ma collection » repliée (grille dense de posters, chips de statut, tri). La collection contient **toutes** les franchises, actives comprises ; son état plié/déplié est mémorisé.
```

Remplacer la puce `- **Sorties** : …` par :

```markdown
- **Sorties** : bandeau des événements détectés (nouvelle saison, diffusion commencée, date annoncée) avec acquittement, semainier des 7 prochains jours (aujourd'hui surligné) doublé d'une ligne « plus tard » — diffusions au-delà de J+6, premières annoncées jusqu'à J+90, saisons de la chaîne principale en diffusion sans date connue —, et encart dans le Brief du jour.
```

Remplacer la puce `- **Recherche en direct** : …` par :

```markdown
- **Recherche en direct** : un seul champ, bibliothèque d'abord. Dès 1 caractère il filtre la bibliothèque (titres anglais/romaji/japonais, insensible à la casse et aux accents, mises de côté comprises) ; à partir de 3 caractères il interroge aussi AniList (format, année, genres, score ; les fiches déjà en bibliothèque sont signalées). La bascule segmentée « Ma bibliothèque · N | AniList · M » atterrit sur la bibliothèque dès qu'il y a une correspondance locale.
```

Dans la section « Front — structure UI », remplacer la phrase décrivant les composants par :

```markdown
`cockpit/panel-mediatheque.jsx` (`window.PanelMediatheque`) : toolbar (`.mdt-search`), bascule segmentée `.mdt-viewtoggle` (état `view` = `library`/`search`), bandeau `<MdtReleasesStrip>` (événements non acquittés), hero `<MdtHero>` (`pickHero`), rail `<MdtRail>`, semainier `<MdtWeek>`, section repliable `<MdtCollection>` (grille `.mdt-grid` de `<MdtCard compact>`), modale `<FicheFranchise>`, stepper `<MdtStepper>`. Logique de présentation pure (libellés, recherche locale, rail, semainier) dans `cockpit/lib/mediatheque-view.js` (`window.mdtView`, testé par `tests/test_mediatheque_view.mjs`). Encart Brief : `<MdtBriefCard>` dans `cockpit/home.jsx`. Styles : `cockpit/styles-mediatheque.css` (préfixe `mdt-`).
```

Dans le tableau « Front — fonctions JS », ajouter une ligne :

```markdown
| `pickRail()` / `buildWeek()` / `matchesQuery()` | rail « Continuer », semainier 7 jours, recherche locale | `cockpit/lib/mediatheque-view.js` |
```

Remplacer la section « Dernière MAJ » par :

```markdown
## Dernière MAJ
2026-07-24 — parcours d'une bibliothèque de 44 franchises : rail « Continuer à regarder », semainier des diffusions, collection repliée et densifiée, recherche unique bibliothèque-d'abord. Logique pure extraite dans `cockpit/lib/mediatheque-view.js` (testée sous node). Aucune migration.
```

- [ ] **Step 2 : Bumper `last_updated`**

Dans `docs/specs/index.json`, ligne 282, remplacer `"last_updated": "2026-07-22"` par `"last_updated": "2026-07-24"` (dans l'objet dont le `"slug"` est `"mediatheque"`).

- [ ] **Step 3 : Mettre à jour le flow d'architecture**

Dans `docs/architecture/flows/perso-mediatheque.yaml`, remplacer la ligne 31 par :

```yaml
    detail: "Panel Médiathèque — bandeau Sorties, semainier des diffusions, rail « Continuer à regarder », collection repliée (statuts dérivés), recherche bibliothèque + AniList, fiche franchise avec steppers"
```

- [ ] **Step 4 : Resynchroniser le service worker**

Run : `node scripts/sync-sw.mjs`
Attendu : `[sync-sw] CACHE → cockpit-vN, STATIC → M entries` avec `M` incrémenté de 1 par rapport à l'exécution précédente (ajout de `/cockpit/lib/mediatheque-view.js`).

Vérifier : `grep -n "mediatheque-view" sw.js` → une ligne `"/cockpit/lib/mediatheque-view.js",`.

- [ ] **Step 5 : Lancer les validations CI en local**

Run : `PYTHONUTF8=1 python scripts/validate_spec.py`
Attendu : exit 0 (la variable `PYTHONUTF8` évite l'`UnicodeEncodeError` cp1252 sur le `✅` final en console Windows).

Run : `PYTHONUTF8=1 python scripts/validate_architecture.py`
Attendu : exit 0.

Run : `PYTHONUTF8=1 python scripts/lint_known_sections.py`
Attendu : exit 0.

Run : `node tests/test_mediatheque_view.mjs`
Attendu : `Tous les tests passent`.

Si l'un échoue : corriger le fichier signalé et relancer la commande jusqu'au vert. Ne pas passer à l'étape suivante avec une validation rouge.

- [ ] **Step 6 : Commit et push**

```bash
git add docs/specs/tab-mediatheque.md docs/specs/index.json docs/architecture/flows/perso-mediatheque.yaml sw.js
git commit -m "$(cat <<'EOF'
docs(mediatheque): spec onglet + flow archi + resync service worker

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012TaBpNYapz1aoSAJDEgFrT
EOF
)"
git push origin main
```

- [ ] **Step 7 : Vérifier en prod**

Ouvrir la page GitHub Pages du cockpit, onglet Médiathèque, **hard-refresh** (Ctrl+Shift+R — le service worker sert du cache). Contrôler, dans **les 3 thèmes** (Dawn, Obsidian, Atlas) :

1. Le hero affiche une série en cours, et **cette série n'est pas** dans le rail en dessous.
2. Le rail « Continuer à regarder » affiche 3 cartes ; un clic sur `+1 épisode` incrémente le compteur sans ouvrir la modale.
3. Le semainier a 7 colonnes, la première marquée « Aujourd'hui » et surlignée ; *Slime* y apparaît le vendredi, *100 Girlfriends* et *Mushoku* le dimanche, *Grand Blue* le lundi. La ligne « plus tard » cite *Re:ZERO*. La saison 3 de *Frieren* (2027) n'apparaît **pas**.
4. « Ma collection » est repliée ; la déplier affiche la grille dense, recharger la page la garde dépliée.
5. Taper `apo` affiche la carte *The Apothecary Diaries* en vue « Ma bibliothèque », pas des résultats AniList ; basculer sur « AniList » affiche les résultats distants.
6. Taper `zzzzz` (aucune correspondance locale) atterrit directement sur la vue AniList.

Signaler tout écart avant de considérer la tâche terminée.

---

## Notes d'implémentation

- **Ordre des déclarations dans `PanelMediatheque`** : `cards` → `localMatches` → `visible` → `hero` → `railCards`. Un mémo qui lit une valeur déclarée plus bas lève un `ReferenceError` au rendu (TDZ), contrairement aux fonctions qui ne la lisent qu'au clic.
- **Toutes les dates du semainier sont locales** : `addDays` passe par `setDate()` (sûr au changement d'heure) et `parseDay` lit une date nue en minuit local. Sans ça, une première annoncée bascule d'un jour dans les fuseaux à l'ouest de Greenwich et les tests deviennent dépendants de la machine.
- **Pas de `Date.now()` dans le module** : `MdtWeek` le passe en argument à `buildWeek`. Le semainier ne se rafraîchit donc qu'au re-render ; c'est voulu (le `tick` suffit, personne ne laisse l'onglet ouvert 24 h).
- **`window.track` peut être absent** : toujours l'appeler en `window.track && window.track(...)`, comme le reste du fichier.
