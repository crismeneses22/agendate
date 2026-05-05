import { updateCsrfTokenFromResponse, withCsrfHeaders } from "@/lib/csrf";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled_by_client"
  | "cancelled_by_provider"
  | "completed"
  | "no_show";

export interface Service {
  id: number;
  provider_id: number;
  provider_name: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price: number | null;
  color: string;
  image_url: string | null;
  is_active: boolean;
}

export interface ProviderBranding {
  id: number;
  name: string;
  avatar_url: string | null;
  public_slug: string | null;
  public_slug_changes: number;
  free_slug_changes_remaining: number;
  booking_title: string;
  booking_description: string | null;
  booking_theme_color: string;
  booking_background: "aurora" | "graphite" | "sunrise" | "emerald" | "violet";
  booking_cover_url: string | null;
}

export interface TimeSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface Appointment {
  id: number;
  service_id: number;
  service_name: string;
  provider_id: number;
  provider_name: string;
  client_id: number | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  is_guest: boolean;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
}

export interface ProviderStatsService {
  id: number;
  name: string;
  duration_minutes: number;
  price: number | null;
  is_active: boolean;
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  no_show: number;
  estimated_revenue: number;
  share: number;
}

export interface ProviderStatsScope {
  label: string;
  start: string;
  end: string;
  kpis: {
    total_appointments: number;
    active_appointments: number;
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
    unique_clients: number;
    estimated_revenue: number;
    avg_duration_minutes: number;
    productive_hours: number;
    available_hours: number;
    capacity_slots: number;
    utilization_rate: number;
    cancellation_rate: number;
    no_show_rate: number;
  };
  most_requested_service: ProviderStatsService | null;
  least_requested_service: ProviderStatsService | null;
  services: ProviderStatsService[];
  top_hours: { hour: number; total: number }[];
  weekdays: { weekday: number; total: number }[];
  trend: { bucket: string; total: number }[];
}

export interface ProviderStats {
  scopes: Record<"day" | "month" | "year", ProviderStatsScope>;
  suggestions: { title: string; body: string; impact: string }[];
}

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  cancelled_by_client: "Cancelado por cliente",
  cancelled_by_provider: "Cancelado por proveedor",
  completed: "Completado",
  no_show: "No se presentó",
};

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, withCsrfHeaders({ credentials: "include", ...init }));
  const raw = await response.text();
  updateCsrfTokenFromResponse(response);
  let parsed: T & { message?: string };
  try {
    parsed = JSON.parse(raw) as T & { message?: string };
  } catch {
    throw new Error("El servidor devolvió una respuesta inválida. Revisa los permisos o logs de PHP.");
  }
  if (!response.ok) throw new Error(parsed.message || "No se pudo completar la operación.");
  return parsed;
}

export async function fetchProviders(): Promise<{ ok: boolean; providers: { id: number; name: string; avatar_url: string | null }[] }> {
  return requestJson("/api/providers.php");
}

export async function fetchProviderServices(providerId: number): Promise<{ ok: boolean; services: Service[] }> {
  return requestJson(`/api/services.php?provider_id=${providerId}`);
}

export async function fetchAvailableSlots(serviceId: number, date: string): Promise<{ ok: boolean; slots: TimeSlot[] }> {
  return requestJson(`/api/slots.php?service_id=${serviceId}&date=${date}`);
}

export async function bookAppointment(payload: {
  service_id: number;
  starts_at: string;
  notes?: string;
}): Promise<{ ok: boolean; message: string; appointment: Appointment }> {
  return requestJson("/api/book.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function fetchMyAppointments(): Promise<{ ok: boolean; appointments: Appointment[] }> {
  return requestJson("/api/my-appointments.php");
}

export async function cancelAppointment(id: number, reason?: string): Promise<{ ok: boolean; message: string }> {
  return requestJson("/api/cancel-appointment.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, reason }),
  });
}

export async function fetchProviderAppointments(filters?: { status?: string; date?: string }): Promise<{ ok: boolean; appointments: Appointment[] }> {
  const qs = new URLSearchParams(filters as Record<string, string>).toString();
  return requestJson(`/api/provider-appointments.php${qs ? `?${qs}` : ""}`);
}

export async function fetchProviderStats(): Promise<{ ok: boolean } & ProviderStats> {
  return requestJson("/api/provider-stats.php");
}

export async function updateAppointmentStatus(id: number, status: AppointmentStatus, reason?: string): Promise<{ ok: boolean; message: string }> {
  return requestJson("/api/appointment-status.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, status, reason }),
  });
}

export async function fetchProviderServices2(): Promise<{ ok: boolean; services: Service[] }> {
  return requestJson("/api/my-services.php");
}

export async function fetchProviderBranding(): Promise<{ ok: boolean; branding: ProviderBranding }> {
  return requestJson("/api/provider-branding.php");
}

export async function saveProviderBranding(
  payload: Partial<ProviderBranding>
): Promise<{ ok: boolean; branding: ProviderBranding }> {
  return requestJson("/api/provider-branding.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function uploadImage(
  file: File,
  kind: "service" | "cover"
): Promise<{ ok: boolean; url: string }> {
  const body = new FormData();
  body.append("kind", kind);
  body.append("image", file);
  return requestJson("/api/upload-image.php", {
    method: "POST",
    body,
  });
}

export async function saveService(payload: Partial<Service> & { name: string; duration_minutes: number }): Promise<{ ok: boolean; message: string; service: Service }> {
  return requestJson("/api/save-service.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteService(id: number): Promise<{ ok: boolean; message: string }> {
  return requestJson("/api/delete-service.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export interface AvailabilityRule {
  id: number;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export async function fetchAvailabilityRules(): Promise<{ ok: boolean; rules: AvailabilityRule[] }> {
  return requestJson("/api/availability-rules.php");
}

export async function saveAvailabilityRule(payload: Omit<AvailabilityRule, "id"> & { id?: number }): Promise<{ ok: boolean; rule: AvailabilityRule }> {
  return requestJson("/api/save-availability.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function deleteAvailabilityRule(id: number): Promise<{ ok: boolean }> {
  return requestJson("/api/delete-availability.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}
