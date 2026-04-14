"""Emission data endpoints."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional, List
from api.database import get_db
from api.models import EmissionRecord

router = APIRouter(prefix="/api/emissions",
                   tags=["Emissions"])

@router.get("", response_model=List[EmissionRecord])
def get_emissions(
    city:      Optional[str] = Query(None),
    state:     Optional[str] = Query(None),
    sector:    Optional[str] = Query(None),
    pollutant: Optional[str] = Query(None),
    exceeds_who:  Optional[bool] = Query(None),
    exceeds_cpcb: Optional[bool] = Query(None),
    limit: int = Query(100, le=1000),
    offset: int = Query(0),
    db: Session = Depends(get_db)
):
    """Get emission records with optional filters"""
    where = ["1=1"]
    params = {"limit": limit, "offset": offset}

    if city:
        where.append("LOWER(city) = LOWER(:city)")
        params["city"] = city
    if state:
        where.append("LOWER(state) = LOWER(:state)")
        params["state"] = state
    if sector:
        where.append("sector = :sector")
        params["sector"] = sector
    if pollutant:
        where.append(
            "primary_pollutant = :pollutant")
        params["pollutant"] = pollutant
    if exceeds_who is not None:
        where.append("exceeds_who = :exceeds_who")
        params["exceeds_who"] = exceeds_who
    if exceeds_cpcb is not None:
        where.append("exceeds_cpcb = :exceeds_cpcb")
        params["exceeds_cpcb"] = exceeds_cpcb

    query = f"""
        SELECT * FROM emission_records
        WHERE {' AND '.join(where)}
        ORDER BY timestamp DESC
        LIMIT :limit OFFSET :offset
    """
    result = db.execute(text(query), params)
    cols = result.keys()
    return [dict(zip(cols, row))
            for row in result.fetchall()]

@router.get("/city/{city}",
            response_model=List[EmissionRecord])
def get_city_emissions(
    city: str,
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    """Get all records for a specific city"""
    result = db.execute(text("""
        SELECT * FROM emission_records
        WHERE LOWER(city) = LOWER(:city)
        ORDER BY timestamp DESC
        LIMIT :limit
    """), {"city": city, "limit": limit})
    cols = result.keys()
    return [dict(zip(cols, row))
            for row in result.fetchall()]

@router.get("/latest",
            response_model=List[EmissionRecord])
def get_latest_emissions(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    """Get most recent emission records"""
    result = db.execute(text("""
        SELECT DISTINCT ON (city, primary_pollutant)
            *
        FROM emission_records
        ORDER BY city, primary_pollutant,
                 timestamp DESC
        LIMIT :limit
    """), {"limit": limit})
    cols = result.keys()
    return [dict(zip(cols, row))
            for row in result.fetchall()]

@router.get("/violations",
            response_model=List[EmissionRecord])
def get_violations(
    who_only:  bool = Query(False),
    cpcb_only: bool = Query(False),
    limit: int = Query(100, le=500),
    db: Session = Depends(get_db)
):
    """Get all WHO/CPCB violation records"""
    if who_only:
        condition = "exceeds_who = TRUE"
    elif cpcb_only:
        condition = "exceeds_cpcb = TRUE"
    else:
        condition = (
            "exceeds_who = TRUE "
            "OR exceeds_cpcb = TRUE"
        )
    result = db.execute(text(f"""
        SELECT * FROM emission_records
        WHERE {condition}
        ORDER BY timestamp DESC
        LIMIT :limit
    """), {"limit": limit})
    cols = result.keys()
    return [dict(zip(cols, row))
            for row in result.fetchall()]
