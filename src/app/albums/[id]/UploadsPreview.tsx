"use client";

import Link from "next/link";

interface MediaItem {
  id: string;
  file_url: string;
  file_type: string;
  uploader_name: string | null;
}

interface Props {
  items: MediaItem[];
  totalCount: number;
  albumId: string;
  firstQR?: { dataUrl: string; joinUrl: string; label: string } | null;
}

function CopyButton({ url }: { url: string }) {
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
    } catch { /* silently fail */ }
  }
  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary/90 transition"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
      </svg>
      Copy link
    </button>
  );
}

export function UploadsPreview({ items, totalCount, albumId, firstQR }: Props) {
  if (items.length === 0) {
    return (
      <div className="px-6 py-10">
        {firstQR ? (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-outline-variant/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={firstQR.dataUrl} alt="QR code" width={180} height={180} />
              </div>
              <span className="text-xs tracking-widest uppercase text-secondary font-semibold">{firstQR.label}</span>
            </div>
            <div className="max-w-xs">
              <p className="font-noto-serif text-2xl font-light text-on-surface">Waiting for the first upload</p>
              <p className="text-sm text-on-surface-variant leading-relaxed mt-2">
                Print it, project it, or send the link — guests scan and upload straight from their phones.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <CopyButton url={firstQR.joinUrl} />
              <a
                href={firstQR.dataUrl}
                download="qr-code.png"
                className="flex items-center gap-1.5 rounded-xl border border-outline-variant/40 px-4 py-2 text-xs font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>
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
    <div>
      <div className="grid grid-cols-2 gap-2 p-4">
        {items.slice(0, 4).map((item) => (
          <Link
            key={item.id}
            href={`/albums/${albumId}/gallery`}
            className="relative aspect-square overflow-hidden rounded-xl bg-surface-container group"
          >
            {item.file_type === "video" ? (
              <div className="relative h-full w-full bg-slate-900 flex items-center justify-center">
                <video src={item.file_url} className="h-full w-full object-cover opacity-70" muted playsInline />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-white/90 p-2 shadow">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="#7d5070">
                      <polygon points="5 3 19 12 5 21 5 3"/>
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
          </Link>
        ))}
      </div>

      <div className="px-4 pb-4">
        <Link
          href={`/albums/${albumId}/gallery`}
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-outline-variant/30 py-2.5 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
        >
          <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>photo_library</span>
          View all {totalCount} {totalCount === 1 ? "file" : "files"}
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </Link>
      </div>
    </div>
  );
}
