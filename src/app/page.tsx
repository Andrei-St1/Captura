import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";

// ─── Data ─────────────────────────────────────────────────────────────────────

const steps = [
  {
    num: "01",
    title: "Choose a plan",
    desc: "Pick the package that fits your needs. You get album slots and a storage pool to distribute across your events.",
  },
  {
    num: "02",
    title: "Create an album",
    desc: "Set a title, welcome message, cover photo, open date, and allocate how much storage this event gets.",
  },
  {
    num: "03",
    title: "Share the QR code",
    desc: "Every album gets a unique QR code. Share it with guests — they scan and join instantly, no account needed.",
  },
  {
    num: "04",
    title: "Collect memories",
    desc: "Guests upload photos and videos directly to your album. You control visibility and manage content.",
  },
];

const features = [
  {
    title: "QR Code Sharing",
    desc: "Every album gets a unique QR code. Guests scan it and land on a welcome card with your message and cover photo.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" />
        <path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" />
      </svg>
    ),
  },
  {
    title: "Storage Control",
    desc: "Allocate storage from your pool per album. Set 20 GB for a wedding, 5 GB for a birthday — you decide.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M3 5v14a9 3 0 0 0 18 0V5" /><path d="M3 12a9 3 0 0 0 18 0" />
      </svg>
    ),
  },
  {
    title: "Guest Uploads",
    desc: "No account required for guests. They scan the QR, join the album, and upload photos and videos instantly.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" />
      </svg>
    ),
  },
  {
    title: "Welcome Card",
    desc: "Guests are greeted by a beautiful welcome card showing your cover image and personal message when they join.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
    ),
  },
  {
    title: "Gallery Control",
    desc: "Choose whether guests can browse each other's uploads or only see their own. Full privacy control per album.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
      </svg>
    ),
  },
  {
    title: "Photo & Video",
    desc: "Albums support both photos and videos. Capture every moment — from candid snaps to full event recordings.",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m22 8-6 4 6 4V8Z" /><rect width="14" height="12" x="2" y="6" rx="2" ry="2" />
      </svg>
    ),
  },
];

const plans = [
  {
    id: "starter",
    name: "Starter",
    price: 9.99,
    albums: 3,
    storage: 50,
    popular: false,
    features: [
      "3 albums",
      "50 GB storage",
      "QR code per album",
      "Guest uploads",
      "Photo & video support",
      "Welcome card",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 24.99,
    albums: 10,
    storage: 200,
    popular: true,
    features: [
      "10 albums",
      "200 GB storage",
      "QR code per album",
      "Guest uploads",
      "Photo & video support",
      "Welcome card",
      "Gallery visibility control",
      "Custom open & close dates",
    ],
  },
  {
    id: "business",
    name: "Business",
    price: 49.99,
    albums: 30,
    storage: 500,
    popular: false,
    features: [
      "30 albums",
      "500 GB storage",
      "QR code per album",
      "Guest uploads",
      "Photo & video support",
      "Welcome card",
      "Gallery visibility control",
      "Custom open & close dates",
      "Priority support",
    ],
  },
];

// ─── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white text-slate-900">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-slate-900">
            Captura
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-slate-900 transition">How it works</a>
            <a href="#features" className="hover:text-slate-900 transition">Features</a>
            <a href="#pricing" className="hover:text-slate-900 transition">Pricing</a>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:border-violet-300 hover:text-violet-600 transition"
                  title="Go to dashboard"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" />
                  </svg>
                  Dashboard
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 transition"
                  >
                    Sign out
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition px-3 py-2">
                  Sign in
                </Link>
                <Link href="/register" className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 transition shadow-sm">
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <section
        className="relative overflow-hidden px-6 py-24 text-center"
        style={{ background: "linear-gradient(135deg, #ede9fe 0%, #f5d0fe 45%, #fecdd3 80%, #fff1f2 100%)" }}
      >
        {/* Ambient glows */}
        <div className="pointer-events-none absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 right-1/4 h-96 w-96 rounded-full bg-rose-300/30 blur-3xl" />

        <div className="relative mx-auto max-w-3xl">
          <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-violet-700 ring-1 ring-violet-200">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
            Share events. Collect memories.
          </span>

          <h1 className="mt-4 text-5xl font-bold leading-tight tracking-tight text-slate-900 sm:text-6xl">
            Turn Events Into<br />
            <span className="text-violet-600">Shared Memories</span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-lg text-slate-600 leading-relaxed">
            Create albums for your events, share a QR code, and let guests upload
            photos and videos — all in one place, under your control.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="rounded-xl bg-violet-600 px-8 py-3.5 text-base font-semibold text-white hover:bg-violet-500 transition shadow-md shadow-violet-200"
            >
              Get started free
            </Link>
            <a
              href="#how-it-works"
              className="rounded-xl bg-white/70 px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-white transition ring-1 ring-slate-200"
            >
              See how it works
            </a>
          </div>

          {/* Mock welcome card preview */}
          <div className="mx-auto mt-16 max-w-sm rounded-2xl bg-white shadow-2xl ring-1 ring-slate-100 overflow-hidden text-left">
            <div className="h-36 w-full"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #a855f7 50%, #ec4899 100%)" }}
            >
              <div className="flex h-full items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                  <circle cx="12" cy="13" r="3" />
                </svg>
              </div>
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-violet-500">Wedding · June 2025</p>
              <h3 className="mt-1 text-lg font-bold text-slate-900">Sarah & James</h3>
              <p className="mt-1.5 text-sm text-slate-500">
                Welcome! Share your photos and videos from our special day. We can&apos;t wait to see it through your eyes.
              </p>
              <button className="mt-4 w-full rounded-lg bg-violet-600 py-2.5 text-sm font-semibold text-white">
                Join album
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ───────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              How it works
            </h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto">
              From purchase to a live shared album in minutes.
            </p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => (
              <div key={step.num} className="relative">
                <span className="text-5xl font-black text-violet-100 select-none leading-none">
                  {step.num}
                </span>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">{step.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────────── */}
      <section id="features" className="bg-slate-50 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Everything you need
            </h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto">
              Built for event organizers who want full control over their shared memories.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl bg-white p-6 ring-1 ring-slate-100 shadow-sm hover:shadow-md transition"
              >
                <div className="mb-4 inline-flex rounded-xl bg-violet-50 p-3 text-violet-600">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="bg-white px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Simple pricing
            </h2>
            <p className="mt-4 text-slate-500 max-w-lg mx-auto">
              One price per month. No hidden fees. Upgrade or cancel anytime.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 ${
                  plan.popular
                    ? "bg-violet-600 text-white shadow-2xl shadow-violet-200 ring-0 scale-105"
                    : "bg-white ring-1 ring-slate-200 shadow-sm"
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-rose-500 px-4 py-1 text-xs font-semibold text-white shadow">
                    Most popular
                  </span>
                )}

                <h3 className={`text-lg font-bold ${plan.popular ? "text-white" : "text-slate-900"}`}>
                  {plan.name}
                </h3>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className={`text-4xl font-black ${plan.popular ? "text-white" : "text-slate-900"}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? "text-violet-200" : "text-slate-400"}`}>/month</span>
                </div>

                <p className={`mt-1 text-sm ${plan.popular ? "text-violet-200" : "text-slate-500"}`}>
                  {plan.albums} albums · {plan.storage} GB storage
                </p>

                <Link
                  href="/register"
                  className={`mt-6 block w-full rounded-xl py-3 text-center text-sm font-semibold transition ${
                    plan.popular
                      ? "bg-white text-violet-600 hover:bg-violet-50"
                      : "bg-violet-600 text-white hover:bg-violet-500 shadow-sm"
                  }`}
                >
                  Get started
                </Link>

                <ul className="mt-8 space-y-3">
                  {plan.features.map((feat) => (
                    <li key={feat} className="flex items-center gap-3 text-sm">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className={`shrink-0 ${plan.popular ? "text-violet-200" : "text-violet-500"}`}
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      <span className={plan.popular ? "text-violet-100" : "text-slate-600"}>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ─────────────────────────────────────────────────────── */}
      <section
        className="px-6 py-20 text-center"
        style={{ background: "linear-gradient(135deg, #ede9fe 0%, #f5d0fe 45%, #fecdd3 80%, #fff1f2 100%)" }}
      >
        <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Ready to capture your next event?
        </h2>
        <p className="mt-4 text-slate-600 max-w-md mx-auto">
          Create your first album in minutes. No credit card required to get started.
        </p>
        <Link
          href="/register"
          className="mt-8 inline-block rounded-xl bg-violet-600 px-10 py-3.5 text-base font-semibold text-white hover:bg-violet-500 transition shadow-md shadow-violet-200"
        >
          Create your account
        </Link>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <Link href="/" className="text-xl font-bold text-white">
              Captura
            </Link>

            <nav className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-400">
              <a href="#how-it-works" className="hover:text-white transition">How it works</a>
              <a href="#features" className="hover:text-white transition">Features</a>
              <a href="#pricing" className="hover:text-white transition">Pricing</a>
              <Link href="/login" className="hover:text-white transition">Sign in</Link>
              <Link href="/register" className="hover:text-white transition">Register</Link>
            </nav>
          </div>

          <div className="mt-8 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            © {new Date().getFullYear()} Captura. All rights reserved.
          </div>
        </div>
      </footer>

    </div>
  );
}
