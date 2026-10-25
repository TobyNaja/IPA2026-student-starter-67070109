import xml.etree.ElementTree as ET
from xml.sax.saxutils import escape

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


IF_NS = "urn:ietf:params:xml:ns:yang:ietf-interfaces"
IP_NS = "urn:ietf:params:xml:ns:yang:ietf-ip"

STATUS_FILTER = """
<interfaces xmlns="urn:ietf:params:xml:ns:yang:ietf-interfaces">
  <interface>
    <name>{name}</name>
  </interface>
</interfaces>
"""

APPLY_CONFIG = """
<config
    xmlns="urn:ietf:params:xml:ns:netconf:base:1.0"
    xmlns:nc="urn:ietf:params:xml:ns:netconf:base:1.0">
  <native xmlns="http://cisco.com/ns/yang/Cisco-IOS-XE-native">
    <interface>
      <Loopback nc:operation="replace">
        <name>{number}</name>
        <description>{description}</description>
        <ip>
          <address>
            <primary>
              <address>{ip}</address>
              <mask>{netmask}</mask>
            </primary>
          </address>
        </ip>{shutdown}
      </Loopback>
    </interface>
  </native>
</config>
"""


NETCONF_PORT = 830

CONNECT_TIMEOUT = 10


def _run(router, operation):
    """Open one NETCONF session, run operation(m), and normalize ncclient exceptions."""
    from ncclient import manager
    from ncclient.operations.errors import TimeoutExpiredError
    from ncclient.operations.rpc import RPCError
    from ncclient.transport.errors import AuthenticationError, TransportError

    username, password = router_credentials()

    try:
        with manager.connect(
            host=router,
            port=NETCONF_PORT,
            username=username,
            password=password,
            hostkey_verify=False,
            allow_agent=False,
            look_for_keys=False,
            device_params={"name": "iosxe"},
            timeout=CONNECT_TIMEOUT,
        ) as m:
            return operation(m)
    except AuthenticationError as exc:
        raise PermissionError(str(exc)) from exc
    except (TransportError, TimeoutExpiredError, OSError) as exc:
        raise ConnectionError(str(exc)) from exc
    except RPCError as exc:
        raise RuntimeError(str(exc)) from exc


def _real_get_config(router, filter_xml):
    return _run(
        router,
        lambda m: m.get_config(
            source="running",
            filter=("subtree", filter_xml),
        ).data_xml,
    )


def _real_edit_config(router, config_xml):
    return _run(
        router,
        lambda m: m.edit_config(target="running", config=config_xml),
    )


def _text(element, path):
    """Return stripped text of a child element, or None if it is absent."""
    child = element.find(path)
    if child is None or child.text is None:
        return None
    return child.text.strip()


def _normalize_status(interface):
    """Convert one IETF <interface> element into the normalized interface."""
    ip = _text(interface, f"{{{IP_NS}}}ipv4/{{{IP_NS}}}address/{{{IP_NS}}}ip")
    netmask = _text(
        interface,
        f"{{{IP_NS}}}ipv4/{{{IP_NS}}}address/{{{IP_NS}}}netmask",
    )
    if ip and netmask:
        ipv4 = to_cidr(ip, netmask)
    else:
        ipv4 = None

    enabled = _text(interface, f"{{{IF_NS}}}enabled")
    if enabled == "true":
        admin_state = "up"
    elif enabled == "false":
        admin_state = "down"
    else:
        raise ValueError(f"unexpected enabled value: {enabled}")

    return {
        "name": _text(interface, f"{{{IF_NS}}}name"),
        "ipv4": ipv4,
        "description": _text(interface, f"{{{IF_NS}}}description"),
        "admin_state": admin_state,
    }


def get_interface_state(
    router,
    interface_name,
    netconf_get_config=None,
):
    """Return normalized interface status using NETCONF."""
    if netconf_get_config is None:
        netconf_get_config = _real_get_config

    filter_xml = STATUS_FILTER.format(name=interface_name)

    try:
        reply_xml = netconf_get_config(router, filter_xml)
    except Exception as exc:
        return error_from_exception(exc)

    try:
        root = ET.fromstring(reply_xml)

        for interface in root.iter(f"{{{IF_NS}}}interface"):
            if _text(interface, f"{{{IF_NS}}}name") == interface_name:
                return found(_normalize_status(interface))

        return not_found()
    except (ET.ParseError, TypeError, ValueError):
        return error("backend_failed")


def plan_interface(
    router,
    desired_interface,
    netconf_get_config=None,
):
    """Return create/update/no_change plan using NETCONF status."""

    def get_state(router, interface_name):
        return get_interface_state(router, interface_name, netconf_get_config)

    return planning.plan_interface(router, desired_interface, get_state)


def _build_apply_config(desired_interface):
    """Build the Cisco native Loopback <config> for edit-config."""
    ip, netmask = split_ipv4(desired_interface["ipv4"])

    if desired_interface["admin_state"] == "down":
        shutdown = "\n        <shutdown/>"
    else:
        shutdown = ""

    return APPLY_CONFIG.format(
        number=loopback_number(desired_interface["name"]),
        description=escape(desired_interface["description"]),
        ip=ip,
        netmask=netmask,
        shutdown=shutdown,
    )


def apply_interface(
    router,
    desired_interface,
    netconf_edit_config=None,
):
    """Apply complete desired interface state using NETCONF."""
    if netconf_edit_config is None:
        netconf_edit_config = _real_edit_config

    config_xml = _build_apply_config(desired_interface)

    try:
        netconf_edit_config(router, config_xml)
    except Exception as exc:
        return error_from_exception(exc)

    return {"status": "ok", "result": "applied"}
