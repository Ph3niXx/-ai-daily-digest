# Veille écosystème Claude — 2026-06-08

## Compteurs

| Métrique | Valeur |
|---|---|
| Outils vus durant le run | 66 |
| Vraiment nouveaux (insert) | 4 |
| Existants mis à jour (last_seen bumpé) | 62 |
| Archivés ce run | 0 |
| Catalogue total (actif) avant run | 411 |
| Catalogue total (actif) après run | 415 |

Pas d'archivage : aucun item ne dépassait 90 jours sans revue (last_seen le plus ancien = 2026-05-01, soit 38 jours).

## Nouveautés notables

**claude-ultracode-plugin** — outbound · other · Anthropic
Mode "ultracode" de Claude Code lancé en research preview le 28 mai 2026. Activé via `/effort ultracode`, combine effort xhigh et orchestration auto de Dynamic Workflows (jusqu'à 1000 subagents par run, 16 en parallèle). On par défaut sur Max/Team, opt-in côté Enterprise. Pertinent pour les gros refactos cross-cockpit.

**shopify-ai-toolkit** — inbound · mcp_server · Shopify
Open-sourcé le 9 avril 2026. Stack officielle (Dev MCP + Storefront MCP + Customer Accounts MCP), 7 outils search docs / validate GraphQL / execute store ops. Connecte Claude, Cursor, Codex, Gemini CLI à l'Admin API. Peu pertinent pour Jarvis (pas de boutique) mais bon signal "vendor lance son MCP en 2026".

**otterlyai-skill** — inbound · skill · OtterlyAI
Skill Claude lancée le 1er juin 2026. Tire les données AI brand visibility dans Claude (perf brand+domain, recos, summaries exec). Vient avec une API publique et un marketplace de 100+ workflows marketing AIO/SEO.

**security-guidance-plugin** — inbound · cowork_plugin · Anthropic
Plugin officiel mai 2026. Scan vulnérabilités sur edits, post-AI generation et au commit. Analyse patterns risqués, full diffs, context. 30-40 % de réduction des comments sécurité sur PRs en interne. Pertinent pour Jarvis Cockpit (RLS, JWT, secrets) et codebases Malakoff.

## Mises à jour notables (last_seen rafraîchi)

Confirmés actifs en juin 2026 via les sources officielles :

- **Anthropic core** — anthropic-skills-repo, claude-cookbooks, anthropic-sdk-python, anthropic-sdk-typescript, claude-agent-sdk-{python,typescript,go}, claude-code-cli, cowork, claude-desktop, claude-in-chrome, claude-for-excel
- **Cowork plugins officiels** — claude-plugins-official, knowledge-work-plugins, claude-marketplace, plugin-frontend-design, claude-managed-agents, claude-managed-agents-sandboxes (public beta mai 2026), mcp-tunnels (research preview mai 2026)
- **Plugins populaires (compteurs install au 1er juin 2026)** — plugin-frontend-design (829 316), superpowers-skills (752 120), context7-mcp (348 660)
- **IDE / runtime** — claude-code-vscode, claude-code-jetbrains, jetbrains-claude-code-gui-plugin, cursor-editor, cursor-cli, windsurf-editor, zed-editor (v1.0 + Terminal Threads mai 2026), agent-client-protocol (Zed × JetBrains, janvier 2026), cline, roo-code, continue-dev, goose
- **MCP infra + listings** — awesome-mcp-{servers,clients,devtools}-punkpeye, modelcontextprotocol-servers, mcp-registry-official, pulsemcp-directory (15 930+ serveurs), smithery-registry (~7 300), glama-mcp-registry, mcp-2026-roadmap
- **MCP servers clés** — mcp-supabase, mcp-github, mcp-postgres, mcp-slack, mcp-linear, mcp-atlassian, mcp-notion, mcp-higgsfield, mcp-meta-ads (officiel avril 2026), mcp-google-ads-official, mcp-stainless (acquis Anthropic mai 2026)
- **Frameworks** — langchain-claude, langgraph, llamaindex-claude, vercel-ai-{sdk,sdk-6,gateway}, haystack-claude, dspy-claude, semantic-kernel-claude

## Archivages

Aucun. Le catalogue est jeune (~5 semaines depuis le bootstrap) et tous les items sont passés à moins de 90 jours.

## Notes / limites

- **Cap soft dépassé légèrement** : 66 items touchés vs 60 visés. Surplus justifié par la concentration de la recherche sur les sources canoniques (Anthropic, MCP, SDKs, frameworks majeurs) — pas une dérive vers de la veille fine.
- **Sources Reddit r/ClaudeAI** : effleurées par la recherche web mais pas creusées en profondeur (pas d'API directe lecture-only sur Reddit dans cet environnement). Les tools émergents communautaires sont sous-représentés dans cette mise à jour.
- **Pas d'ouverture des dépôts GitHub** : la recherche web a confirmé l'activité via les snippets et changelog tiers (releasebot, claudefa.st, marktechpost, infoq) sans vérifier les commits/releases datés un par un. Pour les ~340 items non touchés ce run, leur last_seen reste celui de la dernière revue.
- **Cookbook scientifique / financial / legal** : Anthropic a annoncé en avril–juin 2026 des bundles (20+ legal MCP connectors, 12 practice-area plugins, 10 agent templates finance). Le catalogue contient déjà `anthropic-financial-services`, `claude-finance-agents`, `anthropic-claude-for-legal` et de nombreux `mcp-*` legal/finance — pas de nouveau slug créé pour éviter la duplication, mais ces items méritent un refresh au prochain run.
- **Plan de couverture des prochains runs** : prioriser ensuite (1) les `awesome-claude-*` lists qui n'ont pas été bumpés depuis 5+ semaines pour vérifier leur activité, (2) les SDKs non-Python/TS (Go, Java, Rust, Ruby, PHP, C#, Kotlin) avec leurs releases, (3) les MCP gateways (kong, mintmcp, obot, truefoundry, webrix) pour confirmer maintien.
