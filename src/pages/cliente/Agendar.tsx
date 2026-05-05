import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProviders,
  fetchProviderServices,
  fetchAvailableSlots,
  bookAppointment,
} from "@/lib/appointments-api";
import { DatePickerInput } from "@/components/DatePickerInput";

type Step = "proveedor" | "servicio" | "fecha" | "hora" | "confirmar";

export default function Agendar() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [step, setStep] = useState<Step>("proveedor");
  const [providerId, setProviderId] = useState<number | null>(null);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState<{ start: string; end: string } | null>(null);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const providers = useQuery({ queryKey: ["providers"], queryFn: fetchProviders });
  const services = useQuery({
    queryKey: ["provider-services", providerId],
    queryFn: () => fetchProviderServices(providerId!),
    enabled: providerId !== null,
  });
  const slots = useQuery({
    queryKey: ["slots", serviceId, date],
    queryFn: () => fetchAvailableSlots(serviceId!, date),
    enabled: serviceId !== null && date !== "",
  });

  const bookMutation = useMutation({
    mutationFn: bookAppointment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-appointments"] });
      navigate("/cliente");
    },
    onError: (err: Error) => setError(err.message),
  });

  const selectedProvider = providers.data?.providers.find((p) => p.id === providerId);
  const selectedService = services.data?.services.find((s) => s.id === serviceId);

  function goBack() {
    const steps: Step[] = ["proveedor", "servicio", "fecha", "hora", "confirmar"];
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
    else navigate("/cliente");
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-4 py-3 flex items-center gap-3">
        <button onClick={goBack} className="text-gray-500 hover:text-gray-700 text-sm">
          ← Atrás
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Agendar cita</h1>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {step === "proveedor" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Elige el proveedor</p>
            {providers.isLoading ? (
              <p className="text-sm text-gray-400">Cargando proveedores...</p>
            ) : (
              providers.data?.providers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setProviderId(p.id); setStep("servicio"); }}
                  className="w-full bg-white border rounded-xl p-4 text-left hover:border-primary transition-colors"
                >
                  <p className="font-medium text-gray-900 text-sm">{p.name}</p>
                </button>
              ))
            )}
          </div>
        )}

        {step === "servicio" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">Servicios de <strong>{selectedProvider?.name}</strong></p>
            {services.isLoading ? (
              <p className="text-sm text-gray-400">Cargando servicios...</p>
            ) : (
              services.data?.services.filter((s) => s.is_active).map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setServiceId(s.id); setStep("fecha"); }}
                  className="w-full bg-white border rounded-xl p-4 text-left hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                      {s.description && <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-900">{s.duration_minutes} min</p>
                      {s.price != null && (
                        <p className="text-xs text-gray-500">${s.price.toLocaleString("es-CO")}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {step === "fecha" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Elige la fecha</p>
            <DatePickerInput
              value={date}
              min={today}
              onChange={setDate}
            />
            <button
              disabled={!date}
              onClick={() => setStep("hora")}
              className="w-full bg-primary text-white rounded-xl py-3 text-sm font-medium disabled:opacity-40"
            >
              Ver horarios disponibles
            </button>
          </div>
        )}

        {step === "hora" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Horarios disponibles para el{" "}
              {new Date(date + "T00:00:00").toLocaleDateString("es-CO", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
            {slots.isLoading ? (
              <p className="text-sm text-gray-400">Cargando horarios...</p>
            ) : slots.data?.slots.filter((s) => s.available).length === 0 ? (
              <p className="text-sm text-gray-400">No hay horarios disponibles este día.</p>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {slots.data?.slots
                  .filter((s) => s.available)
                  .map((s) => (
                    <button
                      key={s.start}
                      onClick={() => { setSlot(s); setStep("confirmar"); }}
                      className="border rounded-lg py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                    >
                      {s.start.slice(11, 16)}
                    </button>
                  ))}
              </div>
            )}
          </div>
        )}

        {step === "confirmar" && (
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Resumen de tu cita</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Proveedor</span>
                  <span className="font-medium">{selectedProvider?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Servicio</span>
                  <span className="font-medium">{selectedService?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Duración</span>
                  <span className="font-medium">{selectedService?.duration_minutes} min</span>
                </div>
                {selectedService?.price != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Precio</span>
                    <span className="font-medium">${selectedService.price.toLocaleString("es-CO")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Fecha y hora</span>
                  <span className="font-medium text-right">
                    {slot && `${new Date(slot.start.slice(0, 10) + "T00:00:00").toLocaleDateString("es-CO", {
                      day: "numeric", month: "short", year: "numeric",
                    })}, ${slot.start.slice(11, 16)}`}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
                placeholder="Información adicional para el proveedor..."
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              disabled={bookMutation.isPending}
              onClick={() =>
                bookMutation.mutate({
                  service_id: serviceId!,
                  starts_at: slot!.start,
                  notes: notes || undefined,
                })
              }
              className="w-full bg-primary text-white rounded-xl py-3 text-sm font-medium disabled:opacity-60 hover:bg-primary/90 transition-colors"
            >
              {bookMutation.isPending ? "Agendando..." : "Confirmar cita"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
