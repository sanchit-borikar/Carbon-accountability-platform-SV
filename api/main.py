"""FastAPI main application."""

import asyncio
from datetime import datetime
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from api.database import test_connection, engine
from sqlalchemy import text
import os

from api.routes import (emissions, compliance,
                         ml, blockchain, dashboard, penalties,
                         companies)
from api.websocket import manager, live_feed_task

app = FastAPI(
    title="VayuDrishti Carbon Intelligence API",
    description=(
        "Real-time carbon emission tracking "
        "for India — SDG 13 · Algorand Blockchain"
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS — allow React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(emissions.router)
app.include_router(compliance.router)
app.include_router(ml.router)
app.include_router(blockchain.router)
app.include_router(dashboard.router)
app.include_router(penalties.router)
app.include_router(companies.router)

# WebSocket
@app.websocket("/ws/live")
async def websocket_endpoint(
        ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)

# Background task
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(live_feed_task())

# Health check
@app.get("/health", tags=["Health"])
def health_check():
    db_ok = test_connection()
    try:
        with engine.connect() as conn:
            count = conn.execute(
                text("SELECT COUNT(*) "
                     "FROM emission_records")
            ).scalar()
    except Exception:
        count = 0

    ml_ok = os.path.exists(
        os.path.join(
            os.path.dirname(
                os.path.dirname(
                    os.path.abspath(__file__))),
            "ml", "models"))

    return {
        "status":     "healthy" if db_ok else "degraded",
        "database":   db_ok,
        "ml_models":  ml_ok,
        "blockchain": "Algorand Testnet",
        "records":    count,
        "timestamp":  datetime.utcnow(),
        "version":    "1.0.0",
        "platform":   "VayuDrishti",
    }

@app.get("/api/pipeline/sources", tags=["Health"])
def source_counts():
    """Per-source record counts for the Data Pipeline Status panel."""
    mapping = {
        "OpenAQ API": ["openaq", "open-meteo", "open-meteo-historical"],
        "NASA GEOS-CF": ["nasa_geos", "nasa_satellite"],
        "WAQI AirQuality": ["ground_sensor", "satellite"],
        "data.gov.in": ["cpcb", "cpcb_official"],
        "Kafka Pipeline": ["energy_grid"],
        "PostgreSQL": None,  # total
    }
    try:
        with engine.connect() as conn:
            rows = conn.execute(
                text("SELECT source, COUNT(*) FROM emission_records GROUP BY source")
            ).fetchall()
        by_source = {r[0]: r[1] for r in rows}
        total = sum(by_source.values())
    except Exception:
        by_source = {}
        total = 0

    result = {}
    for label, sources in mapping.items():
        if sources is None:
            result[label] = total
        else:
            result[label] = sum(by_source.get(s, 0) for s in sources)
    return result


@app.get("/", tags=["Root"])
def root():
    return {
        "platform":    "VayuDrishti",
        "description": "Carbon Intelligence Platform",
        "sdg":         "SDG 13 — Climate Action",
        "blockchain":  "Algorand (Carbon-Negative)",
        "docs":        "/docs",
        "health":      "/health",
        "endpoints": {
            "emissions":   "/api/emissions",
            "compliance":  "/api/compliance",
            "anomalies":   "/api/anomalies",
            "forecast":    "/api/forecast/{city}/{pollutant}",
            "blockchain":  "/api/blockchain/stats",
            "dashboard":   "/api/dashboard/summary",
            "cities":      "/api/cities",
            "sectors":     "/api/sectors",
            "websocket":   "/ws/live",
        }
    }
