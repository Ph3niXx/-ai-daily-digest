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

  const api = { released, nextEpLabel, normalize, matchesQuery };
  if (typeof window !== "undefined") window.mdtView = Object.assign(window.mdtView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
