# Santé

> État de la machinerie du cockpit, section par section : ce qui tourne, ce qui est cassé, depuis quand, ce que ça coûte et le geste qui répare.

## Scope
mixte

## Finalité fonctionnelle
Répondre en un écran à « est-ce que ce que je lis est à jour ? ». Le bandeau d'alerte du Brief signale les pannes mais ne dit jamais que tout le reste va bien, et la liste des synchronisations de Stacks & Limits est noyée dans un onglet qui parle d'argent. Cet onglet est le seul endroit où l'état complet se lit, organisé par domaine fonctionnel plutôt que par technologie, et où chaque panne est accompagnée du geste qui la répare.

## Parcours utilisateur
1. Clic sidebar "Santé" (groupe Coulisses) — l'écran s'affiche immédiatement, sans attente de chargement.
2. Lecture du verdict en tête : combien de briques sont en panne ou figées, combien sont réellement mesurées sur la fraîcheur de leurs données (le compteur dit « 16 mesurées sur 19 » dès qu'une brique ne l'est pas), et à quelle heure remonte le dernier contrôle.
3. Si le contrôle lui-même n'a pas tourné depuis plus de 48 heures, un avertissement le dit avant tout le reste : les états affichés en dessous peuvent être faux.
4. Scan des sept sections, toujours dans le même ordre : Veille IA, Apprentissage, Veille satellite, Médiathèque, Vie perso, Business, Socle. Une section ne dit « tout va bien » que si toutes ses briques sont mesurées ; sinon elle compte les briques au repos et les briques non mesurées. Une section qui contient une panne est ouverte d'office.
5. Lecture de la phrase d'effet, qui nomme les onglets affichant encore des données figées : sous le titre de la section quand plusieurs briques sont dégradées, sur la ligne de la brique quand elle est seule à l'être. Jamais aux deux endroits à la fois.
6. Pour chaque brique dégradée : la cause en une phrase, ce que ça éteint, et la marche à suivre pour réparer.
7. Clic sur la flèche d'une brique pour ouvrir le détail de sa dernière exécution.
8. Clic sur le titre d'une section pour la plier ou la déplier — toute section répond au clic, y compris dégradée. Une section dégradée se rouvre d'elle-même à chaque visite, quel que soit l'état mémorisé : la mémoire ne peut donc pas enterrer une panne, mais elle n'immobilise pas non plus le chevron. Seul le geste explicite de l'utilisateur est mémorisé d'une visite à l'autre (`localStorage`).

## Fonctionnalités
- **Verdict global** : nombre de briques en panne et figées, nombre de briques réellement mesurées sur le total, et l'heure du dernier contrôle. Répond à "est-ce que je peux faire confiance à ce que je lis ailleurs".
- **Le non-mesuré ne se déguise pas en vert** : les briques sans sonde de fraîcheur (aujourd'hui `igdb_tracker_sync`, `backup_supabase`, `pipeline_health`) ne sont comptées ni comme saines ni comme dégradées. Le verdict annonce "16 mesurées sur 19" et le dit en toutes lettres ; le compteur de section les affiche à part, comme les briques au repos. Sans ça, la section Socle — dont les deux briques sont sans sonde — annoncerait "tout va bien" tous les jours de l'année, repliée par défaut.
- **Alerte sur le surveillant** : si le contrôle de santé n'a pas tourné depuis plus de 48 heures, l'écran le dit en premier, parce qu'un "tout va bien" périmé est pire qu'un écran vide.
- **Sept sections par domaine, ordre fixe** : les sections ne changent jamais de place, ce qui rend la page mémorisable. L'urgence est portée par les pastilles et le verdict, jamais par un tri mouvant.
- **Repli automatique du sain** : un jour normal, la page tient en sept lignes. Une section qui contient une panne s'ouvre d'elle-même à chaque visite, même si elle avait été repliée — mais elle reste repliable pendant la session.
- **Phrase d'effet, dite une seule fois** : elle nomme les onglets du cockpit qui affichent encore des données figées, pour traduire une panne technique en conséquence concrète. Portée par la section quand elle agrège plusieurs briques dégradées, par la ligne quand une seule l'est : le même texte ne s'affiche jamais deux fois à l'écran.
- **Six états lisibles** : à jour, au repos (une source pilotée par l'activité qui n'a rien à dire), fraîcheur inconnue (aucune mesure possible), en panne, figé, inconnu. Un vert non mesuré ne ressemble jamais à un vert mesuré.
- **Le geste qui répare** : chaque brique dégradée affiche la marche à suivre, écrite d'avance à côté de la source qu'elle répare.
- **Lien vers la dernière exécution** : une flèche par brique, pour aller lire le détail technique quand la phrase ne suffit pas.
- **État vide honnête** : si aucun relevé ne remonte, l'écran dit qu'il n'a rien pu lire — sans trancher entre une table encore vide et une lecture en échec, que le front ne peut pas distinguer — au lieu d'afficher un faux "tout va bien".

## Front — structure UI
Hero (accroche + sous-titre), bandeau de verdict global, puis une section repliable par domaine. Chaque section : bouton de titre (chevron + libellé + compteur), phrase d'effet, corps déplié. Chaque ligne : pastille de couleur, libellé, état, âge, lien externe ; puis, si dégradée, cause, effet et remède. L'état de pli est amorcé au montage (les sections dégradées ouvertes, les autres selon la mémoire), puis piloté par les clics de la session. Seuls les clics explicites sont persistés, dans `localStorage` sous la clé `cockpit-sante-open` — l'ouverture d'office d'une panne n'y est jamais écrite, sinon une section réparée resterait dépliée pour toujours.

## Front — fonctions JS
| Fonction | Rôle | Fichier/ligne |
|----------|------|---------------|
| `PanelSante()` | Composant racine, assemble verdict + sections | `cockpit/panel-sante.jsx` |
| `SaVerdict()` | Bandeau de verdict global + garde 48 h | `cockpit/panel-sante.jsx` |
| `SaSection()` | Section repliable d'un domaine | `cockpit/panel-sante.jsx` |
| `SaRow()` | Ligne d'une brique, dans ses six rendus | `cockpit/panel-sante.jsx` |
| `santeView.renderOf()` | Statut en base → rendu à l'écran | `cockpit/lib/sante-view.js` |
| `santeView.effectSentence()` | Gabarit unique de la phrase d'effet | `cockpit/lib/sante-view.js` |
| `santeView.sectionSummary()` | Phrase d'effet de section — `null` sous 2 briques dégradées | `cockpit/lib/sante-view.js` |
| `santeView.rowSummary()` | Phrase d'effet de ligne — `null` quand la section l'agrège | `cockpit/lib/sante-view.js` |
| `santeView.sectionStateLabel()` | Compteur du bouton de section, réutilisé en `aria-label` | `cockpit/lib/sante-view.js` |
| `santeView.groupByDomain()` | Groupement en sections, ordre fixe + compteurs dégradé/repos/non mesuré | `cockpit/lib/sante-view.js` |
| `santeView.globalVerdict()` | Compteurs (dont `measured`/`unmeasured`) + garde sur `checked_at` | `cockpit/lib/sante-view.js` |

## Back — sources de données
Table `pipeline_health`, chargée en entier et sans filtre par le Tier 1 (`cockpit/lib/data-loader.js::bootTier1`). Aucun fetch propre au panel. La table est écrite par l'observateur externe `pipelines/pipeline_health.py` (cron quotidien 09:00 UTC), qui lit le contrat `health` de chaque brique dans `docs/architecture/pipelines.yaml`.

## Limitations
- Les colonnes `domain`, `remediation` et `impact` ne se peuplent qu'au premier passage du contrôle quotidien suivant le déploiement : avant lui, toutes les briques tombent dans « Non classé ».
- Trois briques sur dix-neuf ne sont mesurées sur aucune fraîcheur et s'affichent « fraîcheur inconnue » : `igdb_tracker_sync` (le cockpit écrit lui aussi dans ses tables, une mesure y serait fausse), `backup_supabase` et `pipeline_health` (surveillées sur leur seul verdict de run). La page le dit au lieu de les verdir, mais elle ne les mesure pas pour autant.
- Jarvis local, les quotas d'API et les garde-fous de développement sont hors périmètre — les quotas restent dans Stacks & Limits.

## Dernière MAJ
2026-08-21 — trois changements visibles. (1) **L'alerte notifie enfin** : l'issue GitHub « Pipelines dégradés » était réécrite chaque jour sans jamais être commentée, or GitHub ne notifie que sur création et sur commentaire — quatre jours de panne n'ont prévenu personne. Un commentaire unique est désormais posté quand l'ensemble des pipelines dégradés CHANGE, pas à chaque contrôle. (2) **Une nouvelle cause de dégradation** apparaît : « Aucun run depuis X h » (`max_run_age_hours`), qui surveille le DÉCLENCHEMENT et non la sortie — seul signal possible pour la sauvegarde, qui n'écrit aucune table. (3) **La table est élaguée** : un pipeline sorti du catalogue actif disparaît du relevé au lieu d'y rester « en panne » indéfiniment — sans quoi `tft_sync`, passé en manuel le même jour, serait resté rouge pour toujours. Corollaire : le compteur d'échecs ne renvoie plus `last_success_at` à vide quand la fenêtre d'inspection est saturée. Cf. ADR-45.
