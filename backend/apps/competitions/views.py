from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.mixins import ClubScopedViewMixin
from apps.common.permissions import IsClubAdmin
from .models import Competition, EventCategory, CompetitionEntry
from .serializers import CompetitionSerializer, EventCategorySerializer, CompetitionEntrySerializer
from apps.notifications.tasks import send_competition_entry_confirmation


class CompetitionViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = Competition.objects.prefetch_related('categories', 'entries')
    serializer_class = CompetitionSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy', 'publish'):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        is_published = self.request.query_params.get('is_published')
        if is_published is not None:
            qs = qs.filter(is_published=is_published.lower() in ('true', '1', 'yes'))

        # ?status=open — competitions where entry is still open (deadline not passed or no deadline)
        entry_status = self.request.query_params.get('status')
        if entry_status == 'open':
            now = timezone.now()
            from django.db.models import Q
            qs = qs.filter(
                is_published=True
            ).filter(
                Q(entry_deadline__isnull=True)
                | Q(entry_deadline__gte=now)
                | Q(late_entry_deadline__gte=now)
            )

        return qs

    @action(detail=True, methods=['get'], url_path='entries')
    def entries(self, request, pk=None):
        competition = self.get_object()
        qs = CompetitionEntry.objects.filter(
            competition=competition,
            club=competition.club,
        ).select_related('skater', 'category', 'coach__user')
        serializer = CompetitionEntrySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='publish', permission_classes=[IsClubAdmin()])
    def publish(self, request, pk=None):
        competition = self.get_object()
        competition.is_published = True
        competition.save(update_fields=['is_published', 'updated_at'])
        return Response(CompetitionSerializer(competition).data)


class EventCategoryViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = EventCategory.objects.select_related('competition').prefetch_related('entries')
    serializer_class = EventCategorySerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        competition_id = self.request.query_params.get('competition')
        if competition_id:
            qs = qs.filter(competition_id=competition_id)
        return qs


class CompetitionEntryViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = CompetitionEntry.objects.select_related(
        'competition', 'category', 'skater', 'coach__user'
    )
    serializer_class = CompetitionEntrySerializer

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy', 'accept', 'set_draw', 'record_result'):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        competition_id = params.get('competition')
        if competition_id:
            qs = qs.filter(competition_id=competition_id)

        skater_id = params.get('skater')
        if skater_id:
            qs = qs.filter(skater_id=skater_id)

        entry_status = params.get('status')
        if entry_status:
            qs = qs.filter(status=entry_status)

        return qs

    def perform_create(self, serializer):
        club = self._get_club()
        if club is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Club context required.")

        competition = serializer.validated_data['competition']
        category = serializer.validated_data['category']
        skater = serializer.validated_data['skater']

        # Duplicate entry prevention
        if CompetitionEntry.objects.filter(
            competition=competition,
            category=category,
            skater=skater,
        ).exists():
            raise ValidationError({"error": "Skater already entered in this category"})

        # Late entry enforcement
        is_late = competition.is_late
        if is_late:
            # If there's a late deadline, entries are still accepted (with late fee)
            # Only block if the late deadline has also passed (or there's no late deadline)
            now = timezone.now()
            late_deadline_passed = (
                competition.late_entry_deadline is not None
                and now > competition.late_entry_deadline
            )
            no_late_window = competition.late_entry_deadline is None
            if no_late_window or late_deadline_passed:
                raise ValidationError({"error": "Entry deadline has passed"})

        entry_fee = competition.base_entry_fee + category.additional_fee
        if is_late:
            entry_fee = entry_fee + competition.late_fee

        entry = serializer.save(
            club=club,
            entry_fee=entry_fee,
            is_late=is_late,
            status='submitted',
        )
        # Fire confirmation email asynchronously; failure must not block the HTTP response
        try:
            send_competition_entry_confirmation.delay(str(entry.id))
        except Exception as exc:
            import logging
            logging.getLogger(__name__).warning(
                "Failed to enqueue competition entry confirmation for entry %s: %s", entry.id, exc
            )

    @action(detail=False, methods=['get'], url_path='my', permission_classes=[IsAuthenticated()])
    def my(self, request):
        """Return all entries for skaters managed by (or belonging to) the current user."""
        from apps.members.models import Skater
        from django.db.models import Q

        club = self._get_club()

        # Gather all skater IDs the user has access to:
        # 1. The user's own skater profile (if any)
        # 2. Skaters the user manages (parent/guardian)
        skater_ids = list(
            Skater.objects.filter(club=club, deleted_at__isnull=True).filter(
                Q(user=request.user) | Q(managed_by=request.user)
            ).values_list('id', flat=True)
        )

        if not skater_ids:
            return Response([])

        qs = CompetitionEntry.objects.filter(
            club=club,
            skater_id__in=skater_ids,
        ).select_related('competition', 'category', 'skater', 'coach__user').order_by(
            '-competition__start_date', 'category__discipline'
        )

        serializer = CompetitionEntrySerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='scratch')
    def scratch(self, request, pk=None):
        entry = self.get_object()
        if entry.status == CompetitionEntry.STATUS_SCRATCHED:
            return Response({'detail': 'Entry is already scratched.'}, status=status.HTTP_400_BAD_REQUEST)
        entry.status = CompetitionEntry.STATUS_SCRATCHED
        entry.scratched_at = timezone.now()
        entry.save(update_fields=['status', 'scratched_at', 'updated_at'])
        return Response(CompetitionEntrySerializer(entry).data)

    @action(detail=True, methods=['post'], url_path='accept', permission_classes=[IsClubAdmin()])
    def accept(self, request, pk=None):
        entry = self.get_object()
        entry.status = CompetitionEntry.STATUS_ACCEPTED
        entry.save(update_fields=['status', 'updated_at'])
        return Response(CompetitionEntrySerializer(entry).data)

    @action(detail=True, methods=['post'], url_path='set-draw', permission_classes=[IsClubAdmin()])
    def set_draw(self, request, pk=None):
        entry = self.get_object()
        draw_number = request.data.get('draw_number')
        skating_order = request.data.get('skating_order')
        if draw_number is not None:
            entry.draw_number = draw_number
        if skating_order is not None:
            entry.skating_order = skating_order
        entry.save(update_fields=['draw_number', 'skating_order', 'updated_at'])
        return Response(CompetitionEntrySerializer(entry).data)

    @action(detail=True, methods=['post'], url_path='record-result', permission_classes=[IsClubAdmin()])
    def record_result(self, request, pk=None):
        entry = self.get_object()
        placement = request.data.get('placement')
        score = request.data.get('score')
        result_notes = request.data.get('result_notes', '')
        if placement is not None:
            entry.placement = placement
        if score is not None:
            entry.score = score
        entry.result_notes = result_notes
        entry.save(update_fields=['placement', 'score', 'result_notes', 'updated_at'])
        return Response(CompetitionEntrySerializer(entry).data)
