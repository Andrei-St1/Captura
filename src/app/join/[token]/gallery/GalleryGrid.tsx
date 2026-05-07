"use client";

import { useState } from "react";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploader_name: string | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function formatBytes(bytes: number) {
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

async function downloadFile(id: string) {
  const res = await fetch(`/api/download-file?mediaId=${id}`);
  if (!res.ok) return;
  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  const cd   = res.headers.get("content-disposition") ?? "";
  const name = cd.match(/filename="([^"]+)"/)?.[1] ?? "photo";
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function GalleryGrid({ items }: { items: MediaItem[] }) {
  const [lightbox, setLightbox]       = useState<MediaItem | null>(null);
  const [downloading, setDownloading] = useState(false);
  const touchStartX = { current: 0 };

  function navigate(dir: 1 | -1) {
    if (!lightbox) return;
    const idx = items.findIndex((i) => i.id === lightbox.id);
    setLightbox(items[(idx + dir + items.length) % items.length]);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) < 40) return;   // ignore taps
    navigate(delta < 0 ? 1 : -1);
  }

  return (
    <>
      <style>{LIGHTBOX_CSS}</style>

      {/* ── Masonry grid ── */}
      <div className="columns-2 sm:columns-3 md:columns-4" style={{ columnGap: "8px" }}>
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setLightbox(item)}
            className="gl-item break-inside-avoid"
            style={{ marginBottom: "8px" }}
          >
            {item.file_type === "video" ? (
              <div className="gl-video-thumb">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.file_url}
                alt={item.uploader_name ?? "Photo"}
                className="gl-img"
                loading="lazy"
                onError={(e) => {
                  const t = e.currentTarget as HTMLImageElement;
                  t.style.display = "none";
                  const p = t.parentElement;
                  if (p) { p.style.background = "oklch(89% 0.012 80)"; p.style.minHeight = "120px"; }
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="gl-overlay" onClick={() => setLightbox(null)}>
          <div className="gl-modal" onClick={(e) => e.stopPropagation()}>

            {/* Top bar */}
            <div className="gl-topbar">
              <button className="gl-icon-btn" onClick={() => setLightbox(null)} title="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>

              <div className="gl-meta">
                {lightbox.uploader_name && <span className="gl-uploader">{lightbox.uploader_name}</span>}
                <span className="gl-date-size">{formatDate(lightbox.created_at)} · {formatBytes(lightbox.file_size)}</span>
              </div>

              <button
                className="gl-save-btn"
                disabled={downloading}
                onClick={async () => {
                  setDownloading(true);
                  await downloadFile(lightbox.id);
                  setDownloading(false);
                }}
                title="Save"
              >
                {downloading ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: "gl-spin 1s linear infinite" }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                ) : (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                {downloading ? "Saving…" : "Save"}
              </button>
            </div>

            {/* Media — swipeable on mobile */}
            <div
              className="gl-media-wrap"
              onTouchStart={onTouchStart}
              onTouchEnd={onTouchEnd}
            >
              {lightbox.file_type === "video" ? (
                <video src={lightbox.file_url} controls autoPlay className="gl-media" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lightbox.file_url} alt={lightbox.uploader_name ?? "Photo"} className="gl-media" />
              )}
            </div>

            {/* Prev / Next */}
            {items.length > 1 && (
              <>
                <button
                  className="gl-arrow gl-arrow-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = items.findIndex((i) => i.id === lightbox.id);
                    setLightbox(items[(idx - 1 + items.length) % items.length]);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button
                  className="gl-arrow gl-arrow-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = items.findIndex((i) => i.id === lightbox.id);
                    setLightbox(items[(idx + 1) % items.length]);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const LIGHTBOX_CSS = `
  @keyframes gl-spin { to { transform: rotate(360deg); } }
  @keyframes gl-fadein { from { opacity: 0; } to { opacity: 1; } }

  /* ── Masonry item ── */
  .gl-item {
    border-radius: 10px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    display: block;
    transition: transform .2s, box-shadow .2s;
  }
  .gl-item:hover { transform: translateY(-2px); box-shadow: 0 8px 24px oklch(0% 0 0 / 0.15); }

  .gl-img {
    width: 100%;
    height: auto;
    display: block;
    border-radius: 10px;
  }

  .gl-video-thumb {
    width: 100%;
    aspect-ratio: 4 / 3;
    background: linear-gradient(135deg, oklch(16% 0.03 265), oklch(22% 0.04 265));
    display: flex; align-items: center; justify-content: center;
    border-radius: 10px;
  }

  /* ── Lightbox ── */
  .gl-overlay {
    position: fixed; inset: 0; z-index: 500;
    background: oklch(6% 0.005 265 / 0.95);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    animation: gl-fadein .18s ease;
  }

  .gl-modal {
    position: relative;
    width: 100%;
    max-width: 900px;
    max-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: 0 8px 8px;
  }

  /* ── Top bar ── */
  .gl-topbar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 8px;
    flex-shrink: 0;
  }

  .gl-icon-btn {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: oklch(100% 0 0 / 0.10);
    border: 1px solid oklch(100% 0 0 / 0.14);
    color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: background .15s;
  }
  .gl-icon-btn:hover { background: oklch(100% 0 0 / 0.18); }

  .gl-meta {
    flex: 1;
    display: flex; flex-direction: column; gap: 1px;
    overflow: hidden;
  }
  .gl-uploader {
    font-size: 13px; font-weight: 600;
    color: #fff;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .gl-date-size { font-size: 11px; color: oklch(100% 0 0 / 0.45); }

  .gl-save-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 16px; border-radius: 8px;
    background: oklch(44% 0.16 72);
    color: #fff; font-size: 12px; font-weight: 600;
    font-family: 'DM Sans', system-ui, sans-serif;
    border: none; cursor: pointer; flex-shrink: 0;
    transition: opacity .15s;
  }
  .gl-save-btn:hover:not(:disabled) { opacity: .85; }
  .gl-save-btn:disabled { opacity: .5; cursor: not-allowed; }

  /* ── Media ── */
  .gl-media-wrap {
    flex: 1;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    min-height: 0;
  }

  .gl-media {
    max-width: 100%;
    max-height: calc(100dvh - 80px);
    border-radius: 12px;
    object-fit: contain;
    display: block;
  }

  /* ── Arrows ── */
  .gl-arrow {
    position: absolute;
    top: 50%; transform: translateY(-50%);
    width: 40px; height: 40px;
    border-radius: 50%;
    background: oklch(100% 0 0 / 0.10);
    border: 1px solid oklch(100% 0 0 / 0.15);
    color: #fff; cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    transition: background .15s;
  }
  .gl-arrow:hover { background: oklch(100% 0 0 / 0.20); }
  .gl-arrow-left  { left: -48px; }
  .gl-arrow-right { right: -48px; }

  @media (max-width: 900px) {
    .gl-arrow-left  { left: 4px; }
    .gl-arrow-right { right: 4px; }
  }
`;
