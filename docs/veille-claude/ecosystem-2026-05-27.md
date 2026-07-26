# Catalogue écosystème Claude — 2026-05-27

## Récap chiffres

- **Catalogue total** : 387 entrées actives (+15 vs run précédent)
- **Vues / touchées ce run** : 30
- **Vraiment nouvelles** (INSERT) : 15
- **Mises à jour** (slug existant, refresh `last_seen` + descriptions enrichies) : 15
- **Archivées** : 0 (aucune entrée n'a dépassé 90 jours sans revue — `last_seen` mini reste très récent)
- **Statut Supabase** : OK (MCP Supabase opérationnel, 6 batches UPSERT exécutés sans erreur)

## Nouveautés notables (15 INSERT)

### Côté inbound (outils qui se branchent à Claude)

- **`mcp-avclabs`** — inbound · mcp_server · AVCLabs. MCP server pour traitement média (amélioration vidéo IA, segmentation d'image), lancé le 21 mai 2026.
- **`mcp-tiktok-ads`** — inbound · mcp_server · TikTok/ByteDance. MCP officiel pour piloter des campagnes TikTok Ads via agents IA.
- **`mcp-power-platform-canvas`** — inbound · mcp_server · Microsoft. Exposé Canvas Apps authoring comme MCP server (14 mai 2026). Permet migration InfoPath → Canvas Apps en langage naturel.
- **`mcp-github-secret-scanning`** — inbound · mcp_server · GitHub. GA mai 2026 du secret scanning dans le GitHub MCP Server — détection automatique de credentials côté workflows agentic.
- **`mcp-salesforce-data-360`** — inbound · mcp_server · Salesforce. Dev Preview mai 2026, complémentaire des Salesforce Hosted MCP Servers (GA avril).
- **`mcp-lseg`** — inbound · mcp_server · LSEG. Partner plugin Cowork qui apporte données live LSEG (yield curves, FX, news) à Claude.
- **`mcp-sp-global-kensho`** — inbound · mcp_server · S&P Global / Kensho. Partner plugin Cowork : tear sheets et analytics financiers.
- **`mcp-common-room`** — inbound · cowork_plugin · Common Room. Partner plugin Cowork pour community intelligence et signaux GTM.
- **`mcp-2026-04-28-creative-bundle`** — inbound · connector · Anthropic + partenaires créatifs. Bundle de 9 connecteurs (Adobe/Blender/Autodesk/Ableton/Splice/SketchUp, etc.) annoncé le 28 avril.
- **`claudecowork-im-directory`** — inbound · other · communautaire. Directory tiers qui maintient la liste à jour des plugins Cowork.

### Côté outbound (outils auxquels Claude se branche) + spec

- **`cursor-cli`** — outbound · ide_integration · Anysphere. CLI Cursor (janvier 2026), alternative directe à Claude Code en terminal.
- **`jetbrains-claude-code-gui-plugin`** — outbound · ide_integration · Anthropic via JetBrains Marketplace. Plugin officiel apportant la GUI Claude Code à IntelliJ/PyCharm/WebStorm.
- **`vercel-ai-sdk-6`** — outbound · sdk · Vercel. v6 majeure : abstractions agent natives, mise au niveau de LangGraph et Claude Agent SDK pour stacks TS.
- **`dspy-3-1`** — outbound · framework · Stanford NLP. Release 3.1.2 de DSPy (janvier 2026), framework auto-optim de prompts.
- **`mcp-spec-2026-07-28-rc`** — both · other · Linux Foundation AAIF. Release candidate de la plus grosse révision MCP depuis le lancement, locké le 21 mai 2026. Spec finale prévue le 28 juillet 2026.

## Mises à jour de description (15 refresh enrichis)

Les 15 entrées suivantes existaient déjà mais leur description a été enrichie avec les annonces récentes (Code with Claude London 19-20 mai, GA AWS MCP, bundle Creative du 28 avril, etc.) :

- `claude-design` — Anthropic Labs lancé 17 avril 2026, Opus 4.7
- `claude-managed-agents` — Self-hosted sandboxes (public beta) + MCP tunnels (research preview), mai 2026
- `mcp-tunnels` — Research preview annoncée 19 mai à Code with Claude London
- `claude-managed-agents-sandboxes` — Partners Cloudflare/Daytona/Modal/Vercel + BYO
- `ant-cli` — CLI API Anthropic lancé mai 2026
- `claude-platform-aws` — Annoncé partnership Anthropic-AWS du 27 avril 2026
- `aws-mcp-server` — GA 6 mai 2026, 60+ servers us-east-1 + eu-central-1
- `aws-agent-toolkit` — Bundle MCP + skills + plugins annoncé 6 mai 2026
- `mcp-bedrock-agentcore` — AgentCore CLI ajouté avril 2026
- `mcp-cloudflare` — 13 nouveaux servers en avril 2026
- `mcp-blender` — Confirmé dans le bundle Creative du 28 avril
- `mcp-higgsfield` — Lancé 29 avril 2026 (30+ modèles génératifs)
- `mcp-playwright` — 30k+ stars en mai 2026, #2 MCP de l'écosystème
- `mcp-salesforce-hosted` — GA confirmée avril 2026
- `claude-for-creative-work` — Initiative ombrelle bundle 28 avril 2026

## Archivages

Aucun archivage ce run. La requête « `status='active'` AND `last_seen < CURRENT_DATE - INTERVAL '90 days'` » a renvoyé 0 ligne — le catalogue entier reste activement entretenu (toutes les entrées ont une `last_seen` dans les 30 derniers jours).

## Notes / limites assumées

- **Cap respecté** : 30 upserts << cap de 60/run.
- **Préservation user fields** : aucun UPDATE n'a touché `status`, `user_priority`, `is_pinned`, `user_notes`. La clause `ON CONFLICT (slug) DO UPDATE SET …` n'inclut que les colonnes éditoriales.
- **Sources non couvertes** : pas d'accès directs aux paywalls (FT, WSJ, Bloomberg) qui contiennent parfois des annonces partner ; r/ClaudeAI top-of-the-month exploré seulement par recherche web indirecte (le scrape Reddit direct sort du périmètre de WebSearch).
- **Annonces signalées mais non versées** : *Claude Mythos Preview* (invitation-only, deploy défensif via Project Glasswing) — pas pertinent comme outil grand public, donc skip délibéré. *Servers Anthropic Cookbook data-analyst* (8 avril 2026) — déjà couvert via `claude-cookbooks`.
- **Doublons évités** : le pré-check a confirmé que de nombreux candidats potentiels existaient déjà sous une variante de slug (ex : `mcp-tunnels`, `claude-design`, `claude-managed-agents-sandboxes`, `mcp-figma`, `mcp-adobe`, `mcp-ableton`, `mcp-autodesk-fusion`, `mcp-splice`, `mcp-sketchup`, `mcp-servicenow-official`, `mcp-cloudflare-bindings`, `mcp-meta-ads`, `claude-platform-aws`, `claude-cookbooks`, `cursor-editor`, `claude-code-jetbrains`). Ces slugs ont été refresh plutôt que dupliqués.

## Sources principales consultées

- Anthropic news, Claude Help Center, platform.claude.com (release notes)
- github.com/anthropics/{skills,anthropic-cookbook,claude-plugins-official,knowledge-work-plugins,claude-plugins-community,claude-agent-sdk-{python,typescript}}
- blog.modelcontextprotocol.io, modelcontextprotocol.io/examples, registry.modelcontextprotocol.io
- awslabs.github.io/mcp, blog.cloudflare.com, developer.salesforce.com
- claudemarketplaces.com, claudepluginhub.com, claudecowork.im
- Awesome lists : punkpeye, wong2, appcypher, tolkonepiu, ComposioHQ, VoltAgent, travisvn
- Couverture événementielle : Code with Claude London 2026 (19-20 mai), AVCLabs press release (21 mai), TikTok Digiday, AWS What's New (6 mai)
