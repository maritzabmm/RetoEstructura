import type { HourRow } from "@/lib/api"

type Props = { data: HourRow[] }

export default function ForecastTable({ data }: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5 flex flex-col h-full">
      <h2 className="text-base font-bold mb-3 flex-shrink-0">Hourly Forecast</h2>
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 220 }}>
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left border-b">
              <th className="pb-1 text-gray-500 font-semibold">Hour</th>
              <th className="pb-1 text-gray-500 font-semibold">Demand</th>
              <th className="pb-1 text-gray-500 font-semibold">Staff</th>
              <th className="pb-1 text-gray-500 font-semibold">Arrivals</th>
              <th className="pb-1 text-gray-500 font-semibold">Dep.</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={idx} className="border-b last:border-0">
                <td className="py-1 font-mono text-xs">{row.hour}</td>
                <td className="py-1">{row.demand}</td>
                <td className="py-1">{row.staff}</td>
                <td className="py-1 text-green-600">{row.arrivals}</td>
                <td className="py-1 text-orange-500">{row.departures}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
