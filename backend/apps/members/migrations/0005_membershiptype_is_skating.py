from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("members", "0004_skater_phone2_email2_citizenship"),
    ]

    operations = [
        migrations.AddField(
            model_name="membershiptype",
            name="is_skating",
            field=models.BooleanField(
                default=True,
                help_text="Uncheck for non-skating members (e.g. parents, Associate Professional) to block ice/test session booking.",
            ),
        ),
    ]
