"""Blockchain verification endpoints."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from api.database import get_db
from api.config import ALGO_APP_ID, ALGO_EXPLORER
from api.models import BlockchainVerification

router = APIRouter(prefix="/api/blockchain",
                   tags=["Blockchain"])

@router.get("/verify/{record_id}",
            response_model=BlockchainVerification)
def verify_record(
    record_id: int,
    db: Session = Depends(get_db)
):
    """Verify emission record on Algorand"""
    result = db.execute(text("""
        SELECT id, city, primary_pollutant,
               chain_anchored, blockchain_tx,
               block_number, algo_app_id
        FROM emission_records
        WHERE id = :id
    """), {"id": record_id})

    row = result.fetchone()
    if not row:
        return {
            "record_id":    record_id,
            "verified":     False,
            "chain_anchored": False,
            "city":         None,
            "pollutant":    None,
            "blockchain_tx": None,
            "block_number": None,
            "algo_app_id":  None,
            "explorer_url": None,
            "tx_url":       None,
        }

    d = dict(zip(result.keys(), row))
    tx = d.get("blockchain_tx")
    return {
        "record_id":    record_id,
        "city":         d.get("city"),
        "pollutant":    d.get("primary_pollutant"),
        "verified":     bool(
                         d.get("chain_anchored")),
        "chain_anchored": bool(
                         d.get("chain_anchored")),
        "blockchain_tx": tx,
        "block_number": d.get("block_number"),
        "algo_app_id":  d.get("algo_app_id"),
        "explorer_url": (
            f"{ALGO_EXPLORER}/app/{ALGO_APP_ID}"
            if ALGO_APP_ID else None),
        "tx_url": (
            f"{ALGO_EXPLORER}/transaction/{tx}"
            if tx else None),
    }

@router.get("/stats")
def get_blockchain_stats(
    db: Session = Depends(get_db)
):
    """Get overall blockchain statistics"""
    result = db.execute(text("""
        SELECT
            COUNT(*) FILTER (
                WHERE chain_anchored = TRUE
            )::int AS total_anchored,
            COUNT(*) FILTER (
                WHERE chain_anchored = TRUE
                AND exceeds_who = TRUE
            )::int AS violations_anchored,
            COUNT(*) FILTER (
                WHERE chain_anchored = TRUE
                AND compliance_score < 30
            )::int AS anomalies_anchored,
            MIN(block_number) AS first_block,
            MAX(block_number) AS latest_block
        FROM emission_records
    """))
    row = result.fetchone()
    d = dict(zip(result.keys(), row))
    d["algo_app_id"]   = int(ALGO_APP_ID or 0)
    d["network"]       = "Algorand Testnet"
    d["explorer_url"]  = (
        f"{ALGO_EXPLORER}/app/{ALGO_APP_ID}")
    d["carbon_status"] = "Carbon-Negative Chain"
    return d

@router.get("/anchored")
def get_anchored_records(
    db: Session = Depends(get_db)
):
    """Get all blockchain-anchored records"""
    result = db.execute(text("""
        SELECT id, city, primary_pollutant,
               co2_equivalent, compliance_score,
               timestamp, blockchain_tx,
               block_number
        FROM emission_records
        WHERE chain_anchored = TRUE
        ORDER BY block_number DESC
        LIMIT 100
    """))
    cols = result.keys()
    rows = [dict(zip(cols, row))
            for row in result.fetchall()]
    for r in rows:
        tx = r.get("blockchain_tx")
        r["tx_url"] = (
            f"{ALGO_EXPLORER}/transaction/{tx}"
            if tx else None)
    return rows
