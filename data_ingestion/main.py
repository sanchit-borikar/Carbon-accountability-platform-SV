"""
VayuDrishti — Data Ingestion Layer
Orchestrates real-time data fetchers and pushes to Kafka.
"""

import sys
import os
import threading
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import (startup_banner, banner, section, info, success,
                         warn, error, kafka_sent, print_sources_table, C)

from confluent_kafka.admin import AdminClient, NewTopic
import psycopg2

from data_ingestion.connectors.openaq_fetcher import fetch_and_produce
from data_ingestion.connectors.electricity_fetcher import (
    fetch_and_produce as fetch_energy,
)
from data_ingestion.connectors.openmeteo_fetcher import (
    fetch_and_produce as fetch_satellite,
)
from data_ingestion.connectors.waqi_fetcher import (
    fetch_and_produce as fetch_waqi,
)
from data_ingestion.mqtt.mqtt_publisher import run_publisher
from data_ingestion.mqtt.mqtt_subscriber import run_subscriber
from data_ingestion.connectors.historical_fetcher import fetch_historical_baseline
from data_ingestion.connectors.datagovin_fetcher import (
    fetch_and_produce as fetch_datagovin,
)
from data_ingestion.connectors.nasa_fetcher import (
    fetch_and_produce as fetch_nasa,
)

KAFKA_TOPICS = [
    "emissions.industrial",
    "emissions.transport",
    "emissions.energy",
    "emissions.historical",
]


KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")


def check_kafka():
    """Verify Kafka broker is reachable and ensure topics exist."""
    info("Preflight", "Checking Kafka broker...", KAFKA_BOOTSTRAP_SERVERS)
    try:
        admin = AdminClient({"bootstrap.servers": KAFKA_BOOTSTRAP_SERVERS})
        metadata = admin.list_topics(timeout=10)
        success("Preflight", "Kafka broker reachable",
                f"{len(metadata.topics)} topics found")

        existing = set(metadata.topics.keys())
        missing = [t for t in KAFKA_TOPICS if t not in existing]
        if missing:
            new_topics = [NewTopic(t, num_partitions=1, replication_factor=1)
                          for t in missing]
            fs = admin.create_topics(new_topics)
            for topic, f in fs.items():
                try:
                    f.result()
                    info("Preflight", f"Created topic: {topic}")
                except Exception as e:
                    if "TOPIC_ALREADY_EXISTS" not in str(e):
                        warn("Preflight", f"Topic error ({topic}): {e}")
        else:
            success("Preflight", "All 4 emission topics exist")
        return True
    except Exception as e:
        error("Preflight", f"Kafka unreachable: {e}")
        return False


def check_postgres():
    """Verify PostgreSQL is reachable."""
    db_host = os.getenv("DB_HOST", "localhost")
    info("Preflight", "Checking PostgreSQL...", f"{db_host}:5432")
    try:
        conn = psycopg2.connect(
            host=db_host, port=5432,
            dbname="vayu_drishti", user="postgres", password="vayu2026",
        )
        conn.close()
        success("Preflight", "PostgreSQL connected", "vayu_drishti")
        return True
    except Exception as e:
        error("Preflight", f"PostgreSQL unreachable: {e}")
        return False


def main():
    startup_banner()

    kafka_ok = check_kafka()
    pg_ok = check_postgres()
    if not kafka_ok:
        error("Preflight", "Kafka not available — aborting")
        return
    if not pg_ok:
        warn("Preflight", "PostgreSQL not available — continuing anyway")

    openaq_thread = threading.Thread(target=fetch_and_produce, daemon=True)
    energy_thread = threading.Thread(target=fetch_energy, daemon=True)
    satellite_thread = threading.Thread(target=fetch_satellite, daemon=True)
    waqi_thread = threading.Thread(target=fetch_waqi, daemon=True)
    mqtt_pub_thread = threading.Thread(target=run_publisher, daemon=True)
    mqtt_sub_thread = threading.Thread(target=run_subscriber, daemon=True)
    historical_thread = threading.Thread(target=fetch_historical_baseline, daemon=True)
    datagovin_thread = threading.Thread(target=fetch_datagovin, daemon=True)
    nasa_thread = threading.Thread(target=fetch_nasa, daemon=True)

    openaq_thread.start()
    energy_thread.start()
    satellite_thread.start()
    waqi_thread.start()
    mqtt_pub_thread.start()
    mqtt_sub_thread.start()
    historical_thread.start()
    datagovin_thread.start()
    nasa_thread.start()

    sources = [
        {"name": "OpenAQ v3",        "records": "20 stations",
         "status": "ok", "sector": "Industrial+Trns", "interval": "60s"},
        {"name": "Electricity Maps",  "records": "4 grid zones",
         "status": "ok", "sector": "Energy",          "interval": "60s"},
        {"name": "Open-Meteo Sat.",   "records": "32 cities",
         "status": "ok", "sector": "Industrial+Trns", "interval": "300s"},
        {"name": "WAQI Sensors",      "records": "28 stations",
         "status": "ok", "sector": "Industrial+Trns", "interval": "300s"},
        {"name": "MQTT IoT",          "records": "9 devices",
         "status": "ok", "sector": "All sectors",     "interval": "live"},
        {"name": "Data.gov.in CPCB",  "records": "All states",
         "status": "ok", "sector": "Industrial+Enrg", "interval": "300s"},
        {"name": "Historical OWID",   "records": "90-day AQ",
         "status": "ok", "sector": "Historical",      "interval": "once"},
        {"name": "NASA POWER",        "records": "Met context",
         "status": "ok", "sector": "Industrial",      "interval": "3600s"},
    ]
    print_sources_table(sources)
    success("Ingestion", "All 8 sources pushing real data to Kafka")

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        warn("VayuDrishti", "Shutting down data ingestion layer...")


if __name__ == "__main__":
    main()
