"""La garde anti-inondation du tracker jeux : should_emit_events est pure.

C'est l'invariant central du lot 1 : tant que la collection d'une franchise
n'a pas ete parcourue au moins une fois, aucun evenement ne doit sortir —
sinon le Brief annonce comme « nouveautes » des jeux sortis il y a dix ans.
Le seul endroit qui pose bootstrapped_at est la phase B, la ou la collection
est effectivement parcourue ; ce test verrouille la decision qui en decoule.

Run: python tests/test_igdb_tracker.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from igdb_tracker_sync import should_emit_events

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


# ── les deux cas nominaux ───────────────────────────────────
BOOTSTRAPPED = {1, 2, 3}

check("franchise deja parcourue => emet",
      should_emit_events(2, BOOTSTRAPPED), True)
check("franchise jamais parcourue => n'emet pas",
      should_emit_events(9, BOOTSTRAPPED), False)

# ── premier run : l'ensemble est vide, personne n'emet ───────
# bootstrapped_before est fige AVANT la phase A : au tout premier run aucune
# franchise n'a de bootstrapped_at, donc l'ensemble est vide et le run est
# muet, quel que soit le nombre de licences peuplees pendant ce meme run.
check("premier run (ensemble vide) => n'emet pas",
      should_emit_events(1, set()), False)
check("premier run, autre franchise => n'emet pas",
      should_emit_events(42, set()), False)
check("premier run, aucune des franchises n'emet",
      [should_emit_events(fid, set()) for fid in (1, 2, 3, 4)],
      [False, False, False, False])

# ── purete : l'appel ne modifie pas l'ensemble ──────────────
snapshot = {1, 2, 3}
should_emit_events(77, snapshot)
check("l'appel ne mute pas bootstrapped_before", snapshot, {1, 2, 3})

# ── robustesse : ids reels (uuid Supabase) et types melanges ─
UUIDS = {"a1b2", "c3d4"}
check("id uuid connu => emet", should_emit_events("a1b2", UUIDS), True)
check("id uuid inconnu => n'emet pas", should_emit_events("zzzz", UUIDS), False)
check("id absent d'un ensemble d'entiers => n'emet pas",
      should_emit_events("1", {1, 2, 3}), False)

# ── la valeur de retour est un booleen, pas un truthy ────────
check("retour booleen (present)", should_emit_events(1, BOOTSTRAPPED) is True, True)
check("retour booleen (absent)", should_emit_events(99, BOOTSTRAPPED) is False, True)

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
