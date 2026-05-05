import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { AppointmentStatus } from "@/lib/appointments-api";

// ─── Dark status badge ────────────────────────────────────────────────────────
const BADGE: Record<AppointmentStatus, string> = {
  pending:               "bg-amber-400/15  text-amber-400  border-amber-400/20",
  confirmed:             "bg-green-400/15  text-green-400  border-green-400/20",
  cancelled_by_client:   "bg-white/[0.06]  text-white/35   border-white/10",
  cancelled_by_provider: "bg-rose-400/15   text-rose-400   border-rose-400/20",
  completed:             "bg-blue-400/15   text-blue-400   border-blue-400/20",
  no_show:               "bg-orange-400/15 text-orange-400 border-orange-400/20",
};
const BADGE_LABEL: Record<AppointmentStatus, string> = {
  pending:               "Pendiente",
  confirmed:             "Confirmada",
  cancelled_by_client:   "Cancelada · cliente",
  cancelled_by_provider: "Cancelada · negocio",
  completed:             "Completada",
  no_show:               "No se presentó",
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  return (
    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${BADGE[status]}`}>
      {BADGE_LABEL[status]}
    </span>
  );
}

// ─── Dark input ───────────────────────────────────────────────────────────────
export function DarkInput({
  label, type = "text", value, onChange, placeholder, min, step,
}: {
  label: string; type?: string; value: string | number;
  onChange: (v: string) => void; placeholder?: string; min?: number; step?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.08] transition-all"
      />
    </div>
  );
}

// ─── App shell (header + layout) ─────────────────────────────────────────────
interface NavLink { to: string; label: string }

export function AppShell({
  title, navLinks = [], children, wide = false,
}: {
  title: string; navLinks?: NavLink[]; children: React.ReactNode; wide?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const containerClass = wide ? "max-w-5xl" : "max-w-3xl";

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white">

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07]"
        style={{ background: "rgba(6,6,8,0.85)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)" }}>
        <div className={`${containerClass} mx-auto px-4 h-14 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-5">
            <Link to="/" className="font-bold text-base tracking-tight shrink-0">
              agen<span className="text-blue-400">date</span>
            </Link>
            {navLinks.length > 0 && (
              <nav className="flex items-center gap-1">
                {navLinks.map((l) => (
                  <Link
                    key={l.to}
                    to={l.to}
                    className="text-xs font-medium text-white/40 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/[0.06] transition-all"
                  >
                    {l.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <span className="text-xs text-white/25 hidden sm:block truncate max-w-[140px]">
                {user.name}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="text-xs text-white/30 hover:text-white border border-white/10 hover:border-white/25 px-3 py-1.5 rounded-lg transition-all"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      {/* Page title bar */}
      <div className="border-b border-white/[0.05]">
        <div className={`${containerClass} mx-auto px-4 py-5`}>
          <h1 className="text-lg font-semibold text-white">{title}</h1>
        </div>
      </div>

      {/* Content */}
      <main className={`${containerClass} mx-auto px-4 py-6`}>
        {children}
      </main>
    </div>
  );
}
