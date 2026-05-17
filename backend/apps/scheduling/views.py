from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.mixins import ClubScopedViewMixin
from apps.common.permissions import IsClubAdmin
from django.db import models as django_models
from .models import Coach, LessonType, AvailabilitySlot, Booking, CoachEvaluation, LessonPackage, PurchasedPackage, TestSession, TestRegistration
from .serializers import (
    CoachListSerializer,
    CoachDetailSerializer,
    LessonTypeSerializer,
    AvailabilitySlotSerializer,
    BookingListSerializer,
    BookingDetailSerializer,
    CoachEvaluationSerializer,
    LessonPackageSerializer,
    PurchasedPackageSerializer,
    TestSessionSerializer,
    TestRegistrationSerializer,
)


class CoachViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = Coach.objects.select_related("user")

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return CoachListSerializer
        return CoachDetailSerializer


class LessonTypeViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = LessonType.objects.all()
    serializer_class = LessonTypeSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsClubAdmin()]
        return [IsAuthenticated()]


class AvailabilitySlotViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = AvailabilitySlot.objects.select_related("coach__user", "lesson_type")
    serializer_class = AvailabilitySlotSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy", "cancel"):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        coach_id = params.get("coach")
        if coach_id:
            qs = qs.filter(coach_id=coach_id)

        date_exact = params.get("date")
        if date_exact:
            qs = qs.filter(date=date_exact)

        date_from = params.get("date_from")
        if date_from:
            qs = qs.filter(date__gte=date_from)

        date_to = params.get("date_to")
        if date_to:
            qs = qs.filter(date__lte=date_to)

        slot_status = params.get("status")
        if slot_status == "available":
            qs = qs.filter(status__in=(
                AvailabilitySlot.STATUS_AVAILABLE,
                AvailabilitySlot.STATUS_PARTIALLY_BOOKED,
            ))
        elif slot_status:
            qs = qs.filter(status=slot_status)

        return qs

    def perform_create(self, serializer):
        club = self._get_club()
        if club is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Club context required.")

        # Resolve coach and lesson_type from write-only ID fields
        from .models import Coach as CoachModel, LessonType as LessonTypeModel
        coach_id = serializer.validated_data.pop("coach_id")
        lesson_type_id = serializer.validated_data.pop("lesson_type_id")

        try:
            coach = CoachModel.objects.get(id=coach_id, club=club)
        except CoachModel.DoesNotExist:
            raise ValidationError({"coach_id": "Coach not found for this club."})

        try:
            lesson_type = LessonTypeModel.objects.get(id=lesson_type_id, club=club)
        except LessonTypeModel.DoesNotExist:
            raise ValidationError({"lesson_type_id": "LessonType not found for this club."})

        slot = serializer.save(club=club, coach=coach, lesson_type=lesson_type)

        # Generate and bulk-create recurring instances
        if slot.recurrence != AvailabilitySlot.RECURRENCE_NONE:
            instances = slot.generate_recurring_slots()
            if instances:
                AvailabilitySlot.objects.bulk_create(instances)

    @action(detail=True, methods=["post"], url_path="cancel", permission_classes=[IsClubAdmin])
    def cancel(self, request, pk=None):
        slot = self.get_object()
        if slot.status == AvailabilitySlot.STATUS_CANCELLED:
            return Response(
                {"detail": "Slot is already cancelled."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        slot.status = AvailabilitySlot.STATUS_CANCELLED
        slot.save(update_fields=["status", "updated_at"])
        return Response(AvailabilitySlotSerializer(slot).data)


class BookingViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = Booking.objects.select_related(
        "skater", "coach__user", "lesson_type", "availability_slot", "cancelled_by"
    )

    def get_permissions(self):
        if self.action in ("confirm", "complete", "today"):
            return [IsAuthenticated()]
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == "list":
            return BookingListSerializer
        return BookingDetailSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        coach_id = params.get("coach")
        if coach_id:
            qs = qs.filter(coach_id=coach_id)

        skater_id = params.get("skater")
        if skater_id:
            qs = qs.filter(skater_id=skater_id)

        date_param = params.get("date")
        if date_param:
            qs = qs.filter(scheduled_date=date_param)

        booking_status = params.get("status")
        if booking_status:
            qs = qs.filter(status=booking_status)

        return qs

    def perform_create(self, serializer):
        club = self._get_club()
        if club is None:
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Club context required.")

        from .models import Coach as CoachModel, LessonType as LessonTypeModel
        coach_id = serializer.validated_data.pop("coach_id")
        lesson_type_id = serializer.validated_data.pop("lesson_type_id")

        try:
            coach = CoachModel.objects.get(id=coach_id, club=club)
        except CoachModel.DoesNotExist:
            raise ValidationError({"coach_id": "Coach not found for this club."})

        try:
            lesson_type = LessonTypeModel.objects.get(id=lesson_type_id, club=club)
        except LessonTypeModel.DoesNotExist:
            raise ValidationError({"lesson_type_id": "LessonType not found for this club."})

        booking = serializer.save(club=club, coach=coach, lesson_type=lesson_type)

        from apps.notifications.tasks import send_booking_confirmation
        send_booking_confirmation.delay(str(booking.id))

    @action(detail=True, methods=["post"], url_path="confirm")
    def confirm(self, request, pk=None):
        booking = self.get_object()
        try:
            booking.confirm()
        except Exception as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="cancel")
    def cancel(self, request, pk=None):
        booking = self.get_object()
        reason = request.data.get("reason", "")
        notes = request.data.get("notes", "")
        try:
            booking.cancel(reason=reason, notes=notes, cancelled_by=request.user)
        except Exception as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="complete")
    def complete(self, request, pk=None):
        booking = self.get_object()
        try:
            booking.complete()
        except Exception as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        return Response(BookingDetailSerializer(booking).data)

    @action(detail=False, methods=["get"], url_path="today")
    def today(self, request):
        today = timezone.now().date()
        qs = self.get_queryset().filter(scheduled_date=today)

        # If the user has a coach profile, scope to their own bookings only
        if hasattr(request.user, "coach_profile") and request.user.role not in ("admin", "super_admin"):
            qs = qs.filter(coach=request.user.coach_profile)

        serializer = BookingListSerializer(qs, many=True)
        return Response(serializer.data)


class CoachEvaluationViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = CoachEvaluation.objects.select_related('skater', 'coach__user')
    serializer_class = CoachEvaluationSerializer

    def get_permissions(self):
        if self.action == 'destroy':
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        skater_id = self.request.query_params.get('skater')
        if skater_id:
            qs = qs.filter(skater_id=skater_id)
        coach_id = self.request.query_params.get('coach')
        if coach_id:
            qs = qs.filter(coach_id=coach_id)
        return qs

    def perform_create(self, serializer):
        club = self._get_club()
        serializer.save(club=club)


class LessonPackageViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = LessonPackage.objects.select_related('lesson_type')
    serializer_class = LessonPackageSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        lt = self.request.query_params.get('lesson_type')
        if lt:
            qs = qs.filter(lesson_type_id=lt)
        if self.request.query_params.get('active'):
            qs = qs.filter(is_active=True)
        return qs


class PurchasedPackageViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = PurchasedPackage.objects.select_related('skater', 'package__lesson_type')
    serializer_class = PurchasedPackageSerializer

    def get_permissions(self):
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        skater_id = self.request.query_params.get('skater')
        if skater_id:
            qs = qs.filter(skater_id=skater_id)
        if self.request.query_params.get('active'):
            qs = qs.filter(
                payment_status='paid',
                lessons_used__lt=django_models.F('lessons_total'),
            )
        return qs

    def perform_create(self, serializer):
        club = self._get_club()
        package = serializer.validated_data['package']
        serializer.save(
            club=club,
            lessons_total=package.lesson_count,
            amount_paid=package.price,
        )


class TestSessionViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = TestSession.objects.prefetch_related('registrations')
    serializer_class = TestSessionSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get('open'):
            qs = qs.filter(is_open=True)
        return qs


class TestRegistrationViewSet(ClubScopedViewMixin, viewsets.ModelViewSet):
    queryset = TestRegistration.objects.select_related('skater', 'test_session')
    serializer_class = TestRegistrationSerializer

    def get_permissions(self):
        if self.action in ('update', 'partial_update', 'destroy', 'record_result'):
            return [IsClubAdmin()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        session_id = self.request.query_params.get('session')
        if session_id:
            qs = qs.filter(test_session_id=session_id)
        return qs

    def perform_create(self, serializer):
        club = self._get_club()
        serializer.save(club=club)

    @action(detail=True, methods=['post'], url_path='record-result', permission_classes=[IsClubAdmin()])
    def record_result(self, request, pk=None):
        registration = self.get_object()
        result = request.data.get('result')
        notes = request.data.get('notes', '')
        if result not in dict(TestRegistration.RESULT_CHOICES):
            return Response({'detail': 'Invalid result.'}, status=status.HTTP_400_BAD_REQUEST)
        registration.result = result
        registration.result_notes = notes
        registration.save(update_fields=['result', 'result_notes', 'updated_at'])
        return Response(TestRegistrationSerializer(registration).data)
