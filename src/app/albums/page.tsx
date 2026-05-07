import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AlbumsClient } from "./AlbumsClient";
import { AppSidebar } from "@/components/AppSidebar";
import { getSubscriptionLimits } from "@/lib/subscription";

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

  const limits  = await getSubscriptionLimits(user.id);
  const { plan, usage } = limits;

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
        <AppSidebar
          user={{ displayName, initials, email }}
          plan={plan}
          usage={{ usedStorageGb: usage.usedStorageGb, storagePercent: usage.storagePercent }}
          storageGb={plan?.storageGb ?? null}
        />

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
