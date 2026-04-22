"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";

function EyeOpenIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setLoading(true);
    const result = await login(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen bg-slate-50">
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex lg:w-[45%] relative overflow-hidden items-center justify-center p-12"
        style={{ background: "linear-gradient(135deg, #ede9fe 0%, #f5d0fe 40%, #fecdd3 80%, #fff1f2 100%)" }}
      >
        {/* Ambient glows */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-violet-300/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-rose-300/40 blur-3xl pointer-events-none" />

        {/* Photo mosaic background */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-5 gap-2 p-6 opacity-[0.12] pointer-events-none">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-violet-400" />
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center select-none">
          <div className="mb-6 flex justify-center">
            <div className="rounded-2xl bg-white/60 p-5 backdrop-blur-sm ring-1 ring-violet-200 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
          </div>

          <h2 className="text-4xl font-bold text-slate-800 leading-tight mb-4">
            Capture Every<br />Moment
          </h2>
          <p className="text-slate-500 text-base max-w-xs mx-auto leading-relaxed">
            Store, organize, and relive your most cherished event photos and videos in beautiful albums.
          </p>

          <div className="mt-8 flex flex-wrap gap-2 justify-center">
            {["Photos", "Videos", "Albums", "Events"].map((f) => (
              <span key={f} className="rounded-full bg-white/70 px-4 py-1.5 text-sm font-medium text-violet-700 ring-1 ring-violet-200">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href="/" className="text-3xl font-bold text-slate-900 tracking-tight">
              Captura
            </Link>
            <p className="mt-2 text-slate-500 text-sm">
              Welcome back — your memories await
            </p>
          </div>

          {/* Form */}
          <form action={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <MailIcon />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-3 text-slate-900 placeholder-slate-400 text-sm transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-slate-700">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-violet-600 hover:text-violet-500 transition font-medium">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-11 py-3 text-slate-900 placeholder-slate-400 text-sm transition focus:border-violet-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-slate-400 hover:text-slate-600 transition touch-manipulation"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOpenIcon /> : <EyeClosedIcon />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 shadow-sm shadow-violet-200 mt-2"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            No account?{" "}
            <Link href="/register" className="font-semibold text-violet-600 hover:text-violet-500 transition">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
