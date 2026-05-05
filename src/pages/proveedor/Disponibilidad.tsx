import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { fetchAvailabilityRules, saveAvailabilityRule, type AvailabilityRule } from "@/lib/appointments-api";

const DAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DEFAULT_HOURS = [
  { weekday: 1, start_time: "09:00", end_time: "18:00", is_active: true },
  { weekday: 2, start_time: "09:00", end_time: "18:00", is_active: true },
  { weekday: 3, start_time: "09:00", end_time: "18:00", is_active: true },
  { weekday: 4, start_time: "09:00", end_time: "18:00", is_active: true },
  { weekday: 5, start_time: "09:00", end_time: "18:00", is_active: true },
];

export default function ProveedorDisponibilidad() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["availability-rules"],
    queryFn: fetchAvailabilityRules,
  });

  const saveMutation = useMutation({
    mutationFn: saveAvailabilityRule,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["availability-rules"] }),
  });

  const rules = data?.rules ?? [];

  function ruleForDay(weekday: number): AvailabilityRule | undefined {
    return rules.find((r) => r.weekday === weekday);
  }

  function toggleDay(weekday: number) {
    const existing = ruleForDay(weekday);
    const def = DEFAULT_HOURS.find((d) => d.weekday === weekday);
    if (existing) {
      saveMutation.mutate({ ...existing, is_active: !existing.is_active });
    } else if (def) {
      saveMutation.mutate(def);
    } else {
      saveMutation.mutate({ weekday, start_time: "09:00", end_time: "18:00", is_active: true });
    }
  }

  function updateTime(weekday: number, field: "start_time" | "end_time", value: string) {
    const existing = ruleForDay(weekday);
    if (existing) saveMutation.mutate({ ...existing, [field]: value });
  }

  return (
    <AppShell
      title="Disponibilidad semanal"
      navLinks={[
        { to: "/proveedor", label: "Panel" },
        { to: "/proveedor/estadisticas", label: "Estadísticas" },
      ]}
    >
      <div className="space-y-3">
        <p className="text-sm text-white/30 mb-5">
          Activa los días que atiendes y define tu horario de inicio y cierre.
        </p>

        {isLoading ? (
          <p className="text-center py-12 text-white/20 text-sm">Cargando...</p>
        ) : (
          [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
            const rule = ruleForDay(weekday);
            const active = rule?.is_active ?? false;

            return (
              <div
                key={weekday}
                className={`glass rounded-2xl p-4 transition-all ${!active ? "opacity-40" : "hover:border-white/15"}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-medium text-sm ${active ? "text-white" : "text-white/40"}`}>
                    {DAYS[weekday]}
                  </span>

                  <div className="flex items-center gap-4">
                    {active && rule && (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={rule.start_time}
                          onChange={(e) => updateTime(weekday, "start_time", e.target.value)}
                          className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400/50 transition-all"
                        />
                        <span className="text-white/20 text-xs">→</span>
                        <input
                          type="time"
                          value={rule.end_time}
                          onChange={(e) => updateTime(weekday, "end_time", e.target.value)}
                          className="bg-white/[0.06] border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-400/50 transition-all"
                        />
                      </div>
                    )}

                    {/* Toggle */}
                    <button
                      onClick={() => toggleDay(weekday)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        active ? "bg-blue-500" : "bg-white/10"
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
                          active ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AppShell>
  );
}
