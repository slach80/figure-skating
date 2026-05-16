import logging
from django.conf import settings
from django.core.cache import cache, CacheKeyWarning
import httpx

logger = logging.getLogger(__name__)


class SkaterStatsClient:
    """Client for the Skater-Stats internal API at api.skater-stats.com."""

    def __init__(self):
        self.client = httpx.Client(
            base_url=getattr(settings, "SKATER_STATS_BASE_URL", "https://api.skater-stats.com"),
            headers={
                "Accept": "application/json, text/plain, */*",
                "x-client-version": getattr(settings, "SKATER_STATS_CLIENT_VERSION", "2.1.28"),
                "x-client-language": "en",
                "x-platform": "web",
                "x-language-source": "detected",
                "x-system-language": "en-US",
                "x-client-url": "https://skater-stats.com/",
                "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
            },
            timeout=15.0,
        )
        self._cache_ttl = getattr(settings, "SKATER_STATS_CACHE_TTL", 86400)

    def _cache_get(self, key: str) -> dict | list | None:
        try:
            return cache.get(key)
        except Exception:
            logger.warning("Redis cache unavailable, proceeding without cache for key: %s", key)
            return None

    def _cache_set(self, key: str, value, ttl: int) -> None:
        try:
            cache.set(key, value, ttl)
        except Exception:
            logger.warning("Redis cache unavailable, could not store key: %s", key)

    def _get(self, path: str, params: dict | None = None) -> dict | list | None:
        try:
            resp = self.client.get(path, params=params)
            if resp.status_code != 200:
                logger.warning("Skater-Stats API returned %s for %s", resp.status_code, path)
                return None
            data = resp.json()
            if not data:
                return None
            return data
        except httpx.TimeoutException:
            logger.warning("Skater-Stats API timed out for %s", path)
            return None
        except httpx.HTTPError as exc:
            logger.warning("Skater-Stats HTTP error for %s: %s", path, exc)
            return None
        except Exception as exc:
            logger.warning("Skater-Stats unexpected error for %s: %s", path, exc)
            return None

    def get_skater(self, slug: str) -> dict | None:
        """Fetch full skater profile by slug. Cached 24h."""
        cache_key = f"skaterstats:skater:{slug}"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached
        data = self._get("/skater", params={"slug": slug})
        if data:
            self._cache_set(cache_key, data, self._cache_ttl)
        return data

    def search(self, query: str) -> list[dict]:
        """Search across skaters, competitions, clubs, officials."""
        data = self._get("/search", params={"query": query})
        if data is None:
            return []
        return data if isinstance(data, list) else []

    def get_overall_stats(self) -> dict | None:
        """Homepage stats: upcoming/recent/in-progress events. Cached 1h."""
        cache_key = "skaterstats:overall_stats"
        cached = self._cache_get(cache_key)
        if cached is not None:
            return cached
        data = self._get("/overallStats")
        if data:
            self._cache_set(cache_key, data, 3600)
        return data

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
