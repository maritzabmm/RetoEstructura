type Props = {
  title: string
  value: string | number
}

export default function MetricCard({
  title,
  value,
}: Props) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-5">
      <h3 className="text-gray-500 text-sm">
        {title}
      </h3>

      <p className="text-3xl font-bold mt-2">
        {value}
      </p>
    </div>
  )
}