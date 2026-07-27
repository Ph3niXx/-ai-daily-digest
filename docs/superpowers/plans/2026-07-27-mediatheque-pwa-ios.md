# Médiathèque PWA iOS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Une icône « Médiathèque » sur l'écran d'accueil iOS qui ouvre directement sur la médiathèque, démarre vite et se manipule au pouce, sans toucher au cockpit desktop.

**Architecture:** Une seconde page d'entrée `mediatheque.html` charge exactement les mêmes fichiers que le cockpit (même `panel-mediatheque.jsx`, même `mediatheque-view.js`) mais sans la sidebar, sans les 28 autres panels et sans Tier 1 — 71 ko de JSX à transpiler au lieu de 859. Un mini-bootstrap `boot-mediatheque.js` remplace `bootstrap.js`. La passe mobile vit dans `styles-mediatheque.css` lui-même, selon la convention posée par `styles-mobile.css:3-7`.

**Tech Stack:** React 18 + `@babel/standalone` via CDN (aucune étape de build), Supabase REST + Google OAuth, service worker maison, GitHub Pages de projet servi sous `/jarvis-cockpit/`. Tests : scripts node autonomes (pas de `package.json`, pas de framework).

**Spec de référence :** `docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md`

## Global Constraints

- **Pas d'imports ES modules dans `cockpit/`** — incompatible Babel standalone. Les composants s'exposent sur `window.X`.
- **Base URL réelle : `/jarvis-cockpit/`** (GitHub Pages de projet). Tout chemin absolu commençant par `/` est un 404 en production. Utiliser des chemins relatifs.
- **Jamais éditer `STATIC[]` ou `CACHE` de `sw.js` à la main** — c'est `node scripts/sync-sw.mjs` qui les génère (règle cardinale `CLAUDE.md`).
- **Cible tactile : 44 px** (WCAG 2.1 AAA, seuil déjà retenu par le projet dans `styles-mobile.css:233`).
- **Champs focusables : `font-size` ≥ 16 px sous 760 px** — en dessous, Safari iOS zoome automatiquement la page à la mise au point.
- **CSP** : `'unsafe-eval'` est requis par Babel standalone. La CSP de `mediatheque.html` doit être copiée **verbatim** depuis `index.html:6`.
- **Aucune logique métier dupliquée.** Si le portage exige une variante d'une fonction de `mediatheque-view.js`, le principe directeur de la spec est violé — s'arrêter et remonter le problème.
- **Tout nouvel `event_type` de télémétrie** → entrée dans `docs/telemetry.md` **avant** le commit. Ici on n'ajoute qu'un champ de payload, donc pas de nouvel `event_type`.
- **Lancer `validate_spec.py` avec `PYTHONUTF8=1`** — il lève un `UnicodeEncodeError` sur les ✅ en console Windows alors que la validation est passée.
- **Messages de commit en français**, préfixe conventionnel (`feat:` / `fix:` / `docs:` / `chore:`), à l'image de l'historique du dépôt.

## File Structure

| Fichier | Responsabilité | Tâche |
|---|---|---|
| `probe-auth.html`, `probe-manifest.json` | **Créés puis supprimés.** Sonde jetable : l'OAuth survit-il au mode `standalone` ? | 0, supprimés en 6 |
| `index.html` | **Modifié.** Enregistrement SW en relatif (1 ligne) + `apple-touch-icon` (1 ligne). | 1 |
| `manifest.json` | **Modifié.** `start_url: "./"`. | 1 |
| `scripts/sync-sw.mjs` | **Modifié.** Lit les deux pages, préfixe la base, assertion d'existence sur disque. | 1 |
| `assets/icon-cockpit-180.png` | **Créé.** `apple-touch-icon` du cockpit, qui n'en a pas. | 1 |
| `tests/test_sw_static.mjs` | **Créé.** Verrouille le préfixe et l'existence des entrées `STATIC[]`. | 1 |
| `mediatheque.html` | **Créé.** Page d'entrée mobile : CSP, CDN, CSS, libs, 2 scripts Babel. Aucune logique. | 2 |
| `manifest-mediatheque.json` | **Créé.** Identité PWA de la médiathèque (`start_url`, icône, nom). | 2 |
| `assets/icon-mediatheque-180.png` | **Créé.** `apple-touch-icon` de la médiathèque. | 2 |
| `cockpit/lib/boot-mediatheque.js` | **Créé.** Auth → fetch Tier 2 → mount, puis refresh à la reprise. Remplace `bootstrap.js`. | 2, 6 |
| `cockpit/lib/data-loader.js` | **Modifié.** `loadUserProfile` ajouté à l'objet exporté (1 ligne). | 2 |
| `tests/test_mediatheque_entry.mjs` | **Créé.** Verrouille l'accord globales lues ↔ scripts chargés. | 3 |
| `.github/workflows/tests.yml` | **Créé.** Lance les tests node (aucun workflow ne le fait aujourd'hui). | 3 |
| `cockpit/styles-mediatheque.css` | **Modifié.** Toute la passe mobile, puis la feuille plein écran. | 4, 5 |
| `cockpit/panel-mediatheque.jsx` | **Modifié.** `inputMode` (4), bouton `✕` de fiche (5), champ `surface` de télémétrie (6). | 4, 5, 6 |
| `docs/telemetry.md`, `docs/specs/*`, `docs/architecture/*` | **Modifiés.** Sonde de survie, spec d'onglet, flow, ADR-30. | 6 |

---

## Task 0 : Sonde OAuth en mode standalone

**Bloquant.** Si l'authentification Google ne survit pas au mode `standalone` sur iOS, toute la suite du plan est caduque. Cette tâche ne produit pas de code destiné à être conservé — c'est une expérience jetable, poussée en production, testée sur l'iPhone, puis supprimée.

**Files:**
- Create: `probe-auth.html` (temporaire, supprimé à l'étape 6)

**Interfaces:**
- Consumes: `window.cockpitAuth.waitForAuth()` (`cockpit/lib/auth.js`), `window.sb` (`cockpit/lib/supabase.js`)
- Produces: une réponse binaire — l'OAuth fonctionne en `standalone`, ou il faut basculer sur le repli `display: "minimal-ui"`.

- [ ] **Step 1 : Créer la sonde**

Créer `probe-auth.html` à la racine. La CSP fait ~2000 caractères et n'est pas recopiée
dans ce plan : l'extraire mécaniquement de `index.html:6`, qui reste la source de vérité.

```bash
sed -n '6p' index.html
```

Coller la ligne obtenue **telle quelle** à la place du marqueur ci-dessous. Ne pas la
réécrire de mémoire : `'unsafe-eval'` y est requis par Babel standalone, et
`connect-src` doit lister Supabase, AniList et TMDB.

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="COLLER ICI LA LIGNE content=... DE index.html:6 VERBATIM">
<title>Probe auth</title>
<link rel="manifest" href="probe-manifest.json">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Probe">
<style>body{font:16px system-ui;padding:24px;line-height:1.6}</style>
</head>
<body>
<div id="out">Démarrage…</div>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="cockpit/themes.js"></script>
<script src="cockpit/lib/supabase.js"></script>
<script src="cockpit/lib/auth.js"></script>
<script>
(async function(){
  const out = document.getElementById("out");
  const log = (s) => { out.innerHTML += "<br>" + s; };
  log("display-mode standalone : " + window.matchMedia("(display-mode: standalone)").matches);
  log("navigator.standalone : " + window.navigator.standalone);
  try {
    await window.cockpitAuth.waitForAuth();
    const { data } = await window.sb.client.auth.getSession();
    log("<b>CONNECTÉ</b> — " + (data.session && data.session.user.email));
  } catch (e) {
    log("<b>ÉCHEC</b> — " + e.message);
  }
})();
</script>
</body>
</html>
```

Créer `probe-manifest.json` :

```json
{
  "name": "Probe",
  "short_name": "Probe",
  "start_url": "./probe-auth.html",
  "display": "standalone",
  "background_color": "#F5EFE4",
  "theme_color": "#C2410C"
}
```

- [ ] **Step 2 : Déployer**

```bash
git add probe-auth.html probe-manifest.json
git commit -m "chore(probe): sonde OAuth standalone iOS (temporaire)"
git push -u origin feat/mediatheque-pwa-ios
```

Fusionner sur `main` ou activer Pages sur la branche — la sonde doit être servie par GitHub Pages pour être testable. Attendre la fin du déploiement (~2 min).

- [ ] **Step 3 : Tester sur l'iPhone — c'est la seule étape qui compte**

1. Ouvrir `https://ph3nixx.github.io/jarvis-cockpit/probe-auth.html` dans **Safari**. Vérifier que la page affiche `CONNECTÉ` (établit que la sonde marche hors PWA).
2. Partager → **« Sur l'écran d'accueil »**. Fermer Safari entièrement.
3. Lancer l'app depuis l'écran d'accueil.
4. Relever ce qui s'affiche.

Attendu si tout va bien : `display-mode standalone : true`, puis `CONNECTÉ` après le passage par Google.

- [ ] **Step 4 : Consigner le résultat et décider**

| Observation | Décision |
|---|---|
| `CONNECTÉ` s'affiche dans l'app installée | Continuer le plan tel quel. |
| La connexion s'ouvre dans Safari et l'app reste bloquée | Repli 1 : passer `display` à `"minimal-ui"` dans les deux manifests. Refaire l'étape 3. |
| Repli 1 insuffisant | Repli 2 : activer le flow PKCE côté Supabase (`auth: { flowType: 'pkce' }` dans `cockpit/lib/supabase.js`). Traiter comme une tâche à part et **remonter au propriétaire du projet avant de continuer**. |

Écrire le résultat observé dans `docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md`, section « Risques et replis », en remplaçant la mention « à tester en premier » par le constat daté.

- [ ] **Step 5 : Commit du constat**

```bash
git add docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md
git commit -m "docs(mediatheque): consigner le resultat de la sonde OAuth standalone"
```

> La sonde n'est **pas** supprimée ici — elle sert de témoin jusqu'à ce que `mediatheque.html` s'authentifie pour de vrai. Suppression en Task 6.

---

## Task 1 : Corriger l'enregistrement du service worker et le préfixe de base

Bug existant, indépendant du reste, et prérequis du démarrage rapide. Aujourd'hui le service worker ne s'enregistre pas (`/sw.js` → 404), et même s'il s'enregistrait, ses 88 entrées de précache sont des 404.

**Files:**
- Modify: `index.html:126-131` (enregistrement SW), `index.html:8-9` (icônes)
- Modify: `manifest.json:5`
- Modify: `scripts/sync-sw.mjs`
- Create: `tests/test_sw_static.mjs`
- Create: `assets/icon-cockpit-180.png`

**Interfaces:**
- Produces: `sw.js` avec un `STATIC[]` préfixé `/jarvis-cockpit/` et vérifié ; `tests/test_sw_static.mjs` exécutable via `node tests/test_sw_static.mjs` (exit 1 si échec). Task 3 s'appuie sur `sync-sw.mjs` sachant lire deux pages HTML.

- [ ] **Step 1 : Écrire le test qui échoue**

Créer `tests/test_sw_static.mjs`. Le format suit `tests/test_mediatheque_view.mjs` : pas de framework, un `check()` maison, `process.exit(failures ? 1 : 0)`.

```js
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
```

- [ ] **Step 2 : Lancer le test pour vérifier qu'il échoue**

```bash
node tests/test_sw_static.mjs
```

Attendu : **FAIL** sur trois points — `toutes les entrees portent le prefixe de base` (les 88 entrées commencent par `/cockpit/`, `/index.html` ou `/`), `toutes les entrees existent sur le disque`, et `index.html enregistre le SW en chemin relatif`.

- [ ] **Step 3 : Corriger `scripts/sync-sw.mjs`**

Remplacer intégralement le fichier :

```js
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
```

- [ ] **Step 4 : Corriger l'enregistrement du service worker**

Dans `index.html`, remplacer `navigator.serviceWorker.register("/sw.js")` (ligne 128) par :

```js
      navigator.serviceWorker.register("./sw.js").catch(() => {});
```

Le chemin relatif donne aussi le bon **scope** (`/jarvis-cockpit/`), qui couvrira `mediatheque.html` sans déclaration supplémentaire.

- [ ] **Step 5 : Corriger `manifest.json`**

Remplacer `"start_url": "/",` par `"start_url": "./",`.

- [ ] **Step 6 : Ajouter l'`apple-touch-icon` du cockpit**

iOS ignore les icônes SVG déclarées dans un manifest et met une capture d'écran de la page à la place : un PNG est la seule façon d'avoir une vraie icône.

Créer `assets/icon-cockpit.svg` avec ce contenu — c'est la cible concentrique de `index.html:8`, posée sur le fond du thème, sans transparence (iOS n'aime pas les icônes transparentes, il les compose sur du noir) :

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#F5EFE4"/>
  <g fill="none" stroke="#C2410C" stroke-width="12" stroke-linecap="round">
    <circle cx="90" cy="90" r="52"/>
    <circle cx="90" cy="90" r="20"/>
  </g>
</svg>
```

Le convertir en `assets/icon-cockpit-180.png` à 180 × 180. Sans dépendance node dans ce dépôt, au choix : ouvrir le SVG dans un navigateur et faire une capture cadrée, passer par un convertisseur SVG→PNG, ou `magick assets/icon-cockpit.svg -resize 180x180 assets/icon-cockpit-180.png` si ImageMagick est installé. Conserver le `.svg` dans `assets/` comme source.

**Vérifier avant de continuer** que le PNG fait bien 180 × 180 et n'est pas transparent :

```bash
node -e "const b=require('fs').readFileSync('assets/icon-cockpit-180.png');console.log('PNG:',b.slice(1,4).toString()==='PNG','w:',b.readUInt32BE(16),'h:',b.readUInt32BE(20))"
```

Attendu : `PNG: true w: 180 h: 180`.

Ajouter dans `<head>` d'`index.html`, après la ligne 9 :

```html
<link rel="apple-touch-icon" href="assets/icon-cockpit-180.png">
```

- [ ] **Step 7 : Régénérer `sw.js` et relancer le test**

```bash
node scripts/sync-sw.mjs
node tests/test_sw_static.mjs
```

Attendu : `sync-sw` affiche `STATIC → 89 entrees` (88 + `assets/icon-cockpit-180.png`, `mediatheque.html` n'existant pas encore), puis **tous les tests passent**.

- [ ] **Step 8 : Commit**

```bash
git add index.html manifest.json scripts/sync-sw.mjs sw.js tests/test_sw_static.mjs assets/icon-cockpit-180.png
git commit -m "fix(pwa): le service worker ne s'enregistrait ni ne precachait rien

Le site est un GitHub Pages de projet servi sous /jarvis-cockpit/, mais
index.html enregistrait \"/sw.js\" (404, avale par son .catch) et les 88
entrees de STATIC[] pointaient sur la racine du domaine. Aucun service
worker n'a donc jamais tourne.

Enregistrement en relatif (donne aussi le bon scope), prefixe de base
dans sync-sw.mjs, et abandon de la generation si une entree n'existe pas
sur le disque — caches.addAll() rejette en bloc au premier 404.

Ajoute au passage l'apple-touch-icon PNG absent : iOS ignore les icones
SVG du manifest et met une capture d'ecran a la place."
```

---

## Task 2 : Page d'entrée, manifest et bootstrap

L'application existe et se lance. Elle est encore laide sur téléphone — c'est la Task 4 qui s'en occupe.

**Files:**
- Create: `mediatheque.html`, `manifest-mediatheque.json`, `cockpit/lib/boot-mediatheque.js`, `assets/icon-mediatheque-180.png`
- Modify: `cockpit/lib/data-loader.js:4871-4885` (une ligne)

**Interfaces:**
- Consumes: `window.cockpitAuth.waitForAuth()`, `window.cockpitDataLoader.loadPanel("mediatheque")`, `window.PanelMediatheque` (`panel-mediatheque.jsx:1354`), `scripts/sync-sw.mjs` sachant lire deux pages (Task 1).
- Produces: `mediatheque.html` servie sous `/jarvis-cockpit/mediatheque.html` ; `window.cockpitDataLoader.loadUserProfile()` devient appelable ; `window.__mdtRefresh()` exposé pour Task 6.

> **Note pour l'implémenteur :** `PanelMediatheque({ data, onNavigate })` déclare deux props mais **n'en utilise aucune** — `data` est immédiatement masqué par `const D = window.MEDIATHEQUE_DATA` (`panel-mediatheque.jsx:750`) et `onNavigate` n'apparaît nulle part ailleurs dans le fichier. On le monte donc sans props.

- [ ] **Step 1 : Exporter `loadUserProfile`**

Dans `cockpit/lib/data-loader.js`, l'objet exporté commence à la ligne 4871. Ajouter `loadUserProfile` juste après `loadPanel` :

```js
  window.cockpitDataLoader = {
    bootTier1,
    loadPanel,
    loadUserProfile,      // consomme par boot-mediatheque.js (page d'entree mobile)
    invalidateCache,
```

`loadUserProfile` est défini ligne 97-99 et n'était jusqu'ici appelé qu'en interne par `bootTier1`. Aucun changement de comportement.

- [ ] **Step 2 : Créer le manifest**

`manifest-mediatheque.json` :

```json
{
  "name": "Médiathèque",
  "short_name": "Médiathèque",
  "description": "Anime, séries et films — quoi regarder ce soir",
  "start_url": "./mediatheque.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#F5EFE4",
  "theme_color": "#C2410C",
  "icons": [
    { "src": "assets/icon-mediatheque-180.png", "sizes": "180x180", "type": "image/png" }
  ]
}
```

Créer `assets/icon-mediatheque.svg`. Le glyphe doit être **franchement distinct** de la cible concentrique du cockpit : les deux icônes cohabiteront sur l'écran d'accueil et doivent se différencier d'un coup d'œil, à 60 px de côté.

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#F5EFE4"/>
  <path d="M74 58 L124 90 L74 122 Z" fill="#C2410C" stroke="#C2410C" stroke-width="10" stroke-linejoin="round"/>
</svg>
```

Le convertir en `assets/icon-mediatheque-180.png` par la même méthode qu'en Task 1, Step 6, puis vérifier :

```bash
node -e "const b=require('fs').readFileSync('assets/icon-mediatheque-180.png');console.log('PNG:',b.slice(1,4).toString()==='PNG','w:',b.readUInt32BE(16),'h:',b.readUInt32BE(20))"
```

Attendu : `PNG: true w: 180 h: 180`.

- [ ] **Step 3 : Créer la page d'entrée**

`mediatheque.html`. La liste des scripts est dérivée des globales que `panel-mediatheque.jsx` lit réellement : `MEDIATHEQUE_DATA`, `PROFILE_DATA`, `SUPABASE_URL`, `anilist`, `tmdb`, `mdtView`, `sb`, `cockpitToast`, `track`. La Task 3 verrouille cet accord par un test.

Même règle qu'en Task 0 pour la CSP — l'extraire, ne pas la réécrire :

```bash
sed -n '6p' index.html
```

```html
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<meta http-equiv="Content-Security-Policy" content="COLLER ICI LA LIGNE content=... DE index.html:6 VERBATIM">
<title>Médiathèque</title>
<link rel="manifest" href="manifest-mediatheque.json">
<link rel="apple-touch-icon" href="assets/icon-mediatheque-180.png">
<meta name="theme-color" content="#F5EFE4">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Médiathèque">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..700&family=Inter:wght@400;500;600;700&family=Instrument+Serif&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="cockpit/styles.css?v=35">
<link rel="stylesheet" href="cockpit/styles-mediatheque.css?v=6">
<link rel="stylesheet" href="cockpit/styles-mobile.css?v=3">
</head>
<body>
<div id="root"></div>

<!-- Libs externes : memes URLs et memes SRI que index.html -->
<script src="https://unpkg.com/react@18.3.1/umd/react.development.js" integrity="sha384-hD6/rw4ppMLGNu3tX5cjIb+uRZ7UkRJ6BPkLpg4hAu/6onKUg4lLsHAs9EBPT82L" crossorigin="anonymous"></script>
<script src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js" integrity="sha384-u6aeetuaXnQ38mYT8rp6sbXaQe3NL9t+IBXmnYxwkUI2Hw4bsp2Wvmx4yRQF1uAm" crossorigin="anonymous"></script>
<script src="https://unpkg.com/@babel/standalone@7.29.0/babel.min.js" integrity="sha384-m08KidiNqLdpJqLq95G/LEi8Qvjl/xUYll3QILypMoQ65QorJ9Lvtp2RXYGBFj1y" crossorigin="anonymous"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.2.3/dist/purify.min.js"></script>

<!-- nav.js AVANT data-loader.js : ce dernier lit window.COCKPIT_NAV (data-loader.js:1167) -->
<script src="cockpit/nav.js?v=2"></script>
<script src="cockpit/themes.js?v=2"></script>

<script src="cockpit/lib/supabase.js?v=1"></script>
<script src="cockpit/lib/telemetry.js?v=1"></script>
<script src="cockpit/lib/auth.js?v=2"></script>
<script src="cockpit/lib/dialog.js?v=1"></script>
<script src="cockpit/lib/data-loader.js?v=39"></script>
<script src="cockpit/lib/anilist.js?v=2"></script>
<script src="cockpit/lib/tmdb.js?v=1"></script>
<script src="cockpit/lib/mediatheque-view.js?v=3"></script>

<!-- Formes de repli (le fetch Tier 2 les ecrase) -->
<script src="cockpit/data-mediatheque.js?v=1"></script>
<script src="cockpit/data-profile.js?v=2"></script>

<!-- Les DEUX seuls scripts que Babel doit transpiler. 71 ko contre 859 pour
     index.html : c'est toute la justification de cette page. Ne rien ajouter
     ici sans mesurer. -->
<script type="text/babel" src="cockpit/icons.jsx?v=3"></script>
<script type="text/babel" src="cockpit/panel-mediatheque.jsx?v=7"></script>

<script src="cockpit/lib/boot-mediatheque.js?v=1"></script>

<script>
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch(() => {});
    });
  }
</script>
</body>
</html>
```

- [ ] **Step 4 : Créer le bootstrap**

`cockpit/lib/boot-mediatheque.js` :

```js
// cockpit/lib/boot-mediatheque.js
// Point d'entree de mediatheque.html — l'equivalent de bootstrap.js pour la
// page mobile dediee, ampute de Tier 1.
//
// Ordre : auth → fetch Tier 2 → mount. On ne charge PAS bootTier1() : le panel
// ne lit rien de COCKPIT_DATA, seulement window.MEDIATHEQUE_DATA et la cle
// tmdb_api_key de PROFILE_DATA (panel-mediatheque.jsx:776). Tier 1 couterait
// 11 requetes dont articles/30j et signal_tracking pour rien.
(async function boot(){
  const loader = document.createElement("div");
  loader.id = "mdt-loader";
  loader.style.cssText = "position:fixed;inset:0;z-index:8000;display:flex;align-items:center;"
    + "justify-content:center;background:var(--bg,#F5EFE4);font-family:'Inter',system-ui,sans-serif;"
    + "color:#5E524A;font-size:13px;letter-spacing:.06em;text-transform:uppercase";
  loader.innerHTML = "<div>Chargement de la médiathèque…</div>";
  document.body.appendChild(loader);

  const removeLoader = () => {
    const l = document.getElementById("mdt-loader");
    if (l) l.remove();
  };

  // Recharge les donnees Tier 2 et re-rend. Expose pour l'ecouteur de reprise.
  async function refresh(){
    const dl = window.cockpitDataLoader;
    dl.invalidateCache("media_");
    dl.invalidateCache("jp_");
    dl.invalidateCache("user_profile");
    dl.invalidateCache("activity_brief");
    await loadData();
    if (window.__mdtRoot) window.__mdtRoot.render(React.createElement(window.PanelMediatheque));
  }

  async function loadData(){
    const dl = window.cockpitDataLoader;
    const [, profileRows] = await Promise.all([
      dl.loadPanel("mediatheque").catch((e) => { console.error("[boot-mdt] Tier 2", e); return null; }),
      dl.loadUserProfile().catch(() => []),
    ]);
    // Meme forme que hydrateGlobalsFromTier1() : le panel lit
    // PROFILE_DATA._values.tmdb_api_key et rien d'autre.
    if (window.PROFILE_DATA && profileRows && profileRows.length) {
      window.PROFILE_DATA._values = Object.fromEntries(
        profileRows.map((r) => [r.key, r.value])
      );
    }
  }

  try {
    if (!window.sb || !window.cockpitAuth || !window.cockpitDataLoader) {
      console.error("[boot-mdt] scripts lib manquants");
      removeLoader();
      return;
    }
    await window.cockpitAuth.waitForAuth();
    await loadData();
  } catch (e) {
    console.error("[boot-mdt]", e);
  }

  // Babel standalone compile les scripts type="text/babel" de facon asynchrone,
  // APRES les scripts classiques : window.PanelMediatheque n'existe pas encore.
  let waited = 0;
  while (!window.PanelMediatheque && waited < 15000) {
    await new Promise((r) => setTimeout(r, 50));
    waited += 50;
  }
  removeLoader();
  if (!window.PanelMediatheque) {
    console.error("[boot-mdt] PanelMediatheque jamais enregistre");
    document.getElementById("root").textContent = "Échec du chargement.";
    return;
  }
  window.__mdtRoot = ReactDOM.createRoot(document.getElementById("root"));
  window.__mdtRoot.render(React.createElement(window.PanelMediatheque));
  window.__mdtRefresh = refresh;
})();
```

- [ ] **Step 5 : Vérifier la forme de `PROFILE_DATA._values`**

Le panel lit `window.PROFILE_DATA._values.tmdb_api_key`. Confirmer que `hydrateGlobalsFromTier1()` dans `data-loader.js` construit `_values` de la même façon (paires `key`/`value` de la table `user_profile`) et **aligner le code ci-dessus s'il diffère** :

```bash
grep -n "_values" cockpit/lib/data-loader.js
```

Si la construction diffère (transformation, filtrage, sous-objets), reprendre **exactement** la même expression dans `loadData()`. Une divergence ici casse silencieusement la recherche TMDB.

- [ ] **Step 6 : Régénérer `sw.js`**

```bash
node scripts/sync-sw.mjs
node tests/test_sw_static.mjs
```

Attendu : `sync-sw` prend maintenant `mediatheque.html` en compte, et les tests passent. Si `sync-sw` **abandonne** en signalant une entrée introuvable, c'est le garde-fou de la Task 1 qui fonctionne : corriger le chemin fautif dans `mediatheque.html`.

- [ ] **Step 7 : Commit et déploiement**

```bash
git add mediatheque.html manifest-mediatheque.json cockpit/lib/boot-mediatheque.js \
        cockpit/lib/data-loader.js assets/icon-mediatheque-180.png sw.js
git commit -m "feat(mediatheque): page d'entree mobile dediee (PWA installable)

mediatheque.html charge les memes fichiers que le cockpit mais sans la
sidebar ni les 28 autres panels : 2 scripts Babel (71 ko) au lieu de 30
(859 ko). boot-mediatheque.js remplace bootstrap.js et saute Tier 1 — le
panel ne lit que MEDIATHEQUE_DATA et tmdb_api_key.

loadUserProfile passe dans l'objet exporte de data-loader.js pour eviter
de dupliquer la requete."
git push
```

- [ ] **Step 8 : Vérifier en production**

Déployer, puis ouvrir `https://ph3nixx.github.io/jarvis-cockpit/mediatheque.html`. Vérifier dans cet ordre :

1. La page se connecte et affiche la médiathèque (bibliothèque, rail, agenda).
2. La console n'a **aucun** `undefined is not an object` ni `X is not defined`.
3. La recherche en ligne renvoie des résultats **TMDB** — c'est ce qui prouve que `PROFILE_DATA._values.tmdb_api_key` a bien été hydraté.
4. `application` → `manifest` dans les outils de développement montre « Médiathèque ».

Si un `window.X` manque, la Task 3 va précisément empêcher que ça se reproduise.

---

## Task 3 : Test d'entrée et exécution des tests en CI

Le front se vérifie en production (2-3 min par itération). Ce test transforme la classe d'erreur la plus coûteuse — un `<script>` oublié dans `mediatheque.html` — en échec local instantané.

**Files:**
- Create: `tests/test_mediatheque_entry.mjs`, `.github/workflows/tests.yml`

**Interfaces:**
- Consumes: `mediatheque.html` et `cockpit/panel-mediatheque.jsx` (Task 2).
- Produces: `node tests/test_mediatheque_entry.mjs` (exit 1 si échec) ; workflow `tests` lançant tous les `tests/test_*.mjs`.

- [ ] **Step 1 : Écrire le test**

Créer `tests/test_mediatheque_entry.mjs` :

```js
// Verrouille l'accord entre les globales que panel-mediatheque.jsx LIT et les
// scripts que mediatheque.html CHARGE.
//
// Raison d'etre : le front se verifie en production (~3 min par iteration).
// Un <script> oublie coute un cycle complet pour un "undefined". C'est
// exactement ce qui est arrive avec PROFILE_DATA pendant la conception.
// Run: node tests/test_mediatheque_entry.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PANEL = fs.readFileSync(path.join(ROOT, "cockpit", "panel-mediatheque.jsx"), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "mediatheque.html"), "utf8");

let failures = 0;
function check(name, ok, detail) {
  if (ok) { console.log(`ok   ${name}`); return; }
  failures++;
  console.log(`FAIL ${name}${detail ? "\n  " + detail : ""}`);
}

// Qui fournit quoi. A completer si le panel se met a lire une nouvelle globale.
const PROVIDERS = {
  MEDIATHEQUE_DATA: "cockpit/data-mediatheque.js",
  PROFILE_DATA:     "cockpit/data-profile.js",
  SUPABASE_URL:     "cockpit/lib/supabase.js",
  sb:               "cockpit/lib/supabase.js",
  anilist:          "cockpit/lib/anilist.js",
  tmdb:             "cockpit/lib/tmdb.js",
  mdtView:          "cockpit/lib/mediatheque-view.js",
  cockpitToast:     "cockpit/lib/dialog.js",
  track:            "cockpit/lib/telemetry.js",
  PanelMediatheque: "cockpit/panel-mediatheque.jsx",   // s'auto-fournit
};

// Globales LUES par le panel (on exclut les affectations `window.X =`).
const read = new Set(
  [...PANEL.matchAll(/window\.([A-Za-z_][A-Za-z0-9_]*)/g)]
    .map((m) => m[1])
    // Les globales du navigateur ne sont fournies par aucun script a nous.
    .filter((g) => !["location", "localStorage", "matchMedia", "innerWidth",
                     "addEventListener", "removeEventListener", "setTimeout",
                     "clearTimeout", "open", "scrollTo", "navigator", "document"].includes(g))
);
const assigned = new Set(
  [...PANEL.matchAll(/window\.([A-Za-z_][A-Za-z0-9_]*)\s*=/g)].map((m) => m[1])
);

const scripts = [...HTML.matchAll(/src="([^"]+)"/g)].map((m) => m[1].split("?")[0]);

const unknown = [];
const notLoaded = [];
for (const g of read) {
  if (assigned.has(g) && g !== "PanelMediatheque") continue;   // le panel la definit lui-meme
  const provider = PROVIDERS[g];
  if (!provider) { unknown.push(g); continue; }
  if (!scripts.includes(provider)) notLoaded.push(`${g} → ${provider}`);
}

check("toute globale lue a un fournisseur connu", unknown.length === 0,
  `globales non repertoriees (ajouter a PROVIDERS ou verifier le panel) :\n  ${unknown.join(", ")}`);

check("mediatheque.html charge tous les fournisseurs necessaires", notLoaded.length === 0,
  `scripts manquants dans mediatheque.html :\n  ${notLoaded.join("\n  ")}`);

// nav.js doit preceder data-loader.js (data-loader.js:1167 lit COCKPIT_NAV).
const iNav = scripts.indexOf("cockpit/nav.js");
const iLoader = scripts.indexOf("cockpit/lib/data-loader.js");
check("nav.js est charge avant data-loader.js", iNav !== -1 && iLoader !== -1 && iNav < iLoader,
  `nav.js a l'index ${iNav}, data-loader.js a l'index ${iLoader}`);

// Le boot doit venir apres le panel, sinon il attend une globale jamais posee.
const iPanel = scripts.indexOf("cockpit/panel-mediatheque.jsx");
const iBoot = scripts.indexOf("cockpit/lib/boot-mediatheque.js");
check("boot-mediatheque.js est charge apres panel-mediatheque.jsx",
  iPanel !== -1 && iBoot !== -1 && iPanel < iBoot,
  `panel a l'index ${iPanel}, boot a l'index ${iBoot}`);

// L'argument economique de toute la page : peu de scripts Babel.
const babel = [...HTML.matchAll(/type="text\/babel"\s+src="([^"]+)"/g)].map((m) => m[1]);
check("mediatheque.html ne transpile que 2 scripts Babel", babel.length === 2,
  `${babel.length} script(s) : ${babel.join(", ")}`);

console.log(failures ? `\n${failures} test(s) en echec` : "\nTous les tests passent");
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2 : Lancer le test**

```bash
node tests/test_mediatheque_entry.mjs
```

Attendu : **tous les tests passent** (la Task 2 a déjà écrit une page correcte). Si `unknown` liste des globales, les ajouter à `PROVIDERS` **après avoir vérifié dans quel fichier elles sont réellement définies** — ne pas inventer un fournisseur.

- [ ] **Step 3 : Vérifier que le test détecte vraiment une régression**

Preuve que le test a du mordant. Retirer temporairement la ligne `<script src="cockpit/lib/dialog.js?v=1"></script>` de `mediatheque.html`, puis :

```bash
node tests/test_mediatheque_entry.mjs
```

Attendu : **FAIL** — `mediatheque.html charge tous les fournisseurs necessaires`, avec `cockpitToast → cockpit/lib/dialog.js`. Remettre la ligne et relancer : tout repasse.

- [ ] **Step 4 : Créer le workflow CI**

Aucun des 23 workflows actuels ne lance de test. Créer `.github/workflows/tests.yml` :

```yaml
name: tests

on:
  push:
    branches: [main]
  pull_request:

jobs:
  node:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Tests node
        run: |
          status=0
          for f in tests/test_*.mjs; do
            echo "── $f"
            node "$f" || status=1
          done
          exit $status
```

Le dépôt n'a pas de `package.json` : les tests sont des scripts node autonomes, lancés directement.

- [ ] **Step 5 : Vérifier la boucle localement**

```bash
for f in tests/test_*.mjs; do echo "── $f"; node "$f" || echo "ECHEC: $f"; done
```

Attendu : `test_mediatheque_view.mjs`, `test_sw_static.mjs` et `test_mediatheque_entry.mjs` passent tous les trois.

- [ ] **Step 6 : Commit**

```bash
git add tests/test_mediatheque_entry.mjs .github/workflows/tests.yml
git commit -m "test(mediatheque): verrouiller l'accord globales lues / scripts charges

Le front se verifie en production (~3 min par iteration) : un <script>
oublie dans mediatheque.html coute un cycle complet pour un 'undefined'.
C'est exactement ce qui est arrive avec PROFILE_DATA en conception.

Ajoute aussi un workflow tests — aucun des 23 workflows existants ne
lancait de test, les scripts node etaient purement manuels."
```

---

## Task 4 : Passe mobile — cibles tactiles, zoom Safari, `:hover`

Le gros du travail visuel. Tout en CSS sauf deux retouches JSX, dans `styles-mediatheque.css` selon la convention de `styles-mobile.css:3-7`.

**Files:**
- Modify: `cockpit/styles-mediatheque.css` (blocs `@media` existants aux lignes 168, 326, 439 + règles `:hover` lignes 50, 61, 71, 92, 123, 155, 211, 279, 288, 427)
- Modify: `cockpit/panel-mediatheque.jsx:106`, `:127` (inputMode)

**Interfaces:**
- Consumes: `mediatheque.html` déployée et fonctionnelle (Task 2).
- Produces: rien que d'autres tâches consomment — c'est une amélioration terminale.

- [ ] **Step 1 : Isoler les `:hover` dans `@media (hover: hover)`**

Sur iOS le `:hover` reste appliqué après un tap jusqu'au tap suivant : la carte paraît sélectionnée alors qu'elle ne l'est pas. `.mdt-card` est déjà correctement isolé (`styles-mediatheque.css:202`) — généraliser ce motif.

Envelopper chacune de ces règles dans `@media (hover: hover) { … }`, **sans en modifier le contenu** :

| Ligne | Sélecteur |
|---|---|
| 50 | `.mdt-chip:hover` |
| 61 | `.mdt-viewtoggle-btn:hover` |
| 71 | `.mdt-release-ack:hover` |
| 92 | `.mdt-rail-card:hover .mdt-rail-shot, .mdt-rail-card:focus-within .mdt-rail-shot` |
| 123-125 | `.mdt-agenda-item:hover` et ses deux règles filles |
| 155-156 | `.mdt-later-pill:hover`, `.mdt-later-pill:hover strong` |
| 211 | `.mdt-result:hover` |
| 279 | `.mdt-budget:hover` |
| 288-290 | `.mdt-tonight-card:hover, .mdt-tonight-card:focus-within` |
| 427 | `.mdt-jp-btn:hover` |

⚠️ Ligne 92 et 288 : garder `:focus-within` **hors** du bloc `hover` — la navigation au clavier en dépend. Scinder en deux règles :

```css
/* Le focus reste actif partout : la navigation clavier en depend. */
.mdt-rail-card:focus-within .mdt-rail-shot {
  transform: translateY(-4px);
  box-shadow: 0 16px 32px rgba(0,0,0,.26), 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent);
}
@media (hover: hover) {
  .mdt-rail-card:hover .mdt-rail-shot {
    transform: translateY(-4px);
    box-shadow: 0 16px 32px rgba(0,0,0,.26), 0 0 0 1px color-mix(in srgb, var(--brand) 40%, transparent);
  }
}
```

Appliquer le même découpage à `.mdt-tonight-card` (lignes 288-290).

- [ ] **Step 2 : Ajouter le bloc tactile**

Ajouter à la fin de `cockpit/styles-mediatheque.css` :

```css
/* ═══ MOBILE — cibles tactiles et clavier iOS ════════════════════
   Deux invariants, tous deux verifiables a l'oeil sur l'appareil :

   1. 44 px de cible tactile (WCAG 2.1 AAA, seuil deja retenu par le
      projet dans styles-mobile.css:233). Le stepper +1 episode est le
      geste principal de l'application et faisait 26 px.
   2. font-size >= 16px sur tout champ focusable. En dessous, Safari iOS
      ZOOME la page a la mise au point — et les deux champs numeriques
      portent autoFocus, donc le zoom part tout seul.
   ────────────────────────────────────────────────────────────── */
@media (max-width: 760px) {
  /* — Stepper : le geste principal — */
  .mdt-stepper { gap: 8px; }
  .mdt-stepper button { width: 44px; height: 44px; font-size: 18px; }
  .mdt-stepper-count { min-width: 64px; font-size: 16px; }
  .mdt-stepper-count input { width: 60px; height: 40px; font-size: 16px; }

  /* — Note par saison — */
  .mdt-rating-pill { min-height: 44px; padding: 0 14px; font-size: 13px; }
  .mdt-rating input { width: 60px; height: 40px; font-size: 16px; }

  /* — Pastilles et filtres — */
  .mdt-budget,
  .mdt-chip { min-height: 44px; padding: 0 16px; display: inline-flex; align-items: center; }
  .mdt-viewtoggle-btn { min-height: 40px; padding: 0 16px; }
  .mdt-select { min-height: 44px; font-size: 16px; }

  /* — Acquittement d'une sortie et « je connais » — */
  .mdt-release-ack { min-width: 44px; min-height: 44px; font-size: 18px; }
  .mdt-jp-btn { min-height: 44px; padding: 0 14px; display: inline-flex; align-items: center; }

  /* — Boutons d'action — */
  .mdt-btn { min-height: 44px; }
  .mdt-tonight-cta { min-height: 44px; padding: 0 18px; display: inline-flex; align-items: center; }

  /* — Recherche : pleine largeur, 16px contre le zoom — */
  .mdt-search { flex: 1 1 100%; font-size: 16px; min-height: 44px; }

  /* — Mise en page — */
  .mdt-title { font-size: 28px; }
  .mdt-hero { min-height: 200px; }
  .mdt-hero-inner { padding: 20px 18px; max-width: none; }
  .mdt-tonight-title { font-size: 22px; }

  /* Le stepper a 44px ne tient plus sur la meme ligne que le titre. */
  .mdt-entry { flex-wrap: wrap; gap: 8px 10px; padding: 12px 0; }
  .mdt-entry-info { flex: 1 1 100%; }

  .mdt-fiche-actions { flex-direction: column-reverse; gap: 8px; }
  .mdt-fiche-actions .mdt-btn { width: 100%; }

  /* Bas de page : degager la barre d'accueil des iPhone sans bouton. */
  .panel-mediatheque { padding-bottom: max(60px, env(safe-area-inset-bottom)); }
}

/* Collection : 3 colonnes plutot que 2 sur telephone — 47 franchises font
   24 lignes de defilement a 2 colonnes. A confirmer sur l'appareil (Step 6). */
@media (max-width: 480px) {
  .mdt-grid { grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 16px 12px; }
  .mdt-card-title { font-size: 12.5px; }
}
```

- [ ] **Step 3 : Ajouter `inputMode` aux deux champs numériques**

Dans `cockpit/panel-mediatheque.jsx`, ligne 106 :

```jsx
            autoFocus type="number" inputMode="numeric" min="0" max={max} defaultValue={watched}
```

Et ligne 127 :

```jsx
          autoFocus type="number" inputMode="numeric" min="0" max="100"
```

- [ ] **Step 4 : Régénérer `sw.js` et lancer les tests**

Les querystrings `?v=N` des CSS/JSX modifiés doivent être incrémentés dans **les deux** pages (`index.html` et `mediatheque.html`) — sinon le cache sert l'ancienne version. `styles-mediatheque.css?v=6` → `?v=7`, `panel-mediatheque.jsx?v=7` → `?v=8`.

```bash
node scripts/sync-sw.mjs
for f in tests/test_*.mjs; do echo "── $f"; node "$f" || echo "ECHEC: $f"; done
```

Attendu : tous les tests passent.

- [ ] **Step 5 : Commit et déploiement**

```bash
git add cockpit/styles-mediatheque.css cockpit/panel-mediatheque.jsx index.html mediatheque.html sw.js
git commit -m "feat(mediatheque): passe mobile — cibles 44px, zoom Safari, hover collant

Le stepper +1 episode, geste principal de l'application, faisait 26px. Les
champs numeriques etaient en 12px, sous le seuil de 16px a partir duquel
Safari iOS zoome a la mise au point — et ils portent autoFocus, donc le
zoom partait tout seul.

Les dix regles :hover encore hors de @media (hover: hover) laissaient les
cartes paraitre selectionnees apres un tap. :focus-within reste actif
partout : la navigation clavier en depend."
git push
```

- [ ] **Step 6 : Vérifier sur l'iPhone**

Ouvrir l'app installée et parcourir cette liste :

1. **Stepper** — ouvrir une fiche, taper `+`. La cible est confortable au pouce, **la page ne zoome pas** quand le compteur prend le focus.
2. **Pastilles de temps** — taper 30 min / 1 h / 2 h+ sur la bande « Ce soir ». Confortable, et le rendu se recalcule.
3. **`:hover`** — taper une carte du rail puis ailleurs : aucune carte ne reste en surbrillance.
4. **Recherche** — le champ prend toute la largeur, la page ne zoome pas à la saisie.
5. **Grille de collection** — 3 colonnes. **Décision à prendre ici** : si les titres sont illisibles, repasser `minmax(104px, 1fr)` à `minmax(140px, 1fr)` et le noter dans la spec. C'est le seul arbitrage que l'écran réel devait trancher.
6. **Bas de page** — le dernier élément n'est pas masqué par la barre d'accueil.

---

## Task 5 : Fiche franchise en feuille plein écran

La fiche est aujourd'hui une modale centrée dont le défilement est porté par le backdrop, ce qui donne le double défilement classique sur iOS. Et son seul bouton « Fermer » est tout en bas (`panel-mediatheque.jsx:268`) : en plein écran il n'y a plus de backdrop à taper.

**Files:**
- Modify: `cockpit/styles-mediatheque.css:219-231` (modale et en-tête de fiche)
- Modify: `cockpit/panel-mediatheque.jsx:216-227` (bouton `✕`)

**Interfaces:**
- Consumes: la prop `onClose` déjà reçue par `FicheFranchise` (`panel-mediatheque.jsx:149`).
- Produces: rien que d'autres tâches consomment.

- [ ] **Step 1 : Sortir le padding de la modale dans une variable**

`.mdt-fiche-head` utilise `margin: -24px -26px 4px` pour faire déborder la bannière jusqu'aux bords de la modale — un couplage en dur avec le padding de `.mdt-modal`. Si l'un change sans l'autre, la bannière se décale.

Dans `cockpit/styles-mediatheque.css`, remplacer les règles des lignes 220-224 :

```css
.mdt-modal { --mdt-modal-px: 26px; --mdt-modal-pt: 24px;
  width: min(760px, 100%); background: var(--bg); border: 1px solid color-mix(in srgb, var(--tx) 15%, transparent);
  border-radius: 14px; padding: var(--mdt-modal-pt) var(--mdt-modal-px) 28px; }
.mdt-fiche-head { position: relative;
  margin: calc(-1 * var(--mdt-modal-pt)) calc(-1 * var(--mdt-modal-px)) 4px;
  min-height: 200px; display: flex;
  align-items: flex-end; background-size: cover; background-position: center 28%; background-color: var(--bg2);
  border-radius: 14px 14px 0 0; overflow: hidden; }
```

- [ ] **Step 2 : Ajouter le bouton de fermeture**

Dans `cockpit/panel-mediatheque.jsx`, à l'intérieur de `<div className="mdt-modal">` (ligne 217), **avant** `<div className="mdt-fiche-head">` :

```jsx
        <button className="mdt-fiche-close" onClick={onClose} aria-label="Fermer la fiche">✕</button>
```

Le bouton « Fermer » du bas (ligne 268) est conservé : il reste l'affordance naturelle sur desktop.

- [ ] **Step 3 : Habiller le bouton et créer la feuille**

Ajouter à la fin de `cockpit/styles-mediatheque.css` :

```css
/* Bouton de fermeture de la fiche. Masque sur desktop, ou le backdrop et le
   bouton « Fermer » du bas suffisent ; indispensable en feuille plein ecran,
   ou il n'y a plus de backdrop a taper et ou « Fermer » est a douze saisons
   de defilement. */
.mdt-fiche-close { display: none; }

@media (max-width: 760px) {
  /* Le backdrop ne fait plus que contenir : plus de padding, plus de scroll.
     Le scroll passe sur la feuille elle-meme, avec overscroll-behavior pour
     que le corps de page ne bouge pas derriere. */
  .mdt-modal-backdrop { padding: 0; overflow: hidden; align-items: stretch; }

  .mdt-modal {
    --mdt-modal-px: 16px;
    --mdt-modal-pt: 0px;
    width: 100%;
    max-height: 100%;
    border: none;
    border-radius: 0;
    padding-bottom: max(28px, env(safe-area-inset-bottom));
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  /* La banniere garde son debordement lateral, sans decalage vertical
     puisque --mdt-modal-pt vaut 0. */
  .mdt-fiche-head { border-radius: 0; min-height: 180px; }

  .mdt-fiche-close {
    display: flex;
    position: fixed;
    top: max(12px, env(safe-area-inset-top));
    right: 12px;
    z-index: 2;
    width: 44px; height: 44px;
    align-items: center; justify-content: center;
    border: none; border-radius: 999px;
    background: rgba(0,0,0,.55);
    backdrop-filter: blur(6px);
    color: #fff; font-size: 17px; cursor: pointer;
  }
  .mdt-fiche-close:focus-visible { outline: 2px solid var(--brand); outline-offset: 2px; }
}
```

- [ ] **Step 4 : Bumper les querystrings, régénérer, tester**

`styles-mediatheque.css?v=7` → `?v=8` et `panel-mediatheque.jsx?v=8` → `?v=9`, dans `index.html` **et** `mediatheque.html`.

```bash
node scripts/sync-sw.mjs
for f in tests/test_*.mjs; do echo "── $f"; node "$f" || echo "ECHEC: $f"; done
```

- [ ] **Step 5 : Commit et déploiement**

```bash
git add cockpit/styles-mediatheque.css cockpit/panel-mediatheque.jsx index.html mediatheque.html sw.js
git commit -m "feat(mediatheque): fiche franchise en feuille plein ecran sur mobile

Le backdrop portait l'overflow-y, ce qui donnait le double defilement
classique d'iOS avec le corps de page qui bouge derriere. Le scroll passe
sur la feuille, avec overscroll-behavior: contain.

Bouton de fermeture collant : en plein ecran il n'y a plus de backdrop a
taper, et le seul « Fermer » etait tout en bas — hors d'atteinte sur une
franchise a douze saisons.

Le padding de la modale passe en variable CSS : .mdt-fiche-head le
dupliquait en dur dans sa marge negative pour faire deborder la banniere."
git push
```

- [ ] **Step 6 : Vérifier sur l'iPhone**

1. Ouvrir une fiche depuis la collection → elle occupe tout l'écran, sans arrondi.
2. Le `✕` est visible en haut à droite, **sous l'encoche**, et ferme la fiche.
3. Défiler la fiche jusqu'en bas : le corps de page **ne bouge pas** derrière.
4. Ouvrir une franchise à plusieurs saisons : chaque stepper est utilisable au pouce, et le titre de saison passe sur sa propre ligne.
5. Les actions du bas sont au-dessus de la barre d'accueil, pas dessous.

---

## Task 6 : Rafraîchissement à la reprise, télémétrie `surface`, documentation

Dernière tâche : la sonde de survie, le rafraîchissement propre à iOS, et les règles cardinales du `CLAUDE.md`.

**Files:**
- Modify: `cockpit/lib/boot-mediatheque.js` (écouteur `visibilitychange`)
- Modify: `cockpit/panel-mediatheque.jsx` (champ `surface` de télémétrie)
- Modify: `docs/telemetry.md`, `docs/specs/tab-mediatheque.md`, `docs/specs/index.json`
- Modify: `docs/architecture/flows/perso-mediatheque.yaml`, `docs/architecture/decisions.md`
- Delete: `probe-auth.html`, `probe-manifest.json`

**Interfaces:**
- Consumes: `window.__mdtRefresh()` exposé par `boot-mediatheque.js` (Task 2).
- Produces: le champ `surface` dans le payload des events `mediatheque_*`.

- [ ] **Step 1 : Rafraîchir à la reprise**

iOS suspend une PWA au lieu de la fermer : rouverte le lendemain soir, elle reprend l'état de la veille, et `loadPanel` étant mémoïsé par `once()` (`data-loader.js:16-19`), rien ne se recharge. Le problème n'existe pas sur desktop où la page est rechargée.

Ajouter à la fin de `cockpit/lib/boot-mediatheque.js`, **à l'intérieur** de l'IIFE, après `window.__mdtRefresh = refresh;` :

```js
  // iOS suspend une PWA plutot que de la fermer : rouverte le lendemain, elle
  // reprend l'etat de la veille et loadPanel est memoise par once(). On refetch
  // au retour au premier plan si l'absence a depasse le seuil.
  const STALE_MS = 5 * 60 * 1000;
  let hiddenAt = null;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > STALE_MS) {
      hiddenAt = null;
      refresh().catch((e) => console.error("[boot-mdt] refresh", e));
    }
  });
```

- [ ] **Step 2 : Marquer la surface dans la télémétrie**

Ajouter en haut de `cockpit/panel-mediatheque.jsx`, avant `function PanelMediatheque` (ligne 749) :

```jsx
// Sonde de survie de la PWA mobile. Le payload de usage_events est un JSONB
// ouvert : un champ suffit, pas de migration ni de nouvel event_type.
// Question a laquelle elle repond dans trois semaines : le telephone est-il
// reellement sorti pour ca ? Un volume nul est une reponse, pas un retard.
function mdtSurface(){
  try {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches)
      || window.navigator.standalone
      ? "pwa" : "cockpit";
  } catch { return "cockpit"; }
}
function mdtTrack(type, payload){
  window.track && window.track(type, Object.assign({ surface: mdtSurface() }, payload || {}));
}
```

Puis remplacer **tous** les appels `window.track && window.track("mediatheque_…", {…})` du fichier par `mdtTrack("mediatheque_…", {…})`. Les localiser ainsi :

```bash
grep -n 'window.track' cockpit/panel-mediatheque.jsx
```

Les dix events concernés sont ceux de `docs/telemetry.md:33-42` : `mediatheque_search`, `_add`, `_progress`, `_remove`, `_release_ack`, `_shelve`, `_rate`, `_hero_action`, `_week_click`, `_collection_toggle`. Ne pas oublier la définition de `mdtTrack` elle-même, qui ne doit pas se rappeler.

- [ ] **Step 3 : Documenter le champ dans `docs/telemetry.md`**

Ajouter juste avant le tableau des events `mediatheque_*` (ligne 33) :

```markdown
> **`surface`** — tous les events `mediatheque_*` portent depuis le 2026-07-27 un champ
> `surface` valant `"pwa"` (application installée sur l'écran d'accueil, détectée par
> `display-mode: standalone`) ou `"cockpit"` (onglet du cockpit). C'est la sonde de survie
> de la page d'entrée mobile : trois semaines sans `mediatheque_progress` en `surface:"pwa"`
> signifie que le portage n'a pas trouvé son usage — voir
> `docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md`.
```

- [ ] **Step 4 : Mettre à jour la spec d'onglet (CI bloquante)**

Dans `docs/specs/tab-mediatheque.md`, section **« Front — structure UI »**, ajouter ce paragraphe à la fin :

```markdown
**Seconde page d'entrée (mobile).** `mediatheque.html` monte le même `<PanelMediatheque/>`
sans sidebar et sans Tier 1, via `cockpit/lib/boot-mediatheque.js` (auth → `loadPanel("mediatheque")`
+ `loadUserProfile()` → mount, puis refetch sur `visibilitychange` au-delà de 5 min d'absence).
Installable en PWA sur l'écran d'accueil iOS avec `manifest-mediatheque.json`. Elle ne fait
transpiler que 2 scripts Babel (71 ko) contre 30 (859 ko) pour `index.html` — c'est sa raison
d'être (ADR-30). Sous 760 px la fiche franchise devient une feuille plein écran avec bouton
`✕` collant, et les cibles tactiles passent à 44 px. L'accord entre les globales lues par le
panel et les scripts chargés par la page est verrouillé par `tests/test_mediatheque_entry.mjs`.
```

Puis, section **« Dernière MAJ »**, ajouter en tête :

```markdown
2026-07-27 — application iOS (PWA dédiée). Seconde page d'entrée `mediatheque.html` plutôt
qu'une application native : l'utilisateur est sous Windows (Xcode exige macOS) et le coût
dominant du démarrage à froid sur iPhone n'est pas le réseau mais Babel, qui transpile 859 ko
de JSX dans le navigateur pour le cockpit contre 71 ko ici — rapport de 12 pour 1. Passe
mobile complète : stepper à 44 px (il faisait 26), champs à 16 px pour couper le zoom
automatique de Safari, dix règles `:hover` isolées dans `@media (hover: hover)` pour ne plus
rester collées après un tap, fiche franchise en feuille plein écran. Sonde de survie : les dix
events `mediatheque_*` portent un champ `surface` (`pwa` / `cockpit`) — trois semaines sans
`mediatheque_progress` en `surface:"pwa"` signifie que le portage n'a pas trouvé son usage.
Correctif amont : le service worker ne s'était jamais enregistré (`register("/sw.js")` → 404
sous un Pages de projet servi en `/jarvis-cockpit/`) et ses 88 entrées de précache étaient
toutes des 404.
```

Puis bumper `last_updated` pour l'entrée `mediatheque` dans `docs/specs/index.json` à `2026-07-27`.

```bash
PYTHONUTF8=1 python scripts/validate_spec.py docs/specs/tab-mediatheque.md
```

(Le `PYTHONUTF8=1` est obligatoire : le script lève un `UnicodeEncodeError` sur les ✅ en console Windows alors que la validation est passée.)

- [ ] **Step 5 : Mettre à jour l'architecture (CI bloquante)**

Dans `docs/architecture/flows/perso-mediatheque.yaml`, section `panels`, ajouter :

```yaml
  - id: mediatheque-pwa
    detail: "Page d'entree mobile dediee (mediatheque.html + boot-mediatheque.js) — meme panel, sans sidebar ni Tier 1 ; 2 scripts Babel au lieu de 30"
```

Dans `docs/architecture/decisions.md`, ajouter l'ADR ci-dessous. Le dernier ADR du dépôt est ADR-29 (cité par `docs/specs/tab-mediatheque.md`) — **confirmer avant d'écrire** et renuméroter si un autre a été ajouté entre-temps :

```bash
grep -o "ADR-[0-9]\+" docs/architecture/decisions.md | sort -t- -k2 -n | tail -1
```

```markdown
### ADR-30 — Le portage mobile de la médiathèque est une seconde page d'entrée, pas une application native

**Contexte.** La médiathèque est le seul onglet du cockpit au pattern « décision +
écriture », et son moment de vérité (la bande « Ce soir », 18 h → 2 h) tombe quand le PC
est éteint. L'utilisateur est sous Windows : Xcode exige macOS, et React Native imposerait
99 €/an plus une réécriture complète de l'interface pour un utilisateur unique.

**Décision.** Une seconde page d'entrée `mediatheque.html` charge les mêmes fichiers que
le cockpit sans la sidebar, sans les 28 autres panels et sans Tier 1, installée en PWA sur
l'écran d'accueil iOS.

**Justification mesurée.** `index.html` fait transpiler 859 ko de JSX par Babel standalone
dans le navigateur contre 71 ko pour la page dédiée — rapport de 12 pour 1 sur le coût
dominant du démarrage à froid sur iPhone. Le réseau n'est pas le facteur : l'usage visé est
le canapé, donc le wifi.

**Conséquences.** Deux icônes sur l'écran d'accueil et deux manifests à maintenir. Toute
globale nouvellement lue par `panel-mediatheque.jsx` doit être ajoutée à `mediatheque.html`
— invariant verrouillé par `tests/test_mediatheque_entry.mjs`. Le portage n'a de sens que
s'il est utilisé : la sonde `surface: "pwa"` de `docs/telemetry.md` tranche à trois
semaines.

**Constat annexe.** L'audit a révélé que le service worker ne s'était jamais enregistré
(`register("/sw.js")` → 404 sous un Pages de projet servi en `/jarvis-cockpit/`) et que ses
88 entrées de précache étaient toutes des 404. Corrigé dans le même lot.
```

- [ ] **Step 6 : Supprimer la sonde OAuth**

`mediatheque.html` s'authentifie désormais pour de vrai : le témoin de la Task 0 n'a plus d'objet.

```bash
git rm probe-auth.html probe-manifest.json
```

- [ ] **Step 7 : Bumper, régénérer, tester**

`panel-mediatheque.jsx?v=9` → `?v=10` et `boot-mediatheque.js?v=1` → `?v=2` dans `mediatheque.html` (et `panel-mediatheque.jsx` dans `index.html`).

```bash
node scripts/sync-sw.mjs
for f in tests/test_*.mjs; do echo "── $f"; node "$f" || echo "ECHEC: $f"; done
PYTHONUTF8=1 python scripts/validate_spec.py docs/specs/tab-mediatheque.md
python scripts/lint_claude_md.py
```

Attendu : tout passe. `sync-sw` doit maintenant afficher un `STATIC[]` **sans** `probe-auth.html`.

- [ ] **Step 8 : Commit**

```bash
git add cockpit/lib/boot-mediatheque.js cockpit/panel-mediatheque.jsx mediatheque.html index.html sw.js \
        docs/telemetry.md docs/specs/tab-mediatheque.md docs/specs/index.json \
        docs/architecture/flows/perso-mediatheque.yaml docs/architecture/decisions.md
git commit -m "feat(mediatheque): sonde de survie PWA, refresh a la reprise, docs

iOS suspend une PWA plutot que de la fermer : rouverte le lendemain elle
reprend l'etat de la veille, loadPanel etant memoise par once(). Refetch
au retour au premier plan au-dela de 5 min d'absence.

Les dix events mediatheque_* portent desormais un champ surface
(pwa | cockpit). Payload JSONB ouvert : pas de migration, pas de nouvel
event_type. Trois semaines sans mediatheque_progress en surface:pwa =
le portage n'a pas trouve son usage.

ADR-30, spec d'onglet, flow d'architecture. Retire la sonde OAuth."
git push
```

- [ ] **Step 9 : Vérifier la sonde en production**

Utiliser l'app installée : ouvrir une fiche, faire un `+1 épisode`. Puis :

```sql
select payload->>'surface' as surface, count(*)
from usage_events
where event_type like 'mediatheque_%' and created_at > now() - interval '1 hour'
group by 1;
```

Attendu : au moins une ligne `pwa`. Si tout est en `cockpit` depuis l'app installée, `mdtSurface()` ne détecte pas le mode standalone — vérifier `window.navigator.standalone` sur l'appareil.

---

## Notes de suivi

**Ce qui reste hors périmètre**, à ne rouvrir que si la sonde `surface: "pwa"` montre un usage réel à trois semaines : notifications Web Push (supportées par iOS 16.4+ pour les PWA installées, sans application native), fonctionnement hors ligne, portage des 29 autres onglets.

**L'arbitrage à trancher sur l'appareil** : 3 colonnes de collection (Task 4, Step 6). C'est le seul point du plan que le calcul ne pouvait pas décider.
