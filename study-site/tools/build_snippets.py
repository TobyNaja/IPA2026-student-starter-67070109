"""Extract real source code from the repository into study-site/data/source-snippets.js.

Run from the repository root (re-run after changing app/ code):

    python study-site/tools/build_snippets.py

It reads files only; it never modifies the Webex bot source.
"""

import ast
import json
import subprocess
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "study-site" / "data" / "source-snippets.js"

# function id used in project-data.js -> (file, [qualified names to extract])
FUNCTIONS = {
    "main": ("app/webhook_server.py", ["main"]),
    "resolve_bot_person_id": ("app/webhook_server.py", ["resolve_bot_person_id"]),
    "process_event": ("app/webhook_server.py", ["process_event"]),
    "make_http_handler": ("app/webhook_server.py", ["make_http_handler"]),
    "handle_event": ("app/webhook_server.py", ["WebexEventHandler"]),
    "registrar.watch": ("scripts/update_webex_webhooks.py", ["watch", "main"]),
    "registrar.discover_tunnel_url": ("scripts/update_webex_webhooks.py", ["discover_tunnel_url", "url_from_metrics", "url_from_compose_logs"]),
    "registrar.find_room_ids": ("scripts/update_webex_webhooks.py", ["ROOM_TITLES", "find_room_ids"]),
    "registrar.sync_webhooks": ("scripts/update_webex_webhooks.py", ["sync_webhooks"]),
    "WebexClient": ("app/webex_client.py", ["WebexClient.__init__", "WebexClient.headers"]),
    "get_message": ("app/webex_client.py", ["WebexClient.get_message"]),
    "download_file": ("app/webex_client.py", ["WebexClient.download_file"]),
    "send_message": ("app/webex_client.py", ["WebexClient.send_message"]),
    "process_request": ("app/integration.py", ["process_request"]),
    "dispatch_request": ("app/dispatcher.py", ["BACKENDS", "dispatch_request"]),
    "validate_webex_envelope": ("app/request_handler.py", ["validate_webex_envelope"]),
    "handle_webex_request": ("app/request_handler.py", ["handle_webex_request"]),
    "load_request_file": ("app/core.py", ["load_request_file"]),
    "validate_request": ("app/core.py", ["validate_request"]),
    "process_request_file": ("app/core.py", ["process_request_file"]),
    "build_plan": ("app/planner.py", ["MANAGED_FIELDS", "build_plan"]),
    "planning.plan_interface": ("app/backends/planning.py", ["plan_interface"]),
    "restconf.get_interface_state": ("app/backends/restconf.py", ["get_interface_state"]),
    "restconf.plan_interface": ("app/backends/restconf.py", ["plan_interface"]),
    "restconf.apply_interface": ("app/backends/restconf.py", ["apply_interface"]),
    "netconf.get_interface_state": ("app/backends/netconf.py", ["get_interface_state"]),
    "netconf.plan_interface": ("app/backends/netconf.py", ["plan_interface"]),
    "netconf.apply_interface": ("app/backends/netconf.py", ["apply_interface", "_real_edit_config", "_config_loopback_number", "REMOVE_ADDRESS_CONFIG"]),
    "ansible.apply_interface": ("app/backends/ansible.py", ["apply_interface"]),
    "netmiko.get_interface_state": ("app/backends/netmiko_textfsm.py", ["get_interface_state"]),
    "netmiko.delete_interface": ("app/backends/netmiko_textfsm.py", ["_real_delete", "delete_interface"]),
    "error_from_exception": ("app/backends/common.py", ["error_from_exception"]),
}

# whole files shown on the YAML / config page
CONFIG_FILES = [
    "sample-tests/webex-manual/05-apply-create.yaml",
    "sample-tests/webex-manual/03-status-not-found.yaml",
    "sample-tests/webex-manual/09-delete.yaml",
    "sample-tests/webex-manual/02-invalid-yaml.yaml",
    "sample-tests/webex-manual/ready/05-apply-create.yaml",
    "compose.yaml",
    ".env.example",
    "Dockerfile",
    "ansible/apply_interface.yml",
    "ansible/inventory.ini",
    ".github/workflows/student-ci.yaml",
    "requirements.txt",
    "sample-tests/part1/cases/06-valid-handler.yaml",
    "sample-tests/part1/fixtures/01-valid.yaml",
    "sample-tests/part2/cases/02-update-one-field.yaml",
    "sample-tests/part2/fixtures/02-update-one-field.yaml",
]


def find_node(tree, qualname):
    parts = qualname.split(".")
    body = tree.body
    node = None
    for part in parts:
        node = None
        for child in body:
            if isinstance(child, (ast.FunctionDef, ast.ClassDef)) and child.name == part:
                node = child
            elif isinstance(child, ast.Assign) and any(
                isinstance(t, ast.Name) and t.id == part for t in child.targets
            ):
                node = child
        if node is None:
            raise KeyError(qualname)
        body = getattr(node, "body", [])
    return node


def extract(path, qualnames):
    text = (ROOT / path).read_text(encoding="utf-8")
    lines = text.splitlines()
    tree = ast.parse(text)
    pieces = []
    first = None
    for qualname in qualnames:
        node = find_node(tree, qualname)
        start = node.lineno
        if getattr(node, "decorator_list", None):
            start = min(d.lineno for d in node.decorator_list)
        end = node.end_lineno
        first = start if first is None else first
        pieces.append({
            "name": qualname,
            "start": start,
            "end": end,
            "code": "\n".join(lines[start - 1:end]),
        })
    return {"file": path, "line": first, "pieces": pieces}


def git_commit():
    try:
        return subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return "unknown"


def main():
    data = {
        "generated": date.today().isoformat(),
        "commit": git_commit(),
        "functions": {fid: extract(path, names) for fid, (path, names) in FUNCTIONS.items()},
        "files": {
            path: (ROOT / path).read_text(encoding="utf-8")
            for path in CONFIG_FILES
        },
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        "// Generated by study-site/tools/build_snippets.py — do not edit by hand.\n"
        "window.SOURCE_SNIPPETS = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(ROOT)}: {len(data['functions'])} functions, {len(data['files'])} files")


if __name__ == "__main__":
    main()
