# Veille écosystème Claude — 2026-06-05

## Compteurs du run

| Métrique | Valeur |
|---|---|
| Entrées vues / refresh | 51 |
| Vraiment ajoutées (nouveau slug) | 1 |
| Mises à jour (slug existant) | 50 |
| Archivées | 0 |
| Catalogue total après run | 411 |

Cap technique du run : 60. Pas atteint volontairement — le catalogue est mature, on focalise sur les sources canoniques + 1 ajout dûment attesté.

## Nouveauté de ce run

- **`claude-plugins-community`** (inbound · cowork_plugin · Anthropic) — Mirror read-only du marketplace communautaire des plugins Cowork/Claude Code. Soumissions via `clau.de/plugin-directory-submission`. Source à scanner pour repérer des plugins peu visibles côté Anthropic officiel. https://github.com/anthropics/claude-plugins-community

## Mises à jour notables

Refresh des sources canoniques + nouveautés 2026 récentes :

### Plateforme Anthropic
- **Claude Managed Agents** (8 avr 2026) — service hébergé d'agents Claude avec sandboxes, memory, multi-agent, webhooks. Concurrent direct de LangChain Deep Agents Deploy.
- **MCP Tunnels** (research preview, 19 mai 2026) — connexion outbound chiffrée unique pour exposer des MCP derrière NAT sans règles firewall inbound.
- **Claude Opus 4.8** (28 mai 2026) — modèle par défaut Claude Code, dynamic workflows, fast mode preview, agentic coding 69.2 %.
- **Claude Design** (17 avr 2026) — plugin Cowork officiel pour génération d'assets visuels.

### SDK
- **claude-agent-sdk-python / typescript / go** — releases ~hebdo, v0.1.50 (mars 2026) côté Python, supporte SessionStart hooks + reloadSkills + MessageDisplay hook.
- **anthropic-sdk-python / typescript / go / java** — SDK bas-niveau Messages API, refresh confirmé.

### Frameworks tiers
- **LangChain Deep Agents Deploy** (9 avr 2026) — concurrent open-source de Claude Managed Agents, basé LangGraph.
- **Semantic Kernel v1.0 GA** (avr 2026) — fusion avec AutoGen, SDK Microsoft enterprise (.NET / Python / Java).
- **Vercel AI SDK 6** — multi-provider, tools, images, reranking, speech.
- **Haystack** — leader efficacité tokens (1.57k/call vs 2.40k LangChain).

### MCP / écosystème
- **Spec MCP 2026-07-28 (RC)** — prochaine release stable de la spec.
- **AAIF (Agentic AI Foundation)** sous Linux Foundation — gouvernance MCP depuis déc 2025 (9 core, 58 maintainers, 2900+ Discord).
- **Agent Client Protocol (ACP)** — annoncé jan 2026 par Zed + JetBrains pour découpler agents et éditeur.
- **modelcontextprotocol/servers** — 7 serveurs reference encore maintenus (Everything, Fetch, Filesystem, Git, Memory, Sequential Thinking, Time). Les 13 autres historiques archivés au profit de versions vendor.

### IDE / runtime
- **Claude Code** — CLI + plugins VS Code / JetBrains (GUI plugin officiel) / Cursor / Zed (ACP) / Continue / Aider en concurrent.
- **Cowork** — runtime utilisé pour ce run, expansion enterprise 24 fév 2026 avec marketplaces privés.

## Archivages

Aucun. Toutes les entrées actives ont un `last_seen` dans les 90 derniers jours (la run précédente est récente).

## Points non couverts

- **r/ClaudeAI top du mois** — la requête WebSearch dédiée n'a rien retourné d'indexable cette fois. Pas de signal nouveau à intégrer depuis cette source.
- **MCP servers Anthropic enterprise privés** (Claude for Work pre-built) — mentionnés dans la doc mais pas tous repérables comme repo public ; on s'en tient aux MCP officiels documentés.
- **Bots Claude-powered notables (Discord, Notion natif)** — pas trouvé de bot officiel récemment maintenu hors des MCP déjà catalogués (`mcp-slack`, `mcp-notion`, `mcp-linear`).
- **Forks et tools <100 stars** — exclus par le filtre dur (qualité).

## Notes de housekeeping

- 1 doublon créé en cours de run (`claude-marketplace-cowork-im` redondant avec `claudecowork-im-directory` qui pointe vers la même URL) → supprimé, le slug historique a été préservé avec ses champs user et son `last_seen` rafraîchi.
- `user_priority`, `is_pinned`, `user_notes`, `status` jamais touchés sur l'UPSERT (clauses `ON CONFLICT DO UPDATE` ciblées).
