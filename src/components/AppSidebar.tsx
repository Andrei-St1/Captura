"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/auth/actions";
import { createPortalSession } from "@/app/stripe/actions";

export interface SidebarUser {
  displayName: string;
  initials: string;
  email: string;
}

export interface SidebarProps {
  user: SidebarUser;
  plan: { name: string } | null;
  usage: { usedStorageGb: number; storagePercent: number };
  storageGb: number | null;
}

export function AppSidebar({ user, plan, usage, storageGb }: SidebarProps) {
  const pathname = usePathname();

  function active(href: string) {
    if (href === "/dashboard") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <>
      <style>{CSS}</style>
      <aside className="db-sidebar">

        <div className="db-sidebar-logo">
          <span className="db-sidebar-logo-text">Captura</span>
          {plan?.name && <span className="db-plan-badge">{plan.name}</span>}
        </div>

        <nav className="db-sidebar-nav">
          <Link href="/dashboard" className={`db-nav-item${active("/dashboard") ? " active" : ""}`}>
            <NavIcon path="dashboard" on={active("/dashboard")} />
            Dashboard
          </Link>
          <Link href="/albums" className={`db-nav-item${active("/albums") ? " active" : ""}`}>
            <NavIcon path="albums" on={active("/albums")} />
            Albums
          </Link>
          <Link href="/settings" className={`db-nav-item${active("/settings") ? " active" : ""}`}>
            <NavIcon path="settings" on={active("/settings")} />
            Settings
          </Link>

          <div className="db-nav-divider" />

          <form action={createPortalSession} style={{ width: "100%" }}>
            <button type="submit" className="db-nav-item">
              <NavIcon path="billing" on={false} />
              Billing
            </button>
          </form>

          <form action={logout} style={{ width: "100%" }}>
            <button type="submit" className="db-nav-item">
              <NavIcon path="signout" on={false} />
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
            <div className="db-storage-fill" style={{
              width: `${usage.storagePercent}%`,
              background: usage.storagePercent >= 90 ? "oklch(52% 0.20 25)"
                : usage.storagePercent >= 70 ? "oklch(58% 0.17 75)"
                : "oklch(44% 0.16 72)",
            }} />
          </div>
          <div style={{ fontSize: 11, color: "oklch(58% 0.010 265)", marginTop: 5 }}>
            {usage.usedStorageGb} GB / {storageGb ?? "—"} GB
          </div>
        </div>
      </aside>
    </>
  );
}

function NavIcon({ path, on }: { path: string; on: boolean }) {
  const s = on ? "oklch(44% 0.16 72)" : "currentColor";
  const w = "16"; const h = "16"; const v = "0 0 16 16";
  const base = { width: w, height: h, viewBox: v, fill: "none", stroke: s, strokeWidth: "1.5", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (path === "dashboard") return <svg {...base}><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>;
  if (path === "albums")    return <svg {...base}><rect x="2" y="4" width="12" height="10" rx="1.5"/><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1"/><circle cx="8" cy="9" r="2"/></svg>;
  if (path === "settings")  return <svg {...base}><circle cx="8" cy="8" r="2.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42"/></svg>;
  if (path === "billing")   return <svg {...base}><rect x="1" y="3" width="14" height="10" rx="1.5"/><path d="M1 6h14M4 10h3"/></svg>;
  return /* signout */ <svg {...base}><path d="M6 14H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h4"/><path d="M11 11l3-3-3-3"/><path d="M14 8H6"/></svg>;
}

const CSS = `
  /* ── CSS vars (also defined in DashboardClient; no harm duplicating) ── */
  :root {
    --bg:        oklch(97% 0.008 80);
    --bg2:       oklch(93% 0.010 80);
    --bg3:       oklch(89% 0.012 80);
    --bg4:       oklch(85% 0.012 80);
    --border:    oklch(80% 0.010 80);
    --text:      oklch(18% 0.015 265);
    --muted:     oklch(46% 0.010 265);
    --muted2:    oklch(58% 0.010 265);
    --gold:      oklch(44% 0.16 72);
    --gold-dim:  oklch(36% 0.13 72);
    --gold-glow: oklch(44% 0.16 72 / 0.12);
    --red:       oklch(52% 0.20 25);
    --amber:     oklch(58% 0.17 75);
    --serif:     'Cormorant Garamond', Georgia, serif;
    --sans:      'DM Sans', system-ui, sans-serif;
  }

  .db-sidebar {
    position: fixed; top: 0; left: 0;
    width: 240px; height: 100vh;
    background: var(--bg2);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    z-index: 100; overflow: hidden;
  }

  .db-sidebar-logo {
    padding: 28px 24px 20px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 10px;
  }
  .db-sidebar-logo-text {
    font-family: var(--serif);
    font-size: 22px; font-weight: 400;
    color: var(--text); letter-spacing: -0.02em;
  }
  .db-plan-badge {
    margin-left: auto;
    font-size: 10px; font-weight: 600;
    letter-spacing: 0.06em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 20px;
    background: var(--gold-glow); color: var(--gold);
    border: 1px solid var(--gold-glow); white-space: nowrap;
  }
  .db-sidebar-nav {
    flex: 1; padding: 16px 12px;
    display: flex; flex-direction: column; gap: 2px;
    overflow-y: auto;
  }
  .db-nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 12px; border-radius: 10px;
    color: var(--muted); text-decoration: none;
    font-size: 13px; font-weight: 500;
    transition: background 0.15s, color 0.15s;
    cursor: pointer; border: none; background: none;
    width: 100%; text-align: left;
    font-family: var(--sans);
  }
  .db-nav-item:hover  { background: var(--bg3); color: var(--text); }
  .db-nav-item.active { background: var(--gold-glow); color: var(--gold); font-weight: 600; }
  .db-nav-divider { height: 1px; background: var(--border); margin: 8px 0; }

  .db-sidebar-footer { padding: 16px 20px; border-top: 1px solid var(--border); }
  .db-user-row { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
  .db-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    background: var(--gold-glow); border: 1.5px solid var(--gold);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    color: var(--gold-dim); flex-shrink: 0; text-transform: uppercase;
  }
  .db-user-name  { font-size: 13px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .db-user-email { font-size: 11px; color: var(--muted2); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .db-storage-label  { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-bottom: 6px; }
  .db-storage-track  { height: 5px; background: var(--bg4); border-radius: 99px; overflow: hidden; }
  .db-storage-fill   { height: 100%; border-radius: 99px; transition: width 0.4s; }

  @media (max-width: 760px) {
    .db-sidebar { display: none; }
  }
`;
