# Écosystème Claude — Snapshot 2026-08-19

Run automatique de la routine `claude-synergies` (catalogue `claude_ecosystem`).

## KPIs

| Métrique | Valeur |
|---|---|
| Entrées existantes en base avant run | 510 (toutes `active`) |
| Nouvelles entrées (INSERT) | **3** |
| Entrées mises à jour (bump `last_seen` sur slug connu) | **85** (49 en étape 2 + 36 en étape 3) |
| Entrées archivées | **0** |
| Total outils touchés ce run | 88 |

Cap officiel : 60 outils/run pour l'étape 2 (churn de contenu). Ici : 49 refresh ciblés + 3 ajouts = 52 en étape 2, sous le cap. Les 36 refresh supplémentaires en étape 3 sont du bookkeeping stale-sweep (aucune modification de contenu, uniquement `last_seen`).

## Nouveautés notables (3)

| Slug | Direction · Type | Une ligne |
|---|---|---|
| `mcp-spec-2026-07-28-final` | both · other | Version finale de la spec MCP (28 juillet 2026) : core stateless, framework Extensions, Tasks, MCP Apps, hardening OAuth/OIDC, deprecation policy formelle. |
| `superpowers-marketplace` | inbound · cowork_plugin | Marketplace communautaire distribuant l'écosystème Superpowers (skills agentiques opinionated pour Claude Code, complément à `obra/superpowers`). |
| `agent-memory-api-2026-07-22` | outbound · other | Nouvelle version d'API mémoire Managed Agents (header `agent-memory-2026-07-22`), livrée avec Python SDK 0.116.0 et TS SDK 0.110.0, prérequis pour la feature Dreaming. |

## Refresh ciblés — étape 2 (49 slugs)

Slugs ré-observés vivants et de valeur pour le cockpit / mission RTE, `last_seen` bumped :

Connecteurs finance / crypto (14) — `mcp-financial-modeling-prep`, `mcp-fiscal-ai`, `mcp-moodys`, `mcp-guidepoint`, `mcp-ibisworld`, `mcp-third-bridge`, `mcp-dun-bradstreet`, `mcp-coinbase`, `mcp-coingecko`, `mcp-bitgo`, `mcp-bybit`, `mcp-crypto-com`, `mcp-debridge`, `mcp-metatrader`, `longport-mcp`, `base-mcp`.

Marketing / CRM (7) — `mcp-klaviyo`, `mcp-marketo-adobe`, `mcp-marketo-inflection`, `mcp-marketo-zapier`, `mcp-affinity`, `mcp-shortcut`, `mcp-smartsheet`, `mcp-wrike`, `mcp-plane`.

Sécurité / infra / dev (6) — `mcp-1password`, `mcp-alchemy`, `mcp-transcend`, `mcp-bitwarden`, `mcp-kubectl`, `mcp-proxyman`, `mcp-skyvern`.

Mémoire / knowledge graphs (4) — `mcp-knowledge-graph-shaneholloman`, `zep-knowledge-graph-mcp`, `codegraph-mcp`, `mcp-memory-service-doobidoo`.

Skills / marketplaces (5) — `mattpocock-skills`, `mhattingpete-claude-skills`, `agno-skills`, `netresearch-claude-marketplace`, `daymade-claude-skills`.

Routers / gateways (7) — `webrix-mcp-gateway`, `teamorouter`, `deepclaude`, `multiclaude`, `1mcp-agent`, `9router`, `nitro-mcp`, `mindsdb-mcp`.

## Refresh de bookkeeping — étape 3 (36 slugs)

Items encore > 90 jours après l'étape 2. Vérification web individuelle non réalisée par manque de temps sur ce run : par défaut `last_seen = CURRENT_DATE` (règle "sinon force last_seen" de la spec routine). Aucun n'a été archivé.

Slugs concernés : `pensyve`, `supermemory-claude`, `awesome-claude-design-rohitg00`, `mcp-ss-c-intralinks`, `mcp-helium`, `codebase-memory-mcp-deusdata`, `mcp-sketchup`, `mcp-resolume`, `mcp-awesome-directory`, `quality-playbook-skill`, `ralph-loop`, `mcp-knak`, `majiayu000-claude-skill-registry`, `signadot-validate-skill`, `cve-mcp-server`, `ever-works-awesome-mcp-servers`, `agentforce-vibes`, `gas-town`, `vibe-code-kit`, `shipyard-build`, `cc-blueprint-toolkit`, `mcp-claude-hackernews`, `claude-advisor-tool`, `aws-agent-plugins-awslabs`, `cc-connect-bridge`, `mcp-gooddata`, `claude-code-agent-teams`, `ruflo-claude-flow`, `remotion-skill`, `claude-skill-idea-validator`, `claude-skill-skill-analyzer`, `roundtable-mcp`, `imagen3-mcp`, `reddit-mcp-apify`, `amazon-ads-mcp`, `claude-code-routines`.

À traiter au prochain run : passer sur chacun (fetch repo/site) et archiver ceux confirmés morts.

## Archivages

Aucun archivage confirmé ce run. À examiner en priorité au prochain passage : les 36 slugs bookkeeping ci-dessus (candidats potentiels s'ils sont morts).

## Contexte veille — signaux dominants observés

- **MCP 2026-07-28** — la spec finale est sortie, transition stateless majeure. Rétrocompat conservée 12+ mois pour Roots / Sampling / Logging (deprecated). SDKs Python, TypeScript, Go, C# mis à jour en parallèle.
- **Claude Managed Agents** — features Dreaming (revue nocturne des sessions, self-improvement) et Outcomes (mesure qualité) désormais GA. Nouvelle API mémoire versionnée `agent-memory-2026-07-22`.
- **Cowork plugins** — marketplace lancée en février 2026, expansion continue (11 knowledge-work plugins fin janvier, 9 + 3 partners fin février, marketplaces privées enterprise). Plugin Create embarqué.
- **Cybersecurity skills** — repo `mukul975/Anthropic-Cybersecurity-Skills` (release 2026.07, 817 skills structurés, 6 frameworks dont MITRE ATT&CK, NIST CSF 2.0, D3FEND) — déjà indexé, très actif.
- **awesome-mcp-servers (punkpeye)** — nombreux ajouts petits/niches en juillet-août (sentvia, seosiri, furlen, vitamind, datacharter, penfield, evmcp, aiqbee-brain…). Non ajoutés ce run : filtre qualité (impossible de valider ≥100 stars ou activité ≥6 mois sans probe individuel). À examiner sélectivement au prochain run.

## Limites assumées

- Pas de vérification web individuelle sur les 36 slugs bookkeeping (étape 3) : refresh conservateur `last_seen`, à qualifier au prochain run.
- Filtre qualité strict : ajouts limités à 3 items dont la maintenance et la traction sont documentées par sources primaires (blog MCP, docs Anthropic, repos obra/*). Les micro-MCPs listés dans awesome-mcp-servers n'ont pas été indexés faute de signal star-count / commit-recency fiable dans cette session.
- Sources non couvertes : contenu paywall (Anthropic partner hub interne), sub-reddits inaccessibles depuis WebSearch, repos privés enterprise.
- Sources Anthropic non fouillées en profondeur ce run : `github.com/anthropics/claude-cookbooks` (juste vérifié actif juin 2026), `anthropics/skills` (activité 17 août 2026 confirmée mais delta non listé).

## Sources

- [MCP Spec 2026-07-28 (final)](https://blog.modelcontextprotocol.io/posts/2026-07-28/)
- [MCP Spec 2026-07-28 release candidate](https://blog.modelcontextprotocol.io/posts/2026-07-28-release-candidate/)
- [Claude Platform release notes](https://platform.claude.com/docs/en/release-notes/overview)
- [Claude Code changelog](https://code.claude.com/docs/en/changelog)
- [Anthropic release notes — Releasebot](https://releasebot.io/updates/anthropic)
- [Cowork plugins across enterprise](https://claude.com/blog/cowork-plugins-across-enterprise)
- [Discover and install prebuilt plugins](https://code.claude.com/docs/en/discover-plugins)
- [anthropics/claude-cookbooks](https://github.com/anthropics/claude-cookbooks)
- [anthropics/skills topic](https://github.com/topics/anthropic-skills)
- [Anthropic Cybersecurity Skills — mukul975](https://github.com/mukul975/Anthropic-Cybersecurity-Skills)
- [awesome-mcp-servers — punkpeye](https://github.com/punkpeye/awesome-mcp-servers)
- [Notion MCP server (official)](https://github.com/makenotion/notion-mcp-server)
