import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { fetchMyAppointments, type Appointment } from "@/lib/appointments-api";

function AppointmentCard({ appt }: { appt: Appointment }) {
  return (
    <div className="glass rounded-2xl p-4 space-y-2.5 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">{appt.service_name}</p>
          <p className="text-xs text-white/35 mt-0.5">{appt.provider_name}</p>
        </div>
        <StatusBadge status={appt.status} />
      </div>
      <p className="text-xs text-white/25">
        {new Date(appt.starts_at).toLocaleDateString("es-CO", {
          weekday: "long", day: "numeric", month: "long", year: "numeric",
        })}
        {" · "}
        {new Date(appt.starts_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
      </p>
    </div>
  );
}

export default function ClienteDashboard() {
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { data, isLoading } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: fetchMyAppointments,
  });

  const now = new Date();
  const appointments = data?.appointments ?? [];
  const upcoming = appointments.filter(
    (a) => new Date(a.starts_at) >= now && !a.status.startsWith("cancelled")
  );
  const past = appointments.filter(
    (a) => new Date(a.starts_at) < now || a.status.startsWith("cancelled")
  );

  const list = tab === "upcoming" ? upcoming : past;

  return (
    <AppShell title="Mis citas">
      <div className="space-y-4">
        <Link
          to="/cliente/agendar"
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl text-sm font-semibold text-black hover:scale-[1.02] active:scale-[0.98] transition-all"
          style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
        >
          + Agendar nueva cita
        </Link>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/[0.04] rounded-2xl p-1">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t ? "bg-white/10 text-white" : "text-white/30 hover:text-white/50"
              }`}
            >
              {t === "upcoming" ? `Próximas (${upcoming.length})` : `Pasadas (${past.length})`}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center py-16 text-white/20 text-sm">Cargando...</p>
        ) : list.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-white/20 text-sm">
              {tab === "upcoming" ? "No tienes citas próximas" : "Sin historial de citas"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((appt) => <AppointmentCard key={appt.id} appt={appt} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}
