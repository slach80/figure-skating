from rest_framework import serializers
from apps.waivers.models import WaiverSignature, WaiverTemplate


class WaiverTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = WaiverTemplate
        fields = [
            "id",
            "title",
            "body",
            "version",
            "requires_guardian_signature",
            "is_active",
            "created_at",
        ]
        read_only_fields = fields


class WaiverSignatureCreateSerializer(serializers.Serializer):
    template_id = serializers.UUIDField()
    skater_id = serializers.UUIDField()
    agreed = serializers.BooleanField()

    def validate_agreed(self, value):
        if not value:
            raise serializers.ValidationError("You must agree to the waiver terms to sign.")
        return value
