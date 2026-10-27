from django.db.models import Count, Q, Sum

from .models import UsageAttempt


def connection_usage(tenant_id, connection_ids):
    """Lifetime recorded usage, grouped once for a scoped connection list."""
    groups = UsageAttempt.objects.filter(
        tenant_id=tenant_id, connection_id_snapshot__in=connection_ids
    ).values("connection_id_snapshot", "provider", "model").annotate(
        calls=Count("pk"),
        input_tokens_total=Sum("input_tokens"),
        output_tokens_total=Sum("output_tokens"),
        unknown=Count(
            "pk", filter=Q(input_tokens__isnull=True) | Q(output_tokens__isnull=True)
        ),
    )
    result = {}
    for group in groups:
        connection_id = group.pop("connection_id_snapshot")
        group["input_tokens"] = group.pop("input_tokens_total")
        group["output_tokens"] = group.pop("output_tokens_total")
        result.setdefault(connection_id, []).append(group)
    return result


def connection_payload(connection, usage_rows=None):
    connection_id = str(connection.public_id)
    if usage_rows is None:
        usage_rows = connection_usage(connection.tenant_id, [connection_id]).get(
            connection_id, []
        )
    return {
        "id": connection_id,
        "name": connection.name,
        "provider": connection.provider,
        "model": connection.model,
        "permitted_models": connection.permitted_models,
        "secret_suffix": connection.secret_suffix,
        "status": connection.status,
        "credits_usd": str(connection.credits_usd)
        if connection.credits_usd is not None
        else None,
        "usage_by_model": usage_rows,
        "checked_at": connection.checked_at.isoformat()
        if connection.checked_at
        else None,
    }
