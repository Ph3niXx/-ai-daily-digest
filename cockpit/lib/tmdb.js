// cockpit/lib/tmdb.js
// Client TMDB + traduction vers le CONTRAT ANILIST (airing_status,
// episodes_total, next_episode_number…). Toute la connaissance de TMDB est
// enfermée ici : released(), status(), pickHero(), buildWeek() et pickTonight()
// ignorent qu'une seconde source existe — c'est le choix structurant de la spec
// 2026-07-25-mediatheque-films-series-ce-soir-design.md.
//
// Jumeau Python : pipelines/tmdb_tracker_sync.py (un pipeline ne peut pas
// importer un module JS). Les deux sont verrouillés par des tests miroirs,
// tests/test_tmdb_map.mjs et tests/test_tmdb_map.py.
//
// Script classique compatible Babel standalone : expose window.tmdb.
// Guard module.exports => testable sous node.
(function () {

  const BASE = "https://api.themoviedb.org/3";
  const POSTER = "https://image.tmdb.org/t/p/w342";
  const BACKDROP = "https://image.tmdb.org/t/p/w780";
  // en-US et non fr-FR : le catalogue vient à 95 % d'AniList, dont les titres
  // et les synopsis sont déjà en anglais. En français, TMDB rendait « Sauve qui
  // pécho ! » là où le reste de la médiathèque dit « Single's Inferno ». Le
  // titre d'origine n'est pas perdu — il vit dans title_native.
  const LANG = "en-US";

  // TMDB expose son statut au niveau SÉRIE (ou film), jamais saison.
  // Défaut FINISHED plutôt que null : une valeur inconnue ne doit pas faire
  // croire à released() qu'une saison diffuse encore, ce qui lui ferait
  // renvoyer next_episode_number - 1 sur une donnée absente.
  const STATUS = {
    "Returning Series": "RELEASING",
    "In Production": "RELEASING",
    "Ended": "FINISHED",
    "Released": "FINISHED",
    "Canceled": "CANCELLED",
    "Cancelled": "CANCELLED",
    "Planned": "NOT_YET_RELEASED",
    "Rumored": "NOT_YET_RELEASED",
    "Post Production": "NOT_YET_RELEASED",
  };

  function mapStatus(s) { return STATUS[s] || "FINISHED"; }

  function img(path, base) { return path ? base + path : null; }

  function strip(text) {
    if (!text) return null;
    return String(text).replace(/<[^>]+>/g, "").trim().slice(0, 2000) || null;
  }

  function toFranchiseRow(detail, kind) {
    const isTv = kind === "tv";
    return {
      media_type: isTv ? "tv" : "movie",
      source: isTv ? "tmdb_tv" : "tmdb_movie",
      source_root_id: detail.id,
      // TMDB n'a pas de romaji : le champ reste null plutôt que de recevoir un
      // doublon du titre anglais, qui polluerait la recherche locale.
      title_romaji: null,
      title_english: isTv ? detail.name : detail.title,
      title_native: isTv ? detail.original_name : detail.original_title,
      synopsis: strip(detail.overview),
      genres: (detail.genres || []).map((g) => g.name),
      cover_url: img(detail.poster_path, POSTER),
      banner_url: img(detail.backdrop_path, BACKDROP),
    };
  }

  function movieRows(detail) {
    const status = mapStatus(detail.status);
    return [{
      source: "tmdb_movie",
      source_id: detail.id,
      in_main_chain: true,
      kind: "movie",
      season_number: null,
      title_romaji: null,
      title_english: detail.title,
      title_native: detail.original_title,
      format: "MOVIE",
      airing_status: status,
      episodes_total: 1,
      // Renseignée même pour un film à sortir : c'est elle qui le fait
      // apparaître dans l'agenda via la branche « premiere » de buildWeek().
      start_date: detail.release_date || null,
      end_date: status === "FINISHED" ? (detail.release_date || null) : null,
      next_episode_number: null,
      next_episode_airing_at: null,
      cover_url: img(detail.poster_path, POSTER),
      runtime_minutes: detail.runtime != null ? detail.runtime : null,
      sort_order: 1,
      updated_at: new Date().toISOString(),
    }];
  }

  // TMDB a vidé `episode_run_time` sur les séries modernes (constaté en live
  // sur Severance et Dan Da Dan, 2026-07-25) : la durée ne vit plus que dans
  // les épisodes. Sans ce repli, AUCUNE série n'aurait de durée et le filtre
  // par budget de « Ce soir » serait inerte sur tout le catalogue séries.
  function tvRuntime(detail) {
    const declared = (detail.episode_run_time && detail.episode_run_time[0]) || null;
    if (declared) return declared;
    const last = detail.last_episode_to_air || null;
    if (last && last.runtime) return last.runtime;
    const next = detail.next_episode_to_air || null;
    if (next && next.runtime) return next.runtime;
    return null;
  }

  function tvRows(detail) {
    const seasons = (detail.seasons || []).slice()
      .sort((a, b) => (a.season_number || 0) - (b.season_number || 0));
    if (!seasons.length) return [];

    const showStatus = mapStatus(detail.status);
    const runtime = tvRuntime(detail);
    const next = detail.next_episode_to_air || null;
    // « Returning Series » décrit la SÉRIE, pas une saison : une série entre
    // deux saisons reste « Returning ». La seule preuve qu'une saison diffuse
    // en ce moment est l'existence d'un next_episode_to_air, qui désigne
    // lui-même sa saison — pas forcément la dernière listée, puisqu'une saison
    // future peut déjà figurer au catalogue.
    const airingSeason = next
      ? (next.season_number != null ? next.season_number : lastNumberedOf(seasons))
      : null;
    const today = new Date().toISOString().slice(0, 10);

    return seasons.map((s, i) => {
      const number = s.season_number || 0;
      const isSpecial = number === 0;
      const isAiring = !isSpecial && airingSeason != null && number === airingSeason;
      // Statut dérivé des faits de la saison elle-même, jamais propagé depuis
      // la série : sans date, sans épisode, ou datée dans le futur => annoncée.
      let status;
      if (isAiring) status = "RELEASING";
      else if (!s.air_date || s.air_date > today || !s.episode_count) status = "NOT_YET_RELEASED";
      else if (showStatus === "CANCELLED") status = "CANCELLED";
      else status = "FINISHED";
      const airing = isAiring && next;
      return {
        source: "tmdb_season",
        source_id: s.id,
        in_main_chain: !isSpecial,
        kind: isSpecial ? "special" : "season",
        season_number: isSpecial ? null : number,
        title_romaji: null,
        // Repli calqué sur ce que TMDB renvoie en en-US : un nom absent ne doit
        // pas produire « Saison 3 » au milieu de « Season 1 », « Season 2 ».
        title_english: s.name || (isSpecial ? "Specials" : `Season ${number}`),
        title_native: null,
        format: "TV",
        airing_status: status,
        episodes_total: s.episode_count != null ? s.episode_count : null,
        start_date: s.air_date || null,
        end_date: null,
        next_episode_number: airing ? next.episode_number : null,
        // air_date est une date nue : on l'ancre explicitement en UTC pour que
        // l'ISO stocké soit stable quel que soit le fuseau du navigateur.
        next_episode_airing_at: airing && next.air_date
          ? new Date(next.air_date + "T00:00:00Z").toISOString() : null,
        cover_url: img(s.poster_path, POSTER) || img(detail.poster_path, POSTER),
        runtime_minutes: runtime,
        // Les spéciaux passent en queue : ils ne sont pas dans la chaîne et ne
        // doivent jamais être choisis comme « saison courante ».
        sort_order: isSpecial ? 999 : (number || i + 1),
        updated_at: new Date().toISOString(),
      };
    });
  }

  // Repli quand next_episode_to_air omet son season_number : la saison en
  // diffusion est alors la dernière numérotée du catalogue.
  function lastNumberedOf(seasons) {
    const numbered = seasons.filter((s) => (s.season_number || 0) >= 1);
    return numbered.length ? numbered[numbered.length - 1].season_number : null;
  }

  function toEntryRows(detail, kind) {
    return kind === "tv" ? tvRows(detail) : movieRows(detail);
  }

  // ── Réseau ──────────────────────────────────────────────────
  async function get(path, apiKey, params) {
    const qs = new URLSearchParams(Object.assign({ api_key: apiKey, language: LANG }, params || {}));
    const res = await fetch(`${BASE}${path}?${qs}`);
    if (res.status === 429) {
      const wait = Number(res.headers.get("Retry-After") || 1);
      await new Promise((r) => setTimeout(r, wait * 1000));
      return get(path, apiKey, params);
    }
    if (!res.ok) throw new Error("TMDB " + res.status + " sur " + path);
    return res.json();
  }

  const searchCache = new Map();

  // /search/multi renvoie aussi des personnes : on ne garde que film et série.
  async function search(q, apiKey) {
    const key = q.trim().toLowerCase();
    if (searchCache.has(key)) return searchCache.get(key);
    const data = await get("/search/multi", apiKey, { query: q, include_adult: "false" });
    const out = (data.results || [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .slice(0, 12)
      .map((r) => ({
        tmdb_id: r.id,
        kind: r.media_type,
        title: r.media_type === "tv" ? r.name : r.title,
        year: (r.first_air_date || r.release_date || "").slice(0, 4) || null,
        poster_url: img(r.poster_path, POSTER),
        popularity: r.popularity || 0,
      }));
    searchCache.set(key, out);
    return out;
  }

  const detailCache = new Map();

  // Le kind fait partie de la clé : les ids film et série vivent dans deux
  // namespaces TMDB distincts et peuvent collider numériquement.
  async function fetchFranchiseLive(tmdbId, kind, apiKey) {
    const key = kind + ":" + tmdbId;
    if (detailCache.has(key)) return detailCache.get(key);
    const detail = await get(`/${kind}/${tmdbId}`, apiKey, {});
    const out = { detail, kind };
    detailCache.set(key, out);
    return out;
  }

  const api = { mapStatus, toFranchiseRow, toEntryRows, search, fetchFranchiseLive };
  if (typeof window !== "undefined") window.tmdb = Object.assign(window.tmdb || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
