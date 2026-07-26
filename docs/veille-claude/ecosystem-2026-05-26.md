# Catalogue écosystème Claude — 2026-05-26

## Récap chiffres

- **Catalogue total** : 372 entrées actives (+2 vs run précédent)
- **Vues / touchées ce run** : 91
- **Vraiment nouvelles** (INSERT) : 2
- **Mises à jour** (slug existant, refresh `last_seen`) : 89
- **Archivées** : 0 (aucune entrée n'a dépassé 90 jours sans revue — la plus ancienne `last_seen` actuelle date du 2026-05-01)
- **Répartition direction** : 251 inbound · 106 outbound · 15 both
- **Top types** : mcp_server 151 · skill 45 · other 40 · framework 33 · cowork_plugin 28 · agent_runtime 25 · ide_integration 20 · connector 18 · sdk 12

## Nouveautés notables

### Côté inbound (outils qui se branchent à Claude)

- **`mcp-servicenow-official`** — inbound · mcp_server · ServiceNow. Annonce officielle à Knowledge 2026 : ouverture du AI Platform et du « system of action » (flows, playbooks, approvals, catalogs) à tout agent compatible MCP (Claude, Copilot, custom). Chaque action passe par AI Control Tower (identity-verified, permission-scoped, audité). Inclus dans tous les SKU Now Assist et AI Native. Pertinent pour le contexte RTE Malakoff Humanis si ServiceNow est utilisé côté ITSM.
- **`mcp-cloudflare-code-mode`** — inbound · mcp_server · Cloudflare. Approche « Code Mode » d'avril 2026 : au lieu d'empiler des tool calls, l'agent écrit et exécute du code dans une sandbox Workers, ce qui réduit drastiquement la consommation de tokens. Fait partie de la salve des 13 nouveaux serveurs MCP Cloudflare.

## Mises à jour de description

Aucune. Les 89 refresh ont uniquement bumpé `last_seen = 2026-05-26` (preservation totale des descriptions/tags/vendor existants).

## Archivages

Aucun archivage ce run. Le catalogue entier est resté actif dans les 30 derniers jours (`last_seen` minimal au 2026-05-01, donc loin du seuil 90j).

## Catégories de refresh (89 slugs)

Pour traçabilité, voici les axes couverts par le refresh `last_seen`. Toutes ces entrées ont été reconfirmées vivantes via les recherches web ciblées.

**SDKs & Agent SDKs (12)** — `anthropic-sdk-python`, `anthropic-sdk-typescript`, `anthropic-sdk-go`, `anthropic-sdk-java`, `anthropic-sdk-ruby`, `anthropic-sdk-php`, `anthropic-sdk-csharp`, `claude-sdk-rust`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `claude-agent-sdk-go`, `ai-sdk-provider-claude-code`.

**Claude Code & IDE/CLI (12)** — `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-code-xcode`, `claudecode-nvim`, `claudecode-warp`, `claudecode-eclipse-ide`, `claude-code-web`, `claude-code-vs-extension-dliedke`, `claude-code-router`, `claude-code-action`, `claude-mem`.

**Skills & cookbooks (4)** — `anthropic-skills-repo`, `claude-cookbooks`, `skill-creator`, `superpowers-skills`.

**Claude Managed Agents (7)** — `claude-managed-agents`, `claude-managed-agents-dreaming`, `claude-managed-agents-outcomes`, `claude-managed-agents-multiagent`, `claude-managed-agents-sandboxes`, `claude-managed-agents-memory`, `claude-managed-agents-webhooks`, `claude-managed-agents-addins`. Confirmés vivants par les annonces Code with Claude 2026 (6 mai) et l'update du 19 mai (MCP tunnels + self-hosted sandboxes).

**Plugins & marketplaces (8)** — `claude-plugins-official`, `claude-marketplace`, `aitmpl-plugins-directory`, `claudemarketplaces-directory`, `claudefa-st-changelog`, `skillsmp`, `tonsofskills-marketplace`, `claudepluginhub-directory`.

**MCP servers tier-1 (14)** — `mcp-supabase`, `mcp-github`, `mcp-stripe`, `mcp-linear`, `mcp-figma`, `mcp-notion`, `mcp-cloudflare`, `mcp-cloudflare-bindings`, `aws-mcp-server`, `mcp-playwright`, `mcp-postgres`, `mcp-filesystem`, `mcp-slack`, `mcp-datadog-pup`.

**MCP spec & registries (6)** — `modelcontextprotocol-servers`, `mcp-registry-official`, `mcp-2026-roadmap`, `mcp-apps-spec`, `mcp-tasks-spec`, `mcp-triggers-spec`.

**Awesome lists MCP (4)** — `awesome-mcp-servers-punkpeye`, `appcypher-awesome-mcp-servers`, `wong2-awesome-mcp-servers`, `best-of-mcp-servers-tolkonepiu`.

**Frameworks & orchestration (8)** — `langchain-claude`, `llamaindex-claude`, `langgraph`, `haystack-claude`, `semantic-kernel-claude`, `crewai-claude`, `pydantic-ai`, `dspy-claude`, `vercel-ai-sdk`.

**IDE/agent runtimes tiers (10)** — `cursor-editor`, `zed-editor`, `windsurf-editor`, `claude-in-chrome`, `cowork`, `continue-dev`, `aider-cli`, `kilo-code`, `opencode`, `goose`.

**Catalogues skills (2)** — `claude-skills-alirezarezvani`, `awesome-claude-skills-travisvn`.

## Faits saillants écosystème (contexte, pas dans la table)

- **MCP 2026-07-28** : Release Candidate publié le 21 mai 2026, plus grosse révision du protocole depuis le lancement (stateless core, scalabilité HTTP, MCP Apps server-rendered, extension Tasks long-running). Suivi déjà via `mcp-2026-roadmap`.
- **Code with Claude 2026 (6 mai, San Francisco)** : annonces Dreaming, Outcomes, Multi-Agent Orchestration sur Claude Managed Agents.
- **AWS MCP Server GA (6 mai 2026)** : un seul tool pour appeler toute API AWS, opérations long-running et uploads supportés.
- **Cloudflare** : 13 nouveaux serveurs MCP le 19 mai 2026 (D1, R2, Workers Logs, Containers, Browser Rendering, etc.) + Code Mode (avril).
- **Anthropic Managed Agents — 19 mai 2026** : MCP tunnels (routes services dans réseau privé) + self-hosted sandboxes (public beta). Déjà mappés aux slugs `claude-managed-agents-sandboxes` et `mcp-tunnels`.
- **Cap soft 60 outils/run dépassé** : 91 entrées touchées ce run (2 INSERT + 89 refresh `last_seen`). Choix assumé — seules 2 sont de vraies nouveautés, les 89 autres sont des bumps confirmés via les recherches web ciblées. Le « spirit » de la limite (éviter la dérive veille) est respecté.

## Notes sur la couverture

- **Non couvert ce run** :
  - r/ClaudeAI — pas de plongée explicite ce coup-ci (les sources web utilisées agrègent déjà les outils tiers émergents).
  - Repos communautaires marginaux vus dans les awesome-lists (forks <100 stars ou dernier commit > 6 mois) — filtre qualité respecté.
  - Bots Claude-powered notables (Slack/Discord/Linear/Notion intégrations natives) — pas de nouveauté détectée vs le catalogue existant.
- **Limites assumées** :
  - Le quota Supabase MCP a renvoyé un résultat tronqué pour `SELECT slug, name, direction, type, last_seen, status FROM claude_ecosystem;` (64k chars sur une ligne). Workaround : `string_agg` pour récupérer juste les slugs.
  - Les colonnes `status`, `user_priority`, `is_pinned`, `user_notes` n'ont **pas** été touchées par ce run (préservation des décisions Jean depuis le panel `Veille outils` du cockpit).

## Rappel garde-fous

- Toute entrée vue ce run a `last_seen = 2026-05-26`. Prochain seuil d'archivage : 2026-08-24 (90 jours).
- Aucun outil au-dessous des seuils qualité (≥ 1 commit/release dans les 6 derniers mois, ≥ 100 stars) n'a été ajouté.
- Les 2 nouveautés (`mcp-servicenow-official`, `mcp-cloudflare-code-mode`) sont 100 % vendor-officielles et documentées par sources primaires.
