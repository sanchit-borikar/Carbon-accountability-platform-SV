"""
VayuDrishti - Open-Meteo Air Quality Satellite Data Fetcher
Fetches real satellite-derived air quality data from Open-Meteo API
and produces it to Kafka topics mapped by sector.
"""

import time
from datetime import datetime, timezone

import requests

from data_ingestion.connectors.kafka_producer import send_to_kafka, flush_producer

BASE_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

ALL_INDIA_CITIES = [
    {"name": "Delhi",          "state": "Delhi",             "lat": 28.61, "lon": 77.20},
    {"name": "Mumbai",         "state": "Maharashtra",       "lat": 19.07, "lon": 72.87},
    {"name": "Chennai",        "state": "Tamil Nadu",        "lat": 13.08, "lon": 80.27},
    {"name": "Kolkata",        "state": "West Bengal",       "lat": 22.57, "lon": 88.36},
    {"name": "Bengaluru",      "state": "Karnataka",         "lat": 12.97, "lon": 77.59},
    {"name": "Hyderabad",      "state": "Telangana",         "lat": 17.38, "lon": 78.48},
    {"name": "Pune",           "state": "Maharashtra",       "lat": 18.52, "lon": 73.85},
    {"name": "Ahmedabad",      "state": "Gujarat",           "lat": 23.02, "lon": 72.57},
    {"name": "Jaipur",         "state": "Rajasthan",         "lat": 26.91, "lon": 75.78},
    {"name": "Lucknow",        "state": "Uttar Pradesh",     "lat": 26.85, "lon": 80.95},
    {"name": "Patna",          "state": "Bihar",             "lat": 25.59, "lon": 85.13},
    {"name": "Bhopal",         "state": "Madhya Pradesh",    "lat": 23.25, "lon": 77.40},
    {"name": "Raipur",         "state": "Chhattisgarh",      "lat": 21.25, "lon": 81.62},
    {"name": "Ranchi",         "state": "Jharkhand",         "lat": 23.34, "lon": 85.33},
    {"name": "Bhubaneswar",    "state": "Odisha",            "lat": 20.29, "lon": 85.82},
    {"name": "Chandigarh",     "state": "Punjab",            "lat": 30.73, "lon": 76.77},
    {"name": "Amritsar",       "state": "Punjab",            "lat": 31.63, "lon": 74.87},
    {"name": "Shimla",         "state": "Himachal Pradesh",  "lat": 31.10, "lon": 77.17},
    {"name": "Dehradun",       "state": "Uttarakhand",       "lat": 30.31, "lon": 78.03},
    {"name": "Guwahati",       "state": "Assam",             "lat": 26.18, "lon": 91.74},
    {"name": "Shillong",       "state": "Meghalaya",         "lat": 25.57, "lon": 91.88},
    {"name": "Imphal",         "state": "Manipur",           "lat": 24.81, "lon": 93.93},
    {"name": "Agartala",       "state": "Tripura",           "lat": 23.83, "lon": 91.27},
    {"name": "Aizawl",         "state": "Mizoram",           "lat": 23.72, "lon": 92.71},
    {"name": "Kohima",         "state": "Nagaland",          "lat": 25.67, "lon": 94.11},
    {"name": "Itanagar",       "state": "Arunachal Pradesh", "lat": 27.08, "lon": 93.60},
    {"name": "Gangtok",        "state": "Sikkim",            "lat": 27.33, "lon": 88.61},
    {"name": "Thiruvananthapuram", "state": "Kerala",        "lat": 8.52,  "lon": 76.93},
    {"name": "Panaji",         "state": "Goa",               "lat": 15.49, "lon": 73.82},
    {"name": "Srinagar",       "state": "J&K",               "lat": 34.08, "lon": 74.79},
    {"name": "Jammu",          "state": "J&K",               "lat": 32.72, "lon": 74.85},
    {"name": "Puducherry",     "state": "Puducherry",        "lat": 11.93, "lon": 79.82},
]

PARAMETER_SECTOR_MAP = {
    "pm2_5": "industrial",
    "sulphur_dioxide": "industrial",
    "carbon_monoxide": "transport",
    "nitrogen_dioxide": "transport",
}

KAFKA_TOPICS = {
    "industrial": "emissions.industrial",
    "transport": "emissions.transport",
}

FETCH_INTERVAL_SECONDS = 60


def _get_status(pm2_5_value):
    """Determine status based on PM2.5 thresholds."""
    if pm2_5_value is None:
        return "NORMAL"
    if pm2_5_value > 55:
        return "CRITICAL"
    elif pm2_5_value > 35:
        return "WARNING"
    return "NORMAL"


def fetch_and_produce():
    """Fetch satellite air quality data from Open-Meteo and send to Kafka."""
    print(f"[OpenMeteo] Fetching air quality for {len(ALL_INDIA_CITIES)} Indian cities...")

    for city in ALL_INDIA_CITIES:
        params = {
            "latitude": city["lat"],
            "longitude": city["lon"],
            "current": "pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide",
        }

        try:
            response = requests.get(BASE_URL, params=params, timeout=30)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[OpenMeteo] Error fetching {city['name']}: {e}")
            continue

        data = response.json()
        current = data.get("current", {})
        timestamp = current.get("time") or datetime.now(timezone.utc).isoformat()
        pm2_5_value = current.get("pm2_5")

        for parameter in ("pm2_5", "sulphur_dioxide", "carbon_monoxide", "nitrogen_dioxide"):
            value = current.get(parameter)
            if value is None:
                continue

            sector = PARAMETER_SECTOR_MAP[parameter]
            topic = KAFKA_TOPICS[sector]

            reading = {
                "source": "open-meteo-satellite",
                "city": city["name"],
                "state": city["state"],
                "latitude": city["lat"],
                "longitude": city["lon"],
                "timestamp": timestamp,
                "parameter": parameter,
                "value": value,
                "unit": "µg/m³",
                "sector": sector,
                "status": _get_status(pm2_5_value),
            }

            send_to_kafka(topic, reading)

    flush_producer()
    print("[OpenMeteo] Fetch cycle complete")


def run_openmeteo_fetcher():
    """Run the Open-Meteo fetcher in an infinite loop."""
    print("Starting Open-Meteo Air Quality Fetcher...")
    while True:
        fetch_and_produce()
        print(f"[OpenMeteo] Sleeping {FETCH_INTERVAL_SECONDS}s until next fetch...")
        time.sleep(FETCH_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_openmeteo_fetcher()
