# Skater-Stats API Integration Research

**Date:** 2026-05-16  
**Status:** Research complete — no public API available; web scraping is the viable integration path

---

## Executive Summary

Skater-Stats.com maintains a comprehensive database of US figure skating competition results. However, despite prior assumptions about API availability, **there is no documented public API**. The `api.skater-stats.com` subdomain exists but returns HTTP 500 on all tested endpoints. The integration path forward is either (a) scraping their public skater profile pages, or (b) reaching out directly for partnership/API access.

---

## 1. API Investigation Results

### Endpoints Tested (all returned HTTP 500)

| URL | Result |
|-----|--------|
| `https://api.skater-stats.com` | 500 Internal Server Error |
| `https://api.skater-stats.com/docs` | 500 Internal Server Error |
| `https://api.skater-stats.com/openapi.json` | 500 Internal Server Error |
| `https://api.skater-stats.com/api/v1/` | 500 Internal Server Error |
| `https://api.skater-stats.com/graphql` | 500 Internal Server Error |
| `https://api.skater-stats.com/skater/ela-cui` | 500 Internal Server Error |

### Documentation Search

| Source | Finding |
|--------|---------|
| skater-stats.com/api | No developer docs (redirects to homepage) |
| skater-stats.com/about | No technical docs or partnership info |
| sitemap-pages.xml | Only 6 pages listed; no /docs or /api page |
| robots.txt | No API paths referenced; all paths allowed |
| GitHub (sharedcreatives/Skater-Stats) | Repo is private or deleted (404) |
| GitHub search "skater-stats" | No relevant public repos for this platform |

### Conclusion on API Access

The API subdomain likely exists for internal use by their frontend application but is not exposed publicly. There are no published docs, no OpenAPI spec, no developer portal, and no terms of use for API consumers. The site appears to embed an AI-tracking endpoint (`/llm-interaction`) but this is an analytics beacon, not a data API.

---

## 2. Public Website Data Analysis

### Skater Profile Pages (confirmed working)

**URL Pattern:** `https://skater-stats.com/{name-slug}`

Examples:
- `https://skater-stats.com/ela-cui`
- `https://skater-stats.com/alysa-zhang`
- `https://skater-stats.com/frida-munoz-2` (disambiguation suffix for duplicate names)

**Slug Format:** Lowercase, hyphen-separated full name. Pairs/dance teams use combined names (e.g., `audrey-lu-misha-mitrofanov`).

### Data Fields Available on Skater Profiles

| Field | Format | Example |
|-------|--------|---------|
| Skater Name | String | "Alysa Zhang" |
| Club | String | "Elite Edge SC" |
| Total Events | Integer | 53 |
| Total Competitions | Integer | 28 |
| Competition Name | String | "NQS - 2025 Cranberry Open" |
| Date | "MMM DD, YYYY" | "Aug 8, 2025" |
| Segment/Event Type | String | "Free Skate" |
| Discipline/Level | String | "Junior Women" |
| Placement | Integer or "—" | 2 |
| Score | Decimal or "—" | 96.64 |

### Fields NOT Available

- USFS member number (not displayed publicly)
- Country/nationality
- Date of birth / age
- Coach or choreographer
- Personal best summary (must be computed from results)
- Season bests (must be computed)
- Technical Element Score (TES) / Program Component Score (PCS) breakdown

### Competition Pages

**URL Patterns:**
- ISU events: `/competition/isu/{slug}` (e.g., `/competition/isu/isu-gp-skate-america-2026`)
- US domestic: `/competition/{year}/{numeric-id}` (e.g., `/competition/2026/37094`)
- Named domestic: `/c/{slug}` (e.g., `/c/2026-los-angeles-open-championships`)

**Competition page data:** name, dates, city, state/country. Results appear to require JavaScript rendering.

### Sitemap Structure

| Sitemap | Content |
|---------|---------|
| sitemap-pages.xml | 6 static pages |
| sitemap-competitions.xml | All competitions |
| sitemap-skaters-1.xml | Skater profiles (part 1) |
| sitemap-skaters-2.xml | Skater profiles (part 2) |
| sitemap-coaches.xml | Coach profiles |
| sitemap-officials.xml | Officials/judges |

---

## 3. Mapping to Our Mock Data

### Current Mock Fields (from client-dashboard.html)

| Our Field | Source on Skater-Stats | Mapping Difficulty |
|-----------|----------------------|-------------------|
| Competition (name) | Competition Name | Direct match |
| Date | Date | Direct (parse "MMM DD, YYYY") |
| Event (discipline + level) | Discipline + " " + Segment | Concatenate two fields |
| Place | Placement | Direct (integer) |
| Score | Score | Direct (decimal) |
| Total Competitions | Total Competitions count | Direct |
| Gold/Silver/Bronze Medals | Computed from placements (1st/2nd/3rd) | Derived |
| Personal Best | Max score across all Free Skate entries | Derived |

### Mock Data vs Real Data Comparison

**Mock (Emma Anderson):**
```
KC Metro Open | Apr 12, 2026 | Intermediate Free Skate | 1st | 42.85
```

**Real (Alysa Zhang, same schema):**
```
NQS - 2025 Cranberry Open | Aug 8, 2025 | Junior Women / Free Skate | 2 | 96.64
```

The structures align well. The main difference is that real data separates discipline ("Junior Women") from segment ("Free Skate") while our mock combines them ("Intermediate Free Skate").

---

## 4. Recommended Integration Approach

### Option A: Web Scraping (Recommended for MVP)

Since there is no public API, scrape the public skater profile pages.

#### Django Service Class

```python
# apps/competitions/services.py

import re
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass

import httpx
from bs4 import BeautifulSoup
from django.core.cache import cache


@dataclass
class CompetitionResult:
    competition_name: str
    date: datetime
    segment: str        # "Free Skate", "Short Program"
    discipline: str     # "Junior Women", "Intermediate Ladies"
    placement: Optional[int]
    score: Optional[float]


@dataclass
class SkaterProfile:
    name: str
    club: str
    total_events: int
    total_competitions: int
    results: list[CompetitionResult]

    @property
    def personal_best_free_skate(self) -> Optional[float]:
        free_skate_scores = [
            r.score for r in self.results
            if r.segment == "Free Skate" and r.score is not None
        ]
        return max(free_skate_scores) if free_skate_scores else None

    @property
    def medal_counts(self) -> dict:
        placements = [r.placement for r in self.results if r.placement]
        return {
            "gold": placements.count(1),
            "silver": placements.count(2),
            "bronze": placements.count(3),
        }


class SkaterStatsService:
    """Fetches and caches competition data from skater-stats.com."""

    BASE_URL = "https://skater-stats.com"
    CACHE_TTL = 60 * 60 * 24  # 24 hours
    REQUEST_TIMEOUT = 10.0

    def __init__(self):
        self.client = httpx.Client(
            timeout=self.REQUEST_TIMEOUT,
            headers={
                "User-Agent": "LineCreekFSC-Platform/1.0 (club management)",
            },
            follow_redirects=True,
        )

    def _name_to_slug(self, name: str) -> str:
        """Convert a skater name to a URL slug.

        'Emma Anderson' -> 'emma-anderson'
        'Clara Delcamino-Yang' -> 'clara-delcamino-yang'
        """
        slug = name.lower().strip()
        slug = re.sub(r"[^a-z0-9\s-]", "", slug)
        slug = re.sub(r"\s+", "-", slug)
        return slug

    def _cache_key(self, slug: str) -> str:
        return f"skater_stats:{slug}"

    def get_skater_profile(
        self, name: str, slug_override: Optional[str] = None
    ) -> Optional[SkaterProfile]:
        """Fetch competition history for a skater.

        Args:
            name: Full name (e.g., "Emma Anderson")
            slug_override: Manual slug if auto-generation doesn't match
                          (e.g., "emma-anderson-2" for disambiguation)
        """
        slug = slug_override or self._name_to_slug(name)
        cache_key = self._cache_key(slug)

        # Check cache first
        cached = cache.get(cache_key)
        if cached is not None:
            return cached

        # Fetch from skater-stats.com
        url = f"{self.BASE_URL}/{slug}"
        try:
            response = self.client.get(url)
            if response.status_code == 404:
                # Skater not found — cache the miss briefly
                cache.set(cache_key, None, 60 * 60)  # 1 hour
                return None
            response.raise_for_status()
        except httpx.HTTPError:
            return None

        profile = self._parse_profile(response.text, name)
        if profile:
            cache.set(cache_key, profile, self.CACHE_TTL)
        return profile

    def _parse_profile(self, html: str, name: str) -> Optional[SkaterProfile]:
        """Parse competition results from a skater profile page."""
        soup = BeautifulSoup(html, "html.parser")

        # Implementation depends on actual HTML structure
        # This is the pattern — actual selectors need refinement
        # once we can inspect the rendered DOM
        results = []

        # Look for result rows in the page
        # (Actual selectors TBD based on rendered HTML inspection)
        for row in soup.select("table tr, [data-result], .result-row"):
            result = self._parse_result_row(row)
            if result:
                results.append(result)

        if not results:
            return None

        # Extract club info
        club = ""
        club_el = soup.select_one(".club, [data-club]")
        if club_el:
            club = club_el.get_text(strip=True)

        return SkaterProfile(
            name=name,
            club=club,
            total_events=len(results),
            total_competitions=len(set(r.competition_name for r in results)),
            results=results,
        )

    def _parse_result_row(self, row) -> Optional[CompetitionResult]:
        """Parse a single competition result row."""
        # Placeholder — actual parsing depends on DOM structure
        # Will need browser-rendered inspection to finalize
        pass
```

#### Skater Model Integration

```python
# apps/members/models.py

class Skater(models.Model):
    # ... existing fields ...

    # Skater-Stats integration
    skater_stats_slug = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="URL slug on skater-stats.com (e.g., 'emma-anderson')"
    )
    skater_stats_last_synced = models.DateTimeField(null=True, blank=True)

    def get_competition_history(self):
        """Fetch competition history from Skater-Stats."""
        from apps.competitions.services import SkaterStatsService

        if not self.skater_stats_slug:
            return None
        service = SkaterStatsService()
        return service.get_skater_profile(
            name=self.get_full_name(),
            slug_override=self.skater_stats_slug,
        )
```

### Option B: Direct Partnership (Recommended Long-Term)

Contact Skater-Stats.com to request API access or establish a data partnership.

**Benefits:**
- Reliable structured JSON responses
- No scraping fragility
- Possible real-time webhooks for new results
- Access to detailed scoring (TES/PCS breakdown)
- Proper identifier matching (USFS member number)

**Approach:**
1. Send partnership inquiry via their contact form
2. Explain use case: club management platform showing member competition history
3. Offer to display attribution ("Data provided by Skater-Stats.com")
4. Ask about: auth mechanism, rate limits, available endpoints, cost

### Option C: IJS/USFS Data Direct (Fallback)

If scraping is blocked and no partnership materializes:
- USFS publishes competition results at `https://www.usfigureskating.org/members-only/members/competition-results`
- IJS (International Judging System) result sheets are published as PDFs after each competition
- Could build a separate ingestion pipeline from USFS result PDFs

---

## 5. Integration Architecture

```
┌─────────────────────┐     ┌──────────────────────┐
│   Django Backend     │     │  skater-stats.com    │
│                      │     │                      │
│  ┌────────────────┐  │     │  /{name-slug}        │
│  │ SkaterStats    │──┼────►│  (public profiles)   │
│  │ Service        │  │     │                      │
│  └───────┬────────┘  │     └──────────────────────┘
│          │           │
│  ┌───────▼────────┐  │
│  │ Django Cache   │  │     Cache TTL: 24 hours
│  │ (Redis)        │  │     Refresh: daily cron or on-demand
│  └───────┬────────┘  │
│          │           │
│  ┌───────▼────────┐  │     ┌──────────────────────┐
│  │ Competition    │  │     │  Next.js Frontend    │
│  │ History API    │──┼────►│                      │
│  │ /api/skaters/  │  │     │  Competition History │
│  │ {id}/results/  │  │     │  Component           │
│  └────────────────┘  │     └──────────────────────┘
└─────────────────────┘
```

### Caching Strategy

| Scenario | Cache TTL | Trigger |
|----------|-----------|---------|
| Normal browsing | 24 hours | Automatic expiry |
| After known competition weekend | Force refresh | Manual or webhook |
| Skater not found | 1 hour | Retry after expiry |
| Service unavailable | Serve stale | Graceful degradation |

### Django Management Command

```python
# apps/competitions/management/commands/sync_competition_history.py

class Command(BaseCommand):
    help = "Sync competition history from Skater-Stats for all active members"

    def handle(self, *args, **options):
        from apps.members.models import Skater
        from apps.competitions.services import SkaterStatsService

        service = SkaterStatsService()
        skaters = Skater.objects.filter(
            is_active=True,
            skater_stats_slug__isnull=False,
        )

        for skater in skaters:
            profile = service.get_skater_profile(
                name=skater.get_full_name(),
                slug_override=skater.skater_stats_slug,
            )
            if profile:
                skater.skater_stats_last_synced = timezone.now()
                skater.save(update_fields=["skater_stats_last_synced"])
                self.stdout.write(f"Synced {skater}: {profile.total_events} events")
```

Run daily via cron: `0 6 * * * python manage.py sync_competition_history`

---

## 6. Gotchas and Limitations

### Scraping Risks
- **HTML structure changes:** Site redesigns will break parsing. Need monitoring/alerts.
- **Rate limiting:** Unknown limits. Implement polite crawling (1 req/sec, respect 429s).
- **JavaScript rendering:** Competition pages may require JS execution. Skater profiles appear to work with static HTML based on our testing.
- **Disambiguation:** Multiple skaters with the same name use suffixed slugs (e.g., `-2`). Need manual slug assignment for affected members.

### Data Gaps
- **No USFS member ID:** Cannot auto-match members by ID. Must match by name (fragile) or manually assign slugs.
- **No TES/PCS breakdown:** Only total segment scores are shown. Detailed element scores not available.
- **Historical gaps:** Older/smaller competitions may not be indexed.
- **Name changes:** Married names or legal name changes break slug matching.

### Legal Considerations
- No published Terms of Service found regarding scraping or data reuse.
- robots.txt allows all paths (no scraping restrictions stated).
- Recommend displaying clear attribution: "Competition data provided by Skater-Stats.com"
- Consider reaching out proactively to establish permission.

### Skater Matching Strategy

Since USFS member IDs are not available on Skater-Stats:

1. **Admin assigns slug manually** when adding a skater (safest)
2. **Auto-suggest:** Generate slug from name, verify by checking if the profile exists and the club matches
3. **Disambiguation UI:** If multiple slugs match (e.g., `emma-anderson`, `emma-anderson-2`), show admin a picker with club info

---

## 7. Implementation Roadmap

| Phase | Scope | Effort |
|-------|-------|--------|
| 1. Manual slug assignment | Add `skater_stats_slug` field to Skater model, admin can paste URL | 1 day |
| 2. Scraping service | Build `SkaterStatsService` with httpx + BeautifulSoup parsing | 2-3 days |
| 3. Cache + API endpoint | Redis cache, DRF endpoint for frontend consumption | 1 day |
| 4. Frontend integration | Replace mock data in Competition History component | 1 day |
| 5. Background sync | Daily cron job to refresh all active skaters | 0.5 day |
| 6. Partnership outreach | Contact Skater-Stats about official API access | Ongoing |

**Total MVP effort:** ~5-6 days

---

## 8. Next Steps

1. **Inspect rendered DOM** — Use browser dev tools on a skater profile to determine exact CSS selectors/DOM structure for parsing
2. **Build proof-of-concept scraper** — Parse 3-5 known skater profiles to validate approach
3. **Contact Skater-Stats** — Email about partnership/API access (reduces long-term maintenance)
4. **Add slug field to model** — Database migration for `skater_stats_slug`
5. **Implement service class** — With proper error handling and caching
