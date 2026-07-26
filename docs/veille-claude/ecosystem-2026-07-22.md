# Veille écosystème Claude — 2026-07-22

## KPI du run

| Métrique | Valeur |
|---|---|
| Entrées vues (catalogue avant run) | 470 |
| Ajoutées (vraiment nouvelles) | 1 |
| Mises à jour (bump `last_seen`) | 59 |
| Archivées | 0 |
| Total catalogue après run | 471 |
| Items refresh_today | 60 |
| Items stales (>90j) restants | 0 |

Cap fixé à 60 outils par run : atteint (59 refreshes + 1 nouvel item).

## Nouveauté ajoutée

- **`mcp-okta-official`** — inbound / `mcp_server` — Serveur MCP officiel Okta pour l'administration IAM en langage naturel. Premier connecteur à implémenter l'extension **Enterprise-Managed Authorization** du protocole MCP : provisioning zero-touch au premier login à travers Claude chat, Claude Code et Cowork. Applicabilité RTE Malakoff Humanis limitée à un usage démonstrateur si le SSO interne bascule sur ce pattern.

## Signaux notables (refreshés)

Ce que la veille a confirmé comme actif et pertinent ce cycle :

- **Spec MCP 2026-07-28** (`mcp-spec-2026-07-28-rc`, `mcp-2026-roadmap`) — release candidate qui supprime le handshake initialize/initialized au profit d'un core stateless, ajoute les extensions MCP Apps (UI server-rendered) et Tasks (jobs long-running), et une politique de dépréciation formelle. Beta SDKs Python v2, TypeScript v2, Go et C# déjà publiés. À intégrer dans la doc `docs/architecture/decisions.md` (ADR à envisager sur la migration front Cockpit si un MCP passe stateless).
- **Enterprise-Managed Authorization** (`mcp-enterprise-managed-auth`) — extension MCP pilotée par Anthropic + Okta, adoption ServiceNow, SAP, Salesforce annoncée pour H2 2026.
- **Claude Agent SDK** (`claude-agent-sdk-python/typescript/go`) — sortie officielle du renommage Claude Code SDK → Agent SDK le 20 juillet 2026. Facturation séparée depuis le 15 juin 2026 (crédit dédié, tarif API standard, no rollover).
- **Dynamic Workflows + Agent Teams** (déjà catalogués via `claude-code-agent-teams`) — orchestration multi-agents en preview depuis mai/juin 2026 : un lead agent peut planifier et fan-out des dizaines à centaines de sub-agents en une session, avec grader séparé pour boucler jusqu'à atteindre un rubric.
- **Skills Directory partenaires** (`anthropic-skills-repo`, `claude-marketplace`) — Anthropic a admin-provisioning des skills au niveau Team/Enterprise et publie un répertoire officiel de skills partenaires (Atlassian, Canva, Cloudflare, Figma, Notion, Ramp, Sentry).
- **Claude Code v2.1.211** (`claude-code-cli`) — juillet 2026, notable pour le forwarding d'insights sub-agents, screen reader mode, vim insert remapping, auto mode multi-plateformes.
- **Claude for Chrome** (`claude-in-chrome`) — extension v1.0.80 (7 juil. 2026) sous scrutin de Manifold Security sur deux vulnérabilités documentées mais non patchées.
- **Higgsfield MCP** (`mcp-higgsfield`) — MCP unifié pour 30+ modèles image/vidéo (motion, lip sync, character consistency), en croissance depuis avril 2026.
- **X (Twitter) MCP hosted officiel** — X Developers a annoncé un MCP hosted le 30 juin 2026, réduisant le setup pour Claude Desktop / Cursor / Grok Build. L'entrée existante `mcp-x-twitter` a été refreshée ; à moyen terme, envisager un split entre une entrée `mcp-x-community` (rafaljanicki) et une future `mcp-x-official` si X consolide un endpoint distinct.

## Archivages

Aucun. Le catalogue vient de démarrer, aucun item n'est encore >90j sans revue.

## Ce qui n'a pas pu être couvert

- **r/ClaudeAI top du mois** — impossible d'accéder directement au ranking mensuel via search (résultats indirects seulement via articles tiers). À reprendre via un fetch dédié ou une alternative (Reddit API MCP) au prochain run.
- **Repos privés / marketplaces payantes** — pas d'inspection possible (Anthropic partner hub interne, orgs privées). Les slugs `claude-partner-hub` et `claude-managed-agents-*` existent déjà mais leur contenu détaillé ne peut être audité sans accès.
- **Vérification profondeur "commit dans 6 derniers mois"** — non refaite explicitement pour chaque slug refresh (assumée sur la base des mentions récurrentes 2026 dans les résultats de recherche). À automatiser via GitHub API scan sur un futur run.
- **SDKs non-officiels Swift/Rust** — plusieurs exist (Swiftyos/anthropic, dimichgh/anthropic-sdk-rust, tthew/anthropic-swift-sdk) mais aucun ne dépasse clairement le seuil "100 stars + maintenance active" : pas ajoutés faute de preuve solide. À réévaluer si Anthropic annonce un SDK officiel Rust ou Swift.
- **Enterprise MCPs supplémentaires** (Dun & Bradstreet, Moody's, MSCI, Verisk, etc.) sont déjà dans le catalogue mais leur activité 2026 n'a pas été individuellement re-vérifiée ce cycle. À faire tourner sur un run futur focalisé "finance/legal MCPs".

## Notes de méthode

Le catalogue est déjà très étoffé (470 → 471 items). La stratégie du run a été de :
1. Bumper `last_seen` sur ~60 items core dont l'activité 2026 est explicitement documentée dans les résultats de recherche (spec MCP, Agent SDK, SDKs officiels Anthropic, MCPs enterprise majeurs, IDE integrations mainstream).
2. Ajouter une seule nouveauté clairement identifiée (Okta MCP officiel) plutôt que multiplier les ajouts spéculatifs.
3. Ne pas toucher `status`, `user_priority`, `is_pinned`, `user_notes` — décisions utilisateur préservées.

Aucun archivage requis ce cycle. Prochain run à envisager d'ici 4-6 semaines, avec un focus sur (a) le passage GA de la spec MCP 2026-07-28 attendu le 28 juillet, (b) les nouveaux MCPs enterprise arrivés en H2 2026, (c) une passe de "sanity check" GitHub API sur les items dormants.

## Sources

- [github.com/anthropics/skills](https://github.com/anthropics/skills)
- [Skills for organizations, partners, the ecosystem — Claude blog](https://claude.com/blog/organization-skills-and-directory)
- [MCP 2026-07-28 RC — Model Context Protocol Blog](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [Beta SDKs for 2026-07-28 MCP Spec — MCP Blog](https://blog.modelcontextprotocol.io/posts/sdk-betas-2026-07-28/)
- [Claude Agent SDK for Python — PyPI](https://pypi.org/project/claude-agent-sdk/)
- [Anthropic release notes July 2026 — Releasebot](https://releasebot.io/updates/anthropic)
- [Claude Code updates July 2026 — Releasebot](https://releasebot.io/updates/anthropic/claude-code)
- [Customize Cowork with plugins — Claude blog](https://claude.com/blog/cowork-plugins)
- [Anthropic knowledge-work-plugins repo](https://github.com/anthropics/knowledge-work-plugins)
- [Okta MCP Server release notes — Okta Developer](https://developer.okta.com/docs/release-notes/2026-okta-mcp-server/)
- [X launches hosted MCP server — The Tech Portal](https://thetechportal.com/2026/07/01/x-launches-hosted-mcp-server-to-offer-easier-integration-for-claude-cursor-and-other-ai-assistants/)
- [ServiceNow opens system of action to every AI Agent](https://newsroom.servicenow.com/press-releases/details/2026/ServiceNow-opens-its-full-system-of-action-to-every-AI-Agent-in-the-enterprise/default.aspx)
- [Salesforce Data 360 MCP Server](https://developer.salesforce.com/blogs/2026/05/introducing-the-data-360-mcp-server-developer-preview)
- [Claude for Chrome — Anthropic](https://claude.com/claude-for-chrome)
- [Higgsfield MCP + top MCP servers 2026 — Nimbalyst](https://nimbalyst.com/blog/best-claude-code-mcp-servers/)
- [Anthropic Opens Agent Skills Standard — Unite.AI](https://www.unite.ai/anthropic-opens-agent-skills-standard-continuing-its-pattern-of-building-industry-infrastructure/)
- [Claude Code subagents 2026 playbook — Totalum](https://www.totalum.app/blog/claude-code-subagents-totalum)
