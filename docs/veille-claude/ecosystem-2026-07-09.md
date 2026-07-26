# Veille écosystème Claude — 2026-07-09

## Chiffres

- Entrées vues (catalogue total en base avant run) : **456** actives, 0 archivées.
- Ajoutées (vraiment nouvelles) : **1** — `pm-claude-skills` (collection PM/PRD).
- Mises à jour (slug existant, `last_seen = 2026-07-09`) : **44**.
- Archivées : **0** (aucune entrée > 90 jours sans revue).

Total post-run : **457 actives**.

## Contexte du run

Le catalogue est déjà exhaustif (456 outils avant run, tous < 90 jours) — cap 60 outils/run oblige à faire de la rotation ciblée plutôt qu'une re-inspection complète. Priorité de ce run : la couche cœur Anthropic + les plugins/skills mis en avant dans les release notes de juin-juillet 2026 (Code with Claude SF 2026, marketplace officielle >200 plugins, add-ins Office GA).

Sources scannées : `anthropics/skills` (repo officiel), `anthropics/claude-plugins-official`, marketplaces communautaires (Composio, Quemsah, rohitg00 toolkit, tonsofskills), awesome-mcp-servers punkpeye, releases Agent SDK (Python + TS), MCP spec 2026-07-28 RC, IDE benchmarks (VS Code, JetBrains), announcements Anthropic (Claude Managed Agents : Dreaming/Outcomes/Multi-agent, Claude Finance 10 agents, Add-ins Office).

## Nouveauté ajoutée

- **`pm-claude-skills`** (mohitagw15856/pm-claude-skills) — inbound / skill / vendor `mohitagw15856` — Collection open-source de ~400 Agent Skills orientés produit (PRDs, launches, compliance, CVs). Distribuée via `npx pm-claude-skills add`, aussi utilisable avec ChatGPT/Gemini/Cursor/Codex. Applicabilité RTE Malakoff Humanis : playbooks PRD / launch checklist / compliance directement mobilisables sur le train Vente sans repartir de zéro.

Note d'archive interne : le run 2026-07-06 avait explicitement écarté cette collection au motif "ne pas éclater slug par skill individuel". Interprétation ici corrigée — pm-claude-skills est bien un slug au niveau *collection* (comme `claude-skills-alirezarezvani` déjà en base), pas un éclatement skill-par-skill. L'ajout reste cohérent avec la granularité du catalogue.

## Mises à jour notables (44 slugs bumpés)

Cœur Anthropic (14) — `anthropic-skills-repo`, `claude-plugins-official`, `claude-cookbooks`, `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `cowork`, `claude-for-excel`, `claude-for-word`, `claude-for-powerpoint`, `claude-for-outlook`, `anthropic-sdk-python`, `anthropic-sdk-typescript`, `mcp-registry-official`. Vérifiés actifs sur les release notes juillet 2026 (Claude Code v2.1.x, /rewind, ~-37% CPU streaming, add-ins Office en GA).

Agent SDK (3) — `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `claude-agent-sdk-go`. Renommés depuis "Claude Code SDK" fin 2025, adoption forte (search demand ×300 entre mai 2025 et avril 2026 d'après les sources), billing séparé depuis 15 juin 2026.

Claude Managed Agents (8) — `claude-managed-agents`, `claude-managed-agents-dreaming`, `claude-managed-agents-outcomes`, `claude-managed-agents-multiagent`, `claude-managed-agents-addins`, `claude-managed-agents-memory`, `claude-managed-agents-sandboxes`, `claude-managed-agents-webhooks`. Toutes annoncées / élargies à Code with Claude SF 2026 (mai). Dreaming = self-improvement scheduled review ; Outcomes = grader séparé sur rubric ; Multi-agent = orchestrator + specialists parallèles.

Verticaux Anthropic (1) — `claude-finance-agents` : 10 templates (pitch builder, meeting preparer, earnings reviewer, model builder, market researcher + valuation/reconciler/close/audit/KYC), disponibles en plugins Cowork/Code + cookbooks Managed Agents.

MCP & spec (4) — `mcp-spec-2026-07-28-rc` (release candidate confirmée pour fin juillet : stateless core, MCP Apps, Tasks extension, alignement OAuth/OIDC), `modelcontextprotocol-servers`, `context7-mcp` (docs live, toujours plugin de tête pour les docs à jour), `awesome-mcp-servers-punkpeye`.

Plugins/skills à forte adoption (7) — `plugin-frontend-design` (Anthropic first-party), `plugin-code-review`, `security-guidance-plugin`, `superpowers-skills` (workflow plan-spec-test), `claude-mem` (mémoire persistante), `caveman` (terse mode token-saver), `skill-creator`.

Marketplaces / directories communautaires (5) — `awesome-claude-plugins-composio`, `awesome-claude-plugins-quemsah`, `awesome-claude-code-toolkit-rohitg00`, `tonsofskills-marketplace`, `ccpi-cli`.

Skills verticaux (2) — `anthropic-cybersecurity-skills` (817 skills mappés MITRE ATT&CK / NIST / D3FEND), `obviousworks-claude-skills-collection`.

## Archivage doux

**Aucun archivage** ce run. La requête `SELECT slug FROM claude_ecosystem WHERE status='active' AND last_seen < CURRENT_DATE - INTERVAL '90 days'` renvoie **0 ligne** (oldest last_seen = 2026-05-01, soit 69 jours). Le check redeviendra opérant début août 2026 pour les items non revus depuis mai.

## Nouveautés Anthropic vues mais **déjà en base**

Pour trace : les éléments suivants étaient dans les release notes juin-juillet 2026 et sont **déjà catalogués** — aucun INSERT nécessaire.

- Add-ins Office (Excel/Word/PowerPoint/Outlook) → 4 slugs existants (`claude-for-*`).
- Nested sub-agents (jusqu'à 3 niveaux, juin 2026) → feature de `claude-code-cli`, pas un tool séparé.
- Fallback model chains, per-agent cost attribution, scoped permissions → features CLI, idem.
- Community tool marketplace élargi → `claude-plugins-official` couvre le pointeur canonique.
- `/rewind` (juillet 2026) → feature du CLI, pas un slug séparé.
- Claude Finance 10 agents → `claude-finance-agents` déjà présent.
- Anthropic Legal, Cybersecurity, Financial Services, Creative Work, Small Business, Marketing Ops verticaux → tous déjà en base.

## Ce qui n'a pas pu être couvert

- **r/ClaudeAI top du mois** : impossible à scraper directement de manière stable. Les tools émergents cités dans les threads récents (SuperClaude framework, Claude Flow, MultiClaude, subagent collections rohitg00/lst97/wshobson) sont **déjà catalogués**.
- **`jeremylongshore/claude-code-plugins-plus-skills`** (425 plugins / 2810 skills / 200 agents) : c'est la source amont de `tonsofskills.com` déjà en base sous `tonsofskills-marketplace` + `ccpi-cli`. Pas d'INSERT dédié pour éviter le doublon.
- **Consolidation `windsurf-editor` ↔ `devin-desktop`** : rebranding officiel de juin 2026 toujours en attente d'arbitrage utilisateur (non fait automatiquement pour préserver `user_priority`/`user_notes`).
- **Repos privés / paywall** : non couverts par principe.
- **Trends prix / capacités Claude models** : hors scope catalogue.

## Prochaines actions suggérées (manuel)

1. Décider si `windsurf-editor` doit être archivé au profit de `devin-desktop`.
2. Rotation : sur les 411 slugs non touchés ce run, prioriser au prochain passage les MCP servers verticaux entreprise (`mcp-linear`, `mcp-notion`, `mcp-slack`, `mcp-atlassian`, `mcp-supabase`…) pour éviter qu'ils ne dérivent vers > 60 jours de `last_seen`.
3. Ajouter éventuellement un champ `stars_at_last_seen` pour tracer la santé quantifiée des repos.
