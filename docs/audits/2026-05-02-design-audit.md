# Audit Design Complet â€” AI Cockpit
**Date** : 2 mai 2026 Â· **Auditeur** : tÃ¢che planifiÃ©e `design-audit--upgrade-prompt`
**Cible** : https://ph3nixx.github.io/jarvis-cockpit/ Â· `cockpit/` (React 18 + Babel standalone)
**Audit prÃ©cÃ©dent** : `docs/audits/2026-04-26-design-audit.md` (il y a 6 jours)

---

## âš ï¸ Note de cadrage (lue avant tout le reste)

Le prompt de tÃ¢che dÃ©crit une stack **Â« single-file vanilla HTML/CSS/JS, pas de framework, pas de build Â»** et une identitÃ© **Â« gradient bleuâ†’violet, dark mode, glassmorphism Â»**. Ces deux affirmations restent fausses, comme notÃ© dans l'audit prÃ©cÃ©dent.

**RÃ©alitÃ© observÃ©e (inchangÃ©e)** :
- Stack = React 18 + `@babel/standalone` chargÃ© via unpkg, multi-fichiers (`cockpit/app.jsx`, ~26 panels en `.jsx`, ~21 stylesheets `.css`, `index.html` = coquille de 126 lignes).
- IdentitÃ© = trois thÃ¨mes Ã©ditoriaux (Dawn ivoire/rouille, Obsidian charbon/cyan, Atlas Swiss/indigo). Pas de dÃ©gradÃ©, pas de glassmorphism (seulement deux `backdrop-filter` rÃ©siduels, dont un sur fond opaque qui ne sert Ã  rien).

**Tous les prompts Claude Code de la Phase 4 ciblent `cockpit/*.jsx` et `cockpit/*.css`, pas un fichier `index.html` monolithique imaginaire.** Si la prochaine itÃ©ration du prompt veut respecter la stack vanilla, il faudra rÃ©Ã©crire le projet, pas l'audit.

---

# 1. Reconnaissance â€” delta depuis l'audit du 26 avril

## 1.1 Score d'exÃ©cution des 10 quick wins du prÃ©cÃ©dent audit

| # | Titre QW prior | Effort dit | Ã‰tat au 2 mai | Note |
|---|---|---:|---|---|
| QW1 | Tuer pulses sous `prefers-reduced-motion` | 1 | âœ… **ShippÃ©** â€” bloc global `*` Ã  `cockpit/styles.css:4657` + 5 blocs spÃ©cifiques | Au-delÃ  du minimum, propre |
| QW2 | Card-actions toujours visibles | 2 | ðŸŸ¡ **Partiel** â€” `.top-card .top-actions` passÃ© Ã  `opacity:0.55` au lieu de 0, mais `.card-action--ask` reste invisible jusqu'au hover | Pas terminÃ© |
| QW3 | Confirmation + undo Â« Tout marquÃ© lu Â» | 2 | âœ… **ShippÃ©** â€” undoState 6s, restauration localStorage propre | Excellent, modÃ¨le Ã  dupliquer |
| QW4 | Touch targets â‰¥ 36px sur mobile | 2 | âœ… **ShippÃ©** â€” bumpÃ© Ã  40px (action) / 44px (bookmark, ask) sur `@media max-width:760px` | Conforme WCAG 2.1 AAA mobile |
| QW5 | Contraste `--tx3` sur Dawn et Atlas | 1 | âœ… **ShippÃ©** â€” Dawn `#766960` (~5.2:1), Atlas `#6B7075` (~5.4:1) | Va mÃªme au-delÃ  de la cible 4.5:1 |
| QW6 | 3e bouton thÃ¨me Atlas | 1 | âœ… **ShippÃ©** â€” `sidebar.jsx:228-234`, icÃ´ne `square` | OK |
| QW7 | Indicateur Â« auto Â» sur le toggle thÃ¨me | 2 | âœ… **ShippÃ©** â€” classes `is-explicit` / `is-auto`, 4e bouton dÃ©diÃ© auto | Ã‰lÃ©gant |
| QW8 | Vrai delta Â« depuis ta derniÃ¨re visite Â» | 3 | âœ… **ShippÃ©** â€” `useDeltaHero`, `newSinceVisit`, `visitDelta`, tÃ©lÃ©mÃ©trie `hero_delta_shown` | Hero entiÃ¨rement refondu |
| QW9 | Retirer `backdrop-filter` du sticky header | 1 | ðŸŸ¡ **Partiel** â€” retirÃ© de `.ph`, **toujours prÃ©sent** sur `.panel-toolbar` (`styles.css:2119`) qui est le sticky-header de TOUS les feeds Veille/Top/etc. Effet 0, coÃ»t GPU mobile inchangÃ© | RÃ©gression de localisation |
| QW10 | Linter spec interdire valeurs hardcodÃ©es | 4 | âŒ **Non fait** | Le plus rentable Ã  long terme, encore en dette |

**Score d'exÃ©cution : 7/10 shippÃ©s, 2/10 partiels, 1/10 en dette.** Excellent rythme. Le partiel sur QW9 (oubli d'un 2e selector) et QW2 (oubli de `.card-action--ask`) sont typiques d'un fix Â« grep-and-replace Â» qui s'arrÃªte au premier match : c'est traitÃ© plus bas.

## 1.2 Score d'exÃ©cution des 5 features Jarvis prioritaires

| # | Feature Jarvis | Ã‰tat au 2 mai | DÃ©tails |
|---|---|---|---|
| J1 | Hero Â« depuis ta derniÃ¨re visite Â» | âœ… ShippÃ© | CouplÃ© Ã  QW8, voir ci-dessus |
| J2 | TTS Jarvis voix neuronale | âŒ Non shippÃ© | Toujours `window.speechSynthesis` dans `home.jsx:13-30` (voix Hortense / Julie sur Windows) |
| J3 | Contexte parking pour Ask Jarvis | âŒ Non shippÃ© | Le bouton ask-Jarvis prÃ©-remplit toujours un prompt one-shot, sans mÃ©moire de la session |
| J4 | Miroir du soir | ðŸŸ¡ ShippÃ© en MVP â€” `panel-evening.jsx` + table `daily_mirror`, mais **rendu trÃ¨s en deÃ§Ã  du mockup B** : pas de stats row, pas de timeline, pas de narrative auto-gÃ©nÃ©rÃ©e, pas de pointeur Â« tu n'as pas ouvert X depuis Y jours Â». Juste un `dangerouslySetInnerHTML` du `summary_html`. | Ã€ enrichir â€” c'est devenu une simple page de lecture |
| J9 | Tooltip wiki au survol | âœ… ShippÃ© | `cockpit/lib/wiki-tooltip.js` + classe `wiki-decorated` + media query reduced-motion. Bien fait. |

**Score : 2/5 complets, 1/5 MVP minimal, 2/5 en attente.**

## 1.3 Nouvelles surfaces ajoutÃ©es entre Apr 26 et May 2 (non auditÃ©es au prÃ©alable)

- **Hero compact mode** (`home.jsx:262-273`) â€” toggle `cockpit-hero-compact`, classe `.is-compact`. RÃ©duit la hauteur du hero. **Ã€ auditer.**
- **Zero state du Brief** (`home.jsx:502-527`) â€” quand tout est lu, on bascule sur Â« Tu as fait le tour. Bravo. Â» + 2 idÃ©es en incubation. **Ã€ auditer.**
- **Snooze sur top-cards** (`home.jsx:222-227`) â€” `window.snooze.add(id, 3)` + classe `is-snoozed` (opacity 0.4). **Ã€ auditer.**
- **Command palette** (`cockpit/command-palette.jsx`) â€” Ctrl+K. **Ã€ auditer.**
- **Panel-evening (Miroir du soir)** â€” dÃ©crit ci-dessus. **Ã€ auditer.**
- **Wiki-tooltip global** â€” script vanilla qui dÃ©core les Ã©lÃ©ments `wiki-decorated`. Touche tous les panels. **Ã€ auditer.**

## 1.4 Test rÃ©tention â€” visite nÂ°6 dans la semaine, Ã  J+6 du fix prÃ©cÃ©dent

Mise en situation : Jean ouvre le cockpit, cafÃ©, scan rapide, ferme. Friction observÃ©e *aujourd'hui*, aprÃ¨s les fixes :

1. **Le hero compact toggle (Â« Compact / Plein Â») est en haut Ã  droite du `.hero-frame`, en absolute** â€” il chevauche le coin du hero quand le contenu macro dÃ©borde. Sur narrow desktop (<1100px) oÃ¹ le hero est en single column, le bouton occupe l'espace de la lecture. **Position Ã  revoir.**
2. **Quand `useDeltaHero` est actif, le `<details>` "Voir le brief macro complet"** est rendu *sous* le bouton primaire Â« Lire les nouveautÃ©s Â». L'utilisateur qui ne se souvient plus du brief macro doit faire un sur-clic. C'est de la cognitive load gratuite : il faudrait afficher le titre du macro en sous-ligne dÃ¨s l'ouverture, sans clic supplÃ©mentaire.
3. **Zero-state Â« Tu as fait le tour Â»** â€” joli, mais *cliquer pour ouvrir le carnet d'idÃ©es* est la seule action proposÃ©e. Ã€ la 5e fois oÃ¹ l'on voit cette page, on a envie de dire Ã  Jarvis Â« capture une nouvelle idÃ©e Â». Manque un CTA `+ Nouvelle idÃ©e` direct.
4. **Snooze 3j** sur top-cards â€” fonctionne, mais aucun feedback visuel temporel : la carte passe juste Ã  `opacity: 0.4`. Pas de mention Â« rappel dans 3 jours Â», pas de petit badge Â« zZ Â». L'action paraÃ®t destructrice plus que reportÃ©e.
5. **Miroir du soir** â€” page minimaliste mais *trop minimaliste*. Ã€ 19h05, on s'attend Ã  un rÃ©cap stats + narrative ; on a un `<p>` HTML. C'est un MVP, pas une feature de rÃ©tention.
6. **Le `.panel-toolbar` blur-12px** â€” plus rien Ã  dire, il faut juste le finir. Sur iPhone 12 Pro mid-range, scroll un feed = saccades visibles Ã  cause de la composite layer gÃ©nÃ©rÃ©e pour rien.
7. **Le wiki-tooltip** est *rÃ©ussi*, mais l'auto-link sur les feeds trÃ¨s denses (Veille IA, 80+ articles affichÃ©s) souligne 30+ termes par page. La densitÃ© de soulignage devient bruit visuel â€” il faudrait n'en dÃ©corer que la **premiÃ¨re occurrence** de chaque terme par page (anchor unique), pas toutes.
8. **Le streak honnÃªte (=null si pas de donnÃ©e)** marche bien, mais quand `streak === 0` (pris hier), le texte Â« 0 j Â» apparaÃ®t rouge agressif. Ã€ 7h le matin un 0 rouge Ã©crasant n'invite pas Ã  reprendre â€” il faudrait teinte neutre quand `streak === 0`.
9. **Command palette (Ctrl+K)** â€” ne semble pas indexer les concepts wiki ni les idÃ©es. C'est juste de la nav. Pour un cockpit perso, c'est dommage : la moitiÃ© de la valeur d'une cmdK c'est de retrouver Â« ce concept dont je me souviens vaguement Â».
10. **Performance cold-start** â€” Babel-standalone + ~50 fichiers JSX chargÃ©s en sÃ©rie au boot, au moment oÃ¹ l'utilisateur attend le brief le matin. ~2-4s sur connexion 4G moyenne.  Aucun lazy-load des panels rarement utilisÃ©s (Jarvis-Lab fait ~55 KB minifiÃ©, Profile ~48 KB, Ideas ~55 KB â€” tous chargÃ©s au boot, mÃªme quand on ne va que lire le brief).

Ces 10 points sont les nouvelles frictions Ã  6 jours d'Ã©cart. Sur 30 jours, points 5, 6, 7 et 10 dominent.

---

# 2. Matrice d'Ã©valuation â€” scores et delta

Notation **1-5** (5 = excellent, 1 = Ã  reprendre). CritÃ¨res : **ClartÃ© Â· DensitÃ© Â· CohÃ©rence Â· Interactions Â· Mobile Â· A11y Â· RÃ©tention**. Î” = delta vs audit du 26 avril.

| Section | Cla | Den | Coh | Int | Mob | A11y | RÃ©t | **Moy.** | **Î”** |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Sidebar (nav + footer) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | **4.00** | +0.14 |
| Brief du jour (Home) | 4 | 4 | 3 | 4 | 4 | 3 | 5 | **3.86** | **+0.57** |
| Top du jour | 4 | 4 | 4 | 3 | 4 | 4 | 4 | **3.86** | +0.15 |
| Signaux faibles | 4 | 3 | 4 | 3 | 4 | 4 | 4 | **3.71** | +0.14 |
| Veille (5 feeds) | 3 | 3 | 3 | 3 | 4 | 3 | 3 | **3.14** | 0 |
| Veille outils (catalogue) | 3 | 3 | 2 | 3 | 3 | 3 | 3 | **2.86** | 0 |
| Wiki IA + tooltip global | 5 | 4 | 4 | 5 | 4 | 4 | 5 | **4.43** | **+0.72** |
| Radar / Recos / Challenges | 4 | 4 | 3 | 3 | 3 | 4 | 4 | **3.57** | +0.14 |
| OpportunitÃ©s / IdÃ©es | 4 | 4 | 3 | 4 | 3 | 3 | 4 | **3.57** | 0 |
| Jarvis (chat) | 4 | 4 | 4 | 4 | 3 | 3 | 5 | **3.86** | 0 |
| Forme / Musique / Gaming | 3 | 3 | 2 | 3 | 3 | 3 | 3 | **2.86** | 0 |
| Profil / Stacks / Historique | 3 | 4 | 3 | 3 | 4 | 3 | 3 | **3.29** | 0 |
| Loading states (skeletons) | 4 | 4 | 4 | 3 | 4 | 5 | 4 | **4.00** | +0.14 |
| Command palette / shortcuts | 4 | 5 | 4 | 4 | 2 | 4 | 4 | **3.86** | -0.14 |
| **NOUVEAU** Miroir du soir | 3 | 2 | 4 | 2 | 4 | 4 | 2 | **3.00** | nouveau |
| **NOUVEAU** Hero compact mode | 3 | 4 | 3 | 3 | 4 | 3 | 3 | **3.29** | nouveau |
| **NOUVEAU** Zero-state Brief | 5 | 4 | 4 | 3 | 4 | 4 | 3 | **3.86** | nouveau |

**Moyenne cockpit** : ~3.62 / 5 (vs 3.43 il y a 6 jours). **+0.19** en une semaine, l'essentiel grÃ¢ce Ã  Brief du jour, Wiki+tooltip et A11y globale.

## Top 3 forces (mises Ã  jour)

1. **Le funnel matinal a Ã©tÃ© rendu vivant.** Le hero qui reconnaÃ®t la derniÃ¨re visite (Â« 12 nouveaux depuis 8h Â»), le zero-state qui propose 2 idÃ©es dormantes, le Wiki-tooltip qui dÃ©core les concepts inline : trois patterns qui transforment le brief d'une page de lecture en *interface qui se souvient*. TrÃ¨s peu d'apps perso atteignent ce niveau.
2. **VÃ©locitÃ© d'exÃ©cution.** 7/10 quick wins shippÃ©s en 6 jours. La discipline du commit-template + spec-drift-check + lint-specs visible dans le repo est rÃ©elle, pas affichÃ©e. Ã€ ce rythme l'audit prochain auditera majoritairement de nouvelles surfaces.
3. **A11y est passÃ©e d'angle mort Ã  acquis cohÃ©rent.** Reduced-motion couvert globalement, contrastes WCAG AA passÃ©s sur Dawn et Atlas, touch targets mobile au-dessus de 40px. Le cockpit est dÃ©sormais *rÃ©ellement utilisable* pour quelqu'un qui filtre les animations ou utilise un tÃ©lÃ©phone Ã  une main.

## Top 3 faiblesses (mises Ã  jour)

1. **Tokens ignorÃ©s â€” la dette n'a pas bougÃ©.** Sur un audit Grep rÃ©cent dans les `cockpit/styles-*.css`, on trouve toujours `9.5px`, `10.5px`, `13.5px`, `17px`, `26px` etc. dans les CSS satellites. Aucun fix n'a Ã©tÃ© touchÃ© ici, aucun lint ajoutÃ©. Plus le projet grandit, plus le redressement coÃ»tera. **Le QW10 est Ã  dÃ©bloquer cette semaine ou il deviendra un quarter-of-work.**
2. **Performance cold-start.** ~50 scripts chargÃ©s en sÃ©rie au boot, dont `panel-jarvis-lab.jsx` (~55 KB), `panel-ideas.jsx` (~55 KB), `panel-profile.jsx` (~48 KB) â€” tous compilÃ©s en runtime par Babel-standalone. Sur 4G mobile = 3-5s avant le premier paint utile. Pour un cockpit destinÃ© Ã  Ãªtre ouvert *en premier le matin*, c'est une fuite sourde de rÃ©tention.
3. **Le Miroir du soir est une promesse non tenue.** Le mockup B de l'audit prior (stats row, narrative, pointeur d'absence) a Ã©tÃ© rendu en MVP minimum. Vu la place qu'occupe ce panel dans la stratÃ©gie de rÃ©tention (le moment introspectif du jour), il mÃ©rite une vraie pass produit, pas un `dangerouslySetInnerHTML` brut.

---

# 3. Quick Wins & Roadmap Jarvis (cycle May)

## 3.1 Top 10 Quick Wins â€” cycle de mai

TriÃ©s par ratio impact/effort dÃ©croissant. **Aucun double avec les QW shippÃ©s du cycle April.**

| # | Titre | Imp | Eff | Sections | Ratio |
|---|---|---:|---:|---|---:|
| MQW1 | Finir QW9 : retirer `backdrop-filter` du `.panel-toolbar` | 3 | 1 | Tous les feeds (Veille, Top, etc.) | **3.00** |
| MQW2 | Finir QW2 : `.card-action--ask` toujours visible (â‰¥0.55) | 4 | 1 | Top-cards, Signal-cards | **4.00** |
| MQW3 | Auto-link wiki = premiÃ¨re occurrence par page seulement | 3 | 2 | Tous les panels via `wiki-tooltip.js` | **1.50** |
| MQW4 | Streak `=0` neutre (pas rouge), garder rouge pour `<3j brisÃ©` | 2 | 1 | Sidebar footer | **2.00** |
| MQW5 | Snooze sur top-cards : badge Â« zZ rappel dans 3j Â» + undo | 3 | 2 | Top-card footer | **1.50** |
| MQW6 | Hero-compact toggle dÃ©placÃ© dans la barre d'actions ph-right | 3 | 1 | Home page header | **3.00** |
| MQW7 | Linter CSS hardcodÃ© : MQW10 du cycle prior, encore en dette | 5 | 4 | CI + tous les `.css` | **1.25** |
| MQW8 | Lazy-load des panels lourds (Jarvis-Lab, Ideas, Profile) | 4 | 3 | `cockpit/lib/data-loader.js` + `index.html` | **1.33** |
| MQW9 | Zero-state du Brief : ajouter CTA Â« + Nouvelle idÃ©e Â» direct | 2 | 1 | Home `isZeroState` block | **2.00** |
| MQW10 | Brief macro toujours visible (pas dans `<details>`) en mode delta | 3 | 1 | Home hero `useDeltaHero` branch | **3.00** |

**Recommandation d'ordonnancement** :
MQW1 â†’ MQW2 â†’ MQW4 â†’ MQW6 â†’ MQW9 â†’ MQW10 â†’ MQW5 â†’ MQW3 â†’ MQW8 â†’ MQW7 (le linter en dernier â€” il dÃ©pend que la dette de hardcoded values ne grossisse plus avant son arrivÃ©e).

## 3.2 Roadmap Jarvis â€” 15 features (cycle mai)

Score composite = **Impact Ã— FaisabilitÃ©**. Tri par composite â†“. Reprend les 3 features Jarvis non shippÃ©es du cycle prior et en ajoute 12 nouvelles.

| # | Feature | Imp | Fais | Wow | Comp | Description courte |
|---|---|---:|---:|---:|---:|---|
| MJ1 | Miroir du soir v2 : stats + narrative + pointeur absence | 5 | 4 | 4 | **20** | Reprendre le mockup B de l'audit prior. La routine Cowork Ã©crit `summary_html` dÃ©jÃ  â€” ajouter `stats JSONB`, narrative templating, et un check Â« tu n'as pas ouvert X depuis Y jours Â» cÃ´tÃ© `panel-evening.jsx`. |
| MJ2 | TTS Jarvis voix neuronale FR (J2 du cycle prior) | 5 | 4 | 5 | **20** | Remplacer `speechSynthesis` par un endpoint Cloudflare Worker qui pipe vers Edge TTS (gratuit) ou ElevenLabs free (10k chars/mois). Cache audio en `audio_briefs`. |
| MJ3 | Ask-Jarvis avec contexte parking (J3 du cycle prior) | 4 | 5 | 3 | **20** | Ajouter mÃ©moire courte Â« 3 derniers articles cliquÃ©s Â» cÃ´tÃ© `lib/snooze.js` ou nouveau `lib/parking.js`, injectÃ© dans le prompt prÃ©-rempli. |
| MJ4 | Recherche cross-cockpit unifiÃ©e (Ctrl+K v2) | 5 | 4 | 4 | **20** | La cmdK actuelle ne fait que de la nav. Elle devrait indexer client-side : concepts wiki, idÃ©es, signaux, opportunitÃ©s, articles 30 derniers jours. Ranking simple : exact match > prefix > fuzzy. Pas besoin de backend. |
| MJ5 | Mode lecture immersive sur articles (vue overlay) | 4 | 4 | 4 | **16** | Bouton Â« Lire ici Â» sur top-card et veille â€” au lieu d'ouvrir un nouvel onglet, overlay plein Ã©cran avec contenu cleanÃ© (Readability.js), mode focus, surbrillance des termes wiki. |
| MJ6 | Heatmap 30j Ã— 7 axes (cycle prior J12) | 4 | 4 | 4 | **16** | Vue calendrier dans le panel Radar : colonnes = axes, lignes = jours, intensitÃ© = activitÃ© (lecture, challenges, capture). InspirÃ© GitHub. |
| MJ7 | Reminder court vif : Â« 1 chose Ã  reprendre demain Â» | 4 | 4 | 3 | **16** | Ã€ 17h, un input dans le Brief : Â« Note la chose Ã  reprendre demain Â» (1 phrase). Le matin suivant, c'est la 1Ã¨re chose qui s'affiche en kicker du hero. |
| MJ8 | Mood/effort tracker dans le Brief (1 question/jour) | 3 | 5 | 3 | **15** | Sous le hero, micro-question rotative (Â« Niveau d'Ã©nergie ce matin ? Â», Â« Une chose qui t'a marquÃ© hier ? Â»). 1 click answer ou skip. StockÃ© en `morning_pulse`. Alimente le miroir du soir. |
| MJ9 | Annotations privÃ©es sur articles (post-it) | 4 | 4 | 3 | **16** | Cycle prior J10, toujours pertinent. Click-long ou Maj+clic = post-it inline persistÃ© en `user_annotations`. |
| MJ10 | Onboarding Â« rituel matinal Â» : 3 sessions guidÃ©es | 4 | 4 | 3 | **16** | Premier lancement / fin du tutoriel : guide 3-min interactif (Â« scroll du brief Â· ouvre 1 article Â· marque tout lu Â»). Devient skippable dÃ¨s la 2e session. |
| MJ11 | Quiet hours configurables (pas seulement 22-6h) | 3 | 5 | 2 | **15** | Sliders dans Profil : tu choisis tes heures d'auto-Obsidian. StockÃ© en `user_profile.quiet_hours`. Default reste 22-6h. |
| MJ12 | Â« Toi vs il y a 1 mois Â» : timeline compÃ©tences | 4 | 3 | 4 | **12** | Toggle dans le panel Radar : compare snapshot d'aujourd'hui vs J-30. Voile fantÃ´me de l'ancien polygone, deltas par axe en marge. |
| MJ13 | Streak partagÃ© multi-axes avec rÃ©cup (cycle prior J6) | 4 | 4 | 3 | **16** | 3 streaks visibles : veille / sport / idÃ©es. Jour de grÃ¢ce hebdo. Badge visuel monthly. |
| MJ14 | Mini-jeu de rÃ©vision wiki (5 cartes/jour, gamifiÃ©) | 3 | 4 | 4 | **12** | Cartes Q/A inspirÃ©es d'Anki, sur les 142 concepts wiki. 5 cartes/jour, 30s chrono. Score loggÃ©. Aiguille le radar. |
| MJ15 | SynthÃ¨se hebdo Claude Sonnet imprimable A4 (cycle prior J15) | 4 | 3 | 5 | **12** | GÃ©nÃ©rÃ©e dimanche soir. Bouton Â« Imprimer la semaine Â» dans le Brief lundi. PDF via window.print + CSS print-only. |

## 3.3 Mockups textuels â€” 3 features choisies

### Mockup A â€” MJ1 : Miroir du soir v2

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚  19:04 Â· MIROIR DU SOIR Â· samedi 2 mai 2026                         â”‚
â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚                                                                     â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”      â”‚
â”‚  â”‚ COCKPIT   â”‚ ARTICLES  â”‚ IDÃ‰ES     â”‚ JARVIS    â”‚ STREAK    â”‚      â”‚
â”‚  â”‚   47 min  â”‚     8     â”‚     2     â”‚   3 chats â”‚  +1 â†’ 4j  â”‚      â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜      â”‚
â”‚                                                                     â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€              â”‚
â”‚                                                                     â”‚
â”‚  Tes 8 lectures du matin pointaient toutes vers les agents          â”‚
â”‚  d'entreprise (4/8 articles, 2 ouvertures du signal "agent          â”‚
â”‚  memory"). Cette focalisation aligne avec ton challenge LoRA        â”‚
â”‚  en cours et l'opportunitÃ© Mistral Ã— BNP marquÃ©e hier.              â”‚
â”‚                                                                     â”‚
â”‚  Une seule idÃ©e a passÃ© le seuil "incubating" :                     â”‚
â”‚   Â· #jarvis "SynthÃ¨se soir miroir v2" (toi-mÃªme, 09:13)             â”‚
â”‚                                                                     â”‚
â”‚  â“˜ Tu n'as pas ouvert la Veille outils depuis 6 jours.              â”‚
â”‚      â†’ Demain ? Le brief s'ouvrira sur ce qui a bougÃ© lÃ -bas.       â”‚
â”‚                                                                     â”‚
â”‚  â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€              â”‚
â”‚  ðŸ“‹ Voir l'archive Â· ðŸ’¬ Demander Ã  Jarvis Â· âœï¸ Note pour demain      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Reprend le mockup B de l'audit prior. La routine Cowork Ã©crit dÃ©jÃ  `summary_html` ; on ajoute `stats JSONB` (cockpit_minutes, articles_read, ideas_captured, jarvis_chats, streak_after) que `panel-evening.jsx` rend en grille 5 colonnes au-dessus de la narrative. Le pointeur d'absence est calculÃ© cÃ´tÃ© front (lecture rapide de `usage_events` filtrÃ© sur `section_opened`).

### Mockup B â€” MJ4 : Ctrl+K v2 (recherche cross-cockpit)

```
                    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                    â”‚ ðŸ”  agent memory                       Esc âœ• â”‚
                    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
                    â”‚ NAVIGATION (2)                               â”‚
                    â”‚   â†’ Aller au Wiki                       âŽ    â”‚
                    â”‚   â†’ Aller aux Signaux faibles                â”‚
                    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
                    â”‚ CONCEPTS WIKI (3)                            â”‚
                    â”‚   â–¸ Memory Args               18 articles    â”‚
                    â”‚   â–¸ Context Window           42 articles    â”‚
                    â”‚   â–¸ Long-term Memory          5 articles    â”‚
                    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
                    â”‚ SIGNAUX (1)                                  â”‚
                    â”‚   â–¸ "agent memory" â€” RISING  +12 mentions    â”‚
                    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
                    â”‚ IDÃ‰ES & OPPS (1)                             â”‚
                    â”‚   â–¸ "Agents avec mÃ©moire long terme"         â”‚
                    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
                    â”‚ ARTICLES 30J (4)                             â”‚
                    â”‚   Â· Anthropic â€” Memory Args API     2j       â”‚
                    â”‚   Â· MIT â€” Compositional memory      6j       â”‚
                    â”‚   Â· â€¦                                        â”‚
                    â”‚ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ â”‚
                    â”‚ âŒƒJ Demander Ã  Jarvis "agent memory"          â”‚
                    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Une seule fenÃªtre ; mÃªmes raccourcis que la cmdK actuelle (`â†‘â†“` nav, `âŽ` ouvrir, `âŒ˜âŒ«` clear). Index client construit au boot (Tier 1) sur les 5 collections â€” rebuild lazy quand le user tape. Pas de backend, pas de `pg_search`.

### Mockup C â€” MJ7 : Reminder Â« 1 chose Ã  reprendre demain Â»

```
   Hero du Brief (matin du 3 mai)
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚ S18 Â· J+123 Â· / BRIEF DU JOUR Â· dimanche 3 mai 2026          â”‚
   â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
   â”‚                                                              â”‚
   â”‚   â˜… HIER SOIR TU AS NOTÃ‰                                     â”‚
   â”‚     "Reprendre le bench LoRA â€” comparer 7B vs 13B"           â”‚
   â”‚                                       [ Aller au Lab â†— ]     â”‚
   â”‚                                                              â”‚
   â”‚   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€                              â”‚
   â”‚                                                              â”‚
   â”‚   12 nouveautÃ©s depuis hier soir.                            â”‚
   â”‚   â€¦                                                          â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

   Brief du soir (17h, hier)
   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
   â”‚  âœï¸  La chose Ã  reprendre demain                             â”‚
   â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”‚
   â”‚  â”‚  Reprendre le bench LoRA â€” comparer 7B vs 13B|       â”‚    â”‚
   â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â”‚
   â”‚  Sera affichÃ©e en 1Ã¨re ligne du brief demain matin Â· skip âœ• â”‚
   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

Une seule phrase, pas un journal. StockÃ©e en `user_profile.tomorrow_note` (un seul slot, Ã©crasÃ©). Ã€ l'ouverture suivante, la phrase remplace temporairement le `morning-card` ou s'affiche en kicker hero ; bouton Â« OK fait Â» pour la dÃ©gager. C'est le pattern Â« note-to-future-self Â» le plus minimal qui existe â€” et le plus addictif.

---

# 4. Prompts Claude Code

Format : un prompt par fix, **auto-suffisant** (Claude Code peut l'exÃ©cuter sans avoir lu cet audit). Tags : `[UX]` quick win UX, `[A11Y]` accessibilitÃ©, `[PERF]` performance, `[JARVIS]` feature avancÃ©e. PrioritÃ©s : **P0** (â‰¤30 min, impact Ã©levÃ©) â€” **P1** (30 minâ€“2h) â€” **P2** (polish + features Jarvis).

> âš ï¸ **Stack rappel** : tous les prompts ciblent **`cockpit/*.jsx` ou `cockpit/*.css`**. Le projet utilise React 18 + Babel-standalone (CDN). `index.html` n'est qu'une coquille. Babel `text/babel` compile le JSX en runtime â€” pas de build step, mais **pas de syntaxe ES module non plus** (toutes les exports passent par `window.X`).

## P0 â€” Quick wins immÃ©diats

---

### Prompt 1 â€” [PERF] Finir QW9 : retirer `backdrop-filter` du `.panel-toolbar`

**PrioritÃ©** : P0 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/styles.css`

```text
Contexte : le projet React + Babel cockpit/ a un sticky-header gÃ©nÃ©rique
.panel-toolbar utilisÃ© par les panels Veille (Veille IA, Claude, Sport,
Gaming-news, Anime, ActualitÃ©s) et plusieurs autres feeds. Il dÃ©clare
`backdrop-filter: blur(12px)` Ã  cockpit/styles.css ligne 2119, mais sa
rÃ¨gle `background: var(--bg2)` est OPAQUE sur les 3 thÃ¨mes (Dawn,
Obsidian, Atlas). Aucun effet visuel, uniquement un coÃ»t GPU sur mobile
(Safari iOS surtout) qui crÃ©e une composite layer permanente et fait
saccader le scroll des feeds longs.

TÃ¢che :
1. Ouvrir cockpit/styles.css, localiser le sÃ©lecteur `.panel-toolbar`
   (ligne ~2113-2120).
2. Supprimer la ligne `backdrop-filter: blur(12px);` (et uniquement
   celle-lÃ ).

Le 2e backdrop-filter du fichier (ligne ~3245) est sur un overlay
modal lÃ©gitime â€” le LAISSER intact.

Contrainte : aucune autre modification du sÃ©lecteur. Ne pas toucher au
`background`, `position`, `z-index` ou `border-bottom`.

Validation : ouvrir DevTools > Rendering > "Layer borders" + scroller le
panel "Veille IA" sur Chrome mobile emulation. La composite layer du
.panel-toolbar disparaÃ®t ; aucun changement visuel sur les 3 thÃ¨mes.
```

---

### Prompt 2 â€” [UX] Finir QW2 : `.card-action--ask` toujours visible

**PrioritÃ©** : P0 Â· **DÃ©pend de** : aucun Â· **Fichiers** : `cockpit/styles.css`

```text
Contexte : sur le Brief du jour (cockpit/home.jsx) et les Signaux
faibles (cockpit/panel-signals.jsx), chaque carte top/signal a
deux boutons d'action en bas Ã  droite : `.card-action--bookmark` et
`.card-action--ask`. Le 26 avril, l'audit demandait que ces boutons
soient toujours visibles (au moins opacity 0.55) au lieu d'apparaÃ®tre
seulement au hover. La consigne a Ã©tÃ© appliquÃ©e Ã  `.top-card .top-actions`
(qui passe Ã  opacity 0.55 dans cockpit/styles.css ligne ~1417) MAIS pas
au sÃ©lecteur isolÃ© `.card-action--ask` qui reste invisible jusqu'au hover.

ConsÃ©quence : sur les sig-cards (.sig-card-foot .sig-card-ask) et toutes
les cartes qui n'utilisent pas la classe wrapper .top-actions, le bouton
"Ask Jarvis" reste invisible. Sur tactile c'est inaccessible.

TÃ¢che :
1. Ouvrir cockpit/styles.css.
2. Chercher TOUS les sÃ©lecteurs qui portent `.card-action--ask`,
   `.card-action--bookmark` ou similaire.
3. Pour chaque rÃ¨gle qui contient `opacity: 0;` (ou mÃªme un hÃ©ritage
   implicite), ajouter une rÃ¨gle de baseline EN AMONT :
   ```
   .card-action--ask,
   .card-action--bookmark {
     opacity: 0.55;
     transition: opacity 120ms ease;
   }
   .card-action--ask:hover,
   .card-action--bookmark:hover,
   .card-action--ask:focus-visible,
   .card-action--bookmark:focus-visible {
     opacity: 1;
   }
   ```
4. Ajouter ce bloc dans la section "card actions" (chercher le commentaire
   â•â•â• CARD ACTIONS â•â•â• ou similaire, sinon le placer aprÃ¨s la ligne 1400).

Contrainte : ne jamais redescendre l'opacity Ã  0. Le bouton doit rester
*au minimum* opacity 0.55 (lisible mais discret). Sur mobile, le media
query existant Ã  styles-mobile.css l'a dÃ©jÃ  mis Ã  1 â€” laisser cette
override mobile en place.

Validation : sur le panel Signaux faibles, ouvrir la page sans bouger la
souris. Le pictogramme "Ask Jarvis" est visible sur toutes les cartes.
Au hover il devient opaque. Au tab-focus l'outline orange apparaÃ®t.
```

---

### Prompt 3 â€” [UX] MQW4 : Streak `=0` neutre, pas rouge

**PrioritÃ©** : P0 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/sidebar.jsx` + `cockpit/styles.css`

```text
Contexte : la sidebar footer affiche un streak de veille (icÃ´ne flamme
+ chiffre + suffixe "j"). Quand `streak === 0` (le user a cassÃ© sa
chaÃ®ne hier), le rendu actuel utilise `--critical` (rouge) en
permanence pour l'icÃ´ne et le chiffre. Ã€ 7h du matin un 0 rouge Ã©crasant
n'invite pas Ã  reprendre la veille â€” il rappelle seulement l'Ã©chec.

TÃ¢che : modifier la classe appliquÃ©e selon la valeur du streak :
1. Ouvrir cockpit/sidebar.jsx, localiser le bloc qui rend
   `.sb-foot-streak` (vers ligne ~143-160 selon le diff).
2. Ajouter une variante de classe :
   ```jsx
   const streakState = streak === null ? "empty"
                     : streak === 0    ? "zero"
                     : streak < 3      ? "fragile"
                     : "ok";
   ```
3. Appliquer la classe sur le wrapper :
   ```jsx
   <div className={`sb-foot-streak sb-foot-streak--${streakState}`}>
   ```
4. Dans cockpit/styles.css, ajouter :
   ```css
   .sb-foot-streak--zero .sb-foot-streak-icon,
   .sb-foot-streak--zero .sb-foot-streak-num { color: var(--tx2); }
   .sb-foot-streak--fragile .sb-foot-streak-icon,
   .sb-foot-streak--fragile .sb-foot-streak-num { color: var(--neutral); }
   .sb-foot-streak--ok .sb-foot-streak-icon,
   .sb-foot-streak--ok .sb-foot-streak-num { color: var(--brand); }
   ```
5. Retirer toute occurrence de `color: var(--critical)` directement sur
   `.sb-foot-streak-icon` ou `.sb-foot-streak-num`.

Contrainte : conserver le rendu "empty" dÃ©jÃ  en place (cf. QW prior).
Pas de `var(--alert)` ni `--critical` sur cette zone â€” le streak est un
encouragement, pas une alarme.

Validation : forcer `streak = 0` en localStorage, recharger : icÃ´ne +
chiffre en gris neutre. Forcer `streak = 2` : couleur ambrÃ©e. Forcer
`streak = 14` : couleur brand (rouille / cyan / indigo selon thÃ¨me).
Aucun rouge sur la sidebar dans ces 3 cas.
```

---

### Prompt 4 â€” [UX] MQW6 : Hero-compact toggle dans la barre d'actions, pas en flottant

**PrioritÃ©** : P0 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/home.jsx` + `cockpit/styles.css`

```text
Contexte : cockpit/home.jsx lignes ~390-400 rend un bouton
.hero-compact-toggle en `position: absolute` dans le `.hero-frame`. En
single-column (max-width 1100px), ce bouton chevauche la zone de lecture
du hero. Il faut le dÃ©placer dans le `<header className="ph">` (page
header, ligne ~348), aux cÃ´tÃ©s de l'AudioBriefChip et du "Tout marquÃ©
lu", pour libÃ©rer l'espace de lecture.

TÃ¢che :
1. Dans cockpit/home.jsx :
   a. Couper le `<button className="hero-compact-toggle">â€¦</button>`
      du `.hero-frame` (lignes ~391-400).
   b. Le coller dans `.ph-right` (ligne ~356) AVANT l'AudioBriefChip,
      avec la classe rebrandÃ©e :
      ```jsx
      <button
        className="ph-chip ph-compact-toggle"
        onClick={toggleHeroCompact}
        title={heroCompact ? "Hero plein format" : "Hero compact"}
        aria-label={heroCompact ? "Ã‰tendre le hero" : "RÃ©duire le hero"}
        aria-pressed={heroCompact}
      >
        <Icon name={heroCompact ? "chevron_down" : "chevron_up"} size={12} stroke={2} />
        {heroCompact ? "Plein" : "Compact"}
      </button>
      ```
2. Dans cockpit/styles.css :
   a. Supprimer le sÃ©lecteur `.hero-compact-toggle` qui le positionnait
      en absolute (et son block CSS associÃ©).
   b. Le remplacer par une mini-rÃ¨gle pour le placement chip :
      ```css
      .ph-compact-toggle { font-family: var(--font-mono); font-size: var(--text-2xs); letter-spacing: 0.06em; text-transform: uppercase; }
      ```
   c. La rÃ¨gle `.hero.is-compact .hero-frame { padding: ... }` reste
      intacte (c'est ce qui donne le mode compact son effet visuel).

Contrainte : ne pas dupliquer le bouton ; ne pas crÃ©er un nouveau
composant React si on peut l'inliner.

Validation : sur le Brief du jour, le bouton "Compact / Plein" apparaÃ®t
en haut Ã  droite, Ã  cÃ´tÃ© de "Tout marquÃ© lu". Plus aucun bouton flottant
dans la zone de lecture du hero. Le toggle continue de mÃ©moriser l'Ã©tat
en localStorage `cockpit-hero-compact`.
```

---

### Prompt 5 â€” [UX] MQW9 : CTA "+ Nouvelle idÃ©e" dans le zero-state

**PrioritÃ©** : P0 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/home.jsx`

```text
Contexte : cockpit/home.jsx lignes ~502-527 rend un Ã©tat "Tu as fait le
tour. Bravo." quand tout est lu. Le seul CTA proposÃ© est "Ouvrir le
carnet". Ã€ la 5e fois oÃ¹ le user voit cette page, il a souvent envie de
*capturer une idÃ©e fraÃ®che* qui vient de le traverser, pas d'aller
parcourir le carnet.

TÃ¢che : dans cockpit/home.jsx, dans le bloc `<div className="zero-state-actions">`
(vers ligne ~520-525), AJOUTER un bouton primaire en premiÃ¨re position :

```jsx
<div className="zero-state-actions">
  <button
    className="btn btn--primary btn--sm"
    onClick={() => {
      try {
        localStorage.setItem("ideas-prefill", JSON.stringify({
          source: "zero-state",
          captured_at: new Date().toISOString(),
        }));
      } catch {}
      onNavigate("ideas");
    }}
  >
    + Nouvelle idÃ©e <Icon name="arrow_right" size={12} stroke={2} />
  </button>
  <button className="btn btn--ghost btn--sm" onClick={() => onNavigate("ideas")}>
    Ouvrir le carnet <Icon name="arrow_right" size={12} stroke={2} />
  </button>
</div>
```

CÃ´tÃ© `cockpit/panel-ideas.jsx`, vÃ©rifier rapidement (sans modif si dÃ©jÃ 
gÃ©rÃ©) que `localStorage.getItem("ideas-prefill")` est lu au mount du
panel pour ouvrir le formulaire de capture vide. Si Ã§a n'existe pas,
laisser ce travail comme TODO dans le prompt â€” la nav suffit pour ce
QW.

Contrainte : ne pas ajouter de modal inline dans home.jsx â€” la capture
reste dans son panel. Le bouton est un raccourci de navigation, pas une
nouvelle UI.

Validation : marquer tous les top-articles comme lus + s'assurer
qu'aucun unread n'existe. Le zero-state apparaÃ®t avec deux CTAs cÃ´te Ã 
cÃ´te. Cliquer "+ Nouvelle idÃ©e" navigue vers le carnet. TÃ©lÃ©mÃ©trie
existante `zero_state_shown` reste inchangÃ©e (loggÃ©e Ã  l'apparition).
```

---

### Prompt 6 â€” [UX] MQW10 : Brief macro toujours visible en mode delta

**PrioritÃ©** : P0 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/home.jsx` + `cockpit/styles.css`

```text
Contexte : cockpit/home.jsx lignes ~421-453 rendent une variante de
hero quand `useDeltaHero === true` (l'utilisateur revient < 18h aprÃ¨s
sa derniÃ¨re visite). Le `.hero-title` devient "X nouveautÃ©s depuis Yh"
et la liste des nouveaux articles est exposÃ©e. Le brief macro original
(`macro.title` + `macro.body`) est repliÃ© dans un `<details>` au pied
du hero â€” il faut un clic pour y accÃ©der.

ConsÃ©quence : un utilisateur qui revient Ã  13h pour relire le brief de
9h doit faire un sur-clic. Cognitive load gratuite.

TÃ¢che : modifier le rendu du hero pour montrer le `macro.title`
en sous-titre permanent, sans `<details>`.

1. Dans cockpit/home.jsx, dans la branche `useDeltaHero ? (...) : (...)`,
   remplacer le bloc :
   ```jsx
   <details className="hero-macro-collapse">
     <summary>Voir le brief macro complet</summary>
     <h1 className="hero-title">{macro.title}</h1>
     <p className="hero-body">{macro.body}</p>
   </details>
   ```
   par :
   ```jsx
   <div className="hero-macro-inline">
     <div className="hero-macro-eyebrow">Brief macro de la matinÃ©e</div>
     <h2 className="hero-macro-title">{macro.title}</h2>
     <p className="hero-macro-body">{macro.body}</p>
   </div>
   ```

2. Dans cockpit/styles.css, ajouter :
   ```css
   .hero-macro-inline {
     margin-top: var(--space-5);
     padding-top: var(--space-4);
     border-top: 1px solid var(--bd);
   }
   .hero-macro-eyebrow {
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.14em;
     text-transform: uppercase;
     color: var(--tx3);
     margin-bottom: var(--space-2);
   }
   .hero-macro-title {
     font-family: var(--font-display);
     font-size: var(--text-2xl);
     font-weight: 500;
     color: var(--tx);
     margin-bottom: var(--space-2);
     line-height: 1.2;
   }
   .hero-macro-body {
     font-size: var(--text-md);
     color: var(--tx2);
     line-height: 1.6;
     max-width: 65ch;
   }
   ```

3. Supprimer la rÃ¨gle `.hero-macro-collapse` et `.hero-macro-collapse summary`
   du fichier styles.css si elles existent (chercher avec Grep avant
   modif).

Contrainte : ne PAS toucher la branche else (cas non-delta) oÃ¹ le hero
title est dÃ©jÃ  `macro.title`. Le changement ne concerne QUE la branche
useDeltaHero.

Validation : revenir au cockpit < 18h aprÃ¨s une visite : le hero affiche
"X nouveautÃ©s depuis Yh" en grand, la liste delta, les boutons primaires
ET *en dessous* le titre macro avec un sous-eyebrow "Brief macro de la
matinÃ©e". Plus aucun `<details>` Ã  ouvrir.
```

---

## P1 â€” UX significative (30 minâ€“2h)

---

### Prompt 7 â€” [UX] MQW3 : Wiki tooltip = premiÃ¨re occurrence par page seulement

**PrioritÃ©** : P1 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/lib/wiki-tooltip.js`

```text
Contexte : `cockpit/lib/wiki-tooltip.js` dÃ©core tous les Ã©lÃ©ments
contenant des termes wiki connus avec une classe `.wiki-decorated` +
soulignement + tooltip au survol. Sur les feeds trÃ¨s denses (panel
Veille IA, 80+ articles affichÃ©s), un mÃªme terme peut Ãªtre soulignÃ©
30 fois sur la mÃªme page. DensitÃ© de dÃ©coration = bruit visuel = scan
plus difficile.

TÃ¢che : modifier l'algorithme de dÃ©coration pour qu'un terme donnÃ©
ne soit dÃ©corÃ© que SUR SA PREMIÃˆRE OCCURRENCE dans la page courante.

1. Ouvrir cockpit/lib/wiki-tooltip.js.
2. Localiser la fonction qui scanne le DOM (probablement nommÃ©e
   `decorate()`, `scan()` ou `applyTooltips()`).
3. Au dÃ©but de cette fonction, crÃ©er un Set local `seenSlugs = new Set()`.
4. Avant de poser une dÃ©coration sur un noeud texte, vÃ©rifier :
   `if (seenSlugs.has(slug)) { return; /* skip */ }`.
   Sinon dÃ©corer + `seenSlugs.add(slug)`.

Si la dÃ©coration utilise un MutationObserver pour les contenus injectÃ©s
plus tard (changement de panel par exemple), rÃ©initialiser `seenSlugs`
Ã  chaque navigation. Pour ce faire, exposer une fonction
`window.wikiTooltipReset()` que `cockpit/app.jsx` appellera dans son
`handleNavigate` (avant `setActivePanel`).

CÃ´tÃ© cockpit/app.jsx :
- Localiser `handleNavigate` (function principale qui fait `setActivePanel`).
- Avant `setActivePanel(id)`, ajouter :
  `if (typeof window.wikiTooltipReset === "function") window.wikiTooltipReset();`

Contrainte : ne pas casser le tooltip sur survol â€” le wiki-tt doit
toujours s'afficher sur les termes dÃ©corÃ©s. Les termes non dÃ©corÃ©s
(occurrences 2+) restent du texte normal. Le SCAN pour la dÃ©coration
se fait toujours sur les nouveaux nodes via MutationObserver.

Validation : ouvrir le panel "Veille IA" (80+ articles). Faire un
Ctrl+F sur "memory" : compter les occurrences. Compter les soulignements
(Ã©lÃ©ments `.wiki-decorated[data-slug="..."]`). Le 2e nombre doit Ãªtre
â‰¤ nombre de termes uniques (1-2 max). Naviguer vers Wiki puis revenir :
le scan reset, premiÃ¨re occurrence du panel Ã  nouveau dÃ©corÃ©e.
```

---

### Prompt 8 â€” [UX] MQW5 : Snooze top-card avec badge temporel + undo

**PrioritÃ©** : P1 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/home.jsx` + `cockpit/styles.css`

```text
Contexte : cockpit/home.jsx lignes ~222-227 implÃ©mentent un `snoozeCard`
qui marque une top-card comme `is-snoozed` (opacity 0.4 dans styles.css
ligne ~1451). Aucun feedback temporel n'apparaÃ®t : la carte se grise
sans expliquer "rappel dans 3 jours". L'action paraÃ®t destructrice.
Aucun undo non plus.

TÃ¢che : ajouter un badge visuel sur la carte snoozÃ©e + une toast undo de
6s (rÃ©utiliser le pattern existant pour `markAllRead`).

1. Dans cockpit/home.jsx, modifier `snoozeCard` :
   ```jsx
   const [snoozeUndo, setSnoozeUndo] = React.useState(null);
   const snoozeCard = (id, rank) => {
     if (!id || !window.snooze) return;
     window.snooze.add(id, 3);
     setSnoozedTop((prev) => ({ ...prev, [rank]: true }));
     if (snoozeUndo && snoozeUndo.timer) clearTimeout(snoozeUndo.timer);
     const timer = setTimeout(() => setSnoozeUndo(null), 6000);
     setSnoozeUndo({ id, rank, timer });
   };
   const undoSnooze = () => {
     if (!snoozeUndo) return;
     clearTimeout(snoozeUndo.timer);
     try { window.snooze.remove(snoozeUndo.id); } catch {}
     setSnoozedTop((prev) => { const c = { ...prev }; delete c[snoozeUndo.rank]; return c; });
     setSnoozeUndo(null);
   };
   ```
   (Note : si `window.snooze.remove()` n'existe pas, ajouter la fonction
   correspondante dans `cockpit/lib/snooze.js`.)

2. Sur la `<article className="top-card â€¦">` (autour ligne ~560-595),
   quand `snoozedTop[t.rank]` est vrai, ajouter un badge inline avant
   le `.top-card-foot` :
   ```jsx
   {snoozedTop[t.rank] && (
     <div className="top-card-snooze-badge">
       <Icon name="clock" size={11} stroke={2} /> ReprogrammÃ© Â· revient dans 3 jours
     </div>
   )}
   ```

3. Ajouter une toast undo en pied de Brief, juste aprÃ¨s le bloc `markAllRead`
   undo (chercher `.ph-undo-toast`) :
   ```jsx
   {snoozeUndo && (
     <div className="ph-undo-toast" role="status">
       <Icon name="check" size={12} stroke={2} />
       Article reportÃ© de 3 jours
       <button onClick={undoSnooze} className="ph-undo-btn">Annuler</button>
     </div>
   )}
   ```

4. Dans cockpit/styles.css :
   ```css
   .top-card-snooze-badge {
     display: inline-flex; align-items: center; gap: var(--space-2);
     margin-top: var(--space-2);
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.04em;
     color: var(--tx3);
     padding: var(--space-1) var(--space-2);
     background: var(--bg2);
     border-radius: var(--radius);
     border: 1px dashed var(--bd);
   }
   ```

Contrainte : pas de double toast (markAllRead + snooze coexistant) â€” si
les deux sont actifs, afficher une seule toast avec le message le plus
rÃ©cent. Empile-les en queue si tu veux faire mieux mais ce n'est pas
requis pour ce ticket.

Validation : cliquer "Snooze" sur une top-card. La carte passe en
opacitÃ© rÃ©duite + badge "ReprogrammÃ© Â· revient dans 3 jours" visible.
Une toast en pied apparaÃ®t avec un bouton "Annuler". Cliquer Annuler
restaure la carte Ã  son Ã©tat initial. Sans clic, la toast disparaÃ®t
en 6s mais le snooze reste actif (la carte reste reprogrammÃ©e).
```

---

### Prompt 9 â€” [JARVIS] MJ4 : Recherche cross-cockpit unifiÃ©e (Ctrl+K v2)

**PrioritÃ©** : P1 Â· **DÃ©pend de** : aucun Â· **Fichier** : `cockpit/command-palette.jsx`

```text
Contexte : la command palette actuelle (cockpit/command-palette.jsx,
~3.4 KB) ne fait que de la navigation entre panels. Pour un cockpit
perso, la moitiÃ© de la valeur d'un Ctrl+K est de retrouver "ce concept
dont je me souviens vaguement" sans devoir naviguer.

TÃ¢che : Ã©tendre la cmdK pour indexer cÃ´tÃ© client (Tier 1 data dÃ©jÃ 
hydratÃ©e) :
- 5 collections Ã  indexer : `WIKI_DATA.concepts`, `IDEAS_DATA.ideas`,
  `SIGNALS_DATA.signals`, `OPPORTUNITIES_DATA.opportunities`,
  `COCKPIT_DATA.top` (articles 30j).
- Sections groupÃ©es dans le rÃ©sultat : NAVIGATION (panels),
  CONCEPTS WIKI, SIGNAUX, IDÃ‰ES & OPPS, ARTICLES.

Ranking simple, pas de lib externe :
- exact match (case-insensitive sur title/name) â†’ score 100
- prefix match â†’ score 80
- substring match â†’ score 60
- fallback fuzzy (tous les caractÃ¨res de la requÃªte prÃ©sents dans
  l'ordre) â†’ score 30

Tri global par score, puis par section (navigation d'abord pour
prÃ©server le comportement actuel).

ImplÃ©mentation :
1. Au mount, construire une liste plate `index[]` :
   ```js
   const index = React.useMemo(() => {
     const items = [];
     (window.WIKI_DATA?.concepts || []).forEach(c => items.push({
       kind: "wiki", id: c.slug, label: c.name,
       sub: `${c.mentions || 0} articles`, navigate: () => { window.location.hash = `#wiki/${c.slug}`; }
     }));
     (window.IDEAS_DATA?.ideas || []).forEach(i => items.push({
       kind: "idea", id: i.id, label: i.title,
       sub: i.kicker || "IdÃ©e", navigate: () => onNavigate("ideas")
     }));
     (window.SIGNALS_DATA?.signals || []).forEach(s => items.push({
       kind: "signal", id: s.name, label: s.name,
       sub: `${s.trend} Â· ${s.count} mentions`, navigate: () => onNavigate("signals")
     }));
     (window.OPPORTUNITIES_DATA?.opportunities || []).forEach(o => items.push({
       kind: "opp", id: o.id, label: o.title,
       sub: o.category || "", navigate: () => onNavigate("opps")
     }));
     (window.COCKPIT_DATA?.top || []).slice(0, 60).forEach(a => items.push({
       kind: "article", id: a._id || a.id, label: a.title,
       sub: `${a.source} Â· ${a.date}`, url: a._url || a.url
     }));
     return items;
   }, []);
   ```

2. Pour chaque keystroke dans la query, scorer items et garder top 12.

3. Rendre groupÃ© par `kind`, sÃ©parateurs section, tout dans la mÃªme
   liste navigable au â†‘â†“.

Contrainte : pas de lib externe (Fuse.js etc.). L'index doit Ãªtre
construit cÃ´tÃ© client Ã  partir de Tier 1 data dÃ©jÃ  hydratÃ©e â€” aucun
fetch supplÃ©mentaire. Performance cible : <16ms par keystroke pour
1500 items max.

Validation : Ctrl+K + taper "memory" : voir 3-5 concepts wiki, 1-2
signaux, et 3-5 articles regroupÃ©s par section. â†‘â†“ navigue Ã  travers
toutes les sections. EntrÃ©e ouvre le bon item (article = `window.open`,
le reste = navigate panel ou hash deep-link). Esc ferme.
```

---

### Prompt 10 â€” [PERF] MQW8 : Lazy-load des panels lourds

**PrioritÃ©** : P1 Â· **DÃ©pend de** : aucun Â· **Fichiers** : `index.html` + `cockpit/lib/data-loader.js`

```text
Contexte : index.html charge ~26 panels JSX en sÃ©rie au boot, dont les
3 plus lourds (>40 KB chacun) :
- cockpit/panel-jarvis-lab.jsx (~55 KB)
- cockpit/panel-ideas.jsx (~55 KB)
- cockpit/panel-profile.jsx (~48 KB)

Babel-standalone les compile en runtime, ce qui ajoute ~600-1200ms sur
4G mobile pour ces 3 fichiers, alors qu'un user matinal n'ouvre que le
Brief 80% du temps.

TÃ¢che : dÃ©placer le chargement de ces 3 panels en LAZY mode, dÃ©clenchÃ©
au premier `loadPanel("jarvis-lab")`, `loadPanel("ideas")`, `loadPanel("profile")`.

1. Dans index.html, RETIRER les 3 lignes `<script type="text/babel" src="cockpit/panel-{jarvis-lab,ideas,profile}.jsx?â€¦">`.

2. Dans cockpit/lib/data-loader.js, dans `loadPanel(id)` :
   - Ajouter un dispatcher pour ces 3 panels qui injecte dynamiquement
     leur script :
     ```js
     const LAZY_PANELS = {
       "jarvis-lab": "cockpit/panel-jarvis-lab.jsx?v=7",
       "ideas":      "cockpit/panel-ideas.jsx?v=4",
       "profile":    "cockpit/panel-profile.jsx?v=3",
     };
     async function loadLazyPanelScript(id) {
       const src = LAZY_PANELS[id];
       if (!src) return;
       if (document.querySelector(`script[data-lazy-panel="${id}"]`)) return;
       return new Promise((resolve, reject) => {
         const s = document.createElement("script");
         s.type = "text/babel";
         s.src = src;
         s.dataset.lazyPanel = id;
         s.onload = () => {
           // Trigger Babel re-transform on the new script tag
           if (window.Babel && window.Babel.transformScriptTags) {
             try { window.Babel.transformScriptTags(); } catch {}
           }
           resolve();
         };
         s.onerror = reject;
         document.body.appendChild(s);
       });
     }
     ```
   - Avant de fetch les data du panel, appeler
     `await loadLazyPanelScript(id)` si le panel est dans LAZY_PANELS.

3. VÃ©rifier que `cockpit/app.jsx` gÃ¨re un fallback `<PanelLoading />`
   pendant ce chargement (le `panelKey` + `dataVersion` doit dÃ©jÃ 
   re-render quand `loadPanel` rÃ©sout).

Contrainte : ne PAS lazy-loader le Brief, Top, Veille (panels visitÃ©s
chaque jour). La liste blanche est volontairement courte (3 panels) â€”
on optimise pour la mÃ©diane d'usage matinal.

Validation : Chrome DevTools > Network throttle "Slow 4G", vider le
cache, ouvrir la racine. Mesurer "First Contentful Paint" et "Time to
Interactive" via Lighthouse mobile. Comparer avec / sans le fix : gain
attendu de ~600-1200ms. Naviguer vers Jarvis-Lab : un fetch JSX
supplÃ©mentaire apparaÃ®t dans le Network panel, le panel s'ouvre en
~200-400ms. Recharger plusieurs fois : le panel-jarvis-lab.jsx est mis
en cache HTTP par le service worker (ou le browser cache).
```

---

## P2 â€” Polish + features Jarvis avancÃ©es

---

### Prompt 11 â€” [JARVIS] MJ1 : Miroir du soir v2 â€” stats + narrative + pointeur absence

**PrioritÃ©** : P2 Â· **DÃ©pend de** : aucun (back dÃ©jÃ  partiellement en place) Â· **Fichiers** : `cockpit/panel-evening.jsx` + `cockpit/styles-evening.css` + migration Supabase

```text
Contexte : cockpit/panel-evening.jsx affiche le `summary_html` brut de
la table daily_mirror. C'est un MVP. La promesse du Miroir du soir
(audit prior, mockup B) est :
1. Une grille de stats du jour (5 KPIs)
2. Une narrative auto-gÃ©nÃ©rÃ©e (dÃ©jÃ  OK via summary_html)
3. Un pointeur d'absence ("tu n'as pas ouvert X depuis Y jours")
4. Un input "note pour demain" (cf. MJ7, plus tard)

TÃ¢che â€” partie 1 (stats grid + pointeur absence) :

1. Ajouter une migration Supabase qui Ã©tend daily_mirror avec une
   colonne `stats JSONB`. CrÃ©er le fichier `sql/014_daily_mirror_stats.sql` :
   ```sql
   ALTER TABLE daily_mirror
     ADD COLUMN IF NOT EXISTS stats JSONB DEFAULT '{}'::jsonb;
   COMMENT ON COLUMN daily_mirror.stats IS
     'JSON object with daily KPIs: cockpit_minutes, articles_read, ideas_captured, jarvis_chats, streak_after, sections_unvisited{section: days}';
   ```
   (Mettre Ã  jour la routine Cowork qui Ã©crit la table â€” hors scope de
   ce prompt â€” pour qu'elle remplisse stats. Pour ce prompt, on rend
   gracefully un Ã©tat vide quand stats est null.)

2. Dans cockpit/panel-evening.jsx, modifier la requÃªte :
   ```js
   const rows = await window.sb.query(
     "daily_mirror",
     `mirror_date=eq.${today}&select=mirror_date,summary_html,stats,generated_at&limit=1`
   );
   ```
   (DÃ©jÃ  OK â€” stats est dÃ©sormais retournÃ©.)

3. Au-dessus du `<div className="evening-body" â€¦>`, AJOUTER un bloc
   stats si `mirror.stats` est rempli :
   ```jsx
   {mirror.stats && Object.keys(mirror.stats).length > 0 && (
     <div className="evening-stats">
       <div className="evening-stat">
         <div className="evening-stat-label">Cockpit</div>
         <div className="evening-stat-val">{mirror.stats.cockpit_minutes ?? "â€”"}<span className="evening-stat-unit"> min</span></div>
       </div>
       <div className="evening-stat">
         <div className="evening-stat-label">Articles</div>
         <div className="evening-stat-val">{mirror.stats.articles_read ?? "â€”"}</div>
       </div>
       <div className="evening-stat">
         <div className="evening-stat-label">IdÃ©es</div>
         <div className="evening-stat-val">{mirror.stats.ideas_captured ?? "â€”"}</div>
       </div>
       <div className="evening-stat">
         <div className="evening-stat-label">Jarvis</div>
         <div className="evening-stat-val">{mirror.stats.jarvis_chats ?? "â€”"}<span className="evening-stat-unit"> chats</span></div>
       </div>
       <div className="evening-stat">
         <div className="evening-stat-label">Streak</div>
         <div className="evening-stat-val">{mirror.stats.streak_after ?? "â€”"}<span className="evening-stat-unit">j</span></div>
       </div>
     </div>
   )}
   ```

4. Au-dessus du `<footer className="evening-foot">`, AJOUTER un bloc
   pointeur d'absence si `mirror.stats.sections_unvisited` est rempli :
   ```jsx
   {mirror.stats?.sections_unvisited && Object.keys(mirror.stats.sections_unvisited).length > 0 && (
     <aside className="evening-absence" role="note">
       <div className="evening-absence-icon" aria-hidden="true">âš</div>
       <div className="evening-absence-body">
         {Object.entries(mirror.stats.sections_unvisited).slice(0, 2).map(([sec, days]) => (
           <p key={sec}>Tu n'as pas ouvert <strong>{labelFromSlug(sec)}</strong> depuis {days} jours.</p>
         ))}
         <p className="evening-absence-hint">Demain, le brief s'ouvrira sur ce qui a bougÃ© lÃ -bas.</p>
       </div>
     </aside>
   )}
   ```
   (Helper `labelFromSlug(sec)` Ã  ajouter en bas du fichier â€” mappe les
   ids de panel vers leurs labels visibles. RÃ©-utiliser la source unique
   `cockpit/nav.js::COCKPIT_NAV` si possible, sinon liste minimale en dur
   pour les sections les plus probables : updates, claude, veille-outils,
   wiki, opps, ideas, radar, recos, challenges, signals.)

5. Dans cockpit/styles-evening.css, ajouter les classes :
   ```css
   .evening-stats {
     display: grid;
     grid-template-columns: repeat(5, 1fr);
     gap: var(--space-3);
     margin: var(--space-5) 0 var(--space-6);
     padding: var(--space-4);
     background: var(--bg2);
     border: 1px solid var(--bd);
     border-radius: var(--radius);
   }
   .evening-stat { text-align: center; }
   .evening-stat-label {
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.12em;
     text-transform: uppercase;
     color: var(--tx3);
     margin-bottom: var(--space-1);
   }
   .evening-stat-val {
     font-family: var(--font-display);
     font-size: var(--text-2xl);
     font-weight: 500;
     color: var(--tx);
     line-height: 1;
   }
   .evening-stat-unit {
     font-family: var(--font-body);
     font-size: var(--text-xs);
     color: var(--tx3);
     margin-left: 2px;
   }
   .evening-absence {
     display: flex; align-items: flex-start; gap: var(--space-3);
     padding: var(--space-4);
     border-left: 2px solid var(--brand);
     background: var(--brand-tint);
     margin: var(--space-5) 0;
     border-radius: 0 var(--radius) var(--radius) 0;
   }
   .evening-absence-icon { font-size: var(--text-xl); color: var(--brand); }
   .evening-absence-body p { font-size: var(--text-md); color: var(--tx2); margin-bottom: var(--space-1); }
   .evening-absence-body strong { color: var(--tx); font-weight: 600; }
   .evening-absence-hint { font-size: var(--text-sm); color: var(--tx3); font-style: italic; }
   @media (max-width: 760px) {
     .evening-stats { grid-template-columns: repeat(2, 1fr); }
   }
   ```

Contrainte : le panel reste gracieusement vide quand `stats` est null
ou vide (rÃ©tro-compatible avec les anciennes lignes daily_mirror). Le
docs/specs/tab-evening.md doit Ãªtre mis Ã  jour dans le mÃªme commit
(rappel CLAUDE.md).

Validation : insÃ©rer manuellement une ligne daily_mirror avec
`stats = '{"cockpit_minutes":47,"articles_read":8,"ideas_captured":2,"jarvis_chats":3,"streak_after":4,"sections_unvisited":{"veille-outils":6}}'`.
Recharger le panel : grille de 5 stats apparaÃ®t, bloc d'absence sur
"Veille outils Â· 6 jours" + hint. Tester un cas oÃ¹ stats = null : le
panel rend la version courte (header + summary_html + footer) sans
casser.
```

---

### Prompt 12 â€” [JARVIS] MJ7 : Reminder Â« 1 chose Ã  reprendre demain Â»

**PrioritÃ©** : P2 Â· **DÃ©pend de** : Prompt 11 (recommandÃ© pour le placement dans le Miroir du soir) Â· **Fichiers** : `cockpit/panel-evening.jsx` + `cockpit/home.jsx` + migration Supabase

```text
Contexte : pattern Â« note-to-future-self Â» â€” un input de fin de journÃ©e
dans le Miroir du soir, lu et affichÃ© en haut du Brief le matin suivant.
Stockage minimal : un seul slot Ã©crasable dans user_profile.

TÃ¢che â€” 4 Ã©tapes :

1. Migration Supabase â€” pas de nouvelle table, juste une convention :
   stocker la note dans `user_profile` avec key="tomorrow_note" et
   value=JSON `{ text: "...", written_at: "ISO", consumed: false }`.
   Aucune migration SQL nÃ©cessaire (la table user_profile est dÃ©jÃ  en
   key/value).

2. Dans cockpit/panel-evening.jsx, AJOUTER en bas (avant le footer)
   un input de capture :
   ```jsx
   const [note, setNote] = React.useState("");
   const [noteSaved, setNoteSaved] = React.useState(false);
   const saveNote = async () => {
     if (!note.trim()) return;
     try {
       await window.sb.upsert("user_profile", {
         key: "tomorrow_note",
         value: JSON.stringify({ text: note.trim(), written_at: new Date().toISOString(), consumed: false }),
       }, { onConflict: "key" });
       setNoteSaved(true);
       setTimeout(() => setNoteSaved(false), 3000);
     } catch (e) { console.error(e); }
   };
   // ... dans le JSX, aprÃ¨s .evening-body :
   <section className="evening-note">
     <div className="evening-note-eyebrow">Pour demain</div>
     <h3 className="evening-note-title">La chose Ã  reprendre</h3>
     <textarea
       className="evening-note-input"
       value={note}
       onChange={e => setNote(e.target.value)}
       placeholder="Une seule phrase. Sera affichÃ©e en 1Ã¨re ligne du brief demain matin."
       maxLength={140}
       rows={2}
     />
     <div className="evening-note-footer">
       <span className="evening-note-count">{note.length}/140</span>
       <button className="btn btn--primary btn--sm" onClick={saveNote} disabled={!note.trim()}>
         {noteSaved ? "EnregistrÃ© âœ“" : "Garder pour demain"}
       </button>
     </div>
   </section>
   ```

3. Dans cockpit/home.jsx, au-dessus du hero (juste aprÃ¨s le `<header className="ph">`),
   AJOUTER un bloc qui affiche la note si elle existe et n'est pas
   consommÃ©e :
   ```jsx
   const [tomorrowNote, setTomorrowNote] = React.useState(null);
   React.useEffect(() => {
     (async () => {
       try {
         const rows = await window.sb.query(
           "user_profile",
           `key=eq.tomorrow_note&select=value&limit=1`
         );
         if (rows?.[0]?.value) {
           const parsed = JSON.parse(rows[0].value);
           if (parsed && parsed.text && !parsed.consumed) {
             setTomorrowNote(parsed);
           }
         }
       } catch {}
     })();
   }, []);
   const dismissNote = async () => {
     try {
       await window.sb.upsert("user_profile", {
         key: "tomorrow_note",
         value: JSON.stringify({ ...tomorrowNote, consumed: true }),
       }, { onConflict: "key" });
       setTomorrowNote(null);
     } catch {}
   };
   // JSX :
   {tomorrowNote && (
     <aside className="hero-tomorrow-note" role="note">
       <div className="hero-tomorrow-eyebrow">â˜… Hier soir tu as notÃ©</div>
       <p className="hero-tomorrow-text">{tomorrowNote.text}</p>
       <button className="btn btn--ghost btn--sm" onClick={dismissNote}>
         OK fait <Icon name="check" size={12} stroke={2} />
       </button>
     </aside>
   )}
   ```

4. Styles minimaux dans `cockpit/styles-evening.css` :
   ```css
   .evening-note {
     margin-top: var(--space-6);
     padding: var(--space-4);
     border: 1px dashed var(--bd);
     border-radius: var(--radius);
   }
   .evening-note-eyebrow { font-family: var(--font-mono); font-size: var(--text-2xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--brand); }
   .evening-note-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 500; color: var(--tx); margin: var(--space-1) 0 var(--space-3); }
   .evening-note-input { width: 100%; padding: var(--space-3); background: var(--bg); border: 1px solid var(--bd); border-radius: var(--radius); font-family: var(--font-body); font-size: var(--text-md); color: var(--tx); resize: none; }
   .evening-note-input:focus-visible { border-color: var(--brand); }
   .evening-note-footer { display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-3); }
   .evening-note-count { font-family: var(--font-mono); font-size: var(--text-2xs); color: var(--tx3); }
   ```
   Et dans `cockpit/styles.css`, Ã  cÃ´tÃ© de `.hero-tomorrow-â€¦` (crÃ©er la
   section) :
   ```css
   .hero-tomorrow-note {
     margin: var(--space-4) var(--space-6) 0;
     padding: var(--space-4);
     background: var(--brand-tint);
     border-left: 3px solid var(--brand);
     border-radius: 0 var(--radius) var(--radius) 0;
     display: flex; align-items: flex-start; gap: var(--space-4); flex-wrap: wrap;
   }
   .hero-tomorrow-eyebrow { font-family: var(--font-mono); font-size: var(--text-2xs); letter-spacing: 0.12em; text-transform: uppercase; color: var(--brand); flex-basis: 100%; }
   .hero-tomorrow-text { font-family: var(--font-display); font-size: var(--text-lg); color: var(--tx); flex: 1; min-width: 0; }
   ```

Contrainte : un seul slot global (pas un journal), Ã©crasement libre.
Pas de toast/notification â€” la note rÃ©apparaÃ®t passivement le matin
suivant.

Validation : 1) ouvrir Miroir du soir, Ã©crire une phrase, cliquer
"Garder pour demain" â†’ bouton passe Ã  "EnregistrÃ© âœ“". 2) Recharger
le Brief : le bloc "â˜… Hier soir tu as notÃ©" apparaÃ®t en haut, avec la
phrase. Cliquer "OK fait" â†’ le bloc disparaÃ®t, et la note est marquÃ©e
consumed en base. Recharger : ne rÃ©apparaÃ®t pas.
```

---

### Prompt 13 â€” [PERF] MQW7 : Linter CSS hardcodÃ© en CI

**PrioritÃ©** : P2 (mais Ã  ne pas oublier) Â· **DÃ©pend de** : aucun Â· **Fichiers** : `scripts/lint_css_tokens.py` + `.github/workflows/lint-css-tokens.yml`

```text
Contexte : la dette technique principale du cockpit est que les ~21
stylesheets satellites ignorent les design tokens (var(--space-N),
var(--text-N)). Les valeurs `9.5px`, `13.5px`, `17px`, `26px` â€” qui
n'existent dans aucun token â€” apparaissent partout. Plus le projet
grandit, plus la cohÃ©rence dÃ©pend de la mÃ©moire de qui code le panel.

TÃ¢che : ajouter un linter CI bloquant qui :
- Scanne les fichiers cockpit/styles-*.css
- DÃ©tecte les valeurs `font-size:` ET `padding:` ET `margin:` ET `gap:`
  ET `border-radius:` qui sont des nombres pixel hardcodÃ©s ne figurant
  PAS dans la liste blanche des tokens.
- Whitelist des valeurs autorisÃ©es hors token (Ã  justifier ligne par ligne) :
  `0`, `1px` (border), `2px` (border seulement), `100%`, `100vh`, `100vw`,
  `auto`, `inherit`, `initial`, `999px` (radius pill).
- Tokens valides extraits de cockpit/themes.js : 4, 8, 12, 16, 24, 32,
  48, 64 (espace) ; 10, 11, 12, 13, 15, 18, 22, 28, 54 (texte).

ImplÃ©mentation :

1. CrÃ©er `scripts/lint_css_tokens.py` :
   ```python
   #!/usr/bin/env python3
   """Lint CSS tokens â€” fail when stylesheets bypass the design system."""
   import re, sys, pathlib
   ROOT = pathlib.Path(__file__).parent.parent / "cockpit"
   FILES = sorted(ROOT.glob("styles-*.css")) + [ROOT / "styles.css"]
   ALLOWED_PX = {0, 1, 2, 999}
   ALLOWED_SPACING_PX = {4, 8, 12, 16, 24, 32, 48, 64}
   ALLOWED_TEXT_PX = {10, 11, 12, 13, 15, 18, 22, 28, 54}
   PROP_RE = re.compile(r"(font-size|padding(?:-\w+)?|margin(?:-\w+)?|gap|border-radius)\s*:\s*([^;}\n]+)")
   PX_RE = re.compile(r"(\d+\.?\d*)px")
   errors = []
   for f in FILES:
       text = f.read_text(encoding="utf-8")
       for line_no, line in enumerate(text.splitlines(), 1):
           # Skip commented lines (rough heuristic)
           if line.lstrip().startswith("/*") or line.lstrip().startswith("*"):
               continue
           for prop, val in PROP_RE.findall(line):
               for px_str in PX_RE.findall(val):
                   px = float(px_str)
                   if px.is_integer():
                       px = int(px)
                   if px in ALLOWED_PX:
                       continue
                   if prop.startswith("font-size") and px in ALLOWED_TEXT_PX:
                       continue
                   if prop.startswith(("padding", "margin", "gap", "border-radius")) and px in ALLOWED_SPACING_PX:
                       continue
                   errors.append(f"::error file={f.relative_to(ROOT.parent)},line={line_no}::Hardcoded {prop}: {px}px (use var(--space-N) or var(--text-N))")
   if errors:
       print("\n".join(errors))
       sys.exit(1)
   print(f"OK â€” {len(FILES)} stylesheets, no hardcoded tokens.")
   ```

2. CrÃ©er `.github/workflows/lint-css-tokens.yml` :
   ```yaml
   name: lint-css-tokens
   on:
     pull_request:
       paths:
         - "cockpit/styles*.css"
         - "scripts/lint_css_tokens.py"
   jobs:
     lint:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
           with: { python-version: "3.11" }
         - run: python scripts/lint_css_tokens.py
   ```

3. **Migration progressive** : dÃ©marrer le linter en mode `continue-on-error: true`
   pendant 14 jours pour que la baseline de violations soit comptÃ©e
   dans les annotations GitHub sans bloquer les merges. Au bout de 14j,
   passer en bloquant. Ajouter un commentaire dans le YAML pour
   l'expliciter :
   ```yaml
   continue-on-error: true  # TODO: passer Ã  false aprÃ¨s 2026-05-16 (14j de mesure)
   ```

Contrainte : ne pas re-Ã©crire les CSS satellites pour passer le linter
maintenant â€” c'est un travail de second tour. Le linter empÃªche
seulement la rÃ©gression future. La dette existante est mesurÃ©e mais pas
imposÃ©e comme blocker immÃ©diat.

Validation : crÃ©er une PR test qui ajoute `font-size: 13.5px;` dans
n'importe quel `styles-*.css`. Le check apparaÃ®t avec une annotation
inline GitHub `::error file=cockpit/styles-X.css,line=Y::Hardcoded
font-size: 13.5px`. Pendant les 14 premiers jours, la PR peut quand
mÃªme merger (continue-on-error true). AprÃ¨s cutoff, fail = blocked.
```

---

# 5. Checklist d'exÃ©cution

Ordre recommandÃ©, dÃ©pendances, temps estimÃ© total ~10-14h sur 2 semaines.

| Ordre | Prompt | Tag | PrioritÃ© | Effort | DÃ©pend de |
|---:|---|---|---|---:|---|
| 1 | Prompt 1 â€” Finir backdrop-filter `.panel-toolbar` | [PERF] | P0 | 5 min | â€” |
| 2 | Prompt 2 â€” `.card-action--ask` toujours visible | [UX] | P0 | 15 min | â€” |
| 3 | Prompt 3 â€” Streak `=0` neutre, pas rouge | [UX] | P0 | 20 min | â€” |
| 4 | Prompt 4 â€” Hero compact toggle dans `.ph-right` | [UX] | P0 | 20 min | â€” |
| 5 | Prompt 5 â€” CTA "+ Nouvelle idÃ©e" zero-state | [UX] | P0 | 15 min | â€” |
| 6 | Prompt 6 â€” Brief macro toujours visible en mode delta | [UX] | P0 | 25 min | â€” |
| 7 | Prompt 7 â€” Wiki tooltip first-occurrence-only | [UX] | P1 | 1h | â€” |
| 8 | Prompt 8 â€” Snooze badge + undo | [UX] | P1 | 1h30 | â€” |
| 9 | Prompt 9 â€” Ctrl+K v2 cross-search | [JARVIS] | P1 | 2h | â€” |
| 10 | Prompt 10 â€” Lazy-load panels lourds | [PERF] | P1 | 1h30 | â€” |
| 11 | Prompt 11 â€” Miroir du soir v2 | [JARVIS] | P2 | 2h30 | Routine Cowork Ã  mettre Ã  jour en parallÃ¨le (hors scope front) |
| 12 | Prompt 12 â€” Note pour demain | [JARVIS] | P2 | 1h30 | Prompt 11 (placement Miroir) |
| 13 | Prompt 13 â€” Linter CSS tokens en CI | [PERF] | P2 | 1h | â€” |

**Recommandation tactique** : grouper les P0 1-6 dans une seule PR
"polish-may-week-1" â€” toute la liste ne dÃ©pend de rien et fait < 2h
cumulÃ©. Les P1 7-10 peuvent partir en PRs sÃ©parÃ©es (impact + effort
distincts) sur la semaine suivante. Les P2 11-13 sur la 3e semaine,
avec Prompt 11 d'abord pour stabiliser le pattern Miroir avant d'y
greffer Prompt 12.

**Mesure de l'impact** :
- AprÃ¨s PR1 (P0) : moyenne cockpit attendue ~3.75 (vs 3.62 actuel).
- AprÃ¨s PR2 (P1) : ~3.95 (gain principal sur perf + recherche).
- AprÃ¨s PR3 (P2) : ~4.10 (Miroir du soir + note pour demain rÃ©veillent
  fortement la dimension rÃ©tention du panel Personnel).

---

## Annexe â€” Sources & mÃ©thodologie

- Crawl live : https://ph3nixx.github.io/jarvis-cockpit/ (HTTP 200, HTML 126 lignes, ~50 scripts chargÃ©s en sÃ©rie).
- Code lu : `cockpit/themes.js`, `cockpit/styles.css` (4660 lignes), `cockpit/styles-mobile.css`, `cockpit/home.jsx` (~600 lignes), `cockpit/panel-evening.jsx`, `cockpit/sidebar.jsx` (sample), spot-checks Grep sur `prefers-reduced-motion`, `--tx3`, `backdrop-filter`, `opacity: 0`.
- Audit prior comparÃ© : `docs/audits/2026-04-26-design-audit.md` (cycle April).
- DerniÃ¨res dates de modif observÃ©es sur le code (UTC) : `nav.js` 1 mai 08:08, `styles-jarvis-lab.css` 1 mai 07:49, `home.jsx` 30 avril 21:04, `app.jsx` 30 avril 20:47.
- Aucune mesure Lighthouse en environnement contrÃ´lÃ© (pas accessible depuis cette session) â€” les estimations perf sont des bornes basses raisonnÃ©es sur 50 scripts Ã— ~4 KB-55 KB compilÃ©s runtime par Babel-standalone.

Sources :
- [Cockpit en production](https://ph3nixx.github.io/jarvis-cockpit/)
- [Audit prÃ©cÃ©dent (26 avril 2026)](computer://C:\Users\johnb\projects\jarvis-cockpit/docs/audits/2026-04-26-design-audit.md)
