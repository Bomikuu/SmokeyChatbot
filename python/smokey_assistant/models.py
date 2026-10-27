import uuid

from django.db import models


class TenantModel(models.Model):
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    tenant_id = models.CharField(max_length=120, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        abstract = True


class AssistantSettings(TenantModel):
    tenant_id = models.CharField(max_length=120, unique=True)
    default_connection = models.ForeignKey(
        "ProviderConnection", null=True, blank=True, on_delete=models.SET_NULL
    )
    presentation = models.CharField(max_length=8, default="drawer")
    mascot = models.JSONField(default=dict)
    mascot_asset = models.BinaryField(null=True, editable=False)
    daily_requests = models.PositiveIntegerField(default=100)
    monthly_requests = models.PositiveIntegerField(default=2000)
    daily_tokens = models.PositiveIntegerField(default=200000)
    monthly_tokens = models.PositiveIntegerField(default=3000000)


class ProviderConnection(TenantModel):
    name = models.CharField(max_length=100)
    provider = models.CharField(max_length=20)
    model = models.CharField(max_length=180)
    permitted_models = models.JSONField(default=list)
    encrypted_secret = models.TextField()
    secret_suffix = models.CharField(max_length=4)
    revision = models.PositiveIntegerField(default=1)
    status = models.CharField(max_length=16, default="untested")
    checked_at = models.DateTimeField(null=True)
    credits_usd = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)


class GenerationRequest(TenantModel):
    actor_id = models.CharField(max_length=100)
    idempotency_key = models.CharField(max_length=100)
    prompt = models.CharField(max_length=4000)
    plan = models.JSONField(default=dict)
    connection = models.ForeignKey(
        ProviderConnection, null=True, on_delete=models.SET_NULL
    )
    connection_revision = models.PositiveIntegerField()
    provider = models.CharField(max_length=20)
    model = models.CharField(max_length=180)
    state = models.CharField(max_length=16, default="queued", db_index=True)
    error_code = models.CharField(max_length=40, blank=True)
    error_message = models.CharField(max_length=300, blank=True)
    clarification = models.CharField(max_length=500, blank=True)
    lease_at = models.DateTimeField(null=True)
    finished_at = models.DateTimeField(null=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant_id", "actor_id", "idempotency_key"],
                name="smokey_unique_submission",
            )
        ]


class ReportSnapshot(TenantModel):
    request = models.OneToOneField(
        GenerationRequest, on_delete=models.CASCADE, related_name="report"
    )
    title = models.CharField(max_length=160)
    facts = models.JSONField(default=dict)
    narrative = models.JSONField(default=dict)


class ReportDetailRow(models.Model):
    report = models.ForeignKey(
        ReportSnapshot, on_delete=models.CASCADE, related_name="rows"
    )
    table_key = models.CharField(max_length=40)
    ordinal = models.PositiveIntegerField()
    data = models.JSONField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["report", "table_key", "ordinal"],
                name="smokey_unique_report_row",
            )
        ]


class UsageBucket(models.Model):
    tenant_id = models.CharField(max_length=120)
    period = models.CharField(max_length=10)
    requests = models.PositiveIntegerField(default=0)
    tokens = models.PositiveBigIntegerField(default=0)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["tenant_id", "period"], name="smokey_unique_usage_period"
            )
        ]


class UsageAttempt(TenantModel):
    request = models.ForeignKey(
        GenerationRequest, null=True, on_delete=models.SET_NULL, related_name="attempts"
    )
    connection_id_snapshot = models.CharField(max_length=40)
    provider = models.CharField(max_length=20)
    model = models.CharField(max_length=180)
    purpose = models.CharField(max_length=16)
    outcome = models.CharField(max_length=16, default="reserved")
    input_tokens = models.PositiveBigIntegerField(null=True)
    output_tokens = models.PositiveBigIntegerField(null=True)
    reserved_tokens = models.PositiveBigIntegerField()
    periods = models.JSONField(default=list)
    provider_request_id = models.CharField(max_length=200, blank=True)
    error_code = models.CharField(max_length=40, blank=True)
    finished_at = models.DateTimeField(null=True)
