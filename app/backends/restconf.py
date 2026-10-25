from app.backends import planning
from app.backends.common import (
    error,
    error_from_exception,
    found,
    loopback_number,
    not_found,
    router_credentials,
    split_ipv4,
    to_cidr,
)


STATUS_URL = (
    "https://{router}/restconf/data/"
    "ietf-interfaces:interfaces/interface={name}"
)

APPLY_URL = (
    "https://{router}/restconf/data/"
    "Cisco-IOS-XE-native:native/interface/Loopback={number}"
)

APPLY_SUCCESS_CODES = (200, 201, 204)

YANG_JSON = "application/yang-data+json"

REQUEST_TIMEOUT = 10


def _send(method, url, **kwargs):
    """Send one real RESTCONF request and normalize requests exceptions."""
    import requests
    import urllib3

    # The lab routers use self-signed certificates.
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    try:
        return requests.request(
            method,
            url,
            auth=router_credentials(),
            headers={"Accept": YANG_JSON, "Content-Type": YANG_JSON},
            verify=False,
            timeout=REQUEST_TIMEOUT,
            **kwargs,
        )
    except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as exc:
        raise ConnectionError(str(exc)) from exc
    except requests.exceptions.RequestException as exc:
        raise RuntimeError(str(exc)) from exc


def _real_get(url):
    return _send("GET", url)


def _real_put(url, json):
    return _send("PUT", url, json=json)


def _normalize_status(raw):
    """Convert IETF interface JSON into the normalized interface."""
    interface = raw["ietf-interfaces:interface"]

    addresses = interface.get("ietf-ip:ipv4", {}).get("address", [])
    if addresses:
        ipv4 = to_cidr(addresses[0]["ip"], addresses[0]["netmask"])
    else:
        ipv4 = None

    if interface["enabled"]:
        admin_state = "up"
    else:
        admin_state = "down"

    return {
        "name": interface["name"],
        "ipv4": ipv4,
        "description": interface.get("description"),
        "admin_state": admin_state,
    }

def get_interface_state(
    router,
    interface_name,
    http_get=None,
):
    """Return normalized interface status using RESTCONF."""
    if http_get is None:
        http_get = _real_get

    url = STATUS_URL.format(router=router, name=interface_name)

    try:
        response = http_get(url)
    except Exception as exc:
        return error_from_exception(exc)

    if response.status_code == 404:
        return not_found()
    if response.status_code in (401, 403):
        return error("authentication_failed")
    if response.status_code != 200:
        return error("backend_failed")

    try:
        return found(_normalize_status(response.json()))
    except (KeyError, TypeError, ValueError, AttributeError):
        return error("backend_failed")


def plan_interface(
    router,
    desired_interface,
    http_get=None,
):
    """Return create/update/no_change plan using RESTCONF status."""

    def get_state(router, interface_name):
        return get_interface_state(router, interface_name, http_get)

    return planning.plan_interface(router, desired_interface, get_state)


def _build_apply_payload(number, desired_interface):
    """Build the Cisco native Loopback payload for HTTP PUT."""
    ip, netmask = split_ipv4(desired_interface["ipv4"])

    loopback = {
        "name": number,
        "description": desired_interface["description"],
        "ip": {
            "address": {
                "primary": {
                    "address": ip,
                    "mask": netmask,
                },
            },
        },
    }

    if desired_interface["admin_state"] == "down":
        loopback["shutdown"] = [None]

    return {"Cisco-IOS-XE-native:Loopback": loopback}


def apply_interface(
    router,
    desired_interface,
    http_put=None,
):
    """Apply complete desired interface state using RESTCONF."""
    if http_put is None:
        http_put = _real_put

    number = int(loopback_number(desired_interface["name"]))
    url = APPLY_URL.format(router=router, number=number)
    payload = _build_apply_payload(number, desired_interface)

    try:
        response = http_put(url, json=payload)
    except Exception as exc:
        return error_from_exception(exc)

    if response.status_code in APPLY_SUCCESS_CODES:
        return {"status": "ok", "result": "applied"}
    if response.status_code in (401, 403):
        return error("authentication_failed")
    return error("backend_failed")
