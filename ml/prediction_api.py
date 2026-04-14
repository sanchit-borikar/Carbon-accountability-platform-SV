import os
import json
import glob

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel

from ml.trainer import run_full_training
from ml.ensemble import ensemble_forecast, get_all_ensemble_forecasts
from ml.anomaly_detector import detect_realtime_anomaly
from ml.xgboost_model import predict_co2e
from ml.data_fetcher import get_cities, get_pollutants

app = FastAPI(
    title="VayuDrishti ML API",
    description="Carbon Emission Prediction API",
    version="1.0.0",
)

FORECASTS_DIR = "ml/forecasts"


# ── Request models ───────────────────────────────────────────
class AnomalyReading(BaseModel):
    primary_value: float = 0.0
    co2_equivalent: float = 0.0
    compliance_score: float = 0.0
    rolling_mean_24h: float = 0.0
    rolling_std_24h: float = 0.0
    city: str = ""
    primary_pollutant: str = ""


class CO2eReadings(BaseModel):
    primary_value: float = 0.0
    hour: int = 0
    day_of_week: int = 0
    month: int = 1
    is_weekend: int = 0
    is_morning_peak: int = 0
    is_evening_peak: int = 0
    rolling_mean_24h: float = 0.0
    rolling_std_24h: float = 0.0
    rolling_max_24h: float = 0.0
    latitude: float = 0.0
    longitude: float = 0.0
    sector_enc: int = 0
    pollutant_enc: int = 0


# ── Endpoints ────────────────────────────────────────────────
@app.get("/ml/health")
def health():
    return {
        "status": "operational",
        "service": "VayuDrishti ML Prediction API",
        "models": ["PyTorch LSTM", "XGBoost", "IsolationForest", "Prophet"],
    }


@app.get("/ml/summary")
def get_summary():
    path = os.path.join(FORECASTS_DIR, "training_summary.json")
    if not os.path.exists(path):
        return {"status": "not trained yet"}
    with open(path) as f:
        return json.load(f)


@app.get("/ml/forecasts")
def get_forecasts():
    return get_all_ensemble_forecasts()


@app.get("/ml/forecast/{city}/{pollutant}")
def get_forecast(city: str, pollutant: str):
    result = ensemble_forecast(city, pollutant)
    if not result:
        raise HTTPException(status_code=404, detail=f"No forecast found for {city}/{pollutant}")
    return result


@app.get("/ml/anomalies")
def get_anomalies():
    path = os.path.join(FORECASTS_DIR, "anomaly_results.json")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Anomaly results not available. Train models first.")
    with open(path) as f:
        return json.load(f)


@app.get("/ml/cities")
def get_cities_endpoint():
    return get_cities()


@app.get("/ml/high-risk")
def get_high_risk():
    forecasts = get_all_ensemble_forecasts()
    high_risk = [
        f for f in forecasts
        if f.get("risk_assessment", {}).get("30_day_risk") == "HIGH"
    ]
    return sorted(high_risk, key=lambda x: x.get("ensemble_accuracy", 0), reverse=True)


@app.post("/ml/train")
def trigger_training(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_full_training)
    return {
        "status": "ML training started in background",
        "message": "Check /ml/summary for results",
    }


@app.post("/ml/predict/anomaly")
def predict_anomaly(reading: AnomalyReading):
    result = detect_realtime_anomaly(reading.model_dump())
    return result


@app.post("/ml/predict/co2e")
def predict_co2_equivalent(readings: CO2eReadings):
    result = predict_co2e(readings.model_dump())
    return {"co2_equivalent": result}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001, reload=False)
