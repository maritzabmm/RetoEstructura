"""
upload_data.py
Sube hothsp.parquet a Azure ML como Data Asset.

Uso:
    python upload_data.py
    python upload_data.py --version 2          # forzar versión
    python upload_data.py --path otra/ruta.parquet
"""

import argparse
from pathlib import Path

from azure.ai.ml import MLClient
from azure.ai.ml.entities import Data
from azure.ai.ml.constants import AssetTypes
from azure.identity import DefaultAzureCredential

# Configuración del workspace 
SUBSCRIPTION_ID  = "ab617193-d5db-4635-ad0f-326a49c824b2"   
RESOURCE_GROUP   = "hotel-forecast-rg"
WORKSPACE_NAME   = "hotel-forecast-ws"

ASSET_NAME       = "hothsp"
ASSET_DESCRIPTION = "Dataset principal de ocupación hotelera para forecasting"
DEFAULT_PATH     = "./data/hothsp.parquet"   

def get_next_version(ml_client: MLClient, asset_name: str) -> str:
    try:
        versions = [
            int(d.version)
            for d in ml_client.data.list(name=asset_name)
        ]
        return str(max(versions) + 1) if versions else "1"
    except Exception:
        return "1"


def main():
    parser = argparse.ArgumentParser(description="Sube parquet a Azure ML")
    parser.add_argument("--path",    default=DEFAULT_PATH, help="Ruta local al .parquet")
    parser.add_argument("--version", default=None,         help="Versión del Data Asset (auto si se omite)")
    args = parser.parse_args()

    # Verificar que el archivo existe antes de conectarse
    local_path = Path(args.path)
    if not local_path.exists():
        raise FileNotFoundError(f"No se encontró el archivo: {local_path.resolve()}")

    print(f"Archivo encontrado: {local_path.resolve()}  ({local_path.stat().st_size / 1e6:.2f} MB)")

    # Conectar al workspace
    print("Conectando a Azure ML…")
    ml_client = MLClient(
        DefaultAzureCredential(),
        subscription_id=SUBSCRIPTION_ID,
        resource_group_name=RESOURCE_GROUP,
        workspace_name=WORKSPACE_NAME,
    )

    version = args.version or get_next_version(ml_client, ASSET_NAME)
    print(f"Registrando '{ASSET_NAME}' versión {version}…")

    data_asset = Data(
        name=ASSET_NAME,
        version=version,
        description=ASSET_DESCRIPTION,
        type=AssetTypes.URI_FILE,       # URI_FILE = archivo único
        path=str(local_path),           # Azure sube el archivo automáticamente
        tags={
            "format":  "parquet",
            "project": "hotel-forecast",
        },
    )

    registered = ml_client.data.create_or_update(data_asset)

    print("\nData Asset registrado exitosamente")
    print(f"   Nombre  : {registered.name}")
    print(f"   Versión : {registered.version}")
    print(f"   URI     : {registered.path}")
    print(f"\nPara usar este asset en tu training script:")
    print(f'   ml_client.data.get("{registered.name}", version="{registered.version}")')


if __name__ == "__main__":
    main()