# Onglet Santé + groupe Coulisses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un onglet « Santé » qui dit, par domaine fonctionnel, ce qui marche, ce qui est cassé, depuis quand, ce que ça coûte et quel geste répare — et un groupe de sidebar « Coulisses » qui rassemble la machine, son coût et ses plans.

**Architecture:** La table `pipeline_health` (déjà chargée en Tier 1, sans filtre) gagne trois colonnes déclaratives (`domain`, `remediation`, `impact`) peuplées depuis `docs/architecture/pipelines.yaml` par l'observateur externe `pipelines/pipeline_health.py`. L'observateur est étendu pour couvrir trois angles morts (routine distante Jobs Radar, sauvegarde Supabase, lui-même) et corriger quatre sondes de fraîcheur fausses ou absentes. Côté front, toute la logique de présentation vit dans un module JS pur `cockpit/lib/sante-view.js` (testable sous node) que `cockpit/panel-sante.jsx` se contente de rendre — aucun fetch, la donnée est déjà en mémoire.

**Tech Stack:** Python 3.11 (requests, pyyaml) · PostgREST/Supabase · React 18 + Babel standalone via CDN (no build step) · tests en scripts nus (pas de pytest, pas de framework JS)

**Spec:** `docs/superpowers/specs/2026-08-20-sante-coulisses-design.md`

## Global Constraints

- **No build step.** React 18 + `@babel/standalone` via CDN. Aucun `import`/`export` ES dans les `.jsx` — les composants s'exposent sur `window.X`.
- **La logique testable va dans `cockpit/lib/*.js`**, en IIFE avec double export : `window.santeView` pour le navigateur, `module.exports` pour node. **Aucune dépendance au DOM, à React, ni à `window.COCKPIT_DATA`** dans ce fichier. Modèle de référence : `cockpit/lib/games-view.js`.
- **Pas de pytest, pas de framework JS.** Chaque test est un script qui imprime `ok`/`FAIL` et sort en 1 si un check échoue. La CI (`.github/workflows/tests.yml`) auto-découvre `tests/test_*.py` et `tests/test_*.mjs` — un nouveau fichier tourne sans toucher au workflow.
- **Tout script Python qui imprime des accents ou des symboles** commence par `sys.stdout.reconfigure(encoding="utf-8", errors="replace")` — sans ça, `UnicodeEncodeError` cp1252 sur la console Windows.
- **Le site est servi sous `/jarvis-cockpit/`.** Jamais de chemin absolu depuis `/` : un `<script src="/cockpit/...">` est un 404 en prod.
- **Après toute modif de `index.html` ou `cockpit/**`** : `node scripts/sync-sw.mjs`. Ne jamais éditer `STATIC[]` ou `CACHE` à la main.
- **Vérification front en prod**, pas en `file://` : push sur `main` puis hard-refresh de la page Pages. Le local ne prouve rien sur l'auth et les données.
- **Vocabulaire fermé des domaines**, verbatim, 7 valeurs :
  `veille_ia`, `apprentissage`, `veille_satellite`, `mediatheque`, `perso`, `business`, `socle`.
- **Ordre fixe des sections** = l'ordre de ce vocabulaire ci-dessus. Ne jamais trier par gravité.

---

### Task 1: Migration SQL — les trois colonnes déclaratives

**Files:**
- Create: `sql/032_pipeline_health_selfcontained.sql`

**Interfaces:**
- Consumes: rien (première tâche)
- Produces: la table `pipeline_health` porte `domain text`, `remediation text`, `impact text` — consommées par la Task 3 (écriture) et la Task 5 (lecture).

- [ ] **Step 1: Écrire la migration**

```sql
-- ============================================================
-- Migration 032: pipeline_health autoporteur
--
-- Pourquoi : la table dit qu'un pipeline est cassé, jamais ce que ça coûte
-- ni quoi faire. Ces deux informations ne se déduisent pas à l'exécution —
-- elles se déclarent, à côté du pipeline, dans docs/architecture/pipelines.yaml
-- sous la clé `health`, et sont recopiées ici à chaque contrôle quotidien.
--
-- domain      : section de l'onglet Santé. Vocabulaire fermé de 7 valeurs,
--               tenu par scripts/validate_architecture.py sur le YAML (source
--               de vérité). Pas de CHECK ici : une contrainte SQL obligerait
--               à une migration à chaque section ajoutée, pour une table que
--               seul un script de confiance écrit.
-- remediation : le geste qui répare, une à deux phrases.
-- impact      : la phrase d'effet, uniquement pour les briques sans `panels`
--               (le Socle). Ailleurs elle se dérive des panels côté front.
--
-- Aucun backfill : pipeline_health.py réécrit TOUTES les lignes à chaque run
-- (upsert merge-duplicates sur pipeline_id). Les colonnes se peuplent au
-- premier passage suivant le déploiement.
-- ============================================================

ALTER TABLE pipeline_health
  ADD COLUMN IF NOT EXISTS domain      text,
  ADD COLUMN IF NOT EXISTS remediation text,
  ADD COLUMN IF NOT EXISTS impact      text;
```

- [ ] **Step 2: Appliquer la migration**

Via le MCP Supabase `apply_migration` (name: `pipeline_health_selfcontained`), ou l'éditeur SQL du dashboard.

- [ ] **Step 3: Vérifier que les colonnes existent**

Via le MCP Supabase `execute_sql` :

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'pipeline_health'
  and column_name in ('domain', 'remediation', 'impact')
order by column_name;
```

Attendu : 3 lignes, toutes en `text`.

- [ ] **Step 4: Commit**

```bash
git add sql/032_pipeline_health_selfcontained.sql
git commit -m "feat(sante): trois colonnes declaratives sur pipeline_health"
```

---

### Task 2: Garde CI — `domain` obligatoire, vocabulaire fermé

**Files:**
- Modify: `scripts/validate_architecture.py` (constantes en tête + `_validate_pipelines()` à partir de la ligne 75)
- Modify: `docs/architecture/pipelines.yaml` (ajout de `domain:` dans les 16 blocs `health` existants)

**Interfaces:**
- Consumes: rien de la Task 1
- Produces: `HEALTH_DOMAINS` (set de 7 str) et `_validate_health(rpt, rel, ident, health)` dans `scripts/validate_architecture.py` — réutilisés tels quels par la Task 4 pour les nouvelles déclarations.

- [ ] **Step 1: Écrire la garde (elle doit échouer sur les 16 pipelines existants)**

Dans `scripts/validate_architecture.py`, après la constante `FLOW_REQUIRED_KEYS` (ligne 19) :

```python
# Sections de l'onglet Santé. Vocabulaire FERMÉ : une brique dont le domaine
# n'est pas là tomberait dans la section « Non classé » de la page sans que
# personne le sache. Ajouter une valeur ici est un acte délibéré.
HEALTH_DOMAINS = {
    "veille_ia",
    "apprentissage",
    "veille_satellite",
    "mediatheque",
    "perso",
    "business",
    "socle",
}
```

Puis, juste avant `def _validate_pipelines(rpt: Report) -> None:` (ligne 75) :

```python
def _validate_health(rpt: Report, rel: str, ident: str, health: dict) -> None:
    """Valide un bloc `health` — le contrat lu par pipelines/pipeline_health.py."""
    if not isinstance(health, dict):
        rpt.add(rel, f"{ident}.health : doit être un objet")
        return
    domain = health.get("domain")
    if domain not in HEALTH_DOMAINS:
        rpt.add(
            rel,
            f"{ident}.health.domain : '{domain}' absent ou hors vocabulaire "
            f"{sorted(HEALTH_DOMAINS)}",
        )
    # Sans panels, la phrase d'effet ne peut pas se dériver : elle doit être
    # écrite. Sinon la ligne s'affiche sans dire ce qu'elle coûte.
    if not (health.get("panels") or []) and not health.get("impact"):
        rpt.add(
            rel,
            f"{ident}.health : 'panels' vide exige 'impact' "
            "(sinon aucune phrase d'effet n'est possible)",
        )
    # Une sonde de fraîcheur se déclare en entier ou pas du tout.
    if bool(health.get("table")) != bool(health.get("date_column")):
        rpt.add(
            rel,
            f"{ident}.health : 'table' et 'date_column' vont ensemble "
            "(l'une sans l'autre ne mesure rien)",
        )
```

Puis, dans `_validate_pipelines()`, à la fin de la boucle `for i, p in enumerate(pipelines):` (après le check `cron`, ligne 118) :

```python
        health = p.get("health")
        if health is not None and p.get("status") == "active":
            _validate_health(rpt, rel, f"pipelines[{pid or i}]", health)
```

Et, juste après la boucle `for i, p in enumerate(pipelines):` (toujours dans `_validate_pipelines`) :

```python
    # Les routines distantes (claude.ai, hors GitHub Actions) portent le même
    # contrat de santé, sans workflow_file. La boucle no-ope tant qu'aucune
    # n'a déclaré de bloc `health`.
    for i, r in enumerate(data.get("external_routines") or []):
        if not isinstance(r, dict):
            continue
        health = r.get("health")
        if health is not None and r.get("status") == "active":
            _validate_health(rpt, rel, f"external_routines[{r.get('id') or i}]", health)
```

- [ ] **Step 2: Lancer la validation pour vérifier qu'elle échoue**

Run: `python scripts/validate_architecture.py`
Expected: FAIL — 16 violations `health.domain : 'None' absent ou hors vocabulaire`, une par pipeline portant un bloc `health`.

- [ ] **Step 3: Ajouter `domain` aux 16 blocs `health` existants**

Dans `docs/architecture/pipelines.yaml`, ajouter `domain:` en **première ligne** de chaque bloc `health:` :

| Pipeline | `domain` |
|---|---|
| `daily_digest` | `veille_ia` |
| `veille_picks` | `veille_ia` |
| `weekly_analysis` | `apprentissage` |
| `sport_sync` | `veille_satellite` |
| `gaming_sync` | `veille_satellite` |
| `anime_sync` | `veille_satellite` |
| `news_sync` | `veille_satellite` |
| `anime_tracker_sync` | `mediatheque` |
| `tmdb_tracker_sync` | `mediatheque` |
| `jp_vocab_sync` | `mediatheque` |
| `strava_sync` | `perso` |
| `withings_sync` | `perso` |
| `lastfm_sync` | `perso` |
| `steam_sync` | `perso` |
| `tft_sync` | `perso` |
| `igdb_tracker_sync` | `perso` |

Exemple pour `daily_digest` :

```yaml
    health:
      domain: veille_ia
      panels: [brief, updates, top]
      table: articles
      date_column: fetch_date
      max_age_hours: 30
```

- [ ] **Step 4: Documenter les nouvelles clés dans l'en-tête du YAML**

Dans `docs/architecture/pipelines.yaml`, sous la ligne `#   health        : contrat de surveillance, consommé par pipelines/pipeline_health.py`, insérer **avant** la ligne `#     panels          :` :

```yaml
#     domain          : section de l'onglet Santé. Vocabulaire FERMÉ de 7 valeurs
#                       (veille_ia, apprentissage, veille_satellite, mediatheque,
#                       perso, business, socle), imposé par validate-arch. Une
#                       brique sans domaine tomberait dans « Non classé ».
```

Et, après le bloc explicatif des trois cas `table`/`max_age_hours` (qui se termine ligne 33 par `#       ni l'un ni l'autre     → seul le verdict du run compte.`), ajouter :

```yaml
#
#     filter          : (optionnel) fragment de requête PostgREST appliqué à la
#                       sonde de fraîcheur — ex. `source=eq.anilist`. Nécessaire
#                       dès que la table de sortie a plusieurs écrivains, sinon
#                       la sonde d'un pipeline est satisfaite par les écritures
#                       d'un autre.
#     remediation     : (optionnel) le geste qui répare, une à deux phrases.
#                       Affiché tel quel sur l'onglet Santé. Absent = la ligne
#                       dégradée n'affiche pas de flèche, ce qui vaut mieux
#                       qu'un conseil creux.
#     impact          : (optionnel) la phrase d'effet, OBLIGATOIRE quand `panels`
#                       est vide. Ailleurs, l'effet se dérive des panels.
```

- [ ] **Step 5: Relancer la validation**

Run: `python scripts/validate_architecture.py`
Expected: PASS — aucune violation.

- [ ] **Step 6: Commit**

```bash
git add scripts/validate_architecture.py docs/architecture/pipelines.yaml
git commit -m "feat(sante): domain obligatoire sur les contrats health, garde validate-arch"
```

---

### Task 3: `pipeline_health.py` — filtre de fraîcheur, routines distantes, colonnes déclaratives

**Files:**
- Modify: `pipelines/pipeline_health.py` (`load_pipelines` L90-102, `data_freshness` L176-196, `verdict` L218-238, `main` L330-400)
- Create: `tests/test_pipeline_health_contract.py`
- Create: `tests/fixtures/pipelines_health_sample.yaml`

**Interfaces:**
- Consumes: les colonnes `domain`/`remediation`/`impact` créées en Task 1.
- Produces:
  - `_filter_params(filter_expr: str | None) -> dict[str, str]`
  - `load_pipelines() -> list[dict]` — chaque élément porte désormais une clé `remote: bool`
  - `data_freshness(url, service_key, table, date_column, filter_expr=None) -> datetime | None`
  - `verdict(run_info, age_hours, max_age_hours, remote=False, has_probe=False) -> str`
  - Les lignes upsertées portent `domain`, `remediation`, `impact`.

- [ ] **Step 1: Écrire la fixture YAML de test**

Créer `tests/fixtures/pipelines_health_sample.yaml` :

```yaml
# Fixture de test pour pipelines/pipeline_health.py::load_pipelines().
# Volontairement minimale : on teste le chargement du contrat, pas le vrai
# catalogue (qui bouge à chaque PR et rendrait le test fragile).
pipelines:
  - id: actif_avec_health
    name: "Pipeline actif surveillé"
    workflow_file: ".github/workflows/tests.yml"
    status: active
    health:
      domain: veille_ia
      panels: [brief]
      table: articles
      date_column: fetch_date
      max_age_hours: 30

  - id: actif_sans_health
    name: "Pipeline actif non surveillé"
    status: active

  - id: archive_avec_health
    name: "Pipeline archivé"
    status: archived
    health:
      domain: perso
      panels: [perf]

external_routines:
  - id: routine_distante
    name: "Routine distante surveillée"
    status: active
    health:
      domain: business
      panels: [jobs]
      table: job_scans
      date_column: scan_date
      max_age_hours: 96
```

- [ ] **Step 2: Écrire le test qui échoue**

Créer `tests/test_pipeline_health_contract.py` :

```python
"""Le contrat de surveillance : filtre de fraîcheur, routines distantes, colonnes.

Trois extensions, trois façons de mal tourner :

1. Une sonde de fraîcheur sur une table à plusieurs écrivains est satisfaite
   par n'importe lequel d'entre eux. `anime_tracker_sync` mesurait
   `media_entries`, que `tmdb_tracker_sync` écrit aussi : AniList pouvait
   mourir sans que la ligne bouge. D'où `filter`.
2. Une routine distante (claude.ai) n'a pas de run GitHub. Le verdict par
   défaut la condamnerait à `unknown` à perpétuité — soit très exactement
   l'angle mort d'ADR-31, trois semaines de quota JSearch saturé non vues.
3. Les colonnes déclaratives doivent arriver en base, sinon la page reste
   muette sur ce qu'une panne coûte.

Run: python tests/test_pipeline_health_contract.py
"""
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "pipelines"))

import pipeline_health as ph  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        print(f"  FAIL {name}\n       attendu: {expected!r}\n       obtenu : {got!r}")
        failures += 1
    else:
        print(f"  ok   {name}")


print("-- _filter_params : fragment PostgREST vers params requests")

check("filtre simple", ph._filter_params("source=eq.anilist"), {"source": "eq.anilist"})
check("filtre in.() avec virgules",
      ph._filter_params("source=in.(tmdb_tv,tmdb_movie)"),
      {"source": "in.(tmdb_tv,tmdb_movie)"})
check("deux filtres", ph._filter_params("a=eq.1&b=gt.2"), {"a": "eq.1", "b": "gt.2"})
check("aucun filtre", ph._filter_params(None), {})
check("chaine vide", ph._filter_params(""), {})
check("fragment sans '=' ignore", ph._filter_params("nimportequoi"), {})


print("-- data_freshness : le filtre atteint la requete")

class FakeResp:
    def __init__(self, rows):
        self._rows = rows
    def raise_for_status(self):
        pass
    def json(self):
        return self._rows


captured = {}

def fake_get(url, headers=None, params=None, timeout=None):
    captured["url"] = url
    captured["params"] = dict(params or {})
    return FakeResp([{"updated_at": "2026-08-19T10:00:00+00:00"}])

real_get = ph.requests.get
ph.requests.get = fake_get
try:
    got = ph.data_freshness("https://sb.test", "key", "media_entries", "updated_at",
                            "source=eq.anilist")
    check("le filtre est passe en params", captured["params"].get("source"), "eq.anilist")
    check("select porte la colonne de date", captured["params"].get("select"), "updated_at")
    check("tri decroissant conserve", captured["params"].get("order"),
          "updated_at.desc.nullslast")
    check("limite a 1 conservee", captured["params"].get("limit"), 1)
    check("la date est parsee", got.isoformat(), "2026-08-19T10:00:00+00:00")

    captured.clear()
    ph.data_freshness("https://sb.test", "key", "articles", "fetch_date")
    check("sans filtre, aucun param parasite",
          sorted(captured["params"].keys()), ["limit", "order", "select"])
finally:
    ph.requests.get = real_get


print("-- verdict : le cas local est inchange")

NO_RUN = {"last_run_conclusion": None, "consecutive_failures": 0}
OK_RUN = {"last_run_conclusion": "success", "consecutive_failures": 0}
KO_RUN = {"last_run_conclusion": "failure", "consecutive_failures": 3}

check("aucun run decisif => unknown", ph.verdict(NO_RUN, None, None), "unknown")
check("run en echec => failing", ph.verdict(KO_RUN, 1.0, 30), "failing")
check("run vert, donnee fraiche => ok", ph.verdict(OK_RUN, 1.0, 30), "ok")
check("run vert, donnee perimee => stale", ph.verdict(OK_RUN, 99.0, 30), "stale")
check("run vert, pas de seuil => ok (jamais sanctionne)",
      ph.verdict(OK_RUN, 900.0, None), "ok")
check("l'echec de run prime sur la peremption", ph.verdict(KO_RUN, 900.0, 30), "failing")


print("-- verdict : routine distante, fraicheur seule")

check("distante, donnee fraiche => ok",
      ph.verdict(NO_RUN, 40.0, 96, remote=True, has_probe=True), "ok")
check("distante, donnee perimee => stale",
      ph.verdict(NO_RUN, 120.0, 96, remote=True, has_probe=True), "stale")
check("distante sans sonde => unknown (on ne sait rien, on ne ment pas)",
      ph.verdict(NO_RUN, None, None, remote=True, has_probe=False), "unknown")
check("distante avec sonde mais table vide => unknown",
      ph.verdict(NO_RUN, None, 96, remote=True, has_probe=True), "unknown")


print("-- load_pipelines : les routines distantes entrent, les archives sortent")

real_yaml = ph.PIPELINES_YAML
ph.PIPELINES_YAML = REPO / "tests" / "fixtures" / "pipelines_health_sample.yaml"
try:
    loaded = ph.load_pipelines()
    ids = sorted(p["id"] for p in loaded)
    check("seuls les actifs porteurs de health", ids,
          ["actif_avec_health", "routine_distante"])
    by_id = {p["id"]: p for p in loaded}
    check("un pipeline GitHub n'est pas distant", by_id["actif_avec_health"]["remote"], False)
    check("une routine externe est distante", by_id["routine_distante"]["remote"], True)
    check("le contrat health est conserve",
          by_id["routine_distante"]["health"]["domain"], "business")
finally:
    ph.PIPELINES_YAML = real_yaml


print("-- build_row : les colonnes declaratives arrivent en base")

pipe = {
    "id": "demo",
    "name": "Démo",
    "remote": False,
    "health": {
        "domain": "socle",
        "panels": [],
        "impact": "Rien ne le montre.",
        "remediation": "Ouvrir le dernier run.",
    },
}
row = ph.build_row(pipe, OK_RUN, last_seen=None, age_hours=None, status="ok", now="NOW")
check("domain recopie", row["domain"], "socle")
check("remediation recopiee", row["remediation"], "Ouvrir le dernier run.")
check("impact recopie", row["impact"], "Rien ne le montre.")
check("label = name", row["label"], "Démo")
check("panels vide reste une liste", row["panels"], [])
check("checked_at pose", row["checked_at"], "NOW")

row2 = ph.build_row(
    {"id": "x", "name": "X", "remote": True, "health": {"domain": "business", "panels": ["jobs"], "table": "job_scans"}},
    NO_RUN, last_seen=None, age_hours=200.0, status="stale", now="NOW",
)
check("remediation absente => None", row2["remediation"], None)
check("cause d'une routine distante figee",
      row2["last_error"], "Aucune écriture dans job_scans depuis 200.0 h")


print()
if failures:
    print(f"{failures} echec(s)")
    sys.exit(1)
print("Tous les checks passent.")
```

- [ ] **Step 3: Lancer le test pour vérifier qu'il échoue**

Run: `python tests/test_pipeline_health_contract.py`
Expected: FAIL avec `AttributeError: module 'pipeline_health' has no attribute '_filter_params'`

- [ ] **Step 4: Implémenter `_filter_params` et le filtre dans `data_freshness`**

Dans `pipelines/pipeline_health.py`, juste avant `def data_freshness(...)` (ligne 176) :

```python
def _filter_params(filter_expr):
    """Convertit un fragment de requête PostgREST en params `requests`.

    'source=eq.anilist'              -> {'source': 'eq.anilist'}
    'source=in.(tmdb_tv,tmdb_movie)' -> {'source': 'in.(tmdb_tv,tmdb_movie)'}

    Découpage sur le PREMIER '=' seulement : la valeur d'un filtre PostgREST
    peut en contenir. Un fragment sans '=' est ignoré plutôt que de produire
    une requête bancale — la sonde vaut mieux large que fausse.
    """
    out = {}
    for part in str(filter_expr or "").split("&"):
        part = part.strip()
        if not part or "=" not in part:
            continue
        key, value = part.split("=", 1)
        key = key.strip()
        if key:
            out[key] = value.strip()
    return out
```

Puis remplacer la signature et le corps de `data_freshness` :

```python
def data_freshness(url, service_key, table, date_column, filter_expr=None):
    """Return the most recent value of date_column, or None.

    `filter_expr` restreint la sonde aux lignes qu'écrit CE pipeline. Sans lui,
    une table à plusieurs écrivains rend la panne de l'un invisible : le
    2026-08-20, `anime_tracker_sync` mesurait `media_entries`, que
    `tmdb_tracker_sync` alimente aussi.
    """
    params = {
        "select": date_column,
        "order": f"{date_column}.desc.nullslast",
        "limit": 1,
    }
    params.update(_filter_params(filter_expr))
    try:
        resp = requests.get(
            f"{url}/rest/v1/{table}",
            headers=supabase_headers(service_key),
            params=params,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"   ! Fraîcheur illisible sur {table}.{date_column}: {exc}")
        return None
    rows = resp.json()
    return parse_ts(rows[0].get(date_column)) if rows else None
```

- [ ] **Step 5: Implémenter `verdict` distant et `load_pipelines`**

Remplacer `verdict()` (ligne 218) :

```python
def verdict(run_info, age_hours, max_age_hours, remote=False, has_probe=False):
    """Consolidate both signals into one status.

    L'échec de run prime sur la péremption : si le pipeline plante, dire
    « données périmées » masquerait la cause réelle.

    `max_age_hours` absent = fraîcheur mesurée mais jamais sanctionnée. C'est
    ce qui permet de dater la panne d'un pipeline piloté par l'activité
    (Strava, TFT…) sans le déclarer en panne quand l'utilisateur n'a
    simplement rien fait cette semaine.

    `remote` = routine hors GitHub Actions (claude.ai) : il n'existe aucun run
    à interroger, donc la fraîcheur est le SEUL signal. Sans elle on ne sait
    rien, et `unknown` est la réponse honnête — c'est le seul cas où l'absence
    de run ne doit pas condamner la brique au silence perpétuel.
    """
    if remote:
        if not has_probe or age_hours is None:
            return "unknown"
        if max_age_hours is not None and age_hours > max_age_hours:
            return "stale"
        return "ok"

    conclusion = run_info["last_run_conclusion"]
    if conclusion is None:
        return "unknown"
    if conclusion in FAILING_CONCLUSIONS:
        return "failing"
    if max_age_hours is not None and age_hours is not None and age_hours > max_age_hours:
        return "stale"
    return "ok"
```

Remplacer `load_pipelines()` (ligne 90) :

```python
def load_pipelines():
    """Return the active pipelines and remote routines declaring a `health` contract.

    Les routines distantes vivent sous `external_routines:` — elles n'ont pas
    de `workflow_file` et sont marquées `remote: True` pour que le contrôle
    saute l'appel GitHub et juge sur la seule fraîcheur.
    """
    with open(PIPELINES_YAML, "r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    out = []
    for key, remote in (("pipelines", False), ("external_routines", True)):
        for p in data.get(key) or []:
            if not isinstance(p, dict) or not p.get("health"):
                continue
            if p.get("status") != "active":
                continue
            out.append({**p, "remote": remote})
    return out
```

- [ ] **Step 6: Extraire `build_row` et brancher la boucle principale**

Dans `pipelines/pipeline_health.py`, ajouter juste après `verdict()` :

```python
def build_row(pipe, run_info, last_seen, age_hours, status, now):
    """Compose la ligne upsertée. Extrait de main() pour être testable seul."""
    health = pipe.get("health") or {}
    table = health.get("table")

    # `last_error` reste court et lisible : le détail vit dans le run GitHub.
    last_error = None
    if status == "failing":
        n = run_info["consecutive_failures"]
        # On n'inspecte que RUNS_TO_INSPECT runs : au plafond, on ne sait pas
        # combien il y en a eu avant. Dire « 15 » serait un chiffre faux.
        count = f"au moins {n}" if n >= RUNS_TO_INSPECT else str(n)
        last_error = f"Dernier run : {run_info['last_run_conclusion']} ({count} échec{'s' if n > 1 else ''} d'affilée)"
    elif status == "stale":
        if pipe.get("remote"):
            # Pas de run à incriminer : la seule chose qu'on sache est le silence.
            last_error = f"Aucune écriture dans {table} depuis {age_hours} h"
        else:
            last_error = f"Runs au vert mais {table} n'a rien reçu depuis {age_hours} h"

    return {
        "pipeline_id": pipe["id"],
        "label": pipe.get("name") or pipe["id"],
        "domain": health.get("domain"),
        "panels": health.get("panels") or [],
        "remediation": health.get("remediation"),
        "impact": health.get("impact"),
        "last_run_at": run_info["last_run_at"],
        "last_run_conclusion": run_info["last_run_conclusion"],
        "last_run_url": run_info["last_run_url"],
        "last_success_at": run_info["last_success_at"],
        "consecutive_failures": run_info["consecutive_failures"],
        "last_error": last_error,
        "data_last_seen": last_seen,
        "data_age_hours": age_hours,
        "max_age_hours": health.get("max_age_hours"),
        "status": status,
        "checked_at": now,
    }
```

Puis, dans `main()`, remplacer le corps de la boucle `for pipe in pipelines:` (depuis `pid = pipe["id"]` jusqu'au `rows.append({...})` inclus) par :

```python
    for pipe in pipelines:
        pid = pipe["id"]
        health = pipe["health"]
        remote = pipe.get("remote", False)

        # Une routine distante n'a pas de run GitHub : l'interroger renverrait
        # systématiquement une liste vide et coûterait un appel API pour rien.
        run_info = (summarize_runs([]) if remote
                    else summarize_runs(github_runs(repo, gh_token, pipe.get("workflow_file", ""))))

        # Fraîcheur — uniquement si le pipeline est censé écrire à chaque run.
        table = health.get("table")
        date_column = health.get("date_column")
        has_probe = bool(table and date_column)
        last_seen = age_hours = None
        if has_probe:
            last_seen = data_freshness(supabase_url, service_key, table, date_column,
                                       health.get("filter"))
            if last_seen:
                age_hours = round((now - last_seen).total_seconds() / 3600, 1)

        status = verdict(run_info, age_hours, health.get("max_age_hours"),
                         remote=remote, has_probe=has_probe)

        row = build_row(pipe, run_info, last_seen, age_hours, status, now)
        rows.append(row)
        last_error = row["last_error"]
```

(La suite de la boucle — `icon = {...}`, le `print`, l'ajout à `degraded` — reste inchangée.)

- [ ] **Step 7: Lancer le test pour vérifier qu'il passe**

Run: `python tests/test_pipeline_health_contract.py`
Expected: PASS — `Tous les checks passent.`

- [ ] **Step 8: Vérifier la non-régression de l'alerte GitHub**

Run: `python tests/test_pipeline_health_alert.py`
Expected: PASS — `Tous les checks passent.`

- [ ] **Step 9: Commit**

```bash
git add pipelines/pipeline_health.py tests/test_pipeline_health_contract.py tests/fixtures/pipelines_health_sample.yaml
git commit -m "feat(sante): filtre de fraicheur, routines distantes, colonnes declaratives"
```

---

### Task 4: Les déclarations — 3 briques ajoutées, 4 sondes corrigées, 19 gestes écrits

**Files:**
- Modify: `docs/architecture/pipelines.yaml` (blocs `health` de 19 briques)
- Create: `tests/test_pipeline_health_catalogue.py`

**Interfaces:**
- Consumes: `HEALTH_DOMAINS` (Task 2), `load_pipelines()` avec `remote` (Task 3)
- Produces: 19 briques surveillées, chacune avec `domain` et `remediation`. C'est le jeu de données que la Task 5 groupe et que la Task 6 rend.

- [ ] **Step 1: Écrire le test de catalogue (il doit échouer à 16)**

Créer `tests/test_pipeline_health_catalogue.py` :

```python
"""Le catalogue surveillé : 19 briques, toutes classées, toutes réparables.

Ce test garde l'invariant que l'onglet Santé suppose : chaque brique du
catalogue sait dire à quelle section elle appartient et quel geste la répare.
Sans lui, une brique ajoutée sans `domain` finirait en « Non classé » et une
brique sans `remediation` afficherait une panne sans issue.

Run: python tests/test_pipeline_health_catalogue.py
"""
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

REPO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "pipelines"))
sys.path.insert(0, str(REPO / "scripts"))

import pipeline_health as ph  # noqa: E402
from validate_architecture import HEALTH_DOMAINS  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        print(f"  FAIL {name}\n       attendu: {expected!r}\n       obtenu : {got!r}")
        failures += 1
    else:
        print(f"  ok   {name}")


pipes = ph.load_pipelines()
by_id = {p["id"]: p for p in pipes}

print("-- le catalogue")

check("19 briques surveillees", len(pipes), 19)

EXPECTED = {
    "veille_ia": {"daily_digest", "veille_picks"},
    "apprentissage": {"weekly_analysis"},
    "veille_satellite": {"sport_sync", "gaming_sync", "anime_sync", "news_sync"},
    "mediatheque": {"anime_tracker_sync", "tmdb_tracker_sync", "jp_vocab_sync"},
    "perso": {"strava_sync", "withings_sync", "lastfm_sync", "steam_sync",
              "tft_sync", "igdb_tracker_sync"},
    "business": {"jobs_radar_routine"},
    "socle": {"backup_supabase", "pipeline_health"},
}
actual = {}
for p in pipes:
    actual.setdefault(p["health"]["domain"], set()).add(p["id"])
for domain in sorted(EXPECTED):
    check(f"section {domain}", actual.get(domain), EXPECTED[domain])

print("-- les invariants de l'onglet")

no_domain = sorted(p["id"] for p in pipes if p["health"].get("domain") not in HEALTH_DOMAINS)
check("aucune brique hors vocabulaire", no_domain, [])

no_reme = sorted(p["id"] for p in pipes if not p["health"].get("remediation"))
check("chaque brique porte un geste", no_reme, [])

no_effect = sorted(p["id"] for p in pipes
                   if not (p["health"].get("panels") or p["health"].get("impact")))
check("chaque brique sait dire ce qu'elle coute", no_effect, [])

print("-- les trois angles morts sont couverts")

check("la routine Jobs Radar est distante", by_id["jobs_radar_routine"]["remote"], True)
check("elle est jugee sur job_scans", by_id["jobs_radar_routine"]["health"]["table"], "job_scans")
check("la sauvegarde est surveillee sur son run seul",
      by_id["backup_supabase"]["health"].get("table"), None)
check("le surveillant s'inscrit lui-meme",
      by_id["pipeline_health"]["health"]["domain"], "socle")

print("-- les quatre sondes corrigees")

check("anilist filtre sa sonde",
      by_id["anime_tracker_sync"]["health"]["filter"], "source=eq.anilist")
check("tmdb filtre sa sonde",
      by_id["tmdb_tracker_sync"]["health"]["filter"], "source=in.(tmdb_tv,tmdb_movie)")
check("le vocabulaire japonais est mesure sans etre sanctionne",
      (by_id["jp_vocab_sync"]["health"]["table"],
       by_id["jp_vocab_sync"]["health"].get("max_age_hours")),
      ("jp_words", None))
check("igdb reste sans sonde, assume",
      by_id["igdb_tracker_sync"]["health"].get("table"), None)
check("igdb alerte aussi l'onglet Gaming",
      sorted(by_id["igdb_tracker_sync"]["health"]["panels"]), ["brief", "gaming"])

print()
if failures:
    print(f"{failures} echec(s)")
    sys.exit(1)
print("Tous les checks passent.")
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `python tests/test_pipeline_health_catalogue.py`
Expected: FAIL — `19 briques surveillees` obtient `16`, plus les checks de sections `business` et `socle` à `None`.

- [ ] **Step 3: Déclarer les trois briques ajoutées**

Dans `docs/architecture/pipelines.yaml` :

Pour `pipeline_health` (ligne ~439), ajouter après `workflow_file:` :

```yaml
    health:
      domain: socle
      panels: []
      impact: >-
        Les états affichés partout ailleurs gèlent sur leur dernier verdict connu :
        un « tout va bien » périmé est pire que pas de verdict du tout.
      remediation: >-
        Ouvrir le dernier run : le plus souvent, un GITHUB_TOKEN expiré ou un
        SUPABASE_SERVICE_KEY tourné.
```

Pour `backup_supabase` (ligne ~478), **remplacer** le commentaire `# Pas de bloc health : …` (3 lignes) par :

```yaml
    # Bloc `health` sans sonde de fraîcheur : ce pipeline n'écrit aucune table,
    # sa sortie est un artefact de run (ADR-37). C'est le troisième cas du
    # contrat déclaré en tête de fichier — seul le verdict du run compte. Il
    # reste surveillé : une sauvegarde qu'aucune surface ne regarde est une
    # sauvegarde qu'on découvre absente le jour où on en a besoin.
    health:
      domain: socle
      panels: []
      impact: >-
        Aucune surface ne le montre. Les saisies que rien ne sait refabriquer
        (offres, profil, idées, engagements, notes, progression média) ne sont
        plus copiées.
      remediation: >-
        Ouvrir le dernier run et lire quelle table a échoué : le script sort en
        code 1 dès qu'une seule table manque ou que le total est vide.
```

Pour `jobs_radar_routine` (sous `external_routines:`, ligne ~575), ajouter après `status: active` :

```yaml
    health:
      domain: business
      panels: [jobs]
      table: job_scans
      date_column: scan_date
      # Cron lun/mer/ven : le plus grand trou nominal est vendredi→lundi, soit
      # ~72 h. 96 h laisse une marge d'un run raté sans crier au loup.
      max_age_hours: 96
      remediation: >-
        Lire job_scans.tendances->'fetch' (codes HTTP, quota restant) : le quota
        JSearch est de 200 req/mois et se réinitialise le 27. Puis vérifier la
        routine trig_01JtTsMm27eTAGxR5po5KmMQ sur claude.ai.
```

- [ ] **Step 4: Corriger les quatre sondes**

Toujours dans `docs/architecture/pipelines.yaml` :

`anime_tracker_sync` — ajouter `filter:` après `date_column:` :

```yaml
    health:
      domain: mediatheque
      panels: [mediatheque]
      table: media_entries
      date_column: updated_at
      # `media_entries` a DEUX écrivains : ce pipeline et tmdb_tracker_sync.
      # Sans filtre, une panne AniList est masquée par les écritures TMDB.
      filter: "source=eq.anilist"
      max_age_hours: 30
```

`tmdb_tracker_sync` — remplacer son bloc `health` par :

```yaml
    health:
      domain: mediatheque
      panels: [mediatheque]
      table: media_entries
      date_column: updated_at
      filter: "source=in.(tmdb_tv,tmdb_movie)"
      max_age_hours: 30
```

`jp_vocab_sync` — remplacer son bloc `health` par :

```yaml
    health:
      domain: mediatheque
      panels: [mediatheque]
      table: jp_words
      date_column: created_at
      # Pas de max_age_hours : le vocabulaire n'est alimenté qu'à l'ajout d'une
      # franchise. Ne rien écrire pendant des semaines est nominal. On mesure
      # pour pouvoir dire « rien depuis N jours », jamais pour sanctionner.
```

`igdb_tracker_sync` — remplacer son bloc `health` par :

```yaml
    health:
      domain: perso
      # Gaming consomme game_releases depuis ADR-35/36 (rail « À venir »,
      # acquittement), au même titre que l'encart Jeux du Brief.
      panels: [brief, gaming]
      # Volontairement sans sonde de fraîcheur : depuis le 2026-08-14, le front
      # écrit lui aussi game_titles / game_releases / game_franchises (ADR-36)
      # et aucune colonne ne distingue le pipeline de l'utilisateur. Une sonde
      # serait verte grâce aux écritures du front. L'onglet Santé affiche donc
      # « fraîcheur inconnue » plutôt qu'un vert qui mentirait.
```

- [ ] **Step 5: Écrire les 16 `remediation` restantes**

Ajouter une clé `remediation:` à la fin de chaque bloc `health` qui n'en a pas encore :

```yaml
# daily_digest
      remediation: >-
        Vérifier le quota Gemini (1000 req/jour, tier gratuit) sur
        aistudio.google.com, puis relancer le workflow daily_digest.

# veille_picks
      remediation: >-
        Dépend des articles du jour : vérifier d'abord daily_digest. Si la veille
        tourne, relancer veille-picks.yml.

# weekly_analysis
      remediation: >-
        Recharger le crédit sur console.anthropic.com — un HTTP 400 « credit
        balance » est la panne historique de ce pipeline — puis relancer
        weekly_analysis.yml.

# sport_sync
      remediation: >-
        Un flux RSS sport est mort ou a changé d'URL : lire le log du run pour
        identifier lequel, puis corriger la liste des flux dans le script.

# gaming_sync
      remediation: >-
        Un flux RSS gaming est mort ou a changé d'URL : lire le log du run pour
        identifier lequel, puis corriger la liste des flux dans le script.

# anime_sync
      remediation: >-
        Un flux RSS anime est mort, ou l'API Jikan est en rate limit : lire le
        log du run pour trancher.

# news_sync
      remediation: >-
        Un flux RSS actualités est mort ou a changé d'URL : lire le log du run
        pour identifier lequel.

# anime_tracker_sync
      remediation: >-
        AniList est en rate limit ou une franchise suivie a été retirée du
        catalogue : lire le log du run.

# tmdb_tracker_sync
      remediation: >-
        Vérifier la clé TMDB_API_KEY dans les secrets GitHub, puis relancer
        tmdb-tracker-sync.yml.

# jp_vocab_sync
      remediation: >-
        Vérifier la clé du modèle utilisé pour l'extraction de vocabulaire dans
        les secrets GitHub, puis relancer jp-vocab-sync.yml.

# strava_sync
      remediation: >-
        Réactiver l'application dans le portail développeur Strava, puis
        régénérer le refresh token avec scripts/strava_oauth_init.py
        (cf. docs/strava-setup.md). Le token seul ne suffit pas si l'app est
        désactivée.

# withings_sync
      remediation: >-
        Régénérer le refresh token avec scripts/withings_oauth_init.py
        (cf. docs/withings-setup.md) et mettre à jour le secret GitHub.

# lastfm_sync
      remediation: >-
        Vérifier la clé LASTFM_API_KEY dans les secrets GitHub
        (cf. docs/lastfm-setup.md).

# steam_sync
      remediation: >-
        Vérifier la clé STEAM_API_KEY et que le profil Steam est resté public
        (cf. docs/steam-setup.md) — un profil repassé en privé casse l'API sans
        message clair.

# tft_sync
      remediation: >-
        La clé Riot développeur expire toutes les 24 h : en régénérer une sur
        developer.riotgames.com et mettre à jour le secret GitHub.

# igdb_tracker_sync
      remediation: >-
        Vérifier les identifiants Twitch/IGDB dans les secrets GitHub — le token
        IGDB se renouvelle via l'API Twitch et échoue silencieusement si le
        client secret a tourné.
```

- [ ] **Step 6: Lancer le test de catalogue**

Run: `python tests/test_pipeline_health_catalogue.py`
Expected: PASS — `Tous les checks passent.`

- [ ] **Step 7: Vérifier que la garde CI reste verte**

Run: `python scripts/validate_architecture.py`
Expected: PASS — aucune violation.

- [ ] **Step 8: Contrôle en conditions réelles (optionnel, nécessite les secrets)**

Si `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GITHUB_TOKEN` et `GITHUB_REPOSITORY` sont disponibles dans l'environnement :

Run: `python pipelines/pipeline_health.py --dry-run`
Expected: 19 lignes de verdict, dont `jobs_radar_routine`, `backup_supabase` et `pipeline_health`, et la mention `[dry-run] aucune écriture en base`.

Sinon, sauter — le test de catalogue couvre le contrat, et le premier run du cron quotidien peuplera la base.

- [ ] **Step 9: Commit**

```bash
git add docs/architecture/pipelines.yaml tests/test_pipeline_health_catalogue.py
git commit -m "feat(sante): 3 angles morts sous surveillance, 4 sondes corrigees, 19 gestes ecrits"
```

---

### Task 5: `cockpit/lib/sante-view.js` — la logique de présentation, testée

**Files:**
- Create: `cockpit/lib/sante-view.js`
- Create: `tests/test_sante_view.mjs`

**Interfaces:**
- Consumes: les lignes de `pipeline_health` telles que produites par `build_row` (Task 3) — champs `pipeline_id`, `label`, `domain`, `panels`, `remediation`, `impact`, `status`, `data_last_seen`, `last_success_at`, `max_age_hours`, `last_run_url`, `checked_at`.
- Produces: `window.santeView` / `module.exports` exposant
  `DOMAINS`, `RENDER_LABELS`, `CHECK_STALE_MS`,
  `renderOf(row) -> string`, `ageDays(row, now) -> number|null`, `fmtAge(row, now) -> string|null`,
  `panelLabelMap(nav) -> Map`, `panelLabels(panelIds, nav) -> string[]`, `joinFr(items) -> string`,
  `isDegraded(row) -> bool`, `sectionSummary(rows, nav) -> string|null`,
  `groupByDomain(rows) -> [{key, label, rows, degraded}]`, `globalVerdict(rows, now) -> object`.
  Consommés tels quels par `cockpit/panel-sante.jsx` (Task 6).

- [ ] **Step 1: Écrire le test qui échoue**

Créer `tests/test_sante_view.mjs` :

```js
// Tests du module de présentation Santé (JS pur, sans DOM).
// Run: node tests/test_sante_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "sante-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

const NOW = Date.parse("2026-08-20T09:00:00Z");
const iso = (daysAgo) => new Date(NOW - daysAgo * 86400000).toISOString();

// ── renderOf : les six rendus ────────────────────────────────
// `ok` en base recouvre trois réalités très différentes. Les confondre à
// l'écran, c'est afficher un vert qui ment.
check("mesure fraiche => ok",
  V.renderOf({ status: "ok", data_last_seen: iso(0.1), max_age_hours: 30 }), "ok");
check("mesuree mais jamais sanctionnee => au repos",
  V.renderOf({ status: "ok", data_last_seen: iso(37), max_age_hours: null }), "resting");
check("aucune donnee vue => fraicheur inconnue",
  V.renderOf({ status: "ok", data_last_seen: null, max_age_hours: null }), "unknown_freshness");
check("sonde declaree mais table vide => fraicheur inconnue aussi",
  V.renderOf({ status: "ok", data_last_seen: null, max_age_hours: 30 }), "unknown_freshness");
check("run en echec => failing",
  V.renderOf({ status: "failing", data_last_seen: iso(118) }), "failing");
check("run vert, donnee figee => stale",
  V.renderOf({ status: "stale", data_last_seen: iso(37), max_age_hours: 30 }), "stale");
check("statut inconnu => unknown",
  V.renderOf({ status: "unknown" }), "unknown");
check("ligne vide ne casse pas", V.renderOf(null), "unknown");

check("libelle au repos", V.RENDER_LABELS.resting, "au repos");
check("libelle fraicheur inconnue", V.RENDER_LABELS.unknown_freshness, "fraîcheur inconnue");

// ── fmtAge : jours au-dela de 48 h, heures en deca ───────────
check("age en jours", V.fmtAge({ data_last_seen: iso(37) }, NOW), "37 j");
check("age en heures sous 2 jours", V.fmtAge({ data_last_seen: iso(0.25) }, NOW), "6 h");
check("jamais zero heure", V.fmtAge({ data_last_seen: iso(0.001) }, NOW), "1 h");
check("repli sur le dernier run reussi",
  V.fmtAge({ data_last_seen: null, last_success_at: iso(3) }, NOW), "3 j");
check("aucune date => null", V.fmtAge({ data_last_seen: null, last_success_at: null }, NOW), null);

// ── panelLabels : l'homonymie Gaming ─────────────────────────
// `gaming` (Personnel) et `gaming_news` (Veille) s'appellent tous deux
// « Gaming ». Une phrase d'effet qui dit « Gaming » sans préciser désigne
// deux onglets à la fois.
const NAV = [
  { group: "Aujourd'hui", items: [{ id: "brief", label: "Brief du jour" }] },
  { group: "Veille", items: [{ id: "gaming_news", label: "Gaming" }, { id: "sport", label: "Sport" }] },
  { group: "Apprentissage", items: [{ id: "recos", label: "Recommandations" }, { id: "challenges", label: "Challenges" }] },
  { group: "Personnel", items: [{ id: "gaming", label: "Gaming" }, { id: "perf", label: "Forme" }] },
];
check("libelle simple", V.panelLabels(["perf"], NAV), ["Forme"]);
check("homonymes prefixes du groupe",
  V.panelLabels(["gaming", "gaming_news"], NAV), ["Gaming (Personnel)", "Gaming (Veille)"]);
check("id inconnu ignore", V.panelLabels(["nexistepas", "sport"], NAV), ["Sport"]);
check("aucun panel => liste vide", V.panelLabels([], NAV), []);

// ── joinFr ───────────────────────────────────────────────────
check("un seul", V.joinFr(["A"]), "A");
check("deux", V.joinFr(["A", "B"]), "A et B");
check("trois", V.joinFr(["A", "B", "C"]), "A, B et C");
check("vide", V.joinFr([]), "");

// ── sectionSummary : ce que la panne coute, en noms d'onglets ─
const APPR = [
  { pipeline_id: "weekly_analysis", domain: "apprentissage", status: "failing",
    panels: ["recos", "challenges"], data_last_seen: iso(118) },
];
check("phrase d'effet derivee des panels",
  V.sectionSummary(APPR, NAV),
  "Recommandations et Challenges affichent encore des données figées.");
check("un seul onglet => verbe au singulier",
  V.sectionSummary([{ status: "stale", panels: ["perf"] }], NAV),
  "Forme affiche encore des données figées.");
check("section saine => aucune phrase",
  V.sectionSummary([{ status: "ok", data_last_seen: iso(0.1), max_age_hours: 30, panels: ["brief"] }], NAV),
  null);
check("sans panels, l'impact declare prend le relais",
  V.sectionSummary([{ status: "failing", panels: [], impact: "Les sauvegardes sont arrêtées." }], NAV),
  "Les sauvegardes sont arrêtées.");
check("les onglets ne sont jamais cites deux fois",
  V.sectionSummary([{ status: "failing", panels: ["perf"] }, { status: "stale", panels: ["perf"] }], NAV),
  "Forme affiche encore des données figées.");

// ── groupByDomain : ordre fixe, orphelins visibles ───────────
const ROWS = [
  { pipeline_id: "backup_supabase", domain: "socle", status: "ok", data_last_seen: null, panels: [] },
  { pipeline_id: "weekly_analysis", domain: "apprentissage", status: "failing", panels: ["recos"], data_last_seen: iso(118) },
  { pipeline_id: "daily_digest", domain: "veille_ia", status: "ok", data_last_seen: iso(0.1), max_age_hours: 30, panels: ["brief"] },
  { pipeline_id: "orphelin", domain: "nimporte_quoi", status: "ok", data_last_seen: iso(1), max_age_hours: 30, panels: [] },
];
const sections = V.groupByDomain(ROWS);
check("ordre fixe du vocabulaire, orphelins en fin",
  sections.map(s => s.key), ["veille_ia", "apprentissage", "socle", "__unclassified"]);
check("une section vide n'apparait pas",
  sections.some(s => s.key === "perso"), false);
check("libelle de section", sections[1].label, "Apprentissage");
check("compteur de degrades", sections[1].degraded, 1);
check("une brique orpheline reste visible",
  sections[3].rows.map(r => r.pipeline_id), ["orphelin"]);
check("les 7 domaines sont declares", V.DOMAINS.map(d => d.key),
  ["veille_ia", "apprentissage", "veille_satellite", "mediatheque", "perso", "business", "socle"]);

// ── globalVerdict : et la surveillance du surveillant ────────
const FRESH_CHECK = ROWS.map(r => ({ ...r, checked_at: new Date(NOW - 3600000).toISOString() }));
const v = V.globalVerdict(FRESH_CHECK, NOW);
check("total", v.total, 4);
check("pannes", v.failing, 1);
check("figes", v.stale, 0);
check("degrades", v.degraded, 1);
check("le controle est recent", v.checkStale, false);
check("pas vide", v.empty, false);

const OLD_CHECK = ROWS.map(r => ({ ...r, checked_at: new Date(NOW - 72 * 3600000).toISOString() }));
check("controle vieux de 72 h => alerte", V.globalVerdict(OLD_CHECK, NOW).checkStale, true);
check("seuil de garde a 48 h", V.CHECK_STALE_MS, 48 * 3600 * 1000);

const EMPTY = V.globalVerdict([], NOW);
check("table vide => empty, jamais 'tout va bien'", EMPTY.empty, true);
check("table vide => aucune fausse alerte de garde", EMPTY.checkStale, false);

console.log();
if (failures) { console.log(`${failures} echec(s)`); process.exit(1); }
console.log("Tous les checks passent.");
```

- [ ] **Step 2: Lancer le test pour vérifier qu'il échoue**

Run: `node tests/test_sante_view.mjs`
Expected: FAIL — `Cannot find module '.../cockpit/lib/sante-view.js'`

- [ ] **Step 3: Écrire le module**

Créer `cockpit/lib/sante-view.js` :

```js
// cockpit/lib/sante-view.js
// Logique de présentation pure de l'onglet Santé : rendu d'un statut, âge
// lisible, libellés d'onglets, phrase d'effet, groupement par section,
// verdict global.
// Script classique compatible Babel standalone : expose window.santeView.
// Guard module.exports => testable sous node (tests/test_sante_view.mjs).
//
// CONTRAINTE : aucune dépendance au DOM, à React ou à window.COCKPIT_DATA.
(function () {
  // Ordre FIXE des sections. Il ne dépend pas de l'état : une page dont la
  // structure change avec la gravité ne se mémorise pas. L'urgence est portée
  // par le bandeau de tête et les pastilles.
  const DOMAINS = [
    { key: "veille_ia",        label: "Veille IA" },
    { key: "apprentissage",    label: "Apprentissage" },
    { key: "veille_satellite", label: "Veille satellite" },
    { key: "mediatheque",      label: "Médiathèque" },
    { key: "perso",            label: "Vie perso" },
    { key: "business",         label: "Business" },
    { key: "socle",            label: "Socle" },
  ];
  const UNCLASSIFIED_KEY = "__unclassified";

  const RENDER_LABELS = {
    ok: "ok",
    resting: "au repos",
    unknown_freshness: "fraîcheur inconnue",
    failing: "en panne",
    stale: "figé",
    unknown: "inconnu",
  };

  const CHECK_STALE_MS = 48 * 3600 * 1000;

  // `ok` en base recouvre trois réalités. Les confondre à l'écran afficherait
  // un vert qui ment : « rien depuis 37 jours » et « à jour ce matin » ne
  // peuvent pas porter le même mot.
  //
  // `unknown_freshness` est choisi plutôt que « non mesurée » parce qu'il est
  // vrai dans les DEUX cas où data_last_seen est nul : aucune sonde déclarée
  // (igdb, backup, le surveillant), ou sonde déclarée sur une table encore
  // vide. Le front ne peut pas les distinguer, et n'a pas à trancher.
  function renderOf(row) {
    const status = (row && row.status) || "unknown";
    if (status === "failing" || status === "stale") return status;
    if (status !== "ok") return "unknown";
    if (!row.data_last_seen) return "unknown_freshness";
    if (row.max_age_hours === null || row.max_age_hours === undefined) return "resting";
    return "ok";
  }

  const DEGRADED = { failing: true, stale: true };
  function isDegraded(row) { return DEGRADED[renderOf(row)] === true; }

  // Âge de la dernière donnée valide. Repli sur le dernier run réussi quand
  // aucune sonde de fraîcheur n'existe.
  function ageDays(row, now) {
    const ref = (row && (row.data_last_seen || row.last_success_at)) || null;
    if (!ref) return null;
    return (now - new Date(ref).getTime()) / 86400000;
  }

  // Même convention que le bandeau du Brief : jours au-delà de 48 h, heures en
  // deçà. Jamais « 0 h » — une donnée existe depuis au moins une heure.
  function fmtAge(row, now) {
    const d = ageDays(row, now);
    if (d === null) return null;
    if (d >= 2) return Math.floor(d) + " j";
    return Math.max(1, Math.floor(d * 24)) + " h";
  }

  // Deux onglets s'appellent « Gaming » (Veille et Personnel). Une phrase
  // d'effet qui dit « Gaming » sans préciser désigne les deux à la fois.
  function panelLabelMap(nav) {
    const counts = new Map();
    for (const g of nav || []) {
      for (const it of g.items || []) counts.set(it.label, (counts.get(it.label) || 0) + 1);
    }
    const map = new Map();
    for (const g of nav || []) {
      for (const it of g.items || []) {
        map.set(it.id, counts.get(it.label) > 1 ? it.label + " (" + g.group + ")" : it.label);
      }
    }
    return map;
  }

  function panelLabels(panelIds, nav) {
    const map = panelLabelMap(nav);
    const out = [];
    for (const id of panelIds || []) {
      const label = map.get(id);
      if (label && out.indexOf(label) === -1) out.push(label);
    }
    return out;
  }

  function joinFr(items) {
    const a = (items || []).filter(Boolean);
    if (!a.length) return "";
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(", ") + " et " + a[a.length - 1];
  }

  // Ce que les pannes d'une section coûtent, en noms d'onglets. Jamais écrite
  // à la main : elle suit les `panels` du contrat, donc elle reste vraie quand
  // le contrat change.
  function sectionSummary(rows, nav) {
    const bad = (rows || []).filter(isDegraded);
    if (!bad.length) return null;
    const labels = [];
    for (const r of bad) {
      for (const l of panelLabels(r.panels, nav)) {
        if (labels.indexOf(l) === -1) labels.push(l);
      }
    }
    if (labels.length) {
      return joinFr(labels) + (labels.length > 1 ? " affichent" : " affiche") +
             " encore des données figées.";
    }
    // Briques du Socle : aucun onglet à citer, l'effet est déclaré.
    const impacts = bad.map(function (r) { return r.impact; }).filter(Boolean);
    return impacts.length ? impacts.join(" ") : null;
  }

  function groupByDomain(rows) {
    const buckets = new Map(DOMAINS.map(function (d) { return [d.key, []]; }));
    const orphans = [];
    for (const r of rows || []) {
      const bucket = buckets.get(r && r.domain);
      (bucket || orphans).push(r);
    }
    const out = [];
    for (const d of DOMAINS) {
      const bucket = buckets.get(d.key);
      if (bucket.length) out.push({ key: d.key, label: d.label, rows: bucket });
    }
    // Une brique dont le domaine est inconnu doit se voir, pas disparaître.
    if (orphans.length) out.push({ key: UNCLASSIFIED_KEY, label: "Non classé", rows: orphans });
    for (const s of out) s.degraded = s.rows.filter(isDegraded).length;
    return out;
  }

  // Surveiller le surveillant : si le contrôle n'a pas tourné, la table gèle
  // sur son dernier verdict et un « tout va bien » périmé serait pire que rien.
  function globalVerdict(rows, now) {
    const all = rows || [];
    let failing = 0, stale = 0, lastCheck = 0;
    for (const r of all) {
      const render = renderOf(r);
      if (render === "failing") failing++;
      else if (render === "stale") stale++;
      const t = r && r.checked_at ? new Date(r.checked_at).getTime() : 0;
      if (t > lastCheck) lastCheck = t;
    }
    return {
      total: all.length,
      failing: failing,
      stale: stale,
      degraded: failing + stale,
      lastCheck: lastCheck || null,
      checkStale: lastCheck > 0 && (now - lastCheck) > CHECK_STALE_MS,
      empty: all.length === 0,
    };
  }

  const api = {
    DOMAINS, RENDER_LABELS, CHECK_STALE_MS, UNCLASSIFIED_KEY,
    renderOf, isDegraded, ageDays, fmtAge,
    panelLabelMap, panelLabels, joinFr,
    sectionSummary, groupByDomain, globalVerdict,
  };
  if (typeof window !== "undefined") window.santeView = Object.assign(window.santeView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
```

- [ ] **Step 4: Lancer le test pour vérifier qu'il passe**

Run: `node tests/test_sante_view.mjs`
Expected: PASS — `Tous les checks passent.`

- [ ] **Step 5: Commit**

```bash
git add cockpit/lib/sante-view.js tests/test_sante_view.mjs
git commit -m "feat(sante): module de presentation pur, six rendus et phrase d'effet derivee"
```

---

### Task 6: L'onglet — `panel-sante.jsx`, styles, branchements, spec produit

**Files:**
- Create: `cockpit/panel-sante.jsx`
- Create: `cockpit/styles-sante.css`
- Create: `docs/specs/tab-sante.md`
- Modify: `index.html` (balises `<link>` et `<script>`)
- Modify: `cockpit/app.jsx:650` (routing)
- Modify: `cockpit/nav.js` (entrée `sante` dans le groupe Système actuel)
- Modify: `jarvis/scripts/extract_signals.py:33` (`KNOWN_SECTIONS`)
- Modify: `docs/specs/index.json` (entrée `sante`)
- Modify: `docs/architecture/dependencies.yaml` (`panels[]`)

> **Le lint `lint-known-sections` est bloquant et lit `cockpit/app.jsx`**, pas
> `nav.js` : il casse dès que la ligne de routing est ajoutée. La resync de
> `KNOWN_SECTIONS` appartient donc à cette tâche, pas à la suivante.

**Interfaces:**
- Consumes: tout `window.santeView` (Task 5), `window.COCKPIT_DATA.pipeline_health` (déjà chargé en Tier 1), `window.COCKPIT_NAV`, le composant global `Icon` (`cockpit/icons.jsx`).
- Produces: `window.PanelSante` — composant React de signature `({ data, onNavigate }) => JSX`, monté par `cockpit/app.jsx`.

- [ ] **Step 1: Écrire le panel**

Créer `cockpit/panel-sante.jsx` :

```jsx
// ═══════════════════════════════════════════════════════════════
// PANEL SANTÉ — l'état de la machinerie du cockpit, par domaine.
//
// Aucun fetch : pipeline_health est chargée en entier et sans filtre par
// bootTier1 (cf. cockpit/lib/data-loader.js). Ce panel est un rendu pur.
//
// Toute la logique (rendus, âges, phrases d'effet, groupement) vit dans
// cockpit/lib/sante-view.js, testée sous node. Ici, uniquement du JSX.
// ═══════════════════════════════════════════════════════════════

const { useState: useSaState } = React;

// Une section au vert se replie sur son titre : un jour normal, la page tient
// en sept lignes. Mais une section qui DEVIENT dégradée s'ouvre, quel que soit
// ce que l'utilisateur avait replié — sinon on peut fermer une panne et ne
// plus jamais la revoir.
const SA_OPEN_KEY = "cockpit-sante-open";

function saReadOpen() {
  try { return JSON.parse(localStorage.getItem(SA_OPEN_KEY) || "{}"); }
  catch (e) { return {}; }
}
function saWriteOpen(state) {
  try { localStorage.setItem(SA_OPEN_KEY, JSON.stringify(state)); } catch (e) {}
}

function SaVerdict({ verdict }) {
  const fmtDate = (ms) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

  if (verdict.empty) {
    return (
      <aside className="sa-verdict is-empty" role="status">
        <div className="sa-verdict-head">
          <Icon name="plug" size={15} stroke={1.75} />
          <span className="sa-verdict-kicker">Aucun relevé</span>
        </div>
        <p className="sa-verdict-lede">
          Le contrôle de santé n'a jamais écrit dans la base. Rien ne permet de dire
          que tout va bien — ni le contraire.
        </p>
      </aside>
    );
  }

  const tone = verdict.checkStale ? "warn" : (verdict.degraded ? "alert" : "ok");
  return (
    <aside className={`sa-verdict is-${tone}`} role="status" aria-label="Santé du cockpit">
      <div className="sa-verdict-head">
        <Icon name="plug" size={15} stroke={1.75} />
        <span className="sa-verdict-kicker">
          {verdict.degraded === 0
            ? "Tout tourne"
            : `${verdict.failing ? `${verdict.failing} en panne` : ""}` +
              `${verdict.failing && verdict.stale ? ", " : ""}` +
              `${verdict.stale ? `${verdict.stale} figé${verdict.stale > 1 ? "s" : ""}` : ""}`}
        </span>
        <span className="sa-verdict-count">{verdict.total} briques surveillées</span>
      </div>
      {verdict.checkStale && (
        <p className="sa-verdict-warn">
          Le contrôle de santé n'a pas tourné depuis plus de 48 h — dernier relevé le{" "}
          {fmtDate(verdict.lastCheck)}. Tout ce qui suit peut être faux.
        </p>
      )}
      {!verdict.checkStale && verdict.lastCheck && (
        <p className="sa-verdict-lede">Dernier contrôle le {fmtDate(verdict.lastCheck)}.</p>
      )}
    </aside>
  );
}

function SaRow({ row, nav, now }) {
  const V = window.santeView;
  const render = V.renderOf(row);
  const degraded = V.isDegraded(row);
  const age = V.fmtAge(row, now);
  const effectLabels = V.panelLabels(row.panels, nav);

  return (
    <div className={`sa-row is-${render}`}>
      <div className="sa-row-head">
        <span className="sa-dot" aria-hidden="true" />
        <span className="sa-name">{row.label}</span>
        <span className="sa-state">{V.RENDER_LABELS[render]}</span>
        <span className="sa-age">
          {render === "unknown_freshness" ? "—" : (age || "—")}
        </span>
        {row.last_run_url ? (
          <a className="sa-link" href={row.last_run_url} target="_blank" rel="noopener noreferrer"
             title={`Voir le dernier run — ${row.label}`}
             aria-label={`Voir le dernier run — ${row.label}`}>
            <Icon name="arrow_right" size={13} stroke={2} />
          </a>
        ) : <span className="sa-link is-empty" aria-hidden="true" />}
      </div>

      {degraded && row.last_error && (
        <p className="sa-cause">{row.last_error}</p>
      )}
      {degraded && (effectLabels.length > 0 || row.impact) && (
        <p className="sa-effect">
          {effectLabels.length > 0
            ? `${V.joinFr(effectLabels)} ${effectLabels.length > 1 ? "affichent" : "affiche"} encore des données figées.`
            : row.impact}
        </p>
      )}
      {degraded && row.remediation && (
        <p className="sa-fix"><span className="sa-fix-arrow" aria-hidden="true">→</span> {row.remediation}</p>
      )}
    </div>
  );
}

function SaSection({ section, nav, now, open, onToggle }) {
  const V = window.santeView;
  const summary = V.sectionSummary(section.rows, nav);
  const resting = section.rows.filter(r => V.renderOf(r) === "resting").length;

  return (
    <section className={`sa-section ${open ? "is-open" : ""} ${section.degraded ? "is-degraded" : ""}`}>
      <button className="sa-section-head" onClick={onToggle}
              aria-expanded={open} aria-label={`${section.label} — ${section.degraded ? "dégradé" : "tout va bien"}`}>
        <Icon name={open ? "chevron_down" : "chevron_right"} size={14} stroke={2} />
        <h2 className="sa-section-title">{section.label}</h2>
        <span className="sa-section-state">
          {section.degraded > 0
            ? `${section.degraded} dégradé${section.degraded > 1 ? "s" : ""}`
            : (resting > 0 ? `${section.rows.length} briques · ${resting} au repos` : "tout va bien")}
        </span>
      </button>
      {summary && <p className="sa-section-summary">{summary}</p>}
      {open && (
        <div className="sa-section-body">
          {section.rows.map(r => <SaRow key={r.pipeline_id} row={r} nav={nav} now={now} />)}
        </div>
      )}
    </section>
  );
}

function PanelSante({ data, onNavigate }) {
  const V = window.santeView;
  const now = Date.now();
  const rows = (data && data.pipeline_health) ||
               (window.COCKPIT_DATA && window.COCKPIT_DATA.pipeline_health) || [];
  const nav = window.COCKPIT_NAV || [];

  const verdict = V.globalVerdict(rows, now);
  const sections = V.groupByDomain(rows);

  const [stored, setStored] = useSaState(saReadOpen);
  const toggle = (key) => {
    const next = Object.assign({}, stored, { [key]: !isOpen(key) });
    setStored(next);
    saWriteOpen(next);
  };
  // Une section dégradée est ouverte, point. La mémoire ne sert qu'aux saines.
  function isOpen(key) {
    const section = sections.find(s => s.key === key);
    if (section && section.degraded > 0) return true;
    return stored[key] === true;
  }

  return (
    <div className="sa-panel">
      <header className="sa-hero">
        <div className="sa-hero-eyebrow">Coulisses · santé du cockpit</div>
        <h1 className="sa-hero-title">Ce qui tourne, et ce qui ne tourne plus</h1>
        <p className="sa-hero-sub">
          Chaque brique de la machine, ce qu'elle alimente, et le geste qui la répare.
          Les sections au vert sont repliées.
        </p>
      </header>

      <SaVerdict verdict={verdict} />

      {sections.map(section => (
        <SaSection key={section.key} section={section} nav={nav} now={now}
                   open={isOpen(section.key)} onToggle={() => toggle(section.key)} />
      ))}
    </div>
  );
}

window.PanelSante = PanelSante;
```

- [ ] **Step 2: Écrire la feuille de style**

Créer `cockpit/styles-sante.css` :

```css
/* Onglet Santé — reprend le vocabulaire visuel de la liste Pipelines de
   Stacks & Limits (pastilles, couleurs de statut) pour que l'utilisateur ne
   réapprenne rien. */

.sa-panel { padding: var(--space-6) 0 var(--space-8); }

.sa-hero { margin-bottom: var(--space-6); }
.sa-hero-eyebrow {
  font-size: var(--text-2xs); text-transform: uppercase; letter-spacing: .08em;
  color: var(--tx3); margin-bottom: var(--space-2);
}
.sa-hero-title { font-size: var(--text-2xl); color: var(--tx); margin: 0 0 var(--space-2); }
.sa-hero-sub { font-size: var(--text-sm); color: var(--tx2); margin: 0; max-width: 62ch; }

/* ── Verdict global ─────────────────────────────────────── */
.sa-verdict {
  border: 1px solid var(--line); border-radius: var(--radius-md);
  padding: var(--space-4); margin-bottom: var(--space-6);
}
.sa-verdict.is-alert { border-color: var(--alert); background: var(--alert-tint); }
.sa-verdict.is-warn  { border-color: var(--neutral); background: var(--neutral-tint); }
.sa-verdict.is-empty { border-style: dashed; }
.sa-verdict-head { display: flex; align-items: center; gap: var(--space-2); }
.sa-verdict-kicker {
  font-size: var(--text-xs); text-transform: uppercase; letter-spacing: .06em;
  font-weight: 600; color: var(--tx);
}
.sa-verdict.is-alert .sa-verdict-kicker { color: var(--alert); }
.sa-verdict-count { margin-left: auto; font-size: var(--text-xs); color: var(--tx3); }
.sa-verdict-lede { margin: var(--space-2) 0 0; font-size: var(--text-sm); color: var(--tx2); }
.sa-verdict-warn { margin: var(--space-2) 0 0; font-size: var(--text-sm); color: var(--alert); }

/* ── Section ────────────────────────────────────────────── */
.sa-section { border-top: 1px solid var(--line); }
.sa-section-head {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  padding: var(--space-3) 0; background: none; border: none; cursor: pointer;
  text-align: left; color: inherit;
}
.sa-section-title { font-size: var(--text-base); font-weight: 600; color: var(--tx); margin: 0; }
.sa-section-state {
  margin-left: auto; font-size: var(--text-xs); color: var(--tx3);
  text-transform: uppercase; letter-spacing: .04em;
}
.sa-section.is-degraded .sa-section-state { color: var(--alert); font-weight: 600; }
.sa-section-summary {
  margin: 0 0 var(--space-3); padding-left: calc(14px + var(--space-2));
  font-size: var(--text-sm); color: var(--tx2); max-width: 68ch;
}
.sa-section-body { padding: 0 0 var(--space-4) calc(14px + var(--space-2)); }

/* ── Ligne ──────────────────────────────────────────────── */
.sa-row { padding: var(--space-2) 0; }
.sa-row + .sa-row { border-top: 1px solid var(--line-soft, var(--line)); }
.sa-row-head { display: flex; align-items: center; gap: var(--space-2); font-size: var(--text-sm); }
.sa-dot { flex: none; width: 7px; height: 7px; border-radius: 50%; background: var(--positive); }
.sa-row.is-failing .sa-dot { background: var(--alert); }
.sa-row.is-stale   .sa-dot { background: var(--neutral); }
.sa-row.is-resting .sa-dot,
.sa-row.is-unknown_freshness .sa-dot,
.sa-row.is-unknown .sa-dot { background: var(--tx3); }
.sa-name { color: var(--tx); font-weight: 500; }
.sa-state {
  font-size: var(--text-2xs); text-transform: uppercase; letter-spacing: .04em; color: var(--tx2);
}
.sa-row.is-failing .sa-state { color: var(--alert); font-weight: 600; }
.sa-row.is-stale   .sa-state { color: var(--neutral); font-weight: 600; }
.sa-age { margin-left: auto; font-size: var(--text-xs); color: var(--tx3); font-variant-numeric: tabular-nums; }
.sa-link { flex: none; color: var(--tx3); text-decoration: none; }
.sa-link:hover { color: var(--tx); }
.sa-link.is-empty { width: 13px; }

.sa-cause, .sa-effect, .sa-fix {
  margin: var(--space-1) 0 0; padding-left: calc(7px + var(--space-2));
  font-size: var(--text-sm); max-width: 68ch;
}
.sa-cause  { color: var(--tx2); }
.sa-effect { color: var(--tx2); }
.sa-fix    { color: var(--tx); }
.sa-fix-arrow { color: var(--accent); font-weight: 600; }

@media (max-width: 720px) {
  .sa-row-head { flex-wrap: wrap; }
  .sa-age { margin-left: 0; width: 100%; }
}
```

- [ ] **Step 3: Brancher le panel**

Dans `index.html`, à côté de la ligne 33 (`<link rel="stylesheet" href="cockpit/styles-history.css?v=1">`) :

```html
<link rel="stylesheet" href="cockpit/styles-sante.css?v=1">
```

À côté de la ligne 69 (`<script src="cockpit/lib/games-view.js?v=3"></script>`) :

```html
<script src="cockpit/lib/sante-view.js?v=1"></script>
```

À côté de la ligne 117 (`<script type="text/babel" src="cockpit/panel-stacks.jsx?v=3"></script>`) :

```html
<script type="text/babel" src="cockpit/panel-sante.jsx?v=1"></script>
```

Dans `cockpit/app.jsx`, juste avant la ligne 650 (`else if (activePanel === "stacks")`) :

```jsx
  else if (activePanel === "sante") content = <PanelSante key={panelKey} data={data} onNavigate={handleNavigate} />;
```

Dans `cockpit/nav.js`, ajouter l'entrée en tête du groupe `Système` — le
renommage du groupe et les déplacements viennent à la Task 7, ici on veut
seulement que l'onglet soit atteignable :

```js
  { group: "Système", items: [
    { id: "sante", label: "Santé", icon: "plug" },
    { id: "stacks", label: "Stacks & Limits", icon: "wallet" },
    { id: "history", label: "Historique", icon: "clock" },
  ]},
```

- [ ] **Step 4: Vérifier que le lint bloquant échoue, puis resynchroniser `KNOWN_SECTIONS`**

Run: `python scripts/lint_known_sections.py`
Expected: FAIL — `sante` est routé dans `app.jsx` mais absent de `KNOWN_SECTIONS`.

Dans `jarvis/scripts/extract_signals.py` ligne 33, ajouter `"sante"` au set :

```python
KNOWN_SECTIONS = {
    "anime", "brief", "challenges", "claude", "evening", "gaming",
    "gaming_news", "history", "ideas", "jarvis", "jarvis-lab", "jobs",
    "mediatheque", "music", "news", "opps", "perf", "profile", "radar",
    "recos", "review", "sante", "search", "signals", "sport", "stacks",
    "top", "updates", "veille-outils", "week", "wiki",
}
```

Run: `python scripts/lint_known_sections.py`
Expected: PASS

- [ ] **Step 5: Déclarer le panel dans l'architecture**

Dans `docs/architecture/dependencies.yaml`, sous `panels:`, à côté de l'entrée `stacks` :

```yaml
  - id: sante
    file: cockpit/panel-sante.jsx
    reads: [pipeline_health]   # Tier 1, chargée en entier par bootTier1 — aucun fetch propre
    writes: []
```

- [ ] **Step 6: Écrire la spec produit**

Créer `docs/specs/tab-sante.md` en suivant `docs/specs/_template.md`. Contenu obligatoire, dans cet ordre — les sections « Parcours utilisateur » et « Fonctionnalités » sont en **vocabulaire produit strict** : aucun chemin de fichier, aucun nom de composant, aucune colonne DB (le lint `lint-specs` est bloquant, cf. `docs/specs/MAINTENANCE.md`) :

```markdown
# Santé

> État de la machinerie du cockpit, section par section : ce qui tourne, ce qui est cassé, depuis quand, ce que ça coûte et le geste qui répare.

## Scope
mixte

## Finalité fonctionnelle
Répondre en un écran à « est-ce que ce que je lis est à jour ? ». Le bandeau d'alerte du Brief signale les pannes mais ne dit jamais que tout le reste va bien, et la liste des synchronisations de Stacks & Limits est noyée dans un onglet qui parle d'argent. Cet onglet est le seul endroit où l'état complet se lit, organisé par domaine fonctionnel plutôt que par technologie, et où chaque panne est accompagnée du geste qui la répare.

## Parcours utilisateur
1. Clic sidebar "Santé" (groupe Coulisses) — l'écran s'affiche immédiatement, sans attente de chargement.
2. Lecture du verdict en tête : combien de briques sont en panne ou figées, sur combien de briques surveillées, et à quelle date remonte le dernier contrôle.
3. Si le contrôle lui-même n'a pas tourné depuis plus de 48 heures, un avertissement le dit avant tout le reste : les états affichés en dessous peuvent être faux.
4. Scan des sept sections, toujours dans le même ordre : Veille IA, Apprentissage, Veille satellite, Médiathèque, Vie perso, Business, Socle. Une section dont tout va bien est repliée sur son titre ; une section qui contient une panne est ouverte d'office.
5. Lecture de la phrase d'effet sous le titre d'une section dégradée : elle nomme les onglets qui affichent encore des données figées.
6. Pour chaque brique dégradée : la cause en une phrase, ce que ça éteint, et la marche à suivre pour réparer.
7. Clic sur la flèche d'une brique pour ouvrir le détail de sa dernière exécution.
8. Clic sur le titre d'une section saine pour la déplier et vérifier le détail — la préférence de pli est mémorisée d'une visite à l'autre, sauf pour les sections dégradées qui s'ouvrent toujours.

## Fonctionnalités
- **Verdict global** : nombre de briques en panne et figées sur le total surveillé, plus la date du dernier contrôle. Répond à "est-ce que je peux faire confiance à ce que je lis ailleurs".
- **Alerte sur le surveillant** : si le contrôle de santé n'a pas tourné depuis plus de 48 heures, l'écran le dit en premier, parce qu'un "tout va bien" périmé est pire qu'un écran vide.
- **Sept sections par domaine, ordre fixe** : les sections ne changent jamais de place, ce qui rend la page mémorisable. L'urgence est portée par les pastilles et le verdict, jamais par un tri mouvant.
- **Repli automatique du sain** : un jour normal, la page tient en sept lignes. Une section qui contient une panne s'ouvre d'elle-même, même si elle avait été repliée.
- **Phrase d'effet par section** : nomme les onglets du cockpit qui affichent encore des données figées, pour traduire une panne technique en conséquence concrète.
- **Six états lisibles** : à jour, au repos (une source pilotée par l'activité qui n'a rien à dire), fraîcheur inconnue (aucune mesure possible), en panne, figé, inconnu. Un vert non mesuré ne ressemble jamais à un vert mesuré.
- **Le geste qui répare** : chaque brique dégradée affiche la marche à suivre, écrite d'avance à côté de la source qu'elle répare.
- **Lien vers la dernière exécution** : une flèche par brique, pour aller lire le détail technique quand la phrase ne suffit pas.
- **État vide honnête** : si aucun relevé n'existe, l'écran le dit au lieu d'afficher un faux "tout va bien".

## Front — structure UI
Hero (accroche + sous-titre), bandeau de verdict global, puis une section repliable par domaine. Chaque section : bouton de titre (chevron + libellé + compteur), phrase d'effet, corps déplié. Chaque ligne : pastille de couleur, libellé, état, âge, lien externe ; puis, si dégradée, cause, effet et remède. Préférence de pli persistée dans `localStorage` sous la clé `cockpit-sante-open`.

## Front — fonctions JS
| Fonction | Rôle | Fichier/ligne |
|----------|------|---------------|
| `PanelSante()` | Composant racine, assemble verdict + sections | `cockpit/panel-sante.jsx` |
| `SaVerdict()` | Bandeau de verdict global + garde 48 h | `cockpit/panel-sante.jsx` |
| `SaSection()` | Section repliable d'un domaine | `cockpit/panel-sante.jsx` |
| `SaRow()` | Ligne d'une brique, dans ses six rendus | `cockpit/panel-sante.jsx` |
| `santeView.renderOf()` | Statut en base → rendu à l'écran | `cockpit/lib/sante-view.js` |
| `santeView.sectionSummary()` | Phrase d'effet dérivée des panels | `cockpit/lib/sante-view.js` |
| `santeView.groupByDomain()` | Groupement en sections, ordre fixe | `cockpit/lib/sante-view.js` |
| `santeView.globalVerdict()` | Compteurs + garde sur `checked_at` | `cockpit/lib/sante-view.js` |

## Back — sources de données
Table `pipeline_health`, chargée en entier et sans filtre par le Tier 1 (`cockpit/lib/data-loader.js::bootTier1`). Aucun fetch propre au panel. La table est écrite par l'observateur externe `pipelines/pipeline_health.py` (cron quotidien 09:00 UTC), qui lit le contrat `health` de chaque brique dans `docs/architecture/pipelines.yaml`.

## Limitations
- Les colonnes `domain`, `remediation` et `impact` ne se peuplent qu'au premier passage du contrôle quotidien suivant le déploiement : avant lui, toutes les briques tombent dans « Non classé ».
- `igdb_tracker_sync` ne peut pas être mesuré sur la fraîcheur de ses données : le cockpit écrit lui aussi dans ses tables. Il s'affiche « fraîcheur inconnue ».
- Jarvis local, les quotas d'API et les garde-fous de développement sont hors périmètre — les quotas restent dans Stacks & Limits.
```

- [ ] **Step 7: Référencer la spec dans l'index**

Dans `docs/specs/index.json`, ajouter dans `tabs` :

```json
    {
      "slug": "sante",
      "title": "Santé",
      "order": 31,
      "group": "Coulisses",
      "dom_id": "sante",
      "scope": "mixte",
      "status": "documented",
      "last_updated": "2026-08-20"
    }
```

- [ ] **Step 8: Vérifier le lint des specs**

Run: `python scripts/lint_specs_produit.py`
Expected: PASS. En cas d'échec sur « Parcours utilisateur » ou « Fonctionnalités », retirer le terme technique signalé (chemin de fichier, nom de composant, nom de colonne) — la règle est dans `docs/specs/MAINTENANCE.md`.

- [ ] **Step 9: Synchroniser le service worker**

Run: `node scripts/sync-sw.mjs`
Expected: les trois nouveaux fichiers (`cockpit/lib/sante-view.js`, `cockpit/panel-sante.jsx`, `cockpit/styles-sante.css`) apparaissent dans `STATIC[]` et `CACHE` est bumpé.

- [ ] **Step 10: Commit**

```bash
git add cockpit/panel-sante.jsx cockpit/styles-sante.css cockpit/app.jsx cockpit/nav.js index.html jarvis/scripts/extract_signals.py docs/specs/tab-sante.md docs/specs/index.json docs/architecture/dependencies.yaml sw.js
git commit -m "feat(sante): l'onglet, sept sections par domaine et le geste qui repare"
```

> **Aucune télémétrie à ajouter.** `section_opened{section:"sante"}` est émis
> automatiquement par l'effet sur `[activePanel]` dans `app.jsx`, et
> `link_clicked` couvre déjà les liens vers les runs GitHub. Ne pas créer
> d'`event_type` — donc rien à ajouter dans `docs/telemetry.md`.

---

### Task 7: Le groupe « Coulisses »

**Files:**
- Modify: `cockpit/nav.js` (groupes Veille, Personnel, Système)
- Modify: `docs/specs/index.json` (`group` de `history` et `jarvis-lab`)
- Modify: `jarvis/spec.json` (`cockpit_tabs.groups`)

**Interfaces:**
- Consumes: l'id `sante` créé en Task 6.
- Produces: `window.COCKPIT_NAV` avec un groupe `Coulisses` de 3 onglets. Consommé par `cockpit/sidebar.jsx`, `cockpit/data.js` et `santeView.panelLabelMap()`.

> `KNOWN_SECTIONS` a déjà été resynchronisé en Task 6 : le lint lit la chaîne
> de routing d'`app.jsx`, pas `nav.js`. Renommer un groupe ou déplacer un onglet
> entre groupes ne le concerne pas — aucun linter du repo ne code de nom de
> groupe en dur (vérifié le 2026-08-20).

- [ ] **Step 1: Restructurer `cockpit/nav.js`**

`sante` est déjà dans le groupe `Système` depuis la Task 6. Ici : déplacer
`history` vers la fin du groupe Veille, retirer `jarvis-lab` du groupe Personnel,
et remplacer le groupe `Système` par `Coulisses` :

```js
  { group: "Veille", items: [
    { id: "updates", label: "Veille IA", icon: "sparkles" },
    { id: "claude", label: "Claude", icon: "bot" },
    { id: "veille-outils", label: "Veille outils", icon: "toolbox" },
    { id: "sport", label: "Sport", icon: "flag" },
    { id: "gaming_news", label: "Gaming", icon: "wrench" },
    { id: "anime", label: "Anime / Ciné / Séries", icon: "star" },
    { id: "news", label: "Actualités", icon: "paper" },
    { id: "history", label: "Historique", icon: "clock" },
  ]},
```

```js
  { group: "Personnel", items: [
    { id: "jarvis", label: "Jarvis", icon: "assistant" },
    { id: "profile", label: "Mon profil", icon: "user" },
    { id: "perf", label: "Forme", icon: "activity" },
    { id: "music", label: "Musique", icon: "music" },
    { id: "gaming", label: "Gaming", icon: "gamepad" },
    { id: "mediatheque", label: "Médiathèque", icon: "tv" },
  ]},
  // « Coulisses » (ex-« Système ») : la machine, ce qu'elle coûte, ses plans.
  // Historique en est parti — c'est une archive 60 j de la veille, pas de la
  // machinerie. Jarvis Lab y est entré — c'est du méta (roadmap, specs,
  // diagrammes), pas une fonctionnalité personnelle.
  { group: "Coulisses", items: [
    { id: "sante", label: "Santé", icon: "plug" },
    { id: "stacks", label: "Stacks & Limits", icon: "wallet" },
    { id: "jarvis-lab", label: "Jarvis Lab", icon: "chart" },
  ]},
```

- [ ] **Step 2: Aligner les deux catalogues de specs**

Dans `docs/specs/index.json` : mettre `"group": "Veille"` sur l'entrée `history`, et `"group": "Coulisses"` sur les entrées `jarvis-lab` et `stacks`.

Dans `jarvis/spec.json`, sous `cockpit_tabs.groups` :
- déplacer l'objet de l'onglet `history` du groupe `systeme` vers la fin des `tabs` du groupe `veille` ;
- déplacer l'objet de l'onglet `jarvis-lab` du groupe `personnel` vers le groupe `systeme` ;
- renommer le groupe : `"id": "coulisses"`, `"label": "Coulisses"` ;
- y ajouter en tête l'onglet Santé :

```json
        {
          "id": "sante",
          "label": "Santé",
          "icon": "plug",
          "description": "État de la machinerie du cockpit par domaine : ce qui tourne, ce qui est cassé, depuis quand, ce que ça coûte et le geste qui répare.",
          "panel_file": "cockpit/panel-sante.jsx"
        }
```

- [ ] **Step 3: Vérifier les trois linters**

Run: `python scripts/lint_known_sections.py`
Expected: PASS

Run: `python scripts/lint_specs_produit.py`
Expected: PASS

Run: `python scripts/validate_architecture.py`
Expected: PASS

- [ ] **Step 4: Vérifier que le module de présentation suit le renommage**

Run: `node tests/test_sante_view.mjs`
Expected: PASS — le test utilise sa propre fixture `NAV`, il ne doit pas dépendre du vrai `nav.js`.

- [ ] **Step 5: Synchroniser le service worker et commit**

```bash
node scripts/sync-sw.mjs
git add cockpit/nav.js docs/specs/index.json jarvis/spec.json sw.js
git commit -m "refactor(nav): groupe Coulisses — Sante, Stacks, Jarvis Lab ; Historique repart dans Veille"
```

---

### Task 8: Dédoublonnage, lien depuis le Brief, ADR

**Files:**
- Modify: `cockpit/panel-stacks.jsx` (suppression de `StPipelineHealth` L378-431, appel L648)
- Modify: `cockpit/styles-stacks.css` (bloc `.st-ph-*`, L788-855)
- Modify: `cockpit/app.jsx` (`PipelineHealthBanner`, ajout du lien après la liste)
- Modify: `cockpit/lib/data-loader.js:1238` (commentaire faux)
- Modify: `docs/specs/tab-stacks.md` (étape 4bis du parcours + fonctionnalité correspondante)
- Modify: `docs/architecture/decisions.md` (nouvel ADR)
- Modify: `docs/architecture/dependencies.yaml` (`reads` du panel `stacks`)

**Interfaces:**
- Consumes: l'onglet `sante` (Task 6), `onNavigate` déjà passé à `PanelStacks` et à `PipelineHealthBanner`.
- Produces: rien de nouveau — cette tâche retire des doublons.

- [ ] **Step 1: Remplacer `StPipelineHealth` par un renvoi**

Dans `cockpit/panel-stacks.jsx`, remplacer intégralement la fonction `StPipelineHealth` (lignes 378-431, en-tête de commentaire compris) par :

```jsx
// ── Renvoi vers Santé ───────────────────────────────────
// La liste complète des pipelines vivait ici. Elle vit maintenant dans son
// onglet, groupe Coulisses : deux surfaces qui disent la même chose finissent
// par se contredire, et Stacks & Limits parle d'argent et de quotas.
function StHealthLink({ onNavigate }) {
  const rows = (window.COCKPIT_DATA && window.COCKPIT_DATA.pipeline_health) || [];
  if (!rows.length) return null;
  const degraded = rows.filter(r => r.status === "failing" || r.status === "stale").length;
  return (
    <button className="st-health-link" onClick={() => onNavigate && onNavigate("sante")}>
      <Icon name="plug" size={14} stroke={1.75} />
      <span>
        {degraded === 0
          ? `Les ${rows.length} sources du cockpit sont au vert`
          : `${degraded} source${degraded > 1 ? "s" : ""} dégradée${degraded > 1 ? "s" : ""} sur ${rows.length}`}
      </span>
      <span className="st-health-link-cta">voir Santé</span>
      <Icon name="arrow_right" size={13} stroke={2} />
    </button>
  );
}
```

Puis, ligne 648, remplacer `<StPipelineHealth />` par :

```jsx
      <StHealthLink onNavigate={onNavigate} />
```

- [ ] **Step 2: Remplacer les styles correspondants**

Dans `cockpit/styles-stacks.css`, remplacer le bloc `.st-ph-*` (lignes 788-855) par :

```css
/* Renvoi vers l'onglet Santé — la liste complète y vit désormais. */
.st-health-link {
  display: flex; align-items: center; gap: var(--space-2); width: 100%;
  margin: var(--space-6) 0; padding: var(--space-3) var(--space-4);
  border: 1px solid var(--line); border-radius: var(--radius-md);
  background: none; cursor: pointer; text-align: left;
  font-size: var(--text-sm); color: var(--tx2);
}
.st-health-link:hover { border-color: var(--tx3); color: var(--tx); }
.st-health-link-cta {
  margin-left: auto; font-size: var(--text-xs); text-transform: uppercase;
  letter-spacing: .04em; color: var(--accent);
}
```

- [ ] **Step 3: Ajouter le lien « Tout voir » au bandeau du Brief**

Dans `cockpit/app.jsx`, `PipelineHealthBanner` : ajouter une prop `onNavigate` à la signature —

```jsx
function PipelineHealthBanner({ panelId, rows, onNavigate }) {
```

— puis, juste après la fermeture de `</ul>` et avant `</aside>` (autour de la ligne 244) :

```jsx
      {onNavigate && (
        <button className="phb-all" onClick={() => onNavigate("sante")}>
          Tout voir <Icon name="arrow_right" size={12} stroke={2} />
        </button>
      )}
```

Et ligne 690, passer la prop :

```jsx
        <PipelineHealthBanner panelId={activePanel} rows={data && data.pipeline_health} onNavigate={handleNavigate} />
```

Ajouter le style dans `cockpit/styles.css`, à côté des autres règles `.phb-*` :

```css
.phb-all {
  display: inline-flex; align-items: center; gap: 4px; margin-top: var(--space-2);
  padding: 0; background: none; border: none; cursor: pointer;
  font-size: var(--text-xs); text-transform: uppercase; letter-spacing: .04em;
  color: var(--accent);
}
.phb-all:hover { text-decoration: underline; }
```

- [ ] **Step 4: Corriger le commentaire faux du loader**

Dans `cockpit/lib/data-loader.js` ligne 1238, remplacer :

```js
      pipeline_health: pipelineHealth || [],  // uniquement les pipelines dégradés
```

par :

```js
      pipeline_health: pipelineHealth || [],  // TOUTES les briques, sains compris (cf. le commentaire du fetch)
```

- [ ] **Step 5: Mettre à jour la spec de Stacks & Limits**

Dans `docs/specs/tab-stacks.md` :
- remplacer l'étape « 4bis » du parcours utilisateur par :
  `4bis. Lecture de la ligne de renvoi vers l'onglet Santé : combien de sources sont dégradées sur le total, et un clic pour aller lire le détail. La liste complète des synchronisations vit désormais dans Santé.`
- ajouter dans « Fonctionnalités » :
  `- **Renvoi vers Santé** : une ligne qui résume l'état des sources du cockpit et ouvre l'onglet dédié. Stacks & Limits ne parle plus que d'argent et de quotas.`
- bumper `last_updated` de l'entrée `stacks` dans `docs/specs/index.json` à `2026-08-20`.

Dans `docs/architecture/dependencies.yaml`, retirer `pipeline_health` du `reads` du panel `stacks` s'il y figure ; le lien ne lit qu'un compteur, la source vit dans `sante`.

- [ ] **Step 6: Écrire l'ADR**

Dans `docs/architecture/decisions.md`, ajouter à la suite d'ADR-40 (vérifié le
2026-08-20 : ADR-40 est le dernier). Le format du fichier est
`## ADR-N · AAAA-MM-JJ · Titre` — le respecter :

```markdown
## ADR-41 · 2026-08-20 · Une surface de lecture dédiée pour la santé du cockpit

**Contexte.** La santé était écrite trois fois et lisible nulle part : le bandeau
du Brief ne montre que les pannes, la liste de Stacks & Limits est noyée dans un
onglet qui parle d'argent, l'issue GitHub vit hors du cockpit et parle en
`pipeline_id`. Aucune des trois ne dit ce qu'une panne coûte ni quoi faire.
S'y ajoutaient trois angles morts mesurés le 2026-08-20 : `jobs_radar_routine`
(sous `external_routines:`, une clé que le contrôle ne lisait pas — la panne
d'ADR-31), `backup_supabase` (surveillé par lui-même seulement) et le contrôle
lui-même ; plus quatre sondes de fraîcheur fausses ou absentes, dont
`anime_tracker_sync` qui mesurait une table écrite aussi par `tmdb_tracker_sync`.

**Décision.** Un onglet Santé dans un groupe « Coulisses », alimenté par
`pipeline_health` déjà chargée en Tier 1 — aucun fetch. Le contrat `health` de
`pipelines.yaml` gagne quatre clés : `domain` (section, vocabulaire fermé de 7
valeurs, imposé par `validate-arch`), `filter` (sonde restreinte aux lignes
qu'écrit ce pipeline), `remediation` (le geste qui répare) et `impact` (la phrase
d'effet quand aucun onglet n'est concerné). La liste de Stacks & Limits est
remplacée par un renvoi ; le bandeau du Brief est inchangé et gagne un lien.

**Pourquoi le geste vit dans le YAML.** Il ne peut pas se déduire à l'exécution :
« recharger le crédit Anthropic » n'est nulle part dans un code HTTP 400. Le
déclarer à côté du pipeline qu'il répare le fait vivre dans la même PR que lui,
sous la même relecture. L'alternative — une table de correspondance en JS —
l'aurait éloigné de ce qu'il décrit.

**Ce qui est assumé.** Un onglet de plus dans un cockpit qui en compte déjà des
morts : la sonde est `section_opened{section:"sante"}`, et la règle est écrite
d'avance — zéro ouverture en six semaines alors que le bandeau s'est affiché, on
retire. `remediation` vieillira avec les services qu'il décrit, sans garde-fou
automatique possible : une ligne sans geste reste utile.
```

- [ ] **Step 7: Vérifier la suite complète**

Run: `python scripts/validate_architecture.py && python scripts/lint_specs_produit.py && python scripts/lint_known_sections.py`
Expected: les trois PASS.

Run: `for f in tests/test_*.mjs; do node "$f" || exit 1; done`
Expected: tous PASS.

Run: `for f in tests/test_*.py; do [ "$f" = "tests/test_franchise_walk.py" ] && continue; python "$f" || exit 1; done`
Expected: tous PASS (`test_franchise_walk.py` est exclu en CI, bug `sys.path` préexistant).

- [ ] **Step 8: Synchroniser le service worker, commit, pousser**

```bash
node scripts/sync-sw.mjs
git add cockpit/panel-stacks.jsx cockpit/styles-stacks.css cockpit/app.jsx cockpit/styles.css cockpit/lib/data-loader.js docs/specs/tab-stacks.md docs/specs/index.json docs/architecture/decisions.md docs/architecture/dependencies.yaml sw.js
git commit -m "refactor(stacks): la liste des pipelines part dans Sante, un renvoi la remplace"
git push origin main
```

- [ ] **Step 9: Vérifier en prod**

Hard-refresh de la page GitHub Pages (`Ctrl+Shift+R`), puis :

1. La sidebar montre un groupe **Coulisses** avec Santé, Stacks & Limits, Jarvis Lab — et Historique est passé sous Veille.
2. L'onglet Santé s'affiche **sans temps de chargement** (il n'a aucun fetch).
3. Tant que le cron `pipeline-health.yml` n'a pas tourné depuis le déploiement, **toutes les briques sont dans « Non classé »** et sans geste : c'est nominal, `domain`/`remediation`/`impact` se peuplent au premier passage (09:00 UTC). Pour ne pas attendre, déclencher le workflow à la main depuis l'onglet Actions.
4. Après ce run : sept sections, les saines repliées, 19 briques au total.
5. Stacks & Limits affiche la ligne de renvoi et plus la liste.
6. Le Brief affiche son bandeau habituel, avec le lien « Tout voir » en bas.

---

## Notes d'exécution

**Ordre des tâches.** Les Tasks 1 à 4 (base + observateur + contrat) sont indépendantes du front et peuvent être livrées seules : elles améliorent déjà l'issue GitHub d'alerte et la liste de Stacks. Les Tasks 5 à 8 dépendent d'elles. Ne pas commencer la Task 8 avant que la Task 6 soit en prod : elle retire la seule surface qui affiche la liste complète.

**Le trou entre le déploiement et le premier run.** Les trois colonnes sont nulles jusqu'au premier passage du cron. La page le gère (section « Non classé », pas de geste affiché) mais elle est laide pendant ce laps. Déclencher `pipeline-health.yml` à la main juste après le push de la Task 4 évite complètement la fenêtre.
