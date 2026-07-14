#!/usr/bin/env python3
"""
Médiathèque — tracker anime AniList -> Supabase.

Section 1 (ce fichier, Task 2) : logique pure du "walk" franchise.
Contrat commun avec cockpit/lib/anilist.js — même algo, mêmes fixtures
(tests/fixtures/franchise_graphs.json). Toute modif ici DOIT être
répliquée côté JS et couverte par les deux tests.

Règles (spec 2026-07-14) :
- chaîne principale = fermeture SEQUEL/PREQUEL depuis l'ancre, tous formats
- kind: TV/TV_SHORT/ONA en chaîne -> season ; MOVIE -> movie ; OVA -> ova ;
  SPECIAL -> special ; sinon other. MUSIC exclu de la sortie.
- saisons numérotées par (startDate ASC, nulls last, id ASC)
- bonus = SIDE_STORY à 1 saut des noeuds de chaîne (jamais suivis plus loin)
- exclus : SPIN_OFF, CHARACTER, SUMMARY, ALTERNATIVE, ADAPTATION/SOURCE, OTHER
- racine = entrée de chaîne la plus ancienne.
"""

CHAIN_RELS = {"SEQUEL", "PREQUEL"}
BONUS_RELS = {"SIDE_STORY"}
SEASON_FORMATS = {"TV", "TV_SHORT", "ONA"}
EXCLUDED_FORMATS = {"MUSIC"}


def _rel_targets(media, rel_types):
    out = []
    for edge in ((media.get("relations") or {}).get("edges") or []):
        node = edge.get("node") or {}
        if edge.get("relationType") in rel_types and node.get("type") == "ANIME":
            out.append(node["id"])
    return out


def chain_ids(media_by_id, anchor_id):
    """Fermeture SEQUEL/PREQUEL parmi les media DÉJÀ connus."""
    seen, todo = set(), [anchor_id]
    while todo:
        mid = todo.pop()
        if mid in seen or mid not in media_by_id:
            continue
        seen.add(mid)
        todo.extend(_rel_targets(media_by_id[mid], CHAIN_RELS))
    return seen


def missing_ids(media_by_id, anchor_id):
    """Ids référencés (chaîne + bonus 1 saut) pas encore fetchés."""
    chain = chain_ids(media_by_id, anchor_id)
    wanted = set()
    for mid in chain:
        wanted.update(_rel_targets(media_by_id[mid], CHAIN_RELS))
        wanted.update(_rel_targets(media_by_id[mid], BONUS_RELS))
    return {m for m in wanted if m not in media_by_id}


def _date_key(media):
    d = media.get("startDate") or {}
    if not d.get("year"):
        return (9999, 12, 31)
    return (d["year"], d.get("month") or 1, d.get("day") or 1)


def _kind(media, in_chain):
    f = media.get("format") or ""
    if in_chain and f in SEASON_FORMATS:
        return "season"
    if f == "MOVIE":
        return "movie"
    if f == "OVA":
        return "ova"
    if f == "SPECIAL":
        return "special"
    return "other"


def build_franchise(media_by_id, anchor_id):
    """Classement/regroupement. Précondition: missing_ids() est vide."""
    leftover = missing_ids(media_by_id, anchor_id)
    if leftover:
        raise ValueError(f"graphe incomplet, ids manquants: {sorted(leftover)}")
    chain = chain_ids(media_by_id, anchor_id)
    bonus = set()
    for mid in chain:
        for t in _rel_targets(media_by_id[mid], BONUS_RELS):
            if t not in chain and (media_by_id[t].get("format") or "") not in EXCLUDED_FORMATS:
                bonus.add(t)

    def sortkey(mid):
        return (_date_key(media_by_id[mid]), mid)

    chain_sorted = [m for m in sorted(chain, key=sortkey)
                    if (media_by_id[m].get("format") or "") not in EXCLUDED_FORMATS]
    bonus_sorted = sorted(bonus, key=sortkey)

    entries, season_num, order = [], 0, 0
    for mid in chain_sorted:
        order += 1
        kind = _kind(media_by_id[mid], True)
        if kind == "season":
            season_num += 1
        entries.append({
            "source_id": mid,
            "in_main_chain": True,
            "kind": kind,
            "season_number": season_num if kind == "season" else None,
            "sort_order": order,
        })
    for mid in bonus_sorted:
        order += 1
        entries.append({
            "source_id": mid,
            "in_main_chain": False,
            "kind": _kind(media_by_id[mid], False),
            "season_number": None,
            "sort_order": order,
        })
    root_id = chain_sorted[0] if chain_sorted else anchor_id
    return {"root_id": root_id, "entries": entries}


if __name__ == "__main__":
    print("Section réseau/CLI ajoutée en Task 5 — lancer tests/test_franchise_walk.py")
