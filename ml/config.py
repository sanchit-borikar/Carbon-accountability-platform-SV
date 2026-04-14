import os

# ── Directories ──────────────────────────────────────────────
MODELS_DIR = "ml/models"
FORECASTS_DIR = "ml/forecasts"
SCALERS_DIR = "ml/scalers"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(FORECASTS_DIR, exist_ok=True)
os.makedirs(SCALERS_DIR, exist_ok=True)

# ── LSTM Hyperparameters ─────────────────────────────────────
SEQUENCE_LENGTH = 24
FORECAST_HORIZONS = [7, 30, 60, 90]
LSTM_HIDDEN_SIZE = 128
LSTM_NUM_LAYERS = 2
LSTM_DROPOUT = 0.2
LSTM_EPOCHS = 30
LSTM_BATCH_SIZE = 64
LSTM_LEARNING_RATE = 0.001
LSTM_PATIENCE = 8

# ── XGBoost Hyperparameters ──────────────────────────────────
XGBOOST_PARAMS = {
    "n_estimators": 500,
    "max_depth": 8,
    "learning_rate": 0.02,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "gamma": 0.1,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "random_state": 42,
    "n_jobs": -1,
    "eval_metric": "mape",
}

# ── Isolation Forest Hyperparameters ─────────────────────────
ISOLATION_FOREST_PARAMS = {
    "n_estimators": 200,
    "contamination": 0.05,
    "max_features": 1.0,
    "bootstrap": True,
    "random_state": 42,
    "n_jobs": -1,
    "warm_start": False,
}

# ── Regulatory Limits ────────────────────────────────────────
WHO_LIMITS = {
    "pm2_5": 15.0, "pm25": 15.0, "no2": 10.0,
    "so2": 40.0,   "co": 4000.0, "co2": 1800.0,
    "pm10": 45.0,  "o3": 100.0,
}

CPCB_LIMITS = {
    "pm2_5": 60.0, "pm25": 60.0, "no2": 80.0,
    "so2": 80.0,   "co": 2000.0, "co2": 5000.0,
    "pm10": 100.0, "o3": 180.0,
}
