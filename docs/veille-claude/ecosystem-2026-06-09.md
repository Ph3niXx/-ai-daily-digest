# Veille écosystème Claude — 2026-06-09

## Compteurs

- **Entrées vues / refresh confirmé** : 60 (cap atteint)
- **Ajoutées (vraiment nouvelles)** : 3
- **Mises à jour (last_seen bumpé sur slug existant)** : 57
- **Archivées** : 0 (aucune entrée n'est restée sans signal > 90 jours)
- **Catalogue total après run** : 418 actives, 0 archivées

## Nouveautés notables

### `plugin-feature-dev` — inbound · cowork_plugin
Plugin officiel Anthropic pour Claude Code, orchestre un workflow 7 phases (discovery, exploration codebase, clarifying Qs, archi design, implémentation, revue qualité, summary) en mobilisant trois sous-agents (code-explorer, code-architect, code-reviewer). Plus de 223 000 installs au 1er juin 2026, plugin le plus populaire du marketplace officiel. Cohérent avec la culture "spec d'abord" du projet — pertinent pour les évolutions non triviales côté Jarvis ou pipelines.

### `plugin-code-review` — inbound · cowork_plugin
Plugin officiel Anthropic. Lance cinq agents Sonnet en parallèle sur une PR (compliance CLAUDE.md, détection bugs, contexte git history, revue commentaires PR précédents, vérification commentaires code). Scoring confidence 0-100 avec seuil par défaut 80 pour limiter les faux positifs. Tunable via CLAUDE.md ou REVIEW.md à la racine du repo. Particulièrement aligné avec la règle cardinale CLAUDE.md du projet — pourrait servir de garde-fou systématique sur chaque PR.

### `claude-foundation-models-swift` — outbound · sdk
Package Swift officiel Anthropic publié en juin 2026 pour le framework Apple Foundation Models. Permet aux apps natives iOS 27 / iPadOS 27 / macOS 27 / visionOS 27 / watchOS 27 de hand-off vers Claude (multi-step reasoning, code gen, web search, code execution, streaming SwiftUI). Pas d'applicabilité directe au cockpit web actuel mais intéressant pour un futur compagnon mobile Jarvis.

## Confirmations (last_seen bumpé)

Refresh confirmé sur 57 entrées clés du catalogue, structurées en grands paquets :

- **Repos officiels Anthropic actifs** : `anthropic-skills-repo`, `claude-cookbooks`, `claude-code-action`, `claude-code-cli`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `anthropic-sdk-python`, `anthropic-sdk-typescript`, `anthropic-sdk-go`, `claude-plugins-official`, `claude-code-vscode`, `claude-code-jetbrains`, `anthropic-claude-for-legal`.
- **Claude Managed Agents (lancé public beta avril 2026)** : `claude-managed-agents`, `claude-managed-agents-multiagent`, `claude-managed-agents-dreaming`, `claude-managed-agents-sandboxes` — Anthropic continue d'empiler des features (dreaming, multiagent, MCP tunnels, sandboxes).
- **Listings & marketplaces** : `awesome-mcp-servers-punkpeye`, `awesome-mcp-clients-punkpeye`, `awesome-claude-skills-travisvn`, `composio-awesome-claude-skills`, `voltagent-awesome-claude-code-subagents`, `voltagent-awesome-skills`, `antigravity-awesome-skills`, `buildwithclaude-marketplace`.
- **Subagent collections actives** : `0xfurai-claude-code-subagents`, `lst97-claude-code-sub-agents`, `wshobson-claude-agents`, `rshah515-claude-code-subagents`, `claude-code-sub-agent-collective`.
- **MCP servers enterprise confirmés** : `mcp-supabase`, `mcp-github`, `mcp-notion`, `mcp-notion-suekou`, `mcp-salesforce`, `mcp-salesforce-data-360` (lancé Developer Preview mai 2026), `mcp-salesforce-hosted`, `mcp-hubspot`, `mcp-docusign`, `mcp-lexisnexis`, `mcp-everlaw`, `mcp-thomson-reuters-cocounsel`, `aws-mcp-server` (GA mai 2026).
- **Frameworks & SDKs tiers** : `langchain-claude`, `langgraph` (LangChain Deep Agents lancé avril 2026), `vercel-ai-sdk`, `vercel-ai-sdk-6`, `vercel-ai-gateway`, `ai-sdk-provider-claude-code`.
- **IDE & CLI** : `cursor-editor`, `cursor-cli`.
- **MCP nouveautés mai 2026 (déjà cataloguées)** : `context7-mcp`, `composio-tool-router` (GA mai 2026), `rube-mcp`, `agent-commerce-mcp`, `roots-by-benda`, `mcpsafe-scanner`.

## Archivage

Aucun candidat ce run. La requête `status='active' AND last_seen < CURRENT_DATE - INTERVAL '90 days'` retourne 0 ligne — le rythme quotidien d'exécution garde l'ensemble du catalogue frais. Le seuil sera utile quand un repo cessera vraiment d'être confirmé pendant un trimestre complet.

## Non couvert / limites

- **Cap 60 outils atteint** : le scope du run a délibérément privilégié les nouveautés Anthropic (plugins officiels, Foundation Models Swift) + les confirmations d'activité sur les piliers du catalogue. Une dizaine d'items vus en passant (notamment des subagent collections à <100 stars) ont été volontairement écartés par le filtre qualité.
- **Sources non couvertes / paywall** : r/ClaudeAI top du mois n'a été vu qu'à travers les agrégateurs (substack/medium tier). Pas d'accès direct au feed Reddit ce run.
- **Slack / Discord / Linear / Notion bots Claude-powered** : pas encore d'intégration native officielle Anthropic dédiée à Slack au-delà du MCP server (`mcp-slack`, déjà au catalogue). Notion 3.3 (février 2026) intègre des AI agents via MCP — déjà tracé indirectement via `mcp-notion` officiel.
- **Repos privés / enterprise gated** : Claude for Legal regroupe 20+ connecteurs MCP dont plusieurs sont déjà au catalogue séparément (`mcp-thomson-reuters-cocounsel`, `mcp-lexisnexis`, `mcp-docusign`, `mcp-everlaw`). Pas de nouveau slug "claude-for-legal-suite" créé pour éviter un doublon avec `anthropic-claude-for-legal` déjà présent.
- **/radio, /cd, --safe-mode** : commandes built-in Claude Code (pas des outils tiers) — pas ajoutées au catalogue (ce ne sont pas des entités installables).

## Sources principales

- [anthropics/skills (GitHub)](https://github.com/anthropics/skills)
- [anthropics/claude-cookbooks (GitHub)](https://github.com/anthropics/claude-cookbooks)
- [anthropics/claude-plugins-official (GitHub)](https://github.com/anthropics/claude-plugins-official)
- [anthropics/claude-code-action (GitHub)](https://github.com/anthropics/claude-code-action)
- [Claude Code release notes — Releasebot juin 2026](https://releasebot.io/updates/anthropic/claude-code)
- [Feature Dev plugin (Anthropic)](https://claude.com/plugins/feature-dev)
- [Code Review plugin (Anthropic)](https://claude.com/plugins/code-review)
- [Claude for Apple Foundation Models](https://claude.com/blog/claude-for-foundation-models)
- [punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- [Salesforce Data 360 MCP (Developer Preview)](https://developer.salesforce.com/blogs/2026/05/introducing-the-data-360-mcp-server-developer-preview)
- [Composio Tool Router](https://composio.dev/blog/introducing-tool-router-(beta))
- [Claude for Legal — LawSites](https://www.lawnext.com/2026/05/anthropic-goes-all-in-on-legal-releasing-more-than-20-connectors-and-12-practice-area-plugins-for-claude.html)
- [Claude Managed Agents updates — InfoQ](https://www.infoq.com/news/2026/05/code-with-claude/)
- [LangChain Deep Agents vs Claude Managed Agents — Anablock](https://www.anablock.com/blog/langchain-deep-agents-vs-claude-managed-agents)
- [Vercel AI SDK Claude Code/Agent SDK gateway](https://vercel.com/docs/ai-gateway/coding-agents/claude-code)
