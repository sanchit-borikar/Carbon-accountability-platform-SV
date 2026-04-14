"""
VayuDrishti - Data.gov.in Fetcher
Fetches real-time AQI, SO2 compliance, and CO2 thermal power data
from Government of India Open Data APIs and produces to Kafka topics.
"""

import os
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

from data_ingestion.connectors.kafka_producer import send_to_kafka, flush_producer

load_dotenv()

API_AQI_URL = "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69"

FETCH_INTERVAL = 300


def _fetch_aqi():
    """Fetch Real Time AQI from CPCB stations (all Indian states)."""
    params = {
        "api-key": os.getenv("DATAGOVIN_AQI_KEY"),
        "format": "json",
        "limit": "500",
        "offset": "0",
    }

    try:
        response = requests.get(API_AQI_URL, params=params, timeout=30)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"[DataGovIn] AQI API error: {e}")
        return

    data = response.json()
    records = data.get("records", [])
    print(f"[DataGovIn] AQI: received {len(records)} records")

    industrial_pollutants = ["PM2.5", "PM10", "SO2", "NH3"]
    transport_pollutants = ["NO2", "CO", "OZONE", "NO"]

    for rec in records:
        state = rec.get("state", "")
        city = rec.get("city", "")
        station = rec.get("station", "")
        pollutant_id = rec.get("pollutant_id", "")
        pollutant_min = rec.get("pollutant_min", "0")
        pollutant_max = rec.get("pollutant_max", "0")
        last_update = rec.get("last_update", "")

        try:
            value = float(str(rec.get("pollutant_avg", "0")).strip())
        except:
            value = 0.0

        status = "CRITICAL" if value > 200 else "WARNING" if value > 100 else "NORMAL"

        sector = "industrial" if pollutant_id in industrial_pollutants else "transport"
        topic = "emissions.industrial" if sector == "industrial" else "emissions.transport"

        message = {
            "source": "datagovin-cpcb",
            "state": state,
            "city": city,
            "station": station,
            "pollutant": pollutant_id,
            "pollutant_avg": str(value),
            "value_avg": str(value),
            "value_min": pollutant_min,
            "value_max": pollutant_max,
            "timestamp": last_update or datetime.now(timezone.utc).isoformat(),
            "sector": sector,
            "status": status,
        }

        send_to_kafka(topic, message)

    flush_producer()


def fetch_and_produce():
    """Run Data.gov.in AQI API in a loop."""
    print("[DataGovIn] Starting Data.gov.in AQI fetcher...")

    while True:
        try:
            _fetch_aqi()
        except Exception as e:
            print(f"[DataGovIn] AQI fetch failed: {e}")
        print(f"[DataGovIn] Sleeping {FETCH_INTERVAL}s until next fetch...")
        time.sleep(FETCH_INTERVAL)
