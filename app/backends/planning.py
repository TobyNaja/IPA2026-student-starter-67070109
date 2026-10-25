from app.planner import build_plan


def plan_interface(
    router,
    desired_interface,
    get_interface_state,
):

    """Build a Part 2 plan from backend status."""
    status = get_interface_state(router, desired_interface["name"])

    if status["status"] == "error":
        return status

    if status["result"] == "not_found":
        current_interface = None
    else:
        current_interface = status["interface"]

    return build_plan(desired_interface, current_interface)
