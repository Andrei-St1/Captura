"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, register } from "@/app/auth/actions";

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
    <div className="au-field">
      <label className={`au-label${error ? " error" : valid ? " valid" : ""}`}>{label}</label>
      {children}
      {error && (
        <div className="au-field-error">
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
        className={`au-input${error ? " error" : valid ? " valid" : focused ? " focused" : ""}`}
        style={{ paddingRight: rightSlot ? 44 : 16 }}
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
    <button type="button" onClick={onToggle} className="au-toggle-btn">
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
      <div style={{ height: 3, background: "var(--border)", borderRadius: 2, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ height: "100%", width: l.pct, background: l.color, borderRadius: 2, transition: "width 0.4s ease, background 0.3s" }} />
      </div>
      <span style={{ fontSize: 11, color: l.color }}>{l.label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="au-error-banner">
      <div style={{ flexShrink: 0, marginTop: 1 }}><AlertIcon /></div>
      {message}
    </div>
  );
}

function SubmitBtn({ loading, children }: { loading: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={loading} className="au-submit-btn">
      <span style={{ opacity: loading ? 0 : 1, transition: "opacity 0.2s" }}>{children}</span>
      {loading && (
        <svg style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", animation: "au-spin 1s linear infinite" }} width="20" height="20" viewBox="0 0 20 20">
          <circle cx="10" cy="10" r="8" fill="none" stroke="var(--bg)" strokeWidth="2.5" strokeDasharray="40" strokeDashoffset="10" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}

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
        <div className="au-serif" style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.1, marginBottom: 6, color: "var(--text)" }}>
          Welcome<br /><em style={{ fontStyle: "italic", color: "var(--gold)" }}>back.</em>
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>Sign in to manage your albums and uploads.</div>
      </div>

      {error && <ErrorBanner message={error} />}

      <Field label="Email address" error={emailErr} valid={emailValid}>
        <Input name="email" type="email" placeholder="you@example.com" autoComplete="email"
          error={!!emailErr} valid={emailValid}
          onBlur={(e) => validateEmail(e.target.value)}
          onChange={() => { setEmailErr(""); setEmailValid(false); }}
          rightSlot={emailValid ? <span style={{ color: "var(--green)" }}><CheckIcon /></span> : undefined}
        />
      </Field>

      <Field label="Password" error={pwErr}>
        <Input name="password" type={showPw ? "text" : "password"} placeholder="••••••••" autoComplete="current-password"
          error={!!pwErr}
          onChange={() => setPwErr("")}
          rightSlot={<ToggleBtn show={showPw} onToggle={() => setShowPw(v => !v)} />}
        />
        <div style={{ textAlign: "right", marginTop: -6 }}>
          <Link href="/forgot-password" className="au-forgot">Forgot your password?</Link>
        </div>
      </Field>

      <SubmitBtn loading={loading}>Sign in</SubmitBtn>
    </form>
  );
}

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
        <div className="au-serif" style={{ fontSize: 34, fontWeight: 400, lineHeight: 1.1, marginBottom: 6, color: "var(--text)" }}>
          Create your<br /><em style={{ fontStyle: "italic", color: "var(--gold)" }}>account.</em>
        </div>
        <div style={{ fontSize: 14, color: "var(--muted)", lineHeight: 1.6 }}>Free forever. No credit card required.</div>
      </div>

      {error && <ErrorBanner message={error} />}

      <Field label="Full name" error={nameErr}>
        <Input name="fullName" type="text" placeholder="Jane Smith" autoComplete="name"
          error={!!nameErr} onChange={() => setNameErr("")} />
      </Field>

      <Field label="Email address" error={emailErr} valid={emailValid}>
        <Input name="email" type="email" placeholder="you@example.com" autoComplete="email"
          error={!!emailErr} valid={emailValid}
          onBlur={(e) => validateEmail(e.target.value)}
          onChange={() => { setEmailErr(""); setEmailValid(false); }}
          rightSlot={emailValid ? <span style={{ color: "var(--green)" }}><CheckIcon /></span> : undefined}
        />
      </Field>

      <Field label="Password" error={pwErr}>
        <Input name="password" type={showPw ? "text" : "password"} placeholder="At least 8 characters" autoComplete="new-password"
          error={!!pwErr}
          onChange={(e) => { setPassword(e.target.value); setPwErr(""); }}
          rightSlot={<ToggleBtn show={showPw} onToggle={() => setShowPw(v => !v)} />}
        />
        <StrengthBar password={password} />
      </Field>

      <Field label="Confirm password" error={cpwErr}>
        <Input name="confirmPassword" type={showCpw ? "text" : "password"} placeholder="••••••••" autoComplete="new-password"
          error={!!cpwErr} onChange={() => setCpwErr("")}
          rightSlot={<ToggleBtn show={showCpw} onToggle={() => setShowCpw(v => !v)} />}
        />
      </Field>

      <SubmitBtn loading={loading}>Create account</SubmitBtn>
    </form>
  );
}

export function AuthPage({ initialTab }: { initialTab: "login" | "register" }) {
  const router = useRouter();
  const [tab, setTab] = useState(initialTab);
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const loginBtnRef = useRef<HTMLButtonElement>(null);
  const regBtnRef = useRef<HTMLButtonElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: "0px", width: "0px" });

  useEffect(() => {
    const saved = localStorage.getItem("captura-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (saved === "dark" || (!saved && prefersDark)) setTheme("dark");
  }, []);

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("captura-theme", next);
  }

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

  const isLight = theme === "light";

  return (
    <div data-theme={theme} className="au-root">
      <style>{`
        .au-root {
          --bg:        oklch(97% 0.008 80);
          --bg2:       oklch(93% 0.010 80);
          --bg3:       oklch(89% 0.012 80);
          --border:    oklch(80% 0.010 80);
          --border-f:  oklch(64% 0.010 80);
          --text:      oklch(18% 0.015 265);
          --muted:     oklch(46% 0.010 265);
          --gold:      oklch(58% 0.16 72);
          --gold-dim:  oklch(48% 0.13 72);
          --gold-glow: oklch(58% 0.16 72 / 0.14);
          --red:       oklch(55% 0.22 25);
          --red-bg:    oklch(55% 0.22 25 / 0.08);
          --red-border:oklch(55% 0.22 25 / 0.3);
          --green:     oklch(52% 0.18 155);
          font-family: 'DM Sans', system-ui, sans-serif;
          font-weight: 300;
          background: var(--bg);
          color: var(--text);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          transition: background 0.3s, color 0.3s;
        }
        .au-root[data-theme="dark"] {
          --bg:        oklch(11% 0.012 265);
          --bg2:       oklch(15% 0.012 265);
          --bg3:       oklch(19% 0.012 265);
          --border:    oklch(28% 0.012 265);
          --border-f:  oklch(38% 0.012 265);
          --text:      oklch(93% 0.008 80);
          --muted:     oklch(52% 0.008 265);
          --gold:      oklch(76% 0.13 82);
          --gold-dim:  oklch(60% 0.10 82);
          --gold-glow: oklch(76% 0.13 82 / 0.15);
          --red:       oklch(62% 0.20 25);
          --red-bg:    oklch(62% 0.20 25 / 0.1);
          --red-border:oklch(62% 0.20 25 / 0.35);
          --green:     oklch(65% 0.16 155);
        }
        .au-serif { font-family: 'Cormorant Garamond', Georgia, serif; }
        .au-field { display:flex; flex-direction:column; gap:7px; }
        .au-label { font-size:11px; font-weight:500; letter-spacing:0.08em; text-transform:uppercase; color:var(--muted); transition:color 0.2s; }
        .au-label.error { color:var(--red); }
        .au-label.valid { color:var(--gold-dim); }
        .au-input {
          width:100%; background:var(--bg2); border:1px solid var(--border);
          border-radius:8px; padding:13px 16px;
          font-family:'DM Sans',system-ui,sans-serif; font-size:14px; font-weight:300;
          color:var(--text); outline:none;
          transition:border-color 0.2s, box-shadow 0.2s, background 0.2s;
          -webkit-appearance:none;
        }
        .au-input::placeholder { color: var(--muted); opacity: 0.6; }
        .au-input.focused, .au-input:focus {
          border-color:var(--border-f);
          box-shadow:0 0 0 3px var(--gold-glow);
          background:var(--bg3);
        }
        .au-input.error { border-color:var(--red-border); box-shadow:0 0 0 3px var(--red-bg); }
        .au-input.valid { border-color:oklch(65% 0.16 155 / 0.4); }
        .au-field-error { display:flex; align-items:center; gap:6px; font-size:12px; color:var(--red); }
        .au-error-banner { background:var(--red-bg); border:1px solid var(--red-border); border-radius:8px; padding:12px 16px; display:flex; align-items:flex-start; gap:10px; font-size:13px; color:var(--red); line-height:1.5; }
        .au-submit-btn { background:var(--gold); color:var(--bg); border:none; border-radius:8px; padding:15px; font-family:'DM Sans',system-ui,sans-serif; font-size:15px; font-weight:500; letter-spacing:0.03em; cursor:pointer; width:100%; position:relative; overflow:hidden; transition:opacity 0.2s, transform 0.15s; }
        .au-submit-btn:hover { opacity:0.88; transform:translateY(-1px); }
        .au-submit-btn:active { transform:none; }
        .au-submit-btn:disabled { pointer-events:none; }
        .au-toggle-btn { background:none; border:none; cursor:pointer; padding:2px; color:var(--muted); transition:color 0.2s; line-height:0; }
        .au-toggle-btn:hover { color:var(--text); }
        .au-forgot { font-size:12px; color:var(--muted); text-decoration:none; transition:color 0.2s; }
        .au-forgot:hover { color:var(--text); }
        .au-theme-btn { position:fixed; top:18px; right:20px; z-index:200; width:36px; height:36px; border-radius:8px; background:var(--bg3); border:1px solid var(--border); display:flex; align-items:center; justify-content:center; cursor:pointer; color:var(--muted); overflow:hidden; transition:background 0.2s, border-color 0.2s; }
        .au-theme-btn:hover { background:var(--bg2); color:var(--text); border-color:var(--border-f); }
        @keyframes au-spin { from{transform:translate(-50%,-50%) rotate(0deg)} to{transform:translate(-50%,-50%) rotate(360deg)} }
        @keyframes au-fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>

      {/* Theme toggle */}
      <button className="au-theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ position: "absolute", transition: "opacity 0.25s, transform 0.25s", opacity: isLight ? 1 : 0, transform: isLight ? "scale(1)" : "scale(0.6)" }}>
          <circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
        </svg>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ position: "absolute", transition: "opacity 0.25s, transform 0.25s", opacity: isLight ? 0 : 1, transform: isLight ? "scale(0.6)" : "scale(1)" }}>
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
        </svg>
      </button>

      <div style={{ width: "100%", maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" className="au-serif" style={{ fontSize: 28, fontWeight: 500, letterSpacing: "0.08em", color: "var(--gold)", textDecoration: "none" }}>
            Captura
          </Link>
        </div>

        {/* Tab bar */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 40, position: "relative" }}>
          {(["login", "register"] as const).map((t) => (
            <button
              key={t}
              ref={t === "login" ? loginBtnRef : regBtnRef}
              onClick={() => switchTab(t)}
              style={{ flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14, fontWeight: tab === t ? 500 : 400, letterSpacing: "0.04em", color: tab === t ? "var(--text)" : "var(--muted)", padding: "0 0 16px", transition: "color 0.2s" }}
            >
              {t === "login" ? "Sign in" : "Create account"}
            </button>
          ))}
          <div style={{ position: "absolute", bottom: -1, height: 2, background: "var(--gold)", borderRadius: 1, transition: "left 0.3s cubic-bezier(0.4,0,0.2,1), width 0.3s cubic-bezier(0.4,0,0.2,1)", ...indicatorStyle }} />
        </div>

        {/* Form */}
        <div style={{ animation: "au-fadeIn 0.3s ease" }} key={tab}>
          {tab === "login" ? <LoginForm /> : <RegisterForm />}
        </div>

        {/* Switch link */}
        <p style={{ textAlign: "center", fontSize: 13, color: "var(--muted)", marginTop: 24 }}>
          {tab === "login" ? (
            <>Don&apos;t have an account?{" "}<button onClick={() => switchTab("register")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold)", fontFamily: "inherit", fontSize: "inherit" }}>Create one free</button></>
          ) : (
            <>Already have an account?{" "}<button onClick={() => switchTab("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--gold)", fontFamily: "inherit", fontSize: "inherit" }}>Sign in</button></>
          )}
        </p>

      </div>
    </div>
  );
}
