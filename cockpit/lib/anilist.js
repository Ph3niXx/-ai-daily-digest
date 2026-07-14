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

  // ── Réseau ─────────────────────────────────────────────────────
  const GQL_URL = "https://graphql.anilist.co";
  const MEDIA_FIELDS = `
    id idMal type format status episodes averageScore genres
    description(asHtml: false)
    title { romaji english native }
    startDate { year month day } endDate { year month day }
    coverImage { large color } bannerImage
    nextAiringEpisode { episode airingAt }
    relations { edges { relationType node { id type format } } }`;
  const SEARCH_QUERY = `query($q:String){Page(page:1,perPage:12){media(search:$q,type:ANIME,sort:SEARCH_MATCH){${MEDIA_FIELDS}}}}`;
  const BATCH_QUERY = `query($ids:[Int]){Page(page:1,perPage:25){media(id_in:$ids,type:ANIME){${MEDIA_FIELDS}}}}`;

  // File d'attente : 1 requête / 700 ms mini, retry x2 sur 429 (Retry-After).
  let lastCall = 0;
  let queue = Promise.resolve();
  function gql(query, variables) {
    const run = async () => {
      for (let attempt = 0; attempt < 3; attempt++) {
        const wait = Math.max(0, lastCall + 700 - Date.now());
        if (wait) await new Promise((r) => setTimeout(r, wait));
        lastCall = Date.now();
        const resp = await fetch(GQL_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Accept": "application/json" },
          body: JSON.stringify({ query, variables }),
        });
        if (resp.status === 429) {
          const retryAfter = Number(resp.headers.get("Retry-After")) || 2;
          await new Promise((r) => setTimeout(r, retryAfter * 1000));
          continue;
        }
        if (!resp.ok) throw new Error("AniList " + resp.status);
        const json = await resp.json();
        if (json.errors && json.errors.length) throw new Error("AniList: " + json.errors[0].message);
        return json.data;
      }
      throw new Error("AniList 429 persistant");
    };
    const p = queue.then(run, run);
    queue = p.catch(() => {});
    return p;
  }

  const searchCache = new Map();
  async function searchAnime(q) {
    const key = q.trim().toLowerCase();
    if (searchCache.has(key)) return searchCache.get(key);
    const data = await gql(SEARCH_QUERY, { q });
    const results = (data.Page && data.Page.media) || [];
    searchCache.set(key, results);
    return results;
  }

  async function fetchMediaBatch(ids) {
    const out = {};
    for (let i = 0; i < ids.length; i += 25) {
      const data = await gql(BATCH_QUERY, { ids: ids.slice(i, i + 25) });
      for (const m of (data.Page && data.Page.media) || []) out[m.id] = m;
    }
    return out;
  }

  // Un id disparu d'AniList est tombstoné {id, type:"OTHER"} pour arrêter le
  // walk — mais les edges qui le référencent le déclarent encore ANIME. On
  // élague ces edges pour qu'aucun fantôme n'entre dans la franchise.
  function pruneDanglingEdges(mediaById) {
    for (const m of Object.values(mediaById)) {
      const edges = m.relations && m.relations.edges;
      if (!edges) continue;
      m.relations.edges = edges.filter((edge) => {
        const target = mediaById[(edge.node || {}).id];
        return !target || target.type === "ANIME";
      });
    }
    return mediaById;
  }

  const franchiseCache = new Map();
  async function fetchFranchiseLive(anchorId) {
    if (franchiseCache.has(anchorId)) return franchiseCache.get(anchorId);
    const mediaById = await fetchMediaBatch([anchorId]);
    if (!mediaById[anchorId]) throw new Error("AniList: fiche " + anchorId + " introuvable");
    for (let hop = 0; hop < 8; hop++) {
      const missing = [...missingIds(mediaById, anchorId)];
      if (!missing.length) break;
      const fetched = await fetchMediaBatch(missing);
      // Un id peut disparaître d'AniList : on le neutralise pour ne pas boucler.
      for (const mid of missing) if (!fetched[mid]) fetched[mid] = { id: mid, type: "OTHER" };
      Object.assign(mediaById, fetched);
    }
    pruneDanglingEdges(mediaById);
    const built = buildFranchise(mediaById, anchorId);
    const result = { built, mediaById };
    franchiseCache.set(anchorId, result);
    return result;
  }

  // ── Mapping vers les lignes media_* ────────────────────────────
  function fuzzyDate(d) {
    if (!d || !d.year) return null;
    const p2 = (n) => String(n || 1).padStart(2, "0");
    return `${d.year}-${p2(d.month)}-${p2(d.day)}`;
  }

  function stripSynopsis(html) {
    if (!html) return null;
    return html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim().slice(0, 2000) || null;
  }

  function toFranchiseRow(built, mediaById) {
    const root = mediaById[built.root_id];
    return {
      media_type: "anime",
      source: "anilist",
      source_root_id: built.root_id,
      title_romaji: (root.title && root.title.romaji) || null,
      title_english: (root.title && root.title.english) || null,
      title_native: (root.title && root.title.native) || null,
      synopsis: stripSynopsis(root.description),
      genres: root.genres || [],
      cover_url: (root.coverImage && root.coverImage.large) || null,
      banner_url: root.bannerImage || null,
    };
  }

  function toEntryRows(built, mediaById) {
    return built.entries.map((e) => {
      const m = mediaById[e.source_id];
      const releasing = m.status === "RELEASING" && m.nextAiringEpisode;
      return {
        source: "anilist",
        source_id: e.source_id,
        in_main_chain: e.in_main_chain,
        kind: e.kind,
        season_number: e.season_number,
        title_romaji: (m.title && m.title.romaji) || null,
        title_english: (m.title && m.title.english) || null,
        title_native: (m.title && m.title.native) || null,
        format: m.format || null,
        airing_status: m.status || null,
        episodes_total: m.episodes != null ? m.episodes : (m.format === "MOVIE" ? 1 : null),
        start_date: fuzzyDate(m.startDate),
        end_date: fuzzyDate(m.endDate),
        next_episode_number: releasing ? m.nextAiringEpisode.episode : null,
        next_episode_airing_at: releasing && m.nextAiringEpisode.airingAt ? new Date(m.nextAiringEpisode.airingAt * 1000).toISOString() : null,
        cover_url: (m.coverImage && m.coverImage.large) || null,
        sort_order: e.sort_order,
        updated_at: new Date().toISOString(),
      };
    });
  }

  const api = { chainIds, missingIds, buildFranchise, gql, searchAnime,
    fetchFranchiseLive, pruneDanglingEdges, fuzzyDate, toFranchiseRow, toEntryRows };
  if (typeof window !== "undefined") window.anilist = Object.assign(window.anilist || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
