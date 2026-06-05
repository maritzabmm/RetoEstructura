export type HourRow = {
  hour: string
  demand: number
  staff: number
  arrivals: number
  departures: number
  prob_pico?: number
  es_pico?: boolean
  nivel_demanda?: string
  accion_staffing?: string
}

export type DayForecastResponse = {
  date: string
  generated_at: string
  source: string
  predictions: HourRow[]
  summary: {
    total_demand: number
    total_arrivals: number
    total_departures: number
    total_staff: number
    peak_hour: string
    peak_demand: number
    hours_pico: number
  }
}

export type ModelMetricDay = {
  date: string
  wmape: number
  rmse: number
  mae: number
  r2: number
}

export type ModelMetricsResponse = {
  window_days: number
  start_date: string
  end_date: string
  summary: {
    wmape: number
    rmse: number
    mae: number
    r2: number
  }
  daily: ModelMetricDay[]
}

const API_URL = "http://127.0.0.1:8000"

export async function getDayForecast(date?: string): Promise<DayForecastResponse> {
  const url = date
    ? `${API_URL}/predict/day?target_date=${date}`
    : `${API_URL}/predict/day`

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`)
  }

  return res.json()
}

export async function getModelMetrics(
  endDate = "2025-12-20",
  windowDays = 15,
): Promise<ModelMetricsResponse> {
  const url = `${API_URL}/metrics/model?end_date=${endDate}&window_days=${windowDays}`

  const res = await fetch(url, {
    method: "GET",
    cache: "no-store",
  })

  if (!res.ok) {
    throw new Error(`Metrics API error: ${res.status}`)
  }

  return res.json()
}