# Withings Integration — Setup Guide

## Prerequisites

1. A Withings account with at least one measurement synced (weight, composition…)
2. A Withings Developer app (create at https://developer.withings.com/dashboard/)
   - Callback URL: `http://localhost:8000/callback`
   - Note your **Client ID** and **Consumer Secret** (= Client Secret)

## Step 1 — Get your refresh token (one-time)

Run the OAuth script locally:

```bash
cd jarvis-cockpit
python scripts/withings_oauth_init.py
```

The script:
- Reads your Client ID and Client Secret from `Config.txt` (if present) or prompts for them
- Opens your browser on the Withings consent screen
- Captures the callback code and exchanges it for a refresh token
- Prints your `WITHINGS_REFRESH_TOKEN` (et un `WITHINGS_USER_ID` purement informatif : **aucun pipeline ne le lit**, n'en faites pas un secret)

If you want to automate, create `Config.txt` at the repo root:
```
WITHINGS_CLIENT_ID=your_id
WITHINGS_CLIENT_SECRET=your_secret
```

## Step 2 — Add GitHub Secrets

Repo settings → Secrets and variables → Actions → New repository secret.

Add these 3 secrets:

| Secret | Value |
|---|---|
| `WITHINGS_CLIENT_ID` | Your Withings app Client ID |
| `WITHINGS_CLIENT_SECRET` | Your Withings app Consumer Secret |
| `WITHINGS_REFRESH_TOKEN` | The token printed in Step 1 |

The workflow also uses the existing `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`.

⚠️ `WITHINGS_REFRESH_TOKEN` est à **usage unique** : le premier run le consomme
et bascule la chaîne sur `user_profile.withings_refresh_token`. Voir
[Token refresh](#token-refresh).

## Step 3 — Initial backfill

**Obligatoire, et pas seulement à la première installation** : un run normal
n'interroge que les `INCREMENTAL_DAYS = 7` derniers jours. Après une coupure,
tout ce qui précède cette fenêtre serait sauté définitivement — alors que
Withings conserve l'historique côté serveur. Attendre le cron ne suffit pas.

Trigger a full history sync:

1. Actions tab → **"Withings — Measurements Sync"**
2. Run workflow → Set `backfill` to `true` → Run workflow
3. Wait ~30 seconds

## Step 4 — Verify

```sql
SELECT measure_date, weight_kg, fat_pct, muscle_mass_kg, hydration_kg
FROM withings_measurements ORDER BY measure_date DESC LIMIT 10;
```

The cockpit's Forme panel will automatically show the Composition section
and the trend charts once at least one row is present.

## Automatic schedule

The workflow runs daily at **4:45 UTC** (6:45 Paris), between the Strava
(4:30) and Last.fm (5:00) syncs. It pulls the last 7 days incrementally.

## Measure types synced

| Withings type | Column | Unit |
|---|---|---|
| 1 | `weight_kg` | kg |
| 6 | `fat_pct` | % |
| 8 | `fat_mass_kg` | kg |
| 76 | `muscle_mass_kg` | kg |
| 77 | `hydration_kg` | kg |
| 88 | `bone_mass_kg` | kg |

Multiple pesées the same day are collapsed to one row — the column-level
latest value wins (not an average).

## Dry-run mode

```bash
export WITHINGS_CLIENT_ID=...
export WITHINGS_CLIENT_SECRET=...
export WITHINGS_REFRESH_TOKEN=...
export SUPABASE_URL=...
export SUPABASE_SERVICE_KEY=...

python pipelines/withings_sync.py --dry-run
```

## Token refresh

Withings fait tourner le refresh_token à **chaque** appel et invalide
l'ancien **immédiatement**. Il n'existe **aucune période de grâce**.

> ⚠️ Cette page a affirmé le contraire — « Withings keeps the previous token
> valid for a grace period (usually days) » — et c'est cette phrase qui a tué
> le pipeline. `withings_sync.py` jetait le token tourné en s'appuyant dessus :
> un seul run réussi le 2026-04-23, puis `invalid refresh_token` tous les jours
> jusqu'au 2026-08-25. Corrigé dans le code le 2026-07-26 ; corrigé ici le
> 2026-08-25. Voir ADR-45 et [ADR-49](architecture/decisions.md).

Fonctionnement réel :

1. Le pipeline lit `user_profile.withings_refresh_token` (Supabase) et se
   rabat sur le secret `WITHINGS_REFRESH_TOKEN` seulement s'il n'y a rien.
2. Il échange le token, puis **écrit immédiatement** le nouveau en base —
   *avant* d'aller chercher les mesures, pour qu'un échec de récupération
   n'emporte pas le token avec lui.
3. Si cette écriture échoue, le run **lève** au lieu d'avertir : le token
   venant d'être consommé, un échec silencieux reproduirait la panne.

**Le secret GitHub ne vaut donc que pour le premier run** suivant une
(ré)autorisation. Ensuite, la source de vérité est Supabase — il est normal
et attendu que le secret devienne périmé.

**Ne rejouez pas `withings_oauth_init.py` tant que la chaîne tourne** : cela
invaliderait le token en base et rouvrirait la panne.

Symptôme d'un token mort — noter le **503**, pas un 401 :

```
RuntimeError: Withings token refresh failed (status=503):
{"status": 503, "body": {}, "error": "Invalid Params: invalid refresh_token"}
```

Remède : rejouer `python scripts/withings_oauth_init.py`, remettre le secret,
puis **relancer le workflow avec `backfill=true`** (étape 3) — un run normal
ne regarde que les 7 derniers jours et sauterait tout le trou.

## Rate limits

Withings allows 120 requests per minute per IP. One cron run = 2 requests
(1 token refresh + 1 getmeas). Comfortable margin.
