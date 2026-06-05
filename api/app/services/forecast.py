"""
forecast.py
Orquesta: cargar modelos → generar features → predecir → formatear respuesta.
"""
import json
import pickle
from datetime import datetime, date, timedelta
from typing import Optional

import numpy as np
import pandas as pd

from app.models.schemas import HourPrediction, DayForecastResponse
from app.services.features import build_inference_features
from app.core.config import get_settings

settings = get_settings()


def _staff_from_demand(demand: float) -> int:
    if demand >= 60: return 7
    if demand >= 45: return 6
    if demand >= 35: return 5
    if demand >= 25: return 4
    if demand >= 15: return 3
    if demand >= 8:  return 2
    return 1


def _nivel(demand: float) -> str:
    if demand >= 60: return "Alta"
    if demand >= 30: return "Media"
    if demand >= 10: return "Baja"
    return "Muy baja"


def _accion(demand: float, prob: float, umbral: float) -> str:
    if prob >= umbral or demand >= 60: return "Reforzar personal"
    if demand >= 30: return "Personal completo"
    if demand >= 10: return "Personal moderado"
    return "Personal mínimo"


class ForecastService:
    def __init__(self):
        self._reg_model   = None
        self._clf_model   = None
        self._cluster_cols = None
        self._umbral_pico  = 0.40
        self._model_version = "mock"

    def _load_models(self):
        """Carga los modelos desde MLflow o pickle. Lazy loading."""
        if self._reg_model is not None:
            return
        try:
            import mlflow.sklearn
            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            self._reg_model = mlflow.sklearn.load_model(
                f"models:/{settings.MODEL_NAME_REGRESSION}/{settings.MODEL_VERSION}"
            )
            self._clf_model = mlflow.sklearn.load_model(
                f"models:/{settings.MODEL_NAME_CLASSIFIER}/{settings.MODEL_VERSION}"
            )
            self._model_version = settings.MODEL_VERSION
            # cluster_cols debe estar guardado como artefacto junto al modelo
            # Por ahora usamos una lista vacía — se actualiza cuando haya modelo real
            self._cluster_cols = []
        except Exception as e:
            # Fallback: retorna predicciones simuladas si no hay modelo
            print(f"[ForecastService] No se pudo cargar modelo: {e}. Usando simulación.")
            self._reg_model   = None
            self._clf_model   = None
            self._cluster_cols = []
            self._model_version = "simulated"

    def predict_day(self, target_date: str) -> list[HourPrediction]:
        self._load_models()

        if self._reg_model is None:
            return self._simulate(target_date)

        df = build_inference_features(target_date, self._cluster_cols)
        feature_cols = [c for c in df.columns if c != "fecha_hora"]
        X = df[feature_cols]

        demand_preds = self._reg_model.predict(X).clip(min=0)
        prob_picos   = self._clf_model.predict_proba(X)[:, 1]

        results = []
        for i, (demand, prob) in enumerate(zip(demand_preds, prob_picos)):
            results.append(HourPrediction(
                hour=f"{i:02d}:00",
                demand=round(float(demand), 1),
                staff=_staff_from_demand(demand),
                arrivals=max(0, round(demand * 0.4)),
                departures=max(0, round(demand * 0.3)),
                prob_pico=round(float(prob), 3),
                es_pico=bool(prob >= self._umbral_pico),
                nivel_demanda=_nivel(demand),
                accion_staffing=_accion(demand, prob, self._umbral_pico),
            ))
        return results

    def _simulate(self, target_date: str) -> list[HourPrediction]:
        """Genera datos simulados mientras no hay modelo real."""
        import random
        random.seed(hash(target_date) % 1000)
        results = []
        for h in range(24):
            base = 10 + 30 * np.sin((h / 24) * np.pi * 2 + 1) + random.uniform(-5, 5)
            demand = max(3, base)
            prob = min(0.95, max(0.05, demand / 80))
            results.append(HourPrediction(
                hour=f"{h:02d}:00",
                demand=round(demand, 1),
                staff=_staff_from_demand(demand),
                arrivals=max(0, round(demand * 0.4)),
                departures=max(0, round(demand * 0.3)),
                prob_pico=round(prob, 3),
                es_pico=prob >= self._umbral_pico,
                nivel_demanda=_nivel(demand),
                accion_staffing=_accion(demand, prob, self._umbral_pico),
            ))
        return results

    def get_model_version(self) -> str:
        self._load_models()
        return self._model_version


# Singleton
_service: Optional[ForecastService] = None

def get_forecast_service() -> ForecastService:
    global _service
    if _service is None:
        _service = ForecastService()
    return _service
