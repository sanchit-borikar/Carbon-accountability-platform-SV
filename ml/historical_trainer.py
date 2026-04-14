"""
╔══════════════════════════════════════════════════════╗
║  VayuDrishti — Historical ML Trainer                 ║
║  Trains LSTM, XGBoost, and Prophet on AQI datasets   ║
║  from CPCB monitoring stations (2010-2024)           ║
╚══════════════════════════════════════════════════════╝
"""

import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.metrics import r2_score, mean_squared_error, mean_absolute_percentage_error
from sklearn.model_selection import TimeSeriesSplit

from xgboost import XGBRegressor
from prophet import Prophet

import warnings
warnings.filterwarnings("ignore")

# ─── PATHS ───────────────────────────────────────────
BASE_DIR      = Path(r"D:\VayuDrishti")
DATASET_DIR   = BASE_DIR / "AQI dataset"
MODELS_DIR    = BASE_DIR / "ml" / "models"
FORECASTS_DIR = BASE_DIR / "ml" / "forecasts"
SCALERS_DIR   = BASE_DIR / "ml" / "scalers"

MODELS_DIR.mkdir(parents=True, exist_ok=True)
FORECASTS_DIR.mkdir(parents=True, exist_ok=True)
SCALERS_DIR.mkdir(parents=True, exist_ok=True)

# ─── COLUMN RENAME MAP ──────────────────────────────
COLUMN_MAP = {
    "PM2.5 (ug/m3)":   "pm2_5",
    "PM10 (ug/m3)":    "pm10",
    "NO (ug/m3)":      "no",
    "NO2 (ug/m3)":     "no2",
    "NOx (ppb)":       "nox",
    "NH3 (ug/m3)":     "nh3",
    "SO2 (ug/m3)":     "so2",
    "CO (mg/m3)":      "co",
    "Ozone (ug/m3)":   "ozone",
    "Benzene (ug/m3)": "benzene",
    "Toluene (ug/m3)": "toluene",
    "Temp (degree C)":  "temperature",
    "RH (%)":          "humidity",
    "WS (m/s)":        "ws",
    "WD (deg)":        "wd",
    "SR (W/mt2)":      "sr",
    "BP (mmHg)":       "bp",
    "VWS (m/s)":       "vws",
    "Xylene (ug/m3)":  "xylene",
    "RF (mm)":         "rf",
    "AT (degree C)":   "at",
}

POLLUTANT_COLS = ["pm2_5", "pm10", "no2", "so2", "co", "ozone"]


# ═══════════════════════════════════════════════════════
#  STEP 1 — DATA LOADER
# ═══════════════════════════════════════════════════════

def get_season(month: int) -> str:
    if month in (6, 7, 8, 9):
        return "monsoon"
    elif month in (11, 12, 1, 2):
        return "winter"
    elif month in (3, 4, 5):
        return "summer"
    else:  # October
        return "post_monsoon"


def get_aqi_category(pm25: float) -> str:
    if pd.isna(pm25):
        return "Unknown"
    if pm25 <= 30:
        return "Good"
    elif pm25 <= 60:
        return "Satisfactory"
    elif pm25 <= 90:
        return "Moderate"
    elif pm25 <= 120:
        return "Poor"
    elif pm25 <= 250:
        return "Very Poor"
    else:
        return "Severe"


def load_all_csvs(folder_path: str) -> pd.DataFrame:
    """Load ALL CSV files from the AQI dataset folder."""
    folder = Path(folder_path)
    csv_files = sorted(folder.glob("*.csv"))

    # Exclude metadata files
    csv_files = [f for f in csv_files if f.stem != "stations_info"]

    all_frames = []
    loaded = 0

    for csv_path in csv_files:
        station_name = csv_path.stem  # e.g. "DL001"

        try:
            df = pd.read_csv(csv_path, low_memory=False)
        except Exception as e:
            print(f"  [WARN] Skipping {station_name}: {e}")
            continue

        if "From Date" not in df.columns:
            print(f"  [WARN] Skipping {station_name}: no 'From Date' column")
            continue

        # Parse datetime index
        df["From Date"] = pd.to_datetime(df["From Date"], errors="coerce")
        df = df.dropna(subset=["From Date"])
        df = df.set_index("From Date").sort_index()

        # Drop "To Date" — not needed
        df = df.drop(columns=["To Date"], errors="ignore")

        # Rename columns that exist
        rename = {k: v for k, v in COLUMN_MAP.items() if k in df.columns}
        df = df.rename(columns=rename)

        # Convert pollutant columns to numeric
        for col in POLLUTANT_COLS:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Also convert temperature/humidity if present
        for col in ["temperature", "humidity"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        # Drop rows where ALL pollutants are NaN
        present_pollutants = [c for c in POLLUTANT_COLS if c in df.columns]
        if not present_pollutants:
            print(f"  [WARN] Skipping {station_name}: no pollutant columns")
            continue
        df = df.dropna(subset=present_pollutants, how="all")

        if len(df) == 0:
            continue

        # Forward fill missing values (limit=3)
        df = df.ffill(limit=3)

        # Add station identifier
        df["station"] = station_name

        # Time features
        df["hour"] = df.index.hour
        df["month"] = df.index.month
        df["season"] = df["month"].apply(get_season)

        # WHO ratio & AQI category
        if "pm2_5" in df.columns:
            df["who_ratio"] = df["pm2_5"] / 15.0
            df["aqi_category"] = df["pm2_5"].apply(get_aqi_category)
        else:
            df["who_ratio"] = np.nan
            df["aqi_category"] = "Unknown"

        all_frames.append(df)
        loaded += 1

    if not all_frames:
        raise RuntimeError("No valid CSV files found!")

    print(f"  Loaded {loaded} station files")
    combined = pd.concat(all_frames, axis=0)
    combined.index.name = "From Date"
    return combined


# ═══════════════════════════════════════════════════════
#  STEP 2 — FEATURE ENGINEERING
# ═══════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add rolling, lag, and compliance features."""
    # Ensure pm2_5 exists
    if "pm2_5" not in df.columns:
        print("  [WARN] pm2_5 column missing — skipping feature engineering")
        return df

    # Process per station to avoid cross-station contamination
    groups = []
    for station, sdf in df.groupby("station"):
        sdf = sdf.sort_index()

        # Rolling averages
        sdf["pm2_5_24h"] = sdf["pm2_5"].rolling(24, min_periods=1).mean()
        sdf["pm2_5_7d"] = sdf["pm2_5"].rolling(168, min_periods=1).mean()
        sdf["pm2_5_30d"] = sdf["pm2_5"].rolling(720, min_periods=1).mean()

        # Lag features
        sdf["pm2_5_lag1"] = sdf["pm2_5"].shift(1)
        sdf["pm2_5_lag24"] = sdf["pm2_5"].shift(24)
        sdf["pm2_5_lag168"] = sdf["pm2_5"].shift(168)

        # Rate of change
        sdf["pm2_5_delta"] = sdf["pm2_5"] - sdf["pm2_5"].shift(1)
        sdf["pm2_5_trend"] = sdf["pm2_5_7d"] - sdf["pm2_5_30d"]

        # WHO / CPCB compliance
        sdf["exceeds_who"] = (sdf["pm2_5"] > 15).astype(int)
        sdf["exceeds_cpcb"] = (sdf["pm2_5"] > 60).astype(int)

        # Violation streak (consecutive hours exceeding WHO)
        exceed = sdf["exceeds_who"]
        streaks = exceed.groupby((exceed != exceed.shift()).cumsum()).cumsum()
        sdf["violation_streak"] = streaks * exceed

        groups.append(sdf)

    result = pd.concat(groups, axis=0)
    print(f"  Engineered features — {len(result.columns)} total columns")
    return result


# ═══════════════════════════════════════════════════════
#  STEP 3 — XGBOOST TRAINING
# ═══════════════════════════════════════════════════════

def train_xgboost(df: pd.DataFrame) -> tuple:
    """Train XGBoost for next-hour PM2.5 prediction."""
    # Define feature list
    feature_cols = [
        "pm2_5_lag1", "pm2_5_lag24", "pm2_5_lag168",
        "pm2_5_24h", "pm2_5_7d", "pm2_5_delta",
        "no2", "so2", "co", "temperature", "humidity",
        "hour", "month", "who_ratio",
    ]

    # Label-encode season
    le = LabelEncoder()
    df["season_enc"] = le.fit_transform(df["season"].astype(str))
    feature_cols.append("season_enc")

    # Keep only columns that exist
    available = [c for c in feature_cols if c in df.columns]
    missing = [c for c in feature_cols if c not in df.columns]
    if missing:
        print(f"  [INFO] Missing features (will skip): {missing}")

    # Target: next hour pm2_5
    df["target"] = df.groupby("station")["pm2_5"].shift(-1)

    # Drop NaN rows
    train_df = df.dropna(subset=available + ["target"])

    if len(train_df) < 100:
        print("  [ERROR] Not enough data for XGBoost training")
        return None, {}

    X = train_df[available].values
    y = train_df["target"].values

    # 80/20 split (time-ordered)
    split_idx = int(len(X) * 0.8)
    X_train, X_test = X[:split_idx], X[split_idx:]
    y_train, y_test = y[:split_idx], y[split_idx:]

    print(f"  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

    # Train model
    model = XGBRegressor(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        n_jobs=-1,
        verbosity=0,
    )

    # TimeSeriesSplit cross-validation
    tscv = TimeSeriesSplit(n_splits=5)
    cv_scores = []
    for fold, (tr_idx, val_idx) in enumerate(tscv.split(X_train), 1):
        model.fit(X_train[tr_idx], y_train[tr_idx])
        val_pred = model.predict(X_train[val_idx])
        fold_r2 = r2_score(y_train[val_idx], val_pred)
        cv_scores.append(fold_r2)

    print(f"  CV R² scores: {[f'{s:.4f}' for s in cv_scores]}")
    print(f"  CV R² mean:   {np.mean(cv_scores):.4f}")

    # Final training on full train set
    model.fit(X_train, y_train)

    # Evaluate
    train_pred = model.predict(X_train)
    test_pred = model.predict(X_test)

    train_r2 = r2_score(y_train, train_pred)
    test_r2 = r2_score(y_test, test_pred)
    rmse = np.sqrt(mean_squared_error(y_test, test_pred))

    print(f"\n  Training R²:  {train_r2:.4f}")
    print(f"  Test R²:      {test_r2:.4f}")
    print(f"  RMSE:         {rmse:.2f} µg/m³")

    # Feature importance
    importances = model.feature_importances_
    feat_imp = sorted(zip(available, importances), key=lambda x: x[1], reverse=True)
    print("\n  Top 5 Features:")
    for fname, fimp in feat_imp[:5]:
        print(f"    {fname:20s} → {fimp:.4f}")

    # Save model
    save_path = MODELS_DIR / "xgboost_historical.pkl"
    joblib.dump(model, save_path)
    print(f"\n  Model saved → {save_path}")

    # Save feature names and label encoder
    joblib.dump({"features": available, "label_encoder": le},
                MODELS_DIR / "xgboost_historical_meta.pkl")

    metrics = {
        "train_r2": round(train_r2, 4),
        "test_r2": round(test_r2, 4),
        "r2": round(test_r2, 4),
        "rmse": round(rmse, 2),
        "cv_r2_mean": round(np.mean(cv_scores), 4),
        "top_features": [f[0] for f in feat_imp[:5]],
    }
    return model, metrics


# ═══════════════════════════════════════════════════════
#  STEP 4 — LSTM TRAINING
# ═══════════════════════════════════════════════════════

LSTM_FEATURES = ["pm2_5", "no2", "so2", "co", "temperature", "humidity", "hour", "month"]
SEQ_LEN = 168       # 7 days lookback
PRED_HORIZON = 24   # predict next 24 hours


class AQISequenceDataset(Dataset):
    """PyTorch dataset for LSTM sequences."""
    def __init__(self, X: np.ndarray, y: np.ndarray):
        self.X = torch.FloatTensor(X)
        self.y = torch.FloatTensor(y)

    def __len__(self):
        return len(self.X)

    def __getitem__(self, idx):
        return self.X[idx], self.y[idx]


class Attention(nn.Module):
    """Simple additive attention."""
    def __init__(self, hidden_dim: int):
        super().__init__()
        self.attn = nn.Linear(hidden_dim, 1)

    def forward(self, lstm_out: torch.Tensor) -> torch.Tensor:
        # lstm_out: (batch, seq_len, hidden*2)
        weights = torch.softmax(self.attn(lstm_out), dim=1)
        context = (weights * lstm_out).sum(dim=1)
        return context


class LSTMForecaster(nn.Module):
    """Bidirectional LSTM with Attention for PM2.5 forecasting."""
    def __init__(self, n_features: int, hidden1: int = 128, hidden2: int = 64,
                 pred_horizon: int = 24, dropout: float = 0.2):
        super().__init__()
        self.lstm1 = nn.LSTM(n_features, hidden1, batch_first=True, bidirectional=True)
        self.drop1 = nn.Dropout(dropout)
        self.lstm2 = nn.LSTM(hidden1 * 2, hidden2, batch_first=True, bidirectional=True)
        self.drop2 = nn.Dropout(dropout)
        self.attention = Attention(hidden2 * 2)
        self.fc1 = nn.Linear(hidden2 * 2, 32)
        self.relu = nn.ReLU()
        self.fc_out = nn.Linear(32, pred_horizon)

    def forward(self, x):
        out, _ = self.lstm1(x)
        out = self.drop1(out)
        out, _ = self.lstm2(out)
        out = self.drop2(out)
        context = self.attention(out)
        out = self.relu(self.fc1(context))
        return self.fc_out(out)


def create_sequences(data: np.ndarray, target_col_idx: int,
                     seq_len: int = SEQ_LEN, pred_len: int = PRED_HORIZON):
    """Create input/output sequences for LSTM."""
    X, y = [], []
    for i in range(len(data) - seq_len - pred_len + 1):
        X.append(data[i : i + seq_len])
        y.append(data[i + seq_len : i + seq_len + pred_len, target_col_idx])
    return np.array(X), np.array(y)


def train_lstm(df: pd.DataFrame, station_name: str) -> tuple:
    """Train Bidirectional LSTM with Attention for a single station."""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"  Device: {device}")

    # Select features that exist
    available_feats = [c for c in LSTM_FEATURES if c in df.columns]
    if "pm2_5" not in available_feats:
        print("  [ERROR] pm2_5 not available — cannot train LSTM")
        return None, {}

    data = df[available_feats].copy()

    # Drop rows with NaN in pm2_5
    data = data.dropna(subset=["pm2_5"])

    # Fill remaining NaN with column medians
    data = data.fillna(data.median())

    if len(data) < SEQ_LEN + PRED_HORIZON + 100:
        print(f"  [WARN] Not enough data ({len(data)} rows) — skipping LSTM for {station_name}")
        return None, {}

    # Normalize
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(data.values)

    target_idx = available_feats.index("pm2_5")

    # Create sequences
    X, y = create_sequences(scaled, target_idx)
    print(f"  Sequences: {len(X):,}  |  Shape: {X.shape}")

    # Split 80/20
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    # DataLoaders
    train_ds = AQISequenceDataset(X_train, y_train)
    test_ds = AQISequenceDataset(X_test, y_test)
    train_loader = DataLoader(train_ds, batch_size=64, shuffle=False)
    test_loader = DataLoader(test_ds, batch_size=64, shuffle=False)

    # Model
    model = LSTMForecaster(
        n_features=len(available_feats),
        hidden1=128,
        hidden2=64,
        pred_horizon=PRED_HORIZON,
        dropout=0.2,
    ).to(device)

    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion = nn.MSELoss()

    # Training loop with early stopping
    best_val_loss = float("inf")
    patience_counter = 0
    best_state = None
    epochs = 50

    for epoch in range(1, epochs + 1):
        # ── Train ──
        model.train()
        train_losses = []
        for xb, yb in train_loader:
            xb, yb = xb.to(device), yb.to(device)
            optimizer.zero_grad()
            pred = model(xb)
            loss = criterion(pred, yb)
            loss.backward()
            optimizer.step()
            train_losses.append(loss.item())

        # ── Validate ──
        model.eval()
        val_losses = []
        with torch.no_grad():
            for xb, yb in test_loader:
                xb, yb = xb.to(device), yb.to(device)
                pred = model(xb)
                val_losses.append(criterion(pred, yb).item())

        train_loss = np.mean(train_losses)
        val_loss = np.mean(val_losses)
        print(f"  Epoch {epoch:2d}/{epochs} | Loss: {train_loss:.4f} | Val: {val_loss:.4f}")

        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
            best_state = model.state_dict().copy()
        else:
            patience_counter += 1
            if patience_counter >= 10:
                print(f"  Early stopping at epoch {epoch}")
                break

    # Load best model
    if best_state is not None:
        model.load_state_dict(best_state)

    # ── Final evaluation ──
    model.eval()
    all_preds, all_targets = [], []
    with torch.no_grad():
        for xb, yb in test_loader:
            xb = xb.to(device)
            pred = model(xb).cpu().numpy()
            all_preds.append(pred)
            all_targets.append(yb.numpy())

    all_preds = np.concatenate(all_preds, axis=0)
    all_targets = np.concatenate(all_targets, axis=0)

    # Inverse transform for metrics (pm2_5 column only)
    # Create dummy arrays for inverse transform
    def inverse_pm25(scaled_vals):
        dummy = np.zeros((len(scaled_vals), len(available_feats)))
        dummy[:, target_idx] = scaled_vals
        inv = scaler.inverse_transform(dummy)
        return inv[:, target_idx]

    # Flatten for metrics
    preds_flat = all_preds.flatten()
    targets_flat = all_targets.flatten()
    preds_real = inverse_pm25(preds_flat)
    targets_real = inverse_pm25(targets_flat)

    # Avoid division issues
    mask = targets_real > 0
    test_r2 = r2_score(targets_real[mask], preds_real[mask])
    test_rmse = np.sqrt(mean_squared_error(targets_real[mask], preds_real[mask]))
    test_mape = mean_absolute_percentage_error(targets_real[mask], preds_real[mask]) * 100

    # Also compute train metrics
    all_train_preds = []
    with torch.no_grad():
        for xb, yb in train_loader:
            xb = xb.to(device)
            all_train_preds.append(model(xb).cpu().numpy())
    train_preds = np.concatenate(all_train_preds, axis=0).flatten()
    train_targets = y_train.flatten()
    train_preds_real = inverse_pm25(train_preds)
    train_targets_real = inverse_pm25(train_targets)
    mask_tr = train_targets_real > 0
    train_r2 = r2_score(train_targets_real[mask_tr], train_preds_real[mask_tr])

    print(f"\n  Train R²:    {train_r2:.4f}")
    print(f"  Test R²:     {test_r2:.4f}")
    print(f"  Test RMSE:   {test_rmse:.2f} µg/m³")
    print(f"  Test MAPE:   {test_mape:.1f}%")

    # Save model and scaler
    model_path = MODELS_DIR / f"lstm_{station_name}.pt"
    scaler_path = SCALERS_DIR / f"scaler_{station_name}.pkl"
    torch.save({
        "model_state": model.state_dict(),
        "features": available_feats,
        "seq_len": SEQ_LEN,
        "pred_horizon": PRED_HORIZON,
        "n_features": len(available_feats),
    }, model_path)
    joblib.dump(scaler, scaler_path)

    print(f"  Model  saved → {model_path}")
    print(f"  Scaler saved → {scaler_path}")

    metrics = {
        "train_r2": round(train_r2, 4),
        "test_r2": round(test_r2, 4),
        "rmse": round(test_rmse, 2),
        "mape": round(test_mape, 1),
    }
    return model, metrics


# ═══════════════════════════════════════════════════════
#  STEP 5 — PROPHET TRAINING
# ═══════════════════════════════════════════════════════

def train_prophet(df: pd.DataFrame, station_name: str) -> tuple:
    """Train Prophet model for 6-month PM2.5 forecast."""
    if "pm2_5" not in df.columns:
        print("  [ERROR] pm2_5 not available — cannot train Prophet")
        return None, None

    # Prepare Prophet dataframe
    pdf = df.reset_index()[["From Date", "pm2_5"]].copy()
    pdf = pdf.rename(columns={"From Date": "ds", "pm2_5": "y"})
    pdf = pdf.dropna(subset=["y"])

    # Add regressors if available
    regressor_cols = ["temperature", "humidity", "no2", "so2"]
    available_regs = [c for c in regressor_cols if c in df.columns]

    if available_regs:
        reg_data = df.reset_index()[available_regs]
        for col in available_regs:
            pdf[col] = pd.to_numeric(reg_data[col], errors="coerce")
        # Fill NaN regressors with median
        pdf[available_regs] = pdf[available_regs].fillna(pdf[available_regs].median())

    # Resample to daily (Prophet works best with daily data)
    pdf["ds"] = pd.to_datetime(pdf["ds"])
    agg_dict = {"y": "mean"}
    for col in available_regs:
        agg_dict[col] = "mean"
    pdf = pdf.set_index("ds").resample("D").agg(agg_dict).dropna(subset=["y"]).reset_index()

    if len(pdf) < 90:
        print(f"  [WARN] Not enough daily data ({len(pdf)} days) — skipping Prophet for {station_name}")
        return None, None

    print(f"  Daily records: {len(pdf):,}  ({pdf['ds'].min().date()} → {pdf['ds'].max().date()})")

    # Build model
    model = Prophet(
        yearly_seasonality=True,
        weekly_seasonality=True,
        daily_seasonality=False,  # already daily-aggregated
        seasonality_mode="multiplicative",
        changepoint_prior_scale=0.05,
        seasonality_prior_scale=10,
    )

    # Add Indian seasons as custom seasonality
    def is_monsoon(ds):
        return 1.0 if ds.month in (6, 7, 8, 9) else 0.0

    def is_winter(ds):
        return 1.0 if ds.month in (11, 12, 1, 2) else 0.0

    def is_summer(ds):
        return 1.0 if ds.month in (3, 4, 5) else 0.0

    pdf["is_monsoon"] = pdf["ds"].apply(is_monsoon)
    pdf["is_winter"] = pdf["ds"].apply(is_winter)
    pdf["is_summer"] = pdf["ds"].apply(is_summer)

    model.add_regressor("is_monsoon")
    model.add_regressor("is_winter")
    model.add_regressor("is_summer")

    for col in available_regs:
        model.add_regressor(col)

    # Fit
    model.fit(pdf)

    # ── Accuracy on last 90 days ──
    cutoff = pdf["ds"].max() - pd.Timedelta(days=90)
    test_df = pdf[pdf["ds"] > cutoff]
    if len(test_df) > 10:
        test_forecast = model.predict(test_df)
        mask = test_df["y"].values > 0
        if mask.sum() > 0:
            acc_mape = mean_absolute_percentage_error(
                test_df["y"].values[mask], test_forecast["yhat"].values[mask]
            ) * 100
            accuracy = max(0, 100 - acc_mape)
        else:
            accuracy = 0.0
    else:
        accuracy = 0.0

    print(f"  Accuracy (last 90 days): {accuracy:.1f}%")

    # ── Generate 6-month forecast ──
    future = model.make_future_dataframe(periods=180)

    future["is_monsoon"] = future["ds"].apply(is_monsoon)
    future["is_winter"] = future["ds"].apply(is_winter)
    future["is_summer"] = future["ds"].apply(is_summer)

    # Fill regressor values for future dates with historical monthly medians
    for col in available_regs:
        if col in pdf.columns:
            monthly_median = pdf.groupby(pdf["ds"].dt.month)[col].median()
            future[col] = future["ds"].dt.month.map(monthly_median)
            future[col] = future[col].fillna(pdf[col].median())

    forecast = model.predict(future)

    # Only keep future dates
    last_date = pdf["ds"].max()
    future_forecast = forecast[forecast["ds"] > last_date].copy()

    # ── Build output JSON ──
    forecast_records = []
    for _, row in future_forecast.iterrows():
        pm25_pred = max(0, row["yhat"])
        forecast_records.append({
            "date": row["ds"].strftime("%Y-%m-%d"),
            "predicted_pm25": round(pm25_pred, 1),
            "lower_bound": round(max(0, row["yhat_lower"]), 1),
            "upper_bound": round(max(0, row["yhat_upper"]), 1),
            "season": get_season(row["ds"].month),
            "aqi_category": get_aqi_category(pm25_pred),
        })

    # ── Seasonal patterns ──
    pdf["season"] = pdf["ds"].dt.month.apply(get_season)
    seasonal_avg = pdf.groupby("season")["y"].mean()

    monthly_avg = pdf.groupby(pdf["ds"].dt.month)["y"].mean()
    month_names = {
        1: "January", 2: "February", 3: "March", 4: "April",
        5: "May", 6: "June", 7: "July", 8: "August",
        9: "September", 10: "October", 11: "November", 12: "December"
    }
    worst_month = month_names.get(monthly_avg.idxmax(), "Unknown")
    best_month = month_names.get(monthly_avg.idxmin(), "Unknown")

    # ── Yearly comparison ──
    pdf["year"] = pdf["ds"].dt.year
    yearly_avg = pdf.groupby("year")["y"].mean()
    yearly_comparison = {}
    for yr in yearly_avg.index:
        yearly_comparison[f"{yr}_avg"] = round(yearly_avg[yr], 1)

    # Determine trend
    if len(yearly_avg) >= 2:
        first_half = yearly_avg.iloc[:len(yearly_avg) // 2].mean()
        second_half = yearly_avg.iloc[len(yearly_avg) // 2:].mean()
        trend = "improving" if second_half < first_half else "worsening"
    else:
        trend = "insufficient_data"
    yearly_comparison["trend"] = trend

    result = {
        "station": station_name,
        "model": "Prophet",
        "accuracy": round(accuracy, 1),
        "generated_at": datetime.now().isoformat(),
        "forecast_6month": forecast_records,
        "seasonal_patterns": {
            "monsoon_avg": round(seasonal_avg.get("monsoon", 0), 1),
            "winter_avg": round(seasonal_avg.get("winter", 0), 1),
            "summer_avg": round(seasonal_avg.get("summer", 0), 1),
            "post_monsoon_avg": round(seasonal_avg.get("post_monsoon", 0), 1),
            "worst_month": worst_month,
            "best_month": best_month,
        },
        "yearly_comparison": yearly_comparison,
    }

    # Save
    save_path = FORECASTS_DIR / f"prophet_{station_name}_6month.json"
    with open(save_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  Forecast saved → {save_path}")

    return model, future_forecast


# ═══════════════════════════════════════════════════════
#  STEP 6 — HISTORICAL COMPARISON
# ═══════════════════════════════════════════════════════

def generate_historical_comparison(df: pd.DataFrame) -> dict:
    """Calculate yearly averages per station and save historical comparison."""
    if "pm2_5" not in df.columns:
        print("  [ERROR] pm2_5 not available")
        return {}

    month_names = {
        1: "January", 2: "February", 3: "March", 4: "April",
        5: "May", 6: "June", 7: "July", 8: "August",
        9: "September", 10: "October", 11: "November", 12: "December"
    }

    df_reset = df.reset_index()
    df_reset["year"] = pd.to_datetime(df_reset["From Date"]).dt.year
    df_reset["month_num"] = pd.to_datetime(df_reset["From Date"]).dt.month

    all_years = sorted(df_reset["year"].unique())
    result = {"years": [int(y) for y in all_years], "stations": {}}

    stations = df_reset["station"].unique()
    print(f"  Processing {len(stations)} stations across {len(all_years)} years...")

    for station in stations:
        sdf = df_reset[df_reset["station"] == station]
        yearly_data = []
        prev_avg = None

        for year in all_years:
            ydf = sdf[sdf["year"] == year]
            if len(ydf) == 0:
                continue

            avg_pm25 = ydf["pm2_5"].mean()
            avg_no2 = ydf["no2"].mean() if "no2" in ydf.columns else None
            who_violations = int((ydf["pm2_5"] > 15).sum()) if "pm2_5" in ydf.columns else 0

            monthly = ydf.groupby("month_num")["pm2_5"].mean()
            worst = month_names.get(int(monthly.idxmax()), "N/A") if len(monthly) > 0 else "N/A"
            best = month_names.get(int(monthly.idxmin()), "N/A") if len(monthly) > 0 else "N/A"

            # AQI distribution
            if "aqi_category" in ydf.columns:
                dist = ydf["aqi_category"].value_counts(normalize=True) * 100
                aqi_dist = {k: round(v, 1) for k, v in dist.items()}
            else:
                aqi_dist = {}

            trend_str = ""
            if prev_avg is not None and prev_avg > 0:
                change = ((avg_pm25 - prev_avg) / prev_avg) * 100
                trend_str = f"{change:+.1f}%"

            entry = {
                "year": int(year),
                "avg_pm25": round(avg_pm25, 1) if not np.isnan(avg_pm25) else None,
                "avg_no2": round(avg_no2, 1) if avg_no2 is not None and not np.isnan(avg_no2) else None,
                "who_violations": who_violations,
                "worst_month": worst,
                "best_month": best,
                "aqi_distribution": aqi_dist,
                "trend_vs_previous": trend_str,
            }
            yearly_data.append(entry)
            prev_avg = avg_pm25

        if not yearly_data:
            continue

        # Overall trend
        first_year_avg = yearly_data[0].get("avg_pm25")
        last_year_avg = yearly_data[-1].get("avg_pm25")
        if first_year_avg and last_year_avg and first_year_avg > 0:
            overall_change = ((last_year_avg - first_year_avg) / first_year_avg) * 100
            overall_trend = "improving" if overall_change < 0 else "worsening"
            improvement = f"{overall_change:+.1f}%"
        else:
            overall_trend = "insufficient_data"
            improvement = "N/A"

        result["stations"][station] = {
            "yearly_data": yearly_data,
            "overall_trend": overall_trend,
            "improvement_since_first_year": improvement,
        }

    # Save
    save_path = FORECASTS_DIR / "historical_comparison.json"
    with open(save_path, "w") as f:
        json.dump(result, f, indent=2)
    print(f"  Saved → {save_path}")
    print(f"  Stations: {len(result['stations'])}  |  Years: {result['years']}")

    return result


# ═══════════════════════════════════════════════════════
#  STEP 7 — MAIN RUNNER
# ═══════════════════════════════════════════════════════

if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════╗")
    print("║  VayuDrishti — Historical ML Trainer                 ║")
    print("╚══════════════════════════════════════════════════════╝")
    print()

    # ── Load all CSVs ──
    print("Loading AQI datasets 2010-2024...")
    df = load_all_csvs(str(DATASET_DIR))
    print(f"Loaded {len(df):,} records from {df['station'].nunique()} stations")
    print(f"Date range: {df.index.min()} → {df.index.max()}")
    print()

    # ── Feature engineering ──
    print("Engineering features...")
    df = engineer_features(df)
    print()

    # ── XGBoost (once on all data) ──
    print("── XGBoost ──────────────────────────────────────")
    xgb_model, xgb_metrics = train_xgboost(df)
    print()

    # ── Select top stations by data volume ──
    top_stations = (
        df[df["pm2_5"].notna()]
        .groupby("station")["pm2_5"]
        .count()
        .sort_values(ascending=False)
        .head(5)
        .index.tolist()
    )
    print(f"Training LSTM + Prophet on top {len(top_stations)} stations:")
    print(f"  {top_stations}")
    print()

    # ── Per-station training ──
    lstm_results = {}
    prophet_results = {}

    for station in top_stations:
        station_df = df[df["station"] == station].copy()

        print(f"── LSTM: {station} ──────────────────────────────")
        lstm_model, lstm_metrics = train_lstm(station_df, station)
        if lstm_metrics:
            lstm_results[station] = lstm_metrics
        print()

        print(f"── Prophet: {station} ───────────────────────────")
        prophet_model, prophet_forecast = train_prophet(station_df, station)
        print()

    # ── Historical comparison ──
    print("── Historical Comparison ────────────────────────")
    generate_historical_comparison(df)
    print()

    # ── Summary ──
    print("═══════════════════════════════════════════════════")
    print("✓ ALL MODELS TRAINED SUCCESSFULLY")
    print(f"  Models    saved to: {MODELS_DIR}")
    print(f"  Forecasts saved to: {FORECASTS_DIR}")
    print(f"  Scalers   saved to: {SCALERS_DIR}")
    print()
    print("SUMMARY:")
    if xgb_metrics:
        print(f"  XGBoost Accuracy  : {xgb_metrics.get('r2', 0):.1%}")
    print(f"  Stations trained  : {len(top_stations)}")
    print(f"  Forecast horizon  : 6 months (180 days)")
    print(f"  Historical data   : {df.index.min().year} - {df.index.max().year}")

    if lstm_results:
        print()
        print("  LSTM Results:")
        for st, m in lstm_results.items():
            print(f"    {st}: R²={m['test_r2']:.4f}  RMSE={m['rmse']:.1f}  MAPE={m['mape']:.1f}%")

    print("═══════════════════════════════════════════════════")
