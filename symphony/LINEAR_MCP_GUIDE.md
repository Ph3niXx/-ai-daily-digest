# Linear MCP — guide d'usage pour les agents Symphony

Référencé depuis `WORKFLOW.md` (section « Outils Linear MCP »). Lis ce
fichier **seulement** si tu rencontres un blocage technique réel ou si tu veux
signaler un scope adjacent. Sinon, ne perds pas de tokens dessus.

## Contexte

Tu as potentiellement accès au MCP officiel Linear (`https://mcp.linear.app/mcp`)
via les tools `mcp__linear-server__*` :

- `mcp__linear-server__create_comment` — poster un commentaire
- `mcp__linear-server__get_issue` — lire l'issue courante
- `mcp__linear-server__list_issues` — chercher
- `mcp__linear-server__update_issue` — éditer
- etc.

## Quand utiliser

### Cas 1 — Blocage technique réel

Tu n'as pas pu finir une partie de l'US (info manquante, contrainte technique,
dépendance non disponible, ambiguïté de spec). Poste un `create_comment` sur
l'issue courante :

- 2-3 phrases max
- Explique **ce qui bloque** + **ce qu'il faut pour débloquer** (info, décision
  humaine, US prérequis à faire d'abord)

### Cas 2 — Scope adjacent identifié

Tu vois une amélioration utile **clairement hors scope** de l'US courante. Poste
un commentaire mentionnant l'idée — 1-2 phrases. **Ne crée pas de sub-issue
automatique**, l'humain décide.

## Quand NE PAS utiliser

- ❌ Pour signaler que tu as fini → le commit + la PR sont la trace, c'est
  redondant et ça spamme Linear.
- ❌ Pour mettre à jour l'état de l'issue → c'est Symphony qui transitionne, pas
  toi.
- ❌ Pour des commentaires « cosmétiques » (« bonjour », « j'ai bien lu l'US »,
  « voici mon plan ») → silence est mieux.
- ❌ Pour décrire ce que tu as fait → c'est dans le message de commit et la
  description de PR. Pas dans Linear.

## Si les tools ne sont pas dispo

Le MCP Linear n'est peut-être pas chargé dans ton environnement. Ne tente pas
de l'appeler, ne génère pas d'erreur — ignore simplement cette section.
