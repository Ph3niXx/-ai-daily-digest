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

  // Ce que les pannes d'une section coûtent, en noms d'onglets. Jamais écrite
  // à la main : elle suit les `panels` du contrat, donc elle reste vraie quand
  // le contrat change.
  function sectionSummary(rows, nav) {
    const bad = (rows || []).filter(isDegraded);
    if (!bad.length) return null;
    const labels = [];
    for (const r of bad) {
      for (const l of panelLabels(r.panels, nav)) {
        if (labels.indexOf(l) === -1) labels.push(l);
      }
    }
    if (labels.length) {
      return joinFr(labels) + (labels.length > 1 ? " affichent" : " affiche") +
             " encore des données figées.";
    }
    // Briques du Socle : aucun onglet à citer, l'effet est déclaré.
    const impacts = bad.map(function (r) { return r.impact; }).filter(Boolean);
    return impacts.length ? impacts.join(" ") : null;
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
    for (const s of out) s.degraded = s.rows.filter(isDegraded).length;
    return out;
  }

  // Surveiller le surveillant : si le contrôle n'a pas tourné, la table gèle
  // sur son dernier verdict et un « tout va bien » périmé serait pire que rien.
  function globalVerdict(rows, now) {
    const all = rows || [];
    let failing = 0, stale = 0, lastCheck = 0;
    for (const r of all) {
      const render = renderOf(r);
      if (render === "failing") failing++;
      else if (render === "stale") stale++;
      const t = r && r.checked_at ? new Date(r.checked_at).getTime() : 0;
      if (t > lastCheck) lastCheck = t;
    }
    return {
      total: all.length,
      failing: failing,
      stale: stale,
      degraded: failing + stale,
      lastCheck: lastCheck || null,
      checkStale: lastCheck > 0 && (now - lastCheck) > CHECK_STALE_MS,
      empty: all.length === 0,
    };
  }

  const api = {
    DOMAINS, RENDER_LABELS, CHECK_STALE_MS, UNCLASSIFIED_KEY,
    renderOf, isDegraded, ageDays, fmtAge,
    panelLabelMap, panelLabels, joinFr,
    sectionSummary, groupByDomain, globalVerdict,
  };
  if (typeof window !== "undefined") window.santeView = Object.assign(window.santeView || {}, api);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
