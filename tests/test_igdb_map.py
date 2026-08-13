"""igdb_map est pur : aucun reseau, aucun secret.
Run: python tests/test_igdb_map.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from igdb_map import map_status, map_precision, cover_url, to_title_row, diff_game_events

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


# ── statut ──────────────────────────────────────────────────
check("status 0 => released", map_status(0), "released")
check("status 6 => cancelled", map_status(6), "cancelled")
check("status 7 => rumored", map_status(7), "rumored")
# IGDB omet status sur la majorite des jeux sortis : l'absence vaut released.
check("status absent => released", map_status(None), "released")
check("status inconnu => released", map_status(99), "released")

# ── precision de date ───────────────────────────────────────
check("format 0 => day", map_precision(0), "day")
check("format 1 => month", map_precision(1), "month")
check("format 2 => year", map_precision(2), "year")
check("format 3 => quarter", map_precision(3), "quarter")
check("format 6 => quarter", map_precision(6), "quarter")
check("format 7 => tbd", map_precision(7), "tbd")
check("format absent => tbd", map_precision(None), "tbd")

# ── jaquette ────────────────────────────────────────────────
check("cover depuis image_id",
      cover_url({"image_id": "co1abc"}),
      "https://images.igdb.com/igdb/image/upload/t_cover_big/co1abc.jpg")
check("cover absente => None", cover_url(None), None)
check("cover sans image_id => None", cover_url({"id": 12}), None)

# ── ligne game_titles ───────────────────────────────────────
GAME = {
    "id": 1020,
    "name": "Hollow Knight: Silksong",
    "slug": "hollow-knight-silksong",
    "summary": "Un metroidvania.",
    "status": 7,
    "hypes": 4200,
    "first_release_date": 1788480000,   # 2026-09-04 UTC
    "cover": {"image_id": "co2xyz"},
    "genres": [{"name": "Platform"}, {"name": "Adventure"}],
    "platforms": [{"name": "PC (Microsoft Windows)"}, {"name": "Nintendo Switch"}],
    "release_dates": [{"date": 1788480000, "human": "Sep 04, 2026", "date_format": 0}],
}
row = to_title_row(GAME)
check("to_title_row igdb_id", row["igdb_id"], 1020)
check("to_title_row name", row["name"], "Hollow Knight: Silksong")
check("to_title_row statut", row["igdb_status"], "rumored")
check("to_title_row date ISO", row["first_release_date"], "2026-09-04")
check("to_title_row human", row["release_human"], "Sep 04, 2026")
check("to_title_row precision", row["release_precision"], "day")
check("to_title_row genres aplatis", row["genres"], ["Platform", "Adventure"])
check("to_title_row plateformes aplaties", row["platforms"],
      ["PC (Microsoft Windows)", "Nintendo Switch"])
check("to_title_row hypes", row["hypes"], 4200)

MINIMAL = {"id": 7, "name": "Jeu nu"}
mrow = to_title_row(MINIMAL)
check("jeu sans date => first_release_date None", mrow["first_release_date"], None)
check("jeu sans date => precision tbd", mrow["release_precision"], "tbd")
check("jeu sans genre => liste vide", mrow["genres"], [])
check("jeu sans cover => None", mrow["cover_url"], None)

# Sans release_dates, la precision est "year" (on ne sait que l'annee).
NO_RELEASE_DATES = {"id": 8, "name": "Sans dates", "first_release_date": 1798761600}
ndrow = to_title_row(NO_RELEASE_DATES)
check("first_release_date sans release_dates => year", ndrow["release_precision"], "year")
check("first_release_date sans release_dates => date non None", ndrow["first_release_date"] is not None, True)

# ── detection d'evenements ──────────────────────────────────
def title(gid, status="rumored", date=None, name="Suite"):
    return {"igdb_id": gid, "igdb_status": status,
            "first_release_date": date, "name": name}


check("titre inedit non sorti => announced",
      [e[0] for e in diff_game_events({}, [title(1)])],
      ["announced"])
check("libelle announced",
      diff_game_events({}, [title(1, name="Silksong")])[0][1],
      "Annoncé : Silksong")
# Un jeu deja sorti qui apparait pour la premiere fois n'est pas une annonce :
# c'est un frere de collection decouvert au fil de l'eau (ex. un episode de 2011).
check("titre inedit deja sorti => aucun evenement",
      diff_game_events({}, [title(2, status="released", date="2011-05-01")]),
      [])
# Idem pour un titre decouvert deja mort : annoncer « Annoncé : X » pour un
# jeu annule, delisted ou offline serait faux sur le seul ecran du lot.
check("titre inedit cancelled => aucun evenement",
      diff_game_events({}, [title(3, status="cancelled")]),
      [])
check("titre inedit delisted => aucun evenement",
      diff_game_events({}, [title(4, status="delisted", date="2014-02-01")]),
      [])
check("titre inedit offline => aucun evenement",
      diff_game_events({}, [title(5, status="offline", date="2016-08-01")]),
      [])
# Les statuts vraiment a venir restent des annonces.
check("titre inedit early_access => announced",
      [e[0] for e in diff_game_events({}, [title(6, status="early_access")])],
      ["announced"])
check("date qui apparait => date_announced",
      [e[0] for e in diff_game_events({1: title(1)}, [title(1, date="2027-03-01")])],
      ["date_announced"])
check("bascule sur released => released",
      [e[0] for e in diff_game_events({1: title(1, date="2027-03-01")},
                                      [title(1, status="released", date="2027-03-01")])],
      ["released"])
check("bascule sur cancelled => cancelled",
      [e[0] for e in diff_game_events({1: title(1)}, [title(1, status="cancelled")])],
      ["cancelled"])
check("rien ne bouge => aucun evenement",
      diff_game_events({1: title(1, date="2027-03-01")}, [title(1, date="2027-03-01")]),
      [])
# Regle explicite de la spec : les reports sont la norme dans le jeu video.
check("report de date => aucun evenement",
      diff_game_events({1: title(1, date="2027-03-01")}, [title(1, date="2027-09-01")]),
      [])

# ── verification des tuples complets (event_type, title, event_date, igdb_id) ──
announced_event = diff_game_events({}, [title(10, name="Premia")])[0]
check("announced tuple type", announced_event[0], "announced")
check("announced tuple title", announced_event[1], "Annoncé : Premia")
check("announced tuple date", announced_event[2], None)
check("announced tuple igdb_id", announced_event[3], 10)

date_announced_event = diff_game_events({20: title(20)}, [title(20, date="2027-06-15")])[0]
check("date_announced tuple type", date_announced_event[0], "date_announced")
check("date_announced tuple title", "Date annoncée :" in date_announced_event[1], True)
check("date_announced tuple date", date_announced_event[2], "2027-06-15")
check("date_announced tuple igdb_id", date_announced_event[3], 20)

released_event = diff_game_events({30: title(30, date="2027-03-01")},
                                   [title(30, status="released", date="2027-03-01")])[0]
check("released tuple type", released_event[0], "released")
check("released tuple title", released_event[1], "Sorti : Suite")
check("released tuple date", released_event[2], "2027-03-01")
check("released tuple igdb_id", released_event[3], 30)

cancelled_event = diff_game_events({40: title(40)}, [title(40, status="cancelled")])[0]
check("cancelled tuple type", cancelled_event[0], "cancelled")
check("cancelled tuple title", cancelled_event[1], "Annulé : Suite")
check("cancelled tuple date is None", cancelled_event[2], None)
check("cancelled tuple igdb_id", cancelled_event[3], 40)

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
