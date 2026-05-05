import { useState } from "react";
import { Link } from "react-router-dom";
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

function RegistrationDoneScreen({ email, message }: { email: string; message: string }) {
  const isDevApproved = message.toLowerCase().includes("desarrollo");

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="anim-blob1 absolute w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px]"
          style={{ background: "radial-gradient(circle, #6366f1, #3b82f6)", top: "-10%", right: "-10%" }}
        />
      </div>

      <div className="relative w-full max-w-sm anim-fade-up text-center">
        <Link to="/" className="flex justify-center mb-10">
          <span className="font-bold text-2xl tracking-tight text-white">
            agen<span className="text-blue-400">date</span>
          </span>
        </Link>

        <div className="glass rounded-3xl p-8">
          {/* Envelope icon */}
          <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #60a5fa22, #818cf822)", border: "1px solid #60a5fa33" }}>
            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0l-9.75 6.75L2.25 6.75" />
            </svg>
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            {isDevApproved ? "Cuenta creada" : "Revisa tu correo"}
          </h1>
          <p className="text-sm text-white/40 leading-relaxed mb-4">
            {isDevApproved ? (
              <>
                La cuenta <span className="text-blue-400 font-medium">{email}</span> quedó activa en modo desarrollo.
              </>
            ) : (
              <>
                Enviamos un enlace de confirmación a{" "}
                <span className="text-blue-400 font-medium">{email}</span>.
              </>
            )}
          </p>
          <p className="text-xs text-white/25 leading-relaxed mb-6">
            {isDevApproved
              ? "Puedes iniciar sesión de inmediato. En producción se mantiene la confirmación por correo y aprobación del administrador."
              : "Haz clic en el enlace del correo para verificar tu dirección. Después de confirmarlo, tu cuenta quedará en revisión y te avisaremos cuando sea aprobada."}
          </p>

          <div className={`rounded-2xl border px-4 py-3 mb-6 ${isDevApproved ? "border-green-400/20 bg-green-400/[0.06]" : "border-amber-400/20 bg-amber-400/[0.06]"}`}>
            <p className="text-xs text-amber-400/80 leading-relaxed">
              {isDevApproved ? message : "El enlace expira en 24 horas. Revisa también tu carpeta de spam."}
            </p>
          </div>

          <Link
            to="/login"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-white/60 border border-white/10 hover:border-white/20 hover:text-white transition-all"
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function Registro() {
  const { register } = useAuth();
  const [role, setRole] = useState<"proveedor" | "cliente">("proveedor");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (submitted) return <RegistrationDoneScreen email={email} message={successMessage} />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await register({ name, email, password, role, phone: phone || undefined });
      setSuccessMessage(result.message);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center px-4 py-10 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="anim-blob1 absolute w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px]"
          style={{ background: "radial-gradient(circle, #6366f1, #3b82f6)", top: "-10%", right: "-10%" }}
        />
        <div
          className="anim-blob3 absolute w-[350px] h-[350px] rounded-full opacity-[0.07] blur-[80px]"
          style={{ background: "radial-gradient(circle, #06b6d4, #818cf8)", bottom: "5%", left: "-5%" }}
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
          <h1 className="text-2xl font-bold text-white mb-1">Crear cuenta</h1>
          <p className="text-sm text-white/40 mb-6">Elige tu tipo de cuenta y empieza gratis</p>

          {/* Role selector */}
          <div className="flex gap-2 mb-7 bg-white/[0.04] rounded-2xl p-1">
            {(["proveedor", "cliente"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  role === r
                    ? "bg-white/10 text-white shadow-sm"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {r === "proveedor" ? "Soy un negocio" : "Soy cliente"}
              </button>
            ))}
          </div>

          {/* Role description */}
          <p className="text-xs text-white/25 mb-5 leading-relaxed">
            {role === "proveedor"
              ? "Configura tus servicios, define tu disponibilidad y recibe reservas online con tu link personalizado."
              : "Agenda citas con tus negocios favoritos y lleva el control de todas tus reservas."}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <DarkInput
              label={role === "proveedor" ? "Nombre del negocio" : "Nombre completo"}
              value={name}
              onChange={setName}
              placeholder={role === "proveedor" ? "Ej. Estudio Zen" : "Tu nombre"}
              required
            />
            <DarkInput
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="tu@correo.com"
              required
            />
            <DarkInput
              label="Teléfono (opcional)"
              type="tel"
              value={phone}
              onChange={setPhone}
              placeholder="+57 300 000 0000"
            />
            <DarkInput
              label="Contraseña"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo 8 caracteres"
              required
            />

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-black disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2"
              style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
            >
              {loading ? "Creando cuenta..." : "Crear cuenta gratis →"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-white/30 mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Inicia sesión
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
