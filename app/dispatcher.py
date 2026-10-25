"""Part 4 student implementation."""

from app.backends import ansible, netconf, netmiko_textfsm, restconf

BACKENDS = {
    ("restconf", "status"): (restconf, "get_interface_state"),
    ("restconf", "plan"): (restconf, "plan_interface"),
    ("restconf", "apply"): (restconf, "apply_interface"),
    ("netconf", "status"): (netconf, "get_interface_state"),
    ("netconf", "plan"): (netconf, "plan_interface"),
    ("netconf", "apply"): (netconf, "apply_interface"),
    ("ansible", "apply"): (ansible, "apply_interface"),
    ("netmiko-textfsm", "status"): (netmiko_textfsm, "get_interface_state"),
    ("netmiko-textfsm", "delete"): (netmiko_textfsm, "delete_interface"),
}


def dispatch_request(data):
    """Route an already validated request to its Part 3 backend."""
    module, function_name = BACKENDS[(data["method"], data["action"])]
    backend = getattr(module, function_name)

    router = data["router"]
    interface = data["desired"]["interface"]

    if data["action"] in ("status", "delete"):
        return backend(router, interface["name"])
    return backend(router, interface)
