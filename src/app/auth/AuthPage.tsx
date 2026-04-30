"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, register } from "@/app/auth/actions";

const S = {
  bg:         "oklch(11% 0.012 265)",
  bg2:        "oklch(15% 0.012 265)",
  bg3:        "oklch(19% 0.012 265)",
  border:     "oklch(28% 0.012 265)",
  borderF:    "oklch(38% 0.012 265)",
  text:       "oklch(93% 0.008 80)",
  muted:      "oklch(52% 0.008 265)",
  gold:       "oklch(76% 0.13 82)",
  goldDim:    "oklch(60% 0.10 82)",
  goldGlow:   "oklch(76% 0.13 82 / 0.15)",
  red:        "oklch(62% 0.20 25)",
  redBg:      "oklch(62% 0.20 25 / 0.1)",
  redBorder:  "oklch(62% 0.20 25 / 0.35)",
  green:      "oklch(65% 0.16 155)",
};

function EyeOpen() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function EyeClosed() {
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M17.94 12C16.22 14.56 13.31 16 12 16 10.69 16 7.78 14.56 6.06 12M3 3l18 18M10.73 10.73A3 3 0 0013.27 13.27M7.51 7.51A7.07 7.07 0 011 12s4 7 11 7a9.6 9.6 0 003.49-.65M9.88 4.1A9.6 9.6 0 0112 4c7 0 11 8 11 8a16.5 16.5 0 01-1.67 2.68"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8l3.5 3.5L13 5"/></svg>;
}
function AlertIcon() {
  return <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M8 5v3M8 10.5v.5"/></svg>;
}

function Field({ label, error, valid, children }: { label: string; error?: string; valid?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <label style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.08em", textTransform: "uppercase", color: error ? S.red : valid ? S.goldDim : S.muted, transition: "color 0.2s" }}>
        {label}
      </label>
      {children}
      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: S.red }}>
          <AlertIcon />{error}
        </div>
      )}
    </div>
  );
}

function Input({ error, valid, rightSlot, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean; valid?: boolean; rightSlot?: React.ReactNode }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
      <input
        {...props}
        onFocus={(e) => { setFocused(true); props.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); props.onBlur?.(e); }}
        style={{
          width: "100%", background: focused ? S.bg3 : S.bg2,
          border: `1px solid ${error ? S.redBorder : valid ? "oklch(65% 0.16 155 / 0.4)" : focused ? S.borderF : S.border}`,
          borderRadius: 8, padding: "13px 16px", paddingRight: rightSlot ? 44 : 16,
          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: 300,
          color: S.text, outline: "none",
          boxShadow: focused ? `0 0 0 3px ${error ? S.redBg : S.goldGlow}` : error ? `0 0 0 3px ${S.redBg}` : "none",
          transition: "border-color 0.2s, box-shadow 0.2s, background 0.2s",
          WebkitAppearance: "none",
        }}
      />
      {rightSlot && (
        <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", gap: 6 }}>
          {rightSlot}
        </div>
      )}
    </div>
  );
}

function ToggleBtn({ show, onToggle }: { show: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, color: S.muted, lineHeight: 0 }}>
      {show ? <EyeOpen /> : <EyeClosed />}
    </button>
  );
}

function StrengthBar({ password }: { password: string }) {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const levels = [
    { pct: "20%", color: "oklch(52% 0.20 25)", label: "Weak" },
    { pct: "40%", color: "oklch(60% 0.18 40)", label: "Fair" },
    { pct: "65%", color: "oklch(70% 0.15 75)", label: "Good" },
    { pct: "85%", color: "oklch(68% 0.17 140)", label: "Strong" },
    { pct: "100%", color: "oklch(65% 0.18 155)", label: "Very strong" },
  ];
  const l = levels[Math.max(0, score - 1)];

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ height: 3, background: S.border, borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: l.pct, background: l.color, borderRadius: 2, transition: "width 0.4s ease, background 0.3s" }} />
      </div>
      <span style={{ fontSize: 11, color: l.color }}>{l.label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{ background: S.redBg, border: `1px solid ${S.redBorder}`, borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: S.red, lineHeight: 1.5 }}>
      <div style={{ flexShrink: 0, marginTop: 1 }}><AlertIcon /></div>
      {message}
    </div>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{ background: S.gold, color: S.bg, border: "none", borderRadius: 8, padding: 15, fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 15, fontWeight: 500, letterSpacing: "0.03em", cursor: loading ? "not-allowed" : "pointer", width: "100%", position: "relative", overflow: "hidden", opacity: loading ? 0.7 : 1, transition: "opacity 0.2s" }}
    >
      <span style={{ opacity: loading ? 0 : 1, transition: "opacity 0.2s" }}>{children}</span>
      {loading && (
        <svg style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "auth-spin 1s linear infinite" }} width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke={S.bg} strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

// ── Login Form ────────────────────────────────────────────────────────────────

function LoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [emailErr, setEmailErr] = useState("");
  const [pwErr, setPwErr] = useState("");
  const [emailValid, setEmailValid] = useState(false);

  function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validateEmail(v: string) {
    if (!v) { setEmailErr("Email is required."); setEmailValid(false); return false; }
    if (!isValidEmail(v)) { setEmailErr("Please enter a valid email."); setEmailValid(false); return false; }
    setEmailErr(""); setEmailValid(true); return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const pw = fd.get("password") as string;
    let ok = true;
    if (!validateEmail(email)) ok = false;
    if (!pw) { setPwErr("Password is required."); ok = false; }
    if (!ok) return;
    setError(""); setLoading(true);
    const result = await login(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 400, lineHeight: 1.1, marginBottom: 6 }}>
          Welcome<br /><em style={{ fontStyle: "italic", color: S.gold }}>back.</em>
        </div>
        <div style={{ fontSize: 14, color: S.muted, lineHeight: 1.6 }}>Sign in to manage your albums and uploads.</div>
      </div>

      {error && <ErrorBanner message={error} />}

      <Field label="Email address" error={emailErr} valid={emailValid}>
        <Input
          name="email" type="email" placeholder="you@example.com" autoComplete="email"
          error={!!emailErr} valid={emailValid}
          onBlur={(e) => validateEmail(e.target.value)}
          onChange={() => { setEmailErr(""); }}
          rightSlot={emailValid ? <span style={{ color: S.green }}><CheckIcon /></span> : undefined}
        />
      </Field>

      <Field label="Password" error={pwErr}>
        <Input
          name="password" type={showPw ? "text" : "password"} placeholder="••••••••" autoComplete="current-password"
          error={!!pwErr}
          onChange={() => setPwErr("")}
          rightSlot={<ToggleBtn show={showPw} onToggle={() => setShowPw(v => !v)} />}
        />
        <div style={{ textAlign: "right", marginTop: -6 }}>
          <Link href="/forgot-password" style={{ fontSize: 12, color: S.muted, textDecoration: "none" }}>Forgot your password?</Link>
        </div>
      </Field>

      <SubmitBtn loading={loading}>Sign in</SubmitBtn>
    </form>
  );
}

// ── Register Form ─────────────────────────────────────────────────────────────

function RegisterForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [password, setPassword] = useState("");
  const [emailErr, setEmailErr] = useState("");
  const [emailValid, setEmailValid] = useState(false);
  const [pwErr, setPwErr] = useState("");
  const [cpwErr, setCpwErr] = useState("");
  const [nameErr, setNameErr] = useState("");

  function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

  function validateEmail(v: string) {
    if (!v) { setEmailErr("Email is required."); setEmailValid(false); return false; }
    if (!isValidEmail(v)) { setEmailErr("Please enter a valid email."); setEmailValid(false); return false; }
    setEmailErr(""); setEmailValid(true); return true;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = fd.get("fullName") as string;
    const email = fd.get("email") as string;
    const pw = fd.get("password") as string;
    const cpw = fd.get("confirmPassword") as string;
    let ok = true;
    if (!name.trim()) { setNameErr("Name is required."); ok = false; }
    if (!validateEmail(email)) ok = false;
    if (pw.length < 8) { setPwErr(pw ? "At least 8 characters." : "Password is required."); ok = false; }
    if (pw !== cpw) { setCpwErr("Passwords don't match."); ok = false; }
    if (!ok) return;
    setError(""); setLoading(true);
    const result = await register(fd);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ marginBottom: 4 }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 400, lineHeight: 1.1, marginBottom: 6 }}>
          Create your<br /><em style={{ fontStyle: "italic", color: S.gold }}>account.</em>
        </div>
        <div style={{ fontSize: 14, color: S.muted, lineHeight: 1.6 }}>Free forever. No credit card required.</div>
      </div>

      {error && <ErrorBanner message={error} />}

      <Field label="Full name" error={nameErr}>
        <Input
          name="fullName" type="text" placeholder="Jane Smith" autoComplete="name"
          error={!!nameErr}
          onChange={() => setNameErr("")}
        />
      </Field>

      <Field label="Email address" error={emailErr} valid={emailValid}>
        <Input
          name="email" type="email" placeholder="you@example.com" autoComplete="email"
          error={!!emailErr} valid={emailValid}
          onBlur={(e) => validateEmail(e.target.value)}
          onChange={() => { setEmailErr(""); }}
          rightSlot={emailValid ? <span style={{ color: S.green }}><CheckIcon /></span> : undefined}
        />
      </Field>

      <Field label="Password" error={pwErr}>
        <Input
          name="password" type={showPw ? "text" : "password"} placeholder="At least 8 characters" autoComplete="new-password"
          error={!!pwErr}
          onChange={(e) => { setPassword(e.target.value); setPwErr(""); }}
          rightSlot={<ToggleBtn show={showPw} onToggle={() => setShowPw(v => !v)} />}
        />
        <StrengthBar password={password} />
      </Field>

      <Field label="Confirm password" error={cpwErr}>
        <Input
          name="confirmPassword" type={showCpw ? "text" : "password"} placeholder="••••••••" autoComplete="new-password"
          error={!!cpwErr}
          onChange={() => setCpwErr("")}
          rightSlot={<ToggleBtn show={showCpw} onToggle={() => setShowCpw(v => !v)} />}
        />
      </Field>

      <SubmitBtn loading={loading}>Create account</SubmitBtn>
    </form>
  );
}

// ── Main AuthPage ─────────────────────────────────────────────────────────────

export function AuthPage({ initialTab }: { initialTab: "login" | "register" }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const loginBtnRef = useRef<HTMLButtonElement>(null);
  const regBtnRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: "0px", width: "0px" });

  function updateIndicator() {
    const btn = tab === "login" ? loginBtnRef.current : regBtnRef.current;
    if (btn) setIndicatorStyle({ left: btn.offsetLeft + "px", width: btn.offsetWidth + "px" });
  }

  useEffect(() => { updateIndicator(); }, [tab]);
  useEffect(() => { window.addEventListener("resize", updateIndicator); return () => window.removeEventListener("resize", updateIndicator); });

  function switchTab(t: "login" | "register") {
    setTab(t);
    router.replace(t === "login" ? "/login" : "/register", { scroll: false });
  }

  return (
    <div style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, background: S.bg, color: S.text, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "64px 24px" }}>
      <style>{`@keyframes auth-spin { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }`}</style>

      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 500, letterSpacing: "0.08em", color: S.gold, textDecoration: "none" }}>
            Captura
          </Link>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: `1px solid ${S.border}`, marginBottom: 40, position: "relative" }}>
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              ref={t === "login" ? loginBtnRef : regBtnRef}
              onClick={() => switchTab(t)}
              style={{ flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: tab === t ? 500 : 400, letterSpacing: "0.04em", color: tab === t ? S.text : S.muted, padding: "0 0 16px", transition: "color 0.2s" }}
            >
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
          <div style={{ position: "absolute", bottom: -1, height: 2, background: S.gold, borderRadius: 1, transition: "left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)", ...indicatorStyle }} />
        </div>

        {/* Forms */}
        {tab === "login" ? <LoginForm /> : <RegisterForm />}

        {/* Switch link */}
        <p style={{ textAlign: "center", fontSize: 13, color: S.muted, marginTop: 24 }}>
          {tab === "login" ? (
            <>Don&apos;t have an account?{" "}<button onClick={() => switchTab("register")} style={{ background: "none", border: "none", cursor: "pointer", color: S.gold, fontFamily: "inherit", fontSize: "inherit" }}>Create one free</button></>
          ) : (
            <>Already have an account?{" "}<button onClick={() => switchTab("login")} style={{ background: "none", border: "none", cursor: "pointer", color: S.gold, fontFamily: "inherit", fontSize: "inherit" }}>Sign in</button></>
          )}
        </p>

      </div>
    </div>
  );
}
