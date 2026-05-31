# Jobs Radar

> Feed d'offres scorées par fit (0-10) via un scan automatisé 4×/semaine (routine Claude Code distante sur API jobs structurée), décomposées en "hot leads" (score ≥ 7) + liste dense filtrée/triable, avec statut (new/to_apply/applied/snoozed/archived) et notes perso persistés en DB, et rafraîchissement temps-réel via Supabase channels.

## Scope
pro

## Finalité fonctionnelle
Panel de **tri d'offres d'emploi** — une **routine Claude Code distante** (claude.ai, 4×/semaine) interroge une **API jobs structurée (JSearch)**, score 15-40 offres pertinentes avec une rubric `seniority + sector + impact + bonus` (0-10), extrait les **skills attendus** de chaque annonce (scindés « tu as déjà » / « à acquérir » via match au profil) et estime le **salaire** (`intel.salary_estimate`). Les résultats atterrissent dans la table `jobs` + un récap par run dans `job_scans`. Le panel hydrate depuis ces deux tables, affiche les offres ≥7 en "Hot leads" + le reste en liste dense filtrable. L'utilisateur édite **uniquement** le statut (postuler / snoozer / archiver / clôturer), le vote 👍/👎 et les notes perso — toutes les autres colonnes sont propriété de la routine. Subscribe Supabase Realtime : un nouveau scan pendant que le panel est ouvert recharge le feed transparently. Seules les offres **temps plein** sont inscrites (filtre en amont) ; le flag **remote** et le **logo** de la boîte viennent de l'API, et les skills sont extraits en priorité de la section qualifications de l'annonce quand elle est structurée (ADR-20). (Intel warm et reco CV — abandonnés avec la migration vers l'API structurée, ADR-19.)

## Parcours utilisateur
1. Clic sidebar "Jobs Radar" (groupe Business) — le panel charge les offres et le scan de la semaine.
2. Lecture du header : eyebrow "Jobs Radar · date du jour" + stats inline ("N nouvelles · M hot leads · T au total dans le radar") + titre descriptif.
3. Scan du banner en trois blocs : volumes sur 7 jours en barres Lun→Dim, répartition par catégorie de rôle (Produit / RTE / PgM / PjM / CoS / EM), actions du jour (relances + entretiens à préparer).
4. Lecture des hot leads en hero : cartes larges pour les offres notées 7+ avec logo de la boîte, score survolable, rubric par axe (Séniorité / Secteur / Impact), skills attendus scindés « tu as déjà » / « à acquérir », salaire estimé pour toi (target chiffré dans la fourchette + indicateur "dans ta fourchette cible"), badge « Remote » le cas échéant, et bouton "Postuler" (annonce).
5. Utilisation des filtres : recherche texte + quatre groupes de filtres (score hot/mid/low / rôle / lieu / statut) + tri (score ou récence). Filtre statut "Actives" par défaut, qui masque les snoozées et archivées.
6. Liste dense en dessous : une ligne par offre avec score compact, titre / boîte, tags (catégorie / stage / statut), pitch, rubric condensée, menu kebab d'actions et bouton pour postuler.
7. Clic sur "Postuler" ouvre l'annonce LinkedIn, passe l'offre en "appliquée" et affiche un toast de confirmation.
8. Menu kebab par offre : "Snoozer 7 jours", "Archiver", "Éditer les notes" (zone de texte inline avec bouton Enregistrer).
9. Rafraîchissement temps réel : quand le scan automatisé pousse de nouvelles offres pendant que le panel est ouvert, le feed se met à jour automatiquement sans recharger la page.

## Fonctionnalités
- **Score sur 10 décomposé** : chaque offre reçoit un score synthèse, survolable pour voir le détail par axe (Séniorité / Secteur / Impact / Bonus).
- **Trois bandes de score** : Hot (≥ 7) / Moyen (5-7) / Faible (< 5) colorées différemment pour repérer les opportunités en un clin d'œil.
- **Hot leads en hero** : les offres Hot mises en avant en grandes cartes avec logo de la boîte, rubric par axe, skills attendus scindés « tu as déjà » / « à acquérir », salaire estimé, badge « Remote » le cas échéant, et bouton « Postuler ». Ce bloc **respecte les filtres courants** (rôle, lieu, statut, score, recherche) : il ne montre que les hot leads correspondants et se masque s'il n'en reste aucun. Le compteur « hot leads » du header reste, lui, un total global.
- **Salaire estimé pour toi** : sur les hot leads enrichis, un encart dédié coloré affiche un target chiffré ("~132k€") dans la fourchette de l'offre. Le détail du calcul (fourchette publiée vs inférée du marché, raison du positionnement) est accessible en survolant un petit "i". L'encart se code visuellement « dans ta fourchette cible » (vert) ou « hors fourchette » (gris) selon la fourchette de salaire renseignée dans ton profil ; sans fourchette définie il s'affiche en orange brand neutre.
- **Skills attendus par offre** : extraits de l'annonce (en priorité depuis sa section qualifications quand elle est structurée) et scindés en deux colonnes — « tu as déjà » (présents sur ton profil) et « à acquérir » — pour situer l'écart de compétences d'un coup d'œil. Un discret « d'après l'annonce » indique quand les skills viennent de la section qualifications plutôt que d'une lecture du texte. Affiché sur les hot leads enrichis.
- **Badge & filtre Remote** : les offres en télétravail portent un badge « Remote » (carte et ligne) ; un filtre « lieu » dédié permet de n'afficher que celles-ci.
- **Scan banner** : trois blocs de synthèse en haut de page — volumes sur 7 jours en barres Lun→Dim, répartition par catégorie de rôle, actions du jour (relances + entretiens à préparer).
- **Liste dense filtrable** : une ligne par offre avec recherche texte + quatre groupes de filtres (score / rôle / lieu / statut) + tri (score ou récence). Filtre statut « Actives » par défaut qui masque les snoozées et archivées.
- **Actions rapides par offre** : bouton Postuler (ouvre LinkedIn + marque appliquée + toast de confirmation), menu kebab (Snoozer 7 jours / Archiver / Éditer les notes) et zone de notes perso inline.
- **Statuts + notes persistés** : passage en appliquée/snoozée/archivée et notes perso sauvegardés en base, avec mise à jour instantanée et toast de confirmation (ou toast d'erreur en cas de souci de synchro).
- **Archivage durable face aux republications LinkedIn** : quand LinkedIn republie une offre déjà archivée (même titre + même boîte) sous une nouvelle annonce, la décision d'archivage est conservée — l'offre ne réapparaît pas dans la liste le lendemain. Idem pour une offre snoozée tant que le snooze n'est pas expiré. Les notes perso de la version archivée sont aussi récupérées si la nouvelle annonce n'en a pas.
- **Vote 👍/👎 + raisons** : pouces sur chaque carte et ligne ; un popover (style du menu ⋯) permet de cocher **plusieurs** raisons + un texte libre. Les raisons retenues s'affichent en tags. Re-cliquer le pouce actif annule le vote. Stocké dans `user_verdict_reason` (raisons jointes).
- **Rafraîchissement temps réel** : quand le scan automatisé pousse de nouvelles offres pendant que le panel est ouvert, le feed se met à jour automatiquement sans reload.
- **Message vide après filtres** : quand aucune offre ne correspond aux filtres, un message explicite suggère de relâcher un critère ou de revenir le lendemain matin.
- **Encart calibrage** : en haut du panel, un profil de préférences repliable — « Tes règles » (éditable, stocké dans `user_profile.job_pref_rules`, verrouillé côté scan) et « Observé par le radar » (lecture seule, `job_pref_observed` maintenu par la routine Jobs Radar). Permet de voir et corriger ce que le radar a compris des goûts de l'utilisateur.
- **Masquage des offres clôturées** : quand une offre passe en "ne recrute plus", tu la masques **à la main** via le menu kebab « Marquer clôturée » (la détection automatique a été retirée avec le passage à l'API structurée), elle est retirée du feed actif et des hot leads. Un filtre « Clôturées » permet de les revoir et de **« Rouvrir »** une offre masquée à tort. Un compteur dans l'en-tête indique combien sont masquées. Une offre déjà postulée reste visible dans le pipeline.

## Front — structure UI
Fichier : [cockpit/panel-jobs-radar.jsx](cockpit/panel-jobs-radar.jsx) — 782 lignes, monté par [app.jsx:404](cockpit/app.jsx:404). CSS dédié : [cockpit/styles-jobs-radar.css](cockpit/styles-jobs-radar.css) — 1156 lignes, scope `jr-*`. Ressources incluses dans [index.html:32, 73, 98](index.html:32).

Structure DOM :
- `.panel.panel-jobs-radar`
  - `.jr-header` — kicker + stats + h1 (title-main + title-sub)
  - `<ScanBanner>` → `.jr-scan > .jr-scan-grid` 3 colonnes :
    - `.jr-scan-block` volumes 7j (7 `.jr-sparkbar`)
    - `.jr-scan-block` répartition catégories (6 `.jr-ratbar`)
    - `.jr-scan-block--actions` actions du jour (liste `.jr-action-item`)
  - `.jr-hot-section` (conditionnel si `hotLeads.length > 0`) → `.jr-hot-grid` avec `<HotLeadCard>` (intègre `<JrSkills>` entre rubric et salaire, puis `<SalaryEstimate>` quand `intel.salary_estimate` est présent)
  - `.jr-list-section`
    - `.jr-section-head--list` → kicker + titre + `.jr-filters` (search + 3 `<FilterGroup>` + `.jr-sort`)
    - `.jr-list` OR `.jr-empty` avec liste de `<OfferRow>`
  - `<JrToast>` (conditionnel)

Route id = `"jobs"`. **Panel Tier 2** ([data-loader.js:4528](cockpit/lib/data-loader.js:4528)).

## Front — fonctions JS
| Fonction | Rôle | Fichier/ligne |
|----------|------|---------------|
| `PanelJobsRadar({ data, onNavigate })` | Composant racine — state local `offers[]` mirror de `window.JOBS_DATA.offers`, split hot/rest, 4 filtres | [panel-jobs-radar.jsx:498](cockpit/panel-jobs-radar.jsx:498) |
| `HotLeadCard({ offer, rank, ... })` | Card large : rubric + skills (`<JrSkills>`) + salaire + CTAs ; lit `window.PROFILE_DATA._values.target_salary_range` pour calibrer le badge in/out de l'estimation salaire | [panel-jobs-radar.jsx](cockpit/panel-jobs-radar.jsx) |
| `SalaryEstimate({ estimate, targetRange })` | Encart "Salaire estimé" — affiche `target` + `range` issus de `intel.salary_estimate`, badge "dans/hors fourchette cible" en parsant `targetRange` ("90-130k€"). 3 tones de couleur : `--in` (vert positif), `--out` (gris pâle), `--neutral` (orange brand-tint, par défaut sans fourchette user). Le `rationale` + label de source sont exposés via un bouton `(i)` au hover : tooltip CSS custom 300px qui affiche "SOURCE LABEL" + rationale sur fond `--tx` avec flèche pointant vers le bouton (même pattern que `.jr-score-tip`). | [panel-jobs-radar.jsx:184](cockpit/panel-jobs-radar.jsx:184) |
| `OfferRow({ offer, ... })` | Ligne dense pour mid/low — score + titre + rubric condensée | [panel-jobs-radar.jsx:340](cockpit/panel-jobs-radar.jsx:340) |
| `ScanBanner({ scan })` | 4 blocs header (volumes/ratios/CV/actions) | [panel-jobs-radar.jsx:416](cockpit/panel-jobs-radar.jsx:416) |
| `ScoreChip({ offer, big })` | SVG-less score "N,N/10" avec tooltip `.jr-score-tip` décomposition 4 axes | [panel-jobs-radar.jsx:152](cockpit/panel-jobs-radar.jsx:152) |
| `RubricBlock({ offer })` | Liste de lignes axis/text (Séniorité/Secteur/Impact + Bonus/Calibrage si présents) | [panel-jobs-radar.jsx:184](cockpit/panel-jobs-radar.jsx:184) |
| `JrSkills({ skills })` | Skills attendus scindés en deux colonnes « tu as déjà » (`on_cv`) / « à acquérir », depuis `intel.skills_required` | [panel-jobs-radar.jsx](cockpit/panel-jobs-radar.jsx) |
| `JrActionsMenu({ offer, open, onToggle, ... })` | Kebab popover (Snoozer/Archiver/Éditer notes/Marquer clôturée/Rouvrir) | [panel-jobs-radar.jsx:82](cockpit/panel-jobs-radar.jsx:82) |
| `JrNotesEditor({ offer, onSave, onCancel })` | Textarea 3 lignes + boutons save/cancel | [panel-jobs-radar.jsx:130](cockpit/panel-jobs-radar.jsx:130) |
| `JrToast({ message, tone })` | Toast aria-live 2.4s | [panel-jobs-radar.jsx:71](cockpit/panel-jobs-radar.jsx:71) |
| `FilterGroup({ value, onChange, options })` | Segmented buttons | [panel-jobs-radar.jsx:768](cockpit/panel-jobs-radar.jsx:768) |
| `patchJobSupabase(id, patch)` | Whitelist `{status, user_notes}` puis `PATCH /rest/v1/jobs?id=eq.X` | [panel-jobs-radar.jsx:15](cockpit/panel-jobs-radar.jsx:15) |
| `updateJob(id, patch, toastMsg)` | Optimistic mute state + mute global + track + PATCH + toast | [panel-jobs-radar.jsx:545](cockpit/panel-jobs-radar.jsx:545) |
| `applyToJob(offer)` / `snoozeJob` / `archiveJob` / `saveNotes` | Handlers PATCH | [panel-jobs-radar.jsx:567-579](cockpit/panel-jobs-radar.jsx:567) |
| Effet realtime Supabase channel | Subscribe `jobs_radar_sub` sur `jobs` + `job_scans` puis invalide cache + reload sur event | [panel-jobs-radar.jsx:519-537](cockpit/panel-jobs-radar.jsx:519) |
| `scoreBand(s)`, `dayLabel(n)`, `numberFmt(n)` | Helpers | [panel-jobs-radar.jsx:54-68](cockpit/panel-jobs-radar.jsx:54) |
| `T2.jobs_all()` | `GET jobs?select=*&order=score_total.desc.nullslast&limit=300` | [data-loader.js:1330](cockpit/lib/data-loader.js:1330) |
| `T2.jobs_scan_today()` | `GET job_scans?scan_date=eq.{today}&select=*` — retourne la 1e ligne ou null | [data-loader.js:1337](cockpit/lib/data-loader.js:1337) |
| `T2.jobs_scans_7d()` | `GET job_scans?scan_date=gte.{today-7}&select=*&order=scan_date.desc&limit=14` | [data-loader.js:1344](cockpit/lib/data-loader.js:1344) |
| `transformJobRow(row)` | DB row → panel shape (intel + rubric normalisés) | [data-loader.js:1585](cockpit/lib/data-loader.js:1585) |
| `transformJobIntel(intel)` | Normalise `intel` → `{ salary_estimate, skills_required:[{name,on_cv}] }` ; valide bornes/currency/basis du salaire ; tolère des skills en strings nues | [data-loader.js](cockpit/lib/data-loader.js) |
| `transformJobRubric(rubric)` | Array ou objet → array `[{axis, text}]` | [data-loader.js:1545](cockpit/lib/data-loader.js:1545) |
| `transformJobScan(todayScan, last7Scans, allJobs)` | Banner shape (volumes Mon→Sun, ratios catégorie, actions auto si vides) | [data-loader.js](cockpit/lib/data-loader.js) |
| `loadPanel("jobs")` case | `Promise.all` des 3 fetchs + transform + mute `JOBS_DATA.offers/scan/_raw` | [data-loader.js:4500-4513](cockpit/lib/data-loader.js:4500) |
| `daysSinceDate(dateStr)` | Age en jours depuis une date ISO | [data-loader.js:1539](cockpit/lib/data-loader.js:1539) |

## Back — sources de données

| Table | Colonnes lues / écrites | Volumétrie |
|-------|--------------------------|------------|
| `jobs` | **Read** : `id, linkedin_job_id, first_seen_date, last_seen_date, title, company, url, posted_date, role_category (produit/rte/pgm/pjm/cos/em), company_stage (seed/A/B/C/scale/grand_groupe), pitch, compensation, is_remote (boolean — remote-friendly, NULL=inconnu, ADR-20), score_seniority, score_sector, score_impact, score_bonus, score_total, rubric_justif (jsonb), intel (jsonb — `salary_estimate { min, max, target, currency, basis: 'published'\|'inferred', rationale }` + `skills_required [{ name, on_cv }]` (extraits en priorité de `job_highlights`, ADR-20) + `skills_source` ('highlights'|'description') + `employer_logo` (url affichage) ; `cv_recommended`/`cv_reason` ne sont plus lus par le front ni écrits par la routine — ADR-19), intel_depth (none/light — plus de 'deep' depuis ADR-19), status (new/to_apply/applied/snoozed/archived), user_notes, created_at, updated_at, closed_at (timestamptz — posé par le front via « Marquer clôturée » (ADR-18) ; la routine ne le pose plus, détection auto retirée — ADR-19)`. **Write (front PATCH whitelist)** : `status`, `user_notes`, `user_verdict`, `user_verdict_reason`, `user_verdict_at`, `closed_at`. | **554 lignes** (4 status distincts, dont 399 archived). Triggers DB : `jobs_updated_at` sur UPDATE (bumpe `updated_at`), `jobs_inherit_user_status` sur INSERT (hérite du `status` archived/snoozed récent pour la même paire (titre, boîte) — neutralise les republications LinkedIn). Index `jobs_status_score_idx` + `jobs_first_seen_idx`. RLS : policy `jobs_read_public` (SELECT public — pas restreint `authenticated` comme le reste du repo !) + `jobs_user_update` (UPDATE public). |
| `user_profile` | **Read** : key `target_salary_range` (text, ex: "90-130k€") — utilisée par `<SalaryEstimate>` pour matcher le target estimé contre la fourchette cible et basculer le badge "dans/hors fourchette". Édité depuis le panel Profil. | Optionnelle. Si absente, l'encart affiche le target sans badge in/out. |
| `job_scans` | **Read** : `id, scan_date (unique), raw_count, dedup_strict_count, processed_count, hot_leads_count, tendances (jsonb), actions (jsonb), created_at` (le front ne lit plus `signal_cv`). **Write** : aucun côté front (écriture par la routine Jobs Radar distante via le connecteur MCP Supabase, service_role). | **4 scans**. `dedup_strict_count` jamais consommé par le front. RLS : `job_scans_read_public` (SELECT public). |

**⚠ Écart RLS** : contrairement à la migration `006_rls_authenticated.sql` qui force `authenticated` partout, `jobs` + `job_scans` ont des policies `using (true)` sans clause `TO authenticated`. Anon peut donc lire les offres (mais nécessite quand même la `apikey` header).

## Back — pipelines qui alimentent
- **Routine Claude Code distante** (claude.ai, hors repo GitHub Actions — ADR-19) — responsable de :
  1. Fetch JSearch (RapidAPI) 4×/semaine — 11 requêtes-rôles (IA + produit/programme/CoS + les nouvelles `engagement manager`, `delivery manager` pour la catégorie EM — ADR-22 ; liste complète dans la routine : `docs/cowork-routines/jobs-radar.md`), `num_pages=1`, `country=fr`
  2. Dedup strict via `linkedin_job_id` (= id JSearch) sur 30 jours glissants
  3. Scoring 10 points + `rubric_justif` à clés plates par axe
  4. **Extraction des skills** — en priorité depuis `job_highlights.Qualifications`/`Responsibilities` (sinon `job_description`) + match au profil (`skill_radar` + `user_profile`) → `intel.skills_required [{ name, on_cv }]` (+ `intel.skills_source`) — ADR-20
  5. **Estimation salaire calibrée** : `intel.salary_estimate { min, max, target, currency, basis, rationale }` — bornes lues depuis la JD si publiées (`basis: "published"`) ou inférées du marché (`basis: "inferred"`)
  6. Écriture dans `jobs` (`intel_depth = 'light'`, colonne `is_remote`, `intel.employer_logo`) et `job_scans` (1 ligne/run) via le connecteur **MCP Supabase** (service_role)

  Pré-filtre **FULLTIME** : les offres non temps-plein (`job_employment_types` ≠ FULLTIME) sont écartées avant dédup/scoring — gardées si le champ est absent (ADR-20). Plus de navigateur ni de session LinkedIn ; couverture élargie (liens « Postuler » parfois Indeed/WTTJ). **Abandonnés vs l'ère Cowork** : intel warm (signaux boîte / lead / réseau / angle / maturité SAFe), reco CV (`cv_recommended`/`cv_reason`), détection auto de clôture. Pas de workflow `.github/workflows/jobs-*.yml` : l'orchestration tourne sur claude.ai. Le repo ne contient que :
  - Migration DDL : [jarvis/migrations/008_jobs_radar.sql](jarvis/migrations/008_jobs_radar.sql)
  - Seed mock : [jarvis/seed/jobs_radar_mock.sql](jarvis/seed/jobs_radar_mock.sql) (7 offres + 1 scan pour dev local)
  - README : [README-jobs-radar.md](README-jobs-radar.md)
  - Prompt de la routine (miroir versionné) : [docs/cowork-routines/jobs-radar.md](docs/cowork-routines/jobs-radar.md) — éditable via le skill `schedule` / l'outil `RemoteTrigger`
- **Daily pipeline** (main.py) : aucune interaction.
- **Weekly pipeline** (weekly_analysis.py) : aucune interaction.
- **Jarvis (local)** : pas indexé (absent de `indexer.py`). Les offres ne sont pas dans `memories_vectors`.
- **Front** : seul writer pour `status` et `user_notes` (whitelisté).

## Appels externes
- **Supabase REST (lecture)** :
  - `GET /rest/v1/jobs?select=*&order=score_total.desc.nullslast&limit=300`
  - `GET /rest/v1/job_scans?scan_date=eq.{today}&select=*`
  - `GET /rest/v1/job_scans?scan_date=gte.{today-7}&select=*&order=scan_date.desc&limit=14`
- **Supabase REST (écriture)** : `PATCH /rest/v1/jobs?id=eq.{id}` avec `{status?, user_notes?}`.
- **Supabase Realtime** : channel `jobs_radar_sub` subscribe `postgres_changes event=* schema=public table=jobs|job_scans`. Nécessite WebSocket.
- **`window.open(url, "_blank")`** : ouverture offres LinkedIn + LinkedIn du lead.
- **Telemetry** : `window.track("jobs_action", { action, job_id, value })` — couvre les mutations statut/notes. `window.track("jobs_feedback", { verdict, reason, job_id, score_at_vote })` — vote 👍/👎 et raison associée.

## Dépendances
- **Onglets in** : sidebar "Jobs Radar" (groupe Business). Aucun cross-nav entrant.
- **Onglets out** : aucun — pas de navigation vers d'autres panels.
- **Pipelines obligatoires** : **la routine Jobs Radar distante** (ADR-19). Sans elle, les tables restent vides et le panel affiche un état d'absence (les mocks de démo ont été retirés le 2026-04-29).
- **Tier 1 dépendances** : aucune — entièrement self-contained en Tier 2.
- **Variables d'env / secrets** :
  - Front : clé publishable Supabase + JWT Google OAuth (même si RLS policies ici sont `using(true)`, les headers `apikey` et `Authorization` sont quand même envoyés).
  - Backend (routine distante) : accès Supabase via le connecteur MCP (service_role) — pas de `SUPABASE_SERVICE_KEY` en env ; clé RapidAPI inline dans le prompt de la routine.

## États & edge cases
- **Loading** : `<PanelLoader>` Tier 2 pendant les 3 fetchs parallèles.
- **Tables vides** (migration non appliquée ou scan jamais tourné) : `allJobs?.length || todayScan` est false → `JOBS_DATA` reste à sa forme vide d'init (offers `[]`, scan `null`). Le panel affiche son état "Aucune offre" (filtres → `.jr-empty`) plutôt qu'un faux feed. Le mock `data-jobs.js` a été retiré le 2026-04-29.
- **Hero vide** (aucun hot lead ≥ 7 ne passe les filtres courants, ou tous `archived` / `snoozed`) : `heroLeads.length === 0` → la section `.jr-hot-section` ne se render pas. Pas de message dédié — le hero disparaît silencieusement. (Le compteur `hotLeadsCount` du header reste global, non filtré.)
- **Liste vide après filtres** : `.jr-empty` avec icône search + "Aucune offre avec ces filtres" + sub "Essaie de relâcher un critère — ou reviens demain matin."
- **PATCH échoue** : toast `"Erreur de sync — changement local uniquement"` tone error. **Pas de rollback** — l'override local reste visible, la DB reste cohérente avec la vraie valeur. L'utilisateur peut être induit en erreur.
- **Realtime indisponible** (WebSocket bloqué, `sb.client.channel` absent) : no-op silencieux → pas de rafraîchissement auto. L'utilisateur doit recharger la page pour voir un nouveau scan.
- **`sb.patchJSON` absent** : `patchJobSupabase` return sans erreur → l'optimistic update reste local, le toast "ok" s'affiche quand même (**bug** : toast trompeur, aucun appel DB émis).
- **`intel` null** sur hot lead : `intel && (...)` guard → les sections enrichies (skills, salaire) sont skippées, mais la card hot reste affichée avec score + rubric.
- **`intel.skills_required` vide/absent** (lignes historiques sans skills) : `<JrSkills>` renvoie `null` — la card reste score + rubric + salaire.
- **`intel.salary_estimate` absent** (salaire indéterminable côté routine) : encart `<SalaryEstimate>` ne se render pas — la card hot affiche `compensation` text dans la meta line uniquement.
- **`target_salary_range` absent du profil** : `targetRange = null` → estimation affichée sans badge in/out (tone neutre).
- **`target_salary_range` mal formaté** (ex: "100k", "90 à 130") : la regex `(\d+)\s*[-–—]\s*(\d+)` échoue → comportement identique à absent.
- **`salary_estimate.min` ou `max` null** : seul `target` est affiché. Si les trois sont null, l'encart est skip.
- **`offer.url` vide** : bouton "Postuler" disabled. `applyToJob` return early.
- **`updated_at` jamais utilisé par le front** : colonne présente mais pas consommée.
- **Notes edit cancel** : `onCancel` ferme le textarea sans sauvegarder — le draft est perdu (pas de "sauve auto en brouillon").
- **Menu open sur une offre, scroll sur une autre** : le `ref.current.contains(e.target)` gère correctement le dismiss sur click outside.
- **Republication LinkedIn d'une offre archivée/snoozée** : quand la routine insère une nouvelle annonce (nouveau `linkedin_job_id`) avec le même `(lower(trim(title)), lower(trim(company)))` qu'une ligne récemment archivée (≤30j) ou snoozée (≤7j, durée du snooze), un trigger Postgres `BEFORE INSERT` (`jobs_inherit_user_status`, migration `sql/013_jobs_inherit_status.sql`) hérite du `status` et copie les `user_notes` si la nouvelle ligne en est dépourvue. Les autres colonnes (score, intel, dates, url) restent celles du nouveau scan. Au-delà des fenêtres temporelles, la nouvelle ligne repart en `status='new'`.

## Limitations connues / TODO
- [x] **Mock toujours affiché si tables vides** — résolu le 2026-04-29 (commit `5e83774`) : `data-jobs.js` supprimé, le panel utilise désormais l'état vide légitime quand Supabase ne remonte rien.
- [ ] **RLS permissive** : `jobs_read_public` + `jobs_user_update` utilisent `using(true)` sans `TO authenticated`. Anon avec juste l'apikey lit toutes les offres + peut PATCH n'importe quoi. À aligner sur migration 006.
- [ ] **Toast ok trompeur si `sb.patchJSON` absent** : l'update reste purement local mais le toast affiche "Postulé · statut mis à jour". Devrait être un toast "Synchro indisponible — local only".
- [ ] **Pas de rollback sur PATCH échoué** : juste un toast erreur, l'offre garde son statut mis à jour localement. Au prochain reload, la DB écrase — perte silencieuse.
- [x] **Bouton « Enrichir l'Intel → » retiré** (2026-05-28) — l'enrichissement intel warm est abandonné (migration vers API structurée).
- [ ] **Pas de pagination** : `limit=300` dans `jobs_all`. Passé ce seuil les offres plus anciennes disparaissent du feed — dédup cross-jours, pas de mécanisme "Charger plus". Le README le mentionne.
- [ ] **`tendances.ratios_category` jsonb ignoré** : la routine peut pré-calculer des ratios plus fins (pondérés, secteurs), mais `transformJobScan` les recalcule systématiquement depuis `activeJobs`. Idem `volumes_7d` qui pourrait être lu depuis `tendances.volumes_7d` si présent.
- [ ] **`dedup_strict_count` jamais affiché** : colonne calculée par le scan, présente dans `job_scans`, jamais consommée. Info perdue.
- [ ] **Pas de cross-nav vers Jarvis** : contrairement à `opps` qui a un bouton "Plan d'action" + stash, Jobs Radar n'offre pas "Demande à Jarvis de prépare ton pitch pour cette offre". Manque évident.
- [x] **Reco CV retirée du front** (2026-05-28) — badge CV, `cv_reason` et bloc « Signal CV » du banner supprimés.
- [ ] **Pas de filtre "deep intel only"** : impossible de trier pour ne voir que les hot leads avec intel déplié — potentiellement utile pour le matin du job search.
- [ ] **`status="to_apply"` jamais écrit par le front** : l'enum existe DB mais aucun chemin UI ne le set (postuler passe direct à `applied`). Reliquat du design initial ?
- [ ] **Pas d'indexation Jarvis** : absent de `indexer.py`. Jarvis ne peut pas raisonner sur "quelles offres correspondent à mon profil" via RAG.
- [ ] **`rubric_justif` legacy non normalisé en base** — les lignes historiques portent jusqu'à 17 formes distinctes (légacy strings, short-form `sen/sec/imp`, FR `seniorite/secteur`, structurée `{max, just, score}`, single-line `redflag/reason/note/gap/reject`, hybride `{total, reason, verdict}`). La routine actuelle écrit désormais la **forme à clés plates figée** (`seniority`/`sector`/`impact`/`bonus`/`calibrage` — ADR-19, prompt versionné) ; le front continue de tout tolérer via `transformJobRubric`. Reste à migrer les anciennes lignes en base.
- [ ] **Realtime reload sans debounce** : un batch de N inserts de la routine déclenche N `loadPanel("jobs")`. Le cache `once("jobs_all")` est volontairement busté à chaque event.
- [ ] **`window.JOBS_DATA.offers[idx] = { ...old, ...patch }` en mute direct** : potentiellement problématique si un re-render React lit la ref tout en la mutant. Ici l'effet est secondaire mais pas idiomatique.

## Dernière MAJ
2026-05-31 — **Filtres appliqués au hero « hot leads »** : le bloc hot leads (offres ≥ 7) suit désormais les filtres catégorie/lieu/statut/score/recherche (avant : toujours toutes catégories) et se masque s'il ne reste aucune offre correspondante. Compteur « hot leads » du header gardé global. Fix UX iso-archi (pas d'ADR).
2026-05-31 — **Engagement Manager = rôle cible (ADR-22)** : la routine suit désormais les postes d'engagement / delivery / transformation manager en boîte tech/produit/IA crédible — 2 requêtes ajoutées, scoring qui ne les pénalise plus comme du « RUN », nouvelle catégorie « EM » (filtre + répartition du scan banner). Exclusion conseil/ESN inchangée. Migration `sql/017_jobs_em_category.sql`. Voir ADR-22.
2026-05-29 — **réorientation IA (ADR-21)** : routine passe à 8 requêtes-rôles (+ `AI product manager`, `AI program manager`, `head of AI product`, `generative AI product manager`) ; ÉTAPE 3 « Roles cibles »/« Secteurs chauds » réorientées IA ; `user_profile.job_pref_rules` de Jean créée en base (pivot IA, CDI senior, plancher 80k fixe + 10k variable, exclusions conseil/ESN + expertise verticale manquante). Prompt live mis à jour via `RemoteTrigger`. Voir ADR-21.
2026-05-28 — **Jobs Radar v2.1 (ADR-20)** : exploitation des champs JSearch — filtre FULLTIME pré-scoring, skills extraits en priorité de `job_highlights` (provenance `intel.skills_source`), nouvelle colonne `is_remote` (badge « Remote » + filtre lieu), logo employeur (`intel.employer_logo`). Migration `sql/016_jobs_is_remote.sql`. Front : carte (logo + badge Remote), filtre lieu, label « d'après l'annonce » sur les skills.
2026-05-28 — **réconciliation back/routine (le « plan 2 »)** : le moteur est désormais une **routine Claude Code distante** (JSearch + Sonnet 4.6 + connecteur MCP Supabase, 4×/sem — ADR-19) en remplacement de l'agent Cowork LinkedIn. MAJ Finalité + sections back (pipeline, écriture via MCP, `intel_depth` none/light, `closed_at` front-only) + suppression des mentions intel warm / reco CV / détection auto de clôture. Routine activée (`enabled: true`) après test concluant. Voir ADR-19 + docs/cowork-routines/jobs-radar.md.
2026-05-28 — refonte carte (fiche éditoriale) : bloc skills attendus « tu as déjà » / « à acquérir » (`intel.skills_required[{name,on_cv}]`, normalisé dans `transformJobIntel`) ; abandon de l'intel warm (signaux boîte/lead/réseau/angle/SAFe) et de la reco CV (badge CV, `cv_reason`, bloc « Signal CV » du banner → 3 colonnes). Les sections back/routine seront réconciliées au plan 2 (migration API structurée). Voir docs/superpowers/plans/2026-05-27-jobs-radar-front-card.md.
2026-05-27 — fiabilisation Tier 1 : bouton « Marquer clôturée »/« Rouvrir » (le front écrit `closed_at`, ADR-18) ; affichage de l'axe `calibrage` dans la rubric. Côté routine (v3.2, hors repo) : schéma `rubric_justif` figé, passe de clôture re-priorisée, fenêtre de scan dynamique. Voir docs/superpowers/plans/2026-05-27-jobs-radar-routine-hardening.md.
2026-05-21 — masquage des offres clôturées : colonne `closed_at` (migration 015) posée par Cowork, masquage front + filtre « Clôturées » + compteur. Voir docs/superpowers/plans/2026-05-21-jobs-radar-closed-offers.md.
2026-05-21 — redesign UI de vote : popover multi-sélection des raisons + alignement sur les tokens du thème (fix contraste du champ custom). Voir docs/superpowers/plans/2026-05-21-jobs-radar-vote-ui-redesign.md.
2026-05-21 — encart calibrage (Lot 2) : profil de préférences éditable (job_pref_rules) + observé (job_pref_observed) en haut du Jobs Radar.
2026-05-21 — ajout du vote 👍/👎 + raison (calibrage par feedback, Lot 1). Colonnes user_verdict* + héritage 180j (migration 014, sql/014_jobs_feedback.sql). Event jobs_feedback. Voir docs/superpowers/plans/2026-05-21-jobs-radar-calibrage-feedback.md.
2026-05-12 — fix crash React "Objects are not valid as a React child (keys {max, just, score})". Cause : la routine Cowork upstream a fait dériver `rubric_justif` vers 17 formes distinctes en DB (formes courtes `sen/sec/imp`, FR `seniorite/secteur`, single-line `redflag/reason/note/gap/reject`, structurée `{max, just, score}` par axe, hybride `{total, reason, verdict}`, etc.). Le code initial faisait `text: rubric.seniority || ""` — quand `rubric.seniority` est devenu un objet `{max, just, score}`, il était assigné tel quel à `r.text` et React crashait au render. Refonte de `transformJobRubric` en normalizer défensif qui aplatit toutes les formes vers `[{axis: string, text: string}]` strictement (extraction `just/justification/reason/note` + préfixe `score/max` quand dispo). Garde anti-crash en ceinture-bretelles : `safeRubricText()` coerce tout au render dans `RubricBlock` + `OfferRow`. Validé sur les 17 formes observées (+ edge cases null/undefined/array). À surveiller : aligner la routine Cowork sur une forme stable et documentée pour ne plus dépendre de cette normalisation.
2026-05-01 — sync spec ↔ code après audit : retire les mentions du mock `data-jobs.js` (Dépendances, États & edge cases, Limitations) — le fichier a été supprimé le 2026-04-29 (commit `5e83774`), `data-loader.js` n'initialise plus `JOBS_DATA` en fallback. Le panel affiche désormais un état vide légitime quand Supabase ne remonte rien.
2026-04-30 — fix "offres archivées qui réapparaissent le lendemain". Cause : LinkedIn republie certaines offres avec un nouveau `linkedin_job_id` tous les 1-3 jours, donc la dédup unique sur cette clé ne tient pas. Ajout d'un trigger Postgres `BEFORE INSERT` (`jobs_inherit_user_status`, migration `sql/013_jobs_inherit_status.sql`) qui hérite du `status` archived (≤30j) ou snoozed (≤7j) et des `user_notes` quand une paire `(lower(trim(title)), lower(trim(company)))` matche une ligne précédente.
2026-04-26 — tooltip CSS custom au hover du `(i)` (au lieu du `title=` natif lent et non stylable). Affiche source + rationale sur fond `--tx`, flèche pointant vers le bouton, 300px max. Pattern réutilisé depuis `.jr-score-tip`.
2026-04-26 — encart "Salaire estimé pour toi" : refonte UX sur retour user. Code couleur orange brand-tint en mode neutral (au lieu d'un gris discret) pour que le chiffre ressorte. Le `rationale` part dans un tooltip natif via un bouton `(i)` au lieu d'un paragraphe — encart 2x plus compact. Backfill manuel de 30 hot leads existants en DB via UPDATE jsonb_set (la routine Cowork V3.1 ne re-traite pas le stock historique).
2026-04-26 — ajout encart "Salaire estimé pour toi" sur les hot leads. Nouveau composant `<SalaryEstimate>` consomme `intel.salary_estimate` (alimenté par l'Étape 4.5 de la routine Cowork versionnée dans [docs/cowork-routines/jobs-radar.md](docs/cowork-routines/jobs-radar.md)). Lit `user_profile.target_salary_range` pour basculer le badge in/out. Mock data-jobs.js enrichi sur les 3 hot leads.
2026-04-24 — réécriture Parcours utilisateur en vocabulaire produit.
2026-04-24 — réécriture Fonctionnalités en vocabulaire produit.
2026-04-24 — rétro-doc depuis code réel — commit `c456ac9` (feature shippée le `1bd0fb0`)
