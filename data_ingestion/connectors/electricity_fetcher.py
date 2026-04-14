"""
VayuDrishti - Electricity Maps Carbon Intensity Fetcher
Fetches real grid carbon intensity data from Electricity Maps free API
and produces it to Kafka energy topic.
"""

import os
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

from data_ingestion.connectors.kafka_producer import send_to_kafka, flush_producer

load_dotenv()

ELECTRICITY_MAPS_BASE_URL = "https://api.electricitymaps.com/v3"

# Indian grid zones with approximate center coordinates
ZONES = [
    {"zone": "IN-SO", "name": "South India Grid",  "lat": 13.08, "lon": 80.27},
    {"zone": "IN-NO", "name": "North India Grid",  "lat": 28.61, "lon": 77.20},
    {"zone": "IN-WE", "name": "West India Grid",   "lat": 19.07, "lon": 72.87},
    {"zone": "IN-EA", "name": "East India Grid",   "lat": 22.57, "lon": 88.36},
]

KAFKA_TOPIC = "emissions.energy"

ESTIMATED_GENERATION_MWH = 500

FETCH_INTERVAL_SECONDS = 60


def _get_status(carbon_intensity):
    """Determine status based on carbon intensity thresholds."""
    if carbon_intensity > 700:
        return "CRITICAL"
    elif carbon_intensity > 400:
        return "WARNING"
    return "NORMAL"


def _fetch_carbon_intensity(zone):
    """Fetch latest carbon intensity for a given zone."""
    url = f"{ELECTRICITY_MAPS_BASE_URL}/carbon-intensity/latest?zone={zone}"
    headers = {"auth-token": os.getenv("ELECTRICITY_MAPS_API_KEY")}
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response.json()


def _map_reading(zone_config, api_data):
    """Map API response to a VayuDrishti energy reading dict."""
    carbon_intensity = api_data.get("carbonIntensity", 0)
    timestamp = api_data.get("datetime") or datetime.now(timezone.utc).isoformat()
    co2_kg = round(carbon_intensity * ESTIMATED_GENERATION_MWH * 1000, 2)

    return {
        "zone": zone_config["zone"],
        "zone_name": zone_config["name"],
        "timestamp": timestamp,
        "sector": "energy",
        "carbon_intensity": carbon_intensity,
        "co2_kg": co2_kg,
        "estimated_generation_mwh": ESTIMATED_GENERATION_MWH,
        "latitude": zone_config["lat"],
        "longitude": zone_config["lon"],
        "status": _get_status(carbon_intensity),
    }


def fetch_and_produce():
    """Fetch real carbon intensity data and send to Kafka."""
    print(f"[ElecMaps] Fetching carbon intensity for {len(ZONES)} Indian zones...")

    for zone_config in ZONES:
        zone = zone_config["zone"]
        try:
            api_data = _fetch_carbon_intensity(zone)
        except requests.RequestException:
            continue

        reading = _map_reading(zone_config, api_data)
        send_to_kafka(KAFKA_TOPIC, reading)

    flush_producer()
    print("[ElecMaps] Fetch cycle complete")


def run_electricity_fetcher():
    """Run the Electricity Maps fetcher in an infinite loop."""
    print("Starting Electricity Maps Carbon Intensity Fetcher...")
    while True:
        fetch_and_produce()
        print(f"[ElecMaps] Sleeping {FETCH_INTERVAL_SECONDS}s until next fetch...")
        time.sleep(FETCH_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_electricity_fetcher()
