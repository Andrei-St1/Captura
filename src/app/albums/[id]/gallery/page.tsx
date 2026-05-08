import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { generateQRDataURL } from "@/lib/qr";
import { OwnerUploadButton } from "./OwnerUploadButton";
import { GalleryWithFaces } from "./GalleryWithFaces";

function fmtBytes(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(0)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const CSS = `
  :root {
    --gp-bg:       oklch(97% 0.008 80);
    --gp-bg2:      oklch(94% 0.010 80);
    --gp-border:   oklch(86% 0.010 80);
    --gp-border2:  oklch(78% 0.010 80);
    --gp-text:     oklch(18% 0.015 265);
    --gp-muted:    oklch(46% 0.010 265);
    --gp-muted2:   oklch(58% 0.010 265);
    --gp-gold:     oklch(44% 0.16 72);
    --gp-gold-dim: oklch(36% 0.13 72);
    --gp-gold-glow:oklch(44% 0.16 72 / 0.10);
    --gp-serif:    'Cormorant Garamond', Georgia, serif;
    --gp-sans:     'DM Sans', system-ui, sans-serif;
  }

  body { background: var(--gp-bg); }

  /* ── Nav ── */
  .gp-nav {
    position: sticky;
    top: 0;
    z-index: 50;
    background: var(--gp-bg);
    border-bottom: 1px solid var(--gp-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 32px;
    height: 58px;
  }
  .gp-nav-left  { display: flex; align-items: center; gap: 32px; }
  .gp-nav-right { display: flex; align-items: center; gap: 16px; }

  .gp-brand {
    font-family: var(--gp-serif);
    font-size: 22px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: var(--gp-gold);
    text-decoration: none;
  }

  .gp-navlinks { display: flex; gap: 28px; }
  .gp-navlink {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--gp-muted);
    text-decoration: none;
    padding: 8px 0;
    border-bottom: 2px solid transparent;
    transition: color .15s, border-color .15s;
    white-space: nowrap;
  }
  .gp-navlink:hover { color: var(--gp-text); }
  .gp-navlink.active { color: var(--gp-gold); border-bottom-color: var(--gp-gold); }

  .gp-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: var(--gp-gold-glow);
    border: 1px solid oklch(44% 0.16 72 / 0.22);
    display: flex; align-items: center; justify-content: center;
    font-family: var(--gp-serif);
    font-size: 13px;
    color: var(--gp-gold);
    font-weight: 500;
    flex-shrink: 0;
    text-transform: uppercase;
  }

  .gp-signout {
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--gp-muted);
    text-decoration: none;
    transition: color .15s;
    border: none;
    background: none;
    cursor: pointer;
    font-family: var(--gp-sans);
  }
  .gp-signout:hover { color: var(--gp-text); }

  /* ── Page ── */
  .gp-page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 36px 32px 80px;
  }

  /* ── Breadcrumb ── */
  .gp-breadcrumb {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--gp-muted);
    margin-bottom: 18px;
  }
  .gp-breadcrumb a { color: var(--gp-muted); text-decoration: none; transition: color .15s; }
  .gp-breadcrumb a:hover { color: var(--gp-text); }
  .gp-breadcrumb .sep { opacity: .5; }
  .gp-breadcrumb .current { color: var(--gp-gold); }

  /* ── Page head ── */
  .gp-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 32px;
    flex-wrap: wrap;
  }
  .gp-title {
    font-family: var(--gp-serif);
    font-size: 48px;
    font-weight: 400;
    letter-spacing: -0.01em;
    color: var(--gp-text);
    line-height: 1;
  }
  .gp-meta {
    font-size: 13px;
    color: var(--gp-muted);
    margin-top: 8px;
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .gp-meta-dot {
    width: 3px; height: 3px;
    border-radius: 50%;
    background: var(--gp-muted2);
    flex-shrink: 0;
  }
  .gp-meta strong { color: var(--gp-text); font-weight: 500; }

  .gp-head-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

  .gp-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 18px;
    border-radius: 8px;
    font-family: var(--gp-sans);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    border: 1px solid transparent;
    transition: opacity .2s, border-color .2s, background .2s, transform .15s;
    white-space: nowrap;
  }
  .gp-btn:active { transform: scale(.98); }
  .gp-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.8; stroke-linecap: round; flex-shrink: 0; }
  .gp-btn-ghost {
    background: var(--gp-bg);
    color: var(--gp-text);
    border-color: var(--gp-border);
  }
  .gp-btn-ghost:hover { border-color: var(--gp-border2); }
  .gp-btn-primary { background: var(--gp-gold); color: white; border-color: transparent; }
  .gp-btn-primary:hover { background: var(--gp-gold-dim); }
  .gp-btn-primary:disabled { opacity: .6; cursor: not-allowed; }

  /* ── Pagination ── */
  .gp-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 32px 0 16px;
  }
  .gp-page-btn {
    display: inline-flex;
    align-items: center;
    padding: 9px 18px;
    border-radius: 8px;
    border: 1px solid var(--gp-border);
    background: var(--gp-bg);
    color: var(--gp-text);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: border-color .15s, background .15s;
  }
  .gp-page-btn:not(.disabled):hover {
    border-color: var(--gp-border2);
    background: var(--gp-bg2);
  }
  .gp-page-btn.disabled {
    opacity: .35;
    cursor: default;
  }
  .gp-page-info {
    font-size: 13px;
    color: var(--gp-muted);
    white-space: nowrap;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .gp-nav { padding: 0 16px; }
    .gp-navlinks { display: none; }
    .gp-page { padding: 20px 16px 80px; }
    .gp-title { font-size: 34px; }
    .gp-head { align-items: flex-start; }
    .gp-head-actions { width: 100%; }
    .gp-signout-text { display: none; }
  }
`;

const PAGE_SIZE = 30;

export default async function AlbumGalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: album } = await supabase
    .from("albums")
    .select("id, title, status, used_bytes")
    .eq("id", id)
    .eq("owner_id", user.id)
    .single();

  if (!album || album.status === "deleted") notFound();

  const displayName = user.user_metadata?.full_name ?? user.email ?? "User";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const offset = (page - 1) * PAGE_SIZE;
  const [{ data: media, count }, { data: qrRows }, { data: latestMedia }] = await Promise.all([
    supabase
      .from("media")
      .select("id, file_url, file_type, file_size, mime_type, uploader_name, created_at", { count: "exact" })
      .eq("album_id", album.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1),
    supabase
      .from("qr_codes")
      .select("token, label, enabled")
      .eq("album_id", album.id)
      .eq("enabled", true)
      .order("created_at", { ascending: true })
      .limit(1),
    supabase
      .from("media")
      .select("created_at")
      .eq("album_id", album.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
  ]);

  const mediaItems = media ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const totalBytes = (album as any).used_bytes ?? 0;
  const lastUpload = latestMedia?.created_at ?? null;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  const firstQRRow = qrRows?.[0] ?? null;
  const firstQR = firstQRRow
    ? {
        label: firstQRRow.label,
        joinUrl: `${appUrl}/join/${firstQRRow.token}`,
        dataUrl: await generateQRDataURL(`${appUrl}/join/${firstQRRow.token}`),
      }
    : null;

  return (
    <>
      <style>{CSS}</style>
      <div style={{ minHeight: "100vh", background: "var(--gp-bg)", fontFamily: "var(--gp-sans)", color: "var(--gp-text)" }}>

        {/* ── Nav ── */}
        <nav className="gp-nav">
          <div className="gp-nav-left">
            <Link href="/" className="gp-brand">Captura</Link>
            <div className="gp-navlinks">
              <Link href="/dashboard" className="gp-navlink">Dashboard</Link>
              <Link href="/albums" className="gp-navlink active">Albums</Link>
            </div>
          </div>
          <div className="gp-nav-right">
            <div className="gp-avatar">{initials}</div>
            <form action={logout}>
              <button type="submit" className="gp-signout">
                <span className="gp-signout-text">Sign out</span>
              </button>
            </form>
          </div>
        </nav>

        {/* ── Page ── */}
        <div className="gp-page">

          {/* Breadcrumb */}
          <div className="gp-breadcrumb">
            <Link href="/albums">Albums</Link>
            <span className="sep">/</span>
            <Link href={`/albums/${album.id}`}>{album.title}</Link>
            <span className="sep">/</span>
            <span className="current">Gallery</span>
          </div>

          {/* Page head */}
          <div className="gp-head">
            <div>
              <h1 className="gp-title">{album.title}</h1>
              <div className="gp-meta">
                <span><strong>{totalCount}</strong> {totalCount === 1 ? "file" : "files"}</span>
                {totalBytes > 0 && (
                  <>
                    <span className="gp-meta-dot" />
                    <span>{fmtBytes(totalBytes)}</span>
                  </>
                )}
                {lastUpload && (
                  <>
                    <span className="gp-meta-dot" />
                    <span>Last upload {timeAgo(lastUpload)}</span>
                  </>
                )}
              </div>
            </div>
            <div className="gp-head-actions">
              <Link href={`/albums/${album.id}`} className="gp-btn gp-btn-ghost">
                <svg viewBox="0 0 16 16"><path d="M10 4l-4 4 4 4"/></svg>
                Back to album
              </Link>
              <OwnerUploadButton albumId={album.id} />
            </div>
          </div>

          {/* Gallery panel */}
          <GalleryWithFaces
            items={mediaItems}
            albumId={album.id}
            albumTitle={album.title}
            firstQR={firstQR}
            page={page}
            totalPages={totalPages}
          />
        </div>
      </div>
    </>
  );
}
