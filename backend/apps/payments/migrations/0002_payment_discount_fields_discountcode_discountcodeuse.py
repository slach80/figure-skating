from decimal import Decimal
import django.db.models.deletion
import django.utils.timezone
import uuid

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("payments", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Payment discount fields ──────────────────────────────────────────
        migrations.AddField(
            model_name="payment",
            name="subtotal_amount",
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=10,
                help_text="Pre-discount total; equals amount when no discount applied",
            ),
        ),
        migrations.AddField(
            model_name="payment",
            name="discount_amount",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
        migrations.AddField(
            model_name="payment",
            name="family_discount_amount",
            field=models.DecimalField(
                decimal_places=2, default=0, max_digits=10,
                help_text="50% discount applied to skaters 2+ in a family registration",
            ),
        ),

        # ── DiscountCode ─────────────────────────────────────────────────────
        migrations.CreateModel(
            name="DiscountCode",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("code", models.CharField(db_index=True, max_length=50)),
                ("description", models.CharField(blank=True, max_length=200)),
                ("discount_type", models.CharField(
                    choices=[("percent", "Percentage"), ("fixed", "Fixed Amount")],
                    default="percent", max_length=10,
                )),
                ("value", models.DecimalField(
                    decimal_places=2, max_digits=8,
                    help_text="Percentage (0–100) or fixed dollar amount",
                )),
                ("max_uses", models.PositiveIntegerField(
                    blank=True, null=True,
                    help_text="Leave blank for unlimited uses",
                )),
                ("max_uses_per_family", models.PositiveIntegerField(
                    default=1,
                    help_text="How many times one family/payer can use this code",
                )),
                ("min_purchase_amount", models.DecimalField(
                    blank=True, decimal_places=2, max_digits=8, null=True,
                    help_text="Minimum order total before code applies",
                )),
                ("valid_from", models.DateField(blank=True, null=True)),
                ("valid_until", models.DateField(blank=True, null=True)),
                ("is_active", models.BooleanField(default=True)),
                ("club", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="%(app_label)s_%(class)s_set",
                    to="clubs.club",
                )),
                ("created_by", models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name="created_discount_codes",
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"ordering": ["code"]},
        ),
        migrations.AddConstraint(
            model_name="discountcode",
            constraint=models.UniqueConstraint(fields=["club", "code"], name="unique_club_discount_code"),
        ),
        migrations.AddIndex(
            model_name="discountcode",
            index=models.Index(fields=["club", "code", "is_active"], name="payments_dc_club_code_active_idx"),
        ),

        # ── DiscountCodeUse ──────────────────────────────────────────────────
        migrations.CreateModel(
            name="DiscountCodeUse",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("original_amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("discount_amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("final_amount", models.DecimalField(decimal_places=2, max_digits=10)),
                ("status", models.CharField(
                    choices=[("pending", "Pending"), ("applied", "Applied"), ("cancelled", "Cancelled")],
                    default="pending", max_length=20,
                )),
                ("used_at", models.DateTimeField(auto_now_add=True)),
                ("confirmed_at", models.DateTimeField(blank=True, null=True)),
                ("code", models.ForeignKey(
                    on_delete=django.db.models.deletion.PROTECT,
                    related_name="uses",
                    to="payments.discountcode",
                )),
                ("payer", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="discount_uses",
                    to=settings.AUTH_USER_MODEL,
                )),
                ("payment", models.OneToOneField(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="discount_use",
                    to="payments.payment",
                )),
            ],
            options={"ordering": ["-used_at"]},
        ),
        migrations.AddIndex(
            model_name="discountcodeuse",
            index=models.Index(fields=["code", "status"], name="payments_dcu_code_status_idx"),
        ),
        migrations.AddIndex(
            model_name="discountcodeuse",
            index=models.Index(fields=["payer", "status"], name="payments_dcu_payer_status_idx"),
        ),
    ]
