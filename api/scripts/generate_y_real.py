from pathlib import Path

import pandas as pd

from app.services.data_loader import _get_hourly_series


BASE_DIR = Path(__file__).resolve().parents[1]
OUTPUT_PATH = BASE_DIR / "app" / "data" / "y_real_2025.csv"

START = "2025-01-01 00:00:00"
END = "2025-12-31 23:00:00"


def main():
    series = _get_hourly_series()

    full_index = pd.date_range(START, END, freq="h")
    y_real = series.reindex(full_index, fill_value=0).copy()
    y_real.index.name = "fecha_hora"

    y_real["demand_real"] = y_real["carga_total"]

    output = y_real[["demand_real"]].reset_index()
    output.to_csv(OUTPUT_PATH, index=False)

    print(f"Archivo creado: {OUTPUT_PATH}")
    print(output.head())
    print(output.tail())


if __name__ == "__main__":
    main()