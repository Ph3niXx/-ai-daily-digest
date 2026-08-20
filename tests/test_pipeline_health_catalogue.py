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
