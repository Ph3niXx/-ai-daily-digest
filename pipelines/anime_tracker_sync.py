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
    # Le type de l'ANCRE, pas « ANIME » en dur : sinon le walk d'un manga ne
    # trouve rien (ses SEQUEL/PREQUEL sont de type MANGA) et, pire, on
    # aspirerait son adaptation anime dans la meme franchise. Vinland Saga
    # porte deux ADAPTATION -> ANIME.
    out = []
    for edge in ((media.get("relations") or {}).get("edges") or []):
        node = edge.get("node") or {}
        if edge.get("relationType") in rel_types and node.get("type") == media.get("type"):
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
    # Avant tout test de format : le format d'un manga vaut MANGA, ONE_SHOT ou
    # NOVEL, qu'aucune branche ci-dessous ne reconnait — il tomberait en
    # « other » et le libelle afficherait « OTHER · ep. 3 ».
    if media.get("type") == "MANGA":
        return "manga"
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


def emits_events(franchise):
    """Un manga ne produit AUCUN evenement de sortie.

    Les trois event_type existants decriraient une realite japonaise : un 30e
    tome paru a Tokyo n'est pas une sortie VF et peut preceder l'edition
    francaise de deux ans. L'alerte serait fausse par construction, et elle
    remonterait jusqu'a l'encart Mediatheque du Brief du jour.

    Ce predicat vit ici et pas dans diff_events() : « quels types meritent une
    alerte » est une politique de pipeline, pas une regle de comparaison de
    lignes. diff_events est partagee avec tmdb_tracker_sync et son test defend
    explicitement son agnosticisme (tests/test_media_tracker_common.py:1).
    """
    return franchise.get("media_type") != "manga"


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


# ═══════════════════════════════════════════════════════════════
# Section 2 : réseau AniList + Supabase + CLI (Task 5)
# ═══════════════════════════════════════════════════════════════
import argparse
import os
import sys
import time
from datetime import datetime, timezone

import requests

# Socle partagé avec tmdb_tracker_sync : transport Supabase + détection
# d'événements, qui ne connaissent aucune source.
from media_tracker_common import sb_env, sb_get, sb_upsert, sb_patch, diff_events

GQL_URL = "https://graphql.anilist.co"
MEDIA_FIELDS = """
  id idMal type format status episodes volumes chapters duration averageScore genres
  description(asHtml: false)
  title { romaji english native }
  startDate { year month day } endDate { year month day }
  coverImage { large color } bannerImage
  nextAiringEpisode { episode airingAt }
  relations { edges { relationType node { id type format } } }"""
# Pas de filtre de type : les ids AniList sont uniques entre ANIME et MANGA
# (Media(id:30642, type:ANIME) -> Not Found, verifie le 2026-08-21), donc un
# meme batch rafraichit les deux. `nextAiringEpisode` reste demande : il vaut
# simplement null pour un manga, et le retirer casserait les animes.
BATCH_QUERY = "query($ids:[Int]){Page(page:1,perPage:25){media(id_in:$ids){%s}}}" % MEDIA_FIELDS

THROTTLE_S = 2.5
_last_call = [0.0]


def gql(query, variables):
    for attempt in range(3):
        wait = _last_call[0] + THROTTLE_S - time.time()
        if wait > 0:
            time.sleep(wait)
        _last_call[0] = time.time()
        resp = requests.post(GQL_URL, json={"query": query, "variables": variables}, timeout=30)
        if resp.status_code == 429:
            time.sleep(int(resp.headers.get("Retry-After", "3")))
            continue
        resp.raise_for_status()
        payload = resp.json()
        if payload.get("errors"):
            raise RuntimeError(f"AniList: {payload['errors'][0].get('message')}")
        return payload["data"]
    raise RuntimeError("AniList 429 persistant")


def fetch_media_batch(ids):
    out = {}
    ids = sorted(set(ids))
    for i in range(0, len(ids), 25):
        data = gql(BATCH_QUERY, {"ids": ids[i:i + 25]})
        for m in (data.get("Page") or {}).get("media") or []:
            out[m["id"]] = m
    return out


def prune_dangling_edges(media_by_id):
    """Un id disparu d'AniList est tombstoné {id, type: "OTHER"} pour arrêter
    le walk. On élague les TOMBSTONES, pas les types : `type == "ANIME"`
    était un proxy pour « média réel » datant d'avant le manga — il élaguait
    de fait chaque edge manga→manga, réduisant toute franchise manga à son
    seul ancrage, en silence, puisque prune tourne AVANT build_franchise.
    L'enum MediaType d'AniList ne connaît que ANIME et MANGA ; "OTHER" n'est
    écrit que par le tombstone de fetch_franchise_graph.
    (Parité avec pruneDanglingEdges de cockpit/lib/anilist.js.)"""
    for m in media_by_id.values():
        edges = (m.get("relations") or {}).get("edges")
        if not edges:
            continue
        m["relations"]["edges"] = [
            e for e in edges
            if (t := media_by_id.get((e.get("node") or {}).get("id"))) is None or t.get("type") != "OTHER"
        ]
    return media_by_id


def fetch_franchise_graph(anchor_id, seed=None):
    """Walk complet depuis l'ancre. seed = media déjà fetchés (mutualisés)."""
    media_by_id = dict(seed or {})
    if anchor_id not in media_by_id:
        media_by_id.update(fetch_media_batch([anchor_id]))
    if anchor_id not in media_by_id:
        raise RuntimeError(f"fiche AniList {anchor_id} introuvable")
    for _ in range(8):
        missing = missing_ids(media_by_id, anchor_id)
        if not missing:
            break
        fetched = fetch_media_batch(list(missing))
        for mid in missing:
            fetched.setdefault(mid, {"id": mid, "type": "OTHER"})
        media_by_id.update(fetched)
    prune_dangling_edges(media_by_id)
    return media_by_id


def fuzzy_date(d):
    if not d or not d.get("year"):
        return None
    return f"{d['year']}-{(d.get('month') or 1):02d}-{(d.get('day') or 1):02d}"


def strip_synopsis(html):
    if not html:
        return None
    import re
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text).strip()
    return text[:2000] or None


def to_entry_row(entry, media):
    releasing = media.get("status") == "RELEASING" and media.get("nextAiringEpisode")
    nae = media.get("nextAiringEpisode") or {}
    title = media.get("title") or {}
    episodes = media.get("episodes")
    return {
        "source": "anilist",
        "source_id": entry["source_id"],
        "in_main_chain": entry["in_main_chain"],
        "kind": entry["kind"],
        "season_number": entry["season_number"],
        "title_romaji": title.get("romaji"),
        "title_english": title.get("english"),
        "title_native": title.get("native"),
        "format": media.get("format"),
        "airing_status": media.get("status"),
        # Un manga se compte en TOMES. `chapters` n'est jamais un repli : 224
        # chapitres a la place de 29 tomes rendrait le compteur ininterpretable.
        "episodes_total": (media.get("volumes") if media.get("type") == "MANGA"
                           else (episodes if episodes is not None
                                 else (1 if media.get("format") == "MOVIE" else None))),
        # Durée d'UN épisode (ou du film) — alimente le filtrage par budget de
        # pickTonight(). None si AniList ne la connaît pas, jamais 0.
        "runtime_minutes": media.get("duration"),
        "start_date": fuzzy_date(media.get("startDate")),
        "end_date": fuzzy_date(media.get("endDate")),
        "next_episode_number": nae.get("episode") if releasing else None,
        "next_episode_airing_at": (
            datetime.fromtimestamp(nae["airingAt"], tz=timezone.utc).isoformat()
            if releasing and nae.get("airingAt") else None
        ),
        "cover_url": (media.get("coverImage") or {}).get("large"),
        "sort_order": entry["sort_order"],
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


# Toute lecture du tracker est bornée à sa source. Sans ce filtre, une
# franchise TMDB verrait son source_root_id envoyé à AniList — au mieux un
# walk qui échoue, au pire un id qui correspond par hasard à un autre anime
# et qui écrase la fiche. Les query strings sont extraites pour être testées
# sans mock réseau (tests/test_source_scoping.py).
ANILIST_SOURCE = "anilist"


def franchises_qs():
    # media_type est LU par emits_events() : sans lui dans le select, le
    # garde-fou lit None, renvoie True, et les fausses alertes partent.
    return (f"source=eq.{ANILIST_SOURCE}"
            "&select=id,source_root_id,title_english,title_romaji,media_type&order=added_at")


def entries_qs():
    return (f"source=eq.{ANILIST_SOURCE}"
            "&select=id,franchise_id,source_id,airing_status,start_date&order=sort_order")


def run_sync(dry_run):
    url, headers = sb_env()
    franchises = sb_get(url, headers, "media_franchises", franchises_qs())
    entries = sb_get(url, headers, "media_entries", entries_qs())
    by_franchise = {}
    for e in entries:
        by_franchise.setdefault(e["franchise_id"], []).append(e)
    print(f"Tracker sync: {len(franchises)} franchises, {len(entries)} entrées, dry_run={dry_run}")

    # Mutualise le fetch initial : toutes les entrées connues en batchs.
    seed = fetch_media_batch([e["source_id"] for e in entries] +
                             [f["source_root_id"] for f in franchises])

    total_new, total_events = 0, 0
    for fr in franchises:
        name = fr.get("title_english") or fr.get("title_romaji") or fr["id"]
        try:
            graph = fetch_franchise_graph(fr["source_root_id"], seed=seed)
            built = build_franchise(graph, fr["source_root_id"])
        except Exception as exc:
            print(f"  WARN {name}: walk KO ({exc}) — franchise sautée, rattrapée au prochain run")
            continue
        fresh_rows = [{**to_entry_row(e, graph[e["source_id"]]), "franchise_id": fr["id"]}
                      for e in built["entries"]]
        old_by_sid = {e["source_id"]: e for e in by_franchise.get(fr["id"], [])}
        events = diff_events(fr, old_by_sid, fresh_rows) if emits_events(fr) else []
        new_count = sum(1 for r in fresh_rows if r["source_id"] not in old_by_sid)
        print(f"  {name}: {len(fresh_rows)} entrées ({new_count} nouvelles), {len(events)} événement(s)")
        total_new += new_count
        total_events += len(events)
        if dry_run:
            for ev in events:
                print(f"    [dry-run] {ev[0]}: {ev[1]}")
            continue
        try:
            saved = sb_upsert(url, headers, "media_entries", fresh_rows, "source,source_id")
            id_by_sid = {r["source_id"]: r["id"] for r in saved}
            release_rows = [{
                "franchise_id": fr["id"],
                "entry_id": id_by_sid.get(sid),
                "event_type": etype,
                "title": title,
                "event_date": edate,
            } for (etype, title, edate, sid) in events if id_by_sid.get(sid)]
            sb_upsert(url, headers, "media_releases", release_rows, "entry_id,event_type", ignore_dupes=True)
            root = graph.get(fr["source_root_id"]) or {}
            sb_patch(url, headers, "media_franchises", f"id=eq.{fr['id']}", {
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "synopsis": strip_synopsis(root.get("description")),
                "cover_url": (root.get("coverImage") or {}).get("large"),
            })
        except Exception as exc:
            print(f"  WARN {name}: écriture Supabase KO ({exc}) — franchise sautée, rattrapée au prochain run")
            continue
    print(f"\nDone. {total_new} nouvelles entrées, {total_events} événements.")


def run_check(anchor_id):
    graph = fetch_franchise_graph(anchor_id)
    built = build_franchise(graph, anchor_id)
    root = graph[built["root_id"]]
    print(f"Franchise: {(root.get('title') or {}).get('romaji')} (root {built['root_id']})")
    for e in built["entries"]:
        m = graph[e["source_id"]]
        t = (m.get("title") or {}).get("romaji")
        tag = "chain" if e["in_main_chain"] else "bonus"
        num = f" S{e['season_number']}" if e["season_number"] else ""
        print(f"  [{tag}] {e['kind']}{num} · {t} · {m.get('status')} · {fuzzy_date(m.get('startDate')) or '?'}"
              f" · {m.get('episodes') or '?'} ép.")


if __name__ == "__main__":
    # Garde-fou console Windows : cp1252 (défaut console locale) plante sur
    # les accents/· des messages ci-dessus. Sans effet sur Linux (déjà UTF-8).
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--check", type=int, metavar="ANILIST_ID")
    args = parser.parse_args()
    if args.check:
        run_check(args.check)
    else:
        run_sync(args.dry_run)
