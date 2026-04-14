import sys
import os
import json
import numpy as np
import pandas as pd
import joblib
from datetime import datetime, timezone
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import anomaly as log_anomaly
from vayu_logger import success, info, C

from ml.config import MODELS_DIR, FORECASTS_DIR, ISOLATION_FOREST_PARAMS
from ml.data_fetcher import prepare_features

ANOMALY_FEATURES = [
    "primary_value", "co2_equivalent", "compliance_score",
    "rolling_mean_24h", "rolling_std_24h",
]


def _detect_with_lof(X):
    """Run Local Outlier Factor anomaly detection."""
    lof = LocalOutlierFactor(
        n_neighbors=20,
        contamination=0.05,
        metric="euclidean",
        n_jobs=-1,
    )
    return lof.fit_predict(X)


def train_isolation_forest(df):
    """Train Isolation Forest for anomaly detection on emission data."""
    df = prepare_features(df).copy()
    available = [c for c in ANOMALY_FEATURES if c in df.columns]
    X = df[available].dropna()

    if len(X) < 20:
        from vayu_logger import warn
        warn("IsoForest", "Not enough data to train")
        return None

    model = IsolationForest(**ISOLATION_FOREST_PARAMS)
    model.fit(X)

    iso_preds = model.predict(X)
    anomaly_scores = model.decision_function(X)

    # Ensemble: flag as anomaly only if BOTH IsoForest and LOF agree
    lof_preds = _detect_with_lof(X.values)
    ensemble_preds = np.where(
        (iso_preds == -1) & (lof_preds == -1), -1, 1)

    anomaly_count = int((ensemble_preds == -1).sum())
    anomaly_rate = anomaly_count / len(ensemble_preds)

    # Save model
    joblib.dump(model, os.path.join(MODELS_DIR, "isolation_forest.pkl"))
    joblib.dump(available, os.path.join(MODELS_DIR, "isolation_forest_features.pkl"))

    # Top anomalous cities
    df_scored = df.loc[X.index].copy()
    df_scored["anomaly"] = ensemble_preds
    df_scored["anomaly_score"] = anomaly_scores

    anomalous = (
        df_scored[df_scored["anomaly"] == -1]
        .groupby("city")
        .agg({
            "primary_value": "mean",
            "anomaly_score": "mean",
            "primary_pollutant": "first",
        })
        .sort_values("anomaly_score")
        .head(10)
    )

    results = {
        "model": "Isolation Forest",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "total_records": len(df),
        "anomalies_found": anomaly_count,
        "anomaly_rate_pct": round(anomaly_rate * 100, 2),
        "top_anomalous_cities": json.loads(anomalous.to_json()),
    }

    results_path = os.path.join(FORECASTS_DIR, "anomaly_results.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)

    success("AnomalyDetector",
            f"Ensemble (IsoForest + LOF): "
            f"{anomaly_count} confirmed anomalies",
            f"{anomaly_count / len(X) * 100:.1f}% of records")
    return results


def detect_realtime_anomaly(reading: dict) -> dict:
    """Score a single reading for anomalous behaviour."""
    model = joblib.load(os.path.join(MODELS_DIR, "isolation_forest.pkl"))
    feature_cols = joblib.load(os.path.join(MODELS_DIR, "isolation_forest_features.pkl"))

    features = [reading.get(col, 0) for col in feature_cols]
    prediction = model.predict([features])[0]
    score = model.decision_function([features])[0]

    if score < -0.2:
        severity = "HIGH"
    elif score < 0:
        severity = "MEDIUM"
    else:
        severity = "NORMAL"

    return {
        "is_anomaly": bool(prediction == -1),
        "anomaly_score": round(float(score), 4),
        "severity": severity,
        "city": reading.get("city"),
        "pollutant": reading.get("primary_pollutant"),
        "value": reading.get("primary_value"),
    }
