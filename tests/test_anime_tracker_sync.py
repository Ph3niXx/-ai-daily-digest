#!/usr/bin/env python3
"""Garde-fous manga du sync AniList.
Run: python tests/test_anime_tracker_sync.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "pipelines"))
from anime_tracker_sync import _kind, _rel_targets, emits_events, franchises_qs, prune_dangling_edges

failures = 0


def check(name, got, expected):
    global failures
    if got != expected:
        failures += 1
        print(f"FAIL {name}\n  expected: {expected!r}\n  got:      {got!r}")
    else:
        print(f"ok   {name}")


# ── _kind ────────────────────────────────────────────────────────
# La branche manga passe AVANT tout test de format : le format d'un manga
# vaut MANGA, ONE_SHOT ou NOVEL, qu'aucune branche existante ne reconnait.
check("_kind: MANGA quel que soit le format",
      _kind({"type": "MANGA", "format": "MANGA"}, True), "manga")
check("_kind: MANGA one-shot reste un manga",
      _kind({"type": "MANGA", "format": "ONE_SHOT"}, False), "manga")
check("_kind: une saison anime n'a pas bouge",
      _kind({"type": "ANIME", "format": "TV"}, True), "season")
check("_kind: un film anime n'a pas bouge",
      _kind({"type": "ANIME", "format": "MOVIE"}, False), "movie")

# ── _rel_targets ─────────────────────────────────────────────────
# Le piege concret : Vinland Saga (manga) porte deux ADAPTATION -> ANIME.
# Un filtre code en dur sur "ANIME" faisait que le walk d'un manga ne
# trouvait RIEN, et un filtre absent aspirerait l'anime dans la franchise.
MANGA = {"type": "MANGA", "relations": {"edges": [
    {"relationType": "SEQUEL", "node": {"id": 101, "type": "MANGA"}},
    {"relationType": "ADAPTATION", "node": {"id": 900, "type": "ANIME"}},
    {"relationType": "SEQUEL", "node": {"id": 902, "type": "ANIME"}},
]}}
check("_rel_targets: un manga ne remonte que des ids MANGA",
      _rel_targets(MANGA, {"SEQUEL"}), [101])

ANIME = {"type": "ANIME", "relations": {"edges": [
    {"relationType": "SEQUEL", "node": {"id": 2, "type": "ANIME"}},
    {"relationType": "ADAPTATION", "node": {"id": 3, "type": "MANGA"}},
]}}
check("_rel_targets: un anime ne remonte que des ids ANIME (non-regression)",
      _rel_targets(ANIME, {"SEQUEL"}), [2])

# ── prune_dangling_edges ─────────────────────────────────────────
# Meme defaut que pruneDanglingEdges cote JS avant le fix de la Task 4
# (tests/test_anilist_map.mjs) : l'ancien predicat gardait une arete
# seulement si sa cible etait ANIME, ce qui elaguait TOUTE arete
# manga->manga (pas seulement les tombstones) — en silence, puisque
# prune_dangling_edges tourne AVANT build_franchise. Le tombstone ecrit par
# fetch_franchise_graph est {id, type: "OTHER"} ; le MediaType AniList ne
# connait que ANIME et MANGA, donc "OTHER" designe un tombstone et rien
# d'autre.
#
# PORTEE REELLE de ces trois checks, contre l'ancien predicat
# `t.get("type") == "ANIME"` : SEUL LE PREMIER discrimine (l'arete
# manga->manga survivait-elle ?). Les deux autres passent sous l'ancien
# comme sous le nouveau — ce sont des garde-fous de non-regression, pas des
# temoins du correctif. Le filet suffit : le check 1 seul repasse la CI au
# rouge si quelqu'un restaure l'ancien predicat. Ce commentaire disait
# « ces trois checks echouent », ce qui etait faux et surestimait la
# couverture — et un commentaire qui la surestime est precisement ce qui
# empeche de la corriger.
PRUNE_GRAPH = {
    200: {"id": 200, "type": "MANGA", "relations": {"edges": [
        {"relationType": "SEQUEL", "node": {"id": 201, "type": "MANGA"}},
        {"relationType": "SIDE_STORY", "node": {"id": 202, "type": "OTHER"}},
    ]}},
    201: {"id": 201, "type": "MANGA", "relations": {"edges": []}},
    202: {"id": 202, "type": "OTHER"},
    300: {"id": 300, "type": "ANIME", "relations": {"edges": [
        {"relationType": "SEQUEL", "node": {"id": 301, "type": "OTHER"}},
    ]}},
    301: {"id": 301, "type": "OTHER"},
}
prune_dangling_edges(PRUNE_GRAPH)
check("prune_dangling_edges: une arete manga->manga survit",
      [e["node"]["id"] for e in PRUNE_GRAPH[200]["relations"]["edges"]], [201])
check("prune_dangling_edges: une arete manga->tombstone est elaguee",
      any(e["node"]["id"] == 202 for e in PRUNE_GRAPH[200]["relations"]["edges"]), False)
check("prune_dangling_edges: une arete anime->tombstone reste elaguee (non-regression)",
      PRUNE_GRAPH[300]["relations"]["edges"], [])

# ── emits_events ─────────────────────────────────────────────────
# Un tome japonais de plus n'est PAS une sortie VF et peut preceder
# l'edition francaise de deux ans. L'alerte serait fausse par construction.
check("emits_events: un manga n'alerte jamais",
      emits_events({"id": "f1", "media_type": "manga"}), False)
check("emits_events: un anime alerte",
      emits_events({"id": "f2", "media_type": "anime"}), True)
# Cle absente => comportement historique. Une franchise anterieure a la
# colonne ne doit pas cesser d'alerter a cause de ce garde-fou.
check("emits_events: cle absente => True (defaut historique)",
      emits_events({"id": "f3"}), True)

# ── franchises_qs ────────────────────────────────────────────────
# LE test qui attrape l'echec silencieux : sans media_type dans le select,
# emits_events lit None, renvoie True, et les fausses alertes partent quand
# meme — tous les tests ci-dessus restant verts.
check("franchises_qs: media_type est bien selectionne",
      "media_type" in franchises_qs(), True)

print(f"\n{failures} test(s) en echec" if failures else "\nTous les tests passent")
sys.exit(1 if failures else 0)
