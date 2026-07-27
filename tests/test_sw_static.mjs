// Verrouille STATIC[] de sw.js : bon prefixe de base + existence sur disque.
// Run: node tests/test_sw_static.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "/jarvis-cockpit/";   // GitHub Pages de projet — voir docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md
const SW = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");
const ENTRY_PAGES = ["index.html", "mediatheque.html"];
const HTML_BY_PAGE = new Map(
  ENTRY_PAGES.map((p) => [p, fs.readFileSync(path.join(ROOT, p), "utf8")])
);

let failures = 0;
function check(name, ok, detail) {
  if (ok) { console.log(`ok   ${name}`); return; }
  failures++;
  console.log(`FAIL ${name}${detail ? "\n  " + detail : ""}`);
}

const block = SW.match(/const STATIC = \[([\s\S]*?)\];/);
check("STATIC[] est present dans sw.js", !!block);

const entries = block
  ? [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  : [];
check("STATIC[] n'est pas vide", entries.length > 0, `${entries.length} entrees`);

// 1. Toute entree porte le prefixe de base.
const badPrefix = entries.filter((e) => !e.startsWith(BASE));
check("toutes les entrees portent le prefixe de base", badPrefix.length === 0,
  badPrefix.slice(0, 5).join("\n  "));

// 2. Toute entree pointe un fichier reellement present sur le disque.
//    On retire le prefixe et la query string ?v=N avant de resoudre.
const missing = entries.filter((e) => {
  const rel = e.slice(BASE.length).split("?")[0];
  if (rel === "") return false;                       // la racine du site
  return !fs.existsSync(path.join(ROOT, rel));
});
check("toutes les entrees existent sur le disque", missing.length === 0,
  missing.slice(0, 5).join("\n  "));

// 3. Les DEUX pages d'entree enregistrent le service worker en relatif, pas
//    en absolu — un chemin absolu est un 404 sous /jarvis-cockpit/ (voir
//    docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md, section
//    "Prerequis"). mediatheque.html est celle qui compte pour l'installabilite
//    iOS ; avant BLOCKING 3 seule index.html etait verifiee ici.
for (const page of ENTRY_PAGES) {
  check(`${page} enregistre le SW en chemin relatif`,
    /serviceWorker\.register\(\s*"\.\/sw\.js"/.test(HTML_BY_PAGE.get(page)),
    "attendu: navigator.serviceWorker.register(\"./sw.js\")");
}

// 4. STATIC[] doit correspondre a une RE-DERIVATION INDEPENDANTE depuis les
//    deux pages HTML, sur la meme logique que scripts/sync-sw.mjs mais
//    ECRITE SEPAREMENT ici (pas d'import, pas de helper partage) : le but
//    est d'avoir deux lectures qui doivent s'accorder plutot qu'une source
//    unique que le test se contenterait de rejouer — un helper partage
//    ferait d'accord les deux implementations meme si les deux avaient tort.
//    Sans cette assertion, editer mediatheque.html (ou renommer un asset
//    qu'il reference) sans relancer sync-sw.mjs laisse STATIC[] perime :
//    caches.addAll() echoue en bloc et l'echec est avale par sw.js:105,
//    silencieusement — precisement le bug que cette branche corrige.
const ASSET_RE = /(?:href|src)="(cockpit\/[^"]+|assets\/[^"]+|sw\.js|manifest[^"]*\.json)"/g;
const foundAssets = new Set();
for (const page of ENTRY_PAGES) {
  const html = HTML_BY_PAGE.get(page);
  ASSET_RE.lastIndex = 0;
  let m;
  while ((m = ASSET_RE.exec(html))) foundAssets.add(m[1]);
}
const expectedShells = [
  "",
  ...ENTRY_PAGES,
  ...[...foundAssets].filter((p) => p.startsWith("manifest")),
];
const expectedStatic = [...new Set([
  ...expectedShells,
  ...[...foundAssets].filter((p) => !p.startsWith("manifest")),
])].map((p) => BASE + p).sort();

const actualSorted = [...entries].sort();
const missingFromSw = expectedStatic.filter((e) => !actualSorted.includes(e));
const extraInSw = actualSorted.filter((e) => !expectedStatic.includes(e));
check("STATIC[] de sw.js correspond a une re-derivation independante depuis index.html + mediatheque.html",
  missingFromSw.length === 0 && extraInSw.length === 0,
  [
    missingFromSw.length ? `absent(s) de sw.js (relancer node scripts/sync-sw.mjs ?) : ${missingFromSw.join(", ")}` : "",
    extraInSw.length ? `en trop dans sw.js (asset renomme/supprime ?) : ${extraInSw.join(", ")}` : "",
  ].filter(Boolean).join("\n  "));

// 5. Parite des versions ?v= entre les deux pages d'entree. Rien ne
//    verrouillait structurellement cet invariant avant BLOCKING 3 — seule la
//    discipline sur six bumps precedents l'a maintenu. Une derive laisserait
//    l'une des deux pages servir un build cache plus ancien, silencieusement.
function versionsByPath(html) {
  const map = new Map();
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const [p, q] = m[1].split("?");
    if (q === undefined) continue;               // pas de version a comparer
    if (!/^(cockpit\/|assets\/)/.test(p)) continue; // CDN/fonts hors sujet
    map.set(p, q);
  }
  return map;
}
const vIndex = versionsByPath(HTML_BY_PAGE.get("index.html"));
const vMdt = versionsByPath(HTML_BY_PAGE.get("mediatheque.html"));
const versionMismatches = [];
for (const [assetPath, v] of vIndex) {
  if (vMdt.has(assetPath) && vMdt.get(assetPath) !== v) {
    versionMismatches.push(`${assetPath} : index.html=${v} mediatheque.html=${vMdt.get(assetPath)}`);
  }
}
check("les assets partages par index.html et mediatheque.html portent le meme ?v=",
  versionMismatches.length === 0, versionMismatches.join("\n  "));

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
