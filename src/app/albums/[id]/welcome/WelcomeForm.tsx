"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { updateWelcomePage } from "@/app/albums/actions";

interface Album {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  cover_url: string | null;
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

export function WelcomeForm({ album, previewToken }: { album: Album; previewToken: string | null }) {
  const [error, setError]                     = useState<string | null>(null);
  const [loading, setLoading]                 = useState(false);
  const [uploadingCover, setUploadingCover]   = useState(false);
  const [dirty, setDirty]                     = useState(false);

  const [coverMode, setCoverMode]             = useState<CoverMode>(album.cover_url ? "image" : "placeholder");
  const [coverFile, setCoverFile]             = useState<File | null>(null);
  const [coverImageUrl, setCoverImageUrl]     = useState<string | null>(album.cover_url);
  const [coverGradient, setCoverGradient]     = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset]   = useState<number | null>(null);
  const [isDragging, setIsDragging]           = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Phone preview state
  const [phTitle, setPhTitle]           = useState(album.title);
  const [phLocation, setPhLocation]     = useState(album.location ?? "");
  const [phDescription, setPhDescription] = useState(album.description ?? "");

  const markDirty = () => setDirty(true);

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
    setCoverGradient(null); setSelectedPreset(null); markDirty();
  }
  function selectPreset(idx: number) {
    const p = COVER_PRESETS[idx];
    setCoverGradient(`linear-gradient(170deg, ${p.c1} 0%, ${p.c2} 100%)`);
    setCoverMode("preset"); setCoverFile(null); setCoverImageUrl(null);
    setSelectedPreset(idx); markDirty();
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
    coverMode === "preset" && coverGradient   ? { background: coverGradient } :
    coverMode === "placeholder"               ? { background: "#f6f3f2" } : {};

  const phoneCoverStyle: React.CSSProperties =
    coverMode === "image" && coverImageUrl
      ? { backgroundImage: `url('${coverImageUrl}')`, backgroundSize: "cover", backgroundPosition: "center" }
      : coverMode === "preset" && coverGradient
      ? { background: coverGradient } : {};

  return (
    <div className="min-h-screen bg-surface font-manrope text-on-surface">

      {/* ── TOPNAV ── */}
      <nav className="sticky top-0 z-50 bg-surface border-b border-outline-variant/30">
        <div className="flex items-center justify-between px-8 h-14 max-w-[1280px] mx-auto">
          <div className="flex items-center gap-8">
            <Link href="/" className="font-noto-serif text-[22px] font-medium tracking-[0.06em] text-primary">
              Captura
            </Link>
            <div className="hidden md:flex gap-7">
              <Link
                href="/albums"
                className="text-[11px] font-medium tracking-[0.14em] uppercase text-on-surface-variant hover:text-on-surface transition pb-0.5 border-b-2 border-transparent"
              >
                Albums
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {previewToken && (
              <Link
                href={`/join/${previewToken}`}
                target="_blank"
                className="hidden sm:inline-flex items-center gap-2.5 px-4 py-2 rounded-full border border-outline-variant/30 text-xs text-on-surface-variant hover:border-primary/30 hover:text-on-surface transition"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.15)]" />
                Preview at <span className="text-primary font-medium">/join/{previewToken}</span>
                <svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M6 3H3v10h10v-3M9 3h4v4M7 9l6-6"/>
                </svg>
              </Link>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-[1280px] mx-auto px-8 pt-9 pb-36">

        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-xs text-on-surface-variant mb-6">
          <Link href="/albums" className="hover:text-on-surface transition">Albums</Link>
          <span className="opacity-40">/</span>
          <Link href={`/albums/${album.id}`} className="hover:text-on-surface transition">{album.title}</Link>
          <span className="opacity-40">/</span>
          <span className="text-primary">Welcome page</span>
        </div>

        {/* PAGE HEAD */}
        <div className="flex items-end justify-between gap-8 mb-9 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-medium tracking-[0.16em] uppercase text-on-surface-variant mb-3">
              <span className="w-6 h-px bg-primary opacity-60" />
              {album.title} · Personalize
            </div>
            <h1 className="font-noto-serif text-[54px] font-light leading-none tracking-[-0.01em] text-on-surface">
              Welcome <em className="italic text-primary">page</em>
            </h1>
            <p className="mt-3.5 text-sm text-on-surface-variant leading-[1.65] max-w-[480px]">
              Design the screen guests see the moment they scan your QR code — cover, name, and event details.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* 2-COL GRID */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">

          {/* ── LEFT: FORM ── */}
          <form id="welcome-form" action={handleSubmit} className="flex flex-col gap-5">
            <input type="hidden" name="id" value={album.id} />

            {/* COVER CARD */}
            <div className="bg-surface border border-outline-variant/30 rounded-[18px] p-7">
              <div className="flex items-start justify-between mb-[22px] gap-3">
                <div>
                  <div className="text-[10px] tracking-[0.16em] uppercase text-on-surface-variant font-medium mb-1">01 · Visual</div>
                  <div className="font-noto-serif text-2xl font-light leading-none text-on-surface">
                    Cover <em className="italic text-primary">photo</em>
                  </div>
                </div>
                <div className="text-xs text-on-surface-variant max-w-[200px] text-right leading-[1.5]">
                  A landscape image sets the tone. We crop it square on mobile.
                </div>
              </div>

              {/* Upload zone */}
              <div
                className={`relative overflow-hidden cursor-pointer transition-all rounded-[14px] border-[1.5px] ${
                  isDragging
                    ? "border-primary border-solid"
                    : coverMode === "image"
                    ? "border-outline-variant/40 border-solid"
                    : "border-outline-variant/60 border-dashed hover:border-primary/40 hover:bg-primary/[0.03]"
                }`}
                style={{ aspectRatio: "16/8", ...coverZoneStyle }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handleFileSelect}
                />

                {coverMode === "image" && coverImageUrl && (
                  <>
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url('${coverImageUrl}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </>
                )}

                {coverMode === "placeholder" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 p-6 text-center pointer-events-none">
                    <div className="w-[52px] h-[52px] rounded-2xl bg-surface border border-outline-variant/30 flex items-center justify-center shadow-sm">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" className="text-primary">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="9" cy="10" r="2"/>
                        <path d="M3 18l5-5 4 4 3-3 6 5"/>
                      </svg>
                    </div>
                    <div className="font-noto-serif text-xl text-on-surface leading-[1.2] mt-1">
                      Click to upload <em className="italic text-primary">or drag</em>
                    </div>
                    <div className="text-[11px] tracking-[0.08em] uppercase text-on-surface-variant">
                      JPG · PNG · WebP — recommended 1200×800
                    </div>
                  </div>
                )}

                {coverMode === "image" && (
                  <button
                    type="button"
                    onClick={removeCover}
                    className="absolute top-3 right-3 w-8 h-8 bg-black/55 border border-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm z-10 hover:bg-black/70 transition pointer-events-auto"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2">
                      <path d="M2 2l10 10M12 2L2 12"/>
                    </svg>
                  </button>
                )}
              </div>

              {/* Preset gradients */}
              <div className="flex items-center justify-between mt-3.5 gap-4 flex-wrap">
                <span className="text-[11px] text-on-surface-variant">Or pick a preset gradient</span>
                <div className="flex gap-2">
                  {COVER_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => selectPreset(i)}
                      className={`w-[54px] h-9 rounded-lg flex-shrink-0 border-2 transition-all ${
                        selectedPreset === i
                          ? "border-primary scale-[1.04] shadow-[0_0_0_3px_rgba(125,80,112,0.15)]"
                          : "border-transparent hover:-translate-y-0.5 hover:shadow-lg"
                      }`}
                      style={{ background: `linear-gradient(170deg, ${p.c1} 0%, ${p.c2} 100%)` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* DETAILS CARD */}
            <div className="bg-surface border border-outline-variant/30 rounded-[18px] p-7">
              <div className="flex items-start justify-between mb-[22px] gap-3">
                <div>
                  <div className="text-[10px] tracking-[0.16em] uppercase text-on-surface-variant font-medium mb-1">02 · Story</div>
                  <div className="font-noto-serif text-2xl font-light leading-none text-on-surface">
                    Event <em className="italic text-primary">details</em>
                  </div>
                </div>
                <div className="text-xs text-on-surface-variant max-w-[200px] text-right leading-[1.5]">
                  Keep names short. They appear prominently on the welcome screen.
                </div>
              </div>

              {/* Event name */}
              <div className="flex flex-col gap-2">
                <label htmlFor="title" className="text-[11px] font-medium tracking-[0.10em] uppercase text-on-surface-variant flex items-center gap-1.5">
                  Event name <span className="text-primary text-[13px] leading-none">*</span>
                </label>
                <input
                  id="title" name="title" type="text" required maxLength={60}
                  defaultValue={album.title}
                  onChange={e => { setPhTitle(e.target.value); markDirty(); }}
                  placeholder="e.g. Alexandra & Andrei"
                  className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-[13px] text-sm font-light text-on-surface outline-none transition focus:border-primary/40 focus:ring-[3px] focus:ring-primary/10 placeholder:text-on-surface-variant/50 placeholder:italic"
                />
                <div className="text-[10px] text-on-surface-variant text-right tracking-[0.04em] -mt-0.5">
                  {phTitle.length} / 60
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-2 mt-[18px]">
                <label htmlFor="description" className="text-[11px] font-medium tracking-[0.10em] uppercase text-on-surface-variant">
                  Description
                </label>
                <textarea
                  id="description" name="description" rows={3} maxLength={240}
                  defaultValue={album.description ?? ""}
                  onChange={e => { setPhDescription(e.target.value); markDirty(); }}
                  placeholder="e.g. Împărtășiți cu noi momentele voastre speciale"
                  className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-[13px] font-noto-serif text-base italic font-light text-on-surface outline-none transition focus:border-primary/40 focus:ring-[3px] focus:ring-primary/10 placeholder:text-on-surface-variant/50 resize-y min-h-24 leading-[1.6]"
                />
                <div className="text-[10px] text-on-surface-variant text-right tracking-[0.04em] -mt-0.5">
                  {phDescription.length} / 240
                </div>
              </div>

              {/* Location */}
              <div className="flex flex-col gap-2 mt-[18px]">
                <label htmlFor="location" className="text-[11px] font-medium tracking-[0.10em] uppercase text-on-surface-variant">
                  The setting · venue or city
                </label>
                <input
                  id="location" name="location" type="text"
                  defaultValue={album.location ?? ""}
                  onChange={e => { setPhLocation(e.target.value); markDirty(); }}
                  placeholder="e.g. Lake Como, Italy"
                  className="w-full bg-surface border border-outline-variant/40 rounded-xl px-4 py-[13px] text-sm font-light text-on-surface outline-none transition focus:border-primary/40 focus:ring-[3px] focus:ring-primary/10 placeholder:text-on-surface-variant/50 placeholder:italic"
                />
              </div>
            </div>
          </form>

          {/* ── RIGHT: PHONE PREVIEW ── */}
          <div className="xl:sticky xl:top-[90px] flex flex-col items-center gap-4">
            <div className="text-[10px] tracking-[0.16em] uppercase text-on-surface-variant font-medium flex items-center gap-2 self-start">
              <span className="w-[18px] h-px bg-primary opacity-60" />
              Live preview · what guests see
            </div>

            {/* Phone frame */}
            <div
              style={{
                width: 280, height: 580,
                background: "oklch(15% 0.015 265)",
                borderRadius: 36,
                padding: 8,
                boxShadow: "0 30px 60px rgba(0,0,0,0.22), 0 0 0 1.5px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)",
                position: "relative",
                flexShrink: 0,
              }}
            >
              {/* Camera notch */}
              <div
                style={{
                  position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)",
                  width: 80, height: 18, background: "oklch(8% 0.015 265)", borderRadius: 100, zIndex: 2,
                }}
              />

              <div style={{
                width: "100%", height: "100%", background: "#fcf9f8",
                borderRadius: 28, overflow: "hidden", display: "flex", flexDirection: "column", position: "relative",
              }}>
                {/* Cover */}
                <div style={{ flex: "0 0 48%", position: "relative", overflow: "hidden", ...phoneCoverStyle }}>
                  {coverMode === "placeholder" && (
                    <div style={{
                      position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      background: "repeating-linear-gradient(45deg, oklch(80% 0.012 80) 0 12px, oklch(85% 0.012 80) 12px 24px)",
                    }}>
                      <span style={{
                        fontFamily: "monospace", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase",
                        color: "oklch(40% 0.010 80)", background: "rgba(252,249,248,0.88)", padding: "4px 10px", borderRadius: 4,
                      }}>cover</span>
                    </div>
                  )}
                  {/* Invite badge */}
                  <div style={{
                    position: "absolute", top: 36, left: "50%", transform: "translateX(-50%)",
                    background: "rgba(255,255,255,0.14)", backdropFilter: "blur(10px)",
                    border: "1px solid rgba(255,255,255,0.20)", borderRadius: 100,
                    padding: "4px 10px", fontSize: 8, fontWeight: 500, letterSpacing: "0.12em",
                    textTransform: "uppercase", color: "oklch(95% 0.005 80)", whiteSpace: "nowrap", zIndex: 2,
                  }}>
                    You are invited to contribute
                  </div>
                  {/* Fade to bg */}
                  <div style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(to bottom, transparent 50%, #fcf9f8 100%)",
                  }} />
                </div>

                {/* Info card */}
                <div style={{ flex: 1, padding: "0 18px 16px", display: "flex", flexDirection: "column", position: "relative", zIndex: 2 }}>
                  <div style={{ fontSize: 7, fontWeight: 500, letterSpacing: "0.14em", textTransform: "uppercase", color: "#4e444a", marginBottom: 4, marginTop: 2 }}>
                    {phLocation || "Venue · City"}
                  </div>
                  <div style={{ fontFamily: '"Noto Serif", serif', fontSize: 24, fontWeight: 400, lineHeight: 1.05, color: "#1b1c1c", marginBottom: 14, letterSpacing: "-0.005em" }}>
                    {phTitle || <span style={{ fontStyle: "italic", color: "#4e444a" }}>Your event</span>}
                  </div>
                  {phDescription && (
                    <div style={{
                      fontFamily: '"Noto Serif", serif', fontStyle: "italic", fontSize: 11,
                      color: "#4e444a", lineHeight: 1.5, marginBottom: 12,
                      display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {phDescription}
                    </div>
                  )}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: "auto" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 8, padding: "9px 12px", fontSize: 9, fontWeight: 500, background: "#7d5070", color: "white" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                      Add your photos
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 8, padding: "8px 12px", fontSize: 9, fontWeight: 500, border: "1px solid #d2c2ca", color: "#1b1c1c" }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
                      View gallery
                    </div>
                  </div>
                  <div style={{ textAlign: "center", fontSize: 6, letterSpacing: "0.12em", textTransform: "uppercase", color: "#80747a", marginTop: 8, opacity: 0.6 }}>
                    Powered by Captura
                  </div>
                </div>
              </div>
            </div>

            {/* Preview meta */}
            {previewToken && (
              <div className="w-full flex flex-col gap-2.5 px-[18px] py-3.5 bg-surface border border-outline-variant/30 rounded-xl">
                <div className="flex justify-between items-center text-xs text-on-surface-variant">
                  <span>Share URL</span>
                  <span className="text-primary font-medium">/join/{previewToken}</span>
                </div>
                <div className="h-px bg-outline-variant/30" />
                <div className="flex justify-between items-center text-xs text-on-surface-variant">
                  <span>Status</span>
                  <span className="text-green-600 font-medium">● Live</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── ACTION BAR ── */}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 border-t border-outline-variant/30 px-8 py-3.5"
        style={{ background: "color-mix(in oklch, #fcf9f8 92%, transparent)", backdropFilter: "blur(14px)" }}
      >
        <div className="max-w-[1280px] mx-auto flex items-center justify-between gap-5">
          <div className="flex items-center gap-2.5 text-xs text-on-surface-variant">
            {dirty && (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Unsaved changes</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <Link
              href={`/albums/${album.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-on-surface-variant hover:text-on-surface transition"
            >
              Cancel
            </Link>
            {previewToken && (
              <Link
                href={`/join/${previewToken}`}
                target="_blank"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-on-surface border border-outline-variant/40 bg-surface hover:border-outline-variant transition"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2.5"/>
                </svg>
                Preview
              </Link>
            )}
            <button
              type="submit"
              form="welcome-form"
              disabled={loading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-semibold text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: "#7d5070", boxShadow: "0 4px 14px rgba(125,80,112,0.22)" }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 1h8l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM5 1v4h6V1M5 11h6"/>
              </svg>
              {uploadingCover ? "Uploading…" : loading ? "Saving…" : "Save welcome page"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
