"""Atomic per-tenant daily/monthly call and token reservations."""

import json
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from .contracts import AssistantError
from .models import AssistantSettings, UsageAttempt, UsageBucket


def token_ceiling(payload, output_limit):
    size = len(json.dumps(payload, ensure_ascii=False).encode())
    if size > 200000:
        raise AssistantError(
            "This report is too large for AI summarization. Narrow the date range."
        )
    return size * 2 + 8192 + output_limit


@transaction.atomic
def reserve(context, connection, purpose, payload, output_limit, request=None):
    config, _ = AssistantSettings.objects.get_or_create(tenant_id=context.tenant_id)
    # Lock settings too: edits to limits and concurrent first-time bucket creation serialize.
    config = AssistantSettings.objects.select_for_update().get(pk=config.pk)
    today = timezone.localdate(timezone=ZoneInfo(context.timezone))
    periods = [today.isoformat(), today.strftime("%Y-%m")]
    ceiling = token_ceiling(payload, output_limit)
    for period, request_limit, token_limit in zip(
        periods,
        [config.daily_requests, config.monthly_requests],
        [config.daily_tokens, config.monthly_tokens],
    ):
        bucket, _ = UsageBucket.objects.get_or_create(
            tenant_id=context.tenant_id, period=period
        )
        bucket = UsageBucket.objects.select_for_update().get(pk=bucket.pk)
        if bucket.requests + 1 > request_limit or bucket.tokens + ceiling > token_limit:
            raise AssistantError(
                "This business's assistant limit has been reached. Review Usage or adjust the limits.",
                "APP_QUOTA",
                429,
            )
        UsageBucket.objects.filter(pk=bucket.pk).update(
            requests=F("requests") + 1, tokens=F("tokens") + ceiling
        )
    return UsageAttempt.objects.create(
        tenant_id=context.tenant_id,
        request=request,
        connection_id_snapshot=str(connection.public_id),
        provider=connection.provider,
        model=connection.model,
        purpose=purpose,
        reserved_tokens=ceiling,
        periods=periods,
    )


@transaction.atomic
def settle(attempt, result=None, error=None, not_sent=False):
    attempt = UsageAttempt.objects.select_for_update().get(pk=attempt.pk)
    if attempt.outcome != "reserved":
        return
    known = (
        result is not None
        and result.input_tokens is not None
        and result.output_tokens is not None
    )
    definitely_unspent = (
        not_sent or error is not None and not getattr(error, "usage_unknown", True)
    )
    used = (
        result.input_tokens + result.output_tokens
        if known
        else 0
        if definitely_unspent
        else attempt.reserved_tokens
    )
    difference = used - attempt.reserved_tokens
    for period in attempt.periods:
        UsageBucket.objects.filter(tenant_id=attempt.tenant_id, period=period).update(
            tokens=F("tokens") + difference,
            requests=F("requests") - (1 if not_sent else 0),
        )
    attempt.outcome = (
        "not_sent"
        if not_sent
        else "failed"
        if error is not None and (known or definitely_unspent)
        else "succeeded"
        if result and error is None
        else "unknown"
    )
    attempt.input_tokens = result.input_tokens if result else 0 if not_sent else None
    attempt.output_tokens = result.output_tokens if result else 0 if not_sent else None
    attempt.provider_request_id = result.provider_request_id or "" if result else ""
    attempt.error_code = getattr(error, "code", "")
    attempt.finished_at = timezone.now()
    attempt.save()
