export type HourRow = {
  hour: string
  demand: number
  staff: number
  arrivals: number
  departures: number
}

function makeDay(seed: number): HourRow[] {
  return Array.from({ length: 24 }, (_, h) => {
    const base = Math.round(10 + seed * Math.sin((h / 24) * Math.PI * 2 + seed) * 8 + h * 1.2)
    const demand = Math.max(5, base + Math.round(Math.random() * 6))
    return {
      hour:       `${String(h).padStart(2, "0")}:00`,
      demand,
      staff:      demand >= 50 ? 6 : demand >= 35 ? 4 : demand >= 20 ? 3 : demand >= 10 ? 2 : 1,
      arrivals:   Math.round(demand * 0.4),
      departures: Math.round(demand * 0.3),
    }
  })
}

export const yesterdayData: HourRow[] = makeDay(1)
export const todayData: HourRow[]     = makeDay(2)
export const tomorrowData: HourRow[]  = makeDay(3)
export const dayAfterData: HourRow[]  = makeDay(4)

export const forecastData = todayData
export const modelMetrics = { wmape: 0.12, rmse: 4.3, r2: 0.89, mae: 2.1 }
export const businessKPIs = { occupancy: 78, adr: 142, revpar: 111, alos: 2.4 }

export const checkinData = [
  { hour: "00:00", value: 2  }, { hour: "03:00", value: 5  },
  { hour: "06:00", value: 8  }, { hour: "09:00", value: 15 },
  { hour: "12:00", value: 20 }, { hour: "15:00", value: 35 },
  { hour: "18:00", value: 28 }, { hour: "21:00", value: 12 },
]

export const checkoutData = [
  { hour: "00:00", value: 1  }, { hour: "03:00", value: 2  },
  { hour: "06:00", value: 5  }, { hour: "09:00", value: 30 },
  { hour: "12:00", value: 40 }, { hour: "15:00", value: 18 },
  { hour: "18:00", value: 10 }, { hour: "21:00", value: 4  },
]