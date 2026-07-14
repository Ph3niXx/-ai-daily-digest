# Médiathèque — tracker anime (AniList) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Nouvel onglet cockpit « Médiathèque » : recherche d'anime via AniList GraphQL, bibliothèque personnelle par franchise (saisons + films/OVA), progression par saison, détection quotidienne des nouvelles sorties (pipeline) + encart Brief du jour.

**Architecture:** Front no-build React 18 + Babel standalone (script classiques `window.*`), écritures Supabase REST JWT via `window.sb`, pipeline Python GitHub Actions en service key. La logique de regroupement franchise (« walk ») est implémentée deux fois (JS + Python) et verrouillée par des fixtures partagées testées des deux côtés.

**Tech Stack:** React 18 UMD, Babel standalone, Supabase REST (PostgREST), AniList GraphQL (public, sans clé), Python 3.11 + requests, GitHub Actions.

**Spec de référence :** `docs/superpowers/specs/2026-07-14-mediatheque-anime-tracker-design.md` — le lire avant de commencer une tâche.

## Global Constraints

- **Français** partout dans l'UI et les docs (langue du cockpit).
- **Pas d'imports ES modules dans `cockpit/`** : scripts classiques, composants exposés sur `window.X` (Babel standalone). Exception : `cockpit/lib/anilist.js` ajoute un guard `module.exports` pour être testable sous node — mais reste chargeable en `<script>` classique.
- **Pas de `max-width`** sur le contenu du panel (règle CLAUDE.md — ne pas copier le `max-width:1440px` de jobs-radar).
- **CSS via tokens themes.js** : `var(--bg) var(--tx) var(--tx2) var(--tx3) var(--brand) var(--font-sans) var(--font-mono) var(--font-display)` (voir `cockpit/styles-jobs-radar.css` pour l'usage).
- **Après toute modif de `index.html` ou `cockpit/**`** : `node scripts/sync-sw.mjs` avant le commit (règle cardinale service worker). Ne jamais éditer `STATIC[]`/`CACHE` à la main.
- **Tout nouvel `event_type`** : ligne dans `docs/telemetry.md` **dans le même commit** que l'appel `track()`.
- **AniList** : endpoint unique `POST https://graphql.anilist.co` (JSON `{query, variables}`), sans clé. Limite dégradée ~30 req/min → front ≥ 700 ms entre requêtes, pipeline ≥ 2,5 s. Sur HTTP 429 : respecter `Retry-After`.
- **Aucun secret nouveau** (rien à ajouter à `docs/secrets.md`).
- **Supabase projet** : `mrmgptqpflzyavdfqwwv` (URL `https://mrmgptqpflzyavdfqwwv.supabase.co`).
- **Commits** : messages français type `feat(mediatheque): …`, terminés par `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.
- Le front se vérifie **en prod** (push main + hard-refresh GitHub Pages) — pas de chromium local. Les vérifications intermédiaires utilisent `node --check`, les tests node/python, et l'ouverture `file://` (mode démo).

---

### Task 1: Migration SQL `media_*` (4 tables + RLS) + déclaration archi

**Files:**
- Create: `sql/020_media_tracker.sql`
- Modify: `docs/architecture/dependencies.yaml` (section `tables:`, insertion alphabétique après `lastfm`/avant `music_*` — vérifier l'ordre réel du fichier)

**Interfaces:**
- Produces: tables `media_franchises`, `media_entries`, `media_progress`, `media_releases` avec les colonnes exactes ci-dessous — tout le reste du plan s'y réfère.

- [ ] **Step 1: Écrire la migration**

Créer `sql/020_media_tracker.sql` :

```sql
-- ============================================================
-- Migration 020: Médiathèque — tracker anime (AniList)
-- 4 tables. Séparation stricte : le front crée les entrées à l'ajout,
-- le pipeline (service key) les rafraîchit ensuite ; media_progress
-- appartient à l'utilisateur et n'est JAMAIS écrit par le pipeline.
-- Spec : docs/superpowers/specs/2026-07-14-mediatheque-anime-tracker-design.md
-- ============================================================

CREATE TABLE IF NOT EXISTS media_franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  media_type text NOT NULL DEFAULT 'anime',
  source text NOT NULL DEFAULT 'anilist',
  source_root_id int NOT NULL,
  title_romaji text,
  title_english text,
  title_native text,
  synopsis text,
  genres text[],
  cover_url text,
  banner_url text,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_root_id)
);

CREATE TABLE IF NOT EXISTS media_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES media_franchises(id) ON DELETE CASCADE,
  source text NOT NULL DEFAULT 'anilist',
  source_id int NOT NULL,
  in_main_chain boolean NOT NULL DEFAULT true,
  kind text NOT NULL CHECK (kind IN ('season','movie','ova','special','other')),
  season_number int,
  title_romaji text,
  title_english text,
  title_native text,
  format text,
  airing_status text,
  episodes_total int,
  start_date date,
  end_date date,
  next_episode_number int,
  next_episode_airing_at timestamptz,
  cover_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS media_entries_franchise_idx ON media_entries (franchise_id);

CREATE TABLE IF NOT EXISTS media_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL UNIQUE REFERENCES media_entries(id) ON DELETE CASCADE,
  episodes_watched int NOT NULL DEFAULT 0 CHECK (episodes_watched >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS media_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES media_franchises(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES media_entries(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('new_entry','airing_started','date_announced')),
  title text NOT NULL,
  event_date date,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  UNIQUE (entry_id, event_type)
);

CREATE INDEX IF NOT EXISTS media_releases_fresh_idx ON media_releases (acknowledged, detected_at DESC);

-- RLS : pattern challenge_attempts (sql/007) étendu aux 4 opérations.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['media_franchises','media_entries','media_progress','media_releases'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_select" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update" ON %I', t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete" ON %I', t);
    EXECUTE format('CREATE POLICY "auth_select" ON %I FOR SELECT TO authenticated USING (true)', t);
    EXECUTE format('CREATE POLICY "auth_insert" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_update" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t);
    EXECUTE format('CREATE POLICY "auth_delete" ON %I FOR DELETE TO authenticated USING (true)', t);
  END LOOP;
END $$;
```

- [ ] **Step 2: Appliquer la migration sur Supabase**

Charger les outils MCP : `ToolSearch` avec `select:mcp__claude_ai_Supabase__apply_migration,mcp__claude_ai_Supabase__execute_sql,mcp__claude_ai_Supabase__list_projects`. Confirmer l'id projet via `list_projects` (attendu : projet dont l'URL contient `mrmgptqpflzyavdfqwwv`), puis `apply_migration` avec `name: "020_media_tracker"` et le SQL ci-dessus.
Fallback si MCP indisponible : demander à l'utilisateur de coller le SQL dans l'éditeur SQL Supabase.

- [ ] **Step 3: Vérifier**

`execute_sql` : `select table_name from information_schema.tables where table_name like 'media_%' order by 1;`
Attendu : `media_entries, media_franchises, media_progress, media_releases`.
Puis : `select policyname, cmd from pg_policies where tablename = 'media_progress';` → 4 policies (SELECT/INSERT/UPDATE/DELETE).

- [ ] **Step 4: Déclarer les tables dans dependencies.yaml**

Dans `docs/architecture/dependencies.yaml`, section `tables:` (insertion alphabétique) :

```yaml
  - name: media_entries
    owner_pipeline: anime_tracker_sync
    rls: authenticated
    domain: perso

  - name: media_franchises
    owner_pipeline: front
    rls: authenticated
    domain: perso

  - name: media_progress
    owner_pipeline: front
    rls: authenticated
    domain: perso

  - name: media_releases
    owner_pipeline: anime_tracker_sync
    rls: authenticated
    domain: perso
```

- [ ] **Step 5: Valider l'archi et commiter**

Run: `python scripts/validate_architecture.py`
Attendu : PASS (le pipeline `anime_tracker_sync` n'existe pas encore — si le validateur exige `owner_pipeline` existant, mettre provisoirement `owner_pipeline: front` sur les 2 tables pipeline et noter de le corriger en Task 5 ; relancer → PASS).

```bash
git add sql/020_media_tracker.sql docs/architecture/dependencies.yaml
git commit -m "feat(mediatheque): migration media_* (4 tables + RLS authenticated) — ADR-28 à venir"
```

---

### Task 2: Logique « walk » franchise en Python (TDD, fixtures partagées)

**Files:**
- Create: `tests/fixtures/franchise_graphs.json`
- Create: `tests/test_franchise_walk.py`
- Create: `pipelines/anime_tracker_sync.py` (uniquement la section « pure logic » — le réseau vient en Task 5)

**Interfaces:**
- Produces (Python, réutilisé Task 5) : `chain_ids(media_by_id: dict, anchor_id: int) -> set[int]`, `missing_ids(media_by_id, anchor_id) -> set[int]`, `build_franchise(media_by_id, anchor_id) -> {"root_id": int, "entries": [{"source_id","in_main_chain","kind","season_number","sort_order"}]}`.
- Produces (fixtures, réutilisées Task 3) : `tests/fixtures/franchise_graphs.json` — cases `{name, anchor, media[], expected}` où `media[]` sont des objets Media AniList minimaux et `expected` le retour attendu de `build_franchise`.

- [ ] **Step 1: Écrire les fixtures**

Créer `tests/fixtures/franchise_graphs.json`. Objets Media minimaux : `id, type, format, status, startDate, relations.edges[{relationType, node{id,type,format}}]`. Les relations sont déclarées DANS LES DEUX SENS (comme AniList : S1 a SEQUEL→S2, S2 a PREQUEL→S1).

```json
{
  "cases": [
    {
      "name": "simple_tv",
      "anchor": 100,
      "media": [
        { "id": 100, "type": "ANIME", "format": "TV", "status": "FINISHED",
          "startDate": { "year": 2020, "month": 4, "day": 1 }, "relations": { "edges": [] } }
      ],
      "expected": { "root_id": 100, "entries": [
        { "source_id": 100, "in_main_chain": true, "kind": "season", "season_number": 1, "sort_order": 1 }
      ] }
    },
    {
      "name": "movie_in_chain",
      "anchor": 200,
      "media": [
        { "id": 200, "type": "ANIME", "format": "TV", "status": "FINISHED",
          "startDate": { "year": 2019, "month": 4, "day": 6 },
          "relations": { "edges": [ { "relationType": "SEQUEL", "node": { "id": 201, "type": "ANIME", "format": "MOVIE" } } ] } },
        { "id": 201, "type": "ANIME", "format": "MOVIE", "status": "FINISHED",
          "startDate": { "year": 2020, "month": 10, "day": 16 },
          "relations": { "edges": [
            { "relationType": "PREQUEL", "node": { "id": 200, "type": "ANIME", "format": "TV" } },
            { "relationType": "SEQUEL",  "node": { "id": 202, "type": "ANIME", "format": "TV" } } ] } },
        { "id": 202, "type": "ANIME", "format": "TV", "status": "FINISHED",
          "startDate": { "year": 2021, "month": 12, "day": 5 },
          "relations": { "edges": [ { "relationType": "PREQUEL", "node": { "id": 201, "type": "ANIME", "format": "MOVIE" } } ] } }
      ],
      "expected": { "root_id": 200, "entries": [
        { "source_id": 200, "in_main_chain": true, "kind": "season", "season_number": 1, "sort_order": 1 },
        { "source_id": 201, "in_main_chain": true, "kind": "movie",  "season_number": null, "sort_order": 2 },
        { "source_id": 202, "in_main_chain": true, "kind": "season", "season_number": 2, "sort_order": 3 }
      ] }
    },
    {
      "name": "side_story_and_exclusions_anchor_mid_chain",
      "anchor": 301,
      "media": [
        { "id": 300, "type": "ANIME", "format": "TV", "status": "FINISHED",
          "startDate": { "year": 2013, "month": 4, "day": 7 },
          "relations": { "edges": [
            { "relationType": "SEQUEL",     "node": { "id": 301, "type": "ANIME", "format": "TV" } },
            { "relationType": "SIDE_STORY", "node": { "id": 310, "type": "ANIME", "format": "OVA" } },
            { "relationType": "SUMMARY",    "node": { "id": 320, "type": "ANIME", "format": "MOVIE" } },
            { "relationType": "SPIN_OFF",   "node": { "id": 330, "type": "ANIME", "format": "TV" } },
            { "relationType": "ADAPTATION", "node": { "id": 900, "type": "MANGA", "format": "MANGA" } } ] } },
        { "id": 301, "type": "ANIME", "format": "TV", "status": "FINISHED",
          "startDate": { "year": 2017, "month": 4, "day": 1 },
          "relations": { "edges": [ { "relationType": "PREQUEL", "node": { "id": 300, "type": "ANIME", "format": "TV" } } ] } },
        { "id": 310, "type": "ANIME", "format": "OVA", "status": "FINISHED",
          "startDate": { "year": 2014, "month": 12, "day": 9 },
          "relations": { "edges": [
            { "relationType": "PARENT", "node": { "id": 300, "type": "ANIME", "format": "TV" } },
            { "relationType": "SEQUEL", "node": { "id": 311, "type": "ANIME", "format": "OVA" } } ] } }
      ],
      "expected": { "root_id": 300, "entries": [
        { "source_id": 300, "in_main_chain": true,  "kind": "season", "season_number": 1, "sort_order": 1 },
        { "source_id": 301, "in_main_chain": true,  "kind": "season", "season_number": 2, "sort_order": 2 },
        { "source_id": 310, "in_main_chain": false, "kind": "ova",    "season_number": null, "sort_order": 3 }
      ] }
    },
    {
      "name": "ona_is_season",
      "anchor": 400,
      "media": [
        { "id": 400, "type": "ANIME", "format": "ONA", "status": "FINISHED",
          "startDate": { "year": 2022, "month": 9, "day": 13 }, "relations": { "edges": [] } }
      ],
      "expected": { "root_id": 400, "entries": [
        { "source_id": 400, "in_main_chain": true, "kind": "season", "season_number": 1, "sort_order": 1 }
      ] }
    },
    {
      "name": "upcoming_without_date_goes_last",
      "anchor": 500,
      "media": [
        { "id": 500, "type": "ANIME", "format": "TV", "status": "FINISHED",
          "startDate": { "year": 2023, "month": 10, "day": 4 },
          "relations": { "edges": [ { "relationType": "SEQUEL", "node": { "id": 501, "type": "ANIME", "format": "TV" } } ] } },
        { "id": 501, "type": "ANIME", "format": "TV", "status": "NOT_YET_RELEASED",
          "startDate": { "year": null, "month": null, "day": null },
          "relations": { "edges": [ { "relationType": "PREQUEL", "node": { "id": 500, "type": "ANIME", "format": "TV" } } ] } }
      ],
      "expected": { "root_id": 500, "entries": [
        { "source_id": 500, "in_main_chain": true, "kind": "season", "season_number": 1, "sort_order": 1 },
        { "source_id": 501, "in_main_chain": true, "kind": "season", "season_number": 2, "sort_order": 2 }
      ] }
    }
  ],
  "missing_cases": [
    { "name": "bonus_is_fetched_but_its_sequel_is_not",
      "anchor": 300,
      "known": [300, 301],
      "expected_missing": [310]
    }
  ]
}
```

**Pourquoi `[310]`** : `missing_ids` ne demande que les cibles SEQUEL/PREQUEL/SIDE_STORY de type ANIME des nœuds de chaîne. Pour `known=[300,301]` : 310 (SIDE_STORY) manque ; 320 (SUMMARY) et 330 (SPIN_OFF) ne sont jamais demandés ; 900 est un MANGA (filtré) ; 311 (SEQUEL du bonus 310) n'est pas demandé car 310 n'est pas dans la chaîne — c'est exactement la règle « bonus à 1 saut, jamais suivi plus loin ».

- [ ] **Step 2: Écrire le test qui échoue**

Créer `tests/test_franchise_walk.py` (asserts purs, pas de pytest — pattern repo) :

```python
#!/usr/bin/env python3
"""Tests du walk franchise (contrat commun front JS / pipeline Python).
Run: python tests/test_franchise_walk.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipelines.anime_tracker_sync import build_franchise, chain_ids, missing_ids

FIXTURES = json.loads((Path(__file__).parent / "fixtures" / "franchise_graphs.json").read_text(encoding="utf-8"))


def media_map(case):
    return {m["id"]: m for m in case["media"]}


def main():
    failures = 0
    for case in FIXTURES["cases"]:
        got = build_franchise(media_map(case), case["anchor"])
        exp = case["expected"]
        if got != exp:
            failures += 1
            print(f"FAIL {case['name']}\n  expected: {exp}\n  got:      {got}")
        else:
            print(f"ok   {case['name']}")
    for mc in FIXTURES["missing_cases"]:
        all_media = None
        for case in FIXTURES["cases"]:
            if mc["anchor"] in media_map(case):
                all_media = media_map(case)
                break
        known = {k: v for k, v in all_media.items() if k in set(mc["known"])}
        got = sorted(missing_ids(known, mc["anchor"]))
        if got != sorted(mc["expected_missing"]):
            failures += 1
            print(f"FAIL {mc['name']}: expected {mc['expected_missing']}, got {got}")
        else:
            print(f"ok   {mc['name']}")
    if failures:
        print(f"\n{failures} failure(s)")
        sys.exit(1)
    print("\nAll walk tests passed.")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Vérifier que le test échoue**

Run: `python tests/test_franchise_walk.py`
Attendu : `ModuleNotFoundError: No module named 'pipelines.anime_tracker_sync'` (ou ImportError). Si `pipelines/` n'a pas de `__init__.py`, l'import par chemin fonctionne quand même via `sys.path` + package implicite ; si l'erreur est `pipelines is not a package`, créer `pipelines/__init__.py` vide.

- [ ] **Step 4: Implémenter la logique pure**

Créer `pipelines/anime_tracker_sync.py` :

```python
#!/usr/bin/env python3
"""
Médiathèque — tracker anime AniList -> Supabase.

Section 1 (ce fichier, Task 2) : logique pure du "walk" franchise.
Contrat commun avec cockpit/lib/anilist.js — même algo, mêmes fixtures
(tests/fixtures/franchise_graphs.json). Toute modif ici DOIT être
répliquée côté JS et couverte par les deux tests.

Règles (spec 2026-07-14) :
- chaîne principale = fermeture SEQUEL/PREQUEL depuis l'ancre, tous formats
- kind: TV/TV_SHORT/ONA en chaîne -> season ; MOVIE -> movie ; OVA -> ova ;
  SPECIAL -> special ; sinon other. MUSIC exclu de la sortie.
- saisons numérotées par (startDate ASC, nulls last, id ASC)
- bonus = SIDE_STORY à 1 saut des noeuds de chaîne (jamais suivis plus loin)
- exclus : SPIN_OFF, CHARACTER, SUMMARY, ALTERNATIVE, ADAPTATION/SOURCE, OTHER
- racine = entrée de chaîne la plus ancienne
"""

CHAIN_RELS = {"SEQUEL", "PREQUEL"}
BONUS_RELS = {"SIDE_STORY"}
SEASON_FORMATS = {"TV", "TV_SHORT", "ONA"}
EXCLUDED_FORMATS = {"MUSIC"}


def _rel_targets(media, rel_types):
    out = []
    for edge in ((media.get("relations") or {}).get("edges") or []):
        node = edge.get("node") or {}
        if edge.get("relationType") in rel_types and node.get("type") == "ANIME":
            out.append(node["id"])
    return out


def chain_ids(media_by_id, anchor_id):
    """Fermeture SEQUEL/PREQUEL parmi les media DÉJÀ connus."""
    seen, todo = set(), [anchor_id]
    while todo:
        mid = todo.pop()
        if mid in seen or mid not in media_by_id:
            continue
        seen.add(mid)
        todo.extend(_rel_targets(media_by_id[mid], CHAIN_RELS))
    return seen


def missing_ids(media_by_id, anchor_id):
    """Ids référencés (chaîne + bonus 1 saut) pas encore fetchés."""
    chain = chain_ids(media_by_id, anchor_id)
    wanted = set()
    for mid in chain:
        wanted.update(_rel_targets(media_by_id[mid], CHAIN_RELS))
        wanted.update(_rel_targets(media_by_id[mid], BONUS_RELS))
    return {m for m in wanted if m not in media_by_id}


def _date_key(media):
    d = media.get("startDate") or {}
    if not d.get("year"):
        return (9999, 12, 31)
    return (d["year"], d.get("month") or 1, d.get("day") or 1)


def _kind(media, in_chain):
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


def build_franchise(media_by_id, anchor_id):
    """Classement/regroupement. Précondition: missing_ids() est vide."""
    leftover = missing_ids(media_by_id, anchor_id)
    if leftover:
        raise ValueError(f"graphe incomplet, ids manquants: {sorted(leftover)}")
    chain = chain_ids(media_by_id, anchor_id)
    bonus = set()
    for mid in chain:
        for t in _rel_targets(media_by_id[mid], BONUS_RELS):
            if t not in chain and (media_by_id[t].get("format") or "") not in EXCLUDED_FORMATS:
                bonus.add(t)

    def sortkey(mid):
        return (_date_key(media_by_id[mid]), mid)

    chain_sorted = [m for m in sorted(chain, key=sortkey)
                    if (media_by_id[m].get("format") or "") not in EXCLUDED_FORMATS]
    bonus_sorted = sorted(bonus, key=sortkey)

    entries, season_num, order = [], 0, 0
    for mid in chain_sorted:
        order += 1
        kind = _kind(media_by_id[mid], True)
        if kind == "season":
            season_num += 1
        entries.append({
            "source_id": mid,
            "in_main_chain": True,
            "kind": kind,
            "season_number": season_num if kind == "season" else None,
            "sort_order": order,
        })
    for mid in bonus_sorted:
        order += 1
        entries.append({
            "source_id": mid,
            "in_main_chain": False,
            "kind": _kind(media_by_id[mid], False),
            "season_number": None,
            "sort_order": order,
        })
    root_id = chain_sorted[0] if chain_sorted else anchor_id
    return {"root_id": root_id, "entries": entries}


if __name__ == "__main__":
    print("Section réseau/CLI ajoutée en Task 5 — lancer tests/test_franchise_walk.py")
```

- [ ] **Step 5: Vérifier que le test passe**

Run: `python tests/test_franchise_walk.py`
Attendu : `ok` × 5 cases + 1 missing_case, `All walk tests passed.`, exit 0.

- [ ] **Step 6: Commit**

```bash
git add tests/fixtures/franchise_graphs.json tests/test_franchise_walk.py pipelines/anime_tracker_sync.py
git commit -m "feat(mediatheque): walk franchise Python + fixtures contrat commun (TDD)"
```

---

### Task 3: Miroir JS du walk (`cockpit/lib/anilist.js`) testé sur les mêmes fixtures

**Files:**
- Create: `cockpit/lib/anilist.js` (partie pure uniquement — le réseau vient en Task 4)
- Create: `tests/test_franchise_walk.mjs`

**Interfaces:**
- Consumes: `tests/fixtures/franchise_graphs.json` (Task 2).
- Produces (JS, réutilisé Tasks 4/8) : `chainIds(mediaById, anchorId)`, `missingIds(mediaById, anchorId)`, `buildFranchise(mediaById, anchorId)` — mêmes retours que Python (`{root_id, entries:[{source_id,in_main_chain,kind,season_number,sort_order}]}`). Exposé sur `window.anilist` en navigateur ET `module.exports` sous node.

- [ ] **Step 1: Écrire le test node qui échoue**

Créer `tests/test_franchise_walk.mjs` :

```js
// Miroir JS des tests Python — mêmes fixtures, mêmes attentes.
// Run: node tests/test_franchise_walk.mjs
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { buildFranchise, missingIds } = require(join(here, "..", "cockpit", "lib", "anilist.js"));
const FIXTURES = JSON.parse(readFileSync(join(here, "fixtures", "franchise_graphs.json"), "utf-8"));

const mediaMap = (c) => Object.fromEntries(c.media.map((m) => [m.id, m]));
const deepEq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

let failures = 0;
for (const c of FIXTURES.cases) {
  const got = buildFranchise(mediaMap(c), c.anchor);
  if (!deepEq(got, c.expected)) {
    failures++;
    console.log(`FAIL ${c.name}\n  expected: ${JSON.stringify(c.expected)}\n  got:      ${JSON.stringify(got)}`);
  } else console.log(`ok   ${c.name}`);
}
for (const mc of FIXTURES.missing_cases) {
  const full = mediaMap(FIXTURES.cases.find((c) => mediaMap(c)[mc.anchor]));
  const known = Object.fromEntries(Object.entries(full).filter(([k]) => mc.known.includes(Number(k))));
  const got = [...missingIds(known, mc.anchor)].sort((a, b) => a - b);
  if (!deepEq(got, [...mc.expected_missing].sort((a, b) => a - b))) {
    failures++;
    console.log(`FAIL ${mc.name}: expected ${mc.expected_missing}, got ${got}`);
  } else console.log(`ok   ${mc.name}`);
}
if (failures) { console.log(`\n${failures} failure(s)`); process.exit(1); }
console.log("\nAll JS walk tests passed.");
```

**Piège d'égalité JSON** : les entrées Python sérialisent `season_number: null` — le JS doit produire `null` (pas `undefined`) et **le même ordre de clés** que les `expected` des fixtures (`source_id, in_main_chain, kind, season_number, sort_order`). Construire les objets littéraux dans cet ordre exact.

- [ ] **Step 2: Vérifier l'échec**

Run: `node tests/test_franchise_walk.mjs`
Attendu : `Error: Cannot find module ... cockpit/lib/anilist.js`.

- [ ] **Step 3: Implémenter la partie pure de anilist.js**

Créer `cockpit/lib/anilist.js` :

```js
// cockpit/lib/anilist.js
// Client AniList GraphQL (recherche + walk franchise) — SANS clé API.
// Script classique compatible Babel standalone : expose window.anilist.
// Guard module.exports => testable sous node (tests/test_franchise_walk.mjs).
//
// CONTRAT COMMUN avec pipelines/anime_tracker_sync.py (mêmes règles, mêmes
// fixtures tests/fixtures/franchise_graphs.json). Toute modif du walk DOIT
// être répliquée côté Python et couverte par les deux tests.
(function () {
  const CHAIN_RELS = ["SEQUEL", "PREQUEL"];
  const BONUS_RELS = ["SIDE_STORY"];
  const SEASON_FORMATS = ["TV", "TV_SHORT", "ONA"];
  const EXCLUDED_FORMATS = ["MUSIC"];

  function relTargets(media, relTypes) {
    const out = [];
    const edges = (media.relations && media.relations.edges) || [];
    for (const edge of edges) {
      const node = edge.node || {};
      if (relTypes.includes(edge.relationType) && node.type === "ANIME") out.push(node.id);
    }
    return out;
  }

  function chainIds(mediaById, anchorId) {
    const seen = new Set();
    const todo = [anchorId];
    while (todo.length) {
      const mid = todo.pop();
      if (seen.has(mid) || !mediaById[mid]) continue;
      seen.add(mid);
      todo.push(...relTargets(mediaById[mid], CHAIN_RELS));
    }
    return seen;
  }

  function missingIds(mediaById, anchorId) {
    const chain = chainIds(mediaById, anchorId);
    const wanted = new Set();
    for (const mid of chain) {
      relTargets(mediaById[mid], CHAIN_RELS).forEach((t) => wanted.add(t));
      relTargets(mediaById[mid], BONUS_RELS).forEach((t) => wanted.add(t));
    }
    return new Set([...wanted].filter((m) => !mediaById[m]));
  }

  function dateKey(media) {
    const d = media.startDate || {};
    if (!d.year) return 99991231;
    return d.year * 10000 + (d.month || 1) * 100 + (d.day || 1);
  }

  function kindOf(media, inChain) {
    const f = media.format || "";
    if (inChain && SEASON_FORMATS.includes(f)) return "season";
    if (f === "MOVIE") return "movie";
    if (f === "OVA") return "ova";
    if (f === "SPECIAL") return "special";
    return "other";
  }

  function buildFranchise(mediaById, anchorId) {
    const leftover = missingIds(mediaById, anchorId);
    if (leftover.size) throw new Error("graphe incomplet: " + [...leftover].join(","));
    const chain = chainIds(mediaById, anchorId);
    const bonus = new Set();
    for (const mid of chain) {
      for (const t of relTargets(mediaById[mid], BONUS_RELS)) {
        if (!chain.has(t) && !EXCLUDED_FORMATS.includes(mediaById[t].format || "")) bonus.add(t);
      }
    }
    const sortkey = (mid) => [dateKey(mediaById[mid]), mid];
    const cmp = (a, b) => { const [d1, i1] = sortkey(a), [d2, i2] = sortkey(b); return d1 - d2 || i1 - i2; };
    const chainSorted = [...chain].sort(cmp).filter((m) => !EXCLUDED_FORMATS.includes(mediaById[m].format || ""));
    const bonusSorted = [...bonus].sort(cmp);

    const entries = [];
    let seasonNum = 0, order = 0;
    for (const mid of chainSorted) {
      order += 1;
      const kind = kindOf(mediaById[mid], true);
      if (kind === "season") seasonNum += 1;
      entries.push({ source_id: mid, in_main_chain: true, kind,
        season_number: kind === "season" ? seasonNum : null, sort_order: order });
    }
    for (const mid of bonusSorted) {
      order += 1;
      entries.push({ source_id: mid, in_main_chain: false, kind: kindOf(mediaById[mid], false),
        season_number: null, sort_order: order });
    }
    return { root_id: chainSorted.length ? chainSorted[0] : anchorId, entries };
  }

  const api = { chainIds, missingIds, buildFranchise };
  if (typeof window !== "undefined") window.anilist = Object.assign(window.anilist || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
```

- [ ] **Step 4: Vérifier que les deux suites passent**

Run: `node tests/test_franchise_walk.mjs` → `All JS walk tests passed.`
Run: `python tests/test_franchise_walk.py` → toujours PASS (non-régression).

- [ ] **Step 5: Commit**

```bash
git add cockpit/lib/anilist.js tests/test_franchise_walk.mjs
git commit -m "feat(mediatheque): walk franchise JS miroir + test node sur fixtures communes"
```

---

### Task 4: Couche réseau AniList (recherche, walk live, mapping lignes) + CSP

**Files:**
- Modify: `cockpit/lib/anilist.js` (ajout réseau + mapping dans la même IIFE)
- Modify: `index.html:6` (CSP) et `index.html:63` (chargement script)
- Create: `tests/smoke_anilist_live.mjs` (smoke test manuel, réseau réel)

**Interfaces:**
- Produces (utilisé Task 8) :
  - `window.anilist.searchAnime(q) -> Promise<Media[]>` (12 résultats max)
  - `window.anilist.fetchFranchiseLive(anchorId) -> Promise<{built, mediaById}>` (walk complet)
  - `window.anilist.toFranchiseRow(built, mediaById) -> objet ligne media_franchises` (sans id/added_at)
  - `window.anilist.toEntryRows(built, mediaById) -> objet[] lignes media_entries` (sans id/franchise_id)
  - `window.anilist.fuzzyDate(d) -> "YYYY-MM-DD"|null`

- [ ] **Step 1: Ajouter la couche réseau + mapping dans anilist.js**

Insérer AVANT la ligne `const api = {...}` (et enrichir `api`) :

```js
  // ── Réseau ─────────────────────────────────────────────────────
  const GQL_URL = "https://graphql.anilist.co";
  const MEDIA_FIELDS = `
    id idMal type format status episodes averageScore genres
    description(asHtml: false)
    title { romaji english native }
    startDate { year month day } endDate { year month day }
    coverImage { large color } bannerImage
    nextAiringEpisode { episode airingAt }
    relations { edges { relationType node { id type format } } }`;
  const SEARCH_QUERY = `query($q:String){Page(page:1,perPage:12){media(search:$q,type:ANIME,sort:SEARCH_MATCH){${MEDIA_FIELDS}}}}`;
  const BATCH_QUERY = `query($ids:[Int]){Page(page:1,perPage:25){media(id_in:$ids,type:ANIME){${MEDIA_FIELDS}}}}`;

  // File d'attente : 1 requête / 700 ms mini, retry x2 sur 429 (Retry-After).
  let lastCall = 0;
  let queue = Promise.resolve();
  function gql(query, variables) {
    const run = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const wait = Math.max(0, lastCall + 700 - Date.now());
        if (wait) await new Promise((r) => setTimeout(r, wait));
        lastCall = Date.now();
        const resp = await fetch(GQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        if (resp.status === 429) {
          const retryAfter = Number(resp.headers.get("Retry-After")) || 2;
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        if (!resp.ok) throw new Error("AniList " + resp.status);
        const json = await resp.json();
        if (json.errors && json.errors.length) throw new Error("AniList: " + json.errors[0].message);
        return json.data;
      }
      throw new Error("AniList 429 persistant");
    };
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }

  const searchCache = new Map();
  async function searchAnime(q) {
    const key = q.trim().toLowerCase();
    if (searchCache.has(key)) return searchCache.get(key);
    const data = await gql(SEARCH_QUERY, { q });
    const results = (data.Page && data.Page.media) || [];
    searchCache.set(key, results);
    return results;
  }

  async function fetchMediaBatch(ids) {
    const out = {};
    for (let i = 0; i < ids.length; i += 25) {
      const data = await gql(BATCH_QUERY, { ids: ids.slice(i, i + 25) });
      for (const m of (data.Page && data.Page.media) || []) out[m.id] = m;
    }
    return out;
  }

  const franchiseCache = new Map();
  async function fetchFranchiseLive(anchorId) {
    if (franchiseCache.has(anchorId)) return franchiseCache.get(anchorId);
    const mediaById = await fetchMediaBatch([anchorId]);
    if (!mediaById[anchorId]) throw new Error("AniList: fiche " + anchorId + " introuvable");
    for (let hop = 0; hop < 8; hop++) {
      const missing = [...missingIds(mediaById, anchorId)];
      if (!missing.length) break;
      const fetched = await fetchMediaBatch(missing);
      // Un id peut disparaître d'AniList : on le neutralise pour ne pas boucler.
      for (const mid of missing) if (!fetched[mid]) fetched[mid] = { id: mid, type: "OTHER" };
      Object.assign(mediaById, fetched);
    }
    const built = buildFranchise(mediaById, anchorId);
    const result = { built, mediaById };
    franchiseCache.set(anchorId, result);
    return result;
  }

  // ── Mapping vers les lignes media_* ────────────────────────────
  function fuzzyDate(d) {
    if (!d || !d.year) return null;
    const p2 = (n) => String(n || 1).padStart(2, "0");
    return `${d.year}-${p2(d.month)}-${p2(d.day)}`;
  }

  function stripSynopsis(html) {
    if (!html) return null;
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim().slice(0, 2000) || null;
  }

  function toFranchiseRow(built, mediaById) {
    const root = mediaById[built.root_id];
    return {
      media_type: "anime",
      source: "anilist",
      source_root_id: built.root_id,
      title_romaji: (root.title && root.title.romaji) || null,
      title_english: (root.title && root.title.english) || null,
      title_native: (root.title && root.title.native) || null,
      synopsis: stripSynopsis(root.description),
      genres: root.genres || [],
      cover_url: (root.coverImage && root.coverImage.large) || null,
      banner_url: root.bannerImage || null,
    };
  }

  function toEntryRows(built, mediaById) {
    return built.entries.map((e) => {
      const m = mediaById[e.source_id];
      const releasing = m.status === "RELEASING" && m.nextAiringEpisode;
      return {
        source: "anilist",
        source_id: e.source_id,
        in_main_chain: e.in_main_chain,
        kind: e.kind,
        season_number: e.season_number,
        title_romaji: (m.title && m.title.romaji) || null,
        title_english: (m.title && m.title.english) || null,
        title_native: (m.title && m.title.native) || null,
        format: m.format || null,
        airing_status: m.status || null,
        episodes_total: m.episodes != null ? m.episodes : (m.format === "MOVIE" ? 1 : null),
        start_date: fuzzyDate(m.startDate),
        end_date: fuzzyDate(m.endDate),
        next_episode_number: releasing ? m.nextAiringEpisode.episode : null,
        next_episode_airing_at: releasing ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() : null,
        cover_url: (m.coverImage && m.coverImage.large) || null,
        sort_order: e.sort_order,
        updated_at: new Date().toISOString(),
      };
    });
  }
```

Puis remplacer la ligne `const api = { chainIds, missingIds, buildFranchise };` par :

```js
  const api = { chainIds, missingIds, buildFranchise, gql, searchAnime,
    fetchFranchiseLive, fuzzyDate, toFranchiseRow, toEntryRows };
```

- [ ] **Step 2: CSP + chargement du script**

Dans `index.html:6`, deux insertions dans le meta CSP :
- `connect-src` : ajouter ` https://graphql.anilist.co` juste après `https://api.frankfurter.dev`
- `img-src` : ajouter ` https://s4.anilist.co` juste après `https://cdn.akamai.steamstatic.com`

Dans `index.html`, après la ligne `<script src="cockpit/lib/wiki-tooltip.js?v=2"></script>` (ligne 63), ajouter :

```html
<script src="cockpit/lib/anilist.js?v=1"></script>
```

- [ ] **Step 3: Smoke test live (réseau réel, manuel)**

Créer `tests/smoke_anilist_live.mjs` :

```js
// Smoke test AniList RÉEL (réseau) — usage manuel/debug, pas en CI.
// Run: node tests/smoke_anilist_live.mjs [anchorId]
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const anilist = require("../cockpit/lib/anilist.js");

const anchor = Number(process.argv[2]) || 154587; // Frieren
const results = await anilist.searchAnime("frieren");
console.log("search:", results.slice(0, 3).map((m) => `${m.id} ${m.title.romaji} [${m.format}]`));
const { built, mediaById } = await anilist.fetchFranchiseLive(anchor);
console.log("root:", built.root_id, mediaById[built.root_id].title.romaji);
for (const e of built.entries) {
  const m = mediaById[e.source_id];
  console.log(` ${e.in_main_chain ? "chain" : "bonus"} ${e.kind}${e.season_number ? " S" + e.season_number : ""} · ${m.title.romaji} · ${m.status} · ${anilist.fuzzyDate(m.startDate) || "?"}`);
}
console.log("franchiseRow:", JSON.stringify(anilist.toFranchiseRow(built, mediaById)).slice(0, 200));
```

Run: `node tests/smoke_anilist_live.mjs`
Attendu : la recherche liste Frieren, le walk affiche S1 (FINISHED, 28 ép.) + les suites annoncées le cas échéant, aucune exception.

- [ ] **Step 4: Régression + sync SW + commit**

Run: `node tests/test_franchise_walk.mjs` → PASS
Run: `node --check cockpit/lib/anilist.js` → exit 0
Run: `node scripts/sync-sw.mjs`

```bash
git add cockpit/lib/anilist.js index.html sw.js tests/smoke_anilist_live.mjs
git commit -m "feat(mediatheque): client AniList (recherche, walk live, mapping) + CSP graphql.anilist.co"
```

(Si `sync-sw.mjs` modifie d'autres fichiers générés, les inclure au commit.)

---

### Task 5: Pipeline `anime_tracker_sync.py` (refresh + détection d'événements) + workflow + archi

**Files:**
- Modify: `pipelines/anime_tracker_sync.py` (ajout section réseau/CLI sous la logique pure de Task 2)
- Create: `.github/workflows/anime-tracker-sync.yml`
- Modify: `docs/architecture/pipelines.yaml` (nouvelle entrée après `anime_sync`)
- Modify: `docs/architecture/dependencies.yaml` (si Task 1 a mis un `owner_pipeline` provisoire, le corriger en `anime_tracker_sync`)

**Interfaces:**
- Consumes: `build_franchise`, `missing_ids` (Task 2) ; tables Task 1.
- Produces: CLI `python pipelines/anime_tracker_sync.py [--dry-run] [--check <anilist_id>]` ; upserts `media_entries`, inserts `media_releases`, PATCH `media_franchises.updated_at`.

- [ ] **Step 1: Ajouter la section réseau/CLI**

Remplacer le bloc `if __name__ == "__main__":` de Task 2 par le code suivant (à coller à la fin du fichier) :

```python
# ═══════════════════════════════════════════════════════════════
# Section 2 : réseau AniList + Supabase + CLI (Task 5)
# ═══════════════════════════════════════════════════════════════
import argparse
import os
import sys
import time
from datetime import datetime, timezone

import requests

GQL_URL = "https://graphql.anilist.co"
MEDIA_FIELDS = """
  id idMal type format status episodes averageScore genres
  description(asHtml: false)
  title { romaji english native }
  startDate { year month day } endDate { year month day }
  coverImage { large color } bannerImage
  nextAiringEpisode { episode airingAt }
  relations { edges { relationType node { id type format } } }"""
BATCH_QUERY = "query($ids:[Int]){Page(page:1,perPage:25){media(id_in:$ids,type:ANIME){%s}}}" % MEDIA_FIELDS

THROTTLE_S = 2.5
_last_call = [0.0]


def gql(query, variables):
    for attempt in range(3):
        wait = _last_call[0] + THROTTLE_S - time.time()
        if wait > 0:
            time.sleep(wait)
        _last_call[0] = time.time()
        resp = requests.post(GQL_URL, json={"query": query, "variables": variables}, timeout=30)
        if resp.status_code == 429:
            time.sleep(int(resp.headers.get("Retry-After", "3")))
            continue
        resp.raise_for_status()
        payload = resp.json()
        if payload.get("errors"):
            raise RuntimeError(f"AniList: {payload['errors'][0].get('message')}")
        return payload["data"]
    raise RuntimeError("AniList 429 persistant")


def fetch_media_batch(ids):
    out = {}
    ids = sorted(set(ids))
    for i in range(0, len(ids), 25):
        data = gql(BATCH_QUERY, {"ids": ids[i:i + 25]})
        for m in (data.get("Page") or {}).get("media") or []:
            out[m["id"]] = m
    return out


def fetch_franchise_graph(anchor_id, seed=None):
    """Walk complet depuis l'ancre. seed = media déjà fetchés (mutualisés)."""
    media_by_id = dict(seed or {})
    if anchor_id not in media_by_id:
        media_by_id.update(fetch_media_batch([anchor_id]))
    if anchor_id not in media_by_id:
        raise RuntimeError(f"fiche AniList {anchor_id} introuvable")
    for _ in range(8):
        missing = missing_ids(media_by_id, anchor_id)
        if not missing:
            break
        fetched = fetch_media_batch(list(missing))
        for mid in missing:
            fetched.setdefault(mid, {"id": mid, "type": "OTHER"})
        media_by_id.update(fetched)
    return media_by_id


def fuzzy_date(d):
    if not d or not d.get("year"):
        return None
    return f"{d['year']}-{(d.get('month') or 1):02d}-{(d.get('day') or 1):02d}"


def strip_synopsis(html):
    if not html:
        return None
    import re
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text).strip()
    return text[:2000] or None


def to_entry_row(entry, media):
    releasing = media.get("status") == "RELEASING" and media.get("nextAiringEpisode")
    nae = media.get("nextAiringEpisode") or {}
    title = media.get("title") or {}
    episodes = media.get("episodes")
    return {
        "source": "anilist",
        "source_id": entry["source_id"],
        "in_main_chain": entry["in_main_chain"],
        "kind": entry["kind"],
        "season_number": entry["season_number"],
        "title_romaji": title.get("romaji"),
        "title_english": title.get("english"),
        "title_native": title.get("native"),
        "format": media.get("format"),
        "airing_status": media.get("status"),
        "episodes_total": episodes if episodes is not None else (1 if media.get("format") == "MOVIE" else None),
        "start_date": fuzzy_date(media.get("startDate")),
        "end_date": fuzzy_date(media.get("endDate")),
        "next_episode_number": nae.get("episode") if releasing else None,
        "next_episode_airing_at": (
            datetime.fromtimestamp(nae["airingAt"], tz=timezone.utc).isoformat()
            if releasing and nae.get("airingAt") else None
        ),
        "cover_url": (media.get("coverImage") or {}).get("large"),
        "sort_order": entry["sort_order"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# ── Supabase REST (service key) ─────────────────────────────────
def sb_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("FATAL: SUPABASE_URL / SUPABASE_SERVICE_KEY manquants")
        sys.exit(1)
    return url, {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def sb_get(url, headers, table, qs):
    r = requests.get(f"{url}/rest/v1/{table}?{qs}", headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_upsert(url, headers, table, rows, on_conflict, ignore_dupes=False):
    if not rows:
        return []
    prefer = "resolution=ignore-duplicates" if ignore_dupes else "resolution=merge-duplicates"
    h = {**headers, "Prefer": f"{prefer},return=representation"}
    r = requests.post(f"{url}/rest/v1/{table}?on_conflict={on_conflict}", headers=h, json=rows, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_patch(url, headers, table, qs, body):
    r = requests.patch(f"{url}/rest/v1/{table}?{qs}", headers=headers, json=body, timeout=30)
    r.raise_for_status()


# ── Détection d'événements ──────────────────────────────────────
def diff_events(franchise, old_by_source_id, fresh_rows):
    """Compare l'état DB aux lignes fraîches -> [(event_type, title, event_date, source_id)]."""
    events = []
    for row in fresh_rows:
        sid = row["source_id"]
        old = old_by_source_id.get(sid)
        label = row.get("title_english") or row.get("title_romaji") or f"#{sid}"
        if old is None:
            what = "Nouvelle saison annoncée" if row["kind"] == "season" else (
                "Nouveau film" if row["kind"] == "movie" else "Nouvelle entrée")
            events.append(("new_entry", f"{what} : {label}", row.get("start_date"), sid))
            continue
        if old.get("airing_status") != "RELEASING" and row.get("airing_status") == "RELEASING":
            events.append(("airing_started", f"Diffusion commencée : {label}", row.get("start_date"), sid))
        if not old.get("start_date") and row.get("start_date"):
            events.append(("date_announced", f"Date annoncée : {label} — {row['start_date']}", row["start_date"], sid))
    return events


def run_sync(dry_run):
    url, headers = sb_env()
    franchises = sb_get(url, headers, "media_franchises", "select=id,source_root_id,title_english,title_romaji&order=added_at")
    entries = sb_get(url, headers, "media_entries",
                     "select=id,franchise_id,source_id,airing_status,start_date&order=sort_order")
    by_franchise = {}
    for e in entries:
        by_franchise.setdefault(e["franchise_id"], []).append(e)
    print(f"Tracker sync: {len(franchises)} franchises, {len(entries)} entrées, dry_run={dry_run}")

    # Mutualise le fetch initial : toutes les entrées connues en batchs.
    seed = fetch_media_batch([e["source_id"] for e in entries] +
                             [f["source_root_id"] for f in franchises])

    total_new, total_events = 0, 0
    for fr in franchises:
        name = fr.get("title_english") or fr.get("title_romaji") or fr["id"]
        try:
            graph = fetch_franchise_graph(fr["source_root_id"], seed=seed)
            built = build_franchise(graph, fr["source_root_id"])
        except Exception as exc:
            print(f"  WARN {name}: walk KO ({exc}) — franchise sautée, rattrapée au prochain run")
            continue
        fresh_rows = [{**to_entry_row(e, graph[e["source_id"]]), "franchise_id": fr["id"]}
                      for e in built["entries"]]
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
        saved = sb_upsert(url, headers, "media_entries", fresh_rows, "source,source_id")
        id_by_sid = {r["source_id"]: r["id"] for r in saved}
        release_rows = [{
            "franchise_id": fr["id"],
            "entry_id": id_by_sid.get(sid),
            "event_type": etype,
            "title": title,
            "event_date": edate,
        } for (etype, title, edate, sid) in events if id_by_sid.get(sid)]
        sb_upsert(url, headers, "media_releases", release_rows, "entry_id,event_type", ignore_dupes=True)
        root = graph.get(fr["source_root_id"]) or {}
        sb_patch(url, headers, "media_franchises", f"id=eq.{fr['id']}", {
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "synopsis": strip_synopsis(root.get("description")),
            "cover_url": (root.get("coverImage") or {}).get("large"),
        })
    print(f"\nDone. {total_new} nouvelles entrées, {total_events} événements.")


def run_check(anchor_id):
    graph = fetch_franchise_graph(anchor_id)
    built = build_franchise(graph, anchor_id)
    root = graph[built["root_id"]]
    print(f"Franchise: {(root.get('title') or {}).get('romaji')} (root {built['root_id']})")
    for e in built["entries"]:
        m = graph[e["source_id"]]
        t = (m.get("title") or {}).get("romaji")
        tag = "chain" if e["in_main_chain"] else "bonus"
        num = f" S{e['season_number']}" if e["season_number"] else ""
        print(f"  [{tag}] {e['kind']}{num} · {t} · {m.get('status')} · {fuzzy_date(m.get('startDate')) or '?'}"
              f" · {m.get('episodes') or '?'} ép.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--check", type=int, metavar="ANILIST_ID")
    args = parser.parse_args()
    if args.check:
        run_check(args.check)
    else:
        run_sync(args.dry_run)
```

Note : `diff_events` reçoit `franchise` (non utilisé aujourd'hui, utile aux évolutions) — le retirer si le linter s'en plaint, en ajustant l'appel.

- [ ] **Step 2: Vérifier régression + --check live**

Run: `python tests/test_franchise_walk.py` → PASS (la section réseau ne casse pas l'import).
Run: `python pipelines/anime_tracker_sync.py --check 154587`
Attendu (Frieren) : root = Sousou no Frieren, S1 FINISHED 28 ép., suite(s) éventuelles listées, exit 0.
Run: `python pipelines/anime_tracker_sync.py --check 101922`
Attendu (Demon Slayer) : le film Mugen Train apparaît `[chain] movie` ENTRE S1 et la saison suivante ; les saisons sont numérotées sans compter le film.
Run: `python pipelines/anime_tracker_sync.py --check 16498`
Attendu (Attack on Titan) : chaîne de saisons complète ; PAS de films récap (SUMMARY exclus) ; OVA éventuels en `[bonus]`.
Run: `python pipelines/anime_tracker_sync.py --check 120377`
Attendu (Cyberpunk Edgerunners) : une seule entrée `[chain] season S1` (ONA).
Comparer visuellement aux pages AniList si un doute — c'est la validation du contrat.

- [ ] **Step 3: Workflow GitHub Actions**

Créer `.github/workflows/anime-tracker-sync.yml` :

```yaml
name: Médiathèque — tracker anime AniList

on:
  schedule:
    # Quotidien à 7h30 UTC (après la veille anime de 7h00)
    - cron: '30 7 * * *'
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry-run (aucune écriture)"
        type: boolean
        default: false

jobs:
  anime-tracker-sync:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install requests==2.32.3

      - name: Run tracker sync
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: python pipelines/anime_tracker_sync.py ${{ inputs.dry_run && '--dry-run' || '' }}
```

- [ ] **Step 4: Déclarer le pipeline dans pipelines.yaml**

Dans `docs/architecture/pipelines.yaml`, après l'entrée `anime_sync` (ligne ~195), insérer :

```yaml
  - id: anime_tracker_sync
    name: "Médiathèque anime (tracker AniList)"
    cron: "30 7 * * *"
    human_time: "Quotidien 07:30 UTC"
    workflow_file: ".github/workflows/anime-tracker-sync.yml"
    script: "pipelines/anime_tracker_sync.py"
    input_api: "AniList GraphQL (public, sans clé)"
    output_tables:
      - media_entries
      - media_releases
      - media_franchises
    read_tables:
      - media_franchises
      - media_entries
    avg_duration_s: 60
    budget_usd: 0
    status: active
    notes: "Ne rafraîchit QUE les franchises de la bibliothèque. Batchs id_in de 25, throttle 2,5 s (< 30 req/min AniList). Événements dédupliqués par UNIQUE(entry_id,event_type). Walk = contrat commun avec cockpit/lib/anilist.js (tests/fixtures/franchise_graphs.json)."
```

Si Task 1 a laissé un `owner_pipeline` provisoire dans `dependencies.yaml`, remettre `anime_tracker_sync` sur `media_entries` et `media_releases`.

- [ ] **Step 5: Valider + commit**

Run: `python scripts/validate_architecture.py` → PASS
Run (si env Supabase dispo en local) : `python pipelines/anime_tracker_sync.py --dry-run` → « 0 franchises » et exit 0 ; sinon la vérification se fera post-push via `workflow_dispatch` (Task 12).

```bash
git add pipelines/anime_tracker_sync.py .github/workflows/anime-tracker-sync.yml docs/architecture/pipelines.yaml docs/architecture/dependencies.yaml
git commit -m "feat(mediatheque): pipeline anime_tracker_sync (refresh AniList + détection sorties) + cron 07:30 UTC"
```

---

### Task 6: Data layer front (Tier 1 releases + Tier 2 panel)

**Files:**
- Create: `cockpit/data-mediatheque.js`
- Modify: `cockpit/lib/data-loader.js` (3 endroits : loaders T2 ~ligne 1279, `bootTier1` ~ligne 1142, switch `loadPanel` ~ligne 4714 + `TIER2_PANELS` ~ligne 4726)
- Modify: `index.html` (script data-mediatheque.js)

**Interfaces:**
- Consumes: tables Task 1.
- Produces: `window.MEDIATHEQUE_DATA = { franchises, entries, progress, releases }` (T2, lignes brutes Supabase) ; `window.COCKPIT_DATA.media_releases` (T1 : non-acquittées < 7 j, max 5) — consommés Tasks 7-10.

- [ ] **Step 1: Seed global**

Créer `cockpit/data-mediatheque.js` :

```js
// Médiathèque — bibliothèque anime perso : vide au démarrage.
// loadPanel("mediatheque") remplit depuis Supabase (media_franchises,
// media_entries, media_progress, media_releases — lignes brutes).
// Le panel calcule les statuts dérivés à partir de entries + progress.
window.MEDIATHEQUE_DATA = {
  franchises: [],
  entries: [],
  progress: [],
  releases: [],
};
```

- [ ] **Step 2: Loaders T2**

Dans `cockpit/lib/data-loader.js`, après la ligne `async news(){ ... }` (~1280), ajouter dans l'objet `T2` :

```js
    async media_franchises(){ return once("media_franchises", () => q("media_franchises", "select=*&order=added_at.desc&limit=500")); },
    async media_entries(){ return once("media_entries", () => q("media_entries", "select=*&order=sort_order.asc&limit=5000")); },
    async media_progress(){ return once("media_progress", () => q("media_progress", "select=*&limit=5000")); },
    async media_releases(){
      const from = new Date(Date.now() - 30 * 86400000).toISOString();
      return once("media_releases", () => q("media_releases", `detected_at=gte.${from}&order=detected_at.desc&limit=100`));
    },
```

- [ ] **Step 3: Case loadPanel + TIER2_PANELS**

Dans le `switch` de `loadPanel` (juste avant le `default:` ~ligne 4715), ajouter :

```js
      case "mediatheque": {
        const [franchises, entries, progress, releases] = await Promise.all([
          T2.media_franchises().catch(() => []),
          T2.media_entries().catch(() => []),
          T2.media_progress().catch(() => []),
          T2.media_releases().catch(() => []),
        ]);
        if (window.MEDIATHEQUE_DATA) {
          window.MEDIATHEQUE_DATA.franchises = franchises;
          window.MEDIATHEQUE_DATA.entries = entries;
          window.MEDIATHEQUE_DATA.progress = progress;
          window.MEDIATHEQUE_DATA.releases = releases;
        }
        return { franchises, entries, progress, releases };
      }
```

Dans `TIER2_PANELS` (~ligne 4726), ajouter `"mediatheque",` après `"veille-outils",`.

- [ ] **Step 4: Tier 1 — releases fraîches pour l'encart Brief**

Dans `bootTier1` (~ligne 1142), étendre la destructuration ET le `Promise.all` :

```js
    const [articlesToday, brief, signals, radarRows, profileRows, recent, weeklyAnalysis, mediaReleases] = await Promise.all([
      once("articles_today", loadArticlesToday).catch(() => []),
      once("daily_brief", loadDailyBrief).catch(() => null),
      once("signals", loadSignals).catch(() => []),
      once("radar", loadRadar).catch(() => []),
      once("user_profile", loadUserProfile).catch(() => []),
      once("recent_articles", () => loadRecentArticles(30)).catch(() => []),
      once("weekly_analysis", () => loadWeeklyAnalysis(8)).catch(() => []),
      once("media_releases_fresh", () => {
        const from = new Date(Date.now() - 7 * 86400000).toISOString();
        return q("media_releases", `acknowledged=eq.false&detected_at=gte.${from}&order=detected_at.desc&limit=5`);
      }).catch(() => []),
    ]);
```

Puis dans l'objet `data = { ... }` (~ligne 1174), ajouter après `challenges: [],` :

```js
      media_releases: mediaReleases,  // encart Médiathèque du Brief (T1 léger)
```

Et dans `window.__COCKPIT_RAW = { ... }` ajouter `mediaReleases,`.

**Important** : le `.catch(() => [])` est obligatoire — si la table n'existe pas encore ou si Supabase est lent, le boot ne doit JAMAIS casser.

- [ ] **Step 5: Script dans index.html**

Après la ligne `<script src="cockpit/data-anime.js?v=2"></script>` (ligne 71), ajouter :

```html
<script src="cockpit/data-mediatheque.js?v=1"></script>
```

- [ ] **Step 6: Vérifier + commit**

Run: `node --check cockpit/lib/data-loader.js` → exit 0
Run: `node --check cockpit/data-mediatheque.js` → exit 0
Run: `node scripts/sync-sw.mjs`

```bash
git add cockpit/data-mediatheque.js cockpit/lib/data-loader.js index.html sw.js
git commit -m "feat(mediatheque): data layer — T2 loadPanel(mediatheque) + releases fraîches en Tier 1"
```

---

### Task 7: Squelette de l'onglet (nav, route, panel bibliothèque + statuts dérivés, CSS)

**Files:**
- Modify: `cockpit/icons.jsx` (icône `tv`, après `gamepad` ligne 26)
- Modify: `cockpit/nav.js` (groupe Personnel, après `gaming` ligne 54)
- Modify: `cockpit/app.jsx` (route, après la ligne `gaming` ligne 490)
- Modify: `index.html` (link CSS + script panel)
- Create: `cockpit/styles-mediatheque.css`
- Create: `cockpit/panel-mediatheque.jsx`

**Interfaces:**
- Consumes: `window.MEDIATHEQUE_DATA` (Task 6).
- Produces: `window.PanelMediatheque` (props `{ data, onNavigate }`) ; helpers internes réutilisés Tasks 8-10 : `mdtReleased(entry) -> int`, `mdtStatus(chainEntries, progressByEntryId) -> {id,label}`, `progressByEntryId` (Map id→episodes_watched), state `tick`/`setTick` pour re-render après mutation locale.

- [ ] **Step 1: Icône `tv`**

Dans `cockpit/icons.jsx`, après la ligne `gamepad:` (ligne 26), ajouter :

```jsx
  tv: <><rect x="2" y="7" width="20" height="13" rx="2"/><path d="M8 2l4 5 4-5"/></>,
```

- [ ] **Step 2: Entrée nav**

Dans `cockpit/nav.js`, groupe `Personnel`, après la ligne `{ id: "gaming", ... }` :

```js
    { id: "mediatheque", label: "Médiathèque", icon: "tv" },
```

- [ ] **Step 3: Route app.jsx**

Dans `cockpit/app.jsx`, après la ligne 490 (`else if (activePanel === "gaming") ...`) :

```jsx
  else if (activePanel === "mediatheque") content = <PanelMediatheque key={panelKey} data={data} onNavigate={handleNavigate} />;
```

- [ ] **Step 4: index.html — CSS + script panel**

Après `<link rel="stylesheet" href="cockpit/styles-jobs-radar.css?v=5">` (ligne 33) :

```html
<link rel="stylesheet" href="cockpit/styles-mediatheque.css?v=1">
```

Après `<script type="text/babel" src="cockpit/panel-jobs-radar.jsx?v=5"></script>` (ligne 112) :

```html
<script type="text/babel" src="cockpit/panel-mediatheque.jsx?v=1"></script>
```

- [ ] **Step 5: CSS**

Créer `cockpit/styles-mediatheque.css` :

```css
/* ═══════════════════════════════════════════════════════════════
   MÉDIATHÈQUE — tracker anime (v1)
   Theme-driven via --bg / --tx / --brand etc. (themes.js).
   Pas de max-width : le cockpit utilise toute la largeur (CLAUDE.md).
   ═══════════════════════════════════════════════════════════════ */

.panel-mediatheque { padding: 40px 48px 80px; font-family: var(--font-sans); color: var(--tx); }

.mdt-kicker { font-family: var(--font-mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--tx3); }
.mdt-title { font-family: var(--font-display); font-weight: 500; font-size: 40px; line-height: 1.1; margin: 4px 0 20px; }

/* Toolbar : recherche + filtres + tri */
.mdt-toolbar { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; margin-bottom: 24px; }
.mdt-search { flex: 1 1 260px; max-width: 420px; padding: 9px 14px; font: inherit; font-size: 14px;
  color: var(--tx); background: color-mix(in srgb, var(--tx) 5%, transparent);
  border: 1px solid color-mix(in srgb, var(--tx) 15%, transparent); border-radius: 8px; }
.mdt-search:focus { outline: 2px solid var(--brand); outline-offset: 1px; }
.mdt-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.mdt-chip { padding: 6px 12px; font-family: var(--font-mono); font-size: 11.5px; border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--tx) 18%, transparent); background: transparent; color: var(--tx2); cursor: pointer; }
.mdt-chip.is-active { background: var(--tx); color: var(--bg); border-color: var(--tx); }
.mdt-select { padding: 6px 10px; font-family: var(--font-mono); font-size: 11.5px; color: var(--tx2);
  background: transparent; border: 1px solid color-mix(in srgb, var(--tx) 18%, transparent); border-radius: 8px; }

/* Bandeau Sorties */
.mdt-releases { margin-bottom: 28px; padding: 16px 18px; border: 1px solid color-mix(in srgb, var(--brand) 35%, transparent);
  border-radius: 12px; background: color-mix(in srgb, var(--brand) 6%, transparent); }
.mdt-releases-head { font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--tx2); margin-bottom: 10px; }
.mdt-release { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 14px; }
.mdt-release-date { font-family: var(--font-mono); font-size: 11.5px; color: var(--tx3); margin-left: auto; white-space: nowrap; }
.mdt-release-ack { border: none; background: transparent; color: var(--tx3); cursor: pointer; font-size: 14px; padding: 2px 6px; }
.mdt-release-ack:hover { color: var(--brand); }
.mdt-calendar { display: flex; flex-wrap: wrap; gap: 8px 18px; margin-top: 10px; font-size: 13px; color: var(--tx2); }
.mdt-calendar-item strong { color: var(--tx); font-weight: 600; }

/* Grille bibliothèque */
.mdt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 18px; }
.mdt-card { border: 1px solid color-mix(in srgb, var(--tx) 12%, transparent); border-radius: 12px; overflow: hidden;
  background: color-mix(in srgb, var(--tx) 3%, transparent); cursor: pointer; text-align: left; padding: 0; font: inherit; color: inherit; }
.mdt-card:hover { border-color: var(--brand); }
.mdt-card-cover { width: 100%; aspect-ratio: 2/3; object-fit: cover; display: block; background: color-mix(in srgb, var(--tx) 8%, transparent); }
.mdt-card-body { padding: 10px 12px 12px; }
.mdt-card-title { font-size: 13.5px; font-weight: 600; line-height: 1.25; margin: 0 0 2px; }
.mdt-card-sub { font-size: 11.5px; color: var(--tx3); margin: 0 0 8px; }
.mdt-badge { display: inline-block; font-family: var(--font-mono); font-size: 10px; letter-spacing: .08em;
  text-transform: uppercase; padding: 3px 8px; border-radius: 999px; border: 1px solid; }
.mdt-badge--to_watch { color: var(--tx2); border-color: color-mix(in srgb, var(--tx) 25%, transparent); }
.mdt-badge--watching { color: var(--brand); border-color: var(--brand); }
.mdt-badge--up_to_date { color: var(--brand); border-color: color-mix(in srgb, var(--brand) 45%, transparent); }
.mdt-badge--seen { color: var(--tx3); border-color: color-mix(in srgb, var(--tx) 18%, transparent); }
.mdt-progressbar { height: 4px; border-radius: 2px; background: color-mix(in srgb, var(--tx) 10%, transparent); margin-top: 8px; overflow: hidden; }
.mdt-progressbar > div { height: 100%; background: var(--brand); }
.mdt-card-count { font-family: var(--font-mono); font-size: 10.5px; color: var(--tx3); margin-top: 5px; }

/* Résultats recherche */
.mdt-results { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.mdt-result { display: flex; gap: 12px; padding: 10px; border: 1px solid color-mix(in srgb, var(--tx) 12%, transparent);
  border-radius: 10px; cursor: pointer; background: transparent; text-align: left; font: inherit; color: inherit; }
.mdt-result:hover { border-color: var(--brand); }
.mdt-result img { width: 56px; aspect-ratio: 2/3; object-fit: cover; border-radius: 6px; }
.mdt-result-title { font-size: 13.5px; font-weight: 600; margin: 0; }
.mdt-result-sub { font-size: 11.5px; color: var(--tx3); margin: 2px 0 4px; }
.mdt-result-genres { font-family: var(--font-mono); font-size: 10.5px; color: var(--tx2); }
.mdt-inlib { font-family: var(--font-mono); font-size: 10px; color: var(--brand); }

/* Fiche franchise (modale) */
.mdt-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 60; display: flex; align-items: flex-start; justify-content: center; padding: 6vh 16px; overflow-y: auto; }
.mdt-modal { width: min(760px, 100%); background: var(--bg); border: 1px solid color-mix(in srgb, var(--tx) 15%, transparent);
  border-radius: 14px; padding: 24px 26px 28px; }
.mdt-fiche-head { display: flex; gap: 18px; margin-bottom: 18px; }
.mdt-fiche-cover { width: 110px; aspect-ratio: 2/3; object-fit: cover; border-radius: 8px; }
.mdt-fiche-titles h2 { font-family: var(--font-display); font-size: 26px; margin: 0 0 2px; }
.mdt-fiche-native { font-size: 13px; color: var(--tx3); margin: 0 0 8px; }
.mdt-fiche-meta { font-family: var(--font-mono); font-size: 11px; color: var(--tx2); }
.mdt-fiche-synopsis { font-size: 13px; line-height: 1.55; color: var(--tx2); max-height: 5.2em; overflow: hidden; margin: 10px 0 0; }
.mdt-section-label { font-family: var(--font-mono); font-size: 10.5px; letter-spacing: .12em; text-transform: uppercase; color: var(--tx3); margin: 18px 0 8px; }
.mdt-entry { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-top: 1px solid color-mix(in srgb, var(--tx) 8%, transparent); font-size: 13.5px; }
.mdt-entry-info { flex: 1; min-width: 0; }
.mdt-entry-sub { font-family: var(--font-mono); font-size: 10.5px; color: var(--tx3); }
.mdt-stepper { display: flex; align-items: center; gap: 4px; }
.mdt-stepper button { width: 26px; height: 26px; border-radius: 6px; border: 1px solid color-mix(in srgb, var(--tx) 18%, transparent);
  background: transparent; color: var(--tx); cursor: pointer; font-size: 14px; line-height: 1; }
.mdt-stepper button:disabled { opacity: .35; cursor: default; }
.mdt-stepper-count { font-family: var(--font-mono); font-size: 12px; min-width: 58px; text-align: center; cursor: pointer; }
.mdt-stepper-count input { width: 44px; font: inherit; text-align: center; color: var(--tx); background: transparent;
  border: 1px solid var(--brand); border-radius: 4px; }
.mdt-btn { padding: 9px 16px; border-radius: 8px; border: 1px solid var(--tx); background: var(--tx); color: var(--bg);
  font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer; }
.mdt-btn--ghost { background: transparent; color: var(--tx2); border-color: color-mix(in srgb, var(--tx) 20%, transparent); }
.mdt-btn:disabled { opacity: .5; cursor: default; }
.mdt-fiche-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
.mdt-error { color: #c0392b; font-size: 13px; margin-top: 10px; }
.mdt-empty { padding: 60px 20px; text-align: center; color: var(--tx3); font-size: 14px; }
.mdt-spinner { padding: 40px; text-align: center; color: var(--tx3); font-family: var(--font-mono); font-size: 12px; }

/* Encart Brief du jour */
.mdt-brief { margin: 0 0 22px; padding: 14px 18px; border: 1px solid color-mix(in srgb, var(--brand) 35%, transparent);
  border-radius: 12px; background: color-mix(in srgb, var(--brand) 6%, transparent); }
.mdt-brief-head { font-family: var(--font-mono); font-size: 11px; letter-spacing: .12em; text-transform: uppercase; color: var(--tx2); margin-bottom: 8px; }
.mdt-brief-list { margin: 0 0 10px; padding-left: 18px; font-size: 13.5px; }
.mdt-brief-list li { margin: 3px 0; }
.mdt-brief-cta { border: none; background: transparent; color: var(--brand); font: inherit; font-size: 12.5px; cursor: pointer; padding: 0; }

@media (max-width: 720px) {
  .panel-mediatheque { padding: 24px 16px 60px; }
  .mdt-fiche-head { flex-direction: column; }
}
```

- [ ] **Step 6: Panel v1 — bibliothèque + statuts dérivés**

Créer `cockpit/panel-mediatheque.jsx` :

```jsx
// ═══════════════════════════════════════════════════════════════
// PANEL MÉDIATHÈQUE — tracker anime (v1)
// ─────────────────────────────────────────────
// Bandeau Sorties (Task 10) · Bibliothèque (cartes franchise, statuts
// dérivés) · Recherche AniList + fiche préversion/ajout (Task 8) ·
// Fiche bibliothèque + progression (Task 9).
// Données : window.MEDIATHEQUE_DATA (T2 brut) — statuts calculés ici.
// Spec : docs/superpowers/specs/2026-07-14-mediatheque-anime-tracker-design.md
// ═══════════════════════════════════════════════════════════════

const { useState: useMdtState, useMemo: useMdtMemo, useEffect: useMdtEffect } = React;

// ── Statuts dérivés (entrées in_main_chain uniquement) ─────────
function mdtReleased(e) {
  if (e.airing_status === "FINISHED" || e.airing_status === "CANCELLED") return e.episodes_total || 0;
  if (e.airing_status === "RELEASING") return Math.max(0, (e.next_episode_number || 1) - 1);
  return 0;
}

function mdtStatus(chainEntries, progressById) {
  const watched = chainEntries.reduce((s, e) => s + (progressById.get(e.id) || 0), 0);
  const released = chainEntries.reduce((s, e) => s + mdtReleased(e), 0);
  const allFinished = chainEntries.every((e) => e.airing_status === "FINISHED" || e.airing_status === "CANCELLED");
  if (watched === 0) return { id: "to_watch", label: "À voir", watched, released };
  if (watched < released) return { id: "watching", label: "En cours", watched, released };
  return allFinished
    ? { id: "seen", label: "Vu", watched, released }
    : { id: "up_to_date", label: "En cours · à jour", watched, released };
}

function mdtFmtDate(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch { return iso; }
}

function PanelMediatheque({ data, onNavigate }) {
  const D = window.MEDIATHEQUE_DATA || { franchises: [], entries: [], progress: [], releases: [] };
  const [tick, setTick] = useMdtState(0);            // bump après mutation locale de D
  const [statusFilter, setStatusFilter] = useMdtState("all");
  const [sort, setSort] = useMdtState("activity");
  const [query, setQuery] = useMdtState("");          // >= 3 chars => vue recherche (Task 8)
  const [fiche, setFiche] = useMdtState(null);        // {mode:"library"|"preview", ...} (Tasks 8-9)

  const entriesByFranchise = useMdtMemo(() => {
    const map = new Map();
    for (const e of D.entries) {
      if (!map.has(e.franchise_id)) map.set(e.franchise_id, []);
      map.get(e.franchise_id).push(e);
    }
    for (const list of map.values()) list.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return map;
  }, [D.entries, tick]);

  const progressById = useMdtMemo(() => {
    const map = new Map();
    for (const p of D.progress) map.set(p.entry_id, p.episodes_watched || 0);
    return map;
  }, [D.progress, tick]);

  const cards = useMdtMemo(() => {
    return D.franchises.map((f) => {
      const entries = entriesByFranchise.get(f.id) || [];
      const chain = entries.filter((e) => e.in_main_chain);
      const st = mdtStatus(chain, progressById);
      const lastTouch = Math.max(
        new Date(f.added_at || 0).getTime(),
        ...entries.map((e) => progressById.has(e.id) ? new Date(D.progress.find((p) => p.entry_id === e.id)?.updated_at || 0).getTime() : 0)
      );
      return { f, entries, st, lastTouch };
    });
  }, [D.franchises, entriesByFranchise, progressById, tick]);

  const visible = useMdtMemo(() => {
    let list = cards;
    if (statusFilter === "to_watch") list = list.filter((c) => c.st.id === "to_watch");
    else if (statusFilter === "watching") list = list.filter((c) => c.st.id === "watching" || c.st.id === "up_to_date");
    else if (statusFilter === "seen") list = list.filter((c) => c.st.id === "seen");
    const bySort = {
      activity: (a, b) => b.lastTouch - a.lastTouch,
      added: (a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0),
      alpha: (a, b) => (a.f.title_english || a.f.title_romaji || "").localeCompare(b.f.title_english || b.f.title_romaji || ""),
    };
    return [...list].sort(bySort[sort] || bySort.activity);
  }, [cards, statusFilter, sort]);

  const searching = query.trim().length >= 3;

  return (
    <div className="panel-mediatheque">
      <div className="mdt-kicker">Personnel · anime</div>
      <h1 className="mdt-title">Médiathèque</h1>

      {/* Bandeau Sorties — rempli en Task 10 */}

      <div className="mdt-toolbar">
        <input
          className="mdt-search"
          type="search"
          placeholder="Rechercher un anime (AniList)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un anime"
        />
        {!searching && (<>
          <div className="mdt-filters" role="group" aria-label="Filtrer par statut">
            {[["all", "Tous"], ["to_watch", "À voir"], ["watching", "En cours"], ["seen", "Vu"]].map(([id, label]) => (
              <button key={id} className={`mdt-chip ${statusFilter === id ? "is-active" : ""}`}
                onClick={() => setStatusFilter(id)}>{label}</button>
            ))}
          </div>
          <select className="mdt-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier">
            <option value="activity">Dernière activité</option>
            <option value="added">Date d'ajout</option>
            <option value="alpha">Alphabétique</option>
          </select>
        </>)}
      </div>

      {searching ? (
        <div className="mdt-empty">Recherche branchée en Task 8.</div>
      ) : visible.length === 0 ? (
        <div className="mdt-empty">
          {D.franchises.length === 0
            ? "Ta bibliothèque est vide — cherche un anime ci-dessus pour commencer."
            : "Aucune franchise ne correspond à ce filtre."}
        </div>
      ) : (
        <div className="mdt-grid">
          {visible.map(({ f, entries, st }) => (
            <button key={f.id} className="mdt-card" onClick={() => setFiche({ mode: "library", franchiseId: f.id })}>
              {f.cover_url
                ? <img className="mdt-card-cover" src={f.cover_url} alt="" loading="lazy" />
                : <div className="mdt-card-cover" />}
              <div className="mdt-card-body">
                <p className="mdt-card-title">{f.title_english || f.title_romaji}</p>
                <p className="mdt-card-sub">{f.title_romaji}</p>
                <span className={`mdt-badge mdt-badge--${st.id}`}>{st.label}</span>
                <div className="mdt-progressbar" aria-hidden="true">
                  <div style={{ width: (st.released ? Math.min(100, Math.round(100 * st.watched / st.released)) : 0) + "%" }} />
                </div>
                <div className="mdt-card-count">{st.watched}/{st.released || "?"} ép. · {entries.filter((e) => e.in_main_chain).length} entrées</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Fiche franchise (modale) — Tasks 8-9 */}
    </div>
  );
}

window.PanelMediatheque = PanelMediatheque;
```

- [ ] **Step 7: Vérification file:// + commit**

Run: `node scripts/sync-sw.mjs`
Ouvrir `index.html` en local (`start index.html` sous Windows) : l'onglet « Médiathèque » apparaît dans le groupe Personnel avec l'icône tv ; le panel s'affiche avec l'état vide « Ta bibliothèque est vide… » ; aucune erreur console liée à `PanelMediatheque`/`anilist`.

```bash
git add cockpit/icons.jsx cockpit/nav.js cockpit/app.jsx index.html cockpit/styles-mediatheque.css cockpit/panel-mediatheque.jsx sw.js
git commit -m "feat(mediatheque): onglet squelette — nav, route, bibliothèque + statuts dérivés (À voir/En cours/À jour/Vu)"
```

---

### Task 8: Recherche AniList + fiche préversion + ajout atomique

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx`
- Modify: `docs/telemetry.md` (2 lignes, même commit)

**Interfaces:**
- Consumes: `window.anilist.searchAnime/fetchFranchiseLive/toFranchiseRow/toEntryRows/fuzzyDate` (Task 4) ; `window.sb`, `window.track`, `cockpitToast` (existants).
- Produces: `FicheFranchise` (composant partagé, enrichi Task 9) ; mutation locale de `window.MEDIATHEQUE_DATA` + `setTick`.

- [ ] **Step 1: Hook de recherche debounced**

Dans `PanelMediatheque`, sous les `useMdtState` existants, ajouter :

```jsx
  const [results, setResults] = useMdtState(null);   // null = idle, [] = zéro résultat
  const [searchErr, setSearchErr] = useMdtState(null);

  useMdtEffect(() => {
    if (!searching) { setResults(null); setSearchErr(null); return; }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const media = await window.anilist.searchAnime(query.trim());
        if (cancelled) return;
        setResults(media);
        setSearchErr(null);
        window.track && window.track("mediatheque_search", { q_len: query.trim().length, results: media.length });
      } catch (e) {
        if (!cancelled) { setResults([]); setSearchErr("AniList ne répond pas — réessaie dans un instant."); }
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, searching]);
```

- [ ] **Step 2: Vue résultats**

Remplacer le bloc `{searching ? (<div className="mdt-empty">Recherche branchée en Task 8.</div>) : ...}` — la branche `searching` devient :

```jsx
      {searching ? (
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
      ) : /* … bibliothèque inchangée … */}
```

Et ajouter le memo `libSourceIds` près des autres :

```jsx
  const libSourceIds = useMdtMemo(() => new Set(D.entries.map((e) => e.source_id)), [D.entries, tick]);
```

- [ ] **Step 3: Préversion + ajout atomique**

Ajouter dans `PanelMediatheque` :

```jsx
  async function openPreview(anchorId) {
    setFiche({ mode: "preview", loading: true });
    try {
      const { built, mediaById } = await window.anilist.fetchFranchiseLive(anchorId);
      const existing = D.franchises.find((f) => f.source_root_id === built.root_id);
      if (existing) { setFiche({ mode: "library", franchiseId: existing.id }); return; }
      setFiche({ mode: "preview", built, mediaById });
    } catch (e) {
      setFiche(null);
      window.cockpitToast && cockpitToast("Fiche AniList indisponible — réessaie.", { kind: "error" });
    }
  }

  async function addFranchise(built, mediaById) {
    const base = window.SUPABASE_URL + "/rest/v1/";
    const frRow = window.anilist.toFranchiseRow(built, mediaById);
    let created = null;
    try {
      const [fr] = await window.sb.postJSON(base + "media_franchises", frRow);
      created = fr;
      const entryRows = window.anilist.toEntryRows(built, mediaById).map((r) => ({ ...r, franchise_id: fr.id }));
      const savedEntries = await window.sb.postJSON(base + "media_entries", entryRows);
      window.MEDIATHEQUE_DATA.franchises.unshift(fr);
      window.MEDIATHEQUE_DATA.entries.push(...savedEntries);
      setTick((t) => t + 1);
      setFiche({ mode: "library", franchiseId: fr.id });
      window.track && window.track("mediatheque_add", { franchise_root_id: built.root_id, entries: savedEntries.length, source: "anilist" });
      cockpitToast(`${fr.title_english || fr.title_romaji} ajouté à ta bibliothèque.`, { kind: "success" });
    } catch (e) {
      if (created) { try { await window.sb.deleteRequest(base + "media_franchises?id=eq." + created.id); } catch (_) {} }
      cockpitToast("Échec de l'ajout — réessaie.", { kind: "error" });
    }
  }
```

**Cas dédup** : si la franchise existe déjà (même `source_root_id`), `openPreview` ouvre directement sa fiche bibliothèque — pas de doublon possible (l'UNIQUE en base est le filet).

- [ ] **Step 4: Composant FicheFranchise (mode préversion)**

Ajouter au-dessus de `PanelMediatheque` :

```jsx
function FicheFranchise({ fiche, D, progressById, onClose, onAdd, onProgress, onRemove }) {
  // Normalise les deux modes vers un shape commun d'affichage.
  let head, rows;
  if (fiche.mode === "preview") {
    if (fiche.loading) return (
      <div className="mdt-modal-backdrop" onClick={onClose}>
        <div className="mdt-modal" onClick={(e) => e.stopPropagation()}><div className="mdt-spinner">Construction de la fiche franchise…</div></div>
      </div>
    );
    const root = fiche.mediaById[fiche.built.root_id];
    head = {
      cover: root.coverImage && root.coverImage.large,
      title: (root.title && (root.title.english || root.title.romaji)) || "?",
      romaji: root.title && root.title.romaji, native: root.title && root.title.native,
      genres: (root.genres || []).join(" · "), synopsis: null,
    };
    rows = fiche.built.entries.map((e) => {
      const m = fiche.mediaById[e.source_id];
      return {
        key: e.source_id, in_main_chain: e.in_main_chain, kind: e.kind, season_number: e.season_number,
        title: (m.title && (m.title.english || m.title.romaji)) || "?",
        status: m.status, episodes_total: m.episodes != null ? m.episodes : (m.format === "MOVIE" ? 1 : null),
        start_date: window.anilist.fuzzyDate(m.startDate),
        next_episode_number: m.nextAiringEpisode && m.nextAiringEpisode.episode,
        next_episode_airing_at: m.nextAiringEpisode ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() : null,
        entry: null,
      };
    });
  } else {
    const f = D.franchises.find((x) => x.id === fiche.franchiseId);
    if (!f) return null;
    const entries = D.entries.filter((e) => e.franchise_id === f.id).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    head = { cover: f.cover_url, title: f.title_english || f.title_romaji, romaji: f.title_romaji,
      native: f.title_native, genres: (f.genres || []).join(" · "), synopsis: f.synopsis, franchise: f };
    rows = entries.map((e) => ({
      key: e.id, in_main_chain: e.in_main_chain, kind: e.kind, season_number: e.season_number,
      title: e.title_english || e.title_romaji, status: e.airing_status, episodes_total: e.episodes_total,
      start_date: e.start_date, next_episode_number: e.next_episode_number,
      next_episode_airing_at: e.next_episode_airing_at, entry: e,
    }));
  }
  const chain = rows.filter((r) => r.in_main_chain);
  const bonus = rows.filter((r) => !r.in_main_chain);
  const rowLabel = (r) => r.kind === "season" ? `S${r.season_number}` : (r.kind === "movie" ? "Film" : r.kind.toUpperCase());
  const STATUS_FR = { FINISHED: "Terminée", RELEASING: "En diffusion", NOT_YET_RELEASED: "Annoncée", CANCELLED: "Annulée", HIATUS: "En pause" };

  return (
    <div className="mdt-modal-backdrop" onClick={onClose}>
      <div className="mdt-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="mdt-fiche-head">
          {head.cover ? <img className="mdt-fiche-cover" src={head.cover} alt="" /> : <div className="mdt-fiche-cover" />}
          <div className="mdt-fiche-titles">
            <h2>{head.title}</h2>
            <p className="mdt-fiche-native">{head.romaji}{head.native ? ` · ${head.native}` : ""}</p>
            <p className="mdt-fiche-meta">{head.genres}</p>
            {head.synopsis && <p className="mdt-fiche-synopsis">{head.synopsis}</p>}
          </div>
        </div>

        <div className="mdt-section-label">Saisons & films canon</div>
        {chain.map((r) => (
          <div key={r.key} className="mdt-entry">
            <div className="mdt-entry-info">
              <strong>{rowLabel(r)}</strong> · {r.title}
              <div className="mdt-entry-sub">
                {r.start_date ? r.start_date.slice(0, 4) : "date ?"} · {r.episodes_total != null ? `${r.episodes_total} ép.` : "ép. ?"} · {STATUS_FR[r.status] || r.status}
                {r.status === "RELEASING" && r.next_episode_number
                  ? ` · ép. ${r.next_episode_number} le ${mdtFmtDate(r.next_episode_airing_at)}` : ""}
              </div>
            </div>
            {r.entry && onProgress && <MdtStepper entry={r.entry} progressById={progressById} onProgress={onProgress} />}
          </div>
        ))}

        {bonus.length > 0 && <>
          <div className="mdt-section-label">Bonus (hors progression)</div>
          {bonus.map((r) => (
            <div key={r.key} className="mdt-entry">
              <div className="mdt-entry-info">
                <strong>{rowLabel(r)}</strong> · {r.title}
                <div className="mdt-entry-sub">{r.start_date ? r.start_date.slice(0, 4) : "date ?"} · {r.episodes_total != null ? `${r.episodes_total} ép.` : "ép. ?"}</div>
              </div>
              {r.entry && onProgress && <MdtStepper entry={r.entry} progressById={progressById} onProgress={onProgress} />}
            </div>
          ))}
        </>}

        <div className="mdt-fiche-actions">
          {fiche.mode === "preview"
            ? <button className="mdt-btn" onClick={onAdd}>+ Ajouter à ma bibliothèque</button>
            : <button className="mdt-btn mdt-btn--ghost" onClick={onRemove}>Retirer de ma bibliothèque</button>}
          <button className="mdt-btn mdt-btn--ghost" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
}
```

(`MdtStepper` arrive en Task 9 — pour ce commit, ajouter un placeholder : `function MdtStepper(){ return null; }` marqué `// remplacé en Task 9`.)

Et brancher le rendu en bas de `PanelMediatheque` (remplace le commentaire fiche) :

```jsx
      {fiche && (
        <FicheFranchise
          fiche={fiche} D={D} progressById={progressById}
          onClose={() => setFiche(null)}
          onAdd={fiche.mode === "preview" && fiche.built ? () => addFranchise(fiche.built, fiche.mediaById) : null}
          onProgress={null /* Task 9 */}
          onRemove={null /* Task 9 */}
        />
      )}
```

- [ ] **Step 5: Télémétrie (même commit)**

Dans `docs/telemetry.md`, ajouter au tableau :

```markdown
| `mediatheque_search` | `{q_len, results}` | `cockpit/panel-mediatheque.jsx` après réponse AniList (debounce 400 ms) |
| `mediatheque_add` | `{franchise_root_id, entries, source}` | `cockpit/panel-mediatheque.jsx::addFranchise()` après persistance |
```

- [ ] **Step 6: Vérifier + commit**

Ouvrir `index.html` en file:// : taper « frieren » → résultats AniList s'affichent (réseau réel) ; clic → fiche préversion avec saisons datées. L'AJOUT nécessite un JWT (RLS) → il se vérifie en prod (Task 12) ; en file:// vérifier seulement que le clic « Ajouter » affiche le toast d'erreur proprement (pas d'exception console).
Run: `node scripts/sync-sw.mjs` (index.html non modifié ici, mais cockpit/** l'est).

```bash
git add cockpit/panel-mediatheque.jsx docs/telemetry.md sw.js
git commit -m "feat(mediatheque): recherche AniList + fiche préversion + ajout atomique avec rollback"
```

---

### Task 9: Progression (steppers), retrait de bibliothèque

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx`
- Modify: `docs/telemetry.md` (2 lignes, même commit)

**Interfaces:**
- Consumes: upsert PostgREST `POST media_progress?on_conflict=entry_id` + `Prefer: resolution=merge-duplicates` (pattern `pfUpsertField`, `cockpit/panel-profile.jsx:83`) ; `cockpitConfirm` (lib/dialog.js).
- Produces: `MdtStepper` fonctionnel ; `writeProgress(entry, value)` optimiste ; `removeFranchise(franchiseId)`.

- [ ] **Step 1: Remplacer le placeholder MdtStepper**

```jsx
function MdtStepper({ entry, progressById, onProgress }) {
  const [editing, setEditing] = useMdtState(false);
  const watched = progressById.get(entry.id) || 0;
  const released = mdtReleased(entry);
  const max = released;                       // plafonné aux épisodes sortis
  const disabled = entry.airing_status === "NOT_YET_RELEASED" || max === 0;
  const clamp = (v) => Math.max(0, Math.min(max, v));
  return (
    <div className="mdt-stepper">
      <button disabled={disabled || watched <= 0} onClick={() => onProgress(entry, clamp(watched - 1))} aria-label="Un épisode de moins">−</button>
      <span className="mdt-stepper-count" onClick={() => !disabled && setEditing(true)}>
        {editing ? (
          <input
            autoFocus type="number" min="0" max={max} defaultValue={watched}
            onBlur={(e) => { setEditing(false); onProgress(entry, clamp(Number(e.target.value) || 0)); }}
            onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditing(false); }}
          />
        ) : `${watched}/${entry.episodes_total != null ? entry.episodes_total : "?"}`}
      </span>
      <button disabled={disabled || watched >= max} onClick={() => onProgress(entry, clamp(watched + 1))} aria-label="Un épisode de plus">+</button>
      <button disabled={disabled || watched >= max} className="mdt-chip" style={{ marginLeft: 4 }}
        onClick={() => onProgress(entry, max)} title="Marquer tous les épisodes sortis comme vus">✓ vue</button>
    </div>
  );
}
```

- [ ] **Step 2: Écriture optimiste + retrait**

Dans `PanelMediatheque` :

```jsx
  async function writeProgress(entry, value) {
    const D2 = window.MEDIATHEQUE_DATA;
    const prev = D2.progress.find((p) => p.entry_id === entry.id);
    const prevValue = prev ? prev.episodes_watched : null;
    // Optimiste : muter le global tout de suite.
    if (prev) prev.episodes_watched = value;
    else D2.progress.push({ entry_id: entry.id, episodes_watched: value, updated_at: new Date().toISOString() });
    setTick((t) => t + 1);
    try {
      const url = window.SUPABASE_URL + "/rest/v1/media_progress?on_conflict=entry_id";
      const res = await fetch(url, {
        method: "POST",
        headers: { ...window.sb.headers, "Content-Type": "application/json", "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{ entry_id: entry.id, episodes_watched: value, updated_at: new Date().toISOString() }]),
      });
      if (!res.ok) throw new Error("progress " + res.status);
      const released = mdtReleased(entry);
      window.track && window.track("mediatheque_progress", { entry_kind: entry.kind, delta: value - (prevValue || 0), completed: value >= released && released > 0 });
    } catch (e) {
      // Rollback.
      if (prevValue === null) { const i = D2.progress.findIndex((p) => p.entry_id === entry.id); if (i >= 0) D2.progress.splice(i, 1); }
      else { const p = D2.progress.find((x) => x.entry_id === entry.id); if (p) p.episodes_watched = prevValue; }
      setTick((t) => t + 1);
      cockpitToast("Progression non enregistrée — réessaie.", { kind: "error" });
    }
  }

  async function removeFranchise(franchiseId) {
    const f = D.franchises.find((x) => x.id === franchiseId);
    const ok = await cockpitConfirm(
      `Retirer « ${f ? (f.title_english || f.title_romaji) : "cette franchise"} » ? La progression sera supprimée.`,
      { danger: true });
    if (!ok) return;
    try {
      const res = await window.sb.deleteRequest(window.SUPABASE_URL + "/rest/v1/media_franchises?id=eq." + franchiseId);
      if (!res.ok) throw new Error("delete " + res.status);
      const D2 = window.MEDIATHEQUE_DATA;
      const entryIds = new Set(D2.entries.filter((e) => e.franchise_id === franchiseId).map((e) => e.id));
      D2.franchises = D2.franchises.filter((x) => x.id !== franchiseId);
      D2.entries = D2.entries.filter((e) => e.franchise_id !== franchiseId);
      D2.progress = D2.progress.filter((p) => !entryIds.has(p.entry_id));
      D2.releases = D2.releases.filter((r) => r.franchise_id !== franchiseId);
      setTick((t) => t + 1);
      setFiche(null);
      window.track && window.track("mediatheque_remove", { franchise_root_id: f ? f.source_root_id : null });
    } catch (e) {
      cockpitToast("Suppression impossible — réessaie.", { kind: "error" });
    }
  }
```

**Attention mutation** : `removeFranchise` REMPLACE les tableaux (`D2.franchises = ...`) — or `D` pointe sur l'objet global. Les memos dépendent de `tick`, et le composant relit `window.MEDIATHEQUE_DATA` à chaque render (`const D = window.MEDIATHEQUE_DATA || ...`) donc les nouvelles références sont bien vues. Ne PAS capturer `D.entries` dans une variable module-level.

- [ ] **Step 3: Brancher la fiche**

Dans le rendu de `FicheFranchise`, remplacer `onProgress={null /* Task 9 */}` par `onProgress={fiche.mode === "library" ? writeProgress : null}` et `onRemove={null /* Task 9 */}` par `onRemove={fiche.mode === "library" ? () => removeFranchise(fiche.franchiseId) : null}`.

- [ ] **Step 4: Télémétrie (même commit)**

`docs/telemetry.md` :

```markdown
| `mediatheque_progress` | `{entry_kind, delta, completed}` | `cockpit/panel-mediatheque.jsx::writeProgress()` après upsert réussi |
| `mediatheque_remove` | `{franchise_root_id}` | `cockpit/panel-mediatheque.jsx::removeFranchise()` après DELETE |
```

- [ ] **Step 5: Vérifier + commit**

file:// : ouvrir une fiche préversion → les steppers ne s'affichent PAS (mode preview, onProgress null) ; pas d'erreur console.
Run: `node scripts/sync-sw.mjs`

```bash
git add cockpit/panel-mediatheque.jsx docs/telemetry.md sw.js
git commit -m "feat(mediatheque): progression par saison (stepper optimiste, plafonnée aux ép. sortis) + retrait"
```

---

### Task 10: Bandeau Sorties + acquittement + encart Brief du jour

**Files:**
- Modify: `cockpit/panel-mediatheque.jsx` (bandeau)
- Modify: `cockpit/home.jsx` (encart, insertion entre les lignes 382 et 384 — entre la fermeture du bloc `home-toggle` et le ternaire `viewMode === "morning"`)
- Modify: `docs/telemetry.md` (1 ligne, même commit)

**Interfaces:**
- Consumes: `MEDIATHEQUE_DATA.releases` + `entries` (panel) ; `data.media_releases` (home, Tier 1 de Task 6).

- [ ] **Step 1: Bandeau Sorties dans le panel**

Remplacer le commentaire `{/* Bandeau Sorties — rempli en Task 10 */}` par :

```jsx
      <MdtReleasesStrip D={D} tick={tick} onAck={ackRelease} />
```

Ajouter le composant au-dessus de `PanelMediatheque` :

```jsx
function MdtReleasesStrip({ D, tick, onAck }) {
  const events = D.releases.filter((r) => !r.acknowledged);
  const calendar = useMdtMemo(() => {
    const items = [];
    const now = Date.now();
    for (const e of D.entries) {
      if (e.airing_status === "RELEASING" && e.next_episode_airing_at) {
        items.push({ key: e.id, when: new Date(e.next_episode_airing_at).getTime(),
          label: e.title_english || e.title_romaji,
          detail: `ép. ${e.next_episode_number} · ${mdtFmtDate(e.next_episode_airing_at)}` });
      } else if (e.airing_status === "NOT_YET_RELEASED" && e.start_date && new Date(e.start_date).getTime() > now - 86400000) {
        items.push({ key: e.id, when: new Date(e.start_date).getTime(),
          label: e.title_english || e.title_romaji, detail: `première le ${mdtFmtDate(e.start_date)}` });
      }
    }
    return items.sort((a, b) => a.when - b.when).slice(0, 8);
  }, [D.entries, tick]);

  if (!events.length && !calendar.length) return null;
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
      {calendar.length > 0 && (
        <div className="mdt-calendar">
          {calendar.map((c) => (
            <span key={c.key} className="mdt-calendar-item">📅 <strong>{c.label}</strong> — {c.detail}</span>
          ))}
        </div>
      )}
    </section>
  );
}
```

Et dans `PanelMediatheque` :

```jsx
  async function ackRelease(release) {
    release.acknowledged = true;            // optimiste
    setTick((t) => t + 1);
    try {
      const res = await window.sb.patchJSON(
        window.SUPABASE_URL + "/rest/v1/media_releases?id=eq." + release.id,
        { acknowledged: true });
      if (!res.ok) throw new Error("ack " + res.status);
      window.track && window.track("mediatheque_release_ack", { event_type: release.event_type });
    } catch (e) {
      release.acknowledged = false;
      setTick((t) => t + 1);
      cockpitToast("Acquittement non enregistré — réessaie.", { kind: "error" });
    }
  }
```

- [ ] **Step 2: Encart Brief du jour**

Dans `cockpit/home.jsx`, ajouter le composant AVANT `function Home(...)` (~ligne 210) :

```jsx
function MdtBriefCard({ releases = [], onNavigate }) {
  if (!releases.length) return null;
  return (
    <section className="mdt-brief" aria-label="Sorties médiathèque">
      <div className="mdt-brief-head">📺 Médiathèque — {releases.length} nouveauté{releases.length > 1 ? "s" : ""}</div>
      <ul className="mdt-brief-list">
        {releases.slice(0, 3).map((r) => (
          <li key={r.id}>{r.title}{r.event_date ? ` · ${r.event_date}` : ""}</li>
        ))}
      </ul>
      <button className="mdt-brief-cta" onClick={() => onNavigate && onNavigate("mediatheque")}>Ouvrir la médiathèque →</button>
    </section>
  );
}
```

Puis dans le JSX de `Home`, entre la fermeture `)}` du bloc `home-toggle` (ligne 382) et la ligne `{viewMode === "morning" && ...}` (ligne 384), insérer :

```jsx
      <MdtBriefCard releases={data.media_releases || []} onNavigate={onNavigate} />
```

(Rendu dans les DEUX modes morning/full ; disparaît quand il n'y a rien à annoncer.)

- [ ] **Step 3: Télémétrie (même commit)**

`docs/telemetry.md` :

```markdown
| `mediatheque_release_ack` | `{event_type}` | `cockpit/panel-mediatheque.jsx::ackRelease()` après PATCH |
```

- [ ] **Step 4: Vérifier + commit**

file:// : panel sans releases → pas de bandeau ; brief sans `media_releases` → pas d'encart ; console propre.
Run: `node scripts/sync-sw.mjs`

```bash
git add cockpit/panel-mediatheque.jsx cockpit/home.jsx docs/telemetry.md sw.js
git commit -m "feat(mediatheque): bandeau sorties + calendrier de ma liste + encart Brief du jour"
```

---

### Task 11: Docs & conformité (spec onglet, index, archi, ADR, CLAUDE.md)

**Files:**
- Create: `docs/specs/tab-mediatheque.md`
- Modify: `docs/specs/index.json` (nouvelle entrée + renumérotation)
- Modify: `jarvis/spec.json` (`cockpit_tabs`)
- Modify: `docs/architecture/dependencies.yaml` (section `panels:`)
- Create: `docs/architecture/flows/perso-mediatheque.yaml`
- Modify: `docs/architecture/decisions.md` (ADR-28)
- Modify: `CLAUDE.md` (29 → 30 onglets, 3 endroits)

- [ ] **Step 1: Spec onglet**

Créer `docs/specs/tab-mediatheque.md` (template `docs/specs/_template.md` ; rappel règles éditoriales : AUCUN chemin de fichier/composant/colonne dans « Parcours » et « Fonctionnalités ») :

```markdown
# Médiathèque

> Bibliothèque anime personnelle : recherche, suivi de progression par saison, alerte sur les nouvelles sorties.

## Scope
perso

## Finalité fonctionnelle
Suivre tous les animes vus / à voir au même endroit : retrouver un anime avec ses saisons et leurs dates, déclarer sa progression épisode par épisode, et être prévenu dès qu'une nouvelle saison d'un anime suivi est annoncée ou commence à être diffusée — sans dépendre d'un site tiers. Première brique d'une médiathèque élargie (mangas, livres, films, séries).

## Parcours utilisateur
1. Clic sidebar « Médiathèque » — la bibliothèque s'affiche avec, en haut, les sorties récentes et le calendrier des prochaines diffusions de sa liste.
2. Tape le nom d'un anime dans le champ de recherche — les résultats apparaissent en direct.
3. Clic sur un résultat — la fiche franchise se construit : saisons numérotées et datées, films canon, bonus, prochaines sorties.
4. Clic « Ajouter à ma bibliothèque » — la franchise rejoint la grille avec le statut « À voir ».
5. Ouvre une fiche de sa bibliothèque et déclare sa progression saison par saison (+1, saisie directe, « ✓ vue ») — le statut global (À voir / En cours / En cours · à jour / Vu) se met à jour tout seul.
6. Le lendemain d'une annonce de nouvelle saison, lit l'encart Médiathèque du Brief du jour, ouvre l'onglet et acquitte l'événement d'un ✓.

## Fonctionnalités
- **Recherche en direct** : résultats AniList (titres anglais/romaji/japonais, format, année, genres, score) pendant la frappe ; les fiches déjà en bibliothèque sont signalées.
- **Fiche franchise** : toutes les saisons regroupées et numérotées avec dates et nombre d'épisodes, films canon à leur place chronologique, OVA/bonus à part ; prochaine diffusion datée pour les saisons en cours.
- **Bibliothèque** : grille de cartes (jaquette, statut dérivé, barre de progression), filtres par statut, tri par activité/ajout/alphabétique.
- **Progression par saison** : compteur « vu jusqu'à l'épisode N », plafonné aux épisodes réellement sortis ; le statut de la franchise en découle automatiquement.
- **Sorties** : bandeau des événements détectés (nouvelle saison, diffusion commencée, date annoncée) avec acquittement, calendrier des prochaines diffusions de sa liste, et encart dans le Brief du jour.

## Front — structure UI
`cockpit/panel-mediatheque.jsx` (`window.PanelMediatheque`) : toolbar (`.mdt-search`, chips statut, select tri), bandeau `<MdtReleasesStrip>`, grille `.mdt-grid` de `.mdt-card`, modale `<FicheFranchise>` (préversion et bibliothèque), stepper `<MdtStepper>`. Encart Brief : `<MdtBriefCard>` dans `cockpit/home.jsx`. Styles : `cockpit/styles-mediatheque.css` (préfixe `mdt-`).

## Front — fonctions JS
| Fonction | Rôle | Fichier |
|----------|------|---------|
| `mdtStatus()` / `mdtReleased()` | statuts dérivés (À voir/En cours/À jour/Vu), épisodes sortis | `cockpit/panel-mediatheque.jsx` |
| `openPreview()` / `addFranchise()` | walk live + ajout atomique (rollback si échec) | `cockpit/panel-mediatheque.jsx` |
| `writeProgress()` | upsert optimiste de la progression | `cockpit/panel-mediatheque.jsx` |
| `ackRelease()` / `removeFranchise()` | acquittement / retrait cascade | `cockpit/panel-mediatheque.jsx` |
| `searchAnime()` / `fetchFranchiseLive()` / `buildFranchise()` | client AniList + walk franchise (contrat commun pipeline) | `cockpit/lib/anilist.js` |

## Back — sources de données
`media_franchises` (1 ligne/franchise ajoutée), `media_entries` (saisons/films/OVA, ~5-30/franchise, rafraîchies par le pipeline), `media_progress` (1 ligne/entrée entamée, jamais écrite par le pipeline), `media_releases` (événements détectés, UNIQUE(entry_id,event_type)). Migration `sql/020_media_tracker.sql`, RLS authenticated (4 opérations).

## Back — pipelines qui alimentent
- `anime_tracker_sync` (quotidien 07:30 UTC) → refresh des entrées suivies + détection new_entry / airing_started / date_announced → `media_releases`.

## Appels externes
AniList GraphQL `https://graphql.anilist.co` — public, sans clé. Front : recherche + walk à l'ajout (≥700 ms entre requêtes). Pipeline : batchs id_in de 25, throttle 2,5 s. Les deux respectent Retry-After sur 429.

## Dépendances
- Onglets : Brief du jour (encart sorties)
- Pipelines : anime_tracker_sync
- Variables d'env / secrets : SUPABASE_URL + SUPABASE_SERVICE_KEY (pipeline) — aucun secret nouveau

## États & edge cases
- Bibliothèque vide → invite à chercher. AniList down/429 → message d'erreur sur la recherche, bibliothèque et progression intactes (données locales).
- Ajout interrompu → rien n'est persisté (rollback), toast « réessaie ». Franchise déjà présente → ouverture de sa fiche (dédup par racine).
- Saison annoncée sans date → numérotée en dernier, stepper désactivé. Épisodes plafonnés aux sortis pour une saison en diffusion.
- Un report de date met à jour le calendrier sans re-déclencher d'événement.

## Limitations connues / TODO
- [ ] v1 anime uniquement — mangas/livres/films/séries prévus (schéma media_type prêt)
- [ ] pas de note/score ni statut manuel « Abandonné »
- [ ] import d'historique MAL/AniList non couvert

## Dernière MAJ
2026-07-14 — <sha court du commit de cette task>
```

- [ ] **Step 2: index.json + jarvis/spec.json**

`docs/specs/index.json` : insérer après l'entrée `gaming` (order 27) :

```json
    {
      "slug": "mediatheque",
      "title": "Médiathèque",
      "order": 28,
      "group": "Personnel",
      "dom_id": "mediatheque",
      "scope": "perso",
      "status": "documented",
      "last_updated": "2026-07-14"
    },
```

puis renuméroter `stacks` 28→29 et `history` 29→30.

`jarvis/spec.json` → `cockpit_tabs.groups[]`, groupe Personnel (id `personnel`), ajouter après l'onglet `gaming` :

```json
          {
            "id": "mediatheque",
            "label": "Médiathèque",
            "icon": "tv",
            "description": "Bibliothèque anime personnelle : recherche AniList, franchises regroupées (saisons + films/OVA), progression par saison, statuts dérivés, sorties détectées quotidiennement + encart Brief.",
            "panel_file": "cockpit/panel-mediatheque.jsx",
            "data_sources": ["media_franchises", "media_entries", "media_progress", "media_releases"],
            "frequency": "daily",
            "update_details": "Pipeline anime_tracker_sync 07:30 UTC (AniList GraphQL) — rafraîchit uniquement les franchises suivies"
          },
```

Mettre à jour `cockpit_tabs.summary` (« Catalogue des 30 onglets… ») et `cockpit_tabs.updated_at` (`2026-07-14`).

- [ ] **Step 3: dependencies.yaml (panel) + flow + ADR**

`docs/architecture/dependencies.yaml`, section `panels:`, après l'entrée `gaming` :

```yaml
  - id: mediatheque
    file: cockpit/panel-mediatheque.jsx
    reads: [media_franchises, media_entries, media_progress, media_releases]
    writes: [media_franchises, media_entries, media_progress, media_releases, usage_events]  # ajout/progression/ack ; entries créées à l'ajout puis pipeline-owned
```

Créer `docs/architecture/flows/perso-mediatheque.yaml` :

```yaml
# Flow : Médiathèque anime (tracker AniList)
# STUB — voir pipelines.yaml::anime_tracker_sync.

id: perso-mediatheque
label: "Médiathèque anime (bibliothèque + sorties)"
domain: perso
status: todo

source_api:
  - name: "AniList GraphQL"
    detail: "graphql.anilist.co — recherche + Media(id_in) avec relations ; public sans clé ; walk franchise = contrat commun front/pipeline"

pipeline:
  id: anime_tracker_sync
  workflow: ".github/workflows/anime-tracker-sync.yml"
  script: "pipelines/anime_tracker_sync.py"
  cron: "30 7 * * *"

tables:
  - name: media_franchises
    write: true
  - name: media_entries
    write: true
  - name: media_releases
    write: true
  - name: media_progress
    write: false   # user-owned, front uniquement

panels:
  - id: mediatheque
    detail: "Panel Médiathèque — bandeau Sorties + calendrier, grille bibliothèque (statuts dérivés), recherche AniList, fiche franchise avec steppers"
  - id: brief
    detail: "Encart MdtBriefCard (media_releases non acquittées < 7j, Tier 1)"
```

`docs/architecture/decisions.md`, à la suite de l'ADR-27 :

```markdown
## ADR-28 · 2026-07-14 · Médiathèque — AniList GraphQL + modèle franchise regroupée

**Contexte.** Nouvel onglet de tracking personnel anime (extensible mangas/livres/films/séries). Il faut une source qui donne titres EN/JP, saisons datées, prochaines diffusions — et permette d'être prévenu quand une nouvelle saison d'un anime suivi arrive.

**Décision.**
1. **AniList GraphQL** (public, sans clé, CORS) plutôt que Jikan pourtant déjà utilisé par la veille : `nextAiringEpisode` donne la date exacte du prochain épisode, le batch `id_in` + relations imbriquées rend le walk 2-4 requêtes, et le manga est couvert nativement pour l'extension. Jikan reste sur la veille anime (pas de migration).
2. **Franchise regroupée** : MAL/AniList modélisent chaque saison comme une fiche ; on regroupe par fermeture SEQUEL/PREQUEL (films canon inclus dans la chaîne), SIDE_STORY à 1 saut en bonus, SPIN_OFF/SUMMARY/ALTERNATIVE/ADAPTATION exclus. Racine = entrée la plus ancienne (dédup UNIQUE(source, source_root_id)).
3. **Walk dupliqué front/pipeline** (JS + Python), verrouillé par fixtures communes `tests/fixtures/franchise_graphs.json` testées des deux côtés — le front doit afficher la fiche AVANT l'ajout, le pipeline re-walke sans navigateur.
4. **Séparation écriture** : le front crée franchises+entrées à l'ajout ; le pipeline (service key) rafraîchit `media_entries` et émet `media_releases` (UNIQUE(entry_id,event_type), anti-bruit : un report de date ne re-déclenche pas) ; `media_progress` est user-owned, jamais touché par le pipeline. Statuts (À voir/En cours/À jour/Vu) **dérivés** de la progression, aucun statut manuel.

**Conséquences.** CSP élargie (`graphql.anilist.co`, `s4.anilist.co`) ; cron quotidien 07:30 UTC ; encart Brief lu directement depuis `media_releases` (zéro couplage Gemini). Extension v2 : nouveaux `media_type` sur le même schéma.
```

- [ ] **Step 4: CLAUDE.md (3 endroits)**

- Ligne 24 : `29 onglets côté cockpit.` → `30 onglets côté cockpit.`
- Ligne 97 : `Specs onglets (29 fichiers + index + template)` → `Specs onglets (30 fichiers + index + template)`
- Ligne 99 : `source canonique nav (6 groupes, 29 onglets)` → `source canonique nav (6 groupes, 30 onglets)`

- [ ] **Step 5: Valider + commit**

Run: `python scripts/validate_architecture.py` → PASS
Run: `python scripts/lint_specs_produit.py` → PASS (la spec ne doit contenir aucun chemin de fichier dans Parcours/Fonctionnalités)
Run: `python scripts/validate_spec.py` → PASS
Run: `python scripts/lint_claude_md.py` → PASS (≤ 200 lignes)
Si un validateur échoue : lire son message, corriger le fichier concerné, relancer.

```bash
git add docs/specs/tab-mediatheque.md docs/specs/index.json jarvis/spec.json docs/architecture/dependencies.yaml docs/architecture/flows/perso-mediatheque.yaml docs/architecture/decisions.md CLAUDE.md
git commit -m "docs(mediatheque): spec onglet + index 30 tabs + ADR-28 + flow perso-mediatheque"
```

---

### Task 12: Mise en prod + vérification bout en bout

**Files:** aucun nouveau — push + vérifications.

- [ ] **Step 1: Contrôles pré-push**

Run: `python tests/test_franchise_walk.py` → PASS
Run: `node tests/test_franchise_walk.mjs` → PASS
Run: `node scripts/sync-sw.mjs` puis `git status` → aucun fichier modifié restant (sinon commiter `chore(mediatheque): sync sw`).

- [ ] **Step 2: Push**

```bash
git push origin main
```

Attendre les workflows CI (validate-arch, lint-specs, sw-sync) : `gh run list --limit 5` → tous verts.

- [ ] **Step 3: Vérification prod (GitHub Pages, hard-refresh Ctrl+F5)**

Parcours complet dans le cockpit en prod :
1. Onglet Médiathèque visible (groupe Personnel, icône tv) → état vide propre.
2. Rechercher « frieren » → résultats ; ouvrir la fiche → saisons datées ; « Ajouter » → toast succès, carte « À voir » dans la grille.
3. Rechercher « demon slayer » → ajouter → la fiche montre le film Mugen Train `[Film]` entre S1 et S2.
4. Steppers : +1 sur Frieren S1 → badge passe « En cours » ; « ✓ vue » → compteur 28/28 ; F5 → tout persiste.
5. Retirer une franchise → confirmation → disparue ; F5 → toujours disparue.
6. Console DevTools : zéro erreur ; onglet Network : requêtes AniList espacées (~700 ms).

- [ ] **Step 4: Vérifier les écritures en base (MCP Supabase)**

`execute_sql` : `select f.title_english, count(e.id) entries, coalesce(sum(p.episodes_watched),0) watched from media_franchises f left join media_entries e on e.franchise_id=f.id left join media_progress p on p.entry_id=e.id group by 1;`
Attendu : les franchises ajoutées avec leurs compteurs.

- [ ] **Step 5: Premier run du pipeline**

```bash
gh workflow run anime-tracker-sync.yml
gh run watch
```

Attendu : exit 0, log « N franchises, M entrées ». Puis `execute_sql` sur `media_releases` : 0 ou plus d'événements (si une nouvelle saison a été annoncée entre l'ajout et le run). Recharger le cockpit : bandeau Sorties + encart Brief cohérents avec la table.

- [ ] **Step 6: Événements télémétrie**

`execute_sql` : `select event_type, count(*) from usage_events where event_type like 'mediatheque%' group by 1;`
Attendu : `mediatheque_search`, `mediatheque_add`, `mediatheque_progress` présents après le parcours de l'étape 3.

- [ ] **Step 7: Clore**

Marquer le plan comme exécuté (cocher les cases), noter les écarts éventuels en bas du plan, et mettre le SHA final dans `docs/specs/tab-mediatheque.md::Dernière MAJ` si absent.

---

## Écarts / notes d'exécution

(à remplir pendant l'implémentation)






