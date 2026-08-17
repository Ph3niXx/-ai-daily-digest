"""Un run hebdo à zéro appel réussi n'est pas un succès.

Contexte (audit du 2026-08-15) : entre le 2026-07-12 et le 2026-08-16, les cinq
runs dominicaux ont tous affiché un coche vert dans GitHub Actions en n'écrivant
rien. Les logs disent pourquoi — 7 fois par run :

    [ERROR] Claude API: 400 {"type":"invalid_request_error","message":
     "Your credit balance is too low to access the Anthropic API."}

Deux défauts distincts, un test chacun :

1. `call_claude` renvoyait None sur toute réponse non-200, sans distinguer un
   refus DÉFINITIF (crédit épuisé, clé invalide, permissions) d'un incident
   TRANSITOIRE (429, 5xx). Le run enchaînait donc ses 7 appels alors que le
   premier avait déjà tranché.
2. `main()` ne propageait aucun code de sortie, donc rien — ni Actions, ni
   pipeline_health côté conclusion de run — ne pouvait voir la panne.

Run: python tests/test_weekly_analysis_failfast.py
"""
import os
import sys
from pathlib import Path

# La console Windows est en cp1252 : sans ca, un caractere hors Latin-1 dans un
# libelle de check fait planter le test au print, alors qu'il est en train de reussir.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# weekly_analysis.py lit ses secrets au chargement du module.
os.environ.setdefault("ANTHROPIC_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "https://example.invalid")
os.environ.setdefault("SUPABASE_SERVICE_KEY", "test-key")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import weekly_analysis as wa  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        print(f"  FAIL {name}\n       attendu: {expected!r}\n       obtenu : {got!r}")
        failures += 1
    else:
        print(f"  ok   {name}")


class FakeResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text

    def json(self):
        return {}


class FakePost:
    """Renvoie une réponse fixe et compte les requêtes réellement émises."""

    def __init__(self, status_code, text):
        self.response = FakeResponse(status_code, text)
        self.count = 0

    def __call__(self, *args, **kwargs):
        self.count += 1
        return self.response


CREDIT_400 = (
    '{"type":"error","error":{"type":"invalid_request_error","message":'
    '"Your credit balance is too low to access the Anthropic API. '
    'Please go to Plans & Billing to upgrade or purchase credits."}}'
)


def fresh_tracker():
    wa.tracker = wa.CostTracker(wa.MAX_COST_PER_RUN)
    return wa.tracker


print("-- refus definitif : credit epuise (le cas reel du 2026-07-19)")

tracker = fresh_tracker()
post = FakePost(400, CREDIT_400)
wa.requests.post = post

check("call_claude rend None", wa.call_claude("sys", "user"), None)
check("une seule requete emise", post.count, 1)
check("le run est marque fatal", tracker.fatal, True)
check("la cause est conservee", "credit balance" in (tracker.last_error or "").lower(), True)

# Le coeur du correctif : les 6 etapes suivantes ne doivent plus rien tenter.
check("can_continue passe a False", tracker.can_continue, False)
check("l'appel suivant ne part pas sur le reseau", wa.call_claude("sys", "user"), None)
check("toujours une seule requete au total", post.count, 1)

print("-- clef invalide (401) et permissions (403) sont aussi definitifs")

for status in (401, 403):
    tracker = fresh_tracker()
    post = FakePost(status, '{"type":"error","error":{"type":"authentication_error"}}')
    wa.requests.post = post
    wa.call_claude("sys", "user")
    check(f"HTTP {status} est fatal", tracker.fatal, True)

print("-- incident transitoire : le run peut continuer")

for status in (429, 500, 529):
    tracker = fresh_tracker()
    post = FakePost(status, '{"type":"error","error":{"type":"rate_limit_error"}}')
    wa.requests.post = post
    wa.call_claude("sys", "user")
    check(f"HTTP {status} n'est PAS fatal", tracker.fatal, False)
    check(f"HTTP {status} laisse can_continue", tracker.can_continue, True)

print("-- un 400 qui n'est pas un probleme de facturation reste local a l'appel")

tracker = fresh_tracker()
post = FakePost(400, '{"error":{"message":"max_tokens: must be <= 8192"}}')
wa.requests.post = post
wa.call_claude("sys", "user")
check("400 hors facturation n'est pas fatal", tracker.fatal, False)

print("-- code de sortie du run")

tracker = fresh_tracker()
check("zero appel reussi => sortie 1", wa.run_exit_code(tracker), 1)

tracker = fresh_tracker()
tracker.add(100, 50)
check("au moins un appel reussi => sortie 0", wa.run_exit_code(tracker), 0)

tracker = fresh_tracker()
tracker.add(100, 50)
tracker.mark_fatal(400, "credit balance too low")
check("un refus definitif => sortie 1 meme avec des appels reussis", wa.run_exit_code(tracker), 1)

print()
if failures:
    print(f"{failures} echec(s)")
    sys.exit(1)
print("Tous les checks passent.")
