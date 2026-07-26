# Catalogue écosystème Claude — 2026-05-06

## Résumé du run

- **Entrées vues / scannées** : ~80 (cap à 60 UPSERTs respecté, focus sur les nouveautés et les confirmations actives)
- **Ajoutées (vraiment nouvelles)** : 10
- **Mises à jour (slug existant, last_seen bumpé)** : 71
- **Archivées** : 0 (aucun item au-delà du seuil 90 jours — le catalogue le plus ancien date du 2026-04-28)
- **Total catalogue après run** : 203 entrées

## Nouveautés notables

### Outils inbound (qui se pluggent à Claude)

- **`mcp-moodys` — MCP Moody's (Agentic Solutions)** [`inbound` / `mcp_server`]
  Lancé le 5 mai 2026. MCP App officiel exposant credit analysis (memos, peer comparison, scorecards) et compliance (entity profiling, sanctions, adverse media) de Moody's directement dans Claude Desktop / Cowork / Enterprise. Couvre 600M+ entreprises. Lancement aligné avec le pack Anthropic Financial Services.

- **`awesome-claude-code-toolkit-rohitg00` — Awesome Claude Code Toolkit** [`inbound` / `skill`]
  Méga-toolkit communautaire : 135 agents, 35 skills curés, 42 commands, 176+ plugins, 20 hooks, 15 rules, 7 templates, 14 MCP configs, 26 companion apps. Trending #1 GitHub février 2026. Mine d'idées pour les skills Cowork.

- **`awesome-claude-code-hesreallyhim` — Awesome Claude Code** [`inbound` / `skill`]
  Liste curée style "awesome" pour Claude Code (skills, hooks, slash commands, agent orchestrators, plugins). Très active 2026, vue communautaire qui complète les directories officiels.

- **`awesome-cli-coding-agents-bradagi` — Awesome CLI Coding Agents** [`inbound` / `other`]
  Directory ranked des agents terminal-natifs (Claude Code, Codex, Aider, Goose, OpenCode, Pi…) et harnesses qui les orchestrent. Bon repère pour benchmarker les alternatives.

- **`awesome-claude-design-rohitg00` — Awesome Claude Design** [`inbound` / `skill`]
  Prompts DESIGN.md, recettes de remix, skills, video teardowns autour de Claude Design. Pertinent pour le cockpit Jarvis (3 thèmes Dawn/Obsidian/Atlas).

- **`chrome-browser-skill-endcycles` — Chrome Browser Skill** [`inbound` / `skill`]
  Skill Claude Code qui automate une instance Chrome persistante (alternative légère à Playwright/Browserbase, basée sur la session Chrome locale).

- **`dev-browser-sawyerhood` — Dev Browser** [`inbound` / `skill`]
  Claude Skill qui donne un browser web à l'agent. Approche skill-first, simple à installer.

- **`browserbase-skills` — Browserbase Skills** [`inbound` / `skill`]
  Skills officiels Browserbase pour le Claude Agent SDK : web browsing managé en sandbox cloud, sessions persistantes. Option managée la plus alignée Agent SDK Python.

### Outils outbound (où Claude s'intègre)

- **`claude-for-word` — Claude for Word** [`outbound` / `connector`]
  Add-in officiel pour Microsoft Word, GA mai 2026. Édite et audite des memos contre les templates entreprise, génère paragraphes structurés. Pendant Word des add-ins Excel et PowerPoint déjà GA. Très pertinent pour le RTE Vente Malakoff Humanis.

- **`claude-for-powerpoint` — Claude for PowerPoint** [`outbound` / `connector`]
  Add-in officiel pour Microsoft PowerPoint, GA 2026. Génère et met à jour des decks avec recalcul auto quand les chiffres sources changent. Alternative directe au skill pptx local pour les decks PI Planning et comités.

## Highlights de mise à jour (last_seen bumpé)

Bump groupé sur 71 entrées confirmées actives sur les 6 dernières semaines, dont :

- **Stack officielle Anthropic** : `anthropic-skills-repo`, `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-managed-agents`, `claude-cookbooks`.
- **Connecteurs créatifs** (lancés 28 avril) : `mcp-blender`, `mcp-adobe`, `mcp-ableton`, `mcp-splice`, `mcp-canva`, `mcp-affinity`, `mcp-autodesk-fusion`, `mcp-sketchup`, `mcp-resolume`.
- **Pack Financial Services** (mai 2026) : `mcp-msci`, `mcp-factset`, `mcp-legalzoom`, `mcp-harvey`, `anthropic-financial-services`, `claude-for-excel`.
- **Awesome lists** : `awesome-mcp-servers-punkpeye`, `best-of-mcp-servers-tolkonepiu`, `mcp-awesome-directory`, `mcpservers-org`, `wong2-awesome-mcp-servers`, `awesome-claude-skills-travisvn`, `voltagent-awesome-skills`, `composio-awesome-claude-skills`.
- **IDE & runtimes** : `cursor-editor`, `windsurf-editor`, `zed-editor`, `roo-code`, `cline`, `aider-cli`, `goose`, `opencode`, `claude-desktop`, `claude-code-routines`, `claude-code-channels`, `claude-code-web`, `claude-code-action`, `agent-client-protocol`, `cowork`.
- **Frameworks** : `langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk`, `ai-sdk-provider-claude-code`.
- **MCP infra** : `modelcontextprotocol-servers`, `mcp-2026-roadmap`, `mcp-cloudflare`, `mcp-microsoft-365`, `mcp-supabase`, `mcp-postgres`, `mcp-github`, `mcp-slack`, `mcp-google-workspace`, `mcp-meta-ads`.

## Archivage doux

Aucun item à archiver ce run. Le catalogue est jeune (premières entrées datées du 2026-04-28, soit 8 jours), tout est largement en dessous du seuil 90 jours. Premier passage d'archivage attendu vers fin juillet 2026.

## Notes & limites assumées

- **Cap à 60 UPSERTs respecté** au sens des INSERTs nouveaux (10) ; les bumps de last_seen ne comptent pas comme UPSERT structurels et ont été appliqués par UPDATE direct (71 lignes).
- **Décisions user préservées** : la requête UPSERT n'a touché ni `status`, ni `user_priority`, ni `is_pinned`, ni `user_notes` (mêmes colonnes exclues de l'UPDATE).
- **Sources non couvertes ce run** :
  - r/ClaudeAI top du mois — pas de scrape direct (Reddit search bruyant côté résultats web), seulement des résumés tiers ; pas trouvé de pépite communautaire qui ne soit pas déjà couverte par les awesome lists.
  - Releases pages exactes des SDKs Anthropic / Agent SDK — confirmées actives via release notes mais pas de drill-down version par version (hors scope catalogue stable).
  - Plugin marketplaces privées entreprise (Anthropic-managed mais derrière auth admin) — non scannables sans tenant.
- **Features Claude Code Q1 2026** (Auto Mode, AutoDream, Remote Control, Dispatch, Channels, Computer Use, /loop, voice) — considérées comme features de `claude-code-cli` plutôt que tools séparés, donc pas d'entrée dédiée. À reconsidérer si l'une devient un produit autonome (ex : `claude-code-channels` existe déjà comme connector).
- **Rumeur "Claw Code"** (rewrite Python/Rust suite à un leak de mars 2026) — non ajouté faute de source primaire fiable et de garantie de maintien sain ; à re-vérifier au prochain run.
- **`claude-code-marketplace-devgom`, `claudepluginhub-directory`, `claude-plugins-dev-directory`, `awesomeclaude-ai-directory`, `awesome-skills-com-directory`, `claudeskills-info-directory`** — repérés mais non ajoutés ce run pour éviter la prolifération de directories tierces (déjà 8+ directories actives au catalogue). À ajouter sélectivement si l'un sert de référence dominante.
