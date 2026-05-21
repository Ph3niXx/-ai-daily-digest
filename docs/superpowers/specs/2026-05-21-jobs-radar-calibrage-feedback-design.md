# Jobs Radar — Calibrage par feedback utilisateur

> **Statut** : design validé (2026-05-21), à implémenter.
> **Auteur** : Jean + Claude (brainstorming).
> **Onglet concerné** : Jobs Radar (groupe Business) — spec fonctionnelle : [docs/specs/tab-jobs.md](../../specs/tab-jobs.md).

## 1. Problème

Le scoring des offres (0-10) est jugé mal calibré sur **le classement**, pas sur le ciblage :

- des offres sans intérêt remontent en hot leads (faux positifs ≥ 7) ;
- des offres intéressantes sont sous-notées et enterrées dans la liste dense (faux négatifs) ;
- le score « ne colle pas au ressenti », sans que l'utilisateur puisse pointer l'axe fautif.

Le **ciblage** (rôles cibles, secteurs chauds/tièdes/froids) est jugé correct — il n'est donc **pas** dans le périmètre. Le problème est une **préférence tacite** : un « je le sens / je le sens pas » qu'on ne peut pas écrire en règle a priori, mais qu'on peut apprendre des réactions sur des offres concrètes.

Contrainte structurante : le scoring est produit par une **routine Cowork externe** (un prompt, hors repo, qui tourne chaque jour à 8h et écrit dans `jobs` / `job_scans` en service_role). Le cockpit n'est qu'un **lecteur** qui n'écrit que `status` et `user_notes`. Toute amélioration du calibrage doit donc **redescendre jusqu'au scan du lendemain** via le seul canal disponible : la base Supabase.

## 2. Objectif & non-objectifs

**Objectif** — capter un signal de préférence par offre, le synthétiser en un **profil de préférences lisible et éditable**, et le réinjecter dans le scoring Cowork pour que le classement converge vers le ressenti de l'utilisateur au fil de ses retours.

**Non-objectifs** (explicitement écartés) :

- Pas de re-ranking temps réel côté client (option « double score / re-ranker », écartée pour sa complexité). Le calibrage agit sur le scan **du lendemain**, pas instantanément. C'est un compromis assumé.
- Pas de second score « pour toi » : le profil ajuste le `score_total` **existant** (le score Cowork a toujours été « le fit de Jean », pas un score marché neutre).
- Pas de ML : l'apprentissage est de l'inférence few-shot par le LLM de la routine, pas un modèle entraîné.
- Pas de modification du ciblage rôles/secteurs de la routine.

## 3. Approche retenue — « Profil de préférences »

Boucle en trois temps :

1. **Capter** — l'utilisateur vote 👍/👎 (+ raison optionnelle) sur chaque offre, dans le cockpit. Persisté sur la ligne `jobs`.
2. **Synthétiser** — au démarrage du run Cowork quotidien, une étape lit les votes récents (+ signaux implicites) et met à jour un **profil de préférences** stocké dans `user_profile`, lisible et éditable dans le cockpit.
3. **Scorer** — la routine injecte ce profil dans son prompt de scoring ; le `score_total` des nouvelles offres (et, une fois par semaine, du stock actif) reflète le calibrage.

La synthèse vit **dans le run Cowork** (il tourne déjà chaque jour, dispose déjà du LLM et de l'accès Supabase via MCP) — pas de nouvelle pipeline GitHub Actions. La logique de synthèse est versionnée dans le prompt de [docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md).

## 4. Composants

### 4.1 Signal de feedback (front + DB)

**UI** — sur `HotLeadCard` et `OfferRow`, deux boutons 👍/👎. Au clic sur un pouce :

- une rangée de **puces-raison** (un clic, pré-remplissent le champ raison) apparaît ;
- un lien **« préciser… »** déplie une ligne de texte libre optionnelle (longue traîne) qui s'ajoute à la raison.

Puces proposées (modifiables) :

- **👎** : `trop junior` · `run/BAU — pas de build` · `secteur` · `boîte (stade/taille)` · `lieu/remote` · `bof, sans plus`
- **👍** : `scope/mission pile bon` · `secteur` · `la boîte` · `coup de cœur`

Le pouce seul suffit (friction minimale) ; la puce accélère l'apprentissage et reste **comptable** (« run/BAU = 7 de tes 12 rejets ») ; le texte libre gère la nuance. Re-cliquer le pouce actif **annule** le vote (verdict → null).

**Stockage** — 3 colonnes ajoutées à `jobs` :

| Colonne | Type | Sémantique |
|---|---|---|
| `user_verdict` | `text check in ('up','down')`, nullable | le pouce |
| `user_verdict_reason` | `text`, nullable | libellé de la puce, éventuellement suivi du texte libre « préciser » |
| `user_verdict_at` | `timestamptz`, nullable | horodatage du vote (posé côté client) |

Stocker sur la ligne `jobs` (et pas dans une table dédiée) évite une jointure : la synthèse lit `jobs WHERE user_verdict IS NOT NULL` et a sous la main les attributs de l'offre (titre, boîte, role_category, company_stage, secteur, score) **et** le verdict. `user_notes` reste séparé (notes de workflow) et continue d'être lu par la synthèse comme signal secondaire.

**Whitelist front** — `patchJobSupabase` élargit sa whitelist de `{status, user_notes}` à `{status, user_notes, user_verdict, user_verdict_reason, user_verdict_at}`. Mêmes garde-fous (optimistic update via `updateJob`, toast, mirror dans `window.JOBS_DATA.offers`).

**Trigger republication** — `jobs_inherit_user_status` (migration 013) est étendu : en plus d'hériter `status`/`user_notes` d'une offre archivée/snoozée récente, il hérite **aussi** `user_verdict` / `user_verdict_reason` / `user_verdict_at` de la ligne précédente la plus récente de même `(lower(trim(title)), lower(trim(company)))` qui porte un verdict non-null — **indépendamment du status** (un 👎 reste valide même si l'offre n'avait pas été archivée), dans une **fenêtre glissante de 180 jours mesurée sur `user_verdict_at`** (l'âge du vote lui-même, pas `updated_at` qui bougerait à chaque édition de notes ou refresh `last_seen_date`). Sinon un 👎 serait perdu à chaque republication LinkedIn (nouveau `linkedin_job_id`).

### 4.2 Profil de préférences (synthèse + storage + UI éditable)

Le profil est scindé en **deux clés** `user_profile`, à propriété distincte — c'est ce qui empêche Cowork d'écraser les corrections manuelles :

| Clé `user_profile` | Écrite par | Contenu |
|---|---|---|
| `job_pref_rules` | **front uniquement** | règles écrites par l'utilisateur, **verrouillées** — Cowork ne les modifie jamais, seulement les lit |
| `job_pref_observed` | **Cowork uniquement** | synthèse inférée des votes — maintenue à chaque run |

Les deux sont des valeurs texte (prose courte, plafonnée ~1500 caractères pour rester lisibles et bon marché en contexte de prompt). Les deux sont **déjà chargées en Tier 1** dans `window.PROFILE_DATA._values` (via `loadUserProfile` → `transformProfile`), donc l'encart les lit sans fetch supplémentaire.

**UI** — encart repliable en **haut du Jobs Radar** (juste sous le header / au niveau du scan banner) : *« Calibrage · ce que le radar a compris de tes goûts »*.

- Section **« Tes règles »** (`job_pref_rules`) — éditable inline (textarea). Sauvegarde via le pattern existant `panel-profile.jsx:84` (`POST /rest/v1/user_profile?on_conflict=key` + append `user_profile_history`), avec mute optimiste de `window.PROFILE_DATA._values.job_pref_rules`.
- Section **« Observé par le radar »** (`job_pref_observed`) — **lecture seule**, badge « maintenu automatiquement ».
- Démarrage à froid : tant que `job_pref_observed` est vide (< ~5 votes), l'utilisateur peut **amorcer** le calibrage en écrivant directement ses règles.

### 4.3 Scoring calibré (routine Cowork)

Mise à jour du prompt versionné, rédigée intégralement dans [docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md) (l'utilisateur n'a qu'à copier-coller dans Cowork) :

- **Nouvelle Étape 0 — synthèse du profil**, avant le scoring. Lit : votes récents (`jobs WHERE user_verdict IS NOT NULL`, ~90j), `user_notes`, signaux implicites (`status='archived'` sans passage par `applied` = négatif faible ; `status='applied'` = positif faible), `job_pref_rules` (verrouillé) et `job_pref_observed` (état précédent). Produit un `job_pref_observed` mis à jour (merge conservateur, ne contredit jamais `job_pref_rules`) et l'écrit en service_role.
- **Injection au scoring** (Étapes 3) : `job_pref_rules` + `job_pref_observed` ajoutés au contexte. Le `score_total` est ajusté **en place** (pas de second score).
- **Passe de recalibrage hebdo** (ex. dimanche) : re-score le **stock actif** uniquement (`status in ('new','to_apply')`) avec le profil courant — borné en volume, donc compatible avec le budget temps (15 min) et coût (~0,40 €/run). Les nouvelles offres sont, elles, calibrées chaque jour (gratuit, Cowork les score déjà).

## 5. Flux de données

```
Cockpit (Jobs Radar)                          Supabase                      Cowork (run quotidien 8h)
────────────────────                          ────────                      ─────────────────────────
vote 👍/👎 (+ raison) ──PATCH jobs──►  jobs.user_verdict / _reason / _at
édite « Tes règles » ──upsert──────►  user_profile[job_pref_rules]
                                                  │
                                                  │  (lendemain)
                                                  ▼
                                          Étape 0 : lit votes + notes + signaux
                                          implicites + job_pref_rules + observed
                                                  │
                                  user_profile[job_pref_observed] ◄──write (service_role)
                                                  │
                                          Étapes 3 : scoring calibré (rules+observed)
                                                  ▼
                                          jobs.score_total ajusté ──► Realtime ──► cockpit recharge
encart lit job_pref_rules + observed ◄── Tier 1 (PROFILE_DATA._values)
```

## 6. Modèle de données — migration `sql/014_jobs_feedback.sql`

- `ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS user_verdict text CHECK (user_verdict IN ('up','down'))`, `user_verdict_reason text`, `user_verdict_at timestamptz`.
- `CREATE OR REPLACE FUNCTION public.jobs_inherit_user_status()` — ajoute le bloc d'héritage du verdict (lookup séparé, indépendant du status, fenêtre glissante 180 j mesurée sur `user_verdict_at`). Idempotent.
- Aucune nouvelle table. Les clés `job_pref_rules` / `job_pref_observed` sont de simples lignes `user_profile` (pas de DDL).
- RLS : `jobs` est déjà permissif (`jobs_user_update using(true)`) — les nouvelles colonnes sont couvertes. `user_profile` a déjà un chemin d'écriture front (panel Profil), donc la RLS autorise déjà l'upsert.

## 7. Télémétrie

Nouvel `event_type` `jobs_feedback` `{verdict, reason, job_id, score_at_vote}` — `score_at_vote` permet de mesurer dans le temps **à quel point l'utilisateur est en désaccord avec le score** (l'indicateur de réussite du calibrage : le désaccord doit baisser). Documenté dans [docs/telemetry.md](../../telemetry.md) **avant** le commit. `jobs_action` (status/notes) reste inchangé.

## 8. États & cas limites

- **Démarrage à froid** (< ~5 votes) : `job_pref_observed` vide → scoring = comportement actuel. L'utilisateur peut amorcer via `job_pref_rules`.
- **Vote puis annulation** : re-clic sur le pouce actif → verdict, reason, at remis à null (PATCH).
- **PATCH échoué** : comme aujourd'hui — optimistic local conservé, toast erreur, pas de rollback. Limitation existante non aggravée.
- **Écrasement des règles user par Cowork** : empêché par la séparation deux clés (Cowork n'écrit que `job_pref_observed`).
- **Republication LinkedIn** : verdict hérité par le trigger étendu.
- **Profil trop long** : la synthèse est instruite de plafonner (~1500 car.).
- **Realtime sans debounce** : un PATCH de vote déclenche un event `jobs` → reload (limitation existante, non aggravée ; à surveiller si le volume de votes la rend visible).

## 9. Obligations CLAUDE.md (toutes dans le même commit que le code)

- **Spec onglet** : MAJ [docs/specs/tab-jobs.md](../../specs/tab-jobs.md) + bump `last_updated` dans `docs/specs/index.json`.
- **Télémétrie** : entrée `jobs_feedback` dans [docs/telemetry.md](../../telemetry.md) avant le commit.
- **Archi** : MAJ `docs/architecture/dependencies.yaml` (3 colonnes `jobs` + 2 clés `user_profile`) + ADR dans `docs/architecture/decisions.md` (décision boucle de feedback / synthèse dans Cowork / 2 clés).
- **Service worker** : `node scripts/sync-sw.mjs` après modif `cockpit/**`.
- **Routine versionnée** : MAJ [docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md) (Étape 0 + injection scoring + recalibrage hebdo).

## 10. Découpage proposé (pour le plan d'implémentation)

Séquencé pour que **le feedback commence à s'accumuler tout de suite**, avant même que Cowork sache le lire — ainsi l'historique existe le jour où la synthèse démarre.

- **Lot 1 — capture (repo, livrable seul)** : migration 014 + UI vote 👍/👎 + puces + « préciser » dans `panel-jobs-radar.jsx` + élargissement whitelist + event télémétrie + extension trigger + `styles-jobs-radar.css`. Dès ce lot, les votes se persistent.
- **Lot 2 — encart calibrage (repo)** : lecture + édition `job_pref_rules` / lecture `job_pref_observed`, en haut du Jobs Radar, via le pattern d'upsert `user_profile` existant.
- **Lot 3 — boucle Cowork (hors repo, doc)** : MAJ du prompt versionné (Étape 0 synthèse + injection scoring + recalibrage hebdo), prêt à copier-coller.

## 11. Vérification

Pas de build (React `file://` + Babel standalone) ni de pipeline CI sur la routine externe → vérification surtout manuelle + contrôles SQL :

- **Migration** : s'applique de façon idempotente ; un INSERT simulant une republication (même titre/boîte qu'une ligne portant un verdict) hérite bien du verdict.
- **Front vote** : 👍/👎 persiste (PATCH visible en base), re-clic annule, les puces pré-remplissent la raison, « préciser » ajoute du texte libre, optimistic + toast OK.
- **Encart** : lit les deux clés ; éditer « Tes règles » upsert `user_profile` + append `user_profile_history` ; « Observé » non éditable.
- **Cowork** : un run à blanc produit un `job_pref_observed` plausible ; un scoring avec profil non vide déplace les scores dans le sens attendu (offre 👎-tag-run/BAU redescend, offre 👍 enterrée remonte) ; la passe hebdo reste dans le budget temps.
- **Indicateur de réussite** : `score_at_vote` vs verdict — la fréquence des 👎 sur score ≥ 7 et des 👍 sur score < 5 doit décroître au fil des semaines.
