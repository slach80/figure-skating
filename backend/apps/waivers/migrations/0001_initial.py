import django.db.models.deletion
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("clubs", "0001_initial"),
        ("members", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="WaiverTemplate",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("title", models.CharField(max_length=200)),
                ("body", models.TextField(help_text="Waiver content — HTML or Markdown")),
                ("version", models.CharField(help_text="e.g., '2025-v1'", max_length=20)),
                (
                    "requires_guardian_signature",
                    models.BooleanField(
                        default=True,
                        help_text="If True, minors (under 13) must be signed by their guardian (managed_by).",
                    ),
                ),
                ("is_active", models.BooleanField(db_index=True, default=True)),
                (
                    "club",
                    models.ForeignKey(
                        editable=False,
                        on_delete=django.db.models.deletion.CASCADE,
                        to="clubs.club",
                    ),
                ),
            ],
            options={
                "ordering": ["title", "-version"],
            },
        ),
        migrations.CreateModel(
            name="WaiverSignature",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4, editable=False, primary_key=True, serialize=False
                    ),
                ),
                ("signed_at", models.DateTimeField(auto_now_add=True)),
                ("ip_address", models.GenericIPAddressField()),
                ("agreed", models.BooleanField()),
                (
                    "season_year",
                    models.PositiveSmallIntegerField(
                        help_text="Season year, e.g. 2025 for the 2025-2026 season."
                    ),
                ),
                (
                    "template",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="signatures",
                        to="waivers.waivertemplate",
                    ),
                ),
                (
                    "skater",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="waiver_signatures",
                        to="members.skater",
                    ),
                ),
                (
                    "signed_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="waiver_signatures",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-signed_at"],
                "unique_together": {("template", "skater", "season_year")},
            },
        ),
        migrations.AddIndex(
            model_name="waivertemplate",
            index=models.Index(fields=["club", "is_active"], name="waivers_wai_club_id_is_active_idx"),
        ),
        migrations.AddIndex(
            model_name="waiversignature",
            index=models.Index(fields=["skater", "season_year"], name="waivers_wai_skater_season_idx"),
        ),
        migrations.AddIndex(
            model_name="waiversignature",
            index=models.Index(fields=["template", "season_year"], name="waivers_wai_tmpl_season_idx"),
        ),
    ]
