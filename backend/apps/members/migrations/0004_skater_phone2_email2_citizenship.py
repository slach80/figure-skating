from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0003_skaterlevel"),
    ]

    operations = [
        migrations.AddField(
            model_name="skater",
            name="is_us_citizen",
            field=models.BooleanField(
                blank=True, null=True,
                help_text="U.S. citizenship status for USFS eligibility",
            ),
        ),
    ]
