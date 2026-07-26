# Catalogue écosystème Claude — 2026-05-07

Run automatique de la routine Cowork `claude-synergies` (catalogue stable des outils inbound/outbound autour de Claude). Cible : table Supabase `claude_ecosystem`.

## Résumé chiffré

| Indicateur | Valeur |
|---|---|
| Outils vus / retenus ce run | 49 |
| **Nouveaux insertés** | **17** |
| Mises à jour `last_seen` | 32 |
| Archivés | 0 |
| Total catalogue après run | 220 actifs / 0 archivés |
| Cap par run | 60 (respecté) |

## Nouveautés notables

Ce run capture surtout des skills marketplaces qui ont émergé après le run initial du catalogue, ainsi que plusieurs MCP servers très récents listés dans les PR ouvertes sur `awesome-mcp-servers`.

### Skills marketplaces & packs

- **claude-scientific-skills-kdense** (inbound · skill) — K-Dense AI · 134 skills scientifiques (génomique, drug discovery, RNA velocity, géospatial) avec accès unifié à 78 bases (PubChem, ChEMBL, UniProt, AlphaFold…). Open source, MAJ 2026.
- **finance-skills-joellewis** (inbound · skill) — JoelLewis · 81 skills répartis en 7 plugins financiers (investment, compliance, advisory, trading, ops). VaR, drawdown, vol historique.
- **everything-claude-code** (inbound · skill) — affaan-m · Harness performance issu du Claude Code Hackathon (Cerebral Valley × Anthropic, fév 2026). Bundle skills + memory + security + research-first.
- **quality-playbook-skill** (inbound · skill) — andrewstellman, anthropic/skills PR #659 · Audit codebase + 6 artefacts qualité (constitution, tests spec-traced, code review protocol, AGENTS.md…). Pertinent pour la rigueur CI du cockpit.
- **lobehub-skills-marketplace** (inbound · other) — LobeHub · Marketplace web format SKILL.md compatible Claude/Codex/ChatGPT.
- **claudeskills-info-marketplace** (inbound · other) — claudeskills.info · 658+ skills à browser/installer.
- **daymade-claude-skills** (inbound · skill) — daymade · Marketplace pro skills production-ready.
- **netresearch-claude-marketplace** (inbound · skill) — Netresearch · Skills curatés pour le dev assisté.
- **mhattingpete-claude-skills** (inbound · skill) — Skills orientés workflows ingé soft (Git automation, testing, code review).
- **glebis-claude-skills** (inbound · skill) — Collection perso curatorial.

### MCP servers émergents

- **mcp-macuse** (inbound · mcp_server) — MCP complet macOS (Calendar, Notes, Mail, Reminders, Finder…) pour automatiser un Mac depuis Claude.
- **mcp-workopia** (inbound · mcp_server) — Recherche d'emploi, génération de CV, conseil carrière. Complément potentiel au pipeline Jobs Radar du cockpit.
- **mcp-agent-cost** (inbound · mcp_server) — Cost analyzer Claude Code local-first (tokens, modèles, sessions). Très complémentaire au panel Stacks & Limits.
- **mcp-noesis-solana** (inbound · mcp_server) — Intelligence on-chain Solana (NoesisAPI/Rengon0x).
- **mcp-truealter-identity** (inbound · mcp_server) — Infrastructure d'identité pour l'économie agent.
- **mcp-smarter-tariff** (inbound · mcp_server) — Compliance supply chain et accessibility checkout.
- **mcp-horus-flow** (inbound · mcp_server) — Orderflow institutionnel et trading IA (quants/traders).

## Mises à jour `last_seen` (32)

Refresh sur entrées dont l'activité 2026-05 est explicitement confirmée par les sources Anthropic ou repos officiels :

- **SDKs Anthropic** : `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript` (release notes confirment options nouvelles : `session_store_flush`, `xhigh` effort, sandbox network allowlist).
- **Claude Code & IDE** : `claude-code-cli` (v2.1.69→v2.1.101 en 5 sem), `claude-code-vscode`, `claude-code-jetbrains`.
- **Office / connectors** : `claude-for-excel`, `claude-for-word` (ajout 13 avr 2026), `claude-for-powerpoint`, `claude-managed-agents`, `claude-managed-agents-memory`, `claude-code-channels` (Telegram/Discord/iMessage).
- **MCP officiels** : `mcp-microsoft-365`, `mcp-google-workspace`, `modelcontextprotocol-servers`, `mcp-apps-spec` (SEP-1865), `mcp-2026-roadmap`.
- **Anthropic Repos** : `anthropic-skills-repo`, `claude-cookbooks` (10 templates finance ajoutés 6 mai 2026), `anthropic-financial-services`, `claude-plugins-official`, `knowledge-work-plugins`.
- **Skills hubs & marketplaces** : `awesome-mcp-servers-punkpeye` (PRs actives mai 2026), `mcpservers-org`, `composio-awesome-claude-skills`, `awesome-claude-skills-travisvn`, `voltagent-awesome-skills`, `claude-skills-alirezarezvani`.
- **Skills officiels** : `skill-creator`, `skill-claude-api`.
- **Tiers** : `claude-trading-skills-tradermonty`.

## Archivages

**Aucun.** Tous les 220 items actifs ont un `last_seen` ≥ 2026-05-01, donc bien sous le seuil 90 jours. Le catalogue est dans un excellent état de fraîcheur — aucune vérification de mort de repo nécessaire ce run.

## Décisions user préservées

Le UPSERT n'a touché ni `status`, ni `user_priority`, ni `is_pinned`, ni `user_notes` sur aucune ligne (clauses explicitement exclues du `DO UPDATE SET`). Les choix éditoriaux du cockpit restent intacts.

## Limites de ce run

- **Cap volontaire à 49 outils** sur les 60 autorisés. Le catalogue contenait déjà 203 items très frais (mode "maintenance" plutôt que "découverte"), donc concentré sur les vraies nouveautés post-mai 2026 + refresh des entrées Anthropic-owned dont l'activité est explicitement documentée par release notes.
- **MCP servers individuels non-officiels** : pas de bump systématique sur tous les MCP servers tiers déjà en base (mcp-asana, mcp-notion, mcp-linear, mcp-slack, mcp-stripe, etc.), faute d'évidence directe de release récente. Ils restent à `last_seen` antérieur dans la fenêtre 2026-05-01..06 (largement sous les 90 jours), donc pas un problème.
- **Pas d'inspection r/ClaudeAI** : pas pu fetcher Reddit (politique de fetch). Sourcing fait via repos GitHub, blogs spécialisés et release notes Anthropic.
- **PR `anthropic/skills` non-mergée** : `quality-playbook-skill` ajouté avec `source_url` vers la PR #659 plutôt que le path final `skills/skills/quality-playbook/SKILL.md`. À mettre à jour quand mergée.
- **Macuse, NoesisAPI, SmarterTariff, horus-flow, Workopia, agent-cost, truealter** : `source_url` pointe vers `awesome-mcp-servers` faute de repo canonique trouvé dans le détail des PRs. À canoniser au prochain run si évidence directe.

## Prochain run

- Cibler une vérification individuelle sur les 5 MCP servers tiers les plus utilisés (mcp-notion, mcp-linear, mcp-slack, mcp-github, mcp-supabase) pour bumper leur `last_seen` avec preuve directe.
- Surveiller le merge de `quality-playbook` (PR #659) et `idea-validator` côté `anthropic/skills`.
- Investiguer les 10 templates finance d'`anthropic-financial-services` pour décider s'il faut splitter en entrées dédiées (KYC, pitchbook, month-end…) ou rester en bundle.
