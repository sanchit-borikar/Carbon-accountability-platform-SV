"""
VayuDrishti - Historical Emissions Baseline Fetcher
Loads historical CO2 data from Our World in Data and
past 90 days hourly air quality from Open-Meteo.
Runs once on startup then sleeps.
"""

import csv
import io
import time

import requests

from data_ingestion.connectors.kafka_producer import send_to_kafka, flush_producer

KAFKA_TOPIC = "emissions.historical"

OWID_CSV_URL = "https://raw.githubusercontent.com/owid/co2-data/master/owid-co2-data.csv"

OWID_COLUMNS = [
    "year", "co2", "co2_per_capita", "methane", "nitrous_oxide",
    "coal_co2", "oil_co2", "gas_co2", "cement_co2", "trade_co2",
]

OPEN_METEO_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"

CITIES = [
    {"name": "Delhi",     "lat": 28.6,  "lon": 77.2},
    {"name": "Mumbai",    "lat": 19.07, "lon": 72.87},
    {"name": "Chennai",   "lat": 13.08, "lon": 80.27},
    {"name": "Kolkata",   "lat": 22.57, "lon": 88.36},
    {"name": "Bengaluru", "lat": 12.97, "lon": 77.59},
]


def _safe_float(val):
    """Convert a value to float, return None if empty or invalid."""
    if val is None or val == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _fetch_owid():
    """Download OWID CO2 CSV and send India rows to Kafka."""
    print(f"[OWID] Downloading historical CO2 data from {OWID_CSV_URL}...")
    try:
        response = requests.get(OWID_CSV_URL, timeout=120)
        response.raise_for_status()
    except requests.RequestException as e:
        print(f"[OWID] Error downloading CSV: {e}")
        return

    reader = csv.DictReader(io.StringIO(response.text))
    count = 0
    for row in reader:
        if row.get("country") != "India":
            continue

        year = row.get("year", "")
        co2 = _safe_float(row.get("co2"))

        reading = {
            "source": "owid-historical",
            "country": "India",
            "year": year,
            "co2_million_tonnes": co2,
            "co2_per_capita": _safe_float(row.get("co2_per_capita")),
            "coal_co2": _safe_float(row.get("coal_co2")),
            "oil_co2": _safe_float(row.get("oil_co2")),
            "gas_co2": _safe_float(row.get("gas_co2")),
            "sector": "historical_baseline",
            "timestamp": f"{year}-01-01T00:00:00Z",
        }

        send_to_kafka(KAFKA_TOPIC, reading)
        count += 1

    flush_producer()
    print(f"[OWID] Done -- {count} India yearly records loaded")


def _fetch_open_meteo_historical():
    """Fetch past 90 days hourly AQ data for Indian cities."""
    print(f"[HistoricalAQ] Fetching 90-day hourly air quality for {len(CITIES)} cities...")

    for city in CITIES:
        params = {
            "latitude": city["lat"],
            "longitude": city["lon"],
            "hourly": "pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide",
            "past_days": 90,
        }

        try:
            response = requests.get(OPEN_METEO_URL, params=params, timeout=60)
            response.raise_for_status()
        except requests.RequestException as e:
            print(f"[HistoricalAQ] Error fetching {city['name']}: {e}")
            continue

        data = response.json()
        hourly = data.get("hourly", {})
        times = hourly.get("time", [])
        pm2_5 = hourly.get("pm2_5", [])
        carbon_monoxide = hourly.get("carbon_monoxide", [])
        nitrogen_dioxide = hourly.get("nitrogen_dioxide", [])
        sulphur_dioxide = hourly.get("sulphur_dioxide", [])

        count = 0
        for i in range(len(times)):
            reading = {
                "source": "open-meteo-historical",
                "city": city["name"],
                "latitude": city["lat"],
                "longitude": city["lon"],
                "timestamp": times[i],
                "pm2_5": pm2_5[i] if i < len(pm2_5) else None,
                "carbon_monoxide": carbon_monoxide[i] if i < len(carbon_monoxide) else None,
                "nitrogen_dioxide": nitrogen_dioxide[i] if i < len(nitrogen_dioxide) else None,
                "sulphur_dioxide": sulphur_dioxide[i] if i < len(sulphur_dioxide) else None,
                "sector": "historical_baseline",
            }

            send_to_kafka(KAFKA_TOPIC, reading)
            count += 1

        flush_producer()
        print(f"[HistoricalAQ] {city['name']} -- {count} hourly records loaded")


def fetch_historical_baseline():
    """Load all historical baseline data once on startup."""
    print("Starting Historical Baseline Data Loader...")

    _fetch_owid()
    _fetch_open_meteo_historical()

    print("[Historical] Baseline data loaded -- OWID + 90-day AQ history ready")

    # Historical data doesn't change -- sleep indefinitely
    while True:
        time.sleep(3600)


if __name__ == "__main__":
    fetch_historical_baseline()
