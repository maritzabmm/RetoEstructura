# Hotel Forecast — Reto Estructura

## Estructura
```
Reto_Estructura/
├── api/                          ← FastAPI (Python)
│   ├── app/
│   │   ├── main.py               ← endpoints: GET/POST /predict/day, /health
│   │   ├── core/config.py        ← variables de entorno
│   │   ├── models/schemas.py     ← tipos Pydantic
│   │   └── services/
│   │       ├── forecast.py       ← lógica de predicción (modelo real o simulado)
│   │       ├── features.py       ← genera features temporales para inferencia
│   │       └── cache.py          ← lee/escribe JSON en Azure Blob Storage
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example              ← variables para Blob, MLflow y API key
│
├── azure_cloud/
│   ├── data/hothsp.parquet       ← datos históricos
│   ├── upload_data.py            ← sube parquet a Azure ML como Data Asset
│   └── functions/
│       ├── host.json
│       ├── local.settings.json.example
│       └── daily_trigger/        ← Azure Function Timer (8pm diario)
│           ├── __init__.py       ← llama POST /predict/day
│           └── function.json     ← cron: 0 0 20 * * *
│
└── frontend/
    └── hotel-forecast-dashboard/ ← Next.js dashboard
        ├── .env.local.example
        ├── app/page.tsx          ← consume la API y renderiza el dashboard
        └── lib/api.ts            ← cliente para consumir FastAPI
```

## Cómo correr localmente

### API
```bash
cd api
pip install -r requirements.txt
cp .env.example .env   # edita con tus valores
uvicorn app.main:app --reload
# → http://localhost:8000/docs
```

### Frontend
```bash
cd frontend/hotel-forecast-dashboard
cp .env.local.example .env.local
npm install
npm run dev
# → http://localhost:3000
```

## Flujo de datos
1. **8pm diario** — Azure Function llama `POST /predict/day` → API genera predicciones → guarda en Azure Blob
2. **Cualquier hora** — Next.js llama `GET /predict/day?date=today` o `GET /predict/day?date=YYYY-MM-DD` → API lee del Blob si existe, si no predice on-demand
3. **Modelo real** — cuando tengas el modelo entrenado en MLflow, solo cambia `MLFLOW_TRACKING_URI` y `MODEL_VERSION` en `.env`

## Variables de entorno (API)
| Variable | Descripción |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Blob Storage para cachear predicciones |
| `MLFLOW_TRACKING_URI` | URI del workspace Azure ML |
| `MODEL_NAME_REGRESSION` | Nombre del modelo en MLflow Registry |
| `MODEL_NAME_CLASSIFIER` | Nombre del clasificador de picos |
| `CUTOFF_HOUR` | Hora de corte para el batch (default: 20) |
| `API_KEY` | Llave que debe mandar Azure Function en `X-API-Key` para endpoints `POST` |

## Variables de entorno (Frontend)
| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | URL pública de FastAPI, por ejemplo `http://localhost:8000` local o tu URL de Azure Container Apps |

## Variables de entorno (Azure Function)
| Variable | Descripción |
|---|---|
| `HOTEL_API_URL` | URL base de FastAPI, sin slash final |
| `HOTEL_API_KEY` | Debe coincidir con `API_KEY` en FastAPI |
| `WEBSITE_TIME_ZONE` | Usa `America/Monterrey` si quieres que el cron `0 0 20 * * *` corra a las 8pm locales |
