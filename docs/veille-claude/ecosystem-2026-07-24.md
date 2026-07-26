# Veille écosystème Claude — 2026-07-24

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées existantes en base (début de run) | 472 |
| Total après run | 475 |
| Ajoutées (vraiment nouvelles) | 3 |
| Mises à jour (bump `last_seen`) | 45 |
| Archivées | 0 |
| Slugs `active` > 90 jours sans revue | 0 |
| Items touchés au total | 48 (cap 60 respecté) |

## Nouveautés notables

- **claude-for-teachers** — both / other, vendor Anthropic. Version dédiée K-12 US lancée le 14 juillet 2026, gratuite pour enseignants vérifiés. Inclut une library of teaching skills, connexion aux curriculums evidence-based mappés aux standards académiques des 50 états (partenariat Chan Zuckerberg Learning Commons). Accès à Claude Code et Cowork pour analyse rosters / diagnostics. Peu pertinent RTE Malakoff mais utile en veille produit pour comprendre la segmentation verticale Anthropic (classée `other` faute de type dédié `vertical_product`).
- **mcp-axonius** — inbound / mcp_server, vendor Axonius. Annoncé le 21 juillet 2026 : expose Axonius Asset Cloud à un client IA, traduit une question en langage naturel en AQL (Axonius Query Language) et retourne des réponses live sur la posture assets/sécurité. Livré avec un Axonius AI Agent complémentaire pour ops sécu/IT.
- **mcp-rancher** — inbound / mcp_server, communautaire (futuretea). MCP server pour Rancher (multi-cluster Kubernetes). Expose APIs clusters/projects/workloads via MCP pour piloter K8s en langage naturel. À évaluer côté ops Malakoff si Rancher est utilisé sur la plateforme.

Les autres candidats croisés (Press Ranger MCP, MCP Apps spec, GitHub MCP Server next spec) étaient déjà présents en base sous des slugs existants (`mcp-press-ranger`, `mcp-apps-spec`, `mcp-github`) — `last_seen` bumpé.

## Mises à jour (`last_seen` bumpé)

45 slugs confirmés vivants via recherche web ce jour, regroupés :

- **Officiel Anthropic** — `anthropic-skills-repo` (149k stars, commits juin 2026), `claude-agent-sdk-python` (release 22/07/2026 sur PyPI), `claude-agent-sdk-typescript`, `claude-agent-sdk-go`, `claude-code-cli`, `claude-code-vscode`, `claude-code-jetbrains`, `claude-cookbooks`, `claude-desktop`, `claude-in-chrome`, `claude-tag`, `claude-code-web`, `claude-managed-agents`.
- **Marketplaces Anthropic** — `claude-marketplace`, `claude-plugins-official`, `claude-plugins-community`.
- **Spec & registres MCP** — `mcp-spec-2026-07-28-rc` (RC toujours en tête d'agenda), `mcp-registry-official`, `modelcontextprotocol-servers`, `mcp-apps-spec` (extension officielle lancée 26 janvier 2026, toujours active), `agentic-ai-foundation` (gouvernance Linux Foundation, ~150 orgs membres).
- **MCP servers vus dans les awesome-lists et changelogs juillet 2026** — `mcp-github` (a shippé le support next-spec le 23/07/2026), `mcp-atlassian`, `mcp-slack`, `mcp-linear`, `mcp-hubspot`, `mcp-sentry`, `mcp-neon`, `mcp-vercel`, `mcp-snowflake`, `aws-mcp-server`, `mcp-press-ranger` (V1 lancée 9/07/2026).
- **Directories & awesome-lists** — `awesome-mcp-servers-punkpeye`, `pulsemcp-directory` (22 311 servers listés au 16/07/2026), `mcp-so-directory`, `claudemarketplaces-directory`, `tonsofskills-marketplace`, `claude-skills-alirezarezvani` (v2.11.2 sortie 17/07/2026, 362 skills / 88 plugins).
- **Frameworks / SDK tiers** — `vercel-ai-sdk`, `vercel-ai-sdk-6`.
- **IDE agents** — `cursor-editor`, `zed-editor`, `windsurf-editor` (confirmés comme cibles Claude Code IDE extension en juillet 2026).
- **Cowork** — `cowork`, `ccpi-cli` (package manager plugins).

Décisions user (`status`, `user_priority`, `is_pinned`, `user_notes`) intégralement préservées : l'UPDATE de bump ne touche que `last_seen`, l'INSERT des 3 nouveaux slugs laisse `status` prendre sa valeur par défaut (colonne non écrite) et n'écrase pas les colonnes `user_*`.

## Archivages

Aucun. Requête `status='active' AND last_seen < CURRENT_DATE - INTERVAL '90 days'` → 0 ligne. Le plus vieux `last_seen` en base est 2026-05-01 (~84 jours), toujours sous la borne. Prochain risque : items qui basculeront début août sans revue explicite (voir prochains passages).

## Limites de ce run

- **Cap 60 items respecté** — 48 items touchés (45 update + 3 insert).
- **Pas d'inserts spéculatifs** — plusieurs candidats croisés dans les recherches (ex. futuretea/rancher-mcp-server retenu ; autres MCP servers 2026 mentionnés génériquement dans les awesome-lists sans identification stable, ou items déjà couverts sous un autre slug) ont été écartés faute de repo/vendor clairement identifiable ou pour éviter les doublons.
- **Sources non couvertes** — r/ClaudeAI top du mois non ré-fouillé directement (WebSearch renvoie des résumés indirects, résultats mal typés). Cookbook Anthropic (`github.com/anthropics/anthropic-cookbook`) déjà représenté par `claude-cookbooks`. Bots Slack/Discord/Linear natifs : rien de nouveau au-delà des MCP connectors déjà catalogués.
- **Signaux marché à surveiller** — spec MCP finale 2026-07-28 doit être suivie dans le prochain run pour éventuelle création d'un slug `mcp-spec-2026-07-28` (final) distinct du `-rc` actuel. GA du support next-spec dans les grands serveurs (GitHub déjà OK) à confirmer sur Atlassian, Cloudflare, Vercel, Neon.

## Prochains passages suggérés

- **Post 2026-07-28** : ajouter/rebadger la spec MCP finale, re-scanner les SDK MCP (Python / TypeScript / Kotlin) pour bumper leurs releases v2 alignées sur le stateless core.
- **Fin juillet** : rescan ciblé des items dont `last_seen` remonte à début mai 2026 (~10 jours avant la borne 90 jours) pour éviter le bascule automatique en `archived`.
- **Éducation & verticales** : quand Anthropic ouvrira Claude for Teachers hors US (si annoncé), enrichir `applicability` de `claude-for-teachers`. Suivre les autres verticales possibles (santé publique, ONG) qui pourraient copier ce pattern.
- **Kubernetes ops** : si `mcp-rancher` gagne en adoption ou si un `mcp-openshift` / `mcp-tanzu` équivalent sort, catégoriser sous un même tag `kubernetes-ops` pour lisibilité.
