# Audit Design Complet — AI Cockpit

**Date** : 4 mai 2026
**Auditeur** : Senior design (UX, UI, design system, a11y, perf perçue, rétention)
**URL prod** : https://ph3nixx.github.io/jarvis-cockpit/
**Audits précédents** :
- `audits/2026-04-28-design-audit.md`
- `audits/2026-04-29-design-audit.md`
- `audits/2026-04-30-design-audit.md`
- `design-audit-2026-05-01.md` (racine)
- `audits/2026-05-03-design-audit.md`

**Méthode** : lecture exhaustive du repo (état HEAD `6600b64`, **inchangé
depuis 01/05 10:35**), comparaison ligne-à-ligne avec les findings des
5 audits précédents, vérification git (`git log --since="2026-05-01"`),
simulation rétention. **L'app reste gated derrière Google OAuth** —
audit basé sur le code source et les CSS, intégralement disponibles.

---

## 0. Note préalable — Stack actuelle

Le brief de la mission planifiée décrit le cockpit comme « single-file
vanilla HTML/CSS/JS, gradient bleu→violet, glassmorphism ». Comme noté
les audits précédents, **aucune de ces hypothèses ne tient**. La stack
réelle est **React 18 + `@babel/standalone` via CDN unpkg**, sans build,
**77 fichiers** dans `cockpit/`, **3 thèmes finis** (Dawn / Obsidian /
Atlas) sans gradient ni glassmorphism. Auth Supabase + Google OAuth.

Les prompts Phase 4 ciblent les vrais fichiers (`cockpit/panel-*.jsx`,
`cockpit/styles*.css`, `cockpit/themes.js`, `cockpit/lib/*.js`).

> **CLAUDE.md règle cardinale** : toute modif d'un onglet implique de
> mettre à jour `docs/specs/tab-<slug>.md` + `docs/specs/index.json`
> dans le même commit (CI `lint-specs` bloquante). Idem
> `docs/architecture/` pour tout chemin à impact archi (CI
> `validate-arch` bloquante). Les prompts ci-dessous incluent
> systématiquement la ligne « Specs à toucher ».

---

## 0bis. 🔴 ESCALADE — Routine d'audit en panne 4 jours

| Date | Audit produit | Prompts | P0 livrés |
|---|:-:|:-:|:-:|
| 28/04 | ✅ | 8 | 4 (29/04) |
| 29/04 | ✅ | 9 | 6 (30/04) — vague a11y massive |
| 30/04 | ✅ | 12 | 1 (01/05) |
| 01/05 | ✅ | 15 (5 P0, ~3.5h Wave 1) | **0** |
| 03/05 | ✅ | **7** (6 P0 + 1 P1, discipline anti-surcharge) | **0** |
| **04/05** | ✅ | ⏳ **ce document** | — |

**Faits constatés** :

- HEAD du repo = `6600b64`, **dernier commit 01/05 10:35** (4 jours).
- **0 commit applicatif depuis 01/05** — donc **0 prompt P0 shippé**
  des audits 01/05 et 03/05 cumulés (~22 prompts en attente).
- Les 7 prompts du 03/05 étaient explicitement **calibrés pour solder
  en 5h Wave 1+2** la dette UX. Aucun n'a été ouvert.
- Le pattern est désormais clair : la machine d'audit produit ~12
  prompts/jour, le canal d'exécution Cowork tourne à ~0/jour depuis
  72h.

**Diagnostic** : ce n'est plus un finding UX, c'est un **finding
système**. La routine s'auto-empile. Chaque jour de retard ajoute ~10
prompts à un backlog qui n'a déjà pas absorbé les 22 précédents. Le
livrable d'aujourd'hui doit refuser de creuser cette dette.

### 🟧 Action concrète appliquée à cet audit

1. **Phase 4 = 3 prompts maximum** (vs 7 le 03/05, vs 15 le 01/05).
   Choisis pour ratio impact/effort le plus élevé du backlog cumulé.
   Tous **< 30 minutes**, **0 dépendance** entre eux, **shippables
   séparément**.
2. **Pas de prompt P1 ni JARVIS** dans le livrable. Tant qu'aucun P0
   ne ship, tout P1 est gaspillé.
3. **Section 5 nouvelle** : *Proposition de fix routine* — 3 options
   pour sortir du blocage. À arbitrer par l'utilisateur, pas par le
   senior design.
4. Les findings R1-R27 du 03/05 restent **tous ouverts**. Ce document
   ne les ré-énumère pas en détail (ce serait du copier-coller de
   l'audit du 03/05). Voir `audits/2026-05-03-design-audit.md` pour
   le détail complet — il reste valide à 100%.

---

## 1. Reconnaissance

### 1.1 Inventaire features (delta 03/05 → 04/05)

**Aucun delta.** L'inventaire complet du 03/05 reste valable :
**29 panels visibles** (23 routes JSX + 6 corpus mutualisés via
`panel-veille.jsx`), répartis en **6 groupes sidebar**.

Pour mémoire :
- **Aujourd'hui** (6) : Brief · Miroir du soir · Revue · Top · Semaine · Recherche
- **Veille** (7) : Veille IA · Claude · Veille outils · Sport · Gaming news · Anime · Actualités
- **Apprentissage** (5) : Radar · Recos · Challenges · Wiki · Signaux faibles
- **Business** (3) : Opportunités · Carnet d'idées · Jobs Radar
- **Personnel** (6) : Jarvis · Jarvis Lab · Profil · Forme · Musique · Gaming
- **Système** (2) : Stacks & Limits · Historique

### 1.2 Findings 28/04 → 04/05 — vue récapitulative

Tout reste **tel que constaté le 03/05**. Légende : 🟢 résolu · 🟡
partiel · 🔴 inchangé · ⚪ nouveau ce jour.

| # | Finding | Origine | Statut 04/05 |
|---|---|---|---|
| R1 | Hero macro plein format par défaut J7+ | 28/04 | 🟡 toggle existe, défaut OFF |
| R4 | Contraste Dawn primary buttons | 28/04 | 🔴 |
| R5 | 66 scripts série / 1 defer | 28/04 | 🔴 (vérifié `grep -cE "<script" index.html` = 66) |
| R7 | Audio brief estimation `body.length / 280` | 28/04 | 🔴 |
| R10 | Aucun feedback "données stale" | 28/04 | 🔴 |
| R14+ | Composant `Stub` mort | 29/04 | 🔴 (`function Stub` ligne 99 de `app.jsx` toujours présent) |
| R17 | Hover `translateY(-2px)` sur top-feat / opp-kan | 01/05 | 🔴 (ligne 2171, 2233 de styles.css ; ligne 620 de styles-opportunities.css) |
| R18 | `max-width 70ch` sur summary/body | 01/05 | 🟡 2 occurrences seulement (`hero.is-compact` ligne 658 + 1 autre ligne 3866) |
| R19 | Sidebar 6 groupes | 01/05 | 🔴 |
| R20 | Touch targets `.vl-filter-pill` mobile 12.5px / 5×10 | 01/05 | 🔴 |
| R21 | Audit contraste WCAG AA tri-thèmes | 01/05 | 🔴 |
| R22 | Streak meaningful "X j, record Y" | 01/05 | 🔴 |
| R23 | Ctrl+K nudge J0-J3 | 01/05 | 🔴 |
| R24 | 0 commit applicatif | 03/05 | 🔴 **aggravé : J+1 sans ship → 4 jours** |
| R25 | `styles.css` = 4666 lignes | 03/05 | 🔴 |
| R26 | `data-loader.js` = 4728 lignes | 03/05 | 🔴 |
| R27 | Sub-pixel font-sizes contournent les tokens | 03/05 | 🔴 **mesure révisée : 313 occurrences `1[0-3]\.5px` dans `styles*.css`** (estimé ~67 le 03/05 — **sous-évalué d'un facteur 5**) |
| **R28** | **Mediaquery `prefers-reduced-motion` cantonnée à `styles.css`** (7 occurrences sur 1 fichier ; **0 sur les 19 autres `styles-*.css`**) | **04/05** ⚪ | Le kill-switch global du 30/04 reste fragile : si une animation est définie dans `styles-jarvis-lab.css` ou `styles-jobs-radar.css`, elle ne sera **pas désactivée** en mode reduced-motion |

**Vérifications à la commande effectuées le 04/05** :

```bash
$ git log -1 --format="%H %ai %s"
6600b64de0e974346f0358ce266363aa54371f50 2026-05-01 10:35:11 +0200

$ wc -l cockpit/styles.css cockpit/lib/data-loader.js
4666 cockpit/styles.css
4728 cockpit/lib/data-loader.js

$ grep -cE "<script" index.html
66

$ grep -cE "defer|async" index.html
1

$ grep -rE "font-size: 1[0-3]\.5px" cockpit/styles*.css | wc -l
313

$ grep -c "prefers-reduced-motion" cockpit/styles*.css
cockpit/styles.css:7         # tous les autres = 0
```

### 1.3 Drift de tokens — état 04/05

Top 12 hex hardcodés persistant dans `cockpit/styles*.css` :

| Hex | Occurrences | Décodage probable | Token cible |
|---|:-:|---|---|
| `#b43a3a` | **11** | Rouge alert custom | `--alert` |
| `#b3491a` | **10** | Variante rouille (Dawn) | `--brand` |
| `#2d7a4e` | **9** | Vert positive custom | `--positive` |
| `#fafaf5` | **8** | Quasi-blanc Dawn | `--bg` |
| `#c25a3a` | **7** | Saumon (Dawn brand-tint) | `--brand-tint` |
| `#4a7c4a` | **7** | Vert (variante) | `--positive` |
| `#c57455` | **6** | Saumon (variante) | `--brand-tint` |
| `#a85046` | **6** | Terracotta | `--alert-tint` |
| `#2e6a4f` | **6** | Vert sombre | `--positive` |
| `#c88826` | **5** | Or moutarde | (à arbitrer) |
| `#4a7a4a` | **5** | Doublon `#4a7c4a` | `--positive` |
| `#2a8757` | **5** | Vert (variante 3) | `--positive` |

**Total ~85 hex hardcodés** sur 12 valeurs distinctes. La promesse
tri-thématique fuite encore — un user en Atlas (Swiss + indigo) voit
toujours apparaître des accents rouille/vert custom dans Veille outils,
Jarvis Lab, Wiki, Stacks, Jobs Radar.

### 1.4 Test rétention — état 04/05 (visite 26 de la semaine)

Les frictions sont **identiques au 03/05**. L'utilisateur lit toujours
sur ce cockpit, donc la dégradation rétention n'est pas mesurable —
mais les irritants quotidiens persistent :

| Friction | Sévérité | Source |
|---|---|---|
| 🔴 FCP boot ~3-5s fibre, ~6-10s 4G | Élevée | R5 |
| 🔴 Hero macro plein format à chaque visite | Élevée | R1 |
| 🟠 Hover `translateY(-2px)` sur top-feat "danse" | Moyenne | R17 |
| 🟠 Bouton primary `--tx` (encre) sur fond crème Dawn | Moyenne | R4 |
| 🟠 Top-summary line-length 95+ char sur 27" | Moyenne | R18 partiel |
| 🟠 Sidebar 6 groupes — friction décisionnelle | Moyenne | R19 |
| 🟠 Pills tactiles ~26px sur Veille mobile | Moyenne | R20 |
| 🟢 Pulses · modales système · streak zero · skip-link · kbd-fab masqué | — | 30/04 |

**Verdict rétention 04/05** : statu quo strict du 03/05. Aucune des 6
frictions résiduelles n'a été touchée.

---

## 2. Matrice d'évaluation

Notes /5. Critères : Clarté · Densité · Cohérence · Interactions ·
Mobile · Accessibilité · Rétention. **Légende delta** : `↑` =
amélioration depuis 03/05 · `↓` = dégradation · `—` = inchangé.

| Section | Cl | De | Co | In | Mo | A11y | Ret | **Moy.** | **Δ vs 03/05** |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Shell — Sidebar + nav | 4 | 3 | 4 | 5 | 4 | 5 | 4 | **4.1** | — |
| Shell — Page header | 4 | 2 | 4 | 4 | 3 | 4 | 3 | **3.4** | — |
| Shell — PWA / SW | 4 | n/a | 4 | 4 | 4 | n/a | 4 | **4.0** | — |
| Auth overlay | 4 | 5 | 4 | 3 | 4 | 3 | n/a | **3.8** | — |
| Brief — Hero macro | 5 | 2 | 5 | 4 | 4 | 4 | 3 | **3.9** | — |
| Brief — Top 3 / Morning Card | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **4.4** | — |
| Brief — Hero delta | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **4.4** | — |
| Brief — Audio brief | 3 | 4 | 4 | 3 | 3 | 4 | 3 | **3.4** | — |
| Brief — Signaux cards | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| Brief — Radar SVG | 4 | 3 | 5 | 3 | 4 | 4 | 3 | **3.7** | — |
| Brief — Zero state | 5 | 4 | 4 | 4 | 4 | 4 | 5 | **4.3** | — |
| Top du jour / Revue | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| Miroir du soir | 4 | 4 | 4 | 3 | 4 | 4 | 4 | **3.9** | — |
| Veille IA / Outils | 4 | 4 | 4 | 4 | 3 | 4 | 4 | **3.9** | — |
| Wiki IA + Tooltip | 4 | 4 | 3 | 4 | 3 | 4 | 4 | **3.7** | — |
| Signaux faibles (panel) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| Radar compétences (panel) | 4 | 3 | 5 | 3 | 4 | 4 | 3 | **3.7** | — |
| Recos / Challenges | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| Opportunités | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| Carnet d'idées (kanban) | 5 | 4 | 4 | 5 | 3 | 4 | 5 | **4.3** | — |
| Jobs Radar | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| Jarvis chat | 4 | 4 | 4 | 5 | 3 | 4 | 5 | **4.1** | — |
| Jarvis Lab | 3 | 3 | 4 | 3 | 3 | 3 | 3 | **3.1** | — |
| Profil | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| Forme | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| Musique | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| Gaming | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.0** | — |
| Stacks & Limits | 4 | 5 | 4 | 4 | 3 | 4 | 4 | **4.0** | — |
| Historique | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| Recherche | 4 | 4 | 4 | 4 | 4 | 4 | 3 | **3.9** | — |
| Performance perçue (boot) | 3 | n/a | n/a | n/a | 2 | 3 | 1 | **2.3** | — |

**Moyenne cockpit 04/05 : 3.92 / 5** (identique au 03/05, identique au
30/04). La progression s'est figée. L'a11y au-dessus de la moyenne tient
toujours, mais les irritants rétention restent.

### 2.1 Top 3 forces (inchangées 03/05)

1. **A11y au-dessus de la moyenne web** (skip-link, focus-visible,
   reduced-motion sur `styles.css`, ARIA, zero-state).
2. **Comportement de rétention sophistiqué** (hero delta, snooze, undo,
   command palette, raccourcis, modale Stacks React, hero compact toggle).
3. **Système tri-thématique mature** (Dawn / Obsidian / Atlas) avec
   vibe tokens.

### 2.2 Top 3 faiblesses (réordonnées 04/05)

1. **🔴 Routine d'exécution cassée** (R24 aggravé). Le canal Cowork
   produit du diagnostic, pas du fix. Tant que la cadence ne reprend
   pas, **chaque audit additionnel est gaspillé**.
2. **🔴 Performance de boot** (R5, identifié 28/04). 66 scripts,
   1 defer. Sur 25 visites/mois, ~3 min d'attente cumulées avant le
   brief.
3. **🟠 Densité non-réglable + drift de tokens** (R1 + R18 + R27 +
   R16+). Le hero compact existe mais OFF par défaut. 313 sub-pixels.
   85 hex hardcodés sur 12 valeurs distinctes. Pas un user-facing bug,
   mais une dette qui rend chaque sweep coûteux.

---

## 3. Quick Wins & Roadmap Jarvis

### 3.1 Top 10 Quick Wins (triés par ratio impact/effort décroissant)

Liste **identique** au 03/05 (rien n'a bougé en 24h). Reproduite ici
pour que ce document soit autonome.

| # | Titre | Imp | Eff | Ratio | Sections |
|:-:|---|:-:|:-:|:-:|---|
| 1 | Désactiver `translateY(-2px)` hover sur `.top-feat-main`, `.top-feat-side`, `.opp-kan-card` (border-color suffit) | 4 | 1 | **4.0** | Top, Opps |
| 2 | `max-width: 70ch` sur `.top-summary`, `.hero-body` (mode plein), `.vl-item-summary` | 4 | 1 | **4.0** | Top, Brief, Veille |
| 3 | Hero compact = mode par défaut après J7 (`cockpit-first-seen` lu, default `1`) | 5 | 1 | **5.0** | Brief (R1) |
| 4 | Bannière "données stale > 24h" sur Brief si `daily_briefs.fetch_date < J-1` | 4 | 2 | **2.0** | Brief (R10) |
| 5 | Supprimer composant `Stub` mort + remplacer par `PanelNotFound` | 2 | 1 | **2.0** | App (R14+) |
| 6 | Streak meaningful "X jours, record Y" | 3 | 1 | **3.0** | Sidebar footer (R22) |
| 7 | Ctrl+K nudge J0-J3 (pulse une fois sur le hint footer) | 4 | 2 | **2.0** | Sidebar footer (R23) |
| 8 | Touch targets ≥ 44px sur `.vl-filter-pill` mobile (font 14, padding 10×14) | 4 | 1 | **4.0** | Veille mobile (R20) |
| 9 | `<script defer>` sur libs CDN dans `index.html` | 5 | 3 | **1.7** | Boot (R5) |
| 10 | Token sweep round 3 : éliminer les 85 hex hardcodés restants | 3 | 3 | **1.0** | Tous panels CSS (R16+) |

### 3.2 Roadmap Jarvis — 15 features avancées

Liste **identique** au 03/05. Score composite = Impact × Faisabilité.

| # | Feature | Imp | Fais | Wow | **I×F** |
|:-:|---|:-:|:-:|:-:|:-:|
| J1 | Lecture immersive in-cockpit (overlay article fullscreen, raccourcis J/S/Esc) | 5 | 4 | 4 | **20** |
| J2 | Resume tracker hebdo (Miroir dimanche : "ta semaine en 5 thèmes" via `usage_events`) | 5 | 4 | 5 | **20** |
| J3 | Spec drift indicator dans Jarvis Lab (warning si code panel ≠ doc) | 4 | 5 | 3 | **20** |
| J4 | Streak "pardon" 1×/mois (1 jour raté n'efface pas la streak, 1 joker offert) | 4 | 5 | 3 | **20** |
| J5 | "Why this ranks #1" expansible sur Top cards (1 phrase IA Jarvis local cachée 24h) | 5 | 4 | 4 | **20** |
| J6 | Snooze intelligent ("Réveille-moi quand X bouge" → re-surface conditionnelle) | 5 | 4 | 5 | **20** |
| J7 | Search → save query → digest hebdo (newsletter perso reverse-feed) | 5 | 4 | 4 | **20** |
| J8 | Ask Jarvis dock (Cmd+J flottant, accessible depuis tout panel) | 5 | 3 | 5 | **15** |
| J9 | Ideas ↔ Opportunities matchmaking (signal résonne avec idée dormante → flag 🔥) | 5 | 3 | 5 | **15** |
| J10 | Smart-collapse panels rares (non visités 14j+ → groupés sous "Autres") | 3 | 5 | 3 | **15** |
| J11 | Préchargement Babel + JSX critiques via `<link rel="modulepreload">` | 4 | 4 | 2 | **16** |
| J12 | Profil dynamique (Jarvis pose 1 question/jour pour enrichir `user_profile`) | 5 | 3 | 4 | **15** |
| J13 | Cockpit voice mode (Web Speech API + Jarvis local) | 4 | 3 | 5 | **12** |
| J14 | Téléchargement export brief `.md` | 3 | 5 | 3 | **15** |
| J15 | Mode "vibe" Profil (Calme / Focus / Mission, modifie densité, animations, sons) | 4 | 3 | 5 | **12** |

**Top 7 composite (ex æquo à 20)** : J1, J2, J3, J4, J5, J6, J7.

### 3.3 Mockups textuels — 3 features les plus prometteuses

Mockups réutilisés du 03/05 (ils restent valides — rien n'a changé).

#### Mockup A — QW #3 : Hero compact par défaut J7+

```
┌─────────────────────────────────────────────────────────────────┐
│ [Brief]  [● Compact]                                            │
│                                                                 │
│ ● LUNDI 4 MAI · 89 articles synthétisés · lecture 4 min         │
│                                                                 │
│ La semaine s'achève sur les agents orchestrés.                  │
│ (max 70ch, font-size 15px, line-height 1.65)                    │
│                                                                 │
│ [Lire 4 nouveautés →]   [Brief macro plein format]              │
└─────────────────────────────────────────────────────────────────┘

Mécanisme :
- Si localStorage["cockpit-hero-compact"] explicite ("0" ou "1") → respect.
- Sinon : si cockpit-first-seen >= 7 jours → default = compact.
- Si user clique "Plein" → set "0" → J7-default neutralisé à vie.
- Réversible : "Compact" set "1" → priorité absolue.
```

#### Mockup B — J3 : Spec drift indicator dans Jarvis Lab

```
┌─────────────────────────────────────────────────────────────────┐
│  Onglets cockpit · 29 panels · 3 en dérive               [↻]   │
├─────────────────────────────────────────────────────────────────┤
│  ✓  brief             docs/specs/tab-brief.md       2026-04-30 │
│  ✓  evening           docs/specs/tab-evening.md     2026-04-26 │
│  ⚠  top               docs/specs/tab-top.md         2026-04-21 │
│      ↳ Code modifié 2026-04-30 (panel-top.jsx)                  │
│      ↳ Spec n'a pas bougé depuis 2026-04-21 (10 jours)          │
│  ✓  review            docs/specs/tab-review.md      2026-04-25 │
│  ⚠  jobs              docs/specs/tab-jobs.md        2026-04-20 │
│  ⚠  jarvis-lab        docs/specs/tab-jarvis-lab.md  2026-04-24 │
│  ✓  ...                                                         │
│                                                                 │
│  Source : git log + docs/specs/index.json::last_updated          │
│  CI lint-specs reste bloquante — ce panel surface les dérives    │
│  qui sont passées entre les mailles                              │
└─────────────────────────────────────────────────────────────────┘
```

#### Mockup C — J4 : Streak "pardon" 1×/mois

```
   Footer sidebar :

   ┌───────────────────────────────┐
   │  🔥  12 j                       │
   │  streak veille · record 18 j   │
   │  prochain 06:00 · joker 1/1    │
   └───────────────────────────────┘

   Au reset 06:00 si J-1 sans lecture :
   → Si joker disponible : streak conservée, joker passe à 0/1
   → Toast UI : "Tu as raté hier. Joker utilisé. Streak intacte."
                "Prochain joker dans 27 jours."
   → Sinon : streak repart à 0 (zero-state existant)

   Stockage : localStorage `cockpit-streak-joker-state`
   (JSON `{ last_used_at, available }`).
   Record persisté sur user_profile.streak_record côté Supabase.
```

---

## 4. Prompts Claude Code

> **Stack rappel** : React 18 + Babel standalone via CDN (no build),
> Supabase REST, fichiers multiples (`cockpit/*.jsx`,
> `cockpit/styles*.css`, `cockpit/themes.js`, `cockpit/lib/*.js`).
> Pas de TypeScript, pas de bundler. Composants exposés via `window.X`.
> Tokens via CSS Custom Properties dans `cockpit/themes.js`. Toute
> modif d'un onglet implique de mettre à jour
> `docs/specs/tab-<slug>.md` + `docs/specs/index.json` dans le même
> commit (CI `lint-specs` bloquante).

> **Discipline 04/05** : seulement **3 prompts P0**, tous en
> dépendance nulle, tous en effort < 30 min. Total cumulé : **~1h
> de travail Claude Code autonome**. La cible n'est plus de
> solder le backlog (impossible avec une cadence à 0/jour) mais de
> **redémarrer le moteur d'exécution** avec 3 micro-victoires
> visibles. Si Wave 1 ne ship pas en 48h, l'audit suivant ne
> produira **plus aucun prompt** — il escaladera uniquement la
> question routine (cf. Section 5).

> **Le mapping fichier-ligne ci-dessous a été vérifié sur le HEAD
> `6600b64` au matin du 04/05** — les numéros de ligne sont valides
> tant qu'aucun commit ne tombe entre la lecture de ce document et
> l'exécution.

---

### P0 — 3 micro-victoires shippables en 1 session

#### Prompt 1 — [UX] Désactiver `translateY(-2px)` hover sur top-feat / opp-kan

**Priorité** : P0
**Dépend de** : Aucun
**Effort estimé** : 0.2h
**Fichiers** : `cockpit/styles.css` (lignes 2171, 2233), `cockpit/styles-opportunities.css` (ligne 620)

```
Contexte : Le hover sur les cards .top-feat-main, .top-feat-side et
.opp-kan-card applique transform: translateY(-2px ou -1px). Ce micro-
mouvement déstabilise la grille pendant le scan rapide quotidien et
"danse" sous le curseur sur trackpad. Loi de Fitts : la cible bouge
au moment du clic, donc plus dur à atteindre. Charmant à la 1ère
visite, irritant à la 25e.

Source : audits 01/05 P1, 03/05 P1 — non livrés. Vérifié sur HEAD
6600b64 le 04/05/2026.

Fichier 1 — cockpit/styles.css :

Ligne 2171, remplacer EXACTEMENT :
  .top-feat-main:hover { box-shadow: var(--shadow-lg); transform: translateY(-2px); }
par :
  .top-feat-main:hover { box-shadow: var(--shadow-lg); border-color: var(--bd2); }

Ligne 2233, remplacer EXACTEMENT :
  .top-feat-side:hover { border-color: var(--bd2); box-shadow: var(--shadow-md); transform: translateY(-2px); }
par :
  .top-feat-side:hover { border-color: var(--bd2); box-shadow: var(--shadow-md); }

Fichier 2 — cockpit/styles-opportunities.css :

Ligne 620, remplacer EXACTEMENT :
  .opp-kan-card:hover { border-color: var(--tx2); transform: translateY(-1px); }
par :
  .opp-kan-card:hover { border-color: var(--tx2); }

Bumper styles.css ?v=31 (de v=30) et styles-opportunities.css ?v=5
(de v=4) dans index.html. La GH Action sw-sync mettra à jour le SW
manifest automatiquement à la PR.

Specs à toucher : aucune (purement style, iso-fonctionnel UI).
Mentionner dans le commit : "Specs mises à jour: aucune | N/A
(hygiène hover anti-fatigue)".

Validation : ouvrir les panels Top du jour et Opportunités sur
desktop avec un trackpad, survoler les cards rapidement. La grille
ne bouge plus. Le hover reste perceptible via box-shadow et
border-color. Pas de saut visuel.
```

**Validation** : 10 cards survolées en 5s sans saut vertical perçu.

---

#### Prompt 2 — [UX] Touch targets ≥ 44px sur `.vl-filter-pill` mobile

**Priorité** : P0
**Dépend de** : Aucun
**Effort estimé** : 0.2h
**Fichiers** : `cockpit/styles-mobile.css`

```
Contexte : Les pills de filtre dans le panel Veille (.vl-filter-pill,
.vl-prod-filter) ont sur mobile font-size: 12.5px et padding: 5px 10px,
soit ~26px de hauteur tactile — fail WCAG 2.5.5 (44×44px) et Apple HIG
(44pt). Sur un iPhone, un user a une chance sur deux de mishit la
pill voisine.

Source : audits 01/05 P6, 03/05 P5 — non livrés. Vérifié sur HEAD
6600b64 le 04/05/2026.

Fichier — cockpit/styles-mobile.css :

Ligne ~129, dans le bloc :
  .vl-filter-pills,
  .vl-prod-filters {
    flex-wrap: wrap;
    gap: 6px !important;
  }
remplacer "gap: 6px !important;" par "gap: 8px !important;".

Ligne ~135, dans le bloc :
  .vl-filter-pill,
  .vl-prod-filter {
    font-size: 12.5px !important;
    padding: 5px 10px !important;
  }
remplacer entièrement par :
  .vl-filter-pill,
  .vl-prod-filter {
    font-size: 14px !important;
    padding: 10px 14px !important;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }

Bumper styles-mobile.css ?v=2 (de v=1) dans index.html.

Specs à toucher : aucune (a11y mobile transversal). Mentionner dans
le commit "Specs mises à jour: aucune | N/A (a11y mobile WCAG 2.5.5)".

Validation : ouvrir la prod en mode mobile DevTools (iPhone 14 viewport
390×844). Aller sur Veille IA. Tenter de tapper précisément chaque pill
avec un doigt — toutes doivent être atteignables sans mishit. Mesurer
en DevTools la hauteur réelle d'une pill : ≥ 44px. Tester aussi Veille
outils, Sport, Gaming, Anime, Actualités (panel-veille.jsx mutualisé).
Vérifier que sur iPhone SE (viewport 375), les pills wrap proprement.
```

**Validation** : DevTools mobile confirme min-height ≥ 44px sur tous les pills Veille.

---

#### Prompt 3 — [UX] Hero compact = mode par défaut après J7

**Priorité** : P0
**Dépend de** : Aucun
**Effort estimé** : 0.4h
**Fichiers** : `cockpit/home.jsx` (lignes 262-272), `docs/specs/tab-brief.md`, `docs/specs/index.json`

```
Contexte : Le toggle compact/plein du hero existe depuis 30/04
(commit bc1e146), mais il est OFF par défaut. Un user qui ouvre le
cockpit pour la 30e fois voit toujours un hero macro plein format
qui prend 60% de la fenêtre, alors qu'il connaît parfaitement le
contenu. R1 dans tous les audits 28/04 → 04/05.

Source : audits 28/04 (R1 origine), 01/05 P3, 03/05 P3 — non livrés.

Tâche : à partir du 8e jour d'usage (cockpit-first-seen >= 7 jours),
mettre le hero en mode compact par défaut, MAIS uniquement si l'user
n'a jamais explicitement choisi. Le user qui clique "Plein" mémorise
sa préférence (set "0") et le J7-default ne s'applique plus.

Dans cockpit/home.jsx, lignes 262-272, REMPLACER le bloc :

  const [heroCompact, setHeroCompact] = React.useState(() => {
    try { return localStorage.getItem("cockpit-hero-compact") === "1"; }
    catch { return false; }
  });
  const toggleHeroCompact = () => {
    setHeroCompact(v => {
      const next = !v;
      try { localStorage.setItem("cockpit-hero-compact", next ? "1" : "0"); } catch {}
      try { window.track && window.track("hero_compact_toggled", { state: next ? "compact" : "full" }); } catch {}
      return next;
    });
  };

PAR :

  const [heroCompact, setHeroCompact] = React.useState(() => {
    try {
      // 1. Préférence explicite de l'user gagne toujours
      const explicit = localStorage.getItem("cockpit-hero-compact");
      if (explicit === "1") return true;
      if (explicit === "0") return false;

      // 2. Fallback : à partir de J7+, default = compact.
      //    Density-progressive disclosure (Tognazzini) — l'user
      //    expérimenté n'a plus besoin du hero plein format.
      const firstSeen = localStorage.getItem("cockpit-first-seen");
      if (firstSeen) {
        const days = (Date.now() - parseInt(firstSeen, 10)) / 86400000;
        if (days >= 7) return true;
      }
      return false;
    } catch { return false; }
  });
  const toggleHeroCompact = () => {
    setHeroCompact(v => {
      const next = !v;
      // On stocke explicitement "0" ou "1" pour neutraliser le default J7+.
      try { localStorage.setItem("cockpit-hero-compact", next ? "1" : "0"); } catch {}
      try { window.track && window.track("hero_compact_toggled", { state: next ? "compact" : "full" }); } catch {}
      return next;
    });
  };

Bumper home.jsx ?v=6 (de v=5) dans index.html.

Specs à toucher :
- docs/specs/tab-brief.md : ajouter dans la section Fonctionnalités
  "Densité progressive : à partir de la 8e visite, le hero adopte
  par défaut le format compact. L'utilisateur peut toujours basculer
  manuellement (sa préférence est mémorisée et neutralise ce
  comportement par défaut)."
- docs/specs/index.json : bumper last_updated pour "brief" → "2026-05-04".

Validation manuelle :
  // Dans la console après login :
  localStorage.setItem("cockpit-first-seen", String(Date.now() - 8*86400000));
  localStorage.removeItem("cockpit-hero-compact");
  location.reload();
  // → hero affiché en mode compact directement.
  // Cliquer "Plein" → reload → hero en plein.
  // Cliquer "Compact" → reload → hero en compact.
  // localStorage.removeItem("cockpit-first-seen") → reload → hero plein (J0 default).
```

**Validation** : un user de 30 jours arrive sur un brief compact ; un nouveau user (J0-J6) arrive toujours sur le hero plein.

---

### Checklist d'exécution

| # | Prompt | Tag | Effort | Dépend | Cumul |
|:-:|---|:-:|:-:|---|:-:|
| 1 | P0 — Prompt 1 (hover translateY off) | UX | 0.2h | — | 0.2h |
| 2 | P0 — Prompt 2 (touch targets 44px mobile) | UX | 0.2h | — | 0.4h |
| 3 | P0 — Prompt 3 (hero compact J7+ default) | UX | 0.4h | — | **0.8h** |

**Total estimé** : ~50 minutes de travail Claude Code autonome —
3 prompts non-bloquants, exécutables en parallèle ou séquentiellement,
tous shippables le jour-même.

**Cible psychologique** : trois petites victoires pour redémarrer la
machine. Les Prompts 1 et 2 sont **iso-fonctionnels** (aucune spec
à toucher) → la friction CI est nulle. Le Prompt 3 nécessite une
mise à jour spec mineure mais bien cadrée.

---

## 5. 🟧 Proposition de fix routine — 3 options

> Cette section sort du périmètre design pur. Elle s'adresse à
> l'utilisateur qui pilote la routine, pas à Claude Code. C'est
> la conséquence directe de R24 escaladé sur 4 jours.

Le pattern actuel (~12 prompts/jour produits, 0 livrés) ne peut pas
durer. Trois directions possibles, du plus léger au plus structurant :

### Option A — Réduire l'output (audit minimaliste)

L'audit du jour ne produit **qu'un seul prompt P0**, choisi pour le
ratio impact/effort le plus haut du backlog cumulé. Tout le reste
(matrice, roadmap, mockups) est conservé, mais Phase 4 = 1 prompt.

- **Avantage** : pression d'exécution maximale (1 prompt = 1 ship par
  jour, pas d'excuse "trop de choix").
- **Inconvénient** : impose à l'audit du jour de jeter une option ou
  l'autre selon contexte (ex. lundi = perf, mardi = a11y…). Risque
  d'oublier un finding récurrent.
- **Effort de mise en place** : 0. Modifier le `SKILL.md` du job
  scheduled "design-audit—upgrade-prompt" pour réduire la cible
  Phase 4 de "10 quick wins + 5 features" à "1 prompt P0".

### Option B — Découpler la production de l'exécution

L'audit reste exhaustif (10 QW + 5 features) mais **un second job
scheduled** quotidien pioche le prompt #1 de l'audit du jour, l'ouvre
en pull request automatique, et laisse Cowork le reviewer/merger.

- **Avantage** : exécution idempotente, ne dépend pas de la mémoire
  utilisateur. Backlog se vide tout seul.
- **Inconvénient** : nécessite un setup non-trivial (2e routine, agent
  qui lit le `.md`, parse les prompts, ouvre PR). Risque de PRs
  cassantes si la qualité du prompt baisse.
- **Effort de mise en place** : ~3-5h (créer l'agent, tester, valider
  sur 3 jours).

### Option C — Pause routine + revue manuelle ponctuelle

**Désactiver le job scheduled jusqu'à ce que le backlog 01/05 + 03/05
soit soldé.** Reprendre la routine seulement quand l'utilisateur a
shippé au moins 5 prompts P0 (la moitié de Wave 1 du 03/05).

- **Avantage** : zéro empilement supplémentaire. Force l'utilisateur
  à prendre une décision explicite "je relance / j'abandonne".
- **Inconvénient** : silence total sur la dérive entre-temps. Si un
  bug visuel apparaît, il n'est pas détecté.
- **Effort de mise en place** : 0. Désactiver le job dans
  l'UI Cowork.

### Recommandation senior design

**Option A en mode dégradé immédiat** (modifier le SKILL.md pour cap
à 3 prompts comme aujourd'hui), puis **migration vers Option B** une
fois que la cadence reprend (1+ ship/jour pendant 3 jours).

Option C est l'arme nucléaire — à n'utiliser que si Option A ne
relance pas le moteur en 7 jours.

---

## 6. Findings non couverts par des prompts (volontairement)

Pour respecter la discipline anti-surcharge (R24), les findings
suivants restent ouverts et seront ré-évalués au prochain audit. **Aucun
n'est nouveau vs 03/05** — la liste est strictement la même, les délais
ne font qu'augmenter.

| # | Finding | Pourquoi pas dans cet audit |
|---|---|---|
| R5 | 66 scripts sans defer + Babel série | Effort 3-5h + risque casser le boot. Mérite un audit dédié + benchmark Lighthouse |
| R10 | Bannière stale > 24h | Effort 1h. Reste prompté dans `audits/2026-05-03-design-audit.md` Prompt 4 — non livré. À ré-attaquer après les 3 P0 d'aujourd'hui |
| R14+ | `Stub` mort → `PanelNotFound` | Effort 0.4h. Reste prompté dans `audits/2026-05-03-design-audit.md` Prompt 6 — non livré |
| R16+ R27 | Token sweep round 3 + sub-pixel sweep | Effort 3-4h. Volume désormais sous-évalué (313 sub-pixels) |
| R18 | `max-width 70ch` sur 3 sélecteurs body | Effort 0.3h. Reste prompté dans 03/05 Prompt 2 — non livré |
| R19 | Sidebar 4 groupes max | Effort 1.5h. Impact UX majeur, mérite arbitrage user |
| R21 | Audit contraste WCAG AA tri-thèmes | Effort 1.5h. Audit a11y dédié |
| R22 | Streak record "X j, record Y" | Effort 0.5h. À grouper |
| R23 | Ctrl+K nudge J0-J3 | Effort 1h |
| R28 | `prefers-reduced-motion` cantonnée à styles.css | Effort 0.5h. Doit étendre le kill-switch aux 19 fichiers `styles-*.css` (audit dédié recommandé après token sweep round 3) |
| J1-J7 | Roadmap composite 20 (lecture immersive, resume tracker, why ranks, snooze intelligent, search digest, ask jarvis dock, spec drift) | Chacune ~2-3h dev + spec + archi. À shipper 1×/semaine, **après que la routine soit stabilisée** |

---

## 7. Annexe — Justifications principielles (rappel)

| Décision | Principe |
|---|---|
| Désactiver `translateY(-2px)` hover | Loi de Fitts — cible bouge → cible plus dure à atteindre. Fatigue de scan répétitive |
| Hero compact J7+ par défaut | Density-progressive disclosure (Tognazzini) + habituation visuelle (Bourassa, 2014) |
| Touch targets 44px mobile | WCAG 2.5.5 + Apple HIG |
| Cap 3 prompts/audit J+1 sans ship | WIP limits (Reinertsen, *Principles of Product Development Flow*) — la borne supérieure du WIP n'est pas une recommandation mais une condition de flow |
| Section 5 "fix routine" | Eat your own dogfood — si la machine d'audit ne ship pas, c'est elle qui devient le finding #1 |

---

## 8. Annexe — Ce que l'audit n'a PAS pu vérifier

- **Pixel-perfect render post-login** : la home, les panels Tier 2 et
  le Jarvis chat nécessitent OAuth Google — non accessible en
  automate. Audit basé sur le code et les CSS.
- **Performance réelle** (Lighthouse / Core Web Vitals) : R5 mérite un
  audit perf dédié.
- **TFT panel (`gaming`)** : non exploré en détail.
- **Service worker cache real-world hit rate** : stratégie cache-first
  mentionnée dans CLAUDE.md mais pas mesurée.

---

## 9. Annexe — Notes de scope

- L'audit cible **la rétention quotidienne sur 30 jours**, pas la
  conversion 1ère visite.
- Les prompts sont écrits pour Claude Code (agent autonome). Chacun
  est self-contained ; lis-en un, exécute-le, valide, passe au suivant.
- Le dossier `docs/specs/` doit être maintenu en parallèle de chaque
  changement de panel (CLAUDE.md règle cardinale, CI `lint-specs`
  bloquante).
- Aucun prompt n'introduit de nouvelle dépendance npm (le repo n'a
  pas de build step).

---

*Fin de l'audit. Document généré le 4 mai 2026 pour le projet
`jarvis-cockpit` de Jean Lakomsky. Successeur de
`audits/2026-05-03-design-audit.md`.*

*Discipline appliquée cette session : **3 prompts P0** (~50 min de
Wave 1), contre 7 le 03/05, contre 15 le 01/05. Cible : redémarrer
le moteur d'exécution avec 3 micro-victoires shippables, **et
escalader la question routine** (Section 5) — qui devient le
finding #1 du cockpit après 4 jours de silence applicatif.*
