"use client";

import { useState, useEffect } from "react";
import { deleteMedia } from "@/app/albums/actions";

function CopyButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const ta = document.createElement("textarea");
        ta.value = url; ta.style.position = "fixed"; ta.style.opacity = "0";
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand("copy"); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* silently fail */ }
  }
  return (
    <button onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition">
      {copied ? (
        <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> Copied!</>
      ) : (
        <><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg> Copy link</>
      )}
    </button>
  );
}

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  file_size: number;
  mime_type: string | null;
  uploader_name: string | null;
  created_at: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function formatBytes(bytes: number) {
  const mb = bytes / 1024 ** 2;
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}

interface Props {
  items: MediaItem[];
  albumId: string;
  albumTitle: string;
  firstQR?: { dataUrl: string; joinUrl: string; label: string } | null;
}

export function OwnerMediaGrid({ items: initial, albumId, albumTitle, firstQR }: Props) {
  const [items, setItems] = useState(initial);
  useEffect(() => { setItems(initial); }, [initial]);
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);

  async function triggerDownload(mediaIds?: string[]) {
    setDownloading(true);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId, mediaIds }),
      });
      if (!res.ok) { setDownloading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${albumTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function exitSelection() {
    setSelecting(false);
    setSelected(new Set());
  }

  async function handleDelete(mediaId: string) {
    setDeleting(mediaId);
    const result = await deleteMedia(mediaId, albumId);
    if (result.success) {
      setItems((prev) => prev.filter((i) => i.id !== mediaId));
      if (lightbox?.id === mediaId) setLightbox(null);
    }
    setDeleting(null);
    setConfirmDelete(null);
  }

  if (items.length === 0) {
    return (
      <div className="px-6 py-10">
        {firstQR ? (
          <div className="flex flex-col items-center text-center gap-6">
            {/* QR code */}
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-outline-variant/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={firstQR.dataUrl} alt="QR code" width={180} height={180} />
              </div>
              <span className="text-xs tracking-widest uppercase text-secondary font-semibold">{firstQR.label}</span>
            </div>

            {/* Copy */}
            <div className="max-w-xs">
              <p className="font-noto-serif text-2xl font-light text-on-surface">Waiting for the first upload</p>
              <p className="text-sm text-on-surface-variant leading-relaxed mt-2">
                Print it, project it, or send the link — guests scan and upload straight from their phones.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-center gap-2">
              <CopyButton url={firstQR.joinUrl} />
              <a
                href={firstQR.dataUrl}
                download="qr-code.png"
                className="flex items-center gap-1.5 rounded-xl border border-outline-variant/40 px-4 py-2 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download QR
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <span className="material-symbols-outlined text-outline-variant block mb-3" style={{ fontSize: "48px" }}>photo_library</span>
            <p className="text-on-surface-variant text-sm">No uploads yet.</p>
            <p className="text-outline text-xs mt-1">Create a QR code to start collecting photos from your guests.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 pt-3 pb-1 flex-wrap">
        {!selecting ? (
          <>
            <button
              onClick={() => setSelecting(true)}
              className="flex items-center gap-1.5 rounded-xl border border-outline-variant/40 px-3 py-1.5 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
            >
              <span className="material-symbols-outlined" style={{ fontSize: "15px" }}>check_box</span>
              Select
            </button>
            <button
              onClick={() => triggerDownload()}
              disabled={downloading}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition disabled:opacity-60"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              {downloading ? "Preparing…" : "Download all"}
            </button>
          </>
        ) : (
          <>
            <span className="text-xs font-medium text-on-surface-variant">
              {selected.size} selected
            </span>
            <button
              onClick={() => setSelected(new Set(items.map(i => i.id)))}
              className="text-xs text-primary hover:underline underline-offset-2"
            >
              Select all
            </button>
            <button
              onClick={() => triggerDownload(Array.from(selected))}
              disabled={selected.size === 0 || downloading}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary/90 transition disabled:opacity-60 ml-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
              </svg>
              {downloading ? "Preparing…" : `Download (${selected.size})`}
            </button>
            <button
              onClick={exitSelection}
              className="ml-auto text-xs text-on-surface-variant hover:text-on-surface transition"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-4">
        {items.map((item) => (
          <div key={item.id} className="group relative aspect-square overflow-hidden rounded-xl bg-surface-container">

            {/* Thumbnail */}
            <button
              className="h-full w-full"
              onClick={() => selecting ? toggleSelect(item.id) : setLightbox(item)}
            >
              {item.file_type === "video" ? (
                <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
                  <video src={item.file_url} className="h-full w-full object-cover opacity-70" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-white/90 p-2.5 shadow">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="#7d5070">
                        <polygon points="5 3 19 12 5 21 5 3" />
                      </svg>
                    </div>
                  </div>
                </div>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.file_url}
                  alt={item.uploader_name ?? "Upload"}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
            </button>

            {/* Selection overlay */}
            {selecting && (
              <div className={`absolute inset-0 pointer-events-none transition-colors ${selected.has(item.id) ? "bg-primary/20 ring-2 ring-primary ring-inset" : "bg-black/0"}`} />
            )}
            {selecting && (
              <div className={`absolute top-2 left-2 h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors ${selected.has(item.id) ? "bg-primary border-primary" : "bg-black/30 border-white/70"}`}>
                {selected.has(item.id) && (
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </div>
            )}

            {/* Delete button */}
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(item.id); }}
              className={`absolute top-2 right-2 transition-opacity rounded-lg bg-black/50 p-1.5 text-white hover:bg-red-500/80 backdrop-blur-sm ${selecting ? "hidden" : "opacity-0 group-hover:opacity-100"}`}
              aria-label="Delete"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>

            {/* Uploader name */}
            {item.uploader_name && !selecting && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs truncate">{item.uploader_name}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirm delete modal */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="bg-surface-container-lowest rounded-2xl p-6 max-w-sm w-full shadow-2xl ring-1 ring-outline-variant/30"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-noto-serif text-lg text-on-surface mb-2">Delete file?</h3>
            <p className="text-sm text-on-surface-variant mb-6">
              This permanently removes the file from storage and cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 rounded-xl border border-outline-variant/40 py-2.5 text-sm font-medium text-on-surface-variant hover:bg-surface-container transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                disabled={deleting === confirmDelete}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition disabled:opacity-60"
              >
                {deleting === confirmDelete ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="absolute -top-10 right-0 flex items-center gap-3">
              <button
                onClick={() => { setConfirmDelete(lightbox.id); }}
                className="flex items-center gap-1.5 rounded-lg bg-red-500/80 px-3 py-1.5 text-xs text-white hover:bg-red-500 transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                Delete
              </button>
              <button onClick={() => setLightbox(null)} className="text-white/70 hover:text-white transition">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
                </svg>
              </button>
            </div>

            {lightbox.file_type === "video" ? (
              <video src={lightbox.file_url} controls autoPlay className="w-full max-h-[80vh] rounded-2xl object-contain bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={lightbox.file_url} alt={lightbox.uploader_name ?? "Photo"} className="w-full max-h-[80vh] rounded-2xl object-contain" />
            )}

            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                {lightbox.uploader_name && <p className="text-white text-sm font-medium">{lightbox.uploader_name}</p>}
                <p className="text-white/50 text-xs">{formatDate(lightbox.created_at)} · {formatBytes(lightbox.file_size)}</p>
              </div>
              <a
                href={lightbox.file_url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20 transition"
                onClick={(e) => e.stopPropagation()}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" />
                </svg>
                Download
              </a>
            </div>

            {items.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); const idx = items.findIndex(i => i.id === lightbox.id); setLightbox(items[(idx - 1 + items.length) % items.length]); }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); const idx = items.findIndex(i => i.id === lightbox.id); setLightbox(items[(idx + 1) % items.length]); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
