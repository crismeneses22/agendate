import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function DarkInput({
  label, type = "text", value, onChange, placeholder, required,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wider">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-400/60 focus:bg-white/[0.08] transition-all"
      />
    </div>
  );
}

type StatusHint = "unconfirmed" | "pending" | "rejected" | null;

function statusHintFromMessage(msg: string): StatusHint {
  if (msg.includes("confirmar tu correo") || msg.includes("confirma tu correo")) return "unconfirmed";
  if (msg.includes("pendiente de aprobación")) return "pending";
  if (msg.includes("rechazada")) return "rejected";
  return null;
}

function StatusBanner({ hint }: { hint: StatusHint }) {
  if (!hint) return null;

  const config = {
    unconfirmed: {
      color: "border-blue-400/20 bg-blue-400/[0.06]",
      textColor: "text-blue-300",
      icon: (
        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
        </svg>
      ),
      title: "Confirma tu correo",
      body: "Revisa tu bandeja de entrada (y la carpeta de spam). Haz clic en el enlace que te enviamos para continuar.",
    },
    pending: {
      color: "border-amber-400/20 bg-amber-400/[0.06]",
      textColor: "text-amber-400",
      icon: (
        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      title: "Cuenta en revisión",
      body: "Tu correo ya fue confirmado. El equipo de agendate está revisando tu solicitud. Te avisaremos cuando sea aprobada.",
    },
    rejected: {
      color: "border-red-400/20 bg-red-400/[0.06]",
      textColor: "text-red-400",
      icon: (
        <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
        </svg>
      ),
      title: "Solicitud rechazada",
      body: "Tu solicitud de cuenta no fue aprobada. Si crees que es un error, contáctanos.",
    },
  };

  const c = config[hint];
  return (
    <div className={`rounded-xl border ${c.color} px-4 py-3 flex gap-3`}>
      <span className={c.textColor}>{c.icon}</span>
      <div>
        <p className={`text-sm font-semibold ${c.textColor}`}>{c.title}</p>
        <p className="text-xs text-white/40 mt-0.5 leading-relaxed">{c.body}</p>
      </div>
    </div>
  );
}

export default function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [statusHint, setStatusHint] = useState<StatusHint>(null);
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setStatusHint(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al iniciar sesión";
      setError(msg);
      setStatusHint(statusHintFromMessage(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center px-4 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="anim-blob1 absolute w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px]"
          style={{ background: "radial-gradient(circle, #3b82f6, #6366f1)", top: "-10%", left: "-10%" }}
        />
        <div
          className="anim-blob2 absolute w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[90px]"
          style={{ background: "radial-gradient(circle, #818cf8, #06b6d4)", bottom: "-10%", right: "-5%" }}
        />
      </div>

      {/* Grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <div className="relative w-full max-w-sm anim-fade-up">

        {/* Logo */}
        <Link to="/" className="flex justify-center mb-10">
          <span className="font-bold text-2xl tracking-tight text-white">
            agen<span className="text-blue-400">date</span>
          </span>
        </Link>

        {/* Card */}
        <div className="glass rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white mb-1">Bienvenido</h1>
          <p className="text-sm text-white/40 mb-8">Inicia sesión en tu cuenta</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <DarkInput
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="tu@correo.com"
              required
            />
            <DarkInput
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
            />

            {statusHint ? (
              <StatusBanner hint={statusHint} />
            ) : error ? (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-black disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2"
              style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
            >
              {loading ? "Ingresando..." : "Ingresar →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          ¿No tienes cuenta?{" "}
          <Link to="/registro" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Regístrate gratis
          </Link>
        </p>

        <p className="text-center mt-4">
          <Link to="/" className="text-xs text-white/20 hover:text-white/40 transition-colors">
            ← Volver al inicio
          </Link>
        </p>
      </div>
    </div>
  );
}
