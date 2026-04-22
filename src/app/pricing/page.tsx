import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { createCheckoutSession } from "@/app/stripe/actions";

// ── Plan metadata ──────────────────────────────────────────────────────────────

const planMeta: Record<string, {
  tagline: string;
  bestFor: string;
  gradient: string;
  iconColor: string;
  features: string[];
}> = {
  starter: {
    tagline: "Perfect for getting started",
    bestFor: "Birthdays, small gatherings, family reunions",
    gradient: "from-sky-400 to-violet-500",
    iconColor: "text-sky-400",
    features: [
      "3 albums",
      "50 GB storage pool",
      "QR code per album",
      "Guest uploads — no account needed",
      "Photo & video support",
      "Welcome card with cover image",
    ],
  },
  pro: {
    tagline: "Our most popular choice",
    bestFor: "Weddings, corporate events, conferences",
    gradient: "from-violet-500 to-purple-600",
    iconColor: "text-violet-400",
    features: [
      "10 albums",
      "200 GB storage pool",
      "QR code per album",
      "Guest uploads — no account needed",
      "Photo & video support",
      "Welcome card with cover image",
      "Gallery visibility control",
      "Custom album open & close dates",
    ],
  },
  business: {
    tagline: "For serious event professionals",
    bestFor: "Agencies, venues, multi-event planners",
    gradient: "from-purple-600 to-rose-500",
    iconColor: "text-purple-400",
    features: [
      "30 albums",
      "500 GB storage pool",
      "QR code per album",
      "Guest uploads — no account needed",
      "Photo & video support",
      "Welcome card with cover image",
      "Gallery visibility control",
      "Custom album open & close dates",
      "Priority support",
    ],
  },
};

const faqs = [
  {
    q: "Do guests need an account to upload?",
    a: "Nope! Guests scan your QR code, see your welcome card, and upload photos or videos right away — no sign-up, no friction.",
  },
  {
    q: "How does storage distribution work?",
    a: "You have a storage pool shared across all your albums. When creating an album you decide how many GB to allocate to it — e.g. 30 GB for a wedding, 5 GB for a birthday.",
  },
  {
    q: "What happens when an album is full?",
    a: "Guests will see a friendly message that the album is at capacity. You can increase that album's allocation or upgrade your plan — existing media is never deleted.",
  },
  {
    q: "Can I control what guests see?",
    a: "Yes. Per album you choose whether guests can browse everyone's uploads or only their own.",
  },
  {
    q: "Can I upgrade or cancel anytime?",
    a: "Absolutely. Upgrades are instant and prorated. You can cancel before your next billing date with no questions asked.",
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function PricingPage() {
  const supabase = await createClient();

  const [{ data: { user } }, { data: plans }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("plans").select("*").order("price_month"),
  ]);

  let currentPlanId: string | null = null;
  if (user) {
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", user.id)
      .single();
    if (sub?.status === "active") currentPlanId = sub.plan_id;
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            Captura
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <Link href="/#how-it-works" className="hover:text-slate-900 transition">How it works</Link>
            <Link href="/#features" className="hover:text-slate-900 transition">Features</Link>
            <Link href="/pricing" className="text-violet-600 font-semibold">Pricing</Link>
          </nav>
          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link href="/dashboard" className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-600 transition">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  Dashboard
                </Link>
                <form action={logout}>
                  <button type="submit" className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition">
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition px-3 py-2">Sign in</Link>
                <Link href="/register" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-sm">Get started</Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden px-6 py-20 text-center"
        style={{ background: "linear-gradient(135deg, #ede9fe 0%, #f5d0fe 45%, #fecdd3 80%, #fff1f2 100%)" }}>
        <div className="pointer-events-none absolute -top-24 left-1/4 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-1/4 h-72 w-72 rounded-full bg-rose-300/30 blur-3xl" />

        <div className="relative mx-auto max-w-2xl">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-violet-700 ring-1 ring-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            No surprises, ever
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            Plans that grow<br />
            <span className="text-violet-600">with your events</span>
          </h1>
          <p className="mt-5 text-lg text-slate-600">
            Start small, upgrade when you need more. Every plan includes everything you need to collect memories from your guests.
          </p>

          {/* Trust pills */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: "↩", text: "Cancel anytime" },
              { icon: "🔒", text: "Secure payments" },
              { icon: "✦", text: "No hidden fees" },
            ].map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-1.5 rounded-full bg-white/80 px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200">
                <span>{icon}</span> {text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Plan cards ───────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl">
          {plans && plans.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-3 lg:items-stretch">
              {plans.map((plan) => {
                const meta = planMeta[plan.id];
                const isCurrent = plan.id === currentPlanId;
                const isPopular = plan.id === "pro";
                const price = (plan.price_month / 100).toFixed(2);

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-3xl overflow-hidden transition-all duration-300 hover:-translate-y-1 ${
                      isPopular
                        ? "shadow-2xl shadow-violet-200 ring-2 ring-violet-400"
                        : "shadow-md ring-1 ring-slate-200"
                    }`}
                  >
                    {/* Coloured card top */}
                    <div className={`bg-gradient-to-br ${meta.gradient} px-8 pt-8 pb-10 text-white`}>
                      {isPopular && (
                        <span className="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm">
                          ✦ Most popular
                        </span>
                      )}
                      {isCurrent && (
                        <span className="mb-4 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide backdrop-blur-sm">
                          ✓ Your current plan
                        </span>
                      )}

                      {/* Camera icon */}
                      <div className="mb-4 inline-flex rounded-2xl bg-white/15 p-3 backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                          <circle cx="12" cy="13" r="3" />
                        </svg>
                      </div>

                      <h3 className="text-2xl font-bold">{plan.name}</h3>
                      <p className="mt-1 text-sm text-white/70">{meta.tagline}</p>

                      <div className="mt-5 flex items-baseline gap-1">
                        <span className="text-5xl font-black">${price}</span>
                        <span className="text-white/60 text-sm">/month</span>
                      </div>

                      <div className="mt-3 flex gap-3">
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                          {plan.max_albums} albums
                        </span>
                        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
                          {plan.storage_gb} GB
                        </span>
                      </div>
                    </div>

                    {/* White card bottom */}
                    <div className="flex flex-1 flex-col bg-white px-8 py-6">
                      <p className="mb-5 text-xs font-semibold uppercase tracking-widest text-slate-400">
                        Best for
                      </p>
                      <p className="mb-6 text-sm text-slate-500 leading-relaxed">
                        {meta.bestFor}
                      </p>

                      <ul className="flex-1 space-y-3 border-t border-slate-100 pt-6">
                        {meta.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-3 text-sm text-slate-600">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0 text-violet-500">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            {feat}
                          </li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <div className="mt-8">
                        {isCurrent ? (
                          <div className="w-full rounded-2xl bg-slate-50 py-3 text-center text-sm font-semibold text-slate-400 ring-1 ring-slate-200">
                            ✓ Current plan
                          </div>
                        ) : user ? (
                          <form action={createCheckoutSession}>
                            <input type="hidden" name="planId" value={plan.id} />
                            <button
                              type="submit"
                              className={`w-full rounded-2xl py-3 text-sm font-semibold transition ${
                                isPopular
                                  ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-200"
                                  : "bg-slate-900 text-white hover:bg-slate-700"
                              }`}
                            >
                              Upgrade to {plan.name} →
                            </button>
                          </form>
                        ) : (
                          <Link
                            href="/register"
                            className={`block w-full rounded-2xl py-3 text-center text-sm font-semibold transition ${
                              isPopular
                                ? "bg-violet-600 text-white hover:bg-violet-500 shadow-lg shadow-violet-200"
                                : "bg-slate-900 text-white hover:bg-slate-700"
                            }`}
                          >
                            Get started →
                          </Link>
                        )}
                        <p className="mt-3 text-center text-xs text-slate-400">
                          No credit card required
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-slate-400 py-20">Loading plans…</p>
          )}
        </div>
      </section>

      {/* ── How storage works ────────────────────────────────────────────── */}
      <section className="bg-slate-50 px-6 py-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold text-slate-900">How storage works</h2>
          <p className="mt-3 text-slate-500">
            Your plan gives you a storage pool. You split it between albums however you like.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {[
              { step: "1", title: "Get your pool", desc: "Buy a plan and receive e.g. 200 GB of shared storage." },
              { step: "2", title: "Create an album", desc: "Allocate a slice — e.g. 30 GB for a wedding album." },
              { step: "3", title: "Guests fill it", desc: "Guests upload until that album's limit is reached." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-2xl bg-white p-6 text-left shadow-sm ring-1 ring-slate-100">
                <span className="text-4xl font-black text-violet-100">{step}</span>
                <h3 className="mt-2 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────── */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-2 text-center text-3xl font-bold text-slate-900">Got questions?</h2>
          <p className="mb-12 text-center text-slate-500">We've got answers.</p>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-2xl bg-slate-50 px-6 py-5">
                <h3 className="flex items-center gap-2 font-semibold text-slate-900">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-600">?</span>
                  {faq.q}
                </h3>
                <p className="mt-2 pl-8 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      {!user && (
        <section className="mx-6 mb-20 overflow-hidden rounded-3xl px-8 py-16 text-center"
          style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }}>
          <h2 className="text-3xl font-bold text-white">
            Your next event deserves<br />to be remembered
          </h2>
          <p className="mt-4 text-white/70 max-w-md mx-auto">
            Set up in minutes. Share the QR. Watch the memories roll in.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="rounded-2xl bg-white px-8 py-3.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 transition shadow-lg">
              Start for free →
            </Link>
            <Link href="/login" className="rounded-2xl bg-white/10 px-8 py-3.5 text-sm font-semibold text-white hover:bg-white/20 transition backdrop-blur-sm">
              Already have an account
            </Link>
          </div>
        </section>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 px-6 py-12">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="text-xl font-bold text-white">Captura</Link>
          <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
            <Link href="/#how-it-works" className="hover:text-white transition">How it works</Link>
            <Link href="/#features" className="hover:text-white transition">Features</Link>
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/login" className="hover:text-white transition">Sign in</Link>
          </nav>
        </div>
        <div className="mx-auto max-w-6xl mt-8 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} Captura. All rights reserved.
        </div>
      </footer>

    </div>
  );
}
