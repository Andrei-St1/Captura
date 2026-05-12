"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { VideoThumb } from "@/components/VideoThumb";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  uploader_name: string | null;
  created_at: string;
  thumbnail_url?: string | null;
}

interface GalleryGridProps {
  items: MediaItem[];
  albumId?: string;
  faceFinderEnabled?: boolean;
  token?: string;
  page?: number;
  totalPages?: number;
}

/* ─── Face-filter types & constants ─────────────────────────────────────── */
const MIN_CLUSTER_SIZE = 2;

interface FaceCluster {
  id: string;
  mediaIds: string[];
  representative: {
    box: { x: number; y: number; w: number; h: number };
    fileUrl: string | null;
    thumbnailUrl: string | null;
  };
}

async function loadImg(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url + (url.includes("?") ? "&" : "?") + "_cb=" + Date.now();
  });
}

async function cropToDataUrl(
  url: string,
  box: { x: number; y: number; w: number; h: number }
): Promise<string | null> {
  const img = await loadImg(url);
  if (!img) return null;
  const size = 72;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const faceSize = Math.max(box.w * iw, box.h * ih);
  const cx = (box.x + box.w / 2) * iw;
  const cy = (box.y + box.h / 2) * ih - faceSize * 0.15;
  const half = faceSize * 1.05;
  const sx = Math.max(0, Math.min(iw - half * 2, cx - half));
  const sy = Math.max(0, Math.min(ih - half * 2, cy - half));
  const side = Math.min(half * 2, iw - sx, ih - sy);
  ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.9);
}

/* ─── Icon helpers ───────────────────────────────────────────────────────── */
function IconFace() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4"/><path d="M20 21a8 8 0 1 0-16 0"/>
    </svg>
  );
}
function IconClose({ size = 16 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/>
    </svg>
  );
}

/* ─── Helpers ────────────────────────────────────────────────────────────── */
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

/* ─── Component ──────────────────────────────────────────────────────────── */
export function GalleryGrid({ items, albumId, faceFinderEnabled, token, page = 1, totalPages = 1 }: GalleryGridProps) {
  const [lightbox, setLightbox]       = useState<MediaItem | null>(null);
  const [downloading, setDownloading] = useState(false);
  const touchStartX = { current: 0 };

  /* ── face-filter state ── */
  type FaceStatus = "idle" | "loading" | "done" | "error";
  const [faceStatus, setFaceStatus]         = useState<FaceStatus>("idle");
  const [faceEnabled, setFaceEnabled]       = useState(false);
  const [showFaceConfirm, setShowFaceConfirm] = useState(false);
  const [faceClusters, setFaceClusters]     = useState<FaceCluster[]>([]);
  const [faceCrops, setFaceCrops]           = useState<Map<string, string>>(new Map());
  const [selectedFace, setSelectedFace]     = useState<string | null>(null);
  const [faceItems, setFaceItems]           = useState<MediaItem[] | null>(null);
  const [fetchingFace, setFetchingFace]     = useState(false);

  const visibleItems = faceItems ?? items;
  const imageItems   = items.filter((i) => i.file_type === "image");
  const itemIds      = imageItems.map((i) => i.id).join(",");
  const loadFacesRef = useRef<(() => Promise<void>) | null>(null);

  const loadFaces = useCallback(async () => {
    if (!albumId) return;
    setFaceStatus("loading");
    setFaceClusters([]);
    setFaceCrops(new Map());
    const controller = new AbortController();
    const timeoutId  = setTimeout(() => controller.abort(), 30_000);
    try {
      const res = await fetch(`/api/face-clusters?albumId=${albumId}`, { signal: controller.signal });
      if (!res.ok) throw new Error("fetch failed");
      const clusters: FaceCluster[] = await res.json();

      const visible  = clusters.filter((c) => c.mediaIds.length >= MIN_CLUSTER_SIZE);
      const newCrops = new Map<string, string>();
      for (const cluster of visible.slice(0, 30)) {
        const { representative: rep } = cluster;
        const url = rep.thumbnailUrl ?? rep.fileUrl;
        if (!url) continue;
        const crop = await cropToDataUrl(url, rep.box);
        if (crop) newCrops.set(cluster.id, crop);
      }
      setFaceClusters(clusters);
      setFaceCrops(newCrops);
      setFaceStatus("done");
    } catch (err) {
      if ((err as { name?: string }).name === "AbortError") {
        setFaceStatus("done");
      } else {
        setFaceStatus("error");
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }, [albumId]);

  loadFacesRef.current = loadFaces;

  useEffect(() => {
    if (!faceEnabled) return;
    if (imageItems.length === 0) {
      setFaceClusters([]);
      setFaceCrops(new Map());
      setFaceStatus("idle");
      return;
    }
    loadFacesRef.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds, faceEnabled]);

  function handleFaceEnable() {
    setShowFaceConfirm(false);
    setFaceEnabled(true);
    loadFaces();
  }

  function handleFaceDisable() {
    setFaceEnabled(false);
    setSelectedFace(null);
    setFaceItems(null);
    setFetchingFace(false);
    setFaceStatus("idle");
    setFaceClusters([]);
    setFaceCrops(new Map());
  }

  async function handleFaceChipClick(clusterId: string) {
    if (selectedFace === clusterId) {
      setSelectedFace(null);
      setFaceItems(null);
      return;
    }
    setSelectedFace(clusterId);
    const c = faceClusters.find((c) => c.id === clusterId);
    if (!c || !albumId) return;
    setFetchingFace(true);
    try {
      const res = await fetch("/api/media-by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId, mediaIds: [...new Set(c.mediaIds)] }),
      });
      if (res.ok) setFaceItems(await res.json());
    } finally {
      setFetchingFace(false);
    }
  }

  const visibleClusters = faceClusters.filter(
    (c) => c.mediaIds.length >= MIN_CLUSTER_SIZE && faceCrops.has(c.id)
  );

  /* ── lightbox nav ── */
  function navigate(dir: 1 | -1) {
    if (!lightbox) return;
    const idx = visibleItems.findIndex((i) => i.id === lightbox.id);
    setLightbox(visibleItems[(idx + dir + visibleItems.length) % visibleItems.length]);
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function onTouchEnd(e: React.TouchEvent) {
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) < 40) return;
    navigate(delta < 0 ? 1 : -1);
  }

  return (
    <>
      <style>{CSS}</style>

      {/* ── Face confirm modal ── */}
      {showFaceConfirm && (
        <div className="og-modal-backdrop" onClick={() => setShowFaceConfirm(false)}>
          <div className="og-modal" onClick={(e) => e.stopPropagation()}>
            <div className="og-face-modal-icon">
              <div className="og-face-modal-icon-wrap">
                <IconFace />
              </div>
              <div className="og-face-modal-text">
                <h3>Enable face filter</h3>
                <p style={{ marginBottom: 0 }}>
                  Captura will group photos by the faces that appear in them. This may take a few moments depending on album size.
                  <span className="og-face-modal-hint">Results are saved — next visit will be instant.</span>
                </p>
              </div>
            </div>
            <div className="og-modal-btns">
              <button onClick={() => setShowFaceConfirm(false)}>Cancel</button>
              <button className="primary" onClick={handleFaceEnable}>Enable</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toolbar (face finder) ── */}
      {faceFinderEnabled && albumId && imageItems.length > 0 && (
        <div className="og-toolbar">
          <div className="og-toolbar-left">

            {/* idle */}
            {!faceEnabled && faceStatus === "idle" && (
              <button className="og-face-btn" onClick={() => setShowFaceConfirm(true)}>
                <IconFace />
                Filter by face
              </button>
            )}

            {/* loading */}
            {faceStatus === "loading" && (
              <>
                <button className="og-face-btn active">
                  <IconFace />
                  Scanning faces…
                </button>
                <div className="og-fp-track">
                  <div className="og-fp-fill" />
                </div>
              </>
            )}

            {/* done — no clusters */}
            {faceStatus === "done" && visibleClusters.length === 0 && (
              <>
                <button className="og-face-btn active">
                  <IconFace />
                  No faces found
                </button>
                <button className="og-disable-btn" onClick={handleFaceDisable}>
                  <IconClose size={13} /> Disable
                </button>
              </>
            )}

            {/* done — clusters */}
            {faceStatus === "done" && visibleClusters.length > 0 && (
              <>
                <button
                  className={`og-face-btn${faceEnabled ? " active" : ""}`}
                  onClick={handleFaceDisable}
                  title="Click to disable face filter"
                >
                  <IconFace />
                  Filter by face
                </button>

                {selectedFace !== null && (
                  <button
                    className="og-all-chip"
                    onClick={() => { setSelectedFace(null); setFaceItems(null); }}
                  >
                    <IconClose size={11} /> All
                  </button>
                )}

                {visibleClusters.map((cluster) => {
                  const count = new Set(cluster.mediaIds).size;
                  return (
                    <button
                      key={cluster.id}
                      className={`og-face-chip${selectedFace === cluster.id ? " selected" : ""}`}
                      onClick={() => handleFaceChipClick(cluster.id)}
                      title={`${count} photo${count !== 1 ? "s" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={faceCrops.get(cluster.id)!} alt="face" />
                      <span className="og-face-chip-count">{count > 99 ? "99+" : count}</span>
                    </button>
                  );
                })}

                <button className="og-disable-btn" onClick={handleFaceDisable}>
                  <IconClose size={13} /> Disable
                </button>
              </>
            )}

            {/* error */}
            {faceStatus === "error" && (
              <>
                <button className="og-face-btn" onClick={() => loadFaces()}>
                  <IconFace />
                  Retry face scan
                </button>
                <button className="og-disable-btn" onClick={handleFaceDisable}>
                  <IconClose size={13} /> Dismiss
                </button>
              </>
            )}
          </div>

          <div className="og-toolbar-right">
            {fetchingFace ? "Loading…" : `${visibleItems.length} ${visibleItems.length === 1 ? "photo" : "photos"}`}
          </div>
        </div>
      )}

      {/* ── Masonry grid ── */}
      <div className="columns-2 sm:columns-3 md:columns-4" style={{ columnGap: "8px" }}>
        {visibleItems.map((item) => (
          <div
            key={item.id}
            onClick={() => setLightbox(item)}
            className="gl-item break-inside-avoid"
            style={{ marginBottom: "8px" }}
          >
            {item.file_type === "video" ? (
              <>
                {item.thumbnail_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.thumbnail_url} className="gl-img" alt="" loading="lazy" />
                ) : (
                  <VideoThumb
                    src={item.file_url}
                    imgClassName="gl-img"
                    placeholder={
                      <div className="gl-video-thumb">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="white">
                          <polygon points="5 3 19 12 5 21 5 3" />
                        </svg>
                      </div>
                    }
                  />
                )}
                <div className="gl-play-badge">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </>
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

      {/* ── Pagination ── */}
      {!faceItems && token && totalPages > 1 && (
        <div className="gl-pagination">
          {page > 1
            ? <a href={`/join/${token}/gallery?page=${page - 1}`} className="gl-page-btn">← Previous</a>
            : <span className="gl-page-btn disabled">← Previous</span>}
          <span className="gl-page-info">Page {page} of {totalPages}</span>
          {page < totalPages
            ? <a href={`/join/${token}/gallery?page=${page + 1}`} className="gl-page-btn">Next →</a>
            : <span className="gl-page-btn disabled">Next →</span>}
        </div>
      )}

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
            {visibleItems.length > 1 && (
              <>
                <button
                  className="gl-arrow gl-arrow-left"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = visibleItems.findIndex((i) => i.id === lightbox.id);
                    setLightbox(visibleItems[(idx - 1 + visibleItems.length) % visibleItems.length]);
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button
                  className="gl-arrow gl-arrow-right"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = visibleItems.findIndex((i) => i.id === lightbox.id);
                    setLightbox(visibleItems[(idx + 1) % visibleItems.length]);
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

const CSS = `
  @keyframes gl-spin { to { transform: rotate(360deg); } }
  @keyframes gl-fadein { from { opacity: 0; } to { opacity: 1; } }
  @keyframes loading-bar {
    0%   { transform: translateX(-100%); }
    50%  { transform: translateX(60%); }
    100% { transform: translateX(160%); }
  }

  /* ── og-toolbar styles (face finder) ── */
  :root {
    --og-bg:       oklch(97% 0.008 80);
    --og-bg2:      oklch(94% 0.010 80);
    --og-bg3:      oklch(90% 0.012 80);
    --og-border:   oklch(86% 0.010 80);
    --og-border2:  oklch(78% 0.010 80);
    --og-text:     oklch(18% 0.015 265);
    --og-muted:    oklch(46% 0.010 265);
    --og-muted2:   oklch(58% 0.010 265);
    --og-gold:     oklch(44% 0.16 72);
    --og-gold-dim: oklch(36% 0.13 72);
    --og-gold-glow:oklch(44% 0.16 72 / 0.10);
    --og-gold-b:   oklch(44% 0.16 72 / 0.22);
  }

  .og-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 22px;
    border: 1px solid var(--og-border);
    border-radius: 14px;
    margin-bottom: 18px;
    background: var(--og-bg);
    gap: 12px;
    flex-wrap: wrap;
  }
  .og-toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    flex: 1;
  }
  .og-toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--og-muted);
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }
  .og-face-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 9px 14px;
    border-radius: 9px;
    border: 1px solid var(--og-border);
    background: var(--og-bg);
    font-size: 12px;
    font-weight: 500;
    color: var(--og-text);
    cursor: pointer;
    transition: border-color .2s, background .2s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .og-face-btn:hover {
    border-color: var(--og-gold-b);
    background: var(--og-gold-glow);
  }
  .og-face-btn.active {
    border-color: var(--og-gold);
    background: var(--og-gold-glow);
    color: var(--og-gold);
  }
  .og-fp-track {
    flex: 1;
    height: 4px;
    background: var(--og-bg3);
    border-radius: 2px;
    overflow: hidden;
    min-width: 100px;
    max-width: 180px;
  }
  .og-fp-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--og-gold-dim), var(--og-gold));
    border-radius: 2px;
    animation: loading-bar 1.4s ease-in-out infinite;
    width: 40%;
  }
  .og-face-chip {
    position: relative;
    width: 38px;
    height: 38px;
    border-radius: 50%;
    border: 2px solid transparent;
    cursor: pointer;
    overflow: visible;
    transition: border-color .15s, transform .15s;
    flex-shrink: 0;
    background: none;
    padding: 0;
  }
  .og-face-chip:hover { transform: scale(1.06); }
  .og-face-chip.selected { border-color: var(--og-gold); }
  .og-face-chip img {
    width: 38px;
    height: 38px;
    object-fit: cover;
    border-radius: 50%;
    display: block;
  }
  .og-face-chip-count {
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 16px;
    height: 16px;
    background: var(--og-text);
    color: var(--og-bg);
    border-radius: 50%;
    font-size: 9px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid var(--og-bg);
    pointer-events: none;
  }
  .og-all-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 20px;
    border: 1px solid var(--og-border);
    background: var(--og-bg);
    font-size: 11px;
    font-weight: 500;
    color: var(--og-text);
    cursor: pointer;
    transition: border-color .15s, background .15s;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .og-all-chip:hover {
    border-color: var(--og-gold-b);
    background: var(--og-gold-glow);
  }
  .og-disable-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 8px;
    border: 1px solid var(--og-border);
    background: none;
    font-size: 11px;
    font-weight: 500;
    color: var(--og-muted);
    cursor: pointer;
    transition: border-color .15s, color .15s;
    white-space: nowrap;
    flex-shrink: 0;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .og-disable-btn:hover {
    border-color: var(--og-border2);
    color: var(--og-text);
  }

  /* ── face confirm modal ── */
  .og-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 300;
    background: oklch(0% 0 0 / 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    backdrop-filter: blur(4px);
  }
  .og-modal {
    background: white;
    border-radius: 18px;
    padding: 28px;
    max-width: 380px;
    width: 100%;
    box-shadow: 0 24px 80px oklch(0% 0 0 / 0.25);
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .og-modal h3 {
    font-size: 17px;
    font-weight: 600;
    color: var(--og-text);
    margin-bottom: 8px;
  }
  .og-modal p {
    font-size: 13px;
    color: var(--og-muted);
    margin-bottom: 22px;
    line-height: 1.55;
  }
  .og-modal-btns {
    display: flex;
    gap: 10px;
  }
  .og-modal-btns button {
    flex: 1;
    padding: 10px;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    border: 1px solid oklch(86% 0.010 80);
    background: oklch(97% 0.008 80);
    color: var(--og-text);
    transition: background .15s, border-color .15s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .og-modal-btns button:hover { background: oklch(94% 0.010 80); }
  .og-modal-btns button.primary {
    background: var(--og-gold);
    color: white;
    border-color: var(--og-gold);
  }
  .og-modal-btns button.primary:hover { background: var(--og-gold-dim); border-color: var(--og-gold-dim); }
  .og-face-modal-icon {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 20px;
  }
  .og-face-modal-icon-wrap {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: var(--og-gold-glow);
    border: 1px solid var(--og-gold-b);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .og-face-modal-text h3 { margin-bottom: 4px; }
  .og-face-modal-hint {
    display: block;
    margin-top: 8px;
    font-size: 11px;
    color: var(--og-muted2);
  }

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

  .gl-play-badge {
    position: absolute;
    bottom: 8px; right: 8px;
    width: 28px; height: 28px;
    border-radius: 50%;
    background: oklch(0% 0 0 / 0.55);
    backdrop-filter: blur(4px);
    display: flex; align-items: center; justify-content: center;
    pointer-events: none;
  }

  /* ── Lightbox ── */
  .gl-overlay {
    position: fixed; inset: 0; z-index: 10000;
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

  @media (max-width: 768px) {
    .og-toolbar { padding: 14px; }
    .og-face-chip { width: 34px; height: 34px; }
    .og-face-chip img { width: 34px; height: 34px; }
  }
`;
