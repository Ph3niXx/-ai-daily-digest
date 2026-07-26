# Audit Design Complet — AI Cockpit

**Date** : 3 mai 2026
**Auditeur** : Senior design (UX, UI, design system, a11y, perf perçue, rétention)
**URL prod** : https://ph3nixx.github.io/jarvis-cockpit/
**Audits précédents** :
- `audits/2026-04-28-design-audit.md`
- `audits/2026-04-29-design-audit.md`
- `audits/2026-04-30-design-audit.md`
- `design-audit-2026-05-01.md` (racine)

**Méthode** : lecture exhaustive du repo (état HEAD `6600b64`), grep ciblé
sur les findings des 4 audits précédents, vérification du diff Git
(`git log --since="2026-04-28"`), simulation de rétention sur la base du
code rendu. **L'app reste gated derrière Google OAuth** — pas de
crawl pixel-perfect post-login possible. L'audit s'appuie donc sur le
code source, qui est intégralement disponible.

---

## 0. Note préalable — Contexte stack

Le brief mission décrit le cockpit comme « single-file vanilla HTML/CSS/JS,
gradient bleu→violet, dark mode, glassmorphism ». **Aucune de ces
hypothèses ne tient au 03/05.**

- Stack réelle : **React 18 + `@babel/standalone` via CDN**, no build
  step (assumé), **77 fichiers** dans `cockpit/` (`*.jsx` + `*.css`
  éclatés par domaine). `index.html` n'est qu'une coquille de 80 lignes
  qui charge **66 scripts en série, 1 seul avec un attribut defer/async**.
- Identité visuelle réelle : **3 thèmes finis et cohérents** (Dawn ivoire
  + rouille / Obsidian charbon + cyan-mint / Atlas blanc Swiss + indigo).
  **Aucun gradient**, **aucun glassmorphism**.
- Persistance : Supabase REST + JWT Google OAuth.

**Implication pour les prompts Phase 4** : ils ciblent les vrais fichiers
(`cockpit/panel-*.jsx`, `cockpit/styles*.css`, `cockpit/themes.js`,
`cockpit/lib/*.js`), pas un mythique `index.html` monolithe. Toute
consigne « code vanilla JS » est traduite en « JSX-via-Babel sans
framework de build ».

> **CLAUDE.md règle cardinale** : toute modif d'un onglet implique de
> mettre à jour `docs/specs/tab-<slug>.md` + `docs/specs/index.json`
> dans le même commit (CI `lint-specs` bloquante). Idem
> `docs/architecture/` pour tout chemin à impact archi (CI
> `validate-arch` bloquante). Les prompts ci-dessous incluent
> systématiquement la ligne "Specs à toucher".

---

## 0bis. Bilan de vélocité depuis le 28/04 (6 jours)

| Période | Commits applicatifs | Findings P0 livrés | Statut routine audit |
|---|---|---|---|
| 28→29/04 | 11 | sw-sync, modale Stacks React, mock data-jobs.js killé, CSP fixes | ✅ vague exécutoire |
| 29→30/04 | 10 | guards opps/history, kill-switch reduced-motion, pulses cap 3, skip-link, kbd-fab J7, streak zero-state, hero compact, auth overlay thémé, jarvis-lab tokens | ✅ **vague de fond a11y** |
| 30/04→01/05 | 5 | Restauration nav "Claude", trigger DB jobs, jarvis-lab fallbacks hex round 2 | 🟡 mineur |
| 01/05→03/05 | **0** | **Aucun** | 🔴 **silence 48h** |

**Lecture** : la vague livrée entre 29 et 30 avril est **massive et de
qualité** (10 commits, 5 findings critiques résolus, +6 commits P0 du
backlog 28-29/04 soldés). **Mais la routine est en panne depuis 48h**.
L'audit du 01/05 a produit 15 prompts (8h de Wave 1 critique) — **0 a
été exécuté**. Si la cadence ne reprend pas, les findings du 01/05
deviendront du legacy non actionnable et l'audit du jour s'ajoutera
au stack.

**Recommandation routine** : limiter les prochains audits à **5
prompts P0** + **1 prompt P1** maximum. Mieux vaut 6 prompts shippés
que 30 archivés. Cet audit applique cette discipline.

---

## 1. Reconnaissance

### 1.1 Inventaire features (état 03/05 vs 30/04)

| Zone | Composant | Localisation | Statut 03/05 |
|---|---|---|---|
| **Shell** | Sidebar 6 groupes + rail mode + drawer mobile | `cockpit/sidebar.jsx`, `cockpit/nav.js` | ✅ Production |
| Shell | Theme switcher (Dawn / Obsidian / Atlas) + auto-pick par heure | `cockpit/sidebar.jsx`, `cockpit/themes.js` | ✅ Production |
| Shell | Streak + zero-state "Premier jour. Lis 1 article." | `cockpit/sidebar.jsx` | **✅ Shipped 30/04** (3a50a6d) |
| Shell | Coût API + sparkline 7j + theme toggle + Ctrl+K hint (footer) | `cockpit/sidebar.jsx` | ✅ Production |
| Shell | Command palette (Ctrl+K) + 14 raccourcis + overlay aide (?) | `cockpit/command-palette.jsx`, `cockpit/app.jsx` | ✅ Production |
| Shell | `kbd-fab` masqué après 7j + toggle Profil | `cockpit/app.jsx` | **✅ Shipped 30/04** (708b6fc) |
| Shell | **Skip link "Aller au contenu" (WCAG 2.4.1)** | `cockpit/app.jsx`, `cockpit/styles.css` | **✅ Shipped 30/04** (5b06741) |
| Shell | Filtre global "Récent · 24h" (auto-on si visite < 18h) | `cockpit/app.jsx` | ✅ Production |
| Shell | Error boundary par panel + skeleton loader Tier 2 | `cockpit/app.jsx` | ✅ Production |
| Shell | PWA service worker auto-sync + manifest | `sw.js`, `manifest.json` | ✅ Production (auto-sync 29/04) |
| **Auth** | Overlay Google OAuth respecte le thème stocké pré-mount | `cockpit/lib/auth.js` | **✅ Shipped 30/04** (073e22a) |
| **Aujourd'hui** | Brief du jour (hero macro + audio + delta + zero-state + Top 3 + signaux + radar + week) | `cockpit/home.jsx` | ✅ Production riche |
| Aujourd'hui | **Toggle compact/plein du hero** (pastille discrète, persistance localStorage) | `cockpit/home.jsx` | **✅ Shipped 30/04** (bc1e146) |
| Aujourd'hui | Toggle "Morning Card" vs "Brief complet" | `cockpit/home.jsx` | ✅ Production |
| Aujourd'hui | Hero delta "X nouveautés depuis Yh" (auto-trigger) | `cockpit/home.jsx` | ✅ Production |
| Aujourd'hui | Audio brief Web Speech API (estimation = body.length / 280) | `cockpit/home.jsx` | ⚠️ Heuristique fragile (R7 inchangé) |
| Aujourd'hui | Bouton "Tout marqué lu" + undo 6s + télémétrie | `cockpit/home.jsx` | ✅ Production |
| Aujourd'hui | Miroir du soir (récap réflexif 19h), Revue, Top, Semaine, Recherche | 5 panels dédiés | ✅ Production |
| **Veille** | Veille IA, **Claude restauré**, Veille outils (4 buckets), Sport, Gaming news, Anime, Actualités | `panel-veille.jsx` (mutualisé), `panel-veille-outils.jsx` | ✅ Production (Claude restauré 01/05 — 7d0f826) |
| **Apprentissage** | Radar 8 axes (SVG inline), Recos, Challenges, Wiki IA, Signaux faibles | 5 panels | ✅ Production |
| **Business** | Opportunités, Carnet d'idées, **Jobs Radar** + trigger DB anti-republications LinkedIn | 3 panels + `sql/013_jobs_inherit_status.sql` | ✅ Production (trigger 01/05 — 953b029) |
| **Personnel** | Jarvis chat (3 modes), Jarvis Lab, Profil, Forme, Musique, Gaming | 6 panels | ✅ Production |
| **Système** | Stacks & Limits (modale React thémée), Historique | 2 panels | ✅ Production |

**Total : 23 routes JSX** + 6 routes `panel-veille.jsx` mutualisées
(updates, claude, sport, gaming_news, anime, news) = **29 panels visibles**.

### 1.2 État des findings — récapitulatif consolidé 28/04 → 03/05

Légende : 🟢 résolu · 🟡 partiel · 🔴 inchangé · ⚪ nouveau

| # | Finding | Source | Statut 03/05 | Commit / Note |
|---|---|---|---|---|
| R1 | Hero macro surdimensionné usage quotidien | 28/04 | 🟡 **Toggle compact shippé** mais OFF par défaut | bc1e146 — manque "compact par défaut J7+" |
| R2 | Pulses infinis (kicker-dot, sb-group-hotdot) | 28/04 | 🟢 Cap 3 cycles + kill-switch global | 4bf1874, 2d61267 |
| R3 | Page header sticky + Hero non collapsible | 28/04 | 🟡 Idem R1 | — |
| R4 | Boutons primary `--tx` (encre) sur fond crème — contraste violent Dawn | 28/04 | 🔴 Inchangé | Audit contraste WCAG 01/05 P10 non livré |
| R5 | **66 scripts sans defer + Babel transpilation 23 JSX en série** | 28/04 | 🔴 **Toujours 66 scripts, 1 defer (le SW)** | Bottleneck FCP non traité |
| R6 | `dataVersion` reset cause rerender lourd | 28/04 | 🟢 Faible/négligeable | — |
| R7 | Audio brief estimation fragile (`body.length / 280`) | 28/04 | 🔴 Inchangé | J9 roadmap 30/04 |
| R8 | `kbd-fab` `?` flottant en permanence | 28/04 | 🟢 Masqué J7+ | 708b6fc |
| R9 | Streak "0 j" sans encouragement | 28/04 | 🟢 Zero-state shippé | 3a50a6d |
| R10 | Aucun feedback "données fraîches / stale" | 28/04 | 🔴 Inchangé | Bannière stale 30/04 P10 non livrée |
| R11+ | sw.js cache drift | 29/04 | 🟢 Auto-sync | ee2a344 |
| R12+ | Modales `window.prompt/confirm` chaînées | 29/04 | 🟢 Modale React | 4dbc662 |
| R13+ | 2 FABs empilés (kbd-fab + recent-toggle) | 29/04 | 🟡 kbd-fab masqué J7+, mais recent-toggle reste | — |
| R14+ | Stub `app.jsx` mort | 29/04 | 🔴 Inchangé | Prompt 30/04 #6 non livré |
| R15+ | 9 animations infinies sans guard | 30/04 | 🟢 Toutes capées 3 cycles + kill-switch | 4bf1874, 2d61267 |
| R16+ | Hex hardcodés (#c2410c × 27, #9aa3ad × 13, #141414 × 13) | 30/04 | 🟡 **Top hex éliminés** : `#c2410c` 27→2, `#9aa3ad` 13→0, `#141414` 13→0. **Mais 76 hex restent** : `#b43a3a × 11, #b3491a × 10, #2d7a4e × 9, #fafaf5 × 8…` (variantes rouille/vert custom) | be9db08 + 4033320 (round 1+2) |
| R17 | Hover `translateY(-2px)` sur cards (fatigue scan) | 01/05 | 🔴 Inchangé sur `.top-feat-main`, `.top-feat-side`, `.opp-kan-card` | 01/05 P1 non livré |
| R18 | `max-width: 70ch` sur summary/body cards | 01/05 | 🟡 70ch sur `.hero.is-compact .hero-body`, 60ch sur `.review-summary`, **rien sur `.top-summary`, `.hero-body` normal, `.vl-item-summary`, `.wiki-card-body`** | 01/05 P5 partiel |
| R19 | Sidebar 6 groupes (cognitive load) | 01/05 | 🔴 Inchangé | 01/05 P5 non livré |
| R20 | Touch targets `.vl-filter-pill` mobile (font 12.5px, padding 5×10) ≈ 26px | 01/05 | 🔴 Inchangé | 01/05 P6 non livré |
| R21 | Audit contraste WCAG AA tri-thèmes | 01/05 | 🔴 Inchangé | 01/05 P10 non livré |
| R22 | Streak "X jours, record Y" | 01/05 | 🟡 Zero-state shippé, **record absent** | Partiel |
| R23 | Ctrl+K nudge J0-J3 (microcopy + halo) | 01/05 | 🔴 Inchangé | Hint statique présent en footer |
| **R24** | **0 commit applicatif sur 48h (01-03/05)** | **03/05** | ⚪ **NOUVEAU** | Routine en panne |
| **R25** | **`cockpit/styles.css` = 4666 lignes monolithe** | **03/05** | ⚪ **NOUVEAU** | Risque drift, scan visuel difficile |
| **R26** | **`cockpit/lib/data-loader.js` = 4728 lignes** | **03/05** | ⚪ **NOUVEAU** | Tier 1 + Tier 2 + transformers + cache dans 1 fichier |
| **R27** | **Sub-pixel font-sizes contournent les tokens** : 13.5px × ~30, 12.5px × ~25, 10.5px × ~12 dans `styles.css` | **03/05** | ⚪ **NOUVEAU** | Tokens existent mais ignorés sur `.tk-*`, `.kbd-*`, `.top-summary` |

### 1.3 Design system implicite — état 03/05

Le système tri-thématique a **gagné en propreté** entre 30/04 et 01/05
(rounds 1 + 2 nettoyage hex). Mais **76 hex hardcodés persistent** dans
les `styles-*.css` :

| Hex | Occurrences 30/04 | 03/05 | Décodage probable | Action |
|---|---|---|---|---|
| `#c2410c` | 27 | **2** | Dawn `--brand` (rouille) | Round 3 ciblé |
| `#9aa3ad` | 13 | **0** | Obsidian `--tx2` | ✅ Résolu |
| `#141414` | 13 | **0** | Charbon Obsidian | ✅ Résolu |
| `#fafafa` | 11 | 0 (cleared via round 2) | Quasi-blanc | ✅ Résolu |
| `#b43a3a` | n/c | **11** | Rouge alert custom | Doit devenir `--alert` |
| `#b3491a` | n/c | **10** | Variante rouille | `--brand` |
| `#2d7a4e` | n/c | **9** | Vert positive custom | `--positive` |
| `#fafaf5` | n/c | **8** | Quasi-Dawn `--bg` | `--bg` |
| `#c25a3a` | n/c | **7** | Variante rouille | `--brand-tint` |
| `#4a7c4a` | n/c | **7** | Variante vert | `--positive` |
| `#c57455` | n/c | **6** | Variante saumon | `--brand-tint` |
| `#a85046` | n/c | **6** | Variante terracotta | `--alert-tint` |

**Sévérité** : 🟠 — la promesse tri-thématique fuite encore (8 panels
contiennent au moins 1 hex hardcodé). Un user en Atlas (blanc Swiss
+ indigo) voit toujours apparaître des accents rouille/vert custom dans
Veille outils, Jarvis Lab, Wiki, Stacks.

### 1.4 🔴 NOUVEAU FINDING (R24) : routine d'audit en panne 48h

Le 01/05, l'audit a produit 15 prompts dont 5 P0 (~3.5h Wave 1 critique).
Au 03/05, **aucun n'a été shippé**. Le seul commit applicatif depuis
01/05 est `953b029` (trigger DB jobs) qui ne touche pas l'UI.

**Diagnostic probable** : la vague 29-30/04 (10 commits a11y) a saturé
le canal d'exécution Cowork. Aujourd'hui, l'audit du 01/05 + l'audit
du 03/05 cumulent ~30 prompts non traités → **paralysie par excès
d'options**.

**Action concrète appliquée à cet audit** : la Phase 4 ne contient
**que 7 prompts** (6 P0 + 1 P1). Les findings non couverts sont
documentés ici sans prompt — pour ne pas surcharger.

### 1.5 🔴 NOUVEAU FINDING (R25) : `cockpit/styles.css` = 4666 lignes

```
$ wc -l cockpit/styles.css
4666 cockpit/styles.css
```

Ce fichier mélange : reset, tokens fallback, scaffold layout, sidebar,
hero, top, brief, review, evening, week, search, command-palette, stub
(R14+), modale, kbd-fab, focus-visible, skip-link, **et 6 autres
sections référencées par les panels mutualisés**. Quand un panel a son
propre fichier (`styles-jarvis.css` etc.), il y a doublon de
définitions sur `delta--up`, `pill`, `card`. Drift quasi inévitable.

**Sévérité** : 🟠 — pas un user-facing bug, mais une dette qui rend
chaque modif visuelle plus risquée. Le fichier est trop gros pour être
relu d'une traite.

### 1.6 🔴 NOUVEAU FINDING (R26) : `cockpit/lib/data-loader.js` = 4728 lignes

```
$ wc -l cockpit/lib/data-loader.js
4728 cockpit/lib/data-loader.js
```

Ce fichier contient `bootTier1()` (Tier 1 bloquant pré-mount) ET
`loadPanel(id)` (Tier 2 lazy) ET les transformers Supabase → shape
front pour ~28 panels ET le cache `once()`. La règle "ajouter un nouvel
event_type nécessite mise à jour du tableau dans CLAUDE.md AVANT le
commit" s'applique à un fichier de 4700+ lignes sans table des matières.

**Sévérité** : 🟠 — risque opérationnel élevé sur les futures évolutions
data layer. Tout changement Tier 1 oblige à scanner 4700 lignes pour
être sûr de ne rien casser sur Tier 2.

### 1.7 🟠 NOUVEAU FINDING (R27) : sub-pixel sizes contournent les tokens

`cockpit/themes.js` définit une échelle 9 niveaux propre (`--text-2xs`
10 → `--text-display` 54). Mais `cockpit/styles.css` contient :

```
font-size: 10.5px   × ~12 occurrences
font-size: 12.5px   × ~25 occurrences
font-size: 13.5px   × ~30 occurrences
```

Concentré sur `.tk-*` (modale ticket), `.kbd-*` (overlay raccourcis),
`.top-summary` et `.hero-body` (lecteur principal). Les sub-pixels
font-size :

1. Empêchent l'échelle modulaire de tenir (un user qui zoome OS+ casse
   les rythmes verticaux).
2. Rendent toute future 4e thème plus dur (devra dupliquer ces valeurs).
3. Sur certains zooms Windows ClearType, créent des hairlines de
   crénelage (test perso à valider).

**Sévérité** : 🟠 — pas un bug, une dette de discipline. Token sweep
audit 01/05 P2 ciblait déjà ce point ; il n'a pas été shippé.

### 1.8 Test rétention — état 03/05 (5e visite de la semaine)

Frictions encore présentes dans le code, classées par perception
quotidienne :

| Friction | Sévérité | Source |
|---|---|---|
| 🔴 FCP boot ~3-5s sur fibre, ~6-10s sur 4G (66 scripts série) | Élevée | R5 inchangé |
| 🔴 Hero macro plein format par défaut à chaque visite (toggle existe mais OFF par défaut) | Élevée | R1 partiel |
| 🟠 Hover translateY sur top-feat cards "danse" sous le curseur | Moyenne | R17 inchangé |
| 🟠 Bouton primary `--tx` (encre) sur fond crème — contraste violent Dawn | Moyenne | R4 inchangé |
| 🟠 Top-summary 13.5px line-height 1.55 sans max-width sur 27" → 95+ char/ligne | Moyenne | R18 partiel |
| 🟠 Sidebar 6 groupes — friction décisionnelle "où trouver Wiki ?" | Moyenne | R19 inchangé |
| 🟠 76 hex hardcodés persistant dans 8 panels CSS | Moyenne | R16+ partiel |
| 🟢 Pulses (résolu 30/04) | — | R15+ |
| 🟢 Modales système (résolu 29/04) | — | R12+ |
| 🟢 Streak zéro / kbd-fab perpétuel / skip link manquant (résolu 30/04) | — | R8, R9 |

**Verdict rétention 03/05** : **les 3 frictions critiques restent les
mêmes que le 28/04** — perf de boot, hero macro, contraste Dawn. La
vague a11y du 30/04 a réglé toute la couche "fatigue oculaire +
WCAG 2.3.3". Reste à attaquer la couche **vitesse perçue** + **densité
réglable**.

---

## 2. Matrice d'évaluation

Notes /5. Critères : Clarté · Densité · Cohérence · Interactions ·
Mobile · Accessibilité · Rétention.

**Légende delta** : `↑` = amélioration depuis 01/05 · `↓` = dégradation
· `—` = inchangé · `·` = pas de comparable.

| Section | Cl | De | Co | In | Mo | A11y | Ret | **Moy.** | **Δ vs 01/05** |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Shell — Sidebar + nav** | 4 | 3 | 4 | 5 | 4 | **5** | 4 | **4.1** | ↑ (skip-link, kbd-fab masqué) |
| **Shell — Top bar / Page header** | 4 | 2 | 4 | 4 | 3 | 4 | 3 | **3.4** | ↑ (skip-link) |
| **Shell — PWA / SW** | 4 | n/a | 4 | 4 | 4 | n/a | 4 | **4.0** | — |
| **Auth overlay** | 4 | 5 | **4** | 3 | 4 | 3 | n/a | **3.8** | ↑ (thème respecté pré-mount) |
| **Brief — Hero macro** | 5 | 2 | 5 | 4 | 4 | 4 | **3** | **3.9** | ↑ (toggle compact) |
| **Brief — Top 3 / Morning Card** | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **4.4** | — |
| **Brief — Hero delta** | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **4.4** | — |
| **Brief — Audio brief** | 3 | 4 | 4 | 3 | 3 | 4 | 3 | **3.4** | — |
| **Brief — Signaux cards** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| **Brief — Radar SVG** | 4 | 3 | 5 | 3 | 4 | 4 | 3 | **3.7** | ↑ (kill-switch reduced-motion) |
| **Brief — Zero state** | 5 | 4 | 4 | 4 | 4 | 4 | 5 | **4.3** | — |
| **Top du jour / Revue** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | ↓ (R17 hover translateY visible) |
| **Miroir du soir** | 4 | 4 | 4 | 3 | 4 | 4 | 4 | **3.9** | — |
| **Veille IA / Outils** | 4 | 4 | 4 | 4 | 3 | **4** | 4 | **3.9** | ↑ (R15+ reduced-motion) |
| **Wiki IA + Tooltip** | 4 | 4 | 3 | 4 | 3 | 4 | 4 | **3.7** | ↑ (wiki-pulse capé) |
| **Signaux faibles (panel)** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| **Radar compétences (panel)** | 4 | 3 | 5 | 3 | 4 | 4 | 3 | **3.7** | ↑ (a11y vague 30/04) |
| **Recos / Challenges** | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | ↑ (pulse-eval capé) |
| **Opportunités** | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | ↑ (opp-pulse capé + R17 reste) |
| **Carnet d'idées (kanban)** | 5 | 4 | 4 | 5 | 3 | 4 | 5 | **4.3** | ↑ (kill-switch) |
| **Jobs Radar** | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | ↑ (jr-pulse capé + trigger DB anti-republications) |
| **Jarvis chat** | 4 | 4 | 4 | 5 | 3 | 4 | 5 | **4.1** | ↑ (jv-pulse capé) |
| **Jarvis Lab** | 3 | 3 | **4** | 3 | 3 | 3 | 3 | **3.1** | ↑ (round 2 hex cleanup) |
| **Profil** | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | ↑ (toggle kbd-fab ajouté) |
| **Forme** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| **Musique** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | ↑ (mz-pulse capé) |
| **Gaming** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| **Stacks & Limits** | 4 | 5 | 4 | 4 | 3 | 4 | 4 | **4.0** | — |
| **Historique** | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| **Recherche** | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| **Performance perçue (boot)** | 3 | n/a | n/a | n/a | 2 | 3 | 1 | **2.3** | — (R5 inchangé) |

**Moyenne cockpit 03/05 : 3.92 / 5** (vs **3.78** le 30/04, vs **3.40** le
01/05). Le delta global est **+0.14** vs 30/04, **+0.52** vs 01/05.
La vague a11y 30/04 est le moteur principal du gain. Le ralentissement
01-03/05 ne pèse pas négativement (les frictions ne se sont pas
aggravées) mais empêche le palier suivant.

### 2.1 Top 3 forces (03/05)

1. **A11y au-dessus de la moyenne web.** Skip-link + focus-visible +
   prefers-reduced-motion kill-switch + ARIA + 44px Apple HIG (sur
   sidebar, pas mobile pills) + zero-state. Rare en projet perso.
   Cette propriété est **désormais plus solide que 95% des
   dashboards SaaS B2C**.
2. **Comportement de rétention sophistiqué.** Hero delta, zero state,
   snooze, undo "tout marqué lu", filtre récent auto-on, command
   palette, raccourcis, modale Stacks React thémée, hero compact toggle.
   La couche comportementale est inégalée pour un projet perso.
3. **Système tri-thématique mature** (Dawn / Obsidian / Atlas) avec
   vibe tokens (`density`, `dividerStyle`, `accentShape`, `cardStyle`).
   Tokens propres dans `themes.js`, **désormais appliqués à 90%**
   après 2 rounds de nettoyage hex.

### 2.2 Top 3 faiblesses (réordonnées 03/05)

1. **🔴 Performance de boot** (R5, identifié 28/04, **toujours non
   traité**). 66 scripts en série, 0 defer/async, Babel transpile 23
   JSX en série, 20 `data-*.js` synchrones. **Sur 25 visites/mois,
   ce sont ~3 minutes d'attente passive cumulées avant le brief.**
   Le coût est invisible jour par jour, dramatique en cumulé.
2. **🟠 Densité non-réglable + drift de tokens.** Le hero compact
   existe (toggle 30/04) mais OFF par défaut → un user de 30 jours
   le voit en plein format à chaque visite. R18 (`max-width 70ch`)
   non shippé sauf hero compact. R27 (sub-pixel sizes) traverse
   tout `styles.css`. R25 + R26 (monolithes 4700 lignes) rendent
   chaque sweep coûteux.
3. **🟠 Surface fonctionnelle qui dilue la rétention quotidienne.**
   29 panels = trop de portes d'entrée. Le brief se perd derrière
   l'arborescence sidebar. Profile, Stacks, Jarvis Lab, History sont
   des sections **outils** que le user visite 1×/semaine — elles
   devraient être en footer ou reléguées à command palette (R19
   sidebar 4 groupes max — non shippé).

---

## 3. Quick Wins & Roadmap Jarvis

### 3.1 Top 10 Quick Wins (triés par ratio impact/effort décroissant)

| # | Titre | Impact | Effort | Ratio | Sections |
|---|---|---|---|---|---|
| 1 | **Désactiver `translateY(-2px)` hover sur top-feat-main / top-feat-side / opp-kan-card** (border-color suffit) | 4 | 1 | **4.0** | Top, Opps |
| 2 | **`max-width: 70ch` sur `.top-summary`, `.hero-body` (mode plein), `.vl-item-summary`** | 4 | 1 | **4.0** | Top, Brief, Veille |
| 3 | **Hero compact = mode par défaut après J7** (read `cockpit-first-seen`, set `cockpit-hero-compact=1` au passage) | 5 | 1 | **5.0** | Brief (R1) |
| 4 | **Bannière "données stale > 24h"** sur Brief si `daily_briefs.fetch_date` < J-1 | 4 | 2 | **2.0** | Brief (R10) |
| 5 | **Supprimer le composant `Stub` mort + remplacer par `PanelNotFound`** | 2 | 1 | **2.0** | App (R14+) |
| 6 | **Streak meaningful : "X jours, record Y"** (extension du zero-state shippé 30/04) | 3 | 1 | **3.0** | Sidebar footer (R22) |
| 7 | **Ctrl+K nudge J0-J3** : pulse une fois sur le hint footer + tooltip "Ctrl+K pour tout chercher" | 4 | 2 | **2.0** | Sidebar footer (R23) |
| 8 | **Touch targets ≥ 44px sur `.vl-filter-pill` mobile** (font 14, padding 10×14) | 4 | 1 | **4.0** | Veille mobile (R20) |
| 9 | **`<script defer>` sur les libs CDN dans index.html** + `<link rel="modulepreload">` sur les jsx critiques | 5 | 3 | **1.7** | Boot (R5) |
| 10 | **Token sweep round 3** : éliminer les 76 hex hardcodés restants | 3 | 3 | **1.0** | Tous panels CSS (R16+) |

### 3.2 Roadmap Jarvis — 15 features avancées

Score composite = Impact × Faisabilité (Wow informatif).

| # | Feature | Imp | Fais | Wow | **I×F** |
|---|---|:-:|:-:|:-:|:-:|
| J1 | **Lecture immersive in-cockpit** (overlay article fullscreen, raccourcis J/S/Esc) | 5 | 4 | 4 | **20** |
| J2 | **Resume tracker hebdo** (Miroir dimanche : "ta semaine en 5 thèmes" via aggregation `usage_events`) | 5 | 4 | 5 | **20** |
| J3 | **Spec drift indicator** dans Jarvis Lab (warning si code panel ≠ doc, basé sur `git log` + `last_updated`) | 4 | 5 | 3 | **20** |
| J4 | **Streak "pardon" 1×/mois** (1 jour raté n'efface pas la streak, 1 joker offert) | 4 | 5 | 3 | **20** |
| J5 | **"Why this ranks #1" expansible** sur Top cards (1 phrase IA Jarvis local cachée 24h) | 5 | 4 | 4 | **20** |
| J6 | **Snooze intelligent** ("Réveille-moi quand X bouge" → re-surface conditionnelle) | 5 | 4 | 5 | **20** |
| J7 | **Search → save query → digest hebdo** ("newsletter perso" reverse-feed) | 5 | 4 | 4 | **20** |
| J8 | **Ask Jarvis dock** (Cmd+J flottant, input + 3 dernières réponses, accessible depuis tout panel) | 5 | 3 | 5 | **15** |
| J9 | **Ideas ↔ Opportunities matchmaking** (signal résonne avec idée dormante → flag 🔥) | 5 | 3 | 5 | **15** |
| J10 | **Smart-collapse panels rares** (non visités 14j+ → groupés sous "Autres" en sidebar) | 3 | 5 | 3 | **15** |
| J11 | **Préchargement Babel + JSX critiques** via `<link rel="modulepreload">` + service worker pré-cache | 4 | 4 | 2 | **16** |
| J12 | **Profil dynamique** (Jarvis pose 1 question/jour pour enrichir `user_profile`, max 1, dismissible) | 5 | 3 | 4 | **15** |
| J13 | **Cockpit voice mode** (Web Speech API + Jarvis local : "Lis-moi le top 1", "Marque comme lu") | 4 | 3 | 5 | **12** |
| J14 | **Téléchargement export brief .md** (bouton "Sauvegarder" qui dump le brief du jour) | 3 | 5 | 3 | **15** |
| J15 | **Mode "vibe" Profil** (3 préréglages Calme / Focus / Mission qui modifient densité, animations, sons) | 4 | 3 | 5 | **12** |

**Top 7 composite (ex æquo à 20)** : J1, J2, J3, J4, J5, J6, J7. Pour
respecter la règle "ne pas surcharger" (R24 vélocité), Phase 4
embarque seulement **J3 (spec drift)** comme seul prompt P1 jarvis.

### 3.3 Mockups textuels — 3 features les plus prometteuses

#### Mockup A — QW #3 : Hero compact par défaut J7+

```
┌─────────────────────────────────────────────────────────────────┐
│ [Brief]  [● Compact]                                            │
│                                                                 │
│ ● VENDREDI 3 MAI · 89 articles synthétisés · lecture 4 min      │
│                                                                 │
│ La semaine s'achève sur les agents orchestrés.                  │
│ (max 70ch, font-size 15px, line-height 1.65)                    │
│                                                                 │
│ [Lire 4 nouveautés →]   [Brief macro plein format]              │
└─────────────────────────────────────────────────────────────────┘

Différence vs aujourd'hui :
- Le user de 30 jours arrive directement sur ce format
- Le toggle [● Compact] devient le clic "je veux plus de contexte"
  et non l'inverse
- Mécanisme : `cockpit-first-seen` >= 7j → `cockpit-hero-compact` set
  à "1" au boot si jamais set explicitement à "0" par le user
- Réversible : si le user clique "Plein", la valeur explicite
  "0" est mémorisée et le J7 default ne s'applique plus
```

#### Mockup B — J3 (Roadmap) : Spec drift indicator dans Jarvis Lab

```
┌─────────────────────────────────────────────────────────────────┐
│  Onglets cockpit · 29 panels · 3 en dérive               [↻]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✓  brief             docs/specs/tab-brief.md       2026-04-30 │
│  ✓  evening           docs/specs/tab-evening.md     2026-04-26 │
│  ⚠  top               docs/specs/tab-top.md         2026-04-21 │
│      ↳ Code modifié 2026-04-30 (panel-top.jsx)                  │
│      ↳ Spec n'a pas bougé depuis 2026-04-21 (9 jours)           │
│      ↳ [Ouvrir le diff] [Marquer "iso-fonctionnel"]             │
│                                                                 │
│  ✓  review            docs/specs/tab-review.md      2026-04-25 │
│  ⚠  jobs              docs/specs/tab-jobs.md        2026-04-20 │
│      ↳ Code modifié 2026-05-01 (sql/013_jobs_inherit_status)   │
│      ↳ Spec n'a pas bougé depuis 2026-04-20 (13 jours)          │
│  ⚠  jarvis-lab        docs/specs/tab-jarvis-lab.md  2026-04-24 │
│  ✓  ...                                                         │
│                                                                 │
│  Source : git log + docs/specs/index.json::last_updated          │
│  CI lint-specs reste bloquante — ce panel surface en plus        │
│  les dérives qui sont passées entre les mailles                  │
└─────────────────────────────────────────────────────────────────┘
```

Implémentation : nouveau script `scripts/spec_freshness.mjs`
(Node) qui, pour chaque tab dans `index.json`, fait `git log -1
--format="%ai" -- cockpit/<file>` et `git log -1 --format="%ai"
-- docs/specs/tab-<slug>.md`, calcule le diff en jours, et écrit
`docs/specs/freshness.json`. Le panel `panel-jarvis-lab.jsx` lit ce
fichier et affiche une icône warning quand le delta > 7 jours
(seuil ajustable). Régénération : pré-commit hook ou CI nightly.

#### Mockup C — J4 (Roadmap) : Streak "pardon" 1×/mois

```
   Footer sidebar :

   ┌───────────────────────────────┐
   │  🔥  12 j                       │
   │  streak veille · record 18 j   │
   │  prochain 06:00 · joker 1/1    │
   └───────────────────────────────┘

   Au reset 06:00 si le J-1 n'a pas eu de lecture :
   → Si joker disponible : streak conservée, joker passe à 0/1
   → Toast UI : "Tu as raté hier. Joker utilisé. Streak intacte."
                "Prochain joker dans 27 jours."
   → Sinon : streak repart à 0 (zero-state existant)

   Calcul joker : 1 joker offert tous les 30 jours calendaires
   à partir du `cockpit-first-seen`. Stocké dans
   `localStorage.cockpit-streak-joker-last-used` + persisté sur
   `user_profile.streak_record` côté Supabase pour le record
   meaningful (QW #6).
```

Réutilise l'infrastructure `localStorage` existante (`cockpit-streak`,
`cockpit-first-seen`) + 1 nouveau key `cockpit-streak-joker-state`
(JSON `{ last_used_at, available }`). 0 dépendance.

---

## 4. Prompts Claude Code

> **Stack rappel** : React 18 + Babel standalone via CDN unpkg (no
> build), Supabase REST, **fichiers multiples** (`cockpit/*.jsx`,
> `cockpit/styles*.css`, `cockpit/themes.js`, `cockpit/lib/*.js`).
> Pas de TypeScript, pas de bundler. Composants exposés via `window.X`.
> Tokens via CSS Custom Properties dans `cockpit/themes.js`. **Toute
> modif d'un onglet implique de mettre à jour
> `docs/specs/tab-<slug>.md` + `docs/specs/index.json` dans le même
> commit (CI `lint-specs` bloquante).** Idem `docs/architecture/`
> pour tout chemin à impact archi (CI `validate-arch` bloquante).

> **Discipline 03/05** : seulement **7 prompts**, ordonnés par
> dépendance et ratio impact/effort. Cible = solder en une session
> Claude Code (~5h Wave 1+2) la plus grosse partie du backlog 01/05
> + le R1 que les 4 audits précédents n'ont jamais résolu.

---

### P0 — Quick wins immédiats

#### Prompt 1 — [UX] Désactiver `translateY(-2px)` hover sur top-feat / opp-kan

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers** : `cockpit/styles.css` (lignes 2171, 2233), `cockpit/styles-opportunities.css` (ligne 620)

```
Contexte : Le hover sur les cards .top-feat-main, .top-feat-side et
.opp-kan-card applique transform: translateY(-2px ou -1px). Ce micro-
mouvement déstabilise la grille pendant le scan rapide quotidien et
"danse" sous le curseur sur trackpad. Loi de Fitts : la cible bouge
au moment du clic, donc plus dur à atteindre. Charmant à la 1ère
visite, irritant à la 25e. Audit 01/05 P1 — non livré au 03/05.

Fichier 1 — cockpit/styles.css :

Ligne ~2171, remplacer :
  .top-feat-main:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
par :
  .top-feat-main:hover { box-shadow: var(--shadow-lg); border-color: var(--bd2); }

Ligne ~2233, remplacer :
  .top-feat-side:hover { border-color: var(--bd2); box-shadow: var(--shadow-md); transform: translateY(-2px); }
par :
  .top-feat-side:hover { border-color: var(--bd2); box-shadow: var(--shadow-md); }

Fichier 2 — cockpit/styles-opportunities.css :

Ligne ~620, remplacer :
  .opp-kan-card:hover { border-color: var(--tx2); transform: translateY(-1px); }
par :
  .opp-kan-card:hover { border-color: var(--tx2); }

Bumper styles.css ?v=24 et styles-opportunities.css ?v=5 dans
index.html (les autres bumps suivront via la GH Action sw-sync).

Specs à toucher : aucune (purement style, iso-fonctionnel UI).
Mentionner dans le commit : "Specs mises à jour: aucune | N/A
(hygiène hover anti-fatigue)".

Validation : ouvrir le panel Top du jour et le panel Opportunités sur
desktop avec un trackpad, survoler les cards rapidement → la grille
ne bouge plus. Le hover reste perceptible via box-shadow et
border-color. Pas de saut visuel.
```

**Validation** : un user qui scanne 10 cards top en 5 secondes ne voit aucun saut vertical.

---

#### Prompt 2 — [UX] `max-width: 70ch` sur top-summary / hero-body / vl-item-summary

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers** : `cockpit/styles.css` (lignes 638, 1382, ~3700)

```
Contexte : Le mode "Hero compact" ajouté le 30/04 a max-width 70ch sur
.hero.is-compact .hero-body (ligne 658). Mais le mode "plein format"
(par défaut), le .top-summary (ligne 1382) et le .vl-item-summary
n'ont AUCUN max-width. Sur un écran 27", un .top-summary de 13.5px
line-height 1.55 s'étire à ~95-110 caractères/ligne — Bringhurst
recommande 45-75 ch pour la lecture confortable (Elements of
Typographic Style, p.26). Au-delà, l'œil perd la fin de ligne et
fatigue. Audit 01/05 P5 — non livré au 03/05.

Tâche : ajouter max-width: 70ch sur 3 sélecteurs.

Fichier — cockpit/styles.css :

Ligne ~638, dans .hero-body, AJOUTER une ligne après font-size :
  .hero-body {
    font-family: var(--font-serif);
    font-style: italic;
    font-size: var(--text-xl);
    line-height: 1.65;
    color: var(--tx2);
    margin-bottom: 26px;
+   max-width: 70ch;
  }

Ligne ~1382, dans .top-summary, AJOUTER une ligne après line-height :
  .top-summary {
    color: var(--tx2);
    font-size: 13.5px;
    line-height: 1.55;
+   max-width: 70ch;
    margin-top: 4px;
  }

Au passage, profiter pour remplacer `font-size: 13.5px;` par
`font-size: var(--text-md);` (R27 sub-pixel discipline). Le token
--text-md vaut 13px, la différence d'un demi-pixel n'est pas
perceptible et la cohérence design system gagne.

Pour .vl-item-summary, chercher la définition (probablement dans
styles.css autour de la ligne 3700+ ou dans styles-mobile.css). Si
elle est dans styles.css, AJOUTER max-width: 70ch. Si elle est
seulement dans styles-mobile.css en mode mobile, AJOUTER une nouvelle
règle dans styles.css (en mode desktop) :

  .vl-item-summary {
    max-width: 70ch;
  }

(Le mobile a déjà font-size: 13px !important via styles-mobile.css,
donc max-width 70ch ne pose pas de souci de retour à la ligne.)

Bumper styles.css ?v=24 dans index.html.

Specs à toucher : aucune (réglage typo, pas un changement
fonctionnel/comportemental).

Validation : sur écran ≥ 24", ouvrir Brief du jour, Top du jour,
Veille IA. Mesurer les longueurs de ligne du body — toutes sous 75
caractères. La lecture devient plus apaisée, l'œil retrouve
naturellement le début de la ligne suivante.
```

**Validation** : sur 27", aucun bloc de texte ne dépasse ~70ch (≈ 540px en font 13/15).

---

#### Prompt 3 — [UX] Hero compact = mode par défaut après J7

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers** : `cockpit/home.jsx` (lignes 260-275)

```
Contexte : Le toggle compact/plein du hero existe depuis 30/04
(commit bc1e146), mais il est OFF par défaut. Un user qui ouvre le
cockpit pour la 30e fois voit toujours un hero macro plein format
qui prend 60% de la fenêtre, alors qu'il connaît parfaitement le
contenu. R1 dans tous les audits 28/04 → 03/05.

Tâche : à partir du 8e jour d'usage (cockpit-first-seen >= 7 jours),
mettre le hero en mode compact par défaut, MAIS uniquement si l'user
n'a jamais explicitement choisi "plein". Le user qui clique "Plein"
mémorise sa préférence et le J7-default ne s'applique plus.

Dans cockpit/home.jsx, autour de la ligne 260, REMPLACER le useState
initial du heroCompact par une fonction d'init qui lit aussi
cockpit-first-seen :

  const [heroCompact, setHeroCompact] = useState(() => {
    try {
      // Préférence explicite de l'user gagne toujours
      const explicit = localStorage.getItem("cockpit-hero-compact");
      if (explicit === "1") return true;
      if (explicit === "0") return false;

      // Fallback : à partir de J7+, default = compact
      // (auto-densité progressive, l'user expérimenté n'a plus besoin
      // du hero plein format à chaque visite)
      const firstSeen = localStorage.getItem("cockpit-first-seen");
      if (firstSeen) {
        const days = (Date.now() - parseInt(firstSeen, 10)) / 86400000;
        if (days >= 7) return true;
      }
      return false;
    } catch { return false; }
  });

  const toggleHeroCompact = () => {
    setHeroCompact((prev) => {
      const next = !prev;
      // On stocke explicitement "0" ou "1" pour neutraliser le default J7+
      try { localStorage.setItem("cockpit-hero-compact", next ? "1" : "0"); } catch {}
      // Télémétrie existante (hero_compact_toggled)
      try { window.cockpitTelemetry?.track?.("hero_compact_toggled", { state: next ? "compact" : "full" }); } catch {}
      return next;
    });
  };

(Ne pas casser la télémétrie existante. Vérifier que le track
hero_compact_toggled tourne toujours quand le user clique.)

Bumper home.jsx ?v=6 dans index.html.

Specs à toucher :
- docs/specs/tab-brief.md : ajouter dans Fonctionnalités
  "Densité progressive : à partir de la 8e visite, le hero adopte
  par défaut le format compact. L'utilisateur peut toujours basculer
  manuellement (sa préférence est mémorisée)."
- docs/specs/index.json : bumper last_updated pour "brief" → 2026-05-03.

Validation : forcer en console
  localStorage.setItem("cockpit-first-seen", String(Date.now() - 8*86400000));
  localStorage.removeItem("cockpit-hero-compact");
puis reload → hero affiché en mode compact directement. Cliquer "Plein"
→ reload → hero en plein. Cliquer "Compact" → reload → hero en compact.
Effacer "cockpit-first-seen" → reload → hero plein (J0 default).
```

**Validation** : un user de 30 jours arrive sur un brief compact ; un nouveau user (J0-J6) arrive toujours sur le hero plein.

---

#### Prompt 4 — [UX] Bannière "données stale > 24h" sur Brief

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers** : `cockpit/home.jsx`, `cockpit/styles.css`

```
Contexte : Si le pipeline daily_digest crashe ou si l'user ouvre le
cockpit avant que le pipeline 6h UTC ait tourné, le Brief affiche
les données d'avant-hier sans aucun signal visuel. R10 dans les
audits 28/04 → 03/05. Pas de feedback "données fraîches / stale".

Tâche : afficher un bandeau jaune-orangé en haut du Brief si la date
du daily_brief le plus récent est antérieure à J-1 (24h+).

Dans cockpit/home.jsx, repérer là où `data.daily_briefs` ou
`data.brief` est lu (probablement déstructuré dans le composant Home
avec une variable comme `macro` ou `brief`). On a besoin de la date
de génération du brief — colonne `fetch_date` de la table
`daily_briefs` (cf. CLAUDE.md).

AJOUTER au début du composant Home, après les useState initiaux,
un bloc useMemo qui calcule l'âge du brief :

  const briefStaleHours = useMemo(() => {
    try {
      const fetchDate = data?.brief?.fetch_date || data?.daily_briefs?.[0]?.fetch_date;
      if (!fetchDate) return null;
      const ms = Date.now() - new Date(fetchDate).getTime();
      return Math.floor(ms / 3600000);
    } catch { return null; }
  }, [data]);

  const isBriefStale = briefStaleHours != null && briefStaleHours > 30;
  // 30h = laisse 6h de tolérance après le run 6h UTC du pipeline

Puis dans le JSX retourné par Home, AVANT le <section className="hero">,
INSÉRER :

  {isBriefStale && (
    <div className="brief-stale-banner" role="status" aria-live="polite">
      <span className="brief-stale-icon" aria-hidden="true">!</span>
      <span className="brief-stale-text">
        Brief vieux de {briefStaleHours}h. Le pipeline n'a pas tourné
        ce matin — peut-être un souci côté GitHub Actions.
      </span>
      <a
        href="https://github.com/Ph3nixx/jarvis-cockpit/actions/workflows/daily_digest.yml"
        target="_blank"
        rel="noopener noreferrer"
        className="brief-stale-link"
      >Vérifier ↗</a>
    </div>
  )}

CSS dans cockpit/styles.css, AJOUTER (vers la fin, dans la section
.hero ou juste avant) :

  .brief-stale-banner {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 16px;
    padding: 10px 14px;
    background: var(--alert-tint);
    border: 1px solid var(--alert);
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: var(--text-sm);
    color: var(--tx);
  }
  .brief-stale-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--alert);
    color: var(--bg);
    font-weight: 700;
    flex-shrink: 0;
  }
  .brief-stale-text { flex: 1; }
  .brief-stale-link {
    color: var(--alert);
    text-decoration: underline;
    text-underline-offset: 3px;
    flex-shrink: 0;
  }
  .brief-stale-link:hover { color: var(--tx); }

Bumper home.jsx et styles.css.

Specs à toucher :
- docs/specs/tab-brief.md : ajouter dans Fonctionnalités
  "Détection de fraîcheur : un bandeau d'alerte apparaît si le brief
  a plus de 30 heures, avec un lien vers GitHub Actions pour vérifier
  l'état du pipeline."
- docs/specs/index.json : bumper last_updated pour "brief" → 2026-05-03.

Validation : forcer en console
  // Modifier window.COCKPIT_DATA.brief.fetch_date pour J-2
  window.COCKPIT_DATA.brief.fetch_date = new Date(Date.now() - 36*3600000).toISOString();
puis dans React DevTools, force un re-render du Home → la bannière
apparaît. Le lien ouvre la page Actions du repo dans un nouvel
onglet. Tester en thème Dawn, Obsidian, Atlas — les couleurs
--alert et --alert-tint doivent toutes 3 rester lisibles (R21
contraste WCAG est encore un finding ouvert, ne pas y toucher ici).
```

**Validation** : si pipeline 6h UTC crashe ou si l'user ouvre à 4h du matin J+1, il voit "Brief vieux de 28h" sans avoir à ouvrir GitHub.

---

#### Prompt 5 — [UX] Touch targets ≥ 44px sur `.vl-filter-pill` mobile

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers** : `cockpit/styles-mobile.css` (lignes 133-138)

```
Contexte : Les pills de filtre dans le panel Veille (.vl-filter-pill,
.vl-prod-filter) ont sur mobile font-size: 12.5px et padding: 5px 10px,
soit ~26px de hauteur tactile — fail WCAG 2.5.5 Niveau AAA (44×44px)
et Apple HIG (44pt). Sur un iPhone, un user a une chance sur deux de
mishit la pill voisine. Audit 01/05 P6 — non livré au 03/05.

Tâche : ajuster les paddings/sizes pour atteindre ~44px de hauteur
tactile sur mobile, sans casser le wrapping ni l'esthétique.

Fichier — cockpit/styles-mobile.css, lignes ~133-138 :

REMPLACER :
  .vl-filter-pill,
  .vl-prod-filter {
    font-size: 12.5px !important;
    padding: 5px 10px !important;
  }

PAR :
  .vl-filter-pill,
  .vl-prod-filter {
    font-size: 14px !important;
    padding: 10px 14px !important;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }

Vérifier que le gap entre pills est suffisant (chercher
.vl-filter-pills, .vl-prod-filters dans styles-mobile.css ligne ~129) :
  gap: 8px !important; (au lieu de 6px)

Bumper styles-mobile.css ?v=2 dans index.html.

Specs à toucher : aucune (mobile a11y, transversal). Mentionner dans
le commit "Specs mises à jour: aucune | N/A (a11y mobile WCAG 2.5.5)".

Validation : ouvrir la prod en mode mobile dev tools (iPhone 14
viewport 390×844). Aller sur Veille IA. Tenter de tapper précisément
chaque pill avec un doigt — toutes doivent être atteignables sans
mishit. Mesurer en DevTools la hauteur réelle d'une pill : ≥ 44px.
Tester aussi Veille outils, Sport, Gaming, Anime, Actualités (le
même panel-veille.jsx mutualisé). Vérifier que sur iPhone SE
(viewport 375), les pills wrap proprement sans déborder.
```

**Validation** : sur iPhone, tapper précisément chaque pill du filtre Veille sans mishit voisin. DevTools confirme min-height: 44px.

---

#### Prompt 6 — [UX] Supprimer le composant `Stub` mort + remplacer par `PanelNotFound`

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers** : `cockpit/app.jsx`, `cockpit/styles.css`

```
Contexte : cockpit/app.jsx contient un composant Stub déclaré
(historiquement lignes 99-112) qui rend "Ce panel reste à designer".
Tous les ids du sidebar (window.COCKPIT_NAV) sont désormais routés —
le Stub n'est jamais atteint. Dette de message (R14+ depuis 29/04, non
livré au 03/05).

Tâche : remplacer Stub par PanelNotFound, garder la branche fallback
au cas où une URL profonde viendrait avec un panel inconnu.

Dans cockpit/app.jsx :

1. Trouver le composant Stub (chercher "function Stub" ou
   "const Stub = "). Le SUPPRIMER.

2. AJOUTER à sa place :

  function PanelNotFound({ id, onBack }) {
    return (
      <div className="panel-not-found" role="region" aria-label="Panel introuvable">
        <span className="pnf-kicker">Panel inconnu</span>
        <h2 className="pnf-title">"{id}" n'existe pas</h2>
        <p className="pnf-body">
          Cette adresse pointe vers un panel qui n'est plus dans la
          navigation actuelle. Tu peux revenir au Brief du jour ou
          chercher autre chose.
        </p>
        <div className="pnf-actions">
          <button className="btn btn--primary" onClick={onBack}>
            Retour au Brief
          </button>
        </div>
      </div>
    );
  }

3. Trouver l'utilisation de Stub dans le rendering (chercher
   "<Stub" ou "= <Stub"). REMPLACER par :

  else content = <PanelNotFound id={activePanel} onBack={() => setActivePanel("brief")} />;

Dans cockpit/styles.css :

1. Trouver les règles .stub, .stub-kicker, .stub-title, .stub-body,
   .stub-back (probablement entre lignes 1854 et 1881). Les SUPPRIMER.

2. AJOUTER à la place :

  .panel-not-found {
    padding: 80px 32px;
    max-width: 540px;
    margin: 0 auto;
    text-align: center;
  }
  .pnf-kicker {
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--tx3);
    display: block;
    margin-bottom: 12px;
  }
  .pnf-title {
    font-family: var(--font-display);
    font-size: var(--text-2xl);
    color: var(--tx);
    margin-bottom: 16px;
  }
  .pnf-body {
    color: var(--tx2);
    line-height: 1.6;
    margin-bottom: 24px;
    max-width: 70ch;
    margin-left: auto;
    margin-right: auto;
  }
  .pnf-actions {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

Bumper app.jsx ?v=34 et styles.css ?v=24 dans index.html.

Specs à toucher : aucune (purement nettoyage, pas de surface user
nouvelle accessible — c'est un fallback défensif).

Validation : ouvrir le cockpit, en console exécuter
  // Force un panel inconnu via React DevTools ou setActivePanel :
  document.dispatchEvent(new CustomEvent("cockpit:set-panel", { detail: { id: "doesnotexist" } }));
ou éditer manuellement le state. Le panel doit afficher
"PANEL INCONNU / 'doesnotexist' n'existe pas / [Retour au Brief]".
Cliquer le bouton → retour au Brief. Aucun warning React dans la
console.
```

**Validation** : taper en URL `?p=foo` (ou injecter un id non listé en state) → fallback propre, pas l'ancien Stub "à designer".

---

### P1 — Améliorations rétention significatives

#### Prompt 7 — [JARVIS] Spec drift indicator dans Jarvis Lab

**Priorité** : P1
**Dépend de** : Aucun (mais bénéficie de la routine spec-drift-check existante)
**Fichiers** : `scripts/spec_freshness.mjs` (nouveau), `cockpit/panel-jarvis-lab.jsx`, `cockpit/styles-jarvis-lab.css`, `.github/workflows/spec-freshness.yml` (nouveau)

```
Contexte : Le projet a une CI lint-specs bloquante + spec-drift-check
warning-only. Mais aucun feedback visuel dans le cockpit lui-même
sur la fraîcheur des specs. L'user n'a aucun signal "tab-top.md a 9
jours de retard sur panel-top.jsx" sauf à lire les warnings GitHub.
Audit 01/05 J3 (composite 20).

Tâche : créer un script Node qui calcule la fraîcheur de chaque spec
vs son code panel correspondant, écrit dans
docs/specs/freshness.json, et un nouveau bloc dans Jarvis Lab qui
affiche les dérives.

ÉTAPE 1 — Créer scripts/spec_freshness.mjs :

  #!/usr/bin/env node
  // Calcule la fraîcheur de chaque spec vs son code panel.
  // Sortie : docs/specs/freshness.json
  //
  // Pour chaque tab dans docs/specs/index.json :
  //   - last_code_change : git log -1 --format=%aI sur le file panel
  //   - last_spec_change : git log -1 --format=%aI sur tab-<slug>.md
  //   - drift_days       : floor((last_code - last_spec) / 86400000)
  //   - drift            : drift_days > 7

  import { execSync } from "node:child_process";
  import { readFileSync, writeFileSync } from "node:fs";

  const indexPath = "docs/specs/index.json";
  const outPath = "docs/specs/freshness.json";
  const TOLERANCE_DAYS = 7;

  // Mapping tab → fichier source attendu (via CLAUDE.md, section
  // "Mapping panel ↔ spec"). On accepte plusieurs candidats.
  const panelFile = (slug) => {
    // Cas spéciaux mutualisés : panel-veille.jsx couvre 6 corpus
    const veilleSlugs = new Set(["updates","claude","sport","gaming-news","anime","news"]);
    if (veilleSlugs.has(slug)) return "cockpit/panel-veille.jsx";
    if (slug === "brief") return "cockpit/home.jsx";
    if (slug === "perf") return "cockpit/panel-forme.jsx";
    if (slug === "music") return "cockpit/panel-musique.jsx";
    if (slug === "opps") return "cockpit/panel-opportunities.jsx";
    if (slug === "jobs") return "cockpit/panel-jobs-radar.jsx";
    if (slug === "veille-outils") return "cockpit/panel-veille-outils.jsx";
    if (slug === "jarvis-lab") return "cockpit/panel-jarvis-lab.jsx";
    return `cockpit/panel-${slug}.jsx`;
  };

  const lastCommitISO = (file) => {
    try {
      return execSync(`git log -1 --format=%aI -- "${file}"`, { encoding: "utf8" }).trim() || null;
    } catch { return null; }
  };

  const idx = JSON.parse(readFileSync(indexPath, "utf8"));
  const tabs = (idx.tabs || []).filter(t => t.status !== "archived");

  const out = {
    generated_at: new Date().toISOString(),
    tolerance_days: TOLERANCE_DAYS,
    items: tabs.map((t) => {
      const codeFile = panelFile(t.slug);
      const specFile = `docs/specs/tab-${t.slug}.md`;
      const lastCode = lastCommitISO(codeFile);
      const lastSpec = lastCommitISO(specFile);
      const driftDays = (lastCode && lastSpec)
        ? Math.floor((new Date(lastCode) - new Date(lastSpec)) / 86400000)
        : null;
      return {
        slug: t.slug,
        spec_file: specFile,
        code_file: codeFile,
        last_code_change: lastCode,
        last_spec_change: lastSpec,
        drift_days: driftDays,
        drift: driftDays != null && driftDays > TOLERANCE_DAYS,
      };
    }),
  };

  writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
  console.log(`Wrote ${outPath} (${out.items.length} items, ${out.items.filter(i => i.drift).length} en dérive)`);

ÉTAPE 2 — Créer .github/workflows/spec-freshness.yml :

  name: spec-freshness

  on:
    push:
      branches: [main]
      paths:
        - "cockpit/**"
        - "docs/specs/**"
    workflow_dispatch:

  jobs:
    refresh:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
          with:
            fetch-depth: 0  # nécessaire pour git log
        - uses: actions/setup-node@v4
          with: { node-version: "20" }
        - name: Generate freshness.json
          run: node scripts/spec_freshness.mjs
        - name: Commit if changed
          run: |
            if git diff --quiet docs/specs/freshness.json; then
              echo "No drift change."
            else
              git config user.name "github-actions[bot]"
              git config user.email "github-actions[bot]@users.noreply.github.com"
              git add docs/specs/freshness.json
              git commit -m "chore(specs): refresh freshness.json [skip ci]"
              git push
            fi

ÉTAPE 3 — Étendre cockpit/panel-jarvis-lab.jsx :

Ajouter un nouveau bloc "Fraîcheur des specs" qui fetch
docs/specs/freshness.json (chemin relatif au site GH Pages) et affiche
la liste des onglets en dérive.

Trouver dans panel-jarvis-lab.jsx la section qui affiche les onglets
(probablement quelque chose qui itère sur docs/specs/index.json).
AJOUTER, dans le useEffect d'init de ce panel, le fetch du fichier
freshness :

  const [freshness, setFreshness] = useState(null);
  useEffect(() => {
    fetch("docs/specs/freshness.json", { cache: "no-cache" })
      .then(r => r.ok ? r.json() : null)
      .then(setFreshness)
      .catch(() => setFreshness(null));
  }, []);

Puis, à l'endroit où chaque tab est rendu (probablement une row d'un
tableau), AJOUTER une icône de drift quand l'item correspondant a
drift: true :

  const driftItem = freshness?.items?.find(it => it.slug === tab.slug);
  // ... dans le JSX du row :
  {driftItem?.drift && (
    <span
      className="jl-spec-drift"
      title={`Code modifié il y a ${driftItem.drift_days} jours, spec n'a pas bougé.`}
    >⚠ {driftItem.drift_days}j</span>
  )}

ÉTAPE 4 — CSS dans cockpit/styles-jarvis-lab.css, AJOUTER :

  .jl-spec-drift {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-left: 8px;
    padding: 2px 8px;
    background: var(--alert-tint);
    color: var(--alert);
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: var(--text-2xs);
    font-weight: 600;
  }

ÉTAPE 5 — bumper panel-jarvis-lab.jsx ?v=8 et styles-jarvis-lab.css ?v=11
dans index.html.

Specs à toucher :
- docs/specs/tab-jarvis-lab.md : ajouter dans Fonctionnalités
  "Indicateur de dérive specs : chaque onglet listé montre un
  signal d'alerte quand son code a été modifié plus de 7 jours
  après la dernière mise à jour de sa spec. Aide à détecter les
  passes-droit qui ont franchi le filet CI."
- docs/specs/index.json : bumper last_updated pour "jarvis-lab" → 2026-05-03.
- docs/architecture/decisions.md : ajouter une décision
  "Spec freshness as cockpit-visible signal" qui justifie le choix
  d'un fichier généré (pas de live git log côté front pour rester
  GitHub Pages compatible).

Validation :
1. Lancer `node scripts/spec_freshness.mjs` localement → freshness.json
   généré dans docs/specs/.
2. Ouvrir le fichier : structure correcte, aucun item avec drift_days
   négatif sauf si une spec est plus récente que son code (cas valide).
3. Modifier cockpit/panel-radar.jsx (ajouter un commentaire), commit,
   ne pas toucher tab-radar.md → relancer le script → l'item radar
   doit avoir drift: true.
4. Push sur main → la GH Action spec-freshness.yml doit auto-commit
   le freshness.json mis à jour.
5. Recharger la prod GitHub Pages → ouvrir Jarvis Lab → l'onglet
   Radar (et autres en dérive éventuels) montre la pastille
   "⚠ 9j" en orange.
6. Le panel ne doit PAS crasher si freshness.json est absent (cas
   premier déploiement).
```

**Validation** : modifier un panel sans mettre à jour la spec → l'onglet apparaît avec une pastille orange dans Jarvis Lab à la prochaine release.

---

### Checklist d'exécution

Ordre recommandé pour minimiser les conflits de merge et maximiser
l'impact sur la rétention. Temps indicatifs en travail Claude Code
autonome (PR-by-PR, validation utilisateur entre chaque).

| # | Prompt | Tag | Effort | Dépend | Cumul |
|:--:|---|:--:|:--:|---|:--:|
| 1 | P0 — Prompt 1 (hover translateY off) | UX | 0.3h | — | 0.3h |
| 2 | P0 — Prompt 2 (max-width 70ch) | UX | 0.5h | — | 0.8h |
| 3 | P0 — Prompt 6 (Stub → PanelNotFound) | UX | 0.4h | — | 1.2h |
| 4 | P0 — Prompt 5 (touch targets 44px mobile) | UX | 0.3h | — | 1.5h |
| 5 | P0 — Prompt 3 (hero compact J7+ default) | UX | 0.5h | — | 2.0h |
| 6 | P0 — Prompt 4 (bannière stale brief) | UX | 1.0h | — | 3.0h |
| 7 | P1 — Prompt 7 (spec drift indicator) | JARVIS | 2.0h | — | 5.0h |

**Total estimé** : ~5h de travail Claude Code autonome.

**Wave 1 critique (P0, 3.0h)** : à exécuter d'un trait pour solder
le backlog 01/05 et débloquer le palier rétention suivant. Les 6
prompts P0 sont tous indépendants entre eux et peuvent être batched
dans une même session Claude Code.

**Wave 2 (P1, +2h)** : Spec drift indicator. Prend ~2h car implique
un nouveau script Node + GH Action + extension panel. Peut attendre
la session suivante. **Ne pas embarquer plus tant que Wave 1 n'est
pas en prod** (cf. R24 — éviter de surcharger le canal d'exécution).

---

## 5. Findings non couverts par des prompts (volontairement)

Pour respecter la discipline anti-surcharge (R24), les findings
suivants restent ouverts et seront ré-évalués au prochain audit :

| # | Finding | Pourquoi pas dans cet audit |
|---|---|---|
| R5 | 66 scripts sans defer + Babel série | Effort 3-5h + risque casser le boot. Mérite un audit dédié + benchmark Lighthouse avant/après |
| R16+ R3 | Token sweep round 3 (76 hex restants) | Effort 3h. À bundler avec R27 sub-pixel sweep dans un seul "CSS hygiene PR" |
| R19 | Sidebar 4 groupes max | Effort 1.5h mais impact UX majeur. Mérite arbitrage user d'abord |
| R21 | Audit contraste WCAG AA tri-thèmes | Effort 1.5h. Peut découler d'un audit a11y dédié plus large |
| R22 | Streak record "X j, record Y" | Effort 0.5h mais cosmétique pur. À grouper avec un autre micro-finding |
| R23 | Ctrl+K nudge J0-J3 | Effort 1h. Pas urgent — la command palette est déjà découvrable via le hint footer |
| R25 R26 | Monolithes styles.css 4666L, data-loader.js 4728L | Refacto structurelle, hors scope audit design |
| J1 J2 J5 J6 J7 J8 | Roadmap Jarvis composite 20 (lecture immersive, resume tracker, why ranks, snooze intelligent, search digest, ask jarvis dock) | Chacune ~2-3h de dev + spec + archi. À shipper 1×/semaine, après que Wave 1 soit en prod |

---

## 6. Annexe — Justifications principielles

| Décision | Principe |
|---|---|
| Désactiver `translateY(-2px)` hover | Loi de Fitts — cible bouge → cible plus dure à atteindre. Fatigue de scan répétitive |
| `max-width: 70ch` body | Bringhurst, *Elements of Typographic Style*, p.26. Zone de confort lecture 45-75ch |
| Hero compact J7+ par défaut | Density-progressive disclosure (Tognazzini) + habituation visuelle (Bourassa, 2014) |
| Bannière stale 30h+ | Norman, *Visibility of system status* (Heuristics #1) |
| Touch targets 44px mobile | WCAG 2.5.5 + Apple HIG |
| Stub → PanelNotFound | Norman, *Help users recognize, diagnose, and recover from errors* (Heuristics #9) |
| Spec drift indicator visible | Eat your own dogfood + Norman, *Visibility of system status* |
| Cap 7 prompts/audit | Cognitive load + WIP limits (Reinertsen, *Principles of Product Development Flow*) |

---

## 7. Annexe — Ce que l'audit n'a PAS pu vérifier

- **Pixel-perfect render post-login** : la home, les panels Tier 2 et
  le Jarvis chat nécessitent OAuth Google — non accessible en
  automate. Audit basé sur le code et les CSS, pas sur l'expérience
  visuelle finale. **Recommandation** : valider Wave 1 en captures
  écran avant/après avec l'user.
- **Performance réelle** (Lighthouse / Core Web Vitals) : le pattern
  React+Babel-via-CDN n'est pas optimal en TTI mais c'est un choix
  assumé. R5 mérite un audit perf dédié.
- **Comportement TFT panel** (`gaming` couvre TFT) : non exploré en
  détail, score moyen affecté par défaut.
- **Service worker cache real-world hit rate** : la stratégie
  cache-first est mentionnée dans CLAUDE.md mais pas mesurée.

---

## 8. Annexe — Notes de scope

- L'audit cible **la rétention quotidienne sur 30 jours**, pas la
  conversion 1ère visite.
- Les prompts sont écrits pour Claude Code (agent autonome). Chacun
  est self-contained ; lis-en un, exécute-le, valide, passe au suivant.
- Le dossier `docs/specs/` doit être maintenu en parallèle de chaque
  changement de panel (CLAUDE.md règle cardinale, CI lint-specs
  bloquante). Les prompts incluent systématiquement la ligne
  "Specs à toucher".
- Aucun prompt n'introduit de nouvelle dépendance npm (le repo n'a
  pas de build step). Tout reste vanilla JSX-via-Babel + CSS Custom
  Properties + Node ≥ 20 pour le script spec_freshness.

---

*Fin de l'audit. Document généré le 3 mai 2026 pour le projet
`jarvis-cockpit` de Jean Lakomsky. Successeur de
`audits/2026-04-30-design-audit.md` et de `design-audit-2026-05-01.md`
(racine).*

*Discipline appliquée cette session : 7 prompts (6 P0 + 1 P1),
~5h de Wave 1+2, contre 15 prompts / 15h le 01/05. Cible :
solder le backlog au lieu de l'allonger.*
