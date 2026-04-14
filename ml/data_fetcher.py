import sys
import os
import pandas as pd
import numpy as np
from dotenv import load_dotenv
from sqlalchemy import create_engine

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import info, success, warn, C

load_dotenv()

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 5432)),
    "dbname": os.getenv("DB_NAME", "vayu_drishti"),
    "user": os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", "vayu2026"),
}


def get_engine():
    url = (f"postgresql://{DB_CONFIG['user']}:"
           f"{DB_CONFIG['password']}@"
           f"{DB_CONFIG['host']}:"
           f"{DB_CONFIG['port']}/"
           f"{DB_CONFIG['dbname']}")
    return create_engine(url)


def fetch_training_data(city=None, pollutant=None, days_back=90):
    """Fetch emission records from PostgreSQL for ML training."""
    conditions = [
        f"timestamp >= NOW() - INTERVAL '{int(days_back)} days'",
        "primary_value > 0",
        "primary_pollutant NOT IN ('unknown', 'value')",
    ]

    if city:
        conditions.append("LOWER(city) = LOWER(%s)")
    if pollutant:
        conditions.append("primary_pollutant = %s")

    where_clause = " AND ".join(conditions)

    query = f"""
        SELECT city, state, sector, primary_pollutant,
               primary_value, co2_equivalent, compliance_score,
               latitude, longitude, timestamp, source
        FROM emission_records
        WHERE {where_clause}
        ORDER BY timestamp ASC
    """

    params = []
    if city:
        params.append(city)
    if pollutant:
        params.append(pollutant)

    df = pd.read_sql_query(query, get_engine(), params=params or None)

    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)
    success("DataFetcher", "Records loaded from PostgreSQL", f"{len(df):,}")
    return df


def get_cities():
    """Return sorted list of distinct cities."""
    query = """
        SELECT DISTINCT city FROM emission_records
        WHERE city IS NOT NULL AND city != ''
        ORDER BY city
    """
    df = pd.read_sql_query(query, get_engine())
    return sorted(df["city"].tolist())


def get_pollutants(city=None):
    """Return list of pollutants ordered by record count (most data first)."""
    query = """
        SELECT primary_pollutant, COUNT(*) as cnt
        FROM emission_records
        WHERE primary_pollutant NOT IN ('unknown', 'value', 'aqi', '')
        AND primary_value > 0
        GROUP BY primary_pollutant
        ORDER BY cnt DESC
    """
    df = pd.read_sql_query(query, get_engine())
    return df["primary_pollutant"].tolist()


def prepare_features(df):
    """Add temporal, rolling, and regulatory features to the DataFrame."""
    df = df.copy()

    # Normalize timestamp
    df["timestamp"] = pd.to_datetime(df["timestamp"]).dt.tz_localize(None)

    # Time features
    df["hour"] = df["timestamp"].dt.hour
    df["day_of_week"] = df["timestamp"].dt.dayofweek
    df["month"] = df["timestamp"].dt.month
    df["is_weekend"] = df["day_of_week"].isin([5, 6]).astype(int)
    df["is_morning_peak"] = df["hour"].isin(range(7, 10)).astype(int)
    df["is_evening_peak"] = df["hour"].isin(range(17, 21)).astype(int)

    # Rolling features (grouped by city + pollutant)
    group = df.groupby(["city", "primary_pollutant"])["primary_value"]
    df["rolling_mean_24h"] = group.transform(
        lambda x: x.rolling(24, min_periods=1).mean()
    )
    df["rolling_std_24h"] = group.transform(
        lambda x: x.rolling(24, min_periods=1).std().fillna(0)
    )
    df["rolling_max_24h"] = group.transform(
        lambda x: x.rolling(24, min_periods=1).max()
    )

    # WHO exceedance ratio
    WHO = {"pm2_5": 15, "pm25": 15, "no2": 10, "so2": 40, "co": 4000, "co2": 1800}
    df["who_ratio"] = df.apply(
        lambda r: r["primary_value"] / WHO.get(r["primary_pollutant"], 100), axis=1
    )

    # CPCB exceedance ratio
    CPCB = {"pm2_5": 60, "pm25": 60, "no2": 80, "so2": 80, "co": 2000, "co2": 5000}
    df["cpcb_ratio"] = df.apply(
        lambda r: r["primary_value"] / CPCB.get(r["primary_pollutant"], 100), axis=1
    )

    # Value change rate
    df["value_change"] = df.groupby(
        ["city", "primary_pollutant"]
    )["primary_value"].diff().fillna(0)

    # Cumulative daily exposure
    df["daily_cumsum"] = df.groupby(
        ["city", "primary_pollutant", df["timestamp"].dt.date]
    )["primary_value"].cumsum()

    return df
