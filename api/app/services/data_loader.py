"""
data_loader.py
Lee hothsp.parquet desde Azure ML o local, construye la serie temporal
horaria y calcula los lags que necesita lgbm_residuos.pkl
"""
import os
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Optional
from functools import lru_cache

from app.core.config import get_settings

settings = get_settings()


# ── Carga del parquet ─────────────────────────────────────────

def _load_parquet() -> pd.DataFrame:
    """
    Intenta cargar hothsp.parquet en este orden:
    1. Azure ML Data Asset (producción)
    2. Ruta local relativa al proyecto (desarrollo)
    """
    # 1. Azure ML
    if settings.MLFLOW_TRACKING_URI and "azureml" in settings.MLFLOW_TRACKING_URI:
        try:
            from azure.ai.ml import MLClient
            from azure.identity import DefaultAzureCredential
            ml_client = MLClient(
                DefaultAzureCredential(),
                subscription_id=settings.AZURE_SUBSCRIPTION_ID,
                resource_group_name=settings.AZURE_RESOURCE_GROUP,
                workspace_name=settings.AZURE_WORKSPACE_NAME,
            )
            data_asset = ml_client.data.get("hotel-clustered", label="latest")
            df = pd.read_parquet(data_asset.path)
            print("[data_loader] Parquet cargado desde Azure ML")
            return df
        except Exception as e:
            print(f"[data_loader] Azure ML no disponible: {e}")

    # 2. Local — busca en varias rutas
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "azure_cloud", "data", "hothsp.parquet"),
        os.path.join(os.path.dirname(__file__), "..", "..", "data", "hothsp.parquet"),
        "azure_cloud/data/hothsp.parquet",
        "../azure_cloud/data/hothsp.parquet",
    ]
    for path in candidates:
        path = os.path.abspath(path)
        if os.path.exists(path):
            df = pd.read_parquet(path)
            print(f"[data_loader] Parquet cargado desde: {path}")
            return df

    raise FileNotFoundError("No se encontró hothsp.parquet — verifica la ruta o la conexión a Azure ML")


# ── Serie temporal horaria ────────────────────────────────────

@lru_cache(maxsize=1)
def _get_hourly_series() -> pd.DataFrame:
    """
    Transforma el parquet (1 fila = 1 reserva) en una serie temporal horaria.
    Columnas resultado: fecha_hora, arrivals, departures, carga_total
    Se cachea en memoria — se recarga al reiniciar la API.
    """
    df = _load_parquet()

    # Solo reservas hospedadas (status 50)
    df = df[df['h_status'] == '50'].copy()

    # Parsear fechas
    df['h_fec_lld'] = df['h_fec_lld'].str.strip()
    df['h_hra_lld'] = df['h_hra_lld'].str.strip().str.zfill(6)
    df['h_fec_sda'] = df['h_fec_sda'].str.strip()
    df['h_hra_sda'] = df['h_hra_sda'].str.strip().str.zfill(6)

    df['dt_lld'] = pd.to_datetime(
        df['h_fec_lld'] + df['h_hra_lld'],
        format='%Y%m%d%H%M%S', errors='coerce'
    )
    df['dt_sda'] = pd.to_datetime(
        df['h_fec_sda'] + df['h_hra_sda'],
        format='%Y%m%d%H%M%S', errors='coerce'
    )

    # Arrivals por hora
    arr = (
        df.dropna(subset=['dt_lld'])
        .assign(fecha_hora=lambda x: x['dt_lld'].dt.floor('h'))
        .groupby('fecha_hora')
        .size()
        .rename('arrivals')
    )

    # Departures por hora
    dep = (
        df.dropna(subset=['dt_sda'])
        .assign(fecha_hora=lambda x: x['dt_sda'].dt.floor('h'))
        .groupby('fecha_hora')
        .size()
        .rename('departures')
    )

    # Construir serie completa con índice horario continuo
    min_date = min(arr.index.min(), dep.index.min())
    max_date = max(arr.index.max(), dep.index.max())
    idx = pd.date_range(min_date.floor('h'), max_date.floor('h'), freq='h')

    series = pd.DataFrame(index=idx)
    series.index.name = 'fecha_hora'
    series['arrivals']    = arr.reindex(idx, fill_value=0)
    series['departures']  = dep.reindex(idx, fill_value=0)
    series['carga_total'] = series['arrivals'] + series['departures']

    print(f"[data_loader] Serie temporal: {len(series)} horas ({min_date} → {max_date})")
    return series


# ── Lags para inferencia ──────────────────────────────────────

def get_lags_for_date(target_date: str) -> dict:
    """
    Devuelve los valores históricos para las 24 horas del target_date.
    Si no hay historial suficiente, usa la media histórica por hora.
    """
    series = _get_hourly_series()
    target_dt = datetime.strptime(target_date, "%Y-%m-%d")

    result = {key: np.zeros(24) for key in [
        'lag_1', 'lag_2', 'lag_3', 'lag_4', 'lag_5', 'lag_6',
        'lag_24', 'lag_48', 'lag_72', 'lag_168',
        'media_3h', 'media_24h',
        'expected_arrivals', 'expected_departures',
        'expected_load', 'promedio_hora_dia', 'dif_1h_2h'
    ]}

    for h in range(24):
        target_ts = target_dt + timedelta(hours=h)

        def get_val(delta_h: int) -> float:
            ts = target_ts - timedelta(hours=delta_h)
            if ts in series.index:
                return float(series.loc[ts, 'carga_total'])
            return _hour_mean(series, ts.hour)

        result['lag_1'][h]   = get_val(1)
        result['lag_2'][h]   = get_val(2)
        result['lag_3'][h]   = get_val(3)
        result['lag_4'][h]   = get_val(4)
        result['lag_5'][h]   = get_val(5)
        result['lag_6'][h]   = get_val(6)
        result['lag_24'][h]  = get_val(24)
        result['lag_48'][h]  = get_val(48)
        result['lag_72'][h]  = get_val(72)
        result['lag_168'][h] = get_val(168)

        result['media_3h'][h]  = np.mean([get_val(i) for i in range(1, 4)])
        result['media_24h'][h] = np.mean([get_val(i) for i in range(1, 25)])
        result['dif_1h_2h'][h] = result['lag_1'][h] - result['lag_2'][h]

        result['expected_load'][h]       = get_val(24)
        result['expected_arrivals'][h]   = _get_arrivals(series, target_ts - timedelta(hours=24))
        result['expected_departures'][h] = _get_departures(series, target_ts - timedelta(hours=24))
        result['promedio_hora_dia'][h]   = _hour_mean(series, h)

    return result


def _hour_mean(series: pd.DataFrame, hour: int) -> float:
    subset = series[series.index.hour == hour]['carga_total']
    return float(subset.mean()) if len(subset) > 0 else 5.0


def _get_arrivals(series: pd.DataFrame, ts) -> float:
    if ts in series.index:
        return float(series.loc[ts, 'arrivals'])
    return float(series[series.index.hour == ts.hour]['arrivals'].mean() or 0)


def _get_departures(series: pd.DataFrame, ts) -> float:
    if ts in series.index:
        return float(series.loc[ts, 'departures'])
    return float(series[series.index.hour == ts.hour]['departures'].mean() or 0)