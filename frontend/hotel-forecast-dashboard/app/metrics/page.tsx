"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import { metricsHistory } from "@/data/metricsHistory"
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts"

type MetricKey = "wmape" | "rmse" | "r2" | "mae"

const metricConfig: Record<MetricKey, {
  label: string
  color: string
  description: string
  lowerIsBetter: boolean
  format: (v: number) => string
}> = {
  wmape: { label: "WMAPE", color: "#C8102E", description: "Error porcentual ponderado",       lowerIsBetter: true,  format: v => v.toFixed(2) },
  rmse:  { label: "RMSE",  color: "#2563eb", description: "Raíz del error cuadrático medio",  lowerIsBetter: true,  format: v => v.toFixed(1) },
  r2:    { label: "R²",    color: "#16a34a", description: "Coeficiente de determinación",     lowerIsBetter: false, format: v => v.toFixed(2) },
  mae:   { label: "MAE",   color: "#d97706", description: "Error absoluto medio",             lowerIsBetter: true,  format: v => v.toFixed(1) },
}

function TrendBadge({ current, previous, lowerIsBetter }: { current: number; previous: number; lowerIsBetter: boolean }) {
  const diff = current - previous
  const pct = Math.abs((diff / previous) * 100).toFixed(1)
  const improved = lowerIsBetter ? diff < 0 : diff > 0
  const neutral = Math.abs(diff) < 0.001

  if (neutral) return <span className="flex items-center gap-1 text-xs font-bold text-gray-400">→ Sin cambio</span>

  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${improved ? "text-green-600" : "text-red-500"}`}>
      <span className="text-sm">{improved ? "↑" : "↓"}</span>
      {pct}% {improved ? "mejor" : "peor"} vs hace 7 días
    </span>
  )
}

export default function MetricsPage() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("wmape")
  const cfg = metricConfig[activeMetric]

  const current  = metricsHistory[metricsHistory.length - 1]
  const previous = metricsHistory[metricsHistory.length - 2]
  const weekAgo  = metricsHistory[metricsHistory.length - 8]

  const summaryMetrics: MetricKey[] = ["wmape", "rmse", "r2", "mae"]

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-w-0">

        <div className="flex-shrink-0">
          <h1 className="text-2xl font-black text-gray-900">Model Metrics</h1>
          <p className="text-sm text-gray-400">Últimos 15 días de performance del modelo</p>
        </div>

        {/* Cards con tendencia — clic para cambiar métrica en la gráfica */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {summaryMetrics.map(key => {
            const c = metricConfig[key]
            const val = current[key]
            const prev = previous[key]
            const diff = val - prev
            const improved = c.lowerIsBetter ? diff < 0 : diff > 0
            const neutral = Math.abs(diff) < 0.001
            const pct = Math.abs((diff / prev) * 100).toFixed(1)
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
                <p className="text-[10px] font-black uppercase tracking-widest mb-1"
                   style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>
                  {c.label}
                </p>
                <p className="text-3xl font-black mb-1">{c.format(val)}</p>
                <p className="text-[10px] mb-2" style={{ color: isActive ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>
                  {c.description}
                </p>
                {neutral ? (
                  <span className="text-xs font-bold" style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>
                    → Sin cambio vs ayer
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold"
                    style={{ color: isActive ? "white" : improved ? "#16a34a" : "#ef4444" }}>
                    <span className="text-sm">{improved ? "↑" : "↓"}</span>
                    {pct}% {improved ? "mejor" : "peor"} vs ayer
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Gráfica */}
        <div className="bg-white rounded-2xl shadow-sm p-5 flex flex-col flex-1 min-h-0">
          <div className="flex items-start justify-between mb-4 flex-shrink-0">
            <div>
              <h2 className="text-base font-black text-gray-900">{cfg.label} — Últimos 15 días</h2>
              <p className="text-xs text-gray-400">{cfg.description}</p>
            </div>
            <div className="p-2 px-3 rounded-xl bg-gray-50">
              <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">vs hace 7 días</p>
              <TrendBadge
                current={current[activeMetric]}
                previous={weekAgo[activeMetric]}
                lowerIsBetter={cfg.lowerIsBetter}
              />
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricsHistory} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} domain={["auto", "auto"]} />
                <Tooltip
                  formatter={(v: number) => [cfg.format(v), cfg.label]}
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

      </main>
    </div>
  )
}