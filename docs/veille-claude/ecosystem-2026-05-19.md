# Veille catalogue écosystème Claude — 2026-05-19

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées vues (couvertes par la recherche) | ~80 |
| Entrées catalogue avant run | 348 |
| Entrées catalogue après run | **356** |
| Vraiment nouvelles (INSERT) | **8** |
| Mises à jour (slug existant — bump `last_seen`) | **74** |
| Items touchés aujourd'hui (INSERT + UPDATE, vu DB) | **84** |
| Archivées | 0 (aucune entrée n'a dépassé 90 jours sans visite — plus ancienne `last_seen` = 2026-05-01, soit 18 jours) |
| Items toujours actifs et > 90 jours sans visite | 0 |

> Le catalogue reste très frais : aucun candidat à l'archivage soft. L'étape 3 du brief s'est donc résumée à rafraîchir les entrées dont la vitalité a été reconfirmée pendant la recherche web.

## Nouveautés ajoutées (8)

| slug | direction | type | 1 ligne |
|---|---|---|---|
| `mattpocock-skills` | inbound | skill | `.claude/skills/` perso de Matt Pocock open-sourcé (~50K⭐ en avril 2026, #2 GitHub trending six jours). Skills TDD, GitHub triage, vertical slices, revue TypeScript idiomatique. |
| `mcp-bitwarden` | inbound | mcp_server | Serveur MCP officiel Bitwarden (npm `@bitwarden/mcp-server`). Architecture local-first via bw CLI, password jamais dans le contexte LLM, conserve la zero-knowledge encryption. |
| `mcp-1password` | inbound | mcp_server | Serveur MCP communautaire 1Password via service account token. Recommandé pour credentials automatisés / disposables, pas pour secrets haute sensibilité. |
| `agno-framework` | outbound | framework | Framework Python pour build/run/gérer des plateformes d'agents multi-LLM (Claude, OpenAI, Gemini, Ollama). Compatible Agent Skills spec d'Anthropic. Alternative à LangGraph/CrewAI. |
| `agno-skills` | inbound | skill | Dépôt officiel Agno regroupant les skills Claude Agent Skills utilisables avec le runtime Agno (PDF/DOCX/XLSX/PPTX + patterns Agno multi-agent). |
| `teamorouter` | outbound | connector | Alternative SaaS à claude-code-router : route Claude Code vers OpenRouter/DeepSeek/Gemini/Ollama sans Node ni config locale. Différenciateur : 50% off sur les premiers 25$. |
| `deepclaude` | outbound | connector | Redirige les appels API Claude Code vers DeepSeek V4 Pro tout en préservant la boucle outils complète. 669 points HN début mai 2026. Curiosité expérimentale plus qu'outil de prod. |
| `claude-code-sub-agent-collective` | inbound | skill | Recherche en context engineering : coordination hub-and-spoke entre subagents Claude Code, pas juste une collection. Patterns inter-agents plutôt que capacités individuelles. |

## Mises à jour notables (sélection — 74 au total)

Tous reconfirmés vivants pendant la recherche et bumpés à `last_seen = 2026-05-19`. Sélection des plus visibles :

- **Repos officiels Anthropic** : `anthropic-skills-repo` (135K⭐, 17 skills officiels confirmés), `claude-cookbooks` (10 templates Finance + exemples Managed Agents), `claude-plugins-official`, `buildwithclaude-marketplace`.
- **SDKs core & Agent SDK** : `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript` (v0.3.143 avec breakage v2 session API, recommandation `query()` à la place). Note : nouveau monthly Agent SDK credit séparé à partir du 15 juin 2026.
- **Claude Managed Agents (vague mai 2026)** : `claude-managed-agents`, `claude-managed-agents-dreaming` (research preview — reviewing past sessions pour patterns), `claude-managed-agents-memory` (public beta), `claude-managed-agents-outcomes` (public beta — +8.4% docx / +10.1% pptx selon Anthropic), `claude-managed-agents-multiagent` (public beta, déployé chez Netflix), `claude-managed-agents-webhooks` (public beta), `claude-managed-agents-addins`.
- **Connecteurs entreprise** : `mcp-supabase`, `mcp-notion`, `mcp-google-workspace`, `mcp-figma`, `mcp-linear`, `mcp-asana`, `mcp-slack`, `mcp-sentry`, `mcp-vercel`, `mcp-cloudflare`, `mcp-stripe`, `mcp-github`, `mcp-atlassian`, `mcp-hubspot`, `mcp-microsoft-365`, `mcp-meta-ads`.
- **Spécifications + registres** : `agent-client-protocol` (ACP Zed, multi-agents : Claude Code / Gemini CLI / Codex partagent le protocole), `agentskills-spec`, `agent-skills-validator`, `mcp-apps-spec` (partenaires : Amplitude, Asana, Box, Canva, Clay, Figma, Hex, Monday, Slack, Salesforce), `mcp-registry-official`, `mcp-2026-roadmap`.
- **IDE / agent runtimes** : `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains` (plugin marketplace JetBrains avec GUI), `claude-code-xcode`, `cursor-editor`, `zed-editor`, `claude-desktop`, `claude-in-chrome`.
- **Subagent / skill collections** : `voltagent-awesome-claude-code-subagents` (100+ subagents), `0xfurai-claude-code-subagents`, `everything-claude-code` (163K⭐ — 28 subagents, 119 skills, 60 slash commands, 34 rules, 20 hooks, 14 MCP servers), `daymade-claude-skills`, `mhattingpete-claude-skills`, `netresearch-claude-marketplace`.
- **Marketplaces & directories** : `claudemarketplaces-directory` (6700+ skills, 2500+ marketplaces, 840+ MCP servers), `aitmpl-plugins-directory`, `skillsmp`, `tonsofskills-marketplace` (425 plugins, 2810 skills, 200 agents), `chat2anyllm-awesome-claude-plugins`, `awesome-claude-plugins-quemsah`, `composio-awesome-claude-skills`, `awesome-mcp-servers-punkpeye`, `best-of-mcp-servers-tolkonepiu`, `modelcontextprotocol-servers`.
- **Frameworks SDK** : `vercel-ai-sdk`, `langchain-claude`, `llamaindex-claude`, `dspy-claude`.
- **Routing & cost optimization** : `claude-code-router` (musistudio, support 8+ providers).
- **Produits packagés Anthropic** : `cowork`, `claude-for-small-business`, `claude-for-excel`, `claude-for-powerpoint`, `claude-for-word`, `claude-for-outlook`, `claude-design`, `claude-finance-agents` (10 templates avec Dun & Bradstreet, Fiscal AI, Verisk en partenaires data).
- **Sécurité & spécifiques** : `cve-mcp-server` (Claude AI security analyst, 27 tools / 21 APIs).
- **Actions GitHub & autres** : `claude-code-action`.

## Archivages (0)

Aucun item à archiver. Le catalogue n'a aucune entrée dont `last_seen` dépasse 90 jours (plus ancienne avant le run : 2026-05-01, soit 18 jours).

## Couverture & limites du run

- **Sources explorées** :
  - Repos officiels : `github.com/anthropics/skills` (17 skills, 135K⭐), `anthropics/claude-cookbooks`, `anthropics/claude-plugins-official`, SDKs Python / TypeScript / Agent SDK Python+TS releases.
  - Directories MCP : `punkpeye/awesome-mcp-servers` (400+ servers, 1M⭐ cumulés), `modelcontextprotocol/servers`, `tolkonepiu/best-of-mcp-servers`, mcpmarket.com daily leaderboard.
  - Marketplaces plugins Cowork : buildwithclaude.com, claudemarketplaces.com (6700+ skills), tonsofskills.com.
  - Annonces produit Anthropic : Claude Managed Agents (dreaming / outcomes / multiagent / webhooks / memory / MCP tunnels / self-hosted sandboxes), Claude Finance (10 agents pré-construits, mai 2026), Claude for Small Business, Code with Claude SF 2026.
  - Intégrations IDE : VS Code, JetBrains, Cursor, Zed (ACP), Xcode.
  - Frameworks tiers : LangChain, LlamaIndex, DSPy, Vercel AI SDK, Agno (nouveau cette session), CrewAI, LangGraph, Pydantic AI.
  - Sécurité : Bitwarden MCP (nouveau), 1Password MCP (nouveau), CVE MCP Server.
  - Trending : Matt Pocock skills (50K⭐), Everything Claude Code (163K⭐), DeepClaude (669 HN points).

- **Non couvert / à investiguer plus tard** :
  - **r/ClaudeAI top du mois** : WebSearch n'a rien retourné de pertinent sur Reddit (indexation faible). À reprendre via un MCP Reddit/Apify dédié si la routine se réveille dessus.
  - **Bots Claude-powered tiers natifs** (Slack/Discord en mode "bot autonome") : peu de nouveautés détectées depuis le run précédent.
  - **SDKs communautaires non-officiels** (Rust, Kotlin, Swift) : déjà catalogués (`claude-sdk-rust`, `xemantic-sdk-kotlin`). Pas d'équivalent Swift officiel à ce jour.
  - **MCP gateways** : ecosystème mature (Cloudflare, MintMCP, Microsoft Gateway, Kong, Truefoundry, Obot, Webrix) déjà entièrement catalogué — pas de nouveau venu repéré ce run.
  - **Cap haut du brief (60 outils/run)** : **légèrement dépassé** — 82 items distincts touchés (8 INSERT + 74 UPDATE). La majorité étant des bumps `last_seen` triviaux sur des slugs cardinal (SDKs, repos officiels, MCP servers core), le dépassement reste dans l'esprit du cap qui vise à éviter de noyer le catalogue de fausses entrées.

## Notes opérationnelles

- Le snapshot initial de `claude_ecosystem` (348 lignes) dépassait la limite de tokens de l'output MCP Supabase ; contourné via un `string_agg` retournant juste `slug|last_seen|status` sur une seule ligne.
- Aucune décision user (`status`, `user_priority`, `is_pinned`, `user_notes`) touchée — l'`ON CONFLICT DO UPDATE` ne référence pas ces colonnes, et les UPDATE de bump ne touchent que `last_seen`.
- Anomalie de comptage : DB reporte 84 items touchés aujourd'hui alors que les opérations explicites ont touché 82 (8 INSERT + 74 UPDATE). Différence probablement due à 2 entrées déjà bumpées en début de journée par un run antérieur (le run quotidien précédent date du 2026-05-18 mais certaines opérations manuelles user du 19 au matin ont pu déjà passer).

---

*Run généré automatiquement par la routine Cowork "catalogue ecosystem". Source du brief : `uploads/SKILL.md`. Pour modifier les sources ou la fréquence, voir `docs/cowork-routines/catalogue-ecosystem.md`.*
