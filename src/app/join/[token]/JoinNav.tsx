"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  token: string;
  showGallery: boolean;
}

const gold   = "oklch(44% 0.16 72)";
const bg     = "oklch(97% 0.008 80)";
const bg2    = "oklch(93% 0.010 80)";
const border = "oklch(80% 0.010 80)";
const muted  = "oklch(46% 0.010 265)";
const dim    = "oklch(58% 0.010 265)";

export function JoinNav({ token, showGallery }: Props) {
  const pathname = usePathname();
  const isUpload  = pathname.endsWith("/upload");
  const isGallery = pathname.endsWith("/gallery");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!showGallery) return null;

  return (
    <>
      {/* CSS: only controls display toggling — all other styles inline */}
      <style>{`
        .jn-tabs   { display: flex; }
        .jn-bottom { display: none; position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999; }
        @media (max-width: 768px) {
          .jn-tabs   { display: none; }
          .jn-bottom { display: flex; }
        }
      `}</style>

      {/* ── Desktop: segmented tab control (inline in header) ── */}
      <div className="jn-tabs" style={{
        background: bg2,
        border: `1px solid ${border}`,
        borderRadius: "10px",
        padding: "3px",
        gap: "2px",
      }}>
        <TabLink href={`/join/${token}/upload`} active={isUpload}>
          <CamIcon size={14} active={isUpload} />
          Upload
        </TabLink>
        <TabLink href={`/join/${token}/gallery`} active={isGallery}>
          <GridIcon size={14} active={isGallery} />
          Gallery
        </TabLink>
      </div>

      {/* ── Mobile: fixed bottom nav via portal — escapes all stacking contexts ── */}
      {mounted && createPortal(
        <nav className="jn-bottom" style={{
          background: "oklch(97% 0.008 80 / 0.95)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: `1px solid ${border}`,
          justifyContent: "space-around",
          alignItems: "center",
          padding: "6px 0 calc(6px + env(safe-area-inset-bottom, 0px))",
        }}>
          <BottomTab href={`/join/${token}/upload`} active={isUpload} label="Upload">
            <CamIcon size={24} active={isUpload} />
          </BottomTab>
          <BottomTab href={`/join/${token}/gallery`} active={isGallery} label="Gallery">
            <GridIcon size={24} active={isGallery} />
          </BottomTab>
        </nav>,
        document.body
      )}
    </>
  );
}

function TabLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: "flex", alignItems: "center", gap: "6px",
      padding: "7px 16px", borderRadius: "7px",
      fontSize: "13px", fontWeight: active ? 600 : 500,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      color: active ? gold : muted,
      textDecoration: "none",
      background: active ? bg : "transparent",
      boxShadow: active ? "0 1px 4px oklch(0% 0 0 / 0.08)" : "none",
      whiteSpace: "nowrap",
      transition: "all .15s",
    }}>
      {children}
    </Link>
  );
}

function BottomTab({ href, active, label, children }: { href: string; active: boolean; label: string; children: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
      padding: "6px 36px", borderRadius: "10px",
      textDecoration: "none",
      color: active ? gold : dim,
      fontFamily: "'DM Sans', system-ui, sans-serif",
      fontSize: "11px", fontWeight: 500,
      WebkitTapHighlightColor: "transparent",
      transition: "color .15s",
    }}>
      {children}
      <span>{label}</span>
    </Link>
  );
}

function CamIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? gold : "currentColor"} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function GridIcon({ size, active }: { size: number; active: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={active ? gold : "currentColor"} strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}
