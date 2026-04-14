"""
VayuDrishti - Industrial Emission Sensor Simulator
Generates and streams industrial facility emission data to Kafka.
"""

import json
import random
import time
from datetime import datetime, timezone

from kafka import KafkaProducer

from data_ingestion.config import (
    INDUSTRIAL_CONFIG,
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_TOPICS,
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


def generate_reading(facility):
    """Generate a single emission reading for an industrial facility."""
    emissions = facility["emissions"]

    co2_kgh = round(random.uniform(emissions["co2"]["min"], emissions["co2"]["max"]), 2)
    nox_kgh = round(random.uniform(emissions["nox"]["min"], emissions["nox"]["max"]), 2)
    so2_kgh = round(random.uniform(emissions["so2"]["min"], emissions["so2"]["max"]), 2)
    pm25_kgh = round(random.uniform(emissions["pm25"]["min"], emissions["pm25"]["max"]), 2)

    # CO2 equivalent: CO2 + NOx * 298 (GWP of N2O proxy) + SO2 * 0
    total_co2_equivalent = round(co2_kgh + nox_kgh * 298 + so2_kgh * 0, 2)

    if co2_kgh > 4000:
        status = "CRITICAL"
    elif co2_kgh > 2000:
        status = "WARNING"
    else:
        status = "NORMAL"

    return {
        "facility_id": facility["facility_id"],
        "facility_name": facility["name"],
        "city": facility["city"],
        "latitude": facility["lat"],
        "longitude": facility["lon"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sector": "industrial",
        "co2_kgh": co2_kgh,
        "nox_kgh": nox_kgh,
        "so2_kgh": so2_kgh,
        "pm25_kgh": pm25_kgh,
        "total_co2_equivalent": total_co2_equivalent,
        "status": status,
    }


def run_industrial_simulator():
    """Run the industrial emission simulator in an infinite loop."""
    print("Starting Industrial Emission Simulator...")
    while True:
        for facility in INDUSTRIAL_CONFIG["facilities"]:
            reading = generate_reading(facility)
            producer.send(KAFKA_TOPICS["industrial"], value=reading)
            print(
                f"[Industrial] {reading['facility_name']} | "
                f"CO2: {reading['co2_kgh']} kg/h | Status: {reading['status']}"
            )
        producer.flush()
        time.sleep(INDUSTRIAL_CONFIG["emit_interval_seconds"])


if __name__ == "__main__":
    run_industrial_simulator()
