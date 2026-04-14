import os
import json
import glob
import numpy as np

from ml.config import FORECASTS_DIR, WHO_LIMITS, CPCB_LIMITS


def load_forecast(city, pollutant, model):
    """Load a saved forecast JSON for a given city/pollutant/model tag."""
    path = os.path.join(FORECASTS_DIR, f"{city}_{pollutant}_{model}.json")
    if not os.path.exists(path):
        return None
    with open(path) as f:
        return json.load(f)


def ensemble_forecast(city, pollutant):
    """Combine LSTM + Prophet forecasts using accuracy-weighted averaging."""
    lstm = load_forecast(city, pollutant, "lstm_forecast")
    prophet = load_forecast(city, pollutant, "prophet")

    models_used = []
    if lstm:
        models_used.append("LSTM")
    if prophet:
        models_used.append("Prophet")

    if not models_used:
        return None

    forecasts = {}
    ensemble_accuracy = 0.0

    if lstm and prophet:
        lstm_acc = lstm.get("accuracy", 50)
        prophet_acc = prophet.get("accuracy", 50)
        total = lstm_acc + prophet_acc
        w_lstm = lstm_acc / total if total > 0 else 0.5
        w_prophet = 1.0 - w_lstm
        ensemble_accuracy = lstm_acc * w_lstm + prophet_acc * w_prophet

        for horizon in ["7_day", "30_day", "60_day", "90_day"]:
            l = lstm.get("forecasts", {}).get(horizon, {})
            p = prophet.get("forecasts", {}).get(horizon, {})

            if l and p:
                mean_val = l.get("mean", 0) * w_lstm + p.get("mean", 0) * w_prophet
                min_val = min(l.get("min", 0), p.get("min", 0))
                max_val = max(l.get("max", 0), p.get("max", 0))
                trend = l.get("trend", p.get("trend", "stable"))
            elif l:
                mean_val, min_val, max_val = l.get("mean", 0), l.get("min", 0), l.get("max", 0)
                trend = l.get("trend", "stable")
            elif p:
                mean_val, min_val, max_val = p.get("mean", 0), p.get("min", 0), p.get("max", 0)
                trend = p.get("trend", "stable")
            else:
                continue

            forecasts[horizon] = {
                "mean": round(mean_val, 4),
                "min": round(min_val, 4),
                "max": round(max_val, 4),
                "trend": trend,
            }
    else:
        source = lstm or prophet
        ensemble_accuracy = source.get("accuracy", 0)
        for horizon in ["7_day", "30_day", "60_day", "90_day"]:
            h = source.get("forecasts", {}).get(horizon)
            if h:
                forecasts[horizon] = {
                    "mean": round(h.get("mean", 0), 4),
                    "min": round(h.get("min", 0), 4),
                    "max": round(h.get("max", 0), 4),
                    "trend": h.get("trend", "stable"),
                }

    # ── Risk assessment ──────────────────────────────────────
    who_limit = WHO_LIMITS.get(pollutant)
    cpcb_limit = CPCB_LIMITS.get(pollutant)
    mean_30 = forecasts.get("30_day", {}).get("mean", 0)

    if who_limit and mean_30 > who_limit:
        risk = "HIGH"
    elif cpcb_limit and mean_30 > cpcb_limit:
        risk = "MEDIUM"
    else:
        risk = "LOW"

    compliance = 100.0
    if who_limit and who_limit > 0:
        compliance = max(0, min(100, (1 - mean_30 / who_limit) * 100))

    recommendation = (
        f"{city} {pollutant.upper()} levels predicted at {mean_30:.1f}. "
    )
    if risk == "HIGH":
        recommendation += "Exceeds WHO limits. Immediate regulatory action recommended."
    elif risk == "MEDIUM":
        recommendation += "Approaching WHO limits. Enhanced monitoring advised."
    else:
        recommendation += "Within safe limits. Continue routine monitoring."

    return {
        "city": city,
        "pollutant": pollutant,
        "ensemble_accuracy": round(ensemble_accuracy, 2),
        "models_used": models_used,
        "forecasts": forecasts,
        "risk_assessment": {
            "30_day_risk": risk,
            "predicted_compliance_score": round(compliance, 2),
            "recommendation": recommendation,
        },
    }


def get_all_ensemble_forecasts():
    """Scan forecast files, deduplicate city+pollutant pairs, and return ensemble results."""
    pattern = os.path.join(FORECASTS_DIR, "*_forecast.json")
    prophet_pattern = os.path.join(FORECASTS_DIR, "*_prophet.json")

    files = glob.glob(pattern) + glob.glob(prophet_pattern)
    pairs = set()

    for fpath in files:
        basename = os.path.basename(fpath)
        # strip known suffixes to extract city_pollutant
        for suffix in ("_lstm_forecast.json", "_prophet.json"):
            if basename.endswith(suffix):
                prefix = basename[: -len(suffix)]
                parts = prefix.rsplit("_", 1)
                if len(parts) == 2:
                    pairs.add(tuple(parts))
                break

    results = []
    for city, pollutant in pairs:
        result = ensemble_forecast(city, pollutant)
        if result:
            results.append(result)

    # Sort: HIGH risk first
    risk_order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    results.sort(key=lambda r: risk_order.get(r.get("risk_assessment", {}).get("30_day_risk", "LOW"), 2))
    return results
