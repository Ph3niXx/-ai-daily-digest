# Médiathèque

> Bibliothèque anime personnelle : recherche, suivi de progression par saison, alerte sur les nouvelles sorties.

## Scope
perso

## Finalité fonctionnelle
Suivre tous les animes vus / à voir au même endroit : retrouver un anime avec ses saisons et leurs dates, déclarer sa progression épisode par épisode, et être prévenu dès qu'une nouvelle saison d'un anime suivi est annoncée ou commence à être diffusée — sans dépendre d'un site tiers. Première brique d'une médiathèque élargie (mangas, livres, films, séries).

## Parcours utilisateur
1. Clic sidebar « Médiathèque » — l'écran s'ouvre sur ce qui est actif : sorties non acquittées, hero, rail « Continuer à regarder » et agenda des 7 prochains jours. La collection complète reste repliée en bas.
2. Tape le nom d'un anime dans le champ de recherche — sa bibliothèque est filtrée dès le 1er caractère ; une bascule « Ma bibliothèque · N | AniList · M » permet de passer aux résultats distants et de revenir sans perdre la recherche.
3. Clic sur un résultat — la fiche franchise se construit : saisons numérotées et datées, films canon, bonus, prochaines sorties.
4. Clic « Ajouter à ma bibliothèque » — la franchise rejoint « Ma collection » avec le statut « À voir ». Elle n'apparaît pas dans le rail (réservé à ce qui est entamé) ; on la retrouve en dépliant la collection ou via son chip « À voir ». Elle peut en revanche être mise en avant par le hero, qui bascule sur « À découvrir » quand rien n'est en cours.
5. Ouvre une fiche de sa bibliothèque et déclare sa progression saison par saison (+1, saisie directe, « ✓ vue ») — le statut global (À voir / En cours / En cours · à jour / Vu) se met à jour tout seul.
6. Le lendemain d'une annonce de nouvelle saison, lit l'encart Médiathèque du Brief du jour, ouvre l'onglet et acquitte l'événement d'un ✓.

## Fonctionnalités
- **Recherche en direct** : un seul champ, bibliothèque d'abord. Dès 1 caractère il filtre la bibliothèque (titres anglais/romaji/japonais, insensible à la casse et aux accents, mises de côté comprises) ; à partir de 3 caractères il interroge aussi AniList (format, année, genres, score ; les fiches déjà en bibliothèque sont signalées). La bascule segmentée « Ma bibliothèque · N | AniList · M » atterrit sur la bibliothèque dès qu'il y a une correspondance locale.
- **Fiche franchise** : toutes les saisons regroupées et numérotées avec dates et nombre d'épisodes, films canon à leur place chronologique, OVA/bonus à part ; prochaine diffusion datée pour les saisons en cours.
- **Bibliothèque** : hero cinématique mettant en avant le titre le plus pertinent, puis trois rayons — rail « Continuer à regarder » (cartes bannière 16:9 de largeur fixe avec `+1 épisode` visible sans survol, la franchise du hero exclue), agenda des 7 prochains jours de diffusion, et « Ma collection » repliée (grille dense de posters, chips de statut, tri). Au filtre par défaut la collection contient **toutes les franchises actives** ; les mises de côté se retrouvent via leur chip dédié ou par la recherche. Son état plié/déplié est mémorisé (forcé ouvert tant que la bibliothèque est vide).
- **Statut manuel « mis de côté »** : ranger une franchise qu'on ne suit plus (bouton dans la fiche). Elle sort des buckets actifs (À voir / En cours / Vu / « Tous ») et n'apparaît que sous son chip dédié « Mis de côté » ; progression et notes conservées, réactivable à tout moment.
- **Progression par saison** : compteur « vu jusqu'à l'épisode N », plafonné aux épisodes réellement sortis ; pour une saison en cours de diffusion, le compteur affiche les épisodes sortis à date (et le total prévu s'il est connu) plutôt qu'un total inconnu ; le statut de la franchise en découle automatiquement.
- **Note par saison** : chaque saison/film/bonus est notable sur 0–100 (échelle AniList) via une pastille inline dans la fiche ; champ vidé = note retirée. Stockée sur `media_progress` (user-owned).
- **Agenda « Cette semaine »** : une ligne par jour qui diffuse — chiffre du jour en gros à gauche (repère de balayage), repère relatif quand il existe (« aujourd'hui », « demain ») plutôt que le seul « dim. 26 », et chaque sortie sous forme de carte jaquette + titre sur 2 lignes + `ép. N · heure`. Les jours sans diffusion ne prennent pas de place : ils sont repliés en une ligne unique en pied de section (« … — rien de prévu »), aujourd'hui coloré s'il en fait partie. Compteur des sorties de la semaine dans l'en-tête.
- **Sorties** : bandeau des événements détectés (nouvelle saison, diffusion commencée, date annoncée) avec acquittement, agenda des 7 prochains jours doublé d'une ligne « plus tard » — diffusions au-delà de J+6, premières annoncées jusqu'à J+90, saisons de la chaîne principale en diffusion sans date connue *ou dont la date remontée est périmée* (le sync n'a lieu qu'une fois par jour : entre la diffusion d'un épisode et le sync du lendemain, la date stockée est dans le passé) —, et encart dans le Brief du jour.

## Front — structure UI
`cockpit/panel-mediatheque.jsx` (`window.PanelMediatheque`) : toolbar (`.mdt-search`), bascule segmentée `.mdt-viewtoggle` (état `view` = `library`/`search`), bandeau `<MdtReleasesStrip>` (événements non acquittés), hero `<MdtHero>` (`pickHero`), rail `<MdtRail>`, agenda `<MdtWeek>` (`.mdt-agenda`), section repliable `<MdtCollection>` (grille `.mdt-grid` de `<MdtCard>`, poster + méta seulement — la progression se déclare dans la fiche), modale `<FicheFranchise>`, stepper `<MdtStepper>`. Toute la logique de présentation pure (statuts dérivés, libellés, choix du hero, recherche locale, rail, semainier) vit dans `cockpit/lib/mediatheque-view.js` (`window.mdtView`, testé par `tests/test_mediatheque_view.mjs`) ; le panel n'en garde que des délégués d'une ligne. Encart Brief : `<MdtBriefCard>` dans `cockpit/home.jsx`. Styles : `cockpit/styles-mediatheque.css` (préfixe `mdt-`).

## Front — fonctions JS
| Fonction | Rôle | Fichier |
|----------|------|---------|
| `status()` / `released()` | statuts dérivés (À voir/En cours/À jour/Vu), épisodes sortis | `cockpit/lib/mediatheque-view.js` |
| `pickHero()` / `currentEntryOf()` / `nextAiringOf()` | choix du titre hero (table de priorité) / saison courante d'une franchise / prochaine diffusion connue | `cockpit/lib/mediatheque-view.js` |
| `curLabel()` / `nextEpLabel()` | libellés de saison courante (« S2 · 12/28 » carte-hero, « S2 · ép. 13 sur 28 » rail) | `cockpit/lib/mediatheque-view.js` |
| `mdtStatus()` / `mdtReleased()` / `mdtCurLabel()` / `pickHero()` / `currentEntryOf()` / `nextAiringOf()` | délégués d'une ligne vers `window.mdtView` (aucune logique) | `cockpit/panel-mediatheque.jsx` |
| `openPreview()` / `addFranchise()` | walk live + ajout atomique (rollback si échec) | `cockpit/panel-mediatheque.jsx` |
| `writeProgress()` | upsert optimiste de la progression | `cockpit/panel-mediatheque.jsx` |
| `ackRelease()` / `removeFranchise()` | acquittement / retrait cascade | `cockpit/panel-mediatheque.jsx` |
| `writeRating()` / `toggleShelved()` | upsert note optimiste / bascule mis de côté | `cockpit/panel-mediatheque.jsx` |
| `searchAnime()` / `fetchFranchiseLive()` / `buildFranchise()` | client AniList + walk franchise (contrat commun pipeline) | `cockpit/lib/anilist.js` |
| `pickRail()` / `buildWeek()` / `matchesQuery()` | rail « Continuer », agenda 7 jours (chaque item porte `cover`, la jaquette de sa franchise), recherche locale | `cockpit/lib/mediatheque-view.js` |

## Back — sources de données
`media_franchises` (1 ligne/franchise ajoutée), `media_entries` (saisons/films/OVA, ~5-30/franchise, rafraîchies par le pipeline), `media_progress` (1 ligne/entrée entamée, jamais écrite par le pipeline), `media_releases` (événements détectés, UNIQUE(entry_id,event_type)). Migration `sql/020_media_tracker.sql`, RLS authenticated (4 opérations).

## Back — pipelines qui alimentent
- `anime_tracker_sync` (quotidien 07:30 UTC) → refresh des entrées suivies + détection new_entry / airing_started / date_announced → `media_releases`.

## Appels externes
AniList GraphQL `https://graphql.anilist.co` — public, sans clé. Front : recherche + walk à l'ajout (≥700 ms entre requêtes). Pipeline : batchs id_in de 25, throttle 2,5 s. Les deux respectent Retry-After sur 429.

## Dépendances
- Onglets : Brief du jour (encart sorties)
- Pipelines : anime_tracker_sync
- Variables d'env / secrets : SUPABASE_URL + SUPABASE_SERVICE_KEY (pipeline) — aucun secret nouveau

## États & edge cases
- Bibliothèque vide → invite à chercher. AniList down/429 → message d'erreur sur la recherche, bibliothèque et progression intactes (données locales).
- Ajout interrompu → rien n'est persisté (rollback), toast « réessaie ». Franchise déjà présente → ouverture de sa fiche (dédup par racine).
- Saison annoncée sans date → numérotée en dernier, stepper désactivé. Épisodes plafonnés aux sortis pour une saison en diffusion.
- Un report de date met à jour le calendrier sans re-déclencher d'événement.
- Mettre de côté depuis un bucket actif → la carte disparaît de la vue courante (sauf filtre « Mis de côté »). Réactiver → retour dans le bucket dérivé de la progression.
- « Vu » vs « En cours · à jour » : un anime bascule « Vu » dès qu'**aucune saison ne diffuse actuellement** (aucune `RELEASING`) et que tous les épisodes sortis sont vus — y compris s'il a une saison future annoncée mais pas encore diffusée. Il repasse « En cours » quand un nouvel épisode sort non vu (`released` remonté par le pipeline quotidien). « En cours · à jour » est réservé au cas « saison en diffusion et rattrapée ».

## Limitations connues / TODO
- [ ] v1 anime uniquement — mangas/livres/films/séries prévus (schéma media_type prêt)
- [ ] pas de note/score au niveau franchise (agrégée)
- [ ] import d'historique MAL/AniList non couvert
- [ ] deux franchises qui partagent une même entrée AniList (crossover / OVA bonus commun) ne peuvent pas être suivies en parallèle — l'ajout de la seconde échoue silencieusement (unicité de l'entrée par source). Cas rare, à corriger par « ignorer les entrées déjà présentes » ou unicité par franchise.

## Dernière MAJ
2026-07-25 — lisibilité du parcours actif. Rail « Continuer à regarder » : les cartes ne sont plus à des largeurs différentes (`min-width: 0` — un flex item a `min-width: auto`, soit sa largeur min-content, et le titre en `nowrap` imposait la sienne à toute la carte par-dessus `flex-basis`). Semainier remplacé par un agenda : une ligne par jour qui diffuse avec le chiffre du jour en ancre et la jaquette de chaque série, jours creux repliés en une ligne, « plus tard » éclaté en pastilles. `buildWeek()` porte désormais `cover` sur chaque item. Aucune migration.

2026-07-24 — parcours d'une bibliothèque de 44 franchises : rail « Continuer à regarder », semainier des diffusions, collection repliée et densifiée, recherche unique bibliothèque-d'abord. Logique pure extraite dans `cockpit/lib/mediatheque-view.js` (testée sous node) — statuts, hero et libellés y ont rejoint le rail et le semainier, le panel n'en garde que des délégués. Correctif semainier : une saison en diffusion dont la date est périmée bascule en « plus tard · date inconnue » au lieu de disparaître de l'écran entre deux syncs. Aucune migration.
