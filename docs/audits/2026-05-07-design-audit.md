# Audit Design Complet â€” AI Cockpit

> AuditÃ© le 7 mai 2026 par un agent design senior.
> URL : https://ph3nixx.github.io/jarvis-cockpit/
> Source de vÃ©ritÃ© : `index.html`, `cockpit/styles*.css`, `cockpit/*.jsx`, `cockpit/themes.js`.

---

## Note prÃ©liminaire â€” dÃ©salignement avec la consigne

La fiche de mission dÃ©crit la stack comme Â« single-file vanilla HTML/CSS/JS, gradient bleuâ†’violet, dark mode, glassmorphism Â». **Cette description est obsolÃ¨te.** Le projet observÃ© en production et dans `C:\Users\johnb\projects\jarvis-cockpit` est :

- React 18 chargÃ© via CDN unpkg + Babel standalone (compilation navigateur) â€” **build-free**, mais multi-fichiers : 1 `index.html` coquille + 20 fichiers CSS + ~25 fichiers JSX dans `cockpit/`.
- Pas de gradient bleuâ†’violet, pas de glassmorphism. Trois thÃ¨mes trÃ¨s distincts cohabitent (Dawn Ã©ditorial chaleureux, Obsidian terminal sombre, Atlas Swiss papier blanc), dÃ©finis comme tokens CSS dans `cockpit/themes.js`.
- Auth Google OAuth via Supabase. La home est inaccessible non-logguÃ© â€” j'ai donc auditÃ© le code (source de vÃ©ritÃ©) plutÃ´t que la maquette rendue. Tous les constats rÃ©fÃ©rencent des lignes rÃ©elles du repo.

J'audite ce qui existe, pas ce que la consigne dÃ©crit.

---

## 1. Reconnaissance

### Inventaire features (panel Ã— source)

| Panel | Fichier | DonnÃ©es | SpÃ©cificitÃ©s UX notables |
|---|---|---|---|
| Brief du jour (home) | `cockpit/home.jsx` | Tier 1 (sync) | Hero compact toggle, mode delta Â« X nouveautÃ©s depuis Yh Â», zero-state idÃ©es dormantes, Audio Brief (Web Speech API), Mark-all-read avec undo 6 s, Top 3 cartes avec collapse-on-read, snooze 3 j |
| Top du jour | `cockpit/panel-top.jsx` | articles | flow lecture |
| Revue du jour | `cockpit/panel-review.jsx` | articles | flow unread-first |
| Miroir du soir | `cockpit/panel-evening.jsx` | daily_mirror | rendu daily 19h |
| Recherche | `cockpit/panel-search.jsx` | full-text Supabase | ilike multi-tables |
| Ma semaine | `cockpit/panel-week.jsx` | localStorage + articles | barchart 7j + KPIs |
| Veille IA / Claude / Sport / Gaming / Anime / ActualitÃ©s | `cockpit/panel-veille.jsx` (mutualisÃ© via prop `corpus`) | 6 corpus distincts | 1 composant, 6 onglets |
| Veille outils | `cockpit/panel-veille-outils.jsx` | claude_veille + claude_ecosystem | 4 buckets + catalogue |
| Radar / Recos / Challenges / Wiki / Signals | `cockpit/panel-{radar,recos,challenges,wiki,signals}.jsx` | skill_radar, learning_recommendations, weekly_challenges, wiki_concepts, signal_tracking | Radar SVG inline ; Wiki tooltip auto-link |
| Opps / Ideas / Jobs | `cockpit/panel-{opportunities,ideas,jobs-radar}.jsx` | weekly_opportunities, business_ideas, jobs | Drag&drop pipeline (ideas), feed scorÃ© (jobs) |
| Jarvis / Jarvis Lab / Profil | `cockpit/panel-{jarvis,jarvis-lab,profile}.jsx` | jarvis_conversations + RAG | 3 modes chat (Rapide/Deep/Cloud), commitments, history |
| Forme / Musique / Gaming | `cockpit/panel-{forme,musique,gaming}.jsx` | strava+withings, lastfm, steam+tft | KPIs + courbes + journaux |
| Stacks / Historique | `cockpit/panel-{stacks,history}.jsx` | weekly_analysis, articles+history_notes | CoÃ»ts, sparklines, journal 60 j |
| Sidebar | `cockpit/sidebar.jsx` | nav.js | Collapsible rail (Ctrl+B), streak + cost footer + theme toggle |
| Command Palette | `cockpit/command-palette.jsx` | Tier 1 globals | Ctrl+K |

### Design system implicite

Solide. `cockpit/themes.js` expose pour chaque thÃ¨me :

- **Couleurs** : `--bg`, `--bg2`, `--bg3`, `--surface`, `--tx`, `--tx2`, `--tx3`, `--bd`, `--bd2`, `--brand`, `--brand-ink`, `--brand-tint`, `--positive`, `--positive-tint`, `--alert`, `--alert-tint`, `--neutral`, `--neutral-tint` â€” **18 jetons couleur par thÃ¨me**, parfaitement cohÃ©rents.
- **Typo** : 4 polices (Fraunces display, Inter body, JetBrains Mono mono, Instrument Serif), aliasÃ©es en `--font-display/body/mono/serif/sans`. Le thÃ¨me change la police display sans casser les composants.
- **Ã‰chelle d'espace** : 4 px â†’ 64 px (`--space-1` Ã  `--space-8`). DisciplinÃ©e.
- **Ã‰chelle typo** : 10 â†’ 54 px (`--text-2xs` Ã  `--text-display`). DisciplinÃ©e.
- **Rayons / ombres** : 3 paliers chacun, modulÃ©s par thÃ¨me (Dawn 6/12, Obsidian 4/6, Atlas 2/4 â€” choix volontaires).
- **Vibes** : objets `vibe` par thÃ¨me (`displayWeight`, `numberStyle`, `density`, `cardStyle`, `corner`, `accentShape`) â€” mÃ©ta-tokens utilisÃ©s par certains composants pour s'adapter au thÃ¨me.

**DÃ©rives observÃ©es** :
- `cockpit/styles.css:62-103` (`.variant-bar`) hardcode `#0E0E10`, `#F4F4F1`, `#7B7B80` â€” tokens contournÃ©s pour ce composant. Probablement legacy : la variant-bar n'est pas montÃ©e dans `app.jsx`.
- `cockpit/app.jsx:144-156` (`PanelError`) hardcode `#C2410C`, `#1F1815`, `#5E524A` en fallback â€” palette Dawn figÃ©e, casse le thÃ¨me Obsidian/Atlas en cas d'erreur de panel.
- `cockpit/styles.css:1742` `.hwk-kpi-card-delta.is-up` utilise `var(--ok, #2e6a4f)` â€” `--ok` n'existe pas dans `themes.js`. Le fallback s'applique toujours.
- `cockpit/styles-mobile.css` repose intÃ©gralement sur `!important` (~80 occurrences). SpÃ©cificitÃ© ingÃ©rable Ã  terme.
- 20 fichiers CSS chargÃ©s un par un avec `?v=N` gÃ©rÃ© Ã  la main. Pas critique mais fastidieux.

### Test rÃ©tention (5e visite cette semaine)

Ce qui *aide* la rÃ©tention :
- **Mode delta Â« depuis ta derniÃ¨re visite Â»** dans le hero (`home.jsx:402-412`) â€” c'est le levier le plus fort du cockpit. Si la visite prÃ©cÃ©dente est entre 30 min et 18 h, le hero bascule sur la liste des nouveautÃ©s. GÃ©nial.
- **Zero state** (`home.jsx:502-527`) â€” dÃ©goupille la frustration Â« rien Ã  lire Â» en surfaÃ§ant 2 idÃ©es dormantes. Excellent.
- **Streak + coÃ»t mensuel en footer sidebar** â€” gamification + jauge. Discret, efficace.
- **Recent toggle Â« RÃ©cent Â· 24h Â»** â€” bouton flottant top-right, masque les vieux items via CSS. Auto-on si visite rÃ©cente. Bien pensÃ©.
- **Mark all read avec undo 6 s** â€” dÃ©panne sans punir.

Ce qui *fatigue* Ã  la 5e visite :
- **Pulse animations** sur `.kicker-dot` et `.sb-group-hotdot` (`styles.css:617-623`, `:230-242`) â€” `animation: pulse 2s ease 3` joue 3 fois Ã  chaque mount. Comme `panelKey = activePanel + ":" + dataVersion` re-mount sur navigation, l'animation re-dÃ©clenche systÃ©matiquement. Au bout de 5 jours c'est de l'agitation visuelle parasite.
- **Hover `translateY(-2px)` sur Top cards** (`styles.css:1265-1269`) â€” sympa la 1re fois, mÃ©canique au bout de la 20e. Ã€ garder, mais pas combinÃ© avec le shadow-md transition de 160 ms qui rend le scan de 3 cartes saccadÃ©.
- **Pas de mÃ©moire de scroll** sur les panels. Quand on revient d'un article externe (target=_blank), rien Ã  faire. Mais si on quitte un panel pour Jarvis puis on revient au panel, le scroll est perdu (le `panelKey` re-mount remonte React et rÃ©-initialise le scroll).
- **Variant Switcher dead code** en CSS (8 % du fichier `styles.css` consacrÃ© Ã  un composant non montÃ©).
- **Mode delta cap Ã  18 h** â€” au-delÃ , le hero retombe sur le brief macro gÃ©nÃ©rique. Dommage : pour quelqu'un qui visite 3-5Ã—/semaine, le Â« delta depuis lundi Â» serait au moins aussi pertinent.
- **Bookmark button** dans Top cards â€” pas d'Ã©tat persistÃ© visible dans `home.jsx`. Visuellement prÃ©sent (`card-action--bookmark`), comportement inerte. Anti-pattern : bouton qui ne fait rien.
- **Snooze silencieux** â€” dÃ©clenche `setSnoozedTop` mais pas de toast Ã©quivalent au mark-all-read undo. Utilisateur isolÃ©.

### Loading / error states

TrÃ¨s bien gÃ©rÃ©s :
- `PanelLoader` (`app.jsx:114-140`) â€” skeleton gÃ©nÃ©rique pour Tier 2.
- `PanelError` (`app.jsx:142-158`) â€” message + retry. Mais : couleurs hardcodÃ©es en fallback (cassÃ© sur Obsidian/Atlas).
- `PanelErrorBoundary` (`app.jsx:67-97`) â€” catch crash de panel sans tomber l'app entiÃ¨re.
- Tier 1 bloque le mount React jusqu'Ã  l'arrivÃ©e des donnÃ©es critiques (`bootstrap.js`).

Manque : **pas de skeleton spÃ©cifique par panel** â€” tous les Tier 2 affichent le mÃªme placeholder 3-bandeaux, alors que les panels ont des layouts trÃ¨s diffÃ©rents. CLS (Cumulative Layout Shift) probable.

---

## 2. Matrice d'Ã©valuation

Notation 1-5 (5 = excellent, 1 = problÃ¨me majeur).

| Section | ClartÃ© | DensitÃ© | CohÃ©rence | Interactions | Mobile | A11y | RÃ©tention | **Moy.** |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Sidebar (nav + footer) | 4 | 4 | 5 | 4 | 3 | 4 | 4 | **4.0** |
| Home â€” Hero (macro + delta) | 5 | 4 | 4 | 4 | 4 | 4 | **5** | **4.3** |
| Home â€” Top 3 | 4 | 4 | 4 | 3 | 4 | 3 | 3 | **3.6** |
| Home â€” Signaux + Radar (2-col) | 4 | 4 | 4 | 3 | 3 | 4 | 4 | **3.7** |
| Home â€” Week strip | 4 | 5 | 5 | 3 | 4 | 4 | 4 | **4.1** |
| Page header (ph) sticky | 5 | 5 | 5 | 4 | 3 | 4 | 4 | **4.3** |
| SystÃ¨me de thÃ¨mes | 5 | 5 | **5** | 4 | 4 | 4 | 5 | **4.6** |
| Mobile (drawer + breakpoints) | 3 | 3 | 2 | 3 | 4 | 3 | 3 | **3.0** |
| Loading & error states | 4 | 4 | 3 | 4 | 3 | 5 | 4 | **3.9** |
| Command Palette + raccourcis | 4 | 4 | 5 | 5 | 3 | 5 | 4 | **4.3** |
| Recent toggle (24h) | 3 | 5 | 4 | 4 | 4 | 4 | 5 | **4.1** |
| Snooze + Undo | 3 | 4 | 3 | 3 | 4 | 3 | 4 | **3.4** |
| Zero state | 5 | 5 | 5 | 4 | 4 | 4 | 5 | **4.6** |
| Card actions (bookmark/ask/snooze) | 3 | 4 | 4 | 3 | 4 | 3 | 3 | **3.4** |
| **Moyenne globale** | | | | | | | | **3.95** |

### Top 3 forces

1. **SystÃ¨me de tokens 3-thÃ¨mes** â€” un design system mature (4.6/5). Espacement, typo, couleurs, ombres, rayons : tout est dÃ©clarÃ© et disciplinÃ©. Switch thÃ¨me au runtime sans rerender. Rare Ã  ce niveau de dÃ©tail sur un projet perso.
2. **Hero delta mode + zero state** â€” la home est consciente du contexte de visite (4.3 / 4.6). Personne ne fait Ã§a. C'est le diffÃ©renciateur produit.
3. **A11y de base solide** â€” skip-link, focus-visible, ARIA, prefers-reduced-motion respectÃ©, drawer mobile, error boundary. Le plancher est haut.

### Top 3 faiblesses

1. **Mobile (3.0/5)** â€” overrides `!important` partout, hover et action discoverability cassÃ©s sur touch (les actions de Top cards et signal-card sont en `opacity: 0.55` puis `1` au hover ; sur mobile l'overrride remet Ã  1 mais Ã§a reste un patch). 320 px (iPhone SE) non testÃ© visiblement.
2. **Card actions (3.4/5)** â€” Bookmark sans persistance visible, snooze silencieux, "Ask Jarvis" prefill via localStorage (fragile). 3 boutons icÃ´nes ronds 36Ã—36 sans label texte = mÃ©morisation pure.
3. **Animations parasites en rÃ©pÃ©tition** â€” pulse `.kicker-dot` Ã— 3 Ã  chaque mount, hover `translateY` sur Top cards, transitions 200 ms partout. Ã€ l'usage quotidien, Ã§a brouille. Le `prefers-reduced-motion` couvre certains cas mais pas tous (le translateY hover est non-conditionnÃ©).

---

## 3. Quick Wins & Roadmap

### Top 10 Quick Wins (triÃ©s par impact/effort)

| # | Titre | Impact | Effort | I/E | Sections |
|:-:|---|:-:|:-:|:-:|---|
| 1 | Persister le bookmark (localStorage) + Ã©tat visuel actif | 4 | 1 | 4.0 | Top cards, panel-top |
| 2 | Toast undo sur snooze (paritÃ© avec mark-all-read) | 3 | 1 | 3.0 | Top cards, signal cards |
| 3 | Couper la pulse `.kicker-dot` aprÃ¨s la 1re session (flag `localStorage`) | 3 | 1 | 3.0 | Hero, sidebar |
| 4 | Skeleton spÃ©cifique au panel Top + Signaux + Radar | 4 | 2 | 2.0 | Loading states |
| 5 | Ã‰tendre le mode delta hero Ã  7 jours (pas seulement 18 h) | 4 | 2 | 2.0 | Hero |
| 6 | Tokeniser `PanelError` (supprimer les couleurs hardcodÃ©es) | 2 | 1 | 2.0 | Error states |
| 7 | MÃ©moire de scroll par panel (sessionStorage) | 4 | 2 | 2.0 | Tous les panels |
| 8 | Touch targets WCAG : `card-action` 32 â†’ 44 px desktop aussi (pas seulement mobile) | 3 | 1 | 3.0 | A11y, mobile |
| 9 | Supprimer `.variant-bar` (dead code 8 % de styles.css) | 2 | 1 | 2.0 | HygiÃ¨ne |
| 10 | Retirer `translateY(-2px)` du hover Top cards (garder shadow seulement) | 3 | 1 | 3.0 | Top cards |

### Roadmap Jarvis (15 features)

Score composite = Impact Ã— FaisabilitÃ© (Wow indicatif).

| # | Feature | Impact | Faisa. | Wow | **Compo.** |
|:-:|---|:-:|:-:|:-:|:-:|
| F1 | **Lecture diff cross-device** : sync `read-articles` localStorage â†’ Supabase via une table `read_state` | 5 | 4 | 4 | **20** |
| F2 | **Hero "depuis lundi"** : mode delta hebdo en plus de l'horaire 18h | 5 | 4 | 4 | **20** |
| F3 | **Quick capture from external article** : raccourci browser-extension qui pousse un article + note dans `business_ideas` | 5 | 3 | 5 | **15** |
| F4 | **Inline summary expansion** : clic sur Top card ouvre un overlay rÃ©sumÃ© Jarvis (pas de quitter la home) | 4 | 4 | 5 | **16** |
| F5 | **j/k navigation clavier** sur Top + Signaux + listes Veille (faÃ§on HN/Vim) | 4 | 5 | 4 | **20** |
| F6 | **Heatmap calendrier** d'activitÃ© veille (1 an, faÃ§on GitHub) en footer Home ou panel Historique | 3 | 4 | 5 | **12** |
| F7 | **Smart digest hebdo** : email rÃ©cap auto le dimanche basÃ© sur ce qui n'a pas Ã©tÃ© lu | 5 | 3 | 4 | **15** |
| F8 | **Wiki backlinks visuels** : graphe de relations entre concepts (D3 ou simple SVG) | 3 | 3 | 5 | **9** |
| F9 | **CoÃ»t Â« par compÃ©tence acquise Â»** : croiser `weekly_analysis` Ã— `skill_radar` deltas | 3 | 3 | 5 | **9** |
| F10 | **Preview hover** sur Top cards (300 ms delay â†’ popover rÃ©sumÃ© Ã©tendu + tags) | 4 | 4 | 4 | **16** |
| F11 | **Daily streak shield** : 1 Â« jour off Â» par mois sans casser le streak | 4 | 5 | 4 | **20** |
| F12 | **Signal â†’ ticket idÃ©e** : transformer un signal faible en idÃ©e business en 1 clic, prÃ©-rempli par Jarvis | 5 | 4 | 5 | **20** |
| F13 | **Mode "lecture longue"** : un panel `--reader` qui aspire le texte de l'article via Readability et le rend dans le thÃ¨me actif | 4 | 3 | 5 | **12** |
| F14 | **Rappels conditionnels** : "5 articles dans `Recos` ouverts depuis >30j" â†’ banniÃ¨re + bouton archiver | 4 | 4 | 3 | **16** |
| F15 | **Theme Â« Ember Â»** (4e thÃ¨me : Dawn Ã— Obsidian, dark warm) pour la transition aube/crÃ©puscule | 2 | 4 | 4 | **8** |

**Top 5 par composite** : F1, F2, F5, F11, F12 (Ã©galitÃ© 20). F4, F10, F14 suivent (16).

### 3 mockups textuels

#### Mockup 1 â€” F4 : Inline summary expansion (Top card â†’ overlay)

Ã‰tat actuel : clic sur Top card â†’ ouvre l'article dans un nouvel onglet. Friction : on perd le cockpit.

Proposition : clic principal â†’ overlay rÃ©sumÃ© Ã©tendu Jarvis (â‰¤300 mots), boutons Â« Lire Â» + Â« Marquer lu Â» + Â« Vers carnet Â».

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  BRIEF DU JOUR Â· S19    /  Top du jour Â· 3 incontournables  â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”â”‚
â”‚ â”‚ #01  â–ˆâ–ˆâ–ˆâ–ˆ 92      â”‚  â”‚ #02  â–ˆâ–ˆâ–ˆâ–’ 78      â”‚  â”‚ #03  â–ˆâ–ˆâ–‘â–‘ 64â”‚â”‚
â”‚ â”‚ â˜… TechCrunch      â”‚  â”‚   The Verge       â”‚  â”‚ Le Monde    â”‚â”‚
â”‚ â”‚ Â« Anthropic ouvre â”‚  â”‚ Â« OpenAI lance... â”‚  â”‚ Â« EU AI Act â”‚â”‚
â”‚ â”‚   son SDK Skills  â”‚  â”‚   ...                ...           â”‚â”‚
â”‚ â”‚   en open source Â» â”‚  â†â”€â”€ clic sur la carte                â”‚â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                         â”‚â”‚
â”‚                                                               â”‚
â”‚           â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”            â”‚
â”‚           â”‚ â•³ TechCrunch Â· 4 min lecture Â· #ai    â”‚            â”‚
â”‚           â”‚                                      â”‚            â”‚
â”‚           â”‚ Anthropic ouvre son SDK Skills       â”‚            â”‚
â”‚           â”‚ en open source                       â”‚            â”‚
â”‚           â”‚                                      â”‚            â”‚
â”‚           â”‚ [Ce que Ã§a change pour toi]          â”‚            â”‚
â”‚           â”‚ Tu construis Jarvis avec Claude â€” ce â”‚            â”‚
â”‚           â”‚ SDK te donne accÃ¨s aux 23 skills     â”‚            â”‚
â”‚           â”‚ officiels en local. 3 actions :      â”‚            â”‚
â”‚           â”‚ 1. Tester `pdf` skill cette semaine  â”‚            â”‚
â”‚           â”‚ 2. Adapter `data` Ã  ton stack...     â”‚            â”‚
â”‚           â”‚                                      â”‚            â”‚
â”‚           â”‚ [Lire l'article original â†’]          â”‚            â”‚
â”‚           â”‚ [âœ“ Marquer lu]  [ðŸ’¡ Vers carnet]    â”‚            â”‚
â”‚           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜            â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Le rÃ©sumÃ© "Ce que Ã§a change pour toi" est gÃ©nÃ©rÃ© par Jarvis Cloud (Haiku) au clic, mis en cache dans `articles.user_summary`. CoÃ»t : ~0.005 $/click. Avec 50 clics/mois = 0.25 $.

#### Mockup 2 â€” F5 : Navigation clavier j/k

Sur tout panel Ã  liste (Top, Signaux, Veille, Recos, Wiki, Search, Jobs, Carnet) :

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ BRIEF DU JOUR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                                              â”‚
â”‚  â†’ #01  [HN] Anthropic Skills SDK    92     â”‚  â† j/k dÃ©place le focus
â”‚    #02  [Verge] OpenAI launches...   78     â”‚
â”‚    #03  [Le Monde] EU AI Act...      64     â”‚
â”‚                                              â”‚
â”‚  Footer flottant en bas (visible si focus) :â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚  â”‚ j â†“   k â†‘   o ouvrir  m marquer lu     â”‚ â”‚
â”‚  â”‚ s snooze   ? aide                       â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

ImplÃ©mentation : un hook `useListKeyboardNav(items, refs)` dans `cockpit/lib/`, partagÃ© entre panels. Le focus visuel respecte `:focus-visible` qui existe dÃ©jÃ .

#### Mockup 3 â€” F12 : Signal â†’ ticket idÃ©e

Ã‰tat actuel : panel Signaux affiche les termes IA qui montent. On peut "Demander Ã  Jarvis" mais pas capturer le signal comme idÃ©e.

Proposition : sur chaque `SignalCard` un 4e bouton Â« â†’ IdÃ©e Â», ouvre le `TicketModal` prÃ©-rempli.

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ #01 EN HAUSSE Â· Outils de dev              â”‚
â”‚                                             â”‚
â”‚ MCP Servers                                 â”‚
â”‚ Standard de connexion entre LLM et outils. â”‚
â”‚ +47 mentions cette semaine.                 â”‚
â”‚                                             â”‚
â”‚ â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â” â”‚
â”‚ â”‚ 47 mentions â”‚ â–â–‚â–ƒâ–…â–‡    â”‚ +12  â”‚ +â†’ðŸ’¡ â”‚ â”‚
â”‚ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â†“ clic Â« +â†’ðŸ’¡ Â»
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ NOUVELLE IDÃ‰E  â•³                            â”‚
â”‚                                             â”‚
â”‚ Titre  [MCP Server pour Jarvis ____________]â”‚
â”‚                                             â”‚
â”‚ Pourquoi maintenant                         â”‚
â”‚ [Signal "MCP Servers" en hausse depuis 3 â”‚  â”‚
â”‚  semaines â€” +47 mentions, trajectoire     â”‚  â”‚
â”‚  â–â–‚â–ƒâ–…â–‡. CatÃ©gorie : outils de dev. Ton    â”‚  â”‚
â”‚  domaine d'expertise.]                    â”‚  â”‚
â”‚                                             â”‚
â”‚ LibellÃ©s  [#mcp] [#jarvis] [#tooling]      â”‚
â”‚                                             â”‚
â”‚ [Enregistrer]  [Enregistrer + ouvrir...]   â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

L'idÃ©e arrive directement dans `business_ideas` avec `kicker = "Signal faible"`, `last_touched = now`, `status = "incubating"`.

---

## 4. Prompts Claude Code

Conventions :
- Stack rÃ©elle ciblÃ©e : React 18 (CDN, no JSX-compile fancy â€” Babel standalone), Supabase REST via helpers `cockpit/lib/supabase.js` (`postJSON`, `patchJSON`, `fetchJSON`), CSS via `cockpit/styles*.css` avec design tokens existants, localStorage pour persistance front, telemetry via `window.track`.
- Chaque prompt cite les fichiers/lignes du repo.
- **Toute modif fonctionnelle d'un onglet doit mettre Ã  jour `docs/specs/tab-<slug>.md` dans le mÃªme commit** (cf `CLAUDE.md`).

### Ordre d'exÃ©cution recommandÃ©

P0 (1-9) avant P1, P1 avant P2/JARVIS. P0 #6 (tokeniser PanelError) avant tout pour ne pas crÃ©er de PR avec couleurs hardcodÃ©es entretemps.

---

### P0 â€” Quick wins immÃ©diats

#### Prompt 1 â€” [UX] Persister le bookmark des Top cards
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/styles.css` (section card-action--bookmark), `cockpit/panel-top.jsx`, `docs/specs/tab-brief.md`, `docs/specs/tab-top.md`

```
Contexte : dans le cockpit, chaque Top card (panel-top + home) affiche un
bouton "bookmark" (cockpit/home.jsx:591-593, classe .card-action--bookmark).
Le bouton est rendu mais sans onClick : il n'a aucun effet. C'est un anti-
pattern de bouton inerte.

Objectif : faire fonctionner ce bouton.
1. Persistance : un objet localStorage clÃ© "bookmarked-articles" de forme
   { [id]: { ts: Date.now() } }, parallÃ¨le Ã  "read-articles".
2. Ã‰tat visuel : quand l'article est bookmarkÃ©, le bouton .card-action
   --bookmark passe en couleur var(--brand) avec un fill plein (svg
   prop fill="currentColor"). Au hover, opacitÃ© 1 + tooltip "Retirer
   des favoris".
3. Click : toggle bookmark + telemetry track("bookmark_toggled",
   { id, state: "added"|"removed", section: "home" | "top" }).
4. Filtrer : ajouter en haut du panel-top une barre d'onglets
   "Tout Â· Non lu Â· Favoris" qui prÃ©-existe pas. Le filtre "Favoris"
   ne montre que les articles avec id dans bookmarked-articles.

ImplÃ©mentation :
- CrÃ©er cockpit/lib/bookmarks.js avec une API minimale :
    window.bookmarks = {
      get: (id) => boolean,
      toggle: (id) => boolean (renvoie le nouvel Ã©tat),
      list: () => string[],
      onChange: (callback) => unsubscribe
    }
  (pattern identique Ã  cockpit/lib/snooze.js qui sert dÃ©jÃ  ce besoin).
- Brancher dans home.jsx (Top cards) et panel-top.jsx.
- Charger ce script dans index.html juste avant cockpit/lib/snooze.js
  (avant data-loader.js).

Contraintes : pas de framework, vanilla JS (le fichier lib n'est pas
JSX). Utiliser les tokens CSS existants (var(--brand), var(--brand-tint)).
Mettre Ã  jour les telemetry events instrumentÃ©s dans CLAUDE.md.

Validation : 1) bookmarker un article puis recharger la page â†’ Ã©tat
persistÃ©. 2) le filtre Favoris dans panel-top affiche bien la liste.
3) le compteur sb-count Ã  cÃ´tÃ© de "Top du jour" dans la sidebar peut
optionnellement afficher le nombre de favoris (Ã  voir dans nav.js).
```

---

#### Prompt 2 â€” [UX] Toast undo sur snooze
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/styles.css` (section ph-undo-toast), `docs/specs/tab-brief.md`

```
Contexte : dans cockpit/home.jsx, la fonction `markAllRead` affiche un
toast "X articles marquÃ©s lus" avec un bouton "Annuler" qui s'affiche
6 secondes (lignes ~233-244 et ~737-742, classe .ph-undo-toast).

Pour la fonction `snoozeCard` (~223-227), aucun toast n'est affichÃ©.
L'utilisateur snooze un article et rien ne se passe visuellement Ã  part
l'opacitÃ© 0.4 sur la carte. C'est silencieux et stressant : "ai-je vraiment
appuyÃ© ?".

Objectif : afficher un toast undo identique au mark-all-read, aprÃ¨s
chaque snooze. Mutualiser le composant.

ImplÃ©mentation :
1. Extraire le rendu du toast en composant local UndoToast({ count, label,
   onUndo, onDismiss }) en haut de home.jsx, avant `function Home`.
2. Refactorer `markAllRead` pour utiliser ce composant via un Ã©tat unique
   `undoState = { count, label, previousMap | snoozeId, timer }`.
3. Ã‰tendre `snoozeCard` pour pousser un undoState aprÃ¨s chaque appel
   (label : "1 article reportÃ© Â· 3 jours").
4. L'undo de snooze appelle window.snooze.remove(id) (Ã  ajouter dans
   cockpit/lib/snooze.js si absent â€” vÃ©rifier l'API actuelle).

Style : la classe .ph-undo-toast doit dÃ©jÃ  gÃ©rer le rendu correct dans
les 3 thÃ¨mes. VÃ©rifier qu'elle utilise bien des tokens (var(--bg2),
var(--bd), var(--tx)).

Validation : snoozer une card â†’ toast "1 article reportÃ© Â· Annuler"
en bas de page. Cliquer Annuler dans les 6s â†’ la carte revient. AprÃ¨s
6s â†’ toast disparaÃ®t, snooze persiste.
```

---

#### Prompt 3 â€” [UX] Couper la pulse animation aprÃ¨s la 1re session
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles.css`, `cockpit/home.jsx`, `cockpit/sidebar.jsx`

```
Contexte : deux animations CSS attirent l'Å“il au mount des composants :
- cockpit/styles.css:617-623 : .kicker-dot { animation: pulse 2s ease 3 }
- cockpit/styles.css:236-242 : .sb-group-hotdot { animation: sbHotPulse 2s ease 3 }
Joue 3 fois (~6s) puis se fige (`animation-fill-mode: forwards`).

ProblÃ¨me : Ã  chaque mount/remount (dataVersion bump, navigation panel),
l'animation re-dÃ©clenche. Pour un utilisateur quotidien, c'est de
l'agitation visuelle parasite. Les notifications hot-dot dans la sidebar
sont vraiment importantes la 1re fois, beaucoup moins la 50e.

Objectif : afficher la pulse uniquement pendant la 1re session de
l'utilisateur (premiers 7 jours d'usage). Au-delÃ , point statique sans
animation.

ImplÃ©mentation :
1. Lire `localStorage.getItem("cockpit-first-seen")` (dÃ©jÃ  set dans
   app.jsx:415 par la logique du FAB ?). Cf cockpit/app.jsx:411-423
   pour le pattern.
2. Calculer `daysSeen = (Date.now() - firstSeen) / 86400000`.
3. Si `daysSeen >= 7`, ajouter `data-pulse="off"` sur <html> ou <body>
   (effet dans app.jsx, similaire Ã  `document.documentElement.dataset.
   filterRecent = recentOnly ? "1" : "0"` ligne ~219).
4. Modifier styles.css : sous la rÃ¨gle pulse, ajouter
   :root[data-pulse="off"] .kicker-dot,
   :root[data-pulse="off"] .sb-group-hotdot { animation: none; }

Contrainte : ne pas casser la pulse pour les nouveaux utilisateurs.
Garder le respect de prefers-reduced-motion (dÃ©jÃ  gÃ©rÃ© ligne 621-623).

Validation : sur un nouveau profil (clear localStorage), les pulses
jouent. Modifier "cockpit-first-seen" pour simuler 8 jours
d'anciennetÃ© â†’ pulses off. Toggling de panel ne re-dÃ©clenche pas la
pulse.
```

---

#### Prompt 4 â€” [UX] Skeletons spÃ©cifiques aux 3 panels les plus visitÃ©s
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/app.jsx`, `cockpit/styles.css` (section panel-skeleton)

```
Contexte : cockpit/app.jsx:114-140 dÃ©finit un PanelLoader gÃ©nÃ©rique avec
un bandeau header + hero 2-col + 3 cards. Tous les panels Tier 2 affichent
le mÃªme skeleton, peu importe leur layout rÃ©el. ConsÃ©quence : un CLS visible
quand le vrai panel arrive (ex : panel-jarvis qui a un layout split chat,
panel-radar qui a un grand SVG).

Objectif : 3 skeletons spÃ©cifiques en plus du gÃ©nÃ©rique :
- "list" pour les panels feed (panel-veille, panel-jobs-radar, panel-recos,
  panel-history) : header + 6 lignes feed.
- "split" pour les panels avec sidebar (panel-jarvis, panel-wiki) :
  header + main 2/3 + sidebar 1/3.
- "hero+kpis" pour les panels stats (panel-forme, panel-musique, panel-gaming,
  panel-stacks, panel-radar) : hero + grid 4 KPI cards + grand graphe en bas.

ImplÃ©mentation :
1. Ã‰tendre PanelLoader pour accepter une prop `variant`.
2. Mapper chaque panel Ã  son variant via un objet :
     const SKELETON_VARIANTS = {
       jarvis: "split", wiki: "split",
       forme: "hero+kpis", musique: "hero+kpis", gaming: "hero+kpis",
       stacks: "hero+kpis", radar: "hero+kpis",
       updates: "list", claude: "list", sport: "list",
       gaming_news: "list", anime: "list", news: "list",
       jobs: "list", recos: "list", history: "list",
       "veille-outils": "list",
     };
3. Dans app.jsx oÃ¹ PanelLoader est rendu (~ligne 468), passer
   variant={SKELETON_VARIANTS[activePanel] || "default"}.
4. Ajouter les 3 nouveaux templates dans le composant + les classes CSS
   correspondantes (.psk-list, .psk-split, .psk-hero-kpis).

Contraintes : utiliser les tokens existants. Animation shimmer optionnelle
(cf .psk-line existant si prÃ©sent dans styles.css).

Validation : naviguer vers /#jarvis depuis la home â†’ le skeleton split
chat-mÃ©moire s'affiche, pas le skeleton gÃ©nÃ©rique. Pareil sur /#radar
et /#updates.
```

---

#### Prompt 5 â€” [UX] Tokeniser PanelError (supprimer couleurs hardcodÃ©es)
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/app.jsx`

```
Contexte : cockpit/app.jsx:142-158 (PanelError) hardcode des couleurs
en fallback :
- color: "var(--acc, #C2410C)"  â† acc n'est pas un token, fallback Dawn
- color: "var(--tx, #1F1815)"   â† fallback Dawn
- color: "var(--tx2, #5E524A)"  â† fallback Dawn
- background: "var(--bg2)"      â† OK
- color: "var(--tx3, #9A8D82)"  â† fallback Dawn
- fontFamily: "var(--font-display, 'Fraunces', serif)"  â† fallback Dawn

Sur un thÃ¨me Obsidian (#0B0D0F bg), ces fallbacks Dawn restent inertes
parce que les vrais tokens sont dÃ©finis. Mais si jamais le runtime
applique les vars trop tard, l'erreur s'affiche avec des couleurs
illisibles. Et sur le principe, des couleurs hardcodÃ©es en JSX style
violent le design system.

Objectif : remplacer ces fallbacks hardcodÃ©s par les tokens propres,
sans valeur de secours. Si une var n'existe pas, c'est un bug du thÃ¨me
qu'il faut fixer lÃ -bas â€” pas masquer ici.

MÃªmes corrections Ã  appliquer dans :
- cockpit/app.jsx:81-90 (PanelErrorBoundary render fallback) â€” mÃªmes
  hardcodes.

Refactor recommandÃ© : extraire les styles dans une feuille CSS dÃ©diÃ©e
.panel-error / .panel-boundary-error (dans styles.css ou un nouveau
styles-errors.css), n'utiliser que les tokens.

Validation : dÃ©clencher une erreur en kill une fonction Supabase
(throw dans le loader d'un panel, ou modifier l'URL pour casser
auth) â†’ l'erreur s'affiche correctement dans Dawn ET Obsidian ET
Atlas avec des couleurs lisibles.
```

---

#### Prompt 6 â€” [UX] Touch targets 44px sur card-action (desktop aussi)
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles.css` (section .card-action), `cockpit/styles-mobile.css` (cleanup)

```
Contexte : dans cockpit/styles.css:1402-1413 :
.card-action { padding: 6px 10px; min-height: 32px; }
.card-action--bookmark, .card-action--ask, .card-action--snooze {
  width: 36px; height: 36px;
}

cockpit/styles-mobile.css:278-287 surcharge en mobile Ã  40-44px.

ProblÃ¨me : 32-36px sont en-dessous du standard WCAG 2.5.5 (44Ã—44 CSS
pixels). Sur trackpad prÃ©cis Ã§a passe, mais sur tablette + souris
imprÃ©cise + sur Chrome zoom Ã©levÃ©, c'est friable. Et la duplication
desktop / mobile crÃ©e un cas oÃ¹ le fix mobile recouvre la rÃ¨gle desktop.

Objectif : passer la cible tactile Ã  40Ã—40 minimum sur desktop (l'icÃ´ne
peut rester Ã  12px), 44Ã—44 sur mobile (dÃ©jÃ  fait).

ImplÃ©mentation :
1. styles.css ligne 1402-1413 : `.card-action { padding: 8px 12px;
   min-height: 40px; }`. Les 3 variantes width/height passent Ã  40px.
2. styles-mobile.css:279-287 : peut Ãªtre conservÃ© (44px sur mobile)
   ou simplifiÃ© si la nouvelle base 40px desktop est acceptable
   partout.
3. VÃ©rifier que les Top cards conservent leur layout (le top-card-foot
   peut nÃ©cessiter un padding ajustÃ©).

Validation : toucher avec un doigt sur tablette les boutons
bookmark/ask/snooze â†’ cibles confortables. Dimensionnel : DevTools
â†’ inspect un .card-action â†’ height = 40px desktop, 44px mobile.
```

---

#### Prompt 7 â€” [UX] Supprimer le hover translateY(-2px) des Top cards
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles.css` (section .top-card)

```
Contexte : cockpit/styles.css:1265-1269 :
.top-card:hover {
  border-color: var(--bd2);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

ProblÃ¨me : le translateY combinÃ© Ã  la transition all 160ms (ligne 1260)
provoque un saut de chaque carte au hover. Quand on scanne 3 cartes cÃ´te
Ã  cÃ´te avec la souris, le scroll ressemble Ã  une vague. Charmant la 1re
fois, fatigant Ã  la 20e.

Objectif : retirer le translateY, garder l'Ã©lÃ©vation visuelle via le
shadow uniquement. Plus calme, plus pro.

ImplÃ©mentation :
1. Ligne 1268 : retirer `transform: translateY(-2px);`.
2. Ligne 1260 : remplacer `transition: all 160ms;` par
   `transition: border-color 160ms, box-shadow 160ms;` (more explicit,
   Ã©vite de transitionner par mÃ©garde des changements d'Ã©tat).

Bonus optionnel : ajouter un subtil lÃ©ger ringlet de bordure brand
au hover :
  .top-card:hover { border-color: var(--brand); }
(remplace var(--bd2) qui est neutre â€” fait remonter la carte sans la
 bouger).

Validation : hover sur 3 cartes l'une aprÃ¨s l'autre â†’ pas de mouvement
vertical, l'Ã©lÃ©vation se sent au shadow. Le focus-visible reste OK.
Pas de rÃ©gression sur is-read (max-height 56px) qui doit rester fluide.
```

---

#### Prompt 8 â€” [UX] Supprimer le dead code .variant-bar
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles.css`

```
Contexte : cockpit/styles.css:62-103 dÃ©finit le composant .variant-bar
(VARIANT SWITCHER) avec des couleurs hardcodÃ©es (#0E0E10, #F4F4F1, etc.).
Recherche dans le repo : aucune occurrence de className="variant-bar"
ni de balise <VariantBar /> dans cockpit/*.jsx. Composant orphelin.

Objectif : supprimer ces ~40 lignes de CSS dead.

ImplÃ©mentation :
1. Confirmer en grep : aucun usage dans cockpit/*.jsx, index.html,
   manifest, sw.js.
2. Supprimer le bloc complet styles.css:60-104 (commentaire d'ouverture
   au commentaire de fermeture).
3. Tester : la page rend identique. Le bundle CSS rÃ©duit de ~1.5 KB
   (nÃ©gligeable mais hygiÃ¨ne).
4. Bumper la version sw.js automatiquement (cf CLAUDE.md sw-sync).

Contrainte : si un grep trouve une rÃ©fÃ©rence externe (script de doc,
spec), pinger l'auteur avant de supprimer. Sinon clean.

Validation : la home rend identique avant/aprÃ¨s. Pas de console
warning. Le sw.js a Ã©tÃ© re-synchronisÃ©.
```

---

#### Prompt 9 â€” [UX] MÃ©moire de scroll par panel (sessionStorage)
**PrioritÃ©** : P0
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/app.jsx`

```
Contexte : cockpit/app.jsx:263 dans handleNavigate :
window.scrollTo({ top: 0, behavior: "smooth" });

Effet : Ã  chaque changement de panel, scroll au top. Bon pour les panels
courts. Mauvais pour les panels longs (ex : panel-history avec 60 jours,
panel-wiki) â€” quand l'utilisateur quitte un panel pour Jarvis et revient,
il doit re-scroller.

Objectif : sauvegarder la position de scroll par panel, restaurer au
retour. Reset au top seulement si c'est la 1re visite du panel dans
la session.

ImplÃ©mentation :
1. Avant le scrollTo dans handleNavigate, stocker la position actuelle :
     const prev = activePanel;
     try {
       const map = JSON.parse(sessionStorage.getItem("panel-scroll") || "{}");
       map[prev] = window.scrollY;
       sessionStorage.setItem("panel-scroll", JSON.stringify(map));
     } catch {}
2. Remplacer le scrollTo par une logique conditionnelle :
     try {
       const map = JSON.parse(sessionStorage.getItem("panel-scroll") || "{}");
       const prevY = map[id];
       if (prevY > 0) {
         requestAnimationFrame(() => window.scrollTo({ top: prevY, behavior: "auto" }));
       } else {
         window.scrollTo({ top: 0, behavior: "smooth" });
       }
     } catch {
       window.scrollTo({ top: 0, behavior: "smooth" });
     }
3. Le `requestAnimationFrame` est nÃ©cessaire parce que le panel n'est
   pas encore montÃ© quand handleNavigate est appelÃ©.
4. Si le panel est en chargement (Tier 2), il faudra restaurer aprÃ¨s
   la fin du loader. Optionnel pour V1 : on accepte un saut au reload.

Contraintes : sessionStorage (pas localStorage) â€” la mÃ©moire de scroll
ne survit pas Ã  la fermeture du navigateur.

Validation : sur panel-history, scroller Ã  mi-page, naviguer vers Jarvis,
revenir sur Historique â†’ restituÃ© Ã  la mÃªme position. Sur Brief depuis
une nav fresh â†’ scroll au top.
```

---

### P1 â€” AmÃ©liorations significatives

#### Prompt 10 â€” [UX] Ã‰tendre le hero delta Ã  7 jours
**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `docs/specs/tab-brief.md`

```
Contexte : cockpit/home.jsx:285-316 calcule visitDelta et useDeltaHero
avec une fenÃªtre cap Ã  18h. Au-delÃ , le hero retombe sur le brief macro
gÃ©nÃ©rique.

Pour un utilisateur qui visite 3-5Ã—/semaine (mais pas tous les jours),
le mode delta est dÃ©sactivÃ© alors que c'est prÃ©cisÃ©ment la situation
oÃ¹ "depuis ta derniÃ¨re visite" est le plus utile.

Objectif : Ã©tendre la fenÃªtre Ã  7 jours, en adaptant la copy.

ImplÃ©mentation :
1. Modifier `visitDelta` (ligne ~285-291) :
     const diffH = (now - lastVisitTs) / 3600000;
     const diffD = diffH / 24;
     if (diffH < 0.5) return null;
     if (diffH < 18) return { h: Math.round(diffH), kind: "today", delta: diffH };
     if (diffD < 7) return { h: Math.round(diffH), d: Math.round(diffD), kind: "days", delta: diffD };
     return null;
2. Modifier `useDeltaHero` pour accepter le nouveau kind="days" :
     const useDeltaHero = !!(visitDelta && newSinceVisit && newSinceVisit > 0);
3. Adapter le rendu du kicker (ligne ~404-419) :
     if (visitDelta.kind === "days") {
       label = `DEPUIS TA DERNIÃˆRE VISITE â€” ${visitDelta.d} J`;
     } else {
       label = `DEPUIS TA DERNIÃˆRE VISITE â€” ${visitDelta.h}H`;
     }
4. Adapter le hero-title (ligne ~423-425) :
     {newSinceVisit} {newSinceVisit === 1 ? "nouveautÃ©" : "nouveautÃ©s"}
       depuis {visitDelta.kind === "days" ? `${visitDelta.d} jours` : `${visitDelta.h}h`}.
5. Adapter telemetry (ligne ~316) :
     window.track && window.track("hero_delta_shown", { newSinceVisit, hours: visitDelta.h, days: visitDelta.d || null });
6. Mettre Ã  jour le tableau telemetry dans CLAUDE.md.
7. Au-delÃ  de 7j, considÃ©rer l'utilisateur comme "fresh" â€” pas de mode
   delta (la liste serait trop longue).

Validation : simuler une visite de la semaine derniÃ¨re en modifiant
"cockpit-last-visit-ts" â†’ ouvrir la home â†’ kicker "DEPUIS TA DERNIÃˆRE
VISITE â€” 3 J" + liste des nouveautÃ©s cumulÃ©es. Une visite il y a 8
jours â†’ mode classique.
```

---

#### Prompt 11 â€” [UX] BanniÃ¨re "X articles dans Recos ouverts depuis >30j"
**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/lib/data-loader.js` (potentiel), `docs/specs/tab-brief.md`

```
Contexte : Recos & Ideas s'accumulent sans signal de "pourriture" :
on ne sait pas combien sont lÃ  depuis trop longtemps, Ã  archiver ou
dÃ©cider.

Objectif : ajouter une banniÃ¨re discrÃ¨te en bas du Brief (ou intÃ©grÃ©e
dans le footer) : "X articles dans Recos ouverts depuis >30j Â· Trier".

ImplÃ©mentation :
1. Tier 1 a dÃ©jÃ  accÃ¨s Ã  recommendations + business_ideas via globals.
   Sinon, ajouter un fetch lÃ©ger dans bootTier1 (data-loader.js) pour
   compter les recos en `status="open"` AND `created_at < now - 30d`.
2. Dans home.jsx, juste avant <footer className="home-foot">, ajouter
   une <RotBanner /> conditionnelle :
     <RotBanner counts={data.rot} onNavigate={onNavigate} />
3. Composant RotBanner :
     - Si tout est < 30j : null.
     - Sinon : bandeau horizontal avec icÃ´ne clock, texte "X dans Recos,
       Y dans IdÃ©es Â· Faire le tri", bouton ghost.
4. Style : utiliser .home-foot comme base, ajouter .rot-banner avec
   accent var(--neutral) (ni alarmant ni neutre).
5. Telemetry : track("rot_banner_shown", { recos: X, ideas: Y }).
   Update CLAUDE.md.

Contrainte : ne pas afficher au-dessus de 0 (zero state). Ã‰vitons un
nag systÃ©matique.

Validation : avoir 5 recos +30j en base â†’ la banniÃ¨re apparaÃ®t. Cliquer
"Faire le tri" â†’ navigue vers Recos. Toggle des recos â†’ banniÃ¨re
disparaÃ®t.
```

---

#### Prompt 12 â€” [UX] Compteur "delta hebdo" sur signaux + wiki
**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/panel-signals.jsx`, `cockpit/panel-wiki.jsx`, `docs/specs/tab-signals.md`, `docs/specs/tab-wiki.md`

```
Contexte : seul le hero de la home utilise un mode delta visuel. Les
panels Signaux et Wiki ne signalent pas ce qui est nouveau depuis la
derniÃ¨re visite â€” l'utilisateur doit re-scanner.

Objectif : sur chaque entrÃ©e Signal et Wiki, ajouter un badge "NEW"
si l'entrÃ©e a Ã©tÃ© ajoutÃ©e/modifiÃ©e aprÃ¨s cockpit-last-visit-ts.

ImplÃ©mentation :
1. RÃ©utiliser le pattern lastVisitTs (cf home.jsx:275-283).
2. Sur panel-signals.jsx : pour chaque signal avec
   `signal.first_seen > lastVisitTs`, ajouter le pill-badge--new
   existant en haut de la card. (dÃ©jÃ  prÃ©sent pour signal.trend === "new",
   l'Ã©tendre Ã  toute entrÃ©e nouvelle).
3. Sur panel-wiki.jsx : pour chaque wiki_concept avec
   `concept.created_at > lastVisitTs OR concept.last_enriched_at >
   lastVisitTs`, badge "NEW" ou "UPDATED".
4. Le compteur visible en sidebar (.sb-unread sur les groupes) doit
   reflÃ©ter ce delta (data.nav.signals.unread).

Contraintes : utiliser les tokens (var(--brand) pour le pill).
Telemetry : track("delta_badge_shown", { panel, count }).

Validation : faire une 1re visite â†’ tout est marquÃ©. 2e visite 2h plus
tard â†’ seuls les nouveaux signaux/concepts portent NEW.
```

---

#### Prompt 13 â€” [UX] Skeleton Â« shimmer Â» au lieu de placeholders fixes
**PrioritÃ©** : P1
**DÃ©pend de** : Prompt 4
**Fichiers concernÃ©s** : `cockpit/styles.css` (section .panel-skeleton)

```
Contexte : le skeleton actuel (cockpit/app.jsx:114-140) utilise des
.psk-line / .psk-stat / .psk-card en fond uni var(--bg2). Statique.
Visuellement, on dirait que la page est figÃ©e plutÃ´t que chargement
en cours.

Objectif : ajouter une animation shimmer subtile (1.4s ease-in-out
linear infinite) qui glisse un dÃ©gradÃ© clair sur les blocs.

ImplÃ©mentation : ajouter dans styles.css :
  .psk-line, .psk-stat, .psk-card, .psk-hero-main > *, .psk-hero-side > * {
    background: linear-gradient(90deg, var(--bg2) 25%, var(--bg3) 50%, var(--bg2) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.4s ease-in-out infinite;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @media (prefers-reduced-motion: reduce) {
    .psk-line, .psk-stat, .psk-card { animation: none; }
  }

Contrainte : prefers-reduced-motion dÃ©sactive le shimmer.

Validation : naviguer vers /#radar â†’ le skeleton montre un balayage
horizontal subtil. Sur Obsidian, le balayage est visible sans agressivitÃ©.
```

---

#### Prompt 14 â€” [UX] Recent toggle : positionnement et label dynamique
**PrioritÃ©** : P1
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles.css` (section .recent-toggle), `cockpit/app.jsx`

```
Contexte : le bouton "RÃ©cent Â· 24h" est un FAB sticky position:fixed
top:14px right:60px (cockpit/styles.css:1001-1022). Il chevauche le
.ph (page header sticky) qui est aussi Ã  top:0. Sur mobile le right:60px
peut chevaucher le hamburger trigger (display:fixed top:10px left:10px).

De plus, le label fixe "RÃ©cent Â· 24h" est statique alors que le mode
rÃ©el calculÃ© dans app.jsx:204-213 dÃ©pend de la fenÃªtre depuis last visit
(30min-18h).

Objectif :
1. Repositionner pour cohabiter proprement avec ph et le hamburger.
2. Dynamiser le label : "RÃ©cent Â· Xh" avec X = heures depuis last visit
   plafonnÃ© Ã  24h.

ImplÃ©mentation :
1. Dans app.jsx oÃ¹ setRecentOnly est calculÃ©, exposer aussi recentHours.
2. Passer recentHours en prop au .recent-toggle (ou via global) :
   `{recentOnly ? `RÃ©cent Â· ${recentHours}h` : "Tout"}`.
3. CSS : changer position de fixed top:14px right:60px Ã 
   position:sticky top:14px float:right (intÃ©grer dans le ph-right
   plutÃ´t que flotter). OU garder fixed mais bouger Ã  top:64px (sous
   le ph) right:14px.
4. Sur mobile, dÃ©placer en bas-right Ã  cÃ´tÃ© du kbd-fab.

Validation : le bouton ne masque jamais de contenu, le label affiche
"RÃ©cent Â· 4h" si la derniÃ¨re visite date de 4h. Mobile : le bouton
n'occulte pas la 1re carte du Top.
```

---

### P2 â€” Polish

#### Prompt 15 â€” [UX] Migrer styles-mobile.css vers @container queries
**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/styles-mobile.css`, `cockpit/styles.css`, et tous les `cockpit/styles-*.css`

```
Contexte : cockpit/styles-mobile.css fait ~80 occurrences de !important
pour patcher le mobile. Maintenable Ã  court terme, fragile Ã  long terme :
toute nouvelle rÃ¨gle CSS doit garder la spÃ©cificitÃ© en tÃªte.

Objectif : remplacer la stratÃ©gie d'overrides par container queries
(@container) ou rÃ©Ã©crire les composants en mobile-first dans leur
fichier propre.

StratÃ©gie pragmatique : ne PAS tout rÃ©Ã©crire d'un coup. Approche par
phases :
1. Phase A : pour 3 panels les plus visitÃ©s (home, panel-jarvis,
   panel-veille), rÃ©Ã©crire les media queries dans leur fichier propre
   (styles.css pour home, styles-jarvis.css pour jarvis, styles dans
   styles.css pour veille). Supprimer les overrides correspondants
   dans styles-mobile.css.
2. Phase B : sidebar (drawer) reste dans styles-mobile.css car
   cross-cutting.
3. Phase C : mesurer la baisse de !important. Cible : -50% en 6 semaines.

ImplÃ©mentation Phase A : pour home, ajouter dans styles.css aprÃ¨s le
bloc .hero-frame (~ligne 599) :
  @container (max-width: 760px) {
    .hero-frame { grid-template-columns: 1fr; gap: 24px; padding: 24px 18px; }
    .top-grid { grid-template-columns: 1fr; }
    .block { padding: 24px 18px; }
    .block--two { grid-template-columns: 1fr; }
    .block--two .col { padding: 24px 18px; border-right: none; }
  }
Et dÃ©clarer .home comme container : .home { container-type: inline-size; }
Supprimer ensuite les rÃ¨gles correspondantes dans styles-mobile.css.

Contrainte : tester sur Safari iOS â‰¥ 16 pour les @container.

Validation : iPhone SE (375px) â†’ home rend identique. styles-mobile.css
a perdu ~30 lignes. Lighthouse Performance score n'a pas rÃ©gressÃ©.
```

---

### JARVIS â€” features avancÃ©es

#### Prompt 16 â€” [JARVIS] F1 Sync read-articles cross-device
**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/lib/`, `cockpit/home.jsx`, nouvelle migration Supabase

```
Contexte : l'Ã©tat "lu" est dans localStorage["read-articles"]. Sur PWA
mobile + Chrome desktop, la mÃªme personne re-marque les mÃªmes articles.
Frustrant.

Objectif : table Supabase `read_articles` synchronisÃ©e bidirectionnelle.

ImplÃ©mentation :

PARTIE 1 â€” Migration SQL (sql/014_read_articles.sql)
  CREATE TABLE read_articles (
    user_id uuid NOT NULL REFERENCES auth.users(id),
    article_id text NOT NULL,
    read_at timestamptz NOT NULL DEFAULT now(),
    bookmarked_at timestamptz NULL,
    PRIMARY KEY (user_id, article_id)
  );
  ALTER TABLE read_articles ENABLE ROW LEVEL SECURITY;
  CREATE POLICY read_own ON read_articles
    USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

PARTIE 2 â€” Lib JS (cockpit/lib/read-state.js)
  window.readState = {
    isRead, markRead, isBookmarked, toggleBookmark, sync
  };
  - sync() merge localStorage + Supabase en LWW (last-write-wins par read_at).
  - Au boot (data-loader.js), appeler readState.sync() une fois.
  - Chaque markRead postJSON immÃ©diatement (best-effort, fallback localStorage).

PARTIE 3 â€” Brancher home.jsx
  - Remplacer les accÃ¨s directs Ã  localStorage["read-articles"] par
    window.readState.isRead(id) / window.readState.markRead(id).
  - Le bouton bookmark (cf Prompt 1) utilise toggleBookmark.

PARTIE 4 â€” RLS + Specs
  - Ajouter la table dans docs/architecture/dependencies.yaml.
  - Mettre Ã  jour docs/specs/tab-brief.md et tab-top.md.

Validation : sur device A, lire 5 articles. Recharger sur device B
(mÃªme compte) â†’ 5 articles marquÃ©s lus dans le Top.

Contraintes : pas de conflit avec le mode "Tout marquÃ© lu" undo
(handleur dÃ©jÃ  existant).
```

---

#### Prompt 17 â€” [JARVIS] F2 Hero "depuis lundi" hebdo
**PrioritÃ©** : P2
**DÃ©pend de** : Prompt 10
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `docs/specs/tab-brief.md`

```
Contexte : aprÃ¨s le prompt 10, le mode delta couvre 7j. Mais le hero
n'a pas de fallback intelligent quand l'utilisateur visite chaque jour
(diffH < 18) : pour un usage quotidien, le hero affiche toujours
"depuis ta derniÃ¨re visite â€” Xh" qui devient rÃ©pÃ©titif.

Objectif : sur visite quotidienne rÃ©currente, switcher le mode "delta"
horaire en mode "depuis lundi" (rÃ©cap hebdo cumulÃ©) Ã  partir du mardi.

ImplÃ©mentation :
1. DÃ©tecter le pattern "visiteur quotidien" :
     const dailyVisitor = (lastNVisits.length >= 4 &&
       diff(lastNVisits[0], lastNVisits[3]) < 4 days);
2. Stocker un journal de visites dans localStorage["cockpit-visit-log"]
   (max 30 entries).
3. Si dailyVisitor && weekday >= 2 (mardi+), calculer monday = dÃ©but de
   la semaine ISO. Compter newSinceMonday.
4. Hero toggle 3-state : "horaire" / "hebdo" / "macro".
   - Si dailyVisitor && weekday >= 2 â†’ afficher hebdo, fallback macro.
   - Sinon mode horaire si rÃ©cent (< 24h), sinon macro.
5. Bouton dans hero-actions : "[Vue : depuis lundi â†“]" avec dropdown
   pour switcher manuellement.

Validation : simuler 5 visites consÃ©cutives â†’ mardi matin â†’ hero
"12 nouveautÃ©s depuis lundi". Cliquer le toggle â†’ "depuis ta derniÃ¨re
visite â€” 18h".

Contrainte : limite cognitive â€” ne pas afficher 30 nouveautÃ©s en liste,
plafonner Ã  6 + "voir les 24 autres".
```

---

#### Prompt 18 â€” [JARVIS] F5 Navigation clavier j/k/o sur listes
**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/lib/list-keynav.js` (nouveau), `cockpit/panel-top.jsx`, `cockpit/panel-veille.jsx`, `cockpit/home.jsx`, `docs/specs/*`

```
Contexte : le cockpit a 8+ panels orientÃ©s listes (Top, Veille IA,
Claude, Sport, Gaming, Anime, News, Recos, Wiki). Pas de raccourci
clavier de navigation au sein d'une liste (j down, k up, o open,
m mark, s snooze).

Objectif : un hook React partagÃ© useListKeyboardNav(items, onAction)
qui gÃ¨re le focus et les actions standardisÃ©es.

ImplÃ©mentation :

PARTIE 1 â€” CrÃ©er cockpit/lib/list-keynav.js (chargÃ© en <script> avant
les panels) qui exporte une fn factory :
  window.makeListKeynav = function(opts) {
    return function useListKeynav(items, refs, callbacks) {
      // useEffect : keydown listener sur window.
      // j/â†“ â†’ focus suivant. k/â†‘ â†’ focus prÃ©cÃ©dent.
      // o/Enter â†’ callbacks.onOpen(item).
      // m â†’ callbacks.onMark(item).
      // s â†’ callbacks.onSnooze(item).
      // ? â†’ ouvre le ShortcutsOverlay.
      // bornes : haut/bas de la liste.
    };
  };

PARTIE 2 â€” Brancher dans panel-top.jsx :
  const refs = useRef([]);
  useListKeynav(top, refs, {
    onOpen: (it) => window.open(it.url, "_blank"),
    onMark: (it) => window.readState.markRead(it.id),
    onSnooze: (it) => window.snooze.add(it.id, 3),
  });

PARTIE 3 â€” Indicateur visuel : ajouter une classe is-keynav-focused
sur l'item focused (style : ring 2px brand). Utiliser data-attr
sur l'Ã©lÃ©ment, scroll into view smooth.

PARTIE 4 â€” Footer flottant qui apparaÃ®t au 1er j/k :
  <KeynavHints visible={hasUsedKeynav}>
    j â†“   k â†‘   o ouvrir   m marquÃ© lu   s snoozer   ? aide
  </KeynavHints>
  Auto-hide aprÃ¨s 3s sans interaction.

PARTIE 5 â€” Mettre Ã  jour KEYBOARD_SHORTCUTS dans app.jsx + le
ShortcutsOverlay pour documenter j/k/o/m/s.

Validation : sur panel-top, appuyer j â†’ ring sur la 1re carte. Encore
j â†’ 2e. o â†’ ouvre l'article. m â†’ marque lu. Sur input/textarea, j ne
dÃ©clenche pas (dÃ©jÃ  gÃ©rÃ© comme pattern dans app.jsx:382-385).
```

---

#### Prompt 19 â€” [JARVIS] F11 Daily streak shield
**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/sidebar.jsx`, `cockpit/lib/data-loader.js`, nouvelle migration

```
Contexte : la mÃ©canique de streak (sidebar.jsx footer) punit binairement
toute journÃ©e manquÃ©e. Pour un usage durable, c'est anxiogÃ¨ne.

Objectif : 1 "shield" / 30 jours qui protÃ¨ge le streak d'une journÃ©e
manquÃ©e. InspirÃ© de Duolingo.

ImplÃ©mentation :

PARTIE 1 â€” Migration sql/015_streak_shields.sql
  CREATE TABLE streak_shields (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id),
    shields_available int NOT NULL DEFAULT 1,
    last_used_date date NULL,
    last_grant_date date NOT NULL DEFAULT now()::date
  );
  RLS authenticated.

PARTIE 2 â€” Logic backend (in main.py ou un cron lÃ©ger) :
  - Chaque jour Ã  06:00 UTC, si user a lu â‰¥ 1 article, ne rien faire.
  - Si user a 0 lecture, consommer 1 shield si dispo, sinon reset le streak.
  - Le 1er du mois, regrant 1 shield (cap 1).

PARTIE 3 â€” Affichage sidebar :
  - Sous le streak counter, un mini icÃ´ne "ðŸ›¡ï¸ Ã—1" ou "ðŸ›¡ï¸ Ã—0".
  - Tooltip : "Shield disponible. Tu peux manquer 1 jour ce mois sans
    casser ta sÃ©rie."
  - Si shield consommÃ© hier, afficher un toast au mount : "Ton shield
    t'a couvert hier. Tu en rÃ©cupÃ¨res 1 le 1er du mois prochain."

PARTIE 4 â€” Specs
  - Nouvelle table dans docs/architecture/dependencies.yaml.
  - Update docs/specs/tab-brief.md (sidebar streak).

Validation : skip 1 jour â†’ streak conservÃ©, shield Ã  0. Le 1er du mois
suivant â†’ shield Ã  1. Skip 2 jours d'affilÃ©e â†’ streak reset.
```

---

#### Prompt 20 â€” [JARVIS] F12 Signal â†’ IdÃ©e en 1 clic
**PrioritÃ©** : P2
**DÃ©pend de** : Aucun
**Fichiers concernÃ©s** : `cockpit/home.jsx`, `cockpit/panel-signals.jsx`, `cockpit/components-ticket.jsx`, `cockpit/panel-ideas.jsx`

```
Contexte : panel-signals affiche les termes IA qui montent. Il y a un
bouton "Demander Ã  Jarvis" mais pas "Capturer comme idÃ©e". L'opportunitÃ©
business est laissÃ©e en friction.

Objectif : 4e bouton sur SignalCard "â†’ IdÃ©e" qui ouvre le TicketModal
prÃ©-rempli avec le contexte du signal.

ImplÃ©mentation :
1. Dans home.jsx::SignalCard (ligne ~134-176), ajouter aprÃ¨s le bouton
   ask :
     <button className="card-action card-action--idea sig-card-idea"
             onClick={(e) => {
               e.stopPropagation();
               window.dispatchEvent(new CustomEvent("ideas:new-from-signal", {
                 detail: { signal }
               }));
               if (typeof onNavigate === "function") onNavigate("ideas");
             }}>
       <Icon name="lightbulb" size={12} stroke={2} />
     </button>
2. Dans panel-ideas.jsx, Ã©couter l'event :
     useEffect(() => {
       const onSig = (e) => {
         const s = e.detail.signal;
         openTicketModal({
           title: `IdÃ©e â€” ${s.name}`,
           description: `Signal "${s.name}" en hausse (${s.category}, +${s.delta} en 8 sem.). ${s.context}\n\n[Pourquoi maintenant]\n${s.count} mentions cette semaine, trajectoire ${s.trend}.\n\n[Mon angle]\nâ€¦`,
           kicker: "Signal faible",
           tags: [s.category],
         });
       };
       window.addEventListener("ideas:new-from-signal", onSig);
       return () => window.removeEventListener("ideas:new-from-signal", onSig);
     }, []);
3. Faire la mÃªme chose dans panel-signals.jsx (chemin direct, pas via home).
4. Style : le bouton .sig-card-idea reprend le mÃªme rond 36Ã—36 que les
   autres card-action.
5. Telemetry : track("signal_to_idea", { signal_name, category }).
   Update CLAUDE.md.
6. Specs : update tab-signals.md + tab-ideas.md.

Validation : sur la home, hover un SignalCard â†’ 2 boutons dans le foot
(ask + idÃ©e). Cliquer idÃ©e â†’ navigue vers /#ideas, le modal s'ouvre
prÃ©-rempli avec contexte signal.
```

---

## Checklist d'exÃ©cution

| # | Prompt | PrioritÃ© | Effort estimÃ© | DÃ©pend de | Cumul |
|:-:|---|:-:|---:|---|---:|
| 1 | P1 Bookmark persistÃ© | P0 | 45 min | â€” | 45 min |
| 2 | P2 Toast undo snooze | P0 | 30 min | â€” | 1h15 |
| 3 | P3 Couper pulse aprÃ¨s 7j | P0 | 20 min | â€” | 1h35 |
| 4 | P4 Skeletons spÃ©cifiques | P0 | 90 min | â€” | 3h05 |
| 5 | P5 Tokeniser PanelError | P0 | 20 min | â€” | 3h25 |
| 6 | P6 Touch targets 40px | P0 | 15 min | â€” | 3h40 |
| 7 | P7 Retirer translateY hover | P0 | 10 min | â€” | 3h50 |
| 8 | P8 Supprimer .variant-bar | P0 | 15 min | â€” | 4h05 |
| 9 | P9 MÃ©moire scroll | P0 | 40 min | â€” | 4h45 |
| 10 | P1 Hero delta 7 jours | P1 | 60 min | â€” | 5h45 |
| 11 | P1 BanniÃ¨re rot 30j | P1 | 75 min | â€” | 7h00 |
| 12 | P1 Delta hebdo signaux/wiki | P1 | 60 min | â€” | 8h00 |
| 13 | P1 Skeleton shimmer | P1 | 25 min | #4 | 8h25 |
| 14 | P1 Recent toggle dynamique | P1 | 40 min | â€” | 9h05 |
| 15 | P2 Container queries | P2 | 4h | â€” | 13h05 |
| 16 | JARVIS F1 read-articles sync | P2 | 3h | â€” | 16h05 |
| 17 | JARVIS F2 Depuis lundi | P2 | 2h | #10 | 18h05 |
| 18 | JARVIS F5 Keynav j/k | P2 | 3h | â€” | 21h05 |
| 19 | JARVIS F11 Streak shield | P2 | 2h | â€” | 23h05 |
| 20 | JARVIS F12 Signal â†’ IdÃ©e | P2 | 90 min | â€” | 24h35 |

**Recommandation** : exÃ©cuter les 9 P0 en une session (â‰ˆ4h45) avant tout. Mettre les P1 (4h45) sur une 2e session. Les JARVIS sur 2-3 sessions ultÃ©rieures.

---

## Rappel cardinal

Toute PR qui touche un fichier `cockpit/panel-*.jsx`, `cockpit/home.jsx`, ou les pipelines doit mettre Ã  jour `docs/specs/tab-<slug>.md` et `docs/specs/index.json` dans le mÃªme commit (cf. CLAUDE.md, section *Maintenance des specs Jarvis Lab*). Les CI `validate-spec`, `lint-specs` et `arch-drift-check` peuvent bloquer la PR.

Pour les nouveaux events telemetry introduits (P2 snooze, P3 first-seen pulse, P10 hero delta hours/days, P11 rot_banner_shown, P12 delta_badge_shown, P18 keynav, P19 streak_shield_used, P20 signal_to_idea), il faut ajouter une ligne au tableau Â« Events instrumentÃ©s Â» dans CLAUDE.md.

Pour les nouvelles tables Supabase (P16 read_articles, P19 streak_shields), il faut mettre Ã  jour `docs/architecture/dependencies.yaml::tables[]` + ajouter la migration + bumper le sw.js si l'index.html est touchÃ© (cf. workflow `sw-sync`).
