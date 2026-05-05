import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { Download } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { AppShell, StatusBadge } from "@/components/AppShell";
import {
  fetchProviderBranding,
  fetchProviderAppointments,
  updateAppointmentStatus,
  type Appointment,
} from "@/lib/appointments-api";

function assetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return path;
  return path;
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);

  if (lines.length > maxLines) {
    const trimmed = lines.slice(0, maxLines);
    while (ctx.measureText(`${trimmed[maxLines - 1]}...`).width > maxWidth && trimmed[maxLines - 1].length > 1) {
      trimmed[maxLines - 1] = trimmed[maxLines - 1].slice(0, -1);
    }
    trimmed[maxLines - 1] = `${trimmed[maxLines - 1]}...`;
    return trimmed;
  }
  return lines;
}

function loadCanvasImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCoverImage(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height);
  const sw = width / scale;
  const sh = height / scale;
  const sx = (image.width - sw) / 2;
  const sy = (image.height - sh) / 2;
  ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const lines = wrapText(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return lines.length;
}

function fallbackCopyText(text: string) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

const FILTERS = [
  { label: "Pendientes", value: "pending" },
  { label: "Confirmadas", value: "confirmed" },
  { label: "Activas", value: "pending,confirmed" },
  { label: "Todas", value: "" },
];

function BookingLinkCard({ providerId }: { providerId: number }) {
  const [copied, setCopied] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const branding = useQuery({
    queryKey: ["provider-branding"],
    queryFn: fetchProviderBranding,
  });
  const publicId = branding.data?.branding.public_slug || providerId;
  const businessName = branding.data?.branding.booking_title || branding.data?.branding.name || "agendate";
  const coverUrl = assetUrl(branding.data?.branding.booking_cover_url);
  const url = `${window.location.origin}/b/${publicId}`;
  const displayUrl = `${window.location.host}/b/${publicId}`;

  function copy() {
    const markCopied = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    };

    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(markCopied).catch(() => {
        fallbackCopyText(url);
        markCopied();
      });
      return;
    }

    fallbackCopyText(url);
    markCopied();
  }

  async function downloadQrCard() {
    setDownloading(true);
    try {
      const canvas = document.createElement("canvas");
      const width = 1080;
      const height = 1620;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const bg = ctx.createLinearGradient(0, 0, width, height);
      bg.addColorStop(0, "#06101f");
      bg.addColorStop(0.52, "#10172a");
      bg.addColorStop(1, "#31205f");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      if (coverUrl) {
        try {
          const cover = await loadCanvasImage(coverUrl);
          drawCoverImage(ctx, cover, 0, 0, width, height);
          ctx.fillStyle = "rgba(3, 7, 18, 0.48)";
          ctx.fillRect(0, 0, width, height);
        } catch {
          // Deja el degradado base si la portada no se puede leer en canvas.
        }
      }

      const glow = ctx.createRadialGradient(250, 280, 20, 250, 280, 640);
      glow.addColorStop(0, "rgba(96,165,250,0.42)");
      glow.addColorStop(1, "rgba(96,165,250,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      roundedRect(ctx, 70, 70, width - 140, height - 140, 52);
      ctx.strokeStyle = "rgba(255,255,255,0.22)";
      ctx.lineWidth = 3;
      ctx.stroke();

      const qrBox = { x: 250, y: 600, size: 580 };
      const infoBox = { x: 110, y: 1220, width: width - 220, height: 260 };

      ctx.fillStyle = "rgba(0,0,0,0.42)";
      roundedRect(ctx, infoBox.x, infoBox.y, infoBox.width, infoBox.height, 44);
      ctx.fill();

      ctx.fillStyle = "rgba(255,255,255,0.82)";
      ctx.font = "600 34px Arial, sans-serif";
      ctx.fillText("AGENDA TU CITA", 110, 180);

      ctx.fillStyle = "#ffffff";
      ctx.font = "800 76px Arial, sans-serif";
      const nameLines = wrapText(ctx, businessName, width - 220, 3);
      nameLines.forEach((line, index) => {
        ctx.fillText(line, 110, 285 + index * 84);
      });

      ctx.fillStyle = "rgba(255,255,255,0.76)";
      ctx.font = "400 34px Arial, sans-serif";
      drawWrappedText(ctx, "Escanea el código y reserva en línea", 110, 545, width - 220, 42, 2);

      const qrCanvas = document.createElement("canvas");
      qrCanvas.width = 540;
      qrCanvas.height = 540;
      const qrCtx = qrCanvas.getContext("2d");
      if (!qrCtx) return;

      const previewQr = document.querySelector("#provider-booking-qr svg") as SVGSVGElement | null;
      if (!previewQr) return;
      const svgText = new XMLSerializer().serializeToString(previewQr);
      const qrImg = await loadCanvasImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`);
      qrCtx.fillStyle = "#ffffff";
      qrCtx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
      qrCtx.drawImage(qrImg, 36, 36, 468, 468);

      ctx.fillStyle = "#ffffff";
      roundedRect(ctx, qrBox.x, qrBox.y, qrBox.size, qrBox.size, 52);
      ctx.fill();
      ctx.drawImage(qrCanvas, qrBox.x + 20, qrBox.y + 20, qrBox.size - 40, qrBox.size - 40);

      ctx.fillStyle = "#ffffff";
      ctx.font = "700 44px Arial, sans-serif";
      ctx.fillText("Reserva aquí", infoBox.x + 50, infoBox.y + 78);

      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "400 32px Arial, sans-serif";
      drawWrappedText(ctx, displayUrl, infoBox.x + 50, infoBox.y + 142, infoBox.width - 100, 42, 2);

      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.font = "600 28px Arial, sans-serif";
      ctx.fillText("agendate", infoBox.x + 50, infoBox.y + 220);

      const link = document.createElement("a");
      const safeName = String(publicId).replace(/[^a-z0-9_-]/gi, "-").toLowerCase();
      link.download = `qr-${safeName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5 flex gap-4 items-start">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white mb-0.5">Tu enlace de reservas</p>
        <p className="text-xs text-white/35 mb-3">Se actualiza automáticamente con tu URL personalizada y QR</p>
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.08] rounded-xl px-3 py-2">
          <span className="text-xs text-white/40 truncate flex-1">{url}</span>
          <button
            onClick={copy}
            className={`shrink-0 text-xs font-semibold transition-colors ${copied ? "text-green-400" : "text-blue-400 hover:text-blue-300"}`}
          >
            {copied ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-white/25 hover:text-white/50 transition-colors"
        >
          Previsualizar →
        </a>
        <button
          onClick={downloadQrCard}
          disabled={downloading}
          className="mt-2 ml-3 inline-flex items-center gap-1.5 text-xs text-blue-300 hover:text-blue-200 disabled:opacity-50 transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          {downloading ? "Preparando..." : "Descargar tarjeta QR"}
        </button>
      </div>
      <div id="provider-booking-qr" className="shrink-0 p-2 bg-white rounded-xl">
        <QRCodeSVG value={url} size={80} />
      </div>
    </div>
  );
}

function AppointmentCard({
  appt, onStatus,
}: {
  appt: Appointment;
  onStatus: (id: number, status: Appointment["status"]) => void;
}) {
  return (
    <div className="glass rounded-2xl p-4 space-y-3 hover:border-white/15 transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-white text-sm leading-tight">{appt.service_name}</p>
          <p className="text-xs text-white/35 mt-0.5 truncate">
            {appt.client_name ?? "—"} · {appt.client_email ?? "—"}
            {appt.is_guest && (
              <span className="ml-1.5 text-white/20">(invitado)</span>
            )}
          </p>
        </div>
        <StatusBadge status={appt.status} />
      </div>

      <p className="text-xs text-white/25">
        {new Date(appt.starts_at).toLocaleString("es-CO", {
          weekday: "short", day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        })}
        {" "}→{" "}
        {new Date(appt.ends_at).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
      </p>

      {appt.notes && (
        <p className="text-xs text-white/30 bg-white/[0.04] rounded-xl px-3 py-2">{appt.notes}</p>
      )}

      {appt.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatus(appt.id, "confirmed")}
            className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium py-2 rounded-xl transition-colors"
          >
            Confirmar
          </button>
          <button
            onClick={() => onStatus(appt.id, "cancelled_by_provider")}
            className="flex-1 bg-white/[0.05] hover:bg-white/10 text-white/40 text-xs font-medium py-2 rounded-xl transition-colors"
          >
            Cancelar
          </button>
        </div>
      )}
      {appt.status === "confirmed" && (
        <div className="flex gap-2">
          <button
            onClick={() => onStatus(appt.id, "completed")}
            className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium py-2 rounded-xl transition-colors"
          >
            Completar
          </button>
          <button
            onClick={() => onStatus(appt.id, "no_show")}
            className="flex-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 text-xs font-medium py-2 rounded-xl transition-colors"
          >
            No se presentó
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProveedorDashboard() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("pending,confirmed");

  const { data, isLoading } = useQuery({
    queryKey: ["provider-appointments", statusFilter],
    queryFn: () => fetchProviderAppointments({ status: statusFilter }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: Appointment["status"] }) =>
      updateAppointmentStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["provider-appointments"] }),
  });

  const appointments = data?.appointments ?? [];

  return (
    <AppShell
      title="Panel de citas"
      navLinks={[
        { to: "/proveedor/servicios", label: "Servicios" },
        { to: "/proveedor/disponibilidad", label: "Horarios" },
        { to: "/proveedor/estadisticas", label: "Estadísticas" },
      ]}
    >
      <div className="space-y-5">
        {user && <BookingLinkCard providerId={user.id} />}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? "bg-white text-black"
                  : "text-white/40 border border-white/10 hover:border-white/25 hover:text-white/70"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-center py-16 text-white/20 text-sm">Cargando...</p>
        ) : appointments.length === 0 ? (
          <p className="text-center py-16 text-white/20 text-sm">Sin citas en este filtro</p>
        ) : (
          <div className="space-y-3">
            {appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                onStatus={(id, status) => statusMutation.mutate({ id, status })}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
