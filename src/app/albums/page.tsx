import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { createPortalSession } from "@/app/stripe/actions";
import { AlbumsClient } from "./AlbumsClient";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,400&family=DM+Sans:wght@300;400;500&display=swap');

:root {
  --al-bg:       oklch(97% 0.008 80);
  --al-bg2:      oklch(93% 0.010 80);
  --al-bg3:      oklch(89% 0.012 80);
  --al-bg4:      oklch(85% 0.012 80);
  --al-border:   oklch(80% 0.010 80);
  --al-border2:  oklch(72% 0.010 80);
  --al-text:     oklch(18% 0.015 265);
  --al-muted:    oklch(46% 0.010 265);
  --al-muted2:   oklch(58% 0.010 265);
  --al-gold:     oklch(44% 0.16 72);
  --al-gold-dim: oklch(36% 0.13 72);
  --al-gold-glow:oklch(44% 0.16 72 / 0.10);
  --al-gold-b:   oklch(44% 0.16 72 / 0.22);
  --al-green:    oklch(50% 0.16 155);
  --al-green-bg: oklch(50% 0.16 155 / 0.08);
  --al-green-b:  oklch(50% 0.16 155 / 0.20);
  --al-amber:    oklch(58% 0.17 75);
  --al-amber-bg: oklch(58% 0.17 75 / 0.08);
  --al-amber-b:  oklch(58% 0.17 75 / 0.20);
  --al-blue:     oklch(52% 0.15 250);
  --al-blue-bg:  oklch(52% 0.15 250 / 0.08);
  --al-blue-b:   oklch(52% 0.15 250 / 0.20);
  --al-red:      oklch(52% 0.20 25);
  --al-sidebar-w: 240px;
  --al-serif:    'Cormorant Garamond', Georgia, serif;
  --al-sans:     'DM Sans', system-ui, sans-serif;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.al-root {
  display: flex;
  min-height: 100vh;
  background: var(--al-bg);
  color: var(--al-text);
  font-family: var(--al-sans);
  font-weight: 300;
}

/* ── SIDEBAR ── */
.al-sidebar {
  width: var(--al-sidebar-w);
  flex-shrink: 0;
  background: var(--al-bg2);
  border-right: 1px solid var(--al-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 50;
  overflow-y: auto;
}

.al-sidebar-logo {
  padding: 28px 24px 20px;
  border-bottom: 1px solid var(--al-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.al-logo {
  font-family: var(--al-serif);
  font-size: 20px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--al-gold);
  text-decoration: none;
}

.al-plan-badge {
  font-size: 9px;
  font-weight: 500;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  padding: 3px 8px;
  border-radius: 4px;
  background: var(--al-gold-glow);
  color: var(--al-gold);
  border: 1px solid oklch(76% 0.13 82 / 0.2);
}

.al-sidebar-nav {
  flex: 1;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.al-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 8px;
  font-size: 13px;
  color: var(--al-muted);
  text-decoration: none;
  transition: background .15s, color .15s;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
  font-family: var(--al-sans);
  font-weight: 300;
  line-height: 1.5;
}

.al-nav-item svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
  stroke-linecap: round;
  flex-shrink: 0;
}

.al-nav-item:hover {
  background: var(--al-bg3);
  color: var(--al-text);
}

.al-nav-item.active {
  background: var(--al-bg3);
  color: var(--al-text);
}

.al-nav-item.active svg {
  stroke: var(--al-gold);
}

.al-nav-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 500;
  background: var(--al-bg4);
  color: var(--al-muted);
  padding: 1px 7px;
  border-radius: 10px;
}

.al-nav-item.active .al-nav-badge {
  background: var(--al-gold-glow);
  color: var(--al-gold);
}

.al-nav-div {
  height: 1px;
  background: var(--al-border);
  margin: 8px 0;
}

.al-sidebar-footer {
  padding: 16px 16px 20px;
  border-top: 1px solid var(--al-border);
}

.al-user-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.al-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--al-gold-glow);
  border: 1px solid oklch(76% 0.13 82 / 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--al-serif);
  font-size: 14px;
  color: var(--al-gold);
  flex-shrink: 0;
}

.al-user-name {
  font-size: 13px;
  font-weight: 400;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.al-user-email {
  font-size: 11px;
  color: var(--al-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* ── MAIN ── */
.al-main {
  margin-left: var(--al-sidebar-w);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

/* ── TOPBAR ── */
.al-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 40px;
  border-bottom: 1px solid var(--al-border);
  background: var(--al-bg);
  position: sticky;
  top: 0;
  z-index: 40;
}

.al-page-title {
  font-family: var(--al-serif);
  font-size: 26px;
  font-weight: 400;
  letter-spacing: -0.01em;
  color: var(--al-gold);
}

.al-page-sub {
  font-size: 12px;
  color: var(--al-muted);
  margin-top: 2px;
}

.al-btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: var(--al-gold);
  color: var(--al-bg);
  padding: 9px 18px;
  border-radius: 7px;
  font-size: 13px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: opacity .2s;
  text-decoration: none;
  font-family: var(--al-sans);
}

.al-btn-primary:hover { opacity: .88; }

.al-btn-primary svg {
  width: 13px;
  height: 13px;
  stroke: currentColor;
  fill: none;
  stroke-width: 2.5;
}

/* ── TOOLBAR ── */
.al-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 40px;
  border-bottom: 1px solid var(--al-border);
  gap: 16px;
  flex-wrap: wrap;
}

.al-filter-pills {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.al-pill {
  font-size: 12px;
  padding: 6px 14px;
  border-radius: 100px;
  border: 1px solid var(--al-border);
  color: var(--al-muted);
  cursor: pointer;
  background: none;
  transition: all .15s;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--al-sans);
}

.al-pill:hover {
  border-color: var(--al-border2);
  color: var(--al-text);
}

.al-pill.active {
  background: var(--al-bg3);
  border-color: var(--al-border2);
  color: var(--al-text);
}

.al-pill-count {
  font-size: 10px;
  background: var(--al-bg4);
  color: var(--al-muted);
  padding: 1px 6px;
  border-radius: 8px;
}

.al-pill.active .al-pill-count {
  background: var(--al-gold-glow);
  color: var(--al-gold);
}

.al-toolbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.al-search-wrap {
  position: relative;
}

.al-search-input {
  background: var(--al-bg2);
  border: 1px solid var(--al-border);
  border-radius: 8px;
  padding: 7px 12px 7px 34px;
  font-size: 12px;
  color: var(--al-text);
  outline: none;
  width: 200px;
  transition: border-color .2s;
  font-family: var(--al-sans);
}

.al-search-input::placeholder { color: var(--al-muted2); }

.al-search-input:focus { border-color: var(--al-border2); }

.al-search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.al-search-icon svg {
  width: 13px;
  height: 13px;
  stroke: var(--al-muted);
  fill: none;
  stroke-width: 1.5;
}

.al-sort-wrap { position: relative; }

.al-sort-select {
  appearance: none;
  background: var(--al-bg2);
  border: 1px solid var(--al-border);
  border-radius: 8px;
  padding: 7px 32px 7px 12px;
  font-size: 12px;
  color: var(--al-muted);
  cursor: pointer;
  outline: none;
  font-family: var(--al-sans);
}

.al-sort-select:hover {
  border-color: var(--al-border2);
  color: var(--al-text);
}

.al-sort-chev {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
}

.al-sort-chev svg {
  width: 12px;
  height: 12px;
  stroke: var(--al-muted);
  fill: none;
  stroke-width: 2;
}

.al-view-toggle {
  display: flex;
  background: var(--al-bg2);
  border: 1px solid var(--al-border);
  border-radius: 8px;
  overflow: hidden;
}

.al-view-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  background: none;
  border: none;
  transition: background .15s;
}

.al-view-btn svg {
  width: 14px;
  height: 14px;
  stroke: var(--al-muted);
  fill: none;
  stroke-width: 1.5;
}

.al-view-btn.active { background: var(--al-bg3); }
.al-view-btn.active svg { stroke: var(--al-text); }

/* ── CONTENT ── */
.al-content {
  padding: 28px 40px 60px;
  flex: 1;
}

.al-results-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.al-results-count {
  font-size: 12px;
  color: var(--al-muted);
}

.al-results-count strong { color: var(--al-text); }

/* ── ALBUM GRID ── */
.al-albums-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
  gap: 18px;
}

.al-albums-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* Grid card */
.al-album-card {
  background: var(--al-bg2);
  border: 1px solid var(--al-border);
  border-radius: 14px;
  overflow: hidden;
  transition: border-color .2s, transform .2s;
  cursor: pointer;
}

.al-album-card:hover {
  border-color: var(--al-border2);
  transform: translateY(-2px);
}

.al-album-cover {
  height: 168px;
  position: relative;
  overflow: hidden;
}

.al-cover-fill {
  width: 100%;
  height: 100%;
  transition: transform .4s;
  background-size: cover;
  background-position: center;
}

.al-album-card:hover .al-cover-fill { transform: scale(1.05); }

.al-cover-grad {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, var(--al-bg2) 0%, transparent 55%);
}

.al-cover-top {
  position: absolute;
  top: 12px;
  left: 12px;
  right: 12px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.al-status-badge {
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  padding: 4px 10px;
  border-radius: 100px;
  display: flex;
  align-items: center;
  gap: 5px;
  backdrop-filter: blur(8px);
}

.al-status-badge::before {
  content: '';
  width: 5px;
  height: 5px;
  border-radius: 50%;
}

.al-status-badge.active {
  background: var(--al-green-bg);
  color: var(--al-green);
  border: 1px solid var(--al-green-b);
}

.al-status-badge.active::before {
  background: var(--al-green);
  animation: al-blink 2s ease-in-out infinite;
}

.al-status-badge.scheduled {
  background: var(--al-blue-bg);
  color: var(--al-blue);
  border: 1px solid var(--al-blue-b);
}

.al-status-badge.scheduled::before { background: var(--al-blue); }

.al-status-badge.archived {
  background: oklch(90% 0.006 80 / 0.9);
  color: var(--al-muted);
  border: 1px solid var(--al-border);
}

.al-status-badge.archived::before { background: var(--al-muted); }

@keyframes al-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: .3; }
}

.al-album-body { padding: 16px 18px 18px; }

.al-album-name {
  font-family: var(--al-serif);
  font-size: 18px;
  font-weight: 400;
  color: var(--al-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 2px;
}

.al-album-desc {
  font-size: 12px;
  color: var(--al-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 12px;
}

.al-album-meta-row {
  display: flex;
  gap: 14px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.al-album-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: var(--al-muted);
}

.al-album-meta svg {
  width: 12px;
  height: 12px;
  stroke: currentColor;
  fill: none;
  stroke-width: 1.5;
}

.al-album-meta strong {
  color: var(--al-text);
  font-weight: 400;
}

.al-storage-row {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--al-muted);
  margin-bottom: 5px;
}

.al-storage-track {
  height: 3px;
  background: var(--al-border);
  border-radius: 2px;
  overflow: hidden;
}

.al-storage-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--al-gold-dim);
}

.al-storage-fill.warn { background: var(--al-amber); }
.al-storage-fill.crit { background: var(--al-red); }

.al-album-footer {
  padding: 11px 18px;
  border-top: 1px solid var(--al-border);
  display: flex;
  gap: 6px;
}

.al-af-btn {
  flex: 1;
  text-align: center;
  font-size: 12px;
  padding: 7px;
  border-radius: 6px;
  border: 1px solid var(--al-border);
  color: var(--al-muted);
  cursor: pointer;
  background: none;
  text-decoration: none;
  transition: border-color .15s, color .15s;
  white-space: nowrap;
  display: block;
}

.al-af-btn:hover {
  border-color: var(--al-border2);
  color: var(--al-text);
}

.al-af-btn.gold {
  background: var(--al-gold-glow);
  border-color: var(--al-gold-b);
  color: var(--al-gold);
}

.al-af-btn.gold:hover { background: oklch(44% 0.16 72 / 0.15); }

/* List card */
.al-list-card {
  background: var(--al-bg2);
  border: 1px solid var(--al-border);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  align-items: stretch;
  transition: border-color .2s;
  cursor: pointer;
}

.al-list-card:hover { border-color: var(--al-border2); }

.al-list-cover {
  width: 96px;
  flex-shrink: 0;
  overflow: hidden;
}

.al-list-cover-fill {
  width: 100%;
  height: 100%;
  transition: transform .4s;
}

.al-list-card:hover .al-list-cover-fill { transform: scale(1.08); }

.al-list-body {
  flex: 1;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
  min-width: 0;
}

.al-list-name {
  font-family: var(--al-serif);
  font-size: 18px;
  font-weight: 400;
  color: var(--al-gold);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.al-list-desc {
  font-size: 12px;
  color: var(--al-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.al-list-meta {
  display: flex;
  gap: 16px;
  margin-top: 6px;
  flex-wrap: wrap;
}

.al-list-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 16px 18px;
  gap: 10px;
  flex-shrink: 0;
  min-width: 160px;
}

.al-list-storage {
  width: 120px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.al-list-storage-label {
  font-size: 11px;
  color: var(--al-muted);
  display: flex;
  justify-content: space-between;
}

.al-list-storage-track {
  height: 3px;
  background: var(--al-border);
  border-radius: 2px;
  overflow: hidden;
}

.al-list-storage-fill {
  height: 100%;
  border-radius: 2px;
  background: var(--al-gold-dim);
}

.al-list-storage-fill.warn { background: var(--al-amber); }
.al-list-storage-fill.crit { background: var(--al-red); }

.al-list-actions { display: flex; gap: 6px; }

.al-list-action {
  font-size: 11px;
  padding: 5px 10px;
  border-radius: 5px;
  border: 1px solid var(--al-border);
  color: var(--al-muted);
  cursor: pointer;
  background: none;
  text-decoration: none;
  transition: all .15s;
  white-space: nowrap;
}

.al-list-action:hover {
  border-color: var(--al-border2);
  color: var(--al-text);
}

.al-list-action.gold {
  background: var(--al-gold-glow);
  border-color: var(--al-gold-b);
  color: var(--al-gold);
}

/* Empty state */
.al-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 40px;
  text-align: center;
  gap: 24px;
}

.al-empty-icon {
  width: 72px;
  height: 72px;
  border-radius: 18px;
  background: var(--al-bg2);
  border: 1px solid var(--al-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.al-empty-icon svg {
  width: 32px;
  height: 32px;
  stroke: var(--al-muted);
  fill: none;
  stroke-width: 1.2;
}

.al-empty-title {
  font-family: var(--al-serif);
  font-size: 30px;
  font-weight: 400;
  color: var(--al-gold);
}

.al-empty-sub {
  font-size: 14px;
  color: var(--al-muted);
  max-width: 380px;
  line-height: 1.7;
}

.al-empty-hint {
  font-size: 12px;
  color: var(--al-muted2);
}

/* Responsive */
@media (max-width: 760px) {
  .al-sidebar { display: none; }
  .al-main { margin-left: 0; }
  .al-topbar, .al-toolbar, .al-content { padding-left: 20px; padding-right: 20px; }
  .al-albums-grid { grid-template-columns: 1fr; }
  .al-list-right { display: none; }
}
`;

export default async function AlbumsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName =
    user.user_metadata?.full_name ??
    user.user_metadata?.name ??
    user.email?.split("@")[0] ??
    "User";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const email = user.email ?? "";

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plans(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  const planName = (sub?.plans as any)?.name ?? "";

  const { data: albums } = await supabase
    .from("albums")
    .select("*, media(count)")
    .eq("owner_id", user.id)
    .neq("status", "deleted")
    .order("created_at", { ascending: false });

  const albumList = (albums ?? []) as Array<{
    id: string;
    title: string;
    description: string | null;
    status: string;
    open_date: string | null;
    close_date: string | null;
    allocated_gb: number;
    used_bytes: number | null;
    created_at: string;
    thumbnail_url: string | null;
    media?: { count: number }[];
  }>;

  const activeCount = albumList.filter((a) => {
    if (a.status === "archived") return false;
    if (a.open_date && new Date(a.open_date) > new Date()) return false;
    return true;
  }).length;

  return (
    <>
      <style>{CSS}</style>
      <div className="al-root">
        {/* SIDEBAR */}
        <aside className="al-sidebar">
          <div className="al-sidebar-logo">
            <Link href="/" className="al-logo">Captura</Link>
            {planName && <span className="al-plan-badge">{planName}</span>}
          </div>

          <nav className="al-sidebar-nav">
            <Link href="/dashboard" className="al-nav-item">
              <svg viewBox="0 0 16 16">
                <rect x="1" y="1" width="6" height="6" rx="1" />
                <rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
              Dashboard
            </Link>

            <Link href="/albums" className="al-nav-item active">
              <svg viewBox="0 0 16 16">
                <rect x="2" y="2" width="12" height="12" rx="2" />
                <circle cx="8" cy="8" r="2.5" />
              </svg>
              Albums
              <span className="al-nav-badge">{albumList.length}</span>
            </Link>

            <Link href="/settings" className="al-nav-item">
              <svg viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="2.5" />
                <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4" />
              </svg>
              Settings
            </Link>

            <div className="al-nav-div" />

            <form action={createPortalSession}>
              <button type="submit" className="al-nav-item">
                <svg viewBox="0 0 16 16">
                  <rect x="1" y="3" width="14" height="10" rx="2" />
                  <path d="M1 7h14" />
                </svg>
                Billing
              </button>
            </form>

            <form action={logout}>
              <button type="submit" className="al-nav-item">
                <svg viewBox="0 0 16 16">
                  <path d="M10 8H2M6 5l-3 3 3 3M12 2h-2a2 2 0 00-2 2v8a2 2 0 002 2h2" />
                </svg>
                Sign out
              </button>
            </form>
          </nav>

          <div className="al-sidebar-footer">
            <div className="al-user-row">
              <div className="al-avatar">{initials}</div>
              <div>
                <div className="al-user-name">{displayName}</div>
                <div className="al-user-email">{email}</div>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN */}
        <div className="al-main">
          <AlbumsClient
            albums={albumList}
            totalCount={albumList.length}
            activeCount={activeCount}
          />
        </div>
      </div>
    </>
  );
}
