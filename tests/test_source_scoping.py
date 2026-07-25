"""Les query strings du sync AniList doivent filtrer sur source.
Run: python tests/test_source_scoping.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
import anime_tracker_sync as ats

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


def contains(name, haystack, needle):
    global failures
    if needle not in haystack:
        failures += 1
        print(f"FAIL {name}\n  {needle!r} absent de {haystack!r}")
    else:
        print(f"ok   {name}")


check("source AniList", ats.ANILIST_SOURCE, "anilist")
contains("franchises filtrees sur la source", ats.franchises_qs(), "source=eq.anilist")
contains("entrees filtrees sur la source", ats.entries_qs(), "source=eq.anilist")
contains("franchises gardent leur select", ats.franchises_qs(), "source_root_id")
contains("entrees gardent leur select", ats.entries_qs(), "airing_status")
contains("entrees gardent leur tri", ats.entries_qs(), "order=sort_order")

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
