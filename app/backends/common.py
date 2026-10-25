"""Helpers shared by the Part 3 backends."""

import os
from ipaddress import IPv4Interface


def error(result):
    return {"status": "error", "result": result}


def error_from_exception(exc):
    if isinstance(exc, PermissionError):
        return error("authentication_failed")
    if isinstance(exc, ConnectionError):
        return error("connection_failed")
    return error("backend_failed")


def found(interface):
    return {"status": "ok", "result": "found", "interface": interface}


def not_found():
    return {"status": "ok", "result": "not_found", "interface": None}


def to_cidr(ip, netmask):
    return str(IPv4Interface(f"{ip}/{netmask}"))


def split_ipv4(cidr):
    interface = IPv4Interface(cidr)
    return str(interface.ip), str(interface.netmask)


def loopback_number(name):
    return name[len("Loopback"):]


def router_credentials():
    return os.environ.get("ROUTER_USER", ""), os.environ.get("ROUTER_PASS", "")
