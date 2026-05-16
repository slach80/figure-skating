# ADR-001: Platform Architecture for Line Creek FSC

**Status:** Accepted  
**Date:** 2026-05-16  
**Authors:** slach, Claude  
**Scope:** All backend data models, app layout, authentication, tenancy, payments, and compliance  

---

## Context

Line Creek Figure Skating Club (FSC) currently uses EntryEeze for member registration/payments and SportsEngine for its club website. Both tools are expensive, poorly integrated, and technologically stagnant (EntryEeze is 2008-era .NET; SportsEngine is an overpriced CMS). No modern all-in-one platform exists in the US market for figure skating clubs.

We are building a multi-tenant Django platform that replaces both tools and eventually serves 10-50 US figure skating clubs. Line Creek FSC is the first customer (~150 active members, 30-40 families). The platform handles membership management, USFS registration exports, lesson booking, test session registration, contract/club ice, Skater-Stats competition history integration, and a public-facing club website.

Key constraints:
- Many members are minors (under 13) — COPPA applies.
- USFS has no API; CSV batch upload is the only integration path.
- Skater-Stats has a free internal JSON API (no auth, server-side accessible) that provides full competition history.
- Clubs are small (50-500 members). We will never need to handle millions of concurrent users.
- Revenue flows through Stripe. Clubs must receive their own funds directly.
- The frontend is Next.js (separate repo). This ADR governs the Django backend only.

---

## Decision 1: App Directory Layout

**Decision: Option A (domain-driven apps) with slight renaming**

```
apps/
    clubs/          # Multi-tenant root: Club model, branding, settings, seasons
    accounts/       # Custom User model, authentication, family groups, guardians
    members/        # USFS member profiles (Skater), membership types, renewals, USFS CSV export
    scheduling/     # Lessons (private/group/semi-private), instructor availability, bookings, packages
    competitions/   # Test sessions, competition entries, Skater-Stats integration, results
    ice/            # Contract ice / freestyle sessions, in-club vs out-of-club pricing
    payments/       # Stripe integration, invoices, receipts, refunds, payment history
    website/        # Public-facing CMS: pages, news, events calendar, coach profiles
    notifications/  # Email/SMS dispatch, renewal reminders, booking confirmations
```

**Rationale:** Domain-driven apps map directly to how club administrators think about their operations. Each app owns a bounded context with minimal cross-app model dependencies. "Core" or "portal" names are too vague and invite dumping unrelated code together. Nine apps is not too many — each stays small and testable.

---

## Decision 2: User/Member Separation

**Decision: Option C — Custom User + separate Skater profile**

The auth layer and the USFS skating identity are fundamentally different concerns:

- `accounts.User` — Custom AbstractUser. Handles login (email/password or OAuth). Has `club` FK, role flags (`is_staff`, `is_coach`), and contact info.
- `members.Skater` — The USFS skating identity. Has `user` FK (nullable — minor skaters may not have their own login), `usfs_number`, `dob`, `membership_type`, `skater_stats_slug`, and all USFS registration fields.

A single `User` can be linked to zero or more `Skater` records (a parent with no skating identity, or a parent who also skates). A minor's `Skater` record has no `User` — their parent's `User` manages it via the `FamilyGroup`.

**Rationale:** This cleanly separates "who can log in" from "who is registered with USFS." It avoids polluting the User model with skating-specific fields, and it naturally supports the family account pattern where one login manages multiple skaters.

---

## Decision 3: Family Account Structure

**Decision: Option A — FamilyGroup with primary contact**

```
accounts.FamilyGroup
    id              UUID PK
    club            FK(Club)
    name            CharField  (e.g., "The Anderson Family")
    created_at      DateTimeField

accounts.User
    family_group    FK(FamilyGroup, null=True)
    is_primary      BooleanField (default=False)

members.Skater
    family_group    FK(FamilyGroup, null=True)
    managed_by      FK(User)  # The parent/guardian who manages this profile
```

Rules:
- Every `FamilyGroup` has exactly one `User` where `is_primary=True`. That user is the billing contact.
- Minor skaters belong to the same `FamilyGroup` as their parent.
- An adult skater with no family can have `family_group=NULL` (solo account).
- All payments for the family route to the primary user's Stripe Customer record.

**Rationale:** Self-referential FKs (Option B) create ambiguous parent-child queries and break down when two parents share management. A separate `Guardian` model (Option C) adds a join table that provides no benefit over the simpler FK pattern. The `FamilyGroup` is explicit, queryable, and maps to how clubs already think about families.

---

## Decision 4: Multi-Tenant club_id Enforcement

**Decision: Option B + C combined — Middleware sets request.club; abstract base model provides the FK; DRF mixin enforces filtering.**

Three layers of defense:

1. **Abstract base model:**
   ```python
   class ClubScopedModel(models.Model):
       club = models.ForeignKey("clubs.Club", on_delete=models.CASCADE, editable=False)

       class Meta:
           abstract = True
   ```
   Every data model (except `User` and `Club` itself) inherits from this.

2. **Middleware** resolves `request.club` from:
   - Subdomain (`linecreek.platform.com`)
   - Or a `X-Club-Slug` header (for API testing / super-admin)
   - Or the authenticated user's `club` FK (fallback for single-club users)

3. **DRF mixin:**
   ```python
   class ClubScopedViewMixin:
       def get_queryset(self):
           return super().get_queryset().filter(club=self.request.club)

       def perform_create(self, serializer):
           serializer.save(club=self.request.club)
   ```
   Every ViewSet inherits this mixin. No raw `.objects.all()` calls on club-scoped models.

**Rationale:** Any single layer can be bypassed by a careless developer. Three layers — schema enforcement (FK is NOT NULL), request-level scoping (middleware), and query-level filtering (mixin) — make cross-tenant data leakage structurally difficult. The abstract model also gives us a single place to add audit fields later.

---

## Decision 5: Stripe Integration Pattern

**Decision: Option A — Stripe Connect (Standard accounts)**

Each club onboards as a Stripe Connected Account (Standard type). The platform is the Connect "platform account." Payment flow:

1. Parent clicks "Pay Membership" or "Book Lesson."
2. Backend creates a Stripe Checkout Session with `stripe_account=club.stripe_account_id`.
3. Payment goes directly to the club's Connected Account.
4. Platform takes an application fee (percentage TBD, e.g., 2-3%) via `application_fee_amount`.
5. Webhooks from Stripe confirm payment; backend activates membership/booking.

**Rationale:** Option B (each club manages their own Stripe) means we cannot programmatically create checkout sessions or handle webhooks — the platform has no API access to their account. Option C (platform collects, manually remits) is a money-transmitter liability nightmare. Stripe Connect Standard is designed exactly for this: clubs own their money, we take a cut, and we control the payment flow via API.

**Configuration:**
- `Club.stripe_account_id` — the Connected Account ID (`acct_...`)
- `Club.stripe_onboarding_complete` — Boolean, gates payment features
- All financial webhooks verified with the Connect account's signing secret

---

## Decision 6: COPPA Compliance Architecture

**Decision: All three options combined — mandatory parental consent with auditable records.**

COPPA requires verifiable parental consent before collecting personal information from children under 13. Our architecture:

1. **`Skater.is_minor` computed property** (from `dob` field). Any skater under 13 is flagged automatically.

2. **`ConsentRecord` model:**
   ```python
   class ConsentRecord(ClubScopedModel):
       skater          FK(Skater)
       guardian        FK(User)  # The parent who consented
       consent_type    CharField (choices: 'registration', 'competition_data', 'coach_notes', 'photo')
       granted_at      DateTimeField
       ip_address      GenericIPAddressField
       user_agent      TextField
       revoked_at      DateTimeField(null=True)
       consent_text    TextField  # Exact text shown at time of consent
   ```

3. **Enforcement rules:**
   - A minor `Skater` record CANNOT be created unless the authenticated `User` is the `managed_by` guardian AND has an active `ConsentRecord` of type `registration`.
   - The Skater-Stats competition history for a minor is only displayed if a `competition_data` consent exists.
   - Coach progress notes for a minor require `coach_notes` consent.
   - Consent can be revoked at any time; revocation triggers data restriction (not deletion — USFS records must be retained for membership compliance).
   - All consent records are immutable (append-only). Revocation creates a new record with `revoked_at` set.

4. **Data minimization:**
   - No tracking cookies or analytics on minor profiles.
   - Minor DOB is stored (required for USFS registration) but never exposed in API responses to non-guardian users.
   - Payment info never stored locally (Stripe handles PCI).

**Rationale:** COPPA violations carry $50,000+ per-incident fines. A flag alone (Option A) is insufficient — you need auditable proof of consent. Requiring parent email verification (Option C) is necessary but not sufficient without a consent record. The `ConsentRecord` model gives us a legally defensible audit trail that can be produced if the FTC comes knocking.

---

## Additional Design Constraints

These rules apply to ALL code written for this platform:

### Primary Keys

- All models use `id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`.
- Integer PKs leak information (enumeration attacks, total count inference). UUIDs are opaque and safe in URLs.
- Exception: Django's built-in `User` uses integer PK (AbstractUser constraint). The `User.uuid` field is added for external-facing references.

### Deletion Policy

- **Financial models** (`Payment`, `Invoice`, `ConsentRecord`, `USFSExport`): `on_delete=PROTECT`. These records are never deleted.
- **Club-scoped data** (`Skater`, `Booking`, `TestResult`): Soft-delete via `deleted_at = DateTimeField(null=True)`. A custom manager excludes soft-deleted records by default.
- **FamilyGroup, User**: `on_delete=PROTECT` on all inbound FKs. Deleting a user requires explicit data migration.

### Timestamps

Every model includes:
```python
created_at = models.DateTimeField(auto_now_add=True)
updated_at = models.DateTimeField(auto_now=True)
```

### Audit Trail

All state-change operations (membership activation, payment confirmation, USFS export generation, consent grant/revocation) write to an `AuditLog` model:
```python
class AuditLog(ClubScopedModel):
    actor       FK(User, null=True)
    action      CharField  # 'member.activated', 'payment.confirmed', etc.
    target_type ContentType
    target_id   UUIDField
    metadata    JSONField(default=dict)
    created_at  DateTimeField(auto_now_add=True)
```

### API Conventions

- All API endpoints are versioned: `/api/v1/...`
- DRF pagination: `CursorPagination` (not offset-based — offset pagination degrades on large tables).
- Authentication: JWT via `djangorestframework-simplejwt`. Access token TTL: 15 minutes. Refresh token TTL: 7 days.
- Rate limiting: `django-ratelimit` on auth endpoints (5 attempts/minute). Standard endpoints: 100 req/minute per user.
- All list endpoints support filtering via `django-filter`.

### Skater-Stats Integration

- Use the internal API at `api.skater-stats.com` with required client headers (see `docs/skater-stats-deep-research.md`).
- All API calls go through `SkaterStatsClient` service class in `apps/competitions/services.py`.
- Cache responses in Redis with 24-hour TTL.
- Background refresh via Celery beat task (daily at 6 AM UTC).
- If Skater-Stats is unavailable, serve stale cache. Never block page loads on external API calls.
- Store `skater_stats_slug` on the `Skater` model. Admin assigns manually or via search/autocomplete.

### USFS CSV Export

- Generated on-demand by admin.
- Output matches USFS Batch Upload Roster Template columns exactly (template to be obtained from USFS Member Services).
- Every export creates a `USFSExport` audit record (who generated it, timestamp, member count, checksum of file).
- CSV is generated in-memory and served as a download — never persisted to disk or object storage.

### Background Tasks (Celery)

- Broker: Redis (same instance as cache, different DB number).
- Result backend: Django ORM (for task status queries from admin panel).
- Task queues: `default`, `payments` (higher priority), `sync` (Skater-Stats refresh).
- All tasks are idempotent. Retry with exponential backoff (max 3 retries).

### Testing

- `pytest` + `pytest-django` + `factory_boy` for model factories.
- Every ViewSet has permission tests verifying cross-club data isolation.
- Financial flows require integration tests against Stripe Test Mode.
- Minimum 80% coverage on `apps/payments/` and `apps/accounts/`.

---

## Django App Directory Tree

```
backend/
    manage.py
    config/
        __init__.py
        settings/
            __init__.py
            base.py
            local.py
            production.py
            test.py
        urls.py
        wsgi.py
        asgi.py
        celery.py
    apps/
        __init__.py
        clubs/
            __init__.py
            models.py
            admin.py
            serializers.py
            views.py
            urls.py
            permissions.py
            migrations/
        accounts/
            __init__.py
            models.py          # User, FamilyGroup
            admin.py
            serializers.py
            views.py
            urls.py
            permissions.py
            managers.py
            middleware.py      # ClubResolutionMiddleware
            migrations/
        members/
            __init__.py
            models.py          # Skater, MembershipType, MembershipPeriod
            admin.py
            serializers.py
            views.py
            urls.py
            services.py        # USFS CSV export logic
            migrations/
        scheduling/
            __init__.py
            models.py          # Lesson, InstructorAvailability, Booking, Package
            admin.py
            serializers.py
            views.py
            urls.py
            services.py        # Conflict detection, capacity checks
            migrations/
        competitions/
            __init__.py
            models.py          # TestSession, TestEntry, TestResult, CompetitionCache
            admin.py
            serializers.py
            views.py
            urls.py
            services.py        # SkaterStatsClient
            tasks.py           # Celery tasks for background sync
            migrations/
        ice/
            __init__.py
            models.py          # FreestyleSession, SessionRegistration, Pricing
            admin.py
            serializers.py
            views.py
            urls.py
            migrations/
        payments/
            __init__.py
            models.py          # Payment, Invoice, Refund, StripeEvent
            admin.py
            serializers.py
            views.py
            urls.py
            services.py        # Stripe Connect logic
            webhooks.py        # Stripe webhook handler
            migrations/
        website/
            __init__.py
            models.py          # Page, NewsPost, Event, CoachProfile
            admin.py
            serializers.py
            views.py
            urls.py
            migrations/
        notifications/
            __init__.py
            models.py          # NotificationTemplate, NotificationLog
            admin.py
            services.py        # Email/SMS dispatch
            tasks.py           # Celery tasks for async send
            migrations/
        common/
            __init__.py
            models.py          # ClubScopedModel, AuditLog, ConsentRecord
            mixins.py          # ClubScopedViewMixin, SoftDeleteMixin
            pagination.py      # CursorPagination config
            permissions.py     # IsClubAdmin, IsCoach, IsGuardianOf
            exceptions.py
            utils.py
```

---

## Consequences

### What this enables

- A single parent login can register/pay for/manage 3 children, each with their own USFS number and competition history.
- Adding a new club is a database row + Stripe Connect onboarding — no new deployments, no schema changes.
- COPPA consent is auditable to the exact text shown, exact timestamp, exact IP — meeting FTC guidelines.
- Skater-Stats data enriches member profiles without manual data entry, and degrades gracefully when unavailable.
- Stripe Connect means clubs get paid directly into their bank accounts with no manual remittance.

### What this constrains

- Every new model MUST inherit from `ClubScopedModel` (or have an explicit exemption documented here).
- Every new ViewSet MUST use `ClubScopedViewMixin`.
- No raw `.objects.all()` queries on club-scoped models outside of management commands.
- No storing payment card numbers or bank details locally — Stripe owns PCI.
- No collecting personal data from minors without a `ConsentRecord` — enforced at the serializer level.
- No integer primary keys on new models.
- No `on_delete=CASCADE` on models referenced by financial records.
- No synchronous external API calls in request/response cycle — use Celery tasks or pre-cached data.

### Risks accepted

- The Skater-Stats internal API has no SLA and could change without notice. Mitigation: 24-hour cache means a day of downtime is invisible to users. If they block us, we fall back to the paid v1 API ($399/month).
- Stripe Connect Standard requires each club to complete Stripe onboarding (identity verification). Some small clubs may find this friction unacceptable. Mitigation: provide a concierge onboarding flow with step-by-step guidance.
- UUID primary keys are larger than integers (16 bytes vs 4-8 bytes). At our scale (50 clubs x 500 members = 25,000 rows), this is completely irrelevant to performance.
- COPPA compliance adds UX friction (consent screens before minor registration). This is non-negotiable — the alternative is six-figure FTC fines.

---

## References

- [USFS Batch Upload workflow](../docs/skater-stats-api-research.md) (no API, CSV only)
- [Skater-Stats API technical research](../docs/skater-stats-deep-research.md)
- [Competitive landscape](../COMPARISON.md)
- [Build TODO / phase plan](../TODO.md)
- [FTC COPPA Rule](https://www.ftc.gov/legal-library/browse/rules/childrens-online-privacy-protection-rule)
- [Stripe Connect documentation](https://stripe.com/docs/connect)
