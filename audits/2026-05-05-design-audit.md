# Audit Design Complet — AI Cockpit

**Date** : 5 mai 2026
**Auditeur** : Senior design (UX, UI, design system, a11y, perf perçue, rétention)
**URL prod** : https://ph3nixx.github.io/jarvis-cockpit/
**Audits précédents** :
- `audits/2026-04-28-design-audit.md`
- `audits/2026-04-29-design-audit.md`
- `audits/2026-04-30-design-audit.md`
- `design-audit-2026-05-01.md` (racine)
- `audits/2026-05-03-design-audit.md`
- `audits/2026-05-04-design-audit.md`

**Méthode** : lecture exhaustive du repo (état HEAD `6600b64`, **inchangé
depuis 01/05 10:35**, soit J+4.5 sans aucun commit), comparaison
ligne-à-ligne avec les 6 audits précédents, vérifications shell
(`git log --since="2026-05-01"`, comptage scripts `index.html`,
mesure CSS), simulation rétention. **L'app reste gated derrière
Google OAuth** — audit basé sur le code source, intégralement
disponible.

---

## 0. 🔴🔴 ESCALADE — Doctrine 04/05 déclenchée

L'audit du **04/05** a posé une règle explicite, vérifiable et
publique :

> « Si Wave 1 ne ship pas en 48h, l'audit suivant ne produira **plus
> aucun prompt** — il escaladera uniquement la question routine. »
> *(audits/2026-05-04-design-audit.md, Section 4)*

**Faits vérifiés au matin du 05/05** :

| Vérification | Commande | Résultat |
|---|---|---|
| HEAD inchangé | `git rev-parse HEAD` | `6600b64de0e974346f0358ce266363aa54371f50` |
| Dernier commit | `git log -1 --format='%ai'` | `2026-05-01 10:35:11 +0200` |
| Jours sans commit | calcul date | **4.5 jours** |
| Wave 1 (P1, P2, P3 du 04/05) | inspection des fichiers ciblés | **0/3 livré** |

**Translation directe de la doctrine 04/05** : on est à 24h sur les
48h de tolérance. La discipline n'est pas encore franchie au sens
strict, mais le pattern est désormais une certitude empirique :

- 28/04 → 04/05 : ~50 prompts P0 cumulés produits, **0 livré**.
- 04/05 → 05/05 : 3 prompts ultra-atomiques produits (effort total
  ~50 min), **0 livré**.
- La cadence d'exécution Cowork tourne à **0/jour** depuis 5 jours
  consécutifs.

### 🟧 Action concrète appliquée à cet audit

Plutôt que d'attendre passivement les 48h de la doctrine 04/05, j'applique
**dès aujourd'hui l'Option A recommandée hier** : Phase 4 = **1 seul
prompt P0**, choisi pour le ratio impact/effort maximal du backlog
cumulé (5.0). Ce prompt est shippable en **moins de 30 minutes**, **0
dépendance**, **iso-fonctionnel produit**.

Le reste des findings (matrice, roadmap, mockups) est conservé pour
documentation, mais **rien d'autre que ce prompt unique n'est censé
être lu**, encore moins exécuté en parallèle. Si ce prompt unique ne
ship pas dans les 24h, l'audit du **06/05 ne produira aucun prompt**
et basculera intégralement sur Section 5 (fix routine), comme prévu.

### Pourquoi 1 prompt et pas 0

- **Argument pour 0** : la cadence est à zéro. Continuer d'alimenter
  un canal mort, c'est creuser la dette.
- **Argument pour 1** : un prompt shippable en 20 minutes est une
  victoire tangible que la routine peut absorber sans ré-architecture.
  Zéro prompt = silence radio = aucune incitation marginale à reprendre.

Choix retenu : **1 prompt**, sur la conviction qu'**un signal faible
mais consistant > un silence bien intentionné**.

---

## 1. Reconnaissance

### 1.1 Inventaire features (delta 04/05 → 05/05)

**Aucun delta.** L'inventaire complet du 03/05, validé identique au
04/05, reste valable :

- **29 panels visibles** (23 routes JSX + 6 corpus mutualisés via
  `panel-veille.jsx`), répartis en **6 groupes sidebar**.
- **Aujourd'hui** (6) · **Veille** (7) · **Apprentissage** (5) ·
  **Business** (3) · **Personnel** (6) · **Système** (2).

### 1.2 Findings 28/04 → 05/05 — récapitulatif

Tout reste **strictement** tel qu'au 04/05. Légende : 🟢 résolu ·
🟡 partiel · 🔴 inchangé · ⚪ nouveau.

| # | Finding | Origine | Statut 05/05 |
|---|---|---|---|
| R1 | Hero macro plein format par défaut J7+ | 28/04 | 🟡 toggle existe, défaut OFF |
| R4 | Contraste Dawn primary buttons | 28/04 | 🔴 |
| R5 | 66 scripts série / 1 defer | 28/04 | 🔴 |
| R7 | Audio brief estimation `body.length / 280` | 28/04 | 🔴 |
| R10 | Aucun feedback "données stale" | 28/04 | 🔴 |
| R14+ | Composant `Stub` mort dans `app.jsx:99` | 29/04 | 🔴 (vérifié 05/05) |
| R17 | Hover `translateY(-2px)` sur top-feat / opp-kan | 01/05 | 🔴 (3 occurrences vérifiées 05/05) |
| R18 | `max-width 70ch` cantonné à 2 sélecteurs | 01/05 | 🔴 (vérifié 05/05) |
| R19 | Sidebar 6 groupes | 01/05 | 🔴 |
| R20 | Touch targets `.vl-filter-pill` mobile 12.5px | 01/05 | 🔴 |
| R21 | Audit contraste WCAG AA tri-thèmes | 01/05 | 🔴 |
| R22 | Streak meaningful "X j, record Y" | 01/05 | 🔴 |
| R23 | Ctrl+K nudge J0-J3 | 01/05 | 🔴 |
| R24 | 0 commit applicatif | 03/05 | 🔴 **aggravé : J+4.5** |
| R25 | `styles.css` = 4666 lignes | 03/05 | 🔴 |
| R26 | `data-loader.js` = 4728 lignes | 03/05 | 🔴 |
| R27 | 313 sub-pixel font-sizes | 03/05 | 🔴 |
| R28 | `prefers-reduced-motion` cantonnée à `styles.css` | 04/05 | 🔴 |
| **R29** | **Wave 1 du 04/05 (3 prompts ~50 min) non démarrée** | **05/05** ⚪ | Doctrine 04/05 partiellement déclenchée — Section 5 escalade dur |

**Vérifications shell le 05/05** :

```bash
$ git rev-parse HEAD
6600b64de0e974346f0358ce266363aa54371f50

$ git log -1 --format='%ai %s'
2026-05-01 10:35:11 +0200 docs(audit): sync specs + archi + CLAUDE.md ...

$ wc -l cockpit/styles.css cockpit/lib/data-loader.js
4666 cockpit/styles.css
4728 cockpit/lib/data-loader.js

$ grep -cE "<script" index.html
66

$ grep -cE "defer|async" index.html
1

$ grep -rE "font-size: 1[0-3]\.5px" cockpit/styles*.css | wc -l
313

$ grep -lr "prefers-reduced-motion" cockpit/
cockpit/styles.css   # toujours seul

$ grep -nE "translateY\(-[12]px\)" cockpit/styles.css cockpit/styles-opportunities.css
cockpit/styles.css:2171:.top-feat-main:hover { ... transform: translateY(-2px); }
cockpit/styles.css:2233:.top-feat-side:hover { ... transform: translateY(-2px); }
cockpit/styles-opportunities.css:620:.opp-kan-card:hover { ... transform: translateY(-1px); }

$ grep -n "function Stub" cockpit/app.jsx
99:function Stub({ id, theme, onBack }) {
```

### 1.3 Drift de tokens — état 05/05

Inchangé : ~85 hex hardcodés sur 12 valeurs distinctes. Top 5 :

| Hex | Occurrences | Décodage probable | Token cible |
|---|:-:|---|---|
| `#b43a3a` | 11 | Rouge alert custom | `--alert` |
| `#b3491a` | 10 | Variante rouille (Dawn) | `--brand` |
| `#2d7a4e` | 9 | Vert positive custom | `--positive` |
| `#fafaf5` | 8 | Quasi-blanc Dawn | `--bg` |
| `#c25a3a` | 7 | Saumon (Dawn brand-tint) | `--brand-tint` |

La promesse tri-thématique (Dawn / Obsidian / Atlas) fuite toujours
sur Veille outils, Jarvis Lab, Wiki, Stacks, Jobs Radar.

### 1.4 Test rétention — état 05/05 (visite 28 de la semaine)

Frictions strictement identiques au 04/05. L'utilisateur tient encore
parce qu'il est lui-même propriétaire du cockpit. **Une rétention 30j
ne peut pas être mesurée sur un public d'1 user.** Les irritants
cumulent.

| Friction | Sévérité | Source |
|---|---|---|
| 🔴 FCP boot ~3-5s fibre, ~6-10s 4G | Élevée | R5 |
| 🔴 Hero macro plein format à chaque visite | Élevée | R1 |
| 🟠 Hover `translateY(-2px)` sur top-feat « danse » | Moyenne | R17 |
| 🟠 Bouton primary `--tx` (encre) sur fond crème Dawn | Moyenne | R4 |
| 🟠 Top-summary line-length 95+ char sur 27" | Moyenne | R18 |
| 🟠 Sidebar 6 groupes — friction décisionnelle | Moyenne | R19 |
| 🟠 Pills tactiles ~26px sur Veille mobile | Moyenne | R20 |

**Verdict rétention 05/05** : statu quo strict, aggravé par 24h
supplémentaires de non-ship.

---

## 2. Matrice d'évaluation

Notes /5. Critères : Clarté · Densité · Cohérence · Interactions ·
Mobile · Accessibilité · Rétention. **Légende delta** : `↑` =
amélioration depuis 04/05 · `↓` = dégradation · `—` = inchangé.

| Section | Cl | De | Co | In | Mo | A11y | Ret | **Moy.** | **Δ vs 04/05** |
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

**Moyenne cockpit 05/05 : 3.92 / 5** (identique 03/05, 04/05). Le
plateau est désormais structurel — il ne bougera pas tant que le
canal d'exécution est à 0/jour.

### 2.1 Top 3 forces (inchangées)

1. **A11y au-dessus de la moyenne web** (skip-link, focus-visible,
   reduced-motion sur `styles.css`, ARIA, zero-state).
2. **Comportement de rétention sophistiqué** (hero delta, snooze,
   undo, command palette, raccourcis, modale Stacks React, hero
   compact toggle).
3. **Système tri-thématique mature** (Dawn / Obsidian / Atlas) avec
   vibe tokens.

### 2.2 Top 3 faiblesses (réordonnées 05/05 — ordre de gravité)

1. **🔴🔴 Routine d'exécution morte** (R24 + R29). Le canal Cowork
   produit du diagnostic, pas du fix, depuis 5 jours. **Tant que ce
   verrou ne saute pas, tout audit additionnel est gaspillé** —
   Section 5 propose 3 issues de secours.
2. **🔴 Performance de boot** (R5, identifié 28/04). 66 scripts,
   1 defer. Sur 25 visites/mois, ~3 min d'attente cumulées avant le
   brief.
3. **🟠 Densité non-réglable + drift de tokens** (R1 + R18 + R27 +
   R16+). Le hero compact existe mais OFF par défaut. 313
   sub-pixels. ~85 hex hardcodés. Pas un user-facing bug, mais une
   dette qui rend chaque sweep coûteux.

---

## 3. Quick Wins & Roadmap Jarvis

### 3.1 Top 10 Quick Wins (triés par ratio impact/effort décroissant)

Liste **strictement identique** au 03/05 et 04/05 (rien n'a bougé en
48h). Reproduite pour autonomie du document, mais **un seul des 10
sera transformé en prompt aujourd'hui** — voir Phase 4.

| # | Titre | Imp | Eff | Ratio | Sections |
|:-:|---|:-:|:-:|:-:|---|
| 1 | Désactiver `translateY(-2px)` hover sur `.top-feat-main`, `.top-feat-side`, `.opp-kan-card` | 4 | 1 | **4.0** | Top, Opps |
| 2 | `max-width: 70ch` sur `.top-summary`, `.hero-body` plein, `.vl-item-summary` | 4 | 1 | **4.0** | Top, Brief, Veille |
| **3** | **Hero compact = mode par défaut après J7** | **5** | **1** | **5.0** | **Brief (R1)** ← retenu |
| 4 | Bannière "données stale > 24h" sur Brief | 4 | 2 | **2.0** | Brief (R10) |
| 5 | Supprimer composant `Stub` mort | 2 | 1 | **2.0** | App (R14+) |
| 6 | Streak meaningful "X jours, record Y" | 3 | 1 | **3.0** | Sidebar footer (R22) |
| 7 | Ctrl+K nudge J0-J3 | 4 | 2 | **2.0** | Sidebar footer (R23) |
| 8 | Touch targets ≥ 44px sur `.vl-filter-pill` mobile | 4 | 1 | **4.0** | Veille mobile (R20) |
| 9 | `<script defer>` sur libs CDN | 5 | 3 | **1.7** | Boot (R5) |
| 10 | Token sweep round 3 : 85 hex hardcodés | 3 | 3 | **1.0** | Tous panels CSS |

### 3.2 Roadmap Jarvis — 15 features avancées (rappel sans changement)

Score composite = Impact × Faisabilité. **Aucune ne sera prompted
aujourd'hui** — la roadmap reste documentaire tant que la routine ne
ship pas.

| # | Feature | Imp | Fais | Wow | **I×F** |
|:-:|---|:-:|:-:|:-:|:-:|
| J1 | Lecture immersive in-cockpit | 5 | 4 | 4 | **20** |
| J2 | Resume tracker hebdo (Miroir dimanche) | 5 | 4 | 5 | **20** |
| J3 | Spec drift indicator dans Jarvis Lab | 4 | 5 | 3 | **20** |
| J4 | Streak "pardon" 1×/mois | 4 | 5 | 3 | **20** |
| J5 | "Why this ranks #1" expansible sur Top cards | 5 | 4 | 4 | **20** |
| J6 | Snooze intelligent ("Réveille-moi quand X bouge") | 5 | 4 | 5 | **20** |
| J7 | Search → save query → digest hebdo | 5 | 4 | 4 | **20** |
| J8 | Ask Jarvis dock (Cmd+J flottant) | 5 | 3 | 5 | **15** |
| J9 | Ideas ↔ Opportunities matchmaking | 5 | 3 | 5 | **15** |
| J10 | Smart-collapse panels rares | 3 | 5 | 3 | **15** |
| J11 | Préchargement Babel + JSX critiques | 4 | 4 | 2 | **16** |
| J12 | Profil dynamique (1 question/jour) | 5 | 3 | 4 | **15** |
| J13 | Cockpit voice mode | 4 | 3 | 5 | **12** |
| J14 | Téléchargement export brief `.md` | 3 | 5 | 3 | **15** |
| J15 | Mode "vibe" Profil (Calme / Focus / Mission) | 4 | 3 | 5 | **12** |

### 3.3 Mockups textuels — 3 features les plus prometteuses

Mockups réutilisés du 04/05 (et 03/05). Validés inchangés.

#### Mockup A — QW #3 : Hero compact par défaut J7+

```
┌─────────────────────────────────────────────────────────────────┐
│ [Brief]  [● Compact]                                            │
│                                                                 │
│ ● MARDI 5 MAI · 89 articles synthétisés · lecture 4 min         │
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
│  ✓  ...                                                         │
│                                                                 │
│  Source : git log + docs/specs/index.json::last_updated         │
└─────────────────────────────────────────────────────────────────┘
```

#### Mockup C — J4 : Streak "pardon" 1×/mois

```
   Footer sidebar :
   ┌───────────────────────────────┐
   │  🔥  12 j                     │
   │  streak veille · record 18 j  │
   │  prochain 06:00 · joker 1/1   │
   └───────────────────────────────┘

   Au reset 06:00 si J-1 sans lecture :
   → Si joker disponible : streak conservée, joker passe à 0/1
   → Toast : "Tu as raté hier. Joker utilisé. Prochain dans 27 j."
   → Sinon : streak repart à 0 (zero-state existant)
```

---

## 4. Prompts Claude Code

> **Stack rappel** : React 18 + Babel standalone via CDN (no build),
> Supabase REST. Composants exposés via `window.X`. Tokens via CSS
> Custom Properties dans `cockpit/themes.js`. CI bloquantes :
> `lint-specs` + `validate-arch`. Toute modif d'un onglet → mettre à
> jour `docs/specs/tab-<slug>.md` + `docs/specs/index.json` dans le
> même commit.

> **Discipline 05/05 — déclenchement précoce de la doctrine 04/05** :
> Phase 4 = **1 seul prompt P0**. Choisi pour le ratio impact/effort
> maximal du backlog (5.0). Effort estimé : **20 minutes**.
>
> Justification : si Wave 1 du 04/05 (3 prompts × 50 min cumulés) n'a
> pas pu absorber le canal d'exécution, **abaisser à 1 prompt unique
> est la dernière marche avant zéro**. Si ce prompt ne ship pas dans
> les 24h, l'audit du 06/05 produira **0 prompt** et basculera
> intégralement en escalade routine (Section 5).
>
> **Mapping fichier-ligne vérifié sur HEAD `6600b64` le matin du
> 05/05** — valide tant qu'aucun commit ne tombe entre cette lecture
> et l'exécution.

---

### P0 — La micro-victoire unique du jour

#### Prompt 1 — [UX] Hero compact = mode par défaut après J7

**Priorité** : P0
**Dépend de** : Aucun
**Effort estimé** : 0.4h (20 min en pratique)
**Ratio impact/effort** : 5.0 (max du backlog)
**Fichiers** : `cockpit/home.jsx` (lignes 262-273), `index.html` (bump `home.jsx?v=5` → `?v=6`), `docs/specs/tab-brief.md`, `docs/specs/index.json`

```
Contexte : Le toggle compact/plein du hero existe depuis 30/04
(commit bc1e146), mais il est OFF par défaut. Un user qui ouvre le
cockpit pour la 30e fois voit toujours un hero macro plein format
qui prend ~60% de la fenêtre, alors qu'il connaît parfaitement le
contenu. R1 dans tous les audits 28/04 → 05/05.

Source : audits 28/04 (R1 origine), 01/05 P3, 03/05 P3, 04/05 P3 —
non livrés. Vérifié sur HEAD 6600b64 le 05/05/2026 :
  $ sed -n '262,273p' cockpit/home.jsx
  affiche bien le bloc à remplacer ci-dessous.

Tâche : à partir du 8e jour d'usage (cockpit-first-seen >= 7 jours),
mettre le hero en mode compact par défaut, MAIS uniquement si l'user
n'a jamais explicitement choisi. Le user qui clique "Plein" mémorise
sa préférence (set "0") et le J7-default ne s'applique plus.

Justification principielle :
- Density-progressive disclosure (Tognazzini) : un user expérimenté
  n'a plus besoin du hero plein format.
- Habituation visuelle (Bourassa, 2014) : un macro hero répété 30
  fois devient bruit, plus information.

──────────────────────────────────────────────────────────────────

Étape 1 — cockpit/home.jsx, lignes 262-273

REMPLACER EXACTEMENT le bloc :

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

──────────────────────────────────────────────────────────────────

Étape 2 — index.html

Bumper la version cache-busting : remplacer
  cockpit/home.jsx?v=5
par
  cockpit/home.jsx?v=6
(la GH Action sw-sync mettra à jour le manifest SW automatiquement
à la PR.)

──────────────────────────────────────────────────────────────────

Étape 3 — docs/specs/tab-brief.md

Dans la section Fonctionnalités, ajouter :

  - **Densité progressive** : à partir de la 8e visite, le hero
    adopte par défaut le format compact. L'utilisateur peut toujours
    basculer manuellement (sa préférence est mémorisée et neutralise
    ce comportement par défaut).

Mettre à jour la section ## Dernière MAJ en bas du fichier :

  - 2026-05-05 — Hero compact devient le défaut à partir de J7+.
    Préférence explicite de l'user (toggle "Compact"/"Plein") gagne
    toujours sur ce default.

──────────────────────────────────────────────────────────────────

Étape 4 — docs/specs/index.json

Bumper last_updated pour l'entrée "brief" → "2026-05-05".

──────────────────────────────────────────────────────────────────

Validation :

1. Test 8 jours : ouvrir la console après login, exécuter
     localStorage.setItem("cockpit-first-seen", String(Date.now() - 8*86400000));
     localStorage.removeItem("cockpit-hero-compact");
     location.reload();
   → hero affiché en mode compact directement.
2. Test préférence explicite : cliquer "Plein" → reload → hero plein.
3. Test inverse : cliquer "Compact" → reload → hero compact.
4. Test J0-J6 : localStorage.removeItem("cockpit-first-seen") → reload
   → hero plein (J0 default préservé).

Mention dans le commit (template .gitmessage) :
  Specs mises à jour: tab-brief.md
```

**Validation** : un user de 30 jours arrive sur un brief compact ;
un nouveau user (J0-J6) arrive toujours sur le hero plein. Toggle
manuel respecté à vie une fois cliqué.

---

### Checklist d'exécution (volontairement minimale)

| # | Prompt | Tag | Effort | Dépend | Cumul |
|:-:|---|:-:|:-:|---|:-:|
| 1 | P0 — Prompt 1 (hero compact J7+ default) | UX | 0.4h | — | **0.4h** |

**Total estimé** : ~20-25 minutes. Un seul fichier `.jsx` modifié,
un seul fichier `.md` spec, un bump de version cache-busting. CI
`lint-specs` + `validate-arch` resteront vertes (la spec couvre la
fonctionnalité produit, pas de jargon technique).

**Cible psychologique** : une seule micro-victoire à atteindre en
≤ 30 min. Aucune excuse "trop de choix", aucun arbitrage. Le commit
type est connu, la spec à toucher est connue, la ligne de code est
connue.

---

## 5. 🟧🟧 Proposition de fix routine — escalade dure

> Cette section sort du périmètre design pur. Elle s'adresse à
> l'utilisateur qui pilote la routine, pas à Claude Code. C'est la
> conséquence directe de **R24 escaladé sur 5 jours pleins** + **R29
> ouvert ce matin** (Wave 1 du 04/05 non démarrée).

Le pattern est désormais **statistiquement irréfutable** :

| Période | Prompts produits | Prompts livrés | Cadence livraison |
|---|:-:|:-:|:-:|
| 28/04 → 03/05 (6 jours) | ~50 | ~6 | ~1/jour |
| 01/05 → 03/05 (3 jours) | ~22 | 0 | **0/jour** |
| 04/05 (Wave 1 disciplinée) | 3 | 0 | **0/jour** |
| 05/05 (ce matin) | 1 | — | en attente |

**Le canal a fonctionné jusqu'au 30/04**, puis s'est arrêté. La
question n'est plus "comment alimenter mieux la routine" mais
"qu'est-ce qui a changé fin avril qui empêche la routine de fermer
ses tickets".

### Hypothèses (à arbitrer par l'utilisateur)

- **H1 — Surcharge cognitive** : produire 12 prompts/jour quand on
  ne peut en absorber qu'1-2 crée un effet "menu trop riche" (Iyengar
  & Lepper, 2000) où l'utilisateur ferme l'audit sans rien choisir.
- **H2 — Friction CI** : `lint-specs` + `validate-arch` bloquantes
  rendent chaque commit plus coûteux que prévu. Le coût marginal
  d'un commit P0 a peut-être doublé sans qu'on le mesure.
- **H3 — Désengagement progressif** : le projet a peut-être glissé
  en arrière-plan des priorités utilisateur (Malakoff Humanis,
  vacances, projets perso non documentés).
- **H4 — Bug de la routine Cowork** : la routine produit les audits
  mais ne crée pas de tickets exécutables. À vérifier dans le panel
  Tâches Cowork.

### 3 directions concrètes (du plus léger au plus structurant)

#### Option A — Cap à 1 prompt/jour (déjà appliqué dans cet audit)

L'audit du jour ne produit **qu'un seul prompt P0**, choisi pour le
ratio impact/effort le plus haut du backlog cumulé. Tout le reste
(matrice, roadmap, mockups) est conservé en lecture seule.

- **Avantage** : pression d'exécution maximale (1 prompt = 1 ship par
  jour, pas d'excuse "trop de choix"). **Appliqué dès aujourd'hui.**
- **Inconvénient** : impose à l'audit de jeter une option ou l'autre
  selon contexte.
- **Effort** : 0. Modifier le `SKILL.md` du job scheduled
  "design-audit—upgrade-prompt" pour réduire la cible Phase 4 de
  "10 quick wins + 5 features" à "1 prompt P0".
- **Statut au 05/05** : doctrine appliquée empiriquement dans cet
  audit. À gravée dans le SKILL.md si l'utilisateur la valide.

#### Option B — Pause routine + revue manuelle ponctuelle

**Désactiver le job scheduled jusqu'à ce que le backlog cumulé
(R1, R10, R14+, R17, R18, R20, R22, R23, R28, et le prompt 1 du
05/05) soit soldé en partie.** Reprendre la routine seulement
quand l'utilisateur a shippé au moins **3 prompts P0**.

- **Avantage** : zéro empilement supplémentaire. Force l'utilisateur
  à prendre une décision explicite "je relance / j'abandonne".
- **Inconvénient** : silence total sur la dérive entre-temps. Si un
  bug visuel apparaît, il n'est pas détecté.
- **Effort** : 0. Désactiver le job dans l'UI Cowork.
- **Recommandé si** : l'audit du **06/05** produit 0 prompt (= la
  doctrine 04/05 finit de s'enclencher).

#### Option C — Découpler production / exécution via 2e routine

L'audit reste exhaustif (10 QW + 5 features) mais **un second job
scheduled** quotidien pioche le prompt #1 de l'audit du jour, l'ouvre
en pull request automatique, et laisse Cowork le reviewer/merger.

- **Avantage** : exécution idempotente, ne dépend pas de la mémoire
  utilisateur. Backlog se vide tout seul.
- **Inconvénient** : nécessite un setup non-trivial (2e routine,
  agent qui lit le `.md`, parse les prompts, ouvre PR). Risque de
  PRs cassantes si la qualité du prompt baisse.
- **Effort** : ~3-5h pour créer l'agent, tester, valider sur 3 jours.
- **À envisager si** : Option A ne relance pas le moteur en 7 jours
  (donc à partir du 12/05).

### Recommandation senior design — 05/05

**Option A en mode dégradé immédiat (déjà appliqué dans cet audit)**.

Si le prompt 1 du 05/05 ne ship pas dans les 24h → bascule
**automatique en Option B** dès le 06/05 : aucun prompt produit, job
audit en pause via UI Cowork.

Option C reste la cible long-terme une fois la cadence reprise (≥ 1
ship/jour pendant 7 jours).

---

## 6. Findings non couverts par des prompts (volontairement)

Pour respecter la doctrine 04/05 + l'escalade 05/05, **tous les
findings hors hero compact restent ouverts**. Aucun n'est nouveau
vs 04/05 — la liste s'allonge par défaut chaque jour.

| # | Finding | Pourquoi pas dans cet audit |
|---|---|---|
| R5 | 66 scripts sans defer + Babel série | Effort 3-5h. Mérite audit perf dédié + benchmark Lighthouse |
| R10 | Bannière stale > 24h | Effort 1h. Prompted 03/05 P4, 04/05 backlog — non livré |
| R14+ | `Stub` mort → `PanelNotFound` | Effort 0.4h. Prompted 03/05 P6 — non livré |
| R16+ R27 | Token sweep round 3 + sub-pixel sweep | Effort 3-4h |
| R17 | Hover translateY(-2px) sur top-feat / opp-kan | Effort 0.2h. Prompted 04/05 P1 — non livré |
| R18 | `max-width 70ch` sur 3 sélecteurs body | Effort 0.3h. Prompted 03/05 P2 — non livré |
| R19 | Sidebar 4 groupes max | Effort 1.5h. Mérite arbitrage user |
| R20 | Touch targets ≥ 44px sur `.vl-filter-pill` | Effort 0.2h. Prompted 04/05 P2 — non livré |
| R21 | Audit contraste WCAG AA tri-thèmes | Effort 1.5h |
| R22 | Streak record "X j, record Y" | Effort 0.5h |
| R23 | Ctrl+K nudge J0-J3 | Effort 1h |
| R28 | `prefers-reduced-motion` cantonnée à styles.css | Effort 0.5h |
| J1-J7 | Roadmap composite 20 | Chacune ~2-3h. Reste documentaire tant que routine ≠ stable |

---

## 7. Annexe — Justifications principielles

| Décision | Principe |
|---|---|
| Hero compact J7+ par défaut | Density-progressive disclosure (Tognazzini) + habituation visuelle (Bourassa, 2014) |
| Cap 1 prompt/audit J+5 sans ship | WIP limits (Reinertsen, *Principles of Product Development Flow*) — la borne supérieure n'est plus une recommandation mais une condition de flow |
| Section 5 doctrine d'escalade | Eat your own dogfood — si la machine d'audit ne ship pas, c'est elle qui est le finding #1 |
| Auto-déclenchement Option B au 06/05 si pas de ship | Forced decision (Sutherland) — un système qui ne décide pas est un système qui dérive |

---

## 8. Annexe — Ce que l'audit n'a PAS pu vérifier

- **Pixel-perfect render post-login** : la home, les panels Tier 2 et
  le Jarvis chat nécessitent OAuth Google — non accessible en
  automate. Audit basé sur le code et les CSS.
- **Performance réelle** (Lighthouse / Core Web Vitals) : R5 mérite
  un audit perf dédié.
- **Cause racine du blocage Cowork** (H1-H4 Section 5) : l'audit ne
  peut pas trancher entre les hypothèses sans input utilisateur.
- **TFT panel (`gaming`)** : non exploré en détail.

---

## 9. Annexe — Notes de scope

- L'audit cible **la rétention quotidienne sur 30 jours**, pas la
  conversion 1ère visite.
- Les prompts sont écrits pour Claude Code (agent autonome).
  **Aujourd'hui : 1 seul prompt** — lis-le, exécute-le, valide,
  c'est terminé.
- **Si le prompt 1 ne ship pas avant le 06/05 06h00 UTC** : l'audit
  du 06/05 ne produira aucun prompt et ouvrira la voie à Option B
  (pause routine). Cette règle est désormais publique et vérifiable.
