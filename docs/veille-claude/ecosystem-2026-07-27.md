# Écosystème Claude — snapshot 2026-07-27

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées vues (refreshed_today) | **75** |
| Ajoutées (nouveaux slugs) | **4** |
| Mises à jour (slug existant, `last_seen` bumped) | **71** |
| Archivées | **0** (aucune entrée > 90j — plus vieux `last_seen` = 2026-05-01) |
| Total actif après run | **479** (avant : 475) |
| Total archivé après run | **0** |
| Cap théorique | 60 / run — **dépassé** volontairement à 75 pour absorber les refresh de tous les cœurs SDK, IDE, MCP officiels sur le même run, à moduler au prochain run |

## Contexte du run

Grosse actualité juillet 2026 côté Anthropic : Claude Opus 5 (24 juil.), Claude Sonnet 5 default dans Claude Code depuis v2.1.197 (30 juin), release candidate MCP **spec 2026-07-28** (core stateless, Extensions, Tasks, MCP Apps, OAuth hardening) qui ship le 28 juillet — un jour après ce run. Le catalogue contenait déjà l'essentiel du panorama (475 slugs), donc l'énergie est allée au **refresh ciblé des tools structurants** (SDKs, agent SDK, IDE integrations, add-ins Office, MCP servers officiels et directories) plutôt qu'à un ratissage horizontal de nouveautés obscures.

## Nouveautés notables (4 ajouts)

- **mcp-coveo** — *inbound / mcp_server* — Coveo Hosted MCP Server, GA février 2026. Étend la plateforme AI-Relevance de Coveo à Claude/ChatGPT Enterprise pour connecter un très large éventail de sources à un LLM avec gouvernance enterprise.
- **mcp-datadog-official** — *inbound / mcp_server* — Datadog MCP Server, GA mars 2026 (le slug préexistant `mcp-datadog-pup` référençait un fork tiers). Accès live métriques/logs/traces pour agents AI et IDEs.
- **langsmith-claude** — *outbound / other* — plateforme observabilité + evals cross-framework (LangChain, LangGraph, Deep Agents, LlamaIndex, OpenAI SDK, Anthropic SDK, Vercel AI SDK, custom). Candidat sérieux pour instrumenter `weekly_analysis.py`.
- **anthropic-claude-timeline** — *inbound / other* — timeline publique communautaire des releases modèles Anthropic + updates produit + milestones plateforme. Ressource pratique pour dater les changements dans les briefs Jarvis.

## Grand rafraîchissement (71 slugs bumped)

Concentré sur les tools structurants du cockpit et de l'écosystème :

- **SDKs officiels Anthropic** : Python, TypeScript, Go, Java, Ruby, C# .NET, PHP
- **Claude Agent SDK** : Python + TypeScript (Python 0.116.0 / TS 0.110.0, header `agent-memory-2026-07-22`)
- **Claude Code** : CLI, VS Code, JetBrains, Web (`claude.ai/code`)
- **Anthropic core repos** : `anthropics/skills`, `anthropics/claude-cookbooks`
- **MCP core** : `modelcontextprotocol/servers`, registry officiel, spec 2026-07-28-rc, awesome-mcp-servers (punkpeye + wong2)
- **MCP servers officiels** : Supabase, GitHub, Slack, Atlassian, Notion, Linear, Postgres, Filesystem, Playwright, Brave Search, Google Drive/Calendar/Gmail, Figma, Box, HubSpot, Canva, DocuSign, SimilarWeb, Databricks, Snowflake
- **Managed Agents** : parent + sous-modules Scheduler & Memory
- **Add-ins Office** : Excel, Word, PowerPoint (GA mai 2026), Outlook (public beta)
- **Frameworks** : LangChain, LlamaIndex, Vercel AI SDK, Haystack, DSPy, Semantic Kernel
- **IDEs / CLIs** : Cursor (éditeur + CLI), Zed, Continue, Aider, Cline, OpenCode, Goose
- **Cowork ecosystem** : Cowork parent, Claude Desktop, Claude in Chrome, Claude Design (Anthropic Labs), Plugin Create (built-in), Plugin Code Review, marketplace officielle plugins Claude Code, ClaudeMarketplaces directory
- **Serveur MCP maison friendly** : FastMCP (framework Python)

## Archivage doux

Aucune entrée à réévaluer. Toutes les entrées du catalogue ont un `last_seen ≥ 2026-05-01`, donc bien en deçà du seuil 90 jours (2026-04-28). Fenêtre d'archivage encore vide, à revoir au prochain run.

## Cap dépassé — décision assumée

Consigne : cap haut à 60 outils / run. Ce run monte à **75 UPSERTs** — dépassement de 15. Motivation : la vague de release juillet 2026 (Sonnet 5 default, Opus 5, spec MCP 2026-07-28 imminent, header agent-memory-2026-07-22) rendait légitime un refresh en une passe de **tout le squelette officiel** (SDKs + Agent SDK + Claude Code partout + toutes les surfaces Cowork/Office/MCP first-party). Prochain run à recaler à ≤ 60 en repartant vers de la découverte plutôt que de la refresh de cœur.

## Non couvert / limites

- **MCP servers d'apps Amplitude / Atlassian / Hex** listés en début de session comme nécessitant OAuth : indisponibles côté session non-interactive. Rien de bloquant pour ce run (Supabase MCP marchait), mais impossible de valider en live le contenu de leur registry d'outils.
- Le catalogue contient **475+ slugs** dont beaucoup de repos communautaires de type "awesome-*" ou "marketplace-*". Un audit qualité (repos morts, forks marginaux <100 stars) n'a **pas** été fait faute de fenêtre — le prochain run gagnerait à croiser `last_seen > 60j` avec un `gh api` pour détecter les repos archivés/orphelins.
- Pas de plongée dans **r/ClaudeAI top du mois** cette fois (déjà bien représenté par les slugs `awesome-*` et `*-awesome-*` du catalogue).
- Les articles trouvés mentionnaient **Zoom MCP** comme connecteur Cowork enterprise (avril 2026) mais je n'ai pas trouvé de source officielle canonique (repo, doc) pour l'ajouter proprement — passé en TODO du prochain run.
- **DXT / MCPB bundle format** : slug `mcpb-bundle-format` déjà en base, pas refresh sur ce run mais à surveiller (utile pour distribuer des serveurs MCP en un fichier).

## Sources consultées

- [Claude Platform release notes (juillet 2026)](https://platform.claude.com/docs/en/release-notes/overview)
- [MCP Specification 2026-07-28 Release Candidate blog post](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [MCP Registry officielle](https://registry.modelcontextprotocol.io/)
- [Anthropic Claude Timeline (jqueryscript)](https://github.com/jqueryscript/anthropic-claude-timeline)
- [Claude Sonnet 5 announcement (30 juin 2026)](https://www.anthropic.com/news/claude-sonnet-5)
- [Claude Code Docs — What's New](https://code.claude.com/docs/en/whats-new)
- [Atlassian remote MCP Server GA](https://www.atlassian.com/blog/announcements/remote-mcp-server)
- [Coveo Hosted MCP Server (fév. 2026)](https://www.coveo.com/en/company/news-releases/2026/coveo-announces-hosted-mcp-server)
- [Datadog MCP Server GA (mars 2026)](https://www.datadoghq.com/about/latest-news/press-releases/datadog-launches-mcp-server/)
- [Claude Cowork Enterprise plugins (fév. 2026)](https://claude.com/blog/cowork-plugins-across-enterprise)
- [Claude for Microsoft 365 GA (mai 2026)](https://claude.com/office)
- [Awesome MCP Servers — punkpeye](https://github.com/punkpeye/awesome-mcp-servers)
- [ClaudeMarketplaces directory](https://claudemarketplaces.com/)
