// cockpit/lib/games-view.js
// Logique de présentation pure de l'onglet Gaming : constitution de la
// bibliothèque, statuts déclarés, tri, recherche locale, rail « À venir ».
// Script classique compatible Babel standalone : expose window.gamesView.
// Guard module.exports => testable sous node (tests/test_games_view.mjs).
//
// CONTRAINTE : aucune dépendance au DOM, à React ou à window.GAMING_PERSO_DATA.
(function () {
  const STATUS_LABELS = {
    wishlist: "Envie",
    playing: "En cours",
    finished: "Fini",
    dropped: "Lâché",
    unqualified: "Non qualifié",
  };

  // `game_titles` porte DEUX populations : les jeux de l'utilisateur (un
  // steam_appid, ou une ligne game_progress qu'il a créée) et les titres
  // frères remontés des collections par le pipeline — 357 sur 451 au
  // 2026-08-13. Afficher les seconds rendrait l'onglet illisible.
  function buildLibrary(titles, progressRows, snapshotRows) {
    const progByTitle = new Map((progressRows || []).map((p) => [p.title_id, p]));
    const snapByAppid = new Map((snapshotRows || []).map((s) => [s.appid, s]));
    const out = [];
    for (const t of titles || []) {
      const prog = progByTitle.get(t.id) || null;
      if (t.steam_appid == null && !prog) continue;
      const snap = t.steam_appid != null ? snapByAppid.get(t.steam_appid) : null;
      out.push({
        t,
        prog,
        franchiseId: t.franchise_id,
        minutes: (snap && snap.playtime_forever_minutes) || 0,
        minutes2w: (snap && snap.playtime_2weeks_minutes) || 0,
      });
    }
    return out;
  }

  // Le statut est DECLARE, jamais deduit. 112 h sur un jeu ne disent pas
  // s'il est fini ou lâché — aucune API ne le sait, seul l'utilisateur.
  function statusOf(card) {
    return (card && card.prog && card.prog.status) || "unqualified";
  }

  function ratingOf(card) {
    return (card && card.prog && card.prog.rating != null) ? card.prog.rating : null;
  }

  function sortLibrary(cards, mode) {
    const list = (cards || []).slice();
    const byName = (a, b) => String(a.t.name || "").localeCompare(String(b.t.name || ""), "fr");
    if (mode === "name") return list.sort(byName);
    if (mode === "rating") {
      return list.sort((a, b) => {
        const ra = ratingOf(a), rb = ratingOf(b);
        if (ra == null && rb == null) return byName(a, b);
        if (ra == null) return 1;
        if (rb == null) return -1;
        return rb - ra;
      });
    }
    if (mode === "recent") return list.sort((a, b) => b.minutes2w - a.minutes2w || byName(a, b));
    return list.sort((a, b) => b.minutes - a.minutes || byName(a, b));
  }

  function normalize(s) {
    // ̀-ͯ = diacritiques combinants : « Pokémon » et « Pokemon »
    // doivent matcher. Notation echappee volontaire — les caracteres litteraux
    // ne survivent pas toujours a un copier-coller.
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function matchesQuery(card, q) {
    const n = normalize(q).trim();
    if (!n) return true;
    return normalize(card && card.t && card.t.name).includes(n);
  }

  // Ou l'utilisateur POSSEDE le jeu, jamais ou le jeu existe.
  // `game_titles.platforms` (IGDB) liste les plateformes de SORTIE : s'en
  // servir classerait sous « Switch » les 19 jeux possedes sur Steam qui
  // sortent aussi sur Switch — une reponse a une question que personne ne
  // pose. La declaration de l'utilisateur en fiche fait foi ; l'appartenance
  // Steam sert de repli, ce qui classe 86 jeux sans aucune saisie.
  function platformOf(card) {
    const declared = card && card.prog && card.prog.platform;
    if (declared) return declared;
    if (card && card.t && card.t.steam_appid != null) return "PC";
    return null;
  }

  // Un jeu non classe ne ressort sous aucune plateforme : mieux vaut absent
  // que range au mauvais endroit.
  function filterByPlatform(cards, platforms) {
    if (!platforms || !platforms.length) return (cards || []).slice();
    const set = new Set(platforms);
    return (cards || []).filter((c) => set.has(platformOf(c)));
  }

  function filterByStatus(cards, statuses) {
    if (!statuses || !statuses.length) return (cards || []).slice();
    const set = new Set(statuses);
    return (cards || []).filter((c) => set.has(statusOf(c)));
  }

  // Le rail affiche des JEUX, pas des libellés d'événement : « Silksong »
  // et non « À venir : Silksong ». Les acquittés en sortent.
  function buildUpcoming(releases, titlesById, franchisesById) {
    const items = [];
    for (const r of releases || []) {
      if (r.acknowledged) continue;
      const t = (titlesById || {})[r.title_id] || null;
      const f = (franchisesById || {})[r.franchise_id] || null;
      items.push({
        id: r.id,
        titleId: r.title_id,
        franchiseId: r.franchise_id,
        name: (t && t.name) || String(r.title || "").replace(/^[^:]+ : /, ""),
        licence: (f && f.name) || null,
        when: (t && t.release_human) || r.event_date || null,
        precision: (t && t.release_precision) || null,
        hypes: (t && t.hypes) || 0,
        cover: (t && t.cover_url) || null,
        sortKey: r.event_date || null,
      });
    }
    // Daté d'abord, du plus proche au plus lointain ; sans date ensuite,
    // le plus attendu en tête.
    return items.sort((a, b) => {
      if (a.sortKey && b.sortKey) return a.sortKey < b.sortKey ? -1 : (a.sortKey > b.sortKey ? 1 : 0);
      if (a.sortKey) return -1;
      if (b.sortKey) return 1;
      return b.hypes - a.hypes;
    });
  }

  function hoursLabel(minutes) {
    const m = minutes || 0;
    if (!m) return "jamais lancé";
    if (m < 60) return `${m} min`;
    return `${Math.round(m / 60)} h`;
  }

  function ttbLabel(minutes) {
    if (!minutes) return null;
    return `≈ ${Math.round(minutes / 60)} h pour finir`;
  }

  // Steam sait qu'un jeu a tourné ces 14 jours ; il ne sait pas ce que
  // l'utilisateur en pense. On propose, on n'écrit pas.
  function suggestPlaying(cards) {
    return (cards || []).filter((c) => c.minutes2w > 0 && statusOf(c) !== "playing");
  }

  const api = {
    STATUS_LABELS, buildLibrary, statusOf, ratingOf, sortLibrary,
    normalize, matchesQuery, filterByStatus, buildUpcoming,
    platformOf, filterByPlatform,
    hoursLabel, ttbLabel, suggestPlaying,
  };
  if (typeof window !== "undefined") window.gamesView = Object.assign(window.gamesView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
