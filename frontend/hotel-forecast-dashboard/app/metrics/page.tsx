"use client"

import { useEffect, useMemo, useState } from "react"
import Sidebar from "@/components/Sidebar"
import { getModelMetrics, type ModelMetricsResponse } from "@/lib/api"
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts"

type MetricKey = "wmape" | "rmse" | "r2" | "mae"

const DEMO_END_DATE = "2025-12-20"
const WINDOW_DAYS = 15

const metricConfig: Record<MetricKey, {
  label: string
  color: string
  description: string
  lowerIsBetter: boolean
  format: (v: number) => string
}> = {
  wmape: { label: "WMAPE", color: "#C8102E", description: "Error porcentual ponderado", lowerIsBetter: true, format: v => v.toFixed(2) },
  rmse: { label: "RMSE", color: "#2563eb", description: "Raíz del error cuadrático medio", lowerIsBetter: true, format: v => v.toFixed(1) },
  r2: { label: "R²", color: "#16a34a", description: "Coeficiente de determinación", lowerIsBetter: false, format: v => v.toFixed(2) },
  mae: { label: "MAE", color: "#d97706", description: "Error absoluto medio", lowerIsBetter: true, format: v => v.toFixed(1) },
}

function TrendBadge({
  current,
  previous,
  lowerIsBetter,
  label = "vs ayer",
}: {
  current: number
  previous: number
  lowerIsBetter: boolean
  label?: string
}) {
  if (!Number.isFinite(previous) || previous === 0) {
    return <span className="text-xs font-bold text-gray-400">Sin comparación</span>
  }

  const diff = current - previous
  const pct = Math.abs((diff / previous) * 100).toFixed(1)
  const improved = lowerIsBetter ? diff < 0 : diff > 0
  const neutral = Math.abs(diff) < 0.001

  if (neutral) {
    return <span className="text-xs font-bold text-gray-400">Sin cambio {label}</span>
  }

  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${improved ? "text-green-600" : "text-red-500"}`}>
      <span className="text-sm">{improved ? "↑" : "↓"}</span>
      {pct}% {improved ? "mejor" : "peor"} {label}
    </span>
  )
}

function shortDate(date: string) {
  const d = new Date(`${date}T12:00:00`)
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })
}

export default function MetricsPage() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("wmape")
  const [metrics, setMetrics] = useState<ModelMetricsResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getModelMetrics(DEMO_END_DATE, WINDOW_DAYS)
      .then(data => {
        if (!cancelled) {
          setMetrics(data)
          setError(null)
        }
      })
      .catch(err => {
        if (!cancelled) {
          setMetrics(null)
          setError(err instanceof Error ? err.message : "No se pudieron cargar métricas")
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const chartData = useMemo(() => {
    return (metrics?.daily ?? []).map(row => ({
      ...row,
      label: shortDate(row.date),
    }))
  }, [metrics])

  const cfg = metricConfig[activeMetric]
  const summaryMetrics: MetricKey[] = ["wmape", "rmse", "r2", "mae"]

  const current = metrics?.daily.at(-1)
  const previous = metrics?.daily.at(-2)
  const weekAgo = metrics?.daily.length && metrics.daily.length >= 8
    ? metrics.daily[metrics.daily.length - 8]
    : undefined

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-w-0">
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-black text-gray-900">Model Metrics</h1>
          <p className="text-sm text-gray-400">
            Últimos {WINDOW_DAYS} días de performance del modelo · hasta {DEMO_END_DATE}
          </p>
        </div>

        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-sm font-bold text-gray-400">
            Cargando métricas...
          </div>
        )}

        {!isLoading && error && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-sm font-bold text-red-500">
            {error}
          </div>
        )}

        {!isLoading && !error && metrics && current && previous && (
          <>
            <div className="grid grid-cols-4 gap-3 flex-shrink-0">
              {summaryMetrics.map(key => {
                const c = metricConfig[key]
                const val = metrics.summary[key]
                const prev = previous[key]
                const isActive = activeMetric === key

                return (
                  <button
                    key={key}
                    onClick={() => setActiveMetric(key)}
                    className="p-4 rounded-2xl text-left transition-all duration-200"
                    style={{
                      background: isActive ? c.color : "white",
                      color: isActive ? "white" : "#111827",
                      boxShadow: isActive ? `0 4px 16px ${c.color}44` : "0 1px 4px rgba(0,0,0,0.08)",
                      transform: isActive ? "scale(1.02)" : "scale(1)",
                    }}
                  >
                    <p
                      className="text-[10px] font-black uppercase tracking-widest mb-1"
                      style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af" }}
                    >
                      {c.label}
                    </p>
                    <p className="text-3xl font-black mb-1">{c.format(val)}</p>
                    <p
                      className="text-[10px] mb-2"
                      style={{ color: isActive ? "rgba(255,255,255,0.6)" : "#9ca3af" }}
                    >
                      {c.description}
                    </p>
                    <TrendBadge current={current[key]} previous={prev} lowerIsBetter={c.lowerIsBetter} />
                  </button>
                )
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col flex-1 min-h-0">
              <div className="flex items-start justify-between mb-4 flex-shrink-0">
                <div>
                  <h2 className="text-base font-black text-gray-900">
                    {cfg.label} — Últimos {WINDOW_DAYS} días
                  </h2>
                  <p className="text-xs text-gray-400">{cfg.description}</p>
                </div>

                <div className="p-2 px-3 rounded-xl bg-gray-50">
                  <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">vs hace 7 días</p>
                  {weekAgo ? (
                    <TrendBadge
                      current={current[activeMetric]}
                      previous={weekAgo[activeMetric]}
                      lowerIsBetter={cfg.lowerIsBetter}
                      label="vs hace 7 días"
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-400">Sin comparación</span>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={44} domain={["auto", "auto"]} />
                    <Tooltip
                      formatter={(value: number) => [cfg.format(value), cfg.label]}
                      labelFormatter={(_, payload) => payload?.[0]?.payload?.date ?? ""}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                    />
                    <ReferenceLine y={current[activeMetric]} stroke={cfg.color} strokeDasharray="4 4" strokeOpacity={0.4} />
                    <Line
                      type="monotone"
                      dataKey={activeMetric}
                      stroke={cfg.color}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: cfg.color, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: cfg.color }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}