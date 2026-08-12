# Tracker jeux vidéo — Lot 1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Détecter les suites annoncées des licences de jeux aimées et les afficher sur la page d'accueil du cockpit, sans que l'utilisateur ait à ouvrir un onglet.

**Architecture:** Un pipeline quotidien lit la bibliothèque Steam existante (`steam_games_snapshot`), traduit les appids en identifiants IGDB via l'endpoint `external_games`, remonte les collections IGDB correspondantes dans 4 tables `game_*` dédiées, et écrit les événements détectés dans `game_releases`. Le front n'a qu'un composant : un encart dans le Brief du jour avec deux actions (acquitter, ne plus suivre la licence). Aucune table `media_*` n'est touchée.

**Tech Stack:** Python 3.11 + `requests` (pipeline), Postgres/Supabase REST (service key), React 18 via Babel standalone sans build (front), GitHub Actions (cron).

## Global Constraints

- **Spec de référence** : `docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md`. En cas de contradiction avec ce plan, la spec fait foi.
- **Le pipeline n'écrit JAMAIS `game_progress`.** C'est la table de l'utilisateur. Même invariant que `media_progress`.
- **Aucun backlog, aucun compteur de dette.** Aucune UI n'affiche « N jeux à qualifier ».
- **Pas d'événement sur report de date** : la date se met à jour silencieusement.
- **IGDB : 4 req/s max, 8 requêtes ouvertes.** Throttle `0.25 s` entre requêtes, `Retry-After` respecté sur 429.
- **Sans `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`** : le script imprime `[skip]` et sort en code 0. Le workflow reste vert.
- **Front sans build step** : pas d'`import`/`export` ES modules. Les composants s'exposent sur `window.X`.
- **Chemins publics** : le site est servi sous `/jarvis-cockpit/`. Aucun chemin absolu depuis `/`.
- **Toute modif fonctionnelle d'onglet** → MAJ `docs/specs/tab-gaming.md` + bump `last_updated` dans `docs/specs/index.json` (CI `lint-specs` bloquant).
- **Tout nouvel `event_type` de télémétrie** → entrée dans `docs/telemetry.md` **avant** le commit.
- **Style des tests Python du repo** : pas de `pytest`. Un `check(nom, obtenu, attendu)` qui incrémente un compteur, puis `sys.exit(1 if failures else 0)`. Voir `tests/test_media_tracker_common.py`.
- **Encodage console Windows** : ne jamais `print()` d'emoji ni de `✅` dans un script Python — `UnicodeEncodeError` en cp1252. Utiliser `ok` / `FAIL`.

---

### Task 1: Faire tourner les tests Python en CI

Prérequis à tout le reste : `.github/workflows/tests.yml` ne lance que `tests/test_*.mjs`. Les 6 fichiers `tests/test_*.py` existants ne sont **jamais exécutés**. Sans ce job, tous les tests écrits plus bas seraient décoratifs.

**Files:**
- Modify: `.github/workflows/tests.yml:8-23`

**Interfaces:**
- Consumes: rien.
- Produces: un job CI `python` qui exécute chaque `tests/test_*.py` et échoue si l'un d'eux sort non-zéro.

- [ ] **Step 1: Vérifier que les tests Python existants passent en local**

```bash
cd ~/projects/jarvis-cockpit
status=0
for f in tests/test_*.py; do echo "-- $f"; python "$f" || status=1; done
echo "status=$status"
```

Attendu : `status=0`. Si un test échoue **avant** toute modification, ne pas le réparer dans cette tâche — le noter et l'exclure temporairement du job avec un commentaire expliquant pourquoi, pour ne pas mélanger deux sujets.

- [ ] **Step 2: Ajouter le job python au workflow**

Dans `.github/workflows/tests.yml`, ajouter après le job `node` (même niveau d'indentation, sous `jobs:`) :

```yaml
  python:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install requests
      # Les tests du repo n'utilisent pas pytest : chaque fichier est un script
      # qui sort en 1 si un check echoue. On les lance un par un pour que le nom
      # du fichier fautif apparaisse dans le log.
      - name: Tests python
        run: |
          status=0
          for f in tests/test_*.py; do
            echo "── $f"
            python "$f" || status=1
          done
          exit $status
```

- [ ] **Step 3: Vérifier la syntaxe YAML**

```bash
python -c "import yaml,sys; yaml.safe_load(open('.github/workflows/tests.yml')); print('yaml ok')"
```

Attendu : `yaml ok`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/tests.yml
git commit -m "ci(tests): lance enfin les tests Python

Les 6 fichiers tests/test_*.py n'etaient executes par aucun workflow.
Prerequis au tracker jeux, dont toute la logique de mapping et de diff
est testee cote Python."
```

---

### Task 2: Migration `sql/027_game_tracker.sql`

**Files:**
- Create: `sql/027_game_tracker.sql`
- Test: requête d'introspection (Step 4)

**Interfaces:**
- Consumes: rien.
- Produces: 4 tables — `game_franchises(id uuid, igdb_collection_id int, name text, slug text, cover_url text, watched bool, bootstrapped_at timestamptz, added_at, updated_at)`, `game_titles(id uuid, franchise_id uuid, igdb_id int, name, slug, summary, cover_url, genres text[], platforms text[], igdb_status text, first_release_date date, release_human text, release_precision text, hypes int, time_to_beat_minutes int, steam_appid int, sort_order int, created_at, updated_at)`, `game_progress(id uuid, title_id uuid, status text, rating int, platform text, note text, updated_at)`, `game_releases(id uuid, franchise_id uuid, title_id uuid, event_type text, title text, event_date date, detected_at, acknowledged bool)`.

- [ ] **Step 1: Écrire la migration**

`bootstrapped_at` est la colonne qui empêche l'inondation du Brief au premier run : une franchise dont les titres viennent d'être créés n'émet aucun événement. Sans elle, remonter les collections de 80 jeux Steam ferait apparaître des centaines de jeux frères inconnus, chacun produisant un « Annoncé ».

```sql
-- ============================================================
-- Migration 027: Tracker jeux video (IGDB + seed Steam)
-- 4 tables dediees. Volontairement SANS reutilisation de media_*
-- (cf. spec, principe directeur 3) : un jeu n'entre pas dans le
-- vocabulaire episodes_total / airing_status / next_episode_*.
-- Separation stricte : le pipeline ecrit game_titles, l'utilisateur
-- possede game_progress qui n'est JAMAIS ecrite par un pipeline.
-- Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md
-- ============================================================

CREATE TABLE IF NOT EXISTS game_franchises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  igdb_collection_id int UNIQUE,   -- null si le jeu n'appartient a aucune collection
  name text NOT NULL,
  slug text,
  cover_url text,
  -- false par defaut : la phase A ne met a true que les licences des jeux
  -- joues >= 600 min, pour ne pas noyer « A venir ».
  watched boolean NOT NULL DEFAULT false,
  -- Horodate la premiere ecriture des titres de cette franchise. Tant qu'elle
  -- est null, la phase C n'emet AUCUN evenement pour cette franchise : sinon
  -- le premier run inonderait le Brief de centaines de « Annonce » pour des
  -- jeux sortis il y a dix ans.
  bootstrapped_at timestamptz,
  added_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_titles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES game_franchises(id) ON DELETE CASCADE,
  igdb_id int NOT NULL UNIQUE,
  name text NOT NULL,
  slug text,
  summary text,
  cover_url text,
  genres text[],
  platforms text[],
  igdb_status text,                -- released | alpha | beta | early_access
                                   -- | offline | cancelled | rumored | delisted
  first_release_date date,         -- null si inconnue
  release_human text,              -- « Q1 2027 », « 2027 », « Mar 04, 2027 »
  release_precision text,          -- day | month | quarter | year | tbd
  hypes int,
  time_to_beat_minutes int,
  steam_appid int,                 -- via external_games ; null hors Steam
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS game_titles_franchise_idx ON game_titles (franchise_id);
CREATE INDEX IF NOT EXISTS game_titles_steam_idx ON game_titles (steam_appid);

-- User-owned. Aucun pipeline n'ecrit ici, jamais.
CREATE TABLE IF NOT EXISTS game_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title_id uuid NOT NULL UNIQUE REFERENCES game_titles(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('wishlist','playing','finished','dropped')),
  rating int CHECK (rating >= 0 AND rating <= 100),
  platform text,
  note text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS game_releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  franchise_id uuid NOT NULL REFERENCES game_franchises(id) ON DELETE CASCADE,
  title_id uuid REFERENCES game_titles(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('announced','date_announced','released','cancelled')),
  title text NOT NULL,
  event_date date,
  detected_at timestamptz NOT NULL DEFAULT now(),
  acknowledged boolean NOT NULL DEFAULT false,
  UNIQUE (title_id, event_type)
);

CREATE INDEX IF NOT EXISTS game_releases_fresh_idx ON game_releases (acknowledged, detected_at DESC);

-- RLS : meme pattern que sql/020_media_tracker.sql, 4 operations.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['game_franchises','game_titles','game_progress','game_releases'] LOOP
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

- [ ] **Step 2: Appliquer la migration**

Via le MCP Supabase, outil `apply_migration`, `project_id = mrmgptqpflzyavdfqwwv`, `name = "027_game_tracker"`, `query` = le contenu intégral du fichier.

- [ ] **Step 3: Vérifier les tables et les policies**

Via MCP `execute_sql` :

```sql
select tablename,
       (select count(*) from pg_policies p where p.tablename = t.tablename) as policies,
       (select count(*) from information_schema.columns c where c.table_name = t.tablename) as colonnes
from pg_tables t
where tablename in ('game_franchises','game_titles','game_progress','game_releases')
order by tablename;
```

Attendu : 4 lignes, `policies = 4` sur chacune, et `colonnes` = 9 (`game_franchises`), 19 (`game_titles`), 7 (`game_progress`), 8 (`game_releases`).

- [ ] **Step 4: Vérifier que la contrainte de statut mord**

```sql
insert into game_franchises (name) values ('__probe__') returning id;
-- puis, avec l'id retourne :
insert into game_titles (franchise_id, igdb_id, name) values ('<id>', -1, '__probe__') returning id;
insert into game_progress (title_id, status) values ('<title_id>', 'nawak');
```

Attendu : la dernière requête échoue avec une violation de contrainte CHECK. Nettoyer ensuite :

```sql
delete from game_franchises where name = '__probe__';
```

Attendu : la cascade supprime aussi le `game_titles` de test. Vérifier avec `select count(*) from game_titles where igdb_id = -1;` → `0`.

- [ ] **Step 5: Commit**

```bash
git add sql/027_game_tracker.sql
git commit -m "feat(games): migration 027 — 4 tables du tracker jeux

Tables dediees plutot que media_* detournees (spec, principe 3).
bootstrapped_at empeche l'inondation du Brief au premier run.
game_progress est user-owned : aucun pipeline n'y ecrit."
```

---

### Task 3: `pipelines/igdb_map.py` — mapping pur + détection d'événements

Aucun appel réseau ici. Toute la logique testable sans secret ni connexion.

**Files:**
- Create: `pipelines/igdb_map.py`
- Create: `tests/test_igdb_map.py`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `map_status(value: int | None) -> str`
  - `map_precision(date_format_id: int | None) -> str`
  - `cover_url(cover: dict | None) -> str | None`
  - `to_title_row(game: dict) -> dict` — les clés correspondent aux colonnes de `game_titles` **sauf** `franchise_id`, ajouté par l'appelant
  - `diff_game_events(old_by_igdb_id: dict, fresh_rows: list[dict]) -> list[tuple[str, str, str | None, int]]` — tuples `(event_type, title, event_date, igdb_id)`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/test_igdb_map.py` :

```python
"""igdb_map est pur : aucun reseau, aucun secret.
Run: python tests/test_igdb_map.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from igdb_map import map_status, map_precision, cover_url, to_title_row, diff_game_events

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


# ── statut ──────────────────────────────────────────────────
check("status 0 => released", map_status(0), "released")
check("status 6 => cancelled", map_status(6), "cancelled")
check("status 7 => rumored", map_status(7), "rumored")
# IGDB omet status sur la majorite des jeux sortis : l'absence vaut released.
check("status absent => released", map_status(None), "released")
check("status inconnu => released", map_status(99), "released")

# ── precision de date ───────────────────────────────────────
check("format 0 => day", map_precision(0), "day")
check("format 1 => month", map_precision(1), "month")
check("format 2 => year", map_precision(2), "year")
check("format 3 => quarter", map_precision(3), "quarter")
check("format 6 => quarter", map_precision(6), "quarter")
check("format 7 => tbd", map_precision(7), "tbd")
check("format absent => tbd", map_precision(None), "tbd")

# ── jaquette ────────────────────────────────────────────────
check("cover depuis image_id",
      cover_url({"image_id": "co1abc"}),
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg")
check("cover absente => None", cover_url(None), None)
check("cover sans image_id => None", cover_url({"id": 12}), None)

# ── ligne game_titles ───────────────────────────────────────
GAME = {
    "id": 1020,
    "name": "Hollow Knight: Silksong",
    "slug": "hollow-knight-silksong",
    "summary": "Un metroidvania.",
    "status": 7,
    "hypes": 4200,
    "first_release_date": 1788480000,   # 2026-09-04 UTC
    "cover": {"image_id": "co2xyz"},
    "genres": [{"name": "Platform"}, {"name": "Adventure"}],
    "platforms": [{"name": "PC (Microsoft Windows)"}, {"name": "Nintendo Switch"}],
    "release_dates": [{"date": 1788480000, "human": "Sep 04, 2026", "date_format": 0}],
}
row = to_title_row(GAME)
check("to_title_row igdb_id", row["igdb_id"], 1020)
check("to_title_row name", row["name"], "Hollow Knight: Silksong")
check("to_title_row statut", row["igdb_status"], "rumored")
check("to_title_row date ISO", row["first_release_date"], "2026-09-04")
check("to_title_row human", row["release_human"], "Sep 04, 2026")
check("to_title_row precision", row["release_precision"], "day")
check("to_title_row genres aplatis", row["genres"], ["Platform", "Adventure"])
check("to_title_row plateformes aplaties", row["platforms"],
      ["PC (Microsoft Windows)", "Nintendo Switch"])
check("to_title_row hypes", row["hypes"], 4200)

MINIMAL = {"id": 7, "name": "Jeu nu"}
mrow = to_title_row(MINIMAL)
check("jeu sans date => first_release_date None", mrow["first_release_date"], None)
check("jeu sans date => precision tbd", mrow["release_precision"], "tbd")
check("jeu sans genre => liste vide", mrow["genres"], [])
check("jeu sans cover => None", mrow["cover_url"], None)

# ── detection d'evenements ──────────────────────────────────
def title(gid, status="rumored", date=None, name="Suite"):
    return {"igdb_id": gid, "igdb_status": status,
            "first_release_date": date, "name": name}


check("titre inedit non sorti => announced",
      [e[0] for e in diff_game_events({}, [title(1)])],
      ["announced"])
check("libelle announced",
      diff_game_events({}, [title(1, name="Silksong")])[0][1],
      "Annoncé : Silksong")
# Un jeu deja sorti qui apparait pour la premiere fois n'est pas une annonce :
# c'est un frere de collection decouvert au fil de l'eau (ex. un episode de 2011).
check("titre inedit deja sorti => aucun evenement",
      diff_game_events({}, [title(2, status="released", date="2011-05-01")]),
      [])
check("date qui apparait => date_announced",
      [e[0] for e in diff_game_events({1: title(1)}, [title(1, date="2027-03-01")])],
      ["date_announced"])
check("bascule sur released => released",
      [e[0] for e in diff_game_events({1: title(1, date="2027-03-01")},
                                      [title(1, status="released", date="2027-03-01")])],
      ["released"])
check("bascule sur cancelled => cancelled",
      [e[0] for e in diff_game_events({1: title(1)}, [title(1, status="cancelled")])],
      ["cancelled"])
check("rien ne bouge => aucun evenement",
      diff_game_events({1: title(1, date="2027-03-01")}, [title(1, date="2027-03-01")]),
      [])
# Regle explicite de la spec : les reports sont la norme dans le jeu video.
check("report de date => aucun evenement",
      diff_game_events({1: title(1, date="2027-03-01")}, [title(1, date="2027-09-01")]),
      [])

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
python tests/test_igdb_map.py
```

Attendu : `ModuleNotFoundError: No module named 'igdb_map'`.

- [ ] **Step 3: Écrire `pipelines/igdb_map.py`**

```python
#!/usr/bin/env python3
"""Traduction IGDB -> lignes game_titles, et detection d'evenements.

Module PUR : aucun appel reseau, aucun secret. Tout ce qui touche a IGDB
en tant qu'API vit dans igdb_client.py. Verrouille par tests/test_igdb_map.py.

Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md
"""
from __future__ import annotations
from datetime import datetime, timezone

COVER_BASE = "https://images.igdb.com/igdb/image/upload/t_cover_big/"

# Game.status — enum verifiee le 2026-08-12 contre les types generes depuis
# les docs officielles (github.com/DmitryScaletta/igdb-api-types).
STATUS = {
    0: "released", 2: "alpha", 3: "beta", 4: "early_access",
    5: "offline", 6: "cancelled", 7: "rumored", 8: "delisted",
}

# ReleaseDate.date_format — ids historiques de ReleaseDateCategoryEnum.
# A confirmer contre GET /v4/date_formats au premier run (voir Task 4, Step 6).
PRECISION = {
    0: "day", 1: "month", 2: "year",
    3: "quarter", 4: "quarter", 5: "quarter", 6: "quarter",
    7: "tbd",
}


def map_status(value):
    """IGDB omet `status` sur la majorite des jeux sortis : l'absence vaut released."""
    return STATUS.get(value, "released")


def map_precision(date_format_id):
    return PRECISION.get(date_format_id, "tbd")


def cover_url(cover):
    if not cover or not cover.get("image_id"):
        return None
    return f"{COVER_BASE}{cover['image_id']}.jpg"


def _iso_date(ts):
    """Timestamp Unix IGDB -> date ISO. Ancree en UTC pour etre stable
    quel que soit le fuseau de la machine qui fait tourner le pipeline."""
    if not ts:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).date().isoformat()


def _names(items):
    return [x["name"] for x in (items or []) if x.get("name")]


def _earliest_release(game):
    """La date de reference et sa precision.

    first_release_date donne le timestamp mais pas la precision : un jeu
    annonce « 2027 » porte quand meme un timestamp (au 1er janvier). C'est
    release_dates qui dit s'il s'agit d'un jour, d'un trimestre ou d'une
    annee — sans quoi l'UI afficherait « 1 janvier 2027 » pour un jeu dont
    on ne sait que l'annee.
    """
    dates = sorted(
        [d for d in (game.get("release_dates") or []) if d.get("date")],
        key=lambda d: d["date"],
    )
    if dates:
        first = dates[0]
        return _iso_date(first["date"]), first.get("human"), map_precision(first.get("date_format"))
    ts = game.get("first_release_date")
    return _iso_date(ts), None, ("day" if ts else "tbd")


def to_title_row(game):
    """Une ligne game_titles, franchise_id exclu (ajoute par l'appelant)."""
    iso, human, precision = _earliest_release(game)
    return {
        "igdb_id": game["id"],
        "name": game.get("name") or f"#{game['id']}",
        "slug": game.get("slug"),
        "summary": (game.get("summary") or "").strip()[:2000] or None,
        "cover_url": cover_url(game.get("cover")),
        "genres": _names(game.get("genres")),
        "platforms": _names(game.get("platforms")),
        "igdb_status": map_status(game.get("status")),
        "first_release_date": iso,
        "release_human": human,
        "release_precision": precision,
        "hypes": game.get("hypes"),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def diff_game_events(old_by_igdb_id, fresh_rows):
    """Compare l'etat DB aux lignes fraiches -> [(event_type, title, event_date, igdb_id)].

    L'appelant est responsable de NE PAS appeler cette fonction pour une
    franchise dont bootstrapped_at est null : au premier peuplement, tous
    ses titres sont « inedits » et l'inondation serait garantie.
    """
    events = []
    for row in fresh_rows:
        gid = row["igdb_id"]
        old = old_by_igdb_id.get(gid)
        label = row.get("name") or f"#{gid}"
        date = row.get("first_release_date")

        if old is None:
            # Un jeu deja sorti qui apparait pour la premiere fois n'est pas
            # une annonce : c'est un frere de collection decouvert au fil de
            # l'eau. Seul ce qui n'est pas encore sorti merite une alerte.
            if row.get("igdb_status") != "released":
                events.append(("announced", f"Annoncé : {label}", date, gid))
            continue

        if not old.get("first_release_date") and date:
            events.append(("date_announced", f"Date annoncée : {label} — {date}", date, gid))
        if old.get("igdb_status") != "released" and row.get("igdb_status") == "released":
            events.append(("released", f"Sorti : {label}", date, gid))
        if old.get("igdb_status") != "cancelled" and row.get("igdb_status") == "cancelled":
            events.append(("cancelled", f"Annulé : {label}", None, gid))
    return events
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

```bash
python tests/test_igdb_map.py
```

Attendu : `Tous les tests passent`, code de sortie 0.

- [ ] **Step 5: Commit**

```bash
git add pipelines/igdb_map.py tests/test_igdb_map.py
git commit -m "feat(games): mapping IGDB pur + detection d'evenements

diff_game_events n'emet pas d'annonce pour un jeu deja sorti decouvert
au fil de l'eau, et ignore les reports de date (la norme dans le jeu
video). 4 types : announced, date_announced, released, cancelled."
```

---

### Task 4: `pipelines/igdb_client.py` — authentification et requêtes

**Files:**
- Create: `pipelines/igdb_client.py`
- Create: `pipelines/requirements-igdb.txt`
- Create: `tests/test_igdb_client.py`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `get_token(client_id: str, client_secret: str) -> str`
  - `IgdbClient(client_id: str, token: str)` avec `.query(endpoint: str, body: str) -> list[dict]`
  - `chunks(seq: list, size: int) -> Iterator[list]`
  - `id_list(ids: list[int]) -> str` — rend `(1,2,3)` pour les clauses `where ... = (...)`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/test_igdb_client.py`. On ne teste pas le réseau : on teste la construction des requêtes et le découpage en lots, qui sont les deux endroits où une erreur coûte du quota.

```python
"""Construction des requetes IGDB. Aucun appel reseau.
Run: python tests/test_igdb_client.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from igdb_client import chunks, id_list, quoted_list

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


check("id_list simple", id_list([1, 2, 3]), "(1,2,3)")
check("id_list un seul", id_list([42]), "(42)")
check("id_list dedoublonne et trie", id_list([3, 1, 3, 2]), "(1,2,3)")
# external_games.uid est une CHAINE cote IGDB : un appid non quote ne
# matche rien et la requete revient vide sans erreur — panne silencieuse.
check("quoted_list quote chaque valeur",
      quoted_list([620, 1145360]), '("1145360","620")')
check("quoted_list dedoublonne", quoted_list([620, 620]), '("620")')
check("chunks exact", list(chunks([1, 2, 3, 4], 2)), [[1, 2], [3, 4]])
check("chunks reste", list(chunks([1, 2, 3], 2)), [[1, 2], [3]])
check("chunks liste vide", list(chunks([], 2)), [])
check("chunks plus grand que la liste", list(chunks([1], 10)), [[1]])

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

```bash
python tests/test_igdb_client.py
```

Attendu : `ModuleNotFoundError: No module named 'igdb_client'`.

- [ ] **Step 3: Écrire `pipelines/igdb_client.py`**

```python
#!/usr/bin/env python3
"""Client IGDB v4 — authentification Twitch et requetes apicalypse.

IGDB limite a 4 requetes/seconde et 8 requetes ouvertes ; on serialise et
on throttle a 0.25 s. Le token applicatif Twitch vit ~60 jours mais on le
redemande a chaque run : un run par jour, le cout est negligeable et ca
evite un cache a invalider.

Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md
"""
from __future__ import annotations
import time

import requests

TOKEN_URL = "https://id.twitch.tv/oauth2/token"
BASE = "https://api.igdb.com/v4"
THROTTLE_S = 0.25      # 4 req/s documentees
RETRY_ON_429 = 3
BATCH = 100            # ids par requete ; IGDB accepte limit 500


def get_token(client_id, client_secret):
    r = requests.post(TOKEN_URL, params={
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "client_credentials",
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def chunks(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i:i + size]


def id_list(ids):
    """(1,2,3) — dedoublonne et trie pour que deux runs identiques
    produisent la meme requete (utile en debug et pour les logs)."""
    return "(" + ",".join(str(i) for i in sorted(set(ids))) + ")"


def quoted_list(values):
    """(\"620\",\"1145360\") — external_games.uid est une chaine, pas un entier."""
    uniq = sorted({str(v) for v in values})
    return "(" + ",".join(f'"{v}"' for v in uniq) + ")"


class IgdbClient:
    def __init__(self, client_id, token):
        self.headers = {
            "Client-ID": client_id,
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        }
        self.calls = 0

    def query(self, endpoint, body):
        """Une requete apicalypse. `body` est du texte, pas du JSON."""
        for _ in range(RETRY_ON_429):
            r = requests.post(f"{BASE}/{endpoint}", headers=self.headers,
                              data=body.encode("utf-8"), timeout=30)
            self.calls += 1
            if r.status_code == 429:
                time.sleep(float(r.headers.get("Retry-After", 1)))
                continue
            r.raise_for_status()
            time.sleep(THROTTLE_S)
            return r.json()
        raise RuntimeError(f"IGDB: 429 persistant sur {endpoint} — {body[:120]}")
```

- [ ] **Step 4: Créer le fichier de dépendances**

`pipelines/requirements-igdb.txt` :

```
requests>=2.31.0
```

- [ ] **Step 5: Lancer le test pour vérifier qu'il passe**

```bash
python tests/test_igdb_client.py
```

Attendu : `Tous les tests passent`.

- [ ] **Step 6: Confirmer l'enum `date_formats` contre l'API réelle**

Cette étape exige les secrets Twitch (créer une application sur https://dev.twitch.tv/console/apps si ce n'est pas fait). Elle vérifie la seule table de correspondance du projet qui n'a pas été confirmée contre l'API en direct.

```bash
TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy python - <<'PY'
import os, sys
sys.path.insert(0, "pipelines")
from igdb_client import get_token, IgdbClient
tok = get_token(os.environ["TWITCH_CLIENT_ID"], os.environ["TWITCH_CLIENT_SECRET"])
c = IgdbClient(os.environ["TWITCH_CLIENT_ID"], tok)
for d in sorted(c.query("date_formats", "fields id,format; limit 50;"), key=lambda x: x["id"]):
    print(d["id"], "->", d.get("format"))
PY
```

Attendu : une liste d'ids avec leur format. Comparer au dictionnaire `PRECISION` de `igdb_map.py` :
- un format contenant jour + mois + année → `day`
- mois + année → `month`
- année seule → `year`
- un `Q1`/`Q2`/`Q3`/`Q4` → `quarter`
- `TBD` → `tbd`

Si la correspondance diffère, corriger `PRECISION` **et** les checks de `tests/test_igdb_map.py`, puis relancer `python tests/test_igdb_map.py`.

- [ ] **Step 7: Commit**

```bash
git add pipelines/igdb_client.py pipelines/requirements-igdb.txt tests/test_igdb_client.py
git commit -m "feat(games): client IGDB v4 (auth Twitch, throttle 4 req/s)

Serialise et throttle a 0.25s, Retry-After respecte sur 429.
uid de external_games est une chaine : quoted_list, pas id_list."
```

---

### Task 5: `pipelines/igdb_tracker_sync.py` — les quatre phases

**Files:**
- Create: `pipelines/igdb_tracker_sync.py`
- Create: `.github/workflows/igdb-tracker-sync.yml`

**Interfaces:**
- Consumes: `igdb_map.to_title_row`, `igdb_map.diff_game_events`, `igdb_client.get_token`, `igdb_client.IgdbClient`, `igdb_client.chunks`, `igdb_client.id_list`, `igdb_client.quoted_list`, et `media_tracker_common.sb_env / sb_get / sb_upsert / sb_patch`.
- Produces: `run_sync(dry_run: bool, import_wishlist_flag: bool = False) -> int` (code de sortie). Le second paramètre n'est branché qu'à la Task 6.

- [ ] **Step 1: Écrire le script**

```python
#!/usr/bin/env python3
"""IGDB tracker sync — bibliotheque de jeux, licences suivies, sorties annoncees.

Quatre phases :
  A. seed  — les jeux Steam joues deviennent des game_titles, via external_games
  B. refresh — les collections `watched` sont re-remontees depuis IGDB
  C. diff  — les changements deviennent des game_releases
  D. duree — game_time_to_beat pour les titres qui n'en ont pas

N'ecrit JAMAIS game_progress : c'est la table de l'utilisateur.

Reutilise le transport Supabase de media_tracker_common (sb_get / sb_upsert /
sb_patch) mais PAS diff_events, qui parle episodes et statuts de diffusion.

Spec : docs/superpowers/specs/2026-08-12-gaming-tracker-igdb-design.md

Usage:
    TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy \\
    SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \\
        python pipelines/igdb_tracker_sync.py [--dry-run] [--import-wishlist]

Sans les secrets Twitch : message [skip] et sortie 0.
"""
from __future__ import annotations
import argparse
import os
import sys
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    print("FATAL: requests not installed. pip install -r pipelines/requirements-igdb.txt")
    sys.exit(1)

from media_tracker_common import sb_env, sb_get, sb_upsert, sb_patch
from igdb_client import get_token, IgdbClient, chunks, id_list, quoted_list
from igdb_map import to_title_row, diff_game_events

STEAM_SOURCE = 1          # ExternalGameCategoryEnum.steam
SEED_MIN_MINUTES = 1      # tout jeu lance au moins une fois entre en bibliotheque
WATCH_MIN_MINUTES = 600   # >= 10 h : la licence passe sous surveillance
MAX_TITLES_PER_COLLECTION = 100
MAX_TTB_PER_RUN = 50

GAME_FIELDS = ("fields id,name,slug,summary,status,hypes,first_release_date,"
               "cover.image_id,genres.name,platforms.name,collection,"
               "release_dates.date,release_dates.human,release_dates.date_format;")


def now_iso():
    return datetime.now(timezone.utc).isoformat()


# ── Phase A : seed depuis Steam ─────────────────────────────
def steam_appids(url, headers):
    """Les jeux Steam lances au moins une fois, dans le snapshot le plus recent."""
    rows = sb_get(url, headers, "steam_games_snapshot",
                  "select=appid,name,playtime_forever_minutes,snapshot_date"
                  "&order=snapshot_date.desc&limit=2000")
    if not rows:
        return {}
    latest = rows[0]["snapshot_date"]
    return {r["appid"]: r.get("playtime_forever_minutes") or 0
            for r in rows
            if r["snapshot_date"] == latest
            and (r.get("playtime_forever_minutes") or 0) >= SEED_MIN_MINUTES}


def resolve_steam(client, appids):
    """appid Steam -> id IGDB, via external_games. Retourne {appid: igdb_id}.

    `category` est marque deprecated par IGDB au profit de
    `external_game_source`, mais reste servi. Si une requete revient
    systematiquement vide alors que les appids sont valides, basculer sur
    `where external_game_source = 1` — le champ, pas la valeur, a change.
    """
    out = {}
    for batch in chunks(sorted(appids), 100):
        rows = client.query("external_games",
                            f"fields game,uid; where category = {STEAM_SOURCE} "
                            f"& uid = {quoted_list(batch)}; limit 500;")
        for r in rows:
            uid, game = r.get("uid"), r.get("game")
            if uid is None or game is None:
                continue
            try:
                out[int(uid)] = game
            except (TypeError, ValueError):
                continue
    return out


def fetch_games(client, igdb_ids):
    games = []
    for batch in chunks(sorted(igdb_ids), 100):
        games += client.query("games",
                              f"{GAME_FIELDS} where id = {id_list(batch)}; limit 500;")
    return games


def fetch_collections(client, collection_ids):
    out = {}
    for batch in chunks(sorted(collection_ids), 50):
        for c in client.query("collections",
                              f"fields id,name,slug; where id = {id_list(batch)}; limit 500;"):
            out[c["id"]] = c
    return out


def upsert_franchise(url, headers, name, collection_id, watched):
    """Une franchise par collection IGDB ; les jeux sans collection en ont une
    a eux seuls (igdb_collection_id null), donc pas de contrainte d'unicite
    exploitable : on cherche d'abord par nom."""
    if collection_id is not None:
        rows = sb_upsert(url, headers, "game_franchises", [{
            "igdb_collection_id": collection_id,
            "name": name,
            "updated_at": now_iso(),
        }], "igdb_collection_id")
        row = rows[0]
    else:
        existing = sb_get(url, headers, "game_franchises",
                          f"igdb_collection_id=is.null&name=eq.{requests.utils.quote(name)}"
                          "&select=id,bootstrapped_at,watched&limit=1")
        if existing:
            row = existing[0]
        else:
            row = sb_upsert(url, headers, "game_franchises",
                            [{"name": name, "updated_at": now_iso()}], "id")[0]
    if watched and not row.get("watched"):
        sb_patch(url, headers, "game_franchises", f"id=eq.{row['id']}", {"watched": True})
        row["watched"] = True
    return row


# Le parametre s'appelle import_wishlist_flag et non import_wishlist : sinon
# il masquerait la fonction import_wishlist() ajoutee a la Task 6.
def run_sync(dry_run, import_wishlist_flag=False):
    cid = os.environ.get("TWITCH_CLIENT_ID")
    secret = os.environ.get("TWITCH_CLIENT_SECRET")
    if not cid or not secret:
        print("[skip] TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET absents — rien a faire. "
              "Cree une application sur https://dev.twitch.tv/console/apps.")
        return 0

    url, headers = sb_env()
    client = IgdbClient(cid, get_token(cid, secret))

    known_franchises = sb_get(url, headers, "game_franchises",
                              "select=id,igdb_collection_id,name,watched,bootstrapped_at")
    # steam_appid est INDISPENSABLE ici : c'est lui qui dit quels appids sont
    # deja connus. Sans cette colonne, la phase A re-resout les 80 memes jeux
    # a chaque run et brule du quota IGDB pour rien.
    known_titles = sb_get(url, headers, "game_titles",
                          "select=id,franchise_id,igdb_id,igdb_status,"
                          "first_release_date,name,steam_appid")
    titles_by_igdb = {t["igdb_id"]: t for t in known_titles}
    # Fige l'etat AVANT ce run : une franchise peuplee pendant ce run ne doit
    # pas emettre d'evenement, meme si on la relit plus tard dans la boucle.
    bootstrapped_before = {f["id"] for f in known_franchises if f.get("bootstrapped_at")}

    print(f"IGDB sync: {len(known_franchises)} franchises, {len(known_titles)} titres, "
          f"dry_run={dry_run}")

    # ── Phase A : seed Steam ────────────────────────────────
    playtime = steam_appids(url, headers)
    unknown = {a for a in playtime if not any(
        t.get("steam_appid") == a for t in known_titles)}
    seeded = 0
    if unknown:
        mapping = resolve_steam(client, unknown)
        missing = sorted(unknown - set(mapping))
        if missing:
            print(f"  {len(missing)} appid(s) Steam inconnus d'IGDB, ignores : {missing[:10]}")
        games = fetch_games(client, set(mapping.values()))
        by_igdb = {g["id"]: g for g in games}
        collections = fetch_collections(
            client, {g["collection"] for g in games if g.get("collection")})

        appid_by_igdb = {v: k for k, v in mapping.items()}
        for gid, game in by_igdb.items():
            appid = appid_by_igdb.get(gid)
            minutes = playtime.get(appid, 0)
            cid_col = game.get("collection")
            fname = (collections.get(cid_col) or {}).get("name") or game.get("name") or f"#{gid}"
            if dry_run:
                print(f"    [dry-run] seed {game.get('name')} -> licence {fname} "
                      f"({minutes} min, watched={minutes >= WATCH_MIN_MINUTES})")
                continue
            fr = upsert_franchise(url, headers, fname, cid_col,
                                  minutes >= WATCH_MIN_MINUTES)
            row = {**to_title_row(game), "franchise_id": fr["id"], "steam_appid": appid}
            sb_upsert(url, headers, "game_titles", [row], "igdb_id")
            if not fr.get("bootstrapped_at"):
                sb_patch(url, headers, "game_franchises", f"id=eq.{fr['id']}",
                         {"bootstrapped_at": now_iso()})
            seeded += 1
        print(f"  Phase A: {seeded} jeu(x) Steam ajoute(s)")
    else:
        print("  Phase A: rien de nouveau cote Steam")

    if dry_run:
        print("\n[dry-run] phases B/C/D non executees (elles dependent des ecritures de A).")
        return 0

    # ── Phases B et C : refresh + diff ──────────────────────
    watched = sb_get(url, headers, "game_franchises",
                     "watched=eq.true&igdb_collection_id=not.is.null"
                     "&select=id,igdb_collection_id,name,bootstrapped_at")
    total_events = 0
    for fr in watched:
        try:
            games = client.query("games",
                                 f"{GAME_FIELDS} where collection = {fr['igdb_collection_id']}; "
                                 f"sort first_release_date desc; limit {MAX_TITLES_PER_COLLECTION};")
        except Exception as exc:
            print(f"  WARN {fr['name']}: fetch KO ({exc}) — licence sautee")
            continue
        if len(games) >= MAX_TITLES_PER_COLLECTION:
            print(f"  WARN {fr['name']}: collection plafonnee a "
                  f"{MAX_TITLES_PER_COLLECTION} titres — des titres anciens sont ignores")

        fresh = [{**to_title_row(g), "franchise_id": fr["id"]} for g in games]
        old = {gid: t for gid, t in titles_by_igdb.items()
               if t["franchise_id"] == fr["id"]}

        try:
            saved = sb_upsert(url, headers, "game_titles", fresh, "igdb_id")
        except Exception as exc:
            print(f"  WARN {fr['name']}: ecriture KO ({exc}) — licence sautee")
            continue

        if fr["id"] not in bootstrapped_before:
            sb_patch(url, headers, "game_franchises", f"id=eq.{fr['id']}",
                     {"bootstrapped_at": now_iso()})
            print(f"  {fr['name']}: {len(fresh)} titres (peuplement initial, aucun evenement)")
            continue

        events = diff_game_events(old, fresh)
        if events:
            id_by_igdb = {r["igdb_id"]: r["id"] for r in saved}
            sb_upsert(url, headers, "game_releases", [{
                "franchise_id": fr["id"],
                "title_id": id_by_igdb.get(gid),
                "event_type": etype,
                "title": title,
                "event_date": edate,
            } for (etype, title, edate, gid) in events if id_by_igdb.get(gid)],
                "title_id,event_type", ignore_dupes=True)
        total_events += len(events)
        print(f"  {fr['name']}: {len(fresh)} titres, {len(events)} evenement(s)")

    # ── Phase D : duree de jeu ──────────────────────────────
    sans_ttb = sb_get(url, headers, "game_titles",
                      f"time_to_beat_minutes=is.null&select=id,igdb_id&limit={MAX_TTB_PER_RUN}")
    if sans_ttb:
        by_igdb = {t["igdb_id"]: t["id"] for t in sans_ttb}
        rows = client.query("game_time_to_beats",
                            f"fields game_id,normally; where game_id = {id_list(list(by_igdb))}; "
                            f"limit 500;")
        patched = 0
        for r in rows:
            tid = by_igdb.get(r.get("game_id"))
            if tid and r.get("normally"):
                sb_patch(url, headers, "game_titles", f"id=eq.{tid}",
                         {"time_to_beat_minutes": int(r["normally"] // 60)})
                patched += 1
        print(f"  Phase D: {patched} duree(s) renseignee(s)")

    print(f"\nDone. {seeded} jeux seedes, {total_events} evenements, "
          f"{client.calls} appels IGDB.")
    return 0


if __name__ == "__main__":
    p = argparse.ArgumentParser(description="Sync IGDB du tracker jeux.")
    p.add_argument("--dry-run", action="store_true", help="aucune ecriture")
    p.add_argument("--import-wishlist", action="store_true",
                   help="importe gaming_wishlist dans game_progress (one-shot)")
    args = p.parse_args()
    sys.exit(run_sync(args.dry_run, args.import_wishlist))
```

Le drapeau `--import-wishlist` est déjà déclaré ici mais n'est branché qu'à la Task 6 : à ce stade, le passer n'a aucun effet. C'est voulu — le pipeline doit d'abord tourner et peupler `game_titles` avant qu'un import ait du sens.

- [ ] **Step 2: Vérifier que le script se charge et sort proprement sans secrets**

```bash
cd ~/projects/jarvis-cockpit
python pipelines/igdb_tracker_sync.py
```

Attendu : `[skip] TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET absents — rien a faire. ...` et code de sortie 0. Vérifier avec `echo $?`.

- [ ] **Step 3: Dry-run réel**

```bash
TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy \
SUPABASE_URL=https://mrmgptqpflzyavdfqwwv.supabase.co \
SUPABASE_SERVICE_KEY=<service key> \
python pipelines/igdb_tracker_sync.py --dry-run
```

Attendu : une ligne `[dry-run] seed <jeu> -> licence <licence> (N min, watched=true|false)` par jeu Steam résolu, et un décompte des appids inconnus d'IGDB. **Aucune écriture.** Vérifier avec MCP `execute_sql` :

```sql
select count(*) from game_titles;
```

Attendu : `0`.

- [ ] **Step 4: Premier run réel, puis vérification anti-inondation**

```bash
TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy \
SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
python pipelines/igdb_tracker_sync.py
```

Puis, via MCP `execute_sql` — c'est **le** contrôle qui valide le garde-fou :

```sql
select
  (select count(*) from game_franchises) as franchises,
  (select count(*) from game_franchises where watched) as surveillees,
  (select count(*) from game_titles) as titres,
  (select count(*) from game_releases) as evenements,
  (select count(*) from game_progress) as progression;
```

Attendu : `titres` ≥ 60, `surveillees` autour de 20, **`evenements` = 0** (tout est en peuplement initial), et **`progression` = 0** (le pipeline n'y touche pas). Si `evenements` > 0 au premier run, le garde-fou `bootstrapped_at` est cassé — corriger avant d'aller plus loin.

- [ ] **Step 5: Deuxième run — vérifier l'idempotence**

```bash
TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
python pipelines/igdb_tracker_sync.py
```

Re-lancer la requête du Step 4. Attendu : `franchises` et `titres` **inchangés** (upsert par `igdb_id` / `igdb_collection_id`), `evenements` toujours à 0 ou très bas (seuls des changements réels côté IGDB en produiraient).

- [ ] **Step 6: Créer le workflow**

`.github/workflows/igdb-tracker-sync.yml` :

```yaml
name: Jeux — tracker IGDB

on:
  schedule:
    # Quotidien a 8h30 UTC — apres anime (7h30), TMDB (7h45) et jp-vocab (8h00),
    # et bien apres steam-sync (5h30) dont ce pipeline lit le snapshot.
    - cron: '30 8 * * *'
  workflow_dispatch:
    inputs:
      dry_run:
        description: "Dry-run (aucune écriture)"
        type: boolean
        default: false

jobs:
  igdb-tracker-sync:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: pip install -r pipelines/requirements-igdb.txt

      # Sans les secrets Twitch le script sort en [skip] avec le code 0 :
      # le workflow reste vert tant qu'ils ne sont pas poses.
      - name: Run IGDB tracker sync
        env:
          TWITCH_CLIENT_ID: ${{ secrets.TWITCH_CLIENT_ID }}
          TWITCH_CLIENT_SECRET: ${{ secrets.TWITCH_CLIENT_SECRET }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
        run: python pipelines/igdb_tracker_sync.py ${{ inputs.dry_run && '--dry-run' || '' }}
```

- [ ] **Step 7: Poser les secrets GitHub**

```bash
gh secret set TWITCH_CLIENT_ID
gh secret set TWITCH_CLIENT_SECRET
gh secret list | grep TWITCH
```

Attendu : les deux secrets apparaissent.

- [ ] **Step 8: Commit**

```bash
git add pipelines/igdb_tracker_sync.py .github/workflows/igdb-tracker-sync.yml
git commit -m "feat(games): pipeline IGDB quotidien (seed Steam + suites annoncees)

Quatre phases : seed via external_games, refresh des collections
surveillees, diff, duree de jeu. bootstrapped_at garantit qu'un premier
peuplement n'emet aucun evenement. N'ecrit jamais game_progress."
```

---

### Task 6: Absorber `gaming_wishlist` et retirer la §5 du panel

**Files:**
- Modify: `pipelines/igdb_tracker_sync.py` (ajouter `import_wishlist()`)
- Modify: `cockpit/panel-gaming.jsx:467-520` (bloc §5)
- Modify: `cockpit/lib/data-loader.js:1320-1323` (`T2.gaming_wishlist`), `:2798-2831` (bloc wishlist de `transformGaming`), `:4711-4725` (`loadPanel("gaming")`)

**Interfaces:**
- Consumes: `game_titles` et `game_franchises` peuplées (Task 5).
- Produces: `import_wishlist(url, headers, client, dry_run) -> int` (nombre de lignes importées).

**Attention — dérive de spec constatée** : `docs/specs/tab-gaming.md` décrit un `<WishlistEditor>` avec CRUD complet et des handlers `handleWishlistCreate/Update/Delete`. **Ce code n'existe pas** dans `cockpit/panel-gaming.jsx` : la §5 est en lecture seule. Ne pas chercher à supprimer du code absent ; corriger la spec en Task 8.

- [ ] **Step 1: Constater l'état de départ**

Via MCP `execute_sql` :

```sql
select id, appid, title, release_date, hype, note from gaming_wishlist order by title;
```

Noter les 8 lignes et lesquelles portent un `appid` non nul. Cette liste sert de contrôle au Step 4.

- [ ] **Step 2: Ajouter la fonction d'import au pipeline**

Dans `pipelines/igdb_tracker_sync.py`, ajouter avant `run_sync` :

```python
# ── Import one-shot de gaming_wishlist ──────────────────────
def import_wishlist(url, headers, client, dry_run):
    """gaming_wishlist -> game_titles + game_progress(status='wishlist').

    One-shot, mais idempotent : une ligne deja importee (meme igdb_id) est
    reconnue par l'upsert et son game_progress n'est pas ecrase.
    La table gaming_wishlist n'est PAS supprimee — on ne detruit pas des
    donnees utilisateur sur la foi d'un script. Elle sera droppee a la main
    une fois l'import verifie.
    """
    rows = sb_get(url, headers, "gaming_wishlist", "select=id,appid,title&order=title")
    if not rows:
        print("  wishlist vide — rien a importer")
        return 0

    resolved = {}
    with_appid = [r["appid"] for r in rows if r.get("appid")]
    if with_appid:
        resolved = resolve_steam(client, set(with_appid))

    imported = 0
    for r in rows:
        gid = resolved.get(r.get("appid"))
        if gid is None:
            # Pas d'appid, ou appid inconnu d'IGDB : recherche par nom.
            name = r["title"].replace('"', "")
            found = client.query("games", f'{GAME_FIELDS} search "{name}"; limit 1;')
            if not found:
                print(f"  WARN wishlist « {r['title']} » : introuvable sur IGDB — ignoree")
                continue
            game = found[0]
        else:
            games = fetch_games(client, [gid])
            if not games:
                print(f"  WARN wishlist « {r['title']} » : id IGDB {gid} muet — ignoree")
                continue
            game = games[0]

        if dry_run:
            print(f"    [dry-run] wishlist « {r['title']} » -> IGDB {game['id']} ({game.get('name')})")
            continue

        cid_col = game.get("collection")
        fname = game.get("name") or r["title"]
        if cid_col:
            cols = fetch_collections(client, [cid_col])
            fname = (cols.get(cid_col) or {}).get("name") or fname
        fr = upsert_franchise(url, headers, fname, cid_col, watched=True)
        saved = sb_upsert(url, headers, "game_titles",
                          [{**to_title_row(game), "franchise_id": fr["id"],
                            "steam_appid": r.get("appid")}], "igdb_id")
        if not fr.get("bootstrapped_at"):
            sb_patch(url, headers, "game_franchises", f"id=eq.{fr['id']}",
                     {"bootstrapped_at": now_iso()})
        # ignore_dupes : ne jamais ecraser un statut deja pose par l'utilisateur.
        sb_upsert(url, headers, "game_progress",
                  [{"title_id": saved[0]["id"], "status": "wishlist"}],
                  "title_id", ignore_dupes=True)
        imported += 1
        print(f"  wishlist « {r['title']} » -> {game.get('name')}")
    return imported
```

Et brancher le drapeau, juste après la construction du client dans `run_sync` :

```python
    if import_wishlist_flag:
        n = import_wishlist(url, headers, client, dry_run)
        print(f"\nImport wishlist: {n} ligne(s).")
        return 0
```

Le paramètre de `run_sync` s'appelle déjà `import_wishlist_flag` (Task 5) précisément pour ne pas masquer cette fonction, et l'appel final `run_sync(args.dry_run, args.import_wishlist)` est déjà en place. Rien d'autre à modifier dans la signature.

- [ ] **Step 3: Dry-run de l'import**

```bash
TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
python pipelines/igdb_tracker_sync.py --import-wishlist --dry-run
```

Attendu : une ligne `[dry-run] wishlist « X » -> IGDB <id> (<nom>)` par titre. Vérifier que les noms IGDB correspondent bien aux titres notés au Step 1 — une recherche par nom peut tomber à côté.

- [ ] **Step 4: Import réel et vérification**

```bash
TWITCH_CLIENT_ID=xxx TWITCH_CLIENT_SECRET=yyy SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
python pipelines/igdb_tracker_sync.py --import-wishlist
```

Via MCP `execute_sql` :

```sql
select p.status, t.name, t.first_release_date, t.release_human
from game_progress p join game_titles t on t.id = p.title_id
where p.status = 'wishlist' order by t.name;
```

Attendu : autant de lignes que de titres importés (8 moins les éventuels introuvables signalés en `WARN`). Comparer les noms à la liste du Step 1.

- [ ] **Step 5: Retirer le bloc §5 du panel**

Dans `cockpit/panel-gaming.jsx`, supprimer intégralement le bloc allant du commentaire `{/* ══ §5 WISHLIST ══ */}` (ligne 467) jusqu'à la ligne précédant `{/* ══ §6 TOP ALL-TIME ══ */}` (ligne 521). Supprimer aussi la ligne 9 de l'en-tête de fichier :

```js
// §5 Wishlist (lien veille gaming)
```

- [ ] **Step 6: Retirer la wishlist du data-loader**

Dans `cockpit/lib/data-loader.js` :
1. Supprimer la méthode `T2.gaming_wishlist()` (lignes 1320-1323).
2. Dans `transformGaming` : retirer `wishlist` de la signature (ligne 2517), supprimer le bloc de construction `wishlistRows` (lignes ~2798-2801 jusqu'à sa fin), retirer `wishlist: wishlistRows` de l'objet retourné (ligne ~2831) et `wishlist_count: wishlistRows.length` (ligne ~2843). Laisser `wishlist_count: 0` ligne 2747 si cette clé est lue ailleurs — vérifier avec `grep -n "wishlist_count" cockpit/`.
3. Dans `loadPanel("gaming")` (lignes 4711-4725) : retirer `T2.gaming_wishlist().catch(() => [])` du `Promise.all`, la variable `wishlist` des trois destructurations/appels, et de `window.GAMING_PERSO_DATA._raw`.

- [ ] **Step 7: Vérifier qu'il ne reste aucune référence**

```bash
cd ~/projects/jarvis-cockpit
grep -rn "gaming_wishlist\|D\.wishlist\|wishlistRows\|gm-wl" cockpit/ | grep -v "^cockpit/styles-gaming.css"
```

Attendu : aucune sortie. Les règles CSS `.gm-wl-*` peuvent rester dans `styles-gaming.css` — elles seront reprises au lot 2.

- [ ] **Step 8: Vérifier que le panel se charge encore**

Ouvrir `index.html` dans le navigateur, se connecter, ouvrir l'onglet Gaming. Attendu : les sections §1 à §4 et §6 à §8 s'affichent, aucune erreur dans la console, et plus de section Wishlist. Si le front ne peut pas être testé en local, pousser sur `main` et vérifier sur Pages après un hard-refresh.

- [ ] **Step 9: Commit**

```bash
git add pipelines/igdb_tracker_sync.py cockpit/panel-gaming.jsx cockpit/lib/data-loader.js
git commit -m "feat(games): absorbe gaming_wishlist dans game_progress

Import one-shot via --import-wishlist (resolution par appid puis par nom),
puis retrait de la §5 du panel Gaming et de tout le chemin de donnees
associe. La table gaming_wishlist est conservee jusqu'a verification."
```

---

### Task 7: `<GamesBriefCard>` — la boucle sur la page d'accueil

**Files:**
- Modify: `cockpit/home.jsx:228-241` (après `MdtBriefCard`), `:454` (montage)
- Modify: `cockpit/lib/data-loader.js:1181-1184` (Tier 1), `:1232` (shape)
- Modify: `cockpit/styles-gaming.css` (ajout des règles `.gmb-*`)
- Modify: `docs/telemetry.md`

**Interfaces:**
- Consumes: `game_releases` peuplée, `window.sb.patchJSON`, `window.track`.
- Produces: `window.GamesBriefCard` — composant React `({ releases, onNavigate }) => JSX | null`.

- [ ] **Step 1: Ajouter le fetch Tier 1**

Dans `cockpit/lib/data-loader.js`, dans `bootTier1`, juste après le bloc `once("media_releases_fresh", ...)` (ligne 1184), ajouter au même niveau du `Promise.all` :

```js
      once("game_releases_fresh", () => {
        const from = new Date(Date.now() - 30 * 86400000).toISOString();
        return q("game_releases", `acknowledged=eq.false&detected_at=gte.${from}&order=detected_at.desc&limit=5`);
      }).catch(() => []),
```

Fenêtre à 30 jours et non 7 comme la médiathèque : une annonce de jeu reste pertinente bien plus longtemps qu'une sortie d'épisode.

Ajouter la variable correspondante à la destructuration du `Promise.all` (même position que dans le tableau) sous le nom `gameReleases`, puis dans l'objet retourné, après la ligne `media_releases: mediaReleases,` :

```js
      game_releases: gameReleases,    // encart Jeux du Brief (T1 leger)
```

- [ ] **Step 2: Écrire le composant**

Dans `cockpit/home.jsx`, après la fonction `MdtBriefCard` (ligne 241) :

```jsx
// Encart Jeux du Brief. C'est le SEUL point de contact du lot 1 : la boucle
// entiere (voir -> decider -> ecrire) tient ici, sans ouvrir d'onglet.
// Deux actions, toutes deux ecrivent : acquitter l'evenement, ou cesser de
// suivre la licence. Rien ne s'accumule : un evenement acquitte ne revient pas.
function GamesBriefCard({ releases = [], onNavigate }) {
  const [hidden, setHidden] = React.useState({});
  const visible = releases.filter((r) => !hidden[r.id]);
  if (!visible.length) return null;

  const LABEL = {
    announced: "annoncé",
    date_announced: "daté",
    released: "sorti",
    cancelled: "annulé",
  };

  // window.sb.patchJSON renvoie la Response BRUTE et ne leve jamais sur un
  // 4xx/5xx (cockpit/lib/supabase.js:35-42, contrairement a postJSON). Sans
  // ce controle explicite de r.ok, un refus RLS passerait pour un succes et
  // la ligne disparaitrait de l'ecran sans avoir ete acquittee en base.
  async function patchOrThrow(path, body) {
    const r = await window.sb.patchJSON(window.SUPABASE_URL + path, body);
    if (!r.ok) throw new Error(String(r.status));
    return r;
  }

  async function ack(r) {
    setHidden((h) => ({ ...h, [r.id]: true }));   // optimiste
    window.track && window.track("games_release_ack", { event_type: r.event_type });
    try {
      await patchOrThrow("/rest/v1/game_releases?id=eq." + r.id, { acknowledged: true });
    } catch (e) {
      setHidden((h) => ({ ...h, [r.id]: false })); // rollback
      window.track && window.track("error_shown", { context: "games_ack", message: e.message });
    }
  }

  async function unwatch(r) {
    setHidden((h) => ({ ...h, [r.id]: true }));
    window.track && window.track("games_unwatch_franchise", { franchise: r.franchise_id });
    try {
      await patchOrThrow("/rest/v1/game_franchises?id=eq." + r.franchise_id, { watched: false });
      await patchOrThrow("/rest/v1/game_releases?id=eq." + r.id, { acknowledged: true });
    } catch (e) {
      setHidden((h) => ({ ...h, [r.id]: false }));
      window.track && window.track("error_shown", { context: "games_unwatch", message: e.message });
    }
  }

  return (
    <section className="gmb-brief" aria-label="Sorties jeux">
      <div className="gmb-brief-head">
        🎮 Jeux — {visible.length} nouveauté{visible.length > 1 ? "s" : ""}
      </div>
      <ul className="gmb-brief-list">
        {visible.slice(0, 3).map((r) => (
          <li key={r.id} className="gmb-brief-item">
            <span className="gmb-brief-text">
              {r.title}
              <span className="gmb-brief-tag">{LABEL[r.event_type] || r.event_type}</span>
            </span>
            <span className="gmb-brief-actions">
              <button className="gmb-brief-btn" onClick={() => ack(r)}
                      title="J'ai vu">✓</button>
              <button className="gmb-brief-btn is-dismiss" onClick={() => unwatch(r)}
                      title="Ne plus suivre cette licence">✕ licence</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 3: Monter le composant**

Dans `cockpit/home.jsx`, juste après la ligne 454 (`<MdtBriefCard ... />`) :

```jsx
      <GamesBriefCard releases={data.game_releases || []} onNavigate={onNavigate} />
```

- [ ] **Step 4: Émettre l'événement d'affichage**

Dans le corps de `Home`, à côté des autres `React.useEffect` de télémétrie, ajouter :

```jsx
  React.useEffect(() => {
    const n = (data.game_releases || []).length;
    if (n) window.track && window.track("games_brief_shown", { count: n });
  }, [data.game_releases]);
```

- [ ] **Step 5: Ajouter les styles**

À la fin de `cockpit/styles-gaming.css` :

```css
/* ── Encart Jeux du Brief du jour (lot 1 du tracker) ───────── */
.gmb-brief {
  border: 1px solid var(--border, #2a2f3a);
  border-radius: 12px;
  padding: 14px 16px;
  margin: 16px 0;
  background: var(--card, #161a22);
}
.gmb-brief-head { font-weight: 600; margin-bottom: 10px; }
.gmb-brief-list { list-style: none; margin: 0; padding: 0; }
.gmb-brief-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
}
.gmb-brief-text { flex: 1; min-width: 0; }
.gmb-brief-tag {
  margin-left: 8px;
  font-size: 11px;
  opacity: 0.65;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.gmb-brief-actions { display: flex; gap: 6px; flex-shrink: 0; }
.gmb-brief-btn {
  border: 1px solid var(--border, #2a2f3a);
  background: transparent;
  color: inherit;
  border-radius: 8px;
  /* 44px de cible tactile : meme regle que la passe mobile de la mediatheque */
  min-height: 44px;
  padding: 0 12px;
  cursor: pointer;
  font-size: 13px;
}
.gmb-brief-btn.is-dismiss { opacity: 0.7; }
@media (hover: hover) {
  .gmb-brief-btn:hover { background: var(--hover, #202634); }
}
```

- [ ] **Step 6: Documenter les événements de télémétrie**

Dans `docs/telemetry.md`, ajouter les trois événements dans la section appropriée, en suivant le format des entrées existantes :

- `games_brief_shown` `{count}` — encart Jeux rendu avec au moins un événement non acquitté
- `games_release_ack` `{event_type}` — l'utilisateur acquitte un événement
- `games_unwatch_franchise` `{franchise}` — l'utilisateur cesse de suivre une licence

Ajouter la mention de la sonde de survie : trois semaines sans `games_release_ack` ni `games_unwatch_franchise` après le premier événement détecté ⇒ le lot 2 n'est pas lancé et l'encart est retiré.

- [ ] **Step 7: Resynchroniser le service worker**

```bash
node scripts/sync-sw.mjs
git diff --stat sw.js
```

Attendu : `sw.js` modifié (le hash de `styles-gaming.css` et de `home.jsx` change). Ne jamais éditer `STATIC[]` ou `CACHE` à la main.

- [ ] **Step 8: Vérifier en prod**

```bash
git add -A && git commit -m "wip" && git push
```

Puis ouvrir `https://ph3nixx.github.io/jarvis-cockpit/` avec un hard-refresh (Ctrl+Shift+R). Attendu : si `game_releases` contient au moins une ligne non acquittée, l'encart 🎮 apparaît sous l'encart Médiathèque. Cliquer ✓ sur une ligne : elle disparaît immédiatement. Vérifier l'écriture via MCP :

```sql
select id, title, event_type, acknowledged from game_releases order by detected_at desc limit 5;
```

Attendu : la ligne cliquée porte `acknowledged = true`.

S'il n'y a aucun événement en base (cas normal après le peuplement initial), en fabriquer un pour tester :

```sql
insert into game_releases (franchise_id, title_id, event_type, title, event_date)
select f.id, t.id, 'announced', 'Test — ' || t.name, current_date + 30
from game_titles t join game_franchises f on f.id = t.franchise_id limit 1;
```

Le supprimer après le test :

```sql
delete from game_releases where title like 'Test — %';
```

- [ ] **Step 9: Commit**

```bash
git add cockpit/home.jsx cockpit/lib/data-loader.js cockpit/styles-gaming.css docs/telemetry.md sw.js
git commit -m "feat(games): encart Jeux dans le Brief du jour

Le seul point de contact du lot 1 : voir, acquitter, ou cesser de suivre
la licence — sans ouvrir d'onglet. Fenetre a 30 jours (une annonce de jeu
reste pertinente plus longtemps qu'une sortie d'episode). Trois events de
telemetrie qui servent de sonde de survie au lot 2."
```

---

### Task 8: Documentation d'architecture

**Files:**
- Modify: `docs/specs/tab-gaming.md`, `docs/specs/index.json`
- Modify: `docs/architecture/pipelines.yaml`, `docs/architecture/dependencies.yaml`, `docs/architecture/decisions.md`, `docs/secrets.md`
- Create: `docs/architecture/flows/perso-jeux.yaml`

- [ ] **Step 1: Créer le flow**

`docs/architecture/flows/perso-jeux.yaml`, calqué sur `perso-mediatheque.yaml` :

```yaml
# Flow : Tracker jeux video (IGDB + seed Steam)
# STUB — voir pipelines.yaml::igdb_tracker_sync.

id: perso-jeux
label: "Tracker jeux (bibliotheque, licences suivies, sorties annoncees)"
domain: perso
status: todo

source_api:
  - name: "IGDB v4"
    detail: "api.igdb.com/v4 — OAuth client_credentials Twitch ; collections, games, external_games (pont Steam), game_time_to_beats ; 4 req/s ; CORS refuse cote navigateur"
  - name: "steam_games_snapshot (interne)"
    detail: "inventaire PC deja alimente par steam_sync — sert de seed, pas de source de statut"

pipeline:
  id: igdb_tracker_sync
  workflow: ".github/workflows/igdb-tracker-sync.yml"
  script: "pipelines/igdb_tracker_sync.py"
  cron: "30 8 * * *"

tables:
  - name: game_franchises
    write: true
  - name: game_titles
    write: true
  - name: game_releases
    write: true
  - name: game_progress
    write: false   # user-owned, front uniquement
  - name: steam_games_snapshot
    write: false   # lecture seule (seed)

panels:
  - id: brief
    detail: "Encart GamesBriefCard (game_releases non acquittes < 30j, Tier 1) — seul point de contact du lot 1"
  - id: gaming
    detail: "Lot 2 (conditionne a la sonde de survie) — bibliotheque a statuts, rail « A venir »"
```

- [ ] **Step 2: Déclarer le pipeline**

Dans `docs/architecture/pipelines.yaml`, insérer après l'entrée `tmdb_tracker_sync` (qui se termine ligne 316) :

```yaml
  - id: igdb_tracker_sync
    name: "Tracker jeux (IGDB + seed Steam)"
    cron: "30 8 * * *"
    human_time: "Quotidien 08:30 UTC"
    workflow_file: ".github/workflows/igdb-tracker-sync.yml"
    health:
      panels: [brief]
      # Pas de contrôle de fraîcheur : sans les secrets Twitch le pipeline
      # sort en [skip] code 0 — un run vert et zéro écriture est nominal.
      # Et un run sans événement est le cas ordinaire : une licence n'annonce
      # pas une suite tous les jours.
    script: "pipelines/igdb_tracker_sync.py"
    input_api: "IGDB v4 (TWITCH_CLIENT_ID + TWITCH_CLIENT_SECRET)"
    output_tables:
      - game_franchises
      - game_titles
      - game_releases
    read_tables:
      - game_franchises
      - game_titles
      - steam_games_snapshot
      - gaming_wishlist
    avg_duration_s: 120
    budget_usd: 0
    status: active
    notes: "Quatre phases — seed (appids Steam traduits en ids IGDB via external_games), refresh des collections watched, diff, durée de jeu (game_time_to_beats, cap 50/run). N'écrit JAMAIS game_progress, qui appartient à l'utilisateur. La colonne game_franchises.bootstrapped_at garantit qu'une franchise peuplée pour la première fois n'émet aucun événement : sans elle le premier run inonderait le Brief de centaines d'annonces pour des jeux sortis il y a dix ans. IGDB limite à 4 req/s (throttle 0.25 s) et refuse le CORS navigateur — la recherche front du lot 2 exigera une Edge Function. Sans les secrets Twitch : sortie [skip] code 0."
```

- [ ] **Step 3: Déclarer les tables**

Dans `docs/architecture/dependencies.yaml`, ajouter les 4 tables `game_*` avec leur RLS (`authenticated`, 4 opérations) et la matrice panel↔table : `brief` lit `game_releases` ; `gaming` lira les 4 au lot 2.

- [ ] **Step 4: Écrire l'ADR**

Dans `docs/architecture/decisions.md`, ajouter une entrée ADR au numéro suivant disponible (vérifier le dernier avec `grep -n "^## ADR-" docs/architecture/decisions.md | tail -1`), datée du jour, titrée « Tracker jeux — tables `game_*` dédiées plutôt que réutilisation de `media_*` ». Contenu à couvrir :
- la décision et son alternative rejetée ;
- l'argument : le critère de réussite d'ADR-29 était que `mediatheque-view.js` ne bouge pas ; un jeu n'entre pas dans le vocabulaire `episodes_total` / `airing_status` / `next_episode_airing_at`, donc réutiliser forcerait 6 fonctions testées à exclure les jeux ;
- le coût accepté : ~40 lignes de SQL en plus ;
- la seconde décision : proxy Edge Function pour la recherche front au lot 2 plutôt que clé en base, IGDB refusant le CORS — et le rappel que `jsearch-proxy` a été supprimée le 2026-08-13 pour clé en dur + absence de JWT.

- [ ] **Step 5: Documenter les secrets**

Dans `docs/secrets.md`, ajouter une section pour `TWITCH_CLIENT_ID` et `TWITCH_CLIENT_SECRET` : où les obtenir (https://dev.twitch.tv/console/apps), quel pipeline les consomme, et le comportement sans eux (`[skip]`, code 0, workflow vert).

- [ ] **Step 6: Mettre à jour la spec de l'onglet Gaming**

Dans `docs/specs/tab-gaming.md` :
1. **Corriger la dérive constatée** : la spec décrit un `<WishlistEditor>` avec CRUD (lignes 70-72 du tableau « Front — fonctions JS », et les entrées `[x]` correspondantes des TODO). Ce code n'existe pas. Retirer ces lignes.
2. Retirer la §5 Wishlist du « Parcours utilisateur », des « Fonctionnalités », de la structure DOM et de la table `gaming_wishlist` dans « Back — sources de données ».
3. Ajouter une section « Tracker jeux — lot 1 » décrivant l'encart du Brief, les 4 tables, le pipeline `igdb_tracker_sync`, et le fait que la refonte de l'onglet est conditionnée à la sonde de survie.
4. Ajouter une entrée datée en tête de « Dernière MAJ ».
5. Bump `last_updated` de `tab-gaming` dans `docs/specs/index.json`.

- [ ] **Step 7: Vérifier les linters d'architecture et de specs**

```bash
cd ~/projects/jarvis-cockpit
python scripts/lint_specs_produit.py; echo "lint-specs=$?"
python scripts/validate_arch.py 2>/dev/null || ls scripts/ | grep -i arch
```

Attendu : `lint-specs=0`. Si `validate_arch.py` porte un autre nom, le retrouver via le workflow : `grep -n "run:" .github/workflows/validate-arch.yml`.

- [ ] **Step 8: Commit**

```bash
git add docs/
git commit -m "docs(games): architecture, ADR et spec du tracker jeux lot 1

Nouveau flow perso-jeux, pipeline igdb_tracker_sync declare, 4 tables
game_* dans dependencies, ADR sur le choix des tables dediees, secrets
Twitch documentes.

Corrige au passage une derive de tab-gaming.md : le WishlistEditor CRUD
qu'elle decrivait n'a jamais existe dans panel-gaming.jsx."
```

---

## Vérification finale

- [ ] **Tous les tests passent**

```bash
cd ~/projects/jarvis-cockpit
status=0
for f in tests/test_*.py; do echo "── $f"; python "$f" || status=1; done
for f in tests/test_*.mjs; do echo "── $f"; node "$f" || status=1; done
echo "status=$status"
```

Attendu : `status=0`.

- [ ] **Le workflow tourne en vrai**

```bash
gh workflow run igdb-tracker-sync.yml
sleep 60 && gh run list --workflow=igdb-tracker-sync.yml --limit 1
```

Attendu : conclusion `success`.

- [ ] **L'état en base est cohérent**

```sql
select
  (select count(*) from game_franchises) as franchises,
  (select count(*) from game_franchises where watched) as surveillees,
  (select count(*) from game_franchises where bootstrapped_at is null) as jamais_peuplees,
  (select count(*) from game_titles) as titres,
  (select count(*) from game_titles where time_to_beat_minutes is not null) as avec_duree,
  (select count(*) from game_releases) as evenements,
  (select count(*) from game_progress where status = 'wishlist') as wishlist;
```

Attendu : `jamais_peuplees = 0`, `wishlist` = le nombre de titres importés au Task 6, `evenements` bas (0 à quelques unités).

- [ ] **Aucune régression sur la médiathèque**

```sql
select (select count(*) from media_franchises) as f,
       (select count(*) from media_entries) as e,
       (select count(*) from media_progress) as p;
```

Attendu : `f = 48`, `e = 223`, `p = 174` — les valeurs relevées le 2026-08-12. Aucune table `media_*` n'a été touchée par ce lot.
