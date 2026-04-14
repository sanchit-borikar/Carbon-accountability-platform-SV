"""
VayuDrishti - PostgreSQL Database Writer
Writes processed emission records to the emission_records table.
"""

import json
import os

import psycopg2
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "vayu_drishti")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "vayu2026")

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS emission_records (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100),
    city VARCHAR(100),
    state VARCHAR(100),
    sector VARCHAR(50),
    primary_pollutant VARCHAR(50),
    primary_value FLOAT,
    unit VARCHAR(20),
    co2_equivalent FLOAT,
    compliance_score INTEGER,
    exceeds_who BOOLEAN,
    exceeds_cpcb BOOLEAN,
    latitude FLOAT,
    longitude FLOAT,
    timestamp TIMESTAMPTZ,
    data_quality VARCHAR(50),
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
"""

INSERT_SQL = """
INSERT INTO emission_records (
    source, city, state, sector, primary_pollutant, primary_value,
    unit, co2_equivalent, compliance_score, exceeds_who, exceeds_cpcb,
    latitude, longitude, timestamp, data_quality, raw_data
) VALUES (
    %(source)s, %(city)s, %(state)s, %(sector)s, %(primary_pollutant)s,
    %(primary_value)s, %(unit)s, %(co2_equivalent)s, %(compliance_score)s,
    %(exceeds_who)s, %(exceeds_cpcb)s, %(latitude)s, %(longitude)s,
    %(timestamp)s, %(data_quality)s, %(raw_data)s
);
"""


def get_connection():
    """Create a new PostgreSQL connection."""
    return psycopg2.connect(
        host=DB_HOST,
        port=DB_PORT,
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASSWORD,
    )


def init_db():
    """Initialize the database and create table if needed."""
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(CREATE_TABLE_SQL)
        conn.commit()
        cur.close()
        conn.close()
        print("[DB] emission_records table ready")
    except Exception as e:
        print(f"[DB] Init warning: {e}")
        print("[DB] Will retry on first write. Continuing without DB...")


def write_record(record):
    """Insert a processed record into the emission_records table."""
    try:
        conn = get_connection()
        cur = conn.cursor()

        params = {
            "source": record.get("source_standard", record.get("source", "")),
            "city": record.get("city", None),
            "state": record.get("state", None),
            "sector": record.get("sector", None),
            "primary_pollutant": record.get("primary_pollutant", None),
            "primary_value": record.get("primary_value", None),
            "unit": record.get("unit_normalized", record.get("unit", None)),
            "co2_equivalent": record.get("co2_equivalent", None),
            "compliance_score": record.get("compliance_score", None),
            "exceeds_who": record.get("exceeds_who", None),
            "exceeds_cpcb": record.get("exceeds_cpcb", None),
            "latitude": record.get("latitude", None),
            "longitude": record.get("longitude", None),
            "timestamp": record.get("timestamp", None),
            "data_quality": record.get("data_quality", None),
            "raw_data": json.dumps(record, default=str),
        }

        cur.execute(INSERT_SQL, params)
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"[DB Error] {e}")
