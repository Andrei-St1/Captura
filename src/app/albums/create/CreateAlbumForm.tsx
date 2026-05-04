"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { logout } from "@/app/auth/actions";
import { createPortalSession } from "@/app/stripe/actions";
import { createAlbum } from "@/app/albums/actions";

interface Props {
  planStorageGb: number;
  allocatedGb: number;
  user: { displayName: string; initials: string; email: string; planName: string };
}

const GRAD_PRESETS: [string, string][] = [
  ["oklch(78% 0.08 30)",  "oklch(70% 0.06 330)"],
  ["oklch(72% 0.08 280)", "oklch(68% 0.06 260)"],
  ["oklch(74% 0.09 155)", "oklch(66% 0.07 135)"],
  ["oklch(70% 0.07 210)", "oklch(64% 0.05 190)"],
  ["oklch(76% 0.08 50)",  "oklch(68% 0.06 30)"],
  ["oklch(72% 0.08 320)", "oklch(66% 0.06 300)"],
];

const STEP_LABELS = ["Details", "Cover & Storage", "Dates & Settings"];

export function CreateAlbumForm({ planStorageGb, allocatedGb, user }: Props) {
  const submittingRef = useRef(false);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const remaining = planStorageGb - allocatedGb;

  const [step, setStep]           = useState(0);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [doneId, setDoneId]       = useState<string | null>(null);
  const [doneTitle, setDoneTitle] = useState("");

  const [title, setTitle]           = useState("");
  const [titleErr, setTitleErr]     = useState(false);
  const [openDate, setOpenDate]     = useState("");
  const [closeDate, setCloseDate]   = useState("");
  const [showGallery, setShowGallery] = useState(true);
  const [inputGb, setInputGb]       = useState(Math.min(10, Math.max(1, remaining)));

  const [coverFile, setCoverFile]         = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [presetIdx, setPresetIdx]         = useState<number | null>(null);
  const [isDragging, setIsDragging]       = useState(false);

  function applyCoverFile(file: File) {
    if (!file.type.startsWith("image/")) return;
    setCoverFile(file);
    setCoverPreviewUrl(URL.createObjectURL(file));
    setPresetIdx(null);
  }

  function removeCover(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setCoverFile(null);
    setCoverPreviewUrl(null);
    if (coverInputRef.current) coverInputRef.current.value = "";
  }

  function tryGoStep(idx: number) {
    if (idx > 0 && !title.trim()) { setTitleErr(true); return; }
    setTitleErr(false);
    setStep(idx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (submittingRef.current) return;
    if (!title.trim()) { setTitleErr(true); setStep(0); return; }
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("title", title.trim());
      fd.set("allocated_gb", String(inputGb));
      fd.set("show_gallery", showGallery ? "true" : "false");
      if (openDate)  fd.set("open_date", openDate);
      if (closeDate) fd.set("close_date", closeDate);
      const result = await createAlbum(fd);
      if (result?.error) { setError(result.error); return; }
      if (result?.albumId) {
        if (coverFile) {
          const tfd = new FormData();
          tfd.append("file", coverFile);
          tfd.append("albumId", result.albumId);
          await fetch("/api/upload-thumbnail", { method: "POST", body: tfd });
        }
        setDoneId(result.albumId);
        setDoneTitle(title.trim());
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  }

  const coverStyle: React.CSSProperties = coverPreviewUrl
    ? { backgroundImage: `url('${coverPreviewUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }
    : presetIdx !== null
    ? { background: `linear-gradient(135deg, ${GRAD_PRESETS[presetIdx][0]}, ${GRAD_PRESETS[presetIdx][1]})` }
    : { background: `linear-gradient(135deg, ${GRAD_PRESETS[0][0]}, ${GRAD_PRESETS[0][1]})` };

  const fmtDate = (d: string) => {
    try { return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
    catch { return ""; }
  };

  // ── Success ───────────────────────────────────────────────────────────────
  if (doneId) {
    return (
      <>
        <style>{CSS}</style>
        <div className="ca-root">
          <Sidebar user={user} />
          <div className="ca-main">
            <div className="ca-success">
              <div className="ca-success-icon">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 16l7 7L26 9" />
                </svg>
              </div>
              <div className="ca-success-title">Album <em>created!</em></div>
              <div className="ca-success-sub">"{doneTitle}" is live. Share the QR code with your guests.</div>
              <div className="ca-success-actions">
                <Link href={`/albums/${doneId}`} className="ca-btn-primary" style={{ textDecoration: "none" }}>
                  View album →
                </Link>
                <button className="ca-btn-outline" onClick={() => {
                  setDoneId(null); setDoneTitle(""); setTitle(""); setStep(0);
                  setError(null); setCoverFile(null); setCoverPreviewUrl(null); setPresetIdx(null);
                }}>
                  Create another
                </button>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="ca-root">
        <Sidebar user={user} />

        <div className="ca-main">
          {/* Topbar */}
          <div className="ca-topbar">
            <Link href="/dashboard" className="ca-back">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M10 3L5 8l5 5" />
              </svg>
              <span className="ca-back-text">Back</span>
            </Link>
            <div className="ca-topbar-div" />
            <div className="ca-topbar-crumb">
              <Link href="/dashboard">Dashboard</Link> / <Link href="/albums">Albums</Link> / <span>Create</span>
            </div>
            <div className="ca-topbar-actions">
              <Link href="/dashboard" className="ca-btn-outline">Discard</Link>
              <button
                className="ca-btn-primary"
                onClick={handleSubmit}
                disabled={loading || remaining <= 0}
              >
                {loading
                  ? <><Spinner /> Creating…</>
                  : <><CheckIcon /> Create album</>}
              </button>
            </div>
          </div>

          {error && <div className="ca-error-banner">{error}</div>}

          <div className="ca-form-layout">
            {/* ── Left: form ── */}
            <div className="ca-form-main">

              {/* Progress steps */}
              <div className="ca-progress">
                {STEP_LABELS.map((label, i) => (
                  <div key={i} className="ca-ps-item">
                    <button
                      className={`ca-ps-dot${i === step ? " active" : i < step ? " done" : ""}`}
                      onClick={() => tryGoStep(i)}
                    >
                      {i < step ? "✓" : i + 1}
                    </button>
                    <span className={`ca-ps-label${i === step ? " active" : ""}`}>{label}</span>
                    {i < STEP_LABELS.length - 1 && (
                      <div className={`ca-ps-line${i < step ? " done" : ""}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* ── Step 0: Details ── */}
              {step === 0 && (
                <div>
                  <div className="ca-section-head">
                    <div className="ca-step-num">Step 1 of 3</div>
                    <div className="ca-section-title">Name your <em>album.</em></div>
                    <div className="ca-section-sub">Give your album a title. Guests will see this when they scan your QR code.</div>
                  </div>
                  <div className="ca-fields">
                    <div className={`ca-field${titleErr ? " err" : ""}`}>
                      <label>Album title <span className="ca-req">*</span></label>
                      <input
                        className="ca-input"
                        type="text"
                        placeholder="e.g. Sarah & James Wedding"
                        maxLength={60}
                        value={title}
                        autoFocus
                        onChange={(e) => { setTitle(e.target.value); if (e.target.value) setTitleErr(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter") tryGoStep(1); }}
                      />
                      {titleErr && <div className="ca-field-err">Album title is required.</div>}
                    </div>
                  </div>
                  <div className="ca-section-nav">
                    <span />
                    <button className="ca-btn-next" onClick={() => tryGoStep(1)}>
                      Next: Cover & Storage
                      <ArrowIcon />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 1: Cover & Storage ── */}
              {step === 1 && (
                <div>
                  <div className="ca-section-head">
                    <div className="ca-step-num">Step 2 of 3</div>
                    <div className="ca-section-title">Cover & <em>storage.</em></div>
                    <div className="ca-section-sub">Add a cover photo and allocate how much storage this album can use.</div>
                  </div>
                  <div className="ca-fields">

                    {/* Cover upload */}
                    <div className="ca-field">
                      <label>Cover image</label>
                      <label
                        htmlFor="ca-cover-input"
                        className={`ca-cover-area${isDragging ? " drag" : ""}${coverPreviewUrl ? " has-img" : ""}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) applyCoverFile(f); }}
                      >
                        <input
                          id="ca-cover-input"
                          ref={coverInputRef}
                          type="file"
                          accept="image/*,image/heic,image/heif"
                          style={{ display: "none" }}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) applyCoverFile(f); }}
                        />
                        {coverPreviewUrl ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={coverPreviewUrl} alt="Cover preview" className="ca-cover-img" />
                            <button type="button" className="ca-cover-remove" onClick={removeCover}>
                              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <path d="M2 2l10 10M12 2L2 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <div className="ca-cover-placeholder">
                            <div className="ca-cover-icon">
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round">
                                <rect x="3" y="3" width="18" height="18" rx="3" />
                                <circle cx="12" cy="10" r="3" />
                                <path d="M3 18l4-4 3 3 4-5 7 6" />
                              </svg>
                            </div>
                            <div>
                              <div className="ca-cover-label"><strong>Click to upload</strong> or drag & drop</div>
                              <div className="ca-cover-sub">JPG, PNG, WebP, HEIC · Max 50 MB</div>
                            </div>
                          </div>
                        )}
                      </label>

                      <div className="ca-preset-hint">Or pick a gradient preset:</div>
                      <div className="ca-presets">
                        {GRAD_PRESETS.map(([c1, c2], i) => (
                          <button
                            key={i}
                            type="button"
                            className={`ca-preset${presetIdx === i ? " selected" : ""}`}
                            style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                            onClick={() => { setPresetIdx(i); setCoverFile(null); setCoverPreviewUrl(null); if (coverInputRef.current) coverInputRef.current.value = ""; }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Storage slider */}
                    <div className="ca-field">
                      <label>Allocated storage</label>
                      <div className="ca-storage-wrap">
                        <div className="ca-storage-value-row">
                          <div className="ca-storage-big">{inputGb} <span>GB</span></div>
                          <div className="ca-storage-avail">{remaining} GB available</div>
                        </div>
                        <input
                          type="range"
                          className="ca-slider"
                          min={1}
                          max={Math.max(1, remaining)}
                          value={inputGb}
                          disabled={remaining <= 0}
                          onChange={(e) => setInputGb(Number(e.target.value))}
                        />
                        <div className="ca-slider-ticks">
                          <span>1 GB</span>
                          <span>{Math.floor(remaining / 2)} GB</span>
                          <span>{remaining} GB</span>
                        </div>
                        <div className="ca-storage-rem">
                          After allocation: <strong>{remaining - inputGb} GB</strong> remaining in plan
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="ca-section-nav">
                    <button className="ca-btn-back" onClick={() => setStep(0)}>← Back</button>
                    <button className="ca-btn-next" onClick={() => setStep(2)}>
                      Next: Dates & Settings
                      <ArrowIcon />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step 2: Dates & Settings ── */}
              {step === 2 && (
                <div>
                  <div className="ca-section-head">
                    <div className="ca-step-num">Step 3 of 3</div>
                    <div className="ca-section-title">Dates & <em>settings.</em></div>
                    <div className="ca-section-sub">Control when guests can upload and who can see the photos.</div>
                  </div>
                  <div className="ca-fields">

                    <div className="ca-date-grid">
                      <div className="ca-field">
                        <label>Upload opens</label>
                        <input className="ca-input" type="datetime-local" value={openDate} onChange={(e) => setOpenDate(e.target.value)} />
                        <div className="ca-field-hint">Leave empty to open immediately.</div>
                      </div>
                      <div className="ca-field">
                        <label>Upload closes</label>
                        <input className="ca-input" type="datetime-local" value={closeDate} onChange={(e) => setCloseDate(e.target.value)} />
                        <div className="ca-field-hint">Leave empty for no close date.</div>
                      </div>
                    </div>

                    <div className="ca-toggle-field">
                      <div>
                        <div className="ca-toggle-label">Guest gallery visible</div>
                        <div className="ca-toggle-desc">When enabled, guests can browse all uploaded photos together.</div>
                      </div>
                      <button
                        type="button"
                        className={`ca-toggle${showGallery ? " on" : ""}`}
                        onClick={() => setShowGallery(v => !v)}
                      >
                        <span className="ca-toggle-knob" />
                      </button>
                    </div>
                  </div>

                  <div className="ca-section-nav">
                    <button className="ca-btn-back" onClick={() => setStep(1)}>← Back</button>
                    <button
                      className="ca-btn-primary"
                      onClick={handleSubmit}
                      disabled={loading || remaining <= 0}
                    >
                      {loading
                        ? <><Spinner /> Creating…</>
                        : <><CheckIcon /> Create album</>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Right: live preview ── */}
            <div className="ca-aside">
              <div className="ca-aside-label">Live preview</div>
              <div className="ca-preview-card">
                <div className="ca-preview-cover" style={coverStyle}>
                  <div className="ca-preview-grad" />
                  <div className="ca-preview-badge">
                    <span className="ca-badge-dot" /> Open
                  </div>
                </div>
                <div className="ca-preview-body">
                  <div className={`ca-preview-title${!title ? " empty" : ""}`}>
                    {title || "Untitled album"}
                  </div>
                  <div className="ca-preview-meta-item">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <rect x="1" y="1" width="10" height="10" rx="1" /><path d="M1 5h10M4 1v4" />
                    </svg>
                    {openDate || closeDate
                      ? `${openDate ? fmtDate(openDate) : "Now"} – ${closeDate ? fmtDate(closeDate) : "No end"}`
                      : "Dates not set"}
                  </div>
                  <div className="ca-preview-storage-row">
                    <div className="ca-preview-storage-labels">
                      <span>0 GB used</span>
                      <span>{inputGb} GB allocated</span>
                    </div>
                    <div className="ca-preview-track">
                      <div className="ca-preview-fill" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="ca-tip">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <circle cx="8" cy="8" r="6" /><path d="M8 7v4M8 5v.5" />
                </svg>
                <p>Guests don't need an account — they scan your QR code and upload directly from their phone.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Small icon components ─────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "ca-spin 1s linear infinite", flexShrink: 0 }}>
      <circle cx="7" cy="7" r="5" strokeDasharray="22" strokeDashoffset="8" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <path d="M2 7l4 4 6-6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
      <path d="M4 3l5 4-5 4" />
    </svg>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ user }: { user: Props["user"] }) {
  return (
    <aside className="ca-sidebar">
      <div className="ca-sidebar-logo">
        <Link href="/" className="ca-logo">Captura</Link>
        {user.planName && <span className="ca-plan-badge">{user.planName}</span>}
      </div>
      <nav className="ca-sidebar-nav">
        <Link href="/dashboard" className="ca-nav-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
            <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
          </svg>
          Dashboard
        </Link>
        <Link href="/albums" className="ca-nav-item active">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="2" y="4" width="12" height="10" rx="1.5" /><path d="M5 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" /><circle cx="8" cy="9" r="2" />
          </svg>
          Albums
        </Link>
        <Link href="/settings" className="ca-nav-item">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <circle cx="8" cy="8" r="2.5" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42" />
          </svg>
          Settings
        </Link>
        <div className="ca-nav-div" />
        <form action={createPortalSession} style={{ width: "100%" }}>
          <button type="submit" className="ca-nav-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="1" y="3" width="14" height="10" rx="1.5" /><path d="M1 6h14M4 10h3" />
            </svg>
            Billing
          </button>
        </form>
        <form action={logout} style={{ width: "100%" }}>
          <button type="submit" className="ca-nav-item">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M6 14H2a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h4" /><path d="M11 11l3-3-3-3" /><path d="M14 8H6" />
            </svg>
            Sign out
          </button>
        </form>
      </nav>
      <div className="ca-sidebar-footer">
        <div className="ca-user-row">
          <div className="ca-avatar">{user.initials}</div>
          <div style={{ overflow: "hidden" }}>
            <div className="ca-user-name">{user.displayName}</div>
            <div className="ca-user-email">{user.email}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────────

const CSS = `
  @keyframes ca-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes ca-pop  { 0%{transform:scale(.6);opacity:0} 80%{transform:scale(1.08)} 100%{transform:scale(1);opacity:1} }
  @keyframes ca-fade { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

  .ca-root {
    display: flex;
    min-height: 100vh;
    background: oklch(97% 0.008 80);
    color: oklch(18% 0.015 265);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    line-height: 1.5;
  }

  /* ── Sidebar ── */
  .ca-sidebar {
    width: 240px;
    flex-shrink: 0;
    background: oklch(93% 0.010 80);
    border-right: 1px solid oklch(80% 0.010 80);
    display: flex;
    flex-direction: column;
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 50;
    overflow-y: auto;
  }
  .ca-sidebar-logo {
    padding: 28px 24px 20px;
    border-bottom: 1px solid oklch(80% 0.010 80);
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .ca-logo {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 20px;
    font-weight: 500;
    letter-spacing: 0.06em;
    color: oklch(44% 0.16 72);
    text-decoration: none;
  }
  .ca-plan-badge {
    margin-left: auto;
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 20px;
    background: oklch(44% 0.16 72 / 0.12);
    color: oklch(44% 0.16 72);
    border: 1px solid oklch(44% 0.16 72 / 0.2);
    white-space: nowrap;
  }
  .ca-sidebar-nav {
    flex: 1;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  .ca-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 8px;
    font-size: 13px;
    color: oklch(46% 0.010 265);
    text-decoration: none;
    transition: background .15s, color .15s;
    cursor: pointer;
    border: none;
    background: none;
    width: 100%;
    text-align: left;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .ca-nav-item:hover { background: oklch(89% 0.012 80); color: oklch(18% 0.015 265); }
  .ca-nav-item.active { background: oklch(44% 0.16 72 / 0.12); color: oklch(44% 0.16 72); font-weight: 600; }
  .ca-nav-div { height: 1px; background: oklch(80% 0.010 80); margin: 8px 0; }
  .ca-sidebar-footer {
    padding: 16px 20px;
    border-top: 1px solid oklch(80% 0.010 80);
  }
  .ca-user-row { display: flex; align-items: center; gap: 10px; }
  .ca-avatar {
    width: 34px; height: 34px;
    border-radius: 50%;
    background: oklch(44% 0.16 72 / 0.12);
    border: 1.5px solid oklch(44% 0.16 72);
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700;
    color: oklch(36% 0.13 72);
    flex-shrink: 0;
    text-transform: uppercase;
  }
  .ca-user-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ca-user-email { font-size: 11px; color: oklch(58% 0.010 265); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

  /* ── Main ── */
  .ca-main {
    margin-left: 240px;
    flex: 1;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  /* ── Topbar ── */
  .ca-topbar {
    position: sticky;
    top: 0; z-index: 40;
    background: oklch(97% 0.008 80 / 0.9);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid oklch(80% 0.010 80);
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 40px;
  }
  .ca-back {
    display: flex;
    align-items: center;
    gap: 6px;
    color: oklch(46% 0.010 265);
    font-size: 13px;
    text-decoration: none;
    transition: color .15s;
    white-space: nowrap;
  }
  .ca-back:hover { color: oklch(18% 0.015 265); }
  .ca-topbar-div { width: 1px; height: 18px; background: oklch(80% 0.010 80); flex-shrink: 0; }
  .ca-topbar-crumb { font-size: 13px; color: oklch(46% 0.010 265); }
  .ca-topbar-crumb a { color: oklch(46% 0.010 265); text-decoration: none; }
  .ca-topbar-crumb a:hover { color: oklch(18% 0.015 265); }
  .ca-topbar-crumb span { color: oklch(18% 0.015 265); }
  .ca-topbar-actions { margin-left: auto; display: flex; gap: 10px; align-items: center; }

  /* ── Buttons ── */
  .ca-btn-primary {
    display: inline-flex; align-items: center; gap: 7px;
    background: oklch(44% 0.16 72);
    color: #fff;
    padding: 9px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    border: none; cursor: pointer;
    text-decoration: none;
    transition: opacity .2s, transform .15s;
    white-space: nowrap;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .ca-btn-primary:hover:not(:disabled) { opacity: .88; transform: translateY(-1px); }
  .ca-btn-primary:disabled { opacity: .55; cursor: not-allowed; transform: none; }
  .ca-btn-outline {
    display: inline-flex; align-items: center;
    padding: 9px 18px;
    border-radius: 8px;
    border: 1px solid oklch(80% 0.010 80);
    color: oklch(46% 0.010 265);
    font-size: 13px;
    font-weight: 400;
    cursor: pointer;
    background: none;
    text-decoration: none;
    transition: border-color .15s, color .15s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .ca-btn-outline:hover { border-color: oklch(65% 0.012 80); color: oklch(18% 0.015 265); }
  .ca-btn-next {
    display: inline-flex; align-items: center; gap: 7px;
    background: oklch(44% 0.16 72);
    color: #fff;
    padding: 9px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    border: none; cursor: pointer;
    transition: opacity .2s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .ca-btn-next:hover { opacity: .88; }
  .ca-btn-back {
    padding: 9px 18px;
    border-radius: 8px;
    border: 1px solid oklch(80% 0.010 80);
    color: oklch(46% 0.010 265);
    font-size: 13px;
    cursor: pointer;
    background: none;
    transition: all .15s;
    font-family: 'DM Sans', system-ui, sans-serif;
  }
  .ca-btn-back:hover { border-color: oklch(65% 0.012 80); color: oklch(18% 0.015 265); }

  /* ── Error banner ── */
  .ca-error-banner {
    margin: 16px 40px 0;
    padding: 12px 16px;
    border-radius: 10px;
    background: oklch(62% 0.20 25 / 0.08);
    border: 1px solid oklch(62% 0.20 25 / 0.25);
    color: oklch(52% 0.20 25);
    font-size: 13px;
  }

  /* ── Form layout ── */
  .ca-form-layout {
    display: grid;
    grid-template-columns: 1fr 340px;
    flex: 1;
    align-items: start;
  }
  .ca-form-main {
    padding: 40px 48px 80px;
    border-right: 1px solid oklch(80% 0.010 80);
    animation: ca-fade .25s ease;
  }
  .ca-aside {
    padding: 32px 28px 80px;
    position: sticky;
    top: 60px;
  }

  /* ── Progress steps ── */
  .ca-progress { display: flex; align-items: center; margin-bottom: 40px; }
  .ca-ps-item { display: flex; align-items: center; gap: 8px; }
  .ca-ps-item:last-child .ca-ps-line { display: none; }
  .ca-ps-dot {
    width: 28px; height: 28px;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 600;
    border: 1.5px solid oklch(80% 0.010 80);
    color: oklch(46% 0.010 265);
    background: oklch(93% 0.010 80);
    flex-shrink: 0;
    cursor: pointer;
    transition: all .25s;
  }
  .ca-ps-dot.active { background: oklch(44% 0.16 72); border-color: oklch(44% 0.16 72); color: #fff; }
  .ca-ps-dot.done { background: oklch(65% 0.16 155 / 0.12); border-color: oklch(65% 0.16 155 / 0.4); color: oklch(50% 0.16 155); }
  .ca-ps-label { font-size: 12px; color: oklch(46% 0.010 265); white-space: nowrap; transition: color .25s; }
  .ca-ps-label.active { color: oklch(18% 0.015 265); font-weight: 600; }
  .ca-ps-line { flex: 1; height: 1px; background: oklch(80% 0.010 80); margin: 0 10px; min-width: 20px; transition: background .25s; }
  .ca-ps-line.done { background: oklch(65% 0.16 155 / 0.4); }

  /* ── Section heading ── */
  .ca-section-head { margin-bottom: 32px; }
  .ca-step-num { font-size: 11px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: oklch(40% 0.13 72); margin-bottom: 8px; }
  .ca-section-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 30px; font-weight: 400; line-height: 1.15; margin-bottom: 8px; }
  .ca-section-title em { font-style: italic; color: oklch(44% 0.16 72); }
  .ca-section-sub { font-size: 14px; color: oklch(46% 0.010 265); line-height: 1.65; max-width: 480px; }

  /* ── Fields ── */
  .ca-fields { display: flex; flex-direction: column; gap: 24px; }
  .ca-field { display: flex; flex-direction: column; gap: 8px; }
  .ca-field label { font-size: 11px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; color: oklch(46% 0.010 265); }
  .ca-field.err label { color: oklch(52% 0.20 25); }
  .ca-req { color: oklch(52% 0.20 25); }
  .ca-input {
    width: 100%;
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 8px;
    padding: 12px 14px;
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 14px;
    color: oklch(18% 0.015 265);
    outline: none;
    transition: border-color .2s, box-shadow .2s;
    -webkit-appearance: none;
    color-scheme: light;
  }
  .ca-input::placeholder { color: oklch(60% 0.010 265); }
  .ca-input:focus { border-color: oklch(65% 0.012 80); box-shadow: 0 0 0 3px oklch(44% 0.16 72 / 0.10); background: oklch(89% 0.012 80); }
  .ca-field.err .ca-input { border-color: oklch(52% 0.20 25 / 0.6); box-shadow: 0 0 0 3px oklch(62% 0.20 25 / 0.08); }
  .ca-field-err { font-size: 12px; color: oklch(52% 0.20 25); }
  .ca-field-hint { font-size: 12px; color: oklch(58% 0.010 265); line-height: 1.5; }
  .ca-date-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

  /* ── Cover upload ── */
  .ca-cover-area {
    position: relative;
    border: 2px dashed oklch(80% 0.010 80);
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: border-color .2s, background .2s;
    aspect-ratio: 16 / 7;
    display: flex; align-items: center; justify-content: center;
  }
  .ca-cover-area:hover { border-color: oklch(65% 0.012 80); background: oklch(89% 0.012 80); }
  .ca-cover-area.drag { border-color: oklch(44% 0.16 72); background: oklch(44% 0.16 72 / 0.06); }
  .ca-cover-area.has-img { border-style: solid; border-color: oklch(80% 0.010 80); }
  .ca-file-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%; }
  .ca-cover-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
  .ca-cover-placeholder { display: flex; flex-direction: column; align-items: center; gap: 10px; pointer-events: none; text-align: center; padding: 20px; }
  .ca-cover-icon { width: 48px; height: 48px; border-radius: 12px; background: oklch(89% 0.012 80); border: 1px solid oklch(80% 0.010 80); display: flex; align-items: center; justify-content: center; color: oklch(46% 0.010 265); }
  .ca-cover-label { font-size: 13px; color: oklch(46% 0.010 265); }
  .ca-cover-label strong { color: oklch(44% 0.16 72); font-weight: 600; }
  .ca-cover-sub { font-size: 11px; color: oklch(58% 0.010 265); margin-top: 2px; }
  .ca-cover-remove {
    position: absolute; top: 10px; right: 10px;
    width: 30px; height: 30px;
    background: oklch(11% 0.012 265 / 0.65);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; color: #fff;
    backdrop-filter: blur(4px);
    z-index: 2;
  }
  .ca-preset-hint { font-size: 12px; color: oklch(58% 0.010 265); margin-top: 10px; }
  .ca-presets { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
  .ca-preset {
    width: 48px; height: 36px;
    border-radius: 6px;
    cursor: pointer;
    border: 2px solid transparent;
    transition: border-color .15s, transform .15s;
    overflow: hidden;
  }
  .ca-preset:hover { transform: scale(1.06); }
  .ca-preset.selected { border-color: oklch(44% 0.16 72); }

  /* ── Storage slider ── */
  .ca-storage-wrap { display: flex; flex-direction: column; gap: 10px; }
  .ca-storage-value-row { display: flex; justify-content: space-between; align-items: baseline; }
  .ca-storage-big { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 38px; font-weight: 300; line-height: 1; color: oklch(18% 0.015 265); }
  .ca-storage-big span { font-size: 15px; font-family: 'DM Sans', system-ui, sans-serif; color: oklch(46% 0.010 265); margin-left: 2px; }
  .ca-storage-avail { font-size: 12px; color: oklch(44% 0.16 72); font-weight: 600; }
  .ca-slider {
    width: 100%; -webkit-appearance: none; height: 5px;
    border-radius: 3px; background: oklch(80% 0.010 80);
    outline: none; cursor: pointer;
  }
  .ca-slider::-webkit-slider-thumb {
    -webkit-appearance: none; width: 20px; height: 20px;
    border-radius: 50%; background: oklch(44% 0.16 72);
    border: 2px solid oklch(97% 0.008 80);
    box-shadow: 0 2px 8px oklch(44% 0.16 72 / 0.3);
    cursor: pointer; transition: transform .15s;
  }
  .ca-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
  .ca-slider::-moz-range-thumb { width: 20px; height: 20px; border-radius: 50%; background: oklch(44% 0.16 72); border: 2px solid oklch(97% 0.008 80); cursor: pointer; }
  .ca-slider-ticks { display: flex; justify-content: space-between; font-size: 10px; color: oklch(58% 0.010 265); }
  .ca-storage-rem { font-size: 12px; color: oklch(46% 0.010 265); }
  .ca-storage-rem strong { color: oklch(18% 0.015 265); }

  /* ── Toggle ── */
  .ca-toggle-field {
    display: flex; align-items: flex-start; justify-content: space-between; gap: 20px;
    padding: 18px 20px;
    background: oklch(93% 0.010 80);
    border: 1px solid oklch(80% 0.010 80);
    border-radius: 12px;
    transition: border-color .2s;
  }
  .ca-toggle-field:hover { border-color: oklch(65% 0.012 80); }
  .ca-toggle-label { font-size: 14px; font-weight: 500; margin-bottom: 4px; }
  .ca-toggle-desc { font-size: 12px; color: oklch(46% 0.010 265); line-height: 1.5; }
  .ca-toggle {
    flex-shrink: 0; width: 44px; height: 24px;
    border-radius: 12px;
    background: oklch(80% 0.010 80);
    border: none; cursor: pointer;
    position: relative;
    transition: background .25s;
    margin-top: 2px;
  }
  .ca-toggle.on { background: oklch(50% 0.16 155); }
  .ca-toggle-knob {
    position: absolute; top: 3px; left: 3px;
    width: 18px; height: 18px;
    border-radius: 50%; background: white;
    transition: transform .25s;
    box-shadow: 0 1px 4px oklch(0% 0 0 / 0.25);
    display: block;
  }
  .ca-toggle.on .ca-toggle-knob { transform: translateX(20px); }

  /* ── Section nav ── */
  .ca-section-nav {
    display: flex; justify-content: space-between; align-items: center;
    margin-top: 40px; padding-top: 24px;
    border-top: 1px solid oklch(80% 0.010 80);
  }

  /* ── Aside: preview ── */
  .ca-aside-label { font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; color: oklch(46% 0.010 265); margin-bottom: 16px; }
  .ca-preview-card { background: oklch(93% 0.010 80); border: 1px solid oklch(80% 0.010 80); border-radius: 14px; overflow: hidden; }
  .ca-preview-cover { height: 130px; position: relative; overflow: hidden; }
  .ca-preview-grad { position: absolute; inset: 0; background: linear-gradient(to top, oklch(93% 0.010 80) 0%, transparent 55%); }
  .ca-preview-badge {
    position: absolute; top: 10px; left: 10px;
    font-size: 9px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
    padding: 3px 8px; border-radius: 100px;
    background: oklch(65% 0.16 155 / 0.12);
    color: oklch(50% 0.16 155);
    border: 1px solid oklch(65% 0.16 155 / 0.3);
    display: flex; align-items: center; gap: 5px;
  }
  .ca-badge-dot { width: 5px; height: 5px; border-radius: 50%; background: oklch(50% 0.16 155); animation: ca-blink 2s ease-in-out infinite; display: block; flex-shrink: 0; }
  @keyframes ca-blink { 0%,100%{opacity:1} 50%{opacity:.3} }
  .ca-preview-body { padding: 12px 16px 16px; }
  .ca-preview-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 17px; font-weight: 400; margin-bottom: 8px; min-height: 22px; }
  .ca-preview-title.empty { color: oklch(60% 0.010 265); font-style: italic; }
  .ca-preview-meta-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: oklch(46% 0.010 265); margin-bottom: 10px; }
  .ca-preview-storage-row { margin-top: 8px; }
  .ca-preview-storage-labels { display: flex; justify-content: space-between; font-size: 10px; color: oklch(58% 0.010 265); margin-bottom: 4px; }
  .ca-preview-track { height: 3px; background: oklch(85% 0.012 80); border-radius: 2px; overflow: hidden; }
  .ca-preview-fill { height: 100%; border-radius: 2px; background: oklch(40% 0.13 72); width: 0; transition: width .4s; }

  /* ── Tip ── */
  .ca-tip { margin-top: 16px; background: oklch(93% 0.010 80); border: 1px solid oklch(80% 0.010 80); border-radius: 10px; padding: 14px 16px; display: flex; gap: 10px; color: oklch(44% 0.16 72); }
  .ca-tip p { font-size: 12px; color: oklch(46% 0.010 265); line-height: 1.6; }

  /* ── Success ── */
  .ca-success {
    flex: 1; display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 80px 40px; text-align: center; gap: 20px;
    animation: ca-fade .35s ease;
  }
  .ca-success-icon {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: oklch(65% 0.16 155 / 0.1);
    border: 1px solid oklch(65% 0.16 155 / 0.3);
    color: oklch(50% 0.16 155);
    display: flex; align-items: center; justify-content: center;
    animation: ca-pop .4s ease;
  }
  .ca-success-title { font-family: 'Cormorant Garamond', Georgia, serif; font-size: 36px; font-weight: 400; }
  .ca-success-title em { font-style: italic; color: oklch(44% 0.16 72); }
  .ca-success-sub { font-size: 14px; color: oklch(46% 0.010 265); max-width: 380px; line-height: 1.7; }
  .ca-success-actions { display: flex; gap: 12px; flex-wrap: wrap; justify-content: center; margin-top: 4px; }

  /* ── Responsive ── */
  @media (max-width: 1100px) {
    .ca-form-layout { grid-template-columns: 1fr; }
    .ca-aside { display: none; }
  }

  @media (max-width: 768px) {
    .ca-sidebar { display: none; }
    .ca-main { margin-left: 0; }
    .ca-topbar { padding: 12px 20px; gap: 10px; }
    .ca-back-text { display: none; }
    .ca-topbar-crumb { display: none; }
    .ca-topbar-div { display: none; }
    .ca-form-main { padding: 28px 20px 60px; }
    .ca-progress { overflow-x: auto; padding-bottom: 4px; }
    .ca-date-grid { grid-template-columns: 1fr; }
    .ca-section-title { font-size: 24px; }
    .ca-error-banner { margin: 12px 20px 0; }
  }
`;
