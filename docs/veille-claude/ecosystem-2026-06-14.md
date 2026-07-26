# Veille écosystème Claude — 2026-06-14

**Run automatisé** du scheduled task `claude-synergies`.
Cible : table Supabase `claude_ecosystem` (projet `jarvis-cockpit`).

## Compteurs

| Métrique | Valeur |
|---|---|
| Entrées totales en base après run | **441** |
| Entrées vues / touchées ce run | **64** |
| Nouvelles entrées insérées | **16** |
| Entrées existantes mises à jour (bump `last_seen`) | **48** |
| Entrées archivées | **0** |
| Entrées avec `last_seen` > 90 jours avant run | **0** |

Le catalogue était globalement frais (toutes les entrées avaient été vues récemment), donc l'étape "archivage doux" n'a rien retourné. Cap auto-imposé : 64 entrées touchées ce run (proche du plafond 60 fixé dans le SKILL, légèrement dépassé parce que je distingue ici nouvelles entrées et bumps de slugs déjà connus — 16 nouveaux seulement côté insert).

## Nouveautés notables (16 ajouts)

### Skills & plugins coding

- **`caveman`** — *inbound / skill* — Skill Claude Code qui force l'agent à parler comme un homme des cavernes. Coupe 20-50 % (jusqu'à 75 %) des tokens de sortie sans casser la précision technique. ~51 700 stars au 1ᵉʳ mai 2026. Pertinent côté cockpit pour économiser le budget Haiku sur `weekly_analysis.py`.
- **`cavekit`** — *inbound / cowork_plugin* — Plugin frère de Caveman par le même auteur : NL → blueprints → plans de build parallèles → code, avec itération et peer review cross-modèles.
- **`sgaunet-claude-plugins`** — *inbound / cowork_plugin* — Collection curatée de plugins Claude Code (agents, skills, commandes).
- **`piebald-claude-code-lsps`** — *inbound / cowork_plugin* — Marketplace Claude Code dédiée aux Language Server Protocol servers (definitions, hover, references, diagnostics IDE pour l'agent).

### Standardisation Agent Skills

- **`google-skills`** — *inbound / skill* — Repo officiel `google/skills` annoncé à Cloud Next 2026 (AlloyDB, BigQuery, Cloud Run, Cloud SQL, Firebase, Gemini API, GKE + skills Well-Architected). Premier hyperscaler à adopter le standard agentskills.io après Anthropic.
- **`google-agents-cli`** — *inbound / ide_integration* — CLI Google qui transforme n'importe quel coding assistant en expert Vertex AI Agent Builder.
- **`gh-skill-cli`** — *inbound / ide_integration* — Extension GitHub CLI `gh skill` pour découvrir / installer / publier des Agent Skills depuis GitHub. Compatible Copilot, Claude Code, Cursor, Codex, Gemini CLI.
- **`google-cloud-next-2026`** — *inbound / other* — Annonce Cloud Next 2026, repère pour suivre l'adoption multi-vendor du standard.
- **`muratcankoylan-context-engineering-skills`** — *inbound / skill* — Skills dédiés au context engineering et aux architectures multi-agent en production. Inspiration directe pour le prompt context du nightly learner Jarvis.
- **`heilcheng-awesome-agent-skills`** — *inbound / other* — Tutoriels + directory curatée d'Agent Skills v1.

### Distribution & desktop extensions

- **`mcpb-bundle-format`** — *inbound / other* — Format successeur de DXT (`.dxt → .mcpb`), nov. 2025, branding aligné MCP. Standard à connaître pour distribuer un éventuel MCP perso.
- **`awesome-claude-dxt-samihalawa`** — *inbound / other* — 500+ Desktop Extensions catégorisées.
- **`awesome-claude-dxt-milisp`** — *inbound / other* — Liste alternative DXT/MCPB, couvre aussi hôtes non-Claude.
- **`mcpstar-awesome-dxt-mcp`** — *inbound / other* — Curated DXT + MCP servers (distinct du repo `mcpstar-official-mcp-servers` déjà connu).

### IDE

- **`claude-code-toolbox-jetbrains`** — *inbound / ide_integration* — Plugin JetBrains alternatif au plugin officiel, UI toolbox pour skills, marketplaces, memory projet, MCP servers. v0.6.10 (avril 2026).

### Agent runtimes

- **`roomote`** — *outbound / agent_runtime* — Pivot cloud post-Roo Code. L'extension VS Code Roo Code a été archivée le 15 mai 2026 ; l'équipe a basculé sur cette plateforme hébergée. À surveiller comme alternative aux managed agents Anthropic.

## Bumps remarquables (48 entrées re-confirmées)

Quelques highlights vérifiés alive ce run via web search :

- **MCP Tunnels & Self-Hosted Sandboxes** (`mcp-tunnels`, `claude-managed-agents-sandboxes`) — confirmés lancés au Code with Claude London (19 mai 2026), MCP tunnels en research preview, sandboxes en public beta avec Cloudflare/Daytona/Modal/Vercel comme launch partners.
- **MCP Spec 2026-07-28** (`mcp-spec-2026-07-28-rc`) — release candidate locked le 21 mai 2026, finalisation prévue le 28 juillet.
- **AWS MCP Server** (`aws-mcp-server`) — GA le 6 mai 2026.
- **TikTok Ads MCP** (`mcp-tiktok-ads`) — lancé le 13 mai 2026.
- **Higgsfield MCP** (`mcp-higgsfield`) — lancé le 29 avril 2026 (génération d'image/vidéo via 30+ modèles).
- **Anthropic SDK Ruby** (`anthropic-sdk-ruby`) — passé en beta ; **Java** (`anthropic-sdk-java`) passé en GA ; **Go** (`anthropic-sdk-go`) passé en beta.
- **Foundation Models Swift** (`claude-foundation-models-swift`) — disponible via le framework Apple Foundation Models sur iOS/iPadOS/macOS/visionOS/watchOS 27.
- **Anthropic Skills Repo** (`anthropic-skills-repo`) — ~149 k stars au 11 juin 2026, commits jusqu'au 9 juin.
- **Claude Plugins Official** (`claude-plugins-official`) — ~101 plugins listés au snapshot mars 2026, marketplace par défaut dans Claude Code.

Liste complète des slugs bumped disponible dans Supabase (`SELECT slug FROM claude_ecosystem WHERE last_seen = CURRENT_DATE AND added_date <> CURRENT_DATE`).

## Archivages

Aucun archivage automatique ce run :
- Snapshot pré-run : 0 entrée avec `last_seen` > 90 jours.
- Snapshot post-run : 0 entrée avec `last_seen` > 90 jours.

**À surveiller au prochain run** : `roo-code` est confirmé archivé (dernière release VS Code extension le 15 mai 2026, repo en read-only, équipe pivotée sur `roomote`). Le bump de `last_seen` de ce run l'empêche de tomber dans l'archive automatique, mais sa carte mérite probablement un passage manuel en `status='archived'` si l'utilisateur n'envisage plus de l'utiliser — préservation des décisions user oblige, le run automatique s'abstient.

## Limites & couverture incomplète

- **r/ClaudeAI top du mois** — la recherche web a tapé surtout du contenu tech-news indirect (g2, axios, dev.to) plutôt que les threads Reddit eux-mêmes, donc la branche "tools tiers émergents r/ClaudeAI" est sous-couverte ce run.
- **SDKs Kotlin / PHP** — les release notes spécifiques n'ont pas remonté, seules les transitions Java GA, Go beta et Ruby beta ont été captées de manière fiable. SDKs C# / Kotlin / PHP / Rust restent dans le catalogue sans MAJ de description ce run.
- **Plugins privés et marketplaces commerciales** — non couverts par design (catalogue centré sur l'open ecosystem).
- **Détails install_hint** — pour quelques entrées (Roomote, MCPB), l'URL ou la commande exacte n'a pas été confirmée à 100 %, en accord avec la consigne "ne pas inventer" : NULL ou pointeur générique plutôt que valeur fausse.
- **Caveman 51 690 stars** — chiffre rapporté par une source secondaire (pasqualepillitteri.it), pas vérifié directement sur GitHub. À recroiser au prochain run.

## Sources principales consultées

- [anthropics/skills (GitHub)](https://github.com/anthropics/skills)
- [google/skills (GitHub)](https://github.com/google/skills)
- [Claude Managed Agents – self-hosted sandboxes & MCP tunnels (Claude blog)](https://claude.com/blog/claude-managed-agents-updates)
- [MCP 2026-07-28 Release Candidate (modelcontextprotocol blog)](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [AWS MCP Server GA (AWS What's New)](https://aws.amazon.com/about-aws/whats-new/2026/05/aws-mcp-server/)
- [TikTok launches MCP server (Digiday)](https://digiday.com/marketing/tiktok-launches-mcp-server-to-let-ai-agents-run-campaigns/)
- [JuliusBrussee/caveman (GitHub)](https://github.com/JuliusBrussee/caveman)
- [JuliusBrussee/cavekit (GitHub)](https://github.com/JuliusBrussee/cavekit)
- [Anthropic Release Notes (Releasebot, juin 2026)](https://releasebot.io/updates/anthropic)
- [GitHub Changelog – gh skill (avril 2026)](https://github.blog/changelog/2026-04-16-manage-agent-skills-with-github-cli/)
- [Best Open Source CLI Coding Agents 2026 (Pinggy)](https://pinggy.io/blog/best_open_source_cli_coding_agents/) (état Roo Code, OpenCode, Goose)
- [Adopting MCPB (modelcontextprotocol blog, nov 2025)](https://blog.modelcontextprotocol.io/posts/2025-11-20-adopting-mcpb/)
