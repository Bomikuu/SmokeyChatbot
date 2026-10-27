from django.db import migrations


def select_unambiguous_defaults(apps, schema_editor):
    settings = apps.get_model("smokey_assistant", "AssistantSettings")
    connections = apps.get_model("smokey_assistant", "ProviderConnection")
    database = schema_editor.connection.alias
    for config in settings.objects.using(database).filter(
        default_connection_id__isnull=True
    ).iterator():
        candidates = list(
            connections.objects.using(database).filter(
                tenant_id=config.tenant_id, status="ready"
            ).only("pk", "model", "permitted_models")[:2]
        )
        if len(candidates) == 1:
            connection = candidates[0]
            if connection.model in connection.permitted_models:
                settings.objects.using(database).filter(
                    pk=config.pk, default_connection_id__isnull=True
                ).update(default_connection_id=connection.pk)


class Migration(migrations.Migration):
    dependencies = [("smokey_assistant", "0003_connection_credits")]
    operations = [
        migrations.RunPython(select_unambiguous_defaults, migrations.RunPython.noop)
    ]
