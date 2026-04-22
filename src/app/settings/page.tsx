import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/auth/actions";
import { createPortalSession } from "@/app/stripe/actions";
import { getSubscriptionLimits } from "@/lib/subscription";
import { ProfileForm, PasswordForm } from "./SettingsForms";

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-surface-container-lowest ring-1 ring-outline-variant/30 shadow-sm overflow-hidden">
      <div className="bg-surface-container-low px-6 py-5 border-b border-outline-variant/20">
        <h2 className="font-noto-serif text-lg font-light text-on-surface">{title}</h2>
        {description && <p className="mt-1 text-xs text-on-surface-variant">{description}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const displayName = user.user_metadata?.full_name ?? "";
  const email = user.email ?? "";
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || email[0]?.toUpperCase() || "?";

  const limits = await getSubscriptionLimits(user.id);
  const { plan, hasActiveSubscription } = limits;

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface">

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 bg-surface/70 backdrop-blur-xl shadow-[0_12px_40px_rgba(78,68,74,0.06)]">
        <div className="flex justify-between items-center px-8 h-16 w-full max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-12">
            <Link href="/" className="font-noto-serif text-xl font-light tracking-tighter text-primary">Captura</Link>
            <div className="hidden md:flex gap-8 items-center h-full">
              <Link href="/dashboard" className="text-on-surface-variant hover:text-primary transition-colors font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">Dashboard</Link>
              <Link href="/albums" className="text-on-surface-variant hover:text-primary transition-colors font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">Albums</Link>
              <Link href="/settings" className="text-primary font-semibold border-b-2 border-primary font-noto-serif tracking-wide text-sm uppercase h-16 flex items-center">Settings</Link>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="h-8 w-8 rounded-full bg-primary-container flex items-center justify-center text-white text-xs font-bold ring-2 ring-outline-variant/20 ring-offset-2 ring-offset-surface select-none">
              {initials}
            </div>
            <form action={logout}>
              <button type="submit" className="hidden sm:block text-[11px] text-on-surface-variant hover:text-primary transition-colors font-medium tracking-widest uppercase">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-8 max-w-2xl mx-auto">

        {/* Header */}
        <div className="mb-10">
          <h1 className="font-noto-serif text-4xl font-light text-on-surface tracking-tight">
            Account <span className="italic text-primary">settings</span>
          </h1>
          <p className="mt-2 text-on-surface-variant font-light">Manage your profile, security and billing.</p>
        </div>

        <div className="space-y-6">

          {/* Profile */}
          <Section title="Profile" description="Update your display name.">
            <ProfileForm fullName={displayName} email={email} />
          </Section>

          {/* Security */}
          <Section title="Security" description="Change your password.">
            <PasswordForm />
          </Section>

          {/* Plan & Billing */}
          <Section title="Plan & Billing" description="Manage your subscription and payment details.">
            <div className="space-y-4">
              {/* Plan info */}
              <div className="rounded-xl bg-surface-container-low p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-1">Current plan</p>
                  <p className="font-noto-serif text-2xl text-on-surface">
                    {plan?.name ?? "No active plan"}
                  </p>
                  {plan && (
                    <p className="text-xs text-on-surface-variant mt-1">
                      {plan.maxAlbums} albums · {plan.storageGb} GB storage
                    </p>
                  )}
                </div>
                {hasActiveSubscription ? (
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Active</span>
                ) : (
                  <span className="rounded-full bg-surface-container px-3 py-1 text-xs font-semibold text-on-surface-variant">Inactive</span>
                )}
              </div>

              {/* Billing actions */}
              <div className="flex flex-wrap gap-3">
                {hasActiveSubscription && (
                  <form action={createPortalSession}>
                    <button
                      type="submit"
                      className="flex items-center gap-2 rounded-xl border border-outline-variant/40 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" />
                      </svg>
                      Manage billing
                    </button>
                  </form>
                )}
                <Link
                  href="/pricing"
                  className="flex items-center gap-2 rounded-xl border border-outline-variant/40 px-4 py-2.5 text-sm font-medium text-on-surface-variant hover:border-primary hover:text-primary transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
                  </svg>
                  {hasActiveSubscription ? "Change plan" : "View plans"}
                </Link>
              </div>
            </div>
          </Section>

          {/* Usage summary */}
          <Section title="Usage">
            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  label: "Albums",
                  value: `${limits.usage.albumsCount} / ${plan?.maxAlbums ?? "—"}`,
                  percent: limits.usage.albumsPercent,
                },
                {
                  label: "Storage used",
                  value: `${limits.usage.usedStorageGb} / ${plan?.storageGb ?? "—"} GB`,
                  percent: limits.usage.storagePercent,
                },
              ].map(({ label, value, percent }) => (
                <div key={label} className="rounded-xl bg-surface-container-low p-4">
                  <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">{label}</p>
                  <p className="text-sm font-semibold text-on-surface mb-2">{value}</p>
                  <div className="w-full bg-outline-variant/20 h-1.5 rounded-full">
                    <div
                      className={`h-1.5 rounded-full transition-all ${percent >= 90 ? "bg-red-500" : percent >= 70 ? "bg-amber-500" : "bg-primary"}`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Section>

        </div>
      </main>
    </div>
  );
}
