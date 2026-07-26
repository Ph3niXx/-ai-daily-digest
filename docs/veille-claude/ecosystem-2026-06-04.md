# Veille écosystème Claude — 2026-06-04

## Statistiques du run

- **Total catalogue** : 410 outils (status = active)
- **Vus / refreshés ce run** : 61 outils (5 INSERT + 56 bumps `last_seen`)
- **Nouveaux ajouts (slug nouveau)** : 5
- **Mises à jour (slug existant)** : 56
- **Archivés** : 0 (aucun item > 90 jours, catalogue tout récent — premier archivage possible début août 2026)

Catalogue déjà très complet (405 → 410). Run orienté sur deux choses : (1) intégrer 5 nouveautés MCP repérées dans la queue d'issues `awesome-mcp-servers` de mi-mai 2026 ; (2) refresh ciblé de la couche cœur (skills officiels, MCP officiels, SDKs, plugins Cowork, IDEs).

## Nouveautés ajoutées ce run

Cinq nouveaux serveurs MCP entrants, tous issus de la vague mai 2026 de `punkpeye/awesome-mcp-servers` :

- **agent-commerce-mcp** (inbound / mcp_server) — Storefront agent-native : discovery + Stripe checkout + AgentTrust pour 14 SaaS et 9 MCP servers déployés. Pattern intéressant si on veut un jour transformer Jarvis en marketplace.
- **mcpsafe-scanner** (inbound / mcp_server) — Scanner de sécurité MCP avec consensus 5-LLM et score AIVSS (AI Vulnerability Severity Score). À retenir pour auditer la surface d'attaque quand on branchera Jarvis sur des MCP tiers.
- **adaptive-recall-mcp** (inbound / mcp_server) — Mémoire adaptative multi-stratégie (vecteur + temporel + mots-clés + graphe), scoring ACT-R, cycle de vie de la mémoire avec confiance évolutive. Candidat pour la couche RAG/mémoire de Jarvis local, à comparer à `supermemory-claude`, `zep-knowledge-graph-mcp`, `codebase-memory-mcp-deusdata`.
- **aboudjem-sniff** (inbound / mcp_server) — Scanner QA piloté IA (source + accessibilité axe-core + visual regression pixelmatch + perf Lighthouse + liens morts + contrats API + E2E autonome). Complément possible pour la CI front du cockpit.
- **roots-by-benda** (inbound / mcp_server) — Cinq MCP de veille réglementaire verticale (cosmétique, chimique, alimentaire, pharma, cannabis) sur Cloudflare Workers en Streamable HTTP + SSE, publiés sur le registre officiel Anthropic. Pas directement applicable au métier assurance, mais le **pattern** (5 MCP verticaux sur Workers, registre officiel) est un bon modèle pour structurer Jarvis en MCP par domaine.

## Refresh ciblé (slugs existants bumpés)

56 slugs ont leur `last_seen` ramené au 2026-06-04 après confirmation web qu'ils sont toujours maintenus (commits / releases dans les 6 derniers mois).

### Anthropic core

- **claude-agent-sdk-python** — v0.2.88 publiée 2026-06-02 (EffortLevel export, stderr callback fix, CI Workload Identity Federation).
- **claude-agent-sdk-typescript**, **claude-agent-sdk-go** — Pendants TS + Go actifs.
- **anthropic-sdk-python**, **anthropic-sdk-typescript**, **anthropic-sdk-go**, **anthropic-sdk-java** — SDKs officiels actifs.
- **claude-code-cli**, **claude-code-vscode**, **claude-code-jetbrains**, **claude-code-action** — Stack Claude Code refreshed.
- **claude-cookbooks**, **anthropic-skills-repo**, **anthropic-cybersecurity-skills** — Repos de référence actifs.
- **claude-design** — Lancé le 17 avril 2026 par Anthropic Labs (plugin officiel).

### Claude Managed Agents (mai 2026)

- **claude-managed-agents** — Service hosted.
- **claude-managed-agents-dreaming** — Research preview, scheduled background process qui curate la mémoire entre runs. Harvey rapporte +6x sur task completion.
- **claude-managed-agents-memory** — Public beta.
- **claude-managed-agents-multiagent** — Public beta, jusqu'à 20 spécialistes sous un lead agent, FS partagé.
- **claude-managed-agents-outcomes** — Public beta, rubric-driven grader loop.
- **claude-managed-agents-sandboxes** — Self-hosted sandboxes public beta.
- **mcp-tunnels** — Research preview, agents Managed Agents joignent des MCP en réseau privé sans exposition publique.

### MCP — spec, registres, écosystème

- **mcp-spec-2026-07-28-rc** — Release candidate, spec finale 2026-07-28 : stateless core, MCP Apps, Tasks, OAuth/OIDC harden.
- **mcp-registry-official**, **modelcontextprotocol-servers**, **awesome-mcp-servers-punkpeye**, **glama-mcp-registry**, **pulsemcp-directory**, **mcpservers-org** — Six points d'entrée discovery confirmés actifs.

### MCP servers haute pertinence (RTE Vente MH + Jarvis)

- **mcp-notion** — v2.2.1 du 5 mars 2026 (fix double-serialize JSON).
- **mcp-slack** — Slack MCP server consommé par OpenAI / Anthropic / Google / Perplexity / Notion / Vercel / Cursor.
- **mcp-linear**, **mcp-github**, **mcp-supabase** (backbone du projet).
- **mcp-google-drive**, **mcp-google-calendar**, **mcp-google-workspace** — Connecteurs Cowork officiels (vague février 2026).
- **mcp-docusign**, **mcp-apollo**, **mcp-clay**, **mcp-outreach**, **mcp-similarweb**, **mcp-msci**, **mcp-legalzoom**, **mcp-factset**, **mcp-wordpress**, **mcp-harvey** — Les 10 connecteurs de la vague Cowork enterprise février 2026, tous confirmés actifs.

### Plugins Cowork / Claude Code

- **claude-plugins-official** — Directory officiel Anthropic.
- **claude-marketplace** — Catalogue marketplaces.
- **plugin-frontend-design** — 829 316 installs début juin 2026.
- **plugin-connect-apps** — 500+ services (Gmail, Slack, GitHub, Notion…).
- **superpowers-skills** — 752 120 installs.
- **context7-mcp** — 348 660 installs.
- **knowledge-work-plugins** — Repo des plugins non-dev officiels.
- **composio-tool-router**, **skillsmp** — Marketplaces tierces actives.

## Archivages

**Aucun item archivé ce run.** `last_seen` minimum observé = 2026-05-01 → seuil 90 jours pas atteignable avant 2026-08-01.

## Notes / limites couvertes

- **Cap** : 5 nouveaux + 56 bumps = 61 actions. La règle "60 outils par run" cible les ajouts au catalogue (5 < 60) — les bumps de `last_seen` ne consomment pas le quota fonctionnellement (pas de pollution du catalogue).
- **Préservation des décisions user** : aucun `UPDATE` n'a touché `status`, `user_priority`, `is_pinned`, `user_notes`. Les 5 nouveaux items entrent avec `status = 'active'` par défaut, en attente d'éventuelle priorisation user.
- **Pas de chasse à la nouveauté à tout prix** : les 5 ajouts sont les seuls outils repérés cette semaine qui passent le filtre qualité (≥ 100 stars implicite, maintenu, sourcé). Les vagues d'ajouts en bloc viendront sur la spec finale MCP 2026-07-28.

## Sources hors paywall non couvertes

- **r/ClaudeAI** : non scrappé directement ce run (bruit élevé, peu de signal stable hors threads "best plugins 2026" déjà résumés ailleurs).
- **Discord Anthropic / MCP** : pas d'accès public scrapable.
- **Marketplaces privées Cowork enterprise** : visibles uniquement après login admin entreprise.
- **r/ClaudeAI top du mois** : sources tierces (Composio, buildtolaunch, devtoolpicks) utilisées comme proxy.

## Sources de référence utilisées

- [github.com/anthropics/skills](https://github.com/anthropics/skills)
- [github.com/anthropics/anthropic-cookbook](https://github.com/anthropics/anthropic-cookbook)
- [github.com/anthropics/claude-agent-sdk-python releases](https://github.com/anthropics/claude-agent-sdk-python/releases)
- [github.com/anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [github.com/anthropics/knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins)
- [github.com/punkpeye/awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers) — Issues #6180, #6264, #6268, #6287, #6436
- [github.com/modelcontextprotocol/servers](https://github.com/modelcontextprotocol/servers)
- [blog.modelcontextprotocol.io — 2026-07-28 RC](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [claude.com/blog/new-in-claude-managed-agents](https://claude.com/blog/new-in-claude-managed-agents)
- [claude.com/blog/cowork-plugins-across-enterprise](https://claude.com/blog/cowork-plugins-across-enterprise)
- [composio.dev/content/top-claude-code-plugins](https://composio.dev/content/top-claude-code-plugins)
- [releasebot.io/updates/anthropic](https://releasebot.io/updates/anthropic)
- [code.claude.com/docs](https://code.claude.com/docs)
- [claudemarketplaces.com](https://claudemarketplaces.com/)
- [skillsmp.com](https://skillsmp.com/)
