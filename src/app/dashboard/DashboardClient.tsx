"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { createPortalSession } from "@/app/stripe/actions";
import { getAlbumQRCodesForDashboard } from "@/app/albums/qr-actions";

interface Album {
  id: string;
  title: string;
  status: string;
  used_bytes: number;
  allocated_gb: number;
  open_date: string | null;
  close_date: string | null;
  thumbnail_url: string | null;
  created_at: string;
  mediaCount: number;
}

interface DashboardClientProps {
  user: { displayName: string; firstName: string; initials: string; email: string };
  plan: { id: string; name: string; maxAlbums: number; storageGb: number } | null;
  usage: { albumsCount: number; usedStorageGb: number; storagePercent: number; albumsPercent: number };
  limits: { remainingAlbums: number; remainingStorageGb: number; canCreateAlbum: boolean };
  hasActiveSubscription: boolean;
  albums: Album[];
  totalMediaCount: number;
  checkout: string | undefined;
}

const COVER_COLORS = [
  ["oklch(78% 0.08 30)", "oklch(70% 0.06 330)"],
  ["oklch(72% 0.08 280)", "oklch(68% 0.06 260)"],
  ["oklch(74% 0.09 155)", "oklch(66% 0.07 135)"],
  ["oklch(70% 0.07 210)", "oklch(64% 0.05 190)"],
  ["oklch(76% 0.08 50)", "oklch(68% 0.06 30)"],
  ["oklch(72% 0.08 320)", "oklch(66% 0.06 300)"],
];

const PLAN_FEATURES: Record<string, string[]> = {
  starter: ["1 album", "5 GB storage", "Unlimited uploads", "ZIP download"],
  pro: ["10 albums", "100 GB storage", "Multiple QR codes", "Face detection"],
  business: ["30 albums", "500 GB storage", "Custom branding", "Priority support"],
};

function getAlbumStatus(album: Album): "open" | "closed" | "scheduled" {
  if (album.status !== "active") return "closed";
  const now = new Date();
  if (album.open_date && new Date(album.open_date) > now) return "scheduled";
  if (album.close_date && new Date(album.close_date) < now) return "closed";
  return "open";
}

function IconDashboard({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "var(--gold)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="1" width="6" height="6" rx="1" />
      <rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}

function IconAlbums({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "var(--gold)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="12" height="10" rx="1.5" />
      <path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <circle cx="8" cy="9" r="2" />
    </svg>
  );
}

function IconSettings({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "var(--gold)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42" />
    </svg>
  );
}

function IconBilling({ active }: { active?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={active ? "var(--gold)" : "currentColor"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="14" height="10" rx="1.5" />
      <path d="M1 6h14" />
      <path d="M4 10h3" />
    </svg>
  );
}

function IconSignOut() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 14H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h4" />
      <path d="M11 11l3-3-3-3" />
      <path d="M14 8H6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 2l10 10M12 2L2 12" />
    </svg>
  );
}

export default function DashboardClient({
  user,
  plan,
  usage,
  limits,
  hasActiveSubscription,
  albums,
  totalMediaCount,
  checkout,
}: DashboardClientProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [checkoutDismissed, setCheckoutDismissed] = useState(false);
  const [noPlanDismissed, setNoPlanDismissed] = useState(false);

  type QRItem = { id: string; label: string; enabled: boolean; joinUrl: string; dataUrl: string };
  const [qrModal, setQrModal] = useState<{ albumId: string; albumTitle: string } | null>(null);
  const [qrItems, setQrItems] = useState<QRItem[]>([]);
  const [qrLoading, setQrLoading] = useState(false);
  const [downloadModal, setDownloadModal] = useState<{ albumId: string; albumTitle: string } | null>(null);
  const [downloadLoading, setDownloadLoading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function openQR(albumId: string, albumTitle: string) {
    setQrModal({ albumId, albumTitle });
    setQrItems([]);
    setQrLoading(true);
    const codes = await getAlbumQRCodesForDashboard(albumId);
    setQrItems(codes);
    setQrLoading(false);
  }

  async function handleDownload(albumId: string, albumTitle: string) {
    setDownloadLoading(true);
    setDownloadError(null);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ albumId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDownloadError((data as { error?: string }).error ?? "Download failed.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${albumTitle.replace(/[^a-zA-Z0-9_-]/g, "_")}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadModal(null);
    } finally {
      setDownloadLoading(false);
    }
  }

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const activeAlbumsCount = albums.filter((a) => getAlbumStatus(a) === "open").length;

  const filteredAlbums = albums.filter((a) => {
    if (filter === "all") return true;
    return getAlbumStatus(a) === filter;
  });

  const planKey = plan?.name?.toLowerCase() ?? "";
  const planFeatures = PLAN_FEATURES[planKey] ?? [];

  const storageAlbumsSorted = [...albums]
    .sort((a, b) => b.used_bytes - a.used_bytes)
    .slice(0, 5);

  return (
    <>
      <style>{`
        :root {
          --bg:        oklch(97% 0.008 80);
          --bg2:       oklch(93% 0.010 80);
          --bg3:       oklch(89% 0.012 80);
          --bg4:       oklch(85% 0.012 80);
          --border:    oklch(80% 0.010 80);
          --border2:   oklch(72% 0.010 80);
          --text:      oklch(18% 0.015 265);
          --muted:     oklch(46% 0.010 265);
          --muted2:    oklch(58% 0.010 265);
          --gold:      oklch(44% 0.16 72);
          --gold-dim:  oklch(36% 0.13 72);
          --gold-glow: oklch(44% 0.16 72 / 0.12);
          --green:     oklch(50% 0.16 155);
          --green-bg:  oklch(50% 0.16 155 / 0.08);
          --green-b:   oklch(50% 0.16 155 / 0.20);
          --amber:     oklch(58% 0.17 75);
          --amber-bg:  oklch(58% 0.17 75 / 0.08);
          --amber-b:   oklch(58% 0.17 75 / 0.20);
          --red:       oklch(52% 0.20 25);
          --red-bg:    oklch(52% 0.20 25 / 0.08);
          --red-b:     oklch(52% 0.20 25 / 0.20);
          --blue:      oklch(52% 0.15 250);
          --blue-bg:   oklch(52% 0.15 250 / 0.08);
          --blue-b:    oklch(52% 0.15 250 / 0.20);
          --serif:     'Cormorant Garamond', Georgia, serif;
          --sans:      'DM Sans', system-ui, sans-serif;
        }

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .db-root {
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          font-family: var(--sans);
          font-size: 14px;
          line-height: 1.5;
        }

        /* ── Sidebar ─────────────────────────────────────────────────────── */
        .db-sidebar {
          position: fixed;
          top: 0;
          left: 0;
          width: 240px;
          height: 100vh;
          background: var(--bg2);
          border-right: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
        }

        .db-sidebar-logo {
          padding: 28px 24px 20px;
          border-bottom: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .db-sidebar-logo-text {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .db-plan-badge {
          margin-left: auto;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 20px;
          background: var(--gold-glow);
          color: var(--gold);
          border: 1px solid var(--gold-glow);
          white-space: nowrap;
        }

        .db-sidebar-nav {
          flex: 1;
          padding: 16px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow-y: auto;
        }

        .db-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: 10px;
          color: var(--muted);
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
          transition: background 0.15s, color 0.15s;
          cursor: pointer;
          border: none;
          background: none;
          width: 100%;
          text-align: left;
          font-family: var(--sans);
        }

        .db-nav-item:hover {
          background: var(--bg3);
          color: var(--text);
        }

        .db-nav-item.active {
          background: var(--gold-glow);
          color: var(--gold);
          font-weight: 600;
        }

        .db-nav-divider {
          height: 1px;
          background: var(--border);
          margin: 8px 0;
        }

        .db-sidebar-footer {
          padding: 16px 20px;
          border-top: 1px solid var(--border);
        }

        .db-user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }

        .db-avatar {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: var(--gold-glow);
          border: 1.5px solid var(--gold);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: var(--gold-dim);
          flex-shrink: 0;
          text-transform: uppercase;
        }

        .db-user-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db-user-email {
          font-size: 11px;
          color: var(--muted2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db-storage-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted);
          margin-bottom: 6px;
        }

        .db-storage-track {
          height: 5px;
          background: var(--bg4);
          border-radius: 99px;
          overflow: hidden;
        }

        .db-storage-fill {
          height: 100%;
          border-radius: 99px;
          background: var(--gold);
          transition: width 0.4s;
        }

        /* ── Main ────────────────────────────────────────────────────────── */
        .db-main {
          margin-left: 240px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        /* ── Topbar ──────────────────────────────────────────────────────── */
        .db-topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: oklch(97% 0.008 80 / 0.85);
          backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          padding: 18px 40px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .db-topbar-left h1 {
          font-family: var(--serif);
          font-size: 26px;
          font-weight: 400;
          color: var(--text);
          line-height: 1.2;
        }

        .db-topbar-left h1 em {
          font-style: italic;
          color: var(--gold);
        }

        .db-topbar-sub {
          font-size: 12px;
          color: var(--muted2);
          margin-top: 3px;
        }

        .db-new-album-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: var(--gold);
          color: #fff;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          letter-spacing: 0.02em;
          transition: background 0.15s, transform 0.15s;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .db-new-album-btn:hover {
          background: var(--gold-dim);
          transform: translateY(-1px);
        }

        .db-new-album-btn svg {
          flex-shrink: 0;
        }

        /* ── Content ─────────────────────────────────────────────────────── */
        .db-content {
          padding: 32px 40px 60px;
          flex: 1;
        }

        /* ── Banners ─────────────────────────────────────────────────────── */
        .db-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 20px;
          border-radius: 12px;
          margin-bottom: 24px;
        }

        .db-banner-green {
          background: var(--green-bg);
          border: 1px solid var(--green-b);
          color: var(--green);
        }

        .db-banner-amber {
          background: var(--amber-bg);
          border: 1px solid var(--amber-b);
          color: var(--amber);
        }

        .db-banner-title {
          font-size: 13px;
          font-weight: 600;
        }

        .db-banner-body {
          font-size: 12px;
          opacity: 0.85;
          margin-top: 2px;
        }

        .db-banner-dismiss {
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          opacity: 0.7;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: opacity 0.15s;
        }

        .db-banner-dismiss:hover { opacity: 1; }

        .db-banner-link {
          font-size: 12px;
          font-weight: 600;
          color: inherit;
          text-decoration: none;
          border: 1px solid currentColor;
          padding: 4px 12px;
          border-radius: 8px;
          white-space: nowrap;
          transition: opacity 0.15s;
          flex-shrink: 0;
        }

        .db-banner-link:hover { opacity: 0.75; }

        /* ── Bento grid ──────────────────────────────────────────────────── */
        .db-bento {
          display: grid;
          grid-template-columns: 1fr 1fr 2fr;
          grid-template-rows: auto auto;
          gap: 16px;
          margin-bottom: 40px;
        }

        .db-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 28px;
        }

        .db-card-storage {
          grid-column: 3;
          grid-row: 1 / 3;
        }

        .db-card-uploads {
          grid-column: 1 / 3;
        }

        .db-card-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--muted2);
          margin-bottom: 16px;
        }

        .db-card-big-number {
          font-family: var(--serif);
          font-size: 56px;
          font-weight: 400;
          color: var(--text);
          line-height: 1;
          margin-bottom: 8px;
        }

        .db-card-big-number-unit {
          font-size: 22px;
          color: var(--muted2);
          margin-left: 4px;
        }

        .db-progress-track {
          height: 6px;
          background: var(--bg4);
          border-radius: 99px;
          overflow: hidden;
          margin: 12px 0 6px;
        }

        .db-progress-fill {
          height: 100%;
          border-radius: 99px;
          background: var(--gold);
          transition: width 0.4s;
        }

        .db-progress-fill-red {
          background: var(--red);
        }

        .db-card-hint {
          font-size: 12px;
          color: var(--muted2);
        }

        .db-plan-name {
          font-family: var(--serif);
          font-size: 36px;
          font-weight: 400;
          color: var(--text);
          margin-bottom: 16px;
        }

        .db-plan-features {
          list-style: none;
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 20px;
        }

        .db-plan-feature {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--muted);
        }

        .db-upgrade-link {
          font-size: 12px;
          font-weight: 600;
          color: var(--gold);
          text-decoration: none;
          letter-spacing: 0.02em;
        }

        .db-upgrade-link:hover { text-decoration: underline; }

        .db-storage-card-used {
          font-family: var(--serif);
          font-size: 52px;
          font-weight: 400;
          color: var(--text);
          line-height: 1;
        }

        .db-storage-card-used-unit {
          font-size: 20px;
          color: var(--muted2);
          margin-left: 4px;
        }

        .db-storage-card-of {
          font-size: 13px;
          color: var(--muted2);
          margin-top: 4px;
          margin-bottom: 16px;
        }

        .db-album-breakdown {
          margin-top: 24px;
        }

        .db-album-breakdown-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--muted2);
          margin-bottom: 14px;
        }

        .db-album-breakdown-row {
          margin-bottom: 12px;
        }

        .db-album-breakdown-meta {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 5px;
        }

        .db-album-breakdown-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 65%;
        }

        .db-album-breakdown-size {
          font-size: 11px;
          color: var(--muted2);
          white-space: nowrap;
        }

        .db-album-breakdown-track {
          height: 4px;
          background: var(--bg4);
          border-radius: 99px;
          overflow: hidden;
        }

        .db-album-breakdown-fill {
          height: 100%;
          border-radius: 99px;
          background: var(--gold);
          transition: width 0.4s;
        }

        .db-uploads-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }

        .db-uploads-stat {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .db-uploads-stat-number {
          font-family: var(--serif);
          font-size: 40px;
          font-weight: 400;
          color: var(--text);
          line-height: 1;
        }

        .db-uploads-stat-label {
          font-size: 12px;
          color: var(--muted2);
        }

        /* ── Albums section ──────────────────────────────────────────────── */
        .db-albums-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
        }

        .db-albums-title {
          font-family: var(--serif);
          font-size: 24px;
          font-weight: 400;
          color: var(--text);
        }

        .db-filter-group {
          display: flex;
          gap: 4px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 3px;
        }

        .db-filter-btn {
          padding: 6px 14px;
          border-radius: 8px;
          border: none;
          background: none;
          font-size: 12px;
          font-weight: 500;
          color: var(--muted);
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          font-family: var(--sans);
        }

        .db-filter-btn:hover { color: var(--text); }

        .db-filter-btn.active {
          background: var(--bg);
          color: var(--text);
          font-weight: 600;
          box-shadow: 0 1px 4px oklch(0% 0 0 / 0.08);
        }

        /* ── Album cards grid ────────────────────────────────────────────── */
        .db-albums-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 20px;
        }

        .db-album-card {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          overflow: hidden;
          text-decoration: none;
          color: var(--text);
          transition: transform 0.2s, box-shadow 0.2s;
          display: flex;
          flex-direction: column;
        }

        .db-album-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 40px oklch(0% 0 0 / 0.10);
        }

        .db-album-cover {
          height: 160px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }

        .db-album-cover img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .db-album-cover-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .db-album-cover-placeholder svg {
          opacity: 0.35;
        }

        .db-badge {
          position: absolute;
          top: 12px;
          left: 12px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 9px;
          border-radius: 20px;
          backdrop-filter: blur(8px);
        }

        .db-badge-open {
          background: var(--green-bg);
          color: var(--green);
          border: 1px solid var(--green-b);
        }

        .db-badge-closed {
          background: oklch(0% 0 0 / 0.35);
          color: #fff;
          border: 1px solid oklch(100% 0 0 / 0.15);
        }

        .db-badge-scheduled {
          background: var(--blue-bg);
          color: var(--blue);
          border: 1px solid var(--blue-b);
        }

        .db-album-info {
          padding: 18px 20px 16px;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .db-album-name {
          font-size: 15px;
          font-weight: 600;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .db-album-meta {
          font-size: 12px;
          color: var(--muted2);
        }

        .db-album-storage-row {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: var(--muted2);
          margin-bottom: 5px;
        }

        .db-album-storage-track {
          height: 4px;
          background: var(--bg4);
          border-radius: 99px;
          overflow: hidden;
        }

        .db-album-storage-fill {
          height: 100%;
          border-radius: 99px;
          background: var(--gold);
          transition: width 0.4s;
        }

        .db-album-actions {
          display: flex;
          gap: 8px;
          margin-top: auto;
        }

        .db-action-btn {
          flex: 1;
          padding: 7px 10px;
          border-radius: 8px;
          border: 1px solid var(--border);
          background: var(--bg3);
          color: var(--muted);
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.03em;
          cursor: pointer;
          transition: background 0.15s, color 0.15s;
          font-family: var(--sans);
          text-align: center;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .db-action-btn:hover {
          background: var(--bg4);
          color: var(--text);
        }

        .db-action-btn-primary {
          background: var(--gold-glow);
          color: var(--gold);
          border-color: oklch(44% 0.16 72 / 0.2);
        }

        .db-action-btn-primary:hover {
          background: oklch(44% 0.16 72 / 0.18);
          color: var(--gold-dim);
        }

        /* ── Empty states ────────────────────────────────────────────────── */
        .db-empty {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 60px 40px;
          text-align: center;
        }

        .db-empty-title {
          font-family: var(--serif);
          font-size: 30px;
          font-weight: 400;
          color: var(--text);
          margin-bottom: 10px;
        }

        .db-empty-body {
          font-size: 14px;
          color: var(--muted2);
          max-width: 400px;
          margin: 0 auto 28px;
          line-height: 1.6;
        }

        .db-empty-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 12px 28px;
          background: var(--gold);
          color: #fff;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: background 0.15s, transform 0.15s;
        }

        .db-empty-cta:hover {
          background: var(--gold-dim);
          transform: translateY(-1px);
        }

        .db-steps {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0;
          border-top: 1px solid var(--border);
          margin-top: 44px;
        }

        .db-step {
          padding: 32px 28px;
          border-right: 1px solid var(--border);
          text-align: center;
        }

        .db-step:last-child { border-right: none; }

        .db-step-icon {
          width: 52px;
          height: 52px;
          border-radius: 50%;
          background: var(--gold-glow);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 14px;
        }

        .db-step-num {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: var(--muted2);
          margin-bottom: 4px;
        }

        .db-step-title {
          font-family: var(--serif);
          font-size: 17px;
          color: var(--text);
          margin-bottom: 6px;
        }

        .db-step-body {
          font-size: 12px;
          color: var(--muted2);
          line-height: 1.55;
        }

        .db-no-plan-cards {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 24px;
        }

        .db-plan-mini {
          background: var(--bg3);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          text-decoration: none;
          color: var(--text);
          transition: border-color 0.15s;
        }

        .db-plan-mini:hover { border-color: var(--gold); }

        .db-plan-mini-name {
          font-family: var(--serif);
          font-size: 20px;
          margin-bottom: 4px;
        }

        .db-plan-mini-storage {
          font-size: 12px;
          color: var(--muted2);
        }

        /* ── Responsive ──────────────────────────────────────────────────── */
        @media (max-width: 1100px) {
          .db-bento {
            grid-template-columns: 1fr 1fr;
            grid-template-rows: auto;
          }
          .db-card-storage {
            grid-column: 1 / 3;
            grid-row: auto;
          }
          .db-card-uploads {
            grid-column: 1 / 3;
          }
          .db-uploads-grid {
            grid-template-columns: 1fr 1fr 1fr;
          }
        }

        @media (max-width: 760px) {
          .db-sidebar { display: none; }
          .db-main { margin-left: 0; }
          .db-bento {
            grid-template-columns: 1fr;
          }
          .db-card-storage {
            grid-column: 1;
            grid-row: auto;
          }
          .db-card-uploads {
            grid-column: 1;
          }
          .db-uploads-grid {
            grid-template-columns: 1fr 1fr;
          }
          .db-topbar {
            padding: 14px 20px;
          }
          .db-content {
            padding: 24px 20px 60px;
          }
          .db-steps {
            grid-template-columns: 1fr;
          }
          .db-step {
            border-right: none;
            border-bottom: 1px solid var(--border);
          }
          .db-step:last-child { border-bottom: none; }
          .db-no-plan-cards {
            grid-template-columns: 1fr;
          }
          .db-topbar-left h1 { font-size: 20px; }
        }

        /* ── Modals ──────────────────────────────────────────────────────── */
        .db-overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: oklch(0% 0 0 / 0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .db-modal {
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 20px;
          width: 100%;
          max-width: 500px;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px oklch(0% 0 0 / 0.30);
        }

        .db-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          padding: 24px 24px 20px;
          border-bottom: 1px solid var(--border);
        }

        .db-modal-title {
          font-family: var(--serif);
          font-size: 22px;
          font-weight: 400;
          color: var(--text);
          line-height: 1.2;
        }

        .db-modal-sub {
          font-size: 12px;
          color: var(--muted2);
          margin-top: 3px;
        }

        .db-modal-x {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--muted2);
          padding: 6px;
          border-radius: 8px;
          transition: color 0.15s, background 0.15s;
          flex-shrink: 0;
        }

        .db-modal-x:hover { color: var(--text); background: var(--bg3); }

        .db-modal-body { padding: 20px 24px; }

        .db-modal-foot {
          display: flex;
          gap: 10px;
          padding: 0 24px 24px;
        }

        .db-modal-btn {
          flex: 1;
          padding: 10px 16px;
          border-radius: 10px;
          border: none;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: var(--sans);
          transition: opacity 0.15s;
        }

        .db-modal-btn:hover:not(:disabled) { opacity: 0.85; }
        .db-modal-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .db-modal-btn-gold { background: var(--gold); color: #fff; }
        .db-modal-btn-ghost { background: var(--bg3); color: var(--muted); border: 1px solid var(--border); }

        .db-qr-item {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 14px;
          border-radius: 12px;
          background: var(--bg3);
          border: 1px solid var(--border);
          margin-bottom: 10px;
        }

        .db-qr-item:last-child { margin-bottom: 0; }

        .db-qr-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text);
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .db-qr-url {
          font-size: 10px;
          font-family: monospace;
          color: var(--muted2);
          word-break: break-all;
        }
      `}</style>

      <div className="db-root">
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="db-sidebar">
          <div className="db-sidebar-logo">
            <span className="db-sidebar-logo-text">Captura</span>
            <span className="db-plan-badge">{plan?.name ?? "Free"}</span>
          </div>

          <nav className="db-sidebar-nav">
            <Link href="/dashboard" className="db-nav-item active">
              <IconDashboard active />
              Dashboard
            </Link>
            <Link href="/albums" className="db-nav-item">
              <IconAlbums />
              Albums
            </Link>
            <Link href="/settings" className="db-nav-item">
              <IconSettings />
              Settings
            </Link>

            <div className="db-nav-divider" />

            <form action={createPortalSession} style={{ width: "100%" }}>
              <button type="submit" className="db-nav-item">
                <IconBilling />
                Billing
              </button>
            </form>

            <form action={logout} style={{ width: "100%" }}>
              <button type="submit" className="db-nav-item">
                <IconSignOut />
                Sign out
              </button>
            </form>
          </nav>

          <div className="db-sidebar-footer">
            <div className="db-user-row">
              <div className="db-avatar">{user.initials}</div>
              <div style={{ overflow: "hidden" }}>
                <div className="db-user-name">{user.displayName}</div>
                <div className="db-user-email">{user.email}</div>
              </div>
            </div>
            <div className="db-storage-label">
              <span>Storage</span>
              <span>{usage.storagePercent}%</span>
            </div>
            <div className="db-storage-track">
              <div
                className="db-storage-fill"
                style={{
                  width: `${usage.storagePercent}%`,
                  background:
                    usage.storagePercent >= 90
                      ? "var(--red)"
                      : usage.storagePercent >= 70
                      ? "var(--amber)"
                      : "var(--gold)",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: "var(--muted2)", marginTop: 5 }}>
              {usage.usedStorageGb} GB / {plan?.storageGb ?? "—"} GB
            </div>
          </div>
        </aside>

        {/* ── Main ─────────────────────────────────────────────────────────── */}
        <div className="db-main">
          {/* ── Topbar ─────────────────────────────────────────────────────── */}
          <header className="db-topbar">
            <div className="db-topbar-left">
              <h1>
                Welcome back, <em>{user.firstName}</em>
              </h1>
              <div className="db-topbar-sub">
                {today} &nbsp;·&nbsp; {activeAlbumsCount} active{" "}
                {activeAlbumsCount === 1 ? "album" : "albums"}
              </div>
            </div>
            <Link href="/albums/create" className="db-new-album-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M8 3v10M3 8h10" />
              </svg>
              New album
            </Link>
          </header>

          {/* ── Content ────────────────────────────────────────────────────── */}
          <div className="db-content">
            {/* Checkout success banner */}
            {checkout === "success" && !checkoutDismissed && (
              <div className="db-banner db-banner-green">
                <div>
                  <div className="db-banner-title">
                    {plan?.name ? `${plan.name} plan activated!` : "Subscription activated!"}
                  </div>
                  <div className="db-banner-body">
                    Your plan is now active. Start creating albums and collecting memories.
                  </div>
                </div>
                <button
                  className="db-banner-dismiss"
                  onClick={() => setCheckoutDismissed(true)}
                  aria-label="Dismiss"
                >
                  <IconClose />
                </button>
              </div>
            )}

            {/* No plan banner */}
            {!plan && !noPlanDismissed && (
              <div className="db-banner db-banner-amber">
                <div>
                  <div className="db-banner-title">No active plan</div>
                  <div className="db-banner-body">
                    Choose a plan to start creating albums and collecting memories.
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Link href="/pricing" className="db-banner-link">
                    View plans →
                  </Link>
                  <button
                    className="db-banner-dismiss"
                    onClick={() => setNoPlanDismissed(true)}
                    aria-label="Dismiss"
                  >
                    <IconClose />
                  </button>
                </div>
              </div>
            )}

            {/* ── Bento grid ───────────────────────────────────────────────── */}
            <div className="db-bento">
              {/* Card A: albums count */}
              <div className="db-card">
                <div className="db-card-label">Albums</div>
                <div className="db-card-big-number">{usage.albumsCount}</div>
                <div className="db-card-hint" style={{ marginBottom: 4 }}>
                  of {plan?.maxAlbums ?? "—"} max
                </div>
                <div className="db-progress-track">
                  <div
                    className={`db-progress-fill${usage.albumsPercent >= 90 ? " db-progress-fill-red" : ""}`}
                    style={{ width: `${usage.albumsPercent}%` }}
                  />
                </div>
                <div className="db-card-hint">
                  {limits.remainingAlbums} remaining
                </div>
              </div>

              {/* Card B: plan */}
              <div className="db-card">
                <div className="db-card-label">Current plan</div>
                {plan ? (
                  <>
                    <div className="db-plan-name">{plan.name}</div>
                    <ul className="db-plan-features">
                      {planFeatures.map((f) => (
                        <li key={f} className="db-plan-feature">
                          <IconCheck />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <form action={createPortalSession}>
                      <button
                        type="submit"
                        className="db-upgrade-link"
                        style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--sans)", fontSize: 12, fontWeight: 600 }}
                      >
                        Manage billing →
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <div className="db-plan-name">Free</div>
                    <div className="db-card-hint" style={{ marginBottom: 16, lineHeight: 1.5 }}>
                      Upgrade to unlock albums, QR codes, and shared galleries.
                    </div>
                    <Link href="/pricing" className="db-upgrade-link">
                      View plans →
                    </Link>
                  </>
                )}
              </div>

              {/* Card C: storage (spans 2 rows) */}
              <div className="db-card db-card-storage">
                <div className="db-card-label">Storage</div>
                <div>
                  <span className="db-storage-card-used">{usage.usedStorageGb}</span>
                  <span className="db-storage-card-used-unit">GB</span>
                </div>
                <div className="db-storage-card-of">
                  of {plan?.storageGb ?? "—"} GB used
                </div>
                <div className="db-progress-track">
                  <div
                    className={`db-progress-fill${usage.storagePercent >= 90 ? " db-progress-fill-red" : ""}`}
                    style={{
                      width: `${usage.storagePercent}%`,
                      background:
                        usage.storagePercent >= 90
                          ? "var(--red)"
                          : usage.storagePercent >= 70
                          ? "var(--amber)"
                          : "var(--gold)",
                    }}
                  />
                </div>
                <div className="db-card-hint" style={{ marginBottom: 0 }}>
                  {usage.storagePercent}% used &nbsp;·&nbsp; {limits.remainingStorageGb.toFixed(1)} GB free
                </div>

                {storageAlbumsSorted.length > 0 && (
                  <div className="db-album-breakdown">
                    <div className="db-album-breakdown-title">By album</div>
                    {storageAlbumsSorted.map((a) => {
                      const usedGb = parseFloat((a.used_bytes / 1024 ** 3).toFixed(2));
                      const pct =
                        a.allocated_gb > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (a.used_bytes / (a.allocated_gb * 1024 ** 3)) * 100
                              )
                            )
                          : 0;
                      return (
                        <div key={a.id} className="db-album-breakdown-row">
                          <div className="db-album-breakdown-meta">
                            <span className="db-album-breakdown-name">{a.title}</span>
                            <span className="db-album-breakdown-size">
                              {usedGb} / {a.allocated_gb} GB
                            </span>
                          </div>
                          <div className="db-album-breakdown-track">
                            <div
                              className="db-album-breakdown-fill"
                              style={{
                                width: `${pct}%`,
                                background:
                                  pct >= 90
                                    ? "var(--red)"
                                    : pct >= 70
                                    ? "var(--amber)"
                                    : "var(--gold)",
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Card D: total media + quick stats */}
              <div className="db-card db-card-uploads">
                <div className="db-card-label">Upload overview</div>
                <div className="db-uploads-grid">
                  <div className="db-uploads-stat">
                    <div className="db-uploads-stat-number">{totalMediaCount.toLocaleString()}</div>
                    <div className="db-uploads-stat-label">Total uploads</div>
                  </div>
                  <div className="db-uploads-stat">
                    <div className="db-uploads-stat-number">{usage.usedStorageGb}</div>
                    <div className="db-uploads-stat-label">GB used</div>
                  </div>
                  <div className="db-uploads-stat">
                    <div className="db-uploads-stat-number">{usage.albumsCount}</div>
                    <div className="db-uploads-stat-label">Albums</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Albums section ────────────────────────────────────────────── */}
            <div className="db-albums-header">
              <h2 className="db-albums-title">Albums</h2>
              <div className="db-filter-group">
                {(["all", "open", "closed"] as const).map((f) => (
                  <button
                    key={f}
                    className={`db-filter-btn${filter === f ? " active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {albums.length === 0 ? (
              <div className="db-empty">
                {!hasActiveSubscription ? (
                  <>
                    <div className="db-empty-title">Every memory starts here</div>
                    <div className="db-empty-body">
                      Pick a plan to unlock albums, QR codes, and shared galleries — then send your
                      guests a single link.
                    </div>
                    <Link href="/pricing" className="db-empty-cta">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="8,1 10,6 15,6 11,9.5 12.5,15 8,12 3.5,15 5,9.5 1,6 6,6" />
                      </svg>
                      View plans
                    </Link>
                    <div className="db-no-plan-cards">
                      {[
                        { name: "Starter", storage: "5 GB", albums: "1 album", href: "/pricing" },
                        { name: "Pro", storage: "100 GB", albums: "10 albums", href: "/pricing" },
                        { name: "Business", storage: "500 GB", albums: "30 albums", href: "/pricing" },
                      ].map((p) => (
                        <Link key={p.name} href={p.href} className="db-plan-mini">
                          <div className="db-plan-mini-name">{p.name}</div>
                          <div className="db-plan-mini-storage">{p.albums} · {p.storage}</div>
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="db-empty-title">Your first album is one click away</div>
                    <div className="db-empty-body">
                      Create an album, share the QR code, and watch the memories roll in — guests
                      upload straight from their phones.
                    </div>
                    <Link href="/albums/create" className="db-empty-cta">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M8 3v10M3 8h10" />
                      </svg>
                      Create your first album
                    </Link>
                    <div className="db-steps">
                      {[
                        {
                          num: "01",
                          title: "Create an album",
                          body: "Name it, set a date, and allocate storage. Takes under a minute.",
                          icon: (
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="5" width="18" height="14" rx="2" />
                              <path d="M7 5V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v1" />
                              <circle cx="11" cy="12" r="3" />
                            </svg>
                          ),
                        },
                        {
                          num: "02",
                          title: "Share the QR code",
                          body: "Print it, project it, or send the link — guests scan and upload instantly.",
                          icon: (
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="2" width="8" height="8" rx="1" />
                              <rect x="12" y="2" width="8" height="8" rx="1" />
                              <rect x="2" y="12" width="8" height="8" rx="1" />
                              <path d="M12 12h2v2h-2zM16 12h4M12 16h4M16 16v4" />
                            </svg>
                          ),
                        },
                        {
                          num: "03",
                          title: "Collect memories",
                          body: "Every photo and video lands in your gallery, ready to download or share.",
                          icon: (
                            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="2" y="2" width="18" height="18" rx="2" />
                              <path d="M2 14l5-5 4 4 3-3 6 6" />
                              <circle cx="7" cy="7" r="1.5" />
                            </svg>
                          ),
                        },
                      ].map(({ num, title, body, icon }) => (
                        <div key={num} className="db-step">
                          <div className="db-step-icon">{icon}</div>
                          <div className="db-step-num">Step {num}</div>
                          <div className="db-step-title">{title}</div>
                          <div className="db-step-body">{body}</div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : filteredAlbums.length === 0 ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "60px 20px",
                  color: "var(--muted2)",
                  fontSize: 14,
                }}
              >
                No {filter} albums found.
              </div>
            ) : (
              <div className="db-albums-grid">
                {filteredAlbums.map((album, i) => {
                  const [from, to] = COVER_COLORS[i % COVER_COLORS.length];
                  const status = getAlbumStatus(album);
                  const pct = Math.min(
                    100,
                    Math.round(
                      (album.used_bytes / (album.allocated_gb * 1024 ** 3)) * 100
                    )
                  );
                  const usedGb = parseFloat((album.used_bytes / 1024 ** 3).toFixed(2));

                  return (
                    <div
                      key={album.id}
                      className="db-album-card"
                      style={{ cursor: "pointer" }}
                      onClick={() => router.push(`/albums/${album.id}`)}
                    >
                      <div
                        className="db-album-cover"
                        style={{
                          background: `linear-gradient(135deg, ${from}, ${to})`,
                        }}
                      >
                        {album.thumbnail_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={album.thumbnail_url} alt={album.title} />
                        ) : (
                          <div className="db-album-cover-placeholder">
                            <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="4" y="8" width="40" height="32" rx="3" />
                              <path d="M4 32l12-12 9 9 7-7 12 11" />
                              <circle cx="16" cy="18" r="3.5" />
                            </svg>
                          </div>
                        )}
                        <span
                          className={`db-badge ${
                            status === "open"
                              ? "db-badge-open"
                              : status === "scheduled"
                              ? "db-badge-scheduled"
                              : "db-badge-closed"
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      <div className="db-album-info">
                        <div>
                          <div className="db-album-name">{album.title}</div>
                          <div className="db-album-meta">
                            {album.mediaCount.toLocaleString()} {album.mediaCount === 1 ? "item" : "items"}
                          </div>
                        </div>

                        <div>
                          <div className="db-album-storage-row">
                            <span>Storage</span>
                            <span>
                              {usedGb} / {album.allocated_gb} GB
                            </span>
                          </div>
                          <div className="db-album-storage-track">
                            <div
                              className="db-album-storage-fill"
                              style={{
                                width: `${pct}%`,
                                background:
                                  pct >= 90
                                    ? "var(--red)"
                                    : pct >= 70
                                    ? "var(--amber)"
                                    : "var(--gold)",
                              }}
                            />
                          </div>
                        </div>

                        <div className="db-album-actions">
                          <button
                            className="db-action-btn db-action-btn-primary"
                            onClick={(e) => { e.stopPropagation(); router.push(`/albums/${album.id}`); }}
                          >
                            Manage
                          </button>
                          <button
                            className="db-action-btn"
                            title="QR Code"
                            onClick={(e) => { e.stopPropagation(); openQR(album.id, album.title); }}
                          >
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="1" y="1" width="4" height="4" rx="0.5" />
                              <rect x="8" y="1" width="4" height="4" rx="0.5" />
                              <rect x="1" y="8" width="4" height="4" rx="0.5" />
                              <path d="M8 8h1v1H8zM10 8h3M8 10h2M10 10v3" />
                            </svg>
                            QR
                          </button>
                          <button
                            className="db-action-btn"
                            title="Download"
                            onClick={(e) => { e.stopPropagation(); setDownloadModal({ albumId: album.id, albumTitle: album.title }); setDownloadError(null); }}
                          >
                            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M6.5 1v8M3.5 6l3 3 3-3" />
                              <path d="M1 10.5h11" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── QR modal ─────────────────────────────────────────────────────────── */}
      {qrModal && (
        <div className="db-overlay" onClick={() => setQrModal(null)}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-head">
              <div>
                <div className="db-modal-title">QR Codes</div>
                <div className="db-modal-sub">{qrModal.albumTitle}</div>
              </div>
              <button className="db-modal-x" onClick={() => setQrModal(null)} aria-label="Close">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>
            </div>
            <div className="db-modal-body">
              {qrLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0", color: "var(--muted2)", fontSize: 13 }}>
                  Loading QR codes…
                </div>
              ) : qrItems.length === 0 ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  <div style={{ fontSize: 13, color: "var(--muted2)", marginBottom: 12 }}>
                    No QR codes for this album.
                  </div>
                  <button
                    className="db-modal-btn db-modal-btn-gold"
                    style={{ maxWidth: 200, margin: "0 auto", display: "block" }}
                    onClick={() => { setQrModal(null); router.push(`/albums/${qrModal.albumId}`); }}
                  >
                    Go to album →
                  </button>
                </div>
              ) : (
                qrItems.map((qr) => (
                  <div key={qr.id} className="db-qr-item">
                    <div style={{ background: "#fff", borderRadius: 8, padding: 6, flexShrink: 0 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qr.dataUrl} alt={qr.label} width={90} height={90} />
                    </div>
                    <div style={{ overflow: "hidden" }}>
                      <div className="db-qr-label">
                        {qr.label}
                        {!qr.enabled && (
                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: "var(--bg4)", color: "var(--muted2)" }}>
                            disabled
                          </span>
                        )}
                      </div>
                      <div className="db-qr-url">{qr.joinUrl}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Download confirmation modal ───────────────────────────────────────── */}
      {downloadModal && (
        <div className="db-overlay" onClick={() => { if (!downloadLoading) setDownloadModal(null); }}>
          <div className="db-modal" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-head">
              <div>
                <div className="db-modal-title">Download album</div>
                <div className="db-modal-sub">{downloadModal.albumTitle}</div>
              </div>
              <button
                className="db-modal-x"
                onClick={() => setDownloadModal(null)}
                disabled={downloadLoading}
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l12 12M14 2L2 14" />
                </svg>
              </button>
            </div>
            <div className="db-modal-body">
              <p style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6 }}>
                Do you wish to download the contents of <strong>{downloadModal.albumTitle}</strong>?
                All photos and videos will be bundled into a ZIP file.
              </p>
              {downloadError && (
                <p style={{ marginTop: 12, fontSize: 12, color: "var(--red)" }}>{downloadError}</p>
              )}
            </div>
            <div className="db-modal-foot">
              <button
                className="db-modal-btn db-modal-btn-ghost"
                onClick={() => setDownloadModal(null)}
                disabled={downloadLoading}
              >
                No
              </button>
              <button
                className="db-modal-btn db-modal-btn-gold"
                onClick={() => handleDownload(downloadModal.albumId, downloadModal.albumTitle)}
                disabled={downloadLoading}
              >
                {downloadLoading ? "Downloading…" : "Yes, download"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
