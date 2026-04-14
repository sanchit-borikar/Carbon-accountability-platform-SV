import sys
import os
import json
import pandas as pd
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import (banner, section, section_end, info, success,
                         warn, ml_result, training_summary, C)

from ml.data_fetcher import fetch_training_data, get_cities, get_pollutants, prepare_features
from ml.lstm_model import train_lstm
from ml.xgboost_model import train_xgboost
from ml.anomaly_detector import train_isolation_forest
from ml.prophet_model import train_prophet
from ml.ensemble import get_all_ensemble_forecasts
from ml.config import FORECASTS_DIR


def run_full_training():
    print("╔══════════════════════════════════════╗")
    print("║   VayuDrishti ML Training Started    ║")
    print("╚══════════════════════════════════════╝")

    # ── STEP 1: Fetch data ───────────────────────────────────
    df = fetch_training_data(days_back=90)
    if len(df) < 50:
        print("[ML] Not enough data yet. Need 50+ records.")
        print("[ML] Run data ingestion for a few minutes first.")
        return None

    df = prepare_features(df)
    print(f"[ML] Training on {len(df)} records")

    # ── STEP 2: XGBoost (fastest) ────────────────────────────
    print("\n── XGBoost ────────────────────────────")
    xgb_results = train_xgboost(df)
    if xgb_results:
        print(f"[ML] XGBoost accuracy: {xgb_results['accuracy']:.1f}%")

    # ── STEP 3: Isolation Forest ─────────────────────────────
    print("\n── Isolation Forest ───────────────────")
    iso_results = train_isolation_forest(df)

    # ── STEP 4: LSTM + Prophet per city/pollutant ────────────
    section("LSTM & Prophet Forecasters")
    pollutants = get_pollutants()
    info("DataFetcher", "Available pollutants", str(pollutants))
    cities = get_cities()
    info("DataFetcher", "Available cities", str(len(cities)))

    # Fetch raw data separately for time-series models
    raw_df = fetch_training_data(days_back=90)
    raw_df["timestamp"] = pd.to_datetime(raw_df["timestamp"]).dt.tz_localize(None)

    # City selection by data volume
    city_volumes = (
        raw_df.groupby("city")["primary_value"]
        .count()
        .sort_values(ascending=False)
    )
    top_cities = city_volumes.head(10).index.tolist()
    lstm_cities = city_volumes[city_volumes >= 200].index.tolist()
    prophet_cities = city_volumes[city_volumes >= 100].index.tolist()
    info("Trainer", f"Top cities by volume", str(top_cities[:5]))
    info("Trainer",
         f"LSTM-eligible: {len(lstm_cities)}, "
         f"Prophet-eligible: {len(prophet_cities)}")

    lstm_results = []
    prophet_results = []

    for pollutant in ["pm2_5"]:
        pollutant_df = raw_df[
            raw_df["primary_pollutant"] == pollutant
        ].copy().sort_values("timestamp").reset_index(drop=True)

        info("ML", f"{pollutant}: {len(pollutant_df)} records")

        # ALL INDIA combined
        if len(pollutant_df) >= 48:
            result = train_lstm("ALL_INDIA", pollutant, pollutant_df)
            if result:
                lstm_results.append(result)

        if len(pollutant_df) >= 168:
            result = train_prophet("ALL_INDIA", pollutant, pollutant_df)
            if result:
                prophet_results.append(result)

        # Top 3 cities only
        for city in lstm_cities[:3]:
            city_df = pollutant_df[
                pollutant_df["city"] == city
            ].copy().reset_index(drop=True)

            if len(city_df) >= 48:
                result = train_lstm(city, pollutant, city_df)
                if result:
                    lstm_results.append(result)

            if len(city_df) >= 168:
                result = train_prophet(city, pollutant, city_df)
                if result:
                    prophet_results.append(result)

    section_end()

    # ── STEP 5: Ensemble forecasts ───────────────────
    section("Ensemble Forecasts")
    ensemble = get_all_ensemble_forecasts()
    section_end()

    # ── STEP 6: Master summary ───────────────────────────────
    avg_lstm_acc = (
        sum(r["accuracy"] for r in lstm_results) / len(lstm_results)
        if lstm_results
        else 0.0
    )

    high_risk_cities = [
        e["city"]
        for e in ensemble
        if e.get("risk_assessment", {}).get("30_day_risk") == "HIGH"
    ]

    summary = {
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "total_records": len(df),
        "xgboost_accuracy": xgb_results["accuracy"] if xgb_results else 0,
        "lstm_models_trained": len(lstm_results),
        "prophet_models_trained": len(prophet_results),
        "anomalies_detected": iso_results["anomalies_found"] if iso_results else 0,
        "cities_covered": len(cities),
        "ensemble_forecasts": len(ensemble),
        "average_lstm_accuracy": round(avg_lstm_acc, 2),
        "high_risk_cities": high_risk_cities,
    }

    summary_path = os.path.join(FORECASTS_DIR, "training_summary.json")
    with open(summary_path, "w") as f:
        json.dump(summary, f, indent=2)

    training_summary(
        summary["xgboost_accuracy"],
        summary["lstm_models_trained"],
        summary["prophet_models_trained"],
        summary["anomalies_detected"],
        high_risk_cities,
    )

    return summary


if __name__ == "__main__":
    run_full_training()
