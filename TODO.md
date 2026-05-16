# Line Creek FSC Platform — Build TODO

## Phase 1: Foundation (Weeks 1-3)

### Project Setup
- [ ] Scaffold Django project with DRF, allauth, Celery
- [ ] Scaffold Next.js frontend with Tailwind + shadcn/ui
- [ ] Set up PostgreSQL database
- [ ] Configure Redis for Celery
- [ ] Port Hustle core models (SessionType, AvailabilitySlot, Booking) into project
- [ ] Set up CI/CD (GitHub Actions → Vercel + backend deploy)
- [ ] Configure dev environment (Docker Compose for local)

### Data Model — Membership
- [ ] `clubs` table (multi-tenant root)
- [ ] `users` table (auth, roles: member/admin/super_admin)
- [ ] `members` table (USFS fields: first/last name, USFS#, DOB, address, membership type)
- [ ] `membership_types` table (per-club, per-season pricing)
- [ ] `family_groups` table (parent manages children)
- [ ] `payments` table (Stripe integration)
- [ ] `usfs_exports` table (audit trail)
- [ ] `audit_log` table
- [ ] Contact USFS Member Services for exact Batch Upload Roster Template columns

### Authentication & Authorization
- [ ] django-allauth setup (email/password + Google OAuth)
- [ ] Role-based permissions (member, coach, admin)
- [ ] Family account linking (parent sees children)
- [ ] Multi-tenant data isolation (club_id on all queries)

---

## Phase 2: Core Features (Weeks 4-6)

### Member Registration & Renewals
- [ ] Multi-step registration wizard (Next.js)
- [ ] New member application flow
- [ ] Annual renewal flow
- [ ] Family registration (multiple skaters under one account)
- [ ] Custom fields engine (admin-configurable questions per club)
- [ ] Membership status lifecycle (pending → active → expired)

### Payment Processing
- [ ] Stripe Checkout integration
- [ ] Webhook handler (payment confirmation → member activation)
- [ ] Payment history + receipts
- [ ] In/out-of-club fee differentiation
- [ ] Stripe Connect setup (multi-club payment routing)

### USFS CSV Export
- [ ] One-click CSV generator matching USFS Batch Upload Template
- [ ] Filter by date range, membership type, status
- [ ] Track field-level changes with timestamps (like EntryEeze does)
- [ ] Export audit trail (who exported, when, how many members)
- [ ] Investigate USFS programmatic upload (RFE process)

### Admin Panel
- [ ] Member directory with search/filter
- [ ] Membership status overview dashboard
- [ ] Financial reports (payments received, outstanding)
- [ ] Club settings (membership types, pricing, season dates)
- [ ] Mass email / targeted communications

---

## Phase 3: Scheduling & Booking (Weeks 7-9)

### Lesson Booking (from Hustle)
- [ ] Port SessionType model → skating lesson types (private, group, semi-private)
- [ ] Port AvailabilitySlot model → instructor schedules
- [ ] Port Booking model → lesson reservations
- [ ] Capacity tracking per session
- [ ] Package system (5-class, 10-class bundles)
- [ ] Cancellation policy (24-hour)
- [ ] Rescheduling with audit trail
- [ ] Conflict detection

### Test Session Registration
- [ ] Test session creation (admin schedules USFS test sessions)
- [ ] Skater registration + payment ($0.50/test equivalent or flat fee)
- [ ] Test types: Moves in the Field, Freestyle, Dance, Pattern Dance, etc.
- [ ] Results recording (pass/retry)
- [ ] Permission form auto-generation (PDF with member data + USFS#)

### Contract Ice / Club Ice
- [ ] Freestyle session creation with pricing
- [ ] Class registration with payment
- [ ] In-club vs out-of-club pricing
- [ ] Recurring session support

---

## Phase 4: Enhanced Features (Weeks 10-12)

### Skater-Stats API Integration
- [x] Explore api.skater-stats.com endpoints and auth — confirmed internal API at `/skater?slug=`, requires x-client-version headers, returns full JSON (no scraping)
- [ ] Build proxy/cache layer (24h cache in DB) — `SkaterStatsClient` designed, see docs/skater-stats-deep-research.md
- [ ] Display competition history on member profiles
- [ ] Lookup by name + club or USFS number — add `skater_stats_slug` field to Skater model
- [ ] Graceful degradation when API unavailable

### Coach/Instructor Portal
- [ ] Today's schedule view
- [ ] Student roster with search
- [ ] Earnings overview + payment tracking
- [ ] Attendance tracking
- [ ] Progress notes per student
- [ ] Availability management

### Progress Tracking & Assessments
- [ ] Skill level tracking (USFS levels: Pre-Alpha through Senior)
- [ ] Test preparation checklists
- [ ] Coach evaluations and feedback
- [ ] Goals and milestones
- [ ] Achievement history

### Notifications & Communications
- [ ] Email notifications (Resend or SendGrid)
- [ ] Renewal reminders (30, 14, 7 days before expiry)
- [ ] Lesson reminders
- [ ] Payment confirmations
- [ ] Admin broadcast to all members or filtered subsets
- [ ] SMS via Twilio (optional module)

---

## Phase 5: Club Website Builder (Weeks 13-15)

### Multi-Tenant Frontend
- [ ] Club-branded subdomain routing (linecreek.platform.com)
- [ ] Custom domain support (CNAME via Vercel)
- [ ] Per-club branding (logo, colors, name)
- [ ] Public pages: Home, About, Programs, Coaches, Events, Contact
- [ ] Port existing Line Creek static site design into templated system
- [ ] SSG for public pages (SEO optimized)
- [ ] Mobile-responsive throughout

### Content Management
- [ ] News/announcements system
- [ ] Event calendar (public-facing)
- [ ] Coach profiles (configurable by club)
- [ ] Program/class descriptions with pricing
- [ ] Photo galleries (optional)

---

## Phase 6: Mobile + Extras (Weeks 16-18)

### PWA (Progressive Web App)
- [ ] Add next-pwa or @serwist/next to Next.js project
- [ ] Service worker for offline support
- [ ] Web app manifest (name, icons, theme color)
- [ ] Install prompt / "Add to Home Screen" banner
- [ ] Offline-capable member dashboard (cached data)
- [ ] Digital membership card (shows USFS#, works offline)
- [ ] Push notifications via Web Push API

### Future: Capacitor (App Store presence)
- [ ] Wrap Next.js app in Capacitor shell
- [ ] Native push notifications (iOS + Android)
- [ ] Apple Developer account ($99/yr)
- [ ] Google Play Console ($25 one-time)
- [ ] App Store submission + review

### Additional Modules
- [ ] Volunteer management (event creation, shift signup, hour tracking)
- [ ] Merchandise store (simple product catalog + Stripe checkout)
- [ ] Donation collection (club fund drives)
- [ ] Digital waivers with e-signature (port from Hustle)
- [ ] Waitlist system for popular sessions (port from Hustle)
- [ ] Referral program (port from Hustle)

---

## Phase 7: Launch & Scale (Weeks 19-20)

### Line Creek Launch
- [ ] Data migration from EntryEeze (member roster import)
- [ ] Content migration from SportsEngine
- [ ] Staff training
- [ ] Beta with select families
- [ ] Full launch + monitoring

### Multi-Club Onboarding
- [ ] Super-admin panel for creating new clubs
- [ ] Club onboarding wizard (branding, membership types, pricing)
- [ ] Marketing site for the platform itself
- [ ] Pricing page + Stripe subscription billing for clubs
- [ ] Documentation / help center

---

## Phase 7: Competition Entry Module (Weeks 19-21)

> Differentiator — no US competitor combines this with membership + scheduling + website

### Competition Entry (Pre-Event)
- [ ] Competition creation (admin sets up event: name, date, venue, categories)
- [ ] Skater registration for events (select events/categories, pay entry fees)
- [ ] Coach account + registration on behalf of skaters
- [ ] Entry deadline management + late fee logic
- [ ] Music upload per entry
- [ ] Draw management (flight assignments per event)
- [ ] Accountability / protocol sheets export for judges
- [ ] Accountant reports (entries by category, revenue summary)
- [ ] Entry confirmation emails to skaters/coaches
- [ ] Explore CompetitionSuite API or integration (day-of scoring)

---

## External Dependencies & Research

- [ ] Contact USFS Member Services — request Batch Upload Roster Template
- [ ] Contact USFS — ask about programmatic upload / web services RFE
- [x] Explore Skater-Stats API — documented in docs/skater-stats-deep-research.md. Internal API confirmed, free tier sufficient for MVP.
- [ ] Research EntryEeze data export — can Lana export current member roster as CSV?
- [ ] Determine SportsEngine contract status — when can Line Creek switch?
- [ ] Evaluate CompetitionSuite for day-of scoring integration (vs. building our own)

---

## Tech Debt / Infrastructure

- [ ] Set up staging environment
- [ ] Automated testing (Django: pytest, Next.js: Playwright e2e)
- [ ] Database backup automation
- [ ] Error monitoring (Sentry)
- [ ] Analytics (Plausible or PostHog)
- [ ] Rate limiting on API
- [ ] COPPA compliance review (children's data)
