# Santé

> État de la machinerie du cockpit, section par section : ce qui tourne, ce qui est cassé, depuis quand, ce que ça coûte et le geste qui répare.

## Scope
mixte

## Finalité fonctionnelle
Répondre en un écran à « est-ce que ce que je lis est à jour ? ». Le bandeau d'alerte du Brief signale les pannes mais ne dit jamais que tout le reste va bien, et la liste des synchronisations de Stacks & Limits est noyée dans un onglet qui parle d'argent. Cet onglet est le seul endroit où l'état complet se lit, organisé par domaine fonctionnel plutôt que par technologie, et où chaque panne est accompagnée du geste qui la répare.

## Parcours utilisateur
1. Clic sidebar "Santé" (groupe Coulisses) — l'écran s'affiche immédiatement, sans attente de chargement.
2. Lecture du verdict en tête : combien de briques sont en panne ou figées, sur combien de briques surveillées, et à quelle date remonte le dernier contrôle.
3. Si le contrôle lui-même n'a pas tourné depuis plus de 48 heures, un avertissement le dit avant tout le reste : les états affichés en dessous peuvent être faux.
4. Scan des sept sections, toujours dans le même ordre : Veille IA, Apprentissage, Veille satellite, Médiathèque, Vie perso, Business, Socle. Une section dont tout va bien est repliée sur son titre ; une section qui contient une panne est ouverte d'office.
5. Lecture de la phrase d'effet sous le titre d'une section dégradée : elle nomme les onglets qui affichent encore des données figées.
6. Pour chaque brique dégradée : la cause en une phrase, ce que ça éteint, et la marche à suivre pour réparer.
7. Clic sur la flèche d'une brique pour ouvrir le détail de sa dernière exécution.
8. Clic sur le titre d'une section saine pour la déplier et vérifier le détail — la préférence de pli est mémorisée d'une visite à l'autre, sauf pour les sections dégradées qui s'ouvrent toujours.

## Fonctionnalités
- **Verdict global** : nombre de briques en panne et figées sur le total surveillé, plus la date du dernier contrôle. Répond à "est-ce que je peux faire confiance à ce que je lis ailleurs".
- **Alerte sur le surveillant** : si le contrôle de santé n'a pas tourné depuis plus de 48 heures, l'écran le dit en premier, parce qu'un "tout va bien" périmé est pire qu'un écran vide.
- **Sept sections par domaine, ordre fixe** : les sections ne changent jamais de place, ce qui rend la page mémorisable. L'urgence est portée par les pastilles et le verdict, jamais par un tri mouvant.
- **Repli automatique du sain** : un jour normal, la page tient en sept lignes. Une section qui contient une panne s'ouvre d'elle-même, même si elle avait été repliée.
- **Phrase d'effet par section** : nomme les onglets du cockpit qui affichent encore des données figées, pour traduire une panne technique en conséquence concrète.
- **Six états lisibles** : à jour, au repos (une source pilotée par l'activité qui n'a rien à dire), fraîcheur inconnue (aucune mesure possible), en panne, figé, inconnu. Un vert non mesuré ne ressemble jamais à un vert mesuré.
- **Le geste qui répare** : chaque brique dégradée affiche la marche à suivre, écrite d'avance à côté de la source qu'elle répare.
- **Lien vers la dernière exécution** : une flèche par brique, pour aller lire le détail technique quand la phrase ne suffit pas.
- **État vide honnête** : si aucun relevé n'existe, l'écran le dit au lieu d'afficher un faux "tout va bien".

## Front — structure UI
Hero (accroche + sous-titre), bandeau de verdict global, puis une section repliable par domaine. Chaque section : bouton de titre (chevron + libellé + compteur), phrase d'effet, corps déplié. Chaque ligne : pastille de couleur, libellé, état, âge, lien externe ; puis, si dégradée, cause, effet et remède. Préférence de pli persistée dans `localStorage` sous la clé `cockpit-sante-open`.

## Front — fonctions JS
| Fonction | Rôle | Fichier/ligne |
|----------|------|---------------|
| `PanelSante()` | Composant racine, assemble verdict + sections | `cockpit/panel-sante.jsx` |
| `SaVerdict()` | Bandeau de verdict global + garde 48 h | `cockpit/panel-sante.jsx` |
| `SaSection()` | Section repliable d'un domaine | `cockpit/panel-sante.jsx` |
| `SaRow()` | Ligne d'une brique, dans ses six rendus | `cockpit/panel-sante.jsx` |
| `santeView.renderOf()` | Statut en base → rendu à l'écran | `cockpit/lib/sante-view.js` |
| `santeView.sectionSummary()` | Phrase d'effet dérivée des panels | `cockpit/lib/sante-view.js` |
| `santeView.groupByDomain()` | Groupement en sections, ordre fixe | `cockpit/lib/sante-view.js` |
| `santeView.globalVerdict()` | Compteurs + garde sur `checked_at` | `cockpit/lib/sante-view.js` |

## Back — sources de données
Table `pipeline_health`, chargée en entier et sans filtre par le Tier 1 (`cockpit/lib/data-loader.js::bootTier1`). Aucun fetch propre au panel. La table est écrite par l'observateur externe `pipelines/pipeline_health.py` (cron quotidien 09:00 UTC), qui lit le contrat `health` de chaque brique dans `docs/architecture/pipelines.yaml`.

## Limitations
- Les colonnes `domain`, `remediation` et `impact` ne se peuplent qu'au premier passage du contrôle quotidien suivant le déploiement : avant lui, toutes les briques tombent dans « Non classé ».
- `igdb_tracker_sync` ne peut pas être mesuré sur la fraîcheur de ses données : le cockpit écrit lui aussi dans ses tables. Il s'affiche « fraîcheur inconnue ».
- Jarvis local, les quotas d'API et les garde-fous de développement sont hors périmètre — les quotas restent dans Stacks & Limits.
