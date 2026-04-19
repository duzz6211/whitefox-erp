from app.models.box import FlowStatus

TRANSITIONS: dict[FlowStatus, list[FlowStatus]] = {
    FlowStatus.wait: [FlowStatus.working],
    FlowStatus.working: [FlowStatus.pickup, FlowStatus.blocked],
    FlowStatus.pickup: [FlowStatus.working],
    FlowStatus.blocked: [FlowStatus.review],
    FlowStatus.review: [FlowStatus.done, FlowStatus.working],
    FlowStatus.done: [],
}


def can_transition(from_status: FlowStatus, to_status: FlowStatus) -> bool:
    return to_status in TRANSITIONS.get(from_status, [])
