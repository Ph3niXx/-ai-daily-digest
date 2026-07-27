// Auto-sync sw.js STATIC[] depuis les pages d'entree HTML.
// Run: node scripts/sync-sw.mjs
//
// Le site est un GitHub Pages DE PROJET, servi sous /jarvis-cockpit/ : un
// chemin absolu depuis la racine du domaine est un 404 en production, et
// caches.addAll() rejette en bloc au premier echec. D'ou BASE, et d'ou
// tests/test_sw_static.mjs qui verrouille l'invariant.
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const BASE = "/jarvis-cockpit/";
const PAGES = ["index.html", "mediatheque.html"];
const SW_PATH = path.join(ROOT, "sw.js");
const SW = fs.readFileSync(SW_PATH, "utf8");

// Match: <link href="cockpit/styles*.css?v=N">, <script src="cockpit/*.js[x]?v=N">
const re = /(?:href|src)="(cockpit\/[^"]+|assets\/[^"]+|sw\.js|manifest[^"]*\.json)"/g;
const found = new Set();
for (const page of PAGES) {
  const file = path.join(ROOT, page);
  if (!fs.existsSync(file)) continue;       // mediatheque.html n'existe pas encore
  const html = fs.readFileSync(file, "utf8");
  let m;
  while ((m = re.exec(html))) found.add(m[1]);
  re.lastIndex = 0;
}

const shells = [
  "",                                        // la racine du site
  ...PAGES.filter((p) => fs.existsSync(path.join(ROOT, p))),
  ...[...found].filter((p) => p.startsWith("manifest")),
];

const STATIC = [...new Set([
  ...shells,
  ...[...found].filter((p) => !p.startsWith("manifest")),
])].map((p) => BASE + p).sort();

// Garde-fou : une entree qui n'existe pas sur le disque ferait echouer
// caches.addAll() EN BLOC, silencieusement. On refuse de generer.
const missing = STATIC.filter((e) => {
  const rel = e.slice(BASE.length).split("?")[0];
  return rel !== "" && !fs.existsSync(path.join(ROOT, rel));
});
if (missing.length) {
  console.error("[sync-sw] ABANDON — entrees introuvables sur le disque :");
  missing.forEach((m) => console.error("  " + m));
  process.exit(1);
}

const cacheMatch = SW.match(/const CACHE = "cockpit-v(\d+)";/);
const newVersion = cacheMatch ? Number(cacheMatch[1]) + 1 : 1;

const newStatic = "const STATIC = [\n" +
  STATIC.map((p) => `  ${JSON.stringify(p)},`).join("\n") + "\n];";

let next = SW.replace(/const CACHE = "cockpit-v\d+";/, `const CACHE = "cockpit-v${newVersion}";`);
next = next.replace(/const STATIC = \[[\s\S]*?\];/, newStatic);

fs.writeFileSync(SW_PATH, next, "utf8");
console.log(`[sync-sw] CACHE → cockpit-v${newVersion}, STATIC → ${STATIC.length} entrees`);
