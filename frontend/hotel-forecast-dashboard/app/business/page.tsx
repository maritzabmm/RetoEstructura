"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import { kpisHistory } from "@/data/kpisHistory"
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts"

type KpiKey = "occupancy" | "adr" | "revpar" | "alos"

const kpiConfig: Record<KpiKey, {
  label: string
  color: string
  description: string
  higherIsBetter: boolean
  format: (v: number) => string
}> = {
  occupancy: { label: "Occupancy", color: "#C8102E", description: "% de habitaciones ocupadas",       higherIsBetter: true, format: v => `${v}%`  },
  adr:       { label: "ADR",       color: "#2563eb", description: "Average Daily Rate por habitación", higherIsBetter: true, format: v => `$${v}`  },
  revpar:    { label: "RevPAR",    color: "#16a34a", description: "Revenue Per Available Room",        higherIsBetter: true, format: v => `$${v}`  },
  alos:      { label: "ALOS",      color: "#d97706", description: "Average Length of Stay (noches)",   higherIsBetter: true, format: v => `${v} n` },
}

function TrendBadge({ current, previous, higherIsBetter, isActive }: {
  current: number; previous: number; higherIsBetter: boolean; isActive: boolean
}) {
  const diff = current - previous
  const pct = Math.abs((diff / previous) * 100).toFixed(1)
  const improved = higherIsBetter ? diff > 0 : diff < 0
  const neutral = Math.abs(diff) < 0.01

  if (neutral) return (
    <span className="text-xs font-bold" style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af" }}>
      → Sin cambio vs ayer
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-bold"
      style={{ color: isActive ? "white" : improved ? "#16a34a" : "#ef4444" }}>
      <span className="text-sm">{improved ? "↑" : "↓"}</span>
      {pct}% {improved ? "mejor" : "peor"} vs ayer
    </span>
  )
}

function WeekTrendBadge({ current, previous, higherIsBetter }: {
  current: number; previous: number; higherIsBetter: boolean
}) {
  const diff = current - previous
  const pct = Math.abs((diff / previous) * 100).toFixed(1)
  const improved = higherIsBetter ? diff > 0 : diff < 0
  const neutral = Math.abs(diff) < 0.01

  if (neutral) return <span className="text-xs font-bold text-gray-400">→ Sin cambio</span>
  return (
    <span className={`flex items-center gap-1 text-xs font-bold ${improved ? "text-green-600" : "text-red-500"}`}>
      <span className="text-sm">{improved ? "↑" : "↓"}</span>
      {pct}% {improved ? "mejor" : "peor"} vs hace 7 días
    </span>
  )
}

export default function BusinessPage() {
  const [activeKpi, setActiveKpi] = useState<KpiKey>("occupancy")
  const cfg = kpiConfig[activeKpi]

  const current  = kpisHistory[kpisHistory.length - 1]
  const previous = kpisHistory[kpisHistory.length - 2]
  const weekAgo  = kpisHistory[kpisHistory.length - 8]

  const kpiKeys: KpiKey[] = ["occupancy", "adr", "revpar", "alos"]

  const estimatedRooms   = 100
  const estimatedRevenue = Math.round((current.occupancy / 100) * current.adr * estimatedRooms)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Business KPIs</h1>
            <p className="text-sm text-gray-400">Últimos 15 días · Haz clic en una card para ver su gráfica</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100 text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Ingreso estimado hoy</p>
            <p className="text-xl font-black text-gray-900">${estimatedRevenue.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400">{estimatedRooms} hab × {current.occupancy}% occ × ${current.adr} ADR</p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {kpiKeys.map(key => {
            const c = kpiConfig[key]
            const val = current[key]
            const prev = previous[key]
            const isActive = activeKpi === key

            return (
              <button
                key={key}
                onClick={() => setActiveKpi(key)}
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
                <p className="text-[10px] mb-2"
                   style={{ color: isActive ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>
                  {c.description}
                </p>
                <TrendBadge current={val} previous={prev} higherIsBetter={c.higherIsBetter} isActive={isActive} />
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
              <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Tendencia</p>
              <WeekTrendBadge current={current[activeKpi]} previous={weekAgo[activeKpi]} higherIsBetter={cfg.higherIsBetter} />
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kpisHistory} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={44} domain={["auto", "auto"]} />
                <Tooltip
                  formatter={(v: number) => [cfg.format(v), cfg.label]}
                  contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                />
                <ReferenceLine y={current[activeKpi]} stroke={cfg.color} strokeDasharray="4 4" strokeOpacity={0.4} />
                <Line
                  type="monotone"
                  dataKey={activeKpi}
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