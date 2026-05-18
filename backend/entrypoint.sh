#!/bin/sh
set -e

# Only run Django setup steps when starting the web process, not celery workers.
# Celery containers share this image but pass their own CMD.
if [ "${1#gunicorn}" != "$1" ]; then
    python manage.py collectstatic --noinput
    python manage.py migrate --noinput
fi

exec "$@"
