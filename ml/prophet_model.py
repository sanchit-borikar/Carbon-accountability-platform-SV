import sys
import os
import json
import logging
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from prophet import Prophet

logging.getLogger("cmdstanpy").setLevel(logging.CRITICAL)
logging.getLogger("prophet").setLevel(logging.CRITICAL)

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import ml_result, warn, info, C

from ml.config import FORECASTS_DIR, FORECAST_HORIZONS


def train_prophet(city, pollutant, df):
    """Train a Prophet model for a specific city+pollutant pair."""
    df_filtered = df[
        (df["city"] == city) & (df["primary_pollutant"] == pollutant)
    ].copy()

    if len(df_filtered) < 48:
        warn("Prophet",
             f"{city} | {pollutant} \u2014 insufficient data",
             f"{len(df_filtered)} pts (need 168 for 7 days)")
        return None

    # Prophet expects 'ds' and 'y'
    df_prophet = df_filtered[["timestamp", "primary_value"]].rename(
        columns={"timestamp": "ds", "primary_value": "y"}
    )
    df_prophet = df_prophet.set_index("ds").resample("h").mean().dropna().reset_index()

    if len(df_prophet) < 48:
        warn("Prophet", f"{city} | {pollutant} \u2014 insufficient after resample",
             f"{len(df_prophet)} rows")
        return None

    # Remove timezone from timestamp for Prophet
    df_prophet["ds"] = pd.to_datetime(df_prophet["ds"]).dt.tz_localize(None)

    # Holdout split: last 20% but at least 24 hours
    test_size = max(24, int(len(df_prophet) * 0.2))
    train_df = df_prophet.iloc[:-test_size].copy()
    test_df = df_prophet.iloc[-test_size:].copy()
    train_df["ds"] = pd.to_datetime(train_df["ds"]).dt.tz_localize(None)
    test_df["ds"] = pd.to_datetime(test_df["ds"]).dt.tz_localize(None)

    if len(train_df) < 100:
        warn("Prophet", f"{city} | {pollutant} \u2014 not enough training data",
             f"{len(train_df)} rows in train (need 100)")
        return None

    model = Prophet(
        changepoint_prior_scale=0.01,
        seasonality_prior_scale=5.0,
        changepoint_range=0.9,
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=False,
        interval_width=0.90,
        uncertainty_samples=500,
    )
    model.add_seasonality(name="morning_rush", period=1, fourier_order=8)
    model.add_seasonality(name="weekly_industrial", period=7, fourier_order=5)
    model.fit(train_df)

    # Accuracy on holdout
    future_test = model.make_future_dataframe(periods=len(test_df), freq="h")
    forecast_test = model.predict(future_test)
    split = len(train_df)
    pred_holdout = forecast_test.iloc[split:]["yhat"].values[: len(test_df)]
    actual_holdout = test_df["y"].values[: len(pred_holdout)]

    mask = actual_holdout != 0
    if mask.sum() > 0:
        mape = float(np.mean(np.abs((actual_holdout[mask] - pred_holdout[mask]) / actual_holdout[mask])) * 100)
    else:
        mape = 0.0
    accuracy = max(0.0, 100.0 - mape)

    if mape > 80:
        warn("Prophet",
             f"{city} | {pollutant} \u2014 model too inaccurate",
             f"MAPE={mape:.1f}% > 80% threshold. "
             f"Needs more historical data.")
        return None

    # Full retrain for production forecast
    model_full = Prophet(
        changepoint_prior_scale=0.01,
        seasonality_prior_scale=5.0,
        changepoint_range=0.9,
        daily_seasonality=True,
        weekly_seasonality=True,
        yearly_seasonality=False,
        interval_width=0.90,
        uncertainty_samples=500,
    )
    model_full.add_seasonality(name="morning_rush", period=1, fourier_order=8)
    model_full.add_seasonality(name="weekly_industrial", period=7, fourier_order=5)
    model_full.fit(df_prophet)

    future = model_full.make_future_dataframe(periods=90 * 24, freq="h")
    forecast = model_full.predict(future)
    future_only = forecast.iloc[len(df_prophet):]

    # Build horizon summaries
    forecasts = {}
    for horizon in FORECAST_HORIZONS:
        horizon_rows = future_only.iloc[: horizon * 24]
        if len(horizon_rows) == 0:
            continue

        vals = horizon_rows["yhat"].values
        first_half = float(np.mean(vals[: len(vals) // 2]))
        second_half = float(np.mean(vals[len(vals) // 2:]))
        trend = "increasing" if second_half > first_half else "decreasing"

        daily_values = []
        for d in range(horizon):
            day_slice = vals[d * 24: (d + 1) * 24]
            if len(day_slice) > 0:
                daily_values.append({
                    "day": d + 1,
                    "value": round(float(np.mean(day_slice)), 4),
                })

        forecasts[f"{horizon}_day"] = {
            "mean": round(float(np.mean(vals)), 4),
            "min": round(float(np.min(vals)), 4),
            "max": round(float(np.max(vals)), 4),
            "trend": trend,
            "daily_values": daily_values,
        }

    result = {
        "model": "Prophet",
        "city": city,
        "pollutant": pollutant,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "accuracy": round(accuracy, 2),
        "mape": round(mape, 2),
        "data_points": len(df_filtered),
        "forecasts": forecasts,
    }

    path = os.path.join(FORECASTS_DIR, f"{city}_{pollutant}_prophet.json")
    with open(path, "w") as f:
        json.dump(result, f, indent=2)

    ml_result("Prophet", city, pollutant, accuracy, mape, len(df_filtered))
    return result
