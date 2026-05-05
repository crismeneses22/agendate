import { updateCsrfTokenFromResponse, withCsrfHeaders } from "@/lib/csrf";

export interface User {
  id: number;
  email: string;
  name: string;
  role: "admin" | "proveedor" | "cliente";
  status: "unconfirmed" | "pending" | "approved" | "rejected";
  phone?: string | null;
  avatar_url?: string | null;
  created_at: string;
}

export interface PendingUser {
  id: number;
  email: string;
  name: string;
  role: "proveedor" | "cliente";
  phone?: string | null;
  status: "unconfirmed" | "pending" | "approved" | "rejected";
  created_at: string;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, withCsrfHeaders({ credentials: "include", ...init }));
  const raw = await response.text();
  updateCsrfTokenFromResponse(response);
  const parsed = JSON.parse(raw) as T & { message?: string };
  if (!response.ok) throw new Error(parsed.message || "No se pudo completar la operación.");
  return parsed;
}

export async function fetchSession(): Promise<{ ok: boolean; user: User }> {
  return requestJson("/api/session.php");
}

export async function login(email: string, password: string): Promise<{ ok: boolean; user: User }> {
  return requestJson("/api/login.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
}

export async function register(payload: {
  email: string;
  password: string;
  name: string;
  role: "proveedor" | "cliente";
  phone?: string;
}): Promise<{ ok: boolean; message: string }> {
  return requestJson("/api/register.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function verifyEmail(token: string): Promise<{ ok: boolean; message: string }> {
  return requestJson(`/api/verify-email.php?token=${encodeURIComponent(token)}`);
}

export async function logout(): Promise<{ ok: boolean }> {
  return requestJson("/api/logout.php", { method: "POST" });
}

export async function updateProfile(payload: {
  name?: string;
  phone?: string;
  current_password?: string;
  new_password?: string;
}): Promise<{ ok: boolean; user: User }> {
  return requestJson("/api/profile.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// ─── Admin API ────────────────────────────────────────────────────────────────

export async function fetchPendingUsers(): Promise<{ ok: boolean; users: PendingUser[] }> {
  return requestJson("/api/admin-pending-users.php");
}

export async function approveUser(
  userId: number,
  action: "approve" | "reject"
): Promise<{ ok: boolean; status: string }> {
  return requestJson("/api/admin-approve-user.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id: userId, action }),
  });
}
