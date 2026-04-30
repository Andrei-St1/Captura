"use client";

import { useState } from "react";
import Link from "next/link";
import { createCheckoutSession } from "@/app/stripe/actions";

const PLAN_ICONS: Record<string, React.ReactNode> = {
  starter: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>,
  pro: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  business: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
};

const PLAN_META: Record<string, { tagline: string; bestFor: string; features: string[] }> = {
  starter: {
    tagline: "Perfect for getting started",
    bestFor: "Birthdays, small gatherings, family reunions",
    features: ["3 albums", "50 GB storage pool", "QR code per album", "Guest uploads — no account needed", "Photo & video support", "Welcome card with cover image"],
  },
  pro: {
    tagline: "Our most popular choice",
    bestFor: "Weddings, corporate events, conferences",
    features: ["10 albums", "200 GB storage pool", "QR code per album", "Guest uploads — no account needed", "Photo & video support", "Welcome card with cover image", "Gallery visibility control", "Custom album open & close dates"],
  },
  business: {
    tagline: "For serious event professionals",
    bestFor: "Agencies, venues, multi-event planners",
    features: ["30 albums", "500 GB storage pool", "QR code per album", "Guest uploads — no account needed", "Photo & video support", "Welcome card with cover image", "Gallery visibility control", "Custom album open & close dates", "Priority support"],
  },
};

const COMPARE_ROWS = [
  ["Albums", "3", "10", "30"],
  ["Storage pool", "50 GB", "200 GB", "500 GB"],
  ["QR code per album", "✓", "✓", "✓"],
  ["Guest uploads (no account)", "✓", "✓", "✓"],
  ["Photo & video support", "✓", "✓", "✓"],
  ["Welcome card with cover", "✓", "✓", "✓"],
  ["Gallery visibility control", "—", "✓", "✓"],
  ["Custom open & close dates", "—", "✓", "✓"],
  ["Priority support", "—", "—", "✓"],
];

const FAQS = [
  { q: "Can I change plans later?", a: "Yes — you can upgrade or downgrade at any time. Changes take effect immediately; we'll prorate the difference." },
  { q: "Is there a free trial?", a: "All paid plans include a 14-day free trial. No credit card required to start." },
  { q: "What happens to my albums if I downgrade?", a: "Your photos are safe. If you downgrade below your current album or storage usage, existing albums become read-only until you're within the new limits." },
  { q: "Do guests need an account to upload?", a: "No. Guests simply scan the QR code and upload directly from their phone's browser — no app or account required." },
  { q: "Can I cancel anytime?", a: "Absolutely. Cancel at any time from your account settings. You'll retain access until the end of your billing period." },
];

interface Plan {
  id: string;
  name: string;
  price_month: number;
  max_albums: number;
  storage_gb: number;
}

interface Props {
  plans: Plan[];
  currentPlanId: string | null;
  isLoggedIn: boolean;
}

export function PricingClient({ plans, currentPlanId, isLoggedIn }: Props) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  function getPrice(plan: Plan) {
    const monthly = plan.price_month / 100;
    return billing === "annual" ? (monthly * 0.8).toFixed(0) : monthly.toFixed(0);
  }

  return (
    <div className="pr-root">
      <style>{`
        .pr-root {
          --bg:       oklch(97% 0.008 80);
          --bg2:      oklch(93% 0.010 80);
          --bg3:      oklch(89% 0.012 80);
          --text:     oklch(18% 0.015 265);
          --muted:    oklch(46% 0.010 265);
          --border:   oklch(80% 0.010 80);
          --accent:   oklch(58% 0.16 72);
          --accent-bg: oklch(58% 0.16 72 / 0.09);
          --accent-b:  oklch(58% 0.16 72 / 0.25);
          --serif:    'Cormorant Garamond', Georgia, serif;
          --sans:     'DM Sans', system-ui, sans-serif;
          font-family: var(--sans);
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          font-weight: 300;
        }
        .pr-nav { display:flex; align-items:center; justify-content:space-between; padding:20px 48px; border-bottom:1px solid var(--border); position:sticky; top:0; z-index:50; background:oklch(97% 0.008 80 / 0.92); backdrop-filter:blur(12px); }
        .pr-logo { font-family:var(--serif); font-size:20px; font-weight:500; letter-spacing:0.08em; color:var(--text); text-decoration:none; }
        .pr-nav-link { font-size:13px; color:var(--muted); text-decoration:none; transition:color .15s; }
        .pr-nav-link:hover { color:var(--text); }
        .pr-nav-link.active { color:var(--text); font-weight:500; }
        .pr-nav-cta { font-size:13px; font-weight:500; background:var(--text); color:var(--bg); border:none; border-radius:8px; padding:9px 18px; cursor:pointer; text-decoration:none; transition:opacity .2s; }
        .pr-nav-cta:hover { opacity:.85; }
        .pr-hero-tag { display:inline-flex; align-items:center; gap:6px; font-size:10px; font-weight:500; letter-spacing:0.14em; text-transform:uppercase; color:var(--accent); background:var(--accent-bg); border:1px solid var(--accent-b); border-radius:100px; padding:5px 14px; margin-bottom:24px; }
        .pr-hero-tag::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--accent); }
        .pr-toggle { display:inline-flex; align-items:center; gap:12px; background:var(--bg2); border:1px solid var(--border); border-radius:100px; padding:5px; font-size:13px; }
        .pr-toggle-opt { padding:7px 18px; border-radius:100px; cursor:pointer; transition:all .2s; color:var(--muted); font-weight:400; border:none; background:none; font-family:var(--sans); font-size:13px; }
        .pr-toggle-opt.active { background:var(--bg); color:var(--text); font-weight:500; box-shadow:0 1px 4px oklch(0% 0 0 / 0.08); }
        .pr-save-badge { font-size:9px; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; color:var(--accent); background:var(--accent-bg); border-radius:100px; padding:2px 8px; }
        .pr-card { background:var(--bg); border:1px solid var(--border); border-radius:20px; overflow:hidden; transition:box-shadow .2s, transform .2s; position:relative; }
        .pr-card:hover { box-shadow:0 12px 40px oklch(0% 0 0 / 0.08); transform:translateY(-2px); }
        .pr-card.pro { border-color:var(--accent-b); box-shadow:0 8px 32px oklch(58% 0.16 72 / 0.12); transform:translateY(-8px); }
        .pr-card.pro:hover { box-shadow:0 16px 48px oklch(58% 0.16 72 / 0.18); transform:translateY(-12px); }
        .pr-popular-badge { position:absolute; top:20px; right:20px; font-size:9px; font-weight:500; letter-spacing:0.10em; text-transform:uppercase; color:var(--accent); background:var(--accent-bg); border:1px solid var(--accent-b); border-radius:100px; padding:4px 10px; }
        .pr-card-header { padding:28px 28px 24px; border-bottom:1px solid var(--border); position:relative; }
        .pr-card.pro .pr-card-header { background:linear-gradient(135deg, oklch(96% 0.016 80) 0%, oklch(97% 0.008 80) 100%); }
        .pr-plan-icon { width:36px; height:36px; border-radius:10px; background:var(--bg2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; margin-bottom:16px; }
        .pr-plan-icon svg { width:18px; height:18px; stroke:var(--muted); }
        .pr-card.pro .pr-plan-icon { background:var(--accent-bg); border-color:var(--accent-b); }
        .pr-card.pro .pr-plan-icon svg { stroke:var(--accent); }
        .pr-plan-name { font-family:var(--serif); font-size:28px; font-weight:400; line-height:1; margin-bottom:4px; }
        .pr-plan-sub { font-size:13px; color:var(--muted); margin-bottom:20px; }
        .pr-price-row { display:flex; align-items:baseline; gap:2px; margin-bottom:6px; }
        .pr-price-currency { font-size:22px; font-weight:400; color:var(--muted); align-self:flex-start; margin-top:6px; }
        .pr-price-amount { font-family:var(--serif); font-size:60px; font-weight:400; line-height:1; letter-spacing:-0.02em; color:var(--text); }
        .pr-price-period { font-size:13px; color:var(--muted); align-self:flex-end; margin-bottom:6px; }
        .pr-price-annual { font-size:11px; color:var(--accent); margin-bottom:18px; min-height:16px; }
        .pr-quota-pills { display:flex; gap:6px; flex-wrap:wrap; }
        .pr-quota-pill { display:flex; align-items:center; gap:5px; background:var(--bg2); border:1px solid var(--border); border-radius:100px; padding:4px 10px; font-size:11px; color:var(--muted); }
        .pr-quota-pill svg { width:11px; height:11px; stroke:currentColor; fill:none; stroke-width:2; }
        .pr-card.pro .pr-quota-pill { background:var(--accent-bg); border-color:var(--accent-b); color:var(--accent); font-weight:500; }
        .pr-card-body { padding:24px 28px 28px; }
        .pr-best-for { font-size:9px; font-weight:500; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); margin-bottom:8px; }
        .pr-best-for-text { font-size:13px; color:var(--muted); margin-bottom:22px; font-style:italic; line-height:1.5; }
        .pr-feature { display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--text); line-height:1.4; }
        .pr-feature-check { width:18px; height:18px; border-radius:50%; background:var(--bg2); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; flex-shrink:0; margin-top:1px; }
        .pr-feature-check svg { width:10px; height:10px; stroke:var(--muted); fill:none; stroke-width:2.5; }
        .pr-card.pro .pr-feature-check { background:var(--accent-bg); border-color:var(--accent-b); }
        .pr-card.pro .pr-feature-check svg { stroke:var(--accent); }
        .pr-btn { width:100%; padding:15px 20px; border-radius:12px; font-family:var(--sans); font-size:14px; font-weight:500; cursor:pointer; transition:all .2s; text-align:center; display:block; text-decoration:none; letter-spacing:0.01em; }
        .pr-btn.outline { background:transparent; color:var(--text); border:1px solid var(--border); }
        .pr-btn.outline:hover { background:var(--bg2); border-color:var(--accent-b); }
        .pr-btn.filled { background:var(--accent); color:oklch(97% 0.008 80); border:none; }
        .pr-btn.filled:hover { opacity:.88; transform:translateY(-1px); }
        .pr-btn.current { background:var(--bg2); color:var(--muted); border:1px solid var(--border); cursor:default; }
        .pr-no-cc { text-align:center; font-size:11px; color:var(--muted); margin-top:10px; display:flex; align-items:center; justify-content:center; gap:5px; }
        .pr-no-cc svg { width:11px; height:11px; stroke:var(--muted); fill:none; stroke-width:2; }
        .pr-compare-title { font-family:var(--serif); font-size:32px; font-weight:400; text-align:center; margin-bottom:32px; }
        .pr-compare-title em { font-style:italic; color:var(--accent); }
        .pr-table { width:100%; border-collapse:collapse; font-size:13px; }
        .pr-table thead th { padding:12px 20px; text-align:left; font-family:var(--serif); font-size:18px; font-weight:400; border-bottom:2px solid var(--border); }
        .pr-table thead th:first-child { font-family:var(--sans); font-size:10px; letter-spacing:0.12em; text-transform:uppercase; color:var(--muted); font-weight:500; }
        .pr-table thead th.pro-col { color:var(--accent); }
        .pr-table tbody tr { border-bottom:1px solid var(--border); }
        .pr-table tbody tr:last-child { border-bottom:none; }
        .pr-table tbody tr:hover { background:var(--bg2); }
        .pr-table tbody td { padding:13px 20px; color:var(--text); }
        .pr-table tbody td:first-child { color:var(--muted); font-size:12px; }
        .pr-table tbody td.pro-col { background:oklch(96% 0.012 80 / 0.5); }
        .pr-check { color:var(--accent); font-size:16px; }
        .pr-dash { color:var(--border); font-size:18px; }
        .pr-faq-item { border-bottom:1px solid var(--border); cursor:pointer; }
        .pr-faq-q { display:flex; justify-content:space-between; align-items:center; padding:18px 4px; font-size:14px; font-weight:400; user-select:none; gap:16px; }
        .pr-faq-arrow { width:16px; height:16px; stroke:var(--muted); fill:none; stroke-width:2; flex-shrink:0; transition:transform .25s; }
        .pr-faq-arrow.open { transform:rotate(180deg); }
        .pr-faq-a { font-size:13px; color:var(--muted); line-height:1.7; padding:0 4px 18px; }
        .pr-footer { border-top:1px solid var(--border); padding:32px 48px; display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--muted); }
        .pr-footer a { color:var(--muted); text-decoration:none; transition:color .15s; }
        .pr-footer a:hover { color:var(--text); }
        .pr-footer-logo { font-family:var(--serif); font-size:16px; color:var(--text); }
        @media (max-width: 900px) {
          .pr-nav { padding:16px 20px; }
          .pr-nav-links { display:none; }
          .pr-cards-grid { grid-template-columns:1fr !important; max-width:460px; margin:0 auto; }
          .pr-card.pro { transform:none; }
          .pr-card.pro:hover { transform:translateY(-2px); }
        }
      `}</style>

      {/* NAV */}
      <nav className="pr-nav">
        <Link href="/" className="pr-logo">Captura</Link>
        <div className="pr-nav-links" style={{ display: "flex", gap: 28, alignItems: "center" }}>
          <Link href="/" className="pr-nav-link">Features</Link>
          <Link href="/pricing" className="pr-nav-link active">Pricing</Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="pr-nav-link">Dashboard</Link>
          ) : (
            <Link href="/login" className="pr-nav-link">Log in</Link>
          )}
          {!isLoggedIn && <Link href="/register" className="pr-nav-cta">Get started</Link>}
        </div>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: "center", padding: "80px 24px 64px", maxWidth: 640, margin: "0 auto" }}>
        <div className="pr-hero-tag">Pricing</div>
        <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(44px, 5vw, 64px)", fontWeight: 400, lineHeight: 1.0, marginBottom: 18, letterSpacing: "-0.01em" }}>
          Simple pricing,<br /><em style={{ fontStyle: "italic", color: "var(--accent)" }}>every occasion</em>
        </h1>
        <p style={{ fontSize: 16, color: "var(--muted)", lineHeight: 1.7, marginBottom: 36 }}>
          No hidden fees. Pay monthly or annually. Cancel any time. All plans include a 14-day free trial.
        </p>
        <div className="pr-toggle">
          <button className={`pr-toggle-opt${billing === "monthly" ? " active" : ""}`} onClick={() => setBilling("monthly")}>Monthly</button>
          <button className={`pr-toggle-opt${billing === "annual" ? " active" : ""}`} onClick={() => setBilling("annual")}>
            Annual <span className="pr-save-badge">Save 20%</span>
          </button>
        </div>
      </div>

      {/* CARDS */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px 80px" }}>
        <div className="pr-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, alignItems: "start" }}>
          {plans.map((plan) => {
            const meta = PLAN_META[plan.id];
            const isPro = plan.id === "pro";
            const isCurrent = plan.id === currentPlanId;
            if (!meta) return null;
            return (
              <div key={plan.id} className={`pr-card${isPro ? " pro" : ""}`}>
                {isPro && <div className="pr-popular-badge">✦ Most popular</div>}
                {isCurrent && <div className="pr-popular-badge" style={{ left: 20, right: "auto" }}>✓ Your plan</div>}

                <div className="pr-card-header">
                  <div className="pr-plan-icon">{PLAN_ICONS[plan.id]}</div>
                  <div className="pr-plan-name">{plan.name}</div>
                  <div className="pr-plan-sub">{meta.tagline}</div>
                  <div className="pr-price-row">
                    <span className="pr-price-currency">$</span>
                    <span className="pr-price-amount">{getPrice(plan)}</span>
                    <span className="pr-price-period">/mo</span>
                  </div>
                  <div className="pr-price-annual">{billing === "annual" ? "Billed annually" : ""}</div>
                  <div className="pr-quota-pills">
                    <div className="pr-quota-pill">
                      <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      {plan.max_albums} albums
                    </div>
                    <div className="pr-quota-pill">
                      <svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                      {plan.storage_gb} GB
                    </div>
                  </div>
                </div>

                <div className="pr-card-body">
                  <div className="pr-best-for">Best for</div>
                  <div className="pr-best-for-text">{meta.bestFor}</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 11, marginBottom: 28 }}>
                    {meta.features.map((feat) => (
                      <div key={feat} className="pr-feature">
                        <div className="pr-feature-check"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
                        {feat}
                      </div>
                    ))}
                  </div>

                  {isCurrent ? (
                    <div className="pr-btn current">✓ Current plan</div>
                  ) : isLoggedIn ? (
                    <form action={createCheckoutSession}>
                      <input type="hidden" name="planId" value={plan.id} />
                      <button type="submit" className={`pr-btn ${isPro ? "filled" : "outline"}`}>
                        Upgrade to {plan.name} →
                      </button>
                    </form>
                  ) : (
                    <Link href="/register" className={`pr-btn ${isPro ? "filled" : "outline"}`}>
                      Get started free →
                    </Link>
                  )}
                  <div className="pr-no-cc">
                    <svg viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                    No credit card required
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPARISON TABLE */}
      <div style={{ maxWidth: 860, margin: "0 auto 80px", padding: "0 24px" }}>
        <div className="pr-compare-title">Everything <em>compared</em></div>
        <table className="pr-table">
          <thead>
            <tr>
              <th>Feature</th>
              <th>Starter</th>
              <th className="pro-col">Pro</th>
              <th>Business</th>
            </tr>
          </thead>
          <tbody>
            {COMPARE_ROWS.map(([feat, s, p, b]) => (
              <tr key={feat}>
                <td>{feat}</td>
                {[s, p, b].map((val, i) => (
                  <td key={i} className={i === 1 ? "pro-col" : ""}>
                    {val === "✓" ? <span className="pr-check">✓</span> : val === "—" ? <span className="pr-dash">—</span> : val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FAQ */}
      <div style={{ maxWidth: 680, margin: "0 auto 80px", padding: "0 24px" }}>
        <div className="pr-compare-title">Questions</div>
        {FAQS.map((faq, i) => (
          <div key={i} className="pr-faq-item" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
            <div className="pr-faq-q">
              {faq.q}
              <svg className={`pr-faq-arrow${openFaq === i ? " open" : ""}`} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
            </div>
            {openFaq === i && <div className="pr-faq-a">{faq.a}</div>}
          </div>
        ))}
      </div>

      {/* FOOTER */}
      <footer className="pr-footer">
        <div className="pr-footer-logo">Captura</div>
        <div>© 2026 Captura. All rights reserved.</div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="#">Privacy</a>
          <a href="#">Terms</a>
          <a href="#">Contact</a>
        </div>
      </footer>
    </div>
  );
}
