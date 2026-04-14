"""
VayuDrishti - Data Cleaner
Validates, sanitizes, and standardizes raw emission records
before further processing.
"""

from datetime import datetime, timezone, timedelta

from dateutil import parser as dateutil_parser

REQUIRED_FIELDS = ["source", "timestamp", "sector"]

NUMERIC_FIELDS = [
    "value", "pm25", "pm2_5", "co2", "no2", "so2", "co",
    "carbon_monoxide", "nitrogen_dioxide", "sulphur_dioxide",
    "pollutant_avg", "value_avg", "aqi", "carbon_intensity",
    "co2_kg", "generation_mwh", "co2_equivalent",
]

SOURCE_MAP = {
    "open-meteo-satellite": "satellite",
    "waqi-ground-sensor": "ground_sensor",
    "datagovin-cpcb": "cpcb_official",
    "owid-historical": "historical",
    "nasa-power-satellite": "nasa_satellite",
    "openaq": "ground_sensor",
}

VALID_SECTORS = {"industrial", "transport", "energy", "historical_baseline"}

MAX_AGE_DAYS = 30
MAX_VALUE = 99999


def clean_record(record):
    """Clean and validate a raw emission record. Returns cleaned dict or None."""
    # STEP 1 - NULL CHECK
    if record is None or not isinstance(record, dict):
        return None
    for field in REQUIRED_FIELDS:
        if field not in record or record[field] is None:
            return None

    # STEP 2 - TIMESTAMP VALIDATION
    try:
        ts = dateutil_parser.parse(str(record["timestamp"]))
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        now = datetime.now(timezone.utc)
        if ts < now - timedelta(days=MAX_AGE_DAYS):
            return None
        if ts > now:
            ts = now
        record["timestamp"] = ts.isoformat()
    except (ValueError, TypeError, OverflowError):
        return None

    # STEP 3 - VALUE VALIDATION
    found_numeric = False
    for field in NUMERIC_FIELDS:
        if field in record and record[field] is not None:
            try:
                val = float(record[field])
            except (ValueError, TypeError):
                continue
            if val < 0 or val > MAX_VALUE:
                continue
            record[field] = val
            found_numeric = True
    if not found_numeric:
        return None

    # STEP 4 - SOURCE STANDARDIZATION
    source = record.get("source", "")
    if "mqtt" in source.lower() or "iot" in source.lower():
        record["source_standard"] = "iot_sensor"
    else:
        record["source_standard"] = SOURCE_MAP.get(source, source)

    # STEP 5 - SECTOR VALIDATION
    if record.get("sector") not in VALID_SECTORS:
        record["sector"] = "industrial"

    record["cleaned_at"] = datetime.now(timezone.utc).isoformat()
    record["data_quality"] = "verified"
    return record
