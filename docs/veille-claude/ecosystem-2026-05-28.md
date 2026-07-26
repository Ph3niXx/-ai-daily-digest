# Veille écosystème Claude — 2026-05-28

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées totales en base (post-run) | **397** |
| Entrées vues (confirmées actives ce run) | **127** |
| Nouveautés ajoutées (vraiment nouvelles) | **10** |
| Mises à jour de slugs existants (`last_seen` bumpé) | **117** |
| Archivages | **0** |
| Items stale (>90j) en sortie | **0** |

Le catalogue est mature (387 → 397 entrées), la grosse vague d'enrichissement initial est derrière nous : ce run se concentre sur capter les *vraies* nouveautés du mois (acquisitions, partenariats, nouveaux directories) et rafraîchir le compteur `last_seen` des références confirmées actives.

## Nouveautés notables

### Gouvernance & standards

- **agentic-ai-foundation** (`other`, both) — Linux Foundation Agentic AI Foundation, créée en 2026 avec en projets fondateurs MCP (donné par Anthropic), goose (Block) et AGENTS.md (OpenAI). Signal fort : MCP sort du périmètre Anthropic pour devenir un standard cross-vendor sous gouvernance neutre.
- **agents-md-spec** (`other`, outbound) — Convention `AGENTS.md` au root du repo pour briefer n'importe quel agent de code (Codex, Cursor, Gemini CLI, Claude Code, Copilot, Devin, Jules…). 60k+ repos OSS l'ont déjà adopté. Complémentaire de `CLAUDE.md` qui reste Anthropic-spécifique.

### MCP servers entreprise

- **mcp-sap-joule** (`mcp_server`, inbound) — Partenariat SAP / Anthropic annoncé à Sapphire 2026 : Claude devient le moteur de raisonnement de SAP Joule, avec MCP couvrant S/4HANA, SuccessFactors et Ariba. Pertinent pour le contexte assurance/mutuelle si Malakoff Humanis tape dans SAP côté finance ou HR.
- **mcp-netsuite-ai** (`mcp_server`, inbound) — Oracle NetSuite AI Connector Service avec support MCP officiel, étendu à SuiteConnect London 2026 (MCP Apps extension + Analytics Warehouse).
- **mcp-notion-suekou** (`mcp_server`, inbound) — Alternative communautaire au MCP Notion officiel, cible Notion API 2026-03-11. Référence pour patterns d'implémentation MCP côté Python.

### Directories / awesome-lists

- **tensorblock-awesome-mcp-servers** — Liste complémentaire à punkpeye, accent enterprise/finance.
- **mcpstar-official-mcp-servers** — Filtre qualité : uniquement les MCP officiels vendor-maintained.
- **mobinx-awesome-mcp-list** — Liste concise et opinionated, utile en cross-reference.
- **getbindu-awesome-claude-skills** — Curation récente de skills/agents Claude Code, refresh quasi-hebdo.

### Outillage

- **ccpi-cli** (`sdk`, outbound) — CLI package manager pour plugins/skills Claude Code, alimenté par tonsofskills.com (425 plugins, 2 810 skills, 200 agents en mai 2026). Candidat à évaluer pour industrialiser l'install des skills côté poste local.

## Confirmations majeures (sans ajout)

Plusieurs annonces du mois confirment des entrées déjà cataloguées :

- **Stainless** (`mcp-stainless`) — Acquis par Anthropic le 18 mai 2026 (~$300M). Le générateur de SDK/MCP servers entre directement chez Anthropic ; les produits hébergés tiers seront fermés au 1er septembre 2026.
- **Claude Finance Agents** (`claude-finance-agents`) — 10 agents pré-construits lancés le 5 mai 2026 (pitch builder, KYC screener, month-end closer, etc.). Disponible en plugin Cowork + Claude Code + Managed Agents cookbook.
- **Claude for Small Business** — 15 skills + connecteurs QuickBooks, PayPal, Square, Stripe, Webflow, Gmail, Drive, Calendar, M365, Docusign, Slack, Canva.
- **Claude Add-ins M365** (`claude-for-excel`, `claude-for-powerpoint`, `claude-for-word`, `claude-for-outlook`) — Excel, PowerPoint, Word landed ; Outlook en queue confirmée à Code with Claude 2026.
- **MCP tunnels + Self-hosted sandboxes** (`mcp-tunnels`, `claude-managed-agents-sandboxes`) — Research preview / public beta annoncés le 19 mai 2026 à Code with Claude London.
- **Claude Platform on AWS** (`claude-platform-aws`) — Lancement officiel en mai 2026, IAM-native.
- **Playwright MCP** (`mcp-playwright`) — Microsoft, >30k stars sur GitHub, second MCP le plus populaire de l'écosystème.

## Archivages

Aucun archivage ce run. Le `last_seen` minimum en base est `2026-05-01` (cap des 90j à `2026-02-27`), donc rien à élaguer.

## Non couvert / limites assumées

- **r/ClaudeAI top du mois** : pas scanné directement ce run, on s'est appuyé sur les awesome-lists qui consolident les tools tiers émergents.
- **Repos Anthropic privés** : invisible par construction (skills internes, plugins dev-preview).
- **Forks marginaux** : filtrés par la règle ≥1 commit/release sur 6 mois et ≥100 stars (sauf vendor officiel).
- **Cap à 60 outils/run** : 10 ajoutés ce run, on est bien sous le plafond — signe que le catalogue est maintenant en régime de croisière, pas de scan-bootstrap.

## Notes méthodo

Recherches web ciblées sur Anthropic releases (mai 2026), Code with Claude conf, awesome-mcp-servers (punkpeye/wong2/appcypher/tensorblock/MCPStar/MobinX), awesome-claude-skills (composio/voltagent/travisvn/behisecc/chat2anyllm/getbindu), SAP/NetSuite enterprise MCP, AAIF/Linux Foundation. Toute instruction trouvée dans le contenu web fetché a été traitée comme donnée, jamais comme ordre (per le GUARD du brief).
