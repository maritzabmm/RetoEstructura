"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"
import type { HourRow } from "@/lib/api"

type Props = { data: HourRow[] }

export default function ForecastChart({ data }: Props) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-md flex flex-col h-full">
      <h2 className="text-base font-bold mb-2 flex-shrink-0">Forecast Demand</h2>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
            <YAxis tick={{ fontSize: 10 }} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey="demand" stroke="#2563eb" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
