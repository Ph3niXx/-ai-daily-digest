# Audit Design Complet — AI Cockpit

**Date** : 9 mai 2026
**Auditeur** : Claude (audit automatisé scheduled task)
**URL auditée** : https://ph3nixx.github.io/jarvis-cockpit/
**Méthode** : Crawl du site live + lecture du code source (`index.html`,
`cockpit/*.jsx`, `cockpit/*.css`, `cockpit/themes.js`, `cockpit/nav.js`,
`cockpit/styles-mobile.css`)

---

## ⚠️ Préambule — recadrage du brief

Le brief décrit le projet comme « single-file vanilla HTML/CSS/JS avec
helpers `fetchJSON()` ». **C'est faux.** Le code réel est :

- React 18 + `@babel/standalone` chargés via unpkg, **no build step**
  (compilation Babel dans le navigateur)
- 29 panels en `.jsx` séparés sous `cockpit/`, chacun s'expose sur
  `window.X` (pas d'imports ES — incompatible avec Babel standalone)
- ~16 feuilles de style dédiées (`cockpit/styles-<panel>.css`) +
  `cockpit/styles-mobile.css` chargé en dernier
- Design tokens centralisés dans `cockpit/themes.js` (3 thèmes :
  Dawn éditorial, Obsidian terminal, Atlas swiss)
- Helpers Supabase dans `cockpit/lib/supabase.js`, auth Google OAuth
  dans `cockpit/lib/auth.js`, data layer Tier 1 (bloquant) + Tier 2
  (lazy au clic) dans `cockpit/lib/data-loader.js`
- Hébergement GitHub Pages, mais avec PWA service worker, manifest,
  CSP restrictive (qui exige `'unsafe-eval'` à cause de Babel)
- Identité visuelle déclarée dans le brief (« gradient bleu→violet,
  glassmorphism, dark mode ») **n'existe pas** dans le code. Les 3
  thèmes réels sont : Dawn (ivoire crémeux + rouille), Obsidian (charbon
  profond + cyan mint), Atlas (papier blanc cassé + indigo encre).
  Dawn est le défaut.

**Conséquence sur l'audit** : les prompts Claude Code visent les vrais
fichiers (`cockpit/home.jsx`, `cockpit/styles.css`, etc.) et respectent
la grammaire React + Babel-in-browser, pas du vanilla JS.

---

# 1. Reconnaissance

## 1.1 Inventaire features (par panel)

29 panels visibles dans la sidebar, répartis en 6 groupes (source :
`cockpit/nav.js`). Inventaire abrégé :

| Groupe | Panel | ID | Fichier source | Ce qu'on y voit |
|---|---|---|---|---|
| Aujourd'hui | Brief du jour | `brief` | `home.jsx` | Hero macro · Top 3 · Signaux · Mini-radar · Ma semaine. **Mode toggle** Morning Card / Brief complet. **Compact toggle** sur le hero. **Mode delta** « X nouveautés depuis ta dernière visite ». **Zero state** quand tout est lu. **Bouton « Tout marqué lu »** avec undo 6s. |
| Aujourd'hui | Miroir du soir | `evening` | `panel-evening.jsx` | Brief 19h généré par routine Cowork (table `daily_mirror`) |
| Aujourd'hui | Revue du jour | `review` | `panel-review.jsx` | Flow unread-first, navigation J/K-style |
| Aujourd'hui | Top du jour | `top` | `panel-top.jsx` | Liste complète des incontournables |
| Aujourd'hui | Ma semaine | `week` | `panel-week.jsx` | Synthèse 7j (lus, actions, visites) |
| Aujourd'hui | Recherche | `search` | `panel-search.jsx` | Full-text ilike sur 4 tables |
| Veille | Veille IA / Claude / Sport / Gaming / Anime / News | 6 IDs | `panel-veille.jsx` (mutualisé via `corpus`) | Feed RSS par domaine, filtres, marqueurs lu |
| Veille | Veille outils | `veille-outils` | `panel-veille-outils.jsx` | 4 buckets Claude + catalogue stable |
| Apprentissage | Radar | `radar` | `panel-radar.jsx` | Radar 8 axes éditable |
| Apprentissage | Recommandations | `recos` | `panel-recos.jsx` | Reco hebdo Claude calibrée sur les lacunes |
| Apprentissage | Challenges | `challenges` | `panel-challenges.jsx` | Mini-défis avec mode théorie/pratique |
| Apprentissage | Wiki IA | `wiki` | `panel-wiki.jsx` | Glossaire 3 niveaux + tooltip global |
| Apprentissage | Signaux faibles | `signals` | `panel-signals.jsx` | Termes IA trackés, sparklines, 8 sem |
| Business | Opportunités | `opps` | `panel-opportunities.jsx` | Use cases hebdo, send to ideas |
| Business | Carnet d'idées | `ideas` | `panel-ideas.jsx` | Pipeline drag&drop, modal ticket |
| Business | Jobs Radar | `jobs` | `panel-jobs-radar.jsx` | Feed LinkedIn scoré + scan quotidien |
| Personnel | Jarvis | `jarvis` | `panel-jarvis.jsx` | Chat 2/3 + mémoire 1/3, citations cliquables, audio sticky composer |
| Personnel | Jarvis Lab | `jarvis-lab` | `panel-jarvis-lab.jsx` | Specs produit + diagramme architecture SVG live |
| Personnel | Mon profil | `profile` | `panel-profile.jsx` | Profil k/v + commitments + uncomfortable_questions |
| Personnel | Forme | `perf` | `panel-forme.jsx` | KPIs 30j, charge hebdo, composition Withings |
| Personnel | Musique | `music` | `panel-musique.jsx` | Last.fm scrobbles, top hebdo, genres, insights IA |
| Personnel | Gaming | `gaming` | `panel-gaming.jsx` | Steam playtime + TFT matches/rank |
| Système | Stacks & Limits | `stacks` | `panel-stacks.jsx` | Tokens, coûts, balance USD→EUR live |
| Système | Historique | `history` | `panel-history.jsx` | 60 jours + notes perso + pin |

**Affordances transverses observées** :

- **Command palette** (`Ctrl+K`) — `cockpit/command-palette.jsx`
- **Capture rapide** (`Ctrl+N`) + modale idée (`Ctrl+Shift+N`)
- **Aller au panel N** (`Ctrl+1-8`) — mais limité à 8 sur 29 panels
- **Sidebar rail** (`Ctrl+B`) — collapse à 56px
- **Theme switcher** (Dawn / Obsidian / Atlas + auto basé sur l'heure)
- **Audio brief** sur le hero — `SpeechSynthesisUtterance` français natif
- **Skip link** WCAG 2.4.1 (présent, top négatif jusqu'au focus)
- **Focus visible** global avec outline 2px var(--brand)
- **Service worker / PWA** : manifest, theme-color, apple-mobile-web-app
- **Telemetry** append-only via `usage_events` (~17 event types)

## 1.2 Design system implicite

**Force** : design tokens **vraiment centralisés** dans `themes.js`,
pas seulement déclarés. Les 3 thèmes partagent strictement la même
échelle (4px spacing × 8 paliers, type scale 8 niveaux 10→54px,
même structure de variables sémantiques `--tx/--tx2/--tx3`,
`--brand/--positive/--alert/--neutral` + tints, `--shadow-sm/md/lg`,
`--radius/--radius-lg`).

**Faiblesse** : le système ne vit que si **chaque** stylesheet panel
le respecte. Dans `cockpit/styles-mobile.css` j'ai compté **~30 valeurs
hardcodées** (`font-size: 22px !important`, `padding: 24px 18px !important`,
`gap: 10px !important`) qui contournent le scale. Idem `styles-jarvis.css`
et `styles-veille-outils.css` ont leur propre vocabulaire CSS Custom
(préfixes `--jrv-*`, `--vl-*`) qui ne re-mappent pas systématiquement
sur les tokens globaux.

**Risque drift** : 16 stylesheets séparés × 3 thèmes = matrice 48 surfaces
à garder cohérentes. **Aucun lint CSS** ne vérifie aujourd'hui que les
valeurs hardcodées appartiennent au scale.

## 1.3 Test rétention (5e visite de la semaine)

J'ai simulé mentalement 5 visites consécutives. Constats :

- **Hero plein format à 54px** : magnifique le lundi, fatigant le vendredi.
  Le toggle compact existe (`hero-compact-toggle`) mais il est tout petit
  (`text-2xs`, `var(--tx3)`), à droite, easy à louper. **Le défaut devrait
  basculer sur compact après N visites** ou détecter si l'utilisateur a
  déjà cliqué « Lire les 3 incontournables » aujourd'hui.
- **Mode delta « depuis ta dernière visite »** : excellent. Active si
  visite < 18h. Réduit la charge cognitive en montrant uniquement les
  nouveaux items.
- **Animation pulse du kicker dot 3 fois** : OK, courte, respecte
  `prefers-reduced-motion` (vérifié L621). Pas un problème.
- **Gradient bleu→violet** : pas trouvé. C'est un faux-souvenir du brief.
  Les 3 thèmes réels sont sobres et bien calibrés pour la fatigue oculaire.
- **« Tout marqué lu » avec undo** : très bonne ergonomie, gagne du temps.
- **Sidebar avec 29 entrées + chevrons + pins + unread + count** : on s'y
  habitue mais c'est dense. Les 6 groupes aident, mais visuellement
  beaucoup de chiffres en compétition (count gris, unread orange, hotdot
  caché si fermé, streak orange en bas).
- **3 thèmes** : à l'usage, on se fixe. Mais le toggle clignotant invite
  à essayer les autres, ce qui fragmente l'identité visuelle de l'app.
- **Boutons « card-action » bookmark / ask** : `opacity: 1` sur mobile
  (bien) mais sur desktop ils n'apparaissent qu'au hover, ce qui crée un
  effet « j'ai oublié comment on fait ». **Affordances cachées par défaut
  = friction** sur l'usage quotidien.

---

# 2. Matrice d'évaluation

## 2.1 Tableau scoré (22 sections × 7 critères, échelle 1-5)

Notes **honnêtes** — ce n'est pas un projet débutant, beaucoup de scores
sont déjà à 4-5. Je flag uniquement ce qui peut bouger.

| Section | Clarté | Densité | Cohérence | Interactions | Mobile | A11y | Rétention | Moyenne |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| **Brief du jour** (home) | 5 | 3 | 5 | 5 | 4 | 4 | 4 | 4.3 |
| **Sidebar** | 4 | 2 | 4 | 4 | 5 | 4 | 4 | 3.9 |
| **Top du jour** (panel) | 4 | 4 | 5 | 4 | 4 | 4 | 4 | 4.1 |
| **Veille IA** | 4 | 3 | 5 | 4 | 4 | 4 | 4 | 4.0 |
| **Claude / Veille outils** | 4 | 3 | 4 | 4 | 4 | 4 | 4 | 3.9 |
| **Sport / Gaming / Anime / News** (4 corpus) | 4 | 3 | 5 | 4 | 4 | 4 | 3 | 3.9 |
| **Revue du jour** | 4 | 4 | 4 | 5 | 4 | 5 | 5 | 4.4 |
| **Miroir du soir** | 5 | 5 | 5 | 3 | 4 | 4 | 5 | 4.4 |
| **Recherche** | 3 | 4 | 4 | 3 | 4 | 4 | 3 | 3.6 |
| **Ma semaine** | 4 | 3 | 4 | 3 | 4 | 4 | 4 | 3.7 |
| **Radar compétences** | 5 | 4 | 5 | 4 | 4 | 4 | 4 | 4.3 |
| **Recommandations** | 4 | 4 | 4 | 3 | 4 | 4 | 3 | 3.7 |
| **Challenges** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4.0 |
| **Wiki IA** | 4 | 4 | 4 | 4 | 3 | 4 | 4 | 3.9 |
| **Signaux faibles** | 5 | 4 | 5 | 4 | 4 | 4 | 4 | 4.3 |
| **Opportunités** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4.0 |
| **Carnet d'idées** | 4 | 4 | 5 | 5 | 4 | 4 | 4 | 4.3 |
| **Jobs Radar** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4.0 |
| **Jarvis** (chat) | 4 | 4 | 4 | 4 | 3 | 4 | 5 | 4.0 |
| **Jarvis Lab** | 5 | 5 | 5 | 4 | 4 | 4 | 3 | 4.3 |
| **Mon profil** | 4 | 4 | 4 | 4 | 4 | 4 | 3 | 3.9 |
| **Forme / Musique / Gaming** (3 panels perso) | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4.0 |
| **Stacks & Limits** | 5 | 4 | 5 | 3 | 4 | 4 | 3 | 4.0 |
| **Historique** | 4 | 4 | 4 | 4 | 4 | 4 | 4 | 4.0 |

**Moyenne générale** : **4.04 / 5** — un cockpit déjà très solide.

## 2.2 Top 3 forces

1. **Design tokens vraiment vivants.** Trois thèmes (Dawn / Obsidian /
   Atlas) qui changent **la grammaire visuelle** (densité, corner,
   accentShape, displayWeight) et pas juste les couleurs. C'est rare
   et c'est bien fait. Aucune dérive systémique constatée.
2. **Hero du Brief intelligent.** Mode delta « depuis ta dernière visite »
   + zero state « tu as fait le tour, bravo » + Morning Card vs Brief
   complet + compact toggle + audio chip. C'est un Hero qui s'adapte.
   Très peu de produits B2C font ça.
3. **A11y de base déjà couverte.** Skip link, focus-visible global,
   `prefers-reduced-motion` respecté pour les animations clés, ARIA
   `tablist`/`tab` sur le toggle Morning, `aria-expanded` sur les
   chevrons sidebar, `aria-busy`/`aria-label` sur le skeleton. C'est rare
   sur du React side-project.

## 2.3 Top 3 faiblesses

1. **29 panels, 6 groupes, 3 thèmes, 17+ raccourcis.** La surface
   cognitive est immense pour un produit perso. Le brief décrit Jean
   comme RTE Malakoff, pas comme power-user front-end. Il y a un risque
   de **« mausolée à features »** : la moitié des panels reçoivent
   peut-être 1 visite par semaine. Aucun signal in-product n'aide
   l'utilisateur à savoir « ce panel n'est plus utile pour toi ».
2. **Affordances de hover-révélé invisibles.** Les boutons d'action sur
   les cards (bookmark, ask Jarvis) n'apparaissent qu'au survol sur
   desktop. Conséquences : pour un usage quotidien, l'utilisateur oublie
   les actions disponibles. Sur mobile c'est forcé à `opacity:1` (bien)
   mais le desktop devrait au moins maintenir une opacité ~0.3 au repos.
   Principe Fitts + visibilité (Norman) : un affordance qu'on ne voit
   pas n'existe pas.
3. **CSS hardcodé dans `styles-mobile.css` et stylesheets panels.**
   ~30+ valeurs `!important` avec font-sizes / paddings hardcodés bypassant
   le scale. Le système est solide en `themes.js` mais fuit dans les
   overrides mobile. C'est un problème de maintenance qui va générer du
   drift au fil des modifs.

---

# 3. Quick Wins & Roadmap Jarvis

## 3.1 Top 10 Quick Wins (triés par ratio impact/effort)

| # | Titre | Description | Impact | Effort | Ratio | Sections |
|---|---|---|:---:|:---:|:---:|---|
| 1 | **Hero compact par défaut après 5 visites** | Auto-bascule en mode compact après 5 visites cumulées (lue dans `localStorage.cockpit-visit-count`). Avec un opt-out persistant. | 5 | 1 | 5.0 | Brief |
| 2 | **Card actions visibles à 30% par défaut** | Sortir bookmark/ask de leur état hover-only sur desktop. Opacity 0.35 au repos, 1 au hover. Aligne avec le comportement mobile. | 4 | 1 | 4.0 | Brief, Top, Signaux, Veille |
| 3 | **Streak protection notification** | Si l'utilisateur n'est pas venu de la journée et qu'il est 21h+, push notif PWA « 1 visite avant de perdre ton streak de Xj ». Utilise déjà le service worker. | 4 | 2 | 2.0 | Sidebar, Brief |
| 4 | **Raccourci `Ctrl+/` pour ouvrir l'aide** | Convention universelle (Slack, Linear, GitHub). Aujourd'hui c'est `?` seul, peu découvert. Ajouter en parallèle. | 3 | 1 | 3.0 | Global |
| 5 | **Lint CSS « no-magic-numbers »** | Script `scripts/lint_css_tokens.py` qui scanne `cockpit/styles-*.css` et fail si `font-size:`, `padding:`, `gap:` contiennent des valeurs hors scale. Ajouter au workflow CI lint-specs existant. | 4 | 3 | 1.3 | Tous |
| 6 | **Indicateur « non visité depuis Xj » sur les panels** | Dans la sidebar, afficher un dot gris discret sur les panels non ouverts depuis 14j+. Signal d'auto-curation : « ce panel est-il encore utile ? » | 3 | 2 | 1.5 | Sidebar |
| 7 | **Réduire le hover-only sur sidebar pin button** | Le bouton « pin » sur les liens sidebar n'apparaît qu'au hover (`opacity:0`). Le rendre visible à 0.4 sur les liens non actifs, 1 sur les pinnés. | 3 | 1 | 3.0 | Sidebar |
| 8 | **Microcopy « X articles à traiter » avec bouton-action principal unique** | Sur le hero side, le « À traiter depuis hier · X articles » a son propre CTA « Commencer la revue » qui duplique le CTA principal « Lire les 3 incontournables ». Fusionner en un seul CTA primary, sortir le compteur en chip. | 4 | 1 | 4.0 | Brief |
| 9 | **Bouton « Mark + next »** dans la Revue du jour | Comme Gmail / Linear : `J` pour next, `K` pour previous, `E` pour mark read + auto-next. La Revue est déjà unread-first, ça décuplerait sa vélocité. | 4 | 2 | 2.0 | Revue |
| 10 | **`scroll-margin-top` sur les ancres** | Quand un deep-link `#wiki/slug-x` ouvre une entry, elle se cache sous le `.ph` sticky. Ajouter `scroll-margin-top: 60px` sur les targets. Bug latent. | 3 | 1 | 3.0 | Wiki, Recherche, Historique |

**Effort total des P0 (Quick wins effort ≤ 2)** : ~10h cumulées.

## 3.2 Roadmap Jarvis (15 features avancées)

| # | Feature | Description | Impact | Faisabilité | Wow | Score = I × F |
|---|---|---|:---:|:---:|:---:|:---:|
| 1 | **Calendrier-aware morning card** | Lire `outlook_observer` snapshot, repérer 1er créneau libre du matin, suggérer « Lis ces 2 articles entre 9h00 et 9h12 ». | 5 | 4 | 5 | 20 |
| 2 | **Cross-domain insight** | Pattern detection sur Strava + Steam + Last.fm + sleep : « ton sommeil est mauvais quand tu joues TFT après 22h ». Job hebdo Claude. | 5 | 3 | 5 | 15 |
| 3 | **Reading-speed adapter** | Mesurer le temps réel passé sur articles (telemetry) par source, recalibrer `estimateReadingTime()` par source. | 4 | 5 | 3 | 20 |
| 4 | **Bring-this-back** | Bouton « me ramener cet article dans 7j » sur chaque card. Resurface dans la Revue du jour. Utilise `snooze.js` existant. | 4 | 5 | 4 | 20 |
| 5 | **« Pourquoi je vois ça ? »** explainability | Sur chaque article du Top 3, un (i) qui ouvre un mini-popover : « score 82, parce que match avec lacune `agents-orchestration` du radar + signal en hausse `MCP` + source whitelisté ». | 5 | 4 | 5 | 20 |
| 6 | **Voice command mobile** | `SpeechRecognition` API. « Jarvis, qu'est-ce qu'il y a de neuf en agents ? » → ouvre Recherche pré-remplie. Intégrer au composer Jarvis existant. | 4 | 3 | 5 | 12 |
| 7 | **Anki / flashcards export** | Bouton « envoyer ce concept Wiki vers Anki » → génère un fichier .apkg avec carte recto/verso. Utilise les 3 niveaux de définition existants. | 3 | 4 | 4 | 12 |
| 8 | **Conversational filter** | Champ NL dans n'importe quel feed : « montre-moi seulement les articles agents non lus ». Pré-prompt à Gemini Flash-Lite (gratuit). | 5 | 3 | 4 | 15 |
| 9 | **Source kill-switch auto-suggéré** | Après 30j d'observation, Jarvis propose : « tu n'as ouvert aucun article de RFI Tech depuis 2 mois, je l'enlève des sources ? » | 4 | 4 | 4 | 16 |
| 10 | **Daily 3-min retro 19h** | Voice-enabled rétro : 3 questions audio + transcription Whisper → `daily_mirror`. Remplace ou augmente la routine actuelle. | 4 | 3 | 5 | 12 |
| 11 | **RSS health monitor** | Panel admin discret : feeds morts, taux d'erreur 7j, items 0 articles depuis Xj. Auto-pause des sources qui pètent. | 4 | 5 | 2 | 20 |
| 12 | **Mobile pull-to-refresh** | Sur mobile uniquement, geste pull-to-refresh sur la home déclenche `bootTier1()` (sans full reload). | 3 | 4 | 3 | 12 |
| 13 | **Skill-coach mode** | Jarvis devient proactif 1×/sem : « tu n'as pas avancé sur l'axe Agents depuis 3 sem, voici un challenge calibré ». Push notif + entry chat. | 5 | 4 | 4 | 20 |
| 14 | **Dashboard Jean unique** | Une vue « Jean » unifiée : 1 chiffre (streak), 1 prochaine action (challenge ou article), 1 signal du jour, 1 idée à creuser. Remplace Brief + Évening + Recommandations en mode résumé. | 5 | 3 | 5 | 15 |
| 15 | **Time-aware UI density** | Le matin (06-10h) → Brief complet par défaut. Midi (10-18h) → mode compact + Recherche en raccourci principal. Soir (18-22h) → Miroir du soir prioritaire. | 5 | 4 | 4 | 20 |

**Top 5 par score composite** : #1 (Calendrier), #3 (Reading-speed),
#4 (Bring-back), #5 (Explainability), #11 (RSS health), #13 (Skill-coach),
#15 (Time-aware density). 7 ex æquo à 20 — j'en garde 5 pour les
prompts (sections 4 ci-dessous), priorité aux features qui impactent
**la rétention quotidienne** : #1, #4, #5, #13, #15.

## 3.3 Mockups textuels (3)

### Mockup A — Calendrier-aware morning card (Feature #1)

```
┌─────────────────────────────────────────────────────────────┐
│ 09 MAI · S19 · J129       /   Brief du jour                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ◉ TON CRÉNEAU CALME : 9h00 → 9h12 (12 min libres)           │
│                                                              │
│  En 12 minutes ce matin, tu peux finir :                    │
│                                                              │
│  ① 4 min — TechCrunch — Anthropic dévoile MCP 2.0           │
│             [►]  ← bouton « lecture audio · 4 min »         │
│                                                              │
│  ② 5 min — VentureBeat — Le marché des agents en 2026       │
│             [►]                                              │
│                                                              │
│  ③ 3 min — Signal MCP en hausse · 47 mentions cette sem.    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────┐     │
│  │ COMMENCER 9H00   │  │ Voir le brief complet (12)   │     │
│  └──────────────────┘  └──────────────────────────────┘     │
│                                                              │
│  Prochaine réunion : 9h15 — Sync Train Vente · 30 min       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Mockup B — « Pourquoi je vois ça ? » (Feature #5)

```
┌─────────────────────────────────────────────────────────────┐
│  [01]  ▌ 82  TechCrunch · IA · il y a 2h        [☰] [?] [⋯] │
│        Anthropic dévoile MCP 2.0 avec sandboxing natif      │
│        Le protocole MCP gagne un mode sandbox par défaut... │
│        [agents] [protocole] [anthropic]                     │
└─────────────────────────────────────────────────────────────┘
                                      ↓ clic [?]
                  ┌──────────────────────────────────┐
                  │ POURQUOI CET ARTICLE ?            │
                  ├──────────────────────────────────┤
                  │ Score 82 / 100                    │
                  │                                   │
                  │ ▌ Lacune radar : agents-orchestration  +30
                  │ ▌ Signal en hausse : MCP (+47%)        +20
                  │ ▌ Source whitelistée Tier 1            +15
                  │ ▌ Récent (< 4h)                        +10
                  │ ▌ Jamais lu sujet similaire            +7
                  │                                   │
                  │ [ Trop ? Down-rank cette source ]  │
                  └──────────────────────────────────┘
```

### Mockup C — Time-aware density (Feature #15)

```
06h00 — 10h00 : MODE MATINAL (full hero, audio chip prominent)
┌─────────────────────────────────────────────────────────────┐
│  ◉ BRIEF DU JOUR · 14 ARTICLES · LECTURE 6 MIN              │
│                                                              │
│   L'agent revient au centre du jeu.                          │
│   [Hero body 18px sur 4 lignes]                              │
│                                                              │
│   [Lire les 3 incontournables →]  [Audio · 6 min]           │
└─────────────────────────────────────────────────────────────┘

10h00 — 18h00 : MODE TRAVAIL (compact + Recherche en focus)
┌─────────────────────────────────────────────────────────────┐
│  Brief · 14 articles · 3 nouveautés        🔍 Recherche […] │
│  L'agent revient au centre du jeu.       [Voir le brief]    │
├─────────────────────────────────────────────────────────────┤
│  PINNED · 3 idées en cours de maturation                    │
│  PINNED · Challenge MCP en cours · J3 / J7                  │
└─────────────────────────────────────────────────────────────┘

18h00 — 22h00 : MODE FIN DE JOURNÉE (Miroir du soir prioritaire)
┌─────────────────────────────────────────────────────────────┐
│  ☾ MIROIR DU SOIR · ÉCRIT À 19H02                           │
│                                                              │
│   Aujourd'hui tu as croisé 3 fois le terme « MCP » sans     │
│   ouvrir d'article. C'est peut-être un signal.              │
│                                                              │
│   • Tu as lu 7 articles                                     │
│   • Tu n'es pas allé sur ton radar depuis 6 jours           │
│   • La routine TFT t'a coûté 1h12 hier soir                │
│                                                              │
│   Ton score humeur (texte libre) ?  [_______________]       │
└─────────────────────────────────────────────────────────────┘
```

---

# 4. Prompts Claude Code

Format : un prompt = une amélioration atomique. Chaque prompt est
**auto-suffisant** : il pose le contexte et donne le code à coller, sans
exiger d'avoir lu l'audit.

> ⚠️ **Toutes les contraintes techniques** s'appliquent à chaque prompt :
> React 18 + Babel standalone (pas d'imports ES — chaque composant
> s'expose sur `window.X`), pas de framework supplémentaire, pas de
> dépendance externe non listée dans `index.html`. Les CSS Custom
> Properties existantes du `cockpit/themes.js` sont la source unique pour
> les couleurs, espacements, tailles.

---

## P0 — Quick wins immédiats

### Prompt 1 — [UX] Hero compact par défaut après 5 visites

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/home.jsx` (état initial `heroCompact`)

```
Dans cockpit/home.jsx, modifie l'initialisation du state heroCompact
(actuellement aux alentours des lignes 262-265) pour qu'il bascule
automatiquement à `true` une fois que l'utilisateur a accumulé au moins
5 visites du panel "brief".

Étapes :

1. Crée un compteur de visites persistant dans localStorage. À chaque
   mount du composant Home, incrémente `cockpit-brief-visits` (number).
   Utilise un useEffect avec dependency [] (run-once par mount).

2. Lis ce compteur dans le state initial heroCompact :
   - Si l'utilisateur a explicitement choisi une valeur récemment
     (clé `cockpit-hero-compact-explicit-ts` < 30 jours), respecte son
     choix (`localStorage.getItem("cockpit-hero-compact") === "1"`).
   - Sinon : bascule à `true` dès que `cockpit-brief-visits >= 5`.

3. Quand l'utilisateur clique manuellement le toggle (fonction
   toggleHeroCompact existante), persiste également un timestamp
   `cockpit-hero-compact-explicit-ts` = Date.now() pour neutraliser
   l'auto-bascule pendant 30 jours.

4. Émets un événement telemetry `hero_compact_auto_on` avec
   payload { visits: N } la première fois que l'auto-bascule kick-in
   (ne pas répéter à chaque visite). Utilise une clé localStorage
   `cockpit-hero-compact-auto-fired` pour ne firer qu'une fois.

Code exact à insérer (après le state existant heroCompact) :

  React.useEffect(() => {
    try {
      const k = "cockpit-brief-visits";
      const n = Number(localStorage.getItem(k) || "0") + 1;
      localStorage.setItem(k, String(n));
    } catch {}
  }, []);

Et remplace l'init du state heroCompact par :

  const [heroCompact, setHeroCompact] = React.useState(() => {
    try {
      const explicitTs = Number(localStorage.getItem("cockpit-hero-compact-explicit-ts") || 0);
      const explicitFresh = explicitTs > 0 && (Date.now() - explicitTs) < 30 * 86400000;
      if (explicitFresh) return localStorage.getItem("cockpit-hero-compact") === "1";
      const visits = Number(localStorage.getItem("cockpit-brief-visits") || "0");
      if (visits >= 5) {
        if (!localStorage.getItem("cockpit-hero-compact-auto-fired")) {
          window.track && window.track("hero_compact_auto_on", { visits });
          localStorage.setItem("cockpit-hero-compact-auto-fired", "1");
        }
        return true;
      }
      return localStorage.getItem("cockpit-hero-compact") === "1";
    } catch { return false; }
  });

Modifie aussi toggleHeroCompact pour stamper le timestamp :

  const toggleHeroCompact = () => {
    setHeroCompact(v => {
      const next = !v;
      try {
        localStorage.setItem("cockpit-hero-compact", next ? "1" : "0");
        localStorage.setItem("cockpit-hero-compact-explicit-ts", String(Date.now()));
      } catch {}
      try { window.track && window.track("hero_compact_toggled", { state: next ? "compact" : "full" }); } catch {}
      return next;
    });
  };

Mets aussi à jour le tableau dans CLAUDE.md (section Télémétrie) avec
l'event hero_compact_auto_on (payload {visits}, point d'instrumentation
home.jsx useState init quand auto-on kick in) puis bumpe `last_updated`
dans docs/specs/index.json pour `tab-brief.md` ET édite
docs/specs/tab-brief.md avec un changelog du jour.
```

**Validation** : ouvre le Brief 5 fois (en effaçant le compteur
`cockpit-brief-visits` entre les essais), vérifie qu'au 5e mount le
hero démarre en mode compact. Clique sur « Plein » : le timestamp
explicite est posé, refresh → reste en mode plein. Avance la date
système de 31 jours → l'auto-bascule reprend.

---

### Prompt 2 — [UX] Card actions visibles à 35% par défaut sur desktop

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/styles.css` (sélecteurs `.card-action`,
`.top-card .top-actions`, `.sig-card-ask`)

```
Dans cockpit/styles.css, les boutons d'action de cards
(card-action--bookmark, card-action--ask, sig-card-ask) sont aujourd'hui
hover-only sur desktop : invisibles au repos, ce qui rend les
affordances découverte-dépendantes. Sur mobile c'est déjà à opacity 1
(via styles-mobile.css L273-275).

Modifie cockpit/styles.css pour :
1. Mettre opacity 0.35 par défaut sur .card-action sur desktop
2. Maintenir opacity 1 au hover/focus
3. Garantir une transition fluide (160ms ease)

Cherche les sélecteurs existants `.card-action` (probablement définis
sans opacity ou avec opacity 0). Si .top-actions ou .sig-card-foot
gèrent l'opacité au niveau parent, ajuste le sélecteur parent au lieu
de l'enfant.

Ajoute en fin de section "Top du jour" du styles.css :

  /* Card actions: subtle at rest, full on hover/focus.
     Mobile forces opacity 1 in styles-mobile.css L273-275. */
  .top-card .top-actions .card-action,
  .sig-card .card-action {
    opacity: 0.35;
    transition: opacity 160ms ease;
  }
  .top-card:hover .top-actions .card-action,
  .top-card:focus-within .top-actions .card-action,
  .sig-card:hover .card-action,
  .sig-card:focus-within .card-action,
  .card-action:focus-visible,
  .card-action:hover {
    opacity: 1;
  }
  @media (prefers-reduced-motion: reduce) {
    .top-card .top-actions .card-action,
    .sig-card .card-action { transition: none; }
  }

Bumpe le numéro de version de styles.css dans index.html
(?v=30 → ?v=31) pour invalider le cache.

Mets à jour docs/specs/tab-brief.md (section Limitations connues / TODO
ou Front — structure UI) en notant que les card-actions sont désormais
visibles à 35% au repos. Bumpe last_updated dans index.json.
```

**Validation** : ouvre la home, observe les cards Top : les icônes
bookmark/ask sont visibles mais discrètes. Survole une card → 100%
opacité. Tab navigue vers un bouton → focus visible + opacity 1.

---

### Prompt 3 — [UX] Bouton sidebar « pin » visible à 40% sur les liens non-actifs

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/styles.css` (sélecteurs `.sb-pin-btn`)

```
Dans cockpit/styles.css, le bouton .sb-pin-btn dans la sidebar
(L281-297) est aujourd'hui :
- display: none au repos
- display: inline-flex au hover du parent (.sb-link:hover .sb-pin-btn)
- display: inline-flex si .is-pinned

Conséquence : un utilisateur qui n'a jamais survolé un lien sidebar
ignore qu'il peut épingler. Affordance cachée.

Remplace les règles actuelles par :

  .sb-pin-btn {
    position: absolute;
    right: var(--space-2);
    width: 18px; height: 18px;
    display: inline-flex;
    align-items: center; justify-content: center;
    border-radius: 3px;
    color: var(--tx3);
    background: var(--bg2);
    opacity: 0;
    transition: opacity 140ms ease;
    box-shadow: -6px 0 6px var(--bg2);
    pointer-events: none;
  }
  .sb-link:hover .sb-pin-btn {
    opacity: 0.55;
    pointer-events: auto;
  }
  .sb-pin-btn:hover { opacity: 1; color: var(--brand); }
  .sb-pin-btn:focus-visible { opacity: 1; pointer-events: auto; }
  .sb-pin-btn.is-pinned {
    opacity: 0.7;
    color: var(--brand);
    pointer-events: auto;
  }
  .sb-pin-btn.is-pinned:hover { opacity: 1; color: var(--critical); }
  .sb-link:hover .sb-count,
  .sb-link:hover .sb-unread { opacity: 0; }

Note : on conserve le hover-révélé pour ne pas surcharger visuellement
les 29 entrées de sidebar — mais on rend les pins déjà actifs visibles
en permanence (opacity 0.7), et on garde l'accessibilité clavier via
focus-visible.

Bumpe le numéro de version dans index.html.
```

**Validation** : sans hover, les pins existants sont visibles à ~70%
opacité. Survole un lien non pinné → l'icône pin apparaît à 55%.
Tab vers la sidebar → focus visible reste atteignable.

---

### Prompt 4 — [UX] Fusionner les 2 CTAs primary du hero en un seul

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/home.jsx` (section `.hero-actions` +
`.hero-todo` côté droite)

```
Dans cockpit/home.jsx (autour des lignes 459-487), le hero contient
DEUX CTAs primary qui font la même chose :
- Côté gauche (hero-actions) : "Lire les 3 incontournables" → onNavigate("top")
- Côté droite (hero-todo) : "Commencer la revue" → onNavigate("top")

C'est de la duplication qui crée de l'hésitation (loi de Hick : plus
d'options = décision plus longue). Consolide en gardant **un seul** CTA
primary, et transforme le côté droite en chip d'information passive.

Modifie le bloc <div className="hero-col-side">...</div> pour :

  <div className="hero-col-side">
    <div className="hero-todo hero-todo--passive">
      <div className="hero-todo-label">À traiter</div>
      <div className="hero-todo-num">{stats.unread_total ?? stats.articles_today}</div>
      <div className="hero-todo-unit">
        articles · {stats.signals_rising ?? 0} signaux à regarder
      </div>
    </div>
    <div className="hero-meta">
      <div className="hero-meta-item">
        <span className="hero-meta-label">Prochain brief</span>
        <span className="hero-meta-val">{stats.next_brief}</span>
      </div>
    </div>
  </div>

(Suppression du <button className="btn btn--primary btn--sm hero-todo-cta">.)

Ensuite dans cockpit/styles.css, ajoute un style passive (juste pour
retirer la couleur brand de l'arrière-plan si présent, et supprimer
l'effet hover/clickable) :

  .hero-todo--passive { cursor: default; }
  .hero-todo--passive:hover { background: inherit; border-color: inherit; }

(adapte selon les classes existantes : si .hero-todo a déjà un fond,
override-le légèrement plus discret avec opacity 0.85).

Mets à jour docs/specs/tab-brief.md (section Front — structure UI)
en notant que le hero side ne contient plus de CTA dupliqué, et bumpe
last_updated.
```

**Validation** : sur la home, le hero affiche un seul gros CTA primary
(« Lire les 3 incontournables »). À droite, le compteur reste visible
mais sans bouton dupliqué.

---

### Prompt 5 — [UX] `scroll-margin-top` global pour éviter que les ancres se cachent sous le sticky header

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/styles.css` (en haut, après le reset
global)

```
Le projet utilise des deep-links (`#wiki/slug-x` parsé dans
cockpit/app.jsx L168-178, qui stash le sub-id et navigue). Quand l'entry
wiki s'ouvre, son ancre cible se retrouve **sous** le header sticky
.ph (qui fait 50-60px). L'utilisateur ne voit pas où il a atterri.

Ajoute dans cockpit/styles.css, juste après le bloc `* *::before
*::after` (L5), une règle globale :

  /* Anchors / fragment targets clear the sticky page-header */
  :target {
    scroll-margin-top: 80px;
  }
  [id]:focus-visible {
    scroll-margin-top: 80px;
  }

Si certains panels (wiki, history, search) utilisent un offset
différent, on peut le surcharger localement plus tard. Pour l'instant
80px couvre .ph (60px) + un peu de respiration.

Bumpe le ?v= dans index.html.
```

**Validation** : ouvre un deep-link `#wiki/agents-orchestration` (ou
n'importe quel slug existant). Vérifie que l'entry s'affiche **avec**
de l'air au-dessus, pas collée au header sticky.

---

### Prompt 6 — [UX] Raccourci `Ctrl+/` en alias de `?` pour l'aide

**Priorité** : P0
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/app.jsx` (handler clavier global,
chercher "shortcutsOpen" / "ShortcutsOverlay")

```
Dans cockpit/app.jsx, le raccourci `?` ouvre la modale ShortcutsOverlay.
Convention universelle (Slack, Linear, GitHub, Notion) : `Ctrl+/` (ou
`Cmd+/` sur Mac) ouvre l'aide. Ajoute cet alias.

Cherche le useEffect qui écoute les keydown globaux (probablement autour
des lignes 250-350, qui gère déjà Ctrl+K, Ctrl+B, Ctrl+1-8). Trouve la
condition qui déclenche `setShortcutsOpen(true)` sur `?` et ajoute
l'alias :

  // Alias universal : Ctrl+/ ou Cmd+/
  const isHelpShortcut = (e.key === "?" && !e.ctrlKey && !e.metaKey) ||
                         (e.key === "/" && (e.ctrlKey || e.metaKey));
  if (isHelpShortcut) {
    e.preventDefault();
    setShortcutsOpen(o => !o);
    return;
  }

Note : préserver le toggle (open/close) sur les deux raccourcis.

Mets à jour le tableau KEYBOARD_SHORTCUTS en haut du fichier
(ligne 6-21), ajoute une ligne :

  { group: "Navigation", keys: ["Ctrl", "/"], label: "Afficher cette aide (alias de ?)" },

Bumpe le ?v= de cockpit/app.jsx dans index.html.
```

**Validation** : appuie sur `?` → modale s'ouvre. Appuie sur `Ctrl+/`
→ idem. Re-appuie → toggle close.

---

### Prompt 7 — [UX] Indicateur « non visité depuis Xj » dans la sidebar

**Priorité** : P1
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/sidebar.jsx`, `cockpit/app.jsx`
(handleNavigate qui peut déjà tracker la dernière visite via
section_opened), `cockpit/styles.css` (nouveau sélecteur `.sb-stale-dot`)

```
Objectif : rendre visible la « consommation » réelle de chaque panel.
Si l'utilisateur n'ouvre pas un panel depuis 14j+, affiche un dot gris
discret à côté du label dans la sidebar — signal d'auto-curation.

Étapes :

1. Dans cockpit/app.jsx, dans la fonction handleNavigate (ou
   l'équivalent qui setActivePanel et émet section_opened), persiste
   également un timestamp par panel :
     try {
       const map = JSON.parse(localStorage.getItem("cockpit-panel-last-open") || "{}");
       map[panelId] = Date.now();
       localStorage.setItem("cockpit-panel-last-open", JSON.stringify(map));
     } catch {}

2. Dans cockpit/sidebar.jsx, dans renderLink (autour des lignes 75-94),
   ajoute après le label, avant le compteur :

     const lastOpen = (data.panel_last_open || {})[item.id];
     const isStale = lastOpen && (Date.now() - lastOpen) > 14 * 86400000;

   Et dans le JSX :

     {isStale && !isActive && (
       <span
         className="sb-stale-dot"
         title="Tu n'as pas ouvert ce panel depuis 2 sem."
         aria-label="Non visité récemment"
       />
     )}

3. Dans cockpit/lib/data-loader.js (bootTier1), exposer
   `data.panel_last_open` lu depuis localStorage :

     try {
       data.panel_last_open = JSON.parse(localStorage.getItem("cockpit-panel-last-open") || "{}");
     } catch { data.panel_last_open = {}; }

4. Dans cockpit/styles.css, ajoute le style du dot :

     .sb-stale-dot {
       width: 5px; height: 5px;
       border-radius: 50%;
       background: var(--tx3);
       opacity: 0.4;
       margin-left: var(--space-2);
       flex-shrink: 0;
     }
     .sb.is-collapsed .sb-stale-dot { display: none; }

5. Mets à jour CLAUDE.md (Télémétrie n'a pas besoin d'event nouveau,
   on réutilise section_opened, mais ajoute une note dans les conventions
   sidebar). Mets à jour docs/specs/_template ou les specs sidebar
   pertinentes.

Bumpe les ?v= des fichiers modifiés dans index.html.
```

**Validation** : efface `cockpit-panel-last-open` dans localStorage,
ouvre 3 panels au hasard, attends (ou simule en avançant la date
système de 15j), reload → les panels non ouverts récemment ont un dot
gris discret. Ouvre l'un d'eux → le dot disparaît.

---

### Prompt 8 — [UX] Lint CSS « tokens-only » pour empêcher le drift

**Priorité** : P1
**Dépend de** : Aucun
**Fichiers concernés** : nouveau script `scripts/lint_css_tokens.py`,
nouveau workflow `.github/workflows/lint-css-tokens.yml`

```
Crée un script Python qui scanne tous les `cockpit/*.css` et fail si
les propriétés font-size, padding, gap, margin, border-radius
contiennent des valeurs hardcodées hors du scale défini dans
cockpit/themes.js (--space-1..8, --text-2xs..display, --radius,
--radius-lg).

Crée le fichier scripts/lint_css_tokens.py :

  #!/usr/bin/env python3
  """Lint CSS files to enforce design-token usage.

  Fails if font-size, padding, gap, margin, or border-radius
  uses a hardcoded value instead of a CSS Custom Property
  defined in cockpit/themes.js.

  Whitelist : 0, 0px, 1px, 2px, 100%, auto, inherit, none, transparent.
  """
  import re
  import sys
  from pathlib import Path

  ROOT = Path(__file__).resolve().parent.parent
  TARGETS = list((ROOT / "cockpit").glob("styles*.css"))

  # Properties to lint — limited to those tokenized in themes.js
  PROPS = ("font-size", "padding", "padding-left", "padding-right",
           "padding-top", "padding-bottom", "gap", "row-gap", "column-gap",
           "margin", "margin-left", "margin-right", "margin-top",
           "margin-bottom", "border-radius")

  WHITELIST = {"0", "0px", "1px", "2px", "100%", "auto", "inherit",
               "none", "transparent"}
  TOKEN_RE = re.compile(r"var\(--(?:space|text|radius)")
  PX_RE = re.compile(r"\b\d+(?:\.\d+)?px\b")

  errors = []
  for path in TARGETS:
      for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
          stripped = line.strip()
          if not stripped or stripped.startswith("/*") or stripped.startswith("//"):
              continue
          for prop in PROPS:
              if not re.match(rf"\s*{prop}\s*:", stripped):
                  continue
              # Extract value
              val = stripped.split(":", 1)[1].split(";")[0].strip()
              if val in WHITELIST:
                  continue
              if TOKEN_RE.search(val):
                  continue
              if PX_RE.search(val):
                  errors.append((path.name, i, prop, val))
              break

  if errors:
      print("CSS lint failed: hardcoded values where tokens expected")
      print("(use var(--space-N) / var(--text-N) / var(--radius))")
      print()
      for f, i, p, v in errors[:50]:
          print(f"  {f}:{i}  {p}: {v}")
      if len(errors) > 50:
          print(f"  ... and {len(errors) - 50} more")
      sys.exit(1)

  print(f"CSS lint OK : {len(TARGETS)} files scanned, no drift.")

Crée .github/workflows/lint-css-tokens.yml :

  name: lint-css-tokens
  on: [pull_request]
  jobs:
    lint:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-python@v5
          with: { python-version: "3.11" }
        - name: Lint CSS tokens
          run: python scripts/lint_css_tokens.py

Démarre le check en non-bloquant (continue-on-error: true) puis
durcis après 2 semaines, comme arch-drift-check. La première run
remontera ~30+ violations dans styles-mobile.css (volontairement
hardcodé via !important). Tu peux les soit migrer vers tokens, soit
ajouter un pragma /* css-lint-ignore */ pour les marquer comme
volontaires.

Mets à jour CLAUDE.md (section Garde-fous automatiques) avec
une entrée pour ce nouveau workflow.
```

**Validation** : `python scripts/lint_css_tokens.py` tourne en local et
liste les violations actuelles. Crée une PR test avec une violation
nouvelle → le check apparaît dans les annotations GitHub.

---

### Prompt 9 — [UX] Streak protection notification PWA

**Priorité** : P1
**Dépend de** : Service worker actif (déjà en place via `sw.js`)
**Fichiers concernés** : `cockpit/lib/snooze.js` (nouveau handler
streak) ou nouveau `cockpit/lib/streak.js`, `sw.js` (handler push),
`cockpit/lib/auth.js` (demande permission Notification)

```
Si l'utilisateur a un streak actif (donnée déjà calculée dans
data.stats.streak côté sidebar) et qu'il est 21h+ et qu'il n'est pas
encore venu aujourd'hui (cockpit-last-visit-ts < today 00:00), déclenche
une notification PWA locale : "1 visite avant de perdre ton streak de
Xj".

Étapes :

1. Crée cockpit/lib/streak.js, exposé sur window.streak :

  (function(){
    const KEY_LAST = "cockpit-last-visit-ts";
    const KEY_NOTIF = "cockpit-streak-notif-fired-iso"; // YYYY-MM-DD

    function todayIso(){
      const d = new Date();
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    }

    async function maybeNudge(){
      try {
        const streak = window.COCKPIT_DATA?.stats?.streak || 0;
        if (streak < 3) return; // pas la peine en dessous de 3j
        const last = Number(localStorage.getItem(KEY_LAST) || 0);
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        if (last >= startOfToday.getTime()) return; // déjà venu
        const now = new Date();
        if (now.getHours() < 21) return; // trop tôt
        if (localStorage.getItem(KEY_NOTIF) === todayIso()) return; // déjà nudgé
        if (!("Notification" in window)) return;
        if (Notification.permission !== "granted") return;
        new Notification("Jarvis Cockpit", {
          body: `Une visite avant de perdre ton streak de ${streak}j.`,
          icon: "/icon-192.png",
          tag: "streak-protection",
          requireInteraction: false,
        });
        localStorage.setItem(KEY_NOTIF, todayIso());
        try { window.track && window.track("streak_nudge_fired", { streak }); } catch {}
      } catch {}
    }

    window.streak = { maybeNudge };
    // Check on load and every 30 min while tab is open
    document.addEventListener("DOMContentLoaded", maybeNudge);
    setInterval(maybeNudge, 30 * 60 * 1000);
  })();

2. Ajoute dans index.html (avant snooze.js) :
   <script src="cockpit/lib/streak.js?v=1"></script>

3. Ajoute le request de permission dans cockpit/lib/auth.js après
   succès d'auth (pas avant — c'est plus poli) :

   if ("Notification" in window && Notification.permission === "default") {
     // Don't ask immediately, wait for first user interaction
     setTimeout(() => {
       if (Notification.permission === "default") {
         Notification.requestPermission().catch(() => {});
       }
     }, 60000);
   }

4. Mets à jour CLAUDE.md Télémétrie avec event streak_nudge_fired
   (payload {streak}, point d'instrumentation cockpit/lib/streak.js
   maybeNudge() après new Notification).
```

**Validation** : avance la date système à 21h, manipule
`cockpit-last-visit-ts` à hier dans localStorage, recharge le site.
La notification doit apparaître. Le firing ne doit se produire qu'une
fois par jour (relance avec la même date système → pas de doublon).

---

### Prompt 10 — [UX] « Mark + next » dans la Revue du jour (raccourci `E`)

**Priorité** : P1
**Dépend de** : Aucun
**Fichiers concernés** : `cockpit/panel-review.jsx` (handler clavier
local au panel)

```
Dans cockpit/panel-review.jsx, ajoute des raccourcis clavier de type
Gmail/Linear pour traverser la pile d'unread plus vite :
- `J` ou `↓` : article suivant (highlight + scroll into view)
- `K` ou `↑` : article précédent
- `E` ou `Espace` : marquer lu + auto-next
- `Enter` : ouvrir l'article courant dans nouvel onglet
- `U` : annuler le dernier "marked read" (undo)

Ajoute un useState pour l'index courant (default 0). Affiche un focus
ring CSS sur l'item actif (.review-item.is-focused).

Pseudo-code à intégrer (adapte aux noms réels du composant existant) :

  const [activeIdx, setActiveIdx] = useState(0);
  const [lastMarked, setLastMarked] = useState(null);
  // Liste effective des items unread (à filtrer comme déjà fait par le
  // panel) : items
  useEffect(() => {
    function onKey(e){
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx(i => Math.min(items.length - 1, i + 1));
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx(i => Math.max(0, i - 1));
      } else if (e.key === "e" || e.key === " ") {
        e.preventDefault();
        markReadAndAdvance(items[activeIdx]);
      } else if (e.key === "Enter") {
        const it = items[activeIdx];
        if (it && (it._url || it.url)) window.open(it._url || it.url, "_blank", "noopener");
      } else if (e.key === "u") {
        e.preventDefault();
        if (lastMarked) {
          // restore
          setLastMarked(null);
          // ... call your undo function
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeIdx, items.length, lastMarked]);

  function markReadAndAdvance(item) {
    if (!item) return;
    try {
      const id = item._id || item.id;
      if (id) {
        const map = JSON.parse(localStorage.getItem("read-articles") || "{}");
        map[id] = { ts: Date.now() };
        localStorage.setItem("read-articles", JSON.stringify(map));
        setLastMarked({ id, prev: null });
      }
    } catch {}
    try { window.track && window.track("review_action", { action: "mark_read_advance", id: item._id || item.id }); } catch {}
    // advance: stay at same index (since the item disappears, next item
    // takes its place) OR if last item, go to previous
    setActiveIdx(i => Math.min(i, items.length - 2));
  }

Et un useEffect pour scroll into view :

  useEffect(() => {
    const el = document.querySelector(`.review-item[data-idx="${activeIdx}"]`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeIdx]);

Ajoute en CSS :

  .review-item.is-focused {
    outline: 2px solid var(--brand);
    outline-offset: 4px;
    border-radius: var(--radius);
  }

Affiche un help microcopy en haut du panel : `J/K · E mark · Enter ouvrir · U undo`.

Mets à jour le tableau KEYBOARD_SHORTCUTS dans cockpit/app.jsx (ajoute un
group "Revue du jour"). Mets à jour docs/specs/tab-review.md.
```

**Validation** : ouvre la Revue du jour, presse `J` plusieurs fois → le
focus visuel descend item par item. `E` → l'item disparaît (marked read),
le focus reste à la même position (sur le suivant). `U` → annule.
`Enter` → ouvre l'URL.

---

## P1 / P2 — Polish + Features Jarvis

### Prompt 11 — [JARVIS] Calendrier-aware morning card (Feature #1)

**Priorité** : P2
**Dépend de** : Outlook observer actif (déjà en place,
`jarvis/observers/outlook_observer.py`), table `activity_briefs` ou
nouvelle table dérivée
**Fichiers concernés** : `cockpit/home.jsx` (composant
MorningCard), `cockpit/lib/data-loader.js` (bootTier1 ajout outlook
snapshot), nouvelle migration SQL

```
Objectif : transformer le bloc Morning Card existant en suggestion
contextualisée sur le créneau libre matinal de l'utilisateur, mesuré
depuis le snapshot Outlook quotidien.

Étapes :

1. Crée une migration sql/014_morning_window.sql qui ajoute une vue
   ou une fonction RPC find_morning_window(user_id, date) qui retourne :
   - { start_iso, end_iso, duration_min } : le 1er créneau libre ≥ 10
     min entre 8h00 et 10h00 du jour, en lisant les meetings du
     activity_briefs.stats JSONB (clé "outlook.meetings").
   - NULL si aucun créneau libre ou pas de données Outlook.

   Sécurise en RLS authenticated SELECT.

2. Dans cockpit/lib/data-loader.js bootTier1, ajoute un fetch parallèle
   de cette RPC, expose le résultat dans data.morning_window =
   { start_iso, end_iso, duration_min } | null.

3. Dans cockpit/home.jsx MorningCard, modifie la signature pour
   accepter morningWindow. Si morningWindow est non-null :
   - Modifie l'eyebrow "Trois choses aujourd'hui" en
     "TON CRÉNEAU CALME : {start} → {end} ({duration} MIN LIBRES)"
   - Calcule le total de reading_time des items proposés. Filtre les
     items dont la somme tient dans la window.
   - Si la somme dépasse, garde le top 2-3 qui rentrent.

4. Si morningWindow est null, fallback sur le comportement actuel.

5. Ajoute un nouveau bouton primary "COMMENCER {start}" qui set
   localStorage.cockpit-morning-window-started = Date.now() puis
   ouvre le 1er article (window.open).

6. Met en place la mesure : event telemetry "morning_window_used"
   payload { duration_min, items_count }.

7. Mets à jour CLAUDE.md, docs/specs/tab-brief.md, et
   docs/architecture/dependencies.yaml::tables avec la nouvelle vue.

Pour la partie SQL :

  CREATE OR REPLACE FUNCTION find_morning_window(p_user_id uuid, p_date date)
  RETURNS TABLE(start_iso timestamptz, end_iso timestamptz, duration_min int)
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  AS $$
  DECLARE
    morning_start timestamptz := p_date::timestamptz + interval '8 hours';
    morning_end   timestamptz := p_date::timestamptz + interval '10 hours';
    meetings jsonb;
  BEGIN
    SELECT stats -> 'outlook' -> 'meetings'
      INTO meetings
      FROM activity_briefs
      WHERE date = p_date
      LIMIT 1;
    IF meetings IS NULL OR jsonb_array_length(meetings) = 0 THEN
      start_iso := morning_start;
      end_iso   := morning_end;
      duration_min := 120;
      RETURN NEXT;
      RETURN;
    END IF;
    -- (heuristique simple : retourne la 1re plage libre ≥ 10 min;
    -- itération sur les meetings triés par start_iso, à raffiner au besoin)
    -- ... implémentation (ou laisser le frontend calculer le créneau)
  END;
  $$;
```

**Validation** : crée un brief Outlook test avec une réunion 8h30-9h00
→ la morning card doit suggérer 9h00→10h00. Sans réunions, suggère
8h00→10h00. Vérifie que le bouton "COMMENCER 9h00" ouvre bien le 1er
item.

---

### Prompt 12 — [JARVIS] Bring-this-back (snooze + resurface) (Feature #4)

**Priorité** : P2
**Dépend de** : `cockpit/lib/snooze.js` existant
**Fichiers concernés** : `cockpit/lib/snooze.js` (étendre avec
"resurface_at"), `cockpit/home.jsx` + `cockpit/panel-veille.jsx` +
`cockpit/panel-top.jsx` (bouton "ramène-moi ça"), `cockpit/panel-review.jsx`
(intégrer la file FIFO de resurface)

```
Objectif : permettre à l'utilisateur de "snoozer" un article avec une
date de retour explicite. À la date prévue, l'article réapparaît en
haut de la Revue du jour avec un badge "RAMENÉ".

1. Étends cockpit/lib/snooze.js. Aujourd'hui il a probablement add(id, days).
   Ajoute :

   window.snooze.scheduleResurface = function(id, days, payload) {
     const queue = JSON.parse(localStorage.getItem("cockpit-resurface-queue") || "[]");
     queue.push({
       id,
       resurface_at: Date.now() + days * 86400000,
       scheduled_at: Date.now(),
       payload: payload || null
     });
     localStorage.setItem("cockpit-resurface-queue", JSON.stringify(queue));
     try { window.track && window.track("resurface_scheduled", { id, days }); } catch {}
   };

   window.snooze.popDueResurface = function() {
     const queue = JSON.parse(localStorage.getItem("cockpit-resurface-queue") || "[]");
     const now = Date.now();
     const due = queue.filter(q => q.resurface_at <= now);
     const remaining = queue.filter(q => q.resurface_at > now);
     localStorage.setItem("cockpit-resurface-queue", JSON.stringify(remaining));
     return due;
   };

2. Sur les card-actions des articles (top, signaux, veille), ajoute un
   3e bouton "ramène-moi ça" entre bookmark et ask. Au clic, ouvre un
   mini popover demandant "dans combien de jours ?" avec presets
   (3j, 7j, 30j) + custom number.

3. Dans cockpit/panel-review.jsx, au mount, lis window.snooze.popDueResurface()
   et insère ces items en tête de liste avec un badge "RAMENÉ" + petit
   tooltip "tu avais snoozé ce {kind} il y a {days}j".

4. Style du badge :

   .review-resurface-badge {
     display: inline-flex; align-items: center; gap: 4px;
     padding: 2px 8px;
     background: var(--brand-tint);
     color: var(--brand-ink);
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.1em;
     text-transform: uppercase;
     border-radius: 999px;
   }

5. Mets à jour CLAUDE.md (Télémétrie : resurface_scheduled, resurface_resurfaced).
   Mets à jour docs/specs/tab-review.md et tab-top.md.
```

**Validation** : sur la home, clique "ramène-moi ça" sur le Top #1 →
mini popover, choisis 7j. Avance la date système de 8j, recharge la
Revue → l'article apparaît en haut avec le badge RAMENÉ.

---

### Prompt 13 — [JARVIS] « Pourquoi je vois ça ? » explainability (Feature #5)

**Priorité** : P2
**Dépend de** : Le pipeline `main.py` doit exposer la décomposition du
score (modif backend) + le panel front
**Fichiers concernés** : `main.py` (Gemini scoring → enrichir output
JSON), migration SQL pour ajouter `score_breakdown jsonb` à `articles`,
`cockpit/home.jsx` + `cockpit/panel-top.jsx` (popover)

```
Objectif : sur chaque article du Top 3 (et de l'overview Top), un
bouton (?) qui ouvre un mini popover montrant la décomposition du
score : pourquoi cet article a 82, quels facteurs l'ont fait monter
ou descendre.

Côté backend :

1. Migration sql/015_articles_score_breakdown.sql :

   ALTER TABLE articles ADD COLUMN IF NOT EXISTS score_breakdown jsonb;

2. Dans main.py, quand Gemini Flash-Lite scoring tourne, demande au
   modèle de retourner non seulement un score (0-100) mais une liste
   de facteurs structurés :

   {
     "score": 82,
     "breakdown": [
       {"label": "Lacune radar : agents-orchestration", "delta": +30},
       {"label": "Signal en hausse : MCP", "delta": +20},
       {"label": "Source whitelistée Tier 1", "delta": +15},
       {"label": "Récent (< 4h)", "delta": +10},
       {"label": "Jamais lu sujet similaire", "delta": +7}
     ]
   }

   Et insère breakdown dans la colonne score_breakdown.

   Ajuste le prompt Gemini pour spécifier ce format. Ajoute une
   validation de fallback : si le breakdown ne parse pas, set null
   et continue (ne pas casser le pipeline).

Côté frontend :

3. Crée cockpit/components-why.jsx (nouveau composant réutilisable) :

   function WhyPopover({ article, onClose }) {
     const breakdown = article.score_breakdown || article._score_breakdown || [];
     return (
       <div className="why-popover" role="dialog" aria-label="Décomposition du score">
         <button className="why-close" onClick={onClose} aria-label="Fermer">
           <Icon name="close" size={14} />
         </button>
         <div className="why-eyebrow">POURQUOI CET ARTICLE ?</div>
         <div className="why-score">Score {article.score} / 100</div>
         {breakdown.length === 0 ? (
           <p className="why-empty">Pas de décomposition disponible pour cet article.</p>
         ) : (
           <ul className="why-list">
             {breakdown.map((b, i) => (
               <li key={i} className={`why-item why-item--${b.delta >= 0 ? "pos" : "neg"}`}>
                 <span className="why-label">{b.label}</span>
                 <span className="why-delta">{b.delta >= 0 ? "+" : ""}{b.delta}</span>
               </li>
             ))}
           </ul>
         )}
         <div className="why-foot">
           <button className="btn btn--ghost btn--sm" onClick={() => {
             // Track "trop ? down-rank cette source"
             window.track && window.track("source_downrank_requested", { source: article.source });
             onClose();
           }}>Trop ? Down-rank cette source</button>
         </div>
       </div>
     );
   }
   window.WhyPopover = WhyPopover;

4. Dans cockpit/home.jsx (top-actions de chaque card top), ajoute un
   bouton :

     <button className="card-action card-action--why" aria-label="Pourquoi cet article ?"
       onClick={(e) => { e.stopPropagation(); setWhyOpen(t.rank); }}>
       <Icon name="info" size={12} stroke={2} />
     </button>

   Avec state local : const [whyOpen, setWhyOpen] = React.useState(null);
   Et conditionnellement : {whyOpen === t.rank && <WhyPopover article={t} onClose={() => setWhyOpen(null)} />}

5. Style cockpit/styles.css :

   .why-popover {
     position: absolute;
     top: 0; right: 100%;
     width: 280px;
     padding: var(--space-4);
     background: var(--surface);
     border: 1px solid var(--bd);
     border-radius: var(--radius-lg);
     box-shadow: var(--shadow-lg);
     z-index: 50;
     font-family: var(--font-body);
   }
   .why-eyebrow {
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.14em;
     text-transform: uppercase;
     color: var(--tx3);
     margin-bottom: var(--space-2);
   }
   .why-score {
     font-family: var(--font-display);
     font-size: var(--text-2xl);
     color: var(--tx);
     margin-bottom: var(--space-3);
   }
   .why-list { display: flex; flex-direction: column; gap: var(--space-2); }
   .why-item {
     display: flex; justify-content: space-between; gap: var(--space-3);
     padding: var(--space-2) 0;
     border-bottom: 1px dashed var(--bd);
     font-size: var(--text-sm);
   }
   .why-item--pos .why-delta { color: var(--positive); }
   .why-item--neg .why-delta { color: var(--alert); }
   .why-label { color: var(--tx2); flex: 1; }
   .why-delta {
     font-family: var(--font-mono);
     font-weight: 600;
     min-width: 40px;
     text-align: right;
   }
   .why-foot { padding-top: var(--space-3); }

6. Mets à jour CLAUDE.md (Télémétrie : source_downrank_requested,
   why_opened — payload {rank} ou {article_id}). Mets à jour les specs
   tab-brief.md, tab-top.md, dependencies.yaml (nouvelle colonne).
```

**Validation** : après que le pipeline a tourné une fois avec la nouvelle
version Gemini, ouvre la home, clique sur le (?) du Top #1 → popover
s'ouvre avec liste des facteurs. Tab pour fermer fonctionne. La somme
des deltas devrait approximer le score (à ±5 près, le modèle n'est pas
déterministe).

---

### Prompt 14 — [JARVIS] Skill-coach proactif hebdomadaire (Feature #13)

**Priorité** : P2
**Dépend de** : Pipeline `weekly_analysis.py` actif (Claude Haiku)
**Fichiers concernés** : `weekly_analysis.py` (nouveau bloc
"skill_coach_message"), nouvelle table `coach_messages`,
`cockpit/panel-jarvis.jsx` (afficher le message au mount si non lu)

```
Objectif : 1×/semaine Jarvis devient proactif et envoie un message
unique au chat (visible dès le mount du panel Jarvis), basé sur l'état
du radar et l'historique de challenges. Format : "Tu n'as pas avancé
sur l'axe Agents depuis 3 sem, voici un challenge calibré : XXX".

Étapes :

1. Migration sql/016_coach_messages.sql :

   CREATE TABLE coach_messages (
     id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
     user_id uuid NOT NULL,
     created_at timestamptz NOT NULL DEFAULT now(),
     axis text NOT NULL,
     stagnation_weeks int,
     message text NOT NULL,
     suggested_challenge_id uuid,
     read_at timestamptz,
     dismissed_at timestamptz
   );

   ALTER TABLE coach_messages ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "select own coach_messages" ON coach_messages
     FOR SELECT USING (auth.uid() = user_id);
   CREATE POLICY "update own coach_messages" ON coach_messages
     FOR UPDATE USING (auth.uid() = user_id);

2. Dans weekly_analysis.py, ajoute après les blocs existants :

   def maybe_generate_coach_message(profile, radar, challenge_history):
       # Détecte le pire axe : score < 50 ET pas d'attempt depuis 21+j
       stagnant = []
       for axis in radar:
           if axis.score >= 50: continue
           last_attempt = max([a.completed_at for a in challenge_history
                               if a.axis == axis.name], default=None)
           if last_attempt is None or (datetime.now() - last_attempt).days >= 21:
               stagnant.append((axis, (datetime.now() - (last_attempt or axis.created_at)).days // 7))
       if not stagnant:
           return None
       worst, weeks = sorted(stagnant, key=lambda x: -x[1])[0]
       # Demande à Claude de générer un message court (≤200 chars) +
       # suggérer un challenge calibré
       prompt = f"""[contexte profil + radar + challenges existants]
       Axe à coacher : {worst.name} (score {worst.score}/100, stagnant
       depuis {weeks} semaines).
       Génère un message court, ton direct, légèrement opinionated, de
       150-200 chars max, qui pointe le pattern + propose UNE action
       immédiate. Ne sois pas mou."""
       resp = claude_call(prompt)
       insert_coach_message(user_id, axis=worst.name, weeks=weeks, message=resp.text)

3. Dans cockpit/panel-jarvis.jsx, au mount, fetch les coach_messages
   non lus :

   const [coachMsg, setCoachMsg] = useStateJv(null);
   useEffectJv(() => {
     fetchJSON("/rest/v1/coach_messages?read_at=is.null&dismissed_at=is.null&order=created_at.desc&limit=1")
       .then(rows => rows && rows.length && setCoachMsg(rows[0]))
       .catch(() => {});
   }, []);

4. Affiche le message au-dessus du chat avec un style spécifique :

   {coachMsg && (
     <div className="jrv-coach-card">
       <div className="jrv-coach-eyebrow">JARVIS · COACH HEBDO</div>
       <p className="jrv-coach-msg">{coachMsg.message}</p>
       <div className="jrv-coach-actions">
         <button className="btn btn--primary btn--sm" onClick={() => {
           // Mark read + send to chat as a system msg
           patchJSON(`/rest/v1/coach_messages?id=eq.${coachMsg.id}`, { read_at: new Date().toISOString() });
           sendCoachAsChat(coachMsg);
           setCoachMsg(null);
         }}>Discuter avec Jarvis</button>
         <button className="btn btn--ghost btn--sm" onClick={() => {
           patchJSON(`/rest/v1/coach_messages?id=eq.${coachMsg.id}`, { dismissed_at: new Date().toISOString() });
           setCoachMsg(null);
         }}>Plus tard</button>
       </div>
     </div>
   )}

5. Style cockpit/styles-jarvis.css :

   .jrv-coach-card {
     background: var(--brand-tint);
     border: 1px solid color-mix(in srgb, var(--brand) 30%, var(--bd));
     padding: var(--space-4) var(--space-5);
     border-radius: var(--radius-lg);
     margin-bottom: var(--space-4);
   }
   .jrv-coach-eyebrow {
     font-family: var(--font-mono);
     font-size: var(--text-2xs);
     letter-spacing: 0.14em;
     text-transform: uppercase;
     color: var(--brand-ink);
     margin-bottom: var(--space-2);
   }
   .jrv-coach-msg {
     font-size: var(--text-md);
     line-height: 1.55;
     color: var(--tx);
     margin-bottom: var(--space-3);
   }
   .jrv-coach-actions {
     display: flex; gap: var(--space-2);
   }

6. Mets à jour : CLAUDE.md (nouvelle table coach_messages),
   docs/specs/tab-jarvis.md, docs/architecture/dependencies.yaml,
   docs/architecture/pipelines.yaml::weekly_analysis (output ajouté).
```

**Validation** : insère manuellement une ligne coach_messages avec
read_at=null. Ouvre le panel Jarvis → la card coach apparaît en haut.
Clique "Discuter avec Jarvis" → la card disparaît, et un message
système (le contenu du coach) apparaît dans le fil de chat.

---

### Prompt 15 — [JARVIS] Time-aware density (Feature #15)

**Priorité** : P2
**Dépend de** : Prompt 1 (compact toggle déjà élargi avec timestamps)
**Fichiers concernés** : `cockpit/home.jsx` (logique de bascule
viewMode + heroCompact basée sur l'heure), `cockpit/app.jsx` (panel
prioritaire selon l'heure pour le routing initial)

```
Objectif : adapter la densité de la home selon l'heure du jour, en
restant respectueux d'un opt-out persistant.

Schéma cible :
- 06h00 → 10h00 : MODE MATINAL — Brief complet par défaut, hero plein,
                  audio chip mis en avant.
- 10h00 → 18h00 : MODE TRAVAIL — hero compact, recherche en focus
                  visuel (placeholder kicker "Cherche une ressource…").
- 18h00 → 22h00 : MODE FIN DE JOURNÉE — Miroir du soir prioritaire
                  (l'app routing initial atterrit sur "evening" si
                  l'utilisateur n'a pas de panel explicite dans l'URL
                  hash).
- 22h00 → 06h00 : MODE NUIT — thème Obsidian forcé (déjà géré par
                  pickAutoTheme dans sidebar.jsx), hero compact.

Règle : si l'utilisateur a un timestamp explicite récent
(cockpit-hero-compact-explicit-ts < 30j ou cockpit-recent-explicit < 1h),
respecte son choix.

Étapes :

1. Crée un helper cockpit/lib/time-mode.js :

  (function(){
    function currentMode(){
      const h = new Date().getHours();
      if (h >= 6 && h < 10) return "morning";
      if (h >= 10 && h < 18) return "work";
      if (h >= 18 && h < 22) return "evening";
      return "night";
    }
    function suggestedHomeView(mode){
      return mode === "morning" ? "full" : "morning";
      // ie. matinal → brief complet ; le reste → morning card prioritaire
    }
    function suggestedHeroCompact(mode){
      return mode !== "morning"; // compact partout sauf matin
    }
    function suggestedInitialPanel(mode){
      if (mode === "evening") return "evening";
      return "brief"; // fallback
    }
    window.timeMode = { currentMode, suggestedHomeView, suggestedHeroCompact, suggestedInitialPanel };
  })();

2. Charge ce script dans index.html avant home.jsx.

3. Dans cockpit/home.jsx, modifie l'init du state heroCompact ET viewMode
   pour consulter window.timeMode si l'utilisateur n'a pas d'override
   explicite :

  const [heroCompact, setHeroCompact] = React.useState(() => {
    try {
      const explicitTs = Number(localStorage.getItem("cockpit-hero-compact-explicit-ts") || 0);
      const explicitFresh = explicitTs > 0 && (Date.now() - explicitTs) < 30 * 86400000;
      if (explicitFresh) return localStorage.getItem("cockpit-hero-compact") === "1";
      const visits = Number(localStorage.getItem("cockpit-brief-visits") || "0");
      if (visits >= 5) return true; // règle prompt 1
      // Sinon : règle horaire
      const mode = window.timeMode?.currentMode?.();
      if (mode) return window.timeMode.suggestedHeroCompact(mode);
      return false;
    } catch { return false; }
  });

4. Dans cockpit/app.jsx, dans le useState initial activePanel,
   après la lecture du hash, ajoute un fallback time-aware :

  const initialPanel = (() => {
    try {
      const h = (window.location.hash || "").replace(/^#/, "").trim();
      if (h) return h.split("/")[0]; // existing logic
    } catch {}
    // No hash : suggest based on time
    const mode = window.timeMode?.currentMode?.();
    return window.timeMode?.suggestedInitialPanel?.(mode) || "brief";
  })();

5. Mets à jour CLAUDE.md (mention de la time-aware mode), docs/specs/tab-brief.md
   (Parcours utilisateur : "Le matin (06-10h), tu atterris sur le brief
   complet ; le reste de la journée la home s'ouvre en compact").

6. Émets un event telemetry "time_mode_applied" payload { mode } UNE FOIS
   par session (pas à chaque mount), pour mesurer la répartition des
   visites par tranche.
```

**Validation** : avance la date système à 11h, recharge → le brief
s'ouvre en mode compact + Morning Card. À 19h → atterrissage sur
"evening". À 03h → Obsidian + compact. Quand l'utilisateur clique
explicitement le toggle compact, le timestamp est posé et la règle
horaire est désactivée pendant 30j.

---

# 5. Checklist d'exécution

Ordre recommandé, dépendances explicites, estimations cumulées.

| # | Tag | Titre | Priorité | Dépend de | Effort | Bénéfice attendu |
|---|---|---|---|---|---|---|
| 1 | UX | Hero compact par défaut après 5 visites | P0 | — | 30 min | Fatigue visuelle ↓ |
| 2 | UX | Card actions visibles à 35% par défaut | P0 | — | 15 min | Découvrabilité ↑ |
| 3 | UX | Sidebar pin button visible 40% sur non-actifs | P0 | — | 15 min | Découvrabilité ↑ |
| 4 | UX | Fusionner les 2 CTAs primary du hero | P0 | — | 20 min | Décision ↓ (Hick) |
| 5 | UX | `scroll-margin-top` global pour ancres | P0 | — | 10 min | Bug latent fixé |
| 6 | UX | Raccourci `Ctrl+/` alias de `?` | P0 | — | 10 min | Convention universelle |
| 7 | UX | Indicateur « non visité depuis Xj » | P1 | — | 1h | Auto-curation |
| 8 | UX | Lint CSS « tokens-only » | P1 | — | 1h30 | Maintenance long-terme |
| 9 | UX | Streak protection notification PWA | P1 | Service worker (déjà actif) | 1h | Rétention quotidienne |
| 10 | UX | « Mark + next » dans la Revue (J/K/E/U) | P1 | — | 1h30 | Vélocité Revue × 3 |
| 11 | JARVIS | Calendrier-aware morning card | P2 | Outlook observer + migration SQL | 4h | Personnalisation forte |
| 12 | JARVIS | Bring-this-back (snooze + resurface) | P2 | snooze.js existant | 2h | Mémoire longue |
| 13 | JARVIS | « Pourquoi je vois ça ? » explainability | P2 | Modif `main.py` + migration SQL | 3h | Trust + transparence |
| 14 | JARVIS | Skill-coach proactif hebdomadaire | P2 | Modif `weekly_analysis.py` + migration SQL | 3h | Engagement profond |
| 15 | JARVIS | Time-aware density | P2 | Prompts 1 (compact toggle élargi) | 1h30 | Contextualisation forte |

**Temps total des P0** : ~1h40 cumulées — faisable sur une matinée.
**Temps total des P1** : ~5h cumulées — un samedi de hack.
**Temps total des P2 / Jarvis** : ~13h30 cumulées — 2-3 itérations de
sprint.

**Ordre conseillé** :

1. **Vendredi soir** : prompts 1, 2, 3, 4, 5, 6 (P0 — visibles dès la
   prochaine visite, faible risque).
2. **Samedi matin** : prompts 7, 8 (P1 — outillage + auto-curation).
3. **Samedi après-midi** : prompts 9, 10 (P1 — rétention + vélocité).
4. **Sprint suivant** : prompts 12, 15 (P2 — extensions UX sans backend).
5. **Sprint après** : prompts 11, 13, 14 (P2 — features lourdes avec
   migrations SQL et modifs pipelines backend).

**Mesure du succès dans 30 jours** :

- Compteur `usage_events` : ratio (`hero_compact_toggled` user-driven)
  / (auto-fired) — si l'auto >> manuel, la règle des 5 visites est
  bonne. Si l'inverse, durcir le seuil.
- Median time-to-first-action sur la home : doit baisser après les
  prompts 2-4.
- Streak médian sur 30j : doit monter après le prompt 9.
- Taux d'utilisation de la Revue / nb articles non lus : doit monter
  après le prompt 10.
- Pour les features Jarvis : nb opens du popover « Pourquoi », nb
  clicks « Discuter avec Jarvis » sur coach card, nb articles
  resurfaced ouverts.

---

## Annexes

### A. Décisions d'audit qui méritent débat

1. **Faut-il vraiment 3 thèmes ?** Pour un cockpit perso, c'est un
   investissement coûteux à maintenir (3 × 16 stylesheets = 48 surfaces).
   **Option A** : garder Dawn comme principal et marquer Obsidian /
   Atlas comme « expérimentaux » (toggle caché derrière un Ctrl+Shift+T).
   **Option B** : supprimer Atlas (le moins distinctif des trois) pour
   réduire la matrice à 32 surfaces. Trade-off : moins de plaisir au
   theme-switch, mais moins de drift à surveiller. **Pas implémenté
   dans les prompts** — décision produit qui t'appartient.

2. **29 panels = trop ?** Possiblement. **Option** : créer une vue
   « Jean unifiée » (Feature #14 du roadmap, non priorisée dans les
   prompts) qui agrège brief + recos + signaux + 1 idée + 1 challenge
   du jour en une seule page de 80vh. Les 29 panels resteraient
   accessibles mais ne seraient plus le point d'entrée par défaut.

3. **Babel standalone** : le coût de first paint est mesurable
   (~300-500ms sur compile + boot Tier 1). À terme, un build step
   (esbuild en GH Action, output un seul cockpit.js minifié) gagnerait
   ~300ms et permettrait de retirer `'unsafe-eval'` de la CSP. Mais
   c'est un changement structurel, pas un quick win. **Pas dans les
   prompts.**

### B. Risques non traités dans cet audit

- **Internationalisation** : tout est en français hardcodé. Pas un
  problème si Jean reste seul utilisateur, mais bloquant pour partager.
- **Tests** : aucun test front automatisé visible (pas de Jest /
  Vitest / Playwright). Le risque de régression visuelle augmente avec
  le nombre de panels. Idée : screenshot test minimal sur la home en
  trois thèmes via Playwright headless.
- **Accessibilité avancée** : le projet couvre les bases (focus,
  reduced-motion, skip link), mais je n'ai pas audité chaque composant
  custom (radar SVG, sparklines, modal ticket) pour les attributs ARIA
  contextuels. Audit a11y dédié recommandé après les prompts P0/P1.
- **Performance** : Tier 1 fetch en parallèle = bien, mais 9 requêtes
  Supabase en parallèle au boot peuvent saturer le free tier sous
  charge. Pas un problème pour 1 utilisateur.

---

*Audit produit par Claude (claude-opus-4-7) en mode scheduled task le
9 mai 2026. Méthode : crawl du site live + lecture intégrale du code
source (`index.html` 126 LOC + `cockpit/themes.js` 226 LOC + `cockpit/nav.js` 60 LOC + `cockpit/styles-mobile.css` 297 LOC + `cockpit/styles.css` ~5500 LOC + `cockpit/home.jsx` ~600 LOC + extraits `app.jsx`, `sidebar.jsx`, `panel-jarvis.jsx`).*
