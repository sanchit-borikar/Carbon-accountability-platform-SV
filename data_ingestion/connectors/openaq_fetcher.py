"""
VayuDrishti - OpenAQ Air Quality Data Fetcher
Fetches real air quality readings from Indian cities via OpenAQ v3 API
and produces them to Kafka topics mapped by sector.
"""

import os
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

from data_ingestion.connectors.kafka_producer import send_to_kafka, flush_producer

load_dotenv()

OPENAQ_BASE_URL = "https://api.openaq.org/v3"

INDIA_LOCATIONS = [
    {"id": 2178,  "name": "Delhi - Anand Vihar",      "city": "Delhi",     "lat": 28.6469, "lon": 77.3152},
    {"id": 2175,  "name": "Delhi - IGI Airport",       "city": "Delhi",     "lat": 28.5562, "lon": 77.1000},
    {"id": 2176,  "name": "Delhi - Punjabi Bagh",      "city": "Delhi",     "lat": 28.6663, "lon": 77.1314},
    {"id": 2177,  "name": "Delhi - RK Puram",          "city": "Delhi",     "lat": 28.5639, "lon": 77.1800},
    {"id": 8118,  "name": "Mumbai - Bandra",           "city": "Mumbai",    "lat": 19.0596, "lon": 72.8295},
    {"id": 8122,  "name": "Mumbai - Chembur",          "city": "Mumbai",    "lat": 19.0522, "lon": 72.8994},
    {"id": 8123,  "name": "Mumbai - Mazgaon",          "city": "Mumbai",    "lat": 18.9667, "lon": 72.8333},
    {"id": 8119,  "name": "Chennai - Manali",          "city": "Chennai",   "lat": 13.1674, "lon": 80.2576},
    {"id": 8124,  "name": "Chennai - Alandur",         "city": "Chennai",   "lat": 13.0000, "lon": 80.2000},
    {"id": 8120,  "name": "Kolkata - Rabindra Sarani", "city": "Kolkata",   "lat": 22.5726, "lon": 88.3639},
    {"id": 8125,  "name": "Kolkata - Jadavpur",        "city": "Kolkata",   "lat": 22.4996, "lon": 88.3714},
    {"id": 8121,  "name": "Hyderabad - Central",       "city": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
    {"id": 8126,  "name": "Hyderabad - Bollaram",      "city": "Hyderabad", "lat": 17.5000, "lon": 78.4000},
    {"id": 8127,  "name": "Bengaluru - Silk Board",    "city": "Bengaluru", "lat": 12.9170, "lon": 77.6230},
    {"id": 8128,  "name": "Bengaluru - Hebbal",        "city": "Bengaluru", "lat": 13.0350, "lon": 77.5970},
    {"id": 8129,  "name": "Pune - Karve Road",         "city": "Pune",      "lat": 18.4975, "lon": 73.8278},
    {"id": 8130,  "name": "Ahmedabad - Bopal",         "city": "Ahmedabad", "lat": 23.0300, "lon": 72.4700},
    {"id": 8131,  "name": "Lucknow - Lalbagh",         "city": "Lucknow",   "lat": 26.8500, "lon": 80.9200},
    {"id": 8132,  "name": "Jaipur - Mansarovar",       "city": "Jaipur",    "lat": 26.8500, "lon": 75.7500},
    {"id": 8133,  "name": "Patna - IGIMS",             "city": "Patna",     "lat": 25.6093, "lon": 85.1376},
]

# Parameter → sector mapping
PARAMETER_SECTOR_MAP = {
    "pm25": "industrial",
    "so2": "industrial",
    "no2": "transport",
    "co": "transport",
}

# Thresholds per parameter: (critical, warning)
PARAMETER_THRESHOLDS = {
    "pm25": {"critical": 55, "warning": 35},
    "so2": {"critical": 80, "warning": 40},
    "no2": {"critical": 100, "warning": 50},
    "co": {"critical": 10, "warning": 5},
}

KAFKA_TOPICS = {
    "industrial": "emissions.industrial",
    "transport": "emissions.transport",
}

FETCH_INTERVAL_SECONDS = 60

# Cache sensor_id → parameter name so we don't re-fetch every cycle
_sensor_param_cache = {}


def _headers():
    return {"X-API-Key": os.getenv("OPENAQ_API_KEY")}


def _get_status(parameter, value):
    """Determine status based on parameter-specific thresholds."""
    thresholds = PARAMETER_THRESHOLDS.get(parameter, {"critical": 100, "warning": 50})
    if value > thresholds["critical"]:
        return "CRITICAL"
    elif value > thresholds["warning"]:
        return "WARNING"
    return "NORMAL"


def _fetch_location_latest(location_id):
    """Fetch latest readings for a location."""
    url = f"{OPENAQ_BASE_URL}/locations/{location_id}/latest"
    response = requests.get(url, headers=_headers(), timeout=30)
    response.raise_for_status()
    return response.json().get("results", [])


def _get_sensor_parameter(sensor_id):
    """Fetch parameter name for a sensor (cached)."""
    if sensor_id in _sensor_param_cache:
        return _sensor_param_cache[sensor_id]

    url = f"{OPENAQ_BASE_URL}/sensors/{sensor_id}"
    response = requests.get(url, headers=_headers(), timeout=30)
    response.raise_for_status()
    data = response.json().get("results", [])
    if not data:
        return None

    sensor = data[0] if isinstance(data, list) else data
    param_info = sensor.get("parameter", {})
    if isinstance(param_info, dict):
        name = param_info.get("name", "").lower()
    else:
        name = str(param_info).lower()

    if name in ("pm2.5",):
        name = "pm25"

    _sensor_param_cache[sensor_id] = name
    return name


def fetch_and_produce():
    """Fetch real air quality data from hardcoded Indian stations and send to Kafka."""
    print(f"[OpenAQ] Fetching latest from {len(INDIA_LOCATIONS)} Indian stations...")

    for loc in INDIA_LOCATIONS:
        loc_id = loc["id"]

        try:
            results = _fetch_location_latest(loc_id)
        except requests.HTTPError as e:
            if e.response is not None and e.response.status_code == 404:
                continue
            continue
        except requests.RequestException:
            continue

        for r in results:
            sensor_id = r.get("sensorsId")
            if sensor_id is None:
                continue

            try:
                param_name = _get_sensor_parameter(sensor_id)
            except requests.HTTPError as e:
                if e.response is not None and e.response.status_code == 404:
                    continue
                continue
            except requests.RequestException:
                continue

            if param_name is None:
                continue

            sector = PARAMETER_SECTOR_MAP.get(param_name)
            if sector is None:
                continue

            value = r.get("value")
            if value is None:
                continue

            coords = r.get("coordinates", {})
            ts = r.get("datetime", {})
            if isinstance(ts, dict):
                ts = ts.get("utc") or datetime.now(timezone.utc).isoformat()
            elif ts is None:
                ts = datetime.now(timezone.utc).isoformat()
            else:
                ts = str(ts)

            reading = {
                "location_id": loc_id,
                "location_name": loc["name"],
                "city": loc["city"],
                "country": "IN",
                "latitude": coords.get("latitude", loc["lat"]),
                "longitude": coords.get("longitude", loc["lon"]),
                "parameter": param_name,
                "value": value,
                "unit": r.get("unit", "µg/m³"),
                "timestamp": ts,
                "sector": sector,
                "status": _get_status(param_name, value),
            }

            topic = KAFKA_TOPICS[sector]
            send_to_kafka(topic, reading)

    flush_producer()
    print("[OpenAQ] Fetch cycle complete")


def run_openaq_fetcher():
    """Run the OpenAQ fetcher in an infinite loop."""
    print("Starting OpenAQ Air Quality Fetcher...")
    while True:
        fetch_and_produce()
        print(f"[OpenAQ] Sleeping {FETCH_INTERVAL_SECONDS}s until next fetch...")
        time.sleep(FETCH_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_openaq_fetcher()
