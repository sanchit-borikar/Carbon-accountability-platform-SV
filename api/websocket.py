"""WebSocket for live emission feed."""

import asyncio, json
from fastapi import WebSocket, WebSocketDisconnect
from sqlalchemy import text
from api.database import SessionLocal
from datetime import datetime

class ConnectionManager:
    def __init__(self):
        self.active: list[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, data: dict):
        for ws in self.active.copy():
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(ws)

manager = ConnectionManager()

async def live_feed_task():
    """Background task — pushes new records"""
    last_id = 0
    while True:
        try:
            if manager.active:
                db = SessionLocal()
                result = db.execute(text("""
                    SELECT id, city,
                           primary_pollutant,
                           primary_value,
                           co2_equivalent,
                           compliance_score,
                           exceeds_who,
                           exceeds_cpcb,
                           source,
                           timestamp,
                           chain_anchored
                    FROM emission_records
                    WHERE id > :last_id
                    ORDER BY id ASC
                    LIMIT 10
                """), {"last_id": last_id})
                cols = result.keys()
                rows = result.fetchall()
                db.close()

                for row in rows:
                    d = dict(zip(cols, row))
                    if d.get("timestamp"):
                        d["timestamp"] = str(
                            d["timestamp"])
                    await manager.broadcast(d)
                    last_id = max(
                        last_id, d["id"])

        except Exception:
            pass
        await asyncio.sleep(3)
