"""Pydantic response models."""

from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime

class EmissionRecord(BaseModel):
    id:                 int
    city:               Optional[str]
    state:              Optional[str]
    sector:             Optional[str]
    primary_pollutant:  Optional[str]
    primary_value:      Optional[float]
    co2_equivalent:     Optional[float]
    compliance_score:   Optional[int]
    exceeds_who:        Optional[bool]
    exceeds_cpcb:       Optional[bool]
    latitude:           Optional[float]
    longitude:          Optional[float]
    timestamp:          Optional[datetime]
    source:             Optional[str]
    data_quality:       Optional[str]
    blockchain_tx:      Optional[str]
    block_number:       Optional[int]
    chain_anchored:     Optional[bool]
    algo_app_id:        Optional[int]

    class Config:
        from_attributes = True

class CityCompliance(BaseModel):
    city:               str
    state:              Optional[str]
    compliance_score:   float
    avg_co2_equivalent: float
    total_records:      int
    who_violations:     int
    cpcb_violations:    int
    latest_timestamp:   Optional[datetime]
    latitude:           Optional[float]
    longitude:          Optional[float]
    risk_level:         str

class ForecastResponse(BaseModel):
    city:        str
    pollutant:   str
    model:       str
    accuracy:    float
    forecasts:   Dict[str, Any]
    risk_assessment: Dict[str, Any]

class AnomalyRecord(BaseModel):
    id:               int
    city:             Optional[str]
    primary_pollutant: Optional[str]
    primary_value:    Optional[float]
    co2_equivalent:   Optional[float]
    compliance_score: Optional[int]
    timestamp:        Optional[datetime]
    severity:         str
    blockchain_tx:    Optional[str]

class BlockchainVerification(BaseModel):
    record_id:      int
    city:           Optional[str]
    pollutant:      Optional[str]
    verified:       bool
    chain_anchored: bool
    blockchain_tx:  Optional[str]
    block_number:   Optional[int]
    algo_app_id:    Optional[int]
    explorer_url:   Optional[str]
    tx_url:         Optional[str]

class DashboardSummary(BaseModel):
    total_records:      int
    total_cities:       int
    who_violations:     int
    cpcb_violations:    int
    anomalies_detected: int
    avg_compliance:     float
    blockchain_anchored: int
    top_polluted_cities: List[Dict]
    sector_breakdown:   Dict[str, float]
    latest_timestamp:   Optional[datetime]
    ml_summary:         Dict[str, Any]
    blockchain_stats:   Dict[str, Any]

class HealthResponse(BaseModel):
    status:     str
    database:   bool
    ml_models:  bool
    blockchain: str
    records:    int
    timestamp:  datetime
