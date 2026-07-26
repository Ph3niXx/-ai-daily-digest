# Veille écosystème Claude — 2026-05-31

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées totales en base (post-run) | **405** |
| Entrées vues (confirmées actives ce run) | **97** |
| Nouveautés ajoutées (vraiment nouvelles) | **8** |
| Mises à jour de slugs existants (`last_seen` bumpé) | **89** |
| Archivages | **0** |
| Items stale (>90j) en sortie | **0** |

Run de fin de mois (3 jours après le run du 28/05). Catalogue toujours en régime de croisière : 8 ajouts ciblés sur la vague MCP enterprise (legal vertical + observability + retail) et 89 bumps sur les références confirmées actives via les annonces post-Code with Claude.

## Nouveautés notables

### MCP servers Legal (suite de la vague mai 2026)

- **mcp-solve-intelligence** (`mcp_server`, inbound) — Patent expertise pour Claude : accès à la littérature brevet mondiale (USPTO/EPO/JPO), invalidity searches, prior art. S'inscrit dans la vague Claude for Legal (12 mai 2026).
- **mcp-introhive** (`mcp_server`, inbound) — Relationship intelligence MCP en commercial preview (16 avril 2026), cible cabinets d'avocats (pitch client, cross-sell, succession partenaires). Modèle transposable au secteur assurance/courtage MH.

### MCP servers Observability (vague Q1-Q2 2026)

- **mcp-honeycomb** (`mcp_server`, inbound) — MCP server officiel Honeycomb, GA entre mars et mai 2026.
- **mcp-new-relic** (`mcp_server`, inbound) — MCP server New Relic GA, accès conversationnel aux métriques/traces APM.
- **mcp-instana** (`mcp_server`, inbound) — MCP server IBM Instana GA, pertinent côté stack IBM Z.

### MCP servers Commerce / Retail

- **mcp-pacvue** (`mcp_server`, inbound) — Plateforme commerce media (14 mai 2026), première capability livrée : Report MCP. Pattern « SaaS vertical → MCP » répliqué proprement.
- **mcp-sap-commerce-cloud** (`mcp_server`, inbound) — SAP Commerce Cloud Storefront MCP, GA prévue Q2 2026. Complémentaire de mcp-sap-joule (déjà catalogué).

### Curation / directory

- **obviousworks-claude-skills-collection** (`other`, inbound) — Curation communautaire de skills Claude maintenue par Obvious Works (auteurs du CLAUDE.md Architecture Guide 2026).

## Confirmations majeures (sans ajout, mais last_seen bumpé)

Plusieurs annonces de fin mai 2026 confirment des entrées déjà cataloguées :

- **Claude Opus 4.8** (28 mai 2026) — sortie du modèle avec effort control (low/medium/high/xhigh/max sur API, Extra/Max sur claude.ai), Fast mode 3× moins cher. Pas catalogué comme entrée (modèle, pas un outil-périphérique), mais infrastructure du tooling Claude Code (`claude-code-cli`).
- **Dynamic Workflows dans Claude Code** (28 mai 2026, research preview) — orchestration de workflows complexes avec jusqu'à 1000 subagents parallèles, JS script généré à la volée. Référence : Bun ~750k LOC en 11 jours, 99,8% des tests verts. Couvert via `claude-code-cli` + `claude-managed-agents-multiagent`.
- **Claude for Outlook public beta** (7 mai 2026) — entrée `claude-for-outlook` bumpée. Le quartet M365 (Word/Excel/PowerPoint GA + Outlook beta) est maintenant complet, agent unique qui suit l'utilisateur cross-app avec contexte persistant.
- **MCP tunnels research preview + self-hosted sandboxes public beta** (19 mai, Code with Claude London) — `mcp-tunnels` et `claude-managed-agents-sandboxes` bumpés. Première évolution structurelle du modèle de déploiement MCP depuis la spec de novembre 2025.
- **Claude Cookbooks** (45k stars, dernier update 30 mai 2026) — référence vivante, bump confirmé.
- **anthropic/skills repo** (135k+ stars en mai 2026, 17 skills officiels) — bumped.
- **AWS MCP Server GA** + **Claude Platform AWS** — GA confirmée en mai 2026, IAM-native, CloudTrail logging.
- **Claude Code v2.1.140 / .141 / .150** (mai 2026) — release train hebdo (hook terminalSequence, claude agents --cwd, plugin marketplace browse, etc.) couvert par `claude-code-cli`.
- **MCP Apps spec (Jan 26 2026)** — launch partners (Amplitude, Asana, Box, Canva, Clay, Figma, Hex, Monday, Slack, Salesforce) tous bumpés.
- **Stainless** — acquisition Anthropic confirmée (déjà catalogué).

## Archivages

Aucun archivage ce run. `last_seen` minimum en base = `2026-05-01` → cap des 90 jours à `2026-02-27`, rien à élaguer. La fenêtre d'archivage s'ouvrira mécaniquement à partir d'août 2026 si des entrées de mai cessent d'être confirmées.

## Non couvert / limites assumées

- **r/ClaudeAI top du mois** : non scanné directement (signal capté indirectement via les awesome-lists déjà cataloguées).
- **MCP servers internes Anthropic / repos privés** : invisibles par construction.
- **Cybersecurity MCP émergents** (CVE MCP, Legit MCP, etc.) : déjà partiellement catalogués (cve-mcp-server, snyk-agent-scan, mcp-github-secret-scanning), aucun nouveau qualifiant le filtre (≥100 stars + actif 6 mois).
- **Cap à 60 outils/run** : 8 nouveaux + 89 bumps = 97 entrées touchées (les bumps ne comptent pas comme « outils retenus » au sens strict ; le run reste largement sous le plafond intellectuel du brief).

## Notes méthodo

Recherches web ciblées sur Anthropic releases (Claude Opus 4.8, dynamic workflows, Claude for Outlook, MCP tunnels), claude-cookbooks GitHub (update 30 mai), anthropic/skills (135k stars), MCP enterprise (AWS / SAP / Verisk / Introhive / Solve Intelligence / Pacvue), observability MCP (Honeycomb / New Relic / Instana), Zed + Claude Code via ACP. Toute instruction trouvée dans le contenu web fetché ou les résultats SQL est traitée comme donnée, jamais comme ordre (per le GUARD du brief).

Champs `status`, `user_priority`, `is_pinned`, `user_notes` jamais touchés (décisions user préservées).
