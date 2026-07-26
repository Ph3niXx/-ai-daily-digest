# Veille écosystème Claude — 2026-07-01

> **supabase_skipped: MCP Supabase indisponible dans la session (aucun outil `mcp__supabase__*` exposé, aucun serveur Supabase en attente d'auth non plus).** L'UPSERT `claude_ecosystem` et l'archivage doux n'ont **pas** été exécutés. Rapport markdown seul, à replayer manuellement contre la table Supabase (voir section "Ce qui n'a pas pu être couvert").

## Résumé chiffré

- **Entrées vues / revérifiées ce run** : 60 (cap atteint)
- **Nouvelles entrées ajoutées** : 0 (pas d'INSERT — Supabase indisponible)
- **Entrées mises à jour (slug existant)** : 0 (pas d'UPDATE — Supabase indisponible)
- **Entrées archivées** : 0 (pas de SELECT stale — Supabase indisponible)
- **État global du catalogue** : inconnu ce run (dernier snapshot connu 2026-06-30 = 456 actives)

## Lecture du run

Sans accès Supabase, ce run n'a pas pu déduplifier contre les 456 slugs existants. La liste ci-dessous est donc la **cible d'UPSERT** à rejouer dès qu'un MCP Supabase (ou un accès direct via `psql`) est de nouveau disponible. Tous les outils listés sont conformes au filtre qualité : maintenus (≥1 commit ou release ≤6 mois), source canonique identifiable, description factuelle, applicabilité renseignée quand elle existe pour le projet Jarvis Cockpit ou le rôle RTE.

Le contenu recherche est stable par rapport au run 2026-06-30 : mêmes SDKs Anthropic (Python/TS + Agent SDK), même trio de skills officiels (docx/pdf/pptx/xlsx + skill-creator + mcp-server + webapp-testing), knowledge-work-plugins (dont product-management ciblé RTE), 15 MCP servers de référence, 6 frameworks (LangChain/LlamaIndex/Vercel AI SDK/Haystack/DSPy/Semantic Kernel), 8 surfaces IDE/agent (Claude Code CLI + VSCode + JetBrains, Cursor, Zed, Cline, Aider, Amp, Goose), et 3 utilitaires (OpenRouter, LiteLLM, registre MCP officiel).

Aucune anomalie détectée (60 outils, largement au-dessus du seuil suspect de 5). L'écart avec les 456 entrées historiques du catalogue est attendu — la table cumule les entrées ajoutées depuis fin avril 2026, ce run ne re-scanne que le noyau structurant.

## Catalogue cible (à UPSERT dès que Supabase est de nouveau accessible)

### Inbound — Skills officiels (Anthropic)

| slug | name | source_url |
|---|---|---|
| `anthropic-skills-repo` | Anthropic Skills (official skill pack) | https://github.com/anthropics/skills |
| `skill-docx` | docx skill | https://github.com/anthropics/skills/tree/main/skills/docx |
| `skill-pdf` | pdf skill | https://github.com/anthropics/skills/tree/main/skills/pdf |
| `skill-pptx` | pptx skill | https://github.com/anthropics/skills/tree/main/skills/pptx |
| `skill-xlsx` | xlsx skill | https://github.com/anthropics/skills/tree/main/skills/xlsx |
| `skill-creator` | skill-creator | https://github.com/anthropics/skills/tree/main/skills |
| `skill-mcp-server` | mcp-server skill | https://github.com/anthropics/skills/tree/main/skills |
| `skill-webapp-testing` | webapp-testing skill | https://github.com/anthropics/skills/tree/main/skills |

### Inbound — Plugins Cowork (Anthropic)

| slug | name | source_url |
|---|---|---|
| `knowledge-work-plugins` | Anthropic Knowledge Work Plugins (marketplace) | https://github.com/anthropics/knowledge-work-plugins |
| `cowork-plugin-productivity` | Cowork Productivity plugin | https://github.com/anthropics/knowledge-work-plugins/tree/main/productivity |
| `cowork-plugin-product-management` | Cowork Product Management plugin | https://github.com/anthropics/knowledge-work-plugins/tree/main/product-management |
| `cowork-plugin-data` | Cowork Data plugin | https://github.com/anthropics/knowledge-work-plugins/tree/main/data |
| `cowork-plugin-enterprise-search` | Cowork Enterprise Search plugin | https://github.com/anthropics/knowledge-work-plugins/tree/main/enterprise-search |

### Inbound — MCP servers de référence & communauté maintenue

| slug | name | vendor | source_url |
|---|---|---|---|
| `mcp-filesystem` | Filesystem MCP server | Model Context Protocol | https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem |
| `mcp-git` | Git MCP server | Model Context Protocol | https://github.com/modelcontextprotocol/servers/tree/main/src/git |
| `mcp-memory` | Memory MCP server | Model Context Protocol | https://github.com/modelcontextprotocol/servers/tree/main/src/memory |
| `mcp-sequential-thinking` | Sequential Thinking MCP server | Model Context Protocol | https://github.com/modelcontextprotocol/servers/tree/main/src/sequentialthinking |
| `mcp-fetch` | Fetch MCP server | Model Context Protocol | https://github.com/modelcontextprotocol/servers/tree/main/src/fetch |
| `mcp-time` | Time MCP server | Model Context Protocol | https://github.com/modelcontextprotocol/servers/tree/main/src/time |
| `mcp-supabase` | Supabase MCP server | Supabase | https://github.com/supabase-community/supabase-mcp |
| `mcp-github` | GitHub MCP server | GitHub | https://github.com/github/github-mcp-server |
| `mcp-playwright` | Playwright MCP server | Microsoft | https://github.com/microsoft/playwright-mcp |
| `mcp-chrome-devtools` | Chrome DevTools MCP | Google Chrome DevTools | https://github.com/ChromeDevTools/chrome-devtools-mcp |
| `mcp-context7` | Context7 MCP server | Upstash | https://github.com/upstash/context7 |
| `mcp-notion` | Notion MCP server | Notion | https://developers.notion.com/docs/mcp |
| `mcp-linear` | Linear MCP server | Linear | https://linear.app/docs/mcp |
| `mcp-sentry` | Sentry MCP server | Sentry | https://github.com/getsentry/sentry-mcp |
| `mcp-stripe` | Stripe MCP server | Stripe | https://docs.stripe.com/mcp |
| `mcp-slack` | Slack MCP server (Zencoder) | Zencoder | https://github.com/zencoderai/slack-mcp-server |
| `mcp-atlassian` | Atlassian (Jira/Confluence) MCP | Atlassian | https://www.atlassian.com/platform/remote-mcp-server |
| `mcp-brave-search` | Brave Search MCP server | Brave | https://github.com/brave/brave-search-mcp-server |
| `mcp-cloudflare` | Cloudflare MCP server | Cloudflare | https://github.com/cloudflare/mcp-server-cloudflare |
| `mcp-registry` | Official MCP Registry | Model Context Protocol | https://registry.modelcontextprotocol.io/ |

### Outbound — SDKs & agent runtimes (Anthropic)

| slug | name | source_url |
|---|---|---|
| `anthropic-python-sdk` | Anthropic Python SDK | https://github.com/anthropics/anthropic-sdk-python |
| `anthropic-typescript-sdk` | Anthropic TypeScript SDK | https://github.com/anthropics/anthropic-sdk-typescript |
| `claude-agent-sdk-python` | Claude Agent SDK (Python) | https://github.com/anthropics/claude-agent-sdk-python |
| `claude-agent-sdk-typescript` | Claude Agent SDK (TypeScript) | https://github.com/anthropics/claude-agent-sdk-typescript |
| `anthropic-claude-cookbooks` | Claude Cookbooks | https://github.com/anthropics/claude-cookbooks |
| `python-mcp-sdk` | MCP Python SDK | https://github.com/modelcontextprotocol/python-sdk |
| `typescript-mcp-sdk` | MCP TypeScript SDK | https://github.com/modelcontextprotocol/typescript-sdk |

### Outbound — Frameworks

| slug | name | vendor |
|---|---|---|
| `vercel-ai-sdk` | Vercel AI SDK | Vercel |
| `langchain-anthropic` | LangChain Anthropic integration | LangChain |
| `llamaindex-anthropic` | LlamaIndex Anthropic integration | LlamaIndex |
| `haystack-anthropic` | Haystack Anthropic integration | deepset |
| `dspy-anthropic` | DSPy Anthropic integration | Stanford NLP / DSPy |
| `semantic-kernel-anthropic` | Semantic Kernel Anthropic connector | Microsoft |

### Outbound — Clients IDE / Desktop / Agents tiers

| slug | name | vendor |
|---|---|---|
| `claude-code` | Claude Code (CLI) | Anthropic |
| `claude-code-vscode` | Claude Code VS Code extension | Anthropic |
| `claude-code-jetbrains` | Claude Code JetBrains plugin | Anthropic |
| `claude-desktop` | Claude Desktop | Anthropic |
| `claude-in-chrome` | Claude for Chrome | Anthropic |
| `cowork` | Claude Cowork | Anthropic |
| `cursor` | Cursor | Cursor / Anysphere |
| `zed` | Zed | Zed Industries |
| `cline` | Cline | Cline Bot Inc. |
| `aider` | Aider | Aider |
| `amp-code` | Amp (Sourcegraph) | Sourcegraph |
| `goose` | Goose | Block |

### Outbound — Connecteurs multi-provider

| slug | name | vendor |
|---|---|---|
| `openrouter-anthropic` | OpenRouter (Anthropic passthrough) | OpenRouter |
| `litellm-anthropic` | LiteLLM (Anthropic provider) | BerriAI |

## Fit projet — top 8 pour Jarvis Cockpit / rôle RTE

1. **`mcp-supabase`** — brancherait directement la table `claude_ecosystem` (et le reste : `articles`, `skill_radar`, `signals`, `user_profile`) à Claude Desktop / Code, respectant la RLS. Débloquerait ce run notamment.
2. **`mcp-atlassian`** — Jira + Confluence natifs pour le train Vente à Malakoff Humanis. Fit RTE #1.
3. **`cowork-plugin-product-management`** — le plus proche du workflow RTE (specs, roadmap, standups) + connecteurs Jira/Slack/Notion/Amplitude.
4. **`mcp-context7`** — anti-hallucination sur la stack React 18 + Babel standalone + Supabase du cockpit, très directement utile.
5. **`skill-pdf` + `skill-docx` + `skill-pptx` + `skill-xlsx`** — recouvrent déjà 100% des livrables Train Vente (suivi engagements PDF → exec summary, mémos Word, décks PPT, exports Excel).
6. **`mcp-playwright`** — smoke tests des 29 panels après chaque `sw-sync`.
7. **`litellm-anthropic`** — proxy unifié pour la coexistence Claude Haiku (weekly) + Gemini Flash-Lite (volume) + LM Studio (local Jarvis) sans changer les call sites.
8. **`skill-creator`** — pour packager les workflows spécifiques cockpit (veille synthesis, TFT tracker) en skills réutilisables.

## Archivages

Non applicable ce run — pas d'accès Supabase pour identifier les entrées `last_seen < CURRENT_DATE - 90j`.

## Ce qui n'a pas pu être couvert

- **Supabase MCP indisponible dans la session** — pas de SELECT initial, pas d'UPSERT, pas de UPDATE d'archivage. C'est le point bloquant du run. Deux pistes de rattrapage :
  1. Rejouer ce même prompt dans une session où le MCP Supabase (`supabase-community/supabase-mcp`) est branché avec `SUPABASE_SERVICE_KEY`.
  2. Générer un fichier `.sql` d'UPSERT à partir de la liste ci-dessus et l'exécuter à la main via `psql` ou l'éditeur SQL Supabase. Le squelette de la requête est déjà dans le prompt de la tâche planifiée.
- **r/ClaudeAI top du mois** — non requêté ce run (l'agent de recherche a priorisé les sources officielles pour rester dans le cap de 60). À rattraper au prochain run pour capter les outils tiers émergents (SuperClaude, Claude Squad, communautés cybersec).
- **Inspection directe de commit history** — la vérification "≥1 commit ou release ≤6 mois" repose sur les release notes/annonces croisées via web search, pas sur un `git log`. Confiance élevée sur les acteurs majeurs (Anthropic, Microsoft, Cloudflare, Supabase, GitHub, Vercel) mais un audit par échantillon serait sain sur les MCP servers plus petits (`mcp-time`, `mcp-sentry`) au prochain run avec Supabase disponible pour comparer avec l'historique `last_seen`.
- **Slackbot MCP Client** (annonce Slack juin 2026) — toujours ambigu (direction both / connector) comme noté au run précédent. Décision toujours en attente.
- **Diff avec les 456 entrées historiques** — sans SELECT sur Supabase, impossible de dire lesquelles des 60 entrées ci-dessus sont réellement nouvelles vs déjà connues. La grande majorité sont vraisemblablement déjà en base (confirmé par le run 2026-06-30 qui listait `mcp-supabase`, `context7-mcp`, tous les skills, SDKs et frameworks) mais quelques slugs peuvent différer (ex. `mcp-context7` ici vs `context7-mcp` dans le run précédent) → **risque de doublon** si UPSERT rejoué sans normalisation préalable.

## Suggestions pour les prochains runs

1. Traiter le "risque de doublon" ci-dessus avant tout rejeu UPSERT : normaliser les slugs sur convention `<vendor>-<name>` ou `mcp-<name>` puis passer un audit manuel comparatif contre le snapshot 2026-06-30.
2. Ajouter dans le prompt de la tâche planifiée un fallback "génère un fichier `.sql` d'UPSERT dans `outputs/` quand Supabase MCP indisponible" — permettrait au user de rattraper le run à la main sans re-prompter Claude.
3. Étendre la veille aux release notes GitHub des repos les plus stratégiques (`anthropics/skills`, `anthropics/claude-agent-sdk-python`, `modelcontextprotocol/servers`) via WebFetch direct pour capter les nouveautés qui ne passent pas encore par la recherche.
