"""City compliance endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from api.database import get_db
from api.models import CityCompliance

router = APIRouter(prefix="/api/compliance",
                   tags=["Compliance"])

def get_risk_level(score: float) -> str:
    if score >= 80: return "LOW"
    if score >= 60: return "MEDIUM"
    if score >= 40: return "HIGH"
    return "CRITICAL"

@router.get("",
            response_model=List[CityCompliance])
def get_all_compliance(
    min_score: int = Query(0),
    max_score: int = Query(100),
    state: Optional[str] = Query(None),
    limit: int = Query(200, le=500),
    db: Session = Depends(get_db)
):
    """Get compliance scores for all cities"""
    params = {
        "min_score": min_score,
        "max_score": max_score,
        "limit": limit
    }
    state_filter = ""
    if state:
        state_filter = (
            "AND LOWER(state) = LOWER(:state)")
        params["state"] = state

    result = db.execute(text(f"""
        SELECT
            city,
            state,
            AVG(compliance_score)::float
                AS compliance_score,
            AVG(co2_equivalent)::float
                AS avg_co2_equivalent,
            COUNT(*)::int       AS total_records,
            SUM(CASE WHEN exceeds_who
                THEN 1 ELSE 0 END)::int
                AS who_violations,
            SUM(CASE WHEN exceeds_cpcb
                THEN 1 ELSE 0 END)::int
                AS cpcb_violations,
            MAX(timestamp)      AS latest_timestamp,
            AVG(latitude)::float  AS latitude,
            AVG(longitude)::float AS longitude
        FROM emission_records
        WHERE compliance_score BETWEEN
              :min_score AND :max_score
        {state_filter}
        GROUP BY city, state
        ORDER BY compliance_score ASC
        LIMIT :limit
    """), params)

    cols = result.keys()
    rows = []
    for row in result.fetchall():
        d = dict(zip(cols, row))
        d["risk_level"] = get_risk_level(
            d["compliance_score"] or 0)
        rows.append(d)
    return rows

@router.get("/{city}")
def get_city_compliance(
    city: str,
    db: Session = Depends(get_db)
):
    """Get detailed compliance for one city"""
    result = db.execute(text("""
        SELECT
            city, state,
            AVG(compliance_score)::float
                AS compliance_score,
            AVG(co2_equivalent)::float
                AS avg_co2_equivalent,
            COUNT(*)::int       AS total_records,
            SUM(CASE WHEN exceeds_who
                THEN 1 ELSE 0 END)::int
                AS who_violations,
            SUM(CASE WHEN exceeds_cpcb
                THEN 1 ELSE 0 END)::int
                AS cpcb_violations,
            MAX(timestamp)      AS latest_timestamp,
            AVG(latitude)::float  AS latitude,
            AVG(longitude)::float AS longitude,
            AVG(primary_value)::float
                AS avg_pollutant_value,
            COUNT(DISTINCT primary_pollutant)
                AS pollutants_tracked,
            COUNT(DISTINCT source)
                AS data_sources
        FROM emission_records
        WHERE LOWER(city) = LOWER(:city)
        GROUP BY city, state
    """), {"city": city})

    row = result.fetchone()
    if not row:
        return {"error": f"City {city} not found"}

    d = dict(zip(result.keys(), row))
    d["risk_level"] = get_risk_level(
        d["compliance_score"] or 0)
    d["explorer_url"] = (
        "https://lora.algokit.io/testnet"
        "/app/756736023"
    )
    return d
