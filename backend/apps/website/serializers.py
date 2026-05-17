from rest_framework import serializers
from .models import SiteConfig, Announcement


class SiteConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = SiteConfig
        fields = [
            'id', 'tagline', 'about_text', 'contact_email', 'contact_phone',
            'address', 'facebook_url', 'instagram_url', 'rink_name', 'rink_address',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class AnnouncementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Announcement
        fields = ['id', 'title', 'body', 'is_published', 'published_at', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
