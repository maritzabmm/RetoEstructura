"use client"

import { useRef, useEffect, useState } from "react"

type HourData = {
  hour: string
  demand: number
  staff: number
  arrivals: number
  departures: number
}

type Props = {
  data: HourData[]
  currentHour: number
}

function StaffIcons({ count }: { count: number }) {
  const show = Math.min(count, 5)
  return (
    <div className="flex flex-wrap justify-center gap-0.5 my-2 min-h-[24px]">
      {Array.from({ length: show }).map((_, i) => (
        <svg key={i} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="7" r="4" />
          <path d="M5.5 21a8.38 8.38 0 0 1 13 0" />
        </svg>
      ))}
      {count > 5 && (
        <span className="text-xs font-bold self-center">+{count - 5}</span>
      )}
    </div>
  )
}

export default function HourlyCarousel({ data, currentHour }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)

  useEffect(() => {
    const idx = data.findIndex(d => parseInt(d.hour) === currentHour)
    const target = idx >= 0 ? idx : 0
    const el = scrollRef.current

    // Center the active card
    requestAnimationFrame(() => {
      setActiveIdx(target)
      if (!el) return
      const cards = el.querySelectorAll<HTMLElement>("[data-card]")
      const card = cards[target]
      if (!card) return
      const cardLeft = card.offsetLeft
      const cardWidth = card.offsetWidth
      const elWidth = el.offsetWidth
      el.scrollTo({ left: cardLeft - elWidth / 2 + cardWidth / 2, behavior: "smooth" })
    })
  }, [currentHour, data])

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const cards = el.querySelectorAll<HTMLElement>("[data-card]")
    let closest = 0
    let minDist = Infinity
    const center = el.scrollLeft + el.offsetWidth / 2
    cards.forEach((card, i) => {
      const dist = Math.abs(card.offsetLeft + card.offsetWidth / 2 - center)
      if (dist < minDist) { minDist = dist; closest = i }
    })
    setActiveIdx(closest)
  }

  return (
    <div className="w-full overflow-hidden">
      {/* Cards — overflow hidden on container, scroll only inside */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex gap-3 overflow-x-auto pb-3"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          // Snap for nice UX
          scrollSnapType: "x mandatory",
        }}
      >
        {data.map((row) => {
          const isNow  = currentHour >= 0 && parseInt(row.hour) === currentHour
          const isPast = currentHour >= 0 && parseInt(row.hour) < currentHour

          return (
            <div
              key={row.hour}
              data-card
              className="flex-shrink-0 flex flex-col items-center rounded-2xl p-3 transition-all duration-200"
              style={{
                // 20% of container = ~5 visible cards
                width: "calc(20% - 10px)",
                minWidth: 120,
                scrollSnapAlign: "center",
                background: isNow
                  ? "linear-gradient(135deg, #C8102E, #a00d24)"
                  : isPast ? "#e5e7eb" : "#ffffff",
                color: isNow ? "white" : isPast ? "#9ca3af" : "#111827",
                boxShadow: isNow
                  ? "0 8px 24px rgba(200,16,46,0.3)"
                  : "0 1px 4px rgba(0,0,0,0.07)",
                opacity: isPast ? 0.55 : 1,
              }}
            >
              {isNow && (
                <span
                  className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full mb-1"
                  style={{ background: "rgba(255,255,255,0.2)" }}
                >
                  Ahora
                </span>
              )}

              <p className="text-lg font-black leading-none">{row.hour}</p>

              <StaffIcons count={row.staff} />

              <p className="text-2xl font-black leading-none">{row.staff}</p>
              <p
                className="text-[10px] font-bold uppercase tracking-wide mb-2 text-center"
                style={{ color: isNow ? "rgba(255,255,255,0.7)" : "#9ca3af" }}
              >
                Staff req.
              </p>

              <div
                className="w-full rounded-xl p-2 text-[11px] space-y-0.5"
                style={{
                  background: isNow ? "rgba(255,255,255,0.15)" : "#f9fafb",
                  color: isNow ? "white" : "#374151",
                }}
              >
                <div className="flex justify-between gap-1">
                  <span className="font-medium truncate">Arrivals</span>
                  <span className="font-bold">{row.arrivals}</span>
                </div>
                <div className="flex justify-between gap-1">
                  <span className="font-medium truncate">Departures</span>
                  <span className="font-bold">{row.departures}</span>
                </div>
                <div
                  className="flex justify-between gap-1 pt-1 border-t font-bold"
                  style={{ borderColor: isNow ? "rgba(255,255,255,0.25)" : "#e5e7eb" }}
                >
                  <span>Total</span>
                  <span>{row.arrivals + row.departures}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-2 flex-wrap">
        {data.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              const el = scrollRef.current
              if (!el) return
              const cards = el.querySelectorAll<HTMLElement>("[data-card]")
              const card = cards[i]
              if (!card) return
              el.scrollTo({
                left: card.offsetLeft - el.offsetWidth / 2 + card.offsetWidth / 2,
                behavior: "smooth",
              })
              setActiveIdx(i)
            }}
            className="rounded-full transition-all duration-200"
            style={{
              width: i === activeIdx ? 18 : 5,
              height: 5,
              background: i === activeIdx ? "#C8102E" : "#d1d5db",
            }}
          />
        ))}
      </div>
    </div>
  )
}
