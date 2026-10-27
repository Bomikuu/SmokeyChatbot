from datetime import timedelta
from decimal import Decimal
from zoneinfo import ZoneInfo

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from .contracts import AssistantError, ReportPlan
from .credentials import decrypt_secret
from .models import (
    AssistantSettings,
    GenerationRequest,
    ProviderConnection,
    ReportSnapshot,
    ReportDetailRow,
)
from .providers import get_provider
from .quotas import reserve, settle

TERMINAL = {"succeeded", "empty", "failed", "cancelled"}


@transaction.atomic
def start_generation(context, prompt, plan, idempotency_key):
    context.require("generate")
    if not isinstance(prompt, str) or not prompt.strip() or len(prompt) > 4000:
        raise AssistantError("Enter a report request of up to 4000 characters.")
    if not isinstance(idempotency_key, str) or not 8 <= len(idempotency_key) <= 100:
        raise AssistantError("A valid submission key is required.")
    config, _ = AssistantSettings.objects.get_or_create(tenant_id=context.tenant_id)
    config = AssistantSettings.objects.select_for_update().get(pk=config.pk)
    parsed = ReportPlan.parse(plan).payload() if plan else {}
    existing = GenerationRequest.objects.filter(
        tenant_id=context.tenant_id,
        actor_id=context.actor_id,
        idempotency_key=idempotency_key,
    ).first()
    if existing:
        if existing.prompt != prompt.strip() or existing.plan != parsed and parsed:
            raise AssistantError(
                "This submission key belongs to a different request.",
                "IDEMPOTENCY_CONFLICT",
                409,
            )
        return existing, False
    connection = config.default_connection
    if (
        connection is None
        or connection.tenant_id != context.tenant_id
        or connection.status != "ready"
        or connection.model not in connection.permitted_models
    ):
        raise AssistantError(
            "Choose and test a default AI connection first.", "CONNECTION_REQUIRED", 409
        )
    request = GenerationRequest.objects.create(
        tenant_id=context.tenant_id,
        actor_id=context.actor_id,
        idempotency_key=idempotency_key,
        prompt=prompt.strip(),
        plan=parsed,
        connection=connection,
        connection_revision=connection.revision,
        provider=connection.provider,
        model=connection.model,
    )
    return request, True


def ensure_current(request, resolve_context):
    context = resolve_context(request.tenant_id, request.actor_id, "generate")
    request.refresh_from_db()
    if request.state in TERMINAL:
        raise AssistantError("Generation stopped.", "STOPPED", 409)
    connection = ProviderConnection.objects.filter(
        pk=request.connection_id,
        tenant_id=request.tenant_id,
        revision=request.connection_revision,
        status="ready",
    ).first()
    if not connection or connection.model != request.model:
        raise AssistantError(
            "The AI connection changed. Start a new report.", "CONNECTION_CHANGED", 409
        )
    return context, connection


def paid_call(
    context, connection, request, purpose, payload, output_limit, call, before_call
):
    attempt = reserve(context, connection, purpose, payload, output_limit, request)
    try:
        before_call()
    except Exception as error:
        settle(attempt, error=error, not_sent=True)
        raise
    try:
        result = call()
    except Exception as error:
        settle(attempt, result=getattr(error, "provider_result", None), error=error)
        raise
    settle(attempt, result=result)
    return result


def run_generation(request_id, resolve_context, resolve_report):
    with transaction.atomic():
        request = GenerationRequest.objects.select_for_update().get(
            public_id=request_id
        )
        if request.state != "queued":
            return
        request.state, request.lease_at = "searching", timezone.now()
        request.save(update_fields=["state", "lease_at"])
    try:
        context, connection = ensure_current(request, resolve_context)
        provider, secret = (
            get_provider(connection.provider),
            decrypt_secret(connection.encrypted_secret),
        )
        if not request.plan:
            today = timezone.localdate(timezone=ZoneInfo(context.timezone)).isoformat()
            result = paid_call(
                context,
                connection,
                request,
                "classify",
                {
                    "prompt": request.prompt,
                    "today": today,
                    "timezone": context.timezone,
                },
                512,
                lambda: provider.classify(
                    secret, request.model, request.prompt, today, context.timezone
                ),
                lambda: ensure_current(request, resolve_context),
            )
            context, connection = ensure_current(request, resolve_context)
            value = result.narrative
            if not isinstance(value, dict):
                raise AssistantError(
                    "The model returned an invalid report plan.",
                    "INVALID_RESPONSE",
                    502,
                )
            if value.get("kind") == "clarify":
                message = value.get("clarification")
                if not isinstance(message, str) or not message.strip():
                    message = "Choose a daily, sales, attendance or late-arrivals report and a date range."
                GenerationRequest.objects.filter(
                    pk=request.pk, state="searching"
                ).update(
                    state="empty",
                    clarification=message[:500],
                    finished_at=timezone.now(),
                )
                return
            request.plan = ReportPlan.parse(value).payload()
            GenerationRequest.objects.filter(pk=request.pk, state="searching").update(
                plan=request.plan
            )
        resolved = resolve_report(context, ReportPlan.parse(request.plan))
        context, connection = ensure_current(request, resolve_context)
        empty = all(table["total"] == 0 for table in resolved.facts["tables"].values())
        if (
            request.plan["kind"] in {"daily", "sales"}
            and Decimal(resolved.facts["metrics"].get("collected_payments", "0")) != 0
        ):
            empty = False
        if empty:
            narrative = {
                "summary": "No matching records were found for this period. Missing attendance is not proof of absence.",
                "highlights": resolved.facts["unavailable_sources"],
            }
        else:
            if not GenerationRequest.objects.filter(
                pk=request.pk, state="searching"
            ).update(state="generating"):
                return
            context, connection = ensure_current(request, resolve_context)
            result = paid_call(
                context,
                connection,
                request,
                "summary",
                resolved.facts,
                1536,
                lambda: provider.summarize(secret, request.model, resolved.facts, 1536),
                lambda: ensure_current(request, resolve_context),
            )
            narrative = result.narrative
        with transaction.atomic():
            request = GenerationRequest.objects.select_for_update().get(pk=request.pk)
            ensure_current(request, resolve_context)
            report = ReportSnapshot.objects.create(
                tenant_id=context.tenant_id,
                request=request,
                title=f"{request.plan['kind'].capitalize()} report · {request.plan['date_from']}",
                facts=resolved.facts,
                narrative=narrative,
            )
            ReportDetailRow.objects.bulk_create(
                [ReportDetailRow(report=report, **row) for row in resolved.detail_rows],
                batch_size=500,
            )
            request.state, request.finished_at = (
                "empty" if empty else "succeeded",
                timezone.now(),
            )
            request.save(update_fields=["state", "finished_at"])
    except Exception as error:
        code = error.code if isinstance(error, AssistantError) else "GENERATION_FAILED"
        message = (
            str(error)
            if isinstance(error, AssistantError)
            else "Generation could not complete. Check your connection and access before retrying."
        )
        GenerationRequest.objects.filter(pk=request.pk).exclude(
            state__in=TERMINAL
        ).update(
            state="failed",
            error_code=code,
            error_message=message[:300],
            finished_at=timezone.now(),
        )


@transaction.atomic
def cancel_generation(context, request_id):
    context.require("generate")
    request = GenerationRequest.objects.select_for_update().get(
        public_id=request_id, tenant_id=context.tenant_id, actor_id=context.actor_id
    )
    if request.state not in TERMINAL:
        request.state, request.finished_at = "cancelled", timezone.now()
        request.save(update_fields=["state", "finished_at"])
    return request


def recover_expired():
    cutoff = timezone.now() - timedelta(minutes=10)
    return GenerationRequest.objects.filter(
        Q(state__in=["searching", "generating"], lease_at__lt=cutoff)
        | Q(state="queued", created_at__lt=cutoff)
    ).update(
        state="failed",
        error_code="WORKER_EXPIRED",
        error_message="Generation timed out. Usage may have been consumed; review Usage before retrying.",
        finished_at=timezone.now(),
    )
