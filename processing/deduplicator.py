"""
VayuDrishti - Deduplicator
Prevents duplicate readings from multiple sources being double-counted.
Uses an in-memory cache with 5-minute time buckets.
"""

import time
from datetime import datetime, timezone

from dateutil import parser as dateutil_parser

DEDUP_CACHE = {}
DEDUP_WINDOW_SECONDS = 300  # 5 minutes
_record_count = 0


def _round_to_bucket(timestamp_str):
    """Round a timestamp to the nearest 5-minute bucket."""
    try:
        ts = dateutil_parser.parse(str(timestamp_str))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        bucket = int(ts.timestamp()) // DEDUP_WINDOW_SECONDS
        return str(bucket)
    except (ValueError, TypeError):
        return "0"


def make_dedup_key(record):
    """Build a dedup key from city + pollutant + sector + time bucket."""
    city = record.get("city", record.get("state", "unknown"))
    pollutant = record.get("primary_pollutant", "unknown")
    sector = record.get("sector", "unknown")
    time_bucket = _round_to_bucket(record.get("timestamp", ""))
    return f"{city}:{pollutant}:{sector}:{time_bucket}"


def is_duplicate(record):
    """Check if a record is a duplicate within the dedup window."""
    global _record_count
    _record_count += 1
    if _record_count % 100 == 0:
        clean_cache()

    key = make_dedup_key(record)
    now = time.time()

    if key in DEDUP_CACHE:
        if now - DEDUP_CACHE[key] < DEDUP_WINDOW_SECONDS:
            return True

    DEDUP_CACHE[key] = now
    return False


def clean_cache():
    """Remove entries older than DEDUP_WINDOW_SECONDS."""
    now = time.time()
    stale = [k for k, v in DEDUP_CACHE.items() if now - v >= DEDUP_WINDOW_SECONDS]
    for k in stale:
        del DEDUP_CACHE[k]
