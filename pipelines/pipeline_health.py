#!/usr/bin/env python3
"""
Santé des pipelines → Supabase.

Observe les workflows GitHub Actions DE L'EXTÉRIEUR et écrit le verdict dans
`pipeline_health`, que le cockpit lit en Tier 1 pour afficher un bandeau sur
les onglets concernés.

Pourquoi une observation externe : un pipeline qui plante sur un token expiré
ne peut pas rapporter son propre échec. Le 2026-07-26, strava/withings/tft
échouaient tous les jours depuis des semaines sans qu'aucune surface ne le dise.

Trois signaux indépendants, parce qu'un run vert ne prouve pas qu'il a produit
et qu'un pipeline qui ne tourne plus n'a même pas de run rouge à montrer :
  1. Verdict du dernier run      (API GitHub Actions)  → `failing`
  2. Fraîcheur de la donnée      (max(date_column))    → `stale`
  3. Âge du dernier run          (API GitHub Actions)  → `stale`

Le deuxième attrape le no-op silencieux : le run weekly du 2026-07-19 s'est
terminé en succès avec 0 token, 0 appel et 0 recommandation.

Le troisième attrape le cron qui cesse d'être déclenché — angle mort total
pour `backup_supabase`, hebdomadaire et sans table de sortie (ADR-37) : les
deux premiers signaux le laissaient vert indéfiniment sur la foi d'un succès
vieux de plusieurs mois, et c'est le seul pipeline dont la panne serait
irrattrapable.

Le contrat de surveillance est déclaré dans docs/architecture/pipelines.yaml
sous la clé `health` de chaque pipeline (cf. l'en-tête du fichier).

Usage:
    python pipelines/pipeline_health.py
    python pipelines/pipeline_health.py --dry-run   # n'écrit pas en base
"""

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
import yaml

REPO_ROOT = Path(__file__).resolve().parent.parent
PIPELINES_YAML = REPO_ROOT / "docs" / "architecture" / "pipelines.yaml"

GITHUB_API = "https://api.github.com"
TIMEOUT = 30

# Combien de runs récents on inspecte pour compter les échecs consécutifs.
# Fenêtre en NOMBRE de runs, donc de durée très variable : 30 heures pour un
# workflow bihoraire, quinze semaines pour un hebdomadaire. Quand elle est
# saturée d'échecs, elle ne dit plus rien du dernier succès — d'où le
# rattrapage ciblé de github_last_success().
RUNS_TO_INSPECT = 15

# Seules ces conclusions valent une panne. GitHub en renvoie d'autres —
# `cancelled`, `skipped`, `neutral` — qui ne disent RIEN sur la santé du
# pipeline : un run annulé à la main afficherait « en panne » et la première
# fausse alerte suffirait à décrédibiliser le bandeau. On les ignore comme on
# ignorerait un run encore en cours : ni succès, ni échec.
FAILING_CONCLUSIONS = {"failure", "timed_out", "action_required"}
DECISIVE_CONCLUSIONS = FAILING_CONCLUSIONS | {"success"}


def env_required(name):
    """Read a required environment variable or exit."""
    value = os.environ.get(name)
    if not value:
        print(f"FATAL: Missing required environment variable: {name}")
        sys.exit(1)
    return value


# ---------------------------------------------------------------------------
# Parsing
# ---------------------------------------------------------------------------

def parse_ts(raw):
    """Parse an ISO timestamp or a bare date into an aware UTC datetime.

    Les colonnes surveillées sont hétérogènes : `fetch_date` est un DATE nu
    ('2026-07-26'), `updated_at` un timestamptz. On ramène tout en UTC.
    """
    if not raw:
        return None
    text = str(raw).strip()
    if not text:
        return None
    try:
        if len(text) == 10 and text[4] == "-":
            dt = datetime.strptime(text, "%Y-%m-%d")
        else:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def load_pipelines():
    """Return the active pipelines and remote routines declaring a `health` contract.

    Les routines distantes vivent sous `external_routines:` — elles n'ont pas
    de `workflow_file` et sont marquées `remote: True` pour que le contrôle
    saute l'appel GitHub et juge sur la seule fraîcheur.
    """
    with open(PIPELINES_YAML, "r", encoding="utf-8") as fh:
        data = yaml.safe_load(fh)
    out = []
    for key, remote in (("pipelines", False), ("external_routines", True)):
        for p in data.get(key) or []:
            if not isinstance(p, dict) or not p.get("health"):
                continue
            if p.get("status") != "active":
                continue
            out.append({**p, "remote": remote})
    return out


# ---------------------------------------------------------------------------
# GitHub Actions
# ---------------------------------------------------------------------------

def github_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }


def github_runs(repo, token, workflow_file):
    """Fetch recent runs for a workflow, most recent first.

    Returns [] on any API problem — l'absence d'info donne le statut
    `unknown`, jamais une fausse alerte.
    """
    name = os.path.basename(workflow_file)
    url = f"{GITHUB_API}/repos/{repo}/actions/workflows/{name}/runs"
    try:
        resp = requests.get(
            url,
            headers=github_headers(token),
            params={"per_page": RUNS_TO_INSPECT},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"   ! API GitHub indisponible pour {name}: {exc}")
        return []
    # On ne garde que les runs qui tranchent : ni ceux encore en cours (pas de
    # conclusion), ni les annulés/ignorés (cf. DECISIVE_CONCLUSIONS).
    return [r for r in resp.json().get("workflow_runs", [])
            if r.get("conclusion") in DECISIVE_CONCLUSIONS]


def github_last_success(repo, token, workflow_file):
    """Date du dernier succès, SANS limite de fenêtre. None si aucun.

    Un appel ciblé (filtré côté GitHub, un seul run rendu), réservé au cas où
    la fenêtre d'inspection ne suffit plus — cf. collect_run_info().
    """
    name = os.path.basename(workflow_file)
    url = f"{GITHUB_API}/repos/{repo}/actions/workflows/{name}/runs"
    try:
        resp = requests.get(
            url,
            headers=github_headers(token),
            params={"status": "success", "per_page": 1},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"   ! Dernier succès introuvable pour {name}: {exc}")
        return None
    runs = resp.json().get("workflow_runs", [])
    if not runs:
        return None
    return runs[0].get("updated_at") or runs[0].get("created_at")


def summarize_runs(runs):
    """Condense a run list into the execution-side health fields."""
    if not runs:
        return {
            "last_run_at": None,
            "last_run_conclusion": None,
            "last_run_url": None,
            "last_success_at": None,
            "consecutive_failures": 0,
        }

    last = runs[0]
    success = next((r for r in runs if r.get("conclusion") == "success"), None)

    # Échecs consécutifs depuis le plus récent : on s'arrête au premier succès.
    consecutive = 0
    for run in runs:
        if run.get("conclusion") == "success":
            break
        consecutive += 1

    return {
        "last_run_at": last.get("updated_at") or last.get("created_at"),
        "last_run_conclusion": last.get("conclusion"),
        "last_run_url": last.get("html_url"),
        "last_success_at": (success.get("updated_at") or success.get("created_at")) if success else None,
        "consecutive_failures": consecutive,
    }


def collect_run_info(repo, token, workflow_file):
    """run_info d'un pipeline GitHub, fenêtre saturée comprise.

    Quand les RUNS_TO_INSPECT derniers runs sont TOUS des échecs, on ne sait
    pas si le pipeline n'a jamais réussi ou si son dernier succès est juste
    derrière la fenêtre — et écrire `last_success_at: null` affirme le premier.
    Le 2026-08-21, tft_sync était NULL en base alors que son dernier succès
    datait du 2026-04-24 : la ligne disait « n'a jamais marché » d'un pipeline
    qui a marché quatre mois. Un appel de rattrapage, uniquement dans ce cas.
    """
    info = summarize_runs(github_runs(repo, token, workflow_file))
    if info["last_success_at"] is None and info["consecutive_failures"] >= RUNS_TO_INSPECT:
        info["last_success_at"] = github_last_success(repo, token, workflow_file)
    return info


# ---------------------------------------------------------------------------
# Supabase
# ---------------------------------------------------------------------------

def supabase_headers(service_key):
    return {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Content-Type": "application/json",
    }


def _filter_params(filter_expr):
    """Convertit un fragment de requête PostgREST en params `requests`.

    'source=eq.anilist'              -> {'source': 'eq.anilist'}
    'source=in.(tmdb_tv,tmdb_movie)' -> {'source': 'in.(tmdb_tv,tmdb_movie)'}

    Découpage sur le PREMIER '=' seulement : la valeur d'un filtre PostgREST
    peut en contenir. Un fragment sans '=' est ignoré plutôt que de produire
    une requête bancale — la sonde vaut mieux large que fausse.
    """
    out = {}
    for part in str(filter_expr or "").split("&"):
        part = part.strip()
        if not part or "=" not in part:
            continue
        key, value = part.split("=", 1)
        key = key.strip()
        if key:
            out[key] = value.strip()
    return out


def data_freshness(url, service_key, table, date_column, filter_expr=None):
    """Return the most recent value of date_column, or None.

    `filter_expr` restreint la sonde aux lignes qu'écrit CE pipeline. Sans lui,
    une table à plusieurs écrivains rend la panne de l'un invisible : le
    2026-08-20, `anime_tracker_sync` mesurait `media_entries`, que
    `tmdb_tracker_sync` alimente aussi.
    """
    params = {
        "select": date_column,
        "order": f"{date_column}.desc.nullslast",
        "limit": 1,
    }
    params.update(_filter_params(filter_expr))
    try:
        resp = requests.get(
            f"{url}/rest/v1/{table}",
            headers=supabase_headers(service_key),
            params=params,
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"   ! Fraîcheur illisible sur {table}.{date_column}: {exc}")
        return None
    rows = resp.json()
    return parse_ts(rows[0].get(date_column)) if rows else None


def previous_degraded(url, service_key):
    """Les pipeline_id dégradés au contrôle PRÉCÉDENT. Doit être appelé AVANT
    l'upsert, qui écrase justement cet état.

    Pourquoi lire la table plutôt que tenir un état dédié : l'information est
    déjà là, à un GET de distance. Une colonne `alerted_at` ou une table
    d'historique demanderait une migration SQL pour ce qui se déduit de la
    ligne courante.

    Renvoie None — et non un ensemble vide — quand la lecture échoue : « je ne
    sais pas » et « rien n'était dégradé » ne doivent pas mener à la même
    conclusion, sinon une panne de Supabase notifierait comme *nouvelle*
    chaque brique déjà connue.
    """
    try:
        resp = requests.get(
            f"{url}/rest/v1/pipeline_health",
            headers=supabase_headers(service_key),
            params={"select": "pipeline_id", "status": "in.(failing,stale)"},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
    except requests.RequestException as exc:
        print(f"   ! État précédent illisible : {exc}")
        return None
    return {r.get("pipeline_id") for r in resp.json() if r.get("pipeline_id")}


def prune_health(url, service_key, known_ids):
    """Efface les lignes des pipelines absents du catalogue actif.

    Le catalogue est filtré sur `status: active` À LA LECTURE, mais la ligne
    déjà écrite survivait : un pipeline archivé ou passé en déclenchement
    manuel restait `failing` pour l'éternité dans le bandeau, sans plus aucun
    run pour le repasser au vert.

    Garde-fou : un catalogue vide (YAML illisible, clé renommée, erreur de
    parsing) ne doit surtout PAS vider la table. On ne supprime que si on sait
    ce qu'on garde.
    """
    ids = sorted({str(i) for i in known_ids if i})
    if not ids:
        print("   ! catalogue vide : aucun élagage (on ne purge pas à l'aveugle)")
        return []
    # Valeurs entre guillemets : forme documentée de PostgREST pour `in.()`,
    # qui évite qu'un id contenant une virgule casse la liste en deux.
    quoted = ",".join(f'"{i}"' for i in ids)
    headers = supabase_headers(service_key)
    headers["Prefer"] = "return=representation"
    try:
        resp = requests.delete(
            f"{url}/rest/v1/pipeline_health",
            headers=headers,
            params={"pipeline_id": f"not.in.({quoted})"},
            timeout=TIMEOUT,
        )
        resp.raise_for_status()
        removed = [r.get("pipeline_id") for r in (resp.json() or [])]
    except requests.RequestException as exc:
        print(f"   ! Élagage impossible : {exc}")
        return []
    except ValueError:
        # Réponse sans corps JSON : la suppression a eu lieu, on ne sait juste
        # pas nommer les lignes parties.
        return []
    return [r for r in removed if r]


def upsert_health(url, service_key, rows):
    """Upsert the health rows (conflict on pipeline_id)."""
    if not rows:
        return
    headers = supabase_headers(service_key)
    headers["Prefer"] = "resolution=merge-duplicates"
    resp = requests.post(
        f"{url}/rest/v1/pipeline_health",
        headers=headers,
        data=json.dumps(rows, default=str),
        timeout=TIMEOUT,
    )
    if resp.status_code not in (200, 201, 204):
        raise RuntimeError(
            f"Supabase upsert pipeline_health failed ({resp.status_code}): {resp.text}"
        )


# ---------------------------------------------------------------------------
# Verdict
# ---------------------------------------------------------------------------

def verdict(run_info, age_hours, max_age_hours, remote=False, has_probe=False,
            run_age_hours=None, max_run_age_hours=None):
    """Consolidate the three signals into one status.

    L'échec de run prime sur la péremption : si le pipeline plante, dire
    « données périmées » masquerait la cause réelle.

    `max_age_hours` absent = fraîcheur mesurée mais jamais sanctionnée. C'est
    ce qui permet de dater la panne d'un pipeline piloté par l'activité
    (Strava, TFT…) sans le déclarer en panne quand l'utilisateur n'a
    simplement rien fait cette semaine.

    `remote` = routine hors GitHub Actions (claude.ai) : il n'existe aucun run
    à interroger, donc la fraîcheur est le SEUL signal. Sans elle on ne sait
    rien, et `unknown` est la réponse honnête — c'est le seul cas où l'absence
    de run ne doit pas condamner la brique au silence perpétuel.

    `max_run_age_hours` = âge maximal toléré pour le DERNIER RUN, quelle que
    soit sa conclusion. Sans lui, un pipeline dont le cron cesse d'être
    déclenché reste `ok` à vie : les deux autres signaux ne regardent que la
    conclusion du dernier run (verte, mais datée) et une table (que ce
    pipeline-là n'écrit pas forcément). Seuil optionnel, parce que la plupart
    des pipelines n'en ont pas besoin — leur silence se voit déjà dans leur
    table.

    Pourquoi `stale` et non `failing` quand il est dépassé : rien n'a échoué,
    et c'est précisément le problème. `failing` promet un run rouge à ouvrir,
    qui n'existe pas. `stale` dit déjà, dans ce fichier, « vert sur le papier
    et muet en vrai » — c'est exactement le cas.
    """
    if remote:
        if not has_probe or age_hours is None:
            return "unknown"
        if max_age_hours is not None and age_hours > max_age_hours:
            return "stale"
        return "ok"

    conclusion = run_info["last_run_conclusion"]
    if conclusion is None:
        return "unknown"
    if conclusion in FAILING_CONCLUSIONS:
        return "failing"
    # L'âge du run avant la péremption de la table : quand plus rien ne tourne,
    # la table qui ne bouge plus en est la conséquence, pas la cause.
    if (max_run_age_hours is not None and run_age_hours is not None
            and run_age_hours > max_run_age_hours):
        return "stale"
    if max_age_hours is not None and age_hours is not None and age_hours > max_age_hours:
        return "stale"
    return "ok"


def build_row(pipe, run_info, last_seen, age_hours, status, now, run_age_hours=None):
    """Compose la ligne upsertée. Extrait de main() pour être testable seul."""
    health = pipe.get("health") or {}
    table = health.get("table")

    # `last_error` reste court et lisible : le détail vit dans le run GitHub.
    last_error = None
    if status == "failing":
        n = run_info["consecutive_failures"]
        # On n'inspecte que RUNS_TO_INSPECT runs : au plafond, on ne sait pas
        # combien il y en a eu avant. Dire « 15 » serait un chiffre faux.
        count = f"au moins {n}" if n >= RUNS_TO_INSPECT else str(n)
        last_error = f"Dernier run : {run_info['last_run_conclusion']} ({count} échec{'s' if n > 1 else ''} d'affilée)"
    elif status == "stale":
        max_run_age = health.get("max_run_age_hours")
        if (max_run_age is not None and run_age_hours is not None
                and run_age_hours > max_run_age):
            # Ni run rouge ni table à incriminer : c'est le déclencheur qui a
            # disparu. Le dire explicitement, sinon on cherche la panne dans
            # le script alors qu'il n'a simplement jamais été lancé.
            last_error = (f"Aucun run depuis {run_age_hours} h "
                          f"(seuil : {max_run_age} h) — le cron ne se déclenche plus")
        elif pipe.get("remote"):
            # Pas de run à incriminer : la seule chose qu'on sache est le silence.
            last_error = f"Aucune écriture dans {table} depuis {age_hours} h"
        else:
            last_error = f"Runs au vert mais {table} n'a rien reçu depuis {age_hours} h"

    return {
        "pipeline_id": pipe["id"],
        "label": pipe.get("name") or pipe["id"],
        "domain": health.get("domain"),
        "panels": health.get("panels") or [],
        "remediation": health.get("remediation"),
        "impact": health.get("impact"),
        "last_run_at": run_info["last_run_at"],
        "last_run_conclusion": run_info["last_run_conclusion"],
        "last_run_url": run_info["last_run_url"],
        "last_success_at": run_info["last_success_at"],
        "consecutive_failures": run_info["consecutive_failures"],
        "last_error": last_error,
        "data_last_seen": last_seen,
        "data_age_hours": age_hours,
        "max_age_hours": health.get("max_age_hours"),
        "status": status,
        "checked_at": now,
    }


ALERT_TITLE = "[pipelines] Pipelines dégradés"
ALERT_MARKER = "<!-- pipeline-health-alert -->"


def _gh(method, repo, token, path, **kwargs):
    """Appel GitHub API. Renvoie None sur problème — jamais d'exception ici :
    l'alerte est un service rendu au run, elle ne doit pas le faire échouer."""
    try:
        resp = requests.request(
            method,
            f"{GITHUB_API}/repos/{repo}{path}",
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=TIMEOUT,
            **kwargs,
        )
        resp.raise_for_status()
        return resp.json()
    except requests.RequestException as exc:
        print(f"   ! Alerte GitHub indisponible ({method} {path}) : {exc}")
        return None


def transition_comment(rows, entered, left):
    """Le commentaire qui dit ce qui a CHANGÉ — pas le tableau, il est juste
    au-dessus dans le corps de l'issue, et le répéter noierait la nouvelle."""
    by_id = {r["pipeline_id"]: r for r in rows}
    lines = []
    if entered:
        lines.append(f"**{len(entered)} pipeline(s) viennent de se dégrader :**")
        for pid in entered:
            r = by_id.get(pid, {})
            lines.append(f"- `{pid}` — {r.get('last_error') or r.get('status') or '?'}")
    if left:
        if lines:
            lines.append("")
        lines.append(f"**{len(left)} pipeline(s) sont repassés au vert :** "
                     + ", ".join(f"`{p}`" for p in left))
    lines += ["", "Le tableau complet est dans le corps de l'issue, réécrit à chaque contrôle."]
    return "\n".join(lines)


def sync_alert_issue(repo, token, rows, degraded, previously_degraded=None):
    """Tient à jour UNE issue GitHub qui reflète l'état dégradé du moment.

    Pourquoi ici plutôt que dans chaque workflow : un hook `if: failure()` ne
    voit que les runs rouges. La panne qui s'est cachée cinq semaines
    (weekly_analysis, crédit Anthropic épuisé) sortait **verte** — seul le
    statut `stale`, calculé ici, la voyait. L'alerte doit donc vivre là où les
    deux cas sont connus.

    Une seule issue, dont le corps est réécrit à chaque passage : le cron est
    quotidien, commenter à chaque contrôle produirait 365 notifications par an.

    Mais GitHub ne notifie QUE sur création et sur commentaire — réécrire un
    corps ne prévient personne. L'issue #9, ouverte le 17/08 et parfaitement
    exacte, listait six pipelines dégradés sans avoir alerté qui que ce soit :
    la panne du 18/08 n'a été vue par personne. L'anti-spam avait rendu
    l'alerte silencieuse au point de ne plus alerter.

    D'où le commentaire de TRANSITION : on commente une fois, quand l'ENSEMBLE
    des pipelines dégradés change (un id y entre ou en sort), zéro le reste du
    temps. Le cron reste quotidien, la notification redevient un événement.
    `previously_degraded=None` = état précédent inconnu : on ne commente pas,
    faute de savoir ce qui a bougé.
    """
    existing = _gh("GET", repo, token, "/issues",
                   params={"state": "open", "per_page": 100})
    if existing is None:
        return
    issue = next((i for i in existing
                  if i.get("title") == ALERT_TITLE and "pull_request" not in i), None)

    if not degraded:
        if issue:
            _gh("POST", repo, token, f"/issues/{issue['number']}/comments",
                json={"body": "Tous les pipelines sont repassés au vert. Fermeture automatique."})
            _gh("PATCH", repo, token, f"/issues/{issue['number']}", json={"state": "closed"})
            print("   ✓ alerte fermée (plus aucun pipeline dégradé)")
        return

    by_id = {r["pipeline_id"]: r for r in rows}
    lines = [
        ALERT_MARKER,
        f"**{len(degraded)} pipeline(s) dégradé(s)** au dernier contrôle.",
        "",
        "| Pipeline | Statut | Cause | Run |",
        "|---|---|---|---|",
    ]
    for pid in degraded:
        r = by_id.get(pid, {})
        url = r.get("last_run_url") or ""
        link = f"[voir]({url})" if url else "—"
        lines.append(f"| `{pid}` | {r.get('status', '?')} | {r.get('last_error') or '—'} | {link} |")
    lines += [
        "",
        "`failing` = le run échoue. `stale` = **le run est vert mais la table n'a rien reçu** —",
        "c'est le cas qu'aucune alerte d'échec classique ne peut voir.",
        "",
        "Cette issue est réécrite à chaque contrôle quotidien et se ferme d'elle-même",
        "quand tout repasse au vert. Un commentaire — la seule chose qui notifie —",
        "n'est ajouté que lorsque la liste ci-dessus change.",
    ]
    body = "\n".join(lines)

    entered, left = [], []
    if previously_degraded is not None:
        before = set(previously_degraded)
        entered = [p for p in degraded if p not in before]
        left = sorted(before - set(degraded))

    if issue:
        _gh("PATCH", repo, token, f"/issues/{issue['number']}", json={"body": body})
        if entered or left:
            _gh("POST", repo, token, f"/issues/{issue['number']}/comments",
                json={"body": transition_comment(rows, entered, left)})
            print(f"   ✓ transition signalée (issue #{issue['number']}) : "
                  f"+{len(entered)} / -{len(left)}")
        else:
            print(f"   ✓ alerte mise à jour (issue #{issue['number']}) — "
                  "ensemble inchangé, personne n'est notifié")
    else:
        # Créer l'issue notifie déjà : pas de commentaire de transition en plus.
        created = _gh("POST", repo, token, "/issues",
                      json={"title": ALERT_TITLE, "body": body})
        if created:
            print(f"   ✓ alerte ouverte (issue #{created['number']})")


def main():
    dry_run = "--dry-run" in sys.argv

    supabase_url = env_required("SUPABASE_URL").rstrip("/")
    service_key = env_required("SUPABASE_SERVICE_KEY")
    gh_token = env_required("GITHUB_TOKEN")
    repo = env_required("GITHUB_REPOSITORY")

    pipelines = load_pipelines()
    print("=" * 60)
    print("🩺 SANTÉ DES PIPELINES")
    print(f"   Repo : {repo}")
    print(f"   {len(pipelines)} pipelines actifs sous surveillance")
    print("=" * 60)

    now = datetime.now(timezone.utc)
    rows = []
    degraded = []

    for pipe in pipelines:
        pid = pipe["id"]
        health = pipe["health"]
        remote = pipe.get("remote", False)

        # Une routine distante n'a pas de run GitHub : l'interroger renverrait
        # systématiquement une liste vide et coûterait un appel API pour rien.
        run_info = (summarize_runs([]) if remote
                    else collect_run_info(repo, gh_token, pipe.get("workflow_file", "")))

        # Âge du dernier run, quelle que soit sa conclusion : le seul signal
        # qui reste quand un cron cesse d'être déclenché.
        last_run_at = parse_ts(run_info["last_run_at"])
        run_age_hours = (round((now - last_run_at).total_seconds() / 3600, 1)
                         if last_run_at else None)

        # Fraîcheur — uniquement si le pipeline est censé écrire à chaque run.
        table = health.get("table")
        date_column = health.get("date_column")
        has_probe = bool(table and date_column)
        last_seen = age_hours = None
        if has_probe:
            last_seen = data_freshness(supabase_url, service_key, table, date_column,
                                       health.get("filter"))
            if last_seen:
                age_hours = round((now - last_seen).total_seconds() / 3600, 1)

        status = verdict(run_info, age_hours, health.get("max_age_hours"),
                         remote=remote, has_probe=has_probe,
                         run_age_hours=run_age_hours,
                         max_run_age_hours=health.get("max_run_age_hours"))

        row = build_row(pipe, run_info, last_seen, age_hours, status, now,
                        run_age_hours=run_age_hours)
        rows.append(row)
        last_error = row["last_error"]

        icon = {"ok": "✅", "failing": "🔴", "stale": "🟠", "unknown": "⚪"}[status]
        detail = f" — {last_error}" if last_error else ""
        print(f"{icon} {pid:22} {status:8}{detail}")
        if status in ("failing", "stale"):
            degraded.append(pid)

    previously = None
    if dry_run:
        print("\n[dry-run] aucune écriture en base")
    else:
        # Impérativement AVANT l'upsert, qui écrase l'état précédent : c'est
        # lui qui dit si l'ensemble dégradé a changé, donc s'il faut notifier.
        previously = previous_degraded(supabase_url, service_key)
        upsert_health(supabase_url, service_key, rows)
        print(f"\n✓ {len(rows)} lignes écrites dans pipeline_health")
        removed = prune_health(supabase_url, service_key,
                               [r["pipeline_id"] for r in rows])
        if removed:
            print(f"✓ {len(removed)} ligne(s) élaguée(s) : {', '.join(removed)}")

    print(f"\n{len(degraded)} pipeline(s) dégradé(s)" + (f" : {', '.join(degraded)}" if degraded else ""))

    # Canal d'alerte hors cockpit. Le bandeau front existe déjà mais s'affiche
    # sur l'onglet propriétaire du pipeline — donc, pour les pipelines en panne,
    # sur des onglets désertés. Une issue GitHub se voit sans ouvrir le cockpit.
    if dry_run:
        print("[dry-run] alerte GitHub non synchronisée")
    else:
        sync_alert_issue(repo, gh_token, rows, degraded,
                         previously_degraded=previously)

    # Sortie 0 même en cas de pipeline dégradé : ce workflow rapporte l'état,
    # il n'échoue pas à cause de l'état qu'il rapporte. Sinon on remplacerait
    # un échec silencieux par un autre.
    return 0


if __name__ == "__main__":
    sys.exit(main())
