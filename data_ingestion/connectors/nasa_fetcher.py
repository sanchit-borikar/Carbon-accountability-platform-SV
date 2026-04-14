"""
VayuDrishti - NASA POWER Satellite Data Fetcher
Fetches meteorological context data (temperature, wind, humidity, solar radiation)
from NASA POWER API and produces to Kafka for industrial emission correlation.
"""

import os
import time
from datetime import datetime, timezone, timedelta

import requests
from dotenv import load_dotenv

from data_ingestion.connectors.kafka_producer import send_to_kafka, flush_producer

load_dotenv()

BASE_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"

INDIA_CITIES = [
    {"name": "Delhi",      "state": "Delhi",          "lat": 28.61, "lon": 77.20},
    {"name": "Mumbai",     "state": "Maharashtra",    "lat": 19.07, "lon": 72.87},
    {"name": "Chennai",    "state": "Tamil Nadu",     "lat": 13.08, "lon": 80.27},
    {"name": "Kolkata",    "state": "West Bengal",     "lat": 22.57, "lon": 88.36},
    {"name": "Bengaluru",  "state": "Karnataka",      "lat": 12.97, "lon": 77.59},
    {"name": "Hyderabad",  "state": "Telangana",      "lat": 17.38, "lon": 78.48},
    {"name": "Lucknow",    "state": "Uttar Pradesh",  "lat": 26.85, "lon": 80.95},
    {"name": "Patna",      "state": "Bihar",          "lat": 25.59, "lon": 85.13},
]

FETCH_INTERVAL_SECONDS = 3600


def _get_latest_value(hourly_dict):
    """Get the most recent non-fill value from a POWER hourly dict."""
    if not hourly_dict:
        return None
    for key in sorted(hourly_dict.keys(), reverse=True):
        val = hourly_dict[key]
        if val is not None and val != -999.0:
            return val
    return None


def fetch_and_produce():
    """Fetch NASA POWER meteorological data for Indian cities and send to Kafka."""
    token = os.getenv("NASA_EARTHDATA_TOKEN")

    print(f"[NASA-POWER] Starting NASA POWER fetcher for {len(INDIA_CITIES)} cities...")

    while True:
        now = datetime.now(timezone.utc)
        yesterday = (now - timedelta(days=1)).strftime("%Y%m%d")
        today = now.strftime("%Y%m%d")
        fetched = 0

        for city in INDIA_CITIES:
            params = {
                "parameters": "T2M,WS10M,RH2M,ALLSKY_SFC_SW_DWN",
                "community": "RE",
                "longitude": city["lon"],
                "latitude": city["lat"],
                "start": yesterday,
                "end": today,
                "format": "JSON",
                "time-standard": "UTC",
            }
            headers = {"Authorization": f"Bearer {token}"}

            try:
                response = requests.get(BASE_URL, params=params, headers=headers, timeout=60)
                response.raise_for_status()
            except requests.RequestException as e:
                print(f"[NASA-POWER] Error fetching {city['name']}: {e}")
                continue

            try:
                data = response.json()
                props = data.get("properties", {}).get("parameter", {})

                latest_hour = list(props.get("T2M", {}).keys())[-1]
                t2m = props["T2M"][latest_hour]
                ws10m = props["WS10M"][latest_hour]
                rh2m = props["RH2M"][latest_hour]
                solar = props["ALLSKY_SFC_SW_DWN"][latest_hour]

                message = {
                    "source": "nasa-power-satellite",
                    "city": city["name"],
                    "state": city["state"],
                    "latitude": city["lat"],
                    "longitude": city["lon"],
                    "timestamp": now.isoformat(),
                    "temperature_c": t2m,
                    "wind_speed_ms": ws10m,
                    "humidity_pct": rh2m,
                    "solar_radiation": solar,
                    "sector": "industrial",
                    "data_type": "meteorological_context",
                    "status": "NORMAL",
                }

                send_to_kafka("emissions.industrial", message)
                fetched += 1
            except Exception as e:
                print(f"[NASA-POWER] Parse error for {city['name']}: {e}")
                continue

        flush_producer()
        print(f"[NASA] Fetched meteorological context for {fetched} cities")
        print(f"[NASA-POWER] Sleeping {FETCH_INTERVAL_SECONDS}s until next fetch...")
        time.sleep(FETCH_INTERVAL_SECONDS)
