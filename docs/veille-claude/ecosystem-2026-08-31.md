# Veille écosystème Claude — 2026-08-31

## KPIs du run

- **Entrées vues (touchées ce run)** : 106 sur 535 total
- **Vraiment nouvelles (INSERT)** : 5
- **Mises à jour (bump `last_seen` sur slug existant)** : 100
  - 99 slugs bumpés depuis la vague "cœur écosystème" (SDKs, IDE, agents frameworks, connecteurs MCP majeurs, plugins Cowork officiels, modèles Claude)
  - 1 slug stale (>90 j) refresh confirmé vivant
- **Archivés** : 0 (aucun outil confirmé mort ce run)

## Nouveautés notables

- `mcp-zoom` — **inbound / mcp_server** — Zoom MCP Connector officiel lancé avril 2026, expose summaries/transcripts/recordings/scheduling à Claude Cowork et Claude Code. Directement pertinent pour le contexte RTE MH (extraction actions PI Planning, retro post-cérémonies). [news.zoom.com](https://news.zoom.com/zoom-meeting-intelligence-in-claude/)
- `cloudflare-agents-sdk` — **outbound / agent_runtime** — Cloudflare Agents SDK v0.20.0 (juillet 2026) supporte le spec MCP 2026-07-28 stateless dès day-zero, déployé en prod avec Sentry et Linear. Permet d'héberger un MCP server dans un simple Worker sans Durable Object. [developers.cloudflare.com](https://developers.cloudflare.com/changelog/post/2026-07-27-agents-sdk-v0.20.0-mcp-sdk-v2/)
- `skillflow-mcp` — **inbound / mcp_server** — Marketplace communautaire de skills exposé en MCP, alternative aux marketplaces officiels ; cible Claude, Cursor, Copilot, Gemini CLI. [glama.ai](https://glama.ai/mcp/servers/rafsilva85/skillflow-mcp-server)
- `skill-mcp-fkesheh` — **inbound / mcp_server** — MCP meta qui permet à Claude de créer/éditer/exécuter ses propres skills locaux (~/.skill-mcp/skills) depuis une conversation. Intéressant pour un workflow d'itération skills sans quitter le chat. [glama.ai](https://glama.ai/mcp/servers/@fkesheh/skill-mcp/inspect)
- `claude-skills-mcp-loader` — **inbound / mcp_server** — Loader (K-Dense-AI) qui charge des Agent Skills directement depuis des repos GitHub (folders skills ou plugins), avec parsing auto. Distinct du repo `claude-scientific-skills-kdense` déjà catalogué. [glama.ai](https://glama.ai/mcp/servers/K-Dense-AI/claude-skills-mcp)

## Archivages

Aucun ce run. Le seul slug stale (>90 j) — `mcp-server-dev-plugin` (last_seen 2026-06-01) — a été spot-checké : le repo parent `anthropics/claude-plugins-official` est très actif (marketplace officielle a franchi 200 plugins en août 2026) et le plugin est toujours shippé. `last_seen` refresh, pas d'archivage.

## Bumps last_seen — vague "cœur écosystème" (99 slugs)

Ré-attestés via les search results Anthropic release notes / Cowork plugins / MCP registry / Claude Agent SDK / Claude Code changelog / marketplace au 200+ plugins d'août 2026 :

- **Modèles Anthropic** : claude-fable-5, claude-sonnet-5, claude-opus-5
- **SDKs officiels** : anthropic-sdk-python, anthropic-sdk-typescript, anthropic-sdk-go, anthropic-sdk-ruby, anthropic-sdk-java, anthropic-sdk-csharp, anthropic-sdk-php
- **Agent SDKs & runtimes** : claude-agent-sdk-python, claude-agent-sdk-typescript, claude-agent-sdk-go, openai-agents-sdk, google-adk, microsoft-agent-framework, microsoft-autogen, strands-agents, crewai-claude, langgraph, mastra, pydantic-ai, dspy-claude, dspy-3-1, instructor-library, agno-framework, semantic-kernel-claude, haystack-claude
- **Claude Code surfaces** : claude-code-cli, claude-code-vscode, claude-code-jetbrains, claude-code-desktop, claude-code-web, claude-code-action
- **IDE & éditeurs** : cursor-editor, cursor-cli, windsurf-editor, zed-editor, void-editor, continue-dev, aider-cli, opencode, goose, kilo-code, roo-code, cline, antigravity-ide
- **Cowork & marketplace** : cowork, claude-plugins-official, claude-plugins-community, knowledge-work-plugins, claude-in-chrome, claude-desktop, claude-tag, mcp-server-dev-plugin
- **Verticals Claude for X** : claude-for-excel, claude-for-word, claude-for-powerpoint, claude-for-outlook
- **Spécifications MCP** : mcp-spec-2026-07-28-final, mcp-spec-2026-07-28-rc, mcp-spec-stateless-core, mcp-2026-roadmap, mcp-apps-spec, mcp-tasks-spec
- **Connecteurs MCP majeurs** : mcp-github, mcp-slack, mcp-notion, mcp-supabase, mcp-linear, mcp-stripe, mcp-figma, mcp-canva, mcp-atlassian, mcp-gmail, mcp-google-calendar, mcp-google-drive, mcp-google-workspace, mcp-microsoft-365, mcp-cloudflare, mcp-cloudflare-bindings, mcp-vercel, mcp-playwright, mcp-chrome-devtools, mcp-postgres, mcp-bedrock-agentcore
- **Registres / awesome-lists** : modelcontextprotocol-servers, awesome-mcp-servers-punkpeye, mcp-registry-official, smithery-registry, glama-mcp-registry, anthropic-skills-repo, claude-cookbooks
- **Frameworks & gateways** : langchain-claude, llamaindex-claude, vercel-ai-sdk, vercel-ai-sdk-6, vercel-ai-gateway, litellm, openrouter-claude-provider
- **Skills officiels** : skill-creator, skill-pdf, skill-office, skill-frontend-design, skill-algorithmic-art, skill-claude-api

## Ce qui n'a pas pu être couvert

- **Reddit r/ClaudeAI top posts du mois** : la recherche a retourné surtout des articles / substacks, pas les threads Reddit natifs. Le scraping direct reste bloqué par les policies web-fetch. Contournement possible : passer par un connecteur reddit-mcp-apify lors d'un run futur.
- **Marketplace 200+ plugins granulaire** : la marketplace officielle a franchi 200 plugins en août 2026 mais l'audit individuel des nouveaux plugins post-mai 2026 n'a pas été fait ce run (aurait dépassé le cap de 60). À traiter en spécial dans un run dédié "cowork-plugins" ciblé.
- **Verrouillage commits/releases 6-mois par tool** : filtre "maintenu ≥ 1 commit dans 6 derniers mois" appliqué qualitativement (présence dans les articles récents et les changelogs Anthropic/Cloudflare/Zoom) plutôt qu'en vérifiant chaque repo GitHub individuellement.
- **Marketplace Cowork sous-catégories** : les marketplaces spécialisés (Life Sciences, Financial Services, Legal) sont couverts par slugs macro déjà catalogués mais leurs plugins internes ne sont pas éclatés en slugs individuels.

## Sources principales

- [Anthropic Release Notes août 2026 — Releasebot](https://releasebot.io/updates/anthropic)
- [MCP 2026-07-28 Specification — modelcontextprotocol.io](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [MCP roadmap 22 août 2026 — modelcontextprotocol.io](https://blog.modelcontextprotocol.io/posts/mcp-roadmap/)
- [Bringing MCP 2026-07-28 to Claude — claude.com](https://claude.com/blog/bringing-mcp-2026-07-28-to-claude)
- [Zoom Meeting Intelligence in Claude — news.zoom.com](https://news.zoom.com/zoom-meeting-intelligence-in-claude/)
- [Cloudflare Agents SDK v0.20.0 MCP support — developers.cloudflare.com](https://developers.cloudflare.com/changelog/post/2026-07-27-agents-sdk-v0.20.0-mcp-sdk-v2/)
- [Claude Cowork plugin marketplace — claude.com/blog/cowork-plugins](https://claude.com/blog/cowork-plugins)
- [Claude for Microsoft Office 2026 — buildfastwithai](https://www.buildfastwithai.com/blogs/claude-ai-microsoft-office-integration)
- [Claude Code IDE integrations 2026 — Fastio](https://fast.io/resources/claude-code-ide-extensions-guide/)
- [Anthropic skills repo — github.com/anthropics/skills](https://github.com/anthropics/skills)
- [MCP servers ecosystem — punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
