# Strava Integration — Setup Guide

> **⏸ Intégration en pause depuis le 2026-08-25 (ADR-48).** Les appels à l'API
> Strava sont devenus réservés aux abonnés payants : l'application est `Inactive`
> côté portail et tout `/api/v3/*` répond `403 resource: Application /
> field: Status / code: Inactive`. Le cron a été retiré ; le workflow reste
> lançable en `workflow_dispatch`.
>
> **Ne recommencez pas l'étape 1 pour réparer ça.** Le grant OAuth est intact —
> `refresh_access_token()` renvoie toujours HTTP 200 — et les trois secrets
> GitHub restent valides. Rejouer `strava_oauth_init.py` ne changera rien tant
> que l'accès API n'est pas rétabli : il faut un abonnement Strava, puis
> réactiver l'application sur https://www.strava.com/settings/api.
>
> Ce guide reste juste pour une première installation, ou pour la reprise une
> fois l'accès rétabli.

## Prerequisites

1. A Strava account with activities
2. A Strava API Application (create at https://www.strava.com/settings/api)
   - Authorization Callback Domain: `localhost`
   - Note your **Client ID** and **Client Secret**

## Step 1 — Get your refresh token (one-time)

Run the OAuth script locally:

```bash
cd jarvis-cockpit
python scripts/strava_oauth_init.py
```

The script will:
- Ask for your Client ID and Client Secret (or read them from `Config.txt` if present)
- Open your browser to authorize the app on Strava
- Display your `STRAVA_REFRESH_TOKEN` and `STRAVA_ATHLETE_ID`

If you have a `Config.txt` at the repo root with these keys, the script reads them automatically:
```
STRAVA_CLIENT_ID=12345
STRAVA_CLIENT_SECRET=abc123...
```

## Step 2 — Add GitHub Secrets

Go to your repo: **Settings > Secrets and variables > Actions > New repository secret**

Add these 3 secrets:

| Secret | Value |
|---|---|
| `STRAVA_CLIENT_ID` | Your Strava app Client ID |
| `STRAVA_CLIENT_SECRET` | Your Strava app Client Secret |
| `STRAVA_REFRESH_TOKEN` | The token from Step 1 |

The pipeline also uses `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` which should already exist.

## Step 3 — Trigger a manual run

1. Go to **Actions** tab in the repo
2. Click **"Strava — Activity Sync"** in the left sidebar
3. Click **"Run workflow"** > **"Run workflow"**
4. Wait for it to complete (~1-2 minutes)

## Step 4 — Verify

Check that data arrived in Supabase:

```sql
-- Raw payloads
SELECT id, athlete_id, fetched_at FROM strava_activities_raw ORDER BY fetched_at DESC LIMIT 5;

-- Mapped activities
SELECT id, name, sport_type, start_date, distance_m, moving_time_s, average_heartrate
FROM strava_activities ORDER BY start_date DESC LIMIT 10;
```

## Automatic schedule

The workflow runs daily at **4:30 UTC** (6:30 Paris). It fetches activities from the last 7 days and upserts them (no duplicates).

## Dry-run mode

To test locally without writing to Supabase:

```bash
export STRAVA_CLIENT_ID=...
export STRAVA_CLIENT_SECRET=...
export STRAVA_REFRESH_TOKEN=...
export SUPABASE_URL=...
export SUPABASE_SERVICE_KEY=...

python pipelines/strava_sync.py --dry-run
```

## Rate limits

Strava allows 100 requests per 15 minutes and 1000 per day. The pipeline sleeps 1s between detail calls. With 30 activities max per run, this stays well within limits.

## Token refresh

The Strava refresh_token is long-lived — it doesn't expire as long as you don't revoke the app. The pipeline automatically exchanges it for a fresh access_token on each run. No manual intervention needed.
