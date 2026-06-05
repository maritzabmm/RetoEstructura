"""
Azure Function — Timer Trigger
Se ejecuta todos los días a las 8:00pm.
Llama a POST /predict/day para generar y cachear las predicciones del día siguiente.
"""
import logging
import os
from datetime import date, timedelta

import requests
import azure.functions as func

API_URL = os.environ["HOTEL_API_URL"]        # ej: https://hotel-forecast.azurecontainerapps.io
API_KEY = os.environ.get("HOTEL_API_KEY", "")

logger = logging.getLogger(__name__)


def main(mytimer: func.TimerRequest) -> None:
    if mytimer.past_due:
        logger.warning("Timer está atrasado — ejecutando de todas formas")

    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    logger.info(f"Generando forecast para {tomorrow}…")

    try:
        resp = requests.post(
            f"{API_URL}/predict/day",
            json={"date": tomorrow},
            headers={"X-API-Key": API_KEY},
            timeout=60,
        )
        resp.raise_for_status()
        data = resp.json()
        logger.info(
            f"Forecast generado: {len(data['predictions'])} horas, "
            f"peak={data['summary']['peak_hour']}, "
            f"demand={data['summary']['total_demand']}"
        )
    except Exception as e:
        logger.error(f"Error generando forecast: {e}")
        raise
