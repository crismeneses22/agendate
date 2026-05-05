import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, StatusBadge } from "@/components/AppShell";
import { fetchProviderAppointments } from "@/lib/appointments-api";
import { approveUser, fetchPendingUsers, type PendingUser } from "@/lib/api";

const STAT_COLORS: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-400 border-amber-400/15",
  confirmed: "bg-green-400/10 text-green-400 border-green-400/15",
  completed: "bg-blue-400/10 text-blue-400 border-blue-400/15",
  cancelled: "bg-white/[0.04] text-white/30 border-white/[0.08]",
};

const USER_STATUS_LABEL: Record<PendingUser["status"], string> = {
  unconfirmed: "Sin confirmar",
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
};

const USER_STATUS_CLASS: Record<PendingUser["status"], string> = {
  unconfirmed: "border-blue-400/20 bg-blue-400/[0.08] text-blue-300",
  pending: "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
  approved: "border-green-400/20 bg-green-400/[0.08] text-green-300",
  rejected: "border-red-400/20 bg-red-400/[0.08] text-red-300",
};

function UserStatusBadge({ status }: { status: PendingUser["status"] }) {
  return (
    <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${USER_STATUS_CLASS[status]}`}>
      {USER_STATUS_LABEL[status]}
    </span>
  );
}

function UserApprovalRow({
  user,
  onAction,
  busy,
}: {
  user: PendingUser;
  onAction: (userId: number, action: "approve" | "reject") => void;
  busy: boolean;
}) {
  const canReview = user.status === "pending";

  return (
    <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <p className="font-medium text-sm text-white truncate">{user.name}</p>
          <UserStatusBadge status={user.status} />
        </div>
        <p className="text-xs text-white/35 truncate">{user.email}</p>
        <p className="text-xs text-white/25 mt-1">
          {user.role === "proveedor" ? "Proveedor" : "Cliente"}
          {user.phone ? ` · ${user.phone}` : ""}
        </p>
      </div>

      {canReview ? (
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(user.id, "reject")}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-red-400/20 text-red-300 hover:bg-red-400/10 disabled:opacity-50 transition-all"
          >
            Rechazar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onAction(user.id, "approve")}
            className="px-3 py-2 rounded-xl text-xs font-semibold border border-green-400/20 text-green-300 hover:bg-green-400/10 disabled:opacity-50 transition-all"
          >
            Aprobar
          </button>
        </div>
      ) : (
        <p className="text-xs text-white/20 shrink-0">
          {new Date(user.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
        </p>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const queryClient = useQueryClient();

  const appointmentsQuery = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: () => fetchProviderAppointments(),
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: fetchPendingUsers,
  });

  const reviewMutation = useMutation({
    mutationFn: ({ userId, action }: { userId: number; action: "approve" | "reject" }) =>
      approveUser(userId, action),
    onSuccess: (_result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(vars.action === "approve" ? "Cuenta aprobada" : "Cuenta rechazada");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const appointments = appointmentsQuery.data?.appointments ?? [];
  const users = usersQuery.data?.users ?? [];
  const pendingUsers = users.filter((u) => u.status === "pending");

  const counts = {
    pending: appointments.filter((a) => a.status === "pending").length,
    confirmed: appointments.filter((a) => a.status === "confirmed").length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter(
      (a) => a.status.startsWith("cancelled") || a.status === "no_show"
    ).length,
  };

  const stats = [
    { key: "pending", label: "Citas pendientes", count: counts.pending },
    { key: "confirmed", label: "Confirmadas", count: counts.confirmed },
    { key: "completed", label: "Completadas", count: counts.completed },
    { key: "cancelled", label: "Canceladas", count: counts.cancelled },
  ];

  return (
    <AppShell title="Admin · agendate">
      <div className="space-y-8">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-white/25 uppercase tracking-widest mb-1">
                Aprobación de cuentas
              </p>
              <h2 className="text-base font-semibold text-white">
                {pendingUsers.length} cuenta{pendingUsers.length === 1 ? "" : "s"} pendiente{pendingUsers.length === 1 ? "" : "s"}
              </h2>
            </div>
          </div>

          {usersQuery.isLoading ? (
            <p className="text-center py-12 text-white/20 text-sm">Cargando cuentas...</p>
          ) : users.length === 0 ? (
            <p className="text-center py-12 text-white/20 text-sm">No hay cuentas registradas</p>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <UserApprovalRow
                  key={user.id}
                  user={user}
                  busy={reviewMutation.isPending}
                  onAction={(userId, action) => reviewMutation.mutate({ userId, action })}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <p className="text-xs font-medium text-white/25 uppercase tracking-widest">
            Resumen de citas
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {stats.map((s) => (
              <div
                key={s.key}
                className={`rounded-2xl border p-4 ${STAT_COLORS[s.key]}`}
              >
                <p className="text-3xl font-bold">{s.count}</p>
                <p className="text-xs mt-1 opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-medium text-white/25 uppercase tracking-widest mb-3">
              Todas las citas
            </p>
            {appointmentsQuery.isLoading ? (
              <p className="text-center py-12 text-white/20 text-sm">Cargando citas...</p>
            ) : appointments.length === 0 ? (
              <p className="text-center py-12 text-white/20 text-sm">Sin citas registradas</p>
            ) : (
              <div className="space-y-2">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="glass rounded-2xl p-4 flex items-center gap-4 hover:border-white/15 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-white truncate">{appt.service_name}</p>
                        <StatusBadge status={appt.status} />
                      </div>
                      <p className="text-xs text-white/30">
                        {appt.client_name ?? "Invitado"} → {appt.provider_name}
                      </p>
                    </div>
                    <p className="text-xs text-white/20 shrink-0">
                      {new Date(appt.starts_at).toLocaleDateString("es-CO", {
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
