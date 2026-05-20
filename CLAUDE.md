# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack web platform for **Line Creek Figure Skating Club** — Django REST API backend + Next.js 14 frontend, containerized with Docker Compose.

## Development Commands

### Full Stack (Docker — preferred)
```bash
docker-compose up                          # Start all 6 services
docker-compose up backend celery           # Backend only
docker-compose -f docker-compose.prod.yml up -d  # Production
```

### Backend (Django 5.1)
```bash
cd backend
python manage.py runserver 0.0.0.0:8000   # Dev server (port 8000)
python manage.py migrate
python manage.py check

# Tests (pytest-django)
pytest -v                                  # All tests
pytest apps/members/tests/ -v             # Single app
pytest apps/scheduling/tests/test_views.py::TestClass::test_method -v  # Single test

# Settings module
DJANGO_SETTINGS_MODULE=config.settings.local  # default via manage.py
```

### Frontend (Next.js 14)
```bash
cd frontend
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test:e2e     # Playwright end-to-end
npm run test:e2e:ui  # Playwright UI mode
```

## Architecture

### Backend (`/backend/`)
Django project with `config/` as the settings module. 11 Django apps under `apps/`:

| App | Responsibility |
|-----|---------------|
| `accounts` | JWT auth, Google OAuth (django-allauth) |
| `clubs` | Club management |
| `members` | Skater profiles |
| `scheduling` | Ice time scheduling |
| `competitions` | Competition data (Skater-Stats API) |
| `ice` | Venue/rink management |
| `payments` | Stripe integration |
| `notifications` | Email + push notifications |
| `waivers` | Digital waivers |
| `website` | Static content management |
| `common` | Shared utilities |

All API routes are prefixed `/api/v1/` (defined in `config/urls.py`).

Celery workers handle async tasks on queues: `default`, `payments`, `sync`. `celery-beat` runs scheduled tasks via `DatabaseScheduler`.

### Frontend (`/frontend/`)
Next.js 14 App Router (not Pages Router). Key patterns:

- **Data fetching**: TanStack Query v5 hooks in `src/hooks/` (e.g., `useSkaters`)
- **State**: Zustand for client-side state
- **API client**: `src/lib/api.ts` — Axios instance that auto-injects JWT from localStorage; on 401, clears tokens and redirects to login
- **Auth middleware**: `src/middleware.ts` protects routes
- **UI**: Radix UI primitives + Tailwind CSS + Lucide icons

### Frontend → Backend Connectivity
Next.js rewrites `/api/*` to the backend URL (configured in `next.config.mjs`). In Docker, `BACKEND_INTERNAL_URL=http://backend:8000`. Locally, `NEXT_PUBLIC_API_URL=http://localhost:8000`.

### Infrastructure
- **Database**: PostgreSQL 16 (`linecreek` db)
- **Cache/Queue broker**: Redis 7
- **Production**: Gunicorn (4 workers) for Django; Next.js standalone build

## Environment Setup

Copy `.env.example` to `.env` (backend) and `frontend/.env.local`. Key variables:
- Backend: `DJANGO_SECRET_KEY`, `DATABASE_URL`, `REDIS_URL`, `STRIPE_SECRET_KEY`, `GOOGLE_CLIENT_ID/SECRET`
- Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`

## CI Pipeline (`.github/workflows/ci.yml`)
Runs on each push: backend pytest (`apps/members`, `apps/scheduling`, `apps/notifications`) + frontend TypeScript strict check + ESLint against PostgreSQL and Redis test instances.
