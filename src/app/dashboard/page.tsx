import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { createPortalSession } from "@/app/stripe/actions";
import { getSubscriptionLimits } from "@/lib/subscription";
import CheckoutSuccessBanner from "@/components/CheckoutSuccessBanner";

const gradients = [
  "from-violet-400 via-purple-400 to-pink-400",
  "from-amber-400 via-orange-400 to-rose-400",
  "from-sky-400 via-blue-400 to-indigo-400",
  "from-emerald-400 via-teal-400 to-cyan-400",
  "from-rose-400 via-pink-400 to-fuchsia-400",
  "from-orange-400 via-amber-400 to-yellow-400",
];

// ── Page ───────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const { checkout } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const displayName = user.user_metadata?.full_name ?? user.email ?? "User";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Subscription + usage via shared utility
  const [limits, { data: albums }] = await Promise.all([
    getSubscriptionLimits(user.id),
    supabase
      .from("albums")
      .select("*, media(count)")
      .eq("owner_id", user.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false }),
  ]);

  const { plan, usage, hasActiveSubscription } = limits;
  const albumList = albums ?? [];
  const activeAlbums = albumList.filter((a) => a.status === "active");

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface">

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(78,68,74,0.06)]">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-screen-2xl mx-auto">

          {/* Left: logo + nav links */}
          <div className="flex items-center gap-12">
            <Link href="/" className="font-noto-serif text-xl font-light tracking-tighter text-primary">Captura</Link>
            <div className="hidden md:flex gap-8 items-center h-full">
              <Link
                href="/dashboard"
                className="text-primary font-semibold border-b-2 border-primary font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center"
              >
                Dashboard
              </Link>
              <Link
                href="/albums"
                className="text-on-surface-variant hover:text-primary transition-colors font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center"
              >
                Albums
              </Link>
              <Link
                href="/settings"
                className="text-on-surface-variant hover:text-primary transition-colors font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center"
              >
                Settings
              </Link>
            </div>
          </div>

          {/* Right: notifications + avatar + sign out */}
          <div className="flex items-center gap-5">
            <button className="text-on-surface-variant hover:text-primary transition-all" aria-label="Notifications">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold ring-2 ring-outline-variant/20 ring-offset-2 ring-offset-surface select-none">
              {initials}
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="hidden sm:block text-[11px] text-on-surface-variant hover:text-primary transition-colors font-medium tracking-widest uppercase"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="pt-24 pb-24 px-8 max-w-screen-2xl mx-auto">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-6">
          <div>
            <h1 className="font-noto-serif text-4xl md:text-5xl font-light text-on-surface tracking-tight leading-tight">
              Welcome back,<br />
              <span className="italic text-primary">{firstName}</span>
            </h1>
            <p className="text-on-surface-variant mt-4 font-light max-w-md">
              Manage your event albums and shared memories from one central gallery.
            </p>
          </div>
          <Link
            href="/albums/create"
            className="bg-gradient-to-r from-primary to-primary-container text-white px-8 py-4 rounded-lg flex items-center gap-3 shadow-lg hover:scale-[1.02] transition-all duration-300"
          >
            <span className="material-symbols-outlined">add_circle</span>
            <span className="font-semibold tracking-wider uppercase text-xs">Create Album</span>
          </Link>
        </header>

        {/* ── Checkout success banner ──────────────────────────────────────── */}
        {checkout === "success" && (
          <CheckoutSuccessBanner planName={plan?.name ?? null} />
        )}

        {/* ── No subscription banner ───────────────────────────────────────── */}
        {!plan && (
          <div className="mb-10 rounded-xl bg-amber-50 border border-amber-200 px-6 py-5 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800">No active plan</p>
              <p className="text-sm text-amber-700 mt-0.5">Choose a plan to start creating albums and collecting memories.</p>
            </div>
            <Link href="/pricing" className="shrink-0 rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-400 transition">
              View plans →
            </Link>
          </div>
        )}

        {/* ── Stats bento ──────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">

          {/* Total albums */}
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: "120px" }}>photo_library</span>
            </div>
            <span className="text-secondary text-xs tracking-widest uppercase font-medium">Total Albums</span>
            <div className="mt-4">
              <span className="font-noto-serif text-4xl text-on-surface">{usage.albumsCount}</span>
              <span className="text-primary text-xs ml-2">/ {plan?.maxAlbums ?? "—"} max</span>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full mt-3">
                <div
                  className="bg-primary h-1 rounded-full transition-all"
                  style={{ width: `${usage.albumsPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">{limits.limits.remainingAlbums} remaining</p>
            </div>
          </div>

          {/* Plan */}
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: "120px" }}>workspace_premium</span>
            </div>
            <span className="text-secondary text-xs tracking-widest uppercase font-medium">Current Plan</span>
            <div className="mt-4">
              <span className="font-noto-serif text-4xl text-on-surface">{plan?.name ?? "None"}</span>
              <div className="mt-2 flex flex-col gap-1">
                <Link href="/pricing" className="text-primary text-xs hover:underline underline-offset-2">
                  Upgrade plan →
                </Link>
                <form action={createPortalSession}>
                  <button type="submit" className="text-on-surface-variant text-xs hover:text-primary transition underline-offset-2 hover:underline">
                    Manage billing →
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-[0.04] group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: "120px" }}>cloud_done</span>
            </div>
            <span className="text-secondary text-xs tracking-widest uppercase font-medium">Cloud Storage</span>
            <div className="mt-4">
              <span className="font-noto-serif text-4xl text-on-surface">{usage.usedStorageGb}</span>
              <span className="text-on-surface-variant text-sm ml-1">/ {plan?.storageGb ?? "—"} GB</span>
              <div className="w-full bg-outline-variant/20 h-1 rounded-full mt-3">
                <div
                  className={`h-1 rounded-full transition-all ${usage.storagePercent >= 90 ? "bg-red-500" : usage.storagePercent >= 70 ? "bg-amber-500" : "bg-primary"}`}
                  style={{ width: `${usage.storagePercent}%` }}
                />
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">{usage.storagePercent}% used</p>
            </div>
          </div>

          {/* Per-album storage */}
          <div className="bg-surface-container-low p-8 rounded-xl flex flex-col min-h-[160px] relative overflow-hidden">
            <span className="text-secondary text-xs tracking-widest uppercase font-medium mb-5">Album Storage</span>
            {activeAlbums.length === 0 ? (
              <p className="text-on-surface-variant text-sm font-light">No active albums yet.</p>
            ) : (
              <div className="space-y-4">
                {activeAlbums.slice(0, 2).map((album) => {
                  const usedGb = parseFloat(((album.used_bytes ?? 0) / 1024 ** 3).toFixed(2));
                  const pct = album.allocated_gb > 0
                    ? Math.min(100, Math.round((usedGb / album.allocated_gb) * 100))
                    : 0;
                  return (
                    <div key={album.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-on-surface text-xs font-semibold truncate max-w-[120px]">{album.title}</span>
                        <span className="text-on-surface-variant text-[10px] shrink-0 ml-2">{usedGb} / {album.allocated_gb} GB</span>
                      </div>
                      <div className="w-full bg-outline-variant/20 h-1.5 rounded-full">
                        <div
                          className={`h-1.5 rounded-full ${pct >= 90 ? "bg-red-400" : "bg-primary-container"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Album grid ───────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-8">
          <h2 className="font-noto-serif text-2xl font-light text-on-surface">Recent Albums</h2>
          <div className="flex gap-2">
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <button className="p-2 text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container">
              <span className="material-symbols-outlined">grid_view</span>
            </button>
          </div>
        </div>

        {albumList.length === 0 ? (
          <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden">
            <div className="px-10 pt-12 pb-4 text-center">
              {!hasActiveSubscription ? (
                <>
                  <p className="font-noto-serif text-3xl font-light text-on-surface">Every memory starts here</p>
                  <p className="text-on-surface-variant mt-3 max-w-sm mx-auto font-light leading-relaxed">
                    Pick a plan to unlock albums, QR codes, and shared galleries — then send your guests a single link.
                  </p>
                  <Link
                    href="/pricing"
                    className="inline-flex items-center gap-2 mt-6 bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3.5 rounded-lg shadow-lg hover:scale-[1.02] transition-all duration-300 font-semibold tracking-wider uppercase text-xs"
                  >
                    <span className="material-symbols-outlined text-base">workspace_premium</span>
                    View plans
                  </Link>
                </>
              ) : (
                <>
                  <p className="font-noto-serif text-3xl font-light text-on-surface">Your first album is one click away</p>
                  <p className="text-on-surface-variant mt-3 max-w-sm mx-auto font-light leading-relaxed">
                    Create an album, share the QR code, and watch the memories roll in — guests upload straight from their phones.
                  </p>
                  <Link
                    href="/albums/create"
                    className="inline-flex items-center gap-2 mt-6 bg-gradient-to-r from-primary to-primary-container text-white px-8 py-3.5 rounded-lg shadow-lg hover:scale-[1.02] transition-all duration-300 font-semibold tracking-wider uppercase text-xs"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Create your first album
                  </Link>
                </>
              )}
            </div>

            {/* Steps */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-outline-variant/10 mt-8 border-t border-outline-variant/10">
              {[
                { icon: "photo_album",  step: "01", title: "Create an album",   body: "Name it, set a date, and allocate storage. Takes under a minute." },
                { icon: "qr_code_2",    step: "02", title: "Share the QR code", body: "Print it, project it, or send the link — guests scan and upload instantly." },
                { icon: "collections",  step: "03", title: "Collect memories",  body: "Every photo and video lands in your gallery, ready to download or share." },
              ].map(({ icon, step, title, body }) => (
                <div key={step} className="flex flex-col items-center text-center px-10 py-10 gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary/8 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary" style={{ fontSize: "28px" }}>{icon}</span>
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-secondary uppercase font-semibold mb-1">Step {step}</p>
                    <p className="font-noto-serif text-lg text-on-surface">{title}</p>
                    <p className="text-on-surface-variant text-sm mt-1 font-light leading-relaxed">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {albumList.map((album, i) => {
              const gradient = gradients[i % gradients.length];
              const mediaCount = (album as any).media?.[0]?.count ?? 0;
              const usedBytes = album.used_bytes ?? 0;
              const percent = album.allocated_gb > 0
                ? Math.min(100, Math.round((usedBytes / (album.allocated_gb * 1024 ** 3)) * 100))
                : 0;
              const openDateStr = album.open_date
                ? new Date(album.open_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
                : null;

              return (
                <Link
                  key={album.id}
                  href={`/albums/${album.id}`}
                  className={`group relative bg-surface-container-lowest rounded-lg overflow-hidden shadow-[0_12px_40px_rgba(78,68,74,0.06)] transition-all duration-500 hover:-translate-y-2 ${
                    album.status === "archived" ? "opacity-70 hover:opacity-100" : ""
                  }`}
                >
                  {/* Cover */}
                  <div className={`aspect-[4/5] relative overflow-hidden bg-gradient-to-br ${gradient} ${
                    album.status === "archived" ? "grayscale group-hover:grayscale-0 transition-all duration-700" : ""
                  }`}>
                    {album.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={album.thumbnail_url}
                        alt={album.title}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white/30" style={{ fontSize: "72px" }}>photo_library</span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 z-10">
                      <span className={`px-3 py-1 backdrop-blur-md text-[10px] font-bold tracking-widest uppercase rounded-full ${
                        album.status === "active"
                          ? "bg-surface-container-lowest/80 text-primary"
                          : "bg-on-surface-variant/80 text-surface"
                      }`}>
                        {album.status === "active" ? "Active" : "Archived"}
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  {/* Info */}
                  <div className="p-6">
                    {openDateStr && (
                      <p className="text-[10px] tracking-[0.2em] text-secondary uppercase font-semibold mb-2">{openDateStr}</p>
                    )}
                    <h3 className="font-noto-serif text-xl text-on-surface group-hover:text-primary transition-colors">
                      {album.title}
                    </h3>
                    <div className="mt-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-on-surface-variant">Storage</span>
                        <span className="text-[10px] text-on-surface-variant">
                          {(usedBytes / 1024 ** 3).toFixed(2)} / {album.allocated_gb} GB
                        </span>
                      </div>
                      <div className="w-full bg-outline-variant/20 h-1 rounded-full">
                        <div className="bg-primary-container h-1 rounded-full" style={{ width: `${percent}%` }} />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-outline-variant/10 flex justify-between items-center text-on-surface-variant">
                      <span className="text-xs flex items-center gap-1.5">
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>photo_library</span>
                        {mediaCount.toLocaleString()} {mediaCount === 1 ? "item" : "items"}
                      </span>
                      <span className="material-symbols-outlined" style={{ fontSize: "20px" }}>chevron_right</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <footer className="bg-surface-container-low w-full py-12 px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center max-w-screen-2xl mx-auto">
          <div>
            <span className="font-noto-serif italic text-lg text-primary">Captura</span>
            <p className="text-on-surface-variant text-xs mt-2">
              © {new Date().getFullYear()} Captura. Crafted for your memories.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 md:justify-end">
            {["Pricing", "Terms of Service", "Privacy", "Contact"].map((label) => (
              <a
                key={label}
                href="#"
                className="text-on-surface-variant hover:text-primary transition-colors text-xs tracking-normal"
              >
                {label}
              </a>
            ))}
          </div>
        </div>
      </footer>

      {/* ── Mobile bottom nav ──────────────────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pb-6 pt-3 bg-surface-container-lowest/80 backdrop-blur-2xl border-t border-outline-variant/15 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] z-50 rounded-t-2xl">
        {[
          { icon: "grid_view",   label: "Feed",    active: true  },
          { icon: "add_circle",  label: "Create",  active: false },
          { icon: "photo_album", label: "Albums",  active: false },
          { icon: "person",      label: "Profile", active: false },
        ].map(({ icon, label, active }) => (
          <button
            key={label}
            className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 ${
              active ? "text-primary scale-110" : "text-on-surface-variant/60 hover:text-on-surface-variant"
            }`}
          >
            <span className="material-symbols-outlined">{icon}</span>
            <span className="text-[10px] font-medium tracking-widest uppercase">{label}</span>
          </button>
        ))}
      </nav>

    </div>
  );
}
