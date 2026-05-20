"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { updateWelcomePage } from "@/app/albums/actions";
import { SCHEMES, SCHEME_KEYS, getScheme } from "@/lib/colorSchemes";

interface Album {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  cover_url: string | null;
  color_scheme?: string | null;
}

const COVER_PRESETS = [
  { c1: "oklch(35% 0.06 200)", c2: "oklch(22% 0.08 155)" },
  { c1: "oklch(32% 0.06 30)",  c2: "oklch(24% 0.07 350)" },
  { c1: "oklch(34% 0.07 70)",  c2: "oklch(24% 0.06 40)" },
  { c1: "oklch(30% 0.06 280)", c2: "oklch(22% 0.05 240)" },
  { c1: "oklch(36% 0.07 155)", c2: "oklch(26% 0.06 130)" },
  { c1: "oklch(28% 0.03 60)",  c2: "oklch(20% 0.02 60)" },
];

type CoverMode = "placeholder" | "preset" | "image";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500&display=swap');

.wf {
  --bg:       oklch(97% 0.008 80);
  --bg2:      oklch(93% 0.010 80);
  --bg3:      oklch(89% 0.012 80);
  --border:   oklch(86% 0.010 80);
  --border2:  oklch(78% 0.010 80);
  --border-f: oklch(65% 0.012 80);
  --text:     oklch(18% 0.015 265);
  --muted:    oklch(46% 0.010 265);
  --muted2:   oklch(58% 0.010 265);
  --gold:     oklch(44% 0.16 72);
  --gold-dim: oklch(36% 0.13 72);
  --gold-glow:oklch(58% 0.16 72 / 0.10);
  --gold-b:   oklch(58% 0.16 72 / 0.22);
  --green:    oklch(54% 0.14 155);
  --green-bg: oklch(54% 0.14 155 / 0.10);
  --serif:    'Cormorant Garamond', Georgia, serif;
  --sans:     'DM Sans', system-ui, sans-serif;

  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--sans);
  font-weight: 300;
  -webkit-font-smoothing: antialiased;
}

/* NAV */
.wf-nav {
  position: sticky; top: 0; z-index: 50;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 32px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
}
.wf-brand {
  font-family: var(--serif); font-size: 22px; font-weight: 500;
  letter-spacing: 0.06em; color: var(--gold); text-decoration: none;
}
.wf-nav-links { display: flex; gap: 28px; }
.wf-nav-link {
  font-size: 11px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--muted); text-decoration: none; padding: 8px 0;
  border-bottom: 2px solid transparent; transition: color .15s, border-color .15s;
}
.wf-nav-link:hover { color: var(--text); }
.wf-nav-link.active { color: var(--gold); border-bottom-color: var(--gold); }

/* PAGE */
.wf-page { max-width: 1280px; margin: 0 auto; padding: 40px 32px 160px; }

/* BREADCRUMB */
.wf-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--muted); margin-bottom: 28px; }
.wf-breadcrumb a { color: var(--muted); text-decoration: none; transition: color .15s; }
.wf-breadcrumb a:hover { color: var(--text); }
.wf-breadcrumb .sep { opacity: .45; }
.wf-breadcrumb .cur { color: var(--gold); }

/* HEAD */
.wf-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; margin-bottom: 36px; flex-wrap: wrap; }
.wf-head-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10px; font-weight: 500; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted);
  margin-bottom: 12px;
}
.wf-head-eyebrow::before { content: ''; width: 24px; height: 1px; background: var(--gold); opacity: .6; }
.wf-title { font-family: var(--serif); font-size: 38px; font-weight: 400; letter-spacing: -0.01em; line-height: 1; color: var(--text); }
.wf-title em { font-style: italic; color: var(--gold); font-weight: 400; }
.wf-sub { font-size: 13px; color: var(--muted); margin-top: 10px; max-width: 440px; line-height: 1.6; }

/* GRID */
.wf-grid { display: grid; grid-template-columns: 1fr 400px; gap: 24px; align-items: start; }
.wf-col-main { display: flex; flex-direction: column; gap: 20px; }
.wf-col-side { position: sticky; top: 80px; display: flex; flex-direction: column; gap: 16px; }

/* CARD */
.wf-card { background: var(--bg); border: 1px solid var(--border); border-radius: 18px; padding: 28px; }
.wf-card-head { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 22px; gap: 12px; }
.wf-card-eyebrow { font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: var(--muted); font-weight: 500; margin-bottom: 3px; }
.wf-card-title { font-family: var(--serif); font-size: 22px; font-weight: 400; color: var(--text); line-height: 1; }
.wf-card-title em { font-style: italic; color: var(--gold); }
.wf-card-helper { font-size: 11px; color: var(--muted); max-width: 200px; text-align: right; line-height: 1.5; }

/* FIELDS */
.wf-field { display: flex; flex-direction: column; gap: 7px; }
.wf-field + .wf-field { margin-top: 18px; }
.wf-label {
  font-size: 11px; font-weight: 500; letter-spacing: 0.10em; text-transform: uppercase; color: var(--muted);
  display: flex; align-items: center; gap: 5px;
}
.wf-label .req { color: var(--gold); font-size: 13px; line-height: 0; }
.wf-input {
  width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 10px;
  padding: 12px 15px; font-family: var(--sans); font-size: 14px; font-weight: 300;
  color: var(--text); outline: none;
  transition: border-color .2s, box-shadow .2s;
  -webkit-appearance: none;
}
.wf-input::placeholder { color: var(--muted2); font-style: italic; }
.wf-input:focus { border-color: var(--gold-b); box-shadow: 0 0 0 3px var(--gold-glow); }
textarea.wf-input {
  resize: vertical; min-height: 90px; line-height: 1.6;
  font-family: var(--serif); font-size: 16px; font-style: italic; font-weight: 400;
}
textarea.wf-input::placeholder { font-family: var(--serif); font-style: italic; }
.wf-char { font-size: 10px; color: var(--muted2); text-align: right; letter-spacing: .04em; margin-top: -2px; }

/* COVER */
.wf-cover-zone {
  position: relative; border: 1.5px dashed var(--border2); border-radius: 14px; overflow: hidden;
  cursor: pointer; transition: border-color .2s, background .2s; aspect-ratio: 16/8; background: var(--bg2);
}
.wf-cover-zone:hover { border-color: var(--gold-b); background: var(--gold-glow); }
.wf-cover-zone.drag { border-color: var(--gold); background: var(--gold-glow); border-style: solid; }
.wf-cover-zone.has-image { border-style: solid; border-color: var(--border); }
.wf-cover-placeholder {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
  pointer-events: none; padding: 24px; text-align: center;
}
.wf-cover-icon {
  width: 52px; height: 52px; border-radius: 14px; background: var(--bg);
  border: 1px solid var(--border); display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 14px oklch(0% 0 0 / 0.04);
}
.wf-cover-icon svg { width: 22px; height: 22px; stroke: var(--gold); fill: none; stroke-width: 1.3; }
.wf-cover-label { font-family: var(--serif); font-size: 19px; color: var(--text); line-height: 1.2; margin-top: 4px; }
.wf-cover-label em { font-style: italic; color: var(--gold); }
.wf-cover-sub { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted2); }
.wf-cover-img { position: absolute; inset: 0; background-size: cover; background-position: center; }
.wf-cover-img-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(to top, oklch(11% 0.012 265 / .5) 0%, transparent 55%);
}
.wf-cover-remove {
  position: absolute; top: 12px; right: 12px; width: 32px; height: 32px;
  background: oklch(11% 0.012 265 / .55); border: 1px solid oklch(100% 0 0 / 0.18);
  border-radius: 8px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; backdrop-filter: blur(8px); z-index: 2;
}
.wf-cover-remove svg { width: 14px; height: 14px; stroke: white; fill: none; stroke-width: 2; }
.wf-file-input { display: none; }

/* PRESETS */
.wf-presets-wrap { display: flex; align-items: center; justify-content: space-between; margin-top: 14px; gap: 16px; flex-wrap: wrap; }
.wf-presets-label { font-size: 11px; color: var(--muted); letter-spacing: .04em; }
.wf-presets { display: flex; gap: 8px; }
.wf-preset {
  width: 54px; height: 36px; border-radius: 8px; cursor: pointer;
  border: 2px solid transparent; transition: transform .15s, box-shadow .2s; overflow: hidden; flex-shrink: 0; position: relative;
}
.wf-preset:hover { transform: translateY(-2px); box-shadow: 0 6px 16px oklch(0% 0 0 / 0.10); }
.wf-preset.selected { border-color: var(--gold); box-shadow: 0 0 0 3px var(--gold-glow); }

/* ACTION BAR */
.wf-action-bar {
  position: fixed; left: 0; right: 0; bottom: 0;
  background: oklch(97% 0.008 80 / 0.92); backdrop-filter: blur(14px);
  border-top: 1px solid var(--border); padding: 13px 32px;
  display: flex; align-items: center; z-index: 40;
}
.wf-action-inner {
  max-width: 1280px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; width: 100%; gap: 20px;
}
.wf-dirty { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--muted); }
.wf-dirty .pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--gold); animation: wf-pulse 2s ease-in-out infinite; }
.wf-bar-actions { display: flex; align-items: center; gap: 10px; }

.wf-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 15px; border-radius: 8px; font-family: var(--sans);
  font-size: 12px; font-weight: 500; cursor: pointer; text-decoration: none;
  transition: opacity .2s, border-color .2s, background .2s; border: 1px solid transparent;
  white-space: nowrap; color: inherit; background: none; letter-spacing: .02em;
}
.wf-btn svg { width: 14px; height: 14px; stroke: currentColor; fill: none; stroke-width: 1.7; stroke-linecap: round; stroke-linejoin: round; }
.wf-btn-primary { background: var(--gold); color: white; box-shadow: 0 4px 14px var(--gold-glow); border: none; }
.wf-btn-primary:hover { background: var(--gold-dim); }
.wf-btn-primary:disabled { opacity: .65; cursor: not-allowed; }
.wf-btn-ghost { background: var(--bg); color: var(--text); border-color: var(--border); }
.wf-btn-ghost:hover { border-color: var(--border2); }
.wf-btn-text { color: var(--muted); }
.wf-btn-text:hover { color: var(--text); }

/* SCHEMES */
.wf-schemes { display: flex; gap: 8px; flex-wrap: wrap; }
.wf-scheme-opt {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 14px; border-radius: 12px;
  border: 1.5px solid var(--border);
  background: var(--bg); cursor: pointer;
  transition: border-color .15s, background .15s;
  font-family: var(--sans); font-size: 13px; font-weight: 400;
  color: var(--text);
}
.wf-scheme-opt:hover { border-color: var(--border-f); background: var(--bg2); }
.wf-scheme-opt.selected { border-color: var(--gold); background: var(--gold-glow); }
.wf-scheme-swatch {
  width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  border: 1px solid oklch(0% 0 0 / 0.08);
}
.wf-scheme-name { font-size: 13px; font-weight: 400; }
.wf-scheme-check {
  width: 12px; height: 12px; stroke: var(--gold); fill: none;
  stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
}

/* PHONE */
.wf-preview-label {
  font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--muted); font-weight: 500; display: flex; align-items: center; gap: 8px; align-self: flex-start;
}
.wf-preview-label::before { content: ''; width: 18px; height: 1px; background: var(--gold); opacity: .6; }

.wf-phone {
  width: 280px; height: 580px; background: oklch(15% 0.015 265); border-radius: 36px; padding: 8px;
  box-shadow: 0 30px 60px oklch(0% 0 0 / 0.22), 0 0 0 1.5px oklch(100% 0 0 / 0.04), inset 0 1px 0 oklch(100% 0 0 / 0.06);
  position: relative;
}
.wf-phone::before {
  content: ''; position: absolute; top: 14px; left: 50%; transform: translateX(-50%);
  width: 80px; height: 18px; background: oklch(8% 0.015 265); border-radius: 100px; z-index: 2;
}
.wf-phone-screen {
  width: 100%; height: 100%; background: var(--bg); border-radius: 28px;
  overflow: hidden; display: flex; flex-direction: column; position: relative;
}

.wf-ph-cover { flex: 0 0 48%; position: relative; overflow: hidden; background-size: cover; background-position: center; }
.wf-ph-cover-stripes {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(45deg, oklch(80% 0.012 80) 0 12px, oklch(85% 0.012 80) 12px 24px);
  display: flex; align-items: center; justify-content: center;
}
.wf-ph-cover-stripes::after {
  content: 'cover'; font-family: 'Courier New', monospace; font-size: 11px;
  letter-spacing: .18em; text-transform: uppercase; color: oklch(40% 0.010 80);
  background: oklch(97% 0.008 80 / 0.88); padding: 4px 10px; border-radius: 4px;
}
.wf-ph-badge {
  position: absolute; top: 36px; left: 50%; transform: translateX(-50%);
  background: oklch(100% 0 0 / 0.14); backdrop-filter: blur(10px);
  border: 1px solid oklch(100% 0 0 / 0.20); border-radius: 100px;
  padding: 4px 10px; font-size: 8px; font-weight: 500; letter-spacing: 0.12em;
  text-transform: uppercase; color: oklch(95% 0.005 80); white-space: nowrap; z-index: 2;
}
.wf-ph-grad { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 50%, var(--bg) 100%); }

.wf-ph-card { flex: 1; padding: 0 18px 16px; display: flex; flex-direction: column; position: relative; z-index: 2; }
.wf-ph-eyebrow { font-size: 7px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; margin-top: 2px; }
.wf-ph-name { font-family: var(--serif); font-size: 24px; font-weight: 400; line-height: 1.05; color: var(--text); margin-bottom: 12px; letter-spacing: -0.005em; }
.wf-ph-tagline { font-family: var(--serif); font-style: italic; font-size: 11px; color: var(--muted); line-height: 1.5; margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.wf-ph-actions { display: flex; flex-direction: column; gap: 6px; margin-top: auto; }
.wf-ph-btn { display: flex; align-items: center; justify-content: center; gap: 5px; border-radius: 8px; padding: 9px 12px; font-size: 9px; font-weight: 500; }
.wf-ph-btn-primary { background: var(--gold); color: white; }
.wf-ph-btn-secondary { background: transparent; color: var(--text); border: 1px solid var(--border); }
.wf-ph-btn svg { width: 10px; height: 10px; stroke: currentColor; fill: none; stroke-width: 1.7; }
.wf-ph-powered { text-align: center; font-size: 6px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); margin-top: 8px; opacity: 0.6; }


/* ERROR */
.wf-error { margin-bottom: 20px; border-radius: 10px; border: 1px solid oklch(52% 0.20 25 / 0.3); background: oklch(52% 0.20 25 / 0.06); padding: 12px 16px; font-size: 13px; color: oklch(40% 0.18 25); }

@keyframes wf-pulse { 0%,100%{opacity:1} 50%{opacity:.25} }

@media(max-width:1100px) { .wf-grid{grid-template-columns:1fr;} .wf-col-side{position:static;} .wf-phone{margin:0 auto;} }
@media(max-width:760px) { .wf-nav{padding:12px 18px;} .wf-page{padding:28px 18px 140px;} .wf-title{font-size:30px;} }
`;

export function WelcomeForm({ album }: { album: Album }) {
  const [error, setError]                   = useState<string | null>(null);
  const [loading, setLoading]               = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [dirty, setDirty]                   = useState(false);
  const [selectedScheme, setSelectedScheme] = useState<string>(album.color_scheme ?? "amber");

  const [coverMode, setCoverMode]           = useState<CoverMode>(album.cover_url ? "image" : "placeholder");
  const [coverFile, setCoverFile]           = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl]   = useState<string | null>(album.cover_url);
  const [coverGradient, setCoverGradient]   = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isDragging, setIsDragging]         = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [phTitle, setPhTitle]               = useState(album.title);
  const [phLocation, setPhLocation]         = useState(album.location ?? "");
  const [phDescription, setPhDescription]   = useState(album.description ?? "");

  const markDirty = () => setDirty(true);

  function resetFileInput() {
    if (fileRef.current) fileRef.current.value = "";
  }

  function applyImageFile(file: File) {
    setCoverFile(file);
    setCoverImageUrl(URL.createObjectURL(file));
    setCoverMode("image");
    setCoverGradient(null);
    setSelectedPreset(null);
    markDirty();
  }
  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) applyImageFile(file);
  }
  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setIsDragging(true); }
  function handleDragLeave() { setIsDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) applyImageFile(file);
  }
  function removeCover(e: React.MouseEvent) {
    e.stopPropagation();
    setCoverMode("placeholder"); setCoverFile(null); setCoverImageUrl(null);
    setCoverGradient(null); setSelectedPreset(null);
    resetFileInput();
    markDirty();
  }
  function selectPreset(idx: number) {
    const p = COVER_PRESETS[idx];
    setCoverGradient(`linear-gradient(170deg, ${p.c1} 0%, ${p.c2} 100%)`);
    setCoverMode("preset"); setCoverFile(null); setCoverImageUrl(null);
    setSelectedPreset(idx);
    resetFileInput();
    markDirty();
  }

  async function handleSubmit(formData: FormData) {
    setError(null); setLoading(true);
    if (coverFile) {
      setUploadingCover(true);
      const fd = new FormData();
      fd.append("file", coverFile); fd.append("albumId", album.id);
      const res = await fetch("/api/upload-cover", { method: "POST", body: fd });
      const result = await res.json();
      setUploadingCover(false);
      if (!res.ok || result.error) {
        setError(result.error ?? "Cover upload failed."); setLoading(false); return;
      }
    }
    const result = await updateWelcomePage(formData);
    if (result?.error) { setError(result.error); setLoading(false); }
  }

  const coverZoneStyle: React.CSSProperties =
    coverMode === "preset" && coverGradient ? { background: coverGradient } : {};

  const phoneCoverStyle: React.CSSProperties =
    coverMode === "image" && coverImageUrl
      ? { backgroundImage: `url('${coverImageUrl}')` }
      : coverMode === "preset" && coverGradient
      ? { background: coverGradient } : {};

  const coverZoneClass = [
    "wf-cover-zone",
    isDragging ? "drag" : "",
    coverMode === "image" ? "has-image" : "",
  ].join(" ");

  return (
    <div className="wf">
      <style>{CSS}</style>

      {/* NAV */}
      <nav className="wf-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <Link href="/" className="wf-brand">Captura</Link>
          <div className="wf-nav-links">
            <Link href="/albums" className="wf-nav-link active">Albums</Link>
          </div>
        </div>
      </nav>

      <div className="wf-page">

        {/* BREADCRUMB */}
        <div className="wf-breadcrumb">
          <Link href="/albums">Albums</Link>
          <span className="sep">/</span>
          <Link href={`/albums/${album.id}`}>{album.title}</Link>
          <span className="sep">/</span>
          <span className="cur">Welcome page</span>
        </div>

        {/* HEAD */}
        <div className="wf-head">
          <div>
            <div className="wf-head-eyebrow">{album.title} · Personalize</div>
            <h1 className="wf-title">Welcome <em>page</em></h1>
            <p className="wf-sub">Design the screen guests see when they scan your QR code — cover, name, and event details.</p>
          </div>
        </div>

        {error && <div className="wf-error">{error}</div>}

        {/* GRID */}
        <div className="wf-grid">

          {/* LEFT */}
          <div className="wf-col-main">
            <form id="welcome-form" action={handleSubmit}>
              <input type="hidden" name="id" value={album.id} />

              {/* COVER CARD */}
              <div className="wf-card">
                <div className="wf-card-head">
                  <div>
                    <div className="wf-card-eyebrow">01 · Visual</div>
                    <div className="wf-card-title">Cover <em>photo</em></div>
                  </div>
                  <div className="wf-card-helper">A landscape image sets the tone. We crop it square on mobile.</div>
                </div>

                <div
                  className={coverZoneClass}
                  style={coverZoneStyle}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="wf-file-input"
                    onChange={handleFileSelect}
                  />

                  {coverMode === "image" && coverImageUrl && (
                    <>
                      <div className="wf-cover-img" style={{ backgroundImage: `url('${coverImageUrl}')` }} />
                      <div className="wf-cover-img-overlay" />
                    </>
                  )}

                  {coverMode === "placeholder" && (
                    <div className="wf-cover-placeholder">
                      <div className="wf-cover-icon">
                        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="9" cy="10" r="2"/><path d="M3 18l5-5 4 4 3-3 6 5"/></svg>
                      </div>
                      <div className="wf-cover-label">Click to upload <em>or drag</em></div>
                      <div className="wf-cover-sub">JPG · PNG · WebP — recommended 1200×800</div>
                    </div>
                  )}

                  {coverMode === "image" && (
                    <button type="button" className="wf-cover-remove" onClick={removeCover}>
                      <svg viewBox="0 0 14 14"><path d="M2 2l10 10M12 2L2 12"/></svg>
                    </button>
                  )}
                </div>

                <div className="wf-presets-wrap">
                  <span className="wf-presets-label">Or pick a preset gradient</span>
                  <div className="wf-presets">
                    {COVER_PRESETS.map((p, i) => (
                      <div
                        key={i}
                        className={`wf-preset${selectedPreset === i ? " selected" : ""}`}
                        style={{ background: `linear-gradient(170deg, ${p.c1} 0%, ${p.c2} 100%)` }}
                        onClick={() => selectPreset(i)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* DETAILS CARD */}
              <div className="wf-card" style={{ marginTop: 20 }}>
                <div className="wf-card-head">
                  <div>
                    <div className="wf-card-eyebrow">02 · Story</div>
                    <div className="wf-card-title">Event <em>details</em></div>
                  </div>
                  <div className="wf-card-helper">Keep names short. They appear prominently on the welcome screen.</div>
                </div>

                <div className="wf-field">
                  <label htmlFor="title" className="wf-label">
                    Event name <span className="req">*</span>
                  </label>
                  <input
                    id="title" name="title" type="text" required maxLength={60}
                    defaultValue={album.title}
                    onChange={e => { setPhTitle(e.target.value); markDirty(); }}
                    placeholder="e.g. Alexandra & Andrei"
                    className="wf-input"
                  />
                  <div className="wf-char">{phTitle.length} / 60</div>
                </div>

                <div className="wf-field">
                  <label htmlFor="description" className="wf-label">Description</label>
                  <textarea
                    id="description" name="description" maxLength={240} rows={3}
                    defaultValue={album.description ?? ""}
                    onChange={e => { setPhDescription(e.target.value); markDirty(); }}
                    placeholder="e.g. Împărtășiți cu noi momentele voastre speciale"
                    className="wf-input"
                  />
                  <div className="wf-char">{phDescription.length} / 240</div>
                </div>

                <div className="wf-field">
                  <label htmlFor="location" className="wf-label">The setting · venue or city</label>
                  <input
                    id="location" name="location" type="text"
                    defaultValue={album.location ?? ""}
                    onChange={e => { setPhLocation(e.target.value); markDirty(); }}
                    placeholder="e.g. Lake Como, Italy"
                    className="wf-input"
                  />
                </div>
              </div>

              {/* STYLE CARD */}
              <div className="wf-card" style={{ marginTop: 20 }}>
                <div className="wf-card-head">
                  <div>
                    <div className="wf-card-eyebrow">03 · Style</div>
                    <div className="wf-card-title">Color <em>scheme</em></div>
                  </div>
                  <div className="wf-card-helper">Applied to all guest screens — welcome, upload, and gallery.</div>
                </div>

                <div className="wf-schemes">
                  {SCHEME_KEYS.map(key => {
                    const s = SCHEMES[key];
                    return (
                      <button
                        key={key}
                        type="button"
                        className={`wf-scheme-opt${selectedScheme === key ? " selected" : ""}`}
                        onClick={() => { setSelectedScheme(key); markDirty(); }}
                      >
                        <div
                          className="wf-scheme-swatch"
                          style={{ background: `linear-gradient(135deg, ${s.leftG2} 0%, ${s.accent} 100%)` }}
                        />
                        <span className="wf-scheme-name">{s.label}</span>
                        {selectedScheme === key && (
                          <svg className="wf-scheme-check" viewBox="0 0 12 12">
                            <polyline points="2,6 5,9 10,3" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>

                <input type="hidden" name="color_scheme" value={selectedScheme} />
              </div>
            </form>
          </div>

          {/* RIGHT: PREVIEW */}
          <div className="wf-col-side">
            <div className="wf-preview-label">Live preview · what guests see</div>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <div className="wf-phone">
                <div className="wf-phone-screen" style={{
                  "--gold": getScheme(selectedScheme).accent,
                  "--bg": getScheme(selectedScheme).bg,
                  "--border": getScheme(selectedScheme).border,
                } as React.CSSProperties}>
                  <div className="wf-ph-cover" style={phoneCoverStyle}>
                    {coverMode === "placeholder" && <div className="wf-ph-cover-stripes" />}
                    <div className="wf-ph-badge">You are invited to contribute</div>
                    <div className="wf-ph-grad" />
                  </div>
                  <div className="wf-ph-card">
                    <div className="wf-ph-eyebrow">{phLocation || "Venue · City"}</div>
                    <div className="wf-ph-name">{phTitle || <em>Your event</em>}</div>
                    {phDescription && (
                      <div className="wf-ph-tagline">{phDescription}</div>
                    )}
                    <div className="wf-ph-actions">
                      <div className="wf-ph-btn wf-ph-btn-primary">
                        <svg viewBox="0 0 24 24"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                        Add your photos
                      </div>
                      <div className="wf-ph-btn wf-ph-btn-secondary">
                        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                        View gallery
                      </div>
                    </div>
                    <div className="wf-ph-powered">Powered by Captura</div>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* ACTION BAR */}
      <div className="wf-action-bar">
        <div className="wf-action-inner">
          <div className="wf-dirty">
            {dirty && <><span className="pulse" /><span>Unsaved changes</span></>}
          </div>
          <div className="wf-bar-actions">
            <Link href={`/albums/${album.id}`} className="wf-btn wf-btn-text">Cancel</Link>
            <button type="submit" form="welcome-form" disabled={loading} className="wf-btn wf-btn-primary">
              <svg viewBox="0 0 16 16"><path d="M3 1h8l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM5 1v4h6V1M5 11h6"/></svg>
              {uploadingCover ? "Uploading…" : loading ? "Saving…" : "Save welcome page"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
