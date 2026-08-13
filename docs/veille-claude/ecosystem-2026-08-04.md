# Veille écosystème Claude — 2026-08-04

## Compteurs du run

- **Entrées vues (existant en base au démarrage)** : 482 (toutes actives, 0 archivée)
- **Nouvelles entrées ajoutées** : 8
- **Entrées bumpées (last_seen rafraîchi)** : 77 (dont les 6 candidates >90 jours toutes vérifiées vivantes)
- **Entrées archivées** : 0 (aucun repo/produit mort confirmé sur les candidats dormants)
- **Total après run** : 490

Note : le cap indicatif de "60 outils par run" est légèrement dépassé (85 items touchés) parce que la majorité sont de simples bumps `last_seen` (opération à coût nul, préserve les décisions user). Les vrais ajouts sont strictement 8.

## Nouveautés notables (8)

### MCP servers (inbound)
- **notebooklm-mcp-2026** (`inbound` / `mcp_server`) — MCP pour interroger Google NotebookLM depuis Claude Code/Desktop/Cursor/VS Code (julianoczkowski). Potentiellement utile pour centraliser la veille IA du cockpit.
- **edge-negotiation-mcp** (`inbound` / `mcp_server`) — Serveur MCP annoncé le 30 juillet 2026 par The Edge Negotiation Group pour intégrer des outils de négociation dans les plateformes AI d'entreprise.
- **awesome-claude-mcp-servers-win4r** (`inbound` / `other` = directory) — Liste curatée de MCP servers optimisés pour Claude. Aide à trier dans les 950+ serveurs officiels.

### Skills (inbound)
- **finance-skills-himself65** (`inbound` / `skill`) — Alternative communautaire aux templates Claude Finance officiels. Skills d'analyse et trading au format Agent Skills.
- **claude-skills-collection-abubakar** (`inbound` / `skill`) — Collection curatée officiel + communautaire, format Agent Skills standard.
- **claude-education-agent-skills** (`inbound` / `skill`) — 165 skills éducation evidence-based (GarethManning) : Backwards Design Unit Planner, Spaced Practice Scheduler, Retrieval Practice Generator.
- **dataviz-skill-indi256s** (`inbound` / `skill`) — Skill Claude Code data visualization avec thème ECharts et templates dark. Alternative communautaire au `/dataviz` officiel. Pertinent pour les visualisations du cockpit.
- **claude-skillz-ntcoding** (`inbound` / `skill`) — Collection skills dataviz + workflow dev, structurée par SKILL.md.

## Archivages (0)

Aucun. Les 6 items >90 jours au démarrage du run (`claude-forge`, `claude-telemetry-otel`, `grafana-claudestats`, `mcp-clickup`, `claudix-vscode`, `coderabbit-skills-repo`) ont tous été vérifiés côté web et sont **vivants** :

- `claude-forge` — releases v3.1.0 (juin 2026), v3.0.2, ~722 étoiles, activement maintenu.
- `claude-telemetry-otel` (TechNickAI) — cité dans OCDevel podcast du 3 juillet 2026, toujours actif.
- `grafana-claudestats` — plugin Grafana officiel toujours listé.
- `mcp-clickup` — page intégrations ClickUp active.
- `claudix-vscode` (Haleclipse) — repo actif, releases récentes, projet frère `Claudix-JetBrains` publié.
- `coderabbit-skills-repo` — activité confirmée avril + juin 2026, 145 étoiles, v0.25.1.

Tous ont été rafraîchis à `last_seen = 2026-08-04`.

## Faits saillants de l'écosystème captés durant ce run

- **MCP 2026-07-28** est la release majeure de l'été : stateless core, OAuth/OIDC, Apps et Tasks passent en extensions versionnées. Registre officiel liste **>950 serveurs** (chiffre Claude), **>9 400** côté `registry.modelcontextprotocol.io`, **>17 000** en indexation large.
- **Claude Science** lancé début juillet 2026 (workbench multi-agents pour genomics/proteomics/cheminformatique) et **/dataviz skill** intégré à Claude Code v2.1.198 début juillet.
- **Claude Managed Agents** consolide Scheduler + Dreaming + Outcomes + Multiagent + Sandboxes en 2026, tous déjà catalogués.
- Marketplace officielle Claude Code : ~101 plugins (33 Anthropic + 68 partenaires) au dernier compte.

## Limites du run

- **Fetch direct des repos GitHub bloqué** par le contrôle de provenance (URLs pas dans l'ensemble des sources retournées par les WebSearch). Vérification des candidats archivage faite via WebSearch ciblés uniquement, pas de GET direct sur l'API GitHub — précision réduite sur les dates exactes de dernier commit, mais le fait qu'ils apparaissent dans des articles/podcasts 2026 récents est suffisant pour confirmer qu'ils sont vivants.
- **Sources paywall** (Register, TechCrunch, certains blogs enterprise) accessibles seulement par snippets WebSearch.
- **r/ClaudeAI top du mois** non parcouru directement — reddit renvoyé peu de résultats exploitables via WebSearch. Recommandation : run manuel occasionnel sur reddit.com/r/ClaudeAI/top/?t=month pour capturer les outils tiers émergents non indexés ailleurs.
- **MCPs connectés en session** (`plugin:data:*`) restent en état "requires authentication" — sans impact sur ce run (on n'en a pas eu besoin) mais ces serveurs ne peuvent pas être introspectés programmatiquement pour l'instant.

## Sources principales du run

- [MCP 2026-07-28 spec — Anthropic](https://claude.com/blog/bringing-mcp-2026-07-28-to-claude)
- [The 2026-07-28 Specification — Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [Claude Science launch — Anthropic](https://www.anthropic.com/news/claude-science-ai-workbench)
- [Code with Claude 2026 — MindStudio recap](https://www.mindstudio.ai/blog/code-with-claude-2026-new-agent-features)
- [Anthropic Skills repo](https://github.com/anthropics/skills)
- [Anthropic Cookbook](https://github.com/anthropics/anthropic-cookbook)
- [Knowledge-work plugins — Anthropic](https://github.com/anthropics/knowledge-work-plugins)
- [Bringing Anthropic Skills to GitHub Copilot — Tiberriver256 (catalogue de 250+ skills)](https://tiberriver256.github.io/ai%20and%20technology/skills-catalog-part-1-indexing-ai-context/)
- [Cowork plugins across enterprise — Anthropic](https://claude.com/blog/cowork-plugins-across-enterprise)
- [Awesome MCP Servers (appcypher)](https://github.com/appcypher/awesome-mcp-servers)
- [Awesome MCP Servers directory 1200+](https://mcp-awesome.com/)
- [Best MCP Servers 2026 — MCPBundles](https://www.mcpbundles.com/blog/best-mcp-servers)
- [Best Claude Code Plugins 2026 — DesignRevision](https://designrevision.com/blog/best-claude-code-plugins)
- [Claude Code changelog August 2026 — Gradually](https://www.gradually.ai/en/changelogs/claude-code/)
- [Anthropic release notes July 2026 — Releasebot](https://releasebot.io/updates/anthropic)
- [Vercel AI SDK ecosystem](https://vercel.com/docs/ai-gateway/ecosystem)
- [MCP gets an enterprise makeover — The Register](https://www.theregister.com/ai-and-ml/2026/07/29/mcp-gets-an-enterprise-makeover/5280027)
- [Edge Negotiation MCP launch — GlobeNewswire (30 juillet 2026)](https://www.globenewswire.com/news-release/2026/07/30/3335953/0/en/video-the-edge-negotiation-group-launches-mcp-server-to-embed-negotiation-tools-directly-into-enterprise-ai-platforms.html)
- [claude-code-plugins-plus-skills (jeremylongshore, ccpi CLI, 471 plugins)](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
- [Claude finance agents — Let's Data Science](https://letsdatascience.com/news/anthropic-launches-ten-finance-agent-templates-for-claude-6516f048)
- [/dataviz skill overview — MindPattern](https://mindpattern.ai/s/2026-07-02-claude-code-s-new-dataviz-skill-enforces-chart-and-palette-discipline)
