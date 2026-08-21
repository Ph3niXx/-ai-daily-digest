"""Le contrat de surveillance : filtre de fraîcheur, routines distantes, colonnes.

Six extensions, six façons de mal tourner :

1. Une sonde de fraîcheur sur une table à plusieurs écrivains est satisfaite
   par n'importe lequel d'entre eux. `anime_tracker_sync` mesurait
   `media_entries`, que `tmdb_tracker_sync` écrit aussi : AniList pouvait
   mourir sans que la ligne bouge. D'où `filter`.
2. Une routine distante (claude.ai) n'a pas de run GitHub. Le verdict par
   défaut la condamnerait à `unknown` à perpétuité — soit très exactement
   l'angle mort d'ADR-31, trois semaines de quota JSearch saturé non vues.
3. Les colonnes déclaratives doivent arriver en base, sinon la page reste
   muette sur ce qu'une panne coûte.
4. `verdict()` ne regardait que la conclusion du dernier run et la fraîcheur
   d'une table : un pipeline dont le cron cesse d'être déclenché restait `ok`
   pour l'éternité. C'est exactement le cas de backup_supabase — hebdomadaire,
   sans table de sortie (ADR-37) : rien ne le surveillait, et sa panne serait
   la seule irrattrapable. D'où `max_run_age_hours`.
5. `RUNS_TO_INSPECT` est une fenêtre en NOMBRE de runs, donc en durée très
   variable : 30 heures pour un bihoraire, quinze semaines pour un
   hebdomadaire. Saturée d'échecs, elle faisait écrire `last_success_at: null`
   — soit « n'a jamais réussi ». tft_sync affichait NULL alors que son dernier
   succès datait du 2026-04-24.
6. Le catalogue est filtré sur `status: active` À LA LECTURE, mais la ligne
   déjà en base survivait : un pipeline retiré restait `failing` pour toujours
   dans le bandeau, sans plus aucun run pour le repasser au vert.

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
check("premier '=' seulement", ph._filter_params("col=eq.a=b"), {"col": "eq.a=b"})


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

NO_RUN = {"last_run_at": None, "last_run_conclusion": None, "last_run_url": None,
          "last_success_at": None, "consecutive_failures": 0}
OK_RUN = {"last_run_at": "2026-08-20T06:02:00+00:00", "last_run_conclusion": "success",
          "last_run_url": "https://github.test/run/1",
          "last_success_at": "2026-08-20T06:02:00+00:00", "consecutive_failures": 0}
KO_RUN = {"last_run_at": "2026-08-20T06:04:00+00:00", "last_run_conclusion": "failure",
          "last_run_url": "https://github.test/run/2",
          "last_success_at": "2026-05-01T06:04:00+00:00", "consecutive_failures": 3}

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
          ["actif_avec_health", "actif_sans_table", "routine_distante"])
    check("le seuil d'age de run traverse le chargement",
          {p["id"]: p["health"].get("max_run_age_hours") for p in loaded},
          {"actif_avec_health": None, "actif_sans_table": 192, "routine_distante": None})
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


print("-- build_row : les cinq champs d'execution transitent integralement")

# Verrou de contrat : summarize_runs() renvoie TOUJOURS ces cinq clés (y
# compris sur une liste de runs vide), donc build_row les recopie par accès
# direct plutôt que .get() — un run_info malformé doit lever bruyamment,
# jamais écrire un NULL silencieux en base. KO_RUN porte une valeur distincte
# par champ pour que ce test ne puisse pas passer par coïncidence.
row3 = ph.build_row(
    {"id": "y", "name": "Y", "remote": False, "health": {"domain": "socle", "panels": []}},
    KO_RUN, last_seen=None, age_hours=None, status="failing", now="NOW",
)
check("last_run_at recopie", row3["last_run_at"], KO_RUN["last_run_at"])
check("last_run_conclusion recopie", row3["last_run_conclusion"], KO_RUN["last_run_conclusion"])
check("last_run_url recopie", row3["last_run_url"], KO_RUN["last_run_url"])
check("last_success_at recopie", row3["last_success_at"], KO_RUN["last_success_at"])
check("consecutive_failures recopie", row3["consecutive_failures"], KO_RUN["consecutive_failures"])


print("-- verdict : le troisieme signal, l'age du DERNIER RUN")

# Sans ce signal, un pipeline dont le cron cesse d'etre declenche reste vert
# indefiniment sur la foi d'un succes vieux de plusieurs mois.
check("run vert mais trop vieux => stale",
      ph.verdict(OK_RUN, None, None, run_age_hours=200.0, max_run_age_hours=192), "stale")
check("run vert dans les clous => ok",
      ph.verdict(OK_RUN, None, None, run_age_hours=100.0, max_run_age_hours=192), "ok")
check("seuil non declare => l'age du run ne sanctionne jamais",
      ph.verdict(OK_RUN, None, None, run_age_hours=5000.0, max_run_age_hours=None), "ok")
check("seuil declare mais aucun run date => unknown, pas stale",
      ph.verdict(NO_RUN, None, None, run_age_hours=None, max_run_age_hours=192), "unknown")
check("un run rouge reste failing, meme tres vieux",
      ph.verdict(KO_RUN, None, None, run_age_hours=5000.0, max_run_age_hours=192), "failing")
check("une routine distante ignore le seuil de run (elle n'a pas de run)",
      ph.verdict(NO_RUN, 40.0, 96, remote=True, has_probe=True,
                 run_age_hours=None, max_run_age_hours=192), "ok")
check("l'age du run prime sur la peremption de la table",
      ph.verdict(OK_RUN, 900.0, 30, run_age_hours=400.0, max_run_age_hours=192), "stale")


print("-- build_row : la cause distingue les trois silences")

SANS_TABLE = {
    "id": "backup_supabase", "name": "Sauvegarde", "remote": False,
    "health": {"domain": "socle", "panels": [], "impact": "Rien ne le montre.",
               "max_run_age_hours": 192},
}
row4 = ph.build_row(SANS_TABLE, OK_RUN, last_seen=None, age_hours=None,
                    status="stale", now="NOW", run_age_hours=400.0)
check("la cause designe le declencheur disparu, pas la table",
      row4["last_error"],
      "Aucun run depuis 400.0 h (seuil : 192 h) — le cron ne se déclenche plus")
# La colonne n'existe pas dans pipeline_health (migrations 023 + 032) : l'y
# envoyer ferait echouer tout l'upsert en PGRST204. Le seuil sert au verdict
# et a la phrase de cause, il ne transite pas en base.
check("aucune colonne inconnue n'est envoyee a PostgREST",
      "max_run_age_hours" in row4, False)

row5 = ph.build_row(
    {"id": "z", "name": "Z", "remote": False,
     "health": {"domain": "veille_ia", "panels": ["brief"], "table": "articles",
                "max_run_age_hours": 192}},
    OK_RUN, last_seen=None, age_hours=99.0, status="stale", now="NOW",
    run_age_hours=2.0)
check("run recent : la cause reste la table qui ne bouge plus",
      row5["last_error"], "Runs au vert mais articles n'a rien reçu depuis 99.0 h")


print("-- build_row : le compteur d'echecs ne se fait pas passer pour exact")

PLAFOND = {**KO_RUN, "consecutive_failures": ph.RUNS_TO_INSPECT}
row6 = ph.build_row({"id": "t", "name": "T", "remote": False,
                     "health": {"domain": "perso", "panels": ["gaming"]}},
                    PLAFOND, last_seen=None, age_hours=None, status="failing", now="NOW")
check("au plafond, le libelle dit 'au moins'",
      f"au moins {ph.RUNS_TO_INSPECT}" in row6["last_error"], True)
row7 = ph.build_row({"id": "t", "name": "T", "remote": False,
                     "health": {"domain": "perso", "panels": ["gaming"]}},
                    KO_RUN, last_seen=None, age_hours=None, status="failing", now="NOW")
check("sous le plafond, le chiffre est donne tel quel",
      row7["last_error"], "Dernier run : failure (3 échecs d'affilée)")


print("-- collect_run_info : 15 runs ne valent pas 'n'a jamais reussi'")

QUE_DES_ECHECS = [{"conclusion": "failure", "html_url": "u",
                   "updated_at": f"2026-08-{d:02d}T06:00:00+00:00"}
                  for d in range(20, 20 - ph.RUNS_TO_INSPECT, -1)]
calls = []
real_runs, real_success = ph.github_runs, ph.github_last_success
ph.github_runs = lambda repo, tok, wf: (calls.append("runs") or QUE_DES_ECHECS)
ph.github_last_success = lambda repo, tok, wf: (calls.append("success")
                                                or "2026-04-24T06:00:00+00:00")
try:
    info = ph.collect_run_info("o/r", "tok", "tft_sync.yml")
    check("la fenetre est saturee", info["consecutive_failures"], ph.RUNS_TO_INSPECT)
    check("le vrai dernier succes est retrouve hors fenetre",
          info["last_success_at"], "2026-04-24T06:00:00+00:00")
    check("un seul appel supplementaire, cible", calls, ["runs", "success"])

    calls.clear()
    ph.github_runs = lambda repo, tok, wf: (
        calls.append("runs") or [{"conclusion": "success",
                                  "updated_at": "2026-08-20T06:00:00+00:00"}])
    info = ph.collect_run_info("o/r", "tok", "daily.yml")
    check("un succes dans la fenetre => pas d'appel de rattrapage", calls, ["runs"])
    check("le succes de la fenetre est conserve",
          info["last_success_at"], "2026-08-20T06:00:00+00:00")

    calls.clear()
    ph.github_runs = lambda repo, tok, wf: calls.append("runs") or []
    info = ph.collect_run_info("o/r", "tok", "muet.yml")
    check("API muette => aucun rattrapage a l'aveugle", calls, ["runs"])
    check("et last_success_at reste None", info["last_success_at"], None)
finally:
    ph.github_runs, ph.github_last_success = real_runs, real_success


print("-- previous_degraded : l'etat d'AVANT l'upsert")

captured.clear()

def fake_get_prev(url, headers=None, params=None, timeout=None):
    captured["url"] = url
    captured["params"] = dict(params or {})
    return FakeResp([{"pipeline_id": "tft_sync"}, {"pipeline_id": "weekly_analysis"}])

ph.requests.get = fake_get_prev
try:
    check("les degrades precedents sont lus",
          ph.previous_degraded("https://sb.test", "key"), {"tft_sync", "weekly_analysis"})
    check("seuls failing et stale comptent",
          captured["params"].get("status"), "in.(failing,stale)")
    check("lu sur pipeline_health",
          captured["url"], "https://sb.test/rest/v1/pipeline_health")
finally:
    ph.requests.get = real_get


def boom(*args, **kwargs):
    raise ph.requests.RequestException("Supabase muet")

ph.requests.get = boom
try:
    # « Je ne sais pas » et « rien n'etait degrade » ne mènent pas a la meme
    # conclusion : confondre les deux notifierait chaque brique deja connue.
    check("lecture impossible => None, surtout pas un ensemble vide",
          ph.previous_degraded("https://sb.test", "key"), None)
finally:
    ph.requests.get = real_get


print("-- prune_health : la ligne d'un pipeline retire du catalogue disparait")

deleted = {}
real_delete = ph.requests.delete


def fake_delete(url, headers=None, params=None, timeout=None):
    deleted["url"] = url
    deleted["params"] = dict(params or {})
    return FakeResp([{"pipeline_id": "tft_sync"}])


ph.requests.delete = fake_delete
try:
    removed = ph.prune_health("https://sb.test", "key",
                              ["daily_digest", "backup_supabase"])
    check("la ligne orpheline est effacee et signalee", removed, ["tft_sync"])
    check("le filtre epargne le catalogue actif",
          deleted["params"].get("pipeline_id"),
          'not.in.("backup_supabase","daily_digest")')
    check("efface sur pipeline_health",
          deleted["url"], "https://sb.test/rest/v1/pipeline_health")

    # Garde-fou : YAML illisible ou cle renommee => catalogue vide. Purger
    # serait effacer TOUTE la table sans savoir ce qu'on efface.
    deleted.clear()
    check("catalogue vide => rien n'est supprime",
          ph.prune_health("https://sb.test", "key", []), [])
    check("aucune requete DELETE emise", deleted, {})

    deleted.clear()
    check("catalogue reduit a des ids vides => rien n'est supprime",
          ph.prune_health("https://sb.test", "key", [None, ""]), [])
    check("toujours aucune requete DELETE", deleted, {})

    ph.requests.delete = boom
    check("PostgREST muet => on n'explose pas, on ne ment pas",
          ph.prune_health("https://sb.test", "key", ["daily_digest"]), [])
finally:
    ph.requests.delete = real_delete


print()
if failures:
    print(f"{failures} echec(s)")
    sys.exit(1)
print("Tous les checks passent.")
