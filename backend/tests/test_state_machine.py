from app.models.box import FlowStatus
from app.engine.state_machine import can_transition


def test_allowed_transitions():
    assert can_transition(FlowStatus.wait, FlowStatus.working)
    assert can_transition(FlowStatus.working, FlowStatus.pickup)
    assert can_transition(FlowStatus.working, FlowStatus.blocked)
    assert can_transition(FlowStatus.pickup, FlowStatus.working)
    assert can_transition(FlowStatus.blocked, FlowStatus.review)
    assert can_transition(FlowStatus.review, FlowStatus.done)
    assert can_transition(FlowStatus.review, FlowStatus.working)


def test_disallowed_transitions():
    assert not can_transition(FlowStatus.wait, FlowStatus.done)
    assert not can_transition(FlowStatus.working, FlowStatus.done)
    assert not can_transition(FlowStatus.done, FlowStatus.working)
    assert not can_transition(FlowStatus.pickup, FlowStatus.done)
