"""Un flux RSS mort doit se voir — sans emporter la récolte du jour avec lui.

Deux pièges, l'un après l'autre.

1. `feedparser.parse()` ne lève JAMAIS d'exception sur un 404, un 410, un
   domaine disparu ou une redirection vers une page HTML. Il rend un objet
   parfaitement normal avec `bozo=1` et `entries == []`. Le `try/except` qui
   entourait la boucle de `fetch_recent_articles` était donc inatteignable pour
   le cas le plus fréquent, et un flux qui déménageait disparaissait en silence :
   16 des 43 sources déclarées ne produisaient plus rien le 2026-08-17 sans
   qu'aucun run n'ait jamais signalé quoi que ce soit.

2. Le garde-fou écrit ce jour-là levait au step 2/9 alors que la persistance est
   au step 7/9, et son socle (`MAX_DEAD_FEEDS = 16`) avait été mesuré en local
   quand le runner en voyait 17 : il n'est jamais passé au vert en production et
   il a jeté quatre récoltes complètes, dont 53 articles valides le 2026-08-21.
   Un compteur ne distingue pas non plus « 17 morts dont les 17 connus » de
   « 17 morts dont 3 nouveaux ».

D'où ce que ce fichier vérifie : la collecte ne lève plus, le verdict est rendu
par une fonction pure (`pipeline_verdict`) que `main()` appelle tout à la fin, et
les assertions portent sur le COMPORTEMENT, jamais sur la valeur du socle — un
test qui grave « la constante vaut 16 » ne détecte rien, il empêche seulement de
la corriger.

Aucun accès réseau : feedparser est neutralisé.

Run: python tests/test_rss_dead_feeds.py
"""
import contextlib
import inspect
import io
import os
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

for var in ("GEMINI_API_KEY", "GMAIL_ADDRESS", "GMAIL_APP_PASSWORD",
            "RECIPIENT_EMAIL", "SUPABASE_URL", "SUPABASE_SERVICE_KEY"):
    os.environ.setdefault(var, "test")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

# main.py tire google.genai et feedparser au chargement. `feed_failure` et
# `pipeline_verdict` sont de la logique pure qui n'a besoin ni de l'un ni de
# l'autre, et la CI n'installe que `requests` pour les tests Python — on
# neutralise les imports plutôt que d'alourdir le job. Même motif que
# tests/test_jp_vocab.py.
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

print("-- la collecte ne leve JAMAIS, quoi qu'elle trouve")

# Le coeur de la regression du 2026-08-21 : `fetch_recent_articles` levait au
# step 2/9 alors que les ecritures Supabase sont au step 7/9. Detecter n'est pas
# avorter — elle doit rendre (articles, dead) et laisser main() trancher apres
# avoir tout persiste.


def fake_parse_factory(alive_urls=()):
    """Un feedparser.parse hors-ligne : vivant pour alive_urls, 403 sinon."""
    alive = set(alive_urls)

    def parse(url, *a, **k):
        if url in alive:
            return FakeFeed(entries=[{"title": "vivant", "link": "http://x",
                                      "summary": "s"}], status=200)
        return FakeFeed(entries=[], status=403)

    return parse


def collect():
    """Appelle la collecte en avalant ses 43 lignes [DEAD], illisibles ici."""
    with contextlib.redirect_stdout(io.StringIO()):
        return main.fetch_recent_articles()


_real_parse = main.feedparser.parse
try:
    main.feedparser.parse = fake_parse_factory()  # 100 % de flux morts
    raised = None
    try:
        articles, dead = collect()
    except Exception as e:  # noqa: BLE001 — c'est precisement ce qu'on interdit
        raised = f"{type(e).__name__}: {e}"
        articles, dead = None, None
    check("43 flux morts sur 43 ne font pas lever la collecte", raised, None)
    check("elle rend une liste d'articles vide", articles, [])
    check("elle rend un tuple mort par flux declare",
          len(dead or []), len(main.RSS_FEEDS))
    check("chaque tuple mort est (section, nom, raison)",
          all(isinstance(t, tuple) and len(t) == 3 for t in (dead or [])), True)

    # Cas mixte : un seul flux vivant, la collecte doit quand meme rendre ses
    # articles au lieu de tout jeter a cause des 42 autres.
    main.feedparser.parse = fake_parse_factory([main.RSS_FEEDS[0][1]])
    articles, dead = collect()
    check("un flux vivant parmi des morts rend quand meme ses articles",
          len(articles) >= 1, True)
    check("et les morts restent comptes", len(dead), len(main.RSS_FEEDS) - 1)
finally:
    main.feedparser.parse = _real_parse

print("-- le verdict : socle nomme, pas compteur")

SOCLE = {"tools/Arize Blog", "energy/Utility Dive"}
DEAD_SOCLE = [("tools", "Arize Blog", "HTTP 403"),
              ("energy", "Utility Dive", "0 entrée")]
OK_COUNT = main.MIN_ARTICLES + 20


def verdict(article_count, dead, known=SOCLE):
    return main.pipeline_verdict(article_count, dead, known=known)


code, messages = verdict(OK_COUNT, DEAD_SOCLE)
check("dead == socle connu => pas d'echec", code, 0)
check("dead == socle connu => rien a signaler", messages, [])

code, messages = verdict(OK_COUNT, DEAD_SOCLE + [("llm", "Import AI", "HTTP 404")])
check("un mort de plus => echec", code, 1)
check("et le message NOMME le nouveau muet",
      any("llm/Import AI" in m for m in messages), True)
check("avec sa raison, pour ne pas avoir a rouvrir le log",
      any("HTTP 404" in m for m in messages), True)
check("sans accuser les morts deja connus",
      any("tools/Arize Blog" in m for m in messages if m.startswith("[ÉCHEC]")), False)

code, messages = verdict(OK_COUNT, DEAD_SOCLE[:1])
check("dead == socle - un nom => pas d'echec", code, 0)
check("mais on invite a nettoyer l'ensemble",
      any("KNOWN_DEAD_FEEDS" in m and "energy/Utility Dive" in m for m in messages),
      True)

print("-- le verdict : plancher de collecte")

code, messages = verdict(main.MIN_ARTICLES - 1, DEAD_SOCLE)
check("moins de MIN_ARTICLES => echec", code, 1)
check("avec le message de panne de collecte",
      any("Panne de collecte" in m for m in messages), True)

check("exactement MIN_ARTICLES passe",
      verdict(main.MIN_ARTICLES, DEAD_SOCLE)[0], 0)

# Les deux causes sont independantes : une collecte a plat le jour ou une source
# meurt doit rapporter les DEUX, pas la premiere rencontree.
code, messages = verdict(0, DEAD_SOCLE + [("llm", "Import AI", "HTTP 404")])
check("panne + regression => echec", code, 1)
check("panne + regression => les deux causes sont dites",
      (any("Panne de collecte" in m for m in messages),
       any("llm/Import AI" in m for m in messages)), (True, True))

print("-- le verdict est imprime, et rendu APRES les ecritures")

# La glue : main() doit propager le code de sortie ET dire pourquoi. Un verdict
# qui rougit sans nommer la cause renvoie a la lecture de 43 lignes de log.
buf = io.StringIO()
with contextlib.redirect_stdout(buf):
    code = main.report_verdict(0, [])
printed = buf.getvalue()
check("report_verdict rend le code de sortie", code, 1)
check("report_verdict imprime la cause",
      "Panne de collecte" in printed, True)

# L'invariant qui a coute quatre jours de veille : le verdict se rend une fois
# les 9 steps passes, pas au step 2/9. Verifie sur le source de main() faute de
# pouvoir l'executer sans reseau — c'est l'ordre des lignes qui fait la garantie.
src_main = inspect.getsource(main.main)
check("la collecte precede le step 7/9 (sauvegarde)",
      src_main.index("fetch_recent_articles") < src_main.index("Step 7/9"), True)
check("le verdict final vient apres le step 9/9 (email)",
      src_main.index("Step 9/9") < src_main.rindex("report_verdict("), True)

print("-- le socle par defaut")

check("KNOWN_DEAD_FEEDS est un ensemble de cles",
      isinstance(main.KNOWN_DEAD_FEEDS, set), True)
check("toutes ses cles sont au format section/nom",
      all(isinstance(k, str) and "/" in k for k in main.KNOWN_DEAD_FEEDS), True)
check("MIN_ARTICLES est un entier strictement positif",
      isinstance(main.MIN_ARTICLES, int) and main.MIN_ARTICLES > 0, True)
check("un run parfait (rien de mort, assez d'articles) sort vert",
      main.pipeline_verdict(OK_COUNT, []), (0, []))

# Le socle par defaut ne se remplit QUE depuis le log d'un run reel sur le
# runner (cf. le commentaire de calibration dans main.py). On verifie donc
# seulement qu'il reste coherent avec RSS_FEEDS : une cle qui ne correspond a
# aucun flux declare est un residu qui masquerait une vraie mort.
declared = {main.dead_feed_key(s, n) for n, _, s in main.RSS_FEEDS}
check("aucune cle orpheline dans le socle",
      sorted(main.KNOWN_DEAD_FEEDS - declared), [])

print("-- forme de RSS_FEEDS")

SECTIONS = {"claude", "updates", "llm", "agents", "finserv",
            "papers", "tools", "biz", "reg", "energy"}

check("chaque entree est un triplet de chaines non vides",
      all(isinstance(f, tuple) and len(f) == 3
          and all(isinstance(x, str) and x.strip() for x in f)
          for f in main.RSS_FEEDS), True)

check("toutes les URL sont en https",
      sorted(u for _, u, _ in main.RSS_FEEDS if not u.startswith("https://")), [])

urls = [u for _, u, _ in main.RSS_FEEDS]
check("aucun doublon d'URL",
      sorted(u for u in set(urls) if urls.count(u) > 1), [])

keys = [main.dead_feed_key(s, n) for n, _, s in main.RSS_FEEDS]
check("aucun doublon de cle section/nom",
      sorted(k for k in set(keys) if keys.count(k) > 1), [])

# Une section inconnue n'echoue pas a la collecte : elle traverse jusqu'a
# Supabase puis disparait du front, faute de mapping dans SECTION_TO_TYPE /
# SECTION_TO_ICON (cockpit/lib/data-loader.js). En ajouter une doit etre
# delibere, des deux cotes.
check("aucune section inconnue du cockpit",
      sorted({s for _, _, s in main.RSS_FEEDS} - SECTIONS), [])

print()
if failures:
    print(f"{failures} echec(s)")
    sys.exit(1)
print("Tous les checks passent.")
