from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("smokey_assistant", "0002_private_mascot")]
    operations = [
        migrations.AddField(
            model_name="providerconnection",
            name="credits_usd",
            field=models.DecimalField(
                max_digits=12, decimal_places=2, null=True, blank=True
            ),
        )
    ]
