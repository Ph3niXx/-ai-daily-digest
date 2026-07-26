# Veille écosystème Claude — 2026-07-05

## Stats du run

- **Entrées vues (confirmées actives via recherche web)** : 48
- **Nouvelles ajoutées** : 0 (catalogue déjà mûr — 456 items actifs — aucune nouveauté substantielle non couverte détectée dans les sources canoniques)
- **Mises à jour (bump `last_seen`)** : 48
- **Archivées** : 0 (aucun item avec `last_seen < 2026-04-06` ; le plus ancien est 2026-05-01)

Cap 60/run respecté. Aucun `status`, `user_priority`, `is_pinned`, `user_notes` touché.

## Contexte du run

L'écosystème Claude est en phase mature : 456 slugs actifs déjà catalogués. Le run d'aujourd'hui a servi à confirmer la fraîcheur des piliers (SDK, IDE, plugins officiels Anthropic, connecteurs MCP majeurs) plutôt qu'à explorer un long tail. Aucune découverte notable non couverte par le catalogue existant.

## Nouveautés notables (côté web, déjà dans le catalogue)

Ces items étaient déjà en base ; leur `last_seen` a été bumpé après validation d'activité récente.

- **`mcp-spec-2026-07-28-rc`** (inbound / spec) — Release Candidate du plus gros changement MCP depuis la première release. Core stateless, extensions framework (MCP Apps, Tasks, Triggers), auth alignée OAuth/OIDC. Final ship le 28 juillet 2026.
- **`claude-code-action`** (outbound / GitHub Action) — v1.0 avec auto-detection du mode (interactive vs automation), install-github-app simplifié. Repo màj le 4 juillet 2026. Migration billing crédits séparés depuis le 15 juin 2026.
- **`anthropic-skills-repo`** (inbound / skills) — ~149k stars, contrôles admin entreprise, partner skills directory (Atlassian, Canva, Cloudflare, Figma, Notion, Ramp, Sentry).
- **`vercel-ai-sdk`** (outbound / framework) — AI SDK 7 introduit `HarnessAgent` : une API unique pour Claude Code, Codex, Pi. Program agent harnesses same way you switch models.
- **`ai-sdk-provider-claude-code`** (outbound / provider) — Provider community Vercel AI SDK pour Claude Agent SDK, actif.
- **`claude-plugins-official`** (both / marketplace) — Répertoire Anthropic-managed de plugins Claude Code, mis à jour en continu.
- **`knowledge-work-plugins`** (both / marketplace) — Repo open source des plugins Cowork orientés knowledge workers.
- **`roots-by-benda`** (inbound / MCP servers x5) — Réglementaire (cosmétique, chimique, food, pharma, cannabis) sur Cloudflare Workers, publié sur MCP Official Registry le 16 mai 2026.
- **`agent-commerce-mcp`** (inbound / MCP server) — Storefront agent-native, checkout Stripe, AgentTrust, ajouté à awesome-mcp-servers le 11 mai 2026.
- **`mcpsafe-scanner`** (inbound / devtool) — Security scanner MCP (consensus 5-LLM, AIVSS score), pertinent pour la vigilance prompt injection / tool poisoning.
- **`cowork`** (both / product) — Plugin marketplace passé de 11 à 24 plugins officiels (jan → fév 2026), private plugin marketplaces pour admins entreprise.
- **`claude-in-chrome`** (outbound / integration) — Passé en GA (Generally Available) courant 2026.

## Archivages

Aucun. Le plus ancien `last_seen` en base est **2026-05-01** (65 jours), sous la barre des 90 jours. Prochaine fenêtre d'archivage potentielle : à partir de fin juillet 2026 pour les items non re-vus depuis début mai.

## Slugs bumpés ce run

`agent-commerce-mcp`, `ai-sdk-provider-claude-code`, `anthropic-claude-for-legal`, `anthropic-cybersecurity-skills`, `anthropic-financial-services`, `anthropic-skills-repo`, `awesome-mcp-clients-punkpeye`, `awesome-mcp-devtools-punkpeye`, `awesome-mcp-servers-punkpeye`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `claude-code-action`, `claude-code-cli`, `claude-code-jetbrains`, `claude-code-vscode`, `claude-cookbooks`, `claude-design`, `claude-desktop`, `claude-finance-agents`, `claude-for-creative-work`, `claude-for-excel`, `claude-for-marketing-ops`, `claude-for-outlook`, `claude-for-powerpoint`, `claude-for-small-business`, `claude-for-word`, `claude-in-chrome`, `claude-plugins-official`, `cowork`, `cursor-editor`, `knowledge-work-plugins`, `mcp-amplitude`, `mcp-atlassian`, `mcp-bigquery`, `mcp-canva`, `mcp-figma`, `mcp-github`, `mcp-hex`, `mcp-linear`, `mcp-notion`, `mcp-registry-official`, `mcp-slack`, `mcp-spec-2026-07-28-rc`, `mcp-supabase`, `mcpsafe-scanner`, `roots-by-benda`, `vercel-ai-sdk`, `zed-editor`.

## Limites du run

- **Couverture limitée par le cap 60/run** : les runs précédents ont déjà catalogué la longue traîne (skills tiers, subagents packs, wrappers exotiques). Ce run se concentre sur les piliers.
- **Reddit r/ClaudeAI** : la recherche n'a pas retourné de résultats indexés pour ce trimestre — pas de signal fiable sur les tools tiers émergents via cette source. Sources alternatives (Twitter/X, Discord Anthropic) hors périmètre.
- **Repos privés / paywall** : non couverts (Bloomberg, IBIS, LSEG etc. déjà en base via leurs slugs `mcp-*`, mais impossible de vérifier releases sans accès).
- **Pas de nouveaux ADR à créer** : rien ne remet en cause l'architecture actuelle.

## Notes pour le prochain run

- Surveiller le ship final du spec MCP le 28 juillet 2026 → possible cascade de forks/updates dans les 2 semaines suivantes.
- Le vercel-ai-sdk-6 est superseded par AI SDK 7 (nouvelle major). Envisager : soit garder les deux slugs (v6 archive future), soit fusionner. À réévaluer à J+30.
- Le catalogue frôle 500 items. Envisager une politique de rétention plus stricte (archivage à 60 jours plutôt que 90 ?) avant de dépasser 500.
