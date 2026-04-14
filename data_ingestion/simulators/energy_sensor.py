"""
VayuDrishti - Energy Grid Emission Sensor Simulator
Generates and streams energy grid emission data to Kafka.
"""

import json
import random
import time
from datetime import datetime, timezone

from kafka import KafkaProducer

from data_ingestion.config import (
    ENERGY_CONFIG,
    KAFKA_BOOTSTRAP_SERVERS,
    KAFKA_TOPICS,
)

producer = KafkaProducer(
    bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
    value_serializer=lambda v: json.dumps(v).encode("utf-8"),
)


def generate_reading(grid):
    """Generate a single emission reading for an energy grid."""
    generation_range = grid["generation_range"]
    generation_mwh = round(
        random.uniform(generation_range["min"], generation_range["max"]), 2
    )

    emission_intensity = ENERGY_CONFIG["emission_intensity"][grid["source"]]
    co2_kg = round(generation_mwh * emission_intensity, 2)

    if co2_kg > 400000:
        status = "CRITICAL"
    elif co2_kg > 200000:
        status = "WARNING"
    else:
        status = "NORMAL"

    return {
        "grid_id": grid["grid_id"],
        "grid_name": grid["name"],
        "city": grid["city"],
        "energy_source": grid["source"],
        "latitude": grid["lat"],
        "longitude": grid["lon"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "sector": "energy",
        "generation_mwh": generation_mwh,
        "emission_intensity": emission_intensity,
        "co2_kg": co2_kg,
        "status": status,
    }


def run_energy_simulator():
    """Run the energy grid emission simulator in an infinite loop."""
    print("Starting Energy Grid Emission Simulator...")
    while True:
        for grid in ENERGY_CONFIG["grids"]:
            reading = generate_reading(grid)
            producer.send(KAFKA_TOPICS["energy"], value=reading)
            print(
                f"[Energy] {reading['grid_name']} | "
                f"CO2: {reading['co2_kg']} kg | Status: {reading['status']}"
            )
        producer.flush()
        time.sleep(ENERGY_CONFIG["emit_interval_seconds"])


if __name__ == "__main__":
    run_energy_simulator()
