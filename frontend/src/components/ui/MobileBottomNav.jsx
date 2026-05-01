import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingUp, LineChart, FileText } from 'lucide-react'

const navItems = [
  { to: '/dashboard',   icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/forecast',    icon: TrendingUp,       label: 'Forecast'  },
  { to: '/investments', icon: LineChart,         label: 'Invest'    },
  { to: '/reports',     icon: FileText,          label: 'Reports'   },
]

export function MobileBottomNav() {
  return (
    <nav
      className="sm:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Frosted glass background */}
      <div className="mx-3 mb-3 rounded-2xl bg-bg/80 backdrop-blur-xl border border-border shadow-xl shadow-black/20">
        <div className="flex items-center justify-around px-1 py-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'text-primary bg-primary/15 scale-105'
                    : 'text-text-secondary active:scale-95'
                }`
              }
            >
              <Icon className="w-5 h-5" strokeWidth={isActive => isActive ? 2.5 : 1.8} />
              <span className="text-[10px] font-bold tracking-wide">{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
