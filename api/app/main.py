"""
main.py  —  FastAPI app para hotel forecast
"""
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Header, Query
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.models.schemas import (
    DayForecastRequest, DayForecastResponse,
    HourForecastRequest, HealthResponse,
)
from app.services.forecast import get_forecast_service
from app.services.cache import read_cached, write_cache


settings = get_settings()
app = FastAPI(title="Hotel Forecast API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # En prod restringe a tu dominio de Next.js
    allow_methods=["*"],
    allow_headers=["*"],
)


def _default_date() -> str:
    """Mañana si es antes de las 8pm, pasado mañana si es después."""
    now = datetime.now()
    offset = 2 if now.hour >= settings.CUTOFF_HOUR else 1
    return (date.today() + timedelta(days=offset)).isoformat()


def _resolve_date(date_value: Optional[str], target_date: Optional[str] = None) -> str:
    value = date_value or target_date
    if not value:
        return _default_date()

    normalized = value.strip().lower()
    if normalized == "today":
        return date.today().isoformat()
    if normalized == "tomorrow":
        return (date.today() + timedelta(days=1)).isoformat()
    if normalized == "yesterday":
        return (date.today() - timedelta(days=1)).isoformat()

    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail="date must be today, tomorrow, yesterday, or YYYY-MM-DD",
        ) from exc


def _require_api_key(x_api_key: Optional[str]) -> None:
    if settings.API_KEY and x_api_key != settings.API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Endpoints ─────────────────────────────────────────────────

@app.get("/health", response_model=HealthResponse)
def health():
    svc = get_forecast_service()
    return HealthResponse(
        status="ok",
        model_version=svc.get_model_version(),
        cutoff_hour=settings.CUTOFF_HOUR,
    )


@app.get("/predict/day", response_model=DayForecastResponse)
def get_day_forecast(
    date_param: Optional[str] = Query(default=None, alias="date"),
    target_date: Optional[str] = None,
):
    d = _resolve_date(date_param, target_date)

    cached = read_cached(d)
    if cached:
        cached_payload = dict(cached)
        cached_payload["source"] = "cache"
        return DayForecastResponse(**cached_payload)

    svc = get_forecast_service()
    preds = svc.predict_day(d)
    summary = _build_summary(preds)

    payload = {
        "date": d,
        "generated_at": datetime.now().isoformat(),
        "source": "on_demand",
        "predictions": [p.model_dump() for p in preds],
        "summary": summary,
    }

    write_cache(d, payload)
    return DayForecastResponse(**payload)


@app.post("/predict/day", response_model=DayForecastResponse)
def generate_day_forecast(
    req: DayForecastRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    """
    Llamado por la Azure Function a las 8pm.
    Siempre genera predicciones nuevas (ignora caché) y las guarda.
    """
    _require_api_key(x_api_key)
    d = _resolve_date(req.date)
    svc = get_forecast_service()
    preds = svc.predict_day(d)
    summary = _build_summary(preds)

    payload = {
        "date": d,
        "generated_at": datetime.now().isoformat(),
        "source": "batch_8pm",
        "predictions": [p.model_dump() for p in preds],
        "summary": summary,
    }

    write_cache(d, payload)
    return DayForecastResponse(**payload)


@app.post("/predict/hour")
def predict_single_hour(
    req: HourForecastRequest,
    x_api_key: Optional[str] = Header(default=None, alias="X-API-Key"),
):
    """Predicción on-demand para una hora específica."""
    _require_api_key(x_api_key)
    svc = get_forecast_service()
    all_preds = svc.predict_day(req.date)
    if req.hour < 0 or req.hour > 23:
        raise HTTPException(status_code=400, detail="hour must be 0-23")
    return all_preds[req.hour]


# ── Helpers ───────────────────────────────────────────────────

def _build_summary(preds) -> dict:
    return {
        "total_demand":     round(sum(p.demand for p in preds), 1),
        "total_arrivals":   sum(p.arrivals for p in preds),
        "total_departures": sum(p.departures for p in preds),
        "total_staff":      sum(p.staff for p in preds),
        "peak_hour":        max(preds, key=lambda p: p.demand).hour,
        "peak_demand":      max(p.demand for p in preds),
        "hours_pico":       sum(1 for p in preds if p.es_pico),
    }
