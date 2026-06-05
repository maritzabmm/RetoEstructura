import json
from typing import Optional
from app.core.config import get_settings

settings = get_settings()
_local_cache: dict = {}

def _use_azure() -> bool:
    conn = settings.AZURE_STORAGE_CONNECTION_STRING
    return bool(conn and "AccountName=..." not in conn and len(conn) > 10)

def read_cached(date_str: str) -> Optional[dict]:
    if not _use_azure():
        return _local_cache.get(date_str)
    try:
        from azure.storage.blob import BlobServiceClient
        client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
        blob = client.get_blob_client(container=settings.AZURE_CONTAINER_NAME, blob=f"predictions_{date_str}.json")
        return json.loads(blob.download_blob().readall())
    except Exception:
        return None

def write_cache(date_str: str, payload: dict) -> None:
    if not _use_azure():
        _local_cache[date_str] = payload
        return
    try:
        from azure.storage.blob import BlobServiceClient
        client = BlobServiceClient.from_connection_string(settings.AZURE_STORAGE_CONNECTION_STRING)
        container = client.get_container_client(settings.AZURE_CONTAINER_NAME)
        try:
            container.create_container()
        except Exception:
            pass
        blob = client.get_blob_client(container=settings.AZURE_CONTAINER_NAME, blob=f"predictions_{date_str}.json")
        blob.upload_blob(json.dumps(payload), overwrite=True)
    except Exception as e:
        print(f"[cache] Blob Storage no disponible: {e}")