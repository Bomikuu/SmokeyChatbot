import uuid

from django.conf import settings
from django.db import models


class Site(models.Model):
    class Mode(models.TextChoices):
        PORTFOLIO = "portfolio", "Portfolio"
        STORE = "store", "Store"
        GENERAL = "general", "General"

    class MascotMode(models.TextChoices):
        SMOKEY = "smokey", "Smokey"
        CUSTOM = "custom", "Custom mascot"
        STANDARD = "standard", "Standard chatbot"

    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="smokey_sites")
    public_id = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=100)
    mode = models.CharField(max_length=12, choices=Mode.choices, default=Mode.PORTFOLIO)
    mascot_mode = models.CharField(max_length=12, choices=MascotMode.choices, default=MascotMode.SMOKEY)
    custom_asset = models.ImageField(upload_to="mascots/", blank=True)
    custom_asset_type = models.CharField(max_length=8, choices=[("static", "Static"), ("sprite", "Sprite")], default="static")
    sprite_columns = models.PositiveSmallIntegerField(default=4)
    sprite_rows = models.PositiveSmallIntegerField(default=2)
    sprite_frames = models.JSONField(default=dict, blank=True)
    accent_color = models.CharField(max_length=7, default="#2f5bff")
    roaming = models.BooleanField(default=True)
    allowed_origins = models.JSONField(default=list)
    vector_store_id = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class KnowledgeSource(models.Model):
    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        READY = "ready", "Ready"
        ERROR = "error", "Error"

    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="sources")
    title = models.CharField(max_length=160)
    kind = models.CharField(max_length=8, choices=[("file", "File"), ("text", "Text")])
    body = models.TextField(blank=True)
    file = models.FileField(upload_to="knowledge/", blank=True)
    openai_file_id = models.CharField(max_length=100, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PROCESSING)
    error_message = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


class UsageDaily(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="usage_days")
    date = models.DateField()
    requests = models.PositiveIntegerField(default=0)
    input_tokens = models.PositiveIntegerField(default=0)
    output_tokens = models.PositiveIntegerField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["site", "date"], name="unique_site_usage_day")]
