import { updateCsrfTokenFromResponse, withCsrfHeaders } from "@/lib/csrf";
import type { Service, TimeSlot, Appointment, ProviderBranding } from "@/lib/appointments-api";

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, withCsrfHeaders({ credentials: "include", ...init }));
  const raw = await response.text();
  updateCsrfTokenFromResponse(response);
  const parsed = JSON.parse(raw) as T & { message?: string };
  if (!response.ok) throw new Error(parsed.message || "No se pudo completar la operación.");
  return parsed;
}

export async function fetchPublicProvider(id: string): Promise<{
  ok: boolean;
  provider: ProviderBranding;
}> {
  return requestJson(`/api/public-provider.php?id=${encodeURIComponent(id)}`);
}

export async function fetchPublicServices(providerId: number): Promise<{ ok: boolean; services: Service[] }> {
  return requestJson(`/api/services.php?provider_id=${providerId}`);
}

export async function fetchPublicSlots(serviceId: number, date: string): Promise<{ ok: boolean; slots: TimeSlot[] }> {
  return requestJson(`/api/slots.php?service_id=${serviceId}&date=${date}`);
}

export type BookMode = "guest" | "login" | "register";

export interface PublicBookPayload {
  mode: BookMode;
  service_id: number;
  starts_at: string;
  notes?: string;
  name?: string;
  email?: string;
  phone?: string;
  password?: string;
}

export async function publicBook(payload: PublicBookPayload): Promise<{
  ok: boolean;
  message: string;
  appointment: Appointment;
  user?: { id: number; name: string; role: string; email: string };
}> {
  return requestJson("/api/public-book.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
