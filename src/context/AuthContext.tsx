import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchSession, login as apiLogin, logout as apiLogout, register as apiRegister, updateProfile, type User } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: { email: string; password: string; name: string; role: "proveedor" | "cliente"; phone?: string }) => Promise<{ message: string }>;
  logout: () => Promise<void>;
  update: (payload: Parameters<typeof updateProfile>[0]) => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const { user } = await fetchSession();
      setUser(user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const { user } = await apiLogin(email, password);
    setUser(user);
  }

  async function register(payload: Parameters<typeof apiRegister>[0]) {
    // Registration no longer creates a session — user must verify email first.
    const result = await apiRegister(payload);
    return { message: result.message };
  }

  async function logout() {
    await apiLogout();
    setUser(null);
  }

  async function update(payload: Parameters<typeof updateProfile>[0]) {
    const { user } = await updateProfile(payload);
    setUser(user);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, update, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
