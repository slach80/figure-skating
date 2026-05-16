from .base import *

DEBUG = True
CORS_ALLOW_ALL_ORIGINS = True

# Use console email in local dev
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
