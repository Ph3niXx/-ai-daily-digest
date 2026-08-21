"""clean_picks est le garde-fou de la sélection de veille.

Un id d'article inventé est indétectable à l'œil et produirait une ligne
orpheline. La contrainte de clé étrangère finirait par la rejeter, mais
l'échec arriverait à l'écriture, loin de sa cause. On tranche ici.

Run: python tests/test_veille_picks.py
"""
import sys

# La console Windows est en cp1252 : sans ca, un caractere hors Latin-1 dans un
# libelle de check fait planter le test au print, alors qu'il est en train de reussir.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
import io
import os
import types
from contextlib import redirect_stdout
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))

# On ne veut pas de la dépendance google-genai pour tester de la logique pure.
if "google" not in sys.modules:
    google = types.ModuleType("google")
    genai = types.ModuleType("google.genai")
    genai.Client = object
    google.genai = genai
    sys.modules["google"] = google
    sys.modules["google.genai"] = genai

import veille_picks  # noqa: E402
from veille_picks import clean_picks, safe_json_parse, build_pick_prompt  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


ARTICLES = [
    {"id": "aaa", "title": "A", "summary": "s", "section": "llm", "source": "X"},
    {"id": "bbb", "title": "B", "summary": "s", "section": "agents", "source": "Y"},
    {"id": "ccc", "title": "C", "summary": "s", "section": "llm", "source": "Z"},
    {"id": "ddd", "title": "D", "summary": "s", "section": "reg", "source": "W"},
]


def p(aid, why="parce que", conf="high"):
    return {"id": aid, "why": why, "confidence": conf}


# ── Le garde-fou central ────────────────────────────────────────
check("id réel → gardé", [x["article_id"] for x in clean_picks([p("aaa")], ARTICLES)], ["aaa"])
check("id inventé → jeté", clean_picks([p("zzz")], ARTICLES), [])
check("tri dans un lot mixte",
      [x["article_id"] for x in clean_picks([p("aaa"), p("zzz"), p("ccc")], ARTICLES)],
      ["aaa", "ccc"])

# ── Rangs ───────────────────────────────────────────────────────
check("rang recalculé après rejet, sans trou",
      [x["rank"] for x in clean_picks([p("zzz"), p("aaa"), p("bbb")], ARTICLES)],
      [1, 2])
check("rangs séquentiels depuis 1",
      [x["rank"] for x in clean_picks([p("aaa"), p("bbb"), p("ccc")], ARTICLES)],
      [1, 2, 3])

# ── Robustesse ──────────────────────────────────────────────────
check("plafonné à 3 picks",
      len(clean_picks([p("aaa"), p("bbb"), p("ccc"), p("ddd")], ARTICLES)), 3)
check("doublon dédupliqué", len(clean_picks([p("aaa"), p("aaa")], ARTICLES)), 1)
check("why vide → jeté", clean_picks([p("aaa", why="")], ARTICLES), [])
check("entrée non-liste → vide", clean_picks({"id": "aaa"}, ARTICLES), [])
check("entrée None → vide", clean_picks(None, ARTICLES), [])
check("élément non-dict ignoré", len(clean_picks(["aaa", p("bbb")], ARTICLES)), 1)
check("confidence invalide → None",
      clean_picks([p("aaa", conf="énorme")], ARTICLES)[0]["confidence"], None)
check("confidence absente → None",
      clean_picks([{"id": "aaa", "why": "w"}], ARTICLES)[0]["confidence"], None)
check("moins de 3 picks accepté (journée faible)",
      len(clean_picks([p("aaa")], ARTICLES)), 1)

# ── Parsing ─────────────────────────────────────────────────────
check("JSON nu", safe_json_parse('[{"id":"aaa"}]'), [{"id": "aaa"}])
check("bloc ```json", safe_json_parse('```json\n[{"id":"aaa"}]\n```'), [{"id": "aaa"}])
check("JSON invalide → None", safe_json_parse("je ne peux pas"), None)

# ── Prompt : le profil et les votes arrivent bien dedans ────────
prompt = build_pick_prompt(
    [{"key": "ambitions", "value": "devenir expert IA"},
     {"key": "lastfm_api_key", "value": "SECRET_A_NE_PAS_FUIR"}],
    "tu rejettes les levées de fonds",
    [{"verdict": "down", "reason": "shallow", "_title": "Un article creux"}],
    ARTICLES)
check("le profil utile est dans le prompt", "devenir expert IA" in prompt, True)
check("les règles apprises sont dans le prompt", "tu rejettes les levées de fonds" in prompt, True)
check("la raison du vote est traduite en clair", "trop superficiel" in prompt, True)
check("les articles du jour sont dans le prompt", "id=aaa" in prompt, True)
# Les clés du profil sont filtrées par une liste blanche : sans ça, les clés
# d'API stockées dans user_profile (lastfm, tmdb…) partiraient chez Gemini.
check("les secrets du profil ne fuient PAS dans le prompt",
      "SECRET_A_NE_PAS_FUIR" in prompt, False)


# ── Codes de sortie : deux vides qui ne veulent pas dire la même chose ──
# La table `articles` vide, c'est daily_digest qui n'a rien écrit : la sélection
# ne PEUT pas tourner. Sortir 0 sur ce cas a laissé veille_picks vert tous les
# jours à partir du 2026-08-18, alors que son amont était mort ; seule la sonde
# de fraîcheur de pipeline_health l'a vu.


class _FakeResp:
    def __init__(self, text):
        self.text = text


class _FakeModels:
    def __init__(self, text):
        self._text = text

    def generate_content(self, model=None, contents=None):
        return _FakeResp(self._text)


class _FakeClient:
    def __init__(self, text):
        self.models = _FakeModels(text)


def run_main(articles, gemini_text):
    """Exécute main() sans réseau et rend (code de sortie, sortie console).

    main() n'a aucun point d'injection : on substitue les noms importés dans le
    module puis on restaure. C'est le seul moyen de verrouiller un code de
    sortie sans refondre le pipeline.
    """
    saved_argv = sys.argv
    saved_env, saved_get, saved_client = veille_picks.sb_env, veille_picks.sb_get, veille_picks.genai.Client
    saved_key = os.environ.get("GEMINI_API_KEY")

    def fake_sb_get(url, headers, table, qs):
        return articles if table == "articles" else []

    sys.argv = ["veille_picks.py", "--dry-run"]
    veille_picks.sb_env = lambda: ("https://fake.supabase.co", {})
    veille_picks.sb_get = fake_sb_get
    veille_picks.genai.Client = lambda api_key=None: _FakeClient(gemini_text)
    os.environ["GEMINI_API_KEY"] = "fake-key"
    buf = io.StringIO()
    try:
        with redirect_stdout(buf):
            code = veille_picks.main()
    finally:
        sys.argv = saved_argv
        veille_picks.sb_env, veille_picks.sb_get = saved_env, saved_get
        veille_picks.genai.Client = saved_client
        if saved_key is None:
            os.environ.pop("GEMINI_API_KEY", None)
        else:
            os.environ["GEMINI_API_KEY"] = saved_key
    return code, buf.getvalue()


code_amont, out_amont = run_main([], "[]")
check("aucun article du jour → code 1 (l'amont est mort)", code_amont, 1)
check("… et le message nomme la cause probable", "daily_digest" in out_amont, True)

code_sterile, out_sterile = run_main(ARTICLES, "[]")
check("articles présents mais aucun pick → code 1 (sélection stérile)", code_sterile, 1)
check("… sans accuser daily_digest, qui a bien livré",
      "daily_digest" in out_sterile, False)

code_ok, _ = run_main(ARTICLES, '[{"id":"aaa","why":"tu suis ce modèle","confidence":"high"}]')
check("journée nominale → code 0", code_ok, 0)

print()
if failures:
    print(f"{failures} test(s) en échec")
    sys.exit(1)
print("tous les tests passent")
