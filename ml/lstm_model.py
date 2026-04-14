import sys
import os
import json
import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn
from datetime import datetime, timezone
from sklearn.preprocessing import MinMaxScaler

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from vayu_logger import ml_epoch, ml_result, warn, C

from ml.config import (
    MODELS_DIR, FORECASTS_DIR, SCALERS_DIR,
    SEQUENCE_LENGTH, FORECAST_HORIZONS,
    LSTM_HIDDEN_SIZE, LSTM_NUM_LAYERS, LSTM_DROPOUT,
    LSTM_EPOCHS, LSTM_BATCH_SIZE, LSTM_LEARNING_RATE,
    LSTM_PATIENCE, WHO_LIMITS, CPCB_LIMITS,
)


class EmissionLSTM(nn.Module):
    def __init__(self, input_size=1, hidden_size=LSTM_HIDDEN_SIZE,
                 num_layers=LSTM_NUM_LAYERS, output_size=1,
                 dropout=LSTM_DROPOUT):
        super().__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            batch_first=True,
            dropout=dropout if num_layers > 1 else 0,
            bidirectional=False,
        )
        self.batch_norm = nn.BatchNorm1d(hidden_size)
        self.dropout = nn.Dropout(dropout)
        self.fc1 = nn.Linear(hidden_size, 64)
        self.fc2 = nn.Linear(64, output_size)
        self.relu = nn.ReLU()

    def forward(self, x):
        h0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers, x.size(0), self.hidden_size).to(x.device)
        out, _ = self.lstm(x, (h0, c0))
        out = out[:, -1, :]
        out = self.batch_norm(out)
        out = self.dropout(out)
        out = self.relu(self.fc1(out))
        return self.fc2(out)


def create_sequences(data, seq_length):
    """Slide a window over *data* returning (X, y) arrays."""
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i : i + seq_length])
        y.append(data[i + seq_length])
    return np.array(X), np.array(y)


def train_lstm(city, pollutant, df):
    """Train a BiLSTM+Attention model for a specific city+pollutant pair."""
    df_filtered = df[
        (df["city"] == city) & (df["primary_pollutant"] == pollutant)
    ].copy()

    if len(df_filtered) < 34:
        warn("LSTM", f"{city} | {pollutant} \u2014 insufficient data",
             f"{len(df_filtered)} pts (need 34)")
        return None

    # Resample to hourly mean for consistent time intervals
    df_filtered["timestamp"] = pd.to_datetime(df_filtered["timestamp"]).dt.tz_localize(None)
    df_filtered = df_filtered.set_index("timestamp")
    df_hourly = df_filtered["primary_value"].resample("h").mean().dropna()

    if len(df_hourly) < SEQUENCE_LENGTH + 10:
        warn("LSTM", f"{city} | {pollutant} \u2014 insufficient hourly data",
             f"{len(df_hourly)} pts (need {SEQUENCE_LENGTH + 10})")
        return None

    # ── Multi-feature input ──────────────────────────────────
    feature_cols = []
    for col in ["primary_value", "rolling_mean_24h", "rolling_std_24h",
                "hour", "day_of_week"]:
        if col in df_filtered.columns:
            feature_cols.append(col)

    if len(feature_cols) > 1:
        df_multi = df_filtered[feature_cols].resample("h").mean().dropna()
        data_array = df_multi.values.astype(float)
        input_size = len(feature_cols)
    else:
        data_array = df_hourly.values.astype(float).reshape(-1, 1)
        input_size = 1

    if len(data_array) < SEQUENCE_LENGTH + 10:
        warn("LSTM", f"{city} | {pollutant} \u2014 not enough multi-feature data")
        return None

    # ── Scale ────────────────────────────────────────────────
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled = scaler.fit_transform(data_array)
    joblib.dump(scaler, os.path.join(SCALERS_DIR, f"{city}_{pollutant}_scaler.pkl"))

    # Also keep a single-column scaler for inverse transform of predictions
    scaler_y = MinMaxScaler(feature_range=(0, 1))
    y_col = data_array[:, 0].reshape(-1, 1)
    scaler_y.fit(y_col)
    joblib.dump(scaler_y, os.path.join(SCALERS_DIR, f"{city}_{pollutant}_scaler_y.pkl"))

    # ── Sequences ────────────────────────────────────────────
    X, y = create_sequences(scaled, SEQUENCE_LENGTH)
    if len(X) == 0:
        warn("LSTM", f"{city} | {pollutant} \u2014 not enough sequential data")
        return None

    # Target is only the first column (primary_value)
    y = y[:, 0] if y.ndim > 1 else y

    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    X_train_t = torch.FloatTensor(X_train)
    y_train_t = torch.FloatTensor(y_train)
    X_test_t = torch.FloatTensor(X_test)
    y_test_t = torch.FloatTensor(y_test)

    # ── Model ────────────────────────────────────────────────
    model = EmissionLSTM(input_size=input_size, hidden_size=LSTM_HIDDEN_SIZE,
                         num_layers=LSTM_NUM_LAYERS)
    optimizer = torch.optim.AdamW(model.parameters(), lr=LSTM_LEARNING_RATE,
                                  weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=10)
    criterion = nn.MSELoss()

    # ── Training loop with early stopping ────────────────────
    best_loss = float("inf")
    patience_counter = 0
    best_model_state = None

    for epoch in range(LSTM_EPOCHS):
        model.train()
        epoch_loss = 0.0
        n_batches = 0
        for i in range(0, len(X_train_t) - LSTM_BATCH_SIZE, LSTM_BATCH_SIZE):
            batch_X = X_train_t[i : i + LSTM_BATCH_SIZE]
            batch_y = y_train_t[i : i + LSTM_BATCH_SIZE]

            optimizer.zero_grad()
            output = model(batch_X)
            loss = criterion(output.squeeze(), batch_y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            epoch_loss += loss.item()
            n_batches += 1

        avg_loss = epoch_loss / max(n_batches, 1)
        scheduler.step(avg_loss)

        if avg_loss < best_loss:
            best_loss = avg_loss
            patience_counter = 0
            best_model_state = model.state_dict().copy()
        else:
            patience_counter += 1
            if patience_counter >= LSTM_PATIENCE:
                model.load_state_dict(best_model_state)
                break

        if epoch % 10 == 0:
            ml_epoch("BiLSTM+Attn", city, pollutant, epoch, LSTM_EPOCHS, avg_loss)

    if best_model_state:
        model.load_state_dict(best_model_state)

    # ── Evaluation ───────────────────────────────────────────
    model.eval()
    with torch.no_grad():
        predictions = model(X_test_t).numpy().flatten()

    pred_inv = scaler_y.inverse_transform(predictions.reshape(-1, 1)).flatten()
    actual_inv = scaler_y.inverse_transform(y_test.reshape(-1, 1)).flatten()

    mask = actual_inv != 0
    if mask.sum() > 0:
        mape = float(np.mean(np.abs((actual_inv[mask] - pred_inv[mask]) / actual_inv[mask])) * 100)
    else:
        mape = 0.0
    accuracy = max(0.0, 100.0 - mape)

    # ── Multi-horizon forecasts ──────────────────────────────
    last_seq = scaled[-SEQUENCE_LENGTH:].tolist()
    forecasts = {}

    for horizon in FORECAST_HORIZONS:
        horizon_predictions = []
        current_seq = list(last_seq)

        for _ in range(horizon * 24):
            inp = torch.FloatTensor([current_seq[-SEQUENCE_LENGTH:]]).reshape(
                1, SEQUENCE_LENGTH, input_size)
            with torch.no_grad():
                pred = model(inp).item()
            horizon_predictions.append(pred)
            # For multi-feature, repeat predicted value across features
            new_row = [pred] + [current_seq[-1][c] for c in range(1, input_size)]
            current_seq.append(new_row)

        inv_preds = scaler_y.inverse_transform(
            np.array(horizon_predictions).reshape(-1, 1)
        ).flatten()

        daily_values = []
        for d in range(horizon):
            day_slice = inv_preds[d * 24 : (d + 1) * 24]
            if len(day_slice) > 0:
                daily_values.append({
                    "day": d + 1,
                    "value": round(float(np.mean(day_slice)), 4),
                })

        mean_val = float(np.mean(inv_preds))
        first_half = float(np.mean(inv_preds[: len(inv_preds) // 2]))
        second_half = float(np.mean(inv_preds[len(inv_preds) // 2 :]))
        trend = "increasing" if second_half > first_half else "decreasing"

        forecasts[f"{horizon}_day"] = {
            "mean": round(mean_val, 4),
            "min": round(float(np.min(inv_preds)), 4),
            "max": round(float(np.max(inv_preds)), 4),
            "trend": trend,
            "daily_values": daily_values,
        }

    # ── Risk assessment ──────────────────────────────────────
    values = df_hourly.values
    current_level = float(values[-1])
    who_limit = WHO_LIMITS.get(pollutant)
    cpcb_limit = CPCB_LIMITS.get(pollutant)
    forecast_30 = forecasts.get("30_day", {}).get("mean", current_level)

    exceeds_who = bool(who_limit and forecast_30 > who_limit)
    exceeds_cpcb = bool(cpcb_limit and forecast_30 > cpcb_limit)

    if exceeds_who:
        risk_level = "HIGH"
    elif exceeds_cpcb:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    # ── Save ─────────────────────────────────────────────────
    torch.save(model.state_dict(), os.path.join(MODELS_DIR, f"{city}_{pollutant}_lstm.pt"))

    result = {
        "model": "BiLSTM+Attention",
        "city": city,
        "pollutant": pollutant,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "accuracy": round(accuracy, 2),
        "mape": round(mape, 2),
        "data_points": len(df_filtered),
        "input_features": input_size,
        "sequence_length": SEQUENCE_LENGTH,
        "forecasts": forecasts,
        "risk_assessment": {
            "current_level": round(current_level, 4),
            "who_limit": who_limit,
            "cpcb_limit": cpcb_limit,
            "exceeds_who_in_30_days": exceeds_who,
            "exceeds_cpcb_in_30_days": exceeds_cpcb,
            "risk_level": risk_level,
        },
    }

    forecast_path = os.path.join(FORECASTS_DIR, f"{city}_{pollutant}_lstm_forecast.json")
    with open(forecast_path, "w") as f:
        json.dump(result, f, indent=2)

    ml_result("BiLSTM+Attn", city, pollutant, accuracy, mape, len(df_filtered))
    return result
