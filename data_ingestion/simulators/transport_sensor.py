"""
VayuDrishti - Transport Emission Sensor Simulator
Generates and streams transport fleet emission data to Kafka.
"""

import json
import random
import time
from datetime import datetime, timezone

from kafka import KafkaProducer

from data_ingestion.config import (
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_TOPICS,
    TRANSPORT_CONFIG,
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


def generate_reading(fleet):
    """Generate a single emission reading for a transport fleet."""
    # Small random offset to simulate vehicle movement
    latitude = fleet["lat"] + random.uniform(-0.05, 0.05)
    longitude = fleet["lon"] + random.uniform(-0.05, 0.05)

    distance_range = fleet["distance_range"]
    distance_km = round(random.uniform(distance_range["min"], distance_range["max"]), 2)

    emission_factor = TRANSPORT_CONFIG["emission_factors"][fleet["vehicle_type"]]
    co2_kg = round(distance_km * emission_factor, 2)

    if co2_kg > 80:
        status = "CRITICAL"
    elif co2_kg > 40:
        status = "WARNING"
    else:
        status = "NORMAL"

    return {
        "fleet_id": fleet["fleet_id"],
        "fleet_name": fleet["name"],
        "city": fleet["city"],
        "vehicle_type": fleet["vehicle_type"],
        "latitude": round(latitude, 6),
        "longitude": round(longitude, 6),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sector": "transport",
        "distance_km": distance_km,
        "emission_factor": emission_factor,
        "co2_kg": co2_kg,
        "status": status,
    }


def run_transport_simulator():
    """Run the transport emission simulator in an infinite loop."""
    print("Starting Transport Emission Simulator...")
    while True:
        for fleet in TRANSPORT_CONFIG["fleets"]:
            reading = generate_reading(fleet)
            producer.send(KAFKA_TOPICS["transport"], value=reading)
            print(
                f"[Transport] {reading['fleet_name']} | "
                f"CO2: {reading['co2_kg']} kg | Status: {reading['status']}"
            )
        producer.flush()
        time.sleep(TRANSPORT_CONFIG["emit_interval_seconds"])


if __name__ == "__main__":
    run_transport_simulator()
