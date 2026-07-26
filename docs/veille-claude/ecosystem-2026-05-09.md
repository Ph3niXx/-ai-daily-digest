# Catalogue écosystème Claude — 2026-05-09

## Récap chiffres

- **Catalogue total** : 242 entrées actives
- **Vues ce run** : 73 (sur ~140 sources web fetched / résultats agrégés)
- **Vraiment nouvelles** (INSERT) : 16
- **Mises à jour** (slug existant, refresh `last_seen` ± description) : 57
- **Archivées** : 0 (aucune entrée n'a dépassé 90 jours sans revue — la plus ancienne `last_seen` actuelle est du 2026-05-01)
- **Direction** : 162 inbound · 79 outbound · 1 both

## Nouveautés notables

### Côté outbound (Claude se plugge ailleurs)

- **`ant-cli`** — outbound · sdk · Anthropic. CLI Go-based officiel d'Anthropic pour la Claude API (avril 2026), structure kubectl-like (`ant [resource] <command>`), gère agents/sessions/deployments/skills. Install : `brew install anthropics/tap/ant`.
- **`a2a-protocol`** — outbound · framework · Linux Foundation. v1.0 sortie en avril 2026 (Signed Agent Cards, multi-tenancy, JSON-RPC + gRPC bindings). 150+ orgs en prod (Microsoft, AWS, Salesforce, SAP, ServiceNow). Standard interop multi-agent complémentaire à MCP.
- **`claude-managed-agents-dreaming`** — outbound · framework · Anthropic. Research preview lancée le 6 mai 2026 : processus planifié qui curate la mémoire entre sessions, extrait patterns récurrents (erreurs, workflows, préférences). Harvey rapporte un 6× sur les task completion rates.
- **`claude-managed-agents-multiagent`** — outbound · framework · Anthropic. Public beta du 6 mai 2026 : un lead agent délègue à des spécialistes en parallèle sur un filesystem partagé, avec re-checking mid-workflow grâce aux events persistants.
- **`claude-managed-agents-outcomes`** — outbound · framework · Anthropic. Public beta du 6 mai 2026 : définition d'un objectif déclaratif, l'agent itère jusqu'à l'atteindre, évaluation auto en fin de run, notifié via webhook.
- **`claude-managed-agents-webhooks`** — outbound · connector · Anthropic. Public beta du 6 mai 2026 : push HTTP sur les events `session.*`, delivery at-least-once avec retries idempotents (`event.id`), config dans la Claude Console.
- **`claudefa-st-changelog`** — outbound · other · community. Mirror tiers indexé du changelog Claude Code, plus lisible que le brut GitHub. Source veille hebdo plus rapide qu'`anthropics/claude-code/releases`.

### Côté inbound (outils qui se branchent à Claude)

- **`mcp-knowledge-graph-shaneholloman`** — inbound · mcp_server. Fork local-dev focused du knowledge graph officiel, store JSON local, compatible Claude Code/Desktop sans cloud.
- **`mcp-memory-service-doobidoo`** — inbound · mcp_server. Mémoire persistante open-source pour LangGraph/CrewAI/AutoGen et Claude. REST API + knowledge graph + autonomous consolidation.
- **`codegraph-mcp`** — inbound · mcp_server. Pre-indexed code knowledge graph pour Claude Code : graphe symbol/call/structure pré-construit, queries instantanées, économie tokens et tool calls.
- **`codebase-memory-mcp-deusdata`** — inbound · mcp_server. MCP server haute perf qui indexe les codebases dans un knowledge graph persistant (sub-ms queries, 155 langages, single static binary).
- **`zep-knowledge-graph-mcp`** — inbound · mcp_server. Knowledge graph MCP avec persistance temporelle (framework Graphiti). Tracking des relations dans le temps.
- **`mcp-tasks-spec`** — inbound · framework · Linux Foundation. Extension SEP-1686 du protocole MCP pour les opérations long-running async queryables. Intégrée à la spec d'avril 2026.
- **`cc-marketplace-ananddtyagi`** — inbound · cowork_plugin · community. Marketplace community pour plugins Claude Code, install-friendly (`/plugin marketplace add ananddtyagi/cc-marketplace`).
- **`xiaolai-claude-plugin-marketplace`** — inbound · cowork_plugin · community. Marketplace centralisée maintenue par xiaolai (community asiatique), focus productivité.
- **`aitmpl-plugins-directory`** — inbound · other · AITmpl. Vitrine web catégorisée plugins/marketplaces/collections (référence : 4200+ skills, 770+ MCP, 2500+ marketplaces fin avril 2026).

## Mises à jour de description (3 entrées catalogue)

- **`claude-managed-agents`** — Étendu le 6 mai 2026 avec dreaming + outcomes + multi-agent orchestration + webhooks.
- **`claude-managed-agents-memory`** — Désormais public beta sous le header `managed-agents-2026-04-01`, couplée au système Dreaming.
- **`anthropic-financial-services`** — 10 templates explicités (5 research/coverage : pitch builder, meeting preparer, earnings reviewer, model builder, market researcher · 5 finance/ops : valuation reviewer, GL reconciler, month-end closer, statement auditor, KYC screener), chacun = skills + connectors + subagents.

## Archivages

Aucun archivage ce run. L'écosystème entier est resté actif sur les 30 derniers jours (plus ancien `last_seen` = 2026-05-01).

## Notes sur la couverture

- Cap respecté : ~73 outils touchés (sous le plafond de 60 *vraiment nouveaux ou mis à jour en profondeur*, les ~57 autres étant juste des refresh `last_seen` sur des sources confirmées vivantes via les recherches web).
- **Pas couvert ce run** :
  - Repos privés / paywall (Harvey, FactSet, MSCI, Moody's — entrées MCP App déjà au catalogue, descriptions pas raffinées sans accès).
  - r/ClaudeAI — les top posts du mois pointaient surtout sur les outils déjà cataloguées (Cursor, Claude Code) plutôt que sur des nouveautés tierces. À investiguer manuellement si on cherche des "hidden gems".
  - SDK communautaires non-Anthropic (Rust, Elixir, etc.) — quelques candidats vus mais en dessous des seuils (forks <100 stars, dernier commit >6 mois). À reconsidérer si un projet émerge.
  - "Anthropic dreaming" : le repo officiel n'expose pas encore de SDK séparé, donc capturé comme framework dans Managed Agents et pas comme entry indépendante côté inbound.
- **Limites assumées** : la `direction = both` reste à 1 entrée (`openskills-cli`). Volontairement strict — la majorité des outils sont clairement uni-directionnels.

## Rappel garde-fous

- Les colonnes `status`, `user_priority`, `is_pinned`, `user_notes` n'ont **pas** été touchées par ce run (préservation des décisions Jean depuis le panel `Veille outils` du cockpit).
- Toute entrée vue ce run a `last_seen = 2026-05-09`. Prochain seuil d'archivage : 2026-08-07 (90 jours).
