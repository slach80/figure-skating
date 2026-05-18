from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from apps.common.permissions import IsClubAdmin, IsClubMember
from .models import PushSubscription
from .serializers import PushSubscriptionSerializer


class BroadcastEmailView(APIView):
    permission_classes = [IsAuthenticated, IsClubAdmin]

    def post(self, request: Request) -> Response:
        subject = str(request.data.get("subject", "")).strip()
        body = str(request.data.get("body", "")).strip()
        recipient_filter: dict = request.data.get("filter", {})

        if not subject or not body:
            return Response({"detail": "Subject and body are required."}, status=400)

        club = getattr(request, "club", None) or getattr(request.user, "club", None)
        if not club:
            return Response({"detail": "Club context required."}, status=400)

        from apps.notifications.tasks import send_broadcast_email

        send_broadcast_email.delay(str(club.id), subject, body, recipient_filter)

        return Response({"detail": "Broadcast queued."})


class PushSubscribeView(APIView):
    permission_classes = [IsAuthenticated, IsClubMember]

    def post(self, request: Request) -> Response:
        serializer = PushSubscriptionSerializer(
            data=request.data, context={"request": request}
        )
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        return Response({"detail": "Subscribed."}, status=201)


class PushUnsubscribeView(APIView):
    permission_classes = [IsAuthenticated, IsClubMember]

    def delete(self, request: Request) -> Response:
        endpoint = request.data.get("endpoint", "")
        if not endpoint:
            return Response({"detail": "endpoint is required."}, status=400)
        deleted, _ = PushSubscription.objects.filter(
            user=request.user, endpoint=endpoint
        ).delete()
        if deleted:
            return Response({"detail": "Unsubscribed."})
        return Response({"detail": "Subscription not found."}, status=404)
