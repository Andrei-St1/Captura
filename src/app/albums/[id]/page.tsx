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
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

  const appUrl = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  const qrCodes = await Promise.all(
    (qrRows ?? []).map(async (qr) => {
      const joinUrl = `${appUrl}/join/${qr.token}`;
      const dataUrl = await generateQRDataURL(joinUrl);
      return { ...qr, joinUrl, dataUrl };
    })
  );

  const percent = usagePercent(album.used_bytes ?? 0, album.allocated_gb);

  const storageFillColor =
    percent >= 90
      ? "oklch(52% 0.20 25)"
      : percent >= 70
      ? "oklch(68% 0.17 55)"
      : undefined;

  return (
    <>
      <style>{`
        :root {
          --ap-bg:       oklch(97% 0.008 80);
          --ap-bg2:      oklch(94% 0.010 80);
          --ap-bg3:      oklch(90% 0.012 80);
          --ap-border:   oklch(86% 0.010 80);
          --ap-border2:  oklch(78% 0.010 80);
          --ap-text:     oklch(18% 0.015 265);
          --ap-muted:    oklch(46% 0.010 265);
          --ap-muted2:   oklch(58% 0.010 265);
          --ap-gold:     oklch(44% 0.16 72);
          --ap-gold-dim: oklch(36% 0.13 72);
          --ap-gold-glow:oklch(44% 0.16 72 / 0.10);
          --ap-gold-b:   oklch(44% 0.16 72 / 0.22);
          --ap-green:    oklch(54% 0.14 155);
          --ap-green-bg: oklch(54% 0.14 155 / 0.10);
          --ap-red:      oklch(52% 0.20 25);
          --ap-red-bg:   oklch(52% 0.20 25 / 0.08);
          --ap-serif:    'Cormorant Garamond', Georgia, serif;
          --ap-sans:     'DM Sans', system-ui, sans-serif;
        }

        .ap-page {
          background: var(--ap-bg);
          color: var(--ap-text);
          font-family: var(--ap-sans);
          font-weight: 300;
          min-height: 100vh;
          -webkit-font-smoothing: antialiased;
        }

        /* Nav */
        .ap-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 32px;
          background: var(--ap-bg);
          border-bottom: 1px solid var(--ap-border);
          position: sticky;
          top: 0;
          z-index: 50;
        }
        .ap-nav-left { display: flex; align-items: center; gap: 32px; }
        .ap-brand {
          font-family: var(--ap-serif);
          font-size: 22px;
          font-weight: 500;
          letter-spacing: 0.06em;
          color: var(--ap-gold);
          text-decoration: none;
        }
        .ap-nav-links { display: flex; gap: 28px; }
        .ap-nav-link {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ap-muted);
          text-decoration: none;
          padding: 8px 0;
          border-bottom: 2px solid transparent;
          transition: color .15s, border-color .15s;
        }
        .ap-nav-link:hover { color: var(--ap-text); }
        .ap-nav-link.active { color: var(--ap-gold); border-bottom-color: var(--ap-gold); }
        .ap-nav-right { display: flex; align-items: center; gap: 14px; }
        .ap-user-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--ap-gold-glow);
          border: 1px solid var(--ap-gold-b);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: var(--ap-serif);
          font-size: 13px;
          color: var(--ap-gold);
          font-weight: 500;
          user-select: none;
          flex-shrink: 0;
        }
        .ap-signout {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ap-muted);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          font-family: var(--ap-sans);
        }
        .ap-signout:hover { color: var(--ap-text); }

        /* Page wrapper */
        .ap-main {
          max-width: 1280px;
          margin: 0 auto;
          padding: 36px 32px 80px;
        }

        /* Breadcrumb */
        .ap-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--ap-muted);
          margin-bottom: 24px;
        }
        .ap-breadcrumb a { color: var(--ap-muted); text-decoration: none; }
        .ap-breadcrumb a:hover { color: var(--ap-text); }
        .ap-breadcrumb .sep { opacity: .5; }
        .ap-breadcrumb .current { color: var(--ap-gold); }

        /* Album head */
        .ap-album-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 32px;
          margin-bottom: 36px;
          flex-wrap: wrap;
        }
        .ap-head-left { flex: 1; min-width: 300px; }
        .ap-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          border-radius: 100px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 14px;
        }
        .ap-status-pill.active {
          background: var(--ap-green-bg);
          color: var(--ap-green);
        }
        .ap-status-pill.archived {
          background: var(--ap-bg3);
          color: var(--ap-muted);
        }
        .ap-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .ap-status-pill.active .ap-status-dot { background: var(--ap-green); }
        .ap-status-pill.archived .ap-status-dot { background: var(--ap-muted2); }
        .ap-album-title {
          font-family: var(--ap-serif);
          font-size: 54px;
          font-weight: 400;
          letter-spacing: -0.01em;
          line-height: 1;
          color: var(--ap-text);
        }
        .ap-album-sub {
          font-family: var(--ap-serif);
          font-style: italic;
          font-size: 20px;
          color: var(--ap-gold);
          margin-top: 8px;
          font-weight: 400;
        }
        .ap-head-actions { display: flex; gap: 8px; flex-wrap: wrap; }

        /* Buttons */
        .ap-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-family: var(--ap-sans);
          font-size: 12px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: opacity .2s, border-color .2s, background .2s;
          border: 1px solid transparent;
          white-space: nowrap;
          background: none;
          color: inherit;
        }
        .ap-btn svg {
          width: 14px;
          height: 14px;
          stroke: currentColor;
          fill: none;
          stroke-width: 1.7;
          stroke-linecap: round;
          stroke-linejoin: round;
          flex-shrink: 0;
        }
        .ap-btn-primary { background: var(--ap-gold); color: white; }
        .ap-btn-primary:hover { background: var(--ap-gold-dim); }
        .ap-btn-ghost {
          background: var(--ap-bg);
          color: var(--ap-text);
          border-color: var(--ap-border);
        }
        .ap-btn-ghost:hover { border-color: var(--ap-border2); }
        .ap-btn-danger {
          background: var(--ap-bg);
          color: var(--ap-red);
          border-color: oklch(52% 0.20 25 / 0.25);
        }
        .ap-btn-danger:hover { background: var(--ap-red-bg); }

        /* 2-col grid */
        .ap-grid {
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 24px;
          align-items: start;
        }
        .ap-col-main { display: flex; flex-direction: column; gap: 20px; }
        .ap-col-side {
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: sticky;
          top: 90px;
        }

        /* Card */
        .ap-card {
          background: var(--ap-bg);
          border: 1px solid var(--ap-border);
          border-radius: 18px;
          padding: 24px;
        }
        .ap-card-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
          gap: 12px;
        }
        .ap-card-title {
          font-family: var(--ap-serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--ap-text);
        }
        .ap-card-eyebrow {
          font-size: 10px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: var(--ap-muted);
          font-weight: 500;
          margin-top: 4px;
        }

        /* Stats */
        .ap-stats-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
        }
        .ap-stat {
          padding: 22px;
          background: var(--ap-bg);
          border: 1px solid var(--ap-border);
          border-radius: 14px;
          display: flex;
          flex-direction: column;
          gap: 14px;
          transition: border-color .2s;
        }
        .ap-stat:hover { border-color: var(--ap-border2); }
        .ap-stat-icon {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          background: var(--ap-gold-glow);
          color: var(--ap-gold);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .ap-stat-icon svg {
          width: 17px;
          height: 17px;
          stroke: currentColor;
          fill: none;
          stroke-width: 1.6;
          stroke-linecap: round;
          stroke-linejoin: round;
        }
        .ap-stat-num {
          font-family: var(--ap-serif);
          font-size: 36px;
          font-weight: 400;
          line-height: 1;
          color: var(--ap-text);
          letter-spacing: -0.01em;
        }
        .ap-stat-num small {
          font-size: 18px;
          color: var(--ap-muted);
          font-weight: 300;
          margin-left: 4px;
        }
        .ap-stat-label {
          font-size: 11px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--ap-muted);
          font-weight: 500;
          margin-top: 4px;
        }

        /* Storage bar */
        .ap-storage-bar-head {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 10px;
        }
        .ap-storage-bar-head .left {
          font-size: 13px;
          color: var(--ap-text);
          font-weight: 500;
        }
        .ap-storage-bar-head .right {
          font-size: 12px;
          color: var(--ap-muted);
          font-variant-numeric: tabular-nums;
        }
        .ap-storage-track {
          height: 6px;
          background: var(--ap-bg3);
          border-radius: 100px;
          overflow: hidden;
        }
        .ap-storage-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--ap-gold-dim), var(--ap-gold));
          border-radius: 100px;
          min-width: 4px;
        }
        .ap-storage-pct {
          font-size: 11px;
          color: var(--ap-muted);
          margin-top: 8px;
          letter-spacing: 0.04em;
        }

        /* Details list */
        .ap-details-list { display: flex; flex-direction: column; }
        .ap-detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 0;
          border-bottom: 1px solid var(--ap-border);
        }
        .ap-detail-row:last-child { border-bottom: none; padding-bottom: 0; }
        .ap-detail-row:first-child { padding-top: 0; }
        .ap-detail-label { font-size: 13px; color: var(--ap-muted); }
        .ap-detail-value {
          font-size: 13px;
          color: var(--ap-text);
          font-weight: 500;
          font-variant-numeric: tabular-nums;
        }
        .ap-detail-value.yes { color: var(--ap-green); }

        /* Uploads card */
        .ap-uploads-card {
          background: var(--ap-bg);
          border: 1px solid var(--ap-border);
          border-radius: 18px;
          overflow: hidden;
        }
        .ap-uploads-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 20px 24px;
          border-bottom: 1px solid var(--ap-border);
        }

        /* Thumb hover */
        .ap-thumb { display: block; }
        .ap-thumb-img { display: block; }
        .ap-thumb:hover .ap-thumb-img { transform: scale(1.05); }
        .ap-thumb-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, transparent 60%, oklch(0% 0 0 / 0.5) 100%);
          opacity: 0;
          transition: opacity .2s;
          display: flex;
          align-items: flex-end;
          padding: 10px;
        }
        .ap-thumb:hover .ap-thumb-overlay { opacity: 1; }
        .ap-thumb-meta {
          color: white;
          font-size: 10px;
          letter-spacing: 0.04em;
          font-weight: 500;
          text-shadow: 0 1px 4px oklch(0% 0 0 / 0.6);
        }

        /* View all link */
        .ap-view-all:hover {
          border-color: var(--ap-gold-b) !important;
          background: var(--ap-gold-glow) !important;
        }

        /* Responsive */
        @media (max-width: 960px) {
          .ap-grid { grid-template-columns: 1fr; }
          .ap-col-side { position: static; }
        }
        @media (max-width: 760px) {
          .ap-nav { padding: 12px 16px; }
          .ap-nav-left { gap: 18px; }
          .ap-brand { font-size: 18px; }
          .ap-nav-link { font-size: 10px; letter-spacing: 0.1em; }
          .ap-signout { display: none; }
          .ap-main { padding: 20px 16px 100px; }
          .ap-album-title { font-size: 38px; }
          .ap-album-sub { font-size: 16px; }
          .ap-album-head { gap: 16px; }
          .ap-head-actions { width: 100%; }
          .ap-head-actions .ap-btn {
            flex: 1;
            justify-content: center;
            font-size: 11px;
            padding: 9px 10px;
          }
          .ap-stats-row { grid-template-columns: 1fr; }
          .ap-stat { flex-direction: row; align-items: center; }
          .ap-card { padding: 18px; }
        }
      `}</style>

      <div className="ap-page">

        {/* ── Navbar ───────────────────────────────────────────────────── */}
        <nav className="ap-nav">
          <div className="ap-nav-left">
            <Link href="/" className="ap-brand">Captura</Link>
            <div className="ap-nav-links">
              <Link href="/dashboard" className="ap-nav-link">Dashboard</Link>
              <Link href="/albums" className="ap-nav-link active">Albums</Link>
            </div>
          </div>
          <div className="ap-nav-right">
            <div className="ap-user-avatar">{initials}</div>
            <form action={logout}>
              <button type="submit" className="ap-signout">Sign out</button>
            </form>
          </div>
        </nav>

        <div className="ap-main">

          {/* Breadcrumb */}
          <div className="ap-breadcrumb">
            <Link href="/dashboard">Dashboard</Link>
            <span className="sep">/</span>
            <Link href="/albums">Albums</Link>
            <span className="sep">/</span>
            <span className="current">{album.title}</span>
          </div>

          {/* Album head */}
          <div className="ap-album-head">
            <div className="ap-head-left">
              <div className={`ap-status-pill ${album.status === "active" ? "active" : "archived"}`}>
                <span className="ap-status-dot" />
                {album.status === "active" ? "Active" : "Archived"}
              </div>
              <h1 className="ap-album-title">{album.title}</h1>
              {album.description && (
                <div className="ap-album-sub">{album.description}</div>
              )}
            </div>
            <div className="ap-head-actions">
              <Link
                href={`/albums/${album.id}/welcome`}
                className="ap-btn ap-btn-primary"
              >
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 2l3 3-9 9H2v-3z" />
                </svg>
                Personalize welcome page
              </Link>
              <Link
                href={`/albums/${album.id}/edit`}
                className="ap-btn ap-btn-ghost"
              >
                <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 2l3 3-9 9H2v-3z" />
                </svg>
                Edit album
              </Link>
              <AlbumStatusButton albumId={album.id} currentStatus={album.status} />
              <DeleteAlbumButton albumId={album.id} albumTitle={album.title} />
            </div>
          </div>

          <div className="ap-grid">

            {/* ── Left column ──────────────────────────────────────── */}
            <div className="ap-col-main">

              {/* Stats row */}
              <div className="ap-stats-row">
                <div className="ap-stat">
                  <div className="ap-stat-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <circle cx="9" cy="11" r="2" />
                      <path d="M3 17l5-5 4 4 3-3 6 6" />
                    </svg>
                  </div>
                  <div>
                    <div className="ap-stat-num">{totalMediaCount}</div>
                    <div className="ap-stat-label">Media files</div>
                  </div>
                </div>

                <div className="ap-stat">
                  <div className="ap-stat-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7 18a5 5 0 010-10 6 6 0 0111.5 1A4.5 4.5 0 0118 18H7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="ap-stat-num">
                      {album.allocated_gb}
                      <small>GB</small>
                    </div>
                    <div className="ap-stat-label">Allocated</div>
                  </div>
                </div>

                <div className="ap-stat">
                  <div className="ap-stat-icon">
                    <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                    </svg>
                  </div>
                  <div>
                    <div className="ap-stat-num">
                      {(album.used_bytes ?? 0) >= 1024 ** 3
                        ? ((album.used_bytes ?? 0) / 1024 ** 3).toFixed(2)
                        : ((album.used_bytes ?? 0) / 1024 ** 2).toFixed(1)}
                      <small>
                        {(album.used_bytes ?? 0) >= 1024 ** 3 ? "GB" : "MB"}
                      </small>
                    </div>
                    <div className="ap-stat-label">Used</div>
                  </div>
                </div>
              </div>

              {/* Storage bar */}
              <div className="ap-card">
                <div className="ap-storage-bar-head">
                  <span className="left">Storage usage</span>
                  <span className="right">
                    {formatBytes(album.used_bytes ?? 0)} / {album.allocated_gb} GB
                  </span>
                </div>
                <div className="ap-storage-track">
                  <div
                    className="ap-storage-fill"
                    style={{
                      width: `${Math.max(percent, 0.08)}%`,
                      ...(storageFillColor
                        ? { background: storageFillColor }
                        : {}),
                    }}
                  />
                </div>
                <div className="ap-storage-pct">{percent}% used</div>
              </div>

              {/* Details card */}
              <div className="ap-card">
                <div className="ap-card-head">
                  <div className="ap-card-title">Details</div>
                </div>
                <div className="ap-details-list">
                  <div className="ap-detail-row">
                    <span className="ap-detail-label">Open date</span>
                    <span className="ap-detail-value">{formatDate(album.open_date)}</span>
                  </div>
                  <div className="ap-detail-row">
                    <span className="ap-detail-label">Close date</span>
                    <span className="ap-detail-value">{formatDate(album.close_date)}</span>
                  </div>
                  <div className="ap-detail-row">
                    <span className="ap-detail-label">Gallery visible to guests</span>
                    <span className={`ap-detail-value${album.show_gallery ? " yes" : ""}`}>
                      {album.show_gallery ? "Yes" : "No"}
                    </span>
                  </div>
                  <div className="ap-detail-row">
                    <span className="ap-detail-label">Created</span>
                    <span className="ap-detail-value">{formatDate(album.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Welcome message */}
              {album.welcome_message && (
                <div className="ap-card">
                  <div className="ap-card-title" style={{ marginBottom: "12px" }}>
                    Welcome message
                  </div>
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--ap-muted)",
                      lineHeight: 1.7,
                      fontStyle: "italic",
                      fontFamily: "var(--ap-serif)",
                    }}
                  >
                    &ldquo;{album.welcome_message}&rdquo;
                  </p>
                </div>
              )}

              {/* Uploads card */}
              <div className="ap-uploads-card">
                <div className="ap-uploads-head">
                  <div>
                    <div className="ap-card-title">Recent uploads</div>
                    {totalMediaCount > 0 && (
                      <div className="ap-card-eyebrow">
                        {totalMediaCount} {totalMediaCount === 1 ? "file" : "files"} total
                      </div>
                    )}
                  </div>
                  <OwnerUploadButton albumId={album.id} compact />
                </div>
                <UploadsPreview
                  items={recentItems}
                  totalCount={totalMediaCount}
                  albumId={album.id}
                  firstQR={qrCodes.find((q) => q.enabled) ?? qrCodes[0] ?? null}
                />
              </div>

            </div>

            {/* ── Right column: QR codes ───────────────────────── */}
            <div className="ap-col-side">
              <div
                style={{
                  background: "var(--ap-bg)",
                  border: "1px solid var(--ap-border)",
                  borderRadius: "18px",
                  overflow: "hidden",
                }}
              >
                <QRCodesSection albumId={album.id} qrCodes={qrCodes} />
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
