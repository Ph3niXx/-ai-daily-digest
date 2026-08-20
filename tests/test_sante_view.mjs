// Tests du module de présentation Santé (JS pur, sans DOM).
// Run: node tests/test_sante_view.mjs
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const V = require(join(here, "..", "cockpit", "lib", "sante-view.js"));

let failures = 0;
function check(name, got, expected) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) { failures++; console.log(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  got:      ${JSON.stringify(got)}`); }
  else console.log(`ok   ${name}`);
}

const NOW = Date.parse("2026-08-20T09:00:00Z");
const iso = (daysAgo) => new Date(NOW - daysAgo * 86400000).toISOString();

// ── renderOf : les six rendus ────────────────────────────────
// `ok` en base recouvre trois réalités très différentes. Les confondre à
// l'écran, c'est afficher un vert qui ment.
check("mesure fraiche => ok",
  V.renderOf({ status: "ok", data_last_seen: iso(0.1), max_age_hours: 30 }), "ok");
check("mesuree mais jamais sanctionnee => au repos",
  V.renderOf({ status: "ok", data_last_seen: iso(37), max_age_hours: null }), "resting");
check("aucune donnee vue => fraicheur inconnue",
  V.renderOf({ status: "ok", data_last_seen: null, max_age_hours: null }), "unknown_freshness");
check("sonde declaree mais table vide => fraicheur inconnue aussi",
  V.renderOf({ status: "ok", data_last_seen: null, max_age_hours: 30 }), "unknown_freshness");
check("run en echec => failing",
  V.renderOf({ status: "failing", data_last_seen: iso(118) }), "failing");
check("run vert, donnee figee => stale",
  V.renderOf({ status: "stale", data_last_seen: iso(37), max_age_hours: 30 }), "stale");
check("statut inconnu => unknown",
  V.renderOf({ status: "unknown" }), "unknown");
check("ligne vide ne casse pas", V.renderOf(null), "unknown");

check("libelle au repos", V.RENDER_LABELS.resting, "au repos");
check("libelle fraicheur inconnue", V.RENDER_LABELS.unknown_freshness, "fraîcheur inconnue");

// ── fmtAge : jours au-dela de 48 h, heures en deca ───────────
check("age en jours", V.fmtAge({ data_last_seen: iso(37) }, NOW), "37 j");
check("age en heures sous 2 jours", V.fmtAge({ data_last_seen: iso(0.25) }, NOW), "6 h");
check("jamais zero heure", V.fmtAge({ data_last_seen: iso(0.001) }, NOW), "1 h");
check("repli sur le dernier run reussi",
  V.fmtAge({ data_last_seen: null, last_success_at: iso(3) }, NOW), "3 j");
check("aucune date => null", V.fmtAge({ data_last_seen: null, last_success_at: null }, NOW), null);

// ── panelLabels : l'homonymie Gaming ─────────────────────────
// `gaming` (Personnel) et `gaming_news` (Veille) s'appellent tous deux
// « Gaming ». Une phrase d'effet qui dit « Gaming » sans préciser désigne
// deux onglets à la fois.
const NAV = [
  { group: "Aujourd'hui", items: [{ id: "brief", label: "Brief du jour" }] },
  { group: "Veille", items: [{ id: "gaming_news", label: "Gaming" }, { id: "sport", label: "Sport" }] },
  { group: "Apprentissage", items: [{ id: "recos", label: "Recommandations" }, { id: "challenges", label: "Challenges" }] },
  { group: "Personnel", items: [{ id: "gaming", label: "Gaming" }, { id: "perf", label: "Forme" }] },
];
check("libelle simple", V.panelLabels(["perf"], NAV), ["Forme"]);
check("homonymes prefixes du groupe",
  V.panelLabels(["gaming", "gaming_news"], NAV), ["Gaming (Personnel)", "Gaming (Veille)"]);
check("id inconnu ignore", V.panelLabels(["nexistepas", "sport"], NAV), ["Sport"]);
check("aucun panel => liste vide", V.panelLabels([], NAV), []);

// ── joinFr ───────────────────────────────────────────────────
check("un seul", V.joinFr(["A"]), "A");
check("deux", V.joinFr(["A", "B"]), "A et B");
check("trois", V.joinFr(["A", "B", "C"]), "A, B et C");
check("vide", V.joinFr([]), "");

// ── effectSentence : UN gabarit, appele des deux cotes ───────
// Il en existait deux copies (module + JSX). Le jour ou l'une bouge, l'autre
// derive en silence.
check("un onglet => verbe au singulier",
  V.effectSentence(["Forme"]), "Forme affiche encore des données figées.");
check("plusieurs onglets => verbe au pluriel",
  V.effectSentence(["Recommandations", "Challenges"]),
  "Recommandations et Challenges affichent encore des données figées.");
check("aucun libelle => aucune phrase", V.effectSentence([]), null);

// ── sectionSummary vs rowSummary : jamais la meme phrase deux fois ─
// Une section a UNE seule brique degradee - le cas le plus courant - voyait la
// phrase de section et celle de la ligne s'afficher octet pour octet
// identiques, a deux lignes d'ecart. Principe 5 : une seule surface par verite.
const APPR = [
  { pipeline_id: "weekly_analysis", domain: "apprentissage", status: "failing",
    panels: ["recos", "challenges"], data_last_seen: iso(118) },
];
check("une seule brique degradee => la section se tait",
  V.sectionSummary(APPR, NAV), null);
check("... et c'est la ligne qui parle",
  V.rowSummary(APPR[0], NAV, 1),
  "Recommandations et Challenges affichent encore des données figées.");

const DEUX_BAD = [
  { status: "failing", panels: ["perf"] },
  { status: "stale", panels: ["sport"] },
];
check("deux briques degradees => la section agrege",
  V.sectionSummary(DEUX_BAD, NAV),
  "Forme et Sport affichent encore des données figées.");
check("... et les lignes se taisent", V.rowSummary(DEUX_BAD[0], NAV, 2), null);

check("section saine => aucune phrase",
  V.sectionSummary([{ status: "ok", data_last_seen: iso(0.1), max_age_hours: 30, panels: ["brief"] }], NAV),
  null);
check("ligne saine => aucune phrase",
  V.rowSummary({ status: "ok", data_last_seen: iso(0.1), max_age_hours: 30, panels: ["brief"] }, NAV, 0),
  null);
check("sans panels, l'impact declare prend le relais (ligne)",
  V.rowSummary({ status: "failing", panels: [], impact: "Les sauvegardes sont arrêtées." }, NAV, 1),
  "Les sauvegardes sont arrêtées.");
check("sans panels, l'impact declare prend le relais (section)",
  V.sectionSummary([
    { status: "failing", panels: [], impact: "Les sauvegardes sont arrêtées." },
    { status: "stale", panels: [], impact: "Le contrôle a gelé." },
  ], NAV),
  "Les sauvegardes sont arrêtées. Le contrôle a gelé.");
check("les onglets ne sont jamais cites deux fois",
  V.sectionSummary([{ status: "failing", panels: ["perf"] }, { status: "stale", panels: ["perf"] }], NAV),
  "Forme affiche encore des données figées.");

// ── groupByDomain : ordre fixe, orphelins visibles ───────────
const ROWS = [
  { pipeline_id: "backup_supabase", domain: "socle", status: "ok", data_last_seen: null, panels: [] },
  { pipeline_id: "weekly_analysis", domain: "apprentissage", status: "failing", panels: ["recos"], data_last_seen: iso(118) },
  { pipeline_id: "daily_digest", domain: "veille_ia", status: "ok", data_last_seen: iso(0.1), max_age_hours: 30, panels: ["brief"] },
  { pipeline_id: "orphelin", domain: "nimporte_quoi", status: "ok", data_last_seen: iso(1), max_age_hours: 30, panels: [] },
];
const sections = V.groupByDomain(ROWS);
check("ordre fixe du vocabulaire, orphelins en fin",
  sections.map(s => s.key), ["veille_ia", "apprentissage", "socle", "__unclassified"]);
check("une section vide n'apparait pas",
  sections.some(s => s.key === "perso"), false);
check("libelle de section", sections[1].label, "Apprentissage");
check("compteur de degrades", sections[1].degraded, 1);
check("une brique orpheline reste visible",
  sections[3].rows.map(r => r.pipeline_id), ["orphelin"]);
check("les 7 domaines sont declares", V.DOMAINS.map(d => d.key),
  ["veille_ia", "apprentissage", "veille_satellite", "mediatheque", "perso", "business", "socle"]);
check("compteur de briques au repos", sections.map(s => s.resting), [0, 0, 0, 0]);
check("compteur de briques non mesurees", sections.map(s => s.unmeasured), [0, 0, 1, 0]);

// ── sectionStateLabel : un vert non mesure est un mensonge poli ──
// Le Socle n'a AUCUNE sonde de fraicheur sur ses deux briques : sans ce
// comptage il annoncerait « tout va bien » tous les jours, replie par defaut.
check("section dont tout est mesure et frais", V.sectionStateLabel(sections[0]), "tout va bien");
check("section degradee", V.sectionStateLabel(sections[1]), "1 dégradé");
check("section non mesuree ne dit JAMAIS tout va bien",
  V.sectionStateLabel(sections[2]), "1 brique · 1 non mesurée");
check("deux briques non mesurees (le Socle reel)",
  V.sectionStateLabel({ rows: [1, 2], degraded: 0, resting: 0, unmeasured: 2 }),
  "2 briques · 2 non mesurées");
check("repos et non mesure cohabitent",
  V.sectionStateLabel({ rows: [1, 2, 3, 4, 5, 6], degraded: 0, resting: 4, unmeasured: 1 }),
  "6 briques · 4 au repos · 1 non mesurée");
check("le degrade prime sur tout le reste",
  V.sectionStateLabel({ rows: [1, 2, 3], degraded: 2, resting: 1, unmeasured: 0 }),
  "2 dégradés");

// ── globalVerdict : et la surveillance du surveillant ────────
const FRESH_CHECK = ROWS.map(r => ({ ...r, checked_at: new Date(NOW - 3600000).toISOString() }));
const v = V.globalVerdict(FRESH_CHECK, NOW);
check("total", v.total, 4);
check("pannes", v.failing, 1);
check("figes", v.stale, 0);
check("degrades", v.degraded, 1);
check("le controle est recent", v.checkStale, false);
check("pas vide", v.empty, false);
// « N briques surveillees » attribuait un vert aux briques que personne ne
// mesure. Le verdict doit pouvoir dire « 3 mesurees sur 4 ».
check("briques non mesurees comptees a part", v.unmeasured, 1);
check("briques reellement mesurees", v.measured, 3);
check("mesurees + non mesurees = total", v.measured + v.unmeasured, v.total);
const ALL_MEASURED = V.globalVerdict(
  [{ status: "ok", data_last_seen: iso(0.1), max_age_hours: 30, checked_at: iso(0.04) }], NOW);
check("tout mesure => aucun angle mort", ALL_MEASURED.unmeasured, 0);
check("une brique au repos reste mesuree",
  V.globalVerdict([{ status: "ok", data_last_seen: iso(37), max_age_hours: null }], NOW).measured, 1);
check("une brique en panne compte comme mesuree (elle est visible)",
  V.globalVerdict([{ status: "failing", data_last_seen: null }], NOW).unmeasured, 0);

const OLD_CHECK = ROWS.map(r => ({ ...r, checked_at: new Date(NOW - 72 * 3600000).toISOString() }));
check("controle vieux de 72 h => alerte", V.globalVerdict(OLD_CHECK, NOW).checkStale, true);
check("seuil de garde a 48 h", V.CHECK_STALE_MS, 48 * 3600 * 1000);

const EMPTY = V.globalVerdict([], NOW);
check("table vide => empty, jamais 'tout va bien'", EMPTY.empty, true);
check("table vide => aucune fausse alerte de garde", EMPTY.checkStale, false);

console.log();
if (failures) { console.log(`${failures} echec(s)`); process.exit(1); }
console.log("Tous les checks passent.");
