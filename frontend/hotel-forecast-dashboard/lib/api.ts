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
  source: "cache" | "on_demand" | "batch_8pm" | string
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"

export async function getDayForecast(date: string): Promise<DayForecastResponse> {
  const url = new URL("/predict/day", API_BASE_URL)
  url.searchParams.set("date", date)

  const response = await fetch(url.toString(), {
    cache: "no-store",
  })

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || `Forecast request failed with ${response.status}`)
  }

  return response.json()
}
