# Catalogue écosystème Claude — Run du 2026-05-12

Synthèse du run de maintenance du catalogue `claude_ecosystem` (Supabase). Cible : garder un répertoire stable et évolutif des outils inbound (qui se pluggent à Claude) et outbound (où Claude se plugge).

## Stats du run

| Métrique | Valeur |
|---|---|
| Entrées vues / touchées dans ce run | 57 |
| Vraiment nouvelles (INSERT) | 26 |
| Mises à jour (last_seen bump) | 31 |
| Archivées | 0 |
| Total catalogue après run | 286 |

Aucune entrée n'avait `last_seen` antérieur à 90 jours — la base est jeune (premier seed avril 2026), la passe d'archivage n'a rien identifié.

## Nouveautés notables

### Bloc juridique (12 mai 2026 — annonce Claude for Legal)

Anthropic a livré le 12 mai un suite verticale juridique majeure : 12 plugins par practice area + 20+ connecteurs MCP. Ajouts au catalogue :

- **anthropic-claude-for-legal** (inbound · cowork_plugin) — suite officielle 12 plugins (Commercial, Corporate, Employment, Privacy, Product, Regulatory, AI Governance, IP, Litigation, Law Student).
- **mcp-thomson-reuters-cocounsel** (inbound · mcp_server) — CoCounsel rebuilt sur Claude Agent SDK.
- **mcp-ironclad** (inbound · mcp_server) — contract lifecycle management.
- **mcp-netdocuments** (inbound · mcp_server) — DMS legal.
- **mcp-imanage** (inbound · mcp_server) — DMS iManage Cloud.
- **mcp-relativity** / **mcp-everlaw** / **mcp-consilio** (inbound · mcp_server) — e-discovery & litigation.
- **mcp-definely** (inbound · mcp_server) — contract drafting/review dans Word.
- **mcp-datasite** (inbound · mcp_server) — virtual data room M&A.
- **mcp-midpage** / **mcp-trellis** / **mcp-legal-data-hunter** (inbound · mcp_server) — legal research IA.
- **mcp-free-law-project** (inbound · mcp_server) — open-data (CourtListener, RECAP).

### Bloc finance (5 mai 2026 — Agents Finance + connecteurs)

Anthropic a complété ses agents finance avec une nouvelle vague de connecteurs MCP :

- **mcp-dun-bradstreet** (inbound · mcp_server) — identité B2B, KYC.
- **mcp-fiscal-ai** (inbound · mcp_server) — fondamentaux actions temps réel.
- **mcp-verisk** (inbound · mcp_server) — data assurance P&C (underwriting, claims, risk). **Pertinent pour Malakoff Humanis** (mutuelle).
- **mcp-financial-modeling-prep** (inbound · mcp_server) — API marchés.
- **mcp-guidepoint** / **mcp-third-bridge** (inbound · mcp_server) — réseaux experts.
- **mcp-ibisworld** (inbound · mcp_server) — rapports industrie.
- **mcp-ss-c-intralinks** (inbound · mcp_server) — virtual data rooms M&A.

### Infra et plateforme

- **claude-platform-aws** (outbound · agent_runtime) — Claude Platform on AWS, GA 11 mai 2026. Authentification IAM, billing AWS Marketplace, CloudTrail. Voie enterprise.
- **mcp-kubernetes** (inbound · mcp_server) — Kubernetes MCP Server (containers, Go-natif). Distribué en Helm chart, npm, PyPI, Docker.
- **webrix-mcp-gateway** (inbound · framework) — Gateway MCP enterprise avec SSO, RBAC, audit trails, token vaults.

### Veille / news

- **mcp-helium** (inbound · mcp_server) — Helium MCP (10 avril 2026) : 3.2M+ articles, scoring biais 15+ dimensions, market data, AI options pricing. Concurrent direct des 4 pipelines RSS perso du Cockpit.

## Refresh `last_seen` (entrées confirmées actives via cette passe)

31 entrées du noyau de l'écosystème ont été re-vues dans les recherches web et leur `last_seen` a été poussé à 2026-05-12 : SDK officiels (Python, TypeScript, Agent SDK), Claude Code (CLI, VS Code, JetBrains, Web), Cookbooks, Skills repo, plugins finance, Claude Design, Managed Agents (+ Dreaming + Memory), modelcontextprotocol/servers, awesome-mcp-servers, claude-plugins-official, MCP supabase / harvey / docusign / box / moodys, Claude for Excel/Outlook/PowerPoint/Word, Cursor, Cline, Windsurf, knowledge-work-plugins.

Le reste du catalogue (≈ 200 entrées) n'a pas été directement re-vérifié dans ce run mais reste dans la fenêtre 90j (toutes datées du 1-11 mai 2026), donc aucun archivage déclenché.

## Archivages

Aucun. Premier seed du catalogue trop récent (~avril 2026) — la mécanique d'archivage des morts deviendra opérationnelle au plus tôt fin juillet 2026.

## Limitations / non-couvert

- **Pas de scan profond de chaque MCP connector individuel** : la liste des 20+ connecteurs juridiques a été enregistrée en bloc à partir des sources presse (LawSites, Anthropic blog) ; je n'ai pas ouvert chaque page produit pour vérifier date du dernier commit, stars GitHub, etc. Tous traités comme officiels Anthropic Connectors directory.
- **Reddit r/ClaudeAI top du mois** : pas exploré en profondeur dans ce run, les sources institutionnelles (Anthropic blog, AWS announcements, LawSites) ont déjà saturé le budget de 60 entrées max.
- **MCP Hunt** : mentionné dans la recherche awesome-mcp-servers comme nouvelle plateforme de discovery, mais pas suffisamment d'éléments pour caractériser (pas de source canonique trouvée). À explorer au prochain run.
- **MCP Apps Extension** (extension protocole pour UI interactive) déjà capturée précédemment via `mcp-apps-spec`.
- **Repos communautaires de skills** (alirezarezvani, BehiSecc, VoltAgent, etc.) : pas re-vérifiés dans ce run, leur `last_seen` reste sur leur date précédente (toujours dans la fenêtre 90j).

## Dernière MAJ

2026-05-12 — Run automatique scheduled task "claude-synergies". Catalogue passé de ≈ 260 à 286 entrées, avec un focus sur la vague juridique (12 mai), la vague finance (5 mai) et la GA Claude Platform on AWS (11 mai).
