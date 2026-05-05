import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { verifyEmail } from "@/lib/api";

type VerifyState = "loading" | "success" | "error";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("Confirmando tu correo...");

  useEffect(() => {
    if (!token) {
      setState("error");
      setMessage("El enlace de verificación no es válido.");
      return;
    }

    verifyEmail(token)
      .then((result) => {
        setState("success");
        setMessage(result.message);
      })
      .catch((err) => {
        setState("error");
        setMessage(err instanceof Error ? err.message : "No pudimos confirmar tu correo.");
      });
  }, [token]);

  const isSuccess = state === "success";
  const isLoading = state === "loading";

  return (
    <div className="min-h-screen bg-[#060608] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="anim-blob1 absolute w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px]"
          style={{ background: "radial-gradient(circle, #3b82f6, #6366f1)", top: "-10%", left: "-10%" }}
        />
        <div
          className="anim-blob2 absolute w-[400px] h-[400px] rounded-full opacity-[0.08] blur-[90px]"
          style={{ background: "radial-gradient(circle, #22c55e, #06b6d4)", bottom: "-10%", right: "-5%" }}
        />
      </div>

      <div className="relative w-full max-w-sm anim-fade-up text-center">
        <Link to="/" className="flex justify-center mb-10">
          <span className="font-bold text-2xl tracking-tight text-white">
            agen<span className="text-blue-400">date</span>
          </span>
        </Link>

        <div className="glass rounded-3xl p-8">
          <div
            className={`w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center border ${
              isLoading
                ? "border-blue-400/25 bg-blue-400/[0.08]"
                : isSuccess
                  ? "border-green-400/25 bg-green-400/[0.08]"
                  : "border-red-400/25 bg-red-400/[0.08]"
            }`}
          >
            {isLoading ? (
              <div className="w-7 h-7 rounded-full border-2 border-blue-400/30 border-t-blue-400 animate-spin" />
            ) : isSuccess ? (
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </div>

          <h1 className="text-xl font-bold text-white mb-2">
            {isLoading ? "Confirmando correo" : isSuccess ? "Correo confirmado" : "Enlace no válido"}
          </h1>
          <p className="text-sm text-white/40 leading-relaxed mb-6">{message}</p>

          {isSuccess && (
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 mb-6 text-left">
              <p className="text-xs text-amber-300/90 leading-relaxed">
                Tu cuenta quedó en periodo de aprobación. Un administrador debe revisarla antes de que puedas iniciar sesión.
              </p>
            </div>
          )}

          <Link
            to="/login"
            className="block w-full py-3 rounded-xl text-sm font-semibold text-center text-black disabled:opacity-50 transition-all"
            style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
          >
            Ir al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
