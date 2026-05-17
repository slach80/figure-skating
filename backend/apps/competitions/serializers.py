from rest_framework import serializers
from .models import Competition, EventCategory, CompetitionEntry


class CompetitionSerializer(serializers.ModelSerializer):
    entry_count = serializers.IntegerField(read_only=True)
    is_entry_open = serializers.BooleanField(read_only=True)
    is_late = serializers.BooleanField(read_only=True)
    category_count = serializers.SerializerMethodField()

    def get_category_count(self, obj):
        return obj.categories.count()

    class Meta:
        model = Competition
        fields = '__all__'
        read_only_fields = ['id', 'club', 'created_at', 'updated_at']


class EventCategorySerializer(serializers.ModelSerializer):
    entry_count = serializers.SerializerMethodField()

    def get_entry_count(self, obj):
        return obj.entries.filter(status__in=['submitted', 'confirmed', 'accepted']).count()

    class Meta:
        model = EventCategory
        fields = '__all__'
        read_only_fields = ['id', 'club', 'created_at', 'updated_at']


class CompetitionEntrySerializer(serializers.ModelSerializer):
    skater_name = serializers.CharField(source='skater.full_name', read_only=True)
    skater_usfs = serializers.CharField(source='skater.usfs_number', read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True)
    competition_name = serializers.CharField(source='competition.name', read_only=True)
    coach_name = serializers.SerializerMethodField()
    total_fee = serializers.DecimalField(source='total_fee', max_digits=8, decimal_places=2, read_only=True)

    def get_coach_name(self, obj):
        return obj.coach.user.get_full_name() if obj.coach else None

    class Meta:
        model = CompetitionEntry
        fields = '__all__'
        read_only_fields = ['id', 'club', 'created_at', 'updated_at', 'is_late']
