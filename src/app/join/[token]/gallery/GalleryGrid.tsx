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


export function GalleryGrid({ items }: { items: MediaItem[] }) {
  const [lightbox, setLightbox] = useState<MediaItem | null>(null);

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            onClick={() => setLightbox(item)}
            className="group relative aspect-square overflow-hidden rounded-xl bg-white/50 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] cursor-pointer"
          >
            {item.file_type === "video" ? (
              <div className="relative h-full w-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1e1b2e, #0f0e1a)" }}>
                <div className="rounded-full bg-white/90 p-3 shadow-lg">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#7c3aed">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                </div>
              </div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.file_url}
                alt={item.uploader_name ?? "Photo"}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  const t = e.currentTarget;
                  t.style.display = "none";
                  if (t.parentElement) t.parentElement.style.background = "linear-gradient(135deg, #e8e4f0, #d8d0e8)";
                }}
              />
            )}

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />

            {/* Uploader name */}
            {item.uploader_name && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-white text-xs font-medium truncate">{item.uploader_name}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close */}
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" x2="6" y1="6" y2="18" /><line x1="6" x2="18" y1="6" y2="18" />
              </svg>
            </button>

            {/* Media */}
            {lightbox.file_type === "video" ? (
              <video
                src={lightbox.file_url}
                controls
                autoPlay
                className="w-full max-h-[80vh] rounded-2xl object-contain bg-black"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={lightbox.file_url}
                alt={lightbox.uploader_name ?? "Photo"}
                className="w-full max-h-[80vh] rounded-2xl object-contain"
              />
            )}

            {/* Meta */}
            <div className="mt-3 flex items-center justify-between px-1">
              <div>
                {lightbox.uploader_name && (
                  <p className="text-white text-sm font-medium">{lightbox.uploader_name}</p>
                )}
                <p className="text-white/50 text-xs">{formatDate(lightbox.created_at)}</p>
              </div>
              <span className="text-white/40 text-xs">{formatBytes(lightbox.file_size)}</span>
            </div>

            {/* Nav arrows */}
            {items.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = items.findIndex((i) => i.id === lightbox.id);
                    setLightbox(items[(idx - 1 + items.length) % items.length]);
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = items.findIndex((i) => i.id === lightbox.id);
                    setLightbox(items[(idx + 1) % items.length]);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
