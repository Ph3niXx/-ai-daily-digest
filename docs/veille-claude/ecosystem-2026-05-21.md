# Veille catalogue écosystème Claude — 2026-05-21

## Résumé chiffré

| Métrique | Valeur |
|---|---|
| Entrées vues (couvertes par la recherche) | ~60 |
| Entrées catalogue avant run | 356 |
| Entrées catalogue après run | **356** |
| Vraiment nouvelles (INSERT) | **0** |
| Mises à jour (slug existant — bump `last_seen` + refresh metadata) | **50** |
| Items touchés aujourd'hui (DB) | **50** |
| Archivées | **0** (plus ancienne `last_seen` du catalogue toujours < 90 jours) |
| Items toujours actifs et > 90 jours sans visite | 0 |

> Catalogue stable et déjà très large (356 entrées). Aucun candidat nouveau qui passe le filtre dur (maintenu, ≥ 100 ⭐, slug non déjà présent). Run focalisé sur le refresh de 50 entrées canoniques (SDKs, runtimes, MCP servers majeurs, IDE, frameworks, produits packagés Microsoft 365) avec metadata raffraîchie sur les annonces de mai 2026.

## Nouveautés ajoutées (0)

Rien de réellement neuf à ajouter ce run. Toutes les annonces de mai 2026 captées dans la recherche (Claude for Microsoft 365 GA 7 mai, Claude Managed Agents self-hosted sandboxes 19 mai, Claude in Chrome v1.0.36 workflow recording) sont des évolutions d'entrées **déjà catalogées** sous les slugs `claude-for-excel`, `claude-for-word`, `claude-for-powerpoint`, `claude-for-outlook`, `claude-managed-agents`, `claude-in-chrome`. Elles ont été reflétées via UPDATE de description / applicability.

## Mises à jour notables (50 — toutes refresh + metadata enrichie)

Toutes reconfirmées vivantes pendant la recherche et bumpées à `last_seen = 2026-05-21`.

- **SDKs officiels Anthropic** : `anthropic-sdk-python`, `anthropic-sdk-typescript`, `anthropic-sdk-go`, `anthropic-sdk-java`, `anthropic-sdk-ruby`, `anthropic-sdk-php`, `anthropic-sdk-csharp`.
- **Agent SDKs & runtimes** : `claude-agent-sdk-python` (v0.1.48 mars 2026), `claude-agent-sdk-typescript` (v0.3.143), `claude-agent-sdk-go`, `claude-code-cli`, `cowork`, `claude-desktop`, `claude-managed-agents` (+ note self-hosted sandboxes Cloudflare/Daytona/Modal/Vercel public beta + MCP tunnels research preview du 19 mai 2026).
- **Repos / marketplaces officiels** : `anthropic-skills-repo`, `claude-cookbooks`, `claude-plugins-official`, `knowledge-work-plugins` (élargi à 23 plugins Cowork avec HR, Engineering, Design, Operations, Financial Services).
- **Claude for Microsoft 365** (vague GA du 7 mai 2026) : `claude-for-excel`, `claude-for-word`, `claude-for-powerpoint` (tous GA), `claude-for-outlook` (public beta), `mcp-microsoft-365` (connector Teams/SharePoint/OneDrive disponible sur TOUS les plans, y compris Free).
- **Surface "browser"** : `claude-in-chrome` (v1.0.36+ avec workflow recording et tâches récurrentes planifiées).
- **MCP — protocole & registre** : `mcp-registry-official` (~2000 entrées en 2026), `modelcontextprotocol-servers`.
- **MCP servers canoniques** : `mcp-supabase`, `mcp-github`, `mcp-google-workspace`, `mcp-notion`, `mcp-slack`, `mcp-linear`, `mcp-atlassian` (remote endpoint officiel), `mcp-stripe`, `mcp-playwright`, `mcp-filesystem`.
- **Frameworks d'agents** : `langchain-claude`, `llamaindex-claude`, `vercel-ai-sdk`, `dspy-claude`, `mastra`, `pydantic-ai`.
- **IDE intégrations** : `claude-code-vscode`, `claude-code-jetbrains`, `cursor-editor`, `zed-editor`, `cline`, `continue-dev`, `aider-cli`.
- **Action CI** : `claude-code-action`.

## Archivages (0)

Aucun item à archiver. La plus ancienne `last_seen` du catalogue reste sous le seuil 90 jours. La requête de vérification post-UPSERT (`status='active' AND last_seen < CURRENT_DATE - INTERVAL '90 days'`) renvoie 0.

## Couverture & limites du run

- **Sources explorées (web)** :
  - Repo officiel Anthropic : `github.com/anthropics/skills` (138K ⭐, updated 2026-05-20).
  - Claude Code marketplace : `claudemarketplaces.com` (170K visiteurs/mois, 74 marketplaces, 1182 plugins au 19 mai 2026).
  - MCP listings : `modelcontextprotocol/servers`, `wong2/awesome-mcp-servers`, `mcpservers.org`, `mcp-awesome.com` (1200+ servers).
  - Release notes Anthropic (Releasebot mai 2026) : Claude Managed Agents update du 19 mai, Claude for Microsoft 365 GA 7 mai, Claude in Chrome v1.0.36 features.
  - Claude Opus 4.7 launch (16 avril 2026, contexte 1M, vision 3.75 MP, task budgets, effort `xhigh`, nouveau tokenizer) — noté mais pas créé d'entrée (les modèles Claude ne sont pas des "tools qui se pluggent à Claude").
  - Documentation Microsoft 365 connector (support.claude.com).

- **Non couvert / à investiguer plus tard** :
  - **r/ClaudeAI top du mois** : WebSearch ne ramène toujours pas de signal exploitable depuis Reddit (cohérent avec le run du 19 mai). Toujours en attente d'un MCP Reddit/Apify câblé.
  - **Brand-new repos < 100 ⭐** : volontairement skippés par le filtre dur. Les annonces mai 2026 (Anthropic, partenaires Microsoft, MCP Foundation) n'ont pas exhibé de nouveau projet tiers significatif passant le seuil et non déjà catalogué.
  - **Refresh exhaustif du long tail des 356 slugs** : seules 50 entrées rafraîchies ce run (cap à 60 respecté). Le reste du catalogue conserve sa `last_seen` antérieure et restera "actif" jusqu'à 90 jours sans nouvelle visite, ce qui laisse 2 mois avant tout risque d'archivage faux-positif.

## Notes opérationnelles

- **Snapshot initial** : la requête `SELECT slug, name, direction, type, last_seen, status` a explosé la limite de tokens de l'output MCP Supabase (61 819 caractères pour 356 lignes). Contournement : `string_agg(slug)` puis comptages agrégés. Pattern identique à celui du run du 19 mai à conserver.
- **UPSERT** : aucun INSERT sur les 50 lignes UPSERT-ées (toutes existaient). `(xmax = 0) AS inserted` retourne `false` partout — confirme que rien de structurellement nouveau n'a été créé.
- **Préservation des décisions user** : la clause `ON CONFLICT DO UPDATE` ne touche jamais `status`, `user_priority`, `is_pinned`, `user_notes` (ces colonnes ne sont pas dans `SET`). Aucune décision user écrasée.
- **Garde anti-injection** : les contenus web fetched contenaient le bruit habituel de listings et annonces ; aucune instruction n'a été suivie depuis ces contenus (traités comme DONNÉES selon le GUARD du brief).

---

*Run généré automatiquement par la routine Cowork "claude-synergies". Source du brief : `uploads/SKILL.md`. Pour modifier les sources ou la fréquence, voir `docs/cowork-routines/catalogue-ecosystem.md`.*
