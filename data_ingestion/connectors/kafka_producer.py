"""
VayuDrishti - Shared Kafka Producer (confluent-kafka)
Provides send_to_kafka() and flush_producer() for all data fetchers.
"""

import sys
import os
import json
from datetime import datetime, timezone

from confluent_kafka import Producer, KafkaException

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from vayu_logger import info, success, warn, error, kafka_sent, C

KAFKA_BOOTSTRAP_SERVERS = "localhost:9092"

_producer = None


def _delivery_report(err, msg):
    """Called once per produced message to indicate delivery result."""
    if err is not None:
        warn("Kafka", f"Delivery failed for {msg.topic()}: {err}")


def _get_producer():
    """Return a singleton confluent-kafka Producer."""
    global _producer
    if _producer is not None:
        return _producer
    conf = {
        "bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS,
        "client.id": "vayu-producer",
        "acks": "all",
        "retries": 5,
        "retry.backoff.ms": 500,
        "linger.ms": 50,
        "batch.num.messages": 500,
    }
    _producer = Producer(conf)
    success("Kafka", "Producer connected", KAFKA_BOOTSTRAP_SERVERS)
    return _producer


def send_to_kafka(topic, message):
    """Serialize message to JSON and produce to a Kafka topic."""
    producer = _get_producer()
    try:
        payload = json.dumps(message).encode("utf-8")
        producer.produce(topic, value=payload, callback=_delivery_report)
        producer.poll(0)
    except BufferError:
        warn("Kafka", f"Queue full, flushing before retry for {topic}")
        producer.flush(timeout=10)
        producer.produce(topic, value=payload, callback=_delivery_report)
    except KafkaException as e:
        error("Kafka", f"Failed to produce to {topic}: {e}")


def flush_producer():
    """Flush all buffered messages to Kafka."""
    if _producer is not None:
        remaining = _producer.flush(timeout=30)
        if remaining > 0:
            warn("Kafka", f"{remaining} messages still in queue after flush")
