"use client"

import { useEffect, useMemo, useState } from "react"
import Sidebar from "@/components/Sidebar"
import ForecastChart from "@/components/ForecastChart"
import ForecastTable from "@/components/ForecastTable"
import HourlyCarousel from "@/components/HourlyCarousel"
import OperationsChart from "@/components/OperationsChart"
import { getDayForecast, type DayForecastResponse } from "@/lib/api"

const CUTOFF_HOUR = 20 // 8pm
const DEMO_BASE_DATE = new Date("2025-12-20T12:00:00")

type TabKey = "overview" | "charts"

type DayOption = {
  key: string
  label: string
  isToday: boolean
  locked?: boolean
}

export default function Home() {
  const now = DEMO_BASE_DATE
  const currentHour = now.getHours()
  const showTomorrow = currentHour >= CUTOFF_HOUR

  const days: DayOption[] = [
    { key: "yesterday", label: "Ayer", isToday: false },
    { key: "today", label: "Hoy", isToday: true },
    ...(showTomorrow
      ? [{ key: "tomorrow", label: "Mañana", isToday: false }]
      : [{ key: "tomorrow-locked", label: "Mañana", isToday: false, locked: true }]),
  ]

  const [selectedDay, setSelectedDay] = useState<string>("today")
  const [tab, setTab] = useState<TabKey>("overview")
  const [forecast, setForecast] = useState<DayForecastResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const active = days.find(day => day.key === selectedDay) ?? days[1]
  const activeData = useMemo(() => forecast?.predictions ?? [], [forecast])

  useEffect(() => {
    let cancelled = false

    const offset: Record<string, number> = {
      yesterday: -1,
      today: 0,
      tomorrow: 1,
      "tomorrow-locked": 0,
    }

    const apiBaseDate = new Date(DEMO_BASE_DATE)
    apiBaseDate.setDate(apiBaseDate.getDate() + (offset[selectedDay] ?? 0))
    const apiDate = apiBaseDate.toISOString().split("T")[0]

    console.log("Fetching forecast for:", apiDate)

    getDayForecast(apiDate)
      .then(data => {
        if (!cancelled) {
          setForecast(data)
          setError(null)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setForecast(null)
          setError(err instanceof Error ? err.message : "No se pudo cargar el forecast")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedDay])

  const selectDay = (key: string) => {
    setSelectedDay(key)
    setIsLoading(true)
    setError(null)
  }

  const totalArrivals = activeData.reduce((acc, row) => acc + row.arrivals, 0)
  const totalDepartures = activeData.reduce((acc, row) => acc + row.departures, 0)
  const totalDemand = activeData.reduce((acc, row) => acc + row.demand, 0)
  const totalStaff = activeData.reduce((acc, row) => acc + row.staff, 0)
  const peakHour = activeData.length > 0
    ? activeData.reduce((max, row) => row.demand > max.demand ? row : max)
    : { hour: "--:--", demand: 0 }

  const checkinData = useMemo(
    () => activeData.map(row => ({ hour: row.hour, value: row.arrivals })),
    [activeData],
  )

  const checkoutData = useMemo(
    () => activeData.map(row => ({ hour: row.hour, value: row.departures })),
    [activeData],
  )

  const baseDate = new Date(DEMO_BASE_DATE)
  const dayOffset: Record<string, number> = {
    yesterday: -1,
    today: 0,
    tomorrow: 1,
    "tomorrow-locked": 0,
  }

  baseDate.setDate(baseDate.getDate() + (dayOffset[selectedDay] ?? 0))

  const dayLabel = baseDate.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-w-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span
                className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded"
                style={{ background: "#C8102E", color: "white" }}
              >
                Live
              </span>
              <span className="text-gray-400 text-xs">
                {now.toLocaleString("es-MX", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900">Operations Dashboard</h1>
          </div>

          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
            <svg width="24" height="24" viewBox="0 0 42 42" fill="none">
              <circle cx="21" cy="21" r="20" fill="#C8102E" />
              <circle cx="21" cy="21" r="15" fill="white" />
              <text
                x="21"
                y="26"
                textAnchor="middle"
                fill="#C8102E"
                fontSize="11"
                fontWeight="800"
                fontFamily="Georgia, serif"
              >
                TCA
              </text>
            </svg>
            <div>
              <p className="text-xs font-black text-gray-800 leading-none">TCA Consulting</p>
              <p className="text-[10px] text-gray-400">Hotel Intelligence</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-shrink-0">
          {[
            { key: "overview", label: "Resumen & Forecast" },
            { key: "charts", label: "Gráficas" },
          ].map(item => (
            <button
              key={item.key}
              onClick={() => setTab(item.key as TabKey)}
              className="px-4 py-1.5 rounded-full text-sm font-bold transition-all"
              style={{
                background: tab === item.key ? "#C8102E" : "white",
                color: tab === item.key ? "white" : "#6b7280",
                boxShadow: tab === item.key ? "0 2px 8px rgba(200,16,46,0.3)" : "none",
              }}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0">
            <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col flex-shrink-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <div>
                  <h2 className="text-base font-black text-gray-900">Estimado por hora</h2>
                  <p className="text-xs text-gray-400 capitalize">
                    Forecast · {dayLabel}
                    {forecast && <span className="normal-case"> · {forecast.source}</span>}
                  </p>
                </div>

                <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
                  {days.map(day => {
                    const isSelected = day.key === selectedDay
                    const isLocked = !!day.locked

                    return (
                      <div key={day.key} className="relative group">
                        <button
                          onClick={() => !isLocked && selectDay(day.key)}
                          disabled={isLocked}
                          className="px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                          style={{
                            background: isSelected ? "#C8102E" : "transparent",
                            color: isSelected ? "white" : isLocked ? "#d1d5db" : "#374151",
                            cursor: isLocked ? "not-allowed" : "pointer",
                            boxShadow: isSelected ? "0 2px 6px rgba(0,0,0,0.15)" : "none",
                          }}
                        >
                          {isLocked && (
                            <svg
                              width="10"
                              height="10"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                            >
                              <rect x="3" y="11" width="18" height="11" rx="2" />
                              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                            </svg>
                          )}
                          {day.label}
                        </button>

                        {isLocked && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 hidden group-hover:block z-10 pointer-events-none">
                            <div className="w-2 h-2 bg-gray-800 rotate-45 mx-auto -mb-1" />
                            <div className="bg-gray-800 text-white text-[10px] rounded-lg px-3 py-2 whitespace-nowrap shadow-lg text-center leading-relaxed">
                              Predicción en proceso
                              <br />
                              <span style={{ color: "#fca5a5" }}>Disponible a las 20:00 hrs</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex-1 overflow-hidden min-h-0">
                {isLoading && (
                  <div className="h-full min-h-[170px] flex items-center justify-center text-sm font-bold text-gray-400">
                    Cargando forecast...
                  </div>
                )}

                {!isLoading && error && (
                  <div className="h-full min-h-[170px] flex items-center justify-center text-sm font-bold text-red-500 text-center px-4">
                    {error}
                  </div>
                )}

                {!isLoading && !error && (
                  <HourlyCarousel
                    data={activeData}
                    currentHour={active.isToday ? currentHour : -1}
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-3 flex-shrink-0">
              <div className="p-3 rounded-xl bg-white border border-green-100 shadow-sm">
                <p className="text-green-600 text-[10px] font-bold uppercase tracking-wide">Total Arrivals</p>
                <p className="text-2xl font-black text-green-700">{totalArrivals}</p>
                <p className="text-green-400 text-[10px] capitalize">{dayLabel}</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-orange-100 shadow-sm">
                <p className="text-orange-500 text-[10px] font-bold uppercase tracking-wide">Total Departures</p>
                <p className="text-2xl font-black text-orange-600">{totalDepartures}</p>
                <p className="text-orange-300 text-[10px] capitalize">{dayLabel}</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-blue-100 shadow-sm">
                <p className="text-blue-500 text-[10px] font-bold uppercase tracking-wide">Demanda total</p>
                <p className="text-2xl font-black text-blue-700">{Math.round(totalDemand)}</p>
                <p className="text-blue-300 text-[10px]">interacciones estimadas</p>
              </div>

              <div className="p-3 rounded-xl bg-white border border-purple-100 shadow-sm">
                <p className="text-purple-500 text-[10px] font-bold uppercase tracking-wide">Staff total est.</p>
                <p className="text-2xl font-black text-purple-700">{totalStaff}</p>
                <p className="text-purple-300 text-[10px]">personas requeridas</p>
              </div>

              <div
                className="p-3 rounded-xl text-white shadow-sm"
                style={{ background: "linear-gradient(135deg, #C8102E, #a00d24)" }}
              >
                <p className="text-red-200 text-[10px] font-bold uppercase tracking-wide">Hora pico</p>
                <p className="text-2xl font-black">{peakHour.hour}</p>
                <p className="text-red-300 text-[10px]">{peakHour.demand} interacciones</p>
              </div>
            </div>
          </div>
        )}

        {tab === "charts" && (
          <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0">
            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              <ForecastChart data={activeData} />
              <ForecastTable data={activeData} />
            </div>

            <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
              <OperationsChart
                title="Expected Check-ins"
                data={checkinData}
                dataKey="value"
                color="#16a34a"
              />
              <OperationsChart
                title="Expected Check-outs"
                data={checkoutData}
                dataKey="value"
                color="#C8102E"
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}