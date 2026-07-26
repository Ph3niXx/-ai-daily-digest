# Catalogue écosystème Claude — 2026-05-16

Routine automatique de mise à jour de la table `claude_ecosystem`.
Couvre l'inbound (MCP, skills, plugins Cowork qui se branchent à Claude) et
l'outbound (SDK, IDE, frameworks qui appellent Claude).

## Métriques

| Métrique                                    | Valeur |
|---------------------------------------------|--------|
| Entrées vues / confirmées ce run            | 58     |
| Vraiment nouvelles (INSERT)                 | 10     |
| Existantes mises à jour (`last_seen` bumpé) | 48     |
| Archivées ce run                            | 0      |
| Total catalogue actif                       | 340    |
| Items stale (>90 j) restants                | 0      |

Aucun archivage doux n'a été déclenché : tous les items du catalogue ont été
revus dans les 90 derniers jours (rythme de veille soutenu, run mensuel
précédent toujours frais).

## Nouveautés notables (INSERT)

Toutes inbound (outils qui se branchent à Claude), majoritairement de type
`mcp_server`. Le pic vient de la vague mai 2026 : Claude for Legal, Claude
for Small Business, écosystème MCP unifié.

- **claude-for-small-business** (`cowork_plugin`, Anthropic) — pack officiel Cowork
  lancé le 13/05/2026, 15 workflows + 15 skills + 11 connecteurs
  (QuickBooks, PayPal, HubSpot, Canva, DocuSign, Google Workspace, M365, Slack,
  Square, Stripe, Webflow). Réservoir de patterns agentiques même si pas le
  coeur de cible perso.
- **nitro-mcp** (`mcp_server`, Nitro Software) — connecteur MCP de Nitro
  Document, early access avant arrivée marketplace. Workflows documentaires
  end-to-end en langage naturel. Pertinent pour la mission RTE (contrats,
  pièces réglementaires).
- **mindsdb-mcp** (`mcp_server`, MindsDB) — serveur fédéré qui expose 200+
  sources (Postgres, Snowflake, BigQuery, Gmail, Slack, fichiers) derrière
  une seule interface. Très adapté pour Jarvis : pouvoir interroger Supabase +
  données externes sans empiler les MCP.
- **klavis-ai** (`mcp_server`, Klavis AI / YC X25) — plateforme open-source
  pour héberger des serveurs MCP en prod avec OAuth managé, et le mode unifié
  Strata (83 %+ d'accuracy sur workflows complexes).
- **mcp-klaviyo** (`mcp_server`, Klaviyo) — extension officielle annoncée le
  07/05/2026, expose Query Metric Aggregates côté Claude.ai et Cowork.
- **1mcp-agent** (`mcp_server`, 1mcp-app) — gateway local qui agrège plusieurs
  MCP en un seul endpoint, recharge la conf à chaud. Bon candidat pour
  mutualiser la conf MCP dans Claude Desktop côté Jarvis.
- **roundtable-mcp** (`mcp_server`, askbudi) — méta-MCP qui unifie plusieurs
  assistants de coding (Claude, Codex, Cursor) derrière un endpoint MCP.
  Curiosité plus que besoin direct.
- **imagen3-mcp** (`mcp_server`, hamflx) — génération d'images via API Google
  Imagen 3 depuis Claude. Marginal pour Jarvis.
- **reddit-mcp-apify** (`mcp_server`, Apify) — MCP Reddit (avril 2026) avec 7
  capacités (search, posts par subreddit/user, trending). Utile pour les
  corpus de veille (gaming/anime + tendances IA).
- **amazon-ads-mcp** (`mcp_server`, Amazon) — connecteur officiel Amazon
  Advertising (sorti novembre 2025 mais absent du catalogue jusqu'ici).
  Complète Meta Ads + Google Ads.

## Mises à jour (last_seen bumpé)

48 entrées re-confirmées présentes dans l'écosystème mai 2026. Principaux
clusters revus :

- **Anthropic releases mai 2026** : `claude-managed-agents-{dreaming,outcomes,multiagent,webhooks,memory,addins}`,
  `claude-finance-agents`, `claude-for-{excel,outlook,powerpoint,word}`,
  `anthropic-claude-for-legal`, `claude-code-routines`.
- **Legal stack** (release du 12/05/2026) : `mcp-ironclad`, `mcp-docusign`,
  `mcp-definely`, `mcp-imanage`, `mcp-netdocuments`, `mcp-relativity`,
  `mcp-everlaw`, `mcp-consilio`, `mcp-thomson-reuters-cocounsel`,
  `mcp-free-law-project`, `anthropic-financial-services`.
- **Ads platform** : `mcp-meta-ads` (Meta officiel, 29/04/2026),
  `mcp-google-ads-official`.
- **SaaS centraux** : `mcp-asana` (v2 imminent — beta deprecated 11/05/2026),
  `mcp-notion` (3.4 part 2 le 14/04/2026), `mcp-hubspot`, `mcp-microsoft-365`,
  `mcp-salesforce-hosted`, `agentforce-vibes`.
- **Directories / écosystème** : `awesome-mcp-servers-punkpeye` (400 serveurs,
  34 catégories), `best-of-mcp-servers-tolkonepiu`, `modelcontextprotocol-servers`,
  `claude-plugins-official`, `awesome-claude-plugins-quemsah`,
  `chat2anyllm-awesome-claude-plugins`, `anthropic-skills-repo`,
  `superpowers-skills`, `voltagent-awesome-claude-code-subagents`,
  `wshobson-claude-agents`, `fastmcp`, `claude-cookbooks`,
  `claude-code-cli`, `claude-agent-sdk-{python,typescript}`.

## Archivages

Aucun ce run. Tous les items du catalogue ont `last_seen >= CURRENT_DATE -
90 days` (les bumps des routines précédentes tiennent le compteur à jour).

## Limites du run

- Cap volontaire à 60 outils analysés (catalogue mature à 330+ entrées avant
  ce run, l'objectif est d'enrichir à la marge, pas de tout revoir).
- Pas de listing exhaustif des 4 200 skills officiels recensés au 15/05 (la
  plupart sont des sous-skills ; le catalogue tracke les paquets/marketplaces,
  pas chaque skill individuel).
- Pas d'accès direct au flux interne du marketplace Cowork (paywall partiel),
  les nouveautés Cowork sont captées via blog Anthropic + presse.
- `awesome-claude-code-plugins` evoqué dans la presse comme "communauté
  officielle" — slug existant `awesome-claude-plugins-composio` couvre la
  même fonction, pas de duplication créée.
- Pas de plongée Reddit profonde ce run (le filtre dur "≥ 100 stars / commit
  6 mois" élimine la plupart des tools tiers émergents r/ClaudeAI).

## Sources principales consultées

- [Claude Code May 2026 Release Notes](https://pasqualepillitteri.it/en/news/2223/claude-code-may-2026-release-notes-radio-plugin-marketplace)
- [Anthropic Goes All-In on Legal](https://www.lawnext.com/2026/05/anthropic-goes-all-in-on-legal-releasing-more-than-20-connectors-and-12-practice-area-plugins-for-claude.html)
- [Introducing Claude for Small Business](https://www.anthropic.com/news/claude-for-small-business)
- [Agents for financial services](https://www.anthropic.com/news/finance-agents)
- [Anthropic Updates Managed Agents (Dreaming, Outcomes, Webhooks)](https://9to5mac.com/2026/05/07/anthropic-updates-claude-managed-agents-with-three-new-features/)
- [Nitro Releases MCP Connector for Claude AI](https://www.businesswire.com/news/home/20260506055983/en/Nitro-Releases-MCP-Connector-for-Claude-AI-Introduces-Document-Automation-Solution)
- [Klaviyo expands integration with Anthropic](https://www.klaviyo.com/newsroom/klaviyo-anthropic-expanded-integration)
- [Announcing the Klavis AI Unified MCP Server](https://www.klavis.ai/blog/announcing-the-klavis-unified-mcp-server)
- [Awesome MCP Servers — punkpeye](https://github.com/punkpeye/awesome-mcp-servers)
- [Anthropic Skills repo](https://github.com/anthropics/skills)
- [Claude Code Routines guide](https://www.claudedirectory.org/blog/claude-code-routines-guide)
- [Meta Ads Official MCP launch](https://www.thomaseccel.com/blogs/news/meta-ads-official-mcp-is-now-out-meta-mcp-2026)

## Dernière MAJ

2026-05-16 — Run automatique catalogue : +10 nouvelles entrées (Claude for
Small Business + 9 nouveaux MCP), 48 bumps de `last_seen` (vague mai 2026
Anthropic + legal stack), 0 archivage (catalogue à jour).
