# Veille écosystème Claude — 2026-06-01

## Statistiques du run

- **Total catalogue** : 405 outils (status = active)
- **Vus / refreshés ce run** : 60 outils ciblés (UPSERT — bump `last_seen` + descriptions enrichies)
- **Nouveaux ajouts (slug nouveau)** : 0
- **Mises à jour (slug existant)** : 60
- **Archivés** : 0 (aucun item > 90 jours, catalogue récent — `last_seen` min = 2026-05-01)

Le catalogue est volumineux et déjà bien couvert (constitué très récemment, entre 2026-05-01 et 2026-05-31). Ce run a donc fait du **refresh ciblé** sur la couche cœur (skills Anthropic, MCP officiels, plugins Cowork, SDKs, IDEs, frameworks, marketplaces) plutôt que de la chasse au nouveau slug. Cap de 60 outils respecté.

## Nouveautés notables ré-épinglées (refresh avec contenu 2026)

### Anthropic core (inbound / outbound officiels)

- **anthropic-skills-repo** (skill) — Repo Agent Skills, ~73k stars, dernière màj 2026-05-29. Format Agent Skills désormais standard ouvert adopté par OpenAI Codex CLI, Cursor, Gemini CLI, GitHub Copilot.
- **claude-cookbooks** (other / outbound) — 44.1k stars, 166 PRs ouvertes, 77 contributeurs. Cookbooks managed-agents et advanced caching en cours.
- **claude-agent-sdk-python** (sdk) — v0.2.87 publiée 2026-05-23 : Task tools (TaskCreate/Update/Get/List), `EffortLevel` type, MCP servers connectent en arrière-plan, billing Agent SDK séparé à partir du 2026-06-15.
- **claude-agent-sdk-typescript** (sdk) — Pendant TS, embarque le CLI Claude Code.
- **claude-code-cli** (agent_runtime) — Mai 2026 : plugin marketplace first-class, `/skills` et `/plugin` avec filtre temps réel type-to-filter.
- **claude-managed-agents** (agent_runtime) — Service hosted Anthropic, $0.08/h actif.
- **claude-managed-agents-dreaming** (other / outbound) — *Nouveau pattern mai 2026* : revue des sessions passées pour patterns d'auto-amélioration. Pertinent pour le nightly_learner de Jarvis.
- **claude-managed-agents-multiagent** (other / outbound) — *Nouveau pattern mai 2026* : lead agent + spécialistes en parallèle sur FS partagé. Pertinent pour les pipelines weekly (signals/veille/audit) de Jarvis.
- **mcp-tunnels** (other / inbound) — *Nouveau mai 2026* : agents Managed Agents joignent des MCP en réseau privé sans exposition publique.

### MCP — spec et registres

- **mcp-spec-2026-07-28-rc** (other / inbound) — *Release candidate verrouillée 2026-05-21*, spec finale 2026-07-28. Core stateless, Extensions framework, Tasks, MCP Apps, OAuth/OIDC hardening, deprecation policy formelle.
- **mcp-2026-roadmap** (other / inbound) — Roadmap publique alignée sur le RC.
- **mcp-registry-official**, **modelcontextprotocol-servers**, **awesome-mcp-servers-punkpeye** (inbound) — Trois points d'entrée pour la discovery (registry officiel, repo de référence, awesome list 200+ entrées).

### MCP servers à forte pertinence Malakoff Humanis / Train Vente

- **mcp-atlassian** (mcp_server / inbound) — Jira + Confluence officiel, migration SSE → Streamable HTTP en cours mai 2026. **Top pertinence pour le suivi engagements SAFe.**
- **mcp-salesforce-data-360** (mcp_server / inbound) — *Developer Preview lancée mai 2026*. Consolide ~200 ops REST derrière 3 facade tools. **Top pertinence pour le périmètre CRM Vente.**
- **mcp-microsoft-365** (mcp_server / inbound) — Outlook, Teams, OneDrive, SharePoint. Pertinence forte si stack Microsoft chez MH.
- **mcp-github** (mcp_server / inbound) — Support des issue fields mai 2026 derrière feature flag.
- **mcp-supabase** (mcp_server / inbound) — Backbone direct du projet, utilisé pour ce run.
- **mcp-linear**, **mcp-asana**, **mcp-hubspot**, **mcp-sentry**, **mcp-neon**, **mcp-vercel** — Tous remote-ready en 2026, lancements progressifs janvier-avril.

### Plugins Cowork / Claude Code

- **claude-plugins-official** (cowork_plugin / inbound) — 101 plugins officiels en mars 2026. feature-dev = 89k+ installs.
- **plugin-frontend-design**, **plugin-create**, **plugin-connect-apps**, **mcp-server-dev-plugin** (cowork_plugin / inbound) — Plugins officiels Anthropic clés.
- **knowledge-work-plugins** (cowork_plugin / inbound) — 23 plugins officiels orientés non-dev (productivity, sales, marketing, finance, legal, support, PM, biology). Connecteurs ajoutés février 2026 : Google Calendar/Drive/Gmail, DocuSign, Apollo, Clay, Outreach, Similarweb, MSCI, LegalZoom, FactSet, WordPress, Harvey.

### IDE / runtimes alternatifs

- **zed-editor** (ide_integration / outbound) — External Agents via ACP, co-lance le **ACP Agent Registry** avec JetBrains en janvier 2026 (Claude Code, Gemini CLI, Codex, OpenCode, Goose, Cline, Auggie disponibles).
- **cursor-editor**, **cursor-cli**, **windsurf-editor**, **continue-dev**, **aider-cli**, **cline**, **opencode**, **goose**, **roo-code**, **kilo-code** — Stack IDE/CLI alternative refreshed.

### Frameworks d'orchestration

- **langchain-claude** (framework / outbound) — langchain-anthropic 1.4.0 d'avril 2026. Memory tool + web search natifs.
- **llamaindex-claude**, **haystack-claude**, **dspy-claude**, **crewai-claude**, **langgraph**, **mastra**, **vercel-ai-sdk**, **vercel-ai-gateway** — Stack frameworks couverte (Python + TS).
- **agent-client-protocol** (other / outbound) — Standard ACP, co-lancé Zed + JetBrains janvier 2026.
- **ag-ui-protocol** — Standard UI agentique émergent.

### Skills / marketplaces / directories

- **agentskills-spec** (other / inbound) — Spec ouverte SKILL.md officialisée décembre 2025.
- **skillsmp**, **claudemarketplaces-directory**, **buildwithclaude-marketplace**, **claude-marketplace** — Discovery (76 marketplaces, 1203+ plugins recensés côté communauté).
- **voltagent-awesome-claude-code-subagents** (other / inbound) — 154+ subagents Claude Code, 10 catégories.
- **wshobson-claude-agents** (other / inbound) — Marketplace multi-harness : 83 plugins, 191 agents, 155 skills, 102 commands.
- **anthropic-cybersecurity-skills** (skill / inbound) — 754 skills cyber structurées (MITRE ATT&CK, NIST CSF 2.0, etc.).

### Apps Claude orientées non-dev

- **claude-in-chrome**, **claude-for-excel**, **cowork** — Les trois surfaces produits non-dev d'Anthropic refreshed.

## Archivages

**Aucun item archivé ce run.** Le catalogue a été constitué entièrement entre 2026-05-01 et 2026-05-31 ; le seuil de 90 jours n'est pas atteignable avant ~2026-08-01. Les premiers archivages potentiels apparaîtront dans le run de début août 2026.

## Notes / limites couvertes

- **Cap respecté** : 60 outils ré-épinglés ce run (politique catalogue, pas veille temps réel).
- **Stratégie de refresh** : priorité aux items à fort signal 2026 (managed agents dreaming/multiagent, MCP tunnels, MCP spec RC, Salesforce Data 360 preview, Atlassian remote migration) plutôt qu'au refresh tournant aveugle. Les 345 autres slugs gardent leur `last_seen` du run de mai et seront ré-évalués lors des prochains runs.
- **Aucun nouveau slug ajouté** : la couverture mai 2026 du catalogue est déjà très large (405 entrées). Une session "exhaustive list" pour insérer 30-60 nouveaux outils sera plus utile que de chasser à l'unité ; à envisager après stabilisation de la spec MCP 2026-07-28.

## Sources hors paywall non couvertes

- **r/ClaudeAI** : non scrappé directement ce run (volume de discussion bruité, peu de nouveautés stables ; à inclure lors d'un run "exhaustive" dédié).
- **Discord communautaires** (Anthropic Discord, MCP Discord) : pas d'accès public scrapable.
- **Plugin marketplaces privées** (Cowork enterprise) : visibles uniquement après login admin.

## Sources de référence utilisées

- [github.com/anthropics/skills](https://github.com/anthropics/skills)
- [github.com/anthropics/anthropic-cookbook](https://github.com/anthropics/anthropic-cookbook)
- [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
- [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/)
- [blog.modelcontextprotocol.io](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [anthropic.com/engineering/managed-agents](https://www.anthropic.com/engineering/managed-agents)
- [anthropic.com/news/claude-opus-4-7](https://www.anthropic.com/news/claude-opus-4-7)
- [code.claude.com/docs](https://code.claude.com/docs)
- [zed.dev/docs/ai/external-agents](https://zed.dev/docs/ai/external-agents)
- [vercel.com/docs/ai-gateway](https://vercel.com/docs/ai-gateway)
- [skillsmp.com](https://skillsmp.com/)
- [claudemarketplaces.com](https://claudemarketplaces.com/)
- [buildwithclaude.com](https://www.buildwithclaude.com/)
- [github.com/VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [github.com/wshobson/agents](https://github.com/wshobson/agents)
- [developer.salesforce.com/blogs/2026/05/introducing-the-data-360-mcp-server-developer-preview](https://developer.salesforce.com/blogs/2026/05/introducing-the-data-360-mcp-server-developer-preview)
