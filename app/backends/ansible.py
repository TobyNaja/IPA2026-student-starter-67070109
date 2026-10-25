import json
import os
import re
import subprocess
from pathlib import Path

from app.backends.common import (
    error_from_exception,
    split_ipv4,
)


ANSIBLE_DIR = Path(__file__).resolve().parents[2] / "ansible"
PLAYBOOK = ANSIBLE_DIR / "apply_interface.yml"
INVENTORY = ANSIBLE_DIR / "inventory.ini"

PLAYBOOK_TIMEOUT = 120

LOOPBACK_NAME = re.compile(r"Loopback\d+")

AUTH_MARKERS = (
    "authentication failed",
    "authentication failure",
    "permission denied",
    "invalid credentials",
)

CONNECTION_MARKERS = (
    "unreachable",
    "timed out",
    "timeout triggered",
    "connection refused",
    "no route to host",
    "unable to connect",
)


def _real_run_playbook(variables):
    """Run ansible-playbook once and normalize its failures."""
    if not LOOPBACK_NAME.fullmatch(variables["interface_name"]):
        raise RuntimeError("only Loopback interfaces can be applied")
    if "\n" in variables["description"] or "\r" in variables["description"]:
        raise RuntimeError("description must be a single line")

    env = dict(os.environ, ANSIBLE_HOST_KEY_CHECKING="False")

    try:
        completed = subprocess.run(
            [
                "ansible-playbook",
                "-i", str(INVENTORY),
                str(PLAYBOOK),
                "--extra-vars", json.dumps(variables),
            ],
            capture_output=True,
            text=True,
            env=env,
            timeout=PLAYBOOK_TIMEOUT,
        )
    except subprocess.TimeoutExpired as exc:
        raise ConnectionError("ansible-playbook timed out") from exc
    except OSError as exc:
        raise RuntimeError(f"cannot run ansible-playbook: {exc}") from exc

    if completed.returncode == 0:
        return

    output = (completed.stdout + completed.stderr).lower()

    if any(marker in output for marker in AUTH_MARKERS):
        raise PermissionError("ansible authentication failed")
    # ansible-playbook exits with 4 when a host is unreachable.
    if completed.returncode == 4 or any(
        marker in output for marker in CONNECTION_MARKERS
    ):
        raise ConnectionError("ansible could not reach the router")
    raise RuntimeError(f"ansible-playbook failed ({completed.returncode})")


def _build_variables(router, desired_interface):
    """Convert the desired interface into playbook variables."""
    ipv4_address, netmask = split_ipv4(desired_interface["ipv4"])

    return {
        "router": router,
        "interface_name": desired_interface["name"],
        "description": desired_interface["description"],
        "ipv4_address": ipv4_address,
        "netmask": netmask,
        "shutdown": desired_interface["admin_state"] == "down",
    }


def apply_interface(
    router,
    desired_interface,
    run_playbook=None,
):
    """Apply complete desired interface state using Ansible."""
    if run_playbook is None:
        run_playbook = _real_run_playbook

    variables = _build_variables(router, desired_interface)

    try:
        run_playbook(variables)
    except Exception as exc:
        return error_from_exception(exc)

    return {"status": "ok", "result": "applied"}
