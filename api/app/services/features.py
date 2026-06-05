"""
features.py
Genera el dataframe de features para inferencia — misma lógica que el notebook.
"""
import numpy as np
import pandas as pd
from datetime import datetime, timedelta


def build_inference_features(target_date: str, cluster_cols: list[str]) -> pd.DataFrame:
    """
    Crea 24 filas (una por hora) con las features temporales + dummies de cluster.
    target_date: "2025-06-04"
    cluster_cols: ["cluster_0", "cluster_1", ...] — orden exacto del modelo entrenado
    """
    base = datetime.strptime(target_date, "%Y-%m-%d")
    fechas = [base + timedelta(hours=h) for h in range(24)]

    df = pd.DataFrame({"fecha_hora": fechas}).set_index("fecha_hora")

    df["hora"]          = df.index.hour
    df["dia_semana"]    = df.index.dayofweek
    df["dia_mes"]       = df.index.day
    df["mes"]           = df.index.month
    df["anio"]          = df.index.year
    df["dia_anio"]      = df.index.dayofyear
    df["semana_anio"]   = df.index.isocalendar().week.astype(int)
    df["es_fin_semana"] = (df["dia_semana"] >= 5).astype(int)

    # Cíclicas
    df["hora_sin"]       = np.sin(2 * np.pi * df["hora"] / 24)
    df["hora_cos"]       = np.cos(2 * np.pi * df["hora"] / 24)
    df["dia_semana_sin"] = np.sin(2 * np.pi * df["dia_semana"] / 7)
    df["dia_semana_cos"] = np.cos(2 * np.pi * df["dia_semana"] / 7)
    df["mes_sin"]        = np.sin(2 * np.pi * df["mes"] / 12)
    df["mes_cos"]        = np.cos(2 * np.pi * df["mes"] / 12)

    # Cluster dummies en 0 (el modelo usa el patrón temporal)
    for col in cluster_cols:
        df[col] = 0

    return df.reset_index()
