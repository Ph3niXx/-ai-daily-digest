#!/usr/bin/env python3
"""
One-shot script to complete the Withings OAuth2 flow.

Launches a local HTTP server, opens the browser for authorization,
captures the callback code, and exchanges it for tokens.

Output: WITHINGS_REFRESH_TOKEN a poser en secret GitHub (WITHINGS_USER_ID est
affiche a titre informatif : aucun pipeline ne le lit).

Dependencies: stdlib only (no pip install needed).

Withings API docs: https://developer.withings.com/api-reference/
"""

import http.server
import json
import os
import sys
import threading
import urllib.parse
import urllib.request
import webbrowser

WITHINGS_AUTH_URL = "https://account.withings.com/oauth2_user/authorize2"
WITHINGS_TOKEN_URL = "https://wbsapi.withings.net/v2/oauth2"
REDIRECT_URI = "http://localhost:8000/callback"
SCOPES = "user.metrics"


def read_config_txt():
    """Try to read client_id and client_secret from Config.txt at repo root."""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "Config.txt")
    config = {}
    if not os.path.exists(config_path):
        return config
    with open(config_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                key, _, value = line.partition("=")
                config[key.strip()] = value.strip()
    return config


def get_credentials():
    """Get Withings client_id and client_secret from Config.txt or user input."""
    config = read_config_txt()

    client_id = config.get("WITHINGS_CLIENT_ID") or os.environ.get("WITHINGS_CLIENT_ID")
    client_secret = config.get("WITHINGS_CLIENT_SECRET") or os.environ.get("WITHINGS_CLIENT_SECRET")

    if not client_id:
        client_id = input("Enter your Withings client_id: ").strip()
    if not client_secret:
        client_secret = input("Enter your Withings client_secret: ").strip()

    if not client_id or not client_secret:
        print("ERROR: client_id and client_secret are required.")
        sys.exit(1)

    return client_id, client_secret


def exchange_code(client_id, client_secret, code):
    """Exchange authorization code for access/refresh tokens.

    Withings wraps the token response in { status, body }.
    status=0 means success. Any other status is an error.
    """
    data = urllib.parse.urlencode({
        "action": "requesttoken",
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": REDIRECT_URI,
    }).encode("utf-8")

    req = urllib.request.Request(WITHINGS_TOKEN_URL, data=data, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with urllib.request.urlopen(req) as resp:
        result = json.loads(resp.read().decode("utf-8"))

    status = result.get("status", -1)
    if status != 0:
        raise RuntimeError(
            f"Withings token exchange failed (status={status}): {json.dumps(result, indent=2)}"
        )
    return result.get("body", {})


def test_measure_access(access_token):
    """Verify the token can actually read measurements."""
    data = urllib.parse.urlencode({
        "action": "getmeas",
        "meastypes": "1",
        "lastupdate": "0",
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://wbsapi.withings.net/measure",
        data=data,
        method="POST",
    )
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    try:
        with urllib.request.urlopen(req) as resp:
            result = json.loads(resp.read().decode("utf-8"))
            return result.get("status") == 0, result
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        return False, body


class CallbackHandler(http.server.BaseHTTPRequestHandler):
    """HTTP handler that captures the OAuth callback."""

    auth_code = None
    error = None

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path != "/callback":
            self.send_response(404)
            self.end_headers()
            return

        params = urllib.parse.parse_qs(parsed.query)

        if "error" in params:
            CallbackHandler.error = params["error"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(b"<h1>Authorization denied.</h1><p>You can close this tab.</p>")
        elif "code" in params:
            CallbackHandler.auth_code = params["code"][0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            self.wfile.write(
                b"<h1>Authorization successful!</h1>"
                b"<p>Return to the terminal to see your tokens. You can close this tab.</p>"
            )
        else:
            self.send_response(400)
            self.end_headers()

    def log_message(self, format, *args):
        """Suppress default HTTP request logging."""
        pass


def main():
    print("=" * 60)
    print("  Withings OAuth2 — Token Generator")
    print("=" * 60)
    print()

    client_id, client_secret = get_credentials()

    auth_params = urllib.parse.urlencode({
        "response_type": "code",
        "client_id": client_id,
        "scope": SCOPES,
        "redirect_uri": REDIRECT_URI,
        "state": "cockpit",
    })
    auth_url = f"{WITHINGS_AUTH_URL}?{auth_params}"

    # Start local server
    server = http.server.HTTPServer(("localhost", 8000), CallbackHandler)
    server_thread = threading.Thread(target=server.handle_request, daemon=True)
    server_thread.start()

    print(f"Opening browser for Withings authorization...")
    print(f"If the browser doesn't open, visit:\n  {auth_url}\n")
    webbrowser.open(auth_url)

    print("Waiting for callback on http://localhost:8000/callback ...")
    server_thread.join(timeout=180)
    server.server_close()

    if CallbackHandler.error:
        print(f"\nERROR: Authorization denied by user: {CallbackHandler.error}")
        sys.exit(1)

    if not CallbackHandler.auth_code:
        print("\nERROR: No authorization code received (timeout after 180s).")
        sys.exit(1)

    print(f"Authorization code received. Exchanging for tokens...")

    body = exchange_code(client_id, client_secret, CallbackHandler.auth_code)

    refresh_token = body.get("refresh_token")
    access_token = body.get("access_token")
    user_id = body.get("userid")

    if not refresh_token:
        print(f"\nERROR: No refresh_token in response: {json.dumps(body, indent=2)}")
        sys.exit(1)

    print("Testing user.metrics permission...")
    ok, result = test_measure_access(access_token)
    if ok:
        n = len(result.get("body", {}).get("measuregrps", []))
        print(f"  OK — token can read measurements ({n} groups returned in test)")
    else:
        print()
        print("!" * 60)
        print("  FAILED — token CANNOT read measurements!")
        print(f"  Withings response: {result}")
        print()
        print("  The authorization did not include user.metrics scope.")
        print("  Re-run this script and make sure the consent screen")
        print("  shows 'Access weight, body composition, activity'.")
        print("!" * 60)
        sys.exit(1)

    print()
    print("=" * 60)
    print("  ETAPE 1 — poser ce secret GitHub")
    print("=" * 60)
    print()
    print(f"  User ID : {user_id}   (informatif — AUCUN secret a creer avec)")
    print(f"  Scopes  : user.metrics OK")
    print()
    print(f"  WITHINGS_REFRESH_TOKEN={refresh_token}")
    print()
    print("  Settings > Secrets and variables > Actions > New repository secret")
    print()
    print("  Ces deux-la doivent deja exister (app developpeur Withings) :")
    print(f"  WITHINGS_CLIENT_ID={client_id}")
    print(f"  WITHINGS_CLIENT_SECRET=<votre_secret>")
    print()
    print("=" * 60)
    print("  ETAPE 2 — lancer le workflow avec backfill=true")
    print("=" * 60)
    print()
    print("  gh workflow run withings-sync.yml -f backfill=true")
    print()
    print("  NE PAS SAUTER, et ne pas se contenter d'attendre le cron : un run")
    print("  normal n'interroge que les INCREMENTAL_DAYS = 7 derniers jours.")
    print("  Tout ce qui precede cette fenetre serait saute definitivement,")
    print("  alors que Withings conserve l'historique cote serveur.")
    print()
    print("=" * 60)
    print("  A SAVOIR — le secret ci-dessus ne sert qu'UNE fois")
    print("=" * 60)
    print()
    print("  Withings fait tourner le refresh_token a CHAQUE appel et invalide")
    print("  l'ancien aussitot. Le secret GitHub n'est donc valable que pour le")
    print("  tout premier run ; ensuite la source de verite est la ligne")
    print("  user_profile.withings_refresh_token dans Supabase, que le pipeline")
    print("  reecrit a chaque rotation (avant de recuperer les mesures, pour")
    print("  qu'un echec de recuperation ne l'emporte pas avec lui).")
    print()
    print("  Ne pas rejouer ce script tant que la chaine tourne : cela")
    print("  invaliderait le token en base et rouvrirait la panne.")
    print()
    print("  C'est l'absence de cette persistance qui a tue le pipeline du")
    print("  2026-04-23 au 2026-08-25 — un seul run reussi, puis rien.")
    print()
    print("=" * 60)


if __name__ == "__main__":
    main()
