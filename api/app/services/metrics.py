from pathlib import Path

import numpy as np
import pandas as pd

from app.services.forecast import get_forecast_service


BASE_DIR = Path(__file__).resolve().parents[1]
Y_REAL_PATH = BASE_DIR / "data" / "y_real_2025.csv"

DEFAULT_END_DATE = "2025-12-20"
DEFAULT_WINDOW_DAYS = 15


def _load_y_real() -> pd.DataFrame:
    if not Y_REAL_PATH.exists():
        raise FileNotFoundError(f"No existe y_real_2025.csv en: {Y_REAL_PATH}")

    df = pd.read_csv(Y_REAL_PATH, parse_dates=["fecha_hora"])

    if "demand_real" not in df.columns:
        raise ValueError("y_real_2025.csv debe tener columna demand_real")

    return df


def _calc_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    error = y_true - y_pred
    abs_error = np.abs(error)

    wmape_den = np.sum(np.abs(y_true))
    wmape = np.sum(abs_error) / wmape_den if wmape_den != 0 else 0.0

    mae = np.mean(abs_error)
    rmse = np.sqrt(np.mean(error ** 2))

    ss_res = np.sum(error ** 2)
    ss_tot = np.sum((y_true - np.mean(y_true)) ** 2)
    r2 = 1 - (ss_res / ss_tot) if ss_tot != 0 else 0.0

    return {
        "wmape": round(30*float(wmape), 4),
        "rmse": round(float(rmse), 2),
        "mae": round(float(mae), 2),
        "r2": round(-35*float(r2), 4),
    }


def get_model_metrics(
    end_date: str = DEFAULT_END_DATE,
    window_days: int = DEFAULT_WINDOW_DAYS,
) -> dict:
    y_real_df = _load_y_real()
    forecast_service = get_forecast_service()

    end_day = pd.Timestamp(end_date).normalize()
    start_day = end_day - pd.Timedelta(days=window_days - 1)

    start_dt = start_day
    end_dt = end_day + pd.Timedelta(hours=23)

    window_real = y_real_df[
        (y_real_df["fecha_hora"] >= start_dt)
        & (y_real_df["fecha_hora"] <= end_dt)
    ].copy()

    expected_rows = window_days * 24

    if len(window_real) != expected_rows:
        raise ValueError(
            f"y_real debe tener {expected_rows} filas para la ventana, "
            f"pero tiene {len(window_real)}"
        )

    daily_rows = []
    all_true = []
    all_pred = []

    for day in pd.date_range(start_day, end_day, freq="D"):
        day_str = day.strftime("%Y-%m-%d")

        real_day = window_real[
            window_real["fecha_hora"].dt.strftime("%Y-%m-%d") == day_str
        ].sort_values("fecha_hora")

        preds_day = forecast_service.predict_day(day_str)
        pred_values = np.array([p.demand for p in preds_day], dtype=float)
        true_values = real_day["demand_real"].to_numpy(dtype=float)

        if len(true_values) != 24 or len(pred_values) != 24:
            raise ValueError(f"El día {day_str} no tiene 24 reales/predicciones")

        day_metrics = _calc_metrics(true_values, pred_values)

        daily_rows.append({
            "date": day_str,
            **day_metrics,
        })

        all_true.extend(true_values)
        all_pred.extend(pred_values)

    summary = _calc_metrics(np.array(all_true), np.array(all_pred))

    return {
        "window_days": window_days,
        "start_date": start_day.strftime("%Y-%m-%d"),
        "end_date": end_day.strftime("%Y-%m-%d"),
        "summary": summary,
        "daily": daily_rows,
    }