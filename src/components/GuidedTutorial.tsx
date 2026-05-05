import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronLeft, ChevronRight, HelpCircle, X } from "lucide-react";
import { fetchTutorialProgress, saveTutorialProgress, type User } from "@/lib/api";

interface TutorialStep {
  title: string;
  body: string;
}

interface TutorialDefinition {
  key: string;
  roles: User["role"][];
  title: string;
  intro: string;
  steps: TutorialStep[];
}

const TUTORIALS: TutorialDefinition[] = [
  {
    key: "proveedor:onboarding:v1",
    roles: ["proveedor"],
    title: "Primer recorrido del proveedor",
    intro: "Configura tu negocio, comparte tu enlace y gestiona reservas desde un solo lugar.",
    steps: [
      {
        title: "Personaliza tu página pública",
        body: "En Servicios puedes definir el nombre del negocio, portada, colores, URL personalizada, QR y la presentación que verán tus clientes.",
      },
      {
        title: "Crea tus servicios",
        body: "Agrega nombre, descripción, duración, precio e imagen. Cada servicio alimenta tu página pública y el flujo de reservas.",
      },
      {
        title: "Define horarios reales",
        body: "En Horarios activa los días que atiendes y configura inicio y cierre. Los clientes solo verán horas disponibles dentro de ese rango.",
      },
      {
        title: "Comparte tu enlace y QR",
        body: "Desde el panel puedes copiar el link, abrir la vista pública y descargar una tarjeta QR para imprimir o compartir.",
      },
      {
        title: "Confirma y mide",
        body: "Las citas nuevas llegan pendientes. Puedes confirmarlas, cancelarlas o completarlas, y revisar estadísticas por día, mes y año.",
      },
    ],
  },
  {
    key: "cliente:onboarding:v1",
    roles: ["cliente"],
    title: "Primer recorrido del cliente",
    intro: "Agenda citas, revisa tus reservas y mantén el control de tus próximos horarios.",
    steps: [
      {
        title: "Elige proveedor y servicio",
        body: "Desde Agendar selecciona el negocio, revisa sus servicios disponibles y escoge el que necesitas.",
      },
      {
        title: "Selecciona fecha y hora",
        body: "El calendario y las horas disponibles se calculan según la agenda real del proveedor.",
      },
      {
        title: "Confirma tus datos",
        body: "Agrega notas si hace falta. Recibirás confirmación cuando el proveedor apruebe la cita.",
      },
      {
        title: "Consulta tu historial",
        body: "En tu panel puedes revisar próximas citas, estados y reservas anteriores.",
      },
    ],
  },
  {
    key: "admin:onboarding:v1",
    roles: ["admin"],
    title: "Primer recorrido del administrador",
    intro: "Revisa usuarios, controla aprobaciones y mantén el acceso ordenado.",
    steps: [
      {
        title: "Revisa cuentas nuevas",
        body: "Los usuarios que confirman correo quedan en revisión. Desde Admin puedes aprobar o rechazar solicitudes.",
      },
      {
        title: "Valida roles y estados",
        body: "Mantén proveedores y clientes con estado correcto para evitar accesos indebidos o cuentas incompletas.",
      },
      {
        title: "Acompaña el crecimiento",
        body: "Cuando se agreguen nuevos módulos administrativos, aparecerán aquí guías adicionales por usuario.",
      },
    ],
  },
];

function tutorialsForUser(user: User | null) {
  if (!user) return [];
  return TUTORIALS.filter((tutorial) => tutorial.roles.includes(user.role));
}

export function GuidedTutorial({ user }: { user: User | null }) {
  const qc = useQueryClient();
  const tutorials = useMemo(() => tutorialsForUser(user), [user]);
  const [stepIndex, setStepIndex] = useState(0);
  const [manualOpen, setManualOpen] = useState(false);

  const progressQuery = useQuery({
    queryKey: ["tutorial-progress", user?.id],
    queryFn: fetchTutorialProgress,
    enabled: !!user && tutorials.length > 0,
    staleTime: 60_000,
  });

  const handledKeys = useMemo(() => {
    return new Set((progressQuery.data?.progress ?? []).map((item) => item.tutorial_key));
  }, [progressQuery.data?.progress]);

  const pendingTutorial = tutorials.find((tutorial) => !handledKeys.has(tutorial.key)) ?? null;
  const tutorial = manualOpen ? (pendingTutorial ?? tutorials[0] ?? null) : pendingTutorial;

  const saveMutation = useMutation({
    mutationFn: ({ status }: { status: "completed" | "skipped" }) =>
      saveTutorialProgress(tutorial?.key ?? "", status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tutorial-progress", user?.id] }),
  });

  if (!user || tutorials.length === 0) return null;

  const open = !!tutorial && (manualOpen || (!progressQuery.isLoading && !!pendingTutorial));
  if (!tutorial) return (
    <button
      type="button"
      onClick={() => setManualOpen(true)}
      className="fixed bottom-4 right-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#101014]/90 text-white/45 shadow-2xl backdrop-blur hover:text-white hover:border-white/25 transition-all"
      title="Abrir guía"
    >
      <HelpCircle className="h-5 w-5" />
    </button>
  );

  const step = tutorial.steps[stepIndex];
  const isLast = stepIndex === tutorial.steps.length - 1;

  function closeAs(status: "completed" | "skipped") {
    saveMutation.mutate({ status });
    setManualOpen(false);
    setStepIndex(0);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setManualOpen(true)}
        className="fixed bottom-4 right-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#101014]/90 text-white/45 shadow-2xl backdrop-blur hover:text-white hover:border-white/25 transition-all"
        title="Abrir guía"
      >
        <HelpCircle className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/12 bg-[#101014] shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/[0.08]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-wider text-blue-300 mb-1">Guía inicial</p>
                  <h2 className="text-lg font-semibold text-white">{tutorial.title}</h2>
                  <p className="mt-1 text-sm text-white/42 leading-relaxed">{tutorial.intro}</p>
                </div>
                <button
                  type="button"
                  onClick={() => closeAs("skipped")}
                  className="shrink-0 rounded-xl border border-white/10 p-2 text-white/35 hover:text-white hover:border-white/25 transition-all"
                  title="Omitir guía"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-2 mb-5">
                {tutorial.steps.map((_, index) => (
                  <span
                    key={index}
                    className={`h-1.5 flex-1 rounded-full ${index <= stepIndex ? "bg-blue-400" : "bg-white/[0.08]"}`}
                  />
                ))}
              </div>

              <p className="text-xs text-white/28 mb-2">
                Paso {stepIndex + 1} de {tutorial.steps.length}
              </p>
              <h3 className="text-xl font-semibold text-white">{step.title}</h3>
              <p className="mt-3 min-h-[84px] text-sm leading-relaxed text-white/45">{step.body}</p>

              <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                <button
                  type="button"
                  onClick={() => closeAs("skipped")}
                  className="text-xs font-medium text-white/35 hover:text-white/65 transition-colors px-3 py-2"
                >
                  Omitir por ahora
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={stepIndex === 0}
                    onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-4 py-2 text-sm font-medium text-white/45 disabled:opacity-30 hover:text-white hover:border-white/25 transition-all"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Atrás
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (isLast) closeAs("completed");
                      else setStepIndex((current) => current + 1);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-blue-100 transition-colors"
                  >
                    {isLast ? (
                      <>
                        <Check className="h-4 w-4" />
                        Finalizar
                      </>
                    ) : (
                      <>
                        Siguiente
                        <ChevronRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
