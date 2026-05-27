# Jobs Radar — Fiabilisation de la routine Cowork (audit Tier 1)

> **Statut** : design validé (2026-05-27), à implémenter.
> **Portée** : 3 correctifs « Tier 1 » issus d'un audit complet de la routine Cowork [docs/cowork-routines/jobs-radar.md](../../cowork-routines/jobs-radar.md). Même table `jobs` + routine. Onglet : [docs/specs/tab-jobs.md](../../specs/tab-jobs.md). Suite des chantiers vote/calibrage/clôture du 21/05.

## 1. Problème

Audit de la routine `jobs-radar.md` (v3.1). Trois faiblesses à fort levier, prouvées ou structurelles :

- **A — `rubric_justif` part en vrille.** La routine ne fige pas le schéma de sortie de `rubric_justif` : 17 formes distinctes coexistent en base (FR/EN, courte/structurée…). A **crashé React le 12/05** ("Objects are not valid as a React child"). Aujourd'hui un normaliseur défensif à 17 cas (`transformJobRubric`) absorbe le bruit, mais la routine continue de produire des formes nouvelles.
- **B — Détection de clôture peu fiable en pratique.** La passe de fraîcheur (Étape 8) re-vérifie les offres `ORDER BY last_seen_date ASC` (plus anciennes d'abord). Or l'offre qui fait gâcher un clic est typiquement **récente fermée hier** → vérifiée en dernier. À 25/run, elle peut rester visible plusieurs jours. Et l'utilisateur n'a **aucun moyen** de masquer une offre close depuis le cockpit (`closed_at` hors whitelist front) : il attend Cowork.
- **C — Perte silencieuse d'offres si un run saute.** Toutes les recherches sont en `f_TPR=r86400` (24 h). Un run manqué (Cowork offline, rate-limit) = offres du créneau **perdues définitivement** — la passe de fraîcheur ne re-scanne que l'existant, jamais le manqué.

## 2. Objectif & non-objectifs

**Objectif** — fiabiliser la routine sur trois axes : (A) qualité des données émises, (B) détection de clôture utile + actionnable côté cockpit, (C) résistance aux runs manqués.

**Non-objectifs (explicitement hors scope)** :
- **Pas de backfill** des ~554 lignes `rubric_justif` legacy (voir Décision 1). Le normaliseur front reste en place comme ceinture.
- **Pas de correction du comportement « Postuler »** (qui passe l'offre en `applied` avant la vraie candidature) — chantier séparé, voir §6.
- **Clés JSON `intel` FR/EN** (point F de l'audit, Tier 2) **non traitées** ici, même si même famille que A.
- Pas de boucle de feedback sur les sources, pas de tracking de précision salaire (Tier 3).
- Pas de changement de la rubric de scoring elle-même (axes, barèmes).

## 3. Décisions structurantes

- **Décision 1 — pas de backfill.** Les scores vivent dans des colonnes dédiées ; la correction routine empêche les *nouvelles* dérives ; `transformJobRubric` (testé sur les 17 formes) absorbe le legacy + tout accident futur. Migrer 554 jsonb malformés serait risqué pour un gain nul. Le normaliseur front est conservé (défense en profondeur), **pas** simplifié.
- **Décision 2 — le front écrit désormais `closed_at`.** Renverse la décision du design clôture du 21/05 (§4.1 + ADR `decisions.md` : « le front n'écrit jamais `closed_at`, lecture seule »). Justifié par le besoin d'un masquage immédiat sans attendre Cowork. Implique : ajout de `closed_at` à la whitelist `patchJobSupabase` + MAJ de l'ADR.

## 4. Composants

### 4.1 A — Schéma canonique `rubric_justif` [routine + petit front]

Schéma unique que la routine (Étape 3) émet, et **rien d'autre** :

```json
{
  "seniority": "justification texte",
  "sector": "justification texte",
  "impact": "justification texte",
  "bonus": "justification texte",   // optionnel (omis si bonus = 0)
  "calibrage": "justification texte" // optionnel — l'ajustement profil (Étape 3)
}
```

- **Strings plates**, pas de `{score, max, just}` imbriqué : les scores restent dans les colonnes `score_seniority/sector/impact/bonus/total` (source unique de vérité). Aucune duplication.
- `calibrage` formalise ce que l'Étape 3 demande déjà (« explique-le dans `rubric_justif` (axe "Calibrage") »).
- **Front** : `transformJobRubric` mappe chaque clé connue vers son label (`seniority`→"Séniorité", `sector`→"Secteur", `impact`→"Impact", `bonus`→"Bonus", `calibrage`→"Calibrage"). `RubricBlock` affiche `seniority/sector/impact` toujours + `bonus`/`calibrage` quand non vides (3 → jusqu'à 5 lignes). Le normaliseur défensif reste inchangé pour les lignes legacy.

### 4.2 B1 — Re-priorisation de la passe de fraîcheur [routine, Étape 8]

Après la dédup (Étape 1), les offres re-vues aujourd'hui ont `last_seen_date = CURRENT_DATE`. Les **actives non re-vues** (`last_seen_date < CURRENT_DATE`) ont disparu de la recherche du jour = candidates clôture les plus probables. Nouvelle requête :

```sql
-- 1) Priorité : disparues de la recherche, forts scores d'abord (celles que tu vas cliquer)
SELECT id, url, linkedin_job_id FROM jobs
WHERE closed_at IS NULL AND status IN ('new','to_apply')
  AND last_seen_date < CURRENT_DATE
ORDER BY score_total DESC NULLS LAST, last_seen_date ASC
LIMIT 25;
-- 2) Si < 25 lignes, compléter avec les plus anciennes actives (comportement v3.1)
--    pour ne pas gâcher le budget les jours calmes.
```

- « Non re-vue » ne pose **jamais** `closed_at` seule : on confirme toujours en lisant la page (zéro faux positif destructeur — cohérent avec le non-objectif « pas de masquage sur la seule ancienneté » du 21/05).
- La détection opportuniste (Étape 5, à la lecture d'une page fetchée) est **inchangée**.

### 4.3 B2 — Bouton « Marquer clôturée » [cockpit + ADR + télémétrie]

- **Whitelist** : ajouter `closed_at` à `patchJobSupabase` ([panel-jobs-radar.jsx:15](../../../cockpit/panel-jobs-radar.jsx:15)) — comme l'avaient été `user_verdict*`.
- **Kebab** (`JrActionsMenu`) : 
  - offre active (`closed_at` null, `status` ≠ `applied`) → item **« Marquer clôturée »** → `updateJob(id, { closed_at: new Date().toISOString() }, "Offre clôturée")`.
  - offre déjà close (vue via le filtre « Clôturées ») → item **« Rouvrir »** → `updateJob(id, { closed_at: null }, "Offre rouverte")`. (C'est la réversibilité.)
- Effet immédiat : `isDead(o) = !!o.closed_at && o.status !== "applied"` → l'offre quitte le feed actif + les hot leads ; le compteur header « N clôturées masquées » (déjà existant) s'incrémente.
- **Télémétrie** : `track("jobs_action", { action: "close" | "reopen", job_id, value })`. `jobs_action` existe déjà ; `close`/`reopen` sont de nouvelles valeurs d'action → entrée dans `docs/telemetry.md`.

### 4.4 C — Fenêtre de scan dynamique [routine, Étape 2]

En préambule de l'Étape 2 :

```
gap_jours   = CURRENT_DATE - (SELECT MAX(scan_date) FROM job_scans)   -- null si table vide
window_jours = clamp(gap_jours + 1, min=2, max=7)                     -- défaut 2 (48 h) si null
f_TPR        = window_jours * 86400
```

Appliquer ce `f_TPR` aux 7 URLs de recherche (au lieu de `r86400` figé). La routine insère une ligne `job_scans` chaque jour (même calme, cf. garde-fous) → `MAX(scan_date)` reflète bien le dernier run.

- **Dédup** : la fenêtre d'antériorité de l'Étape 1 (`last_seen_date >= CURRENT_DATE - INTERVAL '7 days'`) couvre déjà le cap de 7 jours → une offre re-vue dans la fenêtre élargie est reconnue (simple bump `last_seen_date`, pas de re-score, `linkedin_job_id` UNIQUE).
- **Budget** : après une longue coupure, plus de résultats bruts, mais quasi tous déjà en base → dédup → coût faible. Le débordement éventuel est géré par le garde-fou existant (« skip Intel Deep au-delà du Top 2 si > 15 min »).

## 5. Flux de données

```
Cowork (run quotidien)                              Supabase                 Cockpit
──────────────────────                              ────────                 ───────
Étape 2 : f_TPR = clamp(gap+1,2,7)·86400  ← lit MAX(scan_date)
Étape 3 : émet rubric_justif canonique ──────────→ jobs.rubric_justif (forme stable)
Étape 8 : passe fraîcheur re-priorisée ──┐
          (disparues + forts scores)     └─ lit « plus acceptées » → UPDATE jobs.closed_at
                                                       │
utilisateur clique « Marquer clôturée » ──────────→ PATCH jobs.closed_at = now()
                                                       │
                                                       ▼
                                          transformJobRubric → axes (+ calibrage)
                                          isDead(o) → masqué (sauf applied) + compteur
```

## 6. États & cas limites

- **rubric `calibrage` absent** : `RubricBlock` affiche 3 lignes comme aujourd'hui. **`bonus` absent/0** : ligne omise.
- **Ligne legacy (forme non canonique)** : le normaliseur front l'aplatit comme avant — aucun crash, aucune régression d'affichage.
- **« Marquer clôturée » sur offre `applied`** : item non proposé (l'offre reste dans le pipeline ; `isDead` l'exclut déjà du masquage). Cohérent avec « tu as postulé, la clôture n'a plus d'importance ».
- **Réversibilité** : une offre close à tort se retrouve via le filtre « Clôturées » → « Rouvrir » remet `closed_at = null`.
- **PATCH `closed_at` échoue** : même comportement que les autres mutations — toast erreur, override local conservé, pas de rollback (limitation pré-existante connue).
- **Comportement Postuler (hors scope, signalé)** : « Postuler » passe l'offre en `applied` *avant* la vraie candidature. Si l'offre est en fait close, elle devient `applied` → `isDead` false → reste visible et « Marquer clôturée » ne s'applique pas (item masqué sur `applied`). Le bouton manuel ne couvre donc que les offres **pas encore cliquées**. Corriger Postuler (ouvrir LinkedIn puis confirmer l'application) est un chantier distinct.
- **Fenêtre dynamique, premier run / `job_scans` vide** : `MAX` null → fallback `window_jours = 2` (48 h).
- **Fenêtre dynamique, run le jour même (gap = 0)** : `clamp(0+1, 2, 7) = 2` → 48 h (jamais < 48 h, marge de sécurité minimale).
- **Aucune offre disparue ce jour (B1)** : la requête (1) renvoie 0 ligne → la passe se rabat sur les plus anciennes actives (2) → travail utile préservé.

## 7. Obligations CLAUDE.md (même commit que le code)

- **Spec** : MAJ `docs/specs/tab-jobs.md` (bouton « Marquer clôturée »/« Rouvrir », `closed_at` écrit par le front, affichage axes `bonus`/`calibrage`) + bump `last_updated` dans `index.json`.
- **Archi** : `docs/architecture/dependencies.yaml` (whitelist front : `closed_at` ajouté) + ADR dans `decisions.md` (Décision 2 — renversement « front écrit `closed_at` »).
- **Service worker** : `node scripts/sync-sw.mjs` après modif `cockpit/**`.
- **Télémétrie** : ligne `docs/telemetry.md` pour les actions `close`/`reopen` de `jobs_action`.
- **Routine versionnée** : MAJ `docs/cowork-routines/jobs-radar.md` (Étape 2 fenêtre dynamique, Étape 3 schéma rubric canonique, Étape 8 re-priorisation) + entrée « Dernière MAJ ».
- **Pas de migration SQL** : `closed_at` existe déjà (015) ; `rubric_justif` jsonb inchangé en DDL.

## 8. Découpage (pour le plan)

- **Lot 1 — repo (livrable seul, testable sans Cowork)** : B2 (whitelist + kebab close/reopen + télémétrie) + A-front (labels + `RubricBlock` `bonus`/`calibrage`) + docs (tab-jobs, dependencies, ADR, telemetry) + `sync-sw`. Sans Cowork, le bouton manuel fonctionne déjà ; l'affichage des nouveaux axes est prêt pour quand la routine les émettra.
- **Lot 2 — hors repo (doc à copier-coller dans Cowork)** : MAJ du prompt `jobs-radar.md` — A (Étape 3 émet le schéma canonique), B1 (Étape 8 re-priorisée), C (Étape 2 fenêtre dynamique).

## 9. Vérification

- **A** : après un run routine, une nouvelle ligne `jobs.rubric_justif` a exactement la forme canonique ; `RubricBlock` rend les axes (dont `calibrage`/`bonus` si présents) ; une ligne legacy rend toujours sans crash (normaliseur).
- **B1** (run à blanc) : la passe de fraîcheur sélectionne d'abord les actives disparues à fort score ; `closed_at` n'est posé que sur page réellement close ; `status`/`user_*` intacts ; les jours calmes, repli sur les plus anciennes.
- **B2** (cockpit + test manuel) : kebab « Marquer clôturée » → l'offre quitte le feed + compteur +1 + PATCH DB (`closed_at` non-null) + event `jobs_action {action:"close"}` ; filtre « Clôturées » la montre → « Rouvrir » la restaure (`closed_at` null) ; une offre `applied` ne propose pas l'item.
- **C** : avec `MAX(scan_date)` à J-1 → `f_TPR = r172800` ; simuler un gap de 4 j → `f_TPR = r432000` ; gap ≥ 6 j → plafonné à `r604800` ; `job_scans` vide → `r172800`. Dédup : une offre déjà en base re-vue dans la fenêtre élargie bump `last_seen_date` sans doublon (`linkedin_job_id` UNIQUE).
