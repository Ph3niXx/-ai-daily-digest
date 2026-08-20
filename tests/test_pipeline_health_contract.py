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
