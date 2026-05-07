"use client";

import { useState } from "react";
import { updateProfile, updatePassword } from "./actions";

/* ── Shared styles ── */
const inputStyle: React.CSSProperties = {
  width: "100%", boxSizing: "border-box",
  background: "oklch(97% 0.008 80)",
  border: "1px solid oklch(80% 0.010 80)",
  borderRadius: "10px",
  padding: "11px 14px",
  fontFamily: "'DM Sans', system-ui, sans-serif",
  fontSize: "14px",
  color: "oklch(18% 0.015 265)",
  outline: "none",
  transition: "border-color .2s, box-shadow .2s",
  colorScheme: "light" as React.CSSProperties["colorScheme"],
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px", fontWeight: 600,
  letterSpacing: "0.09em", textTransform: "uppercase",
  color: "oklch(46% 0.010 265)",
  marginBottom: "7px",
};

const fieldStyle: React.CSSProperties = {
  display: "flex", flexDirection: "column", gap: "0",
};

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={labelStyle}>{label}</label>
      {children}
      {hint && <p style={{ fontSize: 12, color: "oklch(58% 0.010 265)", marginTop: 5 }}>{hint}</p>}
    </div>
  );
}

function StatusMessage({ state }: { state: { error?: string; success?: boolean } | null }) {
  if (!state) return null;
  if (state.error) return (
    <div style={{
      marginBottom: 16, padding: "11px 14px", borderRadius: 10,
      background: "oklch(62% 0.20 25 / 0.08)", border: "1px solid oklch(62% 0.20 25 / 0.25)",
      color: "oklch(52% 0.20 25)", fontSize: 13,
    }}>{state.error}</div>
  );
  return (
    <div style={{
      marginBottom: 16, padding: "11px 14px", borderRadius: 10,
      background: "oklch(65% 0.16 155 / 0.08)", border: "1px solid oklch(65% 0.16 155 / 0.25)",
      color: "oklch(50% 0.16 155)", fontSize: 13,
      display: "flex", alignItems: "center", gap: 8,
    }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Saved successfully.
    </div>
  );
}

function SaveBtn({ loading, label, loadingLabel }: { loading: boolean; label: string; loadingLabel: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
      <button type="submit" disabled={loading} style={{
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "9px 22px", borderRadius: 10,
        background: loading ? "oklch(65% 0.010 265)" : "oklch(44% 0.16 72)",
        color: "#fff", fontSize: 13, fontWeight: 600,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        border: "none", cursor: loading ? "not-allowed" : "pointer",
        transition: "opacity .15s",
        opacity: loading ? .6 : 1,
      }}>
        {loading ? loadingLabel : label}
      </button>
    </div>
  );
}

function EyeBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} tabIndex={-1} style={{
      position: "absolute", right: 4, top: "50%", transform: "translateY(-50%)",
      padding: "8px 10px", background: "none", border: "none",
      cursor: "pointer", color: "oklch(58% 0.010 265)",
    }}>
      {show ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
          <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
          <line x1="2" x2="22" y1="2" y2="22"/>
        </svg>
      )}
    </button>
  );
}

/* ── Profile form ── */

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [loading, setLoading] = useState(false);
  const [state, setState]     = useState<{ error?: string; success?: boolean } | null>(null);

  async function handleSubmit(formData: FormData) {
    setState(null); setLoading(true);
    const result = await updateProfile(formData);
    setState(result?.error ? { error: result.error } : { success: true });
    setLoading(false);
  }

  return (
    <form action={handleSubmit}>
      <StatusMessage state={state} />
      <Field label="Full name">
        <input name="full_name" type="text" required defaultValue={fullName}
          style={inputStyle}
          onFocus={e => { e.currentTarget.style.borderColor = "oklch(65% 0.012 80)"; e.currentTarget.style.boxShadow = "0 0 0 3px oklch(44% 0.16 72 / 0.10)"; }}
          onBlur={e  => { e.currentTarget.style.borderColor = "oklch(80% 0.010 80)"; e.currentTarget.style.boxShadow = "none"; }}
        />
      </Field>
      <Field label="Email address" hint="Email cannot be changed here.">
        <input type="email" value={email} disabled
          style={{ ...inputStyle, opacity: .5, cursor: "not-allowed" }}
        />
      </Field>
      <SaveBtn loading={loading} label="Save changes" loadingLabel="Saving…" />
    </form>
  );
}

/* ── Password form ── */

export function PasswordForm() {
  const [loading, setLoading]     = useState(false);
  const [state, setState]         = useState<{ error?: string; success?: boolean } | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(formData: FormData) {
    setState(null); setLoading(true);
    const result = await updatePassword(formData);
    if (result?.error) {
      setState({ error: result.error });
    } else {
      setState({ success: true });
      (document.getElementById("pw-form") as HTMLFormElement)?.reset();
      setShowCurrent(false); setShowNew(false); setShowConfirm(false);
    }
    setLoading(false);
  }

  const pwInput: React.CSSProperties = { ...inputStyle, paddingRight: 44 };

  return (
    <form id="pw-form" action={handleSubmit}>
      <StatusMessage state={state} />

      <Field label="Current password">
        <div style={{ position: "relative" }}>
          <input name="current_password" type={showCurrent ? "text" : "password"} required
            placeholder="Your current password" style={pwInput}
            onFocus={e => { e.currentTarget.style.borderColor = "oklch(65% 0.012 80)"; e.currentTarget.style.boxShadow = "0 0 0 3px oklch(44% 0.16 72 / 0.10)"; }}
            onBlur={e  => { e.currentTarget.style.borderColor = "oklch(80% 0.010 80)"; e.currentTarget.style.boxShadow = "none"; }}
          />
          <EyeBtn show={showCurrent} onToggle={() => setShowCurrent(v => !v)} />
        </div>
      </Field>

      <div style={{ borderTop: "1px solid oklch(80% 0.010 80)", paddingTop: 16, marginTop: 4 }}>
        <Field label="New password">
          <div style={{ position: "relative" }}>
            <input name="new_password" type={showNew ? "text" : "password"} required minLength={8}
              placeholder="At least 8 characters" style={pwInput}
              onFocus={e => { e.currentTarget.style.borderColor = "oklch(65% 0.012 80)"; e.currentTarget.style.boxShadow = "0 0 0 3px oklch(44% 0.16 72 / 0.10)"; }}
              onBlur={e  => { e.currentTarget.style.borderColor = "oklch(80% 0.010 80)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <EyeBtn show={showNew} onToggle={() => setShowNew(v => !v)} />
          </div>
        </Field>

        <Field label="Confirm new password">
          <div style={{ position: "relative" }}>
            <input name="confirm_password" type={showConfirm ? "text" : "password"} required minLength={8}
              placeholder="••••••••" style={pwInput}
              onFocus={e => { e.currentTarget.style.borderColor = "oklch(65% 0.012 80)"; e.currentTarget.style.boxShadow = "0 0 0 3px oklch(44% 0.16 72 / 0.10)"; }}
              onBlur={e  => { e.currentTarget.style.borderColor = "oklch(80% 0.010 80)"; e.currentTarget.style.boxShadow = "none"; }}
            />
            <EyeBtn show={showConfirm} onToggle={() => setShowConfirm(v => !v)} />
          </div>
        </Field>
      </div>

      <SaveBtn loading={loading} label="Update password" loadingLabel="Updating…" />
    </form>
  );
}
