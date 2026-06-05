"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: "/", label: "Operations" },
    { href: "/metrics", label: "Model Metrics"},
    { href: "/business", label: "Business KPIs"},
  ]

  return (
    <div
      className="w-64 h-full flex flex-col"
      style={{ background: "linear-gradient(180deg, #C8102E 0%, #a00d24 60%, #7a0a1c 100%)" }}
    >
      {/* Logo / Brand */}
      <div className="px-6 py-7 border-b border-white/20">
        <div className="flex items-center gap-3 mb-1">
          <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="21" cy="21" r="20" fill="white" />
            <circle cx="21" cy="21" r="15" fill="#C8102E" />
            <text x="21" y="26" textAnchor="middle" fill="white" fontSize="11" fontWeight="800" fontFamily="Georgia, serif" letterSpacing="0.5">TCA</text>
          </svg>
          <div>
            <p className="text-white font-black text-lg leading-none tracking-wide">TCA</p>
            <p className="text-red-200 text-xs leading-tight mt-0.5">Consulting</p>
          </div>
        </div>
        <p className="text-white/50 text-[10px] mt-3 uppercase tracking-widest">
          Hotel Intelligence Platform
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 px-3 py-6 flex-1">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? "bg-white text-red-700 shadow-lg font-bold"
                  : "text-white/80 hover:bg-white/15 hover:text-white"
                }
              `}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-6 py-5 border-t border-white/20">
        <p className="text-white/40 text-[10px] text-center uppercase tracking-widest">
          © 2025 TCA · Hospitality Division
        </p>
      </div>
    </div>
  )
}