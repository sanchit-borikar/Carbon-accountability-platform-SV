"""
VayuDrishti - MQTT to Kafka Bridge (Subscriber)
Subscribes to MQTT topics, verifies JWT, and forwards to Kafka.
"""

import json

import paho.mqtt.client as mqtt

from data_ingestion.connectors.kafka_producer import send_to_kafka
from data_ingestion.mqtt.mqtt_broker_config import (
    BROKER_HOST,
    BROKER_PORT,
    MQTT_TOPICS,
    verify_token,
)

KAFKA_TOPIC_MAP = {
    "vayu/industrial/sensors": "emissions.industrial",
    "vayu/transport/sensors": "emissions.transport",
    "vayu/energy/sensors": "emissions.energy",
}


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("[MQTT Subscriber] Connected to broker")
        for topic in MQTT_TOPICS.values():
            client.subscribe(topic)
            print(f"[MQTT Subscriber] Subscribed to {topic}")
    else:
        print(f"[MQTT Subscriber] Connection failed with code {rc}")


def on_message(client, userdata, msg):
    """Process incoming MQTT message: verify JWT and forward to Kafka."""
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return

    device_id = payload.get("device_id", "unknown")
    token = payload.get("jwt_token")

    if token is None or verify_token(token) is None:
        print(f"[MQTT] REJECTED {device_id} | JWT ✗")
        return

    kafka_topic = KAFKA_TOPIC_MAP.get(msg.topic)
    if kafka_topic is None:
        return

    send_to_kafka(kafka_topic, payload)
    print(f"[MQTT->Kafka] {device_id} | JWT OK | -> {kafka_topic}")


def run_subscriber():
    """Run the MQTT subscriber (blocks with loop_forever)."""
    print("Starting MQTT to Kafka Bridge (Subscriber)...")
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    run_subscriber()
