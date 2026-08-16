"""clean_words est le garde-fou anti-hallucination de jp_vocab_sync.

Le modèle peut produire un mot japonais parfaitement plausible qui n'est pas
dans le titre. C'est invérifiable à l'œil et ça pollue durablement la base,
donc la règle est mécanique : tout mot absent du titre natif est jeté.

Run: python tests/test_jp_vocab.py
"""
import sys

# La console Windows est en cp1252 : sans ca, un caractere hors Latin-1 dans un
# libelle de check fait planter le test au print, alors qu'il est en train de reussir.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))

# jp_vocab_sync importe google.genai au chargement ; on ne veut pas de cette
# dépendance pour tester de la logique pure. On neutralise l'import.
import types  # noqa: E402
if "google" not in sys.modules:
    google = types.ModuleType("google")
    genai = types.ModuleType("google.genai")
    genai.Client = object
    google.genai = genai
    sys.modules["google"] = google
    sys.modules["google.genai"] = genai

from jp_vocab_sync import clean_words, safe_json_parse  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


NATIVE = "無職転生 ～異世界行ったら本気だす～"


def w(word, meaning="sens", reading="よみ", romaji="yomi"):
    return {"word": word, "reading": reading, "romaji": romaji, "meaning_fr": meaning}


# ── Le garde-fou central ────────────────────────────────────────
check("mot présent dans le titre → gardé",
      [x["word"] for x in clean_words([w("転生")], NATIVE)],
      ["転生"])

check("mot absent du titre → jeté (hallucination)",
      clean_words([w("勇者")], NATIVE),
      [])

check("tri le bon grain de l'ivraie dans un même lot",
      [x["word"] for x in clean_words([w("異世界"), w("魔法"), w("本気")], NATIVE)],
      ["異世界", "本気"])

# ── Robustesse d'entrée ─────────────────────────────────────────
check("entrée non-liste → vide", clean_words({"word": "転生"}, NATIVE), [])
check("entrée None → vide", clean_words(None, NATIVE), [])
check("élément non-dict ignoré", clean_words(["転生", w("転生")], NATIVE)[0]["word"], "転生")
check("mot vide → jeté", clean_words([w("")], NATIVE), [])
check("sens vide → jeté", clean_words([w("転生", meaning="")], NATIVE), [])
check("doublon → dédupliqué", len(clean_words([w("転生"), w("転生")], NATIVE)), 1)

check("plafonné à 5 mots",
      len(clean_words([w(c) for c in "無職転生異世界行本気"], NATIVE)),
      5)

check("sort_order séquentiel",
      [x["sort_order"] for x in clean_words([w("転生"), w("異世界"), w("本気")], NATIVE)],
      [0, 1, 2])

check("reading vide → None (pas chaîne vide)",
      clean_words([w("転生", reading="")], NATIVE)[0]["reading"],
      None)

# ── Parsing de la réponse modèle ────────────────────────────────
check("JSON nu", safe_json_parse('[{"word":"転生"}]'), [{"word": "転生"}])
check("JSON en bloc ```json", safe_json_parse('```json\n[{"word":"転生"}]\n```'), [{"word": "転生"}])
check("JSON en bloc ``` nu", safe_json_parse('```\n[]\n```'), [])
check("JSON invalide → None", safe_json_parse("désolé, je ne peux pas"), None)
check("vide → None", safe_json_parse(""), None)

print()
if failures:
    print(f"{failures} test(s) en échec")
    sys.exit(1)
print("tous les tests passent")
