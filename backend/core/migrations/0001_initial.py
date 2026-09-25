import uuid

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True
    dependencies = [migrations.swappable_dependency(settings.AUTH_USER_MODEL)]
    operations = [
        migrations.CreateModel(
            name="Site",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("public_id", models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ("name", models.CharField(max_length=100)),
                ("mode", models.CharField(choices=[("portfolio", "Portfolio"), ("store", "Store"), ("general", "General")], default="portfolio", max_length=12)),
                ("mascot_mode", models.CharField(choices=[("smokey", "Smokey"), ("custom", "Custom mascot"), ("standard", "Standard chatbot")], default="smokey", max_length=12)),
                ("custom_asset", models.ImageField(blank=True, upload_to="mascots/")),
                ("custom_asset_type", models.CharField(choices=[("static", "Static"), ("sprite", "Sprite")], default="static", max_length=8)),
                ("sprite_columns", models.PositiveSmallIntegerField(default=4)),
                ("sprite_rows", models.PositiveSmallIntegerField(default=2)),
                ("sprite_frames", models.JSONField(blank=True, default=dict)),
                ("accent_color", models.CharField(default="#2f5bff", max_length=7)),
                ("roaming", models.BooleanField(default=True)),
                ("allowed_origins", models.JSONField(default=list)),
                ("vector_store_id", models.CharField(blank=True, max_length=100)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="smokey_sites", to=settings.AUTH_USER_MODEL)),
            ],
        ),
        migrations.CreateModel(
            name="KnowledgeSource",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160)),
                ("kind", models.CharField(choices=[("file", "File"), ("text", "Text")], max_length=8)),
                ("body", models.TextField(blank=True)),
                ("file", models.FileField(blank=True, upload_to="knowledge/")),
                ("openai_file_id", models.CharField(blank=True, max_length=100)),
                ("status", models.CharField(choices=[("processing", "Processing"), ("ready", "Ready"), ("error", "Error")], default="processing", max_length=12)),
                ("error_message", models.CharField(blank=True, max_length=300)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="sources", to="core.site")),
            ],
        ),
        migrations.CreateModel(
            name="UsageDaily",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("date", models.DateField()),
                ("requests", models.PositiveIntegerField(default=0)),
                ("input_tokens", models.PositiveIntegerField(default=0)),
                ("output_tokens", models.PositiveIntegerField(default=0)),
                ("site", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="usage_days", to="core.site")),
            ],
            options={"constraints": [models.UniqueConstraint(fields=("site", "date"), name="unique_site_usage_day")]},
        ),
    ]
