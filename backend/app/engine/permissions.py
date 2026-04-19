from dataclasses import dataclass
from typing import Callable

from app.models.box import Box, FlowStatus
from app.models.user import User


@dataclass
class Rule:
    check: Callable[[User, Box], bool]
    message: str


def _is_owner(user: User, box: Box) -> bool:
    return box.owner_id == user.id


def _is_admin(user: User, box: Box) -> bool:
    return user.is_admin


def _any_member(user: User, box: Box) -> bool:
    return True


def _pickup_taker(user: User, box: Box) -> bool:
    # Any member can pickup, but NOT the one who just finished (current owner)
    return box.owner_id != user.id


def _owner_or_admin(user: User, box: Box) -> bool:
    return _is_owner(user, box) or user.is_admin


PERMISSION_RULES: dict[tuple[FlowStatus, FlowStatus], Rule] = {
    (FlowStatus.wait, FlowStatus.working): Rule(_any_member, "누구나 대기 박스를 작업 시작할 수 있습니다"),
    (FlowStatus.working, FlowStatus.pickup): Rule(_is_owner, "현재 owner만 픽업 대기로 전환할 수 있습니다"),
    (FlowStatus.working, FlowStatus.blocked): Rule(_is_owner, "현재 owner만 외부 대기로 전환할 수 있습니다"),
    (FlowStatus.pickup, FlowStatus.working): Rule(_pickup_taker, "직전 owner는 자기가 넘긴 박스를 다시 픽업할 수 없습니다"),
    (FlowStatus.blocked, FlowStatus.review): Rule(_owner_or_admin, "owner 또는 admin만 검토 전환할 수 있습니다"),
    (FlowStatus.review, FlowStatus.done): Rule(_is_admin, "admin만 완료 승인할 수 있습니다"),
    (FlowStatus.review, FlowStatus.working): Rule(_is_admin, "admin만 반려할 수 있습니다"),
}


def check_permission(user: User, box: Box, to_status: FlowStatus) -> Rule | None:
    """Returns None if permitted, else the failing Rule (for its error message)."""
    rule = PERMISSION_RULES.get((box.flow_status, to_status))
    if rule is None:
        return Rule(lambda u, b: False, "전이 규칙 미정의")
    if rule.check(user, box):
        return None
    return rule
