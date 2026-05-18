from .base import *
from decouple import config

DEBUG = False
SECURE_SSL_REDIRECT = False
SECURE_HSTS_SECONDS = 0
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False

CORS_ALLOWED_ORIGINS = [
    config("STAGING_FRONTEND_URL", default="http://192.168.1.232:3001"),
]

# Relax email verification so testers don't need real inboxes
ACCOUNT_EMAIL_VERIFICATION = "optional"
