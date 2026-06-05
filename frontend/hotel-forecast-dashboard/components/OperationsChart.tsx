"use client"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts"

type OperationsPoint = {
  hour: string
  value: number
}

type Props = { title: string; data: OperationsPoint[]; dataKey: "value"; color: string }

export default function OperationsChart({ title, data, dataKey, color }: Props) {
  const total = data.reduce((acc, curr) => acc + curr[dataKey], 0)
  return (
    <div className="bg-white p-5 rounded-2xl shadow-md flex flex-col h-full">
      <div className="flex items-baseline justify-between mb-2 flex-shrink-0">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="text-gray-400 text-xs">Total: {total}</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={30} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
