# Veille écosystème Claude — 2026-06-11

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées vues ce run | 114 |
| Vraiment nouvelles (insert) | 7 |
| Mises à jour (slug existant bumped) | 107 |
| Archivées | 0 (aucune entrée > 90 jours dormante) |
| Total catalogue | 425 (tous `active`) |

> Snapshot initial : la table contenait déjà ~418 entrées toutes encore `active` et toutes vues il y a moins de 90 jours (la plus ancienne `last_seen` était 2026-05-01). Pas de candidat à l'archivage doux.

## Nouveautés notables (7)

1. **exa-mcp** *(inbound · mcp_server · Exa Labs)* — Serveur MCP officiel pour la recherche sémantique Exa. Devenu le serveur de recherche le plus utilisé en 2026 selon plusieurs directories (PulseMCP, mcpbundles), supérieur à Brave Search pour les requêtes en langage naturel. → [github.com/exa-labs/exa-mcp-server](https://github.com/exa-labs/exa-mcp-server)
2. **perplexity-mcp** *(inbound · mcp_server · Perplexity)* — Serveur MCP officiel wrappant l'API Perplexity Sonar. Retourne des réponses synthétisées avec citations, utile pour les vérifs factuelles. → [docs.perplexity.ai](https://docs.perplexity.ai/docs/getting-started/integrations/mcp-server)
3. **microsoft-agent-framework** *(outbound · framework · Microsoft)* — GA le 3 avril 2026, fusionne Semantic Kernel + AutoGen dans `Microsoft.Agents.AI`. Supporte Claude via providers Anthropic. Semantic Kernel standalone est de facto déprécié. → [microsoft/agent-framework](https://github.com/microsoft/agent-framework)
4. **mcp-bundles** *(inbound · connector · MCPBundles)* — Nouveau directory MCP (mcpbundles.com), compétiteur de PulseMCP et Glama, focus bundles curated pour Claude Code / Cursor / Windsurf. → [mcpbundles.com](https://www.mcpbundles.com/)
5. **notion-custom-agents** *(both · connector · Notion)* — Notion 3.3 (févr. 2026) : agents autonomes 24/7 sur triggers/schedules, connectent à Slack, Linear, Figma, HubSpot via MCP. Direction `both` car ils consomment du MCP et peuvent déclencher des flux externes. → [notion.com/product/agents](https://www.notion.com/product/agents)
6. **linear-asks-slack-agent** *(outbound · connector · Linear)* — Shippé le 21 mai 2026 : agent Linear invocable via `@Linear Asks` dans Slack pour transformer un thread en issue Linear. Pertinent côté mission RTE Malakoff (capture rapide d'engagements). → [linear.app/changelog](https://linear.app/changelog)
7. **claude-partner-hub** *(outbound · other · Anthropic)* — Directory officiel partner network Anthropic annoncé en juin 2026 (Services Track inclus). Référence si benchmark de partenaires Claude consulting/intégration. → [anthropic.com/partners](https://www.anthropic.com/partners)

## Mises à jour notables (sélection)

Tous les SDKs et IDE intégrations principales (Anthropic SDK Python/TS/Go, Claude Agent SDK Python/TS/Go, Claude Code CLI / VS Code / JetBrains / Xcode, Cursor, Continue, Cline, Aider, Windsurf, Zed) sont confirmés actifs et bumpés à 2026-06-11.

Côté Anthropic, les onglets Managed Agents (`dreaming`, `multiagent`, `sandboxes`, `webhooks`, `memory`, `outcomes`, `addins`) et `mcp-tunnels` ont vu des annonces concrètes à Code with Claude London (19-20 mai 2026) puis des shipments en juin → bump.

Côté MCP : Supabase, GitHub, Slack, Asana v2, Linear, Notion (officiel + suekou), Playwright, Filesystem, Context7, Brave Search, Stripe, Figma, Vercel, Google Calendar/Drive/Workspace, Postgres, Cloudflare, Sentry, HubSpot, Salesforce, Docusign, Atlassian, Microsoft 365, Amplitude, BigQuery — tous confirmés maintenus.

Marketplaces & registres (claudemarketplaces, glama-mcp-registry, smithery-registry, pulsemcp, mcp-registry-official, awesome-mcp-servers-punkpeye, wong2-awesome-mcp-servers, best-of-mcp-servers-tolkonepiu, xiaolai-claude-plugin-marketplace, wshobson-claude-agents, composio-tool-router, rube-mcp, klavis-ai) ont tous une activité récente → bump.

Frameworks & SDKs tiers (LangChain, LangGraph, LlamaIndex, Semantic Kernel, DSPy, CrewAI, Pydantic AI, Haystack, Vercel AI SDK v5/v6, Vercel AI Gateway) tous toujours en développement actif → bump.

## Archivages

Aucun. Toutes les entrées `active` ont une `last_seen` ≥ `CURRENT_DATE - 90j`. La plus ancienne entrée à `last_seen` = 2026-05-01 (mcp-firebase, skillmatic-awesome-agent-skills) reste sous le seuil.

## Limites assumées sur ce run

- Cap de 60 outils respecté côté nouveautés (7 ajouts seulement, conservateur car le catalogue est déjà très dense à 425 entrées).
- Le bump `last_seen` a porté sur ~107 slugs avec evidence directe d'activité dans les sources fetchées ce jour. Les ~300 autres slugs `active` du catalogue restent à leur dernière `last_seen` (entre 2026-05-01 et 2026-06-09), tous sous le seuil 90j — pas d'action requise.
- r/ClaudeAI : pas de signal exploitable depuis ce contexte (search n'a renvoyé aucun résultat ciblé pour la requête "top du mois").
- Pas exploré ce run, à investiguer : nouveautés MCP côté gateways enterprise (Kong AI Gateway, MintMCP, TrueFoundry), bots Discord/Teams Claude-natifs, intégrations Zapier/Make agentic.
- Source `agentskills.io` confirmée comme standard cross-platform (Claude Code, Codex CLI, Gemini CLI, GitHub Copilot, Cursor) — déjà couverte par les slugs `agentskills-spec` et `agents-md-spec`, donc pas de doublon créé.

## Sources

- [anthropics/skills (GitHub)](https://github.com/anthropics/skills)
- [Claude Code Updates - June 2026](https://releasebot.io/updates/anthropic/claude-code)
- [Anthropic Release Notes June 2026](https://releasebot.io/updates/anthropic)
- [claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [Code with Claude London - May 19, 2026](https://claude.com/code-with-claude/london)
- [Anthropic Code with Claude announcements (InfoQ)](https://www.infoq.com/news/2026/05/code-with-claude/)
- [Apple Xcode + Claude Agent SDK](https://www.anthropic.com/news/apple-xcode-claude-agent-sdk)
- [Notion Custom Agents](https://www.notion.com/product/agents)
- [Linear Asks via Slack](https://www.pravinkumar.co/blog/notion-custom-agents-linear-asks-slack-saas-gtm-2026)
- [Exa MCP Server](https://github.com/exa-labs/exa-mcp-server)
- [Perplexity MCP Server](https://docs.perplexity.ai/docs/getting-started/integrations/mcp-server)
- [Microsoft Agent Framework GA](https://turion.ai/blog/langchain-vs-llamaindex-vs-semantic-kernel-2026/)
- [MCPBundles directory](https://www.mcpbundles.com/blog/best-mcp-servers)
- [agentskills.io specification](https://agentskills.io/specification)
