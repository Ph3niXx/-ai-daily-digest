"""diff_events est source-agnostique : elle ne lit que des lignes normalisées.
Run: python tests/test_media_tracker_common.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from media_tracker_common import diff_events

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


FR = {"id": "f1", "title_english": "Show"}


def row(sid, status, start=None, title="S1", kind="season"):
    # `kind` est obligatoire : diff_events le lit sans .get() sur le chemin
    # new_entry, pour choisir le libellé (saison / film / entrée).
    return {"source_id": sid, "airing_status": status, "start_date": start,
            "title_english": title, "kind": kind}


check("entree inedite => new_entry",
      [e[0] for e in diff_events(FR, {}, [row(1, "NOT_YET_RELEASED")])],
      ["new_entry"])
check("libelle new_entry choisi sur kind — saison",
      diff_events(FR, {}, [row(1, "NOT_YET_RELEASED")])[0][1],
      "Nouvelle saison annoncée : S1")
check("libelle new_entry choisi sur kind — film",
      diff_events(FR, {}, [row(2, "NOT_YET_RELEASED", title="Le film", kind="movie")])[0][1],
      "Nouveau film : Le film")
check("passage a RELEASING => airing_started",
      [e[0] for e in diff_events(FR, {1: row(1, "NOT_YET_RELEASED")}, [row(1, "RELEASING")])],
      ["airing_started"])
check("date qui apparait => date_announced",
      [e[0] for e in diff_events(FR, {1: row(1, "NOT_YET_RELEASED")},
                                 [row(1, "NOT_YET_RELEASED", "2026-10-01")])],
      ["date_announced"])
check("rien ne bouge => aucun evenement",
      diff_events(FR, {1: row(1, "RELEASING")}, [row(1, "RELEASING")]), [])
check("un report de date ne redeclenche rien",
      diff_events(FR, {1: row(1, "NOT_YET_RELEASED", "2026-10-01")},
                  [row(1, "NOT_YET_RELEASED", "2026-11-01")]), [])

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
