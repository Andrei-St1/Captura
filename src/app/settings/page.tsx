import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createPortalSession } from "@/app/stripe/actions";
import { getSubscriptionLimits } from "@/lib/subscription";
import { AppSidebar } from "@/components/AppSidebar";
import { ProfileForm, PasswordForm } from "./SettingsForms";
import Link from "next/link";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = user.user_metadata?.full_name ?? "";
  const email       = user.email ?? "";
  const initials    = (displayName.split(" ").map((n: string) => n[0] ?? "").join("").slice(0, 2) || email[0] || "?").toUpperCase();

  const limits = await getSubscriptionLimits(user.id);
  const { plan, hasActiveSubscription, usage } = limits;

  return (
    <>
      <style>{CSS}</style>
      <div className="st-root">
        <AppSidebar
          user={{ displayName: displayName || email, initials, email }}
          plan={plan}
          usage={{ usedStorageGb: usage.usedStorageGb, storagePercent: usage.storagePercent }}
          storageGb={plan?.storageGb ?? null}
        />

        <main className="st-main">
          {/* ── Topbar ── */}
          <header className="st-topbar">
            <div>
              <h1 className="st-topbar-title">Account <em>settings.</em></h1>
              <p className="st-topbar-sub">Manage your profile, security and billing.</p>
            </div>
            <Link href="/settings" className="st-mobile-avatar">{initials}</Link>
          </header>

          {/* ── Content ── */}
          <div className="st-content">

            {/* Profile */}
            <section className="st-section">
              <div className="st-section-head">
                <h2 className="st-section-title">Profile</h2>
                <p className="st-section-sub">Update your display name.</p>
              </div>
              <div className="st-section-body">
                <ProfileForm fullName={displayName} email={email} />
              </div>
            </section>

            {/* Security */}
            <section className="st-section">
              <div className="st-section-head">
                <h2 className="st-section-title">Security</h2>
                <p className="st-section-sub">Change your password.</p>
              </div>
              <div className="st-section-body">
                <PasswordForm />
              </div>
            </section>

            {/* Plan & Billing */}
            <section className="st-section">
              <div className="st-section-head">
                <h2 className="st-section-title">Plan & Billing</h2>
                <p className="st-section-sub">Manage your subscription and payment details.</p>
              </div>
              <div className="st-section-body">
                <div className="st-plan-row">
                  <div>
                    <p className="st-plan-label">Current plan</p>
                    <p className="st-plan-name">{plan?.name ?? "No active plan"}</p>
                    {plan && (
                      <p className="st-plan-detail">{plan.maxAlbums} albums · {plan.storageGb} GB storage</p>
                    )}
                  </div>
                  <span className={`st-badge${hasActiveSubscription ? " active" : ""}`}>
                    {hasActiveSubscription ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="st-billing-actions">
                  {hasActiveSubscription && (
                    <form action={createPortalSession}>
                      <button type="submit" className="st-btn-outline">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/>
                        </svg>
                        Manage billing
                      </button>
                    </form>
                  )}
                  <Link href="/pricing" className="st-btn-outline">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
                    </svg>
                    {hasActiveSubscription ? "Change plan" : "View plans"}
                  </Link>
                </div>
              </div>
            </section>

            {/* Usage */}
            <section className="st-section">
              <div className="st-section-head">
                <h2 className="st-section-title">Usage</h2>
              </div>
              <div className="st-section-body">
                <div className="st-usage-grid">
                  {[
                    { label: "Albums",       value: `${usage.albumsCount} / ${plan?.maxAlbums ?? "—"}`,   percent: usage.albumsPercent },
                    { label: "Storage used", value: `${usage.usedStorageGb} / ${plan?.storageGb ?? "—"} GB`, percent: usage.storagePercent },
                  ].map(({ label, value, percent }) => (
                    <div key={label} className="st-usage-card">
                      <p className="st-usage-label">{label}</p>
                      <p className="st-usage-value">{value}</p>
                      <div className="st-usage-track">
                        <div className="st-usage-fill" style={{
                          width: `${percent}%`,
                          background: percent >= 90 ? "oklch(52% 0.20 25)" : percent >= 70 ? "oklch(58% 0.17 75)" : "oklch(44% 0.16 72)",
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
    </>
  );
}

const CSS = `
  .st-root {
    min-height: 100vh;
    background: oklch(97% 0.008 80);
    color: oklch(18% 0.015 265);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Main area (offset for fixed sidebar) ── */
  .st-main {
    margin-left: 240px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Topbar ── */
  .st-topbar {
    position: sticky; top: 0; z-index: 40;
    background: oklch(97% 0.008 80 / 0.88);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid oklch(80% 0.010 80);
    padding: 20px 40px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px;
  }
  .st-topbar-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 26px; font-weight: 400;
    color: oklch(18% 0.015 265); line-height: 1.2;
  }
  .st-topbar-title em { font-style: italic; color: oklch(44% 0.16 72); }
  .st-topbar-sub { font-size: 12px; color: oklch(58% 0.010 265); margin-top: 3px; }

  .st-mobile-avatar { display: none; }

  /* ── Content ── */
  .st-content {
    padding: 32px 40px 60px;
    display: flex; flex-direction: column; gap: 20px;
    max-width: 720px;
  }

  /* ── Section ── */
  .st-section {
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 16px;
    overflow: hidden;
  }
  .st-section-head {
    padding: 18px 24px;
    background: oklch(89% 0.012 80);
    border-bottom: 1px solid oklch(80% 0.010 80);
  }
  .st-section-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 18px; font-weight: 400;
    color: oklch(18% 0.015 265);
  }
  .st-section-sub { font-size: 12px; color: oklch(46% 0.010 265); margin-top: 2px; }
  .st-section-body { padding: 24px; }

  /* ── Plan card ── */
  .st-plan-row {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
    background: oklch(89% 0.012 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 16px;
  }
  .st-plan-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: oklch(46% 0.010 265); margin-bottom: 4px; }
  .st-plan-name  { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 22px; font-weight: 400; color: oklch(18% 0.015 265); }
  .st-plan-detail { font-size: 12px; color: oklch(46% 0.010 265); margin-top: 2px; }

  .st-badge {
    padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600;
    background: oklch(80% 0.010 80); color: oklch(46% 0.010 265);
    white-space: nowrap; flex-shrink: 0;
  }
  .st-badge.active { background: oklch(65% 0.16 155 / 0.12); color: oklch(50% 0.16 155); }

  .st-billing-actions { display: flex; flex-wrap: wrap; gap: 10px; }
  .st-btn-outline {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 16px; border-radius: 8px;
    border: 1px solid oklch(80% 0.010 80);
    background: oklch(97% 0.008 80);
    font-size: 13px; font-weight: 500;
    color: oklch(46% 0.010 265);
    cursor: pointer; text-decoration: none;
    font-family: 'DM Sans', system-ui, sans-serif;
    transition: border-color .15s, color .15s;
  }
  .st-btn-outline:hover { border-color: oklch(44% 0.16 72 / 0.4); color: oklch(44% 0.16 72); }

  /* ── Usage ── */
  .st-usage-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .st-usage-card {
    background: oklch(89% 0.012 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 10px; padding: 16px;
  }
  .st-usage-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: oklch(46% 0.010 265); margin-bottom: 6px; }
  .st-usage-value { font-size: 13px; font-weight: 600; color: oklch(18% 0.015 265); margin-bottom: 10px; }
  .st-usage-track { height: 5px; background: oklch(80% 0.010 80); border-radius: 99px; overflow: hidden; }
  .st-usage-fill  { height: 100%; border-radius: 99px; transition: width .4s; }

  /* ── Mobile ── */
  @media (max-width: 760px) {
    .st-main { margin-left: 0; }
    .st-topbar { padding: 14px 20px; }
    .st-content { padding: 20px 16px 60px; }
    .st-usage-grid { grid-template-columns: 1fr; }
    .st-mobile-avatar {
      display: flex; align-items: center; justify-content: center;
      width: 34px; height: 34px; border-radius: 50%;
      background: oklch(44% 0.16 72 / 0.12);
      border: 1.5px solid oklch(44% 0.16 72);
      font-size: 12px; font-weight: 700;
      color: oklch(36% 0.13 72);
      text-decoration: none; text-transform: uppercase; flex-shrink: 0;
    }
  }
`;
