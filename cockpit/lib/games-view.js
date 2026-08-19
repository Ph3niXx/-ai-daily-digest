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

  // Libellés hérités. Jusqu'au 2026-08-19 les deux producteurs (le pipeline
  // et announcedRows ci-dessous) écrivaient le type d'événement DANS `title` :
  // « À venir : Silksong ». Les lignes en base ont été reprises et les deux
  // producteurs corrigés, mais un client qui n'a pas encore rechargé son JS
  // peut encore en écrire une — d'où ce filet, gardé côté lecture.
  //
  // Il retire les quatre libellés CONNUS et eux seuls. Le `^[^:]+ : ` générique
  // d'avant amputait « Persona 5 : Royal » en « Royal » : un nom de jeu a tout
  // à fait le droit de contenir un deux-points.
  const EVENT_LABEL = /^(À venir|Date annoncée|Sorti|Annulé) : /;
  function stripEventLabel(title) {
    return String(title || "").replace(EVENT_LABEL, "");
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
        name: (t && t.name) || stripEventLabel(r.title),
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

  // ── Boucle « À venir » à l'ajout ─────────────────────────────
  //
  // Le pipeline ne parcourt les collections qu'à 08:30 UTC : jusqu'au sync
  // suivant, une licence qu'on vient de suivre n'a aucun événement et le rail
  // reste vide. Constaté le 2026-08-14 — jeu ajouté, prochaine sortie de la
  // licence invisible jusqu'au lendemain. Le front refait donc ici, pour la
  // seule licence concernée, ce que la phase B fera pour toutes cette nuit.
  //
  // Ces trois fonctions RÉPLIQUENT pipelines/igdb_map.py (is_upcoming,
  // to_title_row, upcoming_events). Deux implémentations parce que les deux
  // écrivent dans game_titles et game_releases. Les cas de test sont les mêmes
  // des deux côtés (tests/test_igdb_map.py, tests/test_games_view.mjs) :
  // toucher l'une sans l'autre les fait diverger en silence.
  const TERMINAL_STATUS = ["cancelled", "delisted", "offline"];
  const UPCOMING_MIN_HYPES = 20;

  // La DATE fait foi, pas `status` : IGDB laisse status à NULL sur la majorité
  // de son catalogue, y compris les jeux à venir, et le mapping retombe alors
  // sur « released ». status ne sert qu'à écarter les impasses (annulé, retiré,
  // serveurs fermés). Sans date, `hypes` sépare les annonces sans calendrier
  // des vieilles fiches mortes.
  function isUpcoming(row, today) {
    if (TERMINAL_STATUS.indexOf(row && row.igdb_status) !== -1) return false;
    const date = row && row.first_release_date;
    if (date) return String(date) > String(today);
    return ((row && row.hypes) || 0) >= UPCOMING_MIN_HYPES;
  }

  // Un résultat de l'Edge Function -> une ligne game_titles. Mêmes colonnes que
  // to_title_row() côté pipeline : le front écrit dans la même table, un run
  // ultérieur doit pouvoir écraser la ligne sans rien perdre ni rien changer.
  function titleRow(g, franchiseId) {
    return {
      franchise_id: franchiseId,
      igdb_id: g.id,
      name: g.name,
      slug: g.slug || null,
      summary: g.summary || null,
      cover_url: g.cover_url || null,
      genres: g.genres || [],
      platforms: g.platforms || [],
      igdb_status: g.igdb_status || null,
      first_release_date: g.first_release_date || null,
      release_human: g.release_human || null,
      release_precision: g.release_precision || null,
      hypes: g.hypes == null ? null : g.hypes,
    };
  }

  // Les lignes game_releases des titres pas encore sortis. `announced` et le
  // libellé « À venir : » sont ceux du pipeline : l'unicité (title_id,
  // event_type) fait que le sync de la nuit retombe sur la même ligne au lieu
  // d'en créer une seconde — et qu'un événement déjà acquitté ne ressuscite pas.
  function announcedRows(savedTitles, today) {
    return (savedTitles || [])
      .filter((t) => t && t.id && t.franchise_id && isUpcoming(t, today))
      .map((t) => ({
        franchise_id: t.franchise_id,
        title_id: t.id,
        event_type: "announced",
        title: t.name || "#" + t.igdb_id,
        event_date: t.first_release_date || null,
      }));
  }

  // Fusion par id pour l'état local du panel : un upsert renvoie aussi bien des
  // lignes inédites que des lignes déjà présentes. Concaténer créerait des
  // doublons dans la bibliothèque et dans le rail.
  function mergeById(current, rows) {
    const byId = new Map((current || []).map((r) => [r.id, r]));
    for (const r of rows || []) {
      if (!r || r.id == null) continue;
      byId.set(r.id, Object.assign({}, byId.get(r.id) || {}, r));
    }
    return Array.from(byId.values());
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
    normalize, matchesQuery, filterByStatus, buildUpcoming, stripEventLabel,
    platformOf, filterByPlatform,
    isUpcoming, titleRow, announcedRows, mergeById,
    hoursLabel, ttbLabel, suggestPlaying,
  };
  if (typeof window !== "undefined") window.gamesView = Object.assign(window.gamesView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
