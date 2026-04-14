"""
VayuDrishti - MQTT IoT Sensor Publisher
Publishes simulated IoT sensor readings to MQTT broker with JWT auth.
"""

import json
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt

from data_ingestion.mqtt.mqtt_broker_config import (
    BROKER_HOST,
    BROKER_PORT,
    MQTT_TOPICS,
    generate_token,
)

IOT_DEVICES = [
    {"device_id": "IND-DELHI-001",    "sector": "industrial", "city": "Delhi",     "lat": 28.6469, "lon": 77.3152},
    {"device_id": "IND-MUMBAI-001",   "sector": "industrial", "city": "Mumbai",    "lat": 19.0760, "lon": 72.8777},
    {"device_id": "IND-CHENNAI-001",  "sector": "industrial", "city": "Chennai",   "lat": 13.0827, "lon": 80.2707},
    {"device_id": "TRN-DELHI-001",    "sector": "transport",  "city": "Delhi",     "lat": 28.7041, "lon": 77.1025},
    {"device_id": "TRN-MUMBAI-001",   "sector": "transport",  "city": "Mumbai",    "lat": 19.1000, "lon": 72.8500},
    {"device_id": "TRN-BENGALURU-001","sector": "transport",  "city": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
    {"device_id": "ENE-WEST-001",     "sector": "energy",     "city": "Mumbai",    "lat": 19.0760, "lon": 72.8777},
    {"device_id": "ENE-NORTH-001",    "sector": "energy",     "city": "Delhi",     "lat": 28.6139, "lon": 77.2090},
    {"device_id": "ENE-SOUTH-001",    "sector": "energy",     "city": "Chennai",   "lat": 13.0827, "lon": 80.2707},
]

PUBLISH_INTERVAL_SECONDS = 30


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT] Connected to broker | device authenticated")
    else:
        print(f"[MQTT] Connection failed with code {rc}")


def generate_reading(device):
    """Generate a simulated IoT sensor reading with JWT token."""
    pm25 = round(random.uniform(10, 150), 2)
    co2 = round(random.uniform(200, 5000), 2)
    no2 = round(random.uniform(5, 100), 2)
    so2 = round(random.uniform(1, 80), 2)

    if pm25 > 55:
        status = "CRITICAL"
    elif pm25 > 35:
        status = "WARNING"
    else:
        status = "NORMAL"

    return {
        "device_id": device["device_id"],
        "sector": device["sector"],
        "city": device["city"],
        "latitude": device["lat"],
        "longitude": device["lon"],
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "jwt_token": generate_token(device["device_id"], device["sector"]),
        "pm25": pm25,
        "co2": co2,
        "no2": no2,
        "so2": so2,
        "status": status,
    }


def publish_all(client):
    """Publish readings for all IoT devices to MQTT."""
    for device in IOT_DEVICES:
        reading = generate_reading(device)
        topic = MQTT_TOPICS[device["sector"]]
        payload = json.dumps(reading)
        client.publish(topic, payload)
        print(f"[MQTT Publisher] {device['device_id']} -> {topic} | pm25: {reading['pm25']}")


def run_publisher():
    """Run the MQTT publisher in an infinite loop."""
    print("Starting MQTT IoT Sensor Publisher...")
    client = mqtt.Client()
    client.on_connect = on_connect
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_start()

    while True:
        publish_all(client)
        time.sleep(PUBLISH_INTERVAL_SECONDS)


if __name__ == "__main__":
    run_publisher()
