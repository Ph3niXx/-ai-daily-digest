// Verrouille STATIC[] de sw.js : bon prefixe de base + existence sur disque.
// Run: node tests/test_sw_static.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "/jarvis-cockpit/";   // GitHub Pages de projet — voir docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md
const SW = fs.readFileSync(path.join(ROOT, "sw.js"), "utf8");

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

// 3. index.html enregistre le service worker en relatif, pas en absolu.
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
check("index.html enregistre le SW en chemin relatif",
  /serviceWorker\.register\(\s*"\.\/sw\.js"/.test(HTML),
  "attendu: navigator.serviceWorker.register(\"./sw.js\")");

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
