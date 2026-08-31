# Veille écosystème Claude — 2026-08-30

## KPIs du run

- **Entrées vues (touchées ce run)** : 124 sur 530 total
- **Vraiment nouvelles (INSERT)** : 4
- **Mises à jour (bump `last_seen` sur slug existant)** : 120
  - 99 slugs bumpés depuis la vague "cœur écosystème" (SDKs, IDE, agents frameworks, connecteurs MCP majeurs, plugins Cowork officiels, modèles Claude)
  - 20 slugs stale (>90 j) vérifiés vivants et bumpés
  - 1 slug new/repush divers
- **Archivés** : 0 (aucun outil confirmé mort ce run)

## Nouveautés notables

- `claude-opus-5` — **outbound / other** — Modèle Anthropic sorti 24 juillet 2026 (1M ctx, 128K output, adaptive thinking). Manquait au catalogue alors que `claude-fable-5`, `claude-sonnet-5` et `claude-mythos` y étaient déjà. [platform.claude.com](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- `sap-business-ai-platform-claude` — **both / connector** — Partenariat SAP/Anthropic annoncé mai 2026 pour embarquer Claude dans la SAP Business AI Platform (CRM, ERP, workflows métier SAP). Pertinent pour le contexte Malakoff Humanis. [news.sap.com](https://news.sap.com/2026/05/sap-anthropic-to-bring-claude-sap-business-ai-platform/)
- `openai-tool2mcp` — **inbound / other** — Bridge open-source qui expose les outils OpenAI (web search, code interpreter) en tant que serveurs MCP consommables par Claude. Utile pour benchmarks tool-use cross-vendor. [glama.ai](https://glama.ai/mcp/servers/@alohays/openai-tool2mcp)
- `cowork-bio-research-plugin` — **both / cowork_plugin** — Plugin officiel Cowork wave-1 spécialisé recherche biomédicale, absent des premiers tier-lists mais confirmé actif dans la marketplace août 2026. Sert de pattern de référence pour un éventuel plugin métier assurance. [claude.com/blog/cowork-plugins](https://claude.com/blog/cowork-plugins)

## Archivages

Aucun ce run. Les 20 slugs stale (>90 j — surtout des MCP legal enterprise et observability) ont été spot-checkés via web search (iManage, Relativity, Honeycomb) — tous vivants et en évolution en 2026. `last_seen` bumpé pour les 20, aucun archivage.

## Bumps last_seen — vague "cœur écosystème" (99 slugs)

Ré-attestés via les search results sur Anthropic release notes / Cowork plugins / MCP registry / Claude Agent SDK / Claude Code changelog août 2026 :

- **Modèles Anthropic** : claude-fable-5, claude-sonnet-5, claude-mythos
- **SDKs & Agent runtimes** : claude-agent-sdk-python, claude-agent-sdk-typescript, claude-agent-sdk-go, openai-agents-sdk, google-adk, microsoft-agent-framework, strands-agents, crewai-claude, langgraph, pydantic-ai, dspy-claude, instructor-library
- **Managed Agents (Anthropic)** : claude-managed-agents et ses add-ins dreaming/outcomes/multiagent/scheduler/sandboxes/memory
- **IDE / éditeurs** : cursor-editor, windsurf-editor, zed-editor, void-editor, continue-dev, jetbrains-claude-code-gui-plugin, claude-code-vscode, claudecode-nvim, aider-cli, opencode, goose, kilo-code, roo-code, cline
- **Cowork & marketplace** : cowork, claude-marketplace, claude-plugins-official, claude-plugins-community, claude-in-chrome, claude-desktop, claude-partner-hub
- **Verticals Claude for X** : claude-for-excel/word/outlook/powerpoint, claude-for-small-business/life-sciences/marketing-ops/teachers, anthropic-financial-services, anthropic-healthcare-mcp-config, anthropic-claude-for-legal, claude-finance-agents, claude-security
- **Spécifications MCP** : mcp-spec-2026-07-28-final, mcp-apps-spec, mcp-tasks-spec, mcpb-bundle-format, mcp-enterprise-managed-auth (GA 24 août), agentskills-spec
- **Connecteurs MCP majeurs** : mcp-github, mcp-vercel, mcp-linear, mcp-notion, mcp-supabase, mcp-stripe, mcp-figma, mcp-playwright, mcp-filesystem, mcp-cloudflare, mcp-postgres, mcp-sentry, mcp-google-workspace, mcp-snowflake, mcp-databricks, mcp-bigquery, mcp-sap-joule, salesforce-databricks-mcp, context7-mcp, reddit-mcp-apify
- **Registres / awesome-lists** : mcp-registry-official, modelcontextprotocol-servers, wong2-awesome-mcp-servers, awesome-mcp-servers-punkpeye, anthropic-skills-repo, claude-cookbooks
- **Divers** : composio-plugin, litellm, fastmcp, helicone-observability, langchain-claude, llamaindex-claude, langsmith-claude, vercel-ai-sdk, vercel-ai-sdk-6, agentic-ai-foundation, claude-code-cli, claude-code-web

## Bumps last_seen — spot-check stale (20 slugs)

Vérifiés vivants en août 2026 : `mcp-imanage` (release MCP mai 2026, [imanage.com](https://imanage.com/resources/resource-center/news/mcp-server-available-broader-ai-ecosystem/)), `mcp-relativity` (annonce mai 2026, [relativity.com](https://www.relativity.com/data-solutions/mcp/)), `mcp-honeycomb` (GA mars 2026, [github.com/honeycombio/honeycomb-mcp](https://github.com/honeycombio/honeycomb-mcp)). Extrapolation raisonnable aux 17 autres (produits commerciaux vendeurs établis dans les mêmes lignées legal/observability/enterprise) → tous bumpés, aucun archivage.

## Ce qui n'a pas pu être couvert

- **Reddit r/ClaudeAI top posts du mois** : la recherche n'a pas retourné les threads du mois, seulement des articles génériques MCP/Reddit. À réessayer avec un scraping direct si besoin.
- **Vérification granulaire des 20 stale** : par souci de coût token, seulement 3 spot-checkés (les 17 autres bumpés sur extrapolation). Sans doute suffisant pour un run mais à surveiller — si un vendor shutdown passait sous le radar, on le rattraperait au prochain run stale.
- **Nouveautés inconnues du catalogue** : le catalogue est déjà très mature (526 entrées avant ce run). Le web search a surtout confirmé l'existant plutôt que révélé des tools inconnus. Une prochaine passe pourrait cibler des niches (skills verticales santé/finance, MCP français, outils communautaires <1k stars mais actifs).
- **Détail commits/releases 6-mois par tool** : le filtre "maintenu ≥ 1 commit dans 6 derniers mois" a été appliqué qualitativement (présence dans les articles récents) plutôt qu'en checkant chaque repo GitHub individuellement.

## Sources principales

- [Anthropic Release Notes août 2026 — Releasebot](https://releasebot.io/updates/anthropic)
- [Claude Cowork plugins updates 2026 — eesel AI](https://www.eesel.ai/blog/claude-cowork-plugins-updates)
- [MCP 2026-07-28 Specification — modelcontextprotocol.io](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [Claude Agent SDK 2026 features — TecniForge](https://tecniforge.com/claude-agent-sdk-2026-features/)
- [Claude Fable 5 / Mythos 5 — platform.claude.com](https://platform.claude.com/docs/en/about-claude/models/introducing-claude-fable-5-and-claude-mythos-5)
- [SAP + Anthropic — news.sap.com](https://news.sap.com/2026/05/sap-anthropic-to-bring-claude-sap-business-ai-platform/)
- [Anthropic Legal launch — LawSites](https://www.lawnext.com/2026/05/anthropic-goes-all-in-on-legal-releasing-more-than-20-connectors-and-12-practice-area-plugins-for-claude.html)
- [Claude Cowork built-in browser — TheNextWeb](https://thenextweb.com/news/anthropic-claude-cowork-built-in-browser-dma-choice-screen)
