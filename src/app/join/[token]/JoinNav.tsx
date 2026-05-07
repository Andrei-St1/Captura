"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  token: string;
  showGallery: boolean;
}

export function JoinNav({ token, showGallery }: Props) {
  const pathname = usePathname();
  const isUpload = pathname.endsWith("/upload");
  const isGallery = pathname.endsWith("/gallery");

  if (!showGallery) return null;

  return (
    <>
      <style>{CSS}</style>

      {/* Desktop: segmented tabs — inline wherever placed */}
      <div className="jn-tabs">
        <Link href={`/join/${token}/upload`} className={`jn-tab${isUpload ? " active" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          Upload
        </Link>
        <Link href={`/join/${token}/gallery`} className={`jn-tab${isGallery ? " active" : ""}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          Gallery
        </Link>
      </div>

      {/* Mobile: fixed bottom navigator */}
      <nav className="jn-bottom">
        <Link href={`/join/${token}/upload`} className={`jn-btab${isUpload ? " active" : ""}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
          <span>Upload</span>
        </Link>
        <Link href={`/join/${token}/gallery`} className={`jn-btab${isGallery ? " active" : ""}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span>Gallery</span>
        </Link>
      </nav>
    </>
  );
}

const CSS = `
  /* ── Desktop tabs (shown on ≥769px) ── */
  .jn-tabs {
    display: flex;
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 10px;
    padding: 3px;
    gap: 2px;
  }

  .jn-tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 7px 16px;
    border-radius: 7px;
    font-size: 13px;
    font-weight: 500;
    font-family: 'DM Sans', system-ui, sans-serif;
    color: oklch(46% 0.010 265);
    text-decoration: none;
    transition: background .15s, color .15s;
    white-space: nowrap;
  }
  .jn-tab:hover {
    background: oklch(89% 0.012 80);
    color: oklch(18% 0.015 265);
  }
  .jn-tab.active {
    background: oklch(97% 0.008 80);
    color: oklch(44% 0.16 72);
    font-weight: 600;
    box-shadow: 0 1px 4px oklch(0% 0 0 / 0.08);
  }

  /* ── Mobile bottom nav (shown on ≤768px) ── */
  .jn-bottom {
    display: none;
    position: fixed;
    bottom: 0; left: 0; right: 0;
    z-index: 200;
    background: oklch(97% 0.008 80 / 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid oklch(80% 0.010 80);
    padding: 8px 16px calc(8px + env(safe-area-inset-bottom, 0px));
    justify-content: space-around;
    align-items: center;
  }

  .jn-btab {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px 28px;
    border-radius: 12px;
    text-decoration: none;
    color: oklch(58% 0.010 265);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 0.03em;
    transition: color .15s;
    -webkit-tap-highlight-color: transparent;
  }
  .jn-btab.active {
    color: oklch(44% 0.16 72);
  }
  .jn-btab.active svg {
    stroke: oklch(44% 0.16 72);
  }

  @media (max-width: 768px) {
    .jn-tabs  { display: none; }
    .jn-bottom { display: flex; }
  }
`;
