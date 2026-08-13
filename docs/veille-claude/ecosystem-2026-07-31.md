# Veille écosystème Claude — 2026-07-31

## KPI

| Métrique | Valeur |
|---|---|
| Entrées vues (touchées ce run) | 37 |
| Vraiment nouvelles (INSERT) | 1 |
| Mises à jour (slug existant, `last_seen` bumpé) | 36 |
| Archivées | 0 |
| Total catalogue après run | 480 (était 479) |
| Items encore stale (>90j) post-run | 0 |

## Nouveautés (1)

- **learning-commons** — `inbound` / `connector` — Chan Zuckerberg Initiative. Connecteur donnant à Claude l'accès aux standards académiques des 50 États US et aux compétences pédagogiques sous-jacentes. Utilisé dans Claude for Teachers (lancé 14 juillet 2026) pour ancrer les plans de cours dans OpenSciEd, Illustrative Mathematics et curricula alignés standards. Source : [learningcommons.org](https://learningcommons.org/news/claude-for-teachers/).

## Mises à jour notables (contenu réécrit, pas seulement `last_seen`)

- **mcp-spec-2026-07-28-rc** — spec **finalisée le 28 juillet 2026** (n'est plus RC). Passage stateless, MCP Apps et Tasks promues extensions officielles, OAuth 2.1 / PKCE / OIDC, header-based routing, cacheable list results, deprecation policy. Le slug garde le suffixe `-rc` pour ne pas casser l'identifiant.
- **mcp-apps-spec** — désormais extension officielle depuis 2026-07-28. Serveurs qui shippent des UI HTML rendues en iframe sandboxé côté host.
- **mcp-tasks-spec** — désormais extension officielle depuis 2026-07-28. Cycle stateless `tools/call` → task handle → `tasks/get`/`update`/`cancel`.
- **mcp-firebase** — **stale résolu** : le Firebase MCP server officiel Google est GA en 2026 (intégré à `firebase-tools` v15.5.1, MIT, 30+ tools). Description rafraîchie avec compat Claude Code / Cursor / VS Code Copilot / Windsurf.
- **claude-for-teachers** — lancement effectif 14 juillet 2026 documenté. Inclut connecteur Learning Commons + skills teaching open-source + Claude Code + Cowork.
- **claude-marketplace** — lancement partners consolidé : GitLab, Harvey, Lovable, Replit, Rogo, Snowflake.
- **claude-managed-agents-multiagent** — Agent Teams (Opus 4.6, 5 février 2026), toujours experimental, gated par variable d'env.
- **claude-science** — workbench life-sciences lancé 1er juillet 2026.
- **claude-cookbooks** — version web rendue lancée 7 janvier 2026 sur `platform.claude.com/cookbook`, repo GitHub à ~48.8k stars.
- **skillmatic-awesome-agent-skills** — **stale résolu** : repo vivant, dernière update mai 2026, 593 stars, contient 8+ papers 2026 (SkillFlow, Graph of Skills, SkillClaw, SkillNet, SkillsBench).

## Refresh simple (`last_seen` bumpé, contenu à jour confirmé)

SDKs officiels Anthropic : `anthropic-sdk-python`, `anthropic-sdk-typescript`, `anthropic-sdk-go`, `anthropic-sdk-java`, `anthropic-sdk-ruby` (tous mis à jour 24 juillet 2026 côté Anthropic).

Community SDK : `xemantic-sdk-kotlin`.

Agent SDK : `claude-agent-sdk-python`, `claude-agent-sdk-typescript`.

IDE : `zed-editor`, `zed-acp-external-agents`, `agent-client-protocol`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-code-cli`.

Plugins / skills Claude Code populaires : `context7-mcp`, `superpowers-skills`, `claude-mem`, `caveman`, `mcp-chrome-devtools`, `plugin-frontend-design`, `gstack-skill`, `wshobson-claude-agents`, `awesome-claude-code-toolkit-rohitg00`.

Directories : `claude-plugins-official`, `anthropic-skills-repo`.

Marketplace / hub : `claude-partner-hub`.

## Archivages

Aucun. Les 2 items qui étaient stale (>90 jours) au début du run (`skillmatic-awesome-agent-skills`, `mcp-firebase`) ont tous les deux été vérifiés vivants et refreshés. Zéro `status = 'archived'` généré.

## Ce qui n'a pas pu être couvert

- **r/ClaudeAI top du mois** — pas d'accès direct au subreddit (WebSearch renvoie des articles tiers, pas le classement Reddit). Émergents tiers non captés cette fois.
- **Repos privés / beta invite-only** — plusieurs partenaires marketplace (Rogo, Harvey) ne publient pas de source_url canonique en dehors de leurs pages produit ; entrées existantes conservées telles quelles.
- **Amplitude / Atlassian / Hex MCP** — connecteurs de la session non authentifiés (OAuth flow non exécutable en mode scheduled task) ; n'a pas empêché le run, ces intégrations étaient déjà cataloguées côté `mcp-atlassian`, `mcp-amplitude`, `mcp-hex`.
- **Cap 60 items respecté** — run à 37 items, donc marge confortable ; le catalogue étant à 480 entrées, la stratégie reste "refresh sélectif ciblé sur ce qui bouge" plutôt que balayage exhaustif.

## Décisions préservées (non touchées)

`status`, `user_priority`, `is_pinned`, `user_notes` : jamais écrits par ce run (contrainte respectée dans les 3 UPSERT). Les 480 items conservent leurs annotations utilisateur.
