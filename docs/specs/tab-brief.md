# Brief du jour

> Page d'atterrissage matinale : synthèse IA du jour + top 3 + signaux faibles + radar gap + semaine en cours, en une seule page de consultation.

## Scope
mixte

## Finalité fonctionnelle
C'est le premier écran à l'ouverture du cockpit (route `"brief"`, panel par défaut dans [app.jsx:154](cockpit/app.jsx:154)). Il rassemble quatre vues synthétiques pour décider quoi lire en priorité ce matin sans scroller 20 onglets : **hero** (paragraphe de synthèse + stats macro), **top 3 incontournables**, **4 signaux faibles** (new/rising en priorité), **radar compétences** avec le prochain gap à combler, et **bilan de la semaine** en heatmap barres.

## Parcours utilisateur
1. À l'ouverture du cockpit, la page Brief du jour s'affiche par défaut — les données du matin sont déjà chargées avant que l'interface apparaisse.
2. Si des licences suivies ont du nouveau — annonce, date connue, sortie ou annulation —, un encart discret tout en haut de page (au-dessus même de la synthèse du jour, dans les deux vues) le résume : jusqu'à trois événements, chacun avec sa pastille de type. Un clic sur la coche le marque comme vu ; un bouton dédié arrête le suivi de la licence concernée pour ne plus recevoir d'alerte sur ses suites. Sans nouveauté, rien ne s'affiche.
3. L'utilisateur lit le paragraphe de synthèse en tête de page pour se situer sur l'actualité IA du jour. Lorsqu'il revient en moins de 18 h et que de nouvelles publications sont arrivées depuis, le titre principal bascule directement en "X nouveautés depuis Yh" et liste les premiers articles non vus (source, titre tronqué, score de pertinence) ; un bouton "Lire les X nouveautés" amène droit au Top du jour, et la synthèse éditoriale complète reste accessible derrière un bouton repliable "Voir le brief macro complet".
4. Option : clic sur **Lecture audio** pour faire lire la synthèse à voix haute en français, mains-libres en début de journée.
5. Clic sur "Lire les 3 incontournables" pour basculer vers le Top du jour, ou clic direct sur une carte du top pour ouvrir l'article en onglet externe (marqué lu automatiquement).
6. Scan des quatre signaux faibles (nouveau / en hausse / stable / en baisse) pour voir ce qui bouge dans la veille.
7. Coup d'œil au radar compétences et à l'encart "Ton prochain gap à combler" qui propose un challenge associé en un clic.
8. Lecture finale du bilan de la semaine : heatmap 7 jours des articles lus par jour et compteurs (articles lus, gardés, streak).
9. Bouton "Tout marquer lu" pour valider les trois incontournables comme lus d'un coup ; un bandeau discret en bas d'écran confirme l'action et propose un "Annuler" pendant six secondes au cas où le clic était involontaire.
10. Option : pour un article intéressant mais pas pour ce matin, clic sur le bouton horloge "Reporter" → la carte se grise et l'article ressort en tête du top trois jours plus tard.
11. Quand l'utilisateur revient cinq fois par jour et que le format macro lui prend trop de place, un petit bouton "Compact" en haut à droite du hero le réduit immédiatement à un format dense. Sa préférence est conservée d'une visite à l'autre — un clic sur "Plein" suffit à retrouver le format découverte.

## Fonctionnalités
- **Vote sur la sélection du jour** : chaque article retenu porte le motif pour lequel il a été choisi, et deux boutons pouce haut / pouce bas. Le pouce bas demande *pourquoi* — déjà vu, pas mon sujet, trop superficiel, rien d'actionnable — parce qu'un rejet sans motif n'apprend presque rien. Ces verdicts réécrivent les règles de sélection des jours suivants.
- **Vue Morning Card** : un toggle "Morning Card / Brief complet" persiste le mode choisi. En Morning Card, la page n'affiche que trois choses numérotées (article du jour, signal qui monte, prochain gap à combler) avec un seul CTA chacune — format minute pour les matins serrés. Bascule libre vers le Brief complet à tout moment.
- **Sorties jeux vidéo** : au-dessus de la synthèse du jour, dans les deux vues (Morning Card et Brief complet), un encart signale les nouveautés des licences suivies — jusqu'à trois événements affichés à la fois, chacun avec une pastille qui précise s'il s'agit d'une annonce, d'une date connue, d'une sortie ou d'une annulation. Un événement reste visible un mois après sa détection, une annonce de jeu restant pertinente plus longtemps qu'une sortie d'épisode. Un bouton coche marque l'événement comme vu ; un second arrête le suivi de la licence concernée, qui cesse alors d'alerter sur ses prochaines suites. Sans nouveauté, l'encart ne s'affiche pas. **Sept événements sont en attente au 2026-08-13**, tous des jeux à venir dans des licences suivies — de Marvel's Wolverine à une suite de Mass Effect encore sans date.
- **Synthèse du jour** : un paragraphe éditorial en tête de page qui résume l'actualité IA du jour, avec deux raccourcis vers le Top du jour et la Veille complète. Quand l'utilisateur revient au cockpit après plus d'une demi-heure, le sur-titre bascule en "Depuis ta dernière visite — Xh" et compte les nouveaux articles arrivés depuis, pour positionner la lecture comme un delta plutôt qu'un récap quotidien.
- **Mode "nouveautés" — visite récurrente** : si la dernière visite remonte à moins de 18 h et qu'au moins un nouvel article est tombé depuis, le titre principal bascule en "X nouveautés depuis Yh." et la page liste directement les premiers articles non vus (source en capitales, titre tronqué et score de pertinence) — jusqu'à quatre éléments visibles, plus un indicateur "+ N plus" en cas de fournée plus volumineuse. Le bouton d'action principal change pour "Lire les X nouveautés" et amène droit au Top du jour. La synthèse éditoriale classique du matin reste accessible derrière un bouton repliable "Voir le brief macro complet" pour qui veut quand même la relire.
- **Lecture audio** : un bouton qui lit la synthèse à voix haute en français, avec une estimation du temps de lecture. Utile pour démarrer la journée mains-libres.
- **À traiter depuis hier** : un grand chiffre dominant en couleur d'accent en colonne de droite du hero, qui agrège les articles non lus et rappelle le nombre de signaux à regarder. Bouton "Commencer la revue" qui amène directement sur le Top du jour. L'heure du prochain brief reste affichée en métadonnée discrète sous le bloc.
- **Top 3 incontournables** : les trois articles à lire en priorité ce matin, chacun avec son score, sa source, son résumé et ses tags. Un clic sur la carte ouvre l'article et le marque lu — la carte se replie alors automatiquement en une ligne d'environ 56 px (titre tronqué + pastille "✓ Lu" en accent positif), libérant l'espace au-dessus de la ligne de flottaison. Les trois cartes lues prennent ainsi ~170 px au lieu de ~660 px. Un clic-droit (ou appui long sur mobile) sur une carte lue la repasse en non-lue avec animation inverse. Les boutons "Garder", "Demander à Jarvis" et "Reporter" restent visibles en filigrane sur chaque carte (pleine opacité au survol et en tactile) pour rester découvrables sans avoir à survoler.
- **État "à jour" — zéro positif** : quand l'utilisateur a tout lu/reporté ET que le compteur global d'articles à traiter retombe à zéro, le bloc Top du jour laisse la place à un message valorisant "Tu as fait le tour. Bravo." accompagné de deux idées du carnet (catégorie incubation/maturation, les plus anciennes en haut) cliquables pour basculer directement vers le Carnet d'idées. Un bouton "Ouvrir le carnet" complète. Évite l'écueil des cards grisées identiques quand il ne reste plus rien à faire et redirige l'attention vers le travail de fond.
- **Reporter un article (snooze)** : un bouton horloge sur chaque carte du top permet de mettre l'article de côté pour 3 jours quand il est intéressant mais pas prioritaire ce matin. La carte se grise immédiatement, l'article disparaît du top à la prochaine ouverture du cockpit, puis remonte automatiquement en tête du top le jour J pour rappel.
- **Filtre global "Récent · 24h"** : un bouton flottant en haut à droite du cockpit ("Tout" / "Récent · 24h") ne montre que les éléments apparus depuis moins de 24 heures — top-cards datés <24h et signaux flagués "nouveau" ; les autres restent silencieux. En visite récurrente (entre 30 min et 18 h après la dernière), le filtre s'active **automatiquement par défaut** pour ne montrer que ce qui a changé. Si l'utilisateur a explicitement basculé le toggle dans la dernière heure, sa préférence prime ; sinon le défaut "récent" s'applique. Quand le filtre est actif sans que le hero soit en mode delta, un microcopy "Mode récent · seuls les articles < 24h sont visibles. [Voir tout]" apparaît juste sous le hero pour rendre l'état découvrable et donner un escape rapide.
- **Signaux faibles** : les quatre tendances à surveiller, chacune avec sa courbe sur huit semaines et son delta, pour voir d'un coup d'œil si elle monte, stagne ou redescend.
- **Radar compétences** : une vue circulaire des axes IA avec les lacunes mises en évidence par des points plus gros, pour repérer les zones à travailler.
- **Prochain gap à combler** : un bloc à côté du radar qui désigne l'axe le plus faible et propose un raccourci direct vers un challenge ciblé.
- **Bilan de la semaine** : une mini-heatmap Lundi→Dimanche du nombre d'articles lus chaque jour, complétée par trois compteurs (articles lus, gardés, streak courante).
- **Tout marquer lu** : un bouton unique pour marquer les trois incontournables comme lus d'un coup, quand on a déjà consulté l'actualité ailleurs. Un bandeau flottant confirme l'action et propose un bouton "Annuler" pendant six secondes pour revenir en arrière en cas de clic involontaire ; passé ce délai, le marquage est définitif.
- **Signature coûts** : en pied de page, rappel des modèles IA qui alimentent la page (brief quotidien + analyses hebdo) et coût du mois rapporté au budget mensuel.
- **Sidebar — état zero du streak** : tant que l'utilisateur n'a encore lu aucun article aujourd'hui, le compteur "X j de veille" du pied de sidebar laisse place à un message d'amorçage en italique « Premier jour. Lis 1 article pour démarrer. » au lieu d'afficher un démoralisant « 0 j ». Dès la première lecture, le compteur reprend sa forme classique avec le nombre de jours consécutifs.
- **Toggle compact/plein du hero** : un petit bouton "Compact / Plein" en pastille discrète dans le coin haut-droit du hero permet de réduire la synthèse à environ 60 % de sa hauteur (titre, paragraphe et padding ramenés à un format plus dense) ou de revenir au format macro initial. Le choix est mémorisé et ré-appliqué à chaque ouverture du cockpit, utile quand on consulte la home plusieurs fois par jour et qu'on n'a plus besoin du format découverte.

## Front — structure UI
Fichier : [cockpit/home.jsx](cockpit/home.jsx) — 424 lignes, monté par le router dans [app.jsx:365](cockpit/app.jsx:365).

Classes-racines :
- `.home` (wrapper, reçoit `data-theme-vibe={theme.id}`)
- `.ph` — page header (eyebrow semaine + titre + date + chips actions)
- `.hero > .hero-frame` (2 cols : `.hero-col-main` / `.hero-col-side`)
- `.block` — sections génériques ; `.block--two` pour la 2-col Signaux+Radar
- `.top-grid` — 3 cards top
- `.sig-grid` — 4 signaux
- `.radar-box > .radar-svg-wrap + .radar-next`
- `.hwk-wrap > .hwk + .hwk-kpi` — heatmap semaine + KPIs

Pas d'id HTML stable sur le container ; l'identifiant de route est `"brief"` (dans `activePanel`, URL hash `#brief`). Le panel est Tier 1 (non listé dans `TIER2_PANELS` de [data-loader.js:4248](cockpit/lib/data-loader.js:4248)) — data pré-chargée avant mount.

Deux encarts d'alerte se montent juste au-dessus du hero, avant la bascule Morning Card / Brief complet, donc visibles dans les deux vues : `MdtBriefCard` (sorties médiathèque, non documenté par ailleurs dans cette spec — voir Limitations) et `GamesBriefCard` (sorties jeux vidéo). Classes `.gmb-*` pour ce dernier, définies dans `cockpit/styles-gaming.css`, alignées sur `.mdt-brief` (`color-mix` sur `var(--brand)`, réactif aux trois thèmes).

## Front — fonctions JS
| Fonction | Rôle | Fichier/ligne |
|----------|------|---------------|
| `Home({ theme, data, onNavigate })` | Composant racine, lit `data.{macro,top,signals,stats,date,user,radar,week}` | [home.jsx:158](cockpit/home.jsx:158) |
| `AudioBriefChip({ macro })` | Bouton TTS Web Speech API (fr-FR, voix auto) | [home.jsx:7](cockpit/home.jsx:7) |
| `TrendArrow({ trend, delta })` | Pastille NEW / flèche ↑↓ / — selon tendance signal | [home.jsx:44](cockpit/home.jsx:44) |
| `RadarSVG({ axes, size })` | Polygone radar SVG à N axes, 4 anneaux, points grossis si `gap=true` | [home.jsx:59](cockpit/home.jsx:59) |
| `Sparkbar({ values, max })` | Barres compactes (inutilisée dans Home actuel, conservée pour future widget) | [home.jsx:101](cockpit/home.jsx:101) |
| `Sparkline({ values, trend })` | Ligne SVG 8 points + point final, classe CSS selon tendance | [home.jsx:112](cockpit/home.jsx:112) |
| `SignalCard({ signal, rank })` | Carte signal : rank + badge trend + categorie + context + count + sparkline + delta | [home.jsx:127](cockpit/home.jsx:127) |
| `toggleRead(rank)` (inline) | État local des top lus ; conjoint avec `localStorage.read-articles` | [home.jsx:161](cockpit/home.jsx:161) |
| `openArticle()` (inline) | Écrit l'id dans `read-articles` et ouvre `t._url` en nouvel onglet | [home.jsx:256-269](cockpit/home.jsx:256) |
| `bootTier1()` | Orchestre les 7 fetches Tier 1 avant le mount React | [data-loader.js:1136](cockpit/lib/data-loader.js:1136) |
| `loadArticlesToday()` | `GET articles?fetch_date=eq.<today>&order=date_fetched.desc&limit=100` | [data-loader.js:73](cockpit/lib/data-loader.js:73) |
| `loadDailyBrief()` | `GET daily_briefs?order=date.desc&limit=1` | [data-loader.js:77](cockpit/lib/data-loader.js:77) |
| `loadSignals()` | `GET signal_tracking?order=mention_count.desc&limit=60` | [data-loader.js:82](cockpit/lib/data-loader.js:82) |
| `loadRadar()` | `GET skill_radar?order=axis` | [data-loader.js:85](cockpit/lib/data-loader.js:85) |
| `loadRecentArticles(30)` | `GET articles?fetch_date=gte.<d-30>&order=fetch_date.desc&limit=400` — nourrit Week | [data-loader.js:96](cockpit/lib/data-loader.js:96) |
| `loadWeeklyAnalysis(8)` | `GET weekly_analysis?order=week_start.desc&limit=8` — historique coûts | [data-loader.js:91](cockpit/lib/data-loader.js:91) |
| `buildMacro(articles, brief)` | Extrait `<h1/h2>` + `<p>` du `brief_html`, fallback top article | [data-loader.js:132](cockpit/lib/data-loader.js:132) |
| `buildStats(articles, signals)` | Calcule `articles_today`, `signals_rising`, `unread`, `streak`, `next_brief` | [data-loader.js:114](cockpit/lib/data-loader.js:114) |
| `buildTop(articles)` | Mappe 3 premiers articles en cards (rank/score/tags/source). Pré-filtre via `window.snooze` : retire les `isActive`, promeut les `dueToday` en tête | [data-loader.js:167](cockpit/lib/data-loader.js:167) |
| `snoozeCard(id, rank)` (inline) | Appelle `window.snooze.add(id, 3)` + état local `snoozedTop[rank]` qui ajoute la classe `is-snoozed` (carte grisée) | [home.jsx:213](cockpit/home.jsx:213) |
| `window.snooze.{add,remove,isActive,dueToday,cleanup}` | Helpers localStorage (clé `snoozed-articles`). `cleanup()` retire les entrées >7j passées au chargement | [cockpit/lib/snooze.js](cockpit/lib/snooze.js) |
| `buildSignals(rows)` | Dédoublonne par term (max week_start), reconstruit history[] | [data-loader.js:185](cockpit/lib/data-loader.js:185) |
| `buildRadar(rows)` | Normalise scores 0-10→0-100, calcule `delta_30d`, `next_gap` = axe le plus bas | [data-loader.js:206](cockpit/lib/data-loader.js:206) |
| `buildWeek(recent)` | Compte articles par jour Lun→Dim, streak, KPIs week | [data-loader.js:1028](cockpit/lib/data-loader.js:1028) |
| `computeStreak()` | Scan localStorage `read-articles` jusqu'à 400j en arrière | [data-loader.js:58-70](cockpit/lib/data-loader.js:58) |
| `GamesBriefCard({ releases, onNavigate })` | Composant encart Jeux : lit `data.game_releases`, annonce le total en tête, affiche les 3 premiers événements et reporte le reste dans un CTA `+N autres dans Gaming` ; retourne `null` si vide | [home.jsx:247](cockpit/home.jsx:247) |
| `cleanTitle(t)` (inline dans `GamesBriefCard`) | Repli sur `window.gamesView.stripEventLabel` : depuis ADR-40 `game_releases.title` est le nom nu, mais une ligne écrite par un client au JS périmé peut encore porter « À venir : » — le Brief et le rail Gaming doivent afficher la même chose | [home.jsx:304](cockpit/home.jsx:304) |
| `patchOrThrow(path, body)` (inline dans `GamesBriefCard`) | Vérifie `r.ok` avant de considérer l'écriture réussie — `window.sb.patchJSON` renvoie la `Response` brute et ne lève jamais sur 4xx/5xx, contrairement à `postJSON` | [home.jsx:263](cockpit/home.jsx:263) |
| `ack(r)` (inline) | `PATCH game_releases?id=eq.<id>` `{acknowledged:true}`, optimiste avec rollback si l'écriture échoue | [home.jsx:269](cockpit/home.jsx:269) |
| `unwatch(r)` (inline) | `PATCH game_franchises?id=eq.<franchise_id>` `{watched:false}` puis acquittement de l'événement, optimiste avec rollback | [home.jsx:280](cockpit/home.jsx:280) |
| `game_releases` fetch (Tier 1) | `game_releases` non acquittés, `detected_at` dans les 30 derniers jours, 5 lignes max, `.catch(() => [])` | [data-loader.js:1185](cockpit/lib/data-loader.js:1185) |

## Back — sources de données

| Table | Colonnes lues | Volumétrie |
|-------|--------------|------------|
| `articles` | `id, title, summary, source, section, tags, url, date_published, fetch_date` | 100 lignes/jour (limit) — corpus du jour ; 400 lignes/30j pour Week |
| `daily_briefs` | `date, brief_html, article_count, created_at` | 1 ligne/jour, lecture `limit=1` |
| `signal_tracking` | `term, mention_count, trend, history (JSONB), delta, category, context, week_start` | ~60 lignes/semaine |
| `skill_radar` | `axis, axis_label, score, strengths, gaps, target, history (JSONB)` | 8 axes, update manuel + par `weekly_analysis` |
| `weekly_analysis` | `week_start, tokens_used (JSONB avec cost_usd)` | 8 dernières semaines, sert uniquement au sparkline coût dans le footer |
| `user_profile` | `key, value` | ~15 paires, sert à construire `user.name` / `user.role` |
| `game_releases` | `title, event_type, event_date, franchise_id, acknowledged, detected_at` | jusqu'à 5 lignes (non acquittées, 30 derniers jours) — **7 lignes au 2026-08-13**, toutes non acquittées |

Table **non lue malgré mention dans spec.json** : `activity_briefs` — écrite par [jarvis/observers/daily_brief_generator.py:251](jarvis/observers/daily_brief_generator.py:251) mais pas consommée par la home (voir TODO).

Deux écritures partent de l'encart Jeux, chacune vérifiée sur le code HTTP de la réponse avant de considérer l'action réussie (sans ce contrôle, un refus RLS serait pris pour un succès) : `game_releases.acknowledged` passe à `true` quand un événement est marqué vu ; `game_franchises.watched` passe à `false` quand une licence n'est plus suivie, ce qui tarit ses futurs événements.

## Bandeau de santé des pipelines

Depuis le 2026-08-17, le Brief affiche **toutes** les pannes de pipeline, pas
seulement celles de son domaine. Les autres onglets gardent le filtrage par
`pipeline_health.panels`.

La raison est un cercle vicieux constaté à l'audit du 2026-08-15 : une alerte
n'atteignait que l'onglet propriétaire du pipeline en panne — c'est-à-dire
exactement l'onglet que la panne avait fait déserter. `strava_sync` et
`withings_sync` alertaient sur `perf` (0 ouverture en 30 jours), `weekly_analysis`
sur `recos` et `challenges` (0 ouverture depuis le 28 avril). L'onglet meurt
parce que la donnée est morte, et l'explication reste enfermée dans l'onglet mort.

Le Brief étant le point de passage quotidien, il porte désormais l'alerte. Le
bandeau reste non-dismissible et disparaît de lui-même quand le pipeline repart.
Canal jumeau hors cockpit : `pipeline_health` tient à jour une issue GitHub
unique (voir ADR-38).

### Forme : un relevé, pas une pile de bandeaux (2026-08-19)

Porter toutes les pannes sur le Brief a produit son propre effet de bord : six
pannes simultanées donnaient six bandeaux pleine largeur sur fond rouge, chacun
répétant la même phrase (« Ce que tu vois ici est figé »), le lien « voir le
run » passant sous le bouton flottant `.recent-toggle`. Illisible, et quand tout
est rouge plus rien ne l'est.

Le bandeau est désormais une bande unique en tête de `<main>`, calée sur la
même marge que `.ph` :

- **Titre** — compteur en accent (`N sources figées`) : c'est le seul endroit
  qui crie. Laissé court et aligné à gauche parce que `.recent-toggle`
  (`position: fixed`, top 14 / right 60) survole les ~46 premiers pixels.
- **Chapeau** — la phrase d'explication, dite une fois au lieu de N.
- **Relevé** — une ligne par pipeline, en colonnes alignées : pastille de
  statut, nom, cause en deux mots (`sync en échec` / `run à vide`), âge en
  mono à chiffres tabulaires, lien vers le run en icône. L'œil compare les
  âges verticalement au lieu de relire N phrases.

Tri par **fraîcheur croissante** : la panne la plus récente en haut, c'est la
seule encore actionnable. À âge affiché égal, la panne franche passe devant le
run à vide. La couleur suit deux axes séparés — la teinte dit la nature (rouge
`--alert` pour `failing`, ambre `--neutral` pour `stale`, comme la pastille), la
graisse dit la fraîcheur (< 7 jours). Une source morte depuis 118 jours reste
présente et grise : c'est une décision déjà prise, pas une urgence du jour.

Non-dismissibilité inchangée — aucun repli, aucun état persisté : la bande est
seulement passée de ~340 px de rouge à ~200 px de papier.

## Back — pipelines qui alimentent

- **Daily pipeline** ([main.py](main.py)) — GitHub Actions cron `0 6 * * 1-5` ([daily_digest.yml](.github/workflows/daily_digest.yml)), samedi `0 10 * * 6` (ping anti-pause uniquement) :
  - Fetch RSS → `POST articles` par batch de 50 ([main.py:797](main.py:797))
  - `generate_brief()` via Gemini 2.5 Flash-Lite → `POST daily_briefs` ([main.py:886](main.py:886))
  - Détection + comptage termes → `POST/PATCH signal_tracking` par (term, week_start) avec calcul trend ([main.py:695-769](main.py:695))
  - **Retry + fallback Gemini** : `call_gemini()` retry 4× avec backoff `[4, 12, 30, 60]s` sur erreurs transitoires (503/500/429/504/deadline) ([main.py:207](main.py:207)). Si toutes les tentatives échouent, `_fallback_brief_html()` construit un brief structuré à partir des articles RSS eux-mêmes (macro-block d'alerte + top-5 par priorité de section), garantissant que le front rend proprement au lieu d'afficher l'erreur brute.
- **Weekly pipeline** ([weekly_analysis.py](weekly_analysis.py)) — GitHub Actions dimanche 22h UTC :
  - **Lit** `skill_radar` pour calibrer les challenges/recos (pas d'écriture vers les tables du Brief)
  - Log coûts → `POST weekly_analysis` qui nourrit le footer
- **Jarvis (local)** — la boucle nocturne n'écrit pas vers les tables du Brief. `activity_briefs` (observer 18h) reste pour l'instant un silo non branché à la home.
- **Tracker jeux** ([igdb_tracker_sync.py](pipelines/igdb_tracker_sync.py), cron quotidien 08:30 UTC via [igdb-tracker-sync.yml](.github/workflows/igdb-tracker-sync.yml)) — quatre phases (seed bibliothèque Steam → IGDB, refresh des licences suivies, diff → `game_releases`, durée de jeu) ; nécessite `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET`. **En service depuis le 2026-08-13** : 78 jeux Steam seedés, 24 licences surveillées, 451 titres, 7 événements. Sans les secrets Twitch le run sortirait en `[skip]` code 0 et l'encart resterait masqué.

## Appels externes
- **Supabase REST** via `q(table, query)` dans `cockpit/lib/supabase.js` — 7 appels Tier 1 en parallèle au boot (`Promise.all`).
- **Web Speech API** native du navigateur — `window.speechSynthesis.speak(...)` pour la lecture audio ([home.jsx:28](cockpit/home.jsx:28)). Pas de clé, pas de réseau.
- **Gemini API** : appelée par le pipeline daily côté backend, jamais depuis le front.
- **localStorage** : clé `read-articles` (map `id → {ts}`), lue+écrite pour le streak et le "marqué lu". Clé `snoozed-articles` (map `id → {until, snoozedAt}`) pour le report d'article 3 jours.

## Dépendances
- **Onglets aval** (via CTA) : `top` (3 incontournables), `updates` (parcourir tous), `signals` (tous les signaux), `challenges` (gap action), `week` (ouvrir ma semaine), `gaming` (encart Jeux). Depuis le 2026-08-19 l'encart Jeux porte un CTA de navigation vers `gaming` : le titre annonce le total d'événements mais la liste s'arrête à 3, et sans ce lien les suivants n'avaient aucun chemin d'accès depuis le Brief (le compteur annonçait « 4 nouveautés » au-dessus de 3 lignes). Ses deux actions d'écriture restent inchangées. Depuis le 2026-08-13, l'encart du Brief **n'est plus le seul point de contact** du tracker jeux : l'onglet Gaming (sidebar, groupe Personnel) expose désormais son propre rail « À venir » avec les deux mêmes actions (acquitter / cesser de suivre) — cf. [tab-gaming.md](tab-gaming.md), section « Tracker jeux — lot 1 », et ADR-35 dans `docs/architecture/decisions.md` pour le lancement anticipé du lot 2.
- **Pipelines** : `daily_digest.yml` (obligatoire pour `articles` + `daily_briefs` + `signal_tracking`), `weekly_analysis.yml` (secondaire, pour les coûts du footer et la calibration radar indirecte), `igdb-tracker-sync.yml` (obligatoire pour `game_releases` — en service depuis le 2026-08-13).
- **Variables d'env / secrets** : aucune côté front. Pipeline backend requiert `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `GMAIL_*`. Le tracker jeux requiert en plus `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` — posés le 2026-08-13 à 12h35 UTC, à la fois dans GitHub Actions (pipeline) et dans les secrets Supabase (Edge Function `igdb-proxy`) ([secrets.md](../secrets.md)).

## États & edge cases
- **Loading** : Tier 1 bloque le mount React ; le screen affiche un loader provenant de la phase auth (voir `cockpit/lib/auth.js`). Pas de skeleton dédié à la Home.
- **Empty state (pas de brief aujourd'hui)** : `buildMacro` fallback avec titre "Pas encore de brief aujourd'hui" + body "Le pipeline quotidien tourne à 06:00 UTC. Reviens dans quelques heures — ou consulte l'historique." ([data-loader.js:133-141](cockpit/lib/data-loader.js:133)).
- **Empty radar** : `buildRadar` retourne `axes: []` + `next_gap.axis = "Radar à initialiser"` avec CTA "Ouvrir le radar" ([data-loader.js:212-218](cockpit/lib/data-loader.js:212)).
- **Empty signals** : `data.signals.slice(0,4)` rend 0 cards sans warning.
- **Empty week** : heatmap avec `counts = [0,0,0,0,0,0,0]`, KPIs à 0.
- **Erreur réseau Tier 1** : chaque loader est wrappé en `.catch(() => [])` ou `(() => null)` dans `Promise.all` ([data-loader.js:1138-1145](cockpit/lib/data-loader.js:1138)) → la page se monte quand même avec des tableaux vides (dégradation silencieuse).
- **Speech API non supportée** : `AudioBriefChip.speak()` no-op si `"speechSynthesis" in window === false`.
- **RLS** : toutes les tables exigent `authenticated` ; si le JWT expire, les fetches retournent 401 → fallback empty silencieux. Pas d'alerte UX actuellement.
- **Encart Jeux vide** : si `data.game_releases` est vide (aucune annonce/date/sortie/annulation non acquittée), `GamesBriefCard` retourne `null` — pas de placeholder ni de message d'attente. Ce n'est plus le cas actuel de la production : depuis le 2026-08-13, 7 événements non acquittés sont en base (cf. « Back — sources de données »), donc l'encart s'affiche.

## Limitations connues / TODO
- [ ] **`activity_briefs` non wiré à la Home** : la table existe et est remplie par `jarvis/observers/daily_brief_generator.py` mais aucun fetch côté front. À brancher si on veut un résumé activité perso sur la home.
- [ ] **Pas de skeleton dédié** pendant Tier 1 ; l'utilisateur voit d'abord le loader auth.
- [ ] **Aucune gestion d'erreur visible** côté Home — les 401/500 Tier 1 dégradent en empty state sans feedback UI.
- [ ] **`reading_time` est heuristique** (`articles.length * 1.5`, [data-loader.js:162](cockpit/lib/data-loader.js:162)) — pas une vraie estimation.
- [ ] **`cost_month` et `cost_history_7d`** sont remplis *après* le shape initial, dans un bloc `try/catch` Tier 1 optionnel ([data-loader.js:1150-1166](cockpit/lib/data-loader.js:1150)). Si le parse échoue, le footer affiche `null / 3 €`.
- [ ] **Articles "gardés"** : la carte KPI "Gardés" de la semaine affiche `total_marked = total_read` ([data-loader.js:1056](cockpit/lib/data-loader.js:1056)) — pas de distinction entre lu et bookmarké côté backend.
- [ ] **`next_brief` statique** : calcul basé uniquement sur l'heure UTC vs 06:00 ; ne reflète pas le jour férié ni le samedi (cron `1-5` uniquement, samedi `0 10 * * 6` est un ping ≠ un brief complet).
- [ ] **`signals_rising` compte "rising" + "new"** ([data-loader.js:117](cockpit/lib/data-loader.js:117)) — pas de séparation UI.
- [ ] **`<inconnu>` : seuils de score Top** — les scores 94/88/82 sont dérivés de `94 - i*6` ([data-loader.js:174](cockpit/lib/data-loader.js:174)), donc toujours les mêmes 3 valeurs selon le rang, **pas** un vrai score d'impact côté backend. À confirmer : est-ce intentionnel ou est-ce qu'un vrai score existe ailleurs ?
- [x] ~~Encart Jeux pas encore actif~~ — **résolu le 2026-08-13** : secrets `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` posés à 12h35 UTC, `igdb_tracker_sync` a tourné avec succès (451 titres, 86 rattachés Steam, 24 licences, 7 événements en attente), l'encart s'affiche en production. La sonde de survie évoquée ici **n'a pas gouverné la suite** : l'utilisateur a demandé le lot 2 le jour même, sans attendre son échéance de trois semaines — cf. ADR-35 dans `docs/architecture/decisions.md`, qui documente pourquoi (l'encart n'a pas suffi à rendre le tracker perceptible) et ce que ça change (`games_status_set` porte désormais la sonde de survie, sur l'onglet Gaming).
- [ ] **`MdtBriefCard` non documenté par cette spec** : l'encart sorties médiathèque se monte au même endroit que l'encart Jeux (voir Front — structure UI) mais n'a jamais été décrit ici — écart antérieur à cette mise à jour, non corrigé (hors périmètre de ce lot).

## Dernière MAJ
2026-08-21 — **le hero date explicitement le brief quand il n'est pas celui du jour.** `loadDailyBrief()` n'avait aucun filtre de fraîcheur : elle prenait la dernière ligne de `daily_briefs` quel que soit son âge, si bien que du 18 au 21 août le Brief a affiché celui du 17 sous la date du jour, sans rien signaler — le bandeau de santé savait, le hero l'ignorait. La ligne complète (`date`, `article_count`, `created_at`) remonte désormais jusqu'au rendu, et un écart non nul produit une dateline (« Brief du lundi 17 août »). Même correction pour les formulations au présent non sourcées : les mentions de signaux dérivent de `week_start` au lieu d'un « cette semaine » codé en dur, et l'annonce du prochain brief tient compte de l'état du pipeline au lieu de promettre « demain 06:00 » alors qu'il est en panne depuis quatre jours. Cf. ADR-44 et ADR-45.

2026-08-13 (addendum, correction de dérive) — quatre affirmations de cette spec, exactes au moment où elles ont été écrites (secrets Twitch pas encore posés), ne l'étaient plus quelques heures plus tard le même jour : l'encart Jeux décrit comme vide/inactif, les secrets Twitch décrits comme non posés, l'encart décrit comme seul point de contact du tracker, et la sonde de survie du lot 1 décrite comme gouvernant encore le lancement du lot 2. Corrigées en « Parcours », « Fonctionnalités » (implicite via États & edge cases), « Dépendances », « États & edge cases » et le TODO correspondant (rouvert puis re-fermé avec l'état réel). Raison : secrets posés le jour même à 12h35 UTC, pipeline exécuté avec succès (451 titres, 86 rattachés Steam, 24 licences, 7 événements en attente), et le lot 2 lancé sans attendre l'échéance de la sonde — cf. ADR-35 dans `docs/architecture/decisions.md`.
2026-08-13 — encart Jeux vidéo (`GamesBriefCard`) ajouté au-dessus du hero, dans les deux vues (Morning Card et Brief complet) : jusqu'à 3 événements de licences suivies (annoncé / daté / sorti / annulé), fenêtre de 30 jours (contre 7 pour la Médiathèque — une annonce de jeu reste pertinente plus longtemps qu'une sortie d'épisode). Deux actions écrivent en base de façon optimiste avec rollback en cas d'échec : acquitter l'événement, ou cesser de suivre la licence (ce qui tarit ses futurs événements). Écritures protégées par un contrôle explicite du code HTTP (`window.sb.patchJSON` ne lève jamais sur 4xx/5xx). Alimenté par le pipeline `igdb_tracker_sync` (cron quotidien 08:30 UTC) — au moment de la rédaction de cette entrée, pas encore en service (secrets Twitch non posés, `game_releases` vide, encart invisible en production). **Mise à jour le même jour** (cf. addendum ci-dessus) : secrets posés à 12h35 UTC, pipeline exécuté avec succès, l'encart s'affiche désormais en production, et le lot 2 a été lancé sans attendre l'issue de la sonde de survie décrite plus haut (Limitations connues / TODO) — cf. ADR-35. Documentation ajoutée en rattrapage — la fonctionnalité (deux actions écrivantes, trois événements de télémétrie) avait été livrée sans mise à jour de spec, en violation de la règle cardinale du projet. Voir aussi [tab-gaming.md](tab-gaming.md), section « Tracker jeux — lot 1 ».

2026-07-26 — le Top du jour affiché ici devient une sélection motivée et votable. Le score de pertinence affiché à côté de chaque carte valait `94 - i * 6` (rang dans la liste, rien d'autre) et a été retiré ; le motif de sélection le remplace. Vote 👍/👎 → `article_feedback` → recalibrage de `user_profile.veille_pref_rules` par `pipelines/veille_picks.py`.

2026-04-30 — toggle compact/plein du hero : pastille discrète en haut à droite du hero, persistante via `localStorage.cockpit-hero-compact`. État compact divise padding et font-size titre/body par ~1.6 (titre passe de clamp(32-54px) à clamp(20-28px), padding outer de 44/32/40px à 20/28/18px). Telemetry : `hero_compact_toggled` `{state}`.
2026-04-30 — sidebar pied de page : état zero du streak — quand le compteur de veille consécutive vaut 0, le « 0 j » est remplacé par un message d'encouragement en italique « Premier jour. Lis 1 article pour démarrer. » (couleur tertiaire, pas d'uppercase, pas de "prochain 06:00"). Dès qu'un article est lu, le compteur reprend sa forme normale.
2026-04-26 — chaque top-card affiche un tag "X min" (temps de lecture estimé à 230 mots/minute) dans la ligne meta, en mono compact `--bg2`/`--tx2`. Tag automatiquement masqué quand la card passe en collapse (parent `.top-meta` en display:none).
2026-04-26 — top-cards lues passent en collapse animé (~56 px au lieu de la pleine carte) avec pastille "✓ Lu" en accent positif et titre tronqué une ligne. Clic-droit / appui long pour repasser en non-lu. Telemetry : `top_card_collapsed`.
2026-04-26 — état "zéro positif" : quand tout est lu/snoozé et que le compteur global d'articles à traiter retombe à zéro, le bloc Top 3 laisse place à un message "Tu as fait le tour. Bravo." + deux idées du carnet en incubation/maturation (les plus anciennes en haut) cliquables vers le Carnet d'idées. Telemetry : `zero_state_shown`.
2026-04-26 — filtre "Récent · 24h" auto-activé en visite récurrente (30 min < dernière visite < 18 h) ; respecte un click toggle explicite des dernières 60 min. Microcopy "Mode récent · seuls les articles < 24h sont visibles. [Voir tout]" sous le hero quand le filtre est actif sans bascule en mode delta. Telemetry : `recent_filter_auto_on`.
2026-04-26 — hero en mode "delta" pour la visite récurrente : si la dernière visite remonte à moins de 18 h et qu'au moins un nouvel article est tombé depuis, le titre macro statique laisse place à "X nouveautés depuis Yh" + liste des premiers articles non vus (max 4 + "+ N plus") + bouton "Lire les X nouveautés". La synthèse éditoriale complète reste accessible derrière un repli "Voir le brief macro complet". Telemetry : `hero_delta_shown`.
2026-04-26 — filtre global "Récent · 24h" en haut à droite du cockpit : masque via CSS les `.top-card` et `.sig-card` qui n'ont pas `data-recent="1"`. Marqueur posé sur top-cards `<24h` (calcul `Date.now()-fetch_iso`) et sig-cards de trend `new`. État persisté en `localStorage.filter-recent-only` + reflété sur `:root[data-filter-recent]`.
2026-04-26 — bouton "Reporter" (horloge) sur chaque top-card : reporte l'article 3 jours, puis réémergence automatique en tête du top le jour J. Stockage local, cleanup auto au-delà de 7j.
2026-04-26 — sur-titre du hero passe en "Depuis ta dernière visite — Xh + N nouveaux articles" quand la dernière visite remonte à plus de 30 minutes ; fallback "Synthèse du matin" inchangé pour la première visite ou les rebonds courts.
2026-04-26 — bouton "Tout marquer lu" : ajout d'un toast d'annulation de 6 s en bas d'écran, l'action redevient réversible le temps de la fenêtre.
2026-04-26 — boutons d'action des cartes (Garder, Demander à Jarvis) visibles en permanence à 55 % d'opacité (100 % au survol et en tactile), avec une cible tactile bumpée à 36×36 desktop / 44×44 mobile.
2026-04-25 — Morning Card : nouvelle vue "3 choses aujourd'hui" (article + signal qui monte + prochain gap), toggle persistant Morning Card/Brief complet en haut de la home.
2026-04-24 — hero stats : 4 KPI remplacés par un seul chiffre dominant "À traiter depuis hier" + bouton "Commencer la revue" + métadonnée prochain brief. Streak retiré du hero (reste en sidebar et bilan semaine).
2026-04-24 — top-cards : bouton "Marquer lu" supprimé (redondant avec le clic carte), bouton "Garder" devient pictogramme visible au survol uniquement.
2026-04-24 — réécriture Parcours utilisateur en vocabulaire produit (retrait Tier 1, bootTier1, paths code, localStorage technique).
2026-04-24 — réécriture Fonctionnalités en vocabulaire produit (retrait chemins code, props, formules, colonnes DB).
2026-04-24 — retry Gemini 4× + fallback HTML construit depuis les articles si toutes les tentatives échouent (plus de brief affichant l'erreur 503 brute dans le hero).
2026-04-23 — d752b79
