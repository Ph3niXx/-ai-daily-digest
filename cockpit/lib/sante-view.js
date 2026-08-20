// cockpit/lib/sante-view.js
// Logique de présentation pure de l'onglet Santé : rendu d'un statut, âge
// lisible, libellés d'onglets, phrase d'effet, groupement par section,
// verdict global.
// Script classique compatible Babel standalone : expose window.santeView.
// Guard module.exports => testable sous node (tests/test_sante_view.mjs).
//
// CONTRAINTE : aucune dépendance au DOM, à React ou à window.COCKPIT_DATA.
(function () {
  // Ordre FIXE des sections. Il ne dépend pas de l'état : une page dont la
  // structure change avec la gravité ne se mémorise pas. L'urgence est portée
  // par le bandeau de tête et les pastilles.
  const DOMAINS = [
    { key: "veille_ia",        label: "Veille IA" },
    { key: "apprentissage",    label: "Apprentissage" },
    { key: "veille_satellite", label: "Veille satellite" },
    { key: "mediatheque",      label: "Médiathèque" },
    { key: "perso",            label: "Vie perso" },
    { key: "business",         label: "Business" },
    { key: "socle",            label: "Socle" },
  ];
  const UNCLASSIFIED_KEY = "__unclassified";

  const RENDER_LABELS = {
    ok: "ok",
    resting: "au repos",
    unknown_freshness: "fraîcheur inconnue",
    failing: "en panne",
    stale: "figé",
    unknown: "inconnu",
  };

  const CHECK_STALE_MS = 48 * 3600 * 1000;

  // `ok` en base recouvre trois réalités. Les confondre à l'écran afficherait
  // un vert qui ment : « rien depuis 37 jours » et « à jour ce matin » ne
  // peuvent pas porter le même mot.
  //
  // `unknown_freshness` est choisi plutôt que « non mesurée » parce qu'il est
  // vrai dans les DEUX cas où data_last_seen est nul : aucune sonde déclarée
  // (igdb, backup, le surveillant), ou sonde déclarée sur une table encore
  // vide. Le front ne peut pas les distinguer, et n'a pas à trancher.
  function renderOf(row) {
    const status = (row && row.status) || "unknown";
    if (status === "failing" || status === "stale") return status;
    if (status !== "ok") return "unknown";
    if (!row.data_last_seen) return "unknown_freshness";
    if (row.max_age_hours === null || row.max_age_hours === undefined) return "resting";
    return "ok";
  }

  const DEGRADED = { failing: true, stale: true };
  function isDegraded(row) { return DEGRADED[renderOf(row)] === true; }

  // Âge de la dernière donnée valide. Repli sur le dernier run réussi quand
  // aucune sonde de fraîcheur n'existe.
  function ageDays(row, now) {
    const ref = (row && (row.data_last_seen || row.last_success_at)) || null;
    if (!ref) return null;
    return (now - new Date(ref).getTime()) / 86400000;
  }

  // Même convention que le bandeau du Brief : jours au-delà de 48 h, heures en
  // deçà. Jamais « 0 h » — une donnée existe depuis au moins une heure.
  function fmtAge(row, now) {
    const d = ageDays(row, now);
    if (d === null) return null;
    if (d >= 2) return Math.floor(d) + " j";
    return Math.max(1, Math.floor(d * 24)) + " h";
  }

  // Deux onglets s'appellent « Gaming » (Veille et Personnel). Une phrase
  // d'effet qui dit « Gaming » sans préciser désigne les deux à la fois.
  function panelLabelMap(nav) {
    const counts = new Map();
    for (const g of nav || []) {
      for (const it of g.items || []) counts.set(it.label, (counts.get(it.label) || 0) + 1);
    }
    const map = new Map();
    for (const g of nav || []) {
      for (const it of g.items || []) {
        map.set(it.id, counts.get(it.label) > 1 ? it.label + " (" + g.group + ")" : it.label);
      }
    }
    return map;
  }

  function panelLabels(panelIds, nav) {
    const map = panelLabelMap(nav);
    const out = [];
    for (const id of panelIds || []) {
      const label = map.get(id);
      if (label && out.indexOf(label) === -1) out.push(label);
    }
    return out;
  }

  function joinFr(items) {
    const a = (items || []).filter(Boolean);
    if (!a.length) return "";
    if (a.length === 1) return a[0];
    return a.slice(0, -1).join(", ") + " et " + a[a.length - 1];
  }

  // UN SEUL gabarit pour la phrase d'effet, appelé par la section ET par la
  // ligne. Il en existait deux copies — une ici, une dans le JSX non testé :
  // le jour où l'une bouge, l'autre dérive en silence.
  function effectSentence(labels) {
    const a = (labels || []).filter(Boolean);
    if (!a.length) return null;
    return joinFr(a) + (a.length > 1 ? " affichent" : " affiche") +
           " encore des données figées.";
  }

  // Ce que les pannes d'une section coûtent, en noms d'onglets. Jamais écrite
  // à la main : elle suit les `panels` du contrat, donc elle reste vraie quand
  // le contrat change.
  //
  // Elle ne sort QUE si elle agrège réellement plusieurs briques. Avec une
  // seule brique dégradée — le cas le plus courant — elle serait octet pour
  // octet la phrase de la ligne, deux lignes plus bas. Principe 5 : une seule
  // surface par vérité. Sous ce seuil, c'est `rowSummary` qui la porte, au plus
  // près de sa cause et de son remède.
  function sectionSummary(rows, nav) {
    const bad = (rows || []).filter(isDegraded);
    if (bad.length < 2) return null;
    const labels = [];
    for (const r of bad) {
      for (const l of panelLabels(r.panels, nav)) {
        if (labels.indexOf(l) === -1) labels.push(l);
      }
    }
    const sentence = effectSentence(labels);
    if (sentence) return sentence;
    // Briques du Socle : aucun onglet à citer, l'effet est déclaré.
    const impacts = bad.map(function (r) { return r.impact; }).filter(Boolean);
    return impacts.length ? impacts.join(" ") : null;
  }

  // Le pendant de `sectionSummary` au niveau de la ligne. Les deux sont
  // exclusifs par construction : la phrase s'affiche une fois par section,
  // jamais zéro, jamais deux.
  function rowSummary(row, nav, sectionDegraded) {
    if (!isDegraded(row)) return null;
    if ((sectionDegraded || 0) >= 2) return null;  // la section l'agrège déjà
    return effectSentence(panelLabels(row && row.panels, nav)) ||
           ((row && row.impact) || null);
  }

  // Le compteur du bouton d'une section, réutilisé tel quel comme aria-label :
  // un lecteur d'écran ne doit pas entendre une dichotomie « dégradé / tout va
  // bien » que l'œil ne voit pas.
  //
  // Principe 4 : les briques non mesurées se comptent comme celles au repos.
  // Sans ça le Socle, dont les DEUX briques sont sans sonde de fraîcheur,
  // annoncerait « tout va bien » tous les jours de l'année, replié par défaut.
  function sectionStateLabel(section) {
    const s = section || {};
    if (s.degraded > 0) return s.degraded + " dégradé" + (s.degraded > 1 ? "s" : "");
    const parts = [];
    if (s.resting > 0) parts.push(s.resting + " au repos");
    if (s.unmeasured > 0) parts.push(s.unmeasured + " non mesurée" + (s.unmeasured > 1 ? "s" : ""));
    if (!parts.length) return "tout va bien";
    const n = (s.rows || []).length;
    return n + " brique" + (n > 1 ? "s" : "") + " · " + parts.join(" · ");
  }

  function groupByDomain(rows) {
    const buckets = new Map(DOMAINS.map(function (d) { return [d.key, []]; }));
    const orphans = [];
    for (const r of rows || []) {
      const bucket = buckets.get(r && r.domain);
      (bucket || orphans).push(r);
    }
    const out = [];
    for (const d of DOMAINS) {
      const bucket = buckets.get(d.key);
      if (bucket.length) out.push({ key: d.key, label: d.label, rows: bucket });
    }
    // Une brique dont le domaine est inconnu doit se voir, pas disparaître.
    if (orphans.length) out.push({ key: UNCLASSIFIED_KEY, label: "Non classé", rows: orphans });
    for (const s of out) {
      s.degraded = 0; s.resting = 0; s.unmeasured = 0;
      for (const r of s.rows) {
        const render = renderOf(r);
        if (DEGRADED[render] === true) s.degraded++;
        else if (render === "resting") s.resting++;
        else if (render === "unknown" || render === "unknown_freshness") s.unmeasured++;
      }
    }
    return out;
  }

  // Surveiller le surveillant : si le contrôle n'a pas tourné, la table gèle
  // sur son dernier verdict et un « tout va bien » périmé serait pire que rien.
  //
  // `measured` existe pour la même raison que le rendu `unknown_freshness` :
  // « 19 briques surveillées » attribuait un vert aux trois qui ne sont mesurées
  // sur aucune fraîcheur (igdb_tracker_sync, backup_supabase, pipeline_health).
  // Une brique dégradée compte comme mesurée — elle est visible, c'est le
  // silence vert qu'on refuse, pas l'alarme.
  function globalVerdict(rows, now) {
    const all = rows || [];
    let failing = 0, stale = 0, unmeasured = 0, lastCheck = 0;
    for (const r of all) {
      const render = renderOf(r);
      if (render === "failing") failing++;
      else if (render === "stale") stale++;
      else if (render === "unknown" || render === "unknown_freshness") unmeasured++;
      const t = r && r.checked_at ? new Date(r.checked_at).getTime() : 0;
      if (t > lastCheck) lastCheck = t;
    }
    return {
      total: all.length,
      failing: failing,
      stale: stale,
      degraded: failing + stale,
      unmeasured: unmeasured,
      measured: all.length - unmeasured,
      lastCheck: lastCheck || null,
      checkStale: lastCheck > 0 && (now - lastCheck) > CHECK_STALE_MS,
      empty: all.length === 0,
    };
  }

  const api = {
    DOMAINS, RENDER_LABELS, CHECK_STALE_MS, UNCLASSIFIED_KEY,
    renderOf, isDegraded, ageDays, fmtAge,
    panelLabelMap, panelLabels, joinFr,
    effectSentence, sectionSummary, rowSummary, sectionStateLabel,
    groupByDomain, globalVerdict,
  };
  if (typeof window !== "undefined") window.santeView = Object.assign(window.santeView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
