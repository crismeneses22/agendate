import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, DarkInput } from "@/components/AppShell";
import {
  deleteService,
  fetchProviderBranding,
  fetchProviderServices2,
  saveProviderBranding,
  saveService,
  uploadImage,
  type ProviderBranding,
  type Service,
} from "@/lib/appointments-api";

const BACKGROUNDS: { key: ProviderBranding["booking_background"]; label: string; preview: string }[] = [
  { key: "aurora", label: "Aurora", preview: "linear-gradient(135deg,#060608,#0f2a4d 48%,#332061)" },
  { key: "graphite", label: "Grafito", preview: "linear-gradient(135deg,#050505,#1f2937 55%,#111827)" },
  { key: "sunrise", label: "Solar", preview: "linear-gradient(135deg,#111827,#7c2d12 48%,#f59e0b)" },
  { key: "emerald", label: "Esmeralda", preview: "linear-gradient(135deg,#03120e,#064e3b 52%,#14b8a6)" },
  { key: "violet", label: "Violeta", preview: "linear-gradient(135deg,#09090b,#312e81 45%,#a855f7)" },
];

function assetUrl(path?: string | null) {
  if (!path) return "";
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith("/")) return path;
  return path;
}

function UploadButton({
  kind,
  onUploaded,
  label,
}: {
  kind: "service" | "cover";
  onUploaded: (url: string) => void;
  label: string;
}) {
  const [busy, setBusy] = useState(false);

  async function handleFile(file?: File) {
    if (!file) return;
    setBusy(true);
    try {
      const result = await uploadImage(file, kind);
      onUploaded(result.url);
      toast.success("Imagen subida");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="inline-flex items-center justify-center px-3 py-2 rounded-xl text-xs font-semibold border border-white/10 text-white/45 hover:text-white hover:border-white/25 transition-all cursor-pointer">
      {busy ? "Subiendo..." : label}
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        disabled={busy}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </label>
  );
}

function BrandingPanel({
  branding,
  onSave,
  saving,
}: {
  branding?: ProviderBranding;
  onSave: (payload: Partial<ProviderBranding>) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState(branding?.booking_title ?? "");
  const [description, setDescription] = useState(branding?.booking_description ?? "");
  const [slug, setSlug] = useState(branding?.public_slug ?? "");
  const [theme, setTheme] = useState(branding?.booking_theme_color ?? "#60a5fa");
  const [background, setBackground] = useState<ProviderBranding["booking_background"]>(branding?.booking_background ?? "aurora");
  const [cover, setCover] = useState(branding?.booking_cover_url ?? "");

  const publicUrl = `${window.location.origin}/b/${slug || branding?.id || ""}`;
  const slugChanged = slug.trim() !== (branding?.public_slug ?? "");
  const countableSlugChange = slugChanged && slug.trim() !== "";
  const remaining = branding?.free_slug_changes_remaining ?? 2;
  const paidChangeRequired = countableSlugChange && remaining <= 0;

  return (
    <section className="glass rounded-2xl overflow-hidden">
      <div
        className="min-h-[170px] p-5 flex flex-col justify-between relative"
        style={{
          background: BACKGROUNDS.find((b) => b.key === background)?.preview,
        }}
      >
        {cover && (
          <img
            src={assetUrl(cover)}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-45"
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative">
          <p className="text-[11px] text-white/50 uppercase tracking-widest mb-1">Página pública</p>
          <h2 className="text-2xl font-bold text-white">{title || branding?.name || "Tu negocio"}</h2>
          <p className="text-sm text-white/60 mt-1 max-w-md">{description || "Describe tu experiencia, especialidad y lo que hace única tu atención."}</p>
        </div>
        <div className="relative flex items-center gap-2 mt-4">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: theme }} />
          <p className="text-xs text-white/55 truncate">{publicUrl}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <DarkInput label="Nombre del negocio/local" value={title} onChange={setTitle} placeholder="Ej. Estudio Zen" />
          <DarkInput label="URL personalizada" value={slug} onChange={(v) => setSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-"))} placeholder="estudio-zen" />
        </div>

        <div className={`rounded-xl border px-3 py-2 ${paidChangeRequired ? "border-amber-400/25 bg-amber-400/[0.08]" : "border-white/10 bg-white/[0.04]"}`}>
          <p className={`text-xs leading-relaxed ${paidChangeRequired ? "text-amber-300" : "text-white/35"}`}>
            {paidChangeRequired
              ? "Ya usaste tus 2 cambios gratuitos de URL. El siguiente cambio debe cobrarse antes de guardarse."
              : slug.trim() === ""
                ? `Aún no tienes URL personalizada. Escribe una para activar tu link de marca; el primer guardado cuenta como 1 de tus 2 cambios gratuitos.`
                : `Te quedan ${remaining} cambio${remaining === 1 ? "" : "s"} gratuito${remaining === 1 ? "" : "s"} de URL. Al cambiarla se actualiza también el QR.`}
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">
            Mensaje para clientes
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Agenda una atención personalizada con nuestro equipo..."
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.08] transition-all resize-none"
          />
        </div>

        <div className="grid sm:grid-cols-[1fr_160px] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">
              Fondo
            </label>
            <div className="grid grid-cols-5 gap-2">
              {BACKGROUNDS.map((bg) => (
                <button
                  key={bg.key}
                  type="button"
                  onClick={() => setBackground(bg.key)}
                  className={`h-14 rounded-xl border transition-all ${background === bg.key ? "border-white/60 scale-[1.02]" : "border-white/10 hover:border-white/25"}`}
                  style={{ background: bg.preview }}
                  title={bg.label}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">
              Color principal
            </label>
            <input
              type="color"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="h-14 w-full rounded-xl cursor-pointer bg-white/[0.06] border border-white/10 p-1"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-medium text-white/35 uppercase tracking-wider">Imagen de portada</p>
            <p className="text-xs text-white/25 mt-1">Será el fondo principal de tu página de reservas. JPG, PNG, WEBP o GIF hasta 3 MB.</p>
          </div>
          <UploadButton kind="cover" label="Subir portada" onUploaded={setCover} />
        </div>

        <button
          disabled={saving || paidChangeRequired}
          onClick={() => onSave({
            booking_title: title,
            booking_description: description,
            public_slug: slug,
            booking_theme_color: theme,
            booking_background: background,
            booking_cover_url: cover || null,
          })}
          className="w-full py-3 rounded-xl text-sm font-semibold text-black disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99] transition-all"
          style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
        >
          {saving ? "Guardando..." : "Guardar personalización"}
        </button>
      </div>
    </section>
  );
}

function ServiceForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Partial<Service>;
  onSave: (data: Partial<Service> & { name: string; duration_minutes: number }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [duration, setDuration] = useState(initial?.duration_minutes ?? 60);
  const [price, setPrice] = useState<string>(initial?.price != null ? String(initial.price) : "");
  const [color, setColor] = useState(initial?.color ?? "#3b82f6");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [active, setActive] = useState(initial?.is_active ?? true);

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <div className="h-36 relative" style={{ background: `linear-gradient(135deg, ${color}55, #060608)` }}>
        {imageUrl && <img src={assetUrl(imageUrl)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-75" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/5" />
        <div className="absolute bottom-4 left-4 right-4">
          <p className="text-white font-semibold truncate">{name || "Nuevo servicio"}</p>
          <p className="text-xs text-white/55">{duration} min{price !== "" ? ` · $${Number(price).toLocaleString("es-CO")}` : ""}</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <DarkInput label="Nombre del servicio *" value={name} onChange={setName} placeholder="Ej. Corte de cabello" />
        <div>
          <label className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">
            Descripción
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={800}
            placeholder="Qué incluye, para quién es ideal, recomendaciones antes de llegar..."
            className="w-full bg-white/[0.06] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-blue-400/50 focus:bg-white/[0.08] transition-all resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <DarkInput label="Duración (min) *" type="number" value={duration} onChange={(v) => setDuration(Number(v))} min={5} />
          <DarkInput label="Precio (opcional)" type="number" value={price} onChange={setPrice} placeholder="0" min={0} />
        </div>
        <div className="grid grid-cols-[90px_1fr] gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-white/35 mb-1.5 uppercase tracking-wider">
              Color
            </label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-11 w-full rounded-xl cursor-pointer bg-transparent border border-white/10 p-1"
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <UploadButton kind="service" label="Subir imagen" onUploaded={setImageUrl} />
            <label className="flex items-center gap-2 text-xs text-white/45">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
              Activo
            </label>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            disabled={!name || duration < 5}
            onClick={() => onSave({
              ...initial,
              name,
              description: description || undefined,
              duration_minutes: duration,
              price: price !== "" ? Number(price) : undefined,
              color,
              image_url: imageUrl || null,
              is_active: active,
            })}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-black disabled:opacity-40 hover:scale-[1.02] active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
          >
            Guardar
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white/40 border border-white/10 hover:border-white/20 hover:text-white/60 transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceCard({ service, onEdit, onDelete }: { service: Service; onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="glass rounded-2xl overflow-hidden hover:border-white/15 transition-all">
      <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${service.color}66, #111827)` }}>
        {service.image_url && <img src={assetUrl(service.image_url)} alt="" className="absolute inset-0 w-full h-full object-cover opacity-80" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />
        <div className="absolute left-4 right-4 bottom-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: service.color }} />
            <p className="font-semibold text-white text-sm truncate">{service.name}</p>
          </div>
          <p className="text-xs text-white/55 mt-1">
            {service.duration_minutes} min
            {service.price != null && ` · $${service.price.toLocaleString("es-CO")}`}
            {!service.is_active && " · Inactivo"}
          </p>
        </div>
      </div>
      <div className="p-4">
        <p className="text-xs text-white/35 line-clamp-2 min-h-[32px]">
          {service.description || "Sin descripción. Añade detalles para que los clientes entiendan mejor esta experiencia."}
        </p>
        <div className="flex gap-3 justify-end mt-4">
          <button onClick={onEdit} className="text-xs text-white/30 hover:text-blue-400 transition-colors">Editar</button>
          <button onClick={onDelete} className="text-xs text-white/30 hover:text-rose-400 transition-colors">Eliminar</button>
        </div>
      </div>
    </div>
  );
}

export default function ProveedorServicios() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const servicesQuery = useQuery({
    queryKey: ["my-services"],
    queryFn: fetchProviderServices2,
  });

  const brandingQuery = useQuery({
    queryKey: ["provider-branding"],
    queryFn: fetchProviderBranding,
  });

  const saveMutation = useMutation({
    mutationFn: saveService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      setEditing(null);
      toast.success("Servicio guardado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const brandingMutation = useMutation({
    mutationFn: saveProviderBranding,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["provider-branding"] });
      toast.success("Personalización guardada");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteService,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-services"] });
      toast.success("Servicio eliminado");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const services = servicesQuery.data?.services ?? [];
  const activeCount = useMemo(() => services.filter((s) => s.is_active).length, [services]);

  return (
    <AppShell title="Servicios y página pública" navLinks={[{ to: "/proveedor", label: "Panel" }]}>
      <div className="space-y-6">
        {brandingQuery.data?.branding && (
          <BrandingPanel
            branding={brandingQuery.data.branding}
            saving={brandingMutation.isPending}
            onSave={(payload) => brandingMutation.mutate(payload)}
          />
        )}

        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-white/25 uppercase tracking-widest mb-1">Catálogo</p>
              <h2 className="text-base font-semibold text-white">{activeCount} servicio{activeCount === 1 ? "" : "s"} activo{activeCount === 1 ? "" : "s"}</h2>
            </div>
            {editing !== "new" && (
              <button
                onClick={() => setEditing("new")}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-black hover:scale-[1.02] active:scale-[0.98] transition-all"
                style={{ background: "linear-gradient(135deg, #60a5fa, #818cf8)" }}
              >
                Agregar
              </button>
            )}
          </div>

          {editing === "new" && (
            <ServiceForm
              onSave={(d) => saveMutation.mutate(d as Parameters<typeof saveService>[0])}
              onCancel={() => setEditing(null)}
            />
          )}

          {servicesQuery.isLoading ? (
            <p className="text-center py-12 text-white/20 text-sm">Cargando...</p>
          ) : services.length === 0 ? (
            <button
              onClick={() => setEditing("new")}
              className="w-full border border-dashed border-white/10 hover:border-blue-400/40 rounded-2xl py-10 text-sm text-white/25 hover:text-blue-400 transition-all"
            >
              Crea tu primer servicio con imagen, duración, precio y color
            </button>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {services.map((s) =>
                editing === s.id ? (
                  <div key={s.id} className="sm:col-span-2">
                    <ServiceForm
                      initial={s}
                      onSave={(d) => saveMutation.mutate(d as Parameters<typeof saveService>[0])}
                      onCancel={() => setEditing(null)}
                    />
                  </div>
                ) : (
                  <ServiceCard
                    key={s.id}
                    service={s}
                    onEdit={() => setEditing(s.id)}
                    onDelete={() => { if (confirm("¿Eliminar este servicio?")) deleteMutation.mutate(s.id); }}
                  />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
