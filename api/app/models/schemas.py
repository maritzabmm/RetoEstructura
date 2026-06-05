from pydantic import BaseModel
from typing import Optional


class HourPrediction(BaseModel):
    hour: str
    demand: float
    staff: int
    arrivals: int
    departures: int
    prob_pico: float
    es_pico: bool
    nivel_demanda: str
    accion_staffing: str


class DayForecastRequest(BaseModel):
    date: Optional[str] = None


class DayForecastResponse(BaseModel):
    date: str
    generated_at: str
    source: str
    predictions: list[HourPrediction]
    summary: dict


class HourForecastRequest(BaseModel):
    date: str
    hour: int


class HealthResponse(BaseModel):
    status: str
    model_version: str
    cutoff_hour: int
