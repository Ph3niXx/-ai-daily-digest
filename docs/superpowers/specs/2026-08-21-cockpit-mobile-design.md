# Cockpit — portage iPhone (PWA sur l'écran d'accueil)

Spec de conception. Rendre les 31 onglets du cockpit utilisables sur un iPhone, sous forme
d'application installée sur l'écran d'accueil, sans nouvelle page d'entrée, sans build step
et sans toucher au rendu desktop.

## Problème

Le cockpit est un outil de bureau. Il tourne sur la machine où l'on est assis, alors qu'une
partie de ce qu'il porte — le brief du matin, une offre à traiter, une question à Jarvis, une
idée à noter — arrive quand on ne l'est pas.

Le portage n'est pas bloqué par l'infrastructure. Le 2026-08-21, un test sur l'appareil a
établi que le cockpit complet s'ouvre et se navigue dans Safari sur iPhone, que la
Médiathèque installée sur l'écran d'accueil démarre, s'authentifie et s'affiche, et donc
que **l'OAuth Google survit au mode `standalone` sur iOS**. Il n'y a rien à construire pour
avoir l'application : `manifest.json` existe (`start_url: "./"`, `display: standalone`), le
service worker s'enregistre depuis qu'ADR-30 a corrigé le préfixe `/jarvis-cockpit/`.

Ce qui bloque est ailleurs, et l'utilisateur l'a nommé en une phrase après avoir ouvert
l'onglet Musique sur son téléphone : *« il y a trop à défiler verticalement »*.

Le code confirme, et le mécanisme mérite d'être énoncé parce qu'il gouverne tout le reste.
`cockpit/panel-musique.jsx` empile sept sections (Découvertes 30 j, Top artists, Top tracks,
Top albums, Rythme d'écoute, Genres, 2026 year-to-date). `cockpit/styles-musique.css`
contient sept `@media`, **tous au même palier `max-width: 920px`**, et tous font la même
chose : ramener une grille multi-colonnes à `1fr`. Dans `cockpit/styles-mobile.css`, deux
règles seulement concernent ce panel, toutes deux sur `.mz-kpis` — quatre colonnes vers deux
à 760 px, vers une à 380 px.

**Toutes les règles responsive existantes de cet onglet allongent la page.** Aucune ne
priorise, ne replie ni ne tronque. C'est un responsive de tablette — parfaitement correct à
900 px, où passer en colonne unique est la bonne réponse — appliqué tel quel à un écran de
390 px, où il transforme sept sections côte à côte en un ruban vertical de sept sections bout
à bout. Le scroll infini n'est pas un oubli du responsive : c'en est le résultat logique.

La conséquence dirige la spec : **ajouter des `@media` ne réglera rien**. Le problème n'est
pas la largeur, c'est qu'aucun panel ne sait ce qui, en lui, mérite le premier écran d'un
téléphone.

L'en-tête de `cockpit/styles-mobile.css` dit d'ailleurs l'ampleur : sur 31 onglets, **deux
seulement ont été réellement audités sous 760 px** — Médiathèque (ADR-30) et Jobs Radar
(ADR-39). Les 29 autres se replient au mieux vers 900-920 px, une largeur de tablette.

## Ce qui a été mesuré

**Le test sur appareil du 2026-08-21.** Médiathèque dans Safari : fonctionne. Médiathèque
lancée depuis l'icône de l'écran d'accueil, Safari fermé : fonctionne. Cockpit complet dans
Safari : s'affiche et se navigue. Aucun mur d'authentification, aucun mur de démarrage
signalé — seule la mise en page a été remontée.

Ce constat **répond à la Task 0 du plan `2026-07-27-mediatheque-pwa-ios.md`**, marquée
« bloquante » et dont le résultat n'avait jamais été consigné : la section « Risques et
replis » de la spec du 2026-07-27 porte toujours la mention « à tester en premier ». Elle
doit être mise à jour avec ce constat daté.

**L'usage réel, classé par jours distincts d'ouverture** (`usage_events.section_opened`,
depuis le 2026-06-01). Le critère est le nombre de jours différents comportant au moins une
ouverture, pas le nombre d'ouvertures : une journée d'exploration à douze ouvertures ne dit
rien d'une habitude, vingt-cinq jours différents si.

| Onglet | Jours distincts | Onglet | Jours distincts |
|---|---|---|---|
| Médiathèque | 25 | Carnet d'idées | 5 |
| Jobs Radar | 24 | Jarvis · Stacks · Musique | 4 |
| Brief du jour | 17 | Opportunités · Top · Revue · Veille outils | 3 |
| Gaming | 10 | Challenges · Signaux · Anime · Historique · Recherche · Sport · Ma semaine | 2 |
| Veille IA | 9 | Forme · Santé · Profil · Gaming news · Wiki | 1 |
| Claude | 8 | Radar compétences · Recommandations · Actualités | 0 |
| Miroir du soir | 7 | | |
| Jarvis Lab | 6 | | |

**Le nombre de jours distincts ne suffit pas : la récence le corrige.** Un onglet peut avoir
accumulé ses jours tôt puis avoir été abandonné. Au 2026-08-21, la coupure est nette. Ouverts
en août : Médiathèque, Brief, Miroir du soir, Jarvis, Jarvis Lab, Stacks, Gaming, Santé,
Revue, Musique, Challenges, Jobs Radar. **Plus rien depuis le 2026-07-27** pour Veille IA,
Claude, Carnet d'idées, Opportunités, Top du jour, Veille outils et Recherche ; depuis le
2026-07-22 pour Anime, Historique et Gaming news ; depuis le 2026-07-05 pour Forme et Profil.

C'est ce second critère qui explique deux placements que le seul classement rendrait
incohérents. **Veille IA (9 jours) et Claude (8 jours) partent en vague 3** malgré leur rang :
ils n'ont pas été ouverts depuis vingt-cinq jours, et ils se factorisent avec les dix autres
panels de listes d'articles. **Carnet d'idées part en vague 2** alors qu'il est logé à la même
enseigne : c'est une exception assumée, fondée sur une hypothèse et non sur une mesure —
un onglet de saisie a plus de chances de trouver son usage sur téléphone que sur un poste de
bureau. Si la vague 2 le dément, l'hypothèse tombe et il redescend.

Réserve sur cette mesure : elle couvre 83 jours dont **5 seulement sans biais**. Avant le
2026-08-17, `section_opened` n'était émis que depuis `handleNavigate`, ce qui sous-compte
structurellement l'écran d'atterrissage et la PWA. Le classement reste valide pour ordonner
des onglets atteints par la navigation ; il sous-estime le Brief.

**L'état des pipelines** (`pipeline_health`, relevé du 2026-08-21) :

| Pipeline | Panels alimentés | État |
|---|---|---|
| `daily_digest` | brief, updates, top | `failing` — 4 échecs d'affilée, dernier succès le 2026-08-17. Quota Gemini suspecté. |
| `veille_picks` | brief, top | `stale` — `daily_picks` vide depuis 98 h (conséquence du précédent) |
| `weekly_analysis` | recos, challenges, opps, signals | `stale` depuis 946 h (39 j) — crédit Anthropic |
| `strava_sync`, `withings_sync` | perf | `failing`, 15 échecs, **aucun succès jamais enregistré** |
| `tft_sync` | gaming | `failing`, données figées au 2026-04-23 |
| `lastfm_sync` | music | `status: ok` **alors que la dernière donnée date du 2026-08-04** (406 h) |

La dernière ligne est un défaut du monitoring, pas du pipeline : `max_age_hours` vaut `NULL`
pour `lastfm_sync`, donc aucun contrôle de fraîcheur ne s'applique et le pipeline s'affiche
au vert quel que soit l'âge de ses données. Constat à traiter hors de ce programme (voir
« Questions ouvertes »).

**Une limite d'observabilité, découverte en cherchant pourquoi la PWA Médiathèque semblait
morte.** La table `usage_events` n'accepte les `INSERT` que du rôle `authenticated` :

```
usage_events · INSERT · roles={authenticated} · with_check=true
```

Un démarrage qui meurt avant l'authentification ne produit donc **aucune trace**. « Surface
non utilisée » et « surface cassée » rendent exactement le même silence. La sonde
`surface: "pwa"` d'ADR-30, à laquelle la décision de poursuivre avait été confiée, était
structurellement incapable de répondre à sa propre question. Ce défaut de conception
gouverne la section « Vérification ».

## Objectif

Les 31 onglets utilisables sur un écran de 390 px, atteints par vagues ordonnées par l'usage
mesuré, sans régression desktop et sans dette de maintenance nouvelle.

Utilisable signifie : le premier écran d'un onglet porte ce qui justifie de l'avoir ouvert,
et le reste est atteignable sans défiler à travers ce dont on n'avait pas besoin.

## Principe directeur

**Un seul rendu, une hiérarchie déclarée.** Le portage n'écrit pas de second rendu mobile et
ne duplique aucun panel. Il ajoute à chaque panel une information qui lui manque aujourd'hui :
l'ordre d'importance de ses sections. Le mobile consomme cette hiérarchie pour replier ; le
desktop l'ignore et rend exactement ce qu'il rendait.

Corollaire : le coût par panel est une décision éditoriale — quelles sections sont la tête,
que dit chaque section repliée — et non une réécriture. C'est ce qui rend 29 onglets
tractables.

## Architecture

### La surface

`index.html` lui-même, installé sur l'écran d'accueil. **Pas de nouvelle page d'entrée.**

La page dédiée à la manière de `mediatheque.html` est écartée. Sa seule justification était
le ratio mesuré par ADR-30 — 859 ko de JSX transpilés par Babel standalone contre 71 ko pour
la page dédiée, soit 12 pour 1 sur le coût dominant du démarrage à froid. Cet argument tombe
ici pour deux raisons : le test sur appareil n'a pas fait ressortir la lenteur, et le
périmètre visé est le cockpit complet, dont une page dédiée ne pourrait pas exclure les
autres panels — c'est précisément d'où venait le gain. Il ne resterait que le coût :
la divergence entre deux entrées, qu'ADR-30 documente déjà comme sa principale conséquence.

`mediatheque.html` **est conservée**. Son démarrage à froid douze fois plus rapide garde une
valeur propre pour l'usage canapé, et la retirer maintenant supprimerait une surface avant
de savoir si le cockpit mobile prend.

### `cockpit/components-mobile.jsx`

Un fichier nouveau, exposant `window.PanelSection` et `window.useIsMobile`. Il porte toute la
mécanique ; les panels n'écrivent aucune logique.

**Sur desktop, `PanelSection` est un passe-plat exact.** Il rend le même `<h2>`, avec la même
classe, suivi du même contenu :

```jsx
// Aujourd'hui — panel-musique.jsx:322
<h2 className="mz-section-title">Top artists · <em>30 jours</em></h2>
{contenu}

// Après
<PanelSection title="Top artists" sub="30 jours" titleClass="mz-section-title">
  {contenu}
</PanelSection>
```

Le DOM produit au-dessus de 760 px est identique. C'est ce qui rend la contrainte « zéro
régression desktop » vérifiable par lecture plutôt qu'espérée.

**Sur mobile, il devient un `<details>` natif.** Pas d'état React, pas de `useState`, pas de
persistance : l'élément HTML fait le travail, avec l'accessibilité et le clavier acquis, et
iOS Safari le gère nativement.

```
▾ Découvertes · 30 derniers jours          ← tête : rendue nue, sans chrome, toujours visible
▸ Top artists · 10 artistes, 2 nouveaux    ← repliée par défaut
```

**Le `hint` décide si le mécanisme fonctionne.** Une section repliée doit rester
informative : « Top artists » seul est une boîte noire qu'on n'ouvrira jamais ; « Top
artists · 10 artistes, 2 nouveaux » dit s'il vaut la peine de déplier. Sans lui, le repli
déplace le problème d'un scroll vers un clic.

**Ce que chaque panel déclare**, et c'est tout son travail de portage : quelles sections sont
la tête, dans quel ordre viennent les autres, quel `hint` chacune affiche.

**Coût d'intégration imposé par le repo**, à compter d'avance : le script doit être déclaré
dans `index.html` **et** dans `mediatheque.html` dès qu'un panel commun l'utilise — invariant
verrouillé par `tests/test_mediatheque_entry.mjs` ; puis `node scripts/sync-sw.mjs` ; puis une
entrée dans `docs/architecture/repo-structure.md`. Un bloc `.ps-*` arrive dans
`cockpit/styles-mobile.css`, avec des cibles tactiles à 44 px minimum.

### Ce qui n'est pas touché

Le rendu desktop, à aucune largeur au-dessus de 760 px. Les données, les pipelines, les
requêtes Tier 1 et Tier 2, l'authentification, le service worker au-delà de la resynchro
mécanique, le langage visuel, la palette, les composants desktop existants. Le tiroir de
navigation mobile (`.sb-mobile-trigger`) reste en l'état.

## Le découpage en vagues

Règle qui structure l'ordre : **on ne porte pas un onglet dont le pipeline est mort.**
Adapter la mise en page de Musique aujourd'hui reviendrait à soigner l'affichage de scrobbles
vieux de dix-sept jours.

| Vague | Onglets | Justification |
|---|---|---|
| **déjà fait** | Médiathèque · Jobs Radar | Seuls panels audités mobile (ADR-30, ADR-39). Zéro travail : l'écran d'accueil est utile dès le premier jour. |
| **0 · prérequis** | *(aucun onglet)* | Réparer `daily_digest`. Sans lui la vague 1 livre un Brief vide et le portage est invérifiable. |
| **1 · socle quotidien** | Brief du jour · Miroir du soir · Jarvis | 17, 7 et 4 jours distincts, tous vivants. Jarvis est le seul onglet de saisie du haut de classement : il dira si le clavier mobile tient. |
| **2 · vivant secondaire** | Gaming · Jarvis Lab · Stacks & Limits · Santé · Carnet d'idées | Données à jour. Idées est le second onglet de saisie. |
| **3 · la veille en bloc** | Veille IA · Claude · Veille outils · Sport · Gaming news · Anime/Ciné/Séries · Actualités · Historique · Top du jour · Recherche · Ma semaine · Revue du jour | Douze onglets mais le lot le moins cher par unité : listes d'articles aux structures très proches, le repli s'y factorise. |
| **4 · suspendue** | Musique · Forme · Recommandations · Challenges · Opportunités · Signaux faibles | Bloquée tant que le pipeline correspondant est mort. |
| **5 · la queue** | Radar compétences · Wiki IA · Mon profil | Données vivantes, zéro ouverture depuis juin. En dernier, sans se raconter d'histoire sur leur urgence. |

Total : 2 + 3 + 5 + 12 + 6 + 3 = 31 onglets, périmètre exhaustif.

La vague 0 dépend probablement de l'utilisateur : si `daily_digest` est bien un dépassement
de quota Gemini, la réparation passe par `aistudio.google.com`.

## Ce qui reste hors périmètre

Chaque exclusion porte la condition qui la rouvre.

| Écarté | Pourquoi | Ce qui le rouvre |
|---|---|---|
| Build step CI (précompilation JSX) | Le test sur appareil n'a pas fait ressortir la lenteur. Renverser le principe fondateur du projet avant d'avoir le problème qu'il résout. | Un démarrage à froid mesuré et gênant, après les vagues 1-2. |
| Application native, wrapper Capacitor, compte Apple Developer | Le seul motif défendable — un OAuth incompatible avec `standalone` — a été réfuté par le test. Restent 99 €/an, un runner macOS (poste sous Windows) et un axe de maintenance entier. | Un besoin réel de widget iOS, Siri, HealthKit ou background fetch. |
| Notifications Web Push | Supportées par iOS 16.4+ pour une PWA installée, donc à portée. Mais une notification est une raison d'ouvrir : la poser avant de savoir si l'app s'ouvre répond à une question qu'on ne s'est pas encore posée. | La fin de la vague 2, si l'usage décolle. Premier levier naturel ensuite. |
| Fonctionnement hors ligne réel | Le service worker précache le statique ; les données viennent de Supabase en direct. Mettre en cache les réponses REST est un sous-système à part, avec ses questions de péremption. | Un usage sans réseau constaté. |
| Toute refonte visuelle | Le portage adapte une mise en page, il n'introduit pas de langage graphique. | Rien dans ce programme. |
| Persistance de l'état des replis | Les sections repartent fermées à chaque visite. Retenir l'état par onglet et par appareil, c'est du stockage et de la péremption pour un confort supposé. | Le constat que les mêmes sections sont rouvertes systématiquement. |
| Onglets internes (navigation à sections) | Gardés en réserve, non appliqués par défaut. | Un panel où six replis restent pires qu'un scroll. Musique est le candidat le plus probable. |
| Réparation des autres pipelines | Seul `daily_digest` entre comme prérequis. Last.fm, Strava, Withings, TFT et le crédit Anthropic forment un chantier distinct. | Ils conditionnent la vague 4 : à traiter comme un lot propre, non dilué dans le portage. |

## Risques et replis

**Le repli n'est pas rouvert.** Risque principal du mécanisme : une section fermée par défaut
est une section qu'on cesse de consulter. Le `hint` est la mitigation prévue — une section
repliée doit annoncer ce qu'elle contient. Repli si le risque se matérialise : basculer les
panels concernés vers la navigation à onglets internes, gardée en réserve.

**La tête de panel est mal choisie.** Le choix de ce qui reste visible est éditorial, donc
faillible, et il est fait par déduction plutôt que par mesure. Mitigation : commencer par
trois onglets seulement (vague 1) et corriger sur usage réel avant d'appliquer le schéma aux
vingt-six restants.

**Le desktop régresse sans qu'on le voie.** Le repo n'a ni `package.json` ni `node_modules`,
donc React n'est pas disponible sous Node et aucun test de snapshot DOM n'est possible sans
introduire des dépendances. Mitigation : la branche desktop est un passe-plat par
construction, et la vérification se fait en production selon la doctrine du projet.

**Le programme continue par inertie alors que l'app n'est pas ouverte.** C'est le risque que
le précédent de la PWA Médiathèque rend concret. Mitigation : le critère d'arrêt ci-dessous,
fixé avant le début des travaux.

## Vérification

**Non-régression desktop.** Test d'invariant sur le modèle de `tests/test_mediatheque_entry.mjs`
assurant que `components-mobile.jsx` est déclaré dans les deux entrées HTML ;
`node scripts/sync-sw.mjs` puis `tests/test_sw_static.mjs` ; avant/après en production sur
les panels touchés, à largeur de bureau.

**Lisibilité des pannes sur l'appareil.** Le loader gagne un délai de garde : **passé
8 secondes** sans authentification résolue, il remplace « Chargement… » par l'étape qui a
bloqué (scripts manquants, `waitForAuth` non résolu, Tier 1 en erreur, panel jamais
enregistré). Le seuil est volontairement large : il doit distinguer une panne d'un simple
démarrage lent sur réseau mobile, pas alarmer au moindre délai. C'est
le correctif réel de l'angle mort d'observabilité — un démarrage avorté ne peut pas écrire en
base, mais il peut s'afficher. C'est ce qui manquait le 2026-08-05.

**Mesure d'usage.** Un champ `viewport` (`mobile` / `desktop`, dérivé de `matchMedia` au
moment de l'émission) s'ajoute à `section_opened`, documenté dans `docs/telemetry.md` avant
le commit. Ce n'est pas une sonde binaire de survie mais une mesure continue : elle dira
quels onglets sont ouverts depuis le téléphone, et alimentera le classement des vagues 3 à 5
avec des données mobiles plutôt que des données de bureau.

Honnêteté sur sa limite : ce champ hérite du même angle mort que son prédécesseur. Il ne
verra jamais un démarrage avorté. C'est pourquoi le délai de garde du loader compte
davantage que lui.

**Critère d'arrêt, fixé maintenant.** Trois semaines après la livraison de la vague 1 —
`daily_digest` réparé, faute de quoi la mesure ne veut rien dire — on relève le nombre de
jours distincts comportant au moins une ouverture en `viewport: mobile`.

> **Seuil : au moins 5 jours distincts sur 3 semaines. En dessous, la vague 3 ne démarre pas.**

Ce cliquet existe pour empêcher ce programme de devenir une surface produite sans être
consommée. Si le cockpit mobile ne prend pas, la décision juste sera d'arrêter à la vague 2,
et elle doit être écrite avant qu'on soit attaché au travail déjà fait.

## Décisions à porter en ADR

1. **Le portage du cockpit est une adaptation de `index.html`, pas une seconde entrée** —
   renverse le choix d'ADR-30 pour ce périmètre, en expliquant pourquoi le ratio 12:1 ne
   s'applique pas au cockpit complet.
2. **Une sonde qui ne peut pas distinguer « inutilisé » de « cassé » n'est pas une sonde** —
   généralise le constat sur `usage_events` restreint à `authenticated`, et pose la règle :
   toute décision confiée à une mesure exige d'abord de vérifier que la mesure peut voir
   l'échec qu'elle est censée détecter.

## Ordre de travail

1. Consigner dans `docs/superpowers/specs/2026-07-27-mediatheque-pwa-ios-design.md` le
   résultat daté de la Task 0 (l'OAuth survit à `standalone`), en remplacement de la mention
   « à tester en premier ».
2. Vague 0 — réparer `daily_digest`.
3. `cockpit/components-mobile.jsx` + bloc `.ps-*` dans `styles-mobile.css` + intégration
   (deux entrées HTML, `sync-sw.mjs`, `repo-structure.md`, test d'invariant).
4. Délai de garde du loader ; champ `viewport` sur `section_opened` + `docs/telemetry.md`.
5. Vague 1 — Brief du jour, Miroir du soir, Jarvis. MAJ des `docs/specs/tab-*.md`
   correspondants et bump `last_updated` dans `docs/specs/index.json`.
6. Trois semaines de mesure. Relevé du critère d'arrêt.
7. Vagues suivantes selon le verdict.

Corriger au passage `CLAUDE.md`, qui annonce 30 onglets là où `cockpit/nav.js` en déclare 31
(Santé, ajouté le 2026-08-20).

## Questions ouvertes

**`max_age_hours` à `NULL` dans `pipeline_health`.** `lastfm_sync` s'affiche `ok` avec des
données vieilles de 406 heures parce qu'aucun seuil de fraîcheur ne lui est attaché. Ce n'est
probablement pas le seul pipeline dans ce cas. Hors périmètre de ce programme, mais à ne pas
perdre : à traiter comme un lot propre.

**Sort de `mediatheque.html` à terme.** Conservée par décision explicite. Si le cockpit
mobile est adopté, la question de la retirer se reposera — deux icônes, deux manifests et un
test d'invariant pour la même donnée.
