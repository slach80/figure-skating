# Line Creek FSC Platform — Build TODO

## Phase 1: Foundation ✅ COMPLETE

### Project Setup ✅
- [x] Scaffold Django project with DRF, allauth, Celery
- [x] Scaffold Next.js frontend with Tailwind + shadcn/ui
- [x] Set up PostgreSQL database
- [x] Configure Redis for Celery
- [x] Port Hustle core models (SessionType, AvailabilitySlot, Booking) into project
- [ ] Set up CI/CD (GitHub Actions → Vercel + backend deploy)
- [x] Configure dev environment (Docker Compose for local)

### Data Model — Membership ✅
- [x] `clubs` table (multi-tenant root)
- [x] `users` table (auth, roles: member/admin/super_admin)
- [x] `members` table (USFS fields: first/last name, USFS#, DOB, address, membership type)
- [x] `membership_types` table (per-club, per-season pricing)
- [x] `family_groups` table (parent manages children)
- [x] `payments` table (Stripe integration)
- [x] `usfs_exports` table (audit trail)
- [ ] `audit_log` table
- [ ] Contact USFS Member Services for exact Batch Upload Roster Template columns

### Authentication & Authorization ✅
- [x] django-allauth setup (email/password)
- [x] Role-based permissions (member, coach, admin)
- [x] Family account linking (parent sees children)
- [x] Multi-tenant data isolation (club_id on all queries)

---

## Phase 2: Core Features ✅ COMPLETE

### Member Registration & Renewals ✅
- [x] Multi-step registration wizard (Next.js)
- [x] New member application flow
- [x] Annual renewal flow
- [x] Family registration (multiple skaters under one account)
- [x] Membership status lifecycle (pending → active → expired)

### Payment Processing ✅
- [x] Stripe Checkout integration
- [x] Webhook handler (payment confirmation → member activation)
- [x] Payment history + receipts
- [ ] Stripe Connect setup (multi-club payment routing)

### USFS CSV Export ✅
- [x] One-click CSV generator matching USFS Batch Upload Template
- [x] Filter by date range, membership type, status
- [x] Export audit trail (who exported, when, how many members)
- [ ] Investigate USFS programmatic upload (RFE process)

### Admin Panel ✅
- [x] Member directory with search/filter
- [x] Membership status overview dashboard
- [x] Financial reports (payments received, outstanding)
- [x] Club settings (membership types, pricing, season dates)
- [x] Mass email / targeted communications

---

## Phase 3: Scheduling & Booking ✅ COMPLETE

### Lesson Booking ✅
- [x] Port SessionType model → skating lesson types (private, group, semi-private)
- [x] Port AvailabilitySlot model → instructor schedules
- [x] Port Booking model → lesson reservations
- [x] Capacity tracking per session
- [x] Package system (5-class, 10-class bundles)
- [x] Cancellation policy (24-hour)
- [x] Conflict detection

### Test Session Registration ✅
- [x] Test session creation (admin schedules USFS test sessions)
- [x] Skater registration for test sessions
- [x] Test types: Moves in the Field, Freestyle, Dance, Pattern Dance, etc.
- [x] Results recording (pass/retry)

---

## Phase 4: Enhanced Features ✅ COMPLETE

### Skater-Stats API Integration ✅
- [x] Explore api.skater-stats.com endpoints — confirmed internal API, x-client-version headers
- [x] Build proxy/cache layer (24h Redis cache) — `SkaterStatsClient` in `apps/members/skater_stats.py`
- [x] Display competition history on member profiles (`CompetitionHistory` component)
- [x] Admin can set `skater_stats_slug` on skater profiles
- [x] Graceful degradation when API unavailable (503 fallback)

### Coach/Instructor Portal ✅
- [x] Today's schedule view (`/coach`)
- [x] Student roster with aggregated stats (`/coach/students`)
- [x] Session notes per booking (`/coach/notes`)
- [x] Coach evaluations with 5-area scoring (`/coach/evaluations`)

### Progress Tracking & Assessments ✅
- [x] Skill level tracking (USFS levels: Pre-Alpha through Senior, all 4 disciplines)
- [x] Coach evaluations and feedback (5 scored areas + text)
- [x] Progress tab on member detail page (admin view)
- [x] `SkaterLevel` model with discipline/level/passed_date/judge_name

### Notifications & Communications ✅
- [x] Email notifications via Django email (Resend/SMTP configurable)
- [x] Renewal reminders (30, 14, 7 days before expiry) — Celery beat 8 AM daily
- [x] Lesson reminders — Celery beat 8:30 AM daily
- [x] Payment confirmations
- [x] Lesson booking confirmations
- [x] Admin broadcast to all members or filtered subsets

---

## Phase 5: Club Website Builder ✅ COMPLETE

### Public Website ✅
- [x] Public pages: Home, About, Coaches, Contact
- [x] Per-club branding (name, tagline, about text, contact info, social links)
- [x] `SiteConfig` model (per-club, admin-editable via Settings > Website tab)
- [x] Mobile-responsive public layout

### Content Management ✅
- [x] News/announcements system (`Announcement` model, published flag)
- [x] Coach profiles (public-facing coach list from `UserProfile`)
- [x] Website settings tab in admin dashboard

---

## Phase 6: Mobile + Extras ✅ COMPLETE

### PWA (Progressive Web App) ✅
- [x] @serwist/next integrated
- [x] Service worker (`src/app/sw.ts`)
- [x] Web app manifest (`public/manifest.json`) — name, icons, theme color #5B2C91
- [x] Install prompt / "Add to Home Screen" banner (`InstallPrompt` component)
- [x] Member portal is PWA-optimized (bottom tab nav, max-w-lg, mobile-first)

---

## Phase 7: Competition Entry Module ✅ COMPLETE

### Competition Entry ✅
- [x] Competition creation (admin: name, date, venue, entry/late deadlines, fees)
- [x] Event categories per competition (discipline, segment, level)
- [x] Skater entry registration from member portal
- [x] Entry deadline + late fee logic
- [x] Draw management (flight assignments)
- [x] Placement/score recording
- [x] CSV export (browser-side from entries table)
- [x] Entry confirmation status lifecycle (pending → accepted → scratched)

---

## Member Portal ✅ COMPLETE

- [x] Home/dashboard (`/member`)
- [x] Lessons: upcoming + book new (`/member/lessons`, `/member/lessons/book`)
- [x] Competitions: open events + entry submission (`/member/competitions`)
- [x] Payments: history (`/member/payments`)
- [x] Family: group members, USFS numbers, status (`/member/family`)

---

## Testing ✅

- [x] 90 unit + integration tests, all passing
  - 22 member model tests (full_name, is_minor, is_active_member, soft_delete)
  - 43 scheduling model tests (slots, bookings, packages, cancel/confirm logic)
  - 8 scheduling view tests (multi-tenant isolation, confirm/cancel/today actions)
  - 7 member view tests (me endpoint, renew, club isolation)
  - 13 notification tests (email subjects, body content, no-op guards)
- [x] `manage.py check` clean (0 issues)
- [x] TypeScript strict check clean (0 errors)
- [x] 95 migrations applied, 0 unapplied

---

## Remaining / Future Work

### Infrastructure
- [ ] Set up CI/CD (GitHub Actions → Vercel + backend deploy)
- [ ] Set up staging environment
- [ ] Database backup automation
- [ ] Error monitoring (Sentry — `sentry-sdk` in requirements, not wired yet)
- [ ] Analytics (Plausible or PostHog)
- [ ] Rate limiting on API (`django-ratelimit` in requirements, not applied yet)
- [ ] COPPA compliance review (children's data)
- [ ] Playwright e2e tests

### Data & Launch Prep
- [ ] Contact USFS Member Services — request Batch Upload Roster Template exact columns
- [ ] Research EntryEeze data export — can Lana export current member roster as CSV?
- [ ] Determine SportsEngine contract status — when can Line Creek switch?
- [ ] Data migration from EntryEeze (member roster import)
- [ ] Content migration from SportsEngine
- [ ] Staff training

### Multi-Club Scale
- [ ] Super-admin panel for creating new clubs
- [ ] Club onboarding wizard (branding, membership types, pricing)
- [ ] Marketing site for the platform itself
- [ ] Stripe Connect setup (multi-club payment routing)
- [ ] Custom domain support (CNAME via Vercel)

### Optional Modules
- [ ] Volunteer management
- [ ] Merchandise store
- [ ] Donation collection
- [ ] Digital waivers with e-signature
- [ ] Waitlist system for popular sessions
- [ ] SMS via Twilio
- [ ] Digital membership card (offline-capable)
- [ ] Push notifications via Web Push API
- [ ] Capacitor shell for App Store presence
- [ ] Evaluate CompetitionSuite for day-of scoring integration
