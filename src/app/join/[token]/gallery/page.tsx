import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GalleryGrid } from "./GalleryGrid";
import { JoinNav } from "../JoinNav";
import { requireAlbumPin } from "@/lib/pin";

const PAGE_SIZE = 30;

export default async function GalleryPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { token } = await params;
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const supabase = await createClient();

  const { data: qr } = await supabase
    .from("qr_codes")
    .select("id, enabled, expires_at, albums(id, title, status, show_gallery, pin_required, pin_hash, face_finder_enabled)")
    .eq("token", token)
    .single();

  if (!qr) notFound();

  const album = qr.albums as any;
  if (!album || album.status === "deleted") notFound();

  if (album.pin_required && album.pin_hash) {
    await requireAlbumPin(album.id, album.pin_hash, token);
  }

  if (!album.show_gallery) {
    return (
      <>
        <style>{CSS}</style>
        <div className="gl-root" style={{ alignItems: "center", justifyContent: "center" }}>
          <div className="gl-private-box">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "oklch(58% 0.010 265)" }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <p className="gl-private-title">Gallery is private</p>
            <p className="gl-private-body">The album owner has disabled public gallery viewing.</p>
            <Link href={`/join/${token}`} className="gl-private-back">← Back to album</Link>
          </div>
        </div>
      </>
    );
  }

  const offset = (page - 1) * PAGE_SIZE;
  const { data: media, count } = await supabase
    .from("media")
    .select("id, file_url, file_type, file_size, uploader_name, created_at", { count: "exact" })
    .eq("album_id", album.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  const items = media ?? [];
  const totalCount = count ?? 0;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <>
      <style>{CSS}</style>
      <div className="gl-root">

        {/* ── Header: 3-column grid so nav sits exactly in the middle ── */}
        <header className="gl-header">
          <div className="gl-header-left">
            <Link href={`/join/${token}`} className="gl-back">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7" /><path d="M19 12H5" />
              </svg>
              Back
            </Link>
            <span className="gl-album-title">{album.title}</span>
          </div>

          {/* center — desktop: JoinNav tabs; mobile: album title */}
          <div className="gl-header-center">
            <span className="gl-title-mobile">{album.title}</span>
            <JoinNav token={token} showGallery={true} />
          </div>

          <div className="gl-header-right">
            <span className="gl-count">{totalCount} {totalCount === 1 ? "file" : "files"}</span>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="gl-main">
          {items.length === 0 ? (
            <div className="gl-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "oklch(65% 0.010 265)" }}>
                <rect width="18" height="18" x="3" y="3" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <p className="gl-empty-title">Nothing here yet</p>
              <p className="gl-empty-body">Be the first to add a memory to this album.</p>
              <Link href={`/join/${token}/upload`} className="gl-empty-cta">Add yours →</Link>
            </div>
          ) : (
            <GalleryGrid
            items={items}
            albumId={album.id}
            faceFinderEnabled={!!album.face_finder_enabled}
            token={token}
            page={page}
            totalPages={totalPages}
          />
          )}
        </main>

        <p className="gl-powered">
          Powered by <Link href="/">Captura</Link>
        </p>
      </div>
    </>
  );
}

const CSS = `
  .gl-root {
    min-height: 100vh;
    background: oklch(97% 0.008 80);
    color: oklch(18% 0.015 265);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    display: flex;
    flex-direction: column;
  }

  /* ── Header ── */
  .gl-header {
    position: sticky; top: 0; z-index: 40;
    background: oklch(97% 0.008 80 / 0.88);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-bottom: 1px solid oklch(80% 0.010 80);
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    padding: 0 24px;
    height: 64px;
    gap: 16px;
  }

  .gl-header-left {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .gl-back {
    display: inline-flex; align-items: center; gap: 5px;
    font-size: 12px; color: oklch(46% 0.010 265);
    text-decoration: none; transition: color .15s;
  }
  .gl-back:hover { color: oklch(18% 0.015 265); }

  .gl-header-center {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .gl-album-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 17px; font-weight: 400;
    color: oklch(18% 0.015 265);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }

  /* mobile-only title in center column */
  .gl-title-mobile {
    display: none;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 16px; font-weight: 400;
    color: oklch(18% 0.015 265);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 160px;
    text-align: center;
  }

  .gl-header-right {
    display: flex;
    justify-content: flex-end;
    align-items: center;
  }

  .gl-count {
    font-size: 13px;
    color: oklch(46% 0.010 265);
  }

  /* ── Main ── */
  .gl-main {
    flex: 1;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    padding: 28px 16px 100px;  /* 100px bottom = room for mobile nav */
  }

  /* ── Empty state ── */
  .gl-empty {
    display: flex; flex-direction: column; align-items: center;
    padding: 80px 20px;
    text-align: center;
    gap: 10px;
  }
  .gl-empty-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 26px; font-weight: 400;
    color: oklch(18% 0.015 265);
    margin-top: 8px;
  }
  .gl-empty-body {
    font-size: 14px;
    color: oklch(46% 0.010 265);
    line-height: 1.6;
    max-width: 320px;
  }
  .gl-empty-cta {
    margin-top: 12px;
    display: inline-flex; align-items: center;
    padding: 11px 28px;
    background: oklch(44% 0.16 72);
    color: oklch(97% 0.008 80);
    border-radius: 10px;
    font-size: 13px; font-weight: 600;
    text-decoration: none;
    transition: opacity .2s, transform .15s;
  }
  .gl-empty-cta:hover { opacity: .88; transform: translateY(-1px); }

  /* ── Private box ── */
  .gl-private-box {
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 20px;
    padding: 48px 32px;
    text-align: center;
    max-width: 380px;
    width: 100%;
    margin: 0 24px;
    display: flex; flex-direction: column; align-items: center; gap: 10px;
  }
  .gl-private-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 24px; font-weight: 400;
    color: oklch(18% 0.015 265);
  }
  .gl-private-body {
    font-size: 13px; color: oklch(46% 0.010 265); line-height: 1.6;
  }
  .gl-private-back {
    margin-top: 8px;
    font-size: 13px; font-weight: 600;
    color: oklch(44% 0.16 72);
    text-decoration: none;
  }
  .gl-private-back:hover { text-decoration: underline; }

  /* ── Powered ── */
  .gl-powered {
    padding: 16px;
    text-align: center;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: oklch(65% 0.010 265);
  }
  .gl-powered a { color: oklch(44% 0.16 72); text-decoration: none; }
  .gl-powered a:hover { text-decoration: underline; }

  /* ── Pagination ── */
  .gl-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    padding: 32px 0 16px;
  }
  .gl-page-btn {
    display: inline-flex;
    align-items: center;
    padding: 9px 18px;
    border-radius: 8px;
    border: 1px solid oklch(80% 0.010 80);
    background: oklch(97% 0.008 80);
    color: oklch(18% 0.015 265);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    transition: border-color .15s, background .15s;
  }
  .gl-page-btn:not(.disabled):hover {
    border-color: oklch(65% 0.012 80);
    background: oklch(93% 0.010 80);
  }
  .gl-page-btn.disabled {
    opacity: .35;
    cursor: default;
  }
  .gl-page-info {
    font-size: 13px;
    color: oklch(46% 0.010 265);
    white-space: nowrap;
  }

  /* ── Mobile ── */
  @media (max-width: 768px) {
    .gl-header { padding: 0 16px; height: 52px; }
    .gl-header-left { flex-direction: row; align-items: center; gap: 4px; }
    .gl-album-title { display: none; }      /* hide title from left column */
    .gl-title-mobile { display: block; }    /* show title in center column */
    .gl-main { padding-bottom: 100px; }
  }
`;
