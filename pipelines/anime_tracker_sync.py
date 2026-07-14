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


# ═══════════════════════════════════════════════════════════════
# Section 2 : réseau AniList + Supabase + CLI (Task 5)
# ═══════════════════════════════════════════════════════════════
import argparse
import os
import sys
import time
from datetime import datetime, timezone

import requests

GQL_URL = "https://graphql.anilist.co"
MEDIA_FIELDS = """
  id idMal type format status episodes averageScore genres
  description(asHtml: false)
  title { romaji english native }
  startDate { year month day } endDate { year month day }
  coverImage { large color } bannerImage
  nextAiringEpisode { episode airingAt }
  relations { edges { relationType node { id type format } } }"""
BATCH_QUERY = "query($ids:[Int]){Page(page:1,perPage:25){media(id_in:$ids,type:ANIME){%s}}}" % MEDIA_FIELDS

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
    """Un id disparu d'AniList est tombstoné {id, type:OTHER} pour arrêter le
    walk — mais les edges qui le référencent le déclarent encore ANIME. On
    élague ces edges pour qu'aucun fantôme n'entre dans la franchise.
    (Parité avec pruneDanglingEdges de cockpit/lib/anilist.js.)"""
    for m in media_by_id.values():
        edges = (m.get("relations") or {}).get("edges")
        if not edges:
            continue
        m["relations"]["edges"] = [
            e for e in edges
            if (t := media_by_id.get((e.get("node") or {}).get("id"))) is None or t.get("type") == "ANIME"
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
        "episodes_total": episodes if episodes is not None else (1 if media.get("format") == "MOVIE" else None),
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


# ── Supabase REST (service key) ─────────────────────────────────
def sb_env():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_KEY")
    if not url or not key:
        print("FATAL: SUPABASE_URL / SUPABASE_SERVICE_KEY manquants")
        sys.exit(1)
    return url, {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def sb_get(url, headers, table, qs):
    r = requests.get(f"{url}/rest/v1/{table}?{qs}", headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_upsert(url, headers, table, rows, on_conflict, ignore_dupes=False):
    if not rows:
        return []
    prefer = "resolution=ignore-duplicates" if ignore_dupes else "resolution=merge-duplicates"
    h = {**headers, "Prefer": f"{prefer},return=representation"}
    r = requests.post(f"{url}/rest/v1/{table}?on_conflict={on_conflict}", headers=h, json=rows, timeout=30)
    r.raise_for_status()
    return r.json()


def sb_patch(url, headers, table, qs, body):
    r = requests.patch(f"{url}/rest/v1/{table}?{qs}", headers=headers, json=body, timeout=30)
    r.raise_for_status()


# ── Détection d'événements ──────────────────────────────────────
def diff_events(franchise, old_by_source_id, fresh_rows):
    """Compare l'état DB aux lignes fraîches -> [(event_type, title, event_date, source_id)]."""
    events = []
    for row in fresh_rows:
        sid = row["source_id"]
        old = old_by_source_id.get(sid)
        label = row.get("title_english") or row.get("title_romaji") or f"#{sid}"
        if old is None:
            what = "Nouvelle saison annoncée" if row["kind"] == "season" else (
                "Nouveau film" if row["kind"] == "movie" else "Nouvelle entrée")
            events.append(("new_entry", f"{what} : {label}", row.get("start_date"), sid))
            continue
        if old.get("airing_status") != "RELEASING" and row.get("airing_status") == "RELEASING":
            events.append(("airing_started", f"Diffusion commencée : {label}", row.get("start_date"), sid))
        if not old.get("start_date") and row.get("start_date"):
            events.append(("date_announced", f"Date annoncée : {label} — {row['start_date']}", row["start_date"], sid))
    return events


def run_sync(dry_run):
    url, headers = sb_env()
    franchises = sb_get(url, headers, "media_franchises", "select=id,source_root_id,title_english,title_romaji&order=added_at")
    entries = sb_get(url, headers, "media_entries",
                     "select=id,franchise_id,source_id,airing_status,start_date&order=sort_order")
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
        events = diff_events(fr, old_by_sid, fresh_rows)
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
