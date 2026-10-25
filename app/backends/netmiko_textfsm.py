import re

from app.backends.common import (
    error,
    error_from_exception,
    found,
    not_found,
    router_credentials,
)


ADMIN_DOWN = "administratively down"

LOOPBACK_NAME = re.compile(r"Loopback\d+")

CONNECT_TIMEOUT = 10


def _connect(router):
    """Open one Netmiko SSH session to the router."""
    from netmiko import ConnectHandler

    username, password = router_credentials()

    return ConnectHandler(
        device_type="cisco_xe",
        host=router,
        username=username,
        password=password,
        conn_timeout=CONNECT_TIMEOUT,
        allow_agent=False,
        use_keys=False,
    )


def _run(router, operation):
    """Run operation(conn) on one session and normalize Netmiko exceptions."""
    from netmiko.exceptions import (
        NetmikoAuthenticationException,
        NetmikoTimeoutException,
        SSHException,
    )

    try:
        with _connect(router) as conn:
            return operation(conn)
    except NetmikoAuthenticationException as exc:
        raise PermissionError(str(exc)) from exc
    except (NetmikoTimeoutException, SSHException, OSError) as exc:
        raise ConnectionError(str(exc)) from exc


def _parse(raw_output, command):
    """Parse CLI output with the NTC TextFSM template for Cisco IOS."""
    from netmiko.utilities import get_structured_data_textfsm

    records = get_structured_data_textfsm(
        raw_output,
        platform="cisco_ios",
        command=command,
    )
    # Netmiko returns the raw text when TextFSM finds no records.
    if not isinstance(records, list):
        raise RuntimeError(f"cannot parse: {command}")
    return records


def _read(conn, interface_name):
    """Run the two show commands and return their TextFSM records."""
    ip_command = f"show ip interface {interface_name}"
    raw_ip = conn.send_command(ip_command)

    # IOS rejects the command when the interface does not exist.
    if "Invalid input" in raw_ip:
        ip_info = []
    else:
        ip_info = _parse(raw_ip, ip_command)

    description_command = "show interfaces description"
    descriptions = _parse(
        conn.send_command(description_command),
        description_command,
    )

    return ip_info, descriptions


def _real_get(router, interface_name):
    return _run(router, lambda conn: _read(conn, interface_name))


def _real_delete(router, interface_name):
    if not LOOPBACK_NAME.fullmatch(interface_name):
        raise RuntimeError("only Loopback interfaces can be deleted")

    def operation(conn):
        ip_info, _ = _read(conn, interface_name)
        if _find(ip_info, "interface", interface_name) is None:
            return "not_found"

        conn.send_config_set([f"no interface {interface_name}"])

        ip_info, _ = _read(conn, interface_name)
        if _find(ip_info, "interface", interface_name) is not None:
            raise RuntimeError("interface still exists after delete")
        return "deleted"

    return _run(router, operation)


def _full_name(name):
    """Expand an IOS abbreviation such as Lo123 to Loopback123."""
    if name.startswith("Lo") and not name.startswith("Loopback"):
        return "Loopback" + name[len("Lo"):]
    return name


def _find(records, key, interface_name):
    """Return the first TextFSM record whose key names the interface."""
    for record in records:
        if _full_name(record[key]) == interface_name:
            return record
    return None


def _normalize_status(interface_name, ip_record, description_record):
    """Convert TextFSM records into the normalized interface."""
    addresses = ip_record.get("ip_address") or []
    prefixes = ip_record.get("prefix_length") or []
    if addresses and prefixes:
        ipv4 = f"{addresses[0]}/{prefixes[0]}"
    else:
        ipv4 = None

    if ip_record["link_status"] == ADMIN_DOWN:
        admin_state = "down"
    else:
        admin_state = "up"

    if description_record is not None:
        description = description_record.get("description") or None
    else:
        description = None

    return {
        "name": interface_name,
        "ipv4": ipv4,
        "description": description,
        "admin_state": admin_state,
    }


def get_interface_state(
    router,
    interface_name,
    netmiko_get=None,
):
    """Return normalized interface status using Netmiko + TextFSM."""
    if netmiko_get is None:
        netmiko_get = _real_get

    try:
        ip_info, descriptions = netmiko_get(router, interface_name)
    except Exception as exc:
        return error_from_exception(exc)

    try:
        ip_record = _find(ip_info, "interface", interface_name)
        if ip_record is None:
            return not_found()

        description_record = _find(descriptions, "port", interface_name)

        return found(
            _normalize_status(interface_name, ip_record, description_record)
        )
    except (KeyError, TypeError, AttributeError):
        return error("backend_failed")


def delete_interface(
    router,
    interface_name,
    netmiko_delete=None,
):
    """Delete an interface using Netmiko."""
    if netmiko_delete is None:
        netmiko_delete = _real_delete

    try:
        result = netmiko_delete(router, interface_name)
    except Exception as exc:
        return error_from_exception(exc)

    if result == "deleted":
        return {"status": "ok", "result": "deleted"}
    if result == "not_found":
        return not_found()
    return error("backend_failed")
