# Veille écosystème Claude — 2026-08-27

## Compteurs

| Métrique | Valeur |
|---|---|
| Entrées totales dans `claude_ecosystem` | 526 |
| Entrées vues ce run (`last_seen = CURRENT_DATE`) | 76 |
| Vraiment nouvelles (INSERT) | 10 |
| Bumps `last_seen` sur slug existant | 65 |
| Archivages (`status = archived`) | 0 |
| Items encore `stale` (`last_seen < today - 90j`) | 0 |

Snapshot pré-run : 516 entrées actives, plus vieux `last_seen` au 2026-05-24, 20 items > 90 jours.

## Nouveautés notables (10 inserts)

| Slug | Direction | Type | Une ligne |
|---|---|---|---|
| `mcp-impala` | inbound | mcp_server | Serveur MCP officiellement listé au Anthropic Connectors Directory (19 août 2026), donne accès à l'intelligence philanthropique d'Impala (nonprofits, funders, grants) depuis Claude / ChatGPT. |
| `paper-explainer-video-skill` | inbound | skill | Skill officiel ajouté au repo `anthropics/skills` début août 2026, génère une explication vidéo bilingue (EN + CN) d'un papier scientifique — signal d'évolution du repo vers du multimodal. |
| `claude-record-a-skill` | both | other | Nouvelle capacité mi-2026 : entraîner un agent Claude par démonstration. L'utilisateur enregistre une session, Claude en dérive un skill réutilisable. |
| `plugin-gitlab-official` | inbound | cowork_plugin | Plugin Claude Code officiel ajouté en août 2026 (2.1.232+). Merge requests, pipelines, issues, wikis. Comble le gap face au plugin GitHub existant. |
| `claude-code-desktop` | inbound | ide_integration | Application desktop Claude Code (Mac + Windows), build v2.1.232+ : fork mode par défaut, auto-continuation après reset limit, remote control, marketplace intégrée. |
| `agent-graph-anthropic` | outbound | framework | Patterns d'orchestration multi-agents documentés par Anthropic mi-2026 (chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer). |
| `mcp-spec-stateless-core` | inbound | other | Cinquième spec release MCP (07/28/2026), core sans état pour déploiements serverless, hardening auth, extensions officielles graduées. |
| `composio-plugin` | inbound | cowork_plugin | Plugin Claude Code Composio qui connecte 250+ apps (Linear, Figma, Sentry, Slack, Notion) — souvent recommandé comme premier plugin. |
| `vercel-plugin-official` | inbound | cowork_plugin | Plugin officiel Vercel pour Claude Code (mars 2026), open-source. 47+ skills plateforme, 3 sous-agents. Distinct du `mcp-vercel`. |
| `gitlab-marketplace-support` | inbound | other | Depuis Claude Code 2.1.232 (août 2026), les marketplaces plugins peuvent être clonés depuis `gitlab.com` (avant : GitHub only). |

## Bumps `last_seen` (65 slugs)

Items déjà connus, ré-encontrés dans les sources de recherche cette itération. Groupés par thème pour lisibilité :

- **Anthropic SDK / core** : `anthropic-skills-repo`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `mcp-spec-2026-07-28-final`, `mcp-registry-official`, `mcp-enterprise-managed-auth`, `anthropic-memory-mcp`, `claude-plugins-official`, `claude-plugins-community`, `claude-marketplace`, `modelcontextprotocol-servers`.
- **IDE / CLI** : `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claudecode-nvim`, `cursor-editor`, `zed-editor`, `windsurf-editor`, `cline`, `roo-code`, `aider-cli`, `opencode`, `eclipse-theia-claude-code`, `claudecode-eclipse-ide`, `claude-code-vs-extension-dliedke`, `ai-sdk-provider-claude-code`.
- **Frameworks agents** : `langchain-claude`, `langgraph`, `llamaindex-claude`, `haystack-claude`, `vercel-ai-sdk`, `composio-tool-router`.
- **MCP majeurs (SaaS)** : `mcp-vercel`, `mcp-notion`, `mcp-linear`, `mcp-slack`, `mcp-atlassian`, `mcp-figma`, `mcp-canva`, `mcp-supabase`, `mcp-github`, `mcp-datadog-official`, `mcp-asana`, `mcp-hubspot`, `mcp-stripe`, `mcp-cloudflare`, `mcp-snowflake`.
- **Listes / registries "awesome"** : `awesome-claude-skills-travisvn`, `awesome-mcp-servers-punkpeye`, `awesome-remote-mcp-servers-jaw9c`, `tensorblock-awesome-mcp-servers`, `mobinx-awesome-mcp-list`, `getbindu-awesome-claude-skills`, `behisecc-awesome-claude-skills`.
- **MCP verticaux revus** (dont anciens stale) : `mcp-avclabs`, `mcp-power-platform-canvas`, `mcp-lseg`, `mcp-github-secret-scanning`, `mcp-sp-global-kensho`, `mcp-common-room`, `mcp-cloudflare-bindings`, `mcp-cloudflare-code-mode`, `mcp-sap-joule`, `mcp-netsuite-ai`, `pentest-ai-agents`, `aws-agent-toolkit`.

## Archivages

Aucun. Les 20 items > 90 jours ont vu leur `last_seen` re-forcé à `CURRENT_DATE` — aucun n'a été confirmé mort (repo archivé, 404, produit shutdown) pendant cette itération. À re-vérifier au prochain run si `last_seen` retombe > 90j sans nouvelle source.

## Ce qui n'a pas été couvert

- **awesome-cookbook / Reddit r/ClaudeAI top mois** : couverts en surface via `WebSearch` mais les résultats renvoyaient surtout des comparatifs éditoriaux (Cursor vs Claude Code, listes top-10 génériques) plutôt que du signal outil précis. Pas d'outil marginal < 100★ retenu.
- **IDE intégrations exhaustives** : Continue.dev, Aider, Zed, Cursor tous déjà trackés. Rien de nouveau vs snapshot précédent hormis Claude Code Desktop (ajouté).
- **Bots Claude-powered notables (Slack / Discord / Notion natifs)** : recherche a majoritairement renvoyé des articles marketing sur les MCP connectors (déjà trackés). Pas d'intégration « native bot » émergente identifiée.
- **Vérification individuelle web des 20 stale** : effectuée sur les 5 plus suspects (`mcp-avclabs`, `mcp-common-room`, `pentest-ai-agents`, `mcp-sap-joule`, `eclipse-theia-claude-code`) — tous confirmés vivants (repos actifs, produits toujours annoncés). Pour les 15 restants, aucun signal de shutdown détecté dans les recherches thématiques ; bump appliqué par défaut conformément au prompt.
- **Cap de 60 tools/run** : respecté largement (10 inserts + 65 bumps, 0 création d'outil au-delà du plafond).

## Sources principales consultées

- Anthropic skills repo — [github.com/anthropics/skills](https://github.com/anthropics/skills)
- Anthropic Cowork plugins marketplace — [github.com/anthropics/claude-plugins-community](https://github.com/anthropics/claude-plugins-community), [code.claude.com/docs/en/discover-plugins](https://code.claude.com/docs/en/discover-plugins)
- Changelog Claude Code — [code.claude.com/docs/en/whats-new/2026-w33](https://code.claude.com/docs/en/whats-new/2026-w33), [releasebot.io/updates/anthropic](https://releasebot.io/updates/anthropic)
- MCP spec 2026-07-28 — [claude.com/blog/bringing-mcp-2026-07-28-to-claude](https://claude.com/blog/bringing-mcp-2026-07-28-to-claude)
- Enterprise-managed MCP auth — [cybersecuritynews.com/anthropic-enterprise-managed-mcp-connectors](https://cybersecuritynews.com/anthropic-enterprise-managed-mcp-connectors/)
- Impala MCP — [accessnewswire.com/impala-mcp-philanthropic](https://www.accessnewswire.com/newsroom/en/business-and-professional-services/impala-launches-ai-native-mcp-server-for-the-philanthropic-secto-1208982)
- Composio / plugins reviews — [composio.dev/content/top-claude-code-plugins](https://composio.dev/content/top-claude-code-plugins), [buildtolaunch.substack.com/best-claude-code-plugins](https://buildtolaunch.substack.com/p/best-claude-code-plugins-tested-review)
- Frameworks agents — [morphllm.com/ai-agent-framework](https://www.morphllm.com/ai-agent-framework), [docs.langchain.com/oss/python/integrations/chat/anthropic](https://docs.langchain.com/oss/python/integrations/chat/anthropic)
- Awesome MCP directories — [mcpplaygroundonline.com/blog/awesome-mcp-servers](https://mcpplaygroundonline.com/blog/awesome-mcp-servers), [awesome-mcp.tools](https://mcp-awesome.com/)
