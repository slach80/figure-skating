from rest_framework import serializers
from .models import PushSubscription


class PushSubscriptionSerializer(serializers.Serializer):
    endpoint = serializers.URLField(max_length=500)
    p256dh = serializers.CharField()
    auth = serializers.CharField()

    def create(self, validated_data: dict) -> PushSubscription:
        user = self.context["request"].user
        subscription, _ = PushSubscription.objects.update_or_create(
            user=user,
            endpoint=validated_data["endpoint"],
            defaults={
                "p256dh": validated_data["p256dh"],
                "auth": validated_data["auth"],
            },
        )
        return subscription
