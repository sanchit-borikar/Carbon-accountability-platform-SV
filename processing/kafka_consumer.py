"""
VayuDrishti - Kafka Consumer & Stream Processing Pipeline (confluent-kafka)
Consumes from all emission Kafka topics, runs the full processing chain,
and writes enriched records to PostgreSQL.
"""

import sys
import os
import json
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import (banner, info, success, warn, error,
                         processed, anomaly, C)

from confluent_kafka import Consumer, KafkaError, KafkaException
from confluent_kafka.admin import AdminClient, NewTopic

from processing.data_cleaner import clean_record
from processing.unit_normalizer import normalize_record
from processing.co2_converter import enrich_record
from processing.deduplicator import is_duplicate
from processing.db_writer import init_db, write_record

TOPICS = [
    "emissions.industrial",
    "emissions.transport",
    "emissions.energy",
    "emissions.historical",
]


def _ensure_topics():
    """Create Kafka topics if they don't exist yet."""
    try:
        admin = AdminClient({"bootstrap.servers": "localhost:9092"})
        metadata = admin.list_topics(timeout=10)
        existing = set(metadata.topics.keys())
        missing = [t for t in TOPICS if t not in existing]
        if missing:
            new_topics = [NewTopic(t, num_partitions=1, replication_factor=1) for t in missing]
            fs = admin.create_topics(new_topics)
            for topic, f in fs.items():
                try:
                    f.result()
                    info("Kafka", f"Created topic: {topic}")
                except Exception as e:
                    if "TOPIC_ALREADY_EXISTS" not in str(e):
                        warn("Kafka", f"Topic create error ({topic}): {e}")
    except Exception as e:
        warn("Kafka", f"Could not ensure topics: {e}")


def process_record(raw_record):
    """Run the full processing pipeline on a single record."""
    cleaned = clean_record(raw_record)
    if cleaned is None:
        return None

    normalized = normalize_record(cleaned)
    enriched = enrich_record(normalized)

    if is_duplicate(enriched):
        return None

    write_record(enriched)
    return enriched


def run_consumer():
    """Main consumer loop -- connects to Kafka and processes all emission records."""
    init_db()

    banner("VayuDrishti Stream Processor",
           "Clean \u00b7 Normalize \u00b7 Score \u00b7 Store")
    info("Kafka", "Connecting to broker...", "localhost:9092")

    _ensure_topics()
    time.sleep(2)

    conf = {
        "bootstrap.servers": "localhost:9092",
        "group.id": "vayu_processing_group",
        "auto.offset.reset": "latest",
        "enable.auto.commit": True,
        "session.timeout.ms": 30000,
        "heartbeat.interval.ms": 10000,
        "fetch.wait.max.ms": 500,
    }

    while True:
        try:
            consumer = Consumer(conf)
            consumer.subscribe(TOPICS)
            success("Kafka", "Consumer connected",
                    f"{len(TOPICS)} topics \u00b7 group: vayu_processing_group")

            processed_count = 0
            skipped = 0

            while True:
                msg = consumer.poll(timeout=1.0)
                if msg is None:
                    continue
                if msg.error():
                    if msg.error().code() == KafkaError._PARTITION_EOF:
                        continue
                    error("Kafka", f"Consumer error: {msg.error()}")
                    break

                try:
                    raw_record = json.loads(msg.value().decode("utf-8"))
                    result = process_record(raw_record)
                    if result:
                        processed_count += 1
                        city = result.get("city", "unknown")
                        pollutant = result.get("primary_pollutant", "unknown")
                        co2e = result.get("co2_equivalent", 0)
                        score = result.get("compliance_score", 0)
                        source = result.get("source", "unknown")
                        processed(city, pollutant, co2e, int(score), source)
                    else:
                        skipped += 1
                except Exception as e:
                    warn("Consumer", str(e))
                    continue

        except KeyboardInterrupt:
            success("Consumer", f"Shutdown. Processed: {processed_count}, Skipped: {skipped}")
            consumer.close()
            break
        except Exception as e:
            error("Kafka", f"Reconnecting in 5s: {e}")
            try:
                consumer.close()
            except Exception:
                pass
            time.sleep(5)
            continue


if __name__ == "__main__":
    run_consumer()
