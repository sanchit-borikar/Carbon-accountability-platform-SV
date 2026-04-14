"""
VayuDrishti - WAQI Ground Sensor Data Fetcher
Fetches real ground-level air quality data from World Air Quality Index API
and produces it to Kafka topics mapped by sector.
"""

import os
import time
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

from data_ingestion.connectors.kafka_producer import send_to_kafka, flush_producer

load_dotenv()

BASE_URL = "https://api.waqi.info/feed"

ALL_INDIA_STATIONS = [
    {"name": "Delhi",              "state": "Delhi",             "station": "delhi"},
    {"name": "Mumbai",             "state": "Maharashtra",       "station": "mumbai"},
    {"name": "Chennai",            "state": "Tamil Nadu",        "station": "chennai"},
    {"name": "Kolkata",            "state": "West Bengal",       "station": "kolkata"},
    {"name": "Bengaluru",          "state": "Karnataka",         "station": "bangalore"},
    {"name": "Hyderabad",          "state": "Telangana",         "station": "hyderabad"},
    {"name": "Ahmedabad",          "state": "Gujarat",           "station": "ahmedabad"},
    {"name": "Jaipur",             "state": "Rajasthan",         "station": "jaipur"},
    {"name": "Lucknow",            "state": "Uttar Pradesh",     "station": "lucknow"},
    {"name": "Patna",              "state": "Bihar",             "station": "patna"},
    {"name": "Bhopal",             "state": "Madhya Pradesh",    "station": "bhopal"},
    {"name": "Raipur",             "state": "Chhattisgarh",      "station": "raipur"},
    {"name": "Ranchi",             "state": "Jharkhand",         "station": "ranchi"},
    {"name": "Bhubaneswar",        "state": "Odisha",            "station": "bhubaneswar"},
    {"name": "Chandigarh",         "state": "Punjab",            "station": "chandigarh"},
    {"name": "Shimla",             "state": "Himachal Pradesh",  "station": "shimla"},
    {"name": "Dehradun",           "state": "Uttarakhand",       "station": "dehradun"},
    {"name": "Guwahati",           "state": "Assam",             "station": "guwahati"},
    {"name": "Shillong",           "state": "Meghalaya",         "station": "shillong"},
    {"name": "Imphal",             "state": "Manipur",           "station": "imphal"},
    {"name": "Agartala",           "state": "Tripura",           "station": "agartala"},
    {"name": "Aizawl",             "state": "Mizoram",           "station": "aizawl"},
    {"name": "Kohima",             "state": "Nagaland",          "station": "kohima"},
    {"name": "Itanagar",           "state": "Arunachal Pradesh", "station": "itanagar"},
    {"name": "Gangtok",            "state": "Sikkim",            "station": "gangtok"},
    {"name": "Thiruvananthapuram", "state": "Kerala",            "station": "thiruvananthapuram"},
    {"name": "Panaji",             "state": "Goa",               "station": "goa"},
    {"name": "Srinagar",           "state": "J&K",               "station": "srinagar"},
]

PARAMETER_SECTOR_MAP = {
    "pm25": "industrial",
    "so2": "industrial",
    "no2": "transport",
    "co": "transport",
}

KAFKA_TOPICS = {
    "industrial": "emissions.industrial",
    "transport": "emissions.transport",
}

FETCH_INTERVAL_SECONDS = 60


def _get_status(aqi):
    """Determine status based on AQI thresholds."""
    if aqi is None:
        return "NORMAL"
    if aqi > 150:
        return "CRITICAL"
    elif aqi > 100:
        return "WARNING"
    return "NORMAL"


def fetch_and_produce():
    """Fetch ground-level air quality data from WAQI and send to Kafka."""
    api_key = os.getenv("WAQI_API_KEY")

    print(f"[WAQI] Fetching air quality from {len(ALL_INDIA_STATIONS)} Indian stations...")

    for station_info in ALL_INDIA_STATIONS:
        url = f"{BASE_URL}/{station_info['station']}/?token={api_key}"

        try:
            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()
            except requests.RequestException as e:
                print(f"[WAQI] Error fetching {station_info['name']}: {e}")
                continue

            body = response.json()
            if body.get("status") != "ok":
                continue

            data = body.get("data", {})
            aqi_raw = data.get("aqi", 0)
            try:
                aqi = int(float(str(aqi_raw)))
            except:
                aqi = 0
            iaqi = data.get("iaqi", {})
            geo = data.get("city", {}).get("geo", None)
            lat = float(geo[0]) if geo and len(geo) > 0 else station_info.get("lat", 0)
            lon = float(geo[1]) if geo and len(geo) > 1 else station_info.get("lon", 0)
            timestamp = data.get("time", {}).get("iso") or datetime.now(timezone.utc).isoformat()

            status = _get_status(aqi)

            pollutants = {
                "pm25": iaqi.get("pm25", {}).get("v"),
                "no2": iaqi.get("no2", {}).get("v"),
                "so2": iaqi.get("so2", {}).get("v"),
                "co": iaqi.get("co", {}).get("v"),
            }

            for parameter, value in pollutants.items():
                if value is None:
                    continue

                sector = PARAMETER_SECTOR_MAP[parameter]
                topic = KAFKA_TOPICS[sector]

                reading = {
                    "source": "waqi-ground-sensor",
                    "station": station_info["name"],
                    "state": station_info["state"],
                    "city": station_info["name"],
                    "latitude": lat,
                    "longitude": lon,
                    "timestamp": timestamp,
                    "parameter": parameter,
                    "value": value,
                    "unit": "µg/m³",
                    "aqi": aqi,
                    "sector": sector,
                    "status": status,
                }

                send_to_kafka(topic, reading)
        except Exception as e:
            print(f"[WAQI] Unexpected error processing {station_info['name']}: {e}")
            continue

    flush_producer()
    print("[WAQI] Fetch cycle complete")


def run_waqi_fetcher():
    """Run the WAQI fetcher in an infinite loop."""
    print("Starting WAQI Ground Sensor Fetcher...")
    while True:
        fetch_and_produce()
        print(f"[WAQI] Sleeping {FETCH_INTERVAL_SECONDS}s until next fetch...")
        time.sleep(FETCH_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_waqi_fetcher()
