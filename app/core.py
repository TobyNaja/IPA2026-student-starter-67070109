import yaml

ALLOWED_ROUTERS = (
    "10.0.29.101",
    "10.0.29.102",
    "10.0.29.103",
    "10.0.29.104",
    "10.0.29.105",
)

SUPPORTED_ACTIONS = {
    "restconf": ("status", "plan", "apply"),
    "netconf": ("status", "plan", "apply"),
    "ansible": ("apply",),
    "netmiko-textfsm": ("status", "delete"),
}

ADMIN_STATES = ("up", "down")


def _error(result):
    return {"status": "error", "result": result}


def validate_request(data):
    """
    Validate one IPA2026 desired-state request.
    Return a response dictionary according to
    specs/response-spec-v1.md.
    """
    if not isinstance(data, dict):
        return _error("invalid_yaml")

    version = data.get("version")
    if type(version) is not int or version != 1:
        return _error("invalid_version")

    router = data.get("router")
    if router is None:
        return _error("missing_router")
    if router not in ALLOWED_ROUTERS:
        return _error("invalid_router")

    method = data.get("method")
    if method is None:
        return _error("missing_method")
    if not isinstance(method, str) or method not in SUPPORTED_ACTIONS:
        return _error("invalid_method")

    action = data.get("action")
    if action is None:
        return _error("missing_action")
    if action not in SUPPORTED_ACTIONS[method]:
        return _error("invalid_action")

    desired = data.get("desired")
    if not isinstance(desired, dict):
        return _error("missing_desired")

    interface = desired.get("interface")
    if not isinstance(interface, dict):
        return _error("missing_interface")

    if interface.get("name") is None:
        return _error("missing_interface_name")

    if action in ("plan", "apply"):
        for field in ("ipv4", "description", "admin_state"):
            if interface.get(field) is None:
                return _error(f"missing_{field}")
        if interface["admin_state"] not in ADMIN_STATES:
            return _error("invalid_admin_state")

    return {"status": "ok", "result": "accepted"}


def process_request_file(path):
    """
    Read a YAML request file, validate it,
    and return a response dictionary.
    """
    try:
        with open(path, encoding="utf-8") as f:
            data = yaml.safe_load(f)
    except (yaml.YAMLError, UnicodeDecodeError):
        return _error("invalid_yaml")

    return validate_request(data)
