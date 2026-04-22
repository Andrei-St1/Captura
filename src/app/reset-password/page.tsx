"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function EyeOpenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

type PageState = "loading" | "ready" | "success" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [pageState, setPageState] = useState<PageState>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    // Listen for the PASSWORD_RECOVERY event which fires when
    // Supabase processes the recovery token from the URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setPageState("ready");
      } else if (event === "SIGNED_IN" && pageState === "loading") {
        // Already signed in — check if this is a recovery flow
        setPageState("ready");
      }
    });

    // Also check current session in case page was already loaded with token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setPageState("ready");
      } else {
        // Give it 2s for the hash to be processed, then mark invalid
        setTimeout(() => {
          setPageState((prev) => prev === "loading" ? "invalid" : prev);
        }, 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    // Sign out so the user must log in explicitly with their new password
    await supabase.auth.signOut();
    setLoading(false);
    setPageState("success");
    setTimeout(() => router.push("/login"), 2500);
  }

  return (
    <main className="flex min-h-screen bg-slate-50">

      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-12"
        style={{ background: "linear-gradient(135deg, #ede9fe 0%, #f5d0fe 40%, #fecdd3 80%, #fff1f2 100%)" }}
      >
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-300/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-rose-300/40 blur-3xl pointer-events-none" />
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-5 gap-2 p-6 opacity-[0.12] pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-violet-400" />
          ))}
        </div>
        <div className="relative z-10 text-center select-none">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-white/60 p-5 backdrop-blur-sm ring-1 ring-violet-200 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 leading-tight mb-4">Choose a new<br />password</h2>
          <p className="text-slate-500 text-base max-w-xs mx-auto leading-relaxed">
            Pick something strong that you haven&apos;t used before.
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link href="/" className="text-3xl font-bold text-slate-900 tracking-tight">Captura</Link>
            <p className="mt-2 text-slate-500 text-sm">Set a new password</p>
          </div>

          {/* Loading */}
          {pageState === "loading" && (
            <div className="text-center py-8">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin mx-auto mb-3">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              <p className="text-sm text-slate-500">Verifying your reset link…</p>
            </div>
          )}

          {/* Invalid link */}
          {pageState === "invalid" && (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-6 text-center">
              <p className="font-semibold text-red-700 mb-2">Invalid or expired link</p>
              <p className="text-sm text-red-600 mb-4">This reset link is no longer valid. Request a new one.</p>
              <Link href="/forgot-password" className="inline-block rounded-xl bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 transition">
                Request new link
              </Link>
            </div>
          )}

          {/* Form */}
          {pageState === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
              )}

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  New password
                </label>
                <div className="relative">
                  <input
                    id="password" type={showPassword ? "text" : "password"}
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required minLength={8} placeholder="At least 8 characters"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-slate-900 placeholder-slate-400 text-sm transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <button type="button" onClick={() => setShowPassword(v => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-slate-600 transition touch-manipulation">
                    {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirm" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Confirm new password
                </label>
                <div className="relative">
                  <input
                    id="confirm" type={showConfirm ? "text" : "password"}
                    value={confirm} onChange={(e) => setConfirm(e.target.value)}
                    required minLength={8} placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 pr-11 text-slate-900 placeholder-slate-400 text-sm transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-slate-600 transition touch-manipulation">
                    {showConfirm ? <EyeOpenIcon /> : <EyeClosedIcon />}
                  </button>
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 disabled:opacity-60 shadow-sm shadow-violet-200"
              >
                {loading ? "Updating…" : "Set new password"}
              </button>
            </form>
          )}

          {/* Success */}
          {pageState === "success" && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-semibold text-emerald-800 mb-1">Password updated!</p>
              <p className="text-sm text-emerald-700">Redirecting you to sign in with your new password…</p>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/login" className="font-semibold text-violet-600 hover:text-violet-500 transition">
              ← Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
