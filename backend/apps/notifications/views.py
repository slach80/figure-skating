from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.request import Request
from apps.common.permissions import IsClubAdmin


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
