# Médiathèque films & séries + carte « Ce soir » — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ouvrir la médiathèque à une seconde source (TMDB — films et séries) sans dupliquer une ligne de logique dérivée, et livrer une bande « Ce soir » qui propose au plus trois titres calibrés sur le temps disponible.

**Architecture:** Le contrat de données reste celui d'AniList ; TMDB y est traduit à l'ingestion, une fois. Les fonctions dérivées existantes (`released`, `status`, `currentEntryOf`, `pickHero`, `buildWeek`) ne sont pas modifiées — elles ignorent qu'une seconde source existe. La sélection du soir est une fonction **pure et déterministe** (`pickTonight`) qui rejoint `cockpit/lib/mediatheque-view.js`, testée sous node comme le reste du module.

**Tech Stack:** React 18 + Babel standalone via CDN (no build step), scripts classiques exposés sur `window.*`, Supabase REST, pipelines Python + GitHub Actions, tests node `.mjs` sans framework.

**Spec:** `docs/superpowers/specs/2026-07-25-mediatheque-films-series-ce-soir-design.md`

## Global Constraints

- **Pas d'imports ES modules dans `cockpit/`** — incompatible Babel standalone. Tout composant/module s'expose sur `window.X` et garde `if (typeof module !== "undefined" && module.exports)` pour être testable sous node.
- **`cockpit/lib/mediatheque-view.js` n'a aucune dépendance au DOM, à React ou à `window.MEDIATHEQUE_DATA`.** L'instant courant est **toujours** passé en argument (déterminisme des tests).
- **Toute fonction pure qui porte un contrat** (statut affiché, règle de priorité, libellé) vit dans `mediatheque-view.js`, pas dans le panel. Le panel n'en garde que des délégués d'une ligne.
- **Règles cardinales — même commit que le code, jamais un commit de doc séparé :**
  - modif fonctionnelle d'un onglet → MAJ `docs/specs/tab-mediatheque.md` + bump `last_updated` dans `docs/specs/index.json` (CI `lint-specs` **bloquant**) ;
  - pipeline / panel / migration SQL / cron → MAJ `docs/architecture/pipelines.yaml`, `dependencies.yaml`, `decisions.md` (CI `validate-arch` **bloquant**) ;
  - nouvel `event_type` télémétrie → entrée dans `docs/telemetry.md` **avant** le commit ;
  - nouveau secret GitHub Actions → entrée dans `docs/secrets.md`.
- **Après toute modif de `index.html` ou `cockpit/**`** → `node scripts/sync-sw.mjs`. Ne **jamais** éditer `STATIC[]` ou `CACHE` de `sw.js` à la main.
- **Tests** : `node tests/<fichier>.mjs`. Pas de framework, pas de `package.json`. Helper `check(name, got, expected)` avec comparaison `JSON.stringify`, `process.exit(failures ? 1 : 0)`.
- **Vérification front en prod**, pas en local : push sur `main` puis hard-refresh de la GitHub Page. Données inspectées via MCP Supabase.
- **Valeurs de `source`** (verbatim) : `media_franchises` → `anilist` · `tmdb_movie` · `tmdb_tv` ; `media_entries` → `anilist` · `tmdb_movie` · `tmdb_season`.
- **Valeurs de `media_type`** (verbatim) : `anime` · `tv` · `movie`.
- **`budgetMin`** (verbatim) : `30` · `60` · `null`. `null` encode « 2 h+ » = aucun plafond.

## File Structure

| Fichier | Responsabilité | Phase |
|---|---|---|
| `pipelines/anime_tracker_sync.py` | Sync AniList — gagne son filtre de source et la durée | 1 |
| `sql/022_media_runtime.sql` | Colonne `runtime_minutes` | 1 |
| `cockpit/lib/mediatheque-view.js` | Logique pure — accueille `pickTonight`, `isEvening`, `tonightHeadline` | 1 |
| `cockpit/lib/anilist.js` | Client AniList — demande et mappe `duration` | 1 |
| `cockpit/lib/data-loader.js` | Tier 2 — `activity_brief_today` pour l'accroche | 1 |
| `cockpit/panel-mediatheque.jsx` | Rendu — accueille `<MdtTonight>` et les chips de type | 1 + 2 |
| `cockpit/styles-mediatheque.css` | Styles `.mdt-tonight*`, `.mdt-typechip*` | 1 + 2 |
| `pipelines/media_tracker_common.py` | Helpers Supabase + `diff_events` partagés par les deux syncs | 2 |
| `cockpit/lib/tmdb.js` | Client TMDB + traduction vers le contrat AniList | 2 |
| `pipelines/tmdb_tracker_sync.py` | Sync TMDB + la même traduction, en Python | 2 |
| `cockpit/data-profile.js` | Masque `tmdb_api_key` de l'éditeur de profil | 2 |
| `.github/workflows/tmdb-tracker-sync.yml` | Cron 07:45 UTC | 2 |
| `tests/test_source_scoping.py` | Les syncs restent bornés à leur source | 1 |
| `tests/test_anilist_map.mjs` | `duration` → `runtime_minutes` | 1 |
| `tests/test_mediatheque_view.mjs` | Tests logique pure (existant, étendu) | 1 |
| `tests/test_media_tracker_common.py` | `diff_events` reste source-agnostique | 2 |
| `tests/test_tmdb_map.mjs` · `tests/test_tmdb_map.py` | Traduction TMDB — **deux tests jumeaux**, un par implémentation | 2 |

**Phase 1 (tâches 1-5) livre un logiciel complet et utile sans aucune clé API.** Si TMDB devait être abandonné, `pickTonight()` resterait acquis. Phase 2 (tâches 6-10) ajoute la seconde source.

---

# Phase 1 — Socle et carte « Ce soir »

## Task 1: Étanchéité par source du sync AniList

Corrige un bug latent : `run_sync()` charge **toutes** les franchises sans filtrer sur `source`, puis envoie chaque `source_root_id` à AniList. Dès qu'une franchise TMDB existera, un id qui correspond par hasard à un anime écrasera silencieusement la fiche. À faire **avant** toute écriture TMDB.

**Files:**
- Modify: `pipelines/anime_tracker_sync.py` (`run_sync()`, ~ligne 307-311)
- Test: `tests/test_source_scoping.py` (create)

**Interfaces:**
- Produces: `ANILIST_SOURCE = "anilist"`, `franchises_qs() -> str`, `entries_qs() -> str` — importés par le test. La Task 8 réutilisera le même motif pour TMDB.

- [ ] **Step 1: Write the failing test**

Créer `tests/test_source_scoping.py` :

```python
"""Les query strings du sync AniList doivent filtrer sur source.
Run: python tests/test_source_scoping.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
import anime_tracker_sync as ats

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


def contains(name, haystack, needle):
    global failures
    if needle not in haystack:
        failures += 1
        print(f"FAIL {name}\n  {needle!r} absent de {haystack!r}")
    else:
        print(f"ok   {name}")


check("source AniList", ats.ANILIST_SOURCE, "anilist")
contains("franchises filtrees sur la source", ats.franchises_qs(), "source=eq.anilist")
contains("entrees filtrees sur la source", ats.entries_qs(), "source=eq.anilist")
contains("franchises gardent leur select", ats.franchises_qs(), "source_root_id")
contains("entrees gardent leur select", ats.entries_qs(), "airing_status")
contains("entrees gardent leur tri", ats.entries_qs(), "order=sort_order")

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python tests/test_source_scoping.py`
Expected: FAIL — `AttributeError: module 'anime_tracker_sync' has no attribute 'ANILIST_SOURCE'`

- [ ] **Step 3: Write minimal implementation**

Dans `pipelines/anime_tracker_sync.py`, juste avant `def run_sync(dry_run):` :

```python
# Toute lecture du tracker est bornée à sa source. Sans ce filtre, une
# franchise TMDB verrait son source_root_id envoyé à AniList — au mieux un
# walk qui échoue, au pire un id qui correspond par hasard à un autre anime
# et qui écrase la fiche. Les query strings sont extraites pour être testées
# sans mock réseau.
ANILIST_SOURCE = "anilist"


def franchises_qs():
    return (f"source=eq.{ANILIST_SOURCE}"
            "&select=id,source_root_id,title_english,title_romaji&order=added_at")


def entries_qs():
    return (f"source=eq.{ANILIST_SOURCE}"
            "&select=id,franchise_id,source_id,airing_status,start_date&order=sort_order")
```

Puis remplacer les deux appels dans `run_sync()` :

```python
    franchises = sb_get(url, headers, "media_franchises", franchises_qs())
    entries = sb_get(url, headers, "media_entries", entries_qs())
```

- [ ] **Step 4: Run test to verify it passes**

Run: `python tests/test_source_scoping.py`
Expected: PASS — 6 lignes `ok`, exit 0

- [ ] **Step 5: Vérifier que le sync tourne toujours à blanc**

Run: `python pipelines/anime_tracker_sync.py --dry-run` (avec `SUPABASE_URL` et `SUPABASE_SERVICE_KEY` dans l'environnement)
Expected: le même nombre de franchises qu'avant le changement (44 attendues). Un compte à 0 signifie que le filtre est trop strict — vérifier que les lignes existantes ont bien `source='anilist'`.

- [ ] **Step 6: Commit**

```bash
git add pipelines/anime_tracker_sync.py tests/test_source_scoping.py
git commit -m "fix(mediatheque): borne le sync AniList a sa propre source"
```

---

## Task 2: Colonne `runtime_minutes` et sa collecte

`pickTonight()` a besoin d'une durée pour arbitrer entre 30 min et 2 h. Aucune colonne ne l'expose aujourd'hui, et `duration` n'est demandé dans aucun des deux clients AniList.

**Files:**
- Create: `sql/022_media_runtime.sql`
- Modify: `pipelines/anime_tracker_sync.py` (`MEDIA_FIELDS` ~134, `to_entry_row` ~226)
- Modify: `cockpit/lib/anilist.js` (`MEDIA_FIELDS` ~96, `toEntryRows` ~220)
- Modify: `docs/architecture/dependencies.yaml`
- Test: `tests/test_anilist_map.mjs` (create)

**Interfaces:**
- Produces: `media_entries.runtime_minutes int` (nullable). Consommée par `runtimeOf()` en Task 3 et par le mapping TMDB en Task 7.

- [ ] **Step 1: Write the failing test**

Créer `tests/test_anilist_map.mjs` :

```javascript
// Tests du mapping AniList → lignes media_entries.
// Run: node tests/test_anilist_map.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const A = require(join(here, "..", "cockpit", "lib", "anilist.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

const BUILT = { root_id: 1, entries: [{ source_id: 1, in_main_chain: true, kind: "season", season_number: 1, sort_order: 1 }] };
const MEDIA = {
  1: { id: 1, title: { romaji: "R", english: "E", native: "N" }, format: "TV",
       status: "FINISHED", episodes: 12, duration: 24, genres: [], coverImage: { large: "c" } },
};

check("toEntryRows: duration AniList => runtime_minutes",
  A.toEntryRows(BUILT, MEDIA)[0].runtime_minutes, 24);

const NO_DURATION = { 1: { ...MEDIA[1], duration: null } };
check("toEntryRows: duration absente => null, jamais 0",
  A.toEntryRows(BUILT, NO_DURATION)[0].runtime_minutes, null);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_anilist_map.mjs`
Expected: FAIL — `expected: 24 / got: undefined`

- [ ] **Step 3: Écrire la migration**

Créer `sql/022_media_runtime.sql` :

```sql
-- ============================================================
-- Migration 022: Médiathèque — durée d'une entrée
-- Nullable à dessein : une entrée sans durée connue reste utilisable partout,
-- seule pickTonight() la traite à part (acceptée à tous les budgets, classée
-- derrière une durée connue compatible). Exclure sur une donnée manquante
-- produirait une carte « Ce soir » vide et inexplicable.
-- RLS : policies authenticated déjà en place (sql/020) — la colonne en hérite.
-- Spec : docs/superpowers/specs/2026-07-25-mediatheque-films-series-ce-soir-design.md
-- ============================================================

ALTER TABLE media_entries ADD COLUMN IF NOT EXISTS runtime_minutes int;
```

Appliquer via MCP Supabase (`apply_migration`), nom `022_media_runtime`.

- [ ] **Step 4: Demander `duration` et le mapper — côté front**

Dans `cockpit/lib/anilist.js`, `MEDIA_FIELDS` — ajouter `duration` à la première ligne :

```javascript
  const MEDIA_FIELDS = `
    id idMal type format status episodes duration averageScore genres
```

Puis dans `toEntryRows`, après la ligne `episodes_total:` :

```javascript
        runtime_minutes: m.duration != null ? m.duration : null,
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/test_anilist_map.mjs`
Expected: PASS — 2 lignes `ok`, exit 0

- [ ] **Step 6: Même mapping côté pipeline**

Dans `pipelines/anime_tracker_sync.py`, `MEDIA_FIELDS` :

```python
MEDIA_FIELDS = """
  id idMal type format status episodes duration averageScore genres
```

Puis dans `to_entry_row`, après `"episodes_total": ...` :

```python
        "runtime_minutes": media.get("duration"),
```

- [ ] **Step 7: Vérifier le backfill à blanc**

Run: `python pipelines/anime_tracker_sync.py --dry-run`
Expected: aucune erreur. Le backfill réel se fera au prochain run nocturne — aucun script one-shot.

- [ ] **Step 8: Documenter**

Dans `docs/architecture/dependencies.yaml`, sous `- name: media_entries`, ajouter à la description de la table la mention de `runtime_minutes` (durée d'une entrée, nullable, alimentée par les syncs).

- [ ] **Step 9: Commit**

```bash
git add sql/022_media_runtime.sql pipelines/anime_tracker_sync.py cockpit/lib/anilist.js tests/test_anilist_map.mjs docs/architecture/dependencies.yaml
git commit -m "feat(mediatheque): duree d'une entree (runtime_minutes) collectee par les deux clients AniList"
```

---

## Task 3: `pickTonight()` — la sélection du soir

Le cœur du chantier. Trois rôles **distincts** plutôt qu'un top-3 scoré : trois candidats classés par le même critère se ressemblent et n'aident pas à trancher.

**Files:**
- Modify: `cockpit/lib/mediatheque-view.js`
- Test: `tests/test_mediatheque_view.mjs` (append)

**Interfaces:**
- Consumes: `media_entries.runtime_minutes` (Task 2), `currentEntryOf(entries, progressById)` et `addDays(ms, n)` (existants dans le module).
- Produces:
  - `isEvening(nowMs) -> boolean` — vrai de 18 h à 2 h.
  - `pickTonight(cards, progressById, ctx, nowMs) -> Array<{role, card, entry, runtime}>` — `role ∈ {"fresh","resume","discover"}`, 0 à 3 éléments, une franchise au plus une fois.
  - `tonightHeadline(picks, ctx, nowMs) -> string`
  - `card` a la forme produite par le panel : `{f, entries, st, lastTouch}`.
  - `ctx = {budgetMin: 30|60|null, dayLoad: {count, total_minutes}|null}`.

- [ ] **Step 1: Write the failing test**

Ajouter à la fin de `tests/test_mediatheque_view.mjs`, **avant** les deux dernières lignes (`console.log(failures…)` et `process.exit(…)`) :

```javascript
// ── isEvening() / pickTonight() ────────────────────────────────
const at = (h, m = 0) => new Date(2026, 6, 25, h, m, 0).getTime();

check("isEvening: 9 h du matin => non", V.isEvening(at(9)), false);
check("isEvening: 18 h => oui", V.isEvening(at(18)), true);
check("isEvening: 23 h => oui", V.isEvening(at(23)), true);
check("isEvening: 1 h du matin => oui", V.isEvening(at(1)), true);
check("isEvening: 2 h du matin => non", V.isEvening(at(2)), false);

// Fabrique de cartes. `st` est fourni tel que le panel le calcule.
function mkCard(id, stId, entries, opts) {
  const o = opts || {};
  return {
    f: { id, source_root_id: id, title_english: id, shelved: !!o.shelved, added_at: o.added_at || "2026-01-01" },
    entries,
    st: { id: stId, label: stId },
    lastTouch: o.lastTouch || 0,
  };
}
function mkEntry(id, o) {
  return {
    id, in_main_chain: o.chain !== false, kind: o.kind || "season", season_number: o.season || 1,
    airing_status: o.status || "FINISHED", episodes_total: o.total != null ? o.total : 12,
    next_episode_number: o.nextEp || null, next_episode_airing_at: o.airingAt || null,
    runtime_minutes: o.runtime === undefined ? 24 : o.runtime, sort_order: o.sort || 1,
  };
}
const EMPTY_CTX = { budgetMin: 60, dayLoad: null };
const roles = (picks) => picks.map((p) => p.role);
const ids = (picks) => picks.map((p) => p.card.f.id);

check("pickTonight: bibliotheque vide => aucune proposition",
  V.pickTonight([], new Map(), EMPTY_CTX, at(21)), []);

// « Vient de sortir » : la date stockée est AUJOURD'HUI et déjà passée.
const FRESH_E = mkEntry("e1", { status: "RELEASING", total: 24, nextEp: 13, airingAt: new Date(at(18)).toISOString() });
const FRESH = mkCard("fresh", "up_to_date", [FRESH_E]);
check("pickTonight: episode diffuse aujourd'hui non vu => role fresh",
  roles(V.pickTonight([FRESH], new Map([["e1", 12]]), EMPTY_CTX, at(21))), ["fresh"]);
check("pickTonight: episode d'aujourd'hui deja vu => pas de fresh",
  V.pickTonight([FRESH], new Map([["e1", 13]]), EMPTY_CTX, at(21)), []);
check("pickTonight: episode d'aujourd'hui pas encore diffuse => pas de fresh",
  V.pickTonight([FRESH], new Map([["e1", 12]]), EMPTY_CTX, at(12)), []);

// Budget : un film de 120 min ne rentre pas dans 30 minutes.
const FILM = mkCard("film", "to_watch", [mkEntry("f1", { kind: "movie", total: 1, runtime: 120 })]);
check("pickTonight: budget 30 min face a un seul film de 120 min => rien",
  V.pickTonight([FILM], new Map(), { budgetMin: 30, dayLoad: null }, at(21)), []);
check("pickTonight: budget 2 h+ (null) => le film passe",
  roles(V.pickTonight([FILM], new Map(), { budgetMin: null, dayLoad: null }, at(21))), ["discover"]);

// Durée inconnue : acceptée partout, mais classée derrière une durée connue compatible.
const UNK = mkCard("unk", "to_watch", [mkEntry("u1", { runtime: null })], { added_at: "2026-06-01" });
const KNOWN = mkCard("known", "to_watch", [mkEntry("k1", { runtime: 22 })], { added_at: "2026-01-01" });
check("pickTonight: duree inconnue acceptee mais classee apres une duree connue",
  ids(V.pickTonight([UNK, KNOWN], new Map(), { budgetMin: 30, dayLoad: null }, at(21))), ["known"]);

// Une franchise ne peut occuper qu'un rôle.
const BOTH_E = mkEntry("b1", { status: "RELEASING", total: 24, nextEp: 13, airingAt: new Date(at(18)).toISOString() });
const BOTH = mkCard("both", "watching", [BOTH_E], { lastTouch: 99 });
check("pickTonight: une franchise eligible a deux roles n'apparait qu'une fois",
  ids(V.pickTonight([BOTH], new Map([["b1", 5]]), EMPTY_CTX, at(21))), ["both"]);

// Mis de côté : jamais proposé.
const SHELVED = mkCard("shelved", "watching", [mkEntry("s1", {})], { shelved: true });
check("pickTonight: franchise mise de cote jamais proposee",
  V.pickTonight([SHELVED], new Map([["s1", 1]]), EMPTY_CTX, at(21)), []);

// Après 23 h, un format long recule derrière un format court.
const LONG = mkCard("long", "to_watch", [mkEntry("l1", { kind: "movie", total: 1, runtime: 118 })], { added_at: "2026-06-01" });
const SHORT = mkCard("short", "to_watch", [mkEntry("sh1", { runtime: 24 })], { added_at: "2026-01-01" });
check("pickTonight: a 21 h, budget illimite => le plus proche du budget d'abord (le long)",
  ids(V.pickTonight([SHORT, LONG], new Map(), { budgetMin: null, dayLoad: null }, at(21))), ["long"]);
check("pickTonight: a 23 h, le format long recule derriere le court",
  ids(V.pickTonight([SHORT, LONG], new Map(), { budgetMin: null, dayLoad: null }, at(23, 30))), ["short"]);

// Rôle sans candidat : la carte se réduit, aucun remplissage.
const ONLY_RESUME = mkCard("r", "watching", [mkEntry("r1", { total: 12 })], { lastTouch: 5 });
check("pickTonight: un seul role servi => une seule proposition, pas de remplissage",
  roles(V.pickTonight([ONLY_RESUME], new Map([["r1", 3]]), EMPTY_CTX, at(21))), ["resume"]);

// Les trois rôles ensemble, dans l'ordre.
const THREE = V.pickTonight([FRESH, ONLY_RESUME, KNOWN],
  new Map([["e1", 12], ["r1", 3]]), EMPTY_CTX, at(21));
check("pickTonight: trois roles servis dans l'ordre fresh, resume, discover",
  roles(THREE), ["fresh", "resume", "discover"]);

// Accroche.
check("tonightHeadline: rien a proposer => null",
  V.tonightHeadline([], EMPTY_CTX, at(21)), null);
check("tonightHeadline: apres 23 h",
  V.tonightHeadline(THREE, EMPTY_CTX, at(23, 30)), "Il est tard — plutôt un format court");
check("tonightHeadline: grosse journee => la phrase change, pas le classement",
  V.tonightHeadline(THREE, { budgetMin: 60, dayLoad: { count: 6, total_minutes: 300 } }, at(21)),
  "Grosse journée — de quoi décrocher");
check("tonightHeadline: journee normale",
  V.tonightHeadline(THREE, EMPTY_CTX, at(21)), "Ce soir");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_mediatheque_view.mjs`
Expected: FAIL — `V.isEvening is not a function`

- [ ] **Step 3: Write minimal implementation**

Dans `cockpit/lib/mediatheque-view.js`, **avant** le bloc `const api = {` final :

```javascript
  // ── « Ce soir » ─────────────────────────────────────────────
  // Trois rôles DISTINCTS, pas un top-3 scoré : trois candidats classés par le
  // même critère se ressemblent tous et n'aident pas à trancher. Un rôle sans
  // candidat disparaît — la carte affiche 3, 2, 1 ou zéro proposition, jamais
  // de remplissage.
  //
  // Déterministe et non LLM à dessein : le budget est la variable qui bouge
  // (« finalement j'ai deux heures »), un appel quotidien serait figé au moment
  // du run. Tout est déjà en base, il n'y a rien à interpréter.

  const EVENING_FROM = 18;   // la bande remplace le hero
  const EVENING_TO = 2;      // …jusqu'à 2 h du matin
  const LATE_HOUR = 23;      // au-delà, les formats longs reculent
  const LONG_FORM_MIN = 70;  // minutes
  // Tolérance par pastille : un épisode de 24 min « rentre » dans 30 minutes,
  // et deux épisodes dans une heure. Les bornes sont larges à dessein — un
  // filtre au strict rejetterait un épisode de 26 min d'un budget de 30.
  const BUDGET_MAX = { 30: 35, 60: 70 };

  function isEvening(nowMs) {
    const h = new Date(nowMs).getHours();
    return h >= EVENING_FROM || h < EVENING_TO;
  }

  function runtimeOf(entry) {
    return entry && entry.runtime_minutes != null ? entry.runtime_minutes : null;
  }

  // budgetMin null = « 2 h+ » : aucun plafond, PAS une borne haute déguisée.
  // Une durée inconnue n'est jamais exclue : la bibliothèque entière est dans
  // ce cas avant le premier backfill, et une carte vide inexplicable coûte plus
  // cher qu'une proposition légèrement hors budget.
  function fitsBudget(runtime, budgetMin) {
    if (budgetMin == null || runtime == null) return true;
    return runtime <= (BUDGET_MAX[budgetMin] || budgetMin);
  }

  // Un épisode « vient de sortir » quand la date stockée est AUJOURD'HUI et
  // déjà passée. Le sync ne tourne qu'à 07:30 : entre la diffusion du soir et
  // le sync du lendemain, next_episode_airing_at pointe encore l'épisode qui
  // vient de tomber — et released() ne le compte pas encore. C'est ce décalage
  // qui rend le rôle détectable sans donnée supplémentaire.
  function airedToday(e, nowMs) {
    if (e.airing_status !== "RELEASING" || !e.next_episode_airing_at) return false;
    const t = new Date(e.next_episode_airing_at).getTime();
    if (!Number.isFinite(t) || t > nowMs) return false;
    return addDays(t, 0) === addDays(nowMs, 0);
  }

  function pickTonight(cards, progressById, ctx, nowMs) {
    const budget = ctx && ctx.budgetMin !== undefined ? ctx.budgetMin : 60;
    const late = new Date(nowMs).getHours() >= LATE_HOUR;
    const active = cards.filter((c) => !c.f.shelved);
    const taken = new Set();
    const out = [];

    // Ordre commun à tous les rôles : hors budget écarté, format long relégué
    // après 23 h, durée inconnue derrière une durée connue, puis départage
    // propre au rôle.
    function rank(list, tie) {
      return list
        .filter((x) => fitsBudget(runtimeOf(x.entry), budget))
        .sort((a, b) => {
          const ra = runtimeOf(a.entry), rb = runtimeOf(b.entry);
          if (late) {
            const la = ra != null && ra > LONG_FORM_MIN ? 1 : 0;
            const lb = rb != null && rb > LONG_FORM_MIN ? 1 : 0;
            if (la !== lb) return la - lb;
          }
          if ((ra == null) !== (rb == null)) return ra == null ? 1 : -1;
          return tie(a, b);
        });
    }

    function take(role, list) {
      for (const x of list) {
        if (taken.has(x.card.f.id)) continue;
        taken.add(x.card.f.id);
        out.push({ role, card: x.card, entry: x.entry, runtime: runtimeOf(x.entry) });
        return;
      }
    }

    const fresh = [];
    for (const c of active) {
      for (const e of c.entries) {
        if (!e.in_main_chain || !airedToday(e, nowMs)) continue;
        if ((progressById.get(e.id) || 0) >= (e.next_episode_number || 0)) continue;
        fresh.push({ card: c, entry: e, at: new Date(e.next_episode_airing_at).getTime() });
      }
    }
    take("fresh", rank(fresh, (a, b) => b.at - a.at));

    const resume = active
      .filter((c) => c.st.id === "watching")
      .map((c) => ({ card: c, entry: currentEntryOf(c.entries, progressById) }))
      .filter((x) => x.entry);
    take("resume", rank(resume, (a, b) => b.card.lastTouch - a.card.lastTouch));

    // « Sortir du lot » : la durée la plus proche du budget PAR EN DESSOUS,
    // pour que « 2 h+ » propose le film et pas l'épisode de 24 min. À budget
    // illimité ou durée inconnue, on retombe sur l'ajout le plus récent.
    const discover = active
      .filter((c) => c.st.id === "to_watch")
      .map((c) => ({ card: c, entry: currentEntryOf(c.entries, progressById) }))
      .filter((x) => x.entry);
    take("discover", rank(discover, (a, b) => {
      const ra = runtimeOf(a.entry), rb = runtimeOf(b.entry);
      if (ra != null && rb != null && ra !== rb) return rb - ra;
      return new Date(b.card.f.added_at || 0) - new Date(a.card.f.added_at || 0);
    }));

    return out;
  }

  // L'heure agit sur le classement ; la charge de la journée n'agit QUE sur
  // cette phrase, jamais sur l'ordre. Compter des réunions ne dit pas
  // honnêtement ce qu'on a envie de regarder — et la carte ne fait aucun
  // commentaire sur le sport ou le sommeil.
  const BUSY_MEETINGS = 5;
  const BUSY_MINUTES = 240;

  function tonightHeadline(picks, ctx, nowMs) {
    if (!picks || !picks.length) return null;
    if (new Date(nowMs).getHours() >= LATE_HOUR) return "Il est tard — plutôt un format court";
    const load = (ctx && ctx.dayLoad) || null;
    if (load && ((load.count || 0) >= BUSY_MEETINGS || (load.total_minutes || 0) >= BUSY_MINUTES)) {
      return "Grosse journée — de quoi décrocher";
    }
    return "Ce soir";
  }
```

Puis ajouter au bloc `api` : `isEvening, pickTonight, tonightHeadline, fitsBudget, airedToday,`

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_mediatheque_view.mjs`
Expected: PASS — tous les tests existants **plus** les 20 nouveaux, exit 0. Si un test antérieur casse, c'est une régression : `pickTonight` ne doit rien modifier d'existant.

- [ ] **Step 5: Commit**

```bash
git add cockpit/lib/mediatheque-view.js tests/test_mediatheque_view.mjs
git commit -m "feat(mediatheque): pickTonight() — trois roles distincts calibres sur le temps dispo"
```

---

## Task 4: `pickRail()` conscient de « Ce soir »

`pickRail()` exclut aujourd'hui la franchise du hero pour qu'un titre n'apparaisse jamais deux fois. Le soir, le hero disparaît au profit de la bande « Ce soir » : l'invariant devient `tonight ∩ rail = ∅`. La signature passe d'un id unique à une liste — explicite plutôt qu'un paramètre polymorphe.

**Files:**
- Modify: `cockpit/lib/mediatheque-view.js` (`pickRail`, ~ligne 134)
- Modify: `cockpit/panel-mediatheque.jsx` (`railCards`, ~ligne 663)
- Test: `tests/test_mediatheque_view.mjs`

**Interfaces:**
- Consumes: `pickTonight()` (Task 3).
- Produces: `pickRail(cards, excludeIds: string[]) -> card[]` — **signature changée**, l'ancien second argument était un id unique ou `null`.

- [ ] **Step 1: Adapter les tests existants et écrire les nouveaux**

Dans `tests/test_mediatheque_view.mjs`, repérer les appels existants à `V.pickRail(...)` et remplacer le second argument par un tableau (`"f-x"` → `["f-x"]`, `null` → `[]`).

Puis ajouter, à la suite des tests de Task 3 :

```javascript
// ── pickRail() × pickTonight() ─────────────────────────────────
check("pickRail: liste d'exclusion vide => tout ce qui est en cours",
  V.pickRail([ONLY_RESUME], []).map((c) => c.f.id), ["r"]);
check("pickRail: exclut chaque id fourni",
  V.pickRail([ONLY_RESUME], ["r"]).map((c) => c.f.id), []);

// L'invariant : aucune franchise proposée par « Ce soir » ne réapparaît au rail.
const RAIL_A = mkCard("ra", "watching", [mkEntry("ra1", { total: 12 })], { lastTouch: 9 });
const RAIL_B = mkCard("rb", "watching", [mkEntry("rb1", { total: 12 })], { lastTouch: 8 });
const PROG_RAIL = new Map([["ra1", 3], ["rb1", 3]]);
const T_RAIL = V.pickTonight([RAIL_A, RAIL_B], PROG_RAIL, EMPTY_CTX, at(21));
const RAIL_OUT = V.pickRail([RAIL_A, RAIL_B], T_RAIL.map((p) => p.card.f.id));
check("invariant: tonight ∩ rail = vide",
  RAIL_OUT.filter((c) => T_RAIL.some((p) => p.card.f.id === c.f.id)).length, 0);
check("invariant: le rail garde bien l'autre franchise",
  RAIL_OUT.map((c) => c.f.id), ["rb"]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_mediatheque_view.mjs`
Expected: FAIL sur `pickRail: exclut chaque id fourni` — l'implémentation compare `c.f.id !== excludeIds` où `excludeIds` est un tableau, donc n'exclut rien.

- [ ] **Step 3: Write minimal implementation**

Dans `cockpit/lib/mediatheque-view.js`, remplacer `pickRail` et son commentaire :

```javascript
  // ── Rail « Continuer à regarder » ───────────────────────────
  // Les franchises où il reste des épisodes SORTIS non vus, privées de celles
  // déjà mises en avant plus haut dans la page : le hero en journée, les
  // propositions de « Ce soir » le soir. Un même titre ne doit jamais
  // apparaître deux fois — invariant verrouillé par un test dédié.
  function pickRail(cards, excludeIds) {
    const skip = new Set(excludeIds || []);
    return cards
      .filter((c) => !c.f.shelved && c.st.id === "watching" && !skip.has(c.f.id))
      .sort((a, b) => b.lastTouch - a.lastTouch);
  }
```

- [ ] **Step 4: Adapter l'appelant**

Dans `cockpit/panel-mediatheque.jsx`, remplacer le `useMdtMemo` de `railCards` (~ligne 661-664) :

```jsx
  // Un même titre ne doit jamais apparaître deux fois : le rail retire ce que
  // la page met déjà en avant — le hero en journée, « Ce soir » après 18 h.
  const railCards = useMdtMemo(
    () => window.mdtView.pickRail(cards, evening
      ? tonight.map((p) => p.card.f.id)
      : (hero && hero.card ? [hero.card.f.id] : [])),
    [cards, hero, tonight, evening]);
```

`evening` et `tonight` sont introduits en Task 5 — à ce stade, ajouter juste au-dessus les deux constantes provisoires pour que le panel reste fonctionnel :

```jsx
  const evening = false;
  const tonight = [];
```

- [ ] **Step 5: Run test to verify it passes**

Run: `node tests/test_mediatheque_view.mjs`
Expected: PASS, exit 0.

- [ ] **Step 6: Commit**

```bash
git add cockpit/lib/mediatheque-view.js cockpit/panel-mediatheque.jsx tests/test_mediatheque_view.mjs
git commit -m "refactor(mediatheque): pickRail() prend une liste d'exclusion, invariant tonight ∩ rail"
```

---

## Task 5: La bande `<MdtTonight>`

De 18 h à 2 h, elle **remplace** `<MdtHero>`. Deux surfaces de décision qui se disputent la même place à 22 h, c'est une de trop.

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx`
- Modify: `cockpit/lib/data-loader.js`
- Modify: `cockpit/styles-mediatheque.css`
- Modify: `docs/telemetry.md`, `docs/specs/tab-mediatheque.md`, `docs/specs/index.json`
- Run: `node scripts/sync-sw.mjs`

**Interfaces:**
- Consumes: `window.mdtView.{isEvening, pickTonight, tonightHeadline, nextEpLabel}` (Tasks 3-4).
- Produces: composant `<MdtTonight>`, clé localStorage `mdt.tonightBudget` au format `{"d":"2026-07-25","b":60}`, champ `MEDIATHEQUE_DATA.dayLoad`.

- [ ] **Step 0: Charger la charge de la journée**

`activity_briefs` n'est chargé nulle part côté front — sans ce fetch, `tonightHeadline`
n'atteindrait jamais sa branche « grosse journée ». Dans `cockpit/lib/data-loader.js`,
ajouter au bloc `T2` (à côté de `media_progress`, ~ligne 1288) :

```javascript
    async activity_brief_today(){
      const day = new Date().toISOString().slice(0, 10);
      return once("activity_brief_today", () =>
        q("activity_briefs", `date=eq.${day}&select=stats&limit=1`));
    },
```

Puis dans le `case "mediatheque"` de `loadPanel` (~ligne 4729), ajouter la promesse au
`Promise.all` existant, **avec le même `.catch` que ses voisines** — l'observer est local
et peut n'avoir rien écrit :

```javascript
          T2.activity_brief_today().catch(() => []),
```

et, à l'assemblage de la shape :

```javascript
        // Charge de la journée : ne module QUE la phrase d'accroche de « Ce soir ».
        // Absente (observer éteint), la carte s'affiche identiquement.
        dayLoad: (briefRows && briefRows[0] && briefRows[0].stats && briefRows[0].stats.meetings) || null,
```

- [ ] **Step 1: Budget mémorisé par session du soir**

Dans `cockpit/panel-mediatheque.jsx`, au-dessus de `function PanelMediatheque` :

```jsx
// Le budget est daté du jour de DÉBUT de session, pas du jour calendaire :
// entre minuit et 2 h on est encore dans la soirée de la veille. Sans ça,
// choisir « 2 h+ » à 23 h 50 se réinitialiserait dix minutes plus tard, en
// plein film.
const MDT_BUDGET_KEY = "mdt.tonightBudget";

function mdtSessionDay(nowMs) {
  const d = new Date(nowMs);
  if (d.getHours() < 2) d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function mdtReadBudget(nowMs) {
  try {
    const raw = JSON.parse(localStorage.getItem(MDT_BUDGET_KEY) || "null");
    if (raw && raw.d === mdtSessionDay(nowMs)) return raw.b;
  } catch (_) { /* clé corrompue : on repart du défaut */ }
  return 60;
}

function mdtWriteBudget(b, nowMs) {
  try { localStorage.setItem(MDT_BUDGET_KEY, JSON.stringify({ d: mdtSessionDay(nowMs), b })); }
  catch (_) { /* quota plein : le budget vit alors le temps du rendu */ }
}
```

- [ ] **Step 2: Le composant**

Toujours dans `cockpit/panel-mediatheque.jsx`, juste avant `function MdtRail` :

```jsx
const MDT_BUDGETS = [
  { value: 30, label: "30 min" },
  { value: 60, label: "1 h" },
  { value: null, label: "2 h+" },
];

const MDT_ROLE_LABEL = {
  fresh: "Ça vient de sortir",
  resume: "Reprendre",
  discover: "Sortir du lot",
};

function MdtTonight({ picks, headline, budget, onBudget, progressById, onOpen, onProgress }) {
  return (
    <section className="mdt-tonight">
      <header className="mdt-tonight-head">
        <h2 className="mdt-tonight-title">{headline || "Ce soir"}</h2>
        <div className="mdt-tonight-budgets" role="group" aria-label="Temps disponible">
          {MDT_BUDGETS.map((b) => (
            <button key={String(b.value)} type="button"
              className={"mdt-budget" + (b.value === budget ? " is-active" : "")}
              aria-pressed={b.value === budget}
              onClick={() => onBudget(b.value)}>{b.label}</button>
          ))}
        </div>
      </header>

      {picks.length === 0 ? (
        <div className="mdt-tonight-empty">
          <p>Rien qui rentre dans {budget === null ? "ta soirée" : MDT_BUDGETS.find((b) => b.value === budget).label}.</p>
          {budget !== null && (
            <button type="button" className="mdt-tonight-widen" onClick={() => onBudget(null)}>
              Élargir à 2 h+
            </button>
          )}
        </div>
      ) : (
        <ul className="mdt-tonight-list">
          {picks.map((p) => {
            const watched = progressById.get(p.entry.id) || 0;
            return (
              <li key={p.role} className="mdt-tonight-card">
                <button type="button" className="mdt-tonight-cover"
                  onClick={() => onOpen(p.card.f)}
                  aria-label={p.card.f.title_english || p.card.f.title_romaji}>
                  {p.card.f.cover_url
                    ? <img src={p.card.f.cover_url} alt="" loading="lazy" />
                    : <span className="mdt-tonight-nocover" aria-hidden="true" />}
                </button>
                <div className="mdt-tonight-meta">
                  <span className="mdt-tonight-role">{MDT_ROLE_LABEL[p.role]}</span>
                  <span className="mdt-tonight-name">
                    {p.card.f.title_english || p.card.f.title_romaji}
                  </span>
                  <span className="mdt-tonight-sub">
                    {window.mdtView.nextEpLabel(p.entry, watched)}
                    {p.runtime != null ? ` · ${p.runtime} min` : ""}
                  </span>
                  <button type="button" className="mdt-tonight-cta"
                    onClick={() => {
                      window.track && window.track("mediatheque_tonight_pick", {
                        role: p.role,
                        media_type: p.card.f.media_type || "anime",
                        runtime_minutes: p.runtime,
                        budget_min: budget,
                      });
                      onProgress(p.entry, watched + 1);
                    }}>
                    {p.role === "discover" ? "Commencer" : "+1 épisode"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Brancher dans `PanelMediatheque`**

Remplacer les deux constantes provisoires posées en Task 4 (`const evening = false;` / `const tonight = [];`) par :

```jsx
  const [budget, setBudget] = useMdtState(() => mdtReadBudget(Date.now()));
  const evening = useMdtMemo(() => window.mdtView.isEvening(Date.now()), [tick]);
  const dayLoad = (D.dayLoad || null);

  const tonight = useMdtMemo(
    () => (evening ? window.mdtView.pickTonight(cards, progressById, { budgetMin: budget, dayLoad }, Date.now()) : []),
    [evening, cards, progressById, budget, dayLoad, tick]);

  const tonightHeadline = useMdtMemo(
    () => window.mdtView.tonightHeadline(tonight, { budgetMin: budget, dayLoad }, Date.now()),
    [tonight, budget, dayLoad, tick]);

  function pickBudget(value) {
    setBudget(value);
    mdtWriteBudget(value, Date.now());
    window.track && window.track("mediatheque_tonight_budget", { budget_min: value, candidates: tonight.length });
  }
```

Utiliser les mêmes alias que le reste du fichier (`useMdtState` / `useMdtMemo`) ; s'ils n'existent pas encore pour `useState`, l'ajouter au même endroit que `useMdtMemo` est déclaré.

- [ ] **Step 4: Le rendu — la bande remplace le hero**

Remplacer le bloc `{!queryActive && (<MdtHero … />)}` (~ligne 818) par :

```jsx
      {!queryActive && evening && (
        <MdtTonight picks={tonight} headline={tonightHeadline}
          budget={budget} onBudget={pickBudget} progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress} />
      )}

      {!queryActive && !evening && (
        <MdtHero hero={hero} progressById={progressById}
          onOpen={(fr) => setFiche({ mode: "library", franchiseId: fr.id })}
          onProgress={writeProgress} />
      )}
```

Puis, juste après le `useMdtMemo` de `tonightHeadline`, l'émission de l'état vide :

```jsx
  useMdtEffect(() => {
    if (evening && !tonight.length) {
      window.track && window.track("mediatheque_tonight_empty",
        { budget_min: budget, hour: new Date().getHours() });
    }
  }, [evening, tonight.length, budget]);
```

- [ ] **Step 5: Styles**

Dans `cockpit/styles-mediatheque.css`, à la suite des styles `.mdt-rail*` :

```css
/* ── « Ce soir » ─────────────────────────────────────────────
   Remplace le hero de 18 h à 2 h. Trois cartes maximum, souvent moins :
   la grille se contente de ce qu'elle reçoit plutôt que d'imposer 3 colonnes
   qui laisseraient des trous. */
.mdt-tonight { margin: 0 0 28px; }
.mdt-tonight-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 14px; }
.mdt-tonight-title { font-size: 1.5rem; margin: 0; }
.mdt-tonight-budgets { display: flex; gap: 6px; }
.mdt-budget { padding: 5px 12px; border-radius: 999px; border: 1px solid var(--border); background: transparent; color: var(--text-dim); cursor: pointer; font-size: .82rem; }
.mdt-budget.is-active { background: var(--accent); border-color: var(--accent); color: #fff; }
.mdt-tonight-list { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 16px; list-style: none; margin: 0; padding: 0; }
.mdt-tonight-card { display: flex; gap: 14px; align-items: flex-start; background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 12px; min-width: 0; }
.mdt-tonight-cover { flex: 0 0 78px; padding: 0; border: 0; background: none; cursor: pointer; }
.mdt-tonight-cover img { width: 78px; height: 110px; object-fit: cover; border-radius: 8px; display: block; }
.mdt-tonight-nocover { display: block; width: 78px; height: 110px; border-radius: 8px; background: var(--border); }
/* min-width:0 obligatoire : un flex item vaut min-content par défaut, et un
   titre long imposerait sa largeur à toute la carte (bug vécu sur le rail). */
.mdt-tonight-meta { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.mdt-tonight-role { font-size: .7rem; text-transform: uppercase; letter-spacing: .06em; color: var(--accent); }
.mdt-tonight-name { font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mdt-tonight-sub { font-size: .82rem; color: var(--text-dim); }
.mdt-tonight-cta { margin-top: 6px; align-self: flex-start; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--accent); background: var(--accent); color: #fff; cursor: pointer; font-size: .84rem; }
.mdt-tonight-empty { padding: 20px; border: 1px dashed var(--border); border-radius: 12px; color: var(--text-dim); }
.mdt-tonight-widen { margin-top: 10px; padding: 6px 14px; border-radius: 8px; border: 1px solid var(--border); background: transparent; color: var(--text); cursor: pointer; }
```

Si les variables CSS diffèrent dans le fichier (`--surface`, `--border`, `--accent`, `--text-dim`, `--text`), reprendre celles réellement utilisées par `.mdt-rail-card` — ne pas en inventer.

- [ ] **Step 6: Bump de version des assets**

Dans `index.html`, incrémenter le `?v=` de `cockpit/panel-mediatheque.jsx` et `cockpit/styles-mediatheque.css`.

- [ ] **Step 7: Documenter — même commit, règles cardinales**

`docs/telemetry.md`, à la suite des lignes `mediatheque_*` :

```markdown
| `mediatheque_tonight_budget` | `{budget_min, candidates}` | `cockpit/panel-mediatheque.jsx::pickBudget()` au tap sur une pastille |
| `mediatheque_tonight_pick` | `{role, media_type, runtime_minutes, budget_min}` | `cockpit/panel-mediatheque.jsx::MdtTonight` au clic sur un CTA |
| `mediatheque_tonight_empty` | `{budget_min, hour}` | `cockpit/panel-mediatheque.jsx::PanelMediatheque` au rendu d'un état vide |
```

`docs/specs/tab-mediatheque.md` : ajouter la bande « Ce soir » dans **Parcours utilisateur** et **Fonctionnalités**, `pickTonight`/`isEvening`/`tonightHeadline` dans le tableau **Front — fonctions JS**, `MdtTonight` dans **Front — structure UI**, les nouveaux cas dans **États & edge cases** (avant 18 h la bande n'est pas rendue ; passage de minuit sans réinitialisation du budget ; `dayLoad` absent), et une entrée datée en **Dernière MAJ**.

`docs/specs/index.json` : bump `last_updated` de `tab-mediatheque` à `2026-07-25`.

`docs/architecture/dependencies.yaml` : le panel `mediatheque` lit désormais `activity_briefs` (Step 0). L'ajouter à son `reads:` — `validate-arch` est bloquant et compare la topologie déclarée aux fetchs réels.

- [ ] **Step 8: Service worker et vérifications**

```bash
node scripts/sync-sw.mjs
node tests/test_mediatheque_view.mjs
PYTHONUTF8=1 python scripts/validate_spec.py
python scripts/validate_arch.py
```

Expected: tests verts. `validate_spec.py` peut sortir en code 1 sur un `UnicodeEncodeError` au `print` final sous Windows alors que la validation est passée — c'est connu, d'où `PYTHONUTF8=1`.

- [ ] **Step 9: Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/lib/data-loader.js cockpit/styles-mediatheque.css index.html sw.js docs/telemetry.md docs/specs/tab-mediatheque.md docs/specs/index.json docs/architecture/dependencies.yaml
git commit -m "feat(mediatheque): bande « Ce soir » qui remplace le hero de 18 h a 2 h"
```

- [ ] **Step 10: Vérifier en prod**

Push sur `main`, hard-refresh de la GitHub Page, ouvrir la Médiathèque après 18 h. Contrôler : la bande remplace le hero, les trois pastilles répondent, aucune franchise de la bande n'apparaît dans le rail, et un budget 30 min ne propose aucun film.

---

# Phase 2 — Seconde source : TMDB

## Task 6: Socle partagé des deux syncs

`diff_events()` compare des lignes déjà normalisées, pas des payloads AniList : elle est source-agnostique telle quelle. On l'extrait plutôt que de la dupliquer.

**Files:**
- Create: `pipelines/media_tracker_common.py`
- Modify: `pipelines/anime_tracker_sync.py` (retire les fonctions déplacées, importe)
- Test: `tests/test_media_tracker_common.py` (create)

**Interfaces:**
- Produces: `sb_env()`, `sb_get(url, headers, table, qs)`, `sb_upsert(url, headers, table, rows, on_conflict, ignore_dupes=False)`, `sb_patch(url, headers, table, qs, body)`, `diff_events(franchise, old_by_source_id, fresh_rows) -> list[tuple[str, str, str|None, int]]` — tuples `(event_type, title, event_date, source_id)`.

- [ ] **Step 1: Write the failing test**

Créer `tests/test_media_tracker_common.py` :

```python
"""diff_events est source-agnostique : elle ne lit que des lignes normalisées.
Run: python tests/test_media_tracker_common.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from media_tracker_common import diff_events

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


FR = {"id": "f1", "title_english": "Show"}


def row(sid, status, start=None, title="S1"):
    return {"source_id": sid, "airing_status": status, "start_date": start, "title_english": title}


check("entree inedite => new_entry",
      [e[0] for e in diff_events(FR, {}, [row(1, "NOT_YET_RELEASED")])],
      ["new_entry"])
check("passage a RELEASING => airing_started",
      [e[0] for e in diff_events(FR, {1: row(1, "NOT_YET_RELEASED")}, [row(1, "RELEASING")])],
      ["airing_started"])
check("date qui apparait => date_announced",
      [e[0] for e in diff_events(FR, {1: row(1, "NOT_YET_RELEASED")},
                                 [row(1, "NOT_YET_RELEASED", "2026-10-01")])],
      ["date_announced"])
check("rien ne bouge => aucun evenement",
      diff_events(FR, {1: row(1, "RELEASING")}, [row(1, "RELEASING")]), [])
check("un report de date ne redeclenche rien",
      diff_events(FR, {1: row(1, "NOT_YET_RELEASED", "2026-10-01")},
                  [row(1, "NOT_YET_RELEASED", "2026-11-01")]), [])

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
```

- [ ] **Step 2: Run test to verify it fails**

Run: `python tests/test_media_tracker_common.py`
Expected: FAIL — `ModuleNotFoundError: No module named 'media_tracker_common'`

- [ ] **Step 3: Extraire**

Créer `pipelines/media_tracker_common.py` en **déplaçant sans les réécrire** depuis `anime_tracker_sync.py` : `sb_env`, `sb_get`, `sb_upsert`, `sb_patch` (~lignes 257-286) et `diff_events` (~lignes 288-305). En-tête du module :

```python
"""Socle partagé des syncs de la médiathèque (AniList, TMDB).

Ces fonctions ne connaissent AUCUNE source : diff_events compare des lignes
déjà normalisées au contrat commun (airing_status, start_date, source_id),
et les helpers Supabase sont du transport pur. Toute logique spécifique à une
API reste dans le pipeline qui la porte.
"""
```

Puis dans `anime_tracker_sync.py`, retirer les définitions déplacées et ajouter en tête des imports :

```python
from media_tracker_common import sb_env, sb_get, sb_upsert, sb_patch, diff_events
```

Si les cinq tests de `diff_events` échouent sur un comportement inattendu, **ne pas modifier la fonction** : ajuster le test pour décrire le comportement réel, puis noter l'écart. Cette tâche est une extraction, pas une réécriture.

- [ ] **Step 4: Run tests to verify they pass**

```bash
python tests/test_media_tracker_common.py
python tests/test_source_scoping.py
python pipelines/anime_tracker_sync.py --dry-run
```

Expected: les deux tests verts, et le dry-run identique à celui de la Task 1 (44 franchises).

- [ ] **Step 5: Commit**

```bash
git add pipelines/media_tracker_common.py pipelines/anime_tracker_sync.py tests/test_media_tracker_common.py
git commit -m "refactor(mediatheque): extrait le socle partage des syncs (diff_events + helpers Supabase)"
```

---

## Task 7: Client TMDB et sa traduction

Le contrat de données reste celui d'AniList. TMDB y est traduit ici, une fois.

**Files:**
- Create: `cockpit/lib/tmdb.js`
- Create: `tests/test_tmdb_map.mjs`

**Interfaces:**
- Consumes: rien des tâches précédentes (module autonome).
- Produces sur `window.tmdb` :
  - `mapStatus(tmdbStatus) -> string`
  - `toFranchiseRow(detail, kind: "movie"|"tv") -> object`
  - `toEntryRows(detail, kind) -> object[]`
  - `search(q, apiKey) -> Promise<Array<{tmdb_id, kind, title, year, poster_url, popularity}>>`
  - `fetchFranchiseLive(tmdbId, kind, apiKey) -> Promise<{detail, kind}>`

- [ ] **Step 1: Write the failing test**

Créer `tests/test_tmdb_map.mjs` :

```javascript
// Tests de la traduction TMDB → contrat AniList.
// Run: node tests/test_tmdb_map.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const T = require(join(here, "..", "cockpit", "lib", "tmdb.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

// ── mapStatus ──────────────────────────────────────────────────
check("status: Returning Series", T.mapStatus("Returning Series"), "RELEASING");
check("status: In Production", T.mapStatus("In Production"), "RELEASING");
check("status: Ended", T.mapStatus("Ended"), "FINISHED");
check("status: Canceled", T.mapStatus("Canceled"), "CANCELLED");
check("status: Planned", T.mapStatus("Planned"), "NOT_YET_RELEASED");
check("status: Rumored", T.mapStatus("Rumored"), "NOT_YET_RELEASED");
check("status: inconnu => FINISHED (defaut sur), pas null", T.mapStatus("Zorglub"), "FINISHED");

// ── Série ──────────────────────────────────────────────────────
const TV = {
  id: 1396, name: "Breaking Bad", original_name: "Breaking Bad",
  overview: "Un prof de chimie.", genres: [{ name: "Drame" }],
  poster_path: "/p.jpg", backdrop_path: "/b.jpg",
  status: "Returning Series", episode_run_time: [47],
  next_episode_to_air: { episode_number: 3, air_date: "2026-08-02" },
  seasons: [
    { season_number: 0, episode_count: 4, air_date: "2008-01-01", id: 900 },
    { season_number: 1, episode_count: 7, air_date: "2008-01-20", id: 901 },
    { season_number: 2, episode_count: 13, air_date: "2009-03-08", id: 902 },
  ],
};

const TV_ROWS = T.toEntryRows(TV, "tv");
check("tv: une entree par saison, saison 0 comprise", TV_ROWS.length, 3);
check("tv: saison 0 => special hors chaine principale",
  TV_ROWS.filter((r) => r.kind === "special").map((r) => r.in_main_chain), [false]);
check("tv: saisons numerotees => kind season", TV_ROWS.filter((r) => r.kind === "season").length, 2);
check("tv: source discrimine le namespace des saisons", TV_ROWS[0].source, "tmdb_season");
check("tv: episodes_total depuis episode_count",
  TV_ROWS.find((r) => r.season_number === 2).episodes_total, 13);
check("tv: runtime depuis episode_run_time",
  TV_ROWS.find((r) => r.season_number === 2).runtime_minutes, 47);

// Le status TMDB est au niveau SÉRIE : seule la dernière saison en hérite.
check("tv: la derniere saison herite du statut de la serie",
  TV_ROWS.find((r) => r.season_number === 2).airing_status, "RELEASING");
check("tv: les saisons precedentes sont FINISHED",
  TV_ROWS.find((r) => r.season_number === 1).airing_status, "FINISHED");
check("tv: next_episode accroche a la seule saison en diffusion",
  TV_ROWS.filter((r) => r.next_episode_number != null).map((r) => r.season_number), [2]);
check("tv: next_episode_airing_at au format ISO",
  TV_ROWS.find((r) => r.season_number === 2).next_episode_airing_at.slice(0, 10), "2026-08-02");

const TV_FR = T.toFranchiseRow(TV, "tv");
check("tv: media_type", TV_FR.media_type, "tv");
check("tv: source", TV_FR.source, "tmdb_tv");
check("tv: source_root_id", TV_FR.source_root_id, 1396);
check("tv: cover_url prefixee", TV_FR.cover_url, "https://image.tmdb.org/t/p/w342/p.jpg");
check("tv: banner_url prefixee", TV_FR.banner_url, "https://image.tmdb.org/t/p/w780/b.jpg");
check("tv: genres aplatis", TV_FR.genres, ["Drame"]);

// ── Film ───────────────────────────────────────────────────────
const MOVIE = {
  id: 550, title: "Fight Club", original_title: "Fight Club",
  overview: "Un narrateur insomniaque.", genres: [{ name: "Drame" }],
  poster_path: "/f.jpg", backdrop_path: null,
  status: "Released", release_date: "1999-10-15", runtime: 139,
};
const MOVIE_ROWS = T.toEntryRows(MOVIE, "movie");
check("film: une seule entree", MOVIE_ROWS.length, 1);
check("film: kind movie", MOVIE_ROWS[0].kind, "movie");
check("film: episodes_total = 1", MOVIE_ROWS[0].episodes_total, 1);
check("film: source", MOVIE_ROWS[0].source, "tmdb_movie");
check("film: runtime", MOVIE_ROWS[0].runtime_minutes, 139);
check("film sorti => FINISHED", MOVIE_ROWS[0].airing_status, "FINISHED");
check("film: dans la chaine principale", MOVIE_ROWS[0].in_main_chain, true);

const FUTURE = { ...MOVIE, status: "Post Production", release_date: "2027-03-01" };
check("film a sortir => NOT_YET_RELEASED", T.toEntryRows(FUTURE, "movie")[0].airing_status, "NOT_YET_RELEASED");
check("film a sortir => start_date renseignee pour l'agenda",
  T.toEntryRows(FUTURE, "movie")[0].start_date, "2027-03-01");

// ── Cas dégradés ───────────────────────────────────────────────
check("serie sans saison => aucune entree, pas de crash",
  T.toEntryRows({ ...TV, seasons: [] }, "tv"), []);
check("poster absent => cover_url null, pas une URL cassee",
  T.toFranchiseRow({ ...TV, poster_path: null }, "tv").cover_url, null);
check("film sans runtime => null, jamais 0",
  T.toEntryRows({ ...MOVIE, runtime: null }, "movie")[0].runtime_minutes, null);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node tests/test_tmdb_map.mjs`
Expected: FAIL — `Cannot find module '.../cockpit/lib/tmdb.js'`

- [ ] **Step 3: Write minimal implementation**

Créer `cockpit/lib/tmdb.js` :

```javascript
// cockpit/lib/tmdb.js
// Client TMDB + traduction vers le CONTRAT ANILIST (airing_status,
// episodes_total, next_episode_number…). Toute la connaissance de TMDB est
// enfermée ici : released(), status(), pickHero() et buildWeek() ignorent
// qu'une seconde source existe.
// Script classique compatible Babel standalone : expose window.tmdb.
// Guard module.exports => testable sous node (tests/test_tmdb_map.mjs).
(function () {

  const BASE = "https://api.themoviedb.org/3";
  const POSTER = "https://image.tmdb.org/t/p/w342";
  const BACKDROP = "https://image.tmdb.org/t/p/w780";
  const LANG = "fr-FR";

  // TMDB expose son statut au niveau SÉRIE (ou film), jamais saison.
  // Défaut FINISHED plutôt que null : une valeur inconnue ne doit pas faire
  // croire à released() qu'une saison diffuse encore.
  const STATUS = {
    "Returning Series": "RELEASING",
    "In Production": "RELEASING",
    "Ended": "FINISHED",
    "Released": "FINISHED",
    "Canceled": "CANCELLED",
    "Cancelled": "CANCELLED",
    "Planned": "NOT_YET_RELEASED",
    "Rumored": "NOT_YET_RELEASED",
    "Post Production": "NOT_YET_RELEASED",
  };

  function mapStatus(s) { return STATUS[s] || "FINISHED"; }

  function img(path, base) { return path ? base + path : null; }

  function strip(text) {
    if (!text) return null;
    return String(text).replace(/<[^>]+>/g, "").trim().slice(0, 2000) || null;
  }

  function toFranchiseRow(detail, kind) {
    const isTv = kind === "tv";
    return {
      media_type: isTv ? "tv" : "movie",
      source: isTv ? "tmdb_tv" : "tmdb_movie",
      source_root_id: detail.id,
      title_romaji: null,
      title_english: isTv ? detail.name : detail.title,
      title_native: isTv ? detail.original_name : detail.original_title,
      synopsis: strip(detail.overview),
      genres: (detail.genres || []).map((g) => g.name),
      cover_url: img(detail.poster_path, POSTER),
      banner_url: img(detail.backdrop_path, BACKDROP),
    };
  }

  function movieRows(detail) {
    const status = mapStatus(detail.status);
    return [{
      source: "tmdb_movie",
      source_id: detail.id,
      in_main_chain: true,
      kind: "movie",
      season_number: null,
      title_romaji: null,
      title_english: detail.title,
      title_native: detail.original_title,
      format: "MOVIE",
      airing_status: status,
      episodes_total: 1,
      start_date: detail.release_date || null,
      end_date: status === "FINISHED" ? (detail.release_date || null) : null,
      next_episode_number: null,
      next_episode_airing_at: null,
      cover_url: img(detail.poster_path, POSTER),
      runtime_minutes: detail.runtime != null ? detail.runtime : null,
      sort_order: 1,
      updated_at: new Date().toISOString(),
    }];
  }

  function tvRows(detail) {
    const seasons = (detail.seasons || []).slice()
      .sort((a, b) => (a.season_number || 0) - (b.season_number || 0));
    if (!seasons.length) return [];

    const numbered = seasons.filter((s) => (s.season_number || 0) >= 1);
    const lastNumber = numbered.length ? numbered[numbered.length - 1].season_number : null;
    const showStatus = mapStatus(detail.status);
    const runtime = (detail.episode_run_time && detail.episode_run_time[0]) || null;
    const next = detail.next_episode_to_air || null;

    return seasons.map((s, i) => {
      const isSpecial = (s.season_number || 0) === 0;
      // Le statut de la série ne vaut que pour sa DERNIÈRE saison : sans ça,
      // released() lirait next_episode_number - 1 sur une saison ancienne et
      // sous-compterait ses épisodes.
      const isLast = !isSpecial && s.season_number === lastNumber;
      const status = isSpecial ? "FINISHED" : (isLast ? showStatus : "FINISHED");
      const airing = isLast && status === "RELEASING" && next;
      return {
        source: "tmdb_season",
        source_id: s.id,
        in_main_chain: !isSpecial,
        kind: isSpecial ? "special" : "season",
        season_number: isSpecial ? null : s.season_number,
        title_romaji: null,
        title_english: s.name || (isSpecial ? "Spéciaux" : `Saison ${s.season_number}`),
        title_native: null,
        format: "TV",
        airing_status: status,
        episodes_total: s.episode_count != null ? s.episode_count : null,
        start_date: s.air_date || null,
        end_date: null,
        next_episode_number: airing ? next.episode_number : null,
        next_episode_airing_at: airing && next.air_date
          ? new Date(next.air_date + "T00:00:00Z").toISOString() : null,
        cover_url: img(s.poster_path, POSTER) || img(detail.poster_path, POSTER),
        runtime_minutes: runtime,
        sort_order: isSpecial ? 999 : (s.season_number || i + 1),
        updated_at: new Date().toISOString(),
      };
    });
  }

  function toEntryRows(detail, kind) {
    return kind === "tv" ? tvRows(detail) : movieRows(detail);
  }

  // ── Réseau ──────────────────────────────────────────────────
  async function get(path, apiKey, params) {
    const qs = new URLSearchParams(Object.assign({ api_key: apiKey, language: LANG }, params || {}));
    const res = await fetch(`${BASE}${path}?${qs}`);
    if (res.status === 429) {
      const wait = Number(res.headers.get("Retry-After") || 1);
      await new Promise((r) => setTimeout(r, wait * 1000));
      return get(path, apiKey, params);
    }
    if (!res.ok) throw new Error("TMDB " + res.status + " sur " + path);
    return res.json();
  }

  const searchCache = new Map();

  // /search/multi renvoie aussi des personnes : on ne garde que film et série.
  async function search(q, apiKey) {
    const key = q.trim().toLowerCase();
    if (searchCache.has(key)) return searchCache.get(key);
    const data = await get("/search/multi", apiKey, { query: q, include_adult: "false" });
    const out = (data.results || [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 12)
      .map((r) => ({
        tmdb_id: r.id,
        kind: r.media_type,
        title: r.media_type === "tv" ? r.name : r.title,
        year: (r.first_air_date || r.release_date || "").slice(0, 4) || null,
        poster_url: img(r.poster_path, POSTER),
        popularity: r.popularity || 0,
      }));
    searchCache.set(key, out);
    return out;
  }

  const detailCache = new Map();

  async function fetchFranchiseLive(tmdbId, kind, apiKey) {
    const key = kind + ":" + tmdbId;
    if (detailCache.has(key)) return detailCache.get(key);
    const detail = await get(`/${kind}/${tmdbId}`, apiKey, {});
    const out = { detail, kind };
    detailCache.set(key, out);
    return out;
  }

  const api = { mapStatus, toFranchiseRow, toEntryRows, search, fetchFranchiseLive };
  if (typeof window !== "undefined") window.tmdb = Object.assign(window.tmdb || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node tests/test_tmdb_map.mjs`
Expected: PASS — 28 lignes `ok`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add cockpit/lib/tmdb.js tests/test_tmdb_map.mjs
git commit -m "feat(mediatheque): client TMDB traduit dans le contrat AniList"
```

---

## Task 8: Pipeline `tmdb_tracker_sync.py`

**Files:**
- Create: `pipelines/tmdb_tracker_sync.py`
- Create: `tests/test_tmdb_map.py`
- Create: `.github/workflows/tmdb-tracker-sync.yml`
- Modify: `docs/secrets.md`, `docs/architecture/pipelines.yaml`, `docs/architecture/dependencies.yaml`

**Interfaces:**
- Consumes: `media_tracker_common.{sb_env, sb_get, sb_upsert, sb_patch, diff_events}` (Task 6) ; le mapping de la Task 7, **réimplémenté en Python** (le pipeline ne peut pas importer un module JS — duplication assumée du même contrat, verrouillée par deux jeux de tests jumeaux).
- Produces: `map_status(s)`, `to_franchise_row(detail, kind)`, `to_entry_rows(detail, kind)` — mêmes noms et mêmes sorties que leurs jumelles JS de la Task 7, aux conventions Python près (`None` au lieu de `null`, `False` au lieu de `false`).

- [ ] **Step 1: Écrire le pipeline**

Créer `pipelines/tmdb_tracker_sync.py`. Structure calquée sur `anime_tracker_sync.py` :

```python
#!/usr/bin/env python3
"""TMDB tracker sync — rafraîchit les franchises films/séries de la médiathèque.

Jumeau de anime_tracker_sync.py pour la source TMDB. La traduction vers le
contrat AniList (airing_status, episodes_total, next_episode_*) duplique
volontairement cockpit/lib/tmdb.js : un pipeline Python ne peut pas importer
un module JS. Les deux implémentations sont verrouillées par leurs tests
respectifs (tests/test_tmdb_map.mjs côté front).

NE PAS confondre avec pipelines/tmdb_sync.py, qui alimente anime_articles
pour le calendrier de l'onglet Veille. Les deux ne partagent que le secret.

Usage:
    TMDB_API_KEY=xxx SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \\
        python pipelines/tmdb_tracker_sync.py [--dry-run]
"""
```

Corps du module :

```python
from __future__ import annotations
import argparse
import os
import sys
import time
from datetime import datetime, timezone

import requests

from media_tracker_common import sb_env, sb_get, sb_upsert, sb_patch, diff_events

BASE = "https://api.themoviedb.org/3"
POSTER = "https://image.tmdb.org/t/p/w342"
BACKDROP = "https://image.tmdb.org/t/p/w780"
LANG = "fr-FR"
THROTTLE_S = 0.25

STATUS = {
    "Returning Series": "RELEASING",
    "In Production": "RELEASING",
    "Ended": "FINISHED",
    "Released": "FINISHED",
    "Canceled": "CANCELLED",
    "Cancelled": "CANCELLED",
    "Planned": "NOT_YET_RELEASED",
    "Rumored": "NOT_YET_RELEASED",
    "Post Production": "NOT_YET_RELEASED",
}


def map_status(s):
    # Défaut FINISHED plutôt que None : une valeur inconnue ne doit pas faire
    # croire à released() qu'une saison diffuse encore.
    return STATUS.get(s, "FINISHED")


def img(path, base):
    return base + path if path else None


def strip_synopsis(text):
    if not text:
        return None
    return text.strip()[:2000] or None


# Toute lecture est bornée aux sources TMDB — symétrique de franchises_qs()
# dans anime_tracker_sync.py. Sans ce filtre, ce pipeline enverrait un
# source_root_id AniList à TMDB.
def franchises_qs():
    return ("source=in.(tmdb_movie,tmdb_tv)"
            "&select=id,source,source_root_id,title_english&order=added_at")


def entries_qs():
    return ("source=in.(tmdb_movie,tmdb_season)"
            "&select=id,franchise_id,source_id,airing_status,start_date&order=sort_order")


def to_franchise_row(detail, kind):
    is_tv = kind == "tv"
    return {
        "media_type": "tv" if is_tv else "movie",
        "source": "tmdb_tv" if is_tv else "tmdb_movie",
        "source_root_id": detail["id"],
        "title_romaji": None,
        "title_english": detail.get("name") if is_tv else detail.get("title"),
        "title_native": detail.get("original_name") if is_tv else detail.get("original_title"),
        "synopsis": strip_synopsis(detail.get("overview")),
        "genres": [g["name"] for g in (detail.get("genres") or [])],
        "cover_url": img(detail.get("poster_path"), POSTER),
        "banner_url": img(detail.get("backdrop_path"), BACKDROP),
    }


def _movie_rows(detail):
    status = map_status(detail.get("status"))
    return [{
        "source": "tmdb_movie",
        "source_id": detail["id"],
        "in_main_chain": True,
        "kind": "movie",
        "season_number": None,
        "title_romaji": None,
        "title_english": detail.get("title"),
        "title_native": detail.get("original_title"),
        "format": "MOVIE",
        "airing_status": status,
        "episodes_total": 1,
        "start_date": detail.get("release_date") or None,
        "end_date": detail.get("release_date") if status == "FINISHED" else None,
        "next_episode_number": None,
        "next_episode_airing_at": None,
        "cover_url": img(detail.get("poster_path"), POSTER),
        "runtime_minutes": detail.get("runtime"),
        "sort_order": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }]


def _tv_rows(detail):
    seasons = sorted(detail.get("seasons") or [], key=lambda s: s.get("season_number") or 0)
    if not seasons:
        return []

    numbered = [s for s in seasons if (s.get("season_number") or 0) >= 1]
    last_number = numbered[-1]["season_number"] if numbered else None
    show_status = map_status(detail.get("status"))
    run_times = detail.get("episode_run_time") or []
    runtime = run_times[0] if run_times else None
    nxt = detail.get("next_episode_to_air") or None

    rows = []
    for i, s in enumerate(seasons):
        number = s.get("season_number") or 0
        is_special = number == 0
        # Le status TMDB est au niveau SÉRIE : seule la dernière saison en
        # hérite. Sinon released() lirait next_episode_number - 1 sur une
        # saison ancienne et sous-compterait ses épisodes.
        is_last = not is_special and number == last_number
        status = show_status if is_last else "FINISHED"
        airing = is_last and status == "RELEASING" and nxt
        rows.append({
            "source": "tmdb_season",
            "source_id": s["id"],
            "in_main_chain": not is_special,
            "kind": "special" if is_special else "season",
            "season_number": None if is_special else number,
            "title_romaji": None,
            "title_english": s.get("name") or ("Spéciaux" if is_special else f"Saison {number}"),
            "title_native": None,
            "format": "TV",
            "airing_status": status,
            "episodes_total": s.get("episode_count"),
            "start_date": s.get("air_date") or None,
            "end_date": None,
            "next_episode_number": nxt.get("episode_number") if airing else None,
            "next_episode_airing_at": (
                f"{nxt['air_date']}T00:00:00+00:00" if airing and nxt.get("air_date") else None
            ),
            "cover_url": img(s.get("poster_path"), POSTER) or img(detail.get("poster_path"), POSTER),
            "runtime_minutes": runtime,
            "sort_order": 999 if is_special else (number or i + 1),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        })
    return rows


def to_entry_rows(detail, kind):
    return _tv_rows(detail) if kind == "tv" else _movie_rows(detail)


def tmdb_get(path, api_key):
    for attempt in range(3):
        r = requests.get(f"{BASE}{path}",
                         params={"api_key": api_key, "language": LANG}, timeout=30)
        if r.status_code == 429:
            time.sleep(float(r.headers.get("Retry-After", 1)))
            continue
        r.raise_for_status()
        return r.json()
    raise RuntimeError(f"TMDB: 429 persistant sur {path}")


def run_sync(dry_run):
    api_key = os.environ.get("TMDB_API_KEY")
    if not api_key:
        print("[skip] TMDB_API_KEY absent — rien à faire.")
        return 0

    url, headers = sb_env()
    franchises = sb_get(url, headers, "media_franchises", franchises_qs())
    entries = sb_get(url, headers, "media_entries", entries_qs())

    by_franchise = {}
    for e in entries:
        by_franchise.setdefault(e["franchise_id"], []).append(e)
    print(f"TMDB sync: {len(franchises)} franchises, {len(entries)} entrées, dry_run={dry_run}")

    total_new, total_events = 0, 0
    for fr in franchises:
        name = fr.get("title_english") or fr["id"]
        kind = "tv" if fr["source"] == "tmdb_tv" else "movie"
        try:
            detail = tmdb_get(f"/{kind}/{fr['source_root_id']}", api_key)
        except Exception as exc:
            # Même contrat que le sync anime : une franchise qui échoue est
            # sautée, jamais fatale — elle est rattrapée au prochain run.
            print(f"  WARN {name}: fetch KO ({exc}) — franchise sautée")
            continue
        time.sleep(THROTTLE_S)

        fresh_rows = [{**r, "franchise_id": fr["id"]} for r in to_entry_rows(detail, kind)]
        old_by_sid = {e["source_id"]: e for e in by_franchise.get(fr["id"], [])}
        events = diff_events(fr, old_by_sid, fresh_rows)
        new_count = sum(1 for r in fresh_rows if r["source_id"] not in old_by_sid)
        print(f"  {name}: {len(fresh_rows)} entrées ({new_count} nouvelles), {len(events)} événement(s)")
        total_new += new_count
        total_events += len(events)

        if dry_run:
            for ev in events:
                print(f"    [dry-run] {ev[0]}: {ev[1]}")
            continue

        try:
            saved = sb_upsert(url, headers, "media_entries", fresh_rows, "source,source_id")
            id_by_sid = {r["source_id"]: r["id"] for r in saved}
            release_rows = [{
                "franchise_id": fr["id"],
                "entry_id": id_by_sid.get(sid),
                "event_type": etype,
                "title": title,
                "event_date": edate,
            } for (etype, title, edate, sid) in events if id_by_sid.get(sid)]
            sb_upsert(url, headers, "media_releases", release_rows,
                      "entry_id,event_type", ignore_dupes=True)
            root = to_franchise_row(detail, kind)
            sb_patch(url, headers, "media_franchises", f"id=eq.{fr['id']}", {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "synopsis": root["synopsis"],
                "cover_url": root["cover_url"],
            })
        except Exception as exc:
            print(f"  WARN {name}: écriture Supabase KO ({exc}) — franchise sautée")
            continue

    print(f"\nDone. {total_new} nouvelles entrées, {total_events} événements.")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true")
    sys.exit(run_sync(p.parse_args().dry_run))
```

- [ ] **Step 2: Verrouiller la traduction Python**

La duplication du mapping entre JS et Python est assumée, mais elle ne vaut que si les deux côtés sont testés. Créer `tests/test_tmdb_map.py` — mêmes cas que `tests/test_tmdb_map.mjs`, mêmes attendus :

```python
"""La traduction TMDB cote pipeline doit coller a celle de cockpit/lib/tmdb.js.
Run: python tests/test_tmdb_map.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from tmdb_tracker_sync import map_status, to_entry_rows, to_franchise_row

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


check("status: Returning Series", map_status("Returning Series"), "RELEASING")
check("status: Ended", map_status("Ended"), "FINISHED")
check("status: Canceled", map_status("Canceled"), "CANCELLED")
check("status: Planned", map_status("Planned"), "NOT_YET_RELEASED")
check("status: inconnu => FINISHED, pas None", map_status("Zorglub"), "FINISHED")

TV = {
    "id": 1396, "name": "Breaking Bad", "original_name": "Breaking Bad",
    "overview": "Un prof de chimie.", "genres": [{"name": "Drame"}],
    "poster_path": "/p.jpg", "backdrop_path": "/b.jpg",
    "status": "Returning Series", "episode_run_time": [47],
    "next_episode_to_air": {"episode_number": 3, "air_date": "2026-08-02"},
    "seasons": [
        {"season_number": 0, "episode_count": 4, "air_date": "2008-01-01", "id": 900},
        {"season_number": 1, "episode_count": 7, "air_date": "2008-01-20", "id": 901},
        {"season_number": 2, "episode_count": 13, "air_date": "2009-03-08", "id": 902},
    ],
}
TV_ROWS = to_entry_rows(TV, "tv")
by_season = {r["season_number"]: r for r in TV_ROWS}

check("tv: une entree par saison, saison 0 comprise", len(TV_ROWS), 3)
check("tv: saison 0 => special hors chaine principale",
      [r["in_main_chain"] for r in TV_ROWS if r["kind"] == "special"], [False])
check("tv: source discrimine le namespace des saisons", TV_ROWS[0]["source"], "tmdb_season")
check("tv: episodes_total depuis episode_count", by_season[2]["episodes_total"], 13)
check("tv: runtime depuis episode_run_time", by_season[2]["runtime_minutes"], 47)
check("tv: la derniere saison herite du statut de la serie",
      by_season[2]["airing_status"], "RELEASING")
check("tv: les saisons precedentes sont FINISHED", by_season[1]["airing_status"], "FINISHED")
check("tv: next_episode accroche a la seule saison en diffusion",
      [r["season_number"] for r in TV_ROWS if r["next_episode_number"] is not None], [2])
check("tv: serie sans saison => aucune entree", to_entry_rows({**TV, "seasons": []}, "tv"), [])

TV_FR = to_franchise_row(TV, "tv")
check("tv: media_type", TV_FR["media_type"], "tv")
check("tv: source", TV_FR["source"], "tmdb_tv")
check("tv: cover_url prefixee", TV_FR["cover_url"], "https://image.tmdb.org/t/p/w342/p.jpg")
check("tv: genres aplatis", TV_FR["genres"], ["Drame"])
check("poster absent => None, pas une URL cassee",
      to_franchise_row({**TV, "poster_path": None}, "tv")["cover_url"], None)

MOVIE = {
    "id": 550, "title": "Fight Club", "original_title": "Fight Club",
    "overview": "Un narrateur insomniaque.", "genres": [{"name": "Drame"}],
    "poster_path": "/f.jpg", "backdrop_path": None,
    "status": "Released", "release_date": "1999-10-15", "runtime": 139,
}
M_ROWS = to_entry_rows(MOVIE, "movie")
check("film: une seule entree", len(M_ROWS), 1)
check("film: kind movie", M_ROWS[0]["kind"], "movie")
check("film: episodes_total = 1", M_ROWS[0]["episodes_total"], 1)
check("film: source", M_ROWS[0]["source"], "tmdb_movie")
check("film: runtime", M_ROWS[0]["runtime_minutes"], 139)
check("film sorti => FINISHED", M_ROWS[0]["airing_status"], "FINISHED")
check("film sans runtime => None, jamais 0",
      to_entry_rows({**MOVIE, "runtime": None}, "movie")[0]["runtime_minutes"], None)

FUTURE = {**MOVIE, "status": "Post Production", "release_date": "2027-03-01"}
check("film a sortir => NOT_YET_RELEASED",
      to_entry_rows(FUTURE, "movie")[0]["airing_status"], "NOT_YET_RELEASED")
check("film a sortir => start_date renseignee pour l'agenda",
      to_entry_rows(FUTURE, "movie")[0]["start_date"], "2027-03-01")

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
```

Run: `python tests/test_tmdb_map.py`
Expected: PASS. Un écart avec `tests/test_tmdb_map.mjs` signale une divergence entre les deux implémentations du même contrat — corriger celle qui a tort, jamais le test.

- [ ] **Step 3: Vérifier à blanc**

```bash
python pipelines/tmdb_tracker_sync.py --dry-run
```

Expected sans clé : `[skip] TMDB_API_KEY absent — rien à faire.`, exit 0.
Expected avec clé et base vide de franchises TMDB : `TMDB sync: 0 franchises`, exit 0, **aucune écriture**.

Vérifier aussi que le sync anime n'a pas régressé : `python pipelines/anime_tracker_sync.py --dry-run` doit toujours annoncer 44 franchises.

- [ ] **Step 4: Le workflow**

Créer `.github/workflows/tmdb-tracker-sync.yml`, calqué sur `.github/workflows/anime-tracker-sync.yml` (le lire d'abord et en reprendre la structure exacte : `runs-on`, version de Python, cache pip, `workflow_dispatch`). Seules différences :

```yaml
on:
  schedule:
    - cron: "45 7 * * *"   # 15 min après anime-tracker-sync, pour ne pas
                            # empiler deux syncs sur la même minute
  workflow_dispatch:
```

et l'étape d'exécution :

```yaml
      - run: pip install -r pipelines/requirements-tmdb.txt
      - run: python pipelines/tmdb_tracker_sync.py
        env:
          TMDB_API_KEY: ${{ secrets.TMDB_API_KEY }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
```

- [ ] **Step 5: Documenter — même commit, règles cardinales**

`docs/secrets.md` : entrée `TMDB_API_KEY` — obtenue sur https://developer.themoviedb.org/, gratuite, utilisée par `pipelines/tmdb_tracker_sync.py` (et `pipelines/tmdb_sync.py` s'il est activé un jour) **et** stockée séparément dans `user_profile.tmdb_api_key` pour la recherche côté front.

`docs/architecture/pipelines.yaml` : ajouter `tmdb_tracker_sync` (cron `45 7 * * *`, écrit `media_entries` + `media_releases`, patche `media_franchises`). Mettre à jour la note existante de `tmdb_sync` pour lever l'ambiguïté entre les deux.

`docs/architecture/dependencies.yaml` : `media_entries` et `media_releases` ont désormais **deux** `owner_pipeline`. Refléter la réalité plutôt que de laisser `anime_tracker_sync` seul propriétaire.

- [ ] **Step 6: Valider l'archi**

```bash
python scripts/validate_arch.py
python tests/test_tmdb_map.py
python tests/test_media_tracker_common.py
python tests/test_source_scoping.py
```

Expected: tout PASS. `validate-arch` est bloquant en CI — un échec ici bloque la PR.

- [ ] **Step 7: Commit**

```bash
git add pipelines/tmdb_tracker_sync.py tests/test_tmdb_map.py .github/workflows/tmdb-tracker-sync.yml docs/secrets.md docs/architecture/pipelines.yaml docs/architecture/dependencies.yaml
git commit -m "feat(mediatheque): sync quotidien TMDB des films et series suivis"
```

---

## Task 9: Recherche fusionnée et chips de type

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx`
- Modify: `cockpit/data-profile.js`
- Modify: `cockpit/styles-mediatheque.css`, `index.html`
- Modify: `docs/telemetry.md`, `docs/specs/tab-mediatheque.md`, `docs/specs/index.json`

**Interfaces:**
- Consumes: `window.tmdb.{search, fetchFranchiseLive, toFranchiseRow, toEntryRows}` (Task 7).
- Produces: clé localStorage `mdt.typeFilter`.

- [ ] **Step 1: Charger la clé et la masquer de l'éditeur**

Dans `cockpit/data-profile.js`, ajouter `"tmdb_api_key"` à `window.PROFILE_HIDDEN_KEYS`, à côté de ses voisines Last.fm.

Renseigner la clé en base :

```sql
INSERT INTO user_profile (key, value) VALUES ('tmdb_api_key', '<clé>')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

Dans le panel, la lire comme `panel-musique.jsx` le fait :

```jsx
  const tmdbKey = (window.PROFILE_DATA && window.PROFILE_DATA._values || {}).tmdb_api_key || null;
```

- [ ] **Step 2: Fusionner les deux recherches**

Dans le `useMdtEffect` qui appelle `window.anilist.searchAnime(q)` (~ligne 580), interroger les deux sources en parallèle et fusionner. Chaque résultat porte sa provenance :

```jsx
      const [ani, tmdb] = await Promise.allSettled([
        window.anilist.searchAnime(q),
        tmdbKey ? window.tmdb.search(q, tmdbKey) : Promise.resolve([]),
      ]);
      const aniRows = ani.status === "fulfilled"
        ? ani.value.map((m) => ({ src: "anilist", id: m.id, kind: null, title: (m.title && (m.title.english || m.title.romaji)) || "?", year: (m.startDate && m.startDate.year) || null, poster: (m.coverImage && m.coverImage.large) || null, score: m.averageScore || 0 }))
        : [];
      const tmdbRows = tmdb.status === "fulfilled"
        ? tmdb.value.map((r) => ({ src: "tmdb", id: r.tmdb_id, kind: r.kind, title: r.title, year: r.year, poster: r.poster_url, score: Math.min(100, Math.round(r.popularity)) }))
        : [];
      // Une source qui tombe ne doit pas masquer l'autre : on affiche ce qu'on
      // a et on le dit en pied de liste, plutôt qu'un écran d'erreur alors que
      // la moitié du résultat est disponible.
      const degraded = [ani, tmdb].some((p) => p.status === "rejected");
      setResults({ rows: [...aniRows, ...tmdbRows].sort((a, b) => b.score - a.score), degraded });
      window.track && window.track("mediatheque_search", { q_len: q.length, results: aniRows.length + tmdbRows.length, sources: (aniRows.length ? 1 : 0) + (tmdbRows.length ? 1 : 0) });
```

Adapter le rendu des résultats pour afficher une pastille de provenance (`Anime` / `Série` / `Film`) et, si `degraded`, une ligne `Une source n'a pas répondu — résultats partiels.`

- [ ] **Step 3: Ajout selon la source**

Dans `openPreview` / `addFranchise`, brancher sur `src` : `window.anilist.fetchFranchiseLive(id)` ou `window.tmdb.fetchFranchiseLive(id, kind, tmdbKey)`, puis les `toFranchiseRow` / `toEntryRows` correspondants. Le reste du flux (insert atomique, rollback si échec) est inchangé.

Compléter la télémétrie existante : `mediatheque_add` porte déjà `source` — passer `"tmdb_movie"` / `"tmdb_tv"` au lieu du `"anilist"` codé en dur.

- [ ] **Step 4: Chips de type**

Dans `cockpit/panel-mediatheque.jsx`, au-dessus de `function PanelMediatheque` :

```jsx
// « Anime » actif par défaut : décision produit, ne pas noyer les 44 franchises
// existantes sous les films au premier chargement.
const MDT_TYPE_KEY = "mdt.typeFilter";
const MDT_TYPES = [
  { value: "anime", label: "Anime" },
  { value: "tv", label: "Séries" },
  { value: "movie", label: "Films" },
];

function mdtReadTypes() {
  try {
    const raw = JSON.parse(localStorage.getItem(MDT_TYPE_KEY) || "null");
    if (Array.isArray(raw) && raw.length) return raw;
  } catch (_) { /* clé corrompue : on repart du défaut */ }
  return ["anime"];
}
```

Dans `PanelMediatheque`, à côté des autres états de filtre :

```jsx
  const [types, setTypes] = useMdtState(mdtReadTypes);

  function toggleType(value) {
    // Jamais zéro type actif : une collection vide sans raison visible serait
    // lue comme un bug. Décocher le dernier type le laisse actif.
    const next = types.includes(value)
      ? (types.length > 1 ? types.filter((t) => t !== value) : types)
      : [...types, value];
    setTypes(next);
    try { localStorage.setItem(MDT_TYPE_KEY, JSON.stringify(next)); } catch (_) {}
    window.track && window.track("mediatheque_type_filter", { types: next, count: next.length });
  }

  // Les chips gouvernent la NAVIGATION, pas la décision. `pickTonight` lit
  // `cards`, jamais `typedCards` : filtrer « Ce soir » sur l'anime rendrait
  // runtime_minutes et le budget « 2 h+ » inutiles, puisqu'un épisode d'anime
  // dure 24 minutes. On filtre quand on explore, pas quand on demande quoi
  // regarder.
  const typedCards = useMdtMemo(
    () => cards.filter((c) => types.includes(c.f.media_type || "anime")),
    [cards, types]);
```

Brancher `typedCards` — et **pas** `cards` — sur les trois surfaces de navigation :
- `visible` (collection) : remplacer `list = cards;` par `list = typedCards;` ;
- `railCards` : premier argument `typedCards` au lieu de `cards` ;
- `MdtWeek` : filtrer les entrées passées à `buildWeek` sur les franchises de `typedCards`.

Laisser `tonight` sur `cards`.

Le rendu des chips, dans l'en-tête de `MdtCollection` :

```jsx
      <div className="mdt-typechips" role="group" aria-label="Type de média">
        {MDT_TYPES.map((t) => (
          <button key={t.value} type="button"
            className={"mdt-typechip" + (types.includes(t.value) ? " is-active" : "")}
            aria-pressed={types.includes(t.value)}
            onClick={() => onToggleType(t.value)}>{t.label}</button>
        ))}
      </div>
```

`types` et `onToggleType` se passent en props depuis `PanelMediatheque`. Styles : reprendre ceux de `.mdt-budget` / `.mdt-budget.is-active` sous les noms `.mdt-typechip` / `.mdt-typechip.is-active`.

- [ ] **Step 5: CSP et chargement du module**

Dans `index.html` :
- ajouter `<script src="cockpit/lib/tmdb.js?v=1"></script>` à côté de `cockpit/lib/anilist.js` ;
- ajouter `https://api.themoviedb.org` à `connect-src` et `https://image.tmdb.org` à `img-src` dans le meta CSP ;
- bumper le `?v=` de `panel-mediatheque.jsx` et `styles-mediatheque.css`.

- [ ] **Step 6: Documenter et synchroniser**

`docs/telemetry.md` : ajouter `mediatheque_type_filter`, et noter les champs ajoutés à `mediatheque_search` (`sources`) et `mediatheque_add` (valeurs de `source` étendues).

`docs/specs/tab-mediatheque.md` : recherche fusionnée deux sources, chips de type, TMDB dans **Back — sources de données** et **Appels externes**, `tmdb_tracker_sync` dans **Back — pipelines**, nouveaux edge cases (clé absente, source dégradée, doublon cross-source assumé), entrée en **Dernière MAJ**. Retirer « v1 anime uniquement » des **Limitations connues**.

`docs/specs/index.json` : bump `last_updated`.

`docs/architecture/decisions.md` : **ADR — le contrat de données de la médiathèque est celui d'AniList.** Toute source nouvelle y est traduite à l'ingestion ; conséquence assumée, `airing_status` / `episodes_total` / `next_episode_number` sont un contrat inter-sources, pas un détail AniList.

```bash
node scripts/sync-sw.mjs
node tests/test_mediatheque_view.mjs
node tests/test_tmdb_map.mjs
node tests/test_anilist_map.mjs
PYTHONUTF8=1 python scripts/validate_spec.py
python scripts/validate_arch.py
```

- [ ] **Step 7: Commit**

```bash
git add cockpit/panel-mediatheque.jsx cockpit/data-profile.js cockpit/styles-mediatheque.css index.html sw.js docs/
git commit -m "feat(mediatheque): recherche fusionnee AniList + TMDB et chips de type"
```

- [ ] **Step 8: Vérifier en prod**

Push sur `main`, hard-refresh. Contrôler : rechercher un film connu le remonte avec sa pastille, l'ajouter crée une franchise `media_type='movie'`, la fiche affiche « Film · non vu », et le lendemain matin `tmdb_tracker_sync` ne touche pas les franchises AniList (vérifier les logs du workflow).

---

## Task 10: Ce soir avec des films — vérification de bout en bout

La seule tâche qui valide que les deux moitiés du chantier se parlent.

**Files:** aucun (vérification), sauf correctifs éventuels.

- [ ] **Step 1: Jeu de données de contrôle**

Ajouter à la bibliothèque, via l'UI : un film de ~90 min, un film de ~150 min, une série en cours.

- [ ] **Step 2: Contrôles**

Après 18 h, ouvrir la Médiathèque et vérifier :

| Budget | Attendu |
|---|---|
| 30 min | aucun film proposé ; un épisode d'anime ou de série si disponible |
| 1 h | toujours aucun film de 90 ou 150 min |
| 2 h+ | le film de 150 min sort en « Sortir du lot » (le plus proche du budget par en dessous) |

Puis : après 23 h, le film recule derrière un format court. Les chips de type sur `Anime` ne changent **rien** aux propositions de « Ce soir ». Aucune franchise proposée n'apparaît dans le rail.

- [ ] **Step 3: Vérifier la base**

Via MCP Supabase :

```sql
SELECT source, media_type, count(*) FROM media_franchises GROUP BY 1, 2;
SELECT source, count(*), count(runtime_minutes) FROM media_entries GROUP BY 1;
```

Expected : les franchises `anilist` intactes (44), les nouvelles en `tmdb_movie` / `tmdb_tv`, et `runtime_minutes` renseigné sur la quasi-totalité des entrées TMDB. Un `count(runtime_minutes)` à 0 sur `anilist` signifie que le backfill n'a pas encore tourné — relancer `anime_tracker_sync` à la main.

- [ ] **Step 4: Commit des correctifs éventuels**

Si un écart apparaît, le corriger et committer avec un message `fix(mediatheque): …`. Si tout est conforme, aucun commit.

---

## Notes d'exécution

- **Phase 1 est autonome.** Les tâches 1 à 5 ne dépendent d'aucune clé API et livrent une carte « Ce soir » utilisable sur la bibliothèque anime existante. Valider en usage réel quelques soirs avant d'attaquer la Phase 2 est un choix défendable — les règles des trois rôles se jugent mieux à l'usage qu'en lecture.
- **La duplication du mapping TMDB entre `cockpit/lib/tmdb.js` et `pipelines/tmdb_tracker_sync.py` est assumée** : un pipeline Python ne peut pas importer un module JS, et c'est exactement la situation déjà acceptée entre `cockpit/lib/anilist.js` et `pipelines/anime_tracker_sync.py`. Les deux implémentations sont verrouillées par des tests distincts. Si elles divergent, c'est un test qui le dira.
- **Ne jamais éditer `sw.js` à la main** — toujours `node scripts/sync-sw.mjs`.
- **`validate_spec.py` peut sortir en code 1** sur un `UnicodeEncodeError` au `print` final en console Windows alors que la validation est passée. Lancer avec `PYTHONUTF8=1`.
