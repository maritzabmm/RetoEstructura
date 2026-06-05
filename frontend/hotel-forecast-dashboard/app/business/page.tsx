"use client"

import { useState } from "react"
import Sidebar from "@/components/Sidebar"
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine
} from "recharts"

type MetricKey = "benefit" | "netFlow" | "npv" | "payback"

const currency = (value: number) =>
  value.toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  })

const metricConfig: Record<MetricKey, {
  label: string
  color: string
  description: string
  format: (v: number) => string
}> = {
  benefit: {
    label: "Beneficio bruto anual",
    color: "#C8102E",
    description: "Escenario conservador 2022",
    format: currency,
  },
  netFlow: {
    label: "Flujo neto anual",
    color: "#2563eb",
    description: "Beneficio menos Azure",
    format: currency,
  },
  npv: {
    label: "VPN",
    color: "#16a34a",
    description: "Valor presente neto a 5 años",
    format: currency,
  },
  payback: {
    label: "Payback",
    color: "#d97706",
    description: "Periodo de recuperación",
    format: v => `${v.toFixed(2)} años`,
  },
}

const assumptions = [
  { concept: "Recepcionistas considerados", value: "8" },
  { concept: "Capacidad por recepcionista", value: "20 personas/hora" },
  { concept: "Personal mínimo por hora", value: "1 recepcionista" },
  { concept: "Salario mensual de referencia", value: "$9,852 MXN" },
  { concept: "Horas laborales mensuales", value: "192 h" },
  { concept: "Costo por hora estimado", value: "$51.31 MXN/h" },
  { concept: "Horas-persona base anuales", value: "18,432 h" },
]

const annualBenefit = [
  { year: "2022", requiredHours: 14241, optimizableHours: 4191, benefit: 215050.69 },
  { year: "2023", requiredHours: 13976, optimizableHours: 4456, benefit: 228648.50 },
  { year: "2024", requiredHours: 13675, optimizableHours: 4757, benefit: 244093.56 },
  { year: "2025", requiredHours: 13677, optimizableHours: 4755, benefit: 243990.94 },
]

const costBreakdown = [
  { concept: "Data Scientist", cost: 180000 },
  { concept: "Data Engineer", cost: 120000 },
  { concept: "Dashboard", cost: 60000 },
  { concept: "QA y pruebas", cost: 40000 },
]

const azureCosts = [
  { concept: "Azure Blob Storage", cost: 12000 },
  { concept: "Azure Function", cost: 6000 },
  { concept: "FastAPI Hosting", cost: 18000 },
  { concept: "MLflow / Storage", cost: 12000 },
]

const cashFlow = [
  { year: "0", flow: -400000, cumulative: -400000 },
  { year: "1", flow: 167050.69, cumulative: -232949.31 },
  { year: "2", flow: 167050.69, cumulative: -65898.62 },
  { year: "3", flow: 167050.69, cumulative: 101152.07 },
  { year: "4", flow: 167050.69, cumulative: 268202.76 },
  { year: "5", flow: 167050.69, cumulative: 435253.45 },
]

const summary = {
  conservativeYear: 2022,
  baseHours: 18432,
  requiredHours: 14241,
  optimizableHours: 4191,
  hourlyCost: 51.31,
  grossBenefit: 215050.69,
  initialInvestment: 400000,
  azureAnnualCost: 48000,
  netAnnualFlow: 167050.69,
  discountRate: 0.12,
  horizon: 5,
  npv: 202180.35,
  irr: 30.89,
  payback: 2.39,
  paybackMonths: 29,
}

export default function BusinessPage() {
  const [activeMetric, setActiveMetric] = useState<MetricKey>("benefit")
  const cfg = metricConfig[activeMetric]

  const cards: { key: MetricKey; value: number }[] = [
    { key: "benefit", value: summary.grossBenefit },
    { key: "netFlow", value: summary.netAnnualFlow },
    { key: "npv", value: summary.npv },
    { key: "payback", value: summary.payback },
  ]

  const activeData =
    activeMetric === "benefit"
      ? annualBenefit.map(row => ({ label: row.year, value: row.benefit }))
      : activeMetric === "netFlow"
        ? cashFlow.map(row => ({ label: `Año ${row.year}`, value: row.flow }))
        : activeMetric === "npv"
          ? cashFlow.map(row => ({ label: `Año ${row.year}`, value: row.cumulative }))
          : cashFlow.map(row => ({ label: `Año ${row.year}`, value: Number(row.year) === 0 ? 0 : Number(row.year) }))

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100">
      <Sidebar />

      <main className="flex-1 flex flex-col overflow-hidden p-6 gap-4 min-w-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-2xl font-black text-gray-900">Business KPIs</h1>
            <p className="text-sm text-gray-400">
              Impacto financiero conservador basado en staffing del Front Desk
            </p>
          </div>

          <div className="bg-white rounded-xl px-4 py-2 shadow-sm border border-gray-100 text-right">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-bold">Escenario seleccionado</p>
            <p className="text-xl font-black text-gray-900">{summary.conservativeYear}</p>
            <p className="text-[10px] text-gray-400">Menor beneficio anual estimado</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          {cards.map(({ key, value }) => {
            const item = metricConfig[key]
            const isActive = activeMetric === key

            return (
              <button
                key={key}
                onClick={() => setActiveMetric(key)}
                className="p-4 rounded-2xl text-left transition-all duration-200"
                style={{
                  background: isActive ? item.color : "white",
                  color: isActive ? "white" : "#111827",
                  boxShadow: isActive ? `0 4px 16px ${item.color}44` : "0 1px 4px rgba(0,0,0,0.08)",
                  transform: isActive ? "scale(1.02)" : "scale(1)",
                }}
              >
                <p
                  className="text-[10px] font-black uppercase tracking-widest mb-1"
                  style={{ color: isActive ? "rgba(255,255,255,0.7)" : "#9ca3af" }}
                >
                  {item.label}
                </p>
                <p className="text-3xl font-black mb-1">{item.format(value)}</p>
                <p
                  className="text-[10px]"
                  style={{ color: isActive ? "rgba(255,255,255,0.65)" : "#9ca3af" }}
                >
                  {item.description}
                </p>
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-4 flex-1 min-h-0">
          <div className="col-span-2 bg-white rounded-2xl shadow-sm p-5 flex flex-col min-h-0">
            <div className="flex items-start justify-between mb-4 flex-shrink-0">
              <div>
                <h2 className="text-base font-black text-gray-900">{cfg.label}</h2>
                <p className="text-xs text-gray-400">{cfg.description}</p>
              </div>
              <div className="p-2 px-3 rounded-xl bg-gray-50 text-right">
                <p className="text-gray-400 text-[10px] uppercase tracking-wide mb-0.5">Tasa de descuento</p>
                <p className="text-sm font-black text-gray-900">{(summary.discountRate * 100).toFixed(0)}%</p>
              </div>
            </div>

            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                {activeMetric === "benefit" ? (
                  <BarChart data={activeData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={v => `$${Math.round(Number(v) / 1000)}k`} />
                    <Tooltip
                      formatter={(v: number) => [currency(v), cfg.label]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                    />
                    <Bar dataKey="value" fill={cfg.color} radius={[8, 8, 0, 0]} />
                  </BarChart>
                ) : (
                  <LineChart data={activeData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} width={80} tickFormatter={v => activeMetric === "payback" ? `${v}` : `$${Math.round(Number(v) / 1000)}k`} />
                    <Tooltip
                      formatter={(v: number) => [activeMetric === "payback" ? `${v} años` : currency(v), cfg.label]}
                      contentStyle={{ borderRadius: 12, border: "none", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}
                    />
                    {activeMetric === "npv" && <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 4" />}
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke={cfg.color}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: cfg.color, strokeWidth: 0 }}
                      activeDot={{ r: 6, fill: cfg.color }}
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="flex flex-col gap-4 min-h-0">
            <div className="bg-white rounded-2xl shadow-sm p-5">
              <h2 className="text-base font-black text-gray-900 mb-3">Indicadores financieros</h2>
              <div className="space-y-3">
                <div className="flex justify-between gap-3">
                  <span className="text-xs text-gray-400 font-bold">Inversión inicial</span>
                  <span className="text-sm font-black text-gray-900">{currency(summary.initialInvestment)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-xs text-gray-400 font-bold">Costo anual Azure</span>
                  <span className="text-sm font-black text-gray-900">{currency(summary.azureAnnualCost)}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-xs text-gray-400 font-bold">TIR</span>
                  <span className="text-sm font-black text-green-700">{summary.irr.toFixed(2)}%</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-xs text-gray-400 font-bold">Payback aproximado</span>
                  <span className="text-sm font-black text-gray-900">{summary.paybackMonths} meses</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-5 flex-1 min-h-0 overflow-auto">
              <h2 className="text-base font-black text-gray-900 mb-3">Supuestos operativos</h2>
              <div className="space-y-2">
                {assumptions.map(item => (
                  <div key={item.concept} className="flex justify-between gap-3 border-b border-gray-100 pb-2">
                    <span className="text-xs text-gray-500">{item.concept}</span>
                    <span className="text-xs font-black text-gray-900 text-right">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black mb-2">Cálculo conservador</p>
            <p className="text-sm text-gray-600">
              {summary.baseHours.toLocaleString()} h base - {summary.requiredHours.toLocaleString()} h requeridas =
              <span className="font-black text-gray-900"> {summary.optimizableHours.toLocaleString()} h optimizables</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black mb-2">Costo por hora</p>
            <p className="text-sm text-gray-600">
              {summary.optimizableHours.toLocaleString()} h x ${summary.hourlyCost.toFixed(2)} MXN/h =
              <span className="font-black text-gray-900"> {currency(summary.grossBenefit)}</span>
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-[10px] text-gray-400 uppercase tracking-wide font-black mb-2">Lectura ejecutiva</p>
            <p className="text-sm text-gray-600">
              VPN positivo y TIR superior al 12% indican viabilidad bajo escenario conservador.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}