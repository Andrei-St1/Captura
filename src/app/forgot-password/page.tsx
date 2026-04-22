"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
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
                <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 leading-tight mb-4">Reset your<br />password</h2>
          <p className="text-slate-500 text-base max-w-xs mx-auto leading-relaxed">
            Enter your email and we&apos;ll send you a link to get back into your account.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center">
            <Link href="/" className="text-3xl font-bold text-slate-900 tracking-tight">
              Captura
            </Link>
            <p className="mt-2 text-slate-500 text-sm">
              {sent ? "Check your inbox" : "Forgot your password?"}
            </p>
          </div>

          {sent ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6 text-center">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-100 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="font-semibold text-emerald-800 mb-2">Reset link sent!</p>
              <p className="text-sm text-emerald-700 leading-relaxed">
                Check your email at <strong>{email}</strong> and click the link to reset your password.
              </p>
              <p className="text-xs text-emerald-600 mt-3">Didn&apos;t receive it? Check your spam folder.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                  </span>
                  <input
                    id="email" type="email" required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 text-sm transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              </div>

              <button
                type="submit" disabled={loading}
                className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:opacity-60 shadow-sm shadow-violet-200"
              >
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
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
