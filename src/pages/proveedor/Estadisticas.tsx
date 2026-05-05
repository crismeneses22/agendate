import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CalendarClock,
  Clock3,
  DollarSign,
  Lightbulb,
  PieChart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import {
  fetchProviderStats,
  type ProviderStatsScope,
  type ProviderStatsService,
} from "@/lib/appointments-api";

const PERIODS = [
  { key: "day", label: "Día" },
  { key: "month", label: "Mes" },
  { key: "year", label: "Año" },
] as const;

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

function money(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function compact(value: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value);
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "blue",
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Activity;
  tone?: "blue" | "green" | "amber" | "rose" | "violet";
}) {
  const tones = {
    blue: "text-blue-300 bg-blue-400/10 border-blue-400/15",
    green: "text-emerald-300 bg-emerald-400/10 border-emerald-400/15",
    amber: "text-amber-300 bg-amber-400/10 border-amber-400/15",
    rose: "text-rose-300 bg-rose-400/10 border-rose-400/15",
    violet: "text-violet-300 bg-violet-400/10 border-violet-400/15",
  };

  return (
    <div className="glass rounded-2xl p-4 min-h-[132px]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs uppercase tracking-wider text-white/35">{label}</p>
        <span className={`shrink-0 border rounded-xl p-2 ${tones[tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold text-white tracking-tight">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-white/35">{hint}</p>
    </div>
  );
}

function MiniBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="text-white/45 truncate">{label}</span>
        <span className="text-white/25">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ServiceRow({ service, max }: { service: ProviderStatsService; max: number }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{service.name}</p>
          <p className="text-xs text-white/30">
            {service.duration_minutes} min · {service.price !== null ? money(service.price) : "Sin precio"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-white">{service.total}</p>
          <p className="text-[11px] text-white/30">{compact(service.share)}%</p>
        </div>
      </div>
      <div className="mt-3">
        <MiniBar label={`${service.confirmed + service.completed} confirmadas/completadas`} value={service.total} max={max} />
      </div>
    </div>
  );
}

function InsightPanel({ scope }: { scope: ProviderStatsScope }) {
  const maxService = Math.max(1, ...scope.services.map((s) => s.total));
  const maxHour = Math.max(1, ...scope.top_hours.map((h) => h.total));
  const maxWeekday = Math.max(1, ...scope.weekdays.map((d) => d.total));
  const topServices = scope.services.slice(0, 5);
  const weakServices = [...scope.services]
    .filter((s) => s.is_active)
    .sort((a, b) => a.total - b.total || a.name.localeCompare(b.name))
    .slice(0, 4);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-4 w-4 text-blue-300" />
          <h2 className="text-sm font-semibold text-white">Servicios más pedidos</h2>
        </div>
        {topServices.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/25">Aún no hay servicios para analizar.</p>
        ) : (
          <div className="space-y-3">
            {topServices.map((service) => (
              <ServiceRow key={service.id} service={service} max={maxService} />
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown className="h-4 w-4 text-amber-300" />
          <h2 className="text-sm font-semibold text-white">Servicios con menor demanda</h2>
        </div>
        {weakServices.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/25">Aún no hay servicios activos para comparar.</p>
        ) : (
          <div className="space-y-3">
            {weakServices.map((service) => (
              <ServiceRow key={service.id} service={service} max={maxService} />
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock3 className="h-4 w-4 text-violet-300" />
          <h2 className="text-sm font-semibold text-white">Horas más solicitadas</h2>
        </div>
        {scope.top_hours.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/25">Sin reservas en este periodo.</p>
        ) : (
          <div className="space-y-3">
            {scope.top_hours.map((hour) => (
              <MiniBar
                key={hour.hour}
                label={`${String(hour.hour).padStart(2, "0")}:00`}
                value={hour.total}
                max={maxHour}
              />
            ))}
          </div>
        )}
      </section>

      <section className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <CalendarClock className="h-4 w-4 text-emerald-300" />
          <h2 className="text-sm font-semibold text-white">Días con más reservas</h2>
        </div>
        {scope.weekdays.length === 0 ? (
          <p className="py-8 text-center text-sm text-white/25">Sin reservas en este periodo.</p>
        ) : (
          <div className="space-y-3">
            {scope.weekdays.map((day) => (
              <MiniBar key={day.weekday} label={WEEKDAYS[day.weekday]} value={day.total} max={maxWeekday} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default function ProveedorEstadisticas() {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]["key"]>("month");
  const { data, isLoading } = useQuery({
    queryKey: ["provider-stats"],
    queryFn: fetchProviderStats,
  });

  const scope = data?.scopes[period];
  const trendMax = useMemo(() => Math.max(1, ...(scope?.trend.map((p) => p.total) ?? [1])), [scope]);

  return (
    <AppShell
      title="Estadísticas"
      wide
      navLinks={[
        { to: "/proveedor", label: "Panel" },
        { to: "/proveedor/servicios", label: "Servicios" },
        { to: "/proveedor/disponibilidad", label: "Horarios" },
      ]}
    >
      <div className="space-y-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                period === p.key
                  ? "bg-white text-black"
                  : "text-white/40 border border-white/10 hover:border-white/25 hover:text-white/70"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading || !scope ? (
          <p className="text-center py-16 text-white/20 text-sm">Cargando estadísticas...</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Reservas"
                value={String(scope.kpis.total_appointments)}
                hint={`${scope.kpis.pending} pendientes · ${scope.kpis.confirmed} confirmadas`}
                icon={Activity}
              />
              <KpiCard
                label="Clientes"
                value={String(scope.kpis.unique_clients)}
                hint="Clientes únicos entre cuentas e invitados"
                icon={Users}
                tone="green"
              />
              <KpiCard
                label="Ingreso estimado"
                value={money(scope.kpis.estimated_revenue)}
                hint="Solo citas confirmadas y completadas con precio"
                icon={DollarSign}
                tone="violet"
              />
              <KpiCard
                label="Ocupación"
                value={`${compact(scope.kpis.utilization_rate)}%`}
                hint={`${compact(scope.kpis.active_appointments)} citas activas de ${scope.kpis.capacity_slots} cupos estimados`}
                icon={PieChart}
                tone="amber"
              />
              <KpiCard
                label="Completadas"
                value={String(scope.kpis.completed)}
                hint={`${compact(scope.kpis.productive_hours)} horas productivas registradas`}
                icon={Sparkles}
                tone="blue"
              />
              <KpiCard
                label="Cancelación"
                value={`${compact(scope.kpis.cancellation_rate)}%`}
                hint={`${scope.kpis.cancelled} canceladas en el periodo`}
                icon={TrendingDown}
                tone="rose"
              />
              <KpiCard
                label="No asistencias"
                value={`${compact(scope.kpis.no_show_rate)}%`}
                hint={`${scope.kpis.no_show} marcadas como no se presentó`}
                icon={Clock3}
                tone="amber"
              />
              <KpiCard
                label="Promedio"
                value={`${compact(scope.kpis.avg_duration_minutes)} min`}
                hint={`${compact(scope.kpis.available_hours)} horas disponibles según tus horarios`}
                icon={CalendarClock}
                tone="green"
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="glass rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-white/35">Más pedido</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {scope.most_requested_service?.name ?? "Sin datos suficientes"}
                </p>
                <p className="mt-1 text-xs text-white/35">
                  {scope.most_requested_service
                    ? `${scope.most_requested_service.total} reservas · ${compact(scope.most_requested_service.share)}% del periodo`
                    : "Aparecerá cuando exista al menos una reserva."}
                </p>
              </div>
              <div className="glass rounded-2xl p-4">
                <p className="text-xs uppercase tracking-wider text-white/35">Menos pedido</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {scope.least_requested_service?.name ?? "Sin servicios activos"}
                </p>
                <p className="mt-1 text-xs text-white/35">
                  {scope.least_requested_service
                    ? `${scope.least_requested_service.total} reservas · oportunidad para ajustar oferta`
                    : "Crea servicios activos para poder comparar demanda."}
                </p>
              </div>
            </div>

            <section className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-white">Movimiento del periodo</h2>
                  <p className="text-xs text-white/30">{scope.label}</p>
                </div>
                {scope.most_requested_service && (
                  <span className="text-xs text-blue-300 border border-blue-400/15 bg-blue-400/10 rounded-full px-3 py-1">
                    Top: {scope.most_requested_service.name}
                  </span>
                )}
              </div>
              {scope.trend.length === 0 ? (
                <p className="py-8 text-center text-sm text-white/25">Sin reservas en este periodo.</p>
              ) : (
                <div className="flex items-end gap-2 h-32 overflow-x-auto pb-1">
                  {scope.trend.map((point) => {
                    const height = Math.max(8, (point.total / trendMax) * 112);
                    return (
                      <div key={point.bucket} className="min-w-8 flex-1 flex flex-col items-center justify-end gap-2">
                        <span className="text-[11px] text-white/35">{point.total}</span>
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-blue-500 to-violet-400"
                          style={{ height }}
                        />
                        <span className="text-[10px] text-white/25 whitespace-nowrap">
                          {point.bucket.slice(period === "year" ? 5 : 8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <InsightPanel scope={scope} />

            <section className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-4 w-4 text-amber-300" />
                <h2 className="text-sm font-semibold text-white">Sugerencias útiles</h2>
              </div>
              <div className="grid gap-3">
                {(data?.suggestions ?? []).map((item) => (
                  <div key={`${item.title}-${item.impact}`} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <span className="shrink-0 text-[11px] text-amber-200 border border-amber-400/15 bg-amber-400/10 rounded-full px-2 py-0.5">
                        {item.impact}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-white/38">{item.body}</p>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </AppShell>
  );
}
