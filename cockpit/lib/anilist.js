// cockpit/lib/anilist.js
// Client AniList GraphQL (recherche + walk franchise) — SANS clé API.
// Script classique compatible Babel standalone : expose window.anilist.
// Guard module.exports => testable sous node (tests/test_franchise_walk.mjs).
//
// CONTRAT COMMUN avec pipelines/anime_tracker_sync.py (mêmes règles, mêmes
// fixtures tests/fixtures/franchise_graphs.json). Toute modif du walk DOIT
// être répliquée côté Python et couverte par les deux tests.
(function () {
  const CHAIN_RELS = ["SEQUEL", "PREQUEL"];
  const BONUS_RELS = ["SIDE_STORY"];
  const SEASON_FORMATS = ["TV", "TV_SHORT", "ONA"];
  const EXCLUDED_FORMATS = ["MUSIC"];

  function relTargets(media, relTypes) {
    const out = [];
    const edges = (media.relations && media.relations.edges) || [];
    for (const edge of edges) {
      const node = edge.node || {};
      if (relTypes.includes(edge.relationType) && node.type === "ANIME") out.push(node.id);
    }
    return out;
  }

  function chainIds(mediaById, anchorId) {
    const seen = new Set();
    const todo = [anchorId];
    while (todo.length) {
      const mid = todo.pop();
      if (seen.has(mid) || !mediaById[mid]) continue;
      seen.add(mid);
      todo.push(...relTargets(mediaById[mid], CHAIN_RELS));
    }
    return seen;
  }

  function missingIds(mediaById, anchorId) {
    const chain = chainIds(mediaById, anchorId);
    const wanted = new Set();
    for (const mid of chain) {
      relTargets(mediaById[mid], CHAIN_RELS).forEach((t) => wanted.add(t));
      relTargets(mediaById[mid], BONUS_RELS).forEach((t) => wanted.add(t));
    }
    return new Set([...wanted].filter((m) => !mediaById[m]));
  }

  function dateKey(media) {
    const d = media.startDate || {};
    if (!d.year) return 99991231;
    return d.year * 10000 + (d.month || 1) * 100 + (d.day || 1);
  }

  function kindOf(media, inChain) {
    const f = media.format || "";
    if (inChain && SEASON_FORMATS.includes(f)) return "season";
    if (f === "MOVIE") return "movie";
    if (f === "OVA") return "ova";
    if (f === "SPECIAL") return "special";
    return "other";
  }

  function buildFranchise(mediaById, anchorId) {
    const leftover = missingIds(mediaById, anchorId);
    if (leftover.size) throw new Error("graphe incomplet: " + [...leftover].join(","));
    const chain = chainIds(mediaById, anchorId);
    const bonus = new Set();
    for (const mid of chain) {
      for (const t of relTargets(mediaById[mid], BONUS_RELS)) {
        if (!chain.has(t) && !EXCLUDED_FORMATS.includes(mediaById[t].format || "")) bonus.add(t);
      }
    }
    const sortkey = (mid) => [dateKey(mediaById[mid]), mid];
    const cmp = (a, b) => { const [d1, i1] = sortkey(a), [d2, i2] = sortkey(b); return d1 - d2 || i1 - i2; };
    const chainSorted = [...chain].sort(cmp).filter((m) => !EXCLUDED_FORMATS.includes(mediaById[m].format || ""));
    const bonusSorted = [...bonus].sort(cmp);

    const entries = [];
    let seasonNum = 0, order = 0;
    for (const mid of chainSorted) {
      order += 1;
      const kind = kindOf(mediaById[mid], true);
      if (kind === "season") seasonNum += 1;
      entries.push({ source_id: mid, in_main_chain: true, kind,
        season_number: kind === "season" ? seasonNum : null, sort_order: order });
    }
    for (const mid of bonusSorted) {
      order += 1;
      entries.push({ source_id: mid, in_main_chain: false, kind: kindOf(mediaById[mid], false),
        season_number: null, sort_order: order });
    }
    return { root_id: chainSorted.length ? chainSorted[0] : anchorId, entries };
  }

  const api = { chainIds, missingIds, buildFranchise };
  if (typeof window !== "undefined") window.anilist = Object.assign(window.anilist || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
