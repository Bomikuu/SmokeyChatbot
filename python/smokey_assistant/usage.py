from zoneinfo import ZoneInfo
from django.utils import timezone
from django.db.models import Count, Sum, Q, F
from .models import UsageAttempt, UsageBucket


def usage_summary(context, date_from, date_to):
    context.require("view_reports")
    attempts = UsageAttempt.objects.filter(
        tenant_id=context.tenant_id, created_at__gte=date_from, created_at__lt=date_to
    )
    today = timezone.localdate(timezone=ZoneInfo(context.timezone))
    by_model = list(
        attempts.values("connection_id_snapshot", "provider", "model").annotate(
            calls=Count("pk"),
            input_total=Sum("input_tokens"),
            output_total=Sum("output_tokens"),
            failed=Count("pk", filter=Q(outcome="failed")),
            unknown=Count(
                "pk",
                filter=Q(input_tokens__isnull=True) | Q(output_tokens__isnull=True),
            ),
        )
    )
    for row in by_model:
        row["input_tokens"] = row.pop("input_total")
        row["output_tokens"] = row.pop("output_total")
    return {
        "by_model": by_model,
        "limits_usage": list(
            UsageBucket.objects.filter(
                tenant_id=context.tenant_id,
                period__in=[today.isoformat(), today.strftime("%Y-%m")],
            )
            .order_by("-period")
            .values("period", "requests", "tokens")
        ),
        "attempts": list(
            attempts.order_by("-created_at")
            .annotate(
                generation_id=F("request__public_id"),
                generation_state=F("request__state"),
                actor_id=F("request__actor_id"),
            )[:100]
            .values(
                "provider",
                "model",
                "purpose",
                "outcome",
                "input_tokens",
                "output_tokens",
                "created_at",
                "error_code",
                "generation_id",
                "generation_state",
                "actor_id",
            )
        ),
    }
