# Catalogue écosystème Claude — Run du 2026-05-05

## Synthèse

| Métrique | Nombre |
|---|---|
| Entrées vues / refreshed ce run | 56 |
| **Ajoutées (vraiment nouvelles)** | **16** |
| Mises à jour (slug existant, last_seen bumpé) | 40 |
| Archivées | 0 |
| Total catalogue après run | 193 |

Aucune entrée ne dort depuis plus de 90 jours (le catalogue a été touché en grande partie ces derniers jours), donc pas d'archivage soft ce run.

## Nouveautés notables

### Inbound (ce qui se plugge à Claude)

- **anthropic-financial-services** — `cowork_plugin` — Pack officiel Anthropic de 10 plugins finance/insurance (investment banking, equity research, due diligence, KYC, comparable companies, DCF, LBO, pitchbooks). **Très fort potentiel pour la mission RTE Vente chez Malakoff Humanis.**
- **context7-mcp** — `mcp_server` — Upstash. Injecte la doc officielle à jour des libs/frameworks dans le prompt, élimine les hallucinations sur APIs dépréciées. Compatible Claude Code, Cursor, Windsurf.
- **firecrawl-mcp** — `mcp_server` — Mendable. 13 outils web (search, scrape, crawl, deep research) avec markdown propre. Pourrait remplacer ou compléter les pipelines RSS.
- **tonsofskills-marketplace** — `cowork_plugin` — Méga-marketplace open source jeremylongshore : 425 plugins, 2 810 skills, 200 agents. Inclut le CLI `ccpi` façon package manager.
- **buildwithclaude-marketplace** — `cowork_plugin` — Hub de découverte davepoon (57 plugins, 131 skills, etc.). Mieux curé que tonsofskills, web UI agréable.
- **agent-skills-validator** — `framework` — Outil de validation indépendant des SKILL.md contre la spec agentskills.io. Score qualité via LLM-as-judge.
- **coderabbit-skills-repo** — `skill` — Repo officiel CodeRabbit de skills installables dans Claude Code/Cowork pour automatiser la review (race conditions, leaks, security checks).
- **claude-trading-skills-tradermonty** — `skill` — Skills Claude Code pour investisseurs particuliers (analyse marché, charting, screeners).
- **claude-skill-idea-validator** — `skill` — Skill Anthropic ajouté début mai 2026 pour valider la pertinence d'une idée avant de la coder. Directement utile pour le panel Carnet d'idées.
- **claude-skill-skill-analyzer** — `skill` — Skill Anthropic publié fin avril 2026, conseiller ROI qui évalue si une tâche mérite vraiment un skill dédié.
- **awesome-mcp-clients-punkpeye** — `other` — Liste curée des clients MCP (l'autre côté du protocole).
- **awesome-mcp-devtools-punkpeye** — `other` — Liste curée d'outils dev pour MCP : SDKs, libraries, debug, inspecteurs.
- **best-of-mcp-servers-tolkonepiu** — `other` — Liste de serveurs MCP rangés par popularité, mise à jour hebdomadaire automatiquement. Meilleur signal/bruit qu'awesome-mcp-servers.
- **ever-works-awesome-mcp-servers** — `other` — Concurrent de punkpeye/wong2 avec un site web associé (mcpserver.works).

### Outbound (où Claude est utilisé)

- **claudix-vscode** — `ide_integration` — Extension VS Code communautaire alternative à l'officielle Claude Code, UI plus soignée. À benchmarker contre l'extension Anthropic native.
- **ralph-loop** — `agent_runtime` — Pattern d'agent autonome qui boucle Claude Code sur un PRD jusqu'à complétion. Plugin officiel Anthropic + plusieurs implémentations communautaires. Pertinent pour les gros refactos cockpit.

## Refresh notables

40 entrées existantes ont eu leur `last_seen` bumpé après vérification de leur activité (release récente, doc à jour, mention dans l'écosystème). Highlights :

- Stack core Anthropic : `anthropic-skills-repo`, `claude-plugins-official`, `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-cookbooks`, `claude-design`, `claude-managed-agents`, `claude-managed-agents-memory`, `agentskills-spec`, `mcp-apps-spec`, `skill-creator`.
- SDKs officiels actifs : `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`.
- MCP servers majeurs : `mcp-supabase` (utilisé par ce projet), `mcp-github`, `mcp-figma`, `mcp-blender`, `mcp-snowflake`, `mcp-databricks`, `mcp-postgres`, `mcp-slack`, `mcp-notion`, `mcp-linear`, `mcp-stripe`, `mcp-google-workspace`, `mcp-microsoft-365`, `mcp-asana`, `mcp-meta-ads`.
- Frameworks/IDE concurrents validés actifs : `langchain-claude`, `cline`, `continue-dev`, `roo-code`.
- Directories : `pulsemcp-directory`, `smithery-registry`, `claudemarketplaces-directory`, `modelcontextprotocol-servers`, `plugin-coderabbit`.

## Archivages

Aucun ce run. Aucune entrée n'a dépassé le seuil de 90 jours sans `last_seen` (catalogue très frais).

## Couverture & limites

- **Sources couvertes** : github.com/anthropics/skills (releases avril-mai 2026), github.com/anthropics/claude-plugins-official, github.com/anthropics/financial-services-plugins, modelcontextprotocol/servers, marketplaces (tonsofskills, buildwithclaude, claudemarketplaces), awesome MCP servers (punkpeye, wong2, tolkonepiu, ever-works), Anthropic news (financial services, MCP Apps spec, Ralph Loop, Meta Ads MCP), notes de release Claude Code, articles techniques sur les frameworks (LangChain, LlamaIndex), discussions r/ClaudeAI résumées.
- **Pas couvert / paywall** :
  - Reddit r/ClaudeAI top du mois en accès direct (utilisé via résumés tiers).
  - Marketplaces Cowork privées d'entreprise (par définition fermées).
  - Repos privés référencés (ex : intégrations Salesforce Marketing Cloud hosted).
  - Les nouveautés ultra-récentes des integrations IDE (Antigravity, Agentforce Vibes, Xcode) n'ont pas été re-vérifiées par souci de quota — les `last_seen` antérieurs restent valables.
- **Choix éditorial assumé** : pas de `Snowflake Cortex Code` ajouté (produit concurrent côté agent IDE plutôt qu'outil Claude). Pas de `Codex Plugin` (OpenAI dans Claude Code) ajouté — borderline cross-vendor. Pas de re-vérification des 137 autres entrées non touchées ce run (cap 60 outils, déjà 56 traités).

## Notes de cohérence

- Le catalogue a basculé de 177 → 193 entrées (+16 nouvelles, +0 supprimées).
- Statut : 100 % `active`. Toutes les décisions user (status, user_priority, is_pinned, user_notes) sont préservées par construction (UPSERT ne touche pas ces colonnes).
- Migrations Supabase utilisées : `sql/012_claude_ecosystem.sql` (table cible).

## Sources

- [github.com/anthropics/skills](https://github.com/anthropics/skills)
- [github.com/anthropics/financial-services-plugins](https://github.com/anthropics/financial-services-plugins)
- [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
- [github.com/anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)
- [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- [github.com/upstash/context7](https://github.com/upstash/context7)
- [github.com/firecrawl/firecrawl-mcp-server](https://github.com/firecrawl/firecrawl-mcp-server)
- [github.com/jeremylongshore/claude-code-plugins-plus-skills](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
- [github.com/davepoon/buildwithclaude](https://github.com/davepoon/buildwithclaude)
- [github.com/Haleclipse/Claudix](https://github.com/Haleclipse/Claudix)
- [github.com/agent-ecosystem/skill-validator](https://github.com/agent-ecosystem/skill-validator)
- [github.com/punkpeye/awesome-mcp-clients](https://github.com/punkpeye/awesome-mcp-clients)
- [github.com/punkpeye/awesome-mcp-devtools](https://github.com/punkpeye/awesome-mcp-devtools)
- [github.com/tolkonepiu/best-of-mcp-servers](https://github.com/tolkonepiu/best-of-mcp-servers)
- [github.com/ever-works/awesome-mcp-servers](https://github.com/ever-works/awesome-mcp-servers)
- [github.com/coderabbitai/skills](https://github.com/coderabbitai/skills)
- [github.com/tradermonty/claude-trading-skills](https://github.com/tradermonty/claude-trading-skills)
- [claude.com/plugins/ralph-loop](https://claude.com/plugins/ralph-loop)
- [claude.com/plugins/financial-analysis](https://claude.com/plugins/financial-analysis)
- [Meta Ads AI Connectors annonce](https://www.facebook.com/business/news/meta-ads-ai-connectors)
- [Anthropic — Agents for financial services and insurance](https://www.anthropic.com/news/finance-agents)
