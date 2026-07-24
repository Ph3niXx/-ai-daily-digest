// cockpit/lib/mediatheque-view.js
// Logique de présentation pure de l'onglet Médiathèque : libellés, recherche
// locale, sélection du rail « Continuer à regarder », découpage du semainier.
// Script classique compatible Babel standalone : expose window.mdtView.
// Guard module.exports => testable sous node (tests/test_mediatheque_view.mjs).
//
// CONTRAINTE : aucune dépendance au DOM, à React ou à window.MEDIATHEQUE_DATA.
// L'instant courant est TOUJOURS passé en argument (déterminisme des tests).
(function () {

  // Épisodes réellement sortis pour une entrée. Source de vérité unique :
  // panel-mediatheque.jsx::mdtReleased() délègue ici.
  function released(e) {
    if (e.airing_status === "FINISHED" || e.airing_status === "CANCELLED") return e.episodes_total || 0;
    if (e.airing_status === "RELEASING") return Math.max(0, (e.next_episode_number || 1) - 1);
    return 0;
  }

  // Libellé du rail : « S2 · ép. 16 sur 24 » — le numéro affiché est le
  // PROCHAIN à voir (watched + 1), pas le dernier vu. Dénominateur =
  // episodes_total si connu, sinon les épisodes sortis à date.
  function nextEpLabel(cur, watched) {
    if (!cur) return null;
    const rel = released(cur);
    const total = cur.episodes_total != null ? cur.episodes_total : rel;
    if (cur.kind === "movie") return watched > 0 ? "Film · vu" : "Film · non vu";
    const tag = cur.kind === "season" ? `S${cur.season_number}` : String(cur.kind || "?").toUpperCase();
    return `${tag} · ép. ${watched + 1} sur ${total || "?"}`;
  }

  // Plage ̀-ͯ = diacritiques combinants. Échappée volontairement :
  // pas de garantie sur les classes Unicode \p{...} sous Babel standalone.
  function normalize(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function matchesQuery(f, q) {
    const n = normalize(q).trim();
    if (!n) return false;
    return [f.title_english, f.title_romaji, f.title_native]
      .some((t) => t && normalize(t).includes(n));
  }

  // ── Rail « Continuer à regarder » ───────────────────────────
  // Les franchises où il reste des épisodes SORTIS non vus, privées de celle
  // que le hero met déjà en avant (pickHero privilégie watching en règle 1,
  // donc le rail affiche systématiquement « les autres »).
  function pickRail(cards, heroFranchiseId) {
    return cards
      .filter((c) => !c.f.shelved && c.st.id === "watching" && c.f.id !== heroFranchiseId)
      .sort((a, b) => b.lastTouch - a.lastTouch);
  }

  // ── Semainier ───────────────────────────────────────────────
  // Bornes construites via setDate() plutôt que par arithmétique sur des ms :
  // un passage à l'heure d'été ne fait pas 24 h et décalerait les colonnes.
  function addDays(ms, n) { const d = new Date(ms); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + n); return d.getTime(); }

  // start_date est une date nue (« 2026-07-27 ») : new Date(s) la lirait en UTC
  // et la ferait basculer d'un jour dans les fuseaux à l'ouest de Greenwich.
  // On la lit explicitement comme minuit LOCAL.
  function parseDay(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s == null ? "" : s));
    if (!m) return NaN;
    return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  }

  const LATER_CAP = 6;        // items affichés dans la ligne « plus tard »
  const HORIZON_DAYS = 90;    // au-delà, une première annoncée est de l'annonce, pas du calendrier

  function buildWeek(entries, franchiseById, nowMs) {
    const bounds = [];
    for (let i = 0; i <= 7; i++) bounds.push(addDays(nowMs, i));
    const start = bounds[0];
    const end = bounds[7];
    const horizon = addDays(nowMs, HORIZON_DAYS);

    const days = [];
    for (let i = 0; i < 7; i++) days.push({ ts: bounds[i], items: [] });
    const later = [];
    let count = 0;

    for (const e of entries) {
      const f = franchiseById.get(e.franchise_id);
      if (!f || f.shelved) continue;

      const label = e.title_english || e.title_romaji || f.title_english || f.title_romaji || "?";
      const base = { entryId: e.id, franchiseId: f.id, label, kind: e.kind, ep: null };

      let at = null, reason = null;
      if (e.airing_status === "RELEASING" && e.next_episode_airing_at) {
        at = new Date(e.next_episode_airing_at).getTime();
        reason = "airing";
        base.ep = e.next_episode_number || null;
      } else if (e.airing_status === "NOT_YET_RELEASED" && e.start_date) {
        at = parseDay(e.start_date);
        reason = "premiere";
      } else if (e.airing_status === "RELEASING" && e.in_main_chain) {
        // Saison qui diffuse mais sans date remontée par AniList : sans cette
        // branche elle disparaîtrait de l'écran. Réservé à la chaîne
        // principale — un bonus sans titre ni date serait du bruit permanent.
        later.push(Object.assign({}, base, { at: null, reason: "undated" }));
        continue;
      } else {
        continue;
      }

      if (!Number.isFinite(at) || at < start) continue;
      if (reason === "premiere" && at > horizon) continue;

      if (at < end) {
        let i = 0;
        while (i < 6 && at >= bounds[i + 1]) i++;
        days[i].items.push(Object.assign({}, base, { at, reason }));
        count++;
      } else {
        later.push(Object.assign({}, base, { at, reason }));
      }
    }

    for (const d of days) d.items.sort((a, b) => a.at - b.at);
    later.sort((a, b) => {
      if (a.at == null && b.at == null) return 0;
      if (a.at == null) return 1;
      if (b.at == null) return -1;
      return a.at - b.at;
    });
    return { days, later: later.slice(0, LATER_CAP), laterTotal: later.length, count };
  }

  const api = { released, nextEpLabel, normalize, matchesQuery, pickRail, buildWeek };
  if (typeof window !== "undefined") window.mdtView = Object.assign(window.mdtView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
