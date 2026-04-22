"use client";

import { useState } from "react";
import { updateProfile, updatePassword } from "./actions";

// ── Shared UI ──────────────────────────────────────────────────────────────────

function StatusMessage({ state }: { state: { error?: string; success?: boolean } | null }) {
  if (!state) return null;
  if (state.error) return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{state.error}</div>
  );
  if (state.success) return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      Saved successfully.
    </div>
  );
  return null;
}

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
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

const inputClass = "w-full rounded-xl border border-outline-variant/40 bg-surface px-4 py-3 text-on-surface placeholder-outline text-sm transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";

// ── Profile form ───────────────────────────────────────────────────────────────

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: boolean } | null>(null);

  async function handleSubmit(formData: FormData) {
    setState(null);
    setLoading(true);
    const result = await updateProfile(formData);
    setState(result?.error ? { error: result.error } : { success: true });
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <StatusMessage state={state} />

      <div>
        <label htmlFor="full_name" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
          Full name
        </label>
        <input
          id="full_name" name="full_name" type="text" required
          defaultValue={fullName}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-on-surface-variant">
          Email address
        </label>
        <input
          type="email" value={email} disabled
          className={`${inputClass} opacity-50 cursor-not-allowed`}
        />
        <p className="mt-1.5 text-xs text-outline">Email cannot be changed here.</p>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit" disabled={loading}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 shadow-sm"
          style={{ background: "linear-gradient(to right, #7d5070, #b784a7)" }}
        >
          {loading ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

// ── Password form ──────────────────────────────────────────────────────────────

export function PasswordForm() {
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<{ error?: string; success?: boolean } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(formData: FormData) {
    setState(null);
    setLoading(true);
    const result = await updatePassword(formData);
    if (result?.error) {
      setState({ error: result.error });
    } else {
      setState({ success: true });
      (document.getElementById("pw-form") as HTMLFormElement)?.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    }
    setLoading(false);
  }

  return (
    <form id="pw-form" action={handleSubmit} className="space-y-4">
      <StatusMessage state={state} />

      <div>
        <label htmlFor="current_password" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
          Current password
        </label>
        <div className="relative">
          <input
            id="current_password" name="current_password"
            type={showCurrent ? "text" : "password"}
            required
            placeholder="Your current password"
            className={`${inputClass} pr-11`}
          />
          <button type="button" onClick={() => setShowCurrent(v => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-outline hover:text-on-surface-variant transition touch-manipulation">
            {showCurrent ? <EyeOpenIcon /> : <EyeClosedIcon />}
          </button>
        </div>
      </div>

      <div className="border-t border-outline-variant/20 pt-4">
        <div className="space-y-4">
          <div>
            <label htmlFor="new_password" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
              New password
            </label>
            <div className="relative">
              <input
                id="new_password" name="new_password"
                type={showNew ? "text" : "password"}
                required minLength={8}
                placeholder="At least 8 characters"
                className={`${inputClass} pr-11`}
              />
              <button type="button" onClick={() => setShowNew(v => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-outline hover:text-on-surface-variant transition touch-manipulation">
                {showNew ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="confirm_password" className="mb-1.5 block text-sm font-medium text-on-surface-variant">
              Confirm new password
            </label>
            <div className="relative">
              <input
                id="confirm_password" name="confirm_password"
                type={showConfirm ? "text" : "password"}
                required minLength={8}
                placeholder="••••••••"
                className={`${inputClass} pr-11`}
              />
              <button type="button" onClick={() => setShowConfirm(v => !v)}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-outline hover:text-on-surface-variant transition touch-manipulation">
                {showConfirm ? <EyeOpenIcon /> : <EyeClosedIcon />}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit" disabled={loading}
          className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60 shadow-sm"
          style={{ background: "linear-gradient(to right, #7d5070, #b784a7)" }}
        >
          {loading ? "Updating…" : "Update password"}
        </button>
      </div>
    </form>
  );
}
