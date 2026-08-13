# Écosystème Claude — 2026-08-02

Run automatique du catalogue `claude_ecosystem` (Supabase `jarvis-cockpit`).
Cap indicatif : 60 upserts par run.

## Compteurs

| Métrique | Valeur |
|---|---|
| Slugs dans le catalogue (avant run) | 480 |
| Slugs dans le catalogue (après run) | 482 |
| Outils vus (retenus dans les sources) | ~55 |
| Nouveaux ajouts (INSERT) | 2 |
| Mises à jour (bump `last_seen` sur slug existant) | 45 |
| Archivés | 0 |
| Items encore stales (>90 j) après run | 0 |

## Nouveautés notables

### Ajouts (2)

- **`slack-mcp-client`** — *connector, outbound*. Slackbot devient un client MCP natif, avec une place de marché de 20+ apps MCP hébergées (Amplitude, Atlassian, Box, Canva, Docusign, Gamma, Linear, Miro, Notion, Replit, Webflow, Zoom, …). Ouvre une voie B2C pour valider des flux conversationnels avant de les industrialiser côté Jarvis. Source : slack.com/blog/news/slackbots-mcp-client.
- **`mukul-cybersecurity-skills`** — *skill, inbound*. Librairie communautaire de 800+ skills cybersécurité conformes agentskills.io, mappées MITRE ATT&CK / NIST CSF 2.0 / MITRE ATLAS / D3FEND / NIST AI RMF / F3. Base propre pour un futur skill Jarvis "security review pipeline train Vente". Non affilié à Anthropic PBC. Repo : github.com/mukul975/Anthropic-Cybersecurity-Skills.

### Mises à jour métadonnées

- **`mcp-spec-2026-07-28-rc`** — nom bumped en `MCP Specification 2026-07-28 (final)` et description ré-écrite : la spec (stateless core + Apps/Tasks extensions + OAuth 2.1/OIDC) est passée de RC à finale le 28 juillet 2026. Le slug reste tel quel (pour préserver `status`, `user_priority`, `is_pinned`, `user_notes`).

### Bumps `last_seen` (44 slugs confirmés actifs)

- **Stales rescapés du run précédent (11)** — `claude-code-ide-emacs`, `mcp-twilio`, `claude-dispatch`, `mcp-zapier`, `claude-code-ultraplan`, `mcp-todoist`, `evals-skills-hamel`, `promptfoo`, `vercel-skills-cli`, `mcp-azure-devops`, `claude-code-ultrareview`. Aucun n'est mort (repos vivants ou pages officielles Anthropic/Doist/Microsoft/Vercel accessibles), donc juste refresh de `last_seen`.
- **Signaux forts revus dans les sources** (33) — `superpowers-skills`, `rube-mcp`, `mcp-cloudflare`, `mcp-2026-04-28-creative-bundle`, `claude-design`, `zed-editor`, `zed-acp-external-agents`, `agent-client-protocol`, `claudecode-warp`, `claude-plugins-community`, `claude-plugins-official`, `tonsofskills-marketplace`, `ccpi-cli`, `awesome-claude-plugins-composio`, `cursor-editor`, `cursor-cli`, `claude-code-jetbrains`, `claude-code-vscode`, `mcp-workato`, `mcp-slack`, `mcp-notion`, `mcp-airtable`, `mcp-github`, `mcp-supabase`, `mcp-stripe`, `mcp-sentry`, `mcp-playwright`, `context7-mcp`, `mcp-filesystem`, `mcp-postgres`, `anthropic-skills-repo`, `claude-cookbooks`, `knowledge-work-plugins`.

## Archivages

Aucun. Le triage web des 11 items stales n'a révélé aucun repo 404 / produit shutdown.

## Signaux macro (contexte, non insérés)

- **Croissance MCP** — l'écosystème est passé à ~22 000 serveurs référencés (mi-2026) et ~400 M de téléchargements SDK/mois, soit +4× vs. début 2026. Les annuaires (`mcpmarket-directory`, `pulsemcp-directory`, `claudemarketplaces-directory`, `mcp-so-directory`, `mcp-awesome-directory`, `glama-mcp-registry`) sont tous encore actifs — bumps groupés non faits ce run faute de bandwidth de vérification individuelle.
- **Slack partner ecosystem** — les 20+ apps MCP annoncées côté Slackbot (Amplitude, Atlassian, Box, Canva, Docusign, Gamma, Linear, Miro, Notion, Replit, Webflow, Zoom) sont déjà présentes individuellement au catalogue via leurs slugs `mcp-*` respectifs. Pas de doublon à créer.
- **AWS Managed MCP (`mcp-bedrock-agentcore`)** — GA depuis mai 2026. Déjà catalogué, pas de bump ce run.

## Non couvert / limites du run

- **Cap 60 respecté** — 47 lignes touchées. La plupart des 480 slugs existants n'ont pas été refresh (choix de concentrer le bump sur les items apparus dans les sources web + tous les stales).
- **Reddit r/ClaudeAI** — la web search a renvoyé des tribunes tierces mais pas le top mensuel brut. Rien de nouveau qui ne soit déjà au catalogue.
- **Vérification "encore maintenu ≥ 1 commit/release <6 mois"** — pas de check individuel des repos GitHub sur ce run (coûteux) ; les items bumpés sont ceux dont un signal <90 j est apparu dans les sources agrégées. Un run mensuel dédié "santé Git" serait le complément.
- **Serveurs MCP en attente d'auth** — `plugin:data:atlassian`, `plugin:data:amplitude`, `plugin:data:hex` ont demandé une OAuth non interactive : sans impact sur cette tâche (usage uniquement Supabase MCP + WebSearch).
- **Pas de nouveaux tools tiers émergents crédibles côté SDK / framework** — LangChain / LangGraph / DSPy / LlamaIndex / Vercel AI SDK / Mastra / semantic-kernel / Haystack / CrewAI sont tous déjà catalogués et n'ont pas fait l'objet d'un release majeur exposé dans les résultats de ce run.
