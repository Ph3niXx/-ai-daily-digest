# Veille écosystème Claude — 2026-06-24

## Compteurs du run

| Métrique | Valeur |
|---|---|
| Total catalogue après run | 450 |
| Entrées vues (last_seen = today) | 60 |
| Vraiment nouvelles (insert) | 6 |
| Mises à jour (slug existant) | 54 (15 refresh de contenu + 39 bump last_seen) |
| Archivées | 0 |
| Stale (> 90 j) à la fin | 0 |

Cap du run : 60 outils max → atteint.

## Nouveautés notables (insérées)

- **claude-tag** — _connector / inbound_ — Anthropic. Claude Tag : agent Slack-native lancé 2026-06-23 qui remplace l'app Claude in Slack legacy. Ambient mode, mémoire de contexte, exécution async. Migration jusqu'au 2026-08-03.
- **skill-algorithmic-art** — _skill / inbound_ — Anthropic. Nouveau skill juin 2026 dans `anthropics/skills` : génère de l'art algorithmique en p5.js avec seeded randomness.
- **skill-frontend-design** — _skill / inbound_ — Anthropic. Nouveau skill juin 2026 pour design visuel intentionnel d'UI. À ne pas confondre avec le plugin Cowork `plugin-frontend-design` déjà au catalogue.
- **databricks-genie-mcp** — _mcp_server / inbound_ — Databricks. Genie Managed MCP + Agent Bricks Supervisor (preview), expose Databricks à Claude.
- **salesforce-databricks-mcp** — _mcp_server / inbound_ — Salesforce. Intégrations MCP ouvertes annoncées 2026-06-16 dans le cadre du partenariat Salesforce x Databricks (H2 2026).
- **devin-desktop** — _ide_integration / outbound_ — Cognition. Rebrand de Windsurf → Devin Desktop 3.2 (juin 2026), système de plugins en preview, sous-agents qui appellent MCP directement, support Opus 4.8.

## Refresh de contenu (15 slugs avec description ré-écrite)

`anthropic-sdk-python` (v0.110 + code_execution_20260120), `anthropic-sdk-typescript`, `claude-agent-sdk-python` (v0.2.107), `claude-agent-sdk-typescript` (0.3.170 + Fable 5 + SSE), `claude-code-cli` (/cd, sub-agent nesting, --safe-mode, fallbackModel), `claude-plugins-official` (196 plugins), `aws-mcp-server` (GA), `mcp-github` (Secret Scanning GA), `mcp-notion` (v3.5), `vercel-ai-sdk-6`, `voltagent-awesome-claude-code-subagents` (154+ sous-agents), `claude-managed-agents-dreaming`, `claude-managed-agents-sandboxes`, `claude-marketplace`, `claude-cookbooks`.

## Refresh last_seen seul (39 slugs)

SDKs annexes (`anthropic-sdk-go`, `-java`, `-ruby`, `-php`, `claude-agent-sdk-go`), IDE / éditeurs (`cursor-editor`, `windsurf-editor`, `cline`, `continue-dev`, `aider-cli`, `zed-editor`, `goose`, `opencode`, `claude-code-jetbrains`, `claude-code-vscode`, `claude-code-xcode`, `jetbrains-claude-code-gui-plugin`), Microsoft 365 add-ins Claude (`claude-for-excel`, `claude-for-outlook`, `claude-for-word`, `claude-for-powerpoint`), Anthropic ecosystem (`anthropic-skills-repo`, `anthropic-cybersecurity-skills`, `anthropic-financial-services`, `anthropic-claude-for-legal`, `claude-finance-agents`, `claude-design`, `claude-in-chrome`, `claude-desktop`, `cowork`), MCP / spec (`mcp-supabase`, `mcp-databricks`, `mcp-slack`, `mcp-registry-official`, `mcp-spec-2026-07-28-rc`, `modelcontextprotocol-servers`, `awesome-mcp-servers-punkpeye`), provider AI (`ai-sdk-provider-claude-code`), awesome list (`awesome-claude-code-hesreallyhim`).

## Archivages

Aucun. Au début du run : 0 entrée avec `last_seen < CURRENT_DATE - 90 days` (le plus ancien `last_seen` était 2026-05-01, soit ~54 jours). Donc rien à vérifier "mort ou vif".

À surveiller pour les prochaines passes :
- **claude-in-slack-legacy** (pas dans le catalogue sous ce slug, à archiver/marquer si présent sous un autre slug) : sunset confirmé 2026-08-03.
- **claude-opus-4-1** : déprécié dans `anthropic-sdk-python` v0.106. À archiver si jamais ajouté comme entrée.

## Points d'attention / observations

- **Catalogue déjà très dense (450 entrées)**. La marge "vraiment nouveau" se réduit naturellement chaque semaine ; le run de ce jour confirme un débit de ~5-7 vraies nouveautés par cycle de veille.
- **Risque doublons** : le skill officiel `frontend-design` (juin 2026) côtoie un plugin Cowork `plugin-frontend-design` préexistant ; gardés séparés volontairement (types différents, sources différentes).
- **claude-agent-sdk-credits** : annoncé pour 2026-06-15 puis rollout en pause à la dernière minute. Pas ajouté au catalogue (feature de pricing plus que tool).
- **Modèles Fable 5 / Mythos 5** (release 2026-06-09) : non ajoutés (le catalogue track les outils/intégrations, pas les modèles eux-mêmes).
- **openai-codex-plugins** (juin 2026) : non ajouté (écosystème OpenAI hors scope Claude, mais à reconsidérer si l'on veut tracker les "competitor patterns").

## Sources non couvertes ou partiellement couvertes

- r/ClaudeAI top du mois : non scrappé directement ce run, l'agent de recherche s'est concentré sur les sources structurées (GitHub, docs vendor, newsroom Anthropic).
- Repos privés (private beta plugins, MCP gateway preview) : pas de visibilité publique → confiance sur les blogs vendor.
- Quelques listings "awesome-*" peuvent contenir des outils <100 stars filtrés par le seuil qualité.
