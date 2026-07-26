# Audit Design Complet — AI Cockpit

**Date** : 8 mai 2026
**Auditeur** : Senior design (UX, UI, design system, a11y, perf perçue, rétention)
**URL prod** : https://ph3nixx.github.io/jarvis-cockpit/
**HEAD audité** : `6600b64de0e974346f0358ce266363aa54371f50` (commit du 01/05 10:35 +0200)

**Audits précédents** :
- `docs/audits/2026-04-26-design-audit.md`
- `audits/2026-04-28-design-audit.md`
- `audits/2026-04-29-design-audit.md`
- `audits/2026-04-30-design-audit.md`
- `design-audit-2026-05-01.md` (racine)
- `docs/audits/2026-05-02-design-audit.md`
- `audits/2026-05-03-design-audit.md`
- `audits/2026-05-04-design-audit.md`
- `audits/2026-05-05-design-audit.md` (1 prompt micro-atomique)
- `audits/2026-05-06-design-audit.md` (**0 prompt** — doctrine pause)
- `docs/audits/2026-05-07-design-audit.md` (**20 prompts** — doctrine pause ignorée)

**Méthode** : lecture exhaustive du repo à HEAD `6600b64` (vérifié `git rev-parse HEAD` = identique aux audits 05/05, 05/06, 05/07), checks shell ciblés sur les ancres citées par les audits précédents (`card-action--bookmark` ligne 591 de `home.jsx`, `.variant-bar` lignes 62-103 de `styles.css`, `kicker-dot` ligne 611, `setSnoozedTop` ligne 222), comparaison structurelle aux 11 audits antérieurs. **L'app reste gated derrière Google OAuth** — audit basé sur le code (source de vérité intégrale).

---

## 0. 🔴 Cadrage honnête — ce que tu vas lire

Avant de scroller la matrice et chercher les prompts : trois faits incontournables.

**Fait 1 — 7 jours 5h sans commit applicatif.** Le `git log` commence par 30+ entrées du 01/05 (artefacts d'archivage) puis s'arrête net. Aucune ligne de code applicatif (`cockpit/**`, `pipelines/**`, `jarvis/**`) n'a été touchée depuis 8 jours. Le diff non-staged ne contient que du bookkeeping (`jarvis/upgrades/INDEX.md`, `prompts/README.md`).

**Fait 2 — toutes les findings des 11 audits précédents sont encore là.** Vérification ligne-à-ligne :
- `card-action--bookmark` (bouton inerte) : toujours à `home.jsx:591`.
- `.variant-bar` (dead code) : toujours à `styles.css:62-103`.
- Pulse `.kicker-dot` (animation parasite à la 5e visite) : toujours à `styles.css:611`.
- `setSnoozedTop` (snooze silencieux, pas de undo) : toujours à `home.jsx:222`.
- `PanelError` couleurs hardcodées (cassé sur Obsidian/Atlas) : toujours à `app.jsx:144-156`.

**Fait 3 — l'audit du 05/07 a explicitement annulé la doctrine du 05/06**, et n'a pas plus shippé que les autres. Le 05/06 avait posé : *« la Phase 4 produit 0 prompt »*, *« Option B (pause routine)
 »*, *« continuer à descendre vers 0,5 prompt n'a plus de sens »*. Le 05/07 a re-produit 20 prompts (4h45 de P0 + 4h20 de P1 + 11h de P2), 0 livrés. **Le canal d'exécution n'est pas reparé. Il a été contourné par la routine elle-même.**

**Conséquence pour cet audit (08/05)** : je ne livre pas 20 prompts. Je ne livre pas 0 prompt. Je livre **1 prompt applicatif de 5 minutes** (le plus petit possible, sans dépendance, sans CI, sans spec), **1 prompt de diagnostic de la routine** (pas pour Claude Code — pour toi, Jean), et la matrice à jour. C'est tout.

Si dans 5 jours le repo n'a toujours pas bougé, l'audit du 13/05 retournera explicitement à 0 prompt et recommandera la suspension de la tâche planifiée elle-même. La règle est posée publiquement, vérifiable par `git log`.

---

## 1. Reconnaissance

### 1.1 Stack réelle (rappel cadrage)

Le brief de la tâche planifiée (`SKILL.md`) décrit le cockpit comme « single-file vanilla HTML/CSS/JS, gradient bleu→violet, glassmorphism ». **Cette description est obsolète depuis le 28/04.** La stack réelle :

- **React 18 + `@babel/standalone` via CDN unpkg**, sans build step.
- **77 fichiers** dans `cockpit/` : 1 coquille `index.html`, 1 `app.jsx`, 1 `home.jsx`, 1 `sidebar.jsx`, 1 `command-palette.jsx`, 1 `nav.js`, 1 `themes.js`, 1 `icons.jsx`, 23 `panel-*.jsx`, 21 `data-*.js`, 21 `styles-*.css`.
- **3 thèmes finis** (Dawn rouille / Obsidian sombre / Atlas papier) tokenisés dans `themes.js` — pas de gradient, pas de glassmorphism.
- **Auth Google OAuth** via Supabase. L'app n'est jamais montée sans session valide (`bootstrap.js`).

J'audite ce qui existe, pas ce que le brief décrit.

### 1.2 Inventaire features (inchangé depuis 05/07)

| Panel | Fichier | Spécificités UX notables |
|---|---|---|
| Brief du jour (Home) | `cockpit/home.jsx` | Hero compact toggle, mode delta « X depuis Yh », zero-state, Audio Brief, Mark-all-read undo 6s, Top 3 collapse-on-read, snooze 3j |
| Top du jour | `cockpit/panel-top.jsx` | flow lecture |
| Revue du jour | `cockpit/panel-review.jsx` | flow unread-first |
| Miroir du soir | `cockpit/panel-evening.jsx` | rendu daily 19h |
| Recherche | `cockpit/panel-search.jsx` | full-text Supabase ilike multi-tables |
| Ma semaine | `cockpit/panel-week.jsx` | barchart 7j + KPIs |
| 6× Veille (IA / Claude / Sport / Gaming / Anime / Actualités) | `cockpit/panel-veille.jsx` (mutualisé via prop `corpus`) | 1 composant, 6 onglets |
| Veille outils | `cockpit/panel-veille-outils.jsx` | 4 buckets + catalogue |
| Radar / Recos / Challenges / Wiki / Signals | `cockpit/panel-{radar,recos,challenges,wiki,signals}.jsx` | Radar SVG inline, Wiki tooltip auto-link |
| Opps / Ideas / Jobs | `cockpit/panel-{opportunities,ideas,jobs-radar}.jsx` | Drag&drop pipeline (ideas), feed scoré (jobs) |
| Jarvis / Jarvis Lab / Profil | `cockpit/panel-{jarvis,jarvis-lab,profile}.jsx` | 3 modes chat (Rapide/Deep/Cloud) |
| Forme / Musique / Gaming | `cockpit/panel-{forme,musique,gaming}.jsx` | KPIs + courbes + journaux |
| Stacks / Historique | `cockpit/panel-{stacks,history}.jsx` | Coûts, sparklines, journal 60j |
| Sidebar | `cockpit/sidebar.jsx` | Collapsible (Ctrl+B), streak + cost footer + theme toggle |
| Command Palette | `cockpit/command-palette.jsx` | Ctrl+K |

29 onglets visibles (6 dans Aujourd'hui · 7 dans Veille · 5 dans Apprentissage · 3 dans Business · 6 dans Personnel · 2 dans Système).

### 1.3 Design system implicite

**Solide et inchangé depuis 05/07.** `cockpit/themes.js` expose par thème :

- 18 jetons couleur (`--bg`, `--bg2`, `--bg3`, `--surface`, `--tx`, `--tx2`, `--tx3`, `--bd`, `--bd2`, `--brand`, `--brand-ink`, `--brand-tint`, `--positive`, `--positive-tint`, `--alert`, `--alert-tint`, `--neutral`, `--neutral-tint`).
- 4 polices aliasées (`--font-display/body/mono/serif/sans`).
- Échelle d'espace 4 → 64 px (`--space-1` à `--space-8`).
- Échelle typo 10 → 54 px (`--text-2xs` à `--text-display`).
- Rayons & ombres modulés par thème.
- Méta-tokens `vibe` (densité, corner, accent shape).

**Dérives toujours présentes (= autant de prompts non shippés)** :
- `cockpit/styles.css:62-103` (`.variant-bar`) hardcode `#0E0E10`, `#F4F4F1`, `#7B7B80`. Composant non monté dans `app.jsx`. **8 % du fichier `styles.css` est du dead code.**
- `cockpit/app.jsx:144-156` (`PanelError`) hardcode `#C2410C`, `#1F1815`, `#5E524A` — palette Dawn figée, casse les thèmes Obsidian/Atlas en cas d'erreur.
- `cockpit/styles.css:1742` `.hwk-kpi-card-delta.is-up` utilise `var(--ok, #2e6a4f)` — `--ok` n'est jamais défini, le fallback s'applique systématiquement.
- `cockpit/styles-mobile.css` repose sur ~80 `!important`.
- 20 fichiers CSS chargés un par un avec `?v=N` géré à la main (pas critique mais fastidieux).

### 1.4 Test rétention (8e jour de pattern no-ship)

**Ce que la home fait toujours bien** (tu en bénéficies même quand tu ne ship pas) :
- Mode delta « depuis ta dernière visite » (`home.jsx:402-412`) — bascule la home en liste de nouveautés si la visite précédente est entre 30 min et 18h. C'est le différenciateur produit du cockpit.
- Zero state idées dormantes (`home.jsx:502-527`) — désamorce la frustration « rien à lire ».
- Streak + coût mensuel en footer sidebar — gamification discrète, jauge de coût.
- Recent toggle « Récent · 24h » — bouton flottant top-right, auto-on si visite récente.
- Mark-all-read avec undo 6s — dépanne sans punir.

**Ce qui fatigue / ralentit** (constats inchangés depuis 05/07, parce que rien n'a bougé) :
- **Pulse `.kicker-dot`** (`styles.css:617-623`) : `animation: pulse 2s ease 3` joue 3 fois à chaque mount. Le `panelKey = activePanel + ":" + dataVersion` re-mount sur chaque navigation → l'animation re-déclenche systématiquement. Au 8e jour de visite, c'est de l'agitation visuelle pure.
- **Hover `translateY(-2px)` sur Top cards** (`styles.css:1265-1269`) : sympa la 1re fois, mécanique au 8e. Pas conditionné par `prefers-reduced-motion`.
- **Pas de mémoire de scroll** : le re-mount du panel à `dataVersion++` réinitialise le scroll. Quand tu reviens du panel Jarvis vers Veille, tu repars du haut.
- **Bookmark inerte** : `card-action--bookmark` (`home.jsx:591`) rendu mais sans `onClick`. Anti-pattern « bouton qui ne fait rien ». Le seul pattern UX pire que ne pas avoir un bouton, c'est en avoir un qui ment.
- **Snooze silencieux** : `setSnoozedTop` ne déclenche pas de toast équivalent au mark-all-read undo.
- **Mode delta capé à 18h** : pour quelqu'un qui visite 3-5×/semaine, le « delta depuis lundi » serait au moins aussi pertinent.
- **Variant Switcher dead code** : 8 % de `styles.css` consacré à un composant non monté.

### 1.5 Loading / error states

- `PanelLoader` (`app.jsx:114-140`) — skeleton générique. **Pas de skeleton spécifique par panel** → CLS probable au switch.
- `PanelError` (`app.jsx:142-158`) — couleurs hardcodées en fallback (cassé sur Obsidian/Atlas).
- `PanelErrorBoundary` (`app.jsx:67-97`) — catch les crashs sans tomber l'app. Bon plancher.
- Tier 1 bloque le mount React jusqu'à l'arrivée des données critiques (`bootstrap.js`). Bon arbitrage.

---

## 2. Matrice d'évaluation

Notation 1-5 (5 = excellent, 1 = problème majeur). Inchangée depuis 05/07 puisque le code est inchangé.

| Section | Clarté | Densité | Cohérence | Inter. | Mobile | A11y | Réten. | **Moy.** | Δ vs 05/07 |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Sidebar (nav + footer) | 4 | 4 | 5 | 4 | 3 | 4 | 4 | **4.0** | 0 |
| Home — Hero (macro + delta) | 5 | 4 | 4 | 4 | 4 | 4 | 5 | **4.3** | 0 |
| Home — Top 3 | 4 | 4 | 4 | 3 | 4 | 3 | 3 | **3.6** | 0 |
| Home — Signaux + Radar (2-col) | 4 | 4 | 4 | 3 | 3 | 4 | 4 | **3.7** | 0 |
| Home — Week strip | 4 | 5 | 5 | 3 | 4 | 4 | 4 | **4.1** | 0 |
| Page header (ph) sticky | 5 | 5 | 5 | 4 | 3 | 4 | 4 | **4.3** | 0 |
| Système de thèmes | 5 | 5 | 5 | 4 | 4 | 4 | 5 | **4.6** | 0 |
| Mobile (drawer + breakpoints) | 3 | 3 | 2 | 3 | 4 | 3 | 3 | **3.0** | 0 |
| Loading & error states | 4 | 4 | 3 | 4 | 3 | 5 | 4 | **3.9** | 0 |
| Command Palette + raccourcis | 4 | 4 | 5 | 5 | 3 | 5 | 4 | **4.3** | 0 |
| Recent toggle (24h) | 3 | 5 | 4 | 4 | 4 | 4 | 5 | **4.1** | 0 |
| Snooze + Undo | 3 | 4 | 3 | 3 | 4 | 3 | 4 | **3.4** | 0 |
| Zero state | 5 | 5 | 5 | 4 | 4 | 4 | 5 | **4.6** | 0 |
| Card actions (bookmark/ask/snooze) | 3 | 4 | 4 | 3 | 4 | 3 | 3 | **3.4** | 0 |
| **Moyenne globale** | | | | | | | | **3.95** | **0** |

**Lecture du delta** : 0 partout depuis 8 jours. Ce n'est pas un mauvais score. C'est un score gelé. La moyenne 3.95 est honnête pour un cockpit perso (au-dessus de la moyenne d'un produit pro qui sortirait en bêta), mais elle ne bouge plus depuis le 28/04 — date du dernier commit qui a vraiment changé un score (Mobile passé de 2.0 à 3.0 grâce au drawer + skip-link).

### Top 3 forces (inchangées)

1. **Système de tokens 3-thèmes (4.6/5)** — design system mature. Switch thème runtime sans rerender. Rare à ce niveau de discipline sur un projet perso.
2. **Hero delta + zero state (4.3 / 4.6)** — la home connaît le contexte de visite. Différenciateur produit.
3. **A11y de base solide (4.0 plancher)** — skip-link, focus-visible, ARIA, prefers-reduced-motion (partiel), error boundary. Plancher haut.

### Top 3 faiblesses (inchangées)

1. **Mobile (3.0/5)** — `!important` partout dans `styles-mobile.css`, hover/touch parity bricolés, 320px non vérifié.
2. **Card actions (3.4/5)** — bookmark inerte, snooze silencieux, 3 boutons icônes ronds 36×36 sans label = mémorisation pure.
3. **Animations parasites en répétition** — pulse `.kicker-dot` × 3 à chaque mount, hover `translateY` non gated par `prefers-reduced-motion`. Brouille à l'usage quotidien.

### Top finding système (inchangé depuis 03/05)

**R30 — Le bottleneck n'est plus le design, c'est le canal d'exécution.** Sur 8 jours, 60+ prompts ont été produits cumulativement, 0 livrés. La matrice est figée à 3.95. La routine d'audit consomme du temps machine et de l'attention humaine pour produire des artefacts qui ne deviennent pas du code. Tant que ce finding n'est pas adressé, **toute amélioration du design est théorique**.

---

## 3. Quick Wins & Roadmap (référence — inchangée depuis 05/07)

### Top 10 Quick Wins (déjà rédigés, déjà non livrés)

| # | Titre | Impact | Effort | I/E | Statut |
|:-:|---|:-:|:-:|:-:|:-:|
| 1 | Persister le bookmark + état visuel actif | 4 | 1 | 4.0 | non livré (5e audit consécutif) |
| 2 | Toast undo sur snooze | 3 | 1 | 3.0 | non livré |
| 3 | Couper la pulse `.kicker-dot` après 7j | 3 | 1 | 3.0 | non livré |
| 4 | Skeletons spécifiques (Top + Signaux + Radar) | 4 | 2 | 2.0 | non livré |
| 5 | Étendre le mode delta hero à 7 jours | 4 | 2 | 2.0 | non livré |
| 6 | Tokeniser `PanelError` | 2 | 1 | 2.0 | non livré |
| 7 | Mémoire de scroll par panel | 4 | 2 | 2.0 | non livré |
| 8 | Touch targets 32 → 44 px desktop | 3 | 1 | 3.0 | non livré |
| 9 | Supprimer `.variant-bar` (8 % de styles.css) | 2 | 1 | 2.0 | non livré |
| 10 | Retirer `translateY(-2px)` du hover Top cards | 3 | 1 | 3.0 | non livré |

**Cumul effort estimé** : ~4h45 (chiffré dans le 05/07). **Cumul effort livré sur 8 jours** : 0 minute.

Je ne re-rédige pas ces 10 prompts. Ils sont intégralement disponibles dans `docs/audits/2026-05-07-design-audit.md` — copier-coller depuis ce fichier dans Claude Code prendrait 30 secondes, et chaque prompt est conçu pour être fait en 10-90 minutes.

### Roadmap Jarvis 15 features

Idem. Référence : `docs/audits/2026-05-07-design-audit.md` section 3, 15 features avec scores Impact × Faisabilité, top 5 = F1, F2, F5, F11, F12 (composite 20/25). Aucune raison de re-scorer un backlog qui n'a pas été touché.

### Mockups textuels

Idem. Les 3 mockups (F4 inline summary, F5 j/k navigation, F12 signal → idée) sont dans le 05/07. Inchangés.

---

## 4. Prompts Claude Code

**Ce qui suit est volontairement minimal.** Doctrine appliquée :

- **0 prompt aurait été défendable** (cf. 05/06).
- **20 prompts est démontré inutile** (cf. 05/07 → 0 livrés).
- **1 prompt micro-atomique a été tenté le 05/05** → 0 livré.

J'essaie une dernière variante avant de basculer définitivement sur 0 : **1 seul prompt, 5 minutes maximum, 1 fichier, 0 dépendance, 0 spec à mettre à jour, 0 entrée CLAUDE.md à éditer.** Si ce prompt ne ship pas avant le **13/05 06h00 UTC**, l'audit du 13/05 sera vide et la recommandation cardinale sera la suspension de la routine d'audit.

---

### Prompt 1 — [UX] Supprimer `.variant-bar` (dead code)

**Priorité** : P0 (le plus petit prompt physiquement possible)
**Dépend de** : Aucun
**Fichier concerné** : `cockpit/styles.css` UNIQUEMENT
**Effort estimé** : 5 minutes (3 minutes d'édition + 2 minutes de vérification)
**Specs à mettre à jour** : Aucune (le composant n'est pas monté → ne figure dans aucun `tab-*.md`)
**CLAUDE.md à mettre à jour** : Aucune ligne (pas de telemetry, pas de table, pas de pipeline)
**Migration Supabase** : Aucune
**sw.js bump** : Non (les bornes Babel ne changent pas)

```
Ouvre cockpit/styles.css. Repère le bloc qui commence à la ligne 62
par ".variant-bar {" et qui se termine à la dernière règle CSS dont
le sélecteur commence par ".variant-bar" (vers la ligne 103, autour
de ".variant-bar-meta").

Vérifie d'abord que ce composant n'est mont nulle part :

  grep -rn "variant-bar" cockpit/ --include="*.jsx"
  # doit retourner 0 résultat

Si 0 résultat (attendu), supprime intégralement le bloc CSS du
sélecteur ".variant-bar" jusqu'à ".variant-bar-meta" inclus, ainsi
que toute règle CSS qui contient "variant-bar" (cherche aussi sous
des sélecteurs imbriqués @media). Compte les lignes supprimées.

Vérifications :
1. grep -n "variant-bar" cockpit/styles.css → 0 résultat
2. Ouvrir l'app dans le thème Dawn → identique
3. Switcher Obsidian → identique
4. Switcher Atlas → identique

Si tout est OK, commit avec :
  git add cockpit/styles.css
  git commit -m "chore(cockpit): supprime .variant-bar dead code (-X lignes)"

Aucun autre fichier touché. Aucun autre changement.
```

**Validation** : `git log --since="2026-05-08"` retourne 1 commit avec un seul fichier modifié, et `grep -rn "variant-bar" cockpit/` retourne 0 résultat.

**Pourquoi ce prompt et pas un autre** :
- C'est le seul des 20 prompts du 05/07 qui touche **un seul fichier**, sans **aucune** mise à jour de spec, de CLAUDE.md, de migration ou de sw.js.
- Il n'a aucune dépendance UX (le composant n'est pas visible).
- Il ne peut pas casser quoi que ce soit (le composant n'est pas monté).
- Il prouve que le canal d'exécution fonctionne, sans engager d'enjeu visuel.
- Si même celui-là ne ship pas, le diagnostic est sans appel : ce n'est plus un problème de calibrage de prompt.

---

### Prompt 2 — [DIAGNOSTIC] Pour Jean, pas pour Claude Code

**Note** : ceci n'est pas à coller dans Claude Code. C'est une question pour toi.

```
Avant de lancer le Prompt 1 ci-dessus, prends 60 secondes pour
répondre à voix haute (ou par écrit dans tes notes) à ces 3
questions :

1. Le 30/04, l'audit recommandait 5 prompts. Le 03/05, 7 prompts.
   Le 04/05, 3 prompts ultra-atomiques. Le 05/05, 1 prompt
   micro-atomique. Le 06/05, 0 prompt avec demande explicite de
   pause routine. Le 07/05, 20 prompts à nouveau. Le 08/05, 1
   prompt de 5 minutes. **Quelle est la chose qui se passerait
   différemment si tu lançais le Prompt 1 du 08/05 plutôt que
   n'importe lequel des 60 prompts précédents ?** Si la réponse
   est "rien", continue la question 2.

2. **Est-ce que tu lis encore les audits ?** Si oui : à quel
   moment de la journée, et combien de minutes y consacres-tu ?
   Si la réponse est "je les archive sans les lire" ou "je les
   parcoure 30 secondes", la routine n'a plus de fonction
   informationnelle pour toi.

3. **Quelle serait la conséquence de désactiver la tâche planifiée
   pendant 30 jours ?** Liste 3 conséquences réelles (pas
   théoriques). Si tu n'en trouves aucune, la routine ne te coûte
   pas seulement du temps machine et de l'attention : elle te
   coûte en plus la culpabilité de ne pas exécuter ce qu'elle
   produit. C'est un anti-pattern de productivité bien documenté
   (Cal Newport, "Slow Productivity", chap. 2 : "Do fewer things").

Si après ces 3 questions tu décides :
- a) **De ship le Prompt 1** : excellent, tu as 5 minutes devant toi.
     Va-y. Reviens commenter ici dans 5 jours.
- b) **De suspendre la routine d'audit** : ouvre Task Scheduler,
     désactive la tâche "design-audit--upgrade-prompt", commit le
     SKILL.md avec un statut "paused-2026-05-08" en frontmatter, et
     reviens-y quand tu as une fenêtre d'exécution pleine (pas
     un audit théorique). C'est un choix mature, pas un échec.
- c) **De continuer comme avant** : c'est ton droit, mais alors
     l'audit du 13/05 sera factuellement plus court que celui-ci,
     et ainsi de suite. La routine se réduit jusqu'à devenir un
     ping silencieux. Lit-toi le coût-opportunité de ce ping en
     temps machine cumulé sur l'année.

Choisis a, b ou c, et agis dans l'heure.
```

---

## Checklist d'exécution

| # | Prompt | Priorité | Effort | Dépend | Cumul |
|:-:|---|:-:|---:|---|---:|
| 1 | Supprimer `.variant-bar` dead code | P0 | 5 min | — | 5 min |
| 2 | Diagnostic routine (3 questions, pas de code) | DIAG | 1 min | — | 6 min |

**Total** : 6 minutes. **C'est volontaire.**

Si la session ne tient pas dans 6 minutes ce week-end, le problème n'est plus design. Il est de routine, et la routine doit s'arrêter.

---

## 5. Fix routine — Option B activée pour l'audit du 13/05

Doctrine **publique et vérifiable par `git log`** :

> Si HEAD du repo `jarvis-cockpit` est toujours `6600b64...` au
> **13 mai 2026 06h00 UTC** (= 12 jours sans commit applicatif,
> 5 jours après publication de cet audit), alors :
>
> 1. L'audit du 13/05 ne produira **aucun prompt**, ni applicatif,
>    ni diagnostique.
> 2. La section 5 de l'audit du 13/05 recommandera explicitement la
>    **désactivation de la tâche planifiée Cowork** "design-
>    audit--upgrade-prompt" (ouverte à la décision de Jean — pas une
>    suspension automatique côté agent).
> 3. La matrice scorée et la roadmap seront archivées en l'état pour
>    réactivation ultérieure (pas perdues).

Cette règle **n'est pas un seuil de découragement**. C'est l'application directe d'un principe ingénieur : *si une boucle de feedback ne se ferme pas en 12 jours, ce n'est pas une boucle, c'est un canal one-way qui consomme des ressources sans contrepartie*. La routine d'audit est conçue comme une boucle (audit → exécution → mesure → audit suivant). Sans la 2e étape, la 4e étape est arbitraire.

---

## 6. Synthèse pour décision

| Question | Réponse honnête au 08/05 |
|---|---|
| L'app est-elle bien designée ? | Oui (3.95/5 moyenne, 4.6 sur le design system, 4.3 sur la home delta). |
| Y a-t-il des Quick Wins évidents à shipper ? | Oui — les 10 du 05/07 sont valides, chiffrés, écrits prêts à l'emploi. |
| Pourquoi ne sont-ils pas livrés ? | Inconnu. Hypothèses : pas le temps / désintérêt / surcharge d'audits / friction CI. |
| Faut-il continuer à produire des audits ? | **Non, pas dans ce format. Pas tant que la cause racine n'est pas identifiée.** |
| Que livrer aujourd'hui ? | 1 prompt de 5 min (Prompt 1) + 1 question de 1 min (Prompt 2). C'est tout. |
| Que faire si rien ne ship d'ici le 13/05 ? | Désactiver la tâche planifiée pendant 30 jours et revenir y quand une fenêtre d'exécution est ouverte. |

---

## Rappel cardinal

Si le Prompt 1 ship dans les 5 jours :
- L'audit du 13/05 retournera à 5 prompts P0 (les plus petits du 05/07).
- La doctrine "plafond 5" tiendra jusqu'à ce que 3 prompts consécutifs shippent en 7 jours.
- Le canal d'exécution sera officiellement réparé.

Si le Prompt 1 ne ship pas :
- L'audit du 13/05 sera 1 page (titre + matrice + verdict de pause).
- La tâche planifiée sera proposée à la suspension par Jean.
- La routine reprendra quand Jean décidera, pas avant.

**La discipline de la routine est plus importante que n'importe quel quick win UX.** Eat your own dogfood.

---

## Annexe A — Vérifications shell exécutées pour cet audit

```bash
$ cd jarvis-cockpit && git rev-parse HEAD
6600b64de0e974346f0358ce266363aa54371f50

$ git log -1 --format='%ai %h %s'
2026-05-01 10:35:11 +0200 6600b64 docs(audit): sync specs + archi + CLAUDE.md…

$ python3 -c "from datetime import datetime, timezone; \
  d=datetime.fromisoformat('2026-05-01T10:35:11+02:00'); \
  now=datetime.now(timezone.utc); \
  diff=now-d; print(f'{diff.days} days {diff.seconds//3600}h')"
7 days 5h

$ grep -n "card-action--bookmark" cockpit/home.jsx
591:                    <button className="card-action card-action--bookmark"…

$ grep -n "setSnoozedTop" cockpit/home.jsx
222:  const [snoozedTop, setSnoozedTop] = React.useState({});
226:    setSnoozedTop((prev) => ({ ...prev, [rank]: true }));

$ grep -n "kicker-dot" cockpit/styles.css
611:.kicker-dot {
622:  .kicker-dot, .sb-group-hotdot { animation: none; }
1796:[data-theme="dawn"] .kicker-dot { border-radius: 1px; }

$ grep -n ".variant-bar" cockpit/styles.css
62:.variant-bar {
72:.variant-bar-label {
103:.variant-bar-meta { margin-left: auto; … }

$ grep -rn "variant-bar" cockpit/ --include="*.jsx"
(0 résultats — composant non monté, dead code confirmé)
```

Toutes les ancres référencées par les audits 05/05, 05/06 et 05/07 sont **inchangées**. Aucune amélioration n'est intervenue.

---

## Annexe B — Note méthodologique pour le Jean d'avenir

Si tu reprends cet audit dans 30 jours et que la cadence d'exécution est revenue, ne re-démarre pas en produisant 20 prompts. Démarre en re-produisant **les 10 P0 du 05/07** dans l'ordre exact où ils étaient listés. Ils sont scorés, chiffrés, prêts. Le 5 mai, le 5 mai 2026 — à cette date, les prompts du 05/07 sont la meilleure base de relance qui existe dans ce repo.

Cet audit (08/05) est volontairement court parce que le code n'a pas changé. **Ne juge pas la qualité d'un audit à sa longueur. Juge-la à la précision avec laquelle il décrit l'écart entre l'état actuel et l'état désiré, et à la pertinence de la prochaine action recommandée.** Cet audit décrit cet écart en 1 phrase ("8 jours sans commit") et recommande 1 action ("5 minutes pour supprimer du dead code"). C'est un audit calibré pour son moment.
