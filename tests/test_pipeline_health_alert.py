"""L'alerte GitHub doit être unique, silencieuse au vert, et sans spam.

Le bandeau front existait déjà mais s'affiche sur l'onglet propriétaire du
pipeline — donc, pour les pipelines en panne, sur des onglets désertés. Le canal
hors cockpit est une issue GitHub, tenue à jour par le contrôle quotidien.

Quatre invariants, parce que chacun a une façon différente de mal tourner :

1. Cron quotidien ⇒ commenter à chaque passage produirait ~365 notifications
   par an et l'alerte serait muette par saturation. Le corps est réécrit.
2. Mais GitHub ne notifie QUE sur création et sur commentaire : réécrire un
   corps ne prévient personne. L'issue #9, ouverte le 17/08 et parfaitement
   exacte, n'a alerté de rien — la panne du 18/08 est passée inaperçue. D'où
   le commentaire de TRANSITION : une notification quand l'ENSEMBLE des
   pipelines dégradés change, zéro le reste du temps.
3. Une seule issue, retrouvée par son titre exact — sinon on en accumule une
   par jour.
4. Retour au vert ⇒ fermeture automatique, sinon l'issue reste ouverte pour
   toujours et cesse de vouloir dire quelque chose.

Run: python tests/test_pipeline_health_alert.py
"""
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))

import pipeline_health as ph  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        print(f"  FAIL {name}\n       attendu: {expected!r}\n       obtenu : {got!r}")
        failures += 1
    else:
        print(f"  ok   {name}")


class FakeGitHub:
    """Enregistre les appels API et sert une liste d'issues ouvertes."""

    def __init__(self, open_issues=(), fail_list=False):
        self.open_issues = list(open_issues)
        self.fail_list = fail_list
        self.calls = []

    def __call__(self, method, repo, token, path, **kwargs):
        self.calls.append((method, path, kwargs.get("json")))
        if method == "GET" and path == "/issues":
            return None if self.fail_list else self.open_issues
        if method == "POST" and path == "/issues":
            return {"number": 42}
        return {}

    def paths(self, method=None):
        return [p for m, p, _ in self.calls if method is None or m == method]

    def body_of(self, method, path):
        for m, p, j in self.calls:
            if m == method and p == path:
                return (j or {}).get("body", "")
        return ""


ROWS = [
    {"pipeline_id": "weekly_analysis", "status": "stale",
     "last_error": "Runs au vert mais learning_recommendations n'a rien reçu depuis 779.1 h",
     "last_run_url": "https://github.test/run/1"},
    {"pipeline_id": "tft_sync", "status": "failing",
     "last_error": "Dernier run : failure (au moins 15 échecs d'affilée)",
     "last_run_url": "https://github.test/run/2"},
]

print("-- tout au vert, aucune issue ouverte")

gh = FakeGitHub()
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, [])
check("aucune issue creee", gh.paths("POST"), [])
check("aucune issue modifiee", gh.paths("PATCH"), [])

print("-- tout au vert, une issue trainait ouverte")

gh = FakeGitHub(open_issues=[{"number": 7, "title": ph.ALERT_TITLE}])
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, [])
check("un commentaire de cloture", gh.paths("POST"), ["/issues/7/comments"])
check("l'issue est fermee", gh.paths("PATCH"), ["/issues/7"])

print("-- pipelines degrades, aucune issue existante")

gh = FakeGitHub()
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, ["weekly_analysis", "tft_sync"])
check("une issue est creee", gh.paths("POST"), ["/issues"])
body = gh.body_of("POST", "/issues")
check("les deux pipelines sont cites", all(p in body for p in ("weekly_analysis", "tft_sync")), True)
check("la cause stale est reprise", "779.1 h" in body, True)
check("le lien du run est present", "https://github.test/run/2" in body, True)
check("le cas 'vert mais rien ecrit' est explique", "vert mais la table" in body, True)

print("-- etat precedent inconnu : on reecrit, on ne commente pas")

# Lecture de l'etat precedent impossible (Supabase muet). « Je ne sais pas »
# ne doit pas se comporter comme « rien n'etait degrade », sinon une panne de
# Supabase notifierait chaque brique deja connue comme un nouveau probleme.
gh = FakeGitHub(open_issues=[{"number": 7, "title": ph.ALERT_TITLE}])
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, ["tft_sync"], previously_degraded=None)
check("le corps est reecrit", gh.paths("PATCH"), ["/issues/7"])
check("aucun commentaire ajoute (anti-spam)", gh.paths("POST"), [])
check("aucune seconde issue creee", "/issues" in gh.paths("POST"), False)

print("-- l'ensemble degrade ne bouge pas : aucune notification")

gh = FakeGitHub(open_issues=[{"number": 7, "title": ph.ALERT_TITLE}])
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, ["tft_sync"], previously_degraded={"tft_sync"})
check("le corps est quand meme rafraichi", gh.paths("PATCH"), ["/issues/7"])
check("mais personne n'est notifie", gh.paths("POST"), [])

print("-- un pipeline ENTRE dans l'ensemble degrade : une notification, une seule")

gh = FakeGitHub(open_issues=[{"number": 7, "title": ph.ALERT_TITLE}])
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, ["weekly_analysis", "tft_sync"],
                    previously_degraded={"weekly_analysis"})
check("un commentaire, un seul", gh.paths("POST"), ["/issues/7/comments"])
comment = gh.body_of("POST", "/issues/7/comments")
check("l'entrant est nomme", "tft_sync" in comment, True)
check("sa cause est donnee", "au moins 15" in comment, True)
check("le deja-degrade n'est pas re-annonce comme entrant",
      comment.count("weekly_analysis"), 0)
check("le commentaire ne repete pas le tableau", "| Pipeline |" in comment, False)

print("-- un pipeline SORT de l'ensemble degrade : notification de sortie")

gh = FakeGitHub(open_issues=[{"number": 7, "title": ph.ALERT_TITLE}])
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, ["tft_sync"],
                    previously_degraded={"tft_sync", "weekly_analysis"})
check("un commentaire est poste", gh.paths("POST"), ["/issues/7/comments"])
comment = gh.body_of("POST", "/issues/7/comments")
check("le sortant est nomme", "weekly_analysis" in comment, True)
check("il est annonce comme repasse au vert", "vert" in comment, True)

print("-- creation d'issue : elle notifie deja par elle-meme, pas de commentaire")

gh = FakeGitHub()
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, ["tft_sync"], previously_degraded=set())
check("une issue creee et rien d'autre", gh.paths("POST"), ["/issues"])

print("-- une PR portant le meme titre ne doit pas etre confondue avec l'issue")

gh = FakeGitHub(open_issues=[{"number": 9, "title": ph.ALERT_TITLE, "pull_request": {}}])
ph._gh = gh
ph.sync_alert_issue("o/r", "tok", ROWS, ["tft_sync"])
check("une vraie issue est creee", gh.paths("POST"), ["/issues"])
check("la PR n'est pas modifiee", gh.paths("PATCH"), [])

print("-- API GitHub indisponible : on n'explose pas")

gh = FakeGitHub(fail_list=True)
ph._gh = gh
try:
    ph.sync_alert_issue("o/r", "tok", ROWS, ["tft_sync"])
    raised = False
except Exception:
    raised = True
check("aucune exception propagee", raised, False)
check("aucune ecriture tentee a l'aveugle", gh.paths("POST") + gh.paths("PATCH"), [])

print()
if failures:
    print(f"{failures} echec(s)")
    sys.exit(1)
print("Tous les checks passent.")
