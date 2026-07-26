# Veille écosystème Claude — 2026-06-27

## Compteurs

- **Entrées vues dans la base** : 456 (total active avant run)
- **Outils ajoutés (vraiment nouveaux)** : 0
- **Outils mis à jour (slug existant, bump last_seen + refresh des champs structurels)** : 60
- **Outils archivés** : 0 (aucun item avec `last_seen < CURRENT_DATE - 90j`)

Le catalogue est mature (456 entrées actives, toutes vues il y a moins de 90 jours). Le run se concentre sur le refresh des 60 outils canoniques que la veille publique a explicitement vus actifs en juin 2026, dans la limite du cap par run.

## Outils refresh notables (groupés par direction × type)

### Inbound / skills & marketplaces
- `anthropic-skills-repo` — repo officiel Anthropic, ~149k stars, commits récents (juin 2026), ajout continu de skills (canvas-design, mcp-builder, webapp-testing, etc.)
- `claude-plugins-official` — marketplace Anthropic curated, 192 marketplaces et 2 529 plugins discoverables en juin 2026
- `claude-marketplace` (claudemarketplaces.com) — 300k+ visiteurs/mois, mis à jour quotidiennement

### Inbound / MCP servers (référence & officiels)
- `modelcontextprotocol-servers` — release 2026.1.26 active (filesystem, git, github, memory, time)
- `mcp-registry-official` — 14 000+ serveurs listés en mai 2026
- `mcp-spec-2026-07-28-rc` — plus grosse révision du protocole depuis le lancement, core stateless
- `mcp-apps-spec` — extension officielle (UIs HTML interactives dans le chat) lancée janvier 2026
- `mcp-tasks-spec` — extension pour long-running, co-publiée avec MCP Apps
- `mcp-2026-04-28-creative-bundle` — 9 connecteurs créatifs officiels Anthropic (Blender, Adobe CC, Autodesk Fusion, Ableton, Splice…)
- `mcp-supabase`, `mcp-github`, `mcp-slack`, `mcp-notion`, `mcp-linear`, `mcp-stripe`, `mcp-figma` — connecteurs officiels actifs
- `mcp-filesystem`, `mcp-postgres`, `mcp-git`, `mcp-google-drive`, `mcp-brave-search`, `mcp-puppeteer`, `mcp-playwright` — serveurs de référence

### Outbound / SDKs Anthropic
- `claude-agent-sdk-python` (v0.2.110, juin 2026) et `claude-agent-sdk-typescript` — renommés depuis Claude Code SDK (sept. 2025)
- `anthropic-sdk-python`, `anthropic-sdk-typescript`, `anthropic-sdk-go`, `anthropic-sdk-java`, `anthropic-sdk-ruby`, `anthropic-sdk-csharp`, `anthropic-sdk-php` — tous maintenus

### Outbound / IDE & runtimes
- `claude-code-cli` — v2.1.191 le 25 juin 2026 (ajout `/rewind`)
- `claude-code-vscode`, `claude-code-jetbrains`, `claude-code-toolbox-jetbrains`
- `cursor-editor` — Cursor 3.0 (Agents Window, parallel agents, one-click MCP install)
- `windsurf-editor` → **rebrandé `devin-desktop` le 2 juin 2026** (settings et plans transférés en OTA)
- `cline`, `continue-dev`, `aider-cli`, `zed-editor`

### Outbound / frameworks orchestration
- `langchain-claude` (langchain-anthropic) — release 22 juin 2026, support output structuré, computer use, bash tool
- `langgraph`, `llamaindex-claude`, `vercel-ai-sdk`, `vercel-ai-gateway` (support Claude Code en 2026)
- `pydantic-ai`, `dspy-3-1`, `crewai-claude`, `semantic-kernel-claude`, `haystack-claude`
- `claude-managed-agents` — lancé par Anthropic le 8 avril 2026, alternative managée à LangChain Deep Agents

### Outbound / autres
- `claude-cookbooks` — repo officiel, 44k+ stars, ajouts réguliers

## Archivages

Aucun. Tous les items du catalogue ont un `last_seen` à ≤90 jours, donc rien à archiver lors de ce run.

## Notes de couverture & limites

- **Cap respecté** : 60 outils refresh sur ce run (limite haute prévue par la spec). Le catalogue contient 456 entrées actives ; les ~396 non touchées ce run conservent leur `last_seen` antérieur.
- **Pas de nouveauté vraie ce run** : tous les slugs touchés existaient déjà. La veille publique de juin 2026 confirme que l''essentiel des entrées canoniques sont activement maintenues, mais ne fait pas émerger de nouvelles propositions structurantes (les "nouveautés" notées par la presse — Cursor 3, /rewind, MCP Apps, Devin Desktop — ont déjà leur slug en base).
- **Champs user préservés** : `status`, `user_priority`, `is_pinned`, `user_notes` jamais touchés (vérifié par le `ON CONFLICT DO UPDATE` qui ne liste pas ces colonnes).
- **Couverture imparfaite** :
  - r/ClaudeAI : la requête web ciblée n''a pas retourné de résultats exploitables ; sources tierces (Releasebot, Substack, MCP market) ont compensé.
  - Marketplaces tierces grosses (Composio, Lobehub, AITMPL, Smithery, Glama) : déjà présentes en base, non refresh ce run faute de place dans le cap.
  - Bots Claude-powered (Linear asks Slack agent, Notion custom agents) : déjà en base, pas de signal de nouveauté à signaler ce run.
- **Renommage notable** : `windsurf-editor` mis à jour pour signaler le rebranding en `devin-desktop` (2 juin 2026) — les deux slugs coexistent : windsurf pointe vers l''héritage, devin-desktop est l''entrée canonique post-rebrand.

## Pointeurs internes

- Source canonique de la table : `claude_ecosystem` (Supabase project `mrmgptqpflzyavdfqwwv`).
- Champs preservés par convention : `status`, `user_priority`, `is_pinned`, `user_notes`.
- Cap par run : 60 outils max (catalogue, pas veille).
