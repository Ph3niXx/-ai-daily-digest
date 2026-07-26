# Veille écosystème Claude — 2026-07-10

## Chiffres du run

| Metric | Valeur |
|---|---|
| Entrées catalogue avant run | 457 |
| Entrées vues ce run | 60 (cap atteint) |
| Ajoutées (net-new) | **5** |
| Mises à jour (refresh + bump `last_seen`) | 55 |
| Archivées | 0 |
| Total catalogue après run | 462 |
| Items dormants (`last_seen` > 90 jours) | 0 |

## Nouveautés notables (5 ajoutées)

- **mcp-featured** — `inbound` / `mcp_server` — Featured, l'AI co-pilot PR, a publié son serveur MCP GA le 7 juillet 2026 (`workflows` + `opportunity search`, OAuth 2.1, scoping org). Cible : agences PR, mais utile comme référence OAuth propre.
- **mcp-press-ranger** — `inbound` / `mcp_server` — Press Ranger a lancé le 9 juillet 2026 le premier serveur MCP dédié à la distribution de communiqués de presse. Marché encore vierge — worth watching.
- **mcp-x-twitter** — `inbound` / `mcp_server` — X (ex-Twitter) a publié un serveur MCP officiel fin juin 2026, ouvrant sa plateforme aux clients MCP. Piste concrète pour un panel veille sociale IA côté Cockpit.
- **claude-science** — `inbound` / `other` — Nouveau flagship product Anthropic annoncé le 30 juin 2026 (workbench IA pour scientifiques, artifacts auditables, compute flexible). Hors scope RTE Malakoff mais marque une expansion produit importante.
- **claude-for-life-sciences** — `inbound` / `cowork_plugin` — Suite de connectors + skills spécifiques life sciences (dont Medidata pour trials), complète Claude for Healthcare (HIPAA-ready). Signal fort sur la verticalisation par industrie chez Anthropic.

## Refresh notables (55 items bumpés)

Rafraîchissements ciblés sur le socle canonique du catalogue, avec réécriture des descriptions pour intégrer les nouveautés 2026 :

- **Core Anthropic** — `anthropic-skills-repo` (~149k stars mi-2026, standard `agentskills.io`), `claude-cookbooks`, `claude-code-cli` (v2.1+ accepte plugin marketplaces tierces depuis mai 2026), `claude-marketplace` (~101 plugins officiels), `cowork` (private marketplaces + 12 connectors fev 2026), `knowledge-work-plugins`.
- **SDKs officiels** — `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `anthropic-sdk-python`, `anthropic-sdk-typescript`, `anthropic-sdk-go`, `anthropic-sdk-java`, `anthropic-sdk-ruby`.
- **Managed Agents** — `claude-managed-agents` (public beta 8 avril 2026, metering séparé), `claude-managed-agents-dreaming` (research preview, +6x completion rate chez Harvey), `claude-managed-agents-outcomes` (rubric grading), `mcp-tunnels` (research preview 19 mai 2026, gateway sortant unique vers Claude Console).
- **Plugins Cowork Anthropic** — `claude-design` (17 avril 2026, prompt-to-prototype), `claude-finance-agents` (10 agents finance 5 mai 2026), `claude-for-excel`, `claude-for-outlook`, `claude-in-chrome`.
- **IDE / Editors** — `claude-code-vscode`, `claude-code-jetbrains`, `cursor-editor`, `cursor-cli`, `cline`.
- **Runtimes agent alternatifs** — `goose`, `opencode`.
- **Frameworks** — `vercel-ai-sdk` (v6 en 2026), `langchain-claude`, `llamaindex-claude`.
- **MCP servers canoniques** — `modelcontextprotocol-servers`, `mcp-registry-official` (9,652 records au 24 mai 2026), `mcp-apps-spec` (lancé janv 2026), `mcp-spec-2026-07-28-rc` (biggest revision depuis launch, dite "MCP 2.0"), `awesome-mcp-servers-punkpeye`, `mcp-supabase` (utilisé par cette routine), `mcp-github`, `mcp-slack`, `mcp-notion`, `mcp-linear`, `mcp-atlassian` (remote hosted 2026), `mcp-stripe`, `mcp-figma`, `mcp-canva`, `mcp-google-drive`, `mcp-google-calendar`, `mcp-google-workspace`, `mcp-postgres`, `mcp-filesystem`, `mcp-playwright`, `mcp-brave-search`, `mcp-git`.
- **Deprecation flag** — `mcp-stainless` : refresh avec note explicite que la plateforme hostée ferme le 1er septembre 2026 (Stainless racheté par Anthropic pour ~$300M le 18 mai 2026). Pas encore archivé (produit vivant jusqu'à septembre), à archiver au run suivant si confirmé.

## Archivages (0)

Aucun item n'a `last_seen < CURRENT_DATE - 90 days` (les plus anciens datent du 1er mai 2026, soit 70 jours). Rien à archiver ce run.

**Watchlist archivage prochain run :**

- `mcp-stainless` — shutdown officiel plateforme hostée annoncé pour le 1er septembre 2026. À basculer en `archived` au run qui suivra cette date.

## Ce qui n'a pas pu être couvert

- **Sources paywall / privées** — pas d'accès Reddit r/ClaudeAI, Discord serveurs Anthropic, canaux Slack partenaires. Les tools "émergents obscurs" postés uniquement dans ces canaux passent sous le radar.
- **Newsletter Anthropic interne** — release notes détaillés (`support.claude.com/en/articles/12138966-release-notes`) parcourus via WebSearch mais pas exhaustivement chargés — quelques features mineures peuvent manquer.
- **Repos < 100 stars** — filtre qualité assumé, on skip les expérimentations solo.
- **Marketplaces communautaires** — le catalogue référence les meta-directories (`claudemarketplaces`, `claudepluginhub`, `pulsemcp`, etc.) mais pas chaque plugin individuel qu'ils indexent (ce serait de la veille, pas du catalogue).

## Sources principales

- [github.com/anthropics/skills](https://github.com/anthropics/skills)
- [github.com/anthropics/anthropic-cookbook](https://github.com/anthropics/anthropic-cookbook)
- [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)
- [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- [registry.modelcontextprotocol.io](https://registry.modelcontextprotocol.io/)
- [claude.com/blog/new-in-claude-managed-agents](https://claude.com/blog/new-in-claude-managed-agents)
- [claude.com/blog/claude-managed-agents-updates](https://claude.com/blog/claude-managed-agents-updates)
- [anthropic.com/news/anthropic-acquires-stainless](https://www.anthropic.com/news/anthropic-acquires-stainless)
- [anthropic.com/news/claude-design-anthropic-labs](https://www.anthropic.com/news/claude-design-anthropic-labs)
- [anthropic.com/news/finance-agents](https://www.anthropic.com/news/finance-agents)
- [anthropic.com/news/claude-science-ai-workbench](https://www.anthropic.com/news/claude-science-ai-workbench)
- [anthropic.com/news/claude-for-life-sciences](https://www.anthropic.com/news/claude-for-life-sciences)
- [globenewswire.com — Featured MCP Server](https://www.globenewswire.com/news-release/2026/07/07/3323391/0/en/Featured-Launches-an-MCP-Server-Bringing-AI-Agents-to-PR-Agencies.html)
- [globenewswire.com — Press Ranger MCP Server](https://www.globenewswire.com/news-release/2026/07/09/3325174/0/en/Press-Ranger-Launches-the-First-MCP-Server-for-Press-Release-Distribution.html)
- [blog.modelcontextprotocol.io — 2026-07-28 RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [code.claude.com/docs/en/plugin-marketplaces](https://code.claude.com/docs/en/plugin-marketplaces)
