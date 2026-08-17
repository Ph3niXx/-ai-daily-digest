"""Un flux RSS mort doit se voir. feedparser ne le dit pas tout seul.

C'est le piège central : `feedparser.parse()` ne lève JAMAIS d'exception sur un
404, un 410, un domaine disparu ou une redirection vers une page HTML. Il rend
un objet parfaitement normal avec `bozo=1` et `entries == []`. Le `try/except`
qui entourait la boucle de `fetch_recent_articles` était donc inatteignable pour
le cas le plus fréquent, et un flux qui déménage disparaissait en silence.

Conséquence mesurée le 2026-08-17 : 16 des 43 sources déclarées ne produisent
plus rien — dont Anthropic News, Mistral AI et The Batch — sans qu'aucun run
n'ait jamais signalé quoi que ce soit. La ligne « LLMs, Énergie souvent à 0 »
de CLAUDE.md attribuait ça à un rythme de publication : c'étaient des flux morts.

Run: python tests/test_rss_dead_feeds.py
"""
import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for var in ("GEMINI_API_KEY", "GMAIL_ADDRESS", "GMAIL_APP_PASSWORD",
            "RECIPIENT_EMAIL", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"):
    os.environ.setdefault(var, "test")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# main.py tire google.genai et feedparser au chargement. `feed_failure` est de la
# logique pure qui n'a besoin ni de l'un ni de l'autre, et la CI n'installe que
# `requests` pour les tests Python — on neutralise les imports plutôt que
# d'alourdir le job. Même motif que tests/test_jp_vocab.py.
import types  # noqa: E402

if "google" not in sys.modules:
    google = types.ModuleType("google")
    genai = types.ModuleType("google.genai")
    genai.Client = object
    # main.py fait aussi `from google.genai import types as genai_types` :
    # le sous-module doit exister dans sys.modules, pas seulement l'attribut.
    genai_types = types.ModuleType("google.genai.types")
    genai.types = genai_types
    google.genai = genai
    sys.modules["google"] = google
    sys.modules["google.genai"] = genai
    sys.modules["google.genai.types"] = genai_types

if "feedparser" not in sys.modules:
    feedparser = types.ModuleType("feedparser")
    feedparser.parse = lambda *a, **k: None
    sys.modules["feedparser"] = feedparser

import main  # noqa: E402

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        print(f"  FAIL {name}\n       attendu: {expected!r}\n       obtenu : {got!r}")
        failures += 1
    else:
        print(f"  ok   {name}")


class FakeFeed:
    """Reproduit ce que feedparser rend vraiment — y compris sur un flux mort."""

    def __init__(self, entries=(), status=None, bozo_exception=None):
        self.entries = list(entries)
        if status is not None:
            self.status = status
        if bozo_exception is not None:
            self.bozo_exception = bozo_exception


print("-- flux sain")

check("200 avec des entrees => pas d'echec",
      main.feed_failure(FakeFeed(entries=[{"title": "a"}], status=200)), None)
check("un flux sans attribut status mais avec des entrees passe",
      main.feed_failure(FakeFeed(entries=[{"title": "a"}])), None)

print("-- flux mort : le cas que le try/except ne pouvait pas voir")

# feedparser rend un objet NORMAL ici : pas d'exception, juste entries vide.
for status in (404, 410, 403, 500):
    got = main.feed_failure(FakeFeed(entries=[], status=status))
    check(f"HTTP {status} est signale", got, f"HTTP {status}")

check("redirection vers du HTML (200, 0 entree) est signalee",
      main.feed_failure(FakeFeed(
          entries=[], status=200,
          bozo_exception="text/html; charset=utf-8 is not an XML media type")),
      "0 entrée (text/html; charset=utf-8 is not an XML media type)")

check("0 entree sans diagnostic est quand meme signale",
      main.feed_failure(FakeFeed(entries=[], status=200)), "0 entrée")

print("-- un 4xx qui rend quand meme des entrees reste un echec")

# Un flux qui redirige en 404 vers une page d'erreur contenant du XML parasite
# ne doit pas passer pour vivant sous pretexte que feedparser a extrait
# quelque chose : le statut tranche en premier.
check("HTTP 404 prime sur des entrees residuelles",
      main.feed_failure(FakeFeed(entries=[{"title": "404 Not Found"}], status=404)),
      "HTTP 404")

print("-- le cliquet")

check("MAX_DEAD_FEEDS est defini", isinstance(main.MAX_DEAD_FEEDS, int), True)
check("le cliquet correspond au socle mesure le 2026-08-17", main.MAX_DEAD_FEEDS, 16)
check("le cliquet est sous le nombre de flux declares",
      main.MAX_DEAD_FEEDS < len(main.RSS_FEEDS), True)

print()
if failures:
    print(f"{failures} echec(s)")
    sys.exit(1)
print("Tous les checks passent.")
