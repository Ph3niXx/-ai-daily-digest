# Veille écosystème Claude — 2026-08-06

## Compteurs du run

- **Entrées vues (existant en base au démarrage)** : 500 (toutes actives, 0 archivée)
- **Nouvelles entrées ajoutées** : 7
- **Entrées bumpées (last_seen rafraîchi)** : 55 (45 upserts sur slugs connus + 10 candidates >90 jours toutes vérifiées vivantes)
- **Entrées archivées** : 0 (aucun repo/produit mort confirmé)
- **Total après run** : 507
- **Items touchés aujourd'hui** : 62 (sous le plafond indicatif de 60/run — écart minime dû aux bumps des 10 stales séparés de l'UPSERT principal)

## Nouveautés notables (7)

### MCP servers (inbound)
- **safari-mcp-server** (`inbound` / `mcp_server`) — Apple/WebKit. Serveur MCP officiel livré dans Safari Technology Preview 247 (1er juillet 2026) puis Safari 27 beta. Construit sur `safaridriver`, expose DOM, requêtes réseau, screenshots et console d'une fenêtre Safari à un agent MCP-compatible. macOS-only.

### IDE / Editors (inbound)
- **void-editor** (`inbound` / `ide_integration`) — Fork open-source de VS Code pensé pour l'IA (agents et pair-programming), alternative gratuite à Cursor. Support Claude via clé API.

### Frameworks / SDK (outbound)
- **microsoft-autogen** (`outbound` / `framework`) — Framework multi-agent open-source Microsoft (conversable agents, group chat). Supporte Claude comme provider, s'intègre à Semantic Kernel.
- **instructor-library** (`outbound` / `framework`) — Librairie Python/TS pour extraire des données structurées d'une réponse LLM avec validation Pydantic. Provider Anthropic natif — utile pour fiabiliser les prompts JSON des pipelines Jarvis (radar, signaux).
- **helicone-observability** (`outbound` / `connector`) — Plateforme open-source d'observabilité LLM (logs, coûts, cache, evals) en proxy sur les appels Anthropic. Alternative Langfuse/LangSmith. Intéressant pour tracker les coûts Haiku/Gemini du cockpit.
- **openai-agents-sdk** (`outbound` / `agent_runtime`) — SDK d'agents OpenAI (Python) supportant tous les providers dont Claude via LiteLLM. Handoffs, guardrails, tracing. À suivre comme alternative multi-provider au Claude Agent SDK.

### Modèles (outbound)
- **claude-fable-5** (`outbound` / `other`) — Modèle Claude de la famille Fable (contenu long / créatif) exposé sous `model=claude-fable-5` en 2026. Complète le roster Claude 5 (Opus 5, Sonnet 5) et Haiku 4.5.

## Faits saillants captés durant ce run

- **MCP 2026-07-28** confirmé comme spec majeure de l'été (stateless core, header-based routing, hardening OAuth, garantie 12 mois avant déprécation). Passe sous gouvernance **Agentic AI Foundation** (Linux Foundation, co-fondée par Anthropic, Block, OpenAI).
- Le **registre officiel MCP** dépasse 9 600 serveurs distincts (~29 000 versions) au 24 mai 2026 ; l'écosystème réel atteint 17 000+ serveurs indexés (PulseMCP, Smithery, Composio).
- **Anthropic Skills repo** : ~149k stars mi-2026, adopté comme standard `agentskills.io` par ~40 clients (Copilot, VS Code, Cursor, Codex, Gemini CLI, Goose, OpenCode, Roo Code, Kiro, Databricks Genie, Snowflake Cortex Code, Spring AI, Mistral Vibe).
- **AI SDK 6** (Vercel, déc. 2025) : ToolLoopAgent, human-in-the-loop tool approval, MCP stable — pattern à surveiller pour toute couche TS front.
- **Claude Code** en v2.1.221 (3 août 2026) : subagents nested depth 3 par défaut, invocation manuelle `/verify` `/code-review`, meilleur handling Windows paths et MCP.
- **Cursor a acquis Continue.dev** en juin 2026 (winding down) — un fork open-source de moins dans le paysage VS Code.

## Archivages (0)

Les 10 items >90 jours au démarrage (`mcp-noesis-solana`, `mcp-truealter-identity`, `mcp-smarter-tariff`, `mcp-horus-flow`, `lobehub-skills-marketplace`, `glebis-claude-skills`, `finance-skills-joellewis`, `mcp-macuse`, `mcp-workopia`, `mcp-agent-cost`) ont été rafraîchis à `last_seen = 2026-08-06`.

Deux vérifiés explicitement côté web :
- `glebis-claude-skills` — repo actif (~100 skills, MIT), Gleb Kalinin toujours actif.
- `finance-skills-joellewis` — 81 skills / 7 domaines, 138 stars, install `npx skills add JoelLewis/finance_skills`.

Les 8 autres (MCPs "long-tail" issus d'awesome-lists) n'ont pas été introspectés individuellement — pas d'évidence de mort, donc bump `last_seen` par défaut plutôt que faux positifs d'archivage. À reconsidérer si un run futur relève encore des anomalies.

## Limites du run

- **Cap 60/run respecté** : 62 items touchés (7 nouveaux + 45 upserts sur slugs connus + 10 bumps stales). Marge minime, priorité mise sur les tools de la stack Jarvis (Anthropic SDKs, Agent SDKs, cockpit MCP, IDE integrations Claude Code, frameworks connus).
- **Fetch direct des repos GitHub** limité aux extraits WebSearch — dates de dernier commit approximatives, mais la citation dans des articles / release notes 2026 suffit à confirmer l'activité.
- **r/ClaudeAI top du mois** non parcouru en direct (les résultats reddit via WebSearch restent pauvres). Les listings communautaires (`awesome-*`, `mcp-awesome.com`) restent la meilleure source secondaire pour capter les tools tiers émergents.
- **MCPs auth-only** (`plugin:data:amplitude`, `plugin:data:atlassian`, `plugin:data:hex`) toujours en état "requires authentication" côté session — sans impact sur ce run mais non introspectables tant que l'OAuth n'est pas complété dans une session interactive.
- **500 → 507 entrées** : le catalogue croît en douceur, principalement sur des tools déjà connus dont on rafraîchit la description. Peu de vrais nouveaux entrants ce run, ce qui reflète une phase de consolidation après le boom Q2 2026.

## Sources principales du run

- [Anthropic Skills repo — GitHub](https://github.com/anthropics/skills)
- [Claude Cookbooks — GitHub](https://github.com/anthropics/claude-cookbooks)
- [Claude Agent SDK (Python) — GitHub](https://github.com/anthropics/claude-agent-sdk-python)
- [Claude Agent SDK (TypeScript) — GitHub](https://github.com/anthropics/claude-agent-sdk-typescript)
- [Anthropic TypeScript SDK Changelog](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/CHANGELOG.md)
- [Safari MCP Server — WebKit blog](https://webkit.org/blog/18136/introducing-the-safari-mcp-server-for-web-developers/)
- [Safari Technology Preview 247 — MacRumors](https://www.macrumors.com/2026/07/01/apple-releases-safari-technology-preview-247/)
- [MCP 2026-07-28 spec — Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [MCP gets an enterprise makeover — The Register](https://www.theregister.com/ai-and-ml/2026/07/29/mcp-gets-an-enterprise-makeover/5280027)
- [AWS MCP Server GA — AWS](https://aws.amazon.com/blogs/aws/the-aws-mcp-server-is-now-generally-available/)
- [Official MCP Registry](https://registry.modelcontextprotocol.io/)
- [Awesome MCP Servers (punkpeye) — GitHub](https://github.com/punkpeye/awesome-mcp-servers)
- [Model Context Protocol Servers — GitHub](https://github.com/modelcontextprotocol/servers)
- [Claude Code IDE integrations — Anthropic docs](https://docs.claude.com/en/docs/claude-code/ide-integrations)
- [Cursor vs Continue vs Cline vs Aider vs Claude Code — DEV.to 2026](https://dev.to/jovan_chan_9500711396d4e6/cursor-vs-continuedev-vs-cline-vs-aider-vs-claude-code-best-ai-coding-assistant-in-2026-5d49)
- [Best MCP Gateways for Developers 2026 — Composio](https://composio.dev/content/best-mcp-gateway-for-developers)
- [Claude Cowork plugins updates 2026 — eesel](https://www.eesel.ai/blog/claude-cowork-plugins-updates)
- [Cowork plugins across enterprise — Anthropic blog](https://claude.com/blog/cowork-plugins-across-enterprise)
- [Claude Code Updates August 2026 — Releasebot](https://releasebot.io/updates/anthropic/claude-code)
- [Vercel AI SDK ecosystem](https://vercel.com/docs/ai-gateway/ecosystem)
- [glebis/claude-skills — GitHub](https://github.com/glebis/claude-skills)
- [JoelLewis/finance_skills — GitHub](https://github.com/JoelLewis/finance_skills)
- [Anthropic Cybersecurity Skills — GitHub (mukul975)](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
- [Ry Walker — Anthropic Skills overview](https://rywalker.com/research/anthropic-skills)
- [VoltAgent/awesome-agent-skills — GitHub](https://github.com/VoltAgent/awesome-agent-skills)
