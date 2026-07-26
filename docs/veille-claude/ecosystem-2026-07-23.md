# Veille écosystème Claude — 2026-07-23

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées existantes en base | 471 |
| Total après run | 472 |
| Ajoutées (vraiment nouvelles) | 1 |
| Mises à jour (bump `last_seen`) | 54 |
| Archivées | 0 |
| Slugs `active` > 90 jours sans revue | 0 |

## Nouveautés notables

- **pr-review-toolkit** — inbound / cowork_plugin. Plugin officiel Anthropic (`anthropics/claude-plugins-official`) qui lance six sous-agents spécialisés sur chaque PR : comment analysis, test coverage, type design, error handling, code quality, readability. Distinct de `plugin-code-review` (repo différent, granularité par domaine plutôt qu'agent unique).

Aucune autre entrée réellement absente du catalogue n'a été identifiée lors de ce run — le catalogue est déjà très couvert (471 items) sur toutes les catégories cibles (MCP officiels, marketplaces plugins, SDKs, IDE, frameworks).

## Mises à jour (`last_seen` bumpé)

54 slugs confirmés vivants via recherche web ce jour, regroupés :

- **Officiel Anthropic** — `anthropic-skills-repo`, `anthropic-sdk-python`, `anthropic-sdk-typescript`, `claude-agent-sdk-python`, `claude-agent-sdk-typescript`, `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claudecode-nvim`, `claude-cookbooks`, `claude-marketplace`, `claude-plugins-official`, `claude-desktop`, `claude-in-chrome`, `claude-for-excel`, `claude-tag`.
- **Spec & registres MCP** — `mcp-registry-official`, `mcp-spec-2026-07-28-rc`, `modelcontextprotocol-servers`, `awesome-mcp-servers-punkpeye`, `awesome-claude-plugins-composio`, `claudepluginhub-directory`.
- **MCP servers vus dans les awesome-lists 2026** — `mcp-github`, `mcp-supabase`, `mcp-figma`, `mcp-playwright`, `mcp-postgres`, `mcp-notion`, `mcp-linear`, `mcp-slack`, `mcp-sentry`, `mcp-kubernetes`, `context7-mcp`, `firecrawl-mcp`.
- **Frameworks / SDK tiers** — `vercel-ai-sdk`, `langchain-claude`, `llamaindex-claude`, `dspy-claude`, `mastra`, `pydantic-ai`.
- **IDE & runtimes agent** — `cursor-editor`, `zed-editor`, `windsurf-editor`, `aider-cli`, `cline`, `kilo-code`, `roo-code`, `goose`, `opencode`, `claude-code-router`, `cowork`.
- **Plugins & skills communautaires majeurs** — `superpowers-skills` (obra/superpowers), `caveman`, `plugin-code-review`.

Toutes les décisions user (`status`, `user_priority`, `is_pinned`, `user_notes`) ont été préservées : la commande d'UPDATE n'a touché que `last_seen`, l'INSERT du nouveau slug part avec `status = 'active'` par défaut (colonne non écrite explicitement).

## Archivages

Aucun. La borne 90 jours n'a rien remonté (le plus vieux `last_seen` en base est 2026-05-01, soit ~83 jours ; aucun candidat mort à confirmer).

## Limites de ce run

- **Cap 60 items respecté** — 55 items touchés (54 update + 1 insert), sous le plafond assumé.
- **Pas d'inserts spéculatifs** — plusieurs items croisés dans les recherches (ex. `codebase-memory-mcp` générique côté trending list, `obra/superpowers-lab`, `obra/superpowers-marketplace`, `Hacker0x01/claude-power-user`, `superpowers-developing-for-claude-code`) semblaient recouvrir des slugs déjà présents (`superpowers-skills`, `codebase-memory-mcp-deusdata`) ou étaient des dérivés/forks avec ambiguïté d'identité. Filtre "pas de doublons" respecté, ces items non ajoutés faute de séparation nette avec l'existant.
- **Sources non couvertes** — r/ClaudeAI top du mois non fouillé cette fois (Reddit MCP en attente d'auth, WebSearch renvoie des résumés indirects). Cookbook Anthropic (`github.com/anthropics/anthropic-cookbook`) déjà représenté par `claude-cookbooks`. Bots natifs Linear/Notion : pas de nouveau produit "Claude natif" repéré au-delà des MCP connectors déjà catalogués.
- **Signaux marchés** — MCP spec release candidate 2026-07-28 confirmée dans les résultats (`mcp-spec-2026-07-28-rc`, bumpé). Prochain run après le 28/07 devra vérifier si un slug `mcp-spec-2026-07-28` (sans `-rc`) doit être créé une fois la version finale publiée.

## Prochains passages suggérés

- Après le 28 juillet 2026 : ajouter/rebadger la spec MCP finale et re-scanner les SDK MCP (Python / TypeScript / Kotlin) pour bumper leurs releases v2.
- Vérifier dans ~10 jours les items les plus anciens (`last_seen` début mai 2026) pour éviter qu'ils franchissent la borne 90 jours sans revue.
- Rescan ciblé "IDE forks VS Code" (Devin Desktop, Kiro) : mentionnés dans les résultats comme forks supportés par l'extension Claude Code officielle — à évaluer comme entrées distinctes ou notes dans `applicability` de `claude-code-vscode`.
