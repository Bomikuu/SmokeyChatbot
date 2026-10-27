from dataclasses import dataclass
from datetime import date
from typing import Iterable


class AssistantError(Exception):
    def __init__(
        self, message, code="VALIDATION_ERROR", status=400, usage_unknown=False
    ):
        super().__init__(message)
        self.code, self.status, self.usage_unknown = code, status, usage_unknown


@dataclass(frozen=True)
class HostContext:
    tenant_id: str
    actor_id: str
    timezone: str
    permissions: frozenset[str]

    def require(self, action):
        if action not in self.permissions:
            raise AssistantError(
                "You do not have access to this assistant action.", "FORBIDDEN", 403
            )


@dataclass(frozen=True)
class ReportPlan:
    kind: str
    date_from: date
    date_to: date

    @classmethod
    def parse(cls, value):
        try:
            kind = value["kind"]
            start, end = (
                date.fromisoformat(value["date_from"]),
                date.fromisoformat(value["date_to"]),
            )
            if (
                kind not in {"daily", "sales", "attendance", "late"}
                or not 0 <= (end - start).days <= 366
            ):
                raise ValueError()
            return cls(kind, start, end)
        except (KeyError, TypeError, ValueError):
            raise AssistantError(
                "Choose a supported report and a date range of up to 367 dates."
            ) from None

    def payload(self):
        return {
            "kind": self.kind,
            "date_from": self.date_from.isoformat(),
            "date_to": self.date_to.isoformat(),
        }


@dataclass
class ResolvedReport:
    facts: dict
    detail_rows: Iterable[dict]


@dataclass
class ProviderResult:
    narrative: dict
    input_tokens: int | None = None
    output_tokens: int | None = None
    provider_request_id: str | None = None


def validate_narrative(value):
    if not isinstance(value, dict) or set(value) != {"summary", "highlights"}:
        raise AssistantError(
            "The model returned an invalid summary. Try another model.",
            "INVALID_RESPONSE",
            502,
        )
    if (
        not isinstance(value["summary"], str)
        or not value["summary"].strip()
        or not isinstance(value["highlights"], list)
    ):
        raise AssistantError(
            "The model returned an incomplete summary.", "INVALID_RESPONSE", 502
        )
    if (
        any(not isinstance(item, str) for item in value["highlights"])
        or len(value["highlights"]) > 8
    ):
        raise AssistantError(
            "The model returned invalid highlights.", "INVALID_RESPONSE", 502
        )
    if len(value["summary"]) + sum(map(len, value["highlights"])) > 4000:
        raise AssistantError(
            "The model returned an oversized summary.", "INVALID_RESPONSE", 502
        )
    return value
