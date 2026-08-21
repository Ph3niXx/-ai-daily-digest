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
    // Un manga n'a AUCUN calendrier de diffusion : AniList ne renvoie pas de
    // nextAiringEpisode pour le type MANGA, donc next_episode_number est null
    // et la branche RELEASING ci-dessous rendrait 0 — soit max=0 dans
    // MdtStepper, soit un manga en cours intégralement non déclarable.
    // Ses tomes parus SONT son total connu.
    //
    // `|| 0` et pas `?? null` : le contrat de retour est un NOMBRE. status()
    // fait `s + released(e)` (que null traverserait sans bruit) mais
    // currentEntryOf() fait `watched < released(e)`, et `5 < null` est faux —
    // le manga ne serait jamais l'entrée courante, sans la moindre erreur.
    if (e.kind === "manga") return e.episodes_total || 0;
    if (e.airing_status === "FINISHED" || e.airing_status === "CANCELLED") return e.episodes_total || 0;
    if (e.airing_status === "RELEASING") return Math.max(0, (e.next_episode_number || 1) - 1);
    return 0;
  }

  // Unité de progression, dans LA FORME employée par les libellés (« ép. »
  // abrégé, « tome » non) — nextEpLabel la consomme telle quelle plutôt que
  // d'écrire l'unité en dur dans deux branches qui divergeraient. Un manga se
  // compte en tomes, jamais en chapitres : l'utilisateur achète des volumes
  // reliés, et 224 chapitres à la place de 29 tomes serait ininterprétable.
  function unitOf(e) {
    return e && e.kind === "manga" ? "tome" : "ép.";
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
  // Un manga n'a pas d'étiquette de saison : « tome 12 sur 37 » se suffit.
  function nextEpLabel(cur, watched) {
    if (!cur) return null;
    const rel = released(cur);
    const total = cur.episodes_total != null ? cur.episodes_total : rel;
    if (cur.kind === "movie") return watched > 0 ? "Film · vu" : "Film · non vu";
    const unit = unitOf(cur);
    // Un manga n'a pas d'étiquette de saison, et pas de « sur ? » non plus :
    // un dénominateur inconnu suggère une donnée manquante réparable, alors
    // qu'AniList ne comptera les tomes que quand l'éditeur les publiera.
    if (cur.kind === "manga") {
      return total ? `${unit} ${watched + 1} sur ${total}` : `${unit} ${watched + 1}`;
    }
    return `${kindTag(cur)} · ${unit} ${watched + 1} sur ${total || "?"}`;
  }

  // Libellé court de la saison courante pour hero/carte : « S2 · 12/28 ».
  function curLabel(cur, progressById) {
    if (!cur) return null;
    const w = progressById.get(cur.id) || 0;
    const rel = released(cur);
    if (cur.kind === "manga") return `${w}/${rel || "?"}`;
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

  // ── Sections (Anime / Séries / Films) ───────────────────────
  // Une section = un media_type. `media_type` est nullable en base (les
  // franchises antérieures à la migration TMDB n'en portent pas) et vaut alors
  // « anime » : c'est le défaut historique, pas une valeur inconnue.
  // Contrat : le filtrage de section ne regarde QUE le type — il ne juge ni du
  // statut ni des mises de côté, dont les chips de la collection ont la charge.
  function typeOf(f) { return (f && f.media_type) || "anime"; }

  function cardsOfSection(cards, section) {
    return (cards || []).filter((c) => typeOf(c.f) === section);
  }

  // Compteur d'onglet : ce qu'on annonce sur la pastille. Les mises de côté en
  // sont exclues — les afficher ferait mentir « Séries · 4 » sur une section
  // qui n'en montre que 2 une fois ouverte.
  function countBySection(cards, sections) {
    const out = {};
    (sections || []).forEach((s) => { out[s] = 0; });
    (cards || []).forEach((c) => {
      if (c.f.shelved) return;
      const t = typeOf(c.f);
      if (t in out) out[t] += 1;
    });
    return out;
  }

  // ── Rail « Continuer à regarder » ───────────────────────────
  // Les franchises où il reste des épisodes SORTIS non vus, privées de celles
  // déjà mises en avant plus haut dans la page : le hero en journée (pickHero
  // privilégie watching en règle 1, donc le rail affiche « les autres »), les
  // propositions de « Ce soir » après 18 h. Un même titre ne doit jamais
  // apparaître deux fois — invariant verrouillé par un test dédié.
  function pickRail(cards, excludeIds) {
    const skip = new Set(excludeIds || []);
    return cards
      .filter((c) => !c.f.shelved && c.st.id === "watching" && !skip.has(c.f.id))
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
      // Le poster voyage avec l'item : c'est le repère le plus rapide pour
      // reconnaître une série dans l'agenda (un titre de 40 caractères tronqué
      // ne se lit pas d'un coup d'œil). Porté ici pour que la vue n'ait pas à
      // re-résoudre la franchise à chaque rendu.
      const base = { entryId: e.id, franchiseId: f.id, label, kind: e.kind, ep: null, cover: f.cover_url || null };

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

  // ── « Ce soir » ─────────────────────────────────────────────
  // Trois rôles DISTINCTS, pas un top-3 scoré : trois candidats classés par le
  // même critère se ressemblent tous et n'aident pas à trancher. Un rôle sans
  // candidat disparaît — la carte affiche 3, 2, 1 ou zéro proposition, jamais
  // de remplissage.
  //
  // Déterministe et non LLM à dessein : le budget est la variable qui bouge
  // (« finalement j'ai deux heures »), un appel quotidien serait figé au moment
  // du run. Tout est déjà en base, il n'y a rien à interpréter.

  const EVENING_FROM = 18;   // la bande remplace le hero
  const EVENING_TO = 2;      // …jusqu'à 2 h du matin
  const LATE_HOUR = 23;      // au-delà, on préfère le format le plus court
  // Tolérance par pastille : un épisode de 24 min « rentre » dans 30 minutes,
  // et deux épisodes dans une heure. Les bornes sont larges à dessein — un
  // filtre au strict rejetterait un épisode de 26 min d'un budget de 30.
  const BUDGET_MAX = { 30: 35, 60: 70 };

  function isEvening(nowMs) {
    const h = new Date(nowMs).getHours();
    return h >= EVENING_FROM || h < EVENING_TO;
  }

  function runtimeOf(entry) {
    return entry && entry.runtime_minutes != null ? entry.runtime_minutes : null;
  }

  // budgetMin null = « 2 h+ » : aucun plafond, PAS une borne haute déguisée.
  // Une durée inconnue n'est jamais exclue : la bibliothèque entière est dans
  // ce cas avant le premier backfill, et une carte vide inexplicable coûte plus
  // cher qu'une proposition légèrement hors budget.
  function fitsBudget(runtime, budgetMin) {
    if (budgetMin == null || runtime == null) return true;
    return runtime <= (BUDGET_MAX[budgetMin] || budgetMin);
  }

  // Un épisode « vient de sortir » quand la date stockée est AUJOURD'HUI et
  // déjà passée. Le sync ne tourne qu'à 07:30 : entre la diffusion du soir et
  // le sync du lendemain, next_episode_airing_at pointe encore l'épisode qui
  // vient de tomber — et released() ne le compte pas encore. C'est ce décalage
  // qui rend le rôle détectable sans donnée supplémentaire.
  function airedToday(e, nowMs) {
    if (e.airing_status !== "RELEASING" || !e.next_episode_airing_at) return false;
    const t = new Date(e.next_episode_airing_at).getTime();
    if (!Number.isFinite(t) || t > nowMs) return false;
    return addDays(t, 0) === addDays(nowMs, 0);
  }

  function pickTonight(cards, progressById, ctx, nowMs) {
    const budget = ctx && ctx.budgetMin !== undefined ? ctx.budgetMin : 60;
    const late = new Date(nowMs).getHours() >= LATE_HOUR;
    const active = cards.filter((c) => !c.f.shelved);
    const taken = new Set();
    const out = [];

    // Ordre commun à tous les rôles : hors budget écarté, le plus court
    // d'abord après 23 h, durée inconnue derrière une durée connue, puis
    // départage propre au rôle.
    function rank(list, tie) {
      return list
        .filter((x) => fitsBudget(runtimeOf(x.entry), budget))
        .sort((a, b) => {
          const ra = runtimeOf(a.entry), rb = runtimeOf(b.entry);
          // Tri croissant plutôt qu'un seuil binaire « long / pas long » :
          // avec un seuil, trois candidats de 76, 139 et 201 min tombent tous
          // du même côté et la règle ne départage rien — c'est le film de
          // 3 h 20 qui sortait à minuit (constaté sur données réelles).
          if (late && ra != null && rb != null && ra !== rb) return ra - rb;
          if ((ra == null) !== (rb == null)) return ra == null ? 1 : -1;
          return tie(a, b);
        });
    }

    function take(role, list) {
      for (const x of list) {
        if (taken.has(x.card.f.id)) continue;
        taken.add(x.card.f.id);
        out.push({ role, card: x.card, entry: x.entry, runtime: runtimeOf(x.entry) });
        return;
      }
    }

    const fresh = [];
    for (const c of active) {
      for (const e of c.entries) {
        if (!e.in_main_chain || !airedToday(e, nowMs)) continue;
        if ((progressById.get(e.id) || 0) >= (e.next_episode_number || 0)) continue;
        fresh.push({ card: c, entry: e, at: new Date(e.next_episode_airing_at).getTime() });
      }
    }
    take("fresh", rank(fresh, (a, b) => b.at - a.at));

    const resume = active
      .filter((c) => c.st.id === "watching")
      .map((c) => ({ card: c, entry: currentEntryOf(c.entries, progressById) }))
      .filter((x) => x.entry);
    take("resume", rank(resume, (a, b) => b.card.lastTouch - a.card.lastTouch));

    // « Sortir du lot » : la durée la plus proche du budget PAR EN DESSOUS,
    // pour que « 2 h+ » propose le film et pas l'épisode de 24 min. À budget
    // illimité ou durée inconnue, on retombe sur l'ajout le plus récent.
    const discover = active
      .filter((c) => c.st.id === "to_watch")
      .map((c) => ({ card: c, entry: currentEntryOf(c.entries, progressById) }))
      .filter((x) => x.entry);
    take("discover", rank(discover, (a, b) => {
      const ra = runtimeOf(a.entry), rb = runtimeOf(b.entry);
      if (ra != null && rb != null && ra !== rb) return rb - ra;
      return new Date(b.card.f.added_at || 0) - new Date(a.card.f.added_at || 0);
    }));

    return out;
  }

  // L'heure agit sur le classement ; la charge de la journée n'agit QUE sur
  // cette phrase, jamais sur l'ordre. Compter des réunions ne dit pas
  // honnêtement ce qu'on a envie de regarder — et la carte ne fait aucun
  // commentaire sur le sport ou le sommeil.
  const BUSY_MEETINGS = 5;
  const BUSY_MINUTES = 240;

  function tonightHeadline(picks, ctx, nowMs) {
    if (!picks || !picks.length) return null;
    if (new Date(nowMs).getHours() >= LATE_HOUR) return "Il est tard — plutôt un format court";
    const load = (ctx && ctx.dayLoad) || null;
    if (load && ((load.count || 0) >= BUSY_MEETINGS || (load.total_minutes || 0) >= BUSY_MINUTES)) {
      return "Grosse journée — de quoi décrocher";
    }
    return "Ce soir";
  }

  const api = {
    released, kindTag, nextEpLabel, curLabel, status, currentEntryOf,
    nextAiringOf, pickHero, normalize, matchesQuery, pickRail, buildWeek,
    isEvening, pickTonight, tonightHeadline, fitsBudget, airedToday,
    typeOf, cardsOfSection, countBySection, unitOf,
  };
  if (typeof window !== "undefined") window.mdtView = Object.assign(window.mdtView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
