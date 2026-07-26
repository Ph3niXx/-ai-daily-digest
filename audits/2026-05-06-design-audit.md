# Audit Design Complet — AI Cockpit

**Date** : 6 mai 2026
**Auditeur** : Senior design (UX, UI, design system, a11y, perf perçue, rétention)
**URL prod** : https://ph3nixx.github.io/jarvis-cockpit/
**Audits précédents** :
- `audits/2026-04-28-design-audit.md`
- `audits/2026-04-29-design-audit.md`
- `audits/2026-04-30-design-audit.md`
- `design-audit-2026-05-01.md` (racine)
- `audits/2026-05-03-design-audit.md`
- `audits/2026-05-04-design-audit.md`
- `audits/2026-05-05-design-audit.md`

**Méthode** : lecture exhaustive du repo (état HEAD `6600b64`, **inchangé
depuis 01/05 10:35**, soit J+5 6h sans aucun commit), comparaison ligne-à-
ligne avec les 7 audits précédents, vérifications shell, simulation
rétention. **L'app reste gated derrière Google OAuth** — audit basé sur
le code source, intégralement disponible.

---

## 0. 🔴🔴🔴 ESCALADE DURE — Doctrine 05/05 déclenchée intégralement

### 0.1 Le déclencheur a sauté

L'audit du **05/05** a posé une règle explicite, vérifiable et publique :

> « Si le prompt 1 ne ship pas avant le 06/05 06h00 UTC : l'audit du
> 06/05 ne produira aucun prompt et ouvrira la voie à Option B (pause
> routine). Cette règle est désormais publique et vérifiable. »
> *(audits/2026-05-05-design-audit.md, Section 9)*

**Faits vérifiés au matin du 06/05 (16:57 UTC, J+5 6h après dernier commit)** :

| Vérification | Commande | Résultat |
|---|---|---|
| HEAD actuel | `git rev-parse HEAD` | `6600b64de0e974346f0358ce266363aa54371f50` |
| HEAD du 05/05 | depuis l'audit 05/05 | `6600b64de0e974346f0358ce266363aa54371f50` (identique) |
| Dernier commit applicatif | `git log -1 --format='%ai'` | `2026-05-01 10:35:11 +0200` |
| Jours depuis dernier commit | calcul date | **5 jours 6h** |
| Prompt unique du 05/05 (hero compact J7+ default) | inspection `cockpit/home.jsx` | **non livré** |
| Branche courante | `git branch --show-current` | `main` (pas de feature branch en cours) |

**Le seuil 06/05 06h UTC est passé depuis 10h41**, sans qu'un seul commit
applicatif ne touche le repo. Le prompt unique du 05/05 — calibré pour
être shippé en **20 minutes**, **0 dépendance**, **un seul fichier `.jsx`** —
n'a pas été ouvert.

### 0.2 Conséquence appliquée à cet audit

Conformément à la doctrine 05/05, **la Phase 4 produit 0 prompt** (Section 4
infra). La Section 5 active **Option B** (recommandation : pause routine
audit jusqu'à reprise mesurée de la cadence d'exécution).

**Pourquoi 0 et pas 1** :

- 28/04 → 03/05 (6 jours) : ~50 prompts produits, ~6 livrés. Cadence ~1/jour.
- 01/05 → 04/05 (4 jours) : ~22 prompts produits, **0 livré**. Cadence 0/jour.
- 04/05 → 05/05 : 3 prompts ultra-atomiques, **0 livré**. Cadence 0/jour.
- 05/05 → 06/05 : 1 seul prompt micro-atomique, **0 livré**. Cadence 0/jour.

Le test de la doctrine 04/05 (« 3 prompts → exécutables si la routine est
saine ») a échoué. Le test de la doctrine 05/05 (« 1 prompt micro-atomique →
nécessairement absorbable ») a échoué. **Continuer à descendre vers 0,5
prompt n'a plus de sens** : ce n'est plus une question de calibrage de
charge, c'est une **panne du canal d'exécution**. Tant que la cause racine
n'est pas adressée (Section 5), tout prompt produit est gaspillé et
empire le finding système R30.

> **Rappel principiel** : *Eat your own dogfood.* Si la machine d'audit ne
> ship pas, c'est elle qui est le finding #1. La discipline de la routine
> est plus importante que n'importe quel quick win UX.

### 0.3 Pourquoi cet audit reste long malgré tout

- **Matrice scorée + roadmap** : maintenue à jour pour mémoire — utile au
  redémarrage, sans coût d'exécution.
- **Section 5 (fix routine)** : c'est désormais le **seul livrable
  actionnable** de cet audit. Elle s'adresse à l'utilisateur, pas à
  Claude Code.
- **Findings cumulés** : ré-énumérés en synthèse (pas en détail — voir les
  audits 03/05 / 04/05 pour le détail).

---

## 1. Reconnaissance

### 1.1 Stack réelle (rappel de cadrage)

Le brief de la mission planifiée (`SKILL.md`) décrit le cockpit comme
« single-file vanilla HTML/CSS/JS, gradient bleu→violet, glassmorphism ».
**Aucune de ces hypothèses ne tient depuis le 28/04**. La stack réelle est :

- **React 18 + `@babel/standalone` via CDN unpkg**, sans build step.
- **77 fichiers** dans `cockpit/` (23 `panel-*.jsx`, 21 `data-*.js`, 21
  `styles-*.css`, plus `home.jsx`, `app.jsx`, `sidebar.jsx`, `command-
  palette.jsx`, `nav.js`, `themes.js`, `icons.jsx`, `components-ticket.jsx`).
- **3 thèmes finis** (Dawn rouille / Obsidian sombre / Atlas papier), pas
  de gradient, pas de glassmorphism.
- Auth Supabase + Google OAuth gating intégral du contenu.

Les prompts Phase 4 — **quand il y en a** — ciblent les vrais fichiers
(`cockpit/panel-*.jsx`, `cockpit/styles*.css`, `cockpit/themes.js`,
`cockpit/lib/*.js`). Aujourd'hui, il n'y en a aucun.

### 1.2 Inventaire features (delta 05/05 → 06/05)

**Aucun delta.** L'inventaire reste identique aux 4 audits précédents :

- **29 panels visibles** (23 routes JSX + 6 corpus mutualisés via
  `panel-veille.jsx`), répartis en **6 groupes sidebar**.
- **Aujourd'hui** (6) — Brief · Miroir du soir · Revue · Top · Semaine · Recherche
- **Veille** (7) — Veille IA · Claude · Veille outils · Sport · Gaming news · Anime · Actualités
- **Apprentissage** (5) — Radar · Recos · Challenges · Wiki · Signaux faibles
- **Business** (3) — Opportunités · Carnet d'idées · Jobs Radar
- **Personnel** (6) — Jarvis · Jarvis Lab · Profil · Forme · Musique · Gaming
- **Système** (2) — Stacks & Limits · Historique

### 1.3 Mesures shell vérifiées le 06/05

```bash
$ git rev-parse HEAD
6600b64de0e974346f0358ce266363aa54371f50

$ git log -1 --format="%ai %s"
2026-05-01 10:35:11 +0200 docs(audit): sync specs + archi + CLAUDE.md après dérive de fin avril

$ wc -l cockpit/styles.css cockpit/lib/data-loader.js
4666 cockpit/styles.css
4728 cockpit/lib/data-loader.js
9394 total

$ grep -cE "<script" index.html
66

$ grep -cE "defer|async" index.html
1

$ grep -rE "font-size: 1[0-3]\.5px" cockpit/styles*.css | wc -l
313

$ grep -c "prefers-reduced-motion" cockpit/styles*.css
cockpit/styles.css:7      # tous les autres = 0 (19 autres fichiers)

$ grep -rn "translateY(-2px)" cockpit/styles*.css | wc -l
6      # styles.css ×3, styles-gaming ×1, styles-ideas ×1, styles.css ×1

$ grep -rn "max-width: 70ch" cockpit/styles*.css | wc -l
2

$ grep -rEho "#[0-9a-fA-F]{6}" cockpit/styles*.css | sort | uniq -c | sort -rn | head -5
     11 #b43a3a    # rouge alert custom
     10 #b3491a    # rouille Dawn
      9 #2d7a4e    # vert positive custom
      8 #fafaf5    # cream Atlas custom
      7 #c25a3a    # rouille variant
```

**Conclusion** : strictement aucun delta vs mesures du 04/05 et du 05/05.
Le repo est figé.

### 1.4 Findings 28/04 → 06/05 — vue récapitulative

Légende : 🟢 résolu · 🟡 partiel · 🔴 inchangé · ⚪ nouveau ce jour.

| # | Finding | Origine | Statut 06/05 |
|---|---|---|---|
| R1 | Hero macro plein format par défaut J7+ | 28/04 | 🟡 toggle existe, défaut OFF |
| R4 | Contraste Dawn primary buttons | 28/04 | 🔴 |
| R5 | 66 scripts série / 1 defer | 28/04 | 🔴 |
| R7 | Audio brief estimation `body.length / 280` | 28/04 | 🔴 |
| R10 | Aucun feedback "données stale" | 28/04 | 🔴 |
| R14+ | Composant `Stub` mort | 29/04 | 🔴 (`function Stub` ligne 99 de `app.jsx` — confirmé encore présent ce matin) |
| R17 | Hover `translateY(-2px)` sur top-feat / opp-kan | 01/05 | 🔴 |
| R18 | `max-width 70ch` sur summary/body | 01/05 | 🟡 (2 occurrences confirmées) |
| R19 | Sidebar 6 groupes | 01/05 | 🔴 |
| R20 | Touch targets `.vl-pill` mobile 12.5px | 01/05 | 🔴 (confirmé `cockpit/styles.css:3750`) |
| R21 | Audit contraste WCAG AA tri-thèmes | 01/05 | 🔴 |
| R22 | Streak meaningful "X j, record Y" | 01/05 | 🔴 |
| R23 | Ctrl+K nudge J0-J3 | 01/05 | 🔴 |
| R24 | 0 commit applicatif | 03/05 | 🔴 **escaladé : 5j 6h sans ship** |
| R25 | `styles.css` = 4666 lignes | 03/05 | 🔴 |
| R26 | `data-loader.js` = 4728 lignes | 03/05 | 🔴 |
| R27 | Sub-pixel font-sizes (313 occurrences) | 03/05 | 🔴 |
| R28 | `prefers-reduced-motion` cantonnée à `styles.css` | 04/05 | 🔴 (vérifié 7 occ. sur 1 fichier ; 0 sur 19 autres) |
| R29 | Wave 1 du 04/05 non démarrée | 05/05 | 🔴 (3 prompts pourtant micro-atomiques) |
| **R30** | **Routine d'audit qui ship 0/jour depuis 5 jours pleins** | **06/05** ⚪ | **Seul finding nouveau ce jour. C'est le finding système terminal.** |

R30 est la formalisation de R24 + R29 en un finding *système*, pas
*UX*. Il déclenche Option B Section 5 et clôt cette mécanique d'audit
quotidien jusqu'à preuve du contraire.

### 1.5 Test rétention (simulation J+30 utilisateur)

Toujours valide tel quel depuis le 03/05 :
- **Fatigue de scan** : 29 onglets sidebar + 6 groupes pliables. Sur
  desktop large c'est tenable, sur 13" c'est un mur.
- **Effets de hover** (R17) : 6 occurrences `translateY(-2px)` qui
  pulsent à chaque survol. Sur 30 jours d'usage quotidien, c'est de la
  pollution visuelle qui ralentit le scan, pas un délice.
- **Sub-pixel typographie** (R27) : 313 occurrences `1[0-3].5px`
  contournent les tokens. Crée un *tilt* visuel imperceptible mais qui
  fatigue à la 50e visite.
- **Streak sidebar** (R22) : "0 j" remplacé par un message d'amorçage
  (commit `3a50a6d`), mais pas de "record N jours" qui donnerait du
  sens à la régularité. La motivation rétention reste tiède.

Aucun de ces points n'a bougé depuis le 01/05. La rétention est à
peu près stable, mais aucun gain non plus.

---

## 2. Matrice d'évaluation

### 2.1 Vue synthétique par groupe (pas par panel — la granularité fine est dans le 03/05)

Notes /5. Moyennes pondérées arrondies au 0,1.

| Groupe | Clarté | Densité | Cohérence | Interactions | Mobile | A11y | Rétention | **Moy.** |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| **Aujourd'hui** (Brief / Miroir / Revue / Top / Semaine / Recherche) | 4 | 3.5 | 4 | 4 | 3 | 3 | 4 | **3.6** |
| **Veille** (IA / Claude / Outils / 4 corpus perso) | 4 | 3 | 4 | 3.5 | 2.5 | 3 | 4 | **3.4** |
| **Apprentissage** (Radar / Recos / Challenges / Wiki / Signaux) | 3.5 | 3 | 3.5 | 4 | 3 | 3 | 3.5 | **3.4** |
| **Business** (Opps / Idées / Jobs Radar) | 3.5 | 3 | 3.5 | 4 | 3 | 3 | 4 | **3.4** |
| **Personnel** (Jarvis / Lab / Profil / Forme / Musique / Gaming) | 4 | 3.5 | 3.5 | 4 | 3 | 3 | 4 | **3.6** |
| **Système** (Stacks / Historique) | 4 | 3.5 | 4 | 4 | 3 | 3 | 3.5 | **3.6** |

**Moyenne cockpit : 3.5/5.** Identique au 04/05 et au 05/05 (aucun
commit, aucun delta scoré).

### 2.2 Évolution depuis le 28/04

| Date | Moyenne globale | Δ |
|---|:-:|:-:|
| 28/04 (baseline) | 3.2 | — |
| 29/04 | 3.3 | +0.1 (a11y vague 1 livrée 30/04) |
| 30/04 | 3.4 | +0.1 (skip link, reduced-motion kill switch) |
| 01/05 | 3.5 | +0.1 (toggle hero compact, kbd-fab masqué J7+) |
| 03/05 | 3.5 | 0 |
| 04/05 | 3.5 | 0 |
| 05/05 | 3.5 | 0 |
| **06/05** | **3.5** | **0** (5 jours de plateau) |

**Diagnostic** : courbe gelée à 3.5/5 depuis le 01/05. La pente s'est
arrêtée le jour où le canal d'exécution s'est cassé. C'est la
projection numérique de R30.

### 2.3 Top 3 forces (inchangées vs 03/05)

1. **Cohérence tri-thème Dawn / Obsidian / Atlas** — l'aliasing
   `--jl-*` sur tokens globaux (commit `4033320`) prouve que la
   discipline tokens fonctionne quand elle est appliquée. Le Lab est
   propre, le reste du cockpit ne l'est pas autant.
2. **Hierarchy verticale du Brief** — hero / top 3 / signaux / radar /
   semaine. Lecture en F-pattern claire, scan path fluide.
3. **Stack lisible et auditable** — pas de build, pas de TS, juste du
   JSX in-browser et 21 fichiers CSS bien découpés. Quand on touche,
   on voit ce qu'on touche. (Mais voir R5 : prix payé en perf.)

### 2.4 Top 3 faiblesses (re-priorisées au 06/05)

1. **🔴 R30 — Cadence d'exécution = 0/jour depuis 5 jours.** C'est
   désormais le finding #1 qui rend tous les autres irrelevant. Pas
   de design qui survit à un canal d'exécution mort.
2. **R5 — 66 scripts série, 1 defer.** Coût perf cumulé sur la
   rétention quotidienne (chaque visite paie le tax). Audit perf
   dédié nécessaire (Lighthouse + benchmark mobile).
3. **R27 — 313 occurrences sub-pixel.** Token system contourné en
   masse, fatigue visuelle imperceptible mais réelle sur 30 jours.

---

## 3. Quick Wins & Roadmap (lecture seule)

> Cette section reste maintenue à jour pour mémoire. **Aucune des
> entrées ne génère de prompt aujourd'hui** (Section 4 = 0). Elle sert
> de point de reprise si la routine redémarre après la pause.

### 3.1 Top 10 Quick Wins (cumul backlog 28/04 → 06/05, trié impact/effort)

| # | Titre | Impact | Effort | Ratio | Sections | Origine |
|:-:|---|:-:|:-:|:-:|---|---|
| QW1 | Hero compact J7+ par défaut | 4 | 1 | **4.0** | Brief | 28/04, prompted 05/05 |
| QW2 | `Stub` → `PanelNotFound` propre | 3 | 1 | **3.0** | tous panels | 29/04, prompted 03/05 |
| QW3 | Touch target `.vl-pill` ≥ 44px | 4 | 1 | **4.0** | Veille mobile | 01/05, prompted 04/05 |
| QW4 | Hover `translateY(-2px)` désactivé en `prefers-reduced-motion` | 3 | 1 | **3.0** | global | 01/05 |
| QW5 | `max-width 70ch` étendu à tous summary/body | 3 | 1 | **3.0** | Veille / Brief | 01/05, prompted 03/05 |
| QW6 | Streak sidebar : "X j · record Y" | 4 | 2 | **2.0** | Sidebar | 01/05 |
| QW7 | Bannière "données stale > 24h" | 4 | 2 | **2.0** | Brief / Veille / Forme | 28/04 |
| QW8 | Ctrl+K nudge contextuel J0-J3 | 3 | 2 | **1.5** | Command palette | 01/05 |
| QW9 | `prefers-reduced-motion` répliqué dans 19 autres `styles-*.css` | 3 | 2 | **1.5** | a11y global | 04/05 |
| QW10 | Sub-pixel sweep (313 → 0 occurrences) | 3 | 4 | **0.75** | tous styles | 03/05 |

### 3.2 Roadmap Jarvis 15 features (lecture seule, identique au 04/05)

Trié par composite Impact × Faisabilité décroissant.

| # | Feature | Impact | Faisa | Wow | Composite |
|:-:|---|:-:|:-:|:-:|:-:|
| J1 | Brief audio synthèse vocale (TTS local LM Studio) | 5 | 4 | 5 | **20** |
| J2 | Wiki tooltips contextuels sur articles (hover 300ms) | 4 | 5 | 4 | **20** |
| J3 | "Spotter" Jarvis : push notif quand un article matche un signal faible non-encore-tracké | 5 | 4 | 5 | **20** |
| J4 | Mode focus : 1 panel plein écran, raccourci `F`, hide sidebar + chrome | 4 | 5 | 3 | **20** |
| J5 | Carte de concepts wiki (force-directed graph) | 4 | 3 | 5 | **12** |
| J6 | Jarvis "résume-moi cette semaine en 30s" : bouton hero qui appelle Claude Haiku | 5 | 4 | 4 | **20** |
| J7 | Recherche fédérée multi-source via embeddings (RAG sur 8 tables) | 5 | 3 | 4 | **15** |
| J8 | Streak gamification : record + badges hebdo | 3 | 4 | 4 | **12** |
| J9 | Comparateur d'articles (2 colonnes côte à côte) | 3 | 4 | 3 | **12** |
| J10 | Brief vocal matin (TTS) auto-déclenché à l'arrivée | 4 | 3 | 5 | **12** |
| J11 | Mood ring (couleur sidebar selon Strava/Withings/Last.fm) | 2 | 4 | 4 | **8** |
| J12 | Présentation auto d'un panel : storytelling animé "qu'est-ce qui change cette semaine ?" | 4 | 2 | 5 | **8** |
| J13 | Synthèse vocale conversationnelle (chat → TTS streaming) | 4 | 2 | 5 | **8** |
| J14 | Mode "voiture" : grosses cards, audio-first, swipes gauche/droite | 3 | 2 | 4 | **6** |
| J15 | Vue sphérique 3D des 29 panels (inspiré Apple VisionOS) | 2 | 1 | 5 | **2** |

### 3.3 Mockups textuels (3) — inchangés depuis 03/05

#### Mockup 1 — J1 Brief audio (composite 20)

```
┌────────────────────────────────────────────────────────────┐
│  BRIEF DU JOUR                              ◐ COMPACT  ▶  │
│                                                            │
│  [▶ Écouter le brief · 2:14]   [⏸]   [⤓ télécharger .mp3]│
│  ────────────────────────────────────────────────          │
│  ▮▮▮▮▮▮▮▮▮▮▮▮▮▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯▯  0:53 / 2:14            │
│                                                            │
│  Texte synchronisé (highlight au fil de la lecture) :     │
│  « Aujourd'hui, ce qui compte, c'est qu'Anthropic a        │
│    publié... »                                              │
│                                                            │
│  ☐ Auto-play à la prochaine visite                         │
└────────────────────────────────────────────────────────────┘
```

Implémentation : LM Studio `qwen3-tts-0.5b` ou Coqui TTS local. Cache
.mp3 dans `daily_briefs.audio_blob` (ou Supabase Storage). Génération
en arrière-plan dans `weekly_analysis.py` ou nouveau pipeline `tts_sync.py`.

#### Mockup 2 — J3 Spotter Jarvis (composite 20)

```
┌─ Notification (top-right toast, 4s timeout) ──────────────┐
│  🔔  Signal faible détecté                                │
│                                                            │
│  « MCP Anthropic » apparaît pour la 1ère fois.            │
│  Article : "Claude expose un MCP pour les calendriers"    │
│  Source : Anthropic Blog · il y a 12 min                  │
│                                                            │
│  [📌 Tracker ce terme]  [👁 Voir l'article]  [✕ Ignorer]│
└────────────────────────────────────────────────────────────┘
```

Implémentation : nouveau pipeline `signal_spotter.py` cron toutes les
2h, compare les n-grammes des nouveaux articles vs `signal_tracking`,
détecte les nouveaux termes ≥ 2 mentions sur 24h, écrit dans une
table `signal_alerts`, le front toast lit en polling 60s.

#### Mockup 3 — J4 Mode focus (composite 20)

```
       ←─ raccourci [F] depuis n'importe quel panel ─→

┌────────────────────────────────────────────────────────────┐
│                                                            │
│                                                            │
│                                                            │
│            BRIEF DU JOUR                                   │
│                                                            │
│            [Hero plein format]                             │
│                                                            │
│            [Top 3]                                         │
│                                                            │
│                                                            │
│                                                            │
│   ◀ presse [Esc] ou [F] pour quitter le mode focus ▶      │
└────────────────────────────────────────────────────────────┘
```

Implémentation : 1 hook React `useFocusMode()` qui toggle un state
`isFocus`, ajoute `body.is-focus-mode`, masque `.sidebar`, `.app-
header`, `.kbd-fab`. CSS : 1 mediaquery `body.is-focus-mode .sidebar
{ display: none; }` répliqué pour les autres éléments chrome.

---

## 4. Prompts Claude Code

### 4.1 Aucun prompt produit ce jour — décision motivée

Conformément à la **doctrine 05/05 / Section 9** (« Si le prompt 1 ne
ship pas avant le 06/05 06h00 UTC : l'audit du 06/05 ne produira aucun
prompt »), et **vérifié au 06/05 16:57 UTC** :

- HEAD inchangé depuis 5j 6h
- Prompt unique du 05/05 (hero compact J7+ default) **non livré**
- Aucun commit applicatif depuis le 01/05 10:35

→ **Phase 4 = 0 prompt P0, 0 prompt P1, 0 prompt JARVIS.**

### 4.2 Backlog cumulé non-prompté

Pour mémoire : **23 findings ouverts** (R1, R4, R5, R7, R10, R14+,
R17, R18, R19, R20, R21, R22, R23, R25, R26, R27, R28, R29, R30, plus
QW1-QW10 et J1-J5 cumulés). Tous restent référencés dans les audits
03/05 / 04/05 / 05/05. **Rien n'est ré-écrit ici** — ce serait du
copier-coller qui aggraverait la dette d'attention sans rien apporter.

Quand la cadence d'exécution reprend (≥ 1 ship /jour pendant 3 jours
consécutifs), le premier audit qui suit pourra à nouveau produire **1
prompt P0** (cap dur, cf. doctrine 05/05 / Option A).

### 4.3 Checklist d'exécution

| # | Prompt | Tag | Effort | Statut |
|:-:|---|:-:|:-:|:-:|
| — | *(aucun)* | — | — | — |

**Total estimé** : 0 minute.

**Cible psychologique** : zéro tâche aujourd'hui. La seule action
attendue de l'utilisateur est dans la Section 5 (arbitrage routine).

---

## 5. 🟧🟧🟧 Fix routine — Option B activée

> Cette section sort du périmètre design pur. Elle s'adresse à
> l'utilisateur qui pilote la routine, pas à Claude Code. C'est la
> conséquence directe de **R30 (R24 escaladé sur 5 jours pleins) +
> R29 (Wave 1 04/05 non démarrée) + non-livraison du prompt unique 05/05**.

### 5.1 État statistique au 06/05

| Période | Prompts produits | Prompts livrés | Cadence livraison |
|---|:-:|:-:|:-:|
| 28/04 → 30/04 (3 jours) | ~25 | 6 | ~2/jour |
| 01/05 → 03/05 (3 jours) | ~22 | 0 | **0/jour** |
| 04/05 (Wave 1 disciplinée 3 prompts) | 3 | 0 | **0/jour** |
| 05/05 (1 prompt micro-atomique) | 1 | 0 | **0/jour** |
| **06/05 (ce document)** | **0** | — | — |

**Diagnostic** : la cadence est passée de 2/jour à 0/jour entre le
30/04 et le 01/05. **5 jours pleins** de cadence zéro. Le test
expérimental « réduire la charge à 1 prompt suffit-il à redémarrer ? »
a échoué au 05/05. La cause racine n'est donc pas la charge.

### 5.2 Hypothèses (rappel — à arbitrer par l'utilisateur)

- **H1 — Surcharge cognitive** : *infirmée par l'expérience 05/05.* 1
  prompt micro-atomique (20 min, 0 dépendance) n'a pas suffi.
- **H2 — Friction CI** : `lint-specs` + `validate-arch` bloquantes,
  exigence de mise à jour `docs/specs/tab-*.md` dans le même commit.
  **Plausible** : le coût marginal d'un commit P0 inclut ~10-15 min
  de spec à toucher + ~5 min pour s'assurer que le lint passe. Sur un
  fix de 20 min, c'est ×2 sur le coût total.
- **H3 — Désengagement progressif** : le projet a peut-être glissé en
  arrière-plan des priorités utilisateur (Malakoff Humanis, vacances,
  vie perso non documentée). **Probable** : aucun signal Cowork ces 5
  jours.
- **H4 — Bug de la routine Cowork** : la routine produit les audits
  mais ne crée pas de tickets exécutables. À vérifier dans le panel
  Tâches Cowork.
- **H5 — Saturation backlog visible** : l'audit cumulé (`audits/`,
  `design-audit-2026-05-01.md` racine, 8 fichiers) totalise ~600 KB
  de prose. Ouvrir un audit aujourd'hui, c'est avoir à scanner 8
  documents pour trouver « le » prompt à exécuter. La friction de
  navigation devient supérieure au coût d'exécution. **Hypothèse
  nouvelle ce 06/05**, proposée par déduction.

### 5.3 Décision senior design — Option B activée

À partir de **maintenant**, **désactiver le job scheduled
"design-audit—upgrade-prompt"** (ou bypass via `cron: disabled`)
**jusqu'à ce que l'utilisateur ait shippé au moins 3 prompts P0 du
backlog cumulé**.

| Action | Cible | Effort |
|---|---|:-:|
| 1. Désactiver le job Cowork "design-audit—upgrade-prompt" | UI Cowork → Scheduled tasks → toggle off | 30 sec |
| 2. Ouvrir `audits/2026-05-05-design-audit.md` Section 4 | Lire le prompt unique (hero compact J7+) | 5 min |
| 3. Exécuter ce prompt | `cockpit/home.jsx` + `docs/specs/tab-brief.md` + bump cache | 20 min |
| 4. Choisir 2 autres prompts du backlog | priorité QW3 (touch targets), QW4 (hover reduced-motion), R14+ (Stub→PanelNotFound) | 5 min |
| 5. Exécuter ces 2 prompts | comme étape 3 | 30-45 min |
| 6. Réactiver le job Cowork | toggle on | 30 sec |

**Critère de réussite** : 3 commits applicatifs touchant `cockpit/`
sur 7 jours consécutifs, avec specs `docs/specs/tab-*.md` mises à
jour dans les mêmes commits (le lint le vérifiera). Si vrai →
relance routine en mode **Option A dur** (1 prompt/jour cap, jamais
plus).

### 5.4 Garde-fous pour la reprise

Quand la routine redémarre, deux changements à graver dans le
SKILL.md (à éditer avant la première ré-exécution) :

1. **Phase 4 ≤ 1 prompt par audit, sans exception.** Cap dur. Pas
   d'arbitrage Phase 4. Choisir le ratio impact/effort le plus haut
   du backlog cumulé, fin.
2. **Phase 4 doit lister un seul fichier modifié par prompt.** Si le
   prompt touche 3 fichiers, le découper en 3 prompts (mais alors la
   règle 1 oblige à n'en garder qu'un seul — donc dans la pratique :
   1 fichier = 1 prompt = 1 audit, point).

Optionnel mais recommandé : **assouplir temporairement `lint-specs`**
(passage en `continue-on-error: true` pendant 14 jours), pour valider
H2. Si la cadence reprend → c'était bien la friction spec. Re-durcir
ensuite avec un template `tab-<slug>.md` pré-rempli pour minimiser le
coût marginal.

### 5.5 Si Option B ne déclenche pas le redémarrage en 14 jours

À partir du **20/05** (J+14 sans ship malgré pause routine), basculer
en **Option D** (nouvelle, formalisée ce 06/05) :

> **Archiver formellement le projet AI Cockpit comme « passif »** :
> les pipelines backend (Gemini quotidien, Claude hebdo, Strava /
> Withings / Last.fm / Steam / RSS sync) continuent de tourner et
> alimentent Supabase, mais on cesse de produire des audits design,
> des prompts Claude Code, et des roadmap features. Le cockpit reste
> consultable, mais on accepte qu'il a atteint son plateau fonctionnel.

C'est une décision lourde. Elle est notée ici pour rendre le choix
explicite plutôt que de laisser la dérive continuer indéfiniment.

---

## 6. Annexes

### 6.1 Justifications principielles

| Décision | Principe |
|---|---|
| Phase 4 = 0 prompt aujourd'hui | *Eat your own dogfood* — la machine d'audit est elle-même son finding #1 quand elle ne ship pas |
| Section 5 = Option B | *WIP limits* (Reinertsen) — quand le canal d'exécution sature à 0, ajouter du travail entrant aggrave la dette |
| Cap 1 prompt/jour à la reprise | *Choice overload* (Iyengar & Lepper, 2000) — moins d'options = plus de décisions |
| Option D au J+14 | *Forced decision* (Sutherland) — un système qui ne décide pas dérive ; mieux vaut archiver explicitement que dériver implicitement |
| 1 fichier = 1 prompt | *Atomic commits* (Linus) — diff lisible, revert safe, lint vert au premier coup |

### 6.2 Ce que cet audit n'a PAS pu vérifier

- **Pixel-perfect render post-login** : la home, les panels Tier 2 et
  le Jarvis chat nécessitent OAuth Google — non accessible en
  automate. Audit basé sur le code et les CSS.
- **Performance réelle** (Lighthouse / Core Web Vitals) : R5 mérite
  un audit perf dédié.
- **Cause racine du blocage Cowork** (H1-H5 Section 5.2) : seul
  l'utilisateur peut trancher. L'audit a déjà tenté trois calibrages
  (15 → 7 → 3 → 1 → 0 prompts). La donnée manquante n'est pas du
  côté audit, elle est du côté utilisateur.
- **Visualisation des tickets Cowork** : impossible de vérifier H4
  (« la routine ne crée pas de tickets exécutables ») depuis le
  scheduled task isolé.
- **TFT panel (`gaming`)** : non exploré en détail. Reste documentaire.

### 6.3 Notes de scope

- L'audit cible **la rétention quotidienne sur 30 jours**, pas la
  conversion 1ère visite.
- Les prompts — **quand il y en a** — sont écrits pour Claude Code
  (agent autonome). Aujourd'hui : 0 prompt, 1 décision (Section 5).
- **Si la routine n'est pas mise en pause aujourd'hui**, l'audit du
  07/05 produira lui aussi 0 prompt et activera **Option D**
  (archivage projet) à J+14. Cette règle est désormais publique et
  vérifiable, dans la continuité de la doctrine 04/05 + 05/05.

### 6.4 Méta — comment lire cet audit en 30 secondes

Si vous (l'utilisateur) ne lisez qu'une chose, lisez **Section 5.3**.
Tout le reste du document est de la documentation pour la reprise.
Aucun fichier de code n'a besoin d'être touché aujourd'hui — la seule
action utile est de **désactiver le job scheduled** et de **shipper 3
prompts du backlog** dans les jours qui viennent.

---

*Fin du livrable — 06 mai 2026, 17:00 UTC. Audit de l'audit : la
machine a tourné 8 jours, produit ~57 prompts, livré ~6, et atteint
ce matin son point de bascule. Section 5 contient l'unique livrable
actionnable. Bonne décision.*
