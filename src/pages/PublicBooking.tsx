import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  fetchPublicProvider,
  fetchPublicServices,
  fetchPublicSlots,
  publicBook,
  type BookMode,
} from "@/lib/public-api";
import type { ProviderBranding, Service, TimeSlot } from "@/lib/appointments-api";
import { DatePickerInput } from "@/components/DatePickerInput";

type Step = "servicio" | "fecha" | "datos" | "exito";

const BACKGROUND_STYLE: Record<ProviderBranding["booking_background"], string> = {
  aurora: "radial-gradient(circle at 18% 12%, rgba(96,165,250,.38), transparent 28%), radial-gradient(circle at 82% 0%, rgba(129,140,248,.32), transparent 30%), linear-gradient(135deg,#050509,#08111f 48%,#120f2a)",
  graphite: "radial-gradient(circle at 20% 10%, rgba(148,163,184,.24), transparent 28%), linear-gradient(135deg,#050505,#111827 54%,#020617)",
  sunrise: "radial-gradient(circle at 20% 10%, rgba(245,158,11,.34), transparent 28%), radial-gradient(circle at 85% 0%, rgba(244,63,94,.22), transparent 32%), linear-gradient(135deg,#09090b,#2a1208 52%,#451a03)",
  emerald: "radial-gradient(circle at 18% 12%, rgba(20,184,166,.30), transparent 28%), radial-gradient(circle at 80% 0%, rgba(34,197,94,.22), transparent 30%), linear-gradient(135deg,#03120e,#06231d 48%,#052e2b)",
  violet: "radial-gradient(circle at 18% 12%, rgba(168,85,247,.32), transparent 28%), radial-gradient(circle at 80% 0%, rgba(99,102,241,.26), transparent 32%), linear-gradient(135deg,#09090b,#17133a 48%,#2e1065)",
};

function assetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  return path;
}

function formatMoney(value: number | null) {
  if (value == null) return null;
  return `$${value.toLocaleString("es-CO")}`;
}

function formatDateLabel(date: string) {
  if (!date) return "";
  return new Date(`${date}T00:00:00`).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatTimeRange(slot: TimeSlot) {
  const start = slot.start.slice(11, 16);
  const end = slot.end.slice(11, 16);
  return `${start} - ${end}`;
}

function StepRail({ step, color }: { step: Step; color: string }) {
  const steps: { key: Step; label: string }[] = [
    { key: "servicio", label: "Servicio" },
    { key: "fecha", label: "Horario" },
    { key: "datos", label: "Datos" },
  ];
  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="grid grid-cols-3 gap-2">
      {steps.map((s, index) => {
        const active = index <= activeIndex || step === "exito";
        return (
          <div key={s.key} className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: active ? "100%" : "0%", backgroundColor: color }}
            />
          </div>
        );
      })}
    </div>
  );
}

function Hero({ provider }: { provider: ProviderBranding }) {
  return (
    <section className="relative min-h-[250px] overflow-hidden">
      <div className="absolute inset-0" style={{ background: BACKGROUND_STYLE[provider.booking_background] }} />
      {provider.booking_cover_url && (
        <img
          src={assetUrl(provider.booking_cover_url)}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/25 to-[#060608]" />
      <div className="relative max-w-4xl mx-auto px-4 pt-8 pb-10">
        <p className="text-xs text-white/45 uppercase tracking-[0.28em] mb-3">Reserva online</p>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          {provider.booking_title || provider.name}
        </h1>
        {provider.booking_description && (
          <p className="text-sm sm:text-base text-white/62 mt-4 max-w-2xl leading-relaxed">
            {provider.booking_description}
          </p>
        )}
      </div>
    </section>
  );
}

function ServiceCard({
  service,
  selected,
  color,
  onSelect,
}: {
  service: Service;
  selected: boolean;
  color: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`group w-full text-left rounded-2xl overflow-hidden border transition-all bg-white/[0.055] hover:bg-white/[0.075] ${
        selected ? "border-white/50 scale-[1.01]" : "border-white/10 hover:border-white/20"
      }`}
    >
      <div className="h-36 relative" style={{ background: `linear-gradient(135deg, ${service.color}66, #111827)` }}>
        {service.image_url && (
          <img src={assetUrl(service.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute left-4 right-4 bottom-4">
          <p className="font-semibold text-white">{service.name}</p>
          <p className="text-xs text-white/55 mt-1">
            {service.duration_minutes} min{formatMoney(service.price) ? ` · ${formatMoney(service.price)}` : ""}
          </p>
        </div>
        <div
          className="absolute top-3 right-3 w-8 h-8 rounded-full border border-white/15 flex items-center justify-center text-xs font-bold text-black"
          style={{ backgroundColor: selected ? color : "rgba(255,255,255,.72)" }}
        >
          {selected ? "✓" : "→"}
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-white/45 leading-relaxed line-clamp-3">
          {service.description || "Reserva este servicio en el horario que mejor se adapte a tu día."}
        </p>
      </div>
    </button>
  );
}

export default function PublicBooking() {
  const { providerId = "" } = useParams<{ providerId: string }>();

  const [step, setStep] = useState<Step>("servicio");
  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<TimeSlot | null>(null);
  const [mode, setMode] = useState<BookMode>("guest");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const provider = useQuery({
    queryKey: ["public-provider", providerId],
    queryFn: () => fetchPublicProvider(providerId),
    enabled: providerId.length > 0,
  });

  const providerData = provider.data?.provider;

  const services = useQuery({
    queryKey: ["public-services", providerData?.id],
    queryFn: () => fetchPublicServices(providerData!.id),
    enabled: !!providerData?.id,
  });

  const slots = useQuery({
    queryKey: ["public-slots", service?.id, date],
    queryFn: () => fetchPublicSlots(service!.id, date),
    enabled: !!service && !!date,
  });

  const availableSlots = useMemo(() => slots.data?.slots.filter((s) => s.available) ?? [], [slots.data]);
  const today = new Date().toISOString().split("T")[0];

  const bookMutation = useMutation({
    mutationFn: publicBook,
    onSuccess: () => setStep("exito"),
    onError: (err: Error) => setError(err.message),
  });

  if (provider.isLoading) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <p className="text-white/35 text-sm">Cargando experiencia...</p>
      </div>
    );
  }

  if (!providerData) {
    return (
      <div className="min-h-screen bg-[#060608] flex items-center justify-center px-4">
        <p className="text-white/45 text-sm text-center">Este enlace no es válido o el negocio no está disponible.</p>
      </div>
    );
  }

  const color = providerData.booking_theme_color || "#60a5fa";
  const activeServices = services.data?.services.filter((s) => s.is_active) ?? [];

  function selectService(s: Service) {
    setService(s);
    setDate("");
    setSlot(null);
    setError("");
    setStep("fecha");
  }

  function handleBook() {
    if (!service || !slot) return;
    setError("");
    bookMutation.mutate({
      mode,
      service_id: service.id,
      starts_at: slot.start,
      notes: notes || undefined,
      name: mode !== "login" ? name : undefined,
      email,
      phone: phone || undefined,
      password: mode !== "guest" ? password : undefined,
    });
  }

  return (
    <div className="min-h-screen bg-[#060608] text-white">
      <Hero provider={providerData} />

      <main className="max-w-4xl mx-auto px-4 pb-12 -mt-8 relative z-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] backdrop-blur-xl overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-white/10">
            <StepRail step={step} color={color} />
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mt-4">
              <div>
                <p className="text-xs text-white/35 uppercase tracking-widest">Agenda tu cita</p>
                <h2 className="text-xl font-semibold mt-1">
                  {step === "servicio" && "Elige una experiencia"}
                  {step === "fecha" && "Selecciona fecha y hora"}
                  {step === "datos" && "Confirma tus datos"}
                  {step === "exito" && "Reserva confirmada"}
                </h2>
              </div>
              {service && step !== "servicio" && step !== "exito" && (
                <button onClick={() => setStep("servicio")} className="text-xs text-white/35 hover:text-white transition-colors">
                  Cambiar servicio
                </button>
              )}
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {step === "servicio" && (
              <div className="space-y-4">
                {services.isLoading ? (
                  <p className="text-sm text-white/35 py-12 text-center">Cargando servicios...</p>
                ) : activeServices.length === 0 ? (
                  <p className="text-sm text-white/35 py-12 text-center">Este negocio aún no tiene servicios disponibles.</p>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {activeServices.map((s) => (
                      <ServiceCard
                        key={s.id}
                        service={s}
                        selected={service?.id === s.id}
                        color={color}
                        onSelect={() => selectService(s)}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {step === "fecha" && service && (
              <div className="grid lg:grid-cols-[290px_1fr] gap-5">
                <aside className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden">
                  <div className="h-36 relative" style={{ background: `linear-gradient(135deg, ${service.color}66, #111827)` }}>
                    {service.image_url && <img src={assetUrl(service.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                    <div className="absolute left-4 right-4 bottom-4">
                      <p className="font-semibold">{service.name}</p>
                      <p className="text-xs text-white/55">{service.duration_minutes} min{formatMoney(service.price) ? ` · ${formatMoney(service.price)}` : ""}</p>
                    </div>
                  </div>
                  <p className="p-4 text-xs text-white/45 leading-relaxed">{service.description || "Selecciona un horario disponible para continuar."}</p>
                </aside>

                <section className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/35 mb-2 uppercase tracking-wider">
                      Fecha
                    </label>
                    <DatePickerInput
                      value={date}
                      min={today}
                      dark
                      onChange={(value) => { setDate(value); setSlot(null); }}
                    />
                  </div>

                  {date && (
                    <div>
                      <p className="text-sm text-white/55 font-medium mb-3 capitalize">{formatDateLabel(date)}</p>
                      {slots.isLoading ? (
                        <p className="text-sm text-white/35 py-8">Cargando horarios...</p>
                      ) : availableSlots.length === 0 ? (
                        <p className="text-sm text-white/35 py-8">No hay horarios disponibles este día.</p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {availableSlots.map((s) => (
                            <button
                              key={s.start}
                              onClick={() => setSlot(s)}
                              className={`border rounded-xl py-3 px-2 text-sm font-semibold transition-all ${
                                slot?.start === s.start ? "text-black border-transparent" : "bg-white/[0.06] border-white/10 text-white hover:border-white/30"
                              }`}
                              style={slot?.start === s.start ? { backgroundColor: color } : undefined}
                            >
                              {formatTimeRange(s)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {slot && (
                    <button
                      onClick={() => setStep("datos")}
                      className="w-full rounded-xl py-3 text-sm font-bold text-black hover:scale-[1.01] active:scale-[0.99] transition-all"
                      style={{ backgroundColor: color }}
                    >
                      Continuar con este horario
                    </button>
                  )}
                </section>
              </div>
            )}

            {step === "datos" && service && slot && (
              <div className="grid lg:grid-cols-[1fr_320px] gap-5">
                <section className="space-y-4">
                  <div className="grid grid-cols-3 rounded-xl overflow-hidden border border-white/10 bg-black/20 text-sm">
                    {(["guest", "login", "register"] as BookMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMode(m); setError(""); }}
                        className={`py-3 font-medium transition-colors ${mode === m ? "text-black" : "text-white/45 hover:text-white"}`}
                        style={mode === m ? { backgroundColor: color } : undefined}
                      >
                        {m === "guest" ? "Invitado" : m === "login" ? "Tengo cuenta" : "Crear cuenta"}
                      </button>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {mode !== "login" && (
                      <label className="block">
                        <span className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">Nombre *</span>
                        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/35" placeholder="Tu nombre" />
                      </label>
                    )}
                    <label className="block">
                      <span className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">Correo *</span>
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/35" placeholder="tu@correo.com" />
                    </label>
                    {mode !== "login" && (
                      <label className="block">
                        <span className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">Teléfono</span>
                        <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/35" placeholder="+57 300 000 0000" />
                      </label>
                    )}
                    {mode !== "guest" && (
                      <label className="block">
                        <span className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">Contraseña *</span>
                        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/35" placeholder="••••••••" />
                      </label>
                    )}
                  </div>

                  <label className="block">
                    <span className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">Notas para el negocio</span>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full bg-white/[0.07] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-white/35 resize-none" placeholder="Información adicional..." />
                  </label>

                  {error && <p className="text-sm text-red-300 border border-red-400/20 bg-red-400/10 rounded-xl px-3 py-2">{error}</p>}

                  <button
                    disabled={bookMutation.isPending}
                    onClick={handleBook}
                    className="w-full rounded-xl py-3 text-sm font-bold text-black disabled:opacity-60 hover:scale-[1.01] active:scale-[0.99] transition-all"
                    style={{ backgroundColor: color }}
                  >
                    {bookMutation.isPending ? "Confirmando..." : "Confirmar reserva"}
                  </button>
                </section>

                <aside className="rounded-2xl border border-white/10 bg-black/20 p-4 h-fit">
                  <p className="text-xs text-white/35 uppercase tracking-widest mb-3">Resumen</p>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-white/35 text-xs">Servicio</p>
                      <p className="font-semibold">{service.name}</p>
                    </div>
                    <div>
                      <p className="text-white/35 text-xs">Fecha</p>
                      <p className="capitalize">{formatDateLabel(date)}</p>
                    </div>
                    <div>
                      <p className="text-white/35 text-xs">Hora</p>
                      <p>{formatTimeRange(slot)}</p>
                    </div>
                  </div>
                </aside>
              </div>
            )}

            {step === "exito" && service && slot && (
              <div className="text-center py-10 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-black font-bold text-2xl" style={{ backgroundColor: color }}>
                  ✓
                </div>
                <h2 className="text-2xl font-bold mt-5">Reserva confirmada</h2>
                <p className="text-sm text-white/50 mt-2">{providerData.name} recibirá tu solicitud.</p>
                <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-sm space-y-3">
                  <div className="flex justify-between gap-4">
                    <span className="text-white/35">Servicio</span>
                    <span className="font-semibold text-right">{service.name}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/35">Fecha</span>
                    <span className="capitalize text-right">{formatDateLabel(date)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-white/35">Hora</span>
                    <span className="text-right">{formatTimeRange(slot)}</span>
                  </div>
                  {mode === "register" && (
                    <p className="pt-3 border-t border-white/10 text-xs" style={{ color }}>
                      Tu cuenta fue creada. En desarrollo queda activa de inmediato; en producción se confirmará por correo y revisión del administrador.
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setStep("servicio");
                    setService(null);
                    setDate("");
                    setSlot(null);
                    setName("");
                    setEmail("");
                    setPhone("");
                    setNotes("");
                    setPassword("");
                    setMode("guest");
                  }}
                  className="mt-6 text-sm text-white/45 hover:text-white transition-colors"
                >
                  Reservar otra cita
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
