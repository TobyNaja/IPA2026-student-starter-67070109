"""Point this bot's Webex webhooks at the current tunnel URL.

Quick Tunnel hostnames change on every restart, so the registrations in
Webex have to follow. Run once after starting the tunnel, or with
--watch to keep them in step automatically.
"""

import argparse
import os
import re
import subprocess
import time

import requests

WEBEX_API_BASE = "https://webexapis.com/v1"

REQUEST_TIMEOUT = 10

ROOM_TITLES = ("IPA2026", "IPA2026 Exam Room")

WEBHOOK_NAME_PREFIX = "ipa2026-mentions"

TUNNEL_URL_PATTERN = re.compile(r"https://[a-z0-9][a-z0-9-]*\.trycloudflare\.com")

DEFAULT_METRICS_URL = "http://127.0.0.1:2000"

POLL_SECONDS = 15


def load_env_file(path=".env"):
    """Read KEY=VALUE lines from .env without overriding the real environment."""
    try:
        with open(path, encoding="utf-8") as handle:
            lines = handle.read().splitlines()
    except OSError:
        return

    for line in lines:
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def read_token():
    token = os.environ.get("WEBEX_BOT_TOKEN")
    if not token:
        raise SystemExit("WEBEX_BOT_TOKEN is not set; put it in .env")
    return token


def webex(session, method, path, **kwargs):
    """Call the Webex API and return decoded JSON, or None for 204."""
    response = session.request(
        method,
        f"{WEBEX_API_BASE}{path}",
        timeout=REQUEST_TIMEOUT,
        **kwargs,
    )
    response.raise_for_status()
    if not response.content:
        return None
    return response.json()


def url_from_metrics(metrics_url):
    """Ask a running cloudflared for the hostname it was handed."""
    try:
        response = requests.get(
            f"{metrics_url.rstrip('/')}/quicktunnel",
            timeout=5,
        )
        response.raise_for_status()
        hostname = response.json().get("hostname", "")
    except (requests.RequestException, ValueError):
        return None

    if not hostname:
        return None
    if hostname.startswith("http"):
        return hostname.rstrip("/")
    return f"https://{hostname}"


def url_from_compose_logs(service):
    """Fall back to the banner cloudflared prints on startup."""
    try:
        completed = subprocess.run(
            ["docker", "compose", "logs", "--no-color", "--tail", "800", service],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except (OSError, subprocess.SubprocessError):
        return None

    found = TUNNEL_URL_PATTERN.findall(completed.stdout + completed.stderr)
    return found[-1] if found else None


def discover_tunnel_url(args):
    """Resolve the public base URL from the most reliable source available."""
    if args.url:
        return args.url.rstrip("/")

    from_env = os.environ.get("TUNNEL_URL")
    if from_env:
        return from_env.rstrip("/")

    metrics_url = os.environ.get("TUNNEL_METRICS_URL", DEFAULT_METRICS_URL)
    return url_from_metrics(metrics_url) or url_from_compose_logs(args.service)


def find_room_ids(session):
    """Map the two required room titles to their roomId."""
    rooms = webex(session, "GET", "/rooms", params={"max": 1000})["items"]
    by_title = {room.get("title"): room.get("id") for room in rooms}

    missing = [title for title in ROOM_TITLES if title not in by_title]
    if missing:
        visible = ", ".join(sorted(t for t in by_title if t)) or "(none)"
        raise SystemExit(
            "the bot is not a member of: "
            + ", ".join(missing)
            + f"\nrooms it can see: {visible}"
            + "\nadd the bot to both rooms with its bot email, then rerun"
        )

    return [(title, by_title[title]) for title in ROOM_TITLES]


def sync_webhooks(session, base_url, rooms):
    """Create, update or replace one messages/created webhook per room."""
    target_url = f"{base_url}/webhook"
    listed = webex(session, "GET", "/webhooks", params={"max": 100})["items"]
    existing = {hook.get("name"): hook for hook in listed}

    for title, room_id in rooms:
        name = f"{WEBHOOK_NAME_PREFIX} {title}"
        wanted_filter = f"roomId={room_id}"
        payload = {
            "name": name,
            "targetUrl": target_url,
            "resource": "messages",
            "event": "created",
            "filter": wanted_filter,
        }
        current = existing.get(name)

        if current is None:
            webex(session, "POST", "/webhooks", json=payload)
            print(f"created  {name} -> {target_url}")
            continue

        stale_filter = (
            current.get("filter") != wanted_filter
            or current.get("resource") != "messages"
            or current.get("event") != "created"
        )
        if stale_filter:
            # Webex cannot change a webhook's filter in place.
            webex(session, "DELETE", f"/webhooks/{current['id']}")
            webex(session, "POST", "/webhooks", json=payload)
            print(f"replaced {name} -> {target_url}")
            continue

        if (
            current.get("targetUrl") == target_url
            and current.get("status") == "active"
        ):
            print(f"ok       {name} -> {target_url}")
            continue

        # An update must carry name and targetUrl together.
        webex(
            session,
            "PUT",
            f"/webhooks/{current['id']}",
            json={"name": name, "targetUrl": target_url},
        )
        print(f"updated  {name} -> {target_url}")


def run_once(session, args):
    base_url = discover_tunnel_url(args)
    if base_url is None:
        raise SystemExit(
            "could not find the tunnel URL\n"
            "start the tunnel first, or pass --url https://<name>.trycloudflare.com"
        )

    sync_webhooks(session, base_url, find_room_ids(session))
    return base_url


def watch(session, args):
    """Re-register whenever the tunnel hands out a different hostname."""
    last = None
    while True:
        try:
            base_url = discover_tunnel_url(args)
            if base_url and base_url != last:
                sync_webhooks(session, base_url, find_room_ids(session))
                last = base_url
            elif base_url is None:
                print("waiting for the tunnel URL", flush=True)
        except requests.RequestException as error:
            print(f"webex call failed, will retry: {error}", flush=True)
        time.sleep(args.interval)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", help="public base URL, without /webhook")
    parser.add_argument(
        "--service",
        default="tunnel",
        help="compose service to read the URL from (default: tunnel)",
    )
    parser.add_argument(
        "--watch",
        action="store_true",
        help="keep running and re-register when the URL changes",
    )
    parser.add_argument(
        "--interval",
        type=int,
        default=POLL_SECONDS,
        help=f"seconds between checks in --watch mode (default: {POLL_SECONDS})",
    )
    args = parser.parse_args()

    load_env_file()
    session = requests.Session()
    session.headers["Authorization"] = f"Bearer {read_token()}"

    if args.watch:
        watch(session, args)
        return

    base_url = run_once(session, args)
    print(f"\nwebhooks now point at {base_url}/webhook")


if __name__ == "__main__":
    main()
