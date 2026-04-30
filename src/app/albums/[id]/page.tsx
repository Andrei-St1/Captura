import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { generateQRDataURL } from "@/lib/qr";
import { UploadsPreview } from "./UploadsPreview";
import { AlbumStatusButton } from "./AlbumStatusButton";
import { QRCodesSection } from "./QRCodesSection";
import { DeleteAlbumButton } from "./DeleteAlbumButton";
import { OwnerUploadButton } from "./gallery/OwnerUploadButton";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function usagePercent(usedBytes: number, allocatedGb: number) {
  const total = allocatedGb * 1024 * 1024 * 1024;
  if (total === 0) return 0;
  return Math.min(100, Math.round((usedBytes / total) * 100));
}

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function AlbumPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!album) notFound();

  const displayName = user.user_metadata?.full_name ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Fetch last 4 + total count
  const [{ data: recentMedia }, { count: mediaCount }] = await Promise.all([
    supabase
      .from("media")
      .select("id, file_url, file_type, uploader_name, created_at")
      .eq("album_id", album.id)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("media")
      .select("*", { count: "exact", head: true })
      .eq("album_id", album.id),
  ]);

  const recentItems = recentMedia ?? [];
  const totalMediaCount = mediaCount ?? 0;

  // Fetch QR codes + generate data URLs
  const { data: qrRows } = await supabase
    .from("qr_codes")
    .select("id, token, label, enabled, expires_at, created_at")
    .eq("album_id", album.id)
    .order("created_at", { ascending: true });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const qrCodes = await Promise.all(
    (qrRows ?? []).map(async (qr) => {
      const joinUrl = `${appUrl}/join/${qr.token}`;
      const dataUrl = await generateQRDataURL(joinUrl);
      return { ...qr, joinUrl, dataUrl };
    })
  );

  const percent = usagePercent(album.used_bytes ?? 0, album.allocated_gb);

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(78,68,74,0.06)]">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <Link href="/" className="font-noto-serif text-xl font-light tracking-tighter text-primary">Captura</Link>
            <div className="hidden md:flex gap-8 items-center h-full">
              <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">
                Dashboard
              </Link>
              <Link href="/albums" className="text-primary font-semibold border-b-2 border-primary font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">
                Albums
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold ring-2 ring-outline-variant/20 ring-offset-2 ring-offset-surface select-none">
              {initials}
            </div>
            <form action={logout}>
              <button type="submit" className="hidden sm:block text-[11px] text-on-surface-variant hover:text-primary transition-colors font-medium tracking-widest uppercase">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-8 max-w-screen-xl mx-auto">

        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
          <Link href="/dashboard" className="hover:text-primary transition">Dashboard</Link>
          <span>/</span>
          <span className="text-on-surface font-medium truncate">{album.title}</span>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-12">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase ${
                album.status === "active"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-surface-container text-on-surface-variant"
              }`}>
                {album.status}
              </span>
            </div>
            <h1 className="font-noto-serif text-4xl font-light text-on-surface tracking-tight">
              {album.title}
            </h1>
            {album.description && (
              <p className="mt-2 text-on-surface-variant max-w-xl">{album.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Link
              href={`/albums/${album.id}/welcome`}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-primary-container px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:scale-[1.02] transition-all"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Personalize welcome page
            </Link>
            <Link
              href={`/albums/${album.id}/edit`}
              className="flex items-center gap-2 rounded-xl border border-outline-variant/40 px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              Edit album
            </Link>
            <AlbumStatusButton albumId={album.id} currentStatus={album.status} />
            <DeleteAlbumButton albumId={album.id} albumTitle={album.title} />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">

          {/* ── Left column ────────────────────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: "Media files", value: String(totalMediaCount),             icon: "photo_library" },
                { label: "Allocated",   value: `${album.allocated_gb} GB`,         icon: "cloud"         },
                { label: "Used",        value: formatBytes(album.used_bytes ?? 0), icon: "cloud_done"    },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-surface-container-low rounded-xl p-5">
                  <span className="material-symbols-outlined text-primary-container mb-2" style={{ fontSize: "20px" }}>
                    {icon}
                  </span>
                  <p className="font-noto-serif text-2xl text-on-surface">{value}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Storage bar */}
            <div className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/30 p-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-on-surface">Storage usage</span>
                <span className="text-sm text-on-surface-variant">
                  {formatBytes(album.used_bytes ?? 0)} / {album.allocated_gb} GB
                </span>
              </div>
              <div className="w-full bg-outline-variant/20 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full transition-all ${
                    percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-primary"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-on-surface-variant">{percent}% used</p>
            </div>

            {/* Album details */}
            <div className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/30 overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20">
                <h2 className="font-noto-serif text-lg font-light text-on-surface">Details</h2>
              </div>
              <div className="divide-y divide-outline-variant/10">
                {[
                  { label: "Open date",                  value: formatDate(album.open_date)  },
                  { label: "Close date",                 value: formatDate(album.close_date) },
                  { label: "Gallery visible to guests",  value: album.show_gallery ? "Yes" : "No" },
                  { label: "Created",                    value: formatDate(album.created_at) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center px-6 py-4">
                    <span className="text-sm text-on-surface-variant">{label}</span>
                    <span className="text-sm font-medium text-on-surface">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Welcome message */}
            {album.welcome_message && (
              <div className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/30 p-6">
                <h2 className="font-noto-serif text-lg font-light text-on-surface mb-3">Welcome message</h2>
                <p className="text-sm text-on-surface-variant leading-relaxed italic">
                  &ldquo;{album.welcome_message}&rdquo;
                </p>
              </div>
            )}

            {/* Uploads */}
            <div className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/30 overflow-hidden">
              <div className="bg-surface-container-low px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-noto-serif text-lg font-light text-on-surface">Recent uploads</h2>
                  {totalMediaCount > 0 && (
                    <span className="text-xs text-on-surface-variant">{totalMediaCount} {totalMediaCount === 1 ? "file" : "files"} total</span>
                  )}
                </div>
                <OwnerUploadButton albumId={album.id} compact />
              </div>
              <UploadsPreview
                items={recentItems}
                totalCount={totalMediaCount}
                albumId={album.id}
                firstQR={qrCodes.find(q => q.enabled) ?? qrCodes[0] ?? null}
              />
            </div>

          </div>

          {/* ── Right column: QR codes ──────────────────────────────── */}
          <div>
            <div className="bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/30 overflow-hidden sticky top-24">
              <QRCodesSection albumId={album.id} qrCodes={qrCodes} />
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
