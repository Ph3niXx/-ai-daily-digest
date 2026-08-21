"""Ce que disent strava_sync et withings_sync quand ça casse.

Ces deux pipelines sont en panne côté fournisseur et aucun correctif de code ne
les rallumera. Ce qui reste sous notre contrôle, c'est ce qu'ils racontent :

  - un message d'erreur qui contient une date en dur devient faux le jour où la
    panne est réparée, et personne ne relit un message d'erreur pour le corriger ;
  - un chemin qui rend None sans rien dire fait payer au diagnostic un
    aller-retour SQL pour distinguer « pas encore de token » de « Supabase a
    refusé la lecture », deux situations qui appellent des gestes contraires.

Aucun appel réseau : on substitue le module `requests` vu par le pipeline.

Run: python tests/test_strava_withings_errors.py
"""
import io
import re
import sys
import types
from contextlib import redirect_stdout
from pathlib import Path

# La console Windows est en cp1252 : sans ca, un caractere hors Latin-1 dans un
# libelle de check fait planter le test au print, alors qu'il est en train de reussir.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

import requests  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))

import strava_sync  # noqa: E402
import withings_sync  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


class FakeResponse:
    """Réponse HTTP minimale : uniquement ce que les deux pipelines en lisent."""

    def __init__(self, status_code, text="", payload=None, headers=None):
        self.status_code = status_code
        self.text = text
        self.headers = headers or {}
        self._payload = payload

    def json(self):
        return self._payload

    def raise_for_status(self):
        if self.status_code >= 400:
            raise requests.HTTPError(f"HTTP {self.status_code}")


def run_with(module, thunk, **handlers):
    """Exécute `thunk` avec un faux module requests, et rend (valeur, erreur, log).

    Les exceptions sont capturées plutôt que propagées : ici le message EST le
    sujet du test, pas un effet de bord de l'échec.

    RequestException et HTTPError restent les vraies classes — les pipelines les
    attrapent par identité, un doublon les rendrait inattrapables.
    """
    fake = types.SimpleNamespace(
        RequestException=requests.RequestException,
        HTTPError=requests.HTTPError,
    )
    for verb, fn in handlers.items():
        setattr(fake, verb, fn)

    saved = module.requests
    module.requests = fake
    buf = io.StringIO()
    value, error = None, None
    try:
        with redirect_stdout(buf):
            value = thunk()
    except Exception as exc:
        error = exc
    finally:
        module.requests = saved
    return value, error, buf.getvalue()


# ── Strava : le 403 doit donner une instruction, pas un récit ────
# Corps réels renvoyés par Strava, recopiés tels quels.
APP_INACTIVE = ('{"message":"Forbidden","errors":[{"resource":"Application",'
                '"field":"Status","code":"Inactive"}]}')
SCOPE_MISSING = ('{"message":"Authorization Error","errors":[{"resource":"AccessToken",'
                 '"field":"activity:read_permission","code":"missing"}]}')


def strava_403(body):
    return run_with(
        strava_sync,
        lambda: strava_sync.strava_get("token", "/athlete/activities"),
        get=lambda *a, **k: FakeResponse(403, text=body,
                                         headers={"X-RateLimit-Usage": "3,42",
                                                  "X-RateLimit-Limit": "100,1000"}),
    )


_, err_inactive, _ = strava_403(APP_INACTIVE)
msg = str(err_inactive)
check("403 → RuntimeError", isinstance(err_inactive, RuntimeError), True)
check("le corps Strava est conservé (c'est lui qui porte le diagnostic)",
      "Inactive" in msg, True)
check("l'application désactivée nomme le portail à ouvrir",
      "strava.com/settings/api" in msg, True)
check("… et prévient qu'une ré-autorisation OAuth n'y changera rien",
      "OAuth" in msg, True)
# Le contexte date appartient à docs/architecture/pipelines.yaml : dans le
# message, il devient faux dès la réactivation de l'application.
check("aucune date en dur dans le message",
      re.search(r"20\d\d-\d\d-\d\d", msg), None)
# « les deux branches ci-dessus ne le couvraient pas » commente le code au
# lecteur au lieu de lui dire quoi faire.
check("pas de phrase auto-référentielle sur le message lui-même",
      "ci-dessus" in msg, False)
check("la piste scope reste proposée", "strava_oauth_init.py" in msg, True)
check("le quota du jour reste affiché", "3,42" in msg, True)

_, err_scope, _ = strava_403(SCOPE_MISSING)
check("403 scope : le corps nomme toujours la permission manquante",
      "activity:read_permission" in str(err_scope), True)

_, err_401, _ = run_with(
    strava_sync, lambda: strava_sync.strava_get("token", "/athlete/activities"),
    get=lambda *a, **k: FakeResponse(401, text="Unauthorized"))
check("401 → relancer l'init OAuth", "strava_oauth_init.py" in str(err_401), True)

payload, err_200, _ = run_with(
    strava_sync, lambda: strava_sync.strava_get("token", "/athlete/activities"),
    get=lambda *a, **k: FakeResponse(200, payload=[{"id": 1}]))
check("200 → payload rendu tel quel", payload, [{"id": 1}])
check("200 → pas d'erreur", err_200, None)


# ── Withings : lire le token doit dire POURQUOI il n'y en a pas ──

def withings_load(response=None, raiser=None):
    def _get(*a, **k):
        if raiser:
            raise raiser
        return response
    return run_with(
        withings_sync,
        lambda: withings_sync.load_refresh_token_from_supabase("https://x", "key"),
        get=_get)


tok, _, out = withings_load(FakeResponse(200, payload=[{"value": "tok-42"}]))
check("token en base → rendu", tok, "tok-42")
check("… et le log le dit", "user_profile" in out, True)

tok, _, out = withings_load(FakeResponse(200, payload=[]))
check("aucune ligne en base → None", tok, None)
check("… le log dit qu'aucun token n'est stocké", "aucun" in out.lower(), True)
check("… et annonce le repli sur le secret GitHub", "secret GitHub" in out, True)
check("… en rappelant qu'il n'est valable qu'une fois", "une seule fois" in out, True)

tok, _, out = withings_load(FakeResponse(200, payload=[{"value": ""}]))
check("ligne présente mais valeur vide → traitée comme absente", tok, None)
check("… avec le même log qu'un token absent", "secret GitHub" in out, True)

tok, _, out = withings_load(FakeResponse(401, text="JWT expired"))
check("lecture refusée par Supabase → None", tok, None)
check("… le log donne le code HTTP", "401" in out, True)
# Sans ça, 401 et « pas encore de token » produisaient le même silence, alors
# que l'un demande de réparer la clé et l'autre de lancer l'OAuth.
check("… et ne parle pas de repli nominal", "secret GitHub" in out, False)

tok, _, out = withings_load(raiser=requests.RequestException("DNS"))
check("erreur réseau → None", tok, None)
check("… avec un warning", "WARNING" in out, True)


# ── Withings : écrire le token ne doit jamais échouer en silence ──
_, err_save, out = run_with(
    withings_sync,
    lambda: withings_sync.save_refresh_token_to_supabase("https://x", "key", "tok"),
    post=lambda *a, **k: FakeResponse(204))
check("écriture acceptée → pas d'exception", err_save, None)
check("… et confirmation loggée", "user_profile" in out, True)

_, err_save, out = run_with(
    withings_sync,
    lambda: withings_sync.save_refresh_token_to_supabase("https://x", "key", "tok"),
    post=lambda *a, **k: FakeResponse(500, text="boom"))
check("écriture refusée → exception (le token vient d'être consommé)",
      isinstance(err_save, RuntimeError), True)
check("… avec le code HTTP", "500" in str(err_save), True)
check("… et le remède", "withings_oauth_init.py" in str(err_save), True)

print()
if failures:
    print(f"{failures} test(s) en échec")
    sys.exit(1)
print("tous les tests passent")
