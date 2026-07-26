# Catalogue ecosystem Claude — run 2026-05-14

## Volumes

| Metric                       | Valeur |
|------------------------------|--------|
| Entries vues (touchees)      | 56     |
| Vraies nouveautes (INSERT)   | 20     |
| Mises a jour (slug existant) | 36     |
| Archivees                    | 0      |
| Total catalogue post-run     | 322    |

Aucune entree active n'a un `last_seen` au-dela de 90 jours — l'archivage doux est un no-op ce cycle.

## Nouveautes notables

### Orchestration multi-agent au-dessus de Claude Code

- **gas-town** (outbound · agent_runtime) — workspace manager de Steve Yegge / Gas Town Hall. Mayor + agents designes en git-backed, beaucoup d'agents paralleles sur le meme poste.
- **multiclaude** (outbound · agent_runtime) — orchestrator de Dan Lorenc, philosophie "Brownian ratchet" : tant que la CI passe, chaque PR est mergee.
- **shipyard-build** (outbound · agent_runtime) — plateforme SaaS commerciale qui centralise sessions paralleles, contexte partage et permissions multi-projets.
- **9router** (outbound · framework) — proxy multi-modele Claude Code / Codex / Cursor pour economiser les tokens.

### MCP gateways enterprise

- **obot-mcp-gateway** (outbound · agent_runtime) — control plane MCP open-source avec RBAC, audit, observabilite.
- **truefoundry-mcp-gateway** (outbound · agent_runtime) — gateway MCP SaaS positionnee comme alternative complete a Obot et MintMCP, focus gouvernance et per-dev rate limit.

### Vague crypto / finance (MCP cote echanges)

- **mcp-bitgo**, **mcp-bybit**, **mcp-coinbase**, **mcp-coingecko**, **mcp-crypto-com**, **mcp-debridge**, **mcp-alchemy**, **mcp-metatrader** (tous inbound · mcp_server) — la vague crypto MCP 2026 : BitGo (mars), Bybit (avril), CoinGecko, Coinbase, Crypto.com plus deBridge (cross-chain), Alchemy (blockchain APIs) et MetaTrader 5 (forex/indices/crypto). Hors scope Jarvis perso mais signal fort que MCP devient le canal d'integration AI prive en finance/crypto.

### Cookbook Anthropic + agents pre-construits

- **claude-finance-agents** (outbound · skill) — pack des 10 agents financiers pre-construits livres par Anthropic en mai 2026 (Pitch Builder, KYC Screener, Statement Auditor, Month-End Closer, etc.), chacun en plugin Cowork + cookbook Managed Agents. Tres relevant pour la mission RTE Malakoff Humanis (mutuelle = services financiers).

### Privacy / compliance / governance

- **mcp-transcend** (inbound · mcp_server) — DSAR, consent management, data inventory cote agents Claude. Avril 2026. Relevant pour les workflows RGPD Malakoff (CRM, gestion des consents).
- **snyk-agent-scan** (outbound · framework) — scanner securite Snyk pour agents/MCP/skills. Detecte prompt injection (etude ToxicSkills mai 2026 : 36% des skills audites contiennent une injection). A ajouter au radar securite Jarvis Lab.

### Analytics agentique

- **mcp-gooddata** (inbound · mcp_server) — agents Claude qui construisent et operent des analyses BI dans un cadre gouverne. Avril 2026.

### Infrastructure SDK

- **mcp-stainless** (inbound · mcp_server) — Stainless expose les APIs (Anthropic, OpenAI, Groq, LangChain, Cerebras, Writer...) aux agents de maniere fiable. **A surveiller** : Anthropic en discussion pour acquerir Stainless ~300M$ mai 2026 — pourrait devenir une brique standard.

### DevOps

- **mcp-kubectl** (inbound · mcp_server) — kubectl en langage naturel via MCP, complementaire de `mcp-kubernetes` (qui cible plus l'API directe).

## Mises a jour (bumps last_seen)

36 entrees existantes de haute pertinence Jarvis/RTE ont eu leur `last_seen` rafraichi : connecteurs MCP cles (Supabase, Postgres, GitHub, Atlassian, Slack, Google Workspace/Drive, Notion, Linear), suite Office Claude (Excel/Outlook/Word/PowerPoint), SDKs (anthropic-sdk-python/ts, claude-agent-sdk-python/ts), IDE bindings (claude-code-cli/vscode/jetbrains), ressources d'apprentissage (cookbooks, superpowers-skills, skill-creator, context7-mcp, ralph-loop), plus les arrivees recentes Anthropic (managed-agents et variantes dreaming/multiagent/outcomes, claude-design, claude-advisor-tool, claude-for-legal, mcp-salesforce-hosted, mcp-meta-ads, claude-plugins-official, anthropic-skills-repo).

## Archivages

Aucun. Tout le catalogue (322 entrees actives) a un `last_seen` sur les 30 derniers jours — l'ETAPE 3 (controle anti-mort sur les items > 90j) est sans objet ce cycle.

## Notes sur la couverture

- **Pas couvert finement ce cycle** :
  - r/ClaudeAI top du mois — sources accessibles mais signal noye dans le bruit, peu de nouvelles tools concretes a slugger remontees (les threads tournent autour des modeles et des prix plutot que des outils tiers).
  - Repos < 100 stars filtres comme demande.
  - Ecosystem Salesforce Headless 360 (60 outils MCP au TDX 2026) : couvert par `mcp-salesforce-hosted` deja en base (bump).
- **Volontairement non ajoute** :
  - Les sous-agents individuels du pack Finance Anthropic (10 templates) ne sont pas atomises — `claude-finance-agents` reste un seul slug, le pack est l'unite catalogue.
  - Variantes communautaires des MCP crypto (forks de moindre traction) — filtre qualite.
- **Limites assumees** : pas de verification de fraicheur commit/release par scrape direct (la regle ">= 1 commit dans les 6 mois" est appliquee sur la base de la presence dans les listings et annonces de mars-mai 2026, pas sur un check git par slug).

## Hygiene Supabase

UPSERT en base reussi pour les 20 nouveautes (status par defaut `active`, `last_seen = 2026-05-14`). UPDATE bump confirme pour les 36 slugs existants. Les champs `status`, `user_priority`, `is_pinned`, `user_notes` n'ont jamais ete touches — preserves selon la regle "preserver les decisions user".
