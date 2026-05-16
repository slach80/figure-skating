# Skater-Stats API Deep Technical Research

**Date:** 2026-05-16  
**Status:** API CONFIRMED - Two tiers available (internal + paid v1)  
**Supersedes:** `skater-stats-api-research.md` (which incorrectly concluded "no API")

---

## Executive Summary

Skater-Stats has a fully functional REST API at `https://api.skater-stats.com`. There are **two tiers**:

1. **Internal/Frontend API** (no authentication) - Used by their React SPA. Several endpoints are accessible from any origin with proper client headers. Returns rich JSON data including full competition history, judge details, element breakdowns, and scores.

2. **Paid Developer API** (`/v1/` prefix) - Requires `X-API-Key` header (format: `ss_live_...`). Costs $399/month or $1,999/year. Provides 20 documented endpoints including direct SQL query access.

**Key finding:** The internal API endpoints that work without auth provide MORE than enough data for our club management use case, including full competition history with judge-level scoring detail.

---

## 2. Technical Architecture

| Component | Technology |
|-----------|-----------|
| Frontend | React SPA (Vite build, Capacitor for mobile) |
| Backend | Express.js behind AWS API Gateway |
| Hosting | Cloudflare (CDN/WAF) |
| Analytics | PostHog (self-hosted at `t.skater-stats.com`) |
| Error tracking | Sentry (React SDK 9.15.0) |
| Auth | Firebase + Google Sign-In |
| Image CDN | `images.skater-stats.com` |
| Mobile apps | iOS (App Store) + Android (Play Store) via Capacitor |
| Version | v2.1.28 (web), min client version 2.1.1 |

---

## 3. Internal API (No Auth Required)

### Base URL
```
https://api.skater-stats.com
```

### Required Headers

These headers must be sent (the API returns 500 without them when accessed via WebFetch):

```http
Accept: application/json, text/plain, */*
x-client-version: 2.1.28
x-client-language: en
x-platform: web
x-language-source: detected
x-system-language: en-US
x-client-url: https://skater-stats.com/
```

### Response Headers

```http
Content-Type: text/plain; charset=utf-8
x-min-client-version: 2.1.1
x-min-android-version: 1.5.25
x-min-ios-version: 1.1.39
access-control-allow-origin: https://skater-stats.com
x-powered-by: Express
```

### CORS Behavior

Some endpoints allow cross-origin requests, others are restricted to `skater-stats.com` origin only:

| CORS Open (accessible from any origin) | CORS Restricted (skater-stats.com only) |
|---|---|
| `/overallStats` | `/competition?slug=...` |
| `/skaters` | `/club?slug=...` |
| `/skater?slug=...` | `/clubs` |
| `/competitions` | `/liveEvents` |
| `/officials` | `/event?id=...` |
| `/coaches` | `/result?id=...` |
| `/series` | `/skater/results?slug=...` |
| `/search?query=...` | `/skater/personal-bests?slug=...` |
| | `/favorites` |
| | `/autocomplete?q=...` |

**For server-side access (Django), CORS restrictions are irrelevant** - these only apply to browser requests. All endpoints should be accessible from our backend.

---

### Endpoint Details

#### `GET /skater?slug={slug}`

Returns complete skater profile with full competition history and judge-level detail.

**Response size:** ~170-190KB per elite skater (includes all events)

**Top-level fields:**
```json
{
  "id": 1205,
  "name": "Alysa Liu",
  "nativeName": null,
  "slug": "alysa-liu",
  "club": "St. Moritz ISC",
  "club_id": 105,
  "hasUSFSId": true,
  "joinedDate": null,
  "totalEvents": "96",
  "totalCompetitions": "47",
  "history": [...],
  "competitionLocations": [...],
  "seriesStandings": [...],
  "coaches": [...],
  "customization": {...},
  "visibleTests": [],
  "visibleAccountEvents": [],
  "isCuratedProfile": true,
  "isClaimed": false,
  "journal": {"sessions": [], "total": 0},
  "relatedProfiles": []
}
```

**History item fields (per event):**
```json
{
  "club": "United States (USA)",
  "date": "2026-02-19",
  "time": "19:00:00",
  "year": "2026",
  "event": "Women Single Skating - Free Skating",
  "ijsId": "11040",
  "score": 150.2,
  "clubId": 5648,
  "status": "Final",
  "eventId": 2766714,
  "majority": null,
  "resultId": 1223118,
  "videoUrl": null,
  "eventType": "Free Skate",
  "placement": "1",
  "eventLevel": "Other",
  "isSixEvent": false,
  "resultsUrl": "SEG004.htm",
  "tieBreaker": null,
  "competition": "Olympic Winter Games 2026",
  "judgeScores": null,
  "judgeDetails": {
    "elements": [...],
    "components": [...],
    "deductions": [...]
  },
  "overallPlace": null,
  "overallScore": null,
  "segmentScore": null,
  "totalSkaters": null,
  "competitionId": ...,
  "competitionLat": ...,
  "competitionLng": ...,
  "competitionSlug": "...",
  "relatedSegments": [...],
  "competitionAddress": "..."
}
```

**Judge details - elements:**
```json
{
  "goe": 0.91,
  "info": "!",
  "value": 6.21,
  "credit": false,
  "number": 1,
  "baseValue": 5.3,
  "judgesGoe": [1, 2, 1, 1, 2, 3, 2, 2, 2],
  "elementCode": "3F!",
  "plannedElement": null,
  "executedElement": null,
  "secondHalfBonus": false
}
```

**Customization (for curated profiles):**
```json
{
  "bio": "Alysa Liu is a trailblazing American figure skater...",
  "sources": ["https://en.wikipedia.org/wiki/Alysa_Liu", ...],
  "homeRink": "Colorado Springs, CO",
  "keyFacts": [
    {"label": "Signature Move", "value": "Triple Axel"},
    ...
  ],
  "showCoaches": true,
  "achievements": ["2025 World Champion", ...],
  "profileImage": {
    "url": "https://images.skater-stats.com/skaters/1205/profile/5a505e11804303f9.jpg",
    "thumbnails": {
      "small": "https://images.skater-stats.com/skaters/1205/profile/thumbnails/small/...",
      "medium": "https://images.skater-stats.com/skaters/1205/profile/thumbnails/medium/..."
    }
  }
}
```

**Coaches:**
```json
[
  {
    "slug": "phillip-diguglielmo",
    "state": "California",
    "coachId": 1355,
    "fullName": "Phillip DiGuglielmo",
    "profileImage": null
  }
]
```

---

#### `GET /search?query={term}`

Unified search across skaters, competitions, clubs, and officials.

**Response format:**
```json
[
  {
    "type": "skater",
    "id": 1205,
    "name": "Alysa Liu",
    "slug": "alysa-liu",
    "startDate": null,
    "endDate": null,
    "venue": null,
    "city": null,
    "state": null,
    "timezone": null,
    "year": null,
    "ijsId": null,
    "competition": "Olympic Winter Games 2026",
    "date": "2026-02-19",
    "url": "SEG004.htm",
    "function": null,
    "club": "St. Moritz ISC",
    "location": null,
    "profileImage": {
      "url": "https://images.skater-stats.com/skaters/1205/profile/...",
      "thumbnails": {...}
    },
    "profileImageAlignment": null,
    "hasUSFSId": true
  }
]
```

---

#### `GET /overallStats`

Homepage data: upcoming/recent/in-progress competitions, featured skaters, top scores.

**Response size:** ~150KB

**Structure:**
```json
{
  "upcoming": [/* 20 items - competition objects */],
  "recent": [/* 20 items */],
  "inProgress": [/* 17 items */],
  "featuredSkaters": [/* 10 items - skater cards */],
  "topStats": {
    "bestScores": [
      {
        "skaterName": "Ilia Malinin",
        "skaterId": 489,
        "skaterSlug": "ilia-malinin",
        "score": 238.24,
        "competition": "ISU Grand Prix Final 2025",
        "date": "2025-12-04",
        "year": "2025",
        "ijsId": "10926",
        "competitionSlug": "isu-grand-prix-final-2025",
        "eventName": "Men - Free Skating",
        "resultsUrl": "SEG002.htm"
      }
    ]
  },
  "series": [/* 20 items - NQS/NES/Solo Dance series */]
}
```

---

#### `GET /competitions`

Returns ALL competitions (~5MB). No server-side filtering (query params are ignored).

**Item format:**
```json
{
  "id": 8706,
  "ijsId": "4895",
  "year": "2027",
  "name": "ISU Figure Skating World Team Trophy",
  "startDate": "2027-04-08",
  "endDate": "2027-04-11",
  "timezone": null,
  "venue": "Tokyo",
  "city": "Tokyo",
  "state": "On",
  "countryCode": "JPN",
  "logoRef": "https://images.skater-stats.com/logos/isu.png",
  "slug": "isu-figure-skating-world-team-trophy",
  "competitionType": "isu",
  "isuSlug": "isu-figure-skating-world-team-trophy",
  "lastmod": "2026-05-05 10:00:30.324659+00",
  "source": "isu",
  "popularityScore": 3
}
```

---

#### `GET /skaters`

Returns ALL skaters (~1.2MB). No server-side filtering.

**Item format:**
```json
{
  "data": [
    {
      "id": 1205,
      "name": "Alysa Liu",
      "slug": "alysa-liu",
      "lastmod": "2026-02-19T...",
      "popularityScore": 9999
    }
  ]
}
```

---

#### `GET /officials`

Returns ALL officials (~1.5MB).

**Item format:**
```json
{
  "id": 11629,
  "name": "Jane Smith",
  "slug": "jane-smith",
  "lastmod": "2026-04-26...",
  "eventCount": 140
}
```

---

#### `GET /coaches`

Returns ALL coaches (~220KB, 1586 items).

**Item format:**
```json
{
  "id": 634682,
  "name": "Laura Rogers",
  "slug": "laura-rogers",
  "lastmod": "2025-09-07...",
  "hasProfile": false,
  "studentCount": 1
}
```

---

#### `GET /series`

Returns qualifying/competition series info.

**Item format:**
```json
{
  "id": 1025,
  "name": "2026 National Solo Dance Series",
  "application_deadline": "5/1/2026 11:59 PM ET",
  "icon_url": "/api/series-registration/logo/...",
  "overview_link": "/series/registration/overview/1025?id=1025",
  "created_at": "2026-01-01T10:00:11.463Z",
  "updated_at": "2026-05-16T10:00:39.305Z",
  "parsed_deadline": "2026-05-01T23:59:00.000Z"
}
```

---

## 4. Paid Developer API (v1)

### Base URL
```
https://api.skater-stats.com/v1
```

### Authentication
```http
X-API-Key: ss_live_your_key
```

### Error Responses

Missing key:
```json
{"error": {"code": "missing_api_key", "message": "API key is required. Pass it in the X-API-Key header.", "status": 401}}
```

Invalid key:
```json
{"error": {"code": "invalid_api_key", "message": "Invalid or expired API key.", "status": 401}}
```

### Endpoints (20 total)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/competitions` | List/search competitions |
| GET | `/competitions/:id` | Competition details |
| GET | `/competitions/:id/events` | Events (rows include category) |
| GET | `/competitions/:id/categories` | SP+FS standings per category |
| GET | `/skaters` | Search/list skaters |
| GET | `/skaters/:id` | Skater profile |
| GET | `/skaters/:id/results` | Competition history |
| GET | `/skaters/:id/personal-bests` | Personal bests by segment/category |
| GET | `/events/:id/results` | Results with placements and scores |
| GET | `/events/:id/judge-details` | Judge detail panels |
| GET | `/results/:id` | Full result detail |
| GET | `/results/:id/elements` | Element breakdown with GOE |
| GET | `/results/:id/components` | Component scores with PCS |
| GET | `/officials` | Search/list officials |
| GET | `/officials/:id` | Official profile and history |
| GET | `/series` | Qualifying series |
| GET | `/series/:id/standings` | Series standings |
| GET | `/search` | Unified search |
| GET | `/schema` | Database schema |
| POST | `/query` | Read-only SQL execution |

### Pricing

| Plan | Price | Features |
|------|-------|----------|
| Monthly | $399/month | Unlimited requests, all endpoints, direct SQL, full historical + judge-level data, multiple API keys |
| Annual | $1,999/year | Same features, ~58% savings |

### Developer Dashboard

Accessible at `https://skater-stats.com/developer` (requires login).

**Management endpoints (require user auth, not API key):**
- `GET /developer/keys` - List API keys
- `POST /developer/keys` - Create new key
- `DELETE /developer/keys/:id` - Delete key
- `POST /developer/keys/:id/rotate` - Rotate key
- `GET /developer/usage` - Usage statistics
- `GET /developer/subscription` - Subscription info
- `POST /developer/subscribe` - Start checkout (returns `checkout_url`)
- `POST /developer/subscription/cancel` - Cancel
- `POST /developer/subscription/update` - Change plan

### Dataset Scale
- 12.5M+ data records
- 4,800+ competitions
- 107K+ skaters
- 24 years of historical data

---

## 5. Rate Limiting

The API exposes rate limit headers (per the `access-control-expose-headers` response):
```
X-RateLimit-Limit
X-RateLimit-Remaining
X-RateLimit-Reset
```

However, in testing the internal API, these headers were not returned on the responses we observed. The rate limits likely apply to the v1 paid API. The internal API may have implicit rate limiting via Cloudflare/API Gateway.

---

## 6. Recommended Integration Strategy

### For Our Club Management Platform

**Use the internal API** (`/skater?slug=`) for our use case. It provides:
- Full competition history with dates, scores, placements
- Judge-level detail (elements, GOE, components)
- Coach information
- Club affiliations
- Profile images for curated skaters
- Series standings (NQS rankings)

### Implementation (Django)

```python
import httpx
from django.core.cache import cache

class SkaterStatsClient:
    """Client for the Skater-Stats internal API."""
    
    BASE_URL = "https://api.skater-stats.com"
    HEADERS = {
        "Accept": "application/json, text/plain, */*",
        "x-client-version": "2.1.28",
        "x-client-language": "en",
        "x-platform": "web",
        "x-language-source": "detected",
        "x-system-language": "en-US",
        "x-client-url": "https://skater-stats.com/",
        "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
    }
    CACHE_TTL = 60 * 60 * 24  # 24 hours
    
    def __init__(self):
        self.client = httpx.Client(
            base_url=self.BASE_URL,
            headers=self.HEADERS,
            timeout=15.0,
        )
    
    def get_skater(self, slug: str) -> dict | None:
        """Fetch full skater profile by slug."""
        cache_key = f"skaterstats:skater:{slug}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        resp = self.client.get("/skater", params={"slug": slug})
        if resp.status_code == 200:
            data = resp.json()
            cache.set(cache_key, data, self.CACHE_TTL)
            return data
        return None
    
    def search(self, query: str) -> list[dict]:
        """Search across all entity types."""
        resp = self.client.get("/search", params={"query": query})
        if resp.status_code == 200:
            return resp.json()
        return []
    
    def get_competitions(self) -> list[dict]:
        """Get all competitions (large response, cache aggressively)."""
        cache_key = "skaterstats:competitions"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        resp = self.client.get("/competitions")
        if resp.status_code == 200:
            data = resp.json()
            cache.set(cache_key, data, 60 * 60 * 6)  # 6 hours
            return data
        return []
    
    def get_overall_stats(self) -> dict | None:
        """Get homepage stats (upcoming, recent, in-progress events)."""
        resp = self.client.get("/overallStats")
        if resp.status_code == 200:
            return resp.json()
        return None
```

### When to Upgrade to Paid API

Consider the $399/month v1 API if:
- We need individual result/event lookups by ID (CORS-restricted on internal API but should work server-side)
- We want guaranteed SLA and support
- We need the SQL query endpoint for custom analytics
- Rate limits on the internal API become a problem
- We want to be legitimate/contracted users

### Immediate Next Steps

1. **Test server-side access** - Verify that Django/httpx can reach ALL internal endpoints (CORS restrictions only apply to browsers)
2. **Build the client** - Implement `SkaterStatsClient` as shown above
3. **Slug matching** - Build admin UI to map club members to skater-stats slugs
4. **Cache strategy** - Redis with 24-hour TTL, background refresh via celery/cron
5. **Consider v1 subscription** - If this becomes a commercial product, pay for proper API access

---

## 7. Data Comparison: Internal API vs Previous Scraping Approach

| Capability | Scraping (old plan) | Internal API (new) | Paid v1 API |
|---|---|---|---|
| Competition history | Fragile HTML parsing | Full JSON with 30+ fields per event | Same + pagination |
| Judge details | Not available | Full element/component/GOE breakdown | Same |
| Personal bests | Must compute | Available in response | Dedicated endpoint |
| Coach info | Not available | Included in profile | Same |
| Profile images | Parse HTML img tags | Direct CDN URLs | Same |
| Club info | Limited | Club ID + name | Same |
| Series standings | Not available | Full NQS/NES rankings | Dedicated endpoint |
| Search | Not feasible | Full-text search endpoint | Same |
| Reliability | Breaks on redesign | Stable JSON contract | SLA guaranteed |
| Effort | 5-6 days + maintenance | 1-2 days | 1-2 days + $399/mo |

---

## 8. Important Notes

### `x-client-version` Header

The API returns `x-min-client-version: 2.1.1` in responses. This suggests version enforcement - if we send a version below the minimum, the API may reject requests or return different data. We should track the current web app version and update our client header accordingly.

### `hasUSFSId` Field

The skater profile includes `hasUSFSId: true/false`. This indicates whether the skater is a registered USFS member. This is extremely useful for our club management platform - we can verify member registration status.

### Data Freshness

Based on `lastmod` timestamps in the data, the database is updated daily (most recent: `2026-05-16`). Competition results appear to be ingested within hours of completion.

### Image CDN

Profile images are served from `images.skater-stats.com` with multiple sizes:
- Full: `/skaters/{id}/profile/{hash}.jpg`
- Small thumbnail: `/skaters/{id}/profile/thumbnails/small/{hash}.jpg`
- Medium thumbnail: `/skaters/{id}/profile/thumbnails/medium/{hash}.jpg`

Competition logos: `images.skater-stats.com/logos/{name}.png`

---

## 9. Summary of Discovered Endpoints

### Open Access (no auth, server-side accessible)

| Endpoint | Size | Filtering | Notes |
|----------|------|-----------|-------|
| `GET /overallStats` | 150KB | N/A | Homepage data |
| `GET /skater?slug=X` | 170-190KB | By slug | Full profile + history |
| `GET /skaters` | 1.2MB | None (all returned) | 107K+ skater index |
| `GET /competitions` | 5MB | None (all returned) | 4800+ competition index |
| `GET /officials` | 1.5MB | None (all returned) | Officials index |
| `GET /coaches` | 220KB | None (all returned) | 1586 coaches |
| `GET /series` | 7KB | None | NQS/NES/Solo Dance series |
| `GET /search?query=X` | Variable | By search term | Multi-type search |

### Auth Required (user login)

| Endpoint | Auth Type | Purpose |
|----------|-----------|---------|
| `GET /notifications` | User session | User notifications |
| `GET /developer/keys` | User session | API key management |
| `GET /developer/subscription` | User session | Subscription info |
| `GET /developer/usage` | User session | Usage metrics |

### API Key Required (v1 paid)

| Endpoint | Auth Type |
|----------|-----------|
| All `/v1/*` endpoints | `X-API-Key: ss_live_...` |
