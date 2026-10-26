"""Part 4 student implementation."""

import json

import logging

import os

from concurrent.futures import ThreadPoolExecutor

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from pathlib import Path

from tempfile import TemporaryDirectory

import requests

from app.integration import process_request

from app.webex_client import (
    REQUEST_TIMEOUT,
    WEBEX_API_BASE,
    WebexClient,
)

MAX_BODY_BYTES = 1_000_000

REQUEST_FILENAME = "request.yaml"

DEFAULT_HOST = "0.0.0.0"
DEFAULT_PORT = 8000

HEALTHY = {"status": "ok", "result": "healthy"}
ACCEPTED = {"status": "ok", "result": "accepted"}
INVALID_EVENT = {"status": "error", "result": "invalid_event"}
NOT_FOUND = {"status": "error", "result": "not_found"}
MULTIPLE_ATTACHMENTS = {"status": "error", "result": "multiple_attachments"}

logger = logging.getLogger(__name__)

class WebexEventHandler:
    def __init__(self, client, bot_person_id, processor=None):
        self._client = client
        self._bot_person_id = bot_person_id
        self._processor = processor or process_request

    def handle_event(self, event):
        """Process one webhook event and reply in its own room."""
        message_id = self._accepted_message_id(event)
        if message_id is None:
            return None

        message = self._client.get_message(message_id)
        # The pre-lookup check misses events whose payload omits personId,
        # so confirm the fetched author before replying to it.
        if message.get("personId") == self._bot_person_id:
            return None

        response = self._build_response(message)
        self._client.send_message(
            message.get("roomId"),
            json.dumps(response),
        )
        return response

    def _accepted_message_id(self, event):
        """Return the message ID to process, or None to ignore the event."""
        if not isinstance(event, dict):
            return None
        if event.get("resource") != "messages":
            return None
        if event.get("event") != "created":
            return None

        data = event.get("data")
        if not isinstance(data, dict):
            return None
        if data.get("personId") == self._bot_person_id:
            return None

        return data.get("id") or None

    def _build_response(self, message):
        """Run the processor on the message's attachment, if any."""
        mentioned_people = message.get("mentionedPeople")
        files = message.get("files") or []

        if len(files) > 1:
            return MULTIPLE_ATTACHMENTS

        if not files:
            return self._processor(
                mentioned_people,
                None,
                self._bot_person_id,
            )

        with TemporaryDirectory() as directory:
            path = Path(directory) / REQUEST_FILENAME
            path.write_bytes(self._client.download_file(files[0]))
            return self._processor(
                mentioned_people,
                path,
                self._bot_person_id,
            )

def make_http_handler(submit_event):
    """Build an HTTP handler that acknowledges Webex events immediately."""

    class WebhookHTTPHandler(BaseHTTPRequestHandler):
        # Drop connections that stall mid-body instead of pinning a thread.
        timeout = 10

        def do_GET(self):
            if self.path == "/health":
                self._send_json(200, HEALTHY)
                return

            self._send_json(404, NOT_FOUND)

        def do_POST(self):
            if self.path != "/webhook":
                self._send_json(404, NOT_FOUND)
                return

            event = self._read_event()
            if event is None:
                self._send_json(400, INVALID_EVENT)
                return

            # Queue the event before replying so the acknowledgement is
            # observable as submitted, yet never waits for the router.
            submit_event(event)
            self._send_json(200, ACCEPTED)

        def _read_event(self):
            """Return the posted JSON object, or None when it is unusable."""
            try:
                length = int(self.headers.get("Content-Length", ""))
            except ValueError:
                return None

            if not 1 <= length <= MAX_BODY_BYTES:
                return None

            body = self.rfile.read(length)
            if len(body) != length:
                return None

            try:
                event = json.loads(body)
            except (json.JSONDecodeError, UnicodeDecodeError):
                return None

            return event if isinstance(event, dict) else None

        def _send_json(self, code, payload):
            body = json.dumps(payload).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):
            logger.info("%s - %s", self.address_string(), format % args)

    return WebhookHTTPHandler

def resolve_bot_person_id(client):
    """Ask Webex which person this bot token belongs to."""
    response = requests.get(
        f"{WEBEX_API_BASE}/people/me",
        headers=client.headers,
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()
    return response.json()["id"]


def process_event(event_handler, event):
    """Run one event on the worker, logging anything it raises."""
    try:
        event_handler.handle_event(event)
    except Exception:
        # A future nobody awaits swallows its exception, so log it here.
        logger.exception("unhandled error while processing %s", event)


def main():
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )

    host = os.environ.get("WEBHOOK_HOST", DEFAULT_HOST)
    port = int(os.environ.get("WEBHOOK_PORT", DEFAULT_PORT))

    client = WebexClient()
    bot_person_id = resolve_bot_person_id(client)
    event_handler = WebexEventHandler(client, bot_person_id)
    logger.info("bot personId resolved as %s", bot_person_id)

    # One worker keeps router operations sequential while the HTTP
    # handler stays free to acknowledge the next event.
    with ThreadPoolExecutor(max_workers=1) as executor:
        def submit_event(event):
            executor.submit(process_event, event_handler, event)

        server = ThreadingHTTPServer(
            (host, port),
            make_http_handler(submit_event),
        )
        logger.info("webhook listening on %s:%s", host, port)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            logger.info("shutting down")
        finally:
            server.shutdown()
            server.server_close()

if __name__ == "__main__":
    main()
