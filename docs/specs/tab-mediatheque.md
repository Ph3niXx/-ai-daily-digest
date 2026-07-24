# Médiathèque

> Bibliothèque anime personnelle : recherche, suivi de progression par saison, alerte sur les nouvelles sorties.

## Scope
perso

## Finalité fonctionnelle
Suivre tous les animes vus / à voir au même endroit : retrouver un anime avec ses saisons et leurs dates, déclarer sa progression épisode par épisode, et être prévenu dès qu'une nouvelle saison d'un anime suivi est annoncée ou commence à être diffusée — sans dépendre d'un site tiers. Première brique d'une médiathèque élargie (mangas, livres, films, séries).

## Parcours utilisateur
1. Clic sidebar « Médiathèque » — la bibliothèque s'affiche avec, en haut, les sorties récentes et le calendrier des prochaines diffusions de sa liste.
2. Tape le nom d'un anime dans le champ de recherche — les résultats apparaissent en direct ; une bascule « Ma bibliothèque | Résultats (N) » permet de revenir à sa liste suivie et d'y retourner sans perdre la recherche.
3. Clic sur un résultat — la fiche franchise se construit : saisons numérotées et datées, films canon, bonus, prochaines sorties.
4. Clic « Ajouter à ma bibliothèque » — la franchise rejoint la grille avec le statut « À voir ».
5. Ouvre une fiche de sa bibliothèque et déclare sa progression saison par saison (+1, saisie directe, « ✓ vue ») — le statut global (À voir / En cours / En cours · à jour / Vu) se met à jour tout seul.
6. Le lendemain d'une annonce de nouvelle saison, lit l'encart Médiathèque du Brief du jour, ouvre l'onglet et acquitte l'événement d'un ✓.

## Fonctionnalités
- **Recherche en direct** : un seul champ, bibliothèque d'abord. Dès 1 caractère il filtre la bibliothèque (titres anglais/romaji/japonais, insensible à la casse et aux accents, mises de côté comprises) ; à partir de 3 caractères il interroge aussi AniList (format, année, genres, score ; les fiches déjà en bibliothèque sont signalées). La bascule segmentée « Ma bibliothèque · N | AniList · M » atterrit sur la bibliothèque dès qu'il y a une correspondance locale.
- **Fiche franchise** : toutes les saisons regroupées et numérotées avec dates et nombre d'épisodes, films canon à leur place chronologique, OVA/bonus à part ; prochaine diffusion datée pour les saisons en cours.
- **Bibliothèque** : hero cinématique mettant en avant le titre le plus pertinent, puis trois rayons — rail « Continuer à regarder » (cartes bannière avec `+1 épisode` visible sans survol, la franchise du hero exclue), semainier des 7 prochains jours de diffusion, et « Ma collection » repliée (grille dense de posters, chips de statut, tri). La collection contient **toutes** les franchises, actives comprises ; son état plié/déplié est mémorisé.
- **Statut manuel « mis de côté »** : ranger une franchise qu'on ne suit plus (bouton dans la fiche). Elle sort des buckets actifs (À voir / En cours / Vu / « Tous ») et n'apparaît que sous son chip dédié « Mis de côté » ; progression et notes conservées, réactivable à tout moment.
- **Progression par saison** : compteur « vu jusqu'à l'épisode N », plafonné aux épisodes réellement sortis ; pour une saison en cours de diffusion, le compteur affiche les épisodes sortis à date (et le total prévu s'il est connu) plutôt qu'un total inconnu ; le statut de la franchise en découle automatiquement.
- **Note par saison** : chaque saison/film/bonus est notable sur 0–100 (échelle AniList) via une pastille inline dans la fiche ; champ vidé = note retirée. Stockée sur `media_progress` (user-owned).
- **Sorties** : bandeau des événements détectés (nouvelle saison, diffusion commencée, date annoncée) avec acquittement, semainier des 7 prochains jours (aujourd'hui surligné) doublé d'une ligne « plus tard » — diffusions au-delà de J+6, premières annoncées jusqu'à J+90, saisons de la chaîne principale en diffusion sans date connue —, et encart dans le Brief du jour.

## Front — structure UI
`cockpit/panel-mediatheque.jsx` (`window.PanelMediatheque`) : toolbar (`.mdt-search`), bascule segmentée `.mdt-viewtoggle` (état `view` = `library`/`search`), bandeau `<MdtReleasesStrip>` (événements non acquittés), hero `<MdtHero>` (`pickHero`), rail `<MdtRail>`, semainier `<MdtWeek>`, section repliable `<MdtCollection>` (grille `.mdt-grid` de `<MdtCard compact>`), modale `<FicheFranchise>`, stepper `<MdtStepper>`. Logique de présentation pure (libellés, recherche locale, rail, semainier) dans `cockpit/lib/mediatheque-view.js` (`window.mdtView`, testé par `tests/test_mediatheque_view.mjs`). Encart Brief : `<MdtBriefCard>` dans `cockpit/home.jsx`. Styles : `cockpit/styles-mediatheque.css` (préfixe `mdt-`).

## Front — fonctions JS
| Fonction | Rôle | Fichier |
|----------|------|---------|
| `mdtStatus()` / `mdtReleased()` | statuts dérivés (À voir/En cours/À jour/Vu), épisodes sortis | `cockpit/panel-mediatheque.jsx` |
| `pickHero()` / `currentEntryOf()` | choix du titre hero (table de priorité) / saison courante d'une franchise | `cockpit/panel-mediatheque.jsx` |
| `openPreview()` / `addFranchise()` | walk live + ajout atomique (rollback si échec) | `cockpit/panel-mediatheque.jsx` |
| `writeProgress()` | upsert optimiste de la progression | `cockpit/panel-mediatheque.jsx` |
| `ackRelease()` / `removeFranchise()` | acquittement / retrait cascade | `cockpit/panel-mediatheque.jsx` |
| `writeRating()` / `toggleShelved()` | upsert note optimiste / bascule mis de côté | `cockpit/panel-mediatheque.jsx` |
| `searchAnime()` / `fetchFranchiseLive()` / `buildFranchise()` | client AniList + walk franchise (contrat commun pipeline) | `cockpit/lib/anilist.js` |
| `pickRail()` / `buildWeek()` / `matchesQuery()` | rail « Continuer », semainier 7 jours, recherche locale | `cockpit/lib/mediatheque-view.js` |

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
2026-07-24 — parcours d'une bibliothèque de 44 franchises : rail « Continuer à regarder », semainier des diffusions, collection repliée et densifiée, recherche unique bibliothèque-d'abord. Logique pure extraite dans `cockpit/lib/mediatheque-view.js` (testée sous node). Aucune migration.
