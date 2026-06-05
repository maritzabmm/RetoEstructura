import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_CONTAINER_NAME: str = "hotel-predictions"
    MLFLOW_TRACKING_URI: str = ""
    MODEL_NAME_REGRESSION: str = "hotel-demand-hourly"
    MODEL_NAME_CLASSIFIER: str = "hotel-peak-classifier"
    MODEL_VERSION: str = "latest"
    CUTOFF_HOUR: int = 20
    HORIZON_HOURS: int = 24
    API_KEY: str = "dev-key"

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
