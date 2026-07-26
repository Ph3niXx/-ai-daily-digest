# Veille écosystème Claude — 2026-06-26

## Stats

- **Entrées vues** : 142 (refresh `last_seen` aujourd'hui)
- **Ajoutées** (vraiment nouvelles) : 6
- **Mises à jour** (slug existant rebumpé) : 136
- **Archivées** : 0 (aucun item au-dessus du seuil 90j)
- **Total catalogue** : 456 outils actifs

## Nouveautés notables

| Slug | Direction · Type | Pitch en 1 ligne |
|---|---|---|
| `bifrost-mcp-gateway` | both · connector | Gateway MCP Go open-source de Maxim AI, ~11µs overhead à 5k RPS, supporte STDIO/HTTP/SSE + Agent Mode + Code Mode. |
| `snowflake-cortex-code` | inbound · cowork_plugin | Plugin Claude + MCP server de Snowflake : amène Cortex Code (data-native assistant) dans Claude Code, Cursor, VS Code. |
| `cortex-code-mcp` | inbound · mcp_server | Serveur MCP dédié de Cortex Code : catalog search, schema exploration, query execution, semantic models comme tool calls. |
| `github-agent-hq` | outbound · ide_integration | Plateforme GitHub où Claude / Codex / Copilot coexistent (github.com, Mobile, VS Code) — assigner une tâche à plusieurs agents et comparer. |
| `karpathy-claude-md` | inbound · skill | CLAUDE.md viral (144k stars) de Forrest Chang qui encode les pitfalls LLM coding observés par Karpathy en 4 règles dures. |
| `lunar-dev-mcp-gateway` | both · connector | MCP gateway open-source de Lunar.dev orienté observabilité, routing par modèle, audit trail enterprise. |

## Mises à jour notables (échantillon des 136)

L'écosystème majeur (SDKs, IDE plugins, marketplaces, MCP servers core) est tout récent et toujours actif :

- **SDKs** : `claude-agent-sdk-python/typescript/go`, `anthropic-sdk-*`, `ai-sdk-provider-claude-code` — passage du Code SDK au Agent SDK confirmé, credit séparé à partir du 15 juin 2026.
- **MCP servers** : `mcp-supabase`, `mcp-github`, `mcp-slack`, `mcp-linear`, `mcp-notion`, `mcp-stripe`, `mcp-sentry`, `mcp-hex`, `mcp-figma`, `mcp-databricks`, etc. — tous bumpés, l'écosystème remote-MCP est passé de 16 à 25+ providers majeurs depuis janvier.
- **MCP gateways** : `mintmcp-gateway`, `microsoft-mcp-gateway`, `kong-ai-gateway-mcp`, `truefoundry-mcp-gateway`, `obot-mcp-gateway` + nouveau `bifrost-mcp-gateway` et `lunar-dev-mcp-gateway`.
- **IDE intégrations** : `cursor-editor`, `zed-editor`, `windsurf-editor`, `antigravity-ide`, `jetbrains-claude-code-gui-plugin`, `cline`, `continue-dev`, `aider-cli`, `roo-code`, `kilo-code`, `goose` — toujours actifs.
- **Plugins Cowork officiels** : `plugin-connect-apps`, `plugin-create`, `plugin-feature-dev`, `plugin-frontend-design`, `plugin-code-review`, `plugin-42crunch`, `plugin-coderabbit`, `snyk-agent-scan` — 11 plugins de janvier + 12 de février + Claude Design en avril toujours référencés.
- **Frameworks tiers** : `langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk`, `mastra`, `crewai-claude`, `pydantic-ai`, `pydantic-deepagents`, `agno-framework`, `semantic-kernel-claude` — Pydantic et CrewAI confirmés sur le podium 2026.
- **Standards & spec** : `mcp-spec-2026-07-28-rc` (release candidate publiée le 21 mai), `agentic-ai-foundation` (donation par Anthropic en décembre 2025), `agent-client-protocol` (Zed + JetBrains), `agentskills-spec` (40+ adopters dont Copilot, Cursor, Codex).
- **Skills Anthropic officielles** : repo `anthropic-skills-repo` à 149k stars (vs 73k en février), 17 skills officielles incluant `anthropic-cybersecurity-skills` (mappé MITRE ATT&CK / NIST CSF 2.0) et `anthropic-financial-services`.

## Archivages

Aucun item archivé ce run. Le catalogue ne contient aujourd'hui aucune entrée dont `last_seen` est antérieur à 90 jours — la veille hebdo des dernières semaines a déjà ratissé l'ensemble.

## Notes / Limites

- **Cap respecté** : 6 nouveautés ajoutées, bien en-dessous du plafond de 60 par run. Le catalogue à 456 items est désormais très exhaustif sur les sources demandées ; la marge se réduit naturellement.
- **Modèles vs outils** : Claude Fable 5, Mythos 5, Opus 4.7/4.8 mentionnés par Snowflake et la presse — **pas ajoutés** car ce sont les modèles Claude eux-mêmes, hors périmètre "outils qui se pluggent à Claude / auxquels Claude se plugge".
- **Partenariats** : alliance Anthropic ↔ PwC élargie (juin 2026) et Anthropic ↔ Snowflake ($200M, décembre 2025 + extension juin 2026) — **pas ajoutées comme entrées** car ce sont des accords commerciaux, pas des outils installables. Snowflake Cortex Code (le produit livré par ce partenariat) **est** ajouté.
- **Projet Glasswing** (initiative sécurité Anthropic) — pas ajouté, c'est un programme interne plutôt qu'un outil distribué.
- **Sources non couvertes** : r/ClaudeAI top du mois pas exploré en profondeur (signal/bruit faible vs presse spécialisée + GitHub trending), Anthropic help center marketplace Cowork déjà couvert via `claude-marketplace`, `cowork`, `knowledge-work-plugins`.
- **Filtre qualité appliqué** : tous les items ajoutés ont commit/release dans les 6 derniers mois ; les forks marginaux et expérimentations < 100 stars de `karpathy-claude-md` exceptés (le repo est viral à 144k stars).

## Sources principales

- [Anthropic Release Notes June 2026](https://releasebot.io/updates/anthropic)
- [Claude Code Release Notes](https://releasebot.io/updates/anthropic/claude-code)
- [Anthropic skills repository](https://github.com/anthropics/skills)
- [Claude plugins official directory](https://github.com/anthropics/claude-plugins-official)
- [Knowledge work plugins](https://github.com/anthropics/knowledge-work-plugins)
- [MCP servers (official)](https://github.com/modelcontextprotocol/servers)
- [awesome-mcp-servers (punkpeye)](https://github.com/punkpeye/awesome-mcp-servers)
- [Bifrost — Maxim AI](https://github.com/maximhq/bifrost)
- [Snowflake Cortex Code plugin](https://claude.com/plugins/snowflake-cortex-code)
- [GitHub Agent HQ announcement](https://github.blog/news-insights/company-news/pick-your-agent-use-claude-and-codex-on-agent-hq/)
- [VoltAgent awesome-agent-skills](https://github.com/VoltAgent/awesome-agent-skills)
- [ComposioHQ awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills)
- [Enterprise-Managed Authorization (MCP)](https://blog.modelcontextprotocol.io/posts/enterprise-managed-auth/)
- [MCP 2026-07-28 RC](https://www.workos.com/blog/everything-your-team-needs-to-know-about-mcp-in-2026)
