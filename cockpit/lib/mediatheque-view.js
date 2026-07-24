// cockpit/lib/mediatheque-view.js
// Logique de présentation pure de l'onglet Médiathèque : libellés, statuts
// dérivés, choix du hero, recherche locale, sélection du rail « Continuer à
// regarder », découpage du semainier.
// Script classique compatible Babel standalone : expose window.mdtView.
// Guard module.exports => testable sous node (tests/test_mediatheque_view.mjs).
//
// CONTRAINTE : aucune dépendance au DOM, à React ou à window.MEDIATHEQUE_DATA.
// L'instant courant est TOUJOURS passé en argument (déterminisme des tests).
//
// PÉRIMÈTRE : toute fonction pure qui porte un CONTRAT (statut affiché, règle
// de priorité, libellé) vit ici, pas dans le panel — sinon le contrat n'est
// pas testé et dérive en silence (cas vécu : mdtCurLabel/nextEpLabel avaient
// divergé sur le durcissement de `kind`).
(function () {

  // Épisodes réellement sortis pour une entrée. Source de vérité unique :
  // panel-mediatheque.jsx::mdtReleased() délègue ici.
  function released(e) {
    if (e.airing_status === "FINISHED" || e.airing_status === "CANCELLED") return e.episodes_total || 0;
    if (e.airing_status === "RELEASING") return Math.max(0, (e.next_episode_number || 1) - 1);
    return 0;
  }

  // Étiquette de saison partagée par les deux libellés (rail et hero/carte).
  // `kind` est durci : une entrée sans kind ne doit pas faire planter le rendu.
  function kindTag(cur) {
    if (cur.kind === "season") return `S${cur.season_number}`;
    if (cur.kind === "movie") return "Film";
    return String(cur.kind || "?").toUpperCase();
  }

  // Libellé du rail : « S2 · ép. 16 sur 24 » — le numéro affiché est le
  // PROCHAIN à voir (watched + 1), pas le dernier vu. Dénominateur =
  // episodes_total si connu, sinon les épisodes sortis à date.
  function nextEpLabel(cur, watched) {
    if (!cur) return null;
    const rel = released(cur);
    const total = cur.episodes_total != null ? cur.episodes_total : rel;
    if (cur.kind === "movie") return watched > 0 ? "Film · vu" : "Film · non vu";
    return `${kindTag(cur)} · ép. ${watched + 1} sur ${total || "?"}`;
  }

  // Libellé court de la saison courante pour hero/carte : « S2 · 12/28 ».
  function curLabel(cur, progressById) {
    if (!cur) return null;
    const w = progressById.get(cur.id) || 0;
    const rel = released(cur);
    return `${kindTag(cur)} · ${w}/${rel || "?"}`;
  }

  // ── Statuts dérivés (entrées in_main_chain uniquement) ──────
  // « Vu » vs « à jour » : la nuance dépend de si une saison DIFFUSE ACTUELLEMENT
  // (RELEASING), pas de si tout est FINISHED. Rien en cours de diffusion + tous les
  // épisodes sortis vus = « Vu » — y compris avec une saison future annoncée mais pas
  // encore diffusée (NOT_YET_RELEASED ne compte pas comme « en cours de diffusion »).
  // L'anime repasse « En cours » dès qu'un nouvel épisode sort non vu (released remonté
  // par le pipeline quotidien anime_tracker_sync). « à jour » = saison en diffusion rattrapée.
  function status(chainEntries, progressById) {
    const watched = chainEntries.reduce((s, e) => s + (progressById.get(e.id) || 0), 0);
    const rel = chainEntries.reduce((s, e) => s + released(e), 0);
    const anyReleasing = chainEntries.some((e) => e.airing_status === "RELEASING");
    if (watched === 0) return { id: "to_watch", label: "À voir", watched, released: rel };
    if (watched < rel) return { id: "watching", label: "En cours", watched, released: rel };
    return anyReleasing
      ? { id: "up_to_date", label: "En cours · à jour", watched, released: rel }
      : { id: "seen", label: "Vu", watched, released: rel };
  }

  // Première entrée de la chaîne principale qui n'est pas rattrapée.
  function currentEntryOf(entries, progressById) {
    const chain = entries
      .filter((e) => e.in_main_chain)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    for (const e of chain) {
      if ((progressById.get(e.id) || 0) < released(e)) return e;
    }
    return null; // tout rattrapé (à jour ou vu)
  }

  // Prochaine diffusion connue d'une franchise (toutes entrées confondues).
  function nextAiringOf(card) {
    let min = null;
    for (const e of card.entries) {
      if (e.airing_status === "RELEASING" && e.next_episode_airing_at) {
        const t = new Date(e.next_episode_airing_at).getTime();
        if (min == null || t < min) min = t;
      }
    }
    return min;
  }

  // ── Hero ────────────────────────────────────────────────────
  // CONTRAT (dont dépend pickRail) : règle 1 = une franchise « watching ».
  // Le rail retirant la franchise du hero, un même titre n'apparaît jamais
  // deux fois. Réordonner les règles casserait cette déduplication — un test
  // dédié verrouille l'invariant hero ∉ rail.
  function pickHero(cards) {
    const active = cards.filter((c) => !c.f.shelved);
    if (!active.length) return null;
    const byTouch = (a, b) => b.lastTouch - a.lastTouch;
    const watching = active.filter((c) => c.st.id === "watching").sort(byTouch);
    if (watching.length) return { card: watching[0], kind: "resume" };
    const upToDate = active.filter((c) => c.st.id === "up_to_date");
    const withNext = upToDate.map((c) => ({ c, when: nextAiringOf(c) }))
      .filter((x) => x.when != null).sort((a, b) => a.when - b.when);
    if (withNext.length) return { card: withNext[0].c, kind: "next_ep" };
    if (upToDate.length) return { card: upToDate.slice().sort(byTouch)[0], kind: "next_ep" };
    const toWatch = active.filter((c) => c.st.id === "to_watch")
      .sort((a, b) => new Date(b.f.added_at || 0) - new Date(a.f.added_at || 0));
    if (toWatch.length) return { card: toWatch[0], kind: "discover" };
    const seen = active.filter((c) => c.st.id === "seen").sort(byTouch);
    if (seen.length) return { card: seen[0], kind: "seen" };
    return { card: active.slice().sort(byTouch)[0], kind: "resume" };
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
  // que le hero met déjà en avant (pickHero ci-dessus privilégie watching en
  // règle 1, donc le rail affiche systématiquement « les autres »).
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

  // Jours calendaires entre `fromMs` (minuit local) et le jour de `atMs`,
  // en avançant via addDays() (donc setDate()) plutôt qu'en divisant un
  // delta de millisecondes brut — même logique DST-safe que addDays/parseDay
  // ci-dessus. Alimente le champ `daysAhead` des items « plus tard » datés.
  function daysBetween(atMs, fromMs) {
    const target = addDays(atMs, 0);
    let cursor = fromMs, n = 0;
    while (cursor < target) { cursor = addDays(cursor, 1); n++; }
    while (cursor > target) { cursor = addDays(cursor, -1); n--; }
    return n;
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
        later.push(Object.assign({}, base, { at: null, reason: "undated", daysAhead: null }));
        continue;
      } else {
        continue;
      }

      if (!Number.isFinite(at) || at < start) {
        // Date périmée. anime_tracker_sync ne rafraîchit next_episode_airing_at
        // qu'une fois par jour (07:30 UTC) : entre la diffusion d'un épisode et
        // le sync du lendemain, la date stockée est dans le passé. Sans ce repli,
        // une série du vendredi soir disparaissait du semainier ET de « plus
        // tard » tous les samedis matin. On la traite alors comme une saison
        // sans date. Même réserve que ci-dessus : chaîne principale seulement.
        if (reason === "airing" && e.in_main_chain) {
          later.push(Object.assign({}, base, { at: null, reason: "undated", daysAhead: null }));
        }
        continue;
      }
      if (reason === "premiere" && at > horizon) continue;

      if (at < end) {
        let i = 0;
        while (i < 6 && at >= bounds[i + 1]) i++;
        days[i].items.push(Object.assign({}, base, { at, reason, daysAhead: i }));
        count++;
      } else {
        later.push(Object.assign({}, base, { at, reason, daysAhead: daysBetween(at, start) }));
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

  const api = {
    released, kindTag, nextEpLabel, curLabel, status, currentEntryOf,
    nextAiringOf, pickHero, normalize, matchesQuery, pickRail, buildWeek,
  };
  if (typeof window !== "undefined") window.mdtView = Object.assign(window.mdtView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
