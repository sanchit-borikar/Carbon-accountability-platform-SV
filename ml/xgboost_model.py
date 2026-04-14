import sys
import os
import json
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from datetime import datetime, timezone
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_percentage_error
from sklearn.preprocessing import LabelEncoder

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import ml_result, info, success, C

from ml.config import MODELS_DIR, FORECASTS_DIR, SCALERS_DIR, XGBOOST_PARAMS
from ml.data_fetcher import prepare_features


FEATURE_COLS = [
    "primary_value", "hour", "day_of_week", "month",
    "is_weekend", "is_morning_peak", "is_evening_peak",
    "rolling_mean_24h", "rolling_std_24h", "rolling_max_24h",
    "latitude", "longitude", "sector_enc", "pollutant_enc",
    "sin_hour", "cos_hour", "sin_dow", "cos_dow",
    "lag_1h", "lag_6h", "lag_24h",
    "value_x_hour", "value_x_weekend",
    "who_ratio", "cpcb_ratio", "value_change", "daily_cumsum",
]


def _add_xgb_features(df):
    """Add engineered features specific to XGBoost training."""
    df = df.copy()

    # Cyclic time features
    df["sin_hour"] = np.sin(2 * np.pi * df["hour"] / 24)
    df["cos_hour"] = np.cos(2 * np.pi * df["hour"] / 24)
    df["sin_dow"] = np.sin(2 * np.pi * df["day_of_week"] / 7)
    df["cos_dow"] = np.cos(2 * np.pi * df["day_of_week"] / 7)

    # Lag features
    grp = df.groupby(["city", "primary_pollutant"])["primary_value"]
    df["lag_1h"] = grp.shift(1)
    df["lag_6h"] = grp.shift(6)
    df["lag_24h"] = grp.shift(24)
    for col in ("lag_1h", "lag_6h", "lag_24h"):
        df[col] = df[col].bfill()

    # Interaction features
    df["value_x_hour"] = df["primary_value"] * df["sin_hour"]
    df["value_x_weekend"] = df["primary_value"] * df["is_weekend"]

    return df


def train_xgboost(df):
    """Train XGBoost to estimate CO2 equivalent from raw pollutant readings."""
    df = prepare_features(df).copy()
    df = _add_xgb_features(df)
    df = df[df["co2_equivalent"] > 0].dropna(
        subset=["primary_value", "co2_equivalent"]
    )

    if len(df) < 20:
        from vayu_logger import warn
        warn("XGBoost", "Not enough data to train")
        return None

    # Encode categoricals
    le_sector = LabelEncoder()
    le_pollutant = LabelEncoder()
    df["sector_enc"] = le_sector.fit_transform(df["sector"].astype(str))
    df["pollutant_enc"] = le_pollutant.fit_transform(df["primary_pollutant"].astype(str))

    available_cols = [c for c in FEATURE_COLS if c in df.columns]
    X = df[available_cols].fillna(0)
    y = df["co2_equivalent"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    # 5-fold cross-validation
    cv_scores = cross_val_score(
        xgb.XGBRegressor(**XGBOOST_PARAMS),
        X_train, y_train,
        cv=5,
        scoring="neg_mean_absolute_percentage_error",
        n_jobs=-1,
    )
    cv_accuracy = 100 - abs(cv_scores.mean() * 100)
    info("XGBoost", "5-fold CV accuracy", f"{cv_accuracy:.1f}%")

    model = xgb.XGBRegressor(**XGBOOST_PARAMS)
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    predictions = model.predict(X_test)
    mape = mean_absolute_percentage_error(y_test, predictions)
    accuracy = max(0.0, 100.0 - mape * 100)

    # Feature importance
    importance = dict(zip(available_cols, model.feature_importances_))
    top_features = sorted(importance.items(), key=lambda x: x[1], reverse=True)[:5]

    # High-emission cities
    city_co2 = df.groupby("city")["co2_equivalent"].mean().sort_values(ascending=False)
    high_emission_cities = city_co2.head(5).to_dict()

    # Save artefacts
    joblib.dump(model, os.path.join(MODELS_DIR, "xgboost_co2e_estimator.pkl"))
    joblib.dump(le_sector, os.path.join(SCALERS_DIR, "xgboost_le_sector.pkl"))
    joblib.dump(le_pollutant, os.path.join(SCALERS_DIR, "xgboost_le_pollutant.pkl"))
    joblib.dump(available_cols, os.path.join(SCALERS_DIR, "xgboost_feature_cols.pkl"))

    results = {
        "model": "XGBoost",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "accuracy": round(accuracy, 2),
        "mape": round(mape * 100, 2),
        "training_samples": len(X_train),
        "top_features": [[f, round(float(v), 4)] for f, v in top_features],
        "co2e_stats": {
            "mean": round(float(df["co2_equivalent"].mean()), 4),
            "max": round(float(df["co2_equivalent"].max()), 4),
            "high_emission_cities": {k: round(float(v), 4) for k, v in high_emission_cities.items()},
        },
    }

    results_path = os.path.join(FORECASTS_DIR, "xgboost_results.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)

    top_name = top_features[0][0] if top_features else "N/A"
    ml_result("XGBoost", "ALL_INDIA", "co2_equivalent",
              accuracy, mape * 100, len(X_train))
    info("XGBoost", "Top feature", top_name)
    return results


def predict_co2e(pollutant_readings: dict) -> float:
    """Predict CO2 equivalent from a dict of pollutant readings."""
    model = joblib.load(os.path.join(MODELS_DIR, "xgboost_co2e_estimator.pkl"))
    feature_cols = joblib.load(os.path.join(SCALERS_DIR, "xgboost_feature_cols.pkl"))

    features = {col: pollutant_readings.get(col, 0) for col in feature_cols}
    X = pd.DataFrame([features])
    prediction = model.predict(X)[0]
    return round(float(prediction), 4)
