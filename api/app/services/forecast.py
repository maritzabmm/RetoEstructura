"""
forecast.py
Carga X_lgb.csv + lgbm_residuos.pkl, valida índice SARIMAX 2025,
suma SARIMAX base + residuos y formatea respuesta.
"""
import pickle
from pathlib import Path
from typing import Optional
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta

from app.models.schemas import HourPrediction


BASE_DIR = Path(__file__).resolve().parents[1]
MODEL_PATH = BASE_DIR / "models" / "lgbm_residuos.pkl"
SARIMAX_MODEL_PATH = BASE_DIR / "models" / "sarimax2.pkl"

DATA_PATH = BASE_DIR / "data" / "X_lgb.csv"

TEST_START = pd.Timestamp("2025-01-01 00:00:00")
TEST_END = pd.Timestamp("2025-12-31 23:00:00")
TEST_HOURS = 8760

CATEGORICAL_COLUMNS = [
    "hora",
    "dia_semana",
    "mes",
    "es_fin_semana",
    "es_quincena",
    "tipo_dia",
    "es_domingo",
    "bloque_almuerzo",
    "es_festivo",
    "domingo_mediodia",
    "vacaciones_verano",
    "vacaciones_invierno",
    "hora_pico_manana",
    "hora_pico_tarde",
    "hora_comida",
]


def _sarimax_index(fecha_hora) -> int:
    fecha = pd.Timestamp(fecha_hora)
    horas = int((fecha - TEST_START).total_seconds() // 3600)
    return horas + 1


def _staff_from_demand(demand: float) -> int:
    if demand >= 60:
        return 7
    if demand >= 45:
        return 6
    if demand >= 35:
        return 5
    if demand >= 25:
        return 4
    if demand >= 15:
        return 3
    if demand >= 8:
        return 2
    return 1


def _nivel(demand: float) -> str:
    if demand >= 60:
        return "Alta"
    if demand >= 30:
        return "Media"
    if demand >= 10:
        return "Baja"
    return "Muy baja"


def _accion(demand: float, prob: float, umbral: float) -> str:
    if prob >= umbral or demand >= 60:
        return "Reforzar personal"
    if demand >= 30:
        return "Personal completo"
    if demand >= 10:
        return "Personal moderado"
    return "Personal mínimo"


class ForecastService:
    def __init__(self):
        self._reg_model = None
        self._sarimax_model = None

        self._data = None
        self._umbral_pico = 0.40
        self._model_version = "not_loaded"

    def _load_models(self):
        """Carga LightGBM y SARIMAX una sola vez."""
        if self._reg_model is not None and self._sarimax_model is not None:
            return

        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"No se encontró el modelo LightGBM en: {MODEL_PATH}")

        if not SARIMAX_MODEL_PATH.exists():
            raise FileNotFoundError(f"No se encontró el modelo SARIMAX en: {SARIMAX_MODEL_PATH}")

        with open(MODEL_PATH, "rb") as f:
            self._reg_model = pickle.load(f)

        self._sarimax_model = joblib.load(SARIMAX_MODEL_PATH)

        self._model_version = "sarimax_plus_lgbm_residuos"

        print(f"[ForecastService] Modelo LightGBM cargado desde: {MODEL_PATH}")
        print(f"[ForecastService] Modelo SARIMAX cargado desde: {SARIMAX_MODEL_PATH}")

    def _load_data(self):
        """Carga X_lgb.csv una sola vez."""
        if self._data is not None:
            return

        if not DATA_PATH.exists():
            raise FileNotFoundError(f"No se encontró la base en: {DATA_PATH}")

        self._data = pd.read_csv(DATA_PATH, parse_dates=["fecha_hora"])
        print(f"[ForecastService] Base cargada desde: {DATA_PATH} ({len(self._data)} filas)")

    def predict_day(self, target_date: str) -> list[HourPrediction]:
        self._load_models()
        self._load_data()

        day_df = self._data[
            self._data["fecha_hora"].dt.strftime("%Y-%m-%d") == target_date
        ].copy()

        day_df = day_df.sort_values("fecha_hora")

        if day_df.empty:
            raise ValueError(f"No hay datos en X_lgb.csv para la fecha {target_date}")

        if len(day_df) != 24:
            raise ValueError(
                f"La fecha {target_date} debe tener 24 filas, pero tiene {len(day_df)}"
            )

        feature_cols = list(self._reg_model.feature_name_)
        missing_cols = [col for col in feature_cols if col not in day_df.columns]

        if missing_cols:
            raise ValueError(f"Faltan columnas para el modelo: {missing_cols}")

        X = day_df[feature_cols].copy()

        categorical_values = getattr(self._reg_model.booster_, "pandas_categorical", [])

        for col, categories in zip(CATEGORICAL_COLUMNS, categorical_values):
            if col in X.columns:
                X[col] = pd.Categorical(X[col], categories=categories)

        target_start = pd.Timestamp(f"{target_date} 00:00:00")
        target_end = pd.Timestamp(f"{target_date} 23:00:00")
        last_train_date = pd.Timestamp("2024-12-31 23:00:00")

        if target_start <= last_train_date:
            raise ValueError("La fecha debe ser posterior al final del entrenamiento SARIMAX")

        start_step = int((target_start - last_train_date).total_seconds() // 3600)
        end_step = int((target_end - last_train_date).total_seconds() // 3600)

        sarimax_all_preds = self._sarimax_model.forecast(steps=end_step)
        sarimax_all_preds = np.asarray(sarimax_all_preds, dtype=float)
        sarimax_preds = sarimax_all_preds[start_step - 1:end_step]

        if len(sarimax_preds) != 24:
            raise ValueError(f"SARIMAX devolvió {len(sarimax_preds)} predicciones, se esperaban 24")

        log_residual_preds = self._reg_model.predict(X)
        residual_preds = np.expm1(log_residual_preds)

        demand_preds = np.clip(sarimax_preds + residual_preds, 0, None)

        results = []

        for row, demand in zip(day_df.to_dict("records"), demand_preds):
            hour = pd.to_datetime(row["fecha_hora"]).strftime("%H:00")

            prob = min(0.95, max(0.05, float(demand) / 80))
            es_pico = bool(prob >= self._umbral_pico or demand >= 60)

            arrivals = int(row.get("expected_arrivals", round(demand * 0.4)))
            departures = int(row.get("expected_departures", round(demand * 0.3)))

            results.append(HourPrediction(
                hour=hour,
                demand=round(float(demand), 1),
                staff=_staff_from_demand(float(demand)),
                arrivals=max(0, arrivals),
                departures=max(0, departures),
                prob_pico=round(float(prob), 3),
                es_pico=es_pico,
                nivel_demanda=_nivel(float(demand)),
                accion_staffing=_accion(float(demand), prob, self._umbral_pico),
            ))

        return results

    def get_model_version(self) -> str:
        self._load_models()
        return self._model_version


_service: Optional[ForecastService] = None


def get_forecast_service() -> ForecastService:
    global _service

    if _service is None:
        _service = ForecastService()

    return _service