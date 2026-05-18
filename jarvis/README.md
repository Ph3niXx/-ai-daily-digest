# Jarvis — Assistant IA local

Assistant personnel local tournant sur LLM via LM Studio, avec RAG sur Supabase et apprentissage continu.

## Vision

1. **Connaît la base de connaissances** via RAG sur Supabase pgvector (articles, wiki, opportunités, idées, RTE, profil)
2. **Apprend de lui-même** : extraction nocturne des faits, entités et préférences depuis les conversations
3. **Observe l'activité** : capteur de fenêtre active (Windows) + brief quotidien automatique à 18h. Prochaines étapes : Teams, emails, fichiers
4. **Route intelligemment** entre LLM local (90% des tâches) et API cloud Claude/Gemini (tâches complexes) pour rester sous 3€/mois

## Stack technique

- **LM Studio** en serveur local sur `http://localhost:1234/v1` (compatible OpenAI API)
- **LLM unique (chat + extraction JSON)** : Qwen3.5 9B Q4_K_M (~5.5 Go VRAM, slug `qwen/qwen3.5-9b`) — instruct pur, **pas de thinking**. Utilisé par `/chat` (modes Rapide/Deep), `_compact_history`, `daily_brief_generator`, `status_generator`, et `nightly_learner` (extraction faits + entités). Un seul modèle chargé évite les conflits de slot LM Studio entre chat utilisateur et tâches de fond.
- **Embeddings** : Qwen3-Embedding-0.6B Q8_0 (~640 Mo, slug `qwen/qwen3-embedding-0.6b`) — vecteurs 1024-dim pour `memories_vectors` (RAG, indexation, recherche sémantique)
- **Vector store** : Supabase pgvector (1024-dim, table `memories_vectors`)
- **Hardware** : RTX 5070 Laptop **8 Go VRAM dédiée** (+ 15.9 Go Shared via PCIe), 32 Go RAM, Windows. 2 modèles chargés (LLM 9B + embedding 0.6B) pèsent ~6.1 Go — il reste ~1.9 Go pour le KV cache, OK tant que le contexte chat reste sous ~4k tokens. Throughput cible 30-40 tok/s sur le 9B. Si le throughput chute sous 10 tok/s c'est que la VRAM déborde en Shared (inférence 10-50× plus lente) — réduire le context ou décharger temporairement l'embedding model.
- **Note historique** : avant 2026-04-25, la stack utilisait Qwen3 4B Thinking 2507 + Qwen3 4B Instruct 2507 + embedding (3 modèles). La VRAM était saturée et les chats Deep dépassaient régulièrement le timeout cockpit 120s. Switch vers un seul modèle 9B instruct = plus d'overhead thinking, plus de slot contention nightly_learner ↔ chat. `/no_think` dans les system prompts est devenu un no-op inoffensif (le modèle ignore l'instruction).

## Structure du module

```
jarvis/
├── __init__.py
├── config.py              # Config centralisée
├── supabase_client.py     # Client REST Supabase (sb_get, sb_post, sb_rpc)
├── embeddings.py          # Génération de vecteurs via Qwen3-Embedding-0.6B
├── indexer.py             # CLI d'indexation des tables → memories_vectors
├── retriever.py           # Recherche sémantique (search, search_and_format)
├── server.py              # FastAPI server (localhost:8765) — gateway cockpit→LLM+RAG
├── check_index_freshness.py # Vérifie si l'indexation est nécessaire (compare COUNTs)
├── start_jarvis.bat       # Script de démarrage Windows (check LM Studio, index, serve)
├── test_jarvis.py         # Test du LLM local
├── test_rag.py            # Test end-to-end du RAG
├── migrations/
│   ├── 001_enable_pgvector.sql
│   ├── 002_jarvis_status_snapshot.sql
│   ├── 003_structured_memory.sql
│   └── 004_activity_briefs.sql
├── nightly_learner.py         # Extraction nocturne faits+entités (idempotent, scheduler asyncio)
├── observers/
│   ├── __init__.py
│   ├── window_observer.py     # Capteur fenêtre active (ctypes, 30s, JSONL local)
│   ├── outlook_observer.py    # Capteur Outlook COM (réunions, emails, 5min, JSON local)
│   └── daily_brief_generator.py # Génère brief d'activité via LLM → Supabase

jarvis_data/               # Données perso, non versionné (activity_*.jsonl, outlook_*.json, state files)
```

## Phasage

| Phase | Description | Statut |
|-------|-------------|--------|
| 1 | LM Studio + premier appel Python | Done |
| 2 | RAG Supabase (pgvector + indexation) | Done |
| 2.5 | Intégration cockpit web (server + onglet Jarvis) | Done |
| 3 | Mémoire structurée (profile_facts, entities) | Done |
| 4 | Orchestrateur (routeur LLM local/cloud) | Done |
| 5 | Boucle nocturne d'apprentissage | Done |
| 6 | Capteurs d'observation (window, Outlook, brief 18h) | Done |

## Conventions Jarvis

- Toujours désactiver thinking mode (`/no_think`) sauf pour raisonnement complexe explicite
- LLM local pour : tagging, classification, résumés, RAG, conversation
- Claude API / Gemini pour : analyses stratégiques complexes, tâches au-delà du local
- Logger les coûts API cloud dans la table `weekly_analysis` existante
- Données d'observation perso dans `jarvis_data/` (jamais commit)
- Port 8765 réservé pour le serveur Jarvis (FastAPI)
- Aucune clé Supabase dans `index.html` pour Jarvis — tout passe par `server.py` côté Python
- `start_jarvis.bat` est le point d'entrée unique (check LM Studio → check fraîcheur index → tunnel Cloudflare → lance serveur)
- Architecture cockpit : `index.html → POST /chat → server.py → routeur (local LM Studio OU Claude Haiku cloud) → réponse JSON`
- **3 modes chat** : Rapide (local, pas de RAG, 512 tokens), Deep (local + RAG, 2048 tokens), Cloud (Claude Haiku + RAG, 4096 tokens, ~0.01$/requête)
- Le mode Cloud nécessite `ANTHROPIC_API_KEY` en variable d'environnement. Sans la clé, fallback automatique sur le LLM local
- **Cloudflare Tunnel** : `cloudflared tunnel --url http://localhost:8765` expose le serveur sur internet (HTTPS)
- L'URL du tunnel est sauvegardée dans `user_profile.jarvis_tunnel_url` par `start_jarvis.bat`
- `index.html` découvre l'URL automatiquement : essaie localhost d'abord, puis lit le tunnel depuis Supabase
- Accessible depuis GitHub Pages et depuis mobile via le tunnel

## Tables Supabase Jarvis

**Créées (Phase 2) :**
- `memories_vectors` — RAG vectoriel unifié (source_table, source_id, chunk_text, embedding vector(1024), metadata JSONB)
  - Fonction RPC `match_memories(query_embedding, match_threshold, match_count, filter_source_table)` pour recherche sémantique
  - Index IVFFlat cosine, RLS authenticated (depuis migration 006)
  - Tables sources indexées : articles, wiki_concepts, weekly_opportunities, business_ideas, rte_usecases, user_profile, profile_facts, entities

**Créées (Phase 3) :**
- `jarvis_conversations` — messages bruts sauvegardés en temps réel (session_id, role, content, mode, tokens_used). Chaque échange user/assistant est écrit immédiatement via le endpoint /chat.
- `profile_facts` — faits structurés sur l'utilisateur (fact_type, fact_text, confidence, superseded_by). Extraits par `nightly_learner.py`, injectés dans le system prompt de chaque conversation.
- `entities` — personnes, projets, outils, entreprises mentionnés (entity_type, name, description, mentions_count). Extraits par `nightly_learner.py`.
- Migration : `jarvis/migrations/003_structured_memory.sql`
- **`jarvis/nightly_learner.py`** — Script d'extraction nocturne multi-source idempotent. Sources : conversations Jarvis, activité fenêtre (JSONL), Outlook (JSON). Extensible pour Strava, etc. Checkpoint par source dans `jarvis_data/nightly_learner_state.json`. Envoie chaque bloc à Qwen3.5 9B Instruct (slug `qwen/qwen3.5-9b`, modèle unique partagé avec le chat) pour extraction JSON (faits + entités), upsert dans les tables, reindex via indexer.py. Déclenché automatiquement à minuit par le scheduler asyncio dans server.py, au démarrage via start_jarvis.bat, ou manuellement via `POST /nightly-learner` ou `python jarvis/nightly_learner.py --days=N`.

**Créées (Phase 6) :**
- `activity_briefs` — briefs d'activité quotidiens (date unique, brief_html, stats JSONB). Seul le résumé y est stocké, pas les données brutes.
- Migration : `jarvis/migrations/004_activity_briefs.sql`
- **`jarvis/observers/window_observer.py`** — Capteur de fenêtre active via `ctypes.windll` (Windows). Capture toutes les 30s, déduplique par changement de titre, stocke en JSONL local (`jarvis_data/activity_YYYY-MM-DD.jsonl`). Catégorise automatiquement (dev/communication/browsing/documents/other). Démarré automatiquement avec le serveur.
- **`jarvis/observers/outlook_observer.py`** — Capteur Outlook via COM automation (`pywin32`). Connecté à l'instance Outlook desktop locale, pas besoin d'Azure AD. Poll toutes les 5 min. Collecte : réunions du jour (sujet, durée, Teams?, participants), emails (reçus/envoyés/non lus). Stocke un snapshot JSON local (`jarvis_data/outlook_YYYY-MM-DD.json`). Les sujets de réunions restent locaux. Nécessite `pywin32` et Outlook desktop ouvert.
- **`jarvis/observers/daily_brief_generator.py`** — Génère un brief HTML à partir de l'activité du jour (window + Outlook fusionnés) : stats par catégorie, réunions, emails, top apps, timeline, résumé narratif via LLM local. Upsert dans `activity_briefs`. Déclenché à 18h par scheduler asyncio ou manuellement via `POST /generate-activity-brief`.
- Les données brutes d'activité restent **locales** dans `jarvis_data/` (privacy-first). Seul le brief résumé va dans Supabase.

## Cockpit — Section Projet Jarvis

La section "Projet Jarvis" dans le cockpit affiche l'avancement du projet en temps quasi-réel :

- **`jarvis/project_status.yaml`** — Source de vérité déclarative des 6 phases. Éditée à la main quand une phase évolue (typiquement ~1x/semaine). Contient les bullets, statuts, critères de réussite et le `next_step`.
- **`jarvis/status_generator.py`** — Script qui charge le YAML, enrichit avec des données live (chunks Supabase, stats Git, coût API), génère un paragraphe en prose via Jarvis local (LM Studio), et upsert le snapshot dans Supabase. Lancé automatiquement par `start_jarvis.bat` en arrière-plan, ou manuellement via `python jarvis/status_generator.py`. Nécessite `SUPABASE_SERVICE_KEY` en env var.
- **`jarvis_status_snapshot`** — Table Supabase à une seule ligne (id=1, contrainte CHECK). Le frontend la lit en anon, le générateur l'écrit en service_role. Migration : `jarvis/migrations/002_jarvis_status_snapshot.sql`.
- **Sections 2 (Veille ciblée) et 3 (Miroir gênant)** — Stubs HTML en place (`display:none`), à implémenter plus tard.

---

# Setup et opérations

## Prérequis

1. **LM Studio** installé avec Developer Mode activé
2. **Modèles** chargés dans LM Studio :
   - Qwen3.5 9B (Q4_K_M) — LLM principal
   - Qwen3-Embedding-0.6B (Q8_0) — embeddings (1024-dim)
3. **Serveur LM Studio** démarré (port 1234 par défaut)
4. **Python 3.10+** avec dépendances : `pip install openai fastapi uvicorn`
5. **Migration SQL** exécutée dans Supabase (voir Phase 2)
6. **Variables d'environnement** : `SUPABASE_URL` et `SUPABASE_KEY` (ou utiliser `start_jarvis.bat` qui les set automatiquement)

## Démarrage rapide

Double-clic sur `jarvis/start_jarvis.bat` puis ouvrir le cockpit (index.html local ou GitHub Pages).

Le script fait tout automatiquement :
1. Vérifie que LM Studio tourne
2. Compare l'index avec les données source — indexe si nécessaire
3. Lance un tunnel Cloudflare (HTTPS, accessible depuis partout)
4. Sauvegarde l'URL du tunnel dans Supabase
5. Lance le serveur Jarvis sur http://localhost:8765

Le cockpit découvre l'URL automatiquement (localhost ou tunnel).

### Prérequis tunnel (optionnel, pour accès distant/mobile)

```bash
winget install cloudflare.cloudflared
```

Sans cloudflared, Jarvis fonctionne uniquement en local.

## Commandes opérationnelles

### Phase 1 — Test LLM local

```bash
python jarvis/test_jarvis.py
```

### Phase 2 — RAG Supabase

Setup (une seule fois) :

1. Exécuter la migration SQL dans Supabase Dashboard > SQL Editor :
   - Coller le contenu de `jarvis/migrations/001_enable_pgvector.sql`
   - Cliquer Run

2. Indexer les tables :
```bash
python jarvis/indexer.py              # indexation complète
python jarvis/indexer.py --table=articles  # une seule table
python jarvis/indexer.py --incremental    # nouvelles lignes uniquement
python jarvis/indexer.py --dry-run        # preview sans écriture
```

3. Tester le RAG :
```bash
python jarvis/test_rag.py
```

### Phase 2.5 — Architecture cockpit web

```
Navigateur (index.html)
  ↓ POST /chat (fetch)
jarvis/server.py (FastAPI sur localhost:8765)
  ↓ retriever.search() + appel LLM
LM Studio (localhost:1234) + Supabase
  ↓
Réponse JSON → affichée dans le chat
```

## Endpoints du serveur

**GET /health** — Statut du système
```bash
curl http://localhost:8765/health
# {"status":"ok","lm_studio":true,"supabase":true,"vectors_count":183}
```

**POST /chat** — Chat RAG avec Jarvis
```bash
curl -X POST http://localhost:8765/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Quels concepts IA connais-tu ?"}'
# {"answer":"...","sources":[...],"tokens_used":1234,"latency_ms":5400}
```

**POST /search** — Recherche sémantique brute (debug)
```bash
curl -X POST http://localhost:8765/search \
  -H "Content-Type: application/json" \
  -d '{"query": "RAG", "k": 3, "threshold": 0.3}'
```

## Vérifier l'état d'indexation

```bash
python jarvis/check_index_freshness.py
```

Compare le COUNT des lignes source vs les chunks indexés. Exit code 0 = indexation nécessaire, 1 = tout à jour, 2 = erreur.

## Forcer une réindexation

```bash
python jarvis/indexer.py --full
```

## Troubleshooting

| Problème | Solution |
|----------|----------|
| CORS error dans le navigateur | Vérifier que `server.py` tourne sur le port 8765 |
| Connection refused | `server.py` n'est pas lancé — relancer `start_jarvis.bat` |
| 503 Service Unavailable | LM Studio n'est pas lancé ou modèle pas chargé |
| Réponses lentes (5-15s) | Normal pour Qwen3.5 9B en local — le mode thinking peut encore s'activer malgré `/no_think` |
| Port 8765 occupé | Arrêter le processus existant ou changer le port dans `server.py` |
| Tunnel non détecté | Vérifier `jarvis_data/cloudflared.log` — cloudflared installé ? |
| Jarvis offline sur mobile | Relancer `start_jarvis.bat` (l'URL tunnel change à chaque restart) |
