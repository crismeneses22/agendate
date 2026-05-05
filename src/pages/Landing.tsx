import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";

// ─── Scroll reveal hook ───────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ─── Feature card ─────────────────────────────────────────────────────────────
function FeatureCard({
  icon, title, body, delay,
}: { icon: React.ReactNode; title: string; body: string; delay?: string }) {
  return (
    <div className={`reveal glass rounded-3xl p-8 group hover:border-white/20 transition-all duration-500 hover:scale-[1.02] ${delay ?? ""}`}>
      <div className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center mb-6 group-hover:bg-white/15 transition-colors">
        {icon}
      </div>
      <h3 className="text-white font-semibold text-lg mb-3 leading-snug">{title}</h3>
      <p className="text-white/50 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

// ─── Step ────────────────────────────────────────────────────────────────────
function Step({ n, title, body, delay }: { n: string; title: string; body: string; delay?: string }) {
  return (
    <div className={`reveal flex gap-6 ${delay ?? ""}`}>
      <span className="text-white/15 font-bold text-5xl leading-none select-none shrink-0 pt-1">{n}</span>
      <div>
        <h4 className="text-white font-semibold text-base mb-2">{title}</h4>
        <p className="text-white/45 text-sm leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

// ─── Stat ────────────────────────────────────────────────────────────────────
function Stat({ value, label, delay }: { value: string; label: string; delay?: string }) {
  return (
    <div className={`reveal text-center ${delay ?? ""}`}>
      <p className="text-white font-bold text-5xl tracking-tight mb-1">{value}</p>
      <p className="text-white/40 text-xs uppercase tracking-widest">{label}</p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Landing() {
  useReveal();
  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax subtle scroll effect on hero blobs
  useEffect(() => {
    function onScroll() {
      if (!heroRef.current) return;
      const y = window.scrollY;
      heroRef.current.style.setProperty("--scroll-y", `${y * 0.18}px`);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const marqueeItems = [
    "Reservas sin fricción", "Tu negocio, siempre disponible",
    "Sin app, sin descarga", "Link + QR listo al instante",
    "Gestiona tus citas", "Clientes felices",
  ];

  return (
    <div className="bg-[#060608] text-white overflow-x-hidden">

      {/* ── NAV ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between px-6 md:px-12 py-5">
        <span className="anim-fade-in font-bold text-lg tracking-tight text-white">
          agen<span className="text-blue-400">date</span>
        </span>
        <div className="anim-fade-in delay-200 flex items-center gap-3">
          <Link
            to="/login"
            className="text-sm text-white/60 hover:text-white transition-colors px-4 py-2"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/registro"
            className="text-sm font-medium bg-white text-black rounded-full px-5 py-2 hover:bg-white/90 transition-all hover:scale-105 active:scale-95"
          >
            Empezar gratis
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center overflow-hidden">

        {/* Animated background blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="anim-blob1 absolute w-[600px] h-[600px] rounded-full opacity-[0.12] blur-[120px]"
            style={{ background: "radial-gradient(circle, #3b82f6, #6366f1)", top: "10%", left: "5%" }}
          />
          <div
            className="anim-blob2 absolute w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[100px]"
            style={{ background: "radial-gradient(circle, #818cf8, #06b6d4)", bottom: "5%", right: "0%" }}
          />
          <div
            className="anim-blob3 absolute w-[300px] h-[300px] rounded-full opacity-[0.08] blur-[80px]"
            style={{ background: "radial-gradient(circle, #a78bfa, #3b82f6)", top: "40%", right: "20%" }}
          />
        </div>

        {/* Subtle grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* Badge */}
        <div className="anim-fade-up delay-100 inline-flex items-center gap-2 bg-white/[0.07] border border-white/10 rounded-full px-4 py-1.5 text-xs text-white/60 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Disponible ahora · sin tarjeta de crédito
        </div>

        {/* Headline */}
        <h1 className="anim-fade-up delay-200 text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[0.95] mb-6 max-w-4xl">
          Tu negocio,{" "}
          <br />
          <span
            className="bg-clip-text text-transparent"
            style={{ backgroundImage: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #818cf8 100%)" }}
          >
            siempre disponible.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="anim-fade-up delay-300 text-white/50 text-lg md:text-xl leading-relaxed max-w-xl mb-10">
          La plataforma de reservas más simple del mundo.
          Comparte tu link o QR — tus clientes agendan en segundos,
          sin apps ni registros obligatorios.
        </p>

        {/* CTAs */}
        <div className="anim-fade-up delay-400 flex flex-col sm:flex-row items-center gap-3 mb-16">
          <Link
            to="/registro"
            className="group relative px-8 py-3.5 rounded-full text-sm font-semibold text-black overflow-hidden transition-all hover:scale-105 active:scale-95"
            style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
          >
            <span className="relative z-10">Crear mi cuenta gratis →</span>
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ background: "linear-gradient(135deg, #93c5fd, #a5b4fc)" }} />
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-full text-sm font-medium text-white/70 border border-white/10 hover:border-white/25 hover:text-white transition-all hover:scale-105 active:scale-95"
          >
            Ya tengo cuenta
          </Link>
        </div>

        {/* Scroll hint */}
        <div className="anim-fade-in delay-700 flex flex-col items-center gap-2 text-white/25 text-xs">
          <span>Descubre más</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────────────── */}
      <div className="border-y border-white/[0.06] py-4 overflow-hidden">
        <div className="anim-marquee flex gap-12 whitespace-nowrap">
          {[...marqueeItems, ...marqueeItems].map((item, i) => (
            <span key={i} className="text-white/25 text-sm font-medium uppercase tracking-widest">
              {item} <span className="text-white/10 mx-4">·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── STATS ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8">
          <Stat value="3 min" label="para configurar tu perfil" />
          <Stat value="0 clicks" label="para que tus clientes reserven" delay="delay-1" />
          <Stat value="24/7" label="disponible para reservas" delay="delay-2" />
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-16">
            <p className="text-white/30 text-xs uppercase tracking-widest mb-3">Por qué agendate</p>
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
              Diseñado para ser{" "}
              <span className="text-white/40">invisible.</span>
            </h2>
            <p className="text-white/40 mt-4 max-w-md mx-auto text-sm leading-relaxed">
              La mejor herramienta es la que no se nota. Tus clientes solo ven tu negocio.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                </svg>
              }
              title="Link y QR únicos"
              body="Cada negocio recibe su propio enlace de reservas y código QR listo para imprimir, compartir o proyectar."
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              }
              title="Sin fricción para el cliente"
              body="Tus clientes reservan como invitados o crean su cuenta en el mismo flujo. Sin apps, sin descargas, sin barreras."
              delay="delay-1"
            />
            <FeatureCard
              icon={
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                </svg>
              }
              title="Panel de control simple"
              body="Confirma, cancela o completa citas con un toque. Configura servicios, precios y horarios desde tu dashboard."
              delay="delay-2"
            />
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <div className="reveal">
              <p className="text-white/30 text-xs uppercase tracking-widest mb-4">Cómo funciona</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight mb-12">
                De cero a tu primera cita<br />
                <span className="text-white/30">en menos de 5 minutos.</span>
              </h2>
            </div>
            <div className="space-y-10">
              <Step
                n="01"
                title="Crea tu cuenta de negocio"
                body="Regístrate como proveedor, agrega tus servicios con duración y precio, y define tu horario de atención."
              />
              <Step
                n="02"
                title="Comparte tu enlace o QR"
                body="Copia tu link personalizado, descarga tu QR e imprímelo o compártelo en tus redes. Listo."
                delay="delay-1"
              />
              <Step
                n="03"
                title="Recibe y gestiona citas"
                body="Tus clientes reservan en segundos. Tú confirmas, completas o reprogramas desde tu panel, en cualquier momento."
                delay="delay-2"
              />
            </div>
          </div>

          {/* Visual mockup */}
          <div className="reveal delay-2 relative">
            <div className="glass rounded-3xl p-6 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-white/[0.07]">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 opacity-80" />
                <div>
                  <p className="text-white text-sm font-medium">Estudio Zen</p>
                  <p className="text-white/30 text-xs">agendate.app/b/12</p>
                </div>
              </div>
              {[
                { name: "Corte de cabello", time: "30 min · $25.000", color: "bg-blue-400" },
                { name: "Coloración completa", time: "90 min · $80.000", color: "bg-violet-400" },
                { name: "Tratamiento capilar", time: "45 min · $40.000", color: "bg-cyan-400" },
              ].map((s, i) => (
                <div key={i} className="flex items-center justify-between group cursor-pointer hover:bg-white/[0.04] rounded-2xl p-3 -mx-3 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${s.color} opacity-70`} />
                    <span className="text-white/80 text-sm">{s.name}</span>
                  </div>
                  <span className="text-white/30 text-xs">{s.time}</span>
                </div>
              ))}
              <button className="w-full mt-2 bg-white/10 hover:bg-white/15 text-white text-sm font-medium rounded-2xl py-3 transition-colors">
                Ver disponibilidad →
              </button>
            </div>

            {/* Floating confirmation card */}
            <div className="absolute -bottom-6 -right-4 glass rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
              <div className="w-7 h-7 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <p className="text-white text-xs font-medium">¡Cita confirmada!</p>
                <p className="text-white/40 text-xs">Hoy · 3:30 PM</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOR WHOM ────────────────────────────────────────────────────── */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="reveal text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
              Para cualquier negocio<br />
              <span className="text-white/30">que atienda con citas.</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { emoji: "✂️", label: "Peluquerías" },
              { emoji: "💆", label: "Spas & estética" },
              { emoji: "🦷", label: "Odontología" },
              { emoji: "🧘", label: "Fitness & yoga" },
              { emoji: "📸", label: "Fotografía" },
              { emoji: "🐾", label: "Veterinarias" },
              { emoji: "👁️", label: "Oftalmología" },
              { emoji: "🏥", label: "Consultas médicas" },
            ].map((item, i) => (
              <div
                key={i}
                className={`reveal glass rounded-2xl p-5 text-center hover:border-white/20 hover:scale-[1.03] transition-all duration-300 delay-${(i % 3) + 1}`}
              >
                <div className="text-2xl mb-2">{item.emoji}</div>
                <p className="text-white/60 text-xs font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────────────────── */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.08] blur-[80px] pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 50% 50%, #3b82f6, #6366f1, transparent)" }}
        />
        <div className="reveal max-w-2xl mx-auto text-center relative">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 leading-tight">
            Empieza hoy.<br />
            <span className="text-white/30">Es completamente gratis.</span>
          </h2>
          <p className="text-white/40 mb-10 text-sm leading-relaxed max-w-sm mx-auto">
            Sin contratos, sin tarjeta de crédito. Configura tu perfil en minutos y empieza a recibir citas hoy mismo.
          </p>
          <Link
            to="/registro"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full text-black font-semibold text-sm hover:scale-105 active:scale-95 transition-transform"
            style={{ background: "linear-gradient(135deg, #93c5fd, #a5b4fc)" }}
          >
            Crear cuenta gratis
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.06] px-6 py-10">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-lg tracking-tight">
            agen<span className="text-blue-400">date</span>
          </span>
          <p className="text-white/20 text-xs">
            © {new Date().getFullYear()} agendate · Hecho para los negocios de hoy.
          </p>
          <div className="flex items-center gap-6 text-white/30 text-xs">
            <Link to="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
            <Link to="/registro" className="hover:text-white transition-colors">Registrarse</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
