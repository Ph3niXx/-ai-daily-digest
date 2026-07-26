# Veille écosystème Claude — 2026-07-17

## Chiffres du run

- Snapshot base : **470 outils actifs** (0 archivés) avant run
- Outils vus / traités ce run : **54**
- Nouveaux (INSERT) : **0**
- Mis à jour (bump `last_seen` + metadata refresh) : **54**
- Archivés : **0** (aucun item avec `last_seen < CURRENT_DATE - 90 days`)

Le catalogue est déjà très complet (470 entrées). Ce run s'est concentré sur
la vérification de fraîcheur des ~50 items canoniques de l'écosystème Claude
et la mise à jour de leurs descriptions avec les annonces 2026 confirmées.

## Focus du run — items rafraîchis

### Annonces Anthropic 2026 (avec dates confirmées)

Nom | Direction / Type | Ligne
--- | --- | ---
Claude Managed Agents | outbound / agent_runtime | Service hébergé lancé 8 avril 2026, beta publique, +0,08 $/session-heure
Claude Agent Templates for Financial Services | outbound / other | 10 templates finance mai 2026 (pitchbook, KYC, close mensuel)
Claude Code Channels | both / other | 20 mars 2026, push events Telegram/Discord/iMessage dans session Claude Code locale
Claude Tag (Slack) | outbound / connector | 23 juin 2026, beta publique multiplayer AI par canal Slack
Claude for Excel / Word / PowerPoint | outbound / connector | GA 7 mai 2026, fil de conversation partagé cross-app M365
Claude for Outlook | outbound / connector | Beta publique 7 mai 2026, même fil de conversation M365
Agent Skills open standard | inbound / skill | Spec publiée 18 décembre 2025 sur agentskills.io, ~40 clients compatibles en juin 2026
Claude Connectors & Partner Skills Directory | both / other | Marketplace Cowork lancé 24 février 2026

### SDK, IDE, CLI rafraîchis

Claude Agent SDK Python/TypeScript, Anthropic SDK Python/TypeScript/Go/Java/Ruby, Claude Code CLI + extensions VS Code et JetBrains, Cursor, Aider, Zed, Continue.dev, Claude Desktop.

### MCP servers canoniques rafraîchis

GitHub, Supabase, Playwright (Microsoft), Context7 (Upstash), Exa, Postgres, Slack, Notion, Linear, Gmail, Google Drive, Google Calendar, Atlassian, Figma, Canva, Cloudflare, Sentry, Stripe.

### Frameworks Claude rafraîchis

LangChain, LlamaIndex, Vercel AI SDK, Haystack (deepset), Semantic Kernel (Microsoft, fusion AutoGen v1.0 GA avril 2026), DSPy.

### Directories rafraîchis

`punkpeye/awesome-mcp-servers`, `modelcontextprotocol/servers`.

## Aucun archivage ce run

Requête `status = 'active' AND last_seen < CURRENT_DATE - 90 days` retourne
**0 lignes**. Tous les items actifs ont été revus dans les 90 derniers jours
par les précédents runs. Aucun outil à basculer en `archived`.

## Ce qui n'a pas été couvert

- **Cap 60 outils/run** — le catalogue à 470 entrées ne justifie pas un
  balayage exhaustif à chaque run. Ce run est un refresh ciblé des items
  les plus fondamentaux + les annonces 2026 confirmées.
- **r/ClaudeAI top du mois** — non exploré (Reddit search limité côté
  connecteur), à traiter dans un run dédié "veille émergents".
- **Repos privés / paywall** — écartés par design (filtre "maintenu +
  ≥100 stars").
- **Outils non anglophones** — non spécifiquement recherchés cette
  itération, le catalogue actuel est très anglo-centré.

## Notes pour le prochain run

1. Chercher spécifiquement les nouveaux partner skills post-décembre 2025
   (Ramp, Sentry, Stripe côté skills — pas seulement côté MCP).
2. Sonder `r/ClaudeAI` "top monthly" pour émergents tiers (nouveaux SDKs
   communautaires, extensions IDE, MCP servers de niche).
3. Balayer Anthropic release notes (`releasebot.io/updates/anthropic`) pour
   les annonces produit depuis juin 2026.
4. Vérifier si des SDKs Anthropic obscurs (PHP, Rust, Kotlin, Swift) ont
   des releases récentes ou sont dormants — plusieurs sont déjà dans la
   base mais aucun n'a été rafraîchi ce run.

## Sources principales consultées

- github.com/anthropics/skills
- github.com/anthropics/anthropic-cookbook
- github.com/anthropics/knowledge-work-plugins
- claude.com/blog/organization-skills-and-directory
- claude.com/blog/skills
- claude.com/blog/cowork-plugins
- claude.com/claude-for-microsoft-365
- code.claude.com/docs/en/channels
- anthropic.com/news/managed-agents
- anthropic.com/news/finance-agents
- support.claude.com (help center Cowork plugins)
- punkpeye/awesome-mcp-servers
- modelcontextprotocol/servers
- mcpservers.org, mcpbundles.com, glama.ai (directories tiers)
